export function detectLanguage(text) {
  if (/[\u0A80-\u0AFF]/u.test(text)) return 'gu';
  if (/[\u0900-\u097F]/u.test(text)) return 'hi';
  return 'en';
}

const intentKeywords = {
  'Ticket Tracking': ['iti-2026-', 'ticket status', 'track ticket', 'टिकट की स्थिति', 'टिकट स्थिति', 'ટિકિટની સ્થિતિ', 'ટિકિટ સ્ટેટસ'],
  'Human Assistance': ['human', 'person', 'talk to staff', 'staff member', 'इंसान', 'कर्मचारी से बात', 'मानव', 'વ્યક્તિ', 'કર્મચારી સાથે', 'માનવ'],
  Examination: ['exam', 'hall ticket', 'admit card', 'ncvt', 'scvt', 'marksheet', 'registration', 'परीक्षा', 'पंजीकरण', 'हॉल टिकट', 'अंकतालिका', 'રજિસ્ટ્રેશન', 'પરીક્ષા', 'નોંધણી', 'હોલ ટિકિટ', 'માર્કશીટ'],
  Scholarship: ['scholarship', 'digital gujarat', 'stipend', 'छात्रवृत्ति', 'स्कॉलरशिप', 'શિષ્યવૃત્તિ', 'સ્કોલરશિપ', 'સ્કોલરશીપ'],
  Academic: ['attendance', 'syllabus', 'class', 'study', 'leave', 'timetable', 'उपस्थिति', 'पाठ्यक्रम', 'कक्षा', 'अध्ययन', 'छुट्टी', 'હાજરી', 'અભ્યાસ', 'વર્ગ', 'રજા', 'સમયપત્રક'],
  'Workshop/Trade': ['workshop', 'machine', 'practical', 'ppe', 'lathe', 'welding', 'कार्यशाला', 'वर्कशॉप', 'मशीन', 'प्रैक्टिकल', 'વર્કશોપ', 'કાર્યશાળા', 'મશીન', 'પ્રેક્ટિકલ'],
  'Student Welfare': ['apprentice', 'hostel', 'bus pass', 'placement', 'welfare', 'अप्रेंटिस', 'छात्रावास', 'हॉस्टल', 'बस', 'એપ્રેન્ટિસ', 'હોસ્ટેલ', 'બસ', 'પ્લેસમેન્ટ'],
  Technical: ['password', 'wifi', 'wi-fi', 'internet', 'computer', 'login', 'otp', 'पासवर्ड', 'वाईफाई', 'इंटरनेट', 'कंप्यूटर', 'लॉगिन', 'પાસવર્ડ', 'વાઈફાઈ', 'ઇન્ટરનેટ', 'કમ્પ્યુટર', 'લોગિન'],
  Administrative: ['fee', 'admission', 'certificate', 'bonafide', 'name correction', 'फीस', 'शुल्क', 'प्रवेश', 'प्रमाणपत्र', 'बोनाफाइड', 'ફી', 'પ્રવેશ', 'પ્રમાણપત્ર', 'બોનાફાઇડ'],
};
export const intentCategory = { Academic: 1, Examination: 2, Scholarship: 3, Administrative: 4, Technical: 5, 'Workshop/Trade': 6, 'Student Welfare': 7, General: 8 };

export function classifyIntent(text, previousIntent) {
  const normalized = text.toLowerCase();
  for (const name of ['Ticket Tracking', 'Human Assistance']) if (intentKeywords[name].some((key) => normalized.includes(key))) return name;
  const scored = Object.entries(intentKeywords).filter(([key]) => intentCategory[key]).map(([name, words]) => ({ name, score: words.reduce((total, word) => total + (normalized.includes(word) ? 1 : 0), 0) })).sort((a, b) => b.score - a.score);
  return scored[0]?.score ? scored[0].name : previousIntent && intentCategory[previousIntent] ? previousIntent : 'General';
}

const stopWords = new Set('how do i a an the to for my is are can where what of in it get please me with and which apply करें कैसे मैं मेरा मेरी के की का लिए है क्या कहाँ मुझे માટે કેવી રીતે હું મારી મારો છે ક્યાં શું કરો'.split(' '));
const tokenize = (text) => text.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}\p{M}\s-]/gu, ' ').split(/\s+/u).filter((word) => word.length > 1 && !stopWords.has(word));

function editDistance(a, b) {
  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const old = previous[j];
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = old;
    }
  }
  return previous[b.length];
}

export function searchApprovedFaq(db, text, language, intent) {
  const queryTokens = tokenize(text);
  const issueSpecific = /error|failed|not working|unable|cannot|can't|not able|mismatch|duplicate|त्रुटि|नहीं हो|नहीं कर|नहीं खुल|गलती|डुप्लिकेट|एरर|ભૂલ|નથી થ|નથી ખુલ|થતું નથી|એરર|ડુપ્લિકેટ|ખામી/i.test(text);
  const issueWords = ['duplicate', 'mismatch', 'error', 'failed', 'डुप्लिकेट', 'त्रुटि', 'एरर', 'ડુપ્લિકેટ', 'એરર', 'ભૂલ'];
  const candidates = db.faqs.filter((f) => f.status === 'published');
  const results = candidates.map((faq) => {
    const translations = db.faq_translations.filter((t) => t.faq_id === faq.id);
    const translation = translations.find((t) => t.language === language && t.answer) || translations.find((t) => t.language === 'en');
    if (!translation) return null;
    const tokens = [...new Set(translations.flatMap((t) => tokenize(`${t.question} ${t.keywords}`)))];
    let matches = 0;
    let strong = 0;
    queryTokens.forEach((token) => {
      const exact = tokens.some((word) => word === token);
      const fuzzy = !exact && token.length >= 5 && tokens.some((word) => Math.abs(word.length - token.length) <= 1 && editDistance(token, word) <= (token.length > 8 ? 2 : 1));
      if (exact) { matches += 1; if (token.length > 3) strong += 1; }
      else if (fuzzy) matches += .78;
    });
    const specific = issueWords.filter((word) => text.toLowerCase().includes(word));
    const matchedIssue = specific.some((word) => `${translation.question} ${translation.keywords}`.toLowerCase().includes(word));
    // General procedural answers must not be presented as fixes for a personal registration error.
    if (issueSpecific && !matchedIssue && !/forgot|reset|भूल|रीसेट|ભૂલી|રીસેટ/i.test(text)) return null;
    const coverage = matches / Math.max(queryTokens.length, 1);
    const categoryBoost = faq.category_id === intentCategory[intent] ? .12 : 0;
    return { faq, translation, score: coverage + categoryBoost + Math.min(strong, 4) * .045, matches };
  }).filter(Boolean).sort((a, b) => b.score - a.score || b.matches - a.matches || a.faq.id - b.faq.id);
  const best = results[0];
  return best && best.score >= .5 && best.matches >= .75 ? { ...best, confidence: Math.min(.99, Math.max(.65, best.score)) } : null;
}

export const agentText = {
  en: {
    welcome: 'Hi! I’m Sahay, your student support companion. Ask me about scholarships, exams, classes, or anything about your ITI. I’ll find an approved answer or connect you with the right person.',
    noMatch: 'I couldn’t find a confirmed answer for this specific issue in our approved FAQs. I can connect you with the right department.',
    followup: 'Could you share your trainee/application number and the exact error or what happened? You can add details below, or create a ticket with what you have already shared.',
    human: 'Of course. I’ll connect you with a staff member. Briefly describe the issue so I can route it correctly; I’ll only create a ticket after your confirmation.',
    confirmation: 'I’ve added those details to your request. Shall I create a support ticket for you?',
    created: 'Your support ticket is created. I’ve sent your complete description to the responsible department. You can follow every update in My Queries.',
    cancelled: 'No ticket was created. Your conversation is saved, and I’m here if you need more help.',
    tracked: 'Here’s the latest update on your support ticket.',
    missingTicket: 'Please share your ticket number, for example ITI-2026-00125. I can look up tickets belonging to your account.',
    ticketNotFound: 'I couldn’t find that ticket in your account. Check the ticket number in My Queries and try again.',
    departments: 'Our support teams are Academic, Examination, Scholarship, Administration, Technical / IT, and Workshop & Trade. Tell me what you need help with and I’ll find the right team.',
    greeting: 'Hello! How can I help you today? You can ask about scholarships, examination registration, hall tickets, attendance, or your ticket status.',
  },
  hi: {
    welcome: 'नमस्ते! मैं सहाय, आपका छात्र सहायता साथी हूँ। छात्रवृत्ति, परीक्षा, कक्षाओं या आईटीआई के बारे में पूछें। मैं स्वीकृत उत्तर खोजूँगा या सही कर्मचारी से जोड़ूँगा।',
    noMatch: 'इस विशेष समस्या का पुष्ट उत्तर हमारे स्वीकृत FAQ में नहीं मिला। मैं आपको सही विभाग से जोड़ सकता हूँ।',
    followup: 'कृपया अपना प्रशिक्षु/आवेदन नंबर और दिखाई देने वाली त्रुटि या समस्या का विवरण बताएँ। आप नीचे जानकारी जोड़ सकते हैं या अभी साझा किए विवरण से टिकट बना सकते हैं।',
    human: 'ज़रूर। मैं आपको कर्मचारी से जोड़ूँगा। समस्या संक्षेप में बताएँ ताकि सही विभाग चुन सकूँ। आपकी पुष्टि के बाद ही टिकट बनेगा।',
    confirmation: 'मैंने यह जानकारी आपके अनुरोध में जोड़ दी है। क्या आपके लिए सहायता टिकट बनाऊँ?',
    created: 'आपका सहायता टिकट बन गया है। पूरा विवरण जिम्मेदार विभाग को भेज दिया है। My Queries में हर अपडेट देख सकते हैं।',
    cancelled: 'कोई टिकट नहीं बनाया गया। बातचीत सुरक्षित है और मैं आगे भी मदद के लिए यहाँ हूँ।',
    tracked: 'आपके सहायता टिकट की नवीनतम स्थिति यहाँ है।',
    missingTicket: 'कृपया टिकट नंबर बताएँ, जैसे ITI-2026-00125। मैं आपके खाते के टिकट देख सकता हूँ।',
    ticketNotFound: 'यह टिकट आपके खाते में नहीं मिला। My Queries में नंबर जाँचकर दोबारा प्रयास करें।',
    departments: 'हमारे विभाग हैं: शैक्षणिक, परीक्षा, छात्रवृत्ति, प्रशासन, तकनीकी / आईटी और वर्कशॉप। अपनी समस्या बताएँ, मैं सही विभाग ढूँढूँगा।',
    greeting: 'नमस्ते! आज मैं आपकी कैसे मदद करूँ? छात्रवृत्ति, परीक्षा पंजीकरण, हॉल टिकट, उपस्थिति या टिकट की स्थिति के बारे में पूछें।',
  },
  gu: {
    welcome: 'નમસ્તે! હું સહાય, તમારો વિદ્યાર્થી સહાય સાથી છું. શિષ્યવૃત્તિ, પરીક્ષા, વર્ગો કે ITI વિશે પૂછો. હું માન્ય જવાબ શોધીશ અથવા યોગ્ય કર્મચારી સાથે જોડીશ.',
    noMatch: 'આ ચોક્કસ સમસ્યાનો ખાતરીવાળો જવાબ અમારા માન્ય FAQ માં મળ્યો નથી. હું તમને યોગ્ય વિભાગ સાથે જોડી શકું છું.',
    followup: 'કૃપા કરીને તમારો તાલીમાર્થી/અરજી નંબર અને દેખાતી ભૂલ કે સમસ્યાની વિગતો આપો. તમે નીચે વિગતો ઉમેરી શકો છો અથવા આપેલી માહિતીથી ટિકિટ બનાવી શકો છો.',
    human: 'ચોક્કસ. હું તમને કર્મચારી સાથે જોડીશ. યોગ્ય વિભાગ પસંદ કરવા સમસ્યા ટૂંકમાં જણાવો. તમારી પુષ્ટિ પછી જ ટિકિટ બનશે.',
    confirmation: 'મેં આ વિગતો તમારી વિનંતીમાં ઉમેરી છે. શું તમારા માટે સહાય ટિકિટ બનાવું?',
    created: 'તમારી સહાય ટિકિટ બની ગઈ છે. સંપૂર્ણ વિગતો જવાબદાર વિભાગને મોકલી છે. My Queries માં દરેક અપડેટ જોઈ શકો છો.',
    cancelled: 'કોઈ ટિકિટ બનાવવામાં આવી નથી. વાતચીત સાચવેલી છે અને હું આગળ મદદ માટે અહીં છું.',
    tracked: 'તમારી સહાય ટિકિટની તાજેતરની સ્થિતિ અહીં છે.',
    missingTicket: 'કૃપા કરીને ટિકિટ નંબર આપો, જેમ કે ITI-2026-00125. હું તમારા ખાતાની ટિકિટ જોઈ શકું છું.',
    ticketNotFound: 'આ ટિકિટ તમારા ખાતામાં મળી નથી. My Queries માં નંબર ચકાસીને ફરી પ્રયાસ કરો.',
    departments: 'અમારા વિભાગો: શૈક્ષણિક, પરીક્ષા, શિષ્યવૃત્તિ, વહીવટ, ટેકનિકલ / IT અને વર્કશોપ. તમારી જરૂરિયાત જણાવો, હું યોગ્ય વિભાગ શોધીશ.',
    greeting: 'નમસ્તે! આજે હું તમારી કેવી રીતે મદદ કરું? શિષ્યવૃત્તિ, પરીક્ષા નોંધણી, હોલ ટિકિટ, હાજરી અથવા ટિકિટની સ્થિતિ વિશે પૂછો.',
  },
};
