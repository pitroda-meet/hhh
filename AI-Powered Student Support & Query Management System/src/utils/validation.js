import { PRIORITIES, ROLES } from './constants.js';

export const ALLOWED_ATTACHMENT_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'doc', 'docx', 'txt'];
export const MAX_ATTACHMENT_COUNT = 5;
export const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;

export function isValidEmail(value = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

export function isValidPhone(value = '') {
  const trimmed = String(value).trim();
  if (!trimmed) return true;
  return /^[0-9+\-\s()]{7,20}$/.test(trimmed);
}

export function extractValidationErrors(error) {
  const serverErrors = error?.response?.data?.errors;
  if (!serverErrors || typeof serverErrors !== 'object') return {};
  return Object.fromEntries(
    Object.entries(serverErrors).map(([field, messages]) => [
      field,
      Array.isArray(messages) ? messages[0] : String(messages),
    ]),
  );
}

export function validateLogin(form) {
  const errors = {};
  if (!isValidEmail(form.email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (!String(form.password || '').trim()) {
    errors.password = 'Password is required.';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateRegister(form) {
  const errors = {};
  const name = String(form.name || '').trim();
  if (name.length < 2) errors.name = 'Full name must be at least 2 characters.';
  if (!isValidEmail(form.email)) errors.email = 'Enter a valid email address.';
  if (!isValidPhone(form.phone)) errors.phone = 'Enter a valid mobile number (7–20 digits).';
  if ((form.password || '').length < 8) errors.password = 'Password must be at least 8 characters.';
  if (form.password !== form.confirm_password) errors.confirm_password = 'The passwords do not match.';
  if (!String(form.institute || '').trim()) errors.institute = 'Please select your institute.';
  if (!String(form.trade || '').trim()) errors.trade = 'Please select your trade.';
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateProfile(form) {
  const errors = {};
  if (String(form.name || '').trim().length < 2) errors.name = 'Full name must be at least 2 characters.';
  if (!isValidPhone(form.phone)) errors.phone = 'Enter a valid mobile number (7–20 digits).';
  if (!String(form.institute || '').trim()) errors.institute = 'Please select your institute.';
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateNewQuery(form) {
  const errors = {};
  const subject = String(form.subject || '').trim();
  const description = String(form.description || '').trim();
  if (subject.length < 5 || subject.length > 150) {
    errors.subject = 'Subject must be between 5 and 150 characters.';
  }
  if (!form.category_id) {
    errors.category_id = 'Please select a query category.';
  }
  if (form.priority && !PRIORITIES.includes(form.priority)) {
    errors.priority = 'Choose a valid priority.';
  }
  if (description.length < 10 || description.length > 5000) {
    errors.description = 'Description must be between 10 and 5,000 characters.';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateAttachmentFiles(newFiles, existingFiles = []) {
  const errors = [];
  const accepted = [];

  if (existingFiles.length + newFiles.length > MAX_ATTACHMENT_COUNT) {
    errors.push(`You can attach up to ${MAX_ATTACHMENT_COUNT} files per query.`);
    return { accepted, errors };
  }

  for (const file of newFiles) {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_ATTACHMENT_EXTENSIONS.includes(ext)) {
      errors.push(`"${file.name}" has an unsupported file type. Allowed: ${ALLOWED_ATTACHMENT_EXTENSIONS.join(', ').toUpperCase()}.`);
      continue;
    }
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      errors.push(`"${file.name}" exceeds the 5 MB file size limit.`);
      continue;
    }
    accepted.push({
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      file,
    });
  }

  return { accepted, errors };
}

export function validateReplyOrNote(text, { isNote = false, hasAttachments = false } = {}) {
  const trimmed = String(text || '').trim();
  if (isNote) {
    if (trimmed.length < 2) return 'Write an internal note of at least 2 characters.';
    if (trimmed.length > 5000) return 'Internal note must be 5,000 characters or fewer.';
    return null;
  }
  if (!trimmed && !hasAttachments) return 'Write a reply or attach a file before sending.';
  if (trimmed.length > 5000) return 'Reply must be 5,000 characters or fewer.';
  return null;
}

export function validateReassign(form) {
  const errors = {};
  if (!form.department_id) errors.department_id = 'Select a target department.';
  if (String(form.note || '').trim().length < 3) errors.note = 'Provide a short handover note (min 3 characters).';
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateFaqSuggestion(form) {
  const errors = {};
  if (String(form.question || '').trim().length < 5) errors.question = 'Question must be at least 5 characters.';
  if (String(form.answer || '').trim().length < 5) errors.answer = 'Answer must be at least 5 characters.';
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateChatMessage(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return 'Please enter a message before sending.';
  if (trimmed.length > 3000) return 'Messages must be 3,000 characters or fewer.';
  return null;
}

export function validateManagementRecord(entity, form) {
  const errors = {};
  if (entity === 'users') {
    if (String(form.name || '').trim().length < 2) errors.name = 'Name must be at least 2 characters.';
    if (!isValidEmail(form.email)) errors.email = 'Enter a valid email address.';
    if (!ROLES.includes(form.role)) errors.role = 'Choose a valid role.';
    if (!isValidPhone(form.phone)) errors.phone = 'Enter a valid mobile number (7–20 digits).';
    if (form.password && form.password.length < 8) errors.password = 'Password must be at least 8 characters.';
  } else if (entity === 'departments') {
    if (String(form.name || '').trim().length < 2) errors.name = 'Department name must be at least 2 characters.';
    if (!/^[A-Za-z0-9_-]{2,12}$/.test(String(form.code || '').trim())) {
      errors.code = 'Code must be 2–12 alphanumeric characters.';
    }
    const sla = Number(form.sla_hours);
    if (!Number.isFinite(sla) || sla < 1 || sla > 168) {
      errors.sla_hours = 'SLA must be between 1 and 168 hours.';
    }
  } else if (entity === 'categories') {
    if (String(form.name || '').trim().length < 2) errors.name = 'Category name must be at least 2 characters.';
    if (!form.department_id) errors.department_id = 'Select an active department.';
  } else if (entity === 'assignments') {
    if (!form.id) errors.id = 'Select a staff member.';
  } else if (entity === 'escalation_rules') {
    if (String(form.name || '').trim().length < 2) errors.name = 'Rule name must be at least 2 characters.';
    const threshold = Number(form.threshold_hours);
    if (!Number.isFinite(threshold) || threshold < 1 || threshold > 720) {
      errors.threshold_hours = 'Threshold must be between 1 and 720 hours.';
    }
    if (!['supervisor', 'principal_admin'].includes(form.target_role)) {
      errors.target_role = 'Select a valid escalation target.';
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateFaqForm(form, publish = false) {
  const errors = {};
  const targetStatus = publish ? 'published' : form.status;
  if (!form.category_id) errors.category_id = 'Select an active FAQ category.';
  const requiredLangs = ['draft', 'suggested'].includes(targetStatus) ? ['en'] : ['en', 'hi', 'gu'];
  for (const lang of requiredLangs) {
    const item = form.translations?.[lang] || {};
    if (!String(item.question || '').trim() || !String(item.answer || '').trim()) {
      errors[`translations.${lang}`] = `Both question and answer in ${lang.toUpperCase()} are required${requiredLangs.length === 3 ? ' before approval or publication' : ''}.`;
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

