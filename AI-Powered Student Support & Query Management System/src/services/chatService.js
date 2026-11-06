import { ApiError, assertRequestEpoch, mockRequest, requireUser } from './api.js';
import { dbNow, enrichTicket, getDatabase, getDatabaseEpoch, isoNow, mutateDatabase, nextId } from '../mock/database.js';
import { agentText, classifyIntent, detectLanguage, intentCategory, searchApprovedFaq } from '../mock/agentEngine.js';
import { createTicket } from './ticketService.js';
import { generateGroundedAnswer } from './geminiAdapter.js';

function findSession(db, id, userId) {
  const session = db.chat_sessions.find((s) => s.id === Number(id) && s.student_id === userId);
  if (!session) throw new ApiError('Conversation not found.', 404);
  return session;
}

function logAction(db, session, tool, input, result, status = 'success', language = 'en', details = {}) {
  const action = { id: nextId(db.ai_action_logs), session_id: session.id, student_id: session.student_id, tool, input, result, status, language, duration_ms: 315 + Math.floor(Math.random() * 170), knowledge_policy: 'published_approved_faq_only', intent: input.intent || session.context.intent || 'General', ...details, created_at: isoNow(db) };
  db.ai_action_logs.push(action);
  return { tool, result, status, duration_ms: action.duration_ms };
}

function addMessage(db, session, fields) {
  const message = { id: nextId(db.chat_messages), session_id: session.id, role: 'assistant', content: '', language: 'en', type: 'text', actions: [], feedback: null, created_at: isoNow(db), ...fields };
  db.chat_messages.push(message);
  session.updated_at = isoNow(db);
  return message;
}

function sessionDetail(db, session) {
  return { ...session, messages: db.chat_messages.filter((m) => m.session_id === session.id).map((m) => ({ ...m, ticket: m.ticket_id ? enrichTicket(db, db.tickets.find((t) => t.id === m.ticket_id && t.student_id === session.student_id)) : null })), now: dbNow(db) };
}

export async function getSessions() {
  return mockRequest('GET', '/api/v1/agent/sessions', () => {
    const user = requireUser(['student']);
    return getDatabase().chat_sessions.filter((s) => s.student_id === user.id).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  });
}

export async function createSession(language = 'en') {
  return mockRequest('POST', '/api/v1/agent/sessions', () => {
    const user = requireUser(['student']);
    const safeLanguage = ['en', 'hi', 'gu'].includes(language) ? language : 'en';
    return mutateDatabase((db) => {
      const session = { id: nextId(db.chat_sessions), student_id: user.id, title: 'New conversation', language: safeLanguage, context: {}, created_at: isoNow(db), updated_at: isoNow(db) };
      db.chat_sessions.push(session);
      addMessage(db, session, { content: agentText[safeLanguage].welcome, language: safeLanguage, type: 'welcome' });
      return sessionDetail(db, session);
    });
  });
}

export async function getSession(id) {
  return mockRequest('GET', `/api/v1/agent/sessions/${id}`, () => {
    const user = requireUser(['student']);
    const db = getDatabase();
    return sessionDetail(db, findSession(db, id, user.id));
  });
}

export async function sendMessage({ session_id, message, action }) {
  return mockRequest('POST', '/api/v1/agent/chat', async () => {
    const epoch = getDatabaseEpoch();
    const user = requireUser(['student']);
    const text = message?.trim();
    if (!text || text.length > 3000) throw new ApiError('Send a message between 1 and 3,000 characters.');
    const db = getDatabase();
    const session = findSession(db, session_id, user.id);
    const language = /^[\d\s-]+$/.test(text) ? session.language : detectLanguage(text);
    const copy = agentText[language];
    const intent = action === 'request_human_support' ? 'Human Assistance' : classifyIntent(text, session.context.intent);
    let matchedFaq = null;
    let generation = null;
    let generationError = null;
    const hasPending = Boolean(session.context.pending_ticket);
    const shouldSearch = !hasPending && !['Ticket Tracking', 'Human Assistance'].includes(intent) && !/^(hi|hello|hey|नमस्ते|નમસ્તે)[!.\s]*$/i.test(text);
    if (shouldSearch) {
      matchedFaq = searchApprovedFaq(db, text, language, intent);
      if (matchedFaq) {
        try { generation = await generateGroundedAnswer({ question: text, approvedAnswer: matchedFaq.translation.answer, language }); }
        catch (error) { generationError = error.message; generation = { text: matchedFaq.translation.answer, provider: 'mock' }; }
      }
    }
    assertRequestEpoch(epoch);
    return mutateDatabase((state) => {
      const current = findSession(state, session_id, user.id);
      if (current.title === 'New conversation') current.title = text.slice(0, 55);
      current.language = language;
      const userMessage = addMessage(state, current, { role: 'user', content: text, language });
      const actions = [];
      let reply;
      if (intent === 'Ticket Tracking') {
        const number = text.match(/ITI-\d{4}-\d{3,6}/i)?.[0] || current.context.last_ticket_number;
        const ticket = state.tickets.find((t) => t.ticket_number.toLowerCase() === number?.toLowerCase() && t.student_id === user.id);
        actions.push(logAction(state, current, 'get_ticket_status', { ticket_number: number || null }, ticket ? `${ticket.ticket_number}: ${ticket.status}` : number ? 'Ticket not found in student account' : 'Ticket number requested', ticket ? 'success' : 'no_match', language));
        reply = { content: ticket ? copy.tracked : number ? copy.ticketNotFound : copy.missingTicket, type: ticket ? 'ticket' : 'text', ticket_id: ticket?.id || null };
      } else if (/^(hi|hello|hey|नमस्ते|નમસ્તે)[!.\s]*$/i.test(text)) {
        reply = { content: copy.greeting, type: 'text' };
      } else if (/^(list departments|departments|विभाग|વિભાગો)[?\s]*$/i.test(text)) {
        actions.push(logAction(state, current, 'get_departments', {}, '6 support departments returned', 'success', language));
        reply = { content: copy.departments, type: 'text' };
      } else if (matchedFaq) {
        const faq = state.faqs.find((f) => f.id === matchedFaq.faq.id);
        faq.views += 1;
        actions.push(logAction(state, current, 'search_faq', { query: text, language, intent }, `Approved FAQ #${faq.id} matched (${Math.round(matchedFaq.confidence * 100)}% confidence)`, 'success', language, { confidence: matchedFaq.confidence, faq_id: faq.id }));
        if (generation?.provider === 'gemini') actions.push(logAction(state, current, 'generate_response', { provider: 'gemini', faq_id: faq.id }, 'Grounded response generated from approved FAQ', 'success', language));
        if (generationError) actions.push(logAction(state, current, 'generate_response', { provider: 'gemini' }, generationError, 'error', language));
        current.context.intent = intent;
        current.context.last_question = text;
        reply = { content: generation.text, type: 'faq', faq_id: faq.id, source_question: matchedFaq.translation.question, confidence: matchedFaq.confidence, provider: generation.provider };
      } else {
        const pending = current.context.pending_ticket;
        const human = intent === 'Human Assistance';
        const previousIssue = current.context.last_question;
        const categoryIntent = human ? current.context.intent || 'General' : intent;
        const category_id = pending?.category_id || intentCategory[categoryIntent] || 8;
        const category = state.categories.find((c) => c.id === category_id && c.active) || state.categories.find((c) => c.active);
        if (pending) {
          const oldCard = state.chat_messages.find((m) => m.id === pending.confirmation_message_id);
          if (oldCard) oldCard.decision = 'updated';
          pending.description = `${pending.description}\n\nAdditional details: ${text}`.slice(0, 5000);
          if (pending.category_id === 8 && intentCategory[intent]) pending.category_id = intentCategory[intent];
          pending.language = language;
        }
        current.context.pending_ticket = pending || { subject: (human ? previousIssue || 'Request for staff assistance' : text).slice(0, 150), description: (human ? previousIssue || text : text).length >= 10 ? human ? previousIssue || text : text : `Student needs help: ${text}`, category_id: category.id, priority: /urgent|deadline|critical|अंतिम तिथि|તાત્કાલિક/i.test(text) ? 'High' : 'Medium', language };
        if (current.context.pending_ticket.subject.length < 5) current.context.pending_ticket.subject = `Support request: ${current.context.pending_ticket.subject}`;
        const routedCategory = state.categories.find((c) => c.id === current.context.pending_ticket.category_id);
        const department = state.departments.find((d) => d.id === routedCategory?.department_id);
        current.context.intent = human ? categoryIntent : intent;
        current.context.last_question = human ? previousIssue || text : pending ? current.context.last_question : text;
        if (human) actions.push(logAction(state, current, 'request_human_support', { issue: previousIssue || text }, 'Human support requested; waiting for student confirmation', 'success', language));
        else if (!pending) actions.push(logAction(state, current, 'search_faq', { query: text, language, intent }, 'No confirmed answer for this specific issue', 'no_match', language));
        actions.push(logAction(state, current, 'get_departments', { category_id: current.context.pending_ticket.category_id }, `${department?.name || 'Administration'} selected by category mapping`, 'success', language));
        reply = { content: pending ? copy.confirmation : `${human ? copy.human : copy.noMatch}\n\n${copy.followup}`, type: 'confirmation', pending_ticket: { ...current.context.pending_ticket }, decision: null };
      }
      const assistantMessage = addMessage(state, current, { ...reply, language, intent, actions });
      if (reply.type === 'confirmation') current.context.pending_ticket.confirmation_message_id = assistantMessage.id;
      return { session: sessionDetail(state, current), user_message: userMessage, assistant_message: assistantMessage };
    });
  });
}

const confirmationLocks = new Set();
export async function confirmTicket(sessionId, messageId, confirmed) {
  const lockKey = `${sessionId}:${messageId}`;
  if (confirmationLocks.has(lockKey)) throw new ApiError('Your ticket is being created. Please wait.');
  confirmationLocks.add(lockKey);
  try {
    return await mockRequest('POST', `/api/v1/agent/sessions/${sessionId}/confirm-ticket`, async () => {
      const epoch = getDatabaseEpoch();
      const user = requireUser(['student']);
      const session = findSession(getDatabase(), sessionId, user.id);
      const pending = session.context.pending_ticket;
      const original = getDatabase().chat_messages.find((m) => m.id === messageId && m.session_id === session.id);
      if (original?.decision === 'created') return { session: sessionDetail(getDatabase(), session), ticket: enrichTicket(getDatabase(), getDatabase().tickets.find((t) => t.id === original.ticket_id)) };
      if (!pending || pending.confirmation_message_id !== messageId) throw new ApiError('This confirmation has expired. Use the latest confirmation card.');
      const language = pending.language || session.language;
      const response = confirmed ? await createTicket({ ...pending, source: 'ai', idempotency_key: `chat-${sessionId}-${messageId}` }) : null;
      assertRequestEpoch(epoch);
      return mutateDatabase((db) => {
        const current = findSession(db, sessionId, user.id);
        const card = db.chat_messages.find((m) => m.id === messageId && m.session_id === current.id);
        card.decision = confirmed ? 'created' : 'cancelled';
        card.ticket_id = response?.data.id || null;
        delete current.context.pending_ticket;
        const actions = [];
        if (response) {
          current.context.last_ticket_number = response.data.ticket_number;
          actions.push(logAction(db, current, 'create_ticket', { student_confirmed: true, category_id: pending.category_id }, `${response.data.ticket_number} → ${response.data.department.name} → ${response.data.assigned_staff?.name || 'Awaiting assignment'}`, 'success', language));
        }
        addMessage(db, current, { content: confirmed ? agentText[language].created : agentText[language].cancelled, type: confirmed ? 'ticket' : 'text', language, ticket_id: response?.data.id || null, actions });
        return { session: sessionDetail(db, current), ticket: response?.data || null };
      });
    });
  } finally { confirmationLocks.delete(lockKey); }
}

export async function setMessageFeedback(messageId, feedback) {
  return mockRequest('POST', `/api/v1/agent/messages/${messageId}/feedback`, () => {
    const user = requireUser(['student']);
    if (!['up', 'down'].includes(feedback)) throw new ApiError('Choose helpful or not helpful.');
    return mutateDatabase((db) => {
      const message = db.chat_messages.find((m) => m.id === messageId && m.type === 'faq');
      if (!message) throw new ApiError('FAQ message not found.', 404);
      findSession(db, message.session_id, user.id);
      const faq = db.faqs.find((f) => f.id === message.faq_id);
      if (faq) faq.helpful += (feedback === 'up' ? 1 : 0) - (message.feedback === 'up' ? 1 : 0);
      message.feedback = feedback;
      return { feedback };
    });
  });
}

export async function deleteSession(id) {
  return mockRequest('DELETE', `/api/v1/agent/sessions/${id}`, () => {
    const user = requireUser(['student']);
    return mutateDatabase((db) => { findSession(db, id, user.id); db.chat_sessions = db.chat_sessions.filter((s) => s.id !== id); db.chat_messages = db.chat_messages.filter((m) => m.session_id !== id); return { deleted: true }; });
  });
}

export const chatService = { getSessions, createSession, getSession, sendMessage, confirmTicket, setMessageFeedback, deleteSession };
