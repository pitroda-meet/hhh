import { ApiError, mockRequest, requireUser } from './api.js';
import { dbNow, enrichTicket, getAuthStorageKey, getDatabase, isPresentationDatabase, mutateDatabase, publicUser, resetDatabase, switchDatabaseNamespace } from '../mock/database.js';
import { authService } from './authService.js';
import { chatService } from './chatService.js';
import { faqService } from './faqService.js';
import { ticketService } from './ticketService.js';
import { PITCH_CONTENT } from '../presentation/demoContent.js';

function requirePresentation() {
  if (!isPresentationDatabase()) throw new ApiError('Start an isolated presentation session first.');
}

function snapshot() {
  const db = getDatabase();
  const ticket = db.tickets.find((item) => item.id === PITCH_CONTENT.ticketId);
  const manual = db.tickets.find((item) => item.idempotency_key === 'autopitch-manual' || (item.id > 125 && item.source === 'manual'));
  const session = db.chat_sessions.find((item) => item.student_id === 1);
  const suggestion = db.faqs.find((item) => item.source_ticket_id === PITCH_CONTENT.ticketId);
  return {
    ticket: ticket ? enrichTicket(db, ticket) : null,
    manual_ticket: manual ? enrichTicket(db, manual) : null,
    session_id: session?.id || null,
    suggested_faq_id: suggestion?.id || null,
    suggestion_status: suggestion?.status || null,
    internal_note_count: db.ticket_internal_notes.filter((note) => note.ticket_id === 125).length,
    escalation_offset: db.meta.time_offset_hours,
    escalated_count: db.tickets.filter((item) => item.status === 'Escalated').length,
    ai_tools: [...new Set(db.ai_action_logs.filter((log) => log.session_id).map((log) => log.tool))],
    routing_strategy: db.meta.routing_strategy,
  };
}

export async function beginPresentation() {
  return mockRequest('POST', '/api/demo/presentation/start', () => {
    switchDatabaseNamespace('presentation');
    localStorage.removeItem(getAuthStorageKey());
    resetDatabase();
    mutateDatabase((db) => {
      db.meta.presentation = true;
      db.meta.routing_strategy = 'round_robin';
      db.users.find((user) => user.id === 1).enrollment_number = PITCH_CONTENT.enrollment;
      const designations = { staff: 'Trade Instructor / Department Coordinator', admin: 'Administrative Officer', principal: 'Principal / Supervisor' };
      db.users.forEach((user) => { if (designations[user.role]) user.designation = designations[user.role]; });
    });
    return { user: null, now: dbNow(), isolated: true, ticket_number: PITCH_CONTENT.ticketNumber };
  });
}

export async function getPresentationState() {
  return mockRequest('GET', '/api/demo/presentation/state', () => { requirePresentation(); return snapshot(); });
}

export async function endPresentation() {
  return mockRequest('POST', '/api/demo/presentation/stop', () => {
    const result = isPresentationDatabase() ? snapshot() : null;
    if (isPresentationDatabase()) switchDatabaseNamespace('main');
    let user = null;
    try { user = publicUser(requireUser()); } catch { /* The normal workspace may be signed out. */ }
    return { user, result, now: dbNow(), isolated: false };
  });
}

// Seeking prepares only domain prerequisites. It never marks skipped routes as viewed.
export async function prepareCheckpoint(sceneId) {
  requirePresentation();
  if (sceneId >= 4) {
    await authService.demoLogin('student');
    let state = snapshot();
    if (!state.session_id) await chatService.createSession('gu');
    state = snapshot();
    if (sceneId >= 5 && !getDatabase().chat_messages.some((message) => message.session_id === state.session_id && message.type === 'faq')) {
      await chatService.sendMessage({ session_id: state.session_id, message: PITCH_CONTENT.gujaratiQuestion });
    }
    if (sceneId >= 6 && !snapshot().ticket) {
      const response = await chatService.sendMessage({ session_id: state.session_id, message: PITCH_CONTENT.hindiQuestion });
      const followup = await chatService.sendMessage({ session_id: state.session_id, message: PITCH_CONTENT.hindiDetails });
      const confirmation = followup.data.assistant_message?.id || response.data.assistant_message.id;
      await chatService.confirmTicket(state.session_id, confirmation, true);
    }
    if (sceneId >= 6 && !snapshot().manual_ticket) await ticketService.createTicket({ ...PITCH_CONTENT.manual, idempotency_key: 'autopitch-manual' });
    if (sceneId >= 7) {
      await authService.demoLogin('staff');
      if (!snapshot().ticket.claimed_at && !['Resolved', 'Closed'].includes(snapshot().ticket.status)) await ticketService.claimTicket(125);
      if (!snapshot().internal_note_count) await ticketService.addInternalNote(125, PITCH_CONTENT.internalNote);
      if (!['Resolved', 'Closed'].includes(snapshot().ticket.status)) {
        await ticketService.replyToTicket(125, { message: PITCH_CONTENT.resolution });
        await ticketService.updateTicketStatus(125, 'Resolved');
      }
      if (!snapshot().suggested_faq_id) await faqService.suggestFaq(125, PITCH_CONTENT.faq.en);
    }
    if (sceneId >= 8 && !snapshot().ticket.rating) {
      await authService.demoLogin('student');
      await ticketService.rateTicket(125, { rating: 5, feedback: PITCH_CONTENT.feedback });
    }
    if (sceneId >= 9) {
      await authService.demoLogin('admin');
      const stateNow = snapshot();
      if (stateNow.suggestion_status !== 'published') await faqService.saveFaq({ id: stateNow.suggested_faq_id, category_id: 2, status: 'published', translations: PITCH_CONTENT.faq });
    }
  }
  let user = null;
  const role = sceneId <= 2 ? null : sceneId <= 5 ? 'student' : sceneId === 6 ? 'staff' : sceneId === 7 ? 'student' : sceneId === 8 ? 'admin' : 'principal';
  if (role) user = (await authService.demoLogin(role)).data.user;
  else await authService.logout();
  return { data: { user, ...snapshot() }, message: 'Checkpoint ready' };
}

export async function loadAudioManifest() {
  const response = await fetch(`${import.meta.env.BASE_URL}audio/pitch_manifest.json`, { cache: 'no-cache' });
  if (!response.ok) throw new Error('Gujarati audio manifest is unavailable.');
  const data = await response.json();
  if (data.duration !== 300 || !Array.isArray(data.cues) || !data.voice?.startsWith('gu-IN-')) throw new Error('The Gujarati audio manifest does not match the five-minute pitch.');
  return { data };
}

export const presentationService = { beginPresentation, getPresentationState, endPresentation, prepareCheckpoint, loadAudioManifest };
