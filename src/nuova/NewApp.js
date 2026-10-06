import { useState, useEffect, useMemo, useCallback } from 'react';
import './nuova.css';
import { useUltraData } from './useUltraData';
import {
  indexEditions, summaryKpis, brandTable, hourCounts, peopleStats, birthdaysNext,
  upcomingEvents, tonightEdition, liveNight, attendanceIndex, venueKey, VENUES,
  indexSeries, withSeries, withoutSeries, nightId,
} from './model';
import { projectionAccuracy, enrichUpcoming } from './compare';
import { nightNameKey } from '../utils/eventNameCleaner';
import { latestPurchase } from '../utils/eventTime';
import { VenueDot } from './ui';
import { dmy, hm } from './format';
import Stasera from './sections/Stasera';
import Eventi from './sections/Eventi';
import Confronta from './sections/Confronta';
import Andamenti from './sections/Andamenti';
import Persone from './sections/Persone';
import Dati from './sections/Dati';

const SECTIONS = {
  stasera: { label: 'Stasera', title: 'Stasera', Component: Stasera, icon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /> },
  eventi: { label: 'Eventi', title: 'Eventi', Component: Eventi, icon: <><rect x="3" y="4" width="18" height="17" rx="1" /><path d="M16 2v4M8 2v4M3 10h18" /></> },
  confronta: { label: 'Confronta', title: 'Confronta', Component: Confronta, icon: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /> },
  andamenti: { label: 'Andamenti', title: 'Andamenti', Component: Andamenti, icon: <><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 5-6" /></> },
  persone: { label: 'Persone', title: 'Persone', Component: Persone, icon: <><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M22 21a6 6 0 0 0-4-5.6" /></> },
  dati: { label: 'Dati', title: 'Dati', Component: Dati, icon: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></> },
};

const Icon = ({ children }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

function readRoute() {
  const [section, ...rest] = window.location.hash.replace(/^#\/?/, '').split('/');
  return { section: SECTIONS[section] ? section : 'stasera', param: rest.length ? decodeURIComponent(rest.join('/')) : null };
}

const readVenue = () => { try { return localStorage.getItem('nx_venue') || 'tutti'; } catch { return 'tutti'; } };
const readWindow = () => { try { return Number(localStorage.getItem('nx_window')) || 30; } catch { return 30; } };

export default function NewApp({ user, logout, onOpenClassic }) {
  const data = useUltraData();
  const [route, setRoute] = useState(readRoute);
  const [venue, setVenue] = useState(readVenue);
  const [windowDays, setWindowDays] = useState(readWindow);
  const [tick, setTick] = useState(() => Math.floor(Date.now() / 600000));
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('ua_theme') || 'dark'; } catch { return 'dark'; } });

  useEffect(() => {
    const onHash = () => setRoute(readRoute());
    window.addEventListener('hashchange', onHash);
    const t = setInterval(() => setTick(Math.floor(Date.now() / 600000)), 60000);
    return () => { window.removeEventListener('hashchange', onHash); clearInterval(t); };
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    try { localStorage.setItem('ua_theme', theme); } catch { /* no storage */ }
  }, [theme]);
  useEffect(() => { try { localStorage.setItem('nx_venue', venue); } catch { /* no storage */ } }, [venue]);
  useEffect(() => { try { localStorage.setItem('nx_window', String(windowDays)); } catch { /* no storage */ } }, [windowDays]);

  const goTo = useCallback((section, param) => {
    window.location.hash = param ? `${section}/${encodeURIComponent(param)}` : section;
    window.scrollTo(0, 0);
  }, []);
  const clearSeed = useCallback(() => {
    window.history.replaceState(null, '', '#confronta');
    setRoute({ section: 'confronta', param: null });
  }, []);

  // Recomputed every 10 minutes (nights start and end), not on every render
  const now = useMemo(() => new Date(tick * 600000), [tick]);
  const records = useMemo(() => (venue === 'tutti' ? data.records : data.records.filter((r) => venueKey(r.location) === venue)), [data.records, venue]);
  const eds = useMemo(() => indexEditions(records, now), [records, now]);
  const people = useMemo(() => peopleStats(records, now), [records, now]);
  const kpis = useMemo(() => summaryKpis(records, eds, people), [records, eds, people]);
  const brandRows = useMemo(() => brandTable(eds), [eds]);
  const hours = useMemo(() => hourCounts(records), [records]);
  const seriesIdx = useMemo(() => indexSeries(eds, data.config?.series), [eds, data.config]);
  const counts = data.config?.counts;
  const accuracy = useMemo(() => projectionAccuracy(eds, seriesIdx), [eds, seriesIdx]);
  const upcoming = useMemo(
    () => enrichUpcoming(upcomingEvents(records, eds, now, 60, seriesIdx, counts), eds, seriesIdx, accuracy),
    [records, eds, now, seriesIdx, counts, accuracy]
  );
  const tonight = useMemo(() => tonightEdition(eds, now), [eds, now]);
  const live = useMemo(() => (tonight ? liveNight(tonight, eds, records, now, seriesIdx) : null), [tonight, eds, records, now, seriesIdx]);
  const { config, saveConfig, patchConfig } = data;
  const saveSeries = useCallback((name, nights) => saveConfig(withSeries(config, name, nights, eds)), [config, saveConfig, eds]);
  const deleteSeries = useCallback((name) => saveConfig(withoutSeries(config, name)), [config, saveConfig]);
  // Notes, counts typed in from the portal and event dates: one field each, saved online
  const who = user?.email ? user.email.split('@')[0] : '';
  const stamp = useCallback(() => ({ by: who, at: new Date().toISOString() }), [who]);
  const saveNote = useCallback((ed, text) => patchConfig(['notes', nightId(ed)], text.trim() ? { text: text.trim(), ...stamp() } : null), [patchConfig, stamp]);
  const saveCount = useCallback((ed, value) => patchConfig(['counts', nightId(ed)], value > 0 ? { value, ...stamp() } : null), [patchConfig, stamp]);
  const saveDate = useCallback((rawName, iso) => patchConfig(['dates', nightNameKey(rawName)], iso ? { name: rawName, date: iso, ...stamp() } : null), [patchConfig, stamp]);
  const birthdays = useMemo(() => birthdaysNext(data.utenti, now), [data.utenti, now]);
  const attendance = useMemo(() => attendanceIndex(records), [records]);
  const dataAsOf = useMemo(() => latestPurchase(data.records), [data.records]);

  if (data.status === 'loading') return <div className="nx nx-loading">Caricamento dati…</div>;
  if (data.status === 'error') {
    return <div className="nx nx-loading"><div>Non riesco a leggere i dati. <button className="nx-btn" onClick={data.reload}>Riprova</button></div></div>;
  }

  const section = data.status === 'empty' ? 'dati' : route.section;
  const { Component, title } = SECTIONS[section];
  const venueLabel = venue === 'tutti' ? 'tutti i locali' : VENUES.find(([, k]) => k === venue)?.[0];
  const stale = dataAsOf && Date.now() - dataAsOf.getTime() > 24 * 3600000;
  const ctx = {
    data, records, eds, people, kpis, brandRows, hours, upcoming, tonight, live, birthdays, attendance, now, venueLabel,
    selectedEvent: section === 'eventi' ? route.param : null,
    seedKey: section === 'confronta' ? route.param : null,
    clearSeed, goTo, openClassic: onOpenClassic, windowDays, setWindowDays,
    seriesIdx, saveSeries, deleteSeries, accuracy, notes: config?.notes || {}, counts: config?.counts || {}, saveNote, saveCount, saveDate, dataAsOf,
  };
  const nav = (cls) => Object.entries(SECTIONS).map(([k, s]) => (
    <button key={k} className={cls} aria-current={section === k ? 'page' : undefined} onClick={() => goTo(k)}>
      <Icon>{s.icon}</Icon>{s.label}
    </button>
  ));

  return (
    <div className="nx">
      <div className="nx-shell">
        <nav className="nx-rail" aria-label="Sezioni">
          <div className="nx-logo">Ultra<span>analytics</span></div>
          {nav('nx-navbtn')}
          <div className="nx-railfoot">
            <button className="nx-link" onClick={onOpenClassic}>Vista classica</button>
            <button className="nx-link" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>Tema {theme === 'light' ? 'scuro' : 'chiaro'}</button>
            <button className="nx-link" onClick={logout}>Esci{user?.email ? ` (${user.email.split('@')[0]})` : ''}</button>
          </div>
        </nav>
        <main className="nx-main">
          <div className="nx-bar">
            <h1>{title}</h1>
            <span className="nx-sub">{section === 'stasera' ? now.toLocaleDateString('it', { weekday: 'long', day: 'numeric', month: 'long' }) : venueLabel}</span>
            <span className="nx-spacer" />
            <div className="nx-chips" role="group" aria-label="Locale">
              <button className="nx-chip" aria-pressed={venue === 'tutti'} onClick={() => setVenue('tutti')}>Tutti i locali</button>
              {VENUES.map(([v, k]) => (
                <button key={k} className="nx-chip" aria-pressed={venue === k} onClick={() => setVenue(k)}><VenueDot venue={v} />{v.replace('Tenuta ', '')}</button>
              ))}
            </div>
            <span className={`nx-fresh ${stale ? 'stale' : ''}`} title="Ora dell'ultima registrazione nei dati caricati">Dati al <b>{dmy(dataAsOf)}, {hm(dataAsOf)}</b></span>
            <button className="nx-link nx-mobile-only" onClick={onOpenClassic}>Classica</button>
          </div>
          {data.status === 'empty' && <p className="nx-note">Nessun dato ancora: carica gli export del sito per iniziare.</p>}
          <Component ctx={ctx} />
        </main>
      </div>
      <nav className="nx-mnav" aria-label="Sezioni">{nav('')}</nav>
    </div>
  );
}
