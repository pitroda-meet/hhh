let seq = 0;

export function uniqueId(prefix = 'e2e') {
  seq += 1;
  return `${prefix}-${Date.now()}-${seq}`;
}

export function uniqueEmail(prefix = 'student') {
  return `${uniqueId(prefix).toLowerCase()}@iti.demo`;
}

export function uniqueTicketData(overrides = {}) {
  const id = uniqueId('ticket');
  return {
    subject: `E2E Hall Ticket Query ${id}`,
    categoryName: 'Examination',
    priority: 'High',
    description: `Automated E2E verification query (${id}) requesting examination hall ticket correction and verification.`,
    ...overrides,
  };
}

export function uniqueFaqData(overrides = {}) {
  const id = uniqueId('faq');
  return {
    keyword: `e2ekey_${id}`,
    categoryName: 'Scholarship',
    translations: {
      en: {
        question: `E2E FAQ Question ${id}?`,
        answer: `E2E FAQ English Answer for ${id}. Please check the Digital Gujarat portal.`,
        keywords: `e2efaq ${id} scholarship`,
      },
      hi: {
        question: `E2E हिंदी प्रश्न ${id}?`,
        answer: `E2E हिंदी उत्तर ${id}। कृपया पोर्टल जांचें।`,
        keywords: `हिंदी ${id}`,
      },
      gu: {
        question: `E2E ગુજરાતી પ્રશ્ન ${id}?`,
        answer: `E2E ગુજરાતી જવાબ ${id}. કૃપા કરીને પોર્ટલ તપાસો.`,
        keywords: `ગુજરાતી ${id}`,
      },
    },
    ...overrides,
  };
}

export function uniqueDeptData(overrides = {}) {
  const suffix = String(Date.now()).slice(-5);
  return {
    name: `E2E Dept ${suffix}`,
    code: `E2E${suffix}`,
    sla_hours: '36',
    description: `Temporary department created by Playwright E2E ${suffix}`,
    ...overrides,
  };
}

export function uniqueCategoryData(overrides = {}) {
  const suffix = String(Date.now()).slice(-5);
  return {
    name: `E2E Category ${suffix}`,
    description: `Temporary category created by Playwright E2E ${suffix}`,
    ...overrides,
  };
}

export function uniqueRuleData(overrides = {}) {
  const suffix = String(Date.now()).slice(-5);
  return {
    name: `E2E SLA Rule ${suffix}`,
    threshold_hours: '18',
    target_role: 'Supervisor',
    priority: 'High',
    ...overrides,
  };
}

