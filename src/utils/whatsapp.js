/**
 * Shared WhatsApp utility — phone formatting, URL generation, templates, event link scraping.
 */

const SITE_URL = 'https://www.creazionisrl.it';

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

// ---- Event link scraping from creazionisrl.it ----

let _cachedEventLinks = null;

/**
 * Fetch event links from creazionisrl.it homepage.
 * Returns array of { title, url } or empty array on failure.
 * Results are cached for the session.
 */
export async function fetchEventLinks() {
  if (_cachedEventLinks) return _cachedEventLinks;

  try {
    // Try direct fetch first, then CORS proxy as fallback
    let html = null;
    try {
      const res = await fetch(SITE_URL, { mode: 'cors' });
      if (res.ok) html = await res.text();
    } catch {
      // CORS blocked — try proxy
    }

    if (!html) {
      try {
        const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(SITE_URL)}`);
        if (res.ok) html = await res.text();
      } catch {
        // Proxy also failed
      }
    }

    if (!html) {
      _cachedEventLinks = [];
      return [];
    }

    // Parse HTML to extract event links
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const links = doc.querySelectorAll('a[href$=".htm"]');

    const events = [];
    const seen = new Set();
    links.forEach(a => {
      const href = a.getAttribute('href');
      if (!href) return;
      const url = href.startsWith('http') ? href : `${SITE_URL}/${href.replace(/^\//, '')}`;
      if (seen.has(url)) return;
      seen.add(url);

      // Get text from link or parent
      const title = (a.textContent || '').trim() ||
        (a.querySelector('img')?.getAttribute('alt') || '').trim();
      if (title) {
        events.push({ title, url });
      }
    });

    _cachedEventLinks = events;
    return events;
  } catch {
    _cachedEventLinks = [];
    return [];
  }
}

/**
 * Match an event link from the scraped list for a given brand + edition.
 * @param {Array} eventLinks - From fetchEventLinks()
 * @param {string} brand - Brand name (e.g. "ATIPICO")
 * @param {string} editionLabel - Edition label (e.g. "21.02.26")
 * @returns {string} The matched URL or fallback to site homepage
 */
export function matchEventLink(eventLinks, brand, editionLabel) {
  if (!eventLinks || !eventLinks.length || !brand) return SITE_URL;

  const brandLower = brand.toLowerCase();

  // Try to find an event whose title contains the brand name
  const matches = eventLinks.filter(e => e.title.toLowerCase().includes(brandLower));

  if (matches.length === 1) return matches[0].url;

  if (matches.length > 1) {
    // Multiple matches — try to narrow down by date from edition label
    // editionLabel format: "DD.MM.YY" e.g. "21.02.26"
    const parts = editionLabel.split('.');
    if (parts.length >= 2) {
      const day = parts[0];
      const month = parts[1];
      // Look for the day+month in the title or URL
      const dateMatch = matches.find(e => {
        const t = e.title.toLowerCase();
        const u = e.url.toLowerCase();
        return (t.includes(day) && (t.includes(month) || u.includes(day))) ||
               u.includes(`${day}-`) || u.includes(`${day}_`);
      });
      if (dateMatch) return dateMatch.url;
    }
    // Still ambiguous — return first match
    return matches[0].url;
  }

  // No match by brand name — fallback
  return SITE_URL;
}
