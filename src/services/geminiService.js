import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;
let model = null;

function getModel() {
  if (model) return model;
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
  if (!apiKey) throw new Error('REACT_APP_GEMINI_API_KEY non configurata. Aggiungi la key nel file .env');
  genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  return model;
}

const SYSTEM_PROMPT = `Sei l'assistente AI di Ultranalytics, una piattaforma di analytics per club ed eventi notturni.

Il tuo ruolo è analizzare i dati degli eventi (registrazioni, presenze, conversioni, trend, fasce orarie, brand) e fornire insight strategici e consigli operativi al gestore del club.

Rispondi SEMPRE in italiano. Sii conciso, pratico e orientato all'azione.

Quando rispondi:
- Usa numeri e percentuali dai dati quando possibile
- Dai consigli concreti e specifici, non generici
- Se non hai abbastanza dati per rispondere, dillo chiaramente
- Formatta le risposte con bullet points per leggibilità
- Non inventare dati che non ti sono stati forniti`;

async function withRetry(fn, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const is429 = err.message?.includes('429') || err.message?.includes('Resource exhausted');
      if (!is429 || attempt === maxRetries) throw err;
      const delay = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

export async function askGemini(question, dataSummary) {
  const m = getModel();

  const prompt = `${SYSTEM_PROMPT}

--- DATI ATTUALI DEL CLUB ---
${dataSummary}
--- FINE DATI ---

Domanda dell'utente: ${question}`;

  return withRetry(async () => {
    const result = await m.generateContent(prompt);
    const response = result.response;
    return response.text();
  });
}

const REPORT_PROMPT = `Sei un analista esperto di eventi e club notturni. Genera un REPORT STRATEGICO conciso per il gestore del club basandoti esclusivamente sui dati forniti.

Struttura del report:

## Situazione attuale
Stato dell'edizione corrente: registrazioni, giorni mancanti, confronto immediato con la media.

## Confronto con edizioni precedenti
Delta vs media storica, quali edizioni andavano meglio/peggio allo stesso punto, trend tra anni diversi se disponibili.

## Proiezione e obiettivo
Proiezione finale commentata, probabilità di superare la media storica, quanto manca all'obiettivo.

## Punti di forza
Cosa sta funzionando bene rispetto al passato (max 3 punti).

## Aree di attenzione
Rischi o criticità da monitorare (max 3 punti).

## Azioni consigliate
3-5 suggerimenti operativi concreti e specifici per i prossimi giorni.

REGOLE:
- Usa SOLO numeri e percentuali dai dati forniti, non inventare nulla
- Sii conciso e diretto, massimo 400 parole
- Rispondi in italiano
- Usa bullet points per leggibilità
- Se l'evento è già concluso, adatta il report come riepilogo post-evento`;

export async function generateTrackerReport(trackerSummary) {
  const m = getModel();

  const prompt = `${REPORT_PROMPT}

--- DATI LIVE TRACKER ---
${trackerSummary}
--- FINE DATI ---

Genera il report strategico.`;

  return withRetry(async () => {
    const result = await m.generateContent(prompt);
    const response = result.response;
    return response.text();
  });
}

export function isGeminiConfigured() {
  return !!process.env.REACT_APP_GEMINI_API_KEY;
}
