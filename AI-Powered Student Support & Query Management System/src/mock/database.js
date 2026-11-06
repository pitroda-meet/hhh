import { createSeed, DATABASE_VERSION } from './seed.js';

export const DATABASE_KEY = 'sahay.database.v1';
export const AUTH_KEY = 'sahay.auth.v1';
let database;
let namespace = 'main';
let databaseEpoch = 0;

export function getDatabaseStorageKey() { return namespace === 'presentation' ? `${DATABASE_KEY}.pitch` : DATABASE_KEY; }
export function getAuthStorageKey() { return namespace === 'presentation' ? `${AUTH_KEY}.pitch` : AUTH_KEY; }
export function getDatabaseEpoch() { return databaseEpoch; }
export function isPresentationDatabase() { return namespace === 'presentation'; }

export function switchDatabaseNamespace(next) {
  if (!['main', 'presentation'].includes(next)) throw new Error('Unknown database namespace.');
  namespace = next;
  database = undefined;
  databaseEpoch += 1;
  return getDatabase();
}

function upgradeDatabase(db) {
  let changed = false;
  for (const collection of ['ticket_internal_notes', 'faq_feedback']) {
    if (!Array.isArray(db[collection])) { db[collection] = []; changed = true; }
  }
  if (!db.meta.routing_strategy) { db.meta.routing_strategy = 'least_open'; changed = true; }
  if (!db.meta.routing_cursors) { db.meta.routing_cursors = {}; changed = true; }
  return changed;
}

function initializeSequences(db) {
  let changed = !db.meta.sequences;
  db.meta.sequences ||= {};
  Object.entries(db).forEach(([name, rows]) => {
    if (!Array.isArray(rows)) return;
    const minimum = rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1;
    if (!db.meta.sequences[name] || db.meta.sequences[name] < minimum) {
      db.meta.sequences[name] = minimum;
      changed = true;
    }
  });
  return changed;
}

function broadcast() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('sahay:database'));
}

function persist() {
  try {
    localStorage.setItem(getDatabaseStorageKey(), JSON.stringify(database));
  } catch {
    throw new Error('Browser storage is full or unavailable. Enable local storage, or reset the demo data.');
  }
}

export function getDatabase() {
  if (!database) {
    let stored;
    try { stored = JSON.parse(localStorage.getItem(getDatabaseStorageKey()) || 'null'); } catch { stored = null; }
    database = stored?.meta?.version === DATABASE_VERSION && Array.isArray(stored.users) ? stored : createSeed();
    const upgraded = upgradeDatabase(database);
    const initialized = initializeSequences(database);
    if (database !== stored || initialized || upgraded) persist();
  }
  return database;
}

export function mutateDatabase(callback) {
  const previous = structuredClone(getDatabase());
  try {
    const result = callback(database);
    persist();
    broadcast();
    return result;
  } catch (error) {
    database = previous;
    throw error;
  }
}

export function resetDatabase() {
  databaseEpoch += 1;
  database = createSeed();
  upgradeDatabase(database);
  initializeSequences(database);
  persist();
  broadcast();
  return database;
}

export function refreshDatabaseFromStorage() { database = undefined; return getDatabase(); }
export function dbNow(db = getDatabase()) { return Date.now() + db.meta.time_offset_hours * 3600000; }
export function isoNow(db = getDatabase()) { return new Date(dbNow(db)).toISOString(); }
export function nextId(rows) {
  const db = getDatabase();
  const collection = Object.keys(db).find((key) => db[key] === rows);
  let largestId = rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0);
  // Older snapshots may predate sequences. Keep IDs referenced by historical
  // audit logs and confirmed tickets reserved when upgrading those snapshots.
  if (collection === 'chat_sessions') largestId = db.ai_action_logs.reduce((max, log) => Math.max(max, Number(log.session_id) || 0), largestId);
  if (collection === 'chat_messages') largestId = db.tickets.reduce((max, ticket) => Math.max(max, Number(ticket.idempotency_key?.match(/^chat-\d+-(\d+)$/)?.[1]) || 0), largestId);
  if (!collection) return largestId + 1;
  db.meta.sequences ||= {};
  const id = Math.max(largestId + 1, db.meta.sequences[collection] || 1);
  db.meta.sequences[collection] = id + 1;
  return id;
}

export function notify(db, userIds, payload) {
  [...new Set(userIds.filter(Boolean))].forEach((user_id) => db.notifications.push({ id: nextId(db.notifications), user_id, ticket_id: null, read_at: null, created_at: isoNow(db), ...payload }));
}

export function publicUser(user) {
  if (!user) return null;
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

export function enrichTicket(db, ticket) {
  if (!ticket) return null;
  return { ...ticket, student: publicUser(db.users.find((u) => u.id === ticket.student_id)), assigned_staff: publicUser(db.users.find((u) => u.id === ticket.assigned_to)), department: db.departments.find((d) => d.id === ticket.department_id), category: db.categories.find((c) => c.id === ticket.category_id), reply_count: db.ticket_replies.filter((r) => r.ticket_id === ticket.id).length };
}
