import en from './en.json';
import hi from './hi.json';
import gu from './gu.json';

export const dictionaries = { en, hi, gu };
export function translate(language, key, values = {}) {
  let value = dictionaries[language]?.[key] || en[key] || key;
  Object.entries(values).forEach(([name, replacement]) => { value = value.replaceAll(`{{${name}}}`, replacement); });
  return value;
}
