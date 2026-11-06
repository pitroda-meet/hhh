import { ApiError, mockRequest, requireUser } from './api.js';
import { getDatabase, isoNow, mutateDatabase, nextId, notify } from '../mock/database.js';

function enrichFaq(db, faq) {
  return { ...faq, category: db.categories.find((c) => c.id === faq.category_id), translations: Object.fromEntries(db.faq_translations.filter((t) => t.faq_id === faq.id).map((t) => [t.language, t])), suggested_by_user: db.users.find((u) => u.id === faq.suggested_by)?.name || null };
}

export async function getFaqs(params = {}) {
  return mockRequest('GET', '/api/faqs', () => {
    const user = requireUser();
    const db = getDatabase();
    let faqs = db.faqs.filter((f) => params.manage && user.role === 'admin' ? true : f.status === 'published');
    if (params.status && params.status !== 'All') faqs = faqs.filter((f) => f.status === params.status);
    if (params.category_id) faqs = faqs.filter((f) => f.category_id === Number(params.category_id));
    if (params.search?.trim()) {
      const query = params.search.trim().toLowerCase();
      faqs = faqs.filter((f) => db.faq_translations.some((t) => t.faq_id === f.id && `${t.question} ${t.answer} ${t.keywords}`.toLowerCase().includes(query)));
    }
    return faqs.map((f) => ({ ...enrichFaq(db, f), feedback: db.faq_feedback.find((item) => item.faq_id === f.id && item.user_id === user.id)?.value || null }));
  });
}

export async function saveFaq(input) {
  return mockRequest(input.id ? 'PUT' : 'POST', `/api/admin/faqs${input.id ? `/${input.id}` : ''}`, () => {
    const user = requireUser(['admin']);
    if (!['draft', 'suggested', 'approved', 'published'].includes(input.status)) throw new ApiError('Choose a valid FAQ publication status.');
    const requiredLanguages = input.status === 'draft' || input.status === 'suggested' ? ['en'] : ['en', 'hi', 'gu'];
    requiredLanguages.forEach((language) => {
      if (!input.translations?.[language]?.question?.trim() || !input.translations?.[language]?.answer?.trim()) throw new ApiError(`A question and answer in ${language.toUpperCase()} are required${requiredLanguages.length === 3 ? ' before approval or publication' : ''}.`);
    });
    return mutateDatabase((db) => {
      if (!db.categories.some((c) => c.id === Number(input.category_id) && c.active)) throw new ApiError('Choose an active FAQ category.');
      let faq = input.id ? db.faqs.find((f) => f.id === input.id) : null;
      if (input.id && !faq) throw new ApiError('FAQ not found.', 404);
      if (!faq) {
        faq = { id: nextId(db.faqs), created_at: isoNow(db), suggested_by: null, views: 0, helpful: 0 };
        db.faqs.push(faq);
      }
      Object.assign(faq, { category_id: Number(input.category_id), status: input.status, approved_by: ['approved', 'published'].includes(input.status) ? user.id : null, updated_at: isoNow(db) });
      ['en', 'hi', 'gu'].forEach((language) => {
        const value = input.translations?.[language] || {};
        let translation = db.faq_translations.find((t) => t.faq_id === faq.id && t.language === language);
        if (!translation) { translation = { id: nextId(db.faq_translations), faq_id: faq.id, language }; db.faq_translations.push(translation); }
        Object.assign(translation, { question: value.question?.trim() || '', answer: value.answer?.trim() || '', keywords: value.keywords?.trim() || '' });
      });
      if (faq.suggested_by && ['approved', 'published'].includes(faq.status)) notify(db, [faq.suggested_by], { type: 'faq', title: 'Your FAQ suggestion was approved', message: input.translations.en.question });
      return enrichFaq(db, faq);
    });
  });
}

export async function deleteFaq(id) {
  return mockRequest('DELETE', `/api/admin/faqs/${id}`, () => {
    requireUser(['admin']);
    return mutateDatabase((db) => { db.faqs = db.faqs.filter((f) => f.id !== id); db.faq_translations = db.faq_translations.filter((f) => f.faq_id !== id); return { deleted: true }; });
  });
}

export async function suggestFaq(ticketId, { question, answer }) {
  return mockRequest('POST', `/api/staff/queries/${ticketId}/suggest-faq`, () => {
    const user = requireUser(['staff', 'admin']);
    if (!question?.trim() || !answer?.trim()) throw new ApiError('Enter a reusable question and an answer.');
    return mutateDatabase((db) => {
      const ticket = db.tickets.find((t) => t.id === Number(ticketId));
      if (!ticket || (user.role === 'staff' && !user.department_ids.includes(ticket.department_id))) throw new ApiError('This ticket is not accessible.', 404);
      const faq = { id: nextId(db.faqs), category_id: ticket.category_id, status: 'suggested', suggested_by: user.id, approved_by: null, source_ticket_id: ticket.id, views: 0, helpful: 0, created_at: isoNow(db), updated_at: isoNow(db) };
      db.faqs.push(faq);
      ['en', 'hi', 'gu'].forEach((language) => db.faq_translations.push({ id: nextId(db.faq_translations), faq_id: faq.id, language, question: language === 'en' ? question.trim() : '', answer: language === 'en' ? answer.trim() : '', keywords: '' }));
      notify(db, db.users.filter((u) => u.role === 'admin' && u.active).map((u) => u.id), { type: 'faq', title: 'A new FAQ is ready for review', message: `${user.name} suggested: ${question.trim()}` });
      return enrichFaq(db, faq);
    });
  });
}

export async function setFaqFeedback(id, value) {
  return mockRequest('POST', `/api/faqs/${id}/feedback`, () => {
    const user = requireUser();
    if (!['up', 'down'].includes(value)) throw new ApiError('Choose helpful or not helpful.');
    return mutateDatabase((db) => {
      const faq = db.faqs.find((item) => item.id === Number(id) && item.status === 'published');
      if (!faq) throw new ApiError('Published FAQ not found.', 404);
      let feedback = db.faq_feedback.find((item) => item.faq_id === faq.id && item.user_id === user.id);
      const previous = feedback?.value;
      if (!feedback) { feedback = { id: nextId(db.faq_feedback), faq_id: faq.id, user_id: user.id }; db.faq_feedback.push(feedback); }
      Object.assign(feedback, { value, updated_at: isoNow(db) });
      faq.helpful = Math.max(0, faq.helpful + (value === 'up' ? 1 : 0) - (previous === 'up' ? 1 : 0));
      return { feedback: value, helpful: faq.helpful };
    });
  });
}

export const faqService = { getFaqs, saveFaq, deleteFaq, suggestFaq, setFaqFeedback };
