/**
 * Shared WhatsApp utility — phone formatting, URL generation, templates, event link scraping.
 */

/**
 * Format an Italian phone number into a WhatsApp API URL.
 * @param {string} phone
 * @param {string} [message] - Optional pre-filled message
 * @returns {string|null}
 */
export function formatWhatsAppUrl(phone, message) {
  if (!phone) return null;
  let num = phone.replace(/[\s\-()./]/g, '');
  if (num.startsWith('+')) num = num.slice(1);
  if (num.startsWith('00')) num = num.slice(2);
  if (num.startsWith('3') && num.length === 10) num = '39' + num;
  if (message) {
    const encoded = encodeURIComponent(message);
    return `https://api.whatsapp.com/send?phone=${num}&text=${encoded}`;
  }
  return `https://api.whatsapp.com/send?phone=${num}`;
}

let waWindow = null;

/**
 * Open a WhatsApp Web URL reusing the same browser tab.
 */
export function openWhatsAppTab(url) {
  if (!url) return;
  if (waWindow && !waWindow.closed) {
    waWindow.location.href = url;
    waWindow.focus();
  } else {
    waWindow = window.open(url, '_blank');
  }
}

/**
 * Replace placeholders in a template string.
 * Supported: {nome}, {brand}, {data}, {link}
 */
export function applyTemplate(template, replacements) {
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
  }
  return result;
}

/**
 * Retarget message templates — for inviting past attendees to upcoming editions.
 */
export const RETARGET_TEMPLATES = [
  {
    id: 'invito_standard',
    label: 'Invito standard',
    icon: '🎉',
    text: `Ciao {nome}! 😄

Ti scriviamo perché sei già stato/a al {brand} e ci farebbe piacere rivederti!

La prossima edizione è il {data} — non mancare! 🔥

Registrati qui: {link}

Ti aspettiamo!

— Studios Club & Co`,
  },
  {
    id: 'invito_esclusivo',
    label: 'Invito esclusivo',
    icon: '✨',
    text: `Ciao {nome}! 👋

Abbiamo visto che hai partecipato a edizioni passate di {brand} e volevamo darti un'anteprima: la prossima edizione sarà il {data}! 🎶

Come ospite di ritorno, ti riserviamo un accesso prioritario 🌟

Registrati qui: {link}

Scrivici per confermare la tua presenza!

— Studios Club & Co`,
  },
  {
    id: 'invito_breve',
    label: 'Invito breve',
    icon: '📩',
    text: `Ciao {nome}! {brand} torna il {data}! 😊

Registrati qui: {link}

Ti aspettiamo!

— Studios Club & Co`,
  },
];

