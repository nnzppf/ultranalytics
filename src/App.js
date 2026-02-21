// Ultranalytics v3.1 - Multi-level comparison dashboard with Firebase persistence & auth
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Users, Check, TrendingUp, X, Calendar, Gift, Cloud, CloudOff, Loader, Database, LogOut, Settings, Sun, Moon, SlidersHorizontal, Download } from "lucide-react";

import { useAuth } from "./contexts/AuthContext";
import LoginScreen from "./components/screens/LoginScreen";
import { processRawRows, isUtentiFormat, processUtentiRows } from "./utils/csvProcessor";
import { getHourlyData, getHourlyDataByGroup, getDowData, getFasciaData, getDaysBeforeData, getTrendData, getTrendDataByGroup, getConversionByFascia, getHeatmapData, getUserStats, getEventStats } from "./utils/dataTransformers";
import { saveDataset, loadAllData, deleteDataset, hasStoredData } from "./services/firebaseDataService";
import { loadEventConfig, saveEventConfig } from "./services/eventConfigService";
import EventManagerModal from "./components/screens/EventManagerModal";

import { GENRE_LABELS, BRAND_REGISTRY } from "./config/eventConfig";
import { colors, font, radius, gradients, glass, shadows, transition as tr } from "./config/designTokens";
import KPI from "./components/shared/KPI";
import UploadScreen from "./components/screens/UploadScreen";
import OverviewTab from "./components/tabs/OverviewTab";
import HeatmapTab from "./components/tabs/HeatmapTab";
import FasceTab from "./components/tabs/FasceTab";
import TrendsTab from "./components/tabs/TrendsTab";
import UsersTab from "./components/tabs/UsersTab";
import ComparisonTab from "./components/tabs/ComparisonTab";
import BirthdaysTab from "./components/tabs/BirthdaysTab";
import AiChat from "./components/AiChat";
import { motion } from "framer-motion";
import { StaggerList, StaggerItem, TabTransition } from "./components/shared/Motion";
import { ToastProvider, useToast } from "./components/shared/Toast";
import { SkeletonDashboard } from "./components/shared/Skeleton";
import Dropdown from "./components/shared/Dropdown";

function eventNameFromFile(filename) {
  return filename.replace(/\.(csv|xlsx|xls|tsv)$/i, "").replace(/registrazioni[_\s]*/i, "").replace(/_/g, " ").trim();
}

/**
 * Apply event config (renames, edition renames, exclusions, overrides) to data records.
 */
function applyEventConfig(records, config) {
  return records.map(d => {
    let brand = d.brand;
    let editionLabel = d.editionLabel;
    // Apply brand renames
    if (config.renames?.[brand]) {
      brand = config.renames[brand];
    }
    // Apply edition renames (check both original and renamed brand)
    if (config.editionRenames?.[d.brand]?.[editionLabel]) {
      editionLabel = config.editionRenames[d.brand][editionLabel];
    } else if (config.editionRenames?.[brand]?.[editionLabel]) {
      editionLabel = config.editionRenames[brand][editionLabel];
    }
    // Apply custom config (category, genres, venue)
    const brandConfig = config.brands?.[d.brand] || config.brands?.[brand];
    return {
      ...d,
      brand,
      editionLabel,
      category: brandConfig?.category || d.category,
      genres: brandConfig?.genres?.length ? brandConfig.genres : d.genres,
      location: brandConfig?.venue || d.location,
    };
  }).filter(d => !config.excludedBrands?.includes(d.brand));
}

export default function ClubAnalytics() {
  return (
    <ToastProvider>
      <ClubAnalyticsInner />
    </ToastProvider>
  );
}

function ClubAnalyticsInner() {
  const { isAuthenticated, loading: authLoading, user, logout } = useAuth();

  // Show login screen if not authenticated
  if (authLoading) {
    return (
      <div style={{
        minHeight: "100vh", background: colors.bg.page, display: "flex",
        alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16,
      }}>
        <Loader size={32} color={colors.brand.purple} style={{ animation: "spin 1s linear infinite" }} />
        <div style={{ color: colors.text.muted, fontSize: font.size.md }}>Verifica autenticazione...</div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <AuthenticatedApp user={user} logout={logout} />;
}

function AuthenticatedApp({ user, logout }) {
  const toast = useToast();
  const [step, setStep] = useState("loading"); // loading | upload | dashboard
  const [files, setFiles] = useState([]);
  const [data, setData] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [isDragging, setIsDragging] = useState(false);
  const [utentiData, setUtentiData] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [selectedEdition, setSelectedEdition] = useState("all");
  const [cloudStatus, setCloudStatus] = useState("idle"); // idle | saving | saved | error
  const [savedDatasets, setSavedDatasets] = useState([]);
  const [showEventManager, setShowEventManager] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [eventConfig, setEventConfig] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem("ua_theme") || "dark");
  const [tabDirection, setTabDirection] = useState(1);
  const prevTabRef = useRef("overview");

  // Apply theme class on mount and changes
  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("ua_theme", theme);
  }, [theme]);
  const [graphHeights, setGraphHeights] = useState({
    hourly: 250, dowData: 220, daysBeforeData: 220,
    fasciaData: 250, convByFascia: 220,
  });

  // Persist graph heights
  useEffect(() => {
    try {
      const saved = localStorage.getItem("clubAnalytics_graphHeights");
      if (saved) setGraphHeights(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem("clubAnalytics_graphHeights", JSON.stringify(graphHeights)); } catch {}
  }, [graphHeights]);

  // On mount: check Firebase for stored data + load event config
  useEffect(() => {
    async function checkCloud() {
      try {
        // Load event config and data in parallel
        const [cfg, hasData] = await Promise.all([
          loadEventConfig().catch(() => null),
          hasStoredData(),
        ]);
        if (cfg) setEventConfig(cfg);

        if (hasData) {
          const { records, utenti, datasets } = await loadAllData();
          if (records.length > 0 || utenti.length > 0) {
            // Apply event config to loaded data (renames, exclusions, etc.)
            const finalRecords = cfg ? applyEventConfig(records, cfg) : records;
            setData(finalRecords);
            setUtentiData(utenti);
            setSavedDatasets(datasets);
            setCloudStatus("saved");
            setStep("dashboard");
            return;
          }
        }
      } catch (e) {
        console.warn("Firebase load failed, starting fresh:", e);
      }
      setStep("upload");
    }
    checkCloud();
  }, []);

  // File processing
  const processFile = useCallback(async (file) => {
    const name = file.name.toLowerCase();
    return new Promise((resolve, reject) => {
      if (name.endsWith('.csv') || name.endsWith('.tsv')) {
        Papa.parse(file, {
          header: true, skipEmptyLines: true,
          complete: (r) => resolve({ name: file.name, file, eventName: eventNameFromFile(file.name), rows: r.data }),
          error: reject,
        });
      } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const wb = XLSX.read(e.target.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          resolve({ name: file.name, file, eventName: eventNameFromFile(file.name), rows: XLSX.utils.sheet_to_json(ws) });
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      }
    });
  }, []);

  const handleFilesAdded = useCallback(async (fileList) => {
    const newFiles = [];
    for (const f of Array.from(fileList)) {
      const processed = await processFile(f);
      if (processed) newFiles.push(processed);
    }
    setFiles(prev => [...prev, ...newFiles]);
  }, [processFile]);

  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));
  const updateEventName = (idx, name) => setFiles(prev => prev.map((f, i) => i === idx ? { ...f, eventName: name } : f));

  // Build data from files + save to Firebase
  const buildData = useCallback(async () => {
    const allRecords = [];
    const allUtenti = [];
    setCloudStatus("saving");

    for (const f of files) {
      const keys = f.rows.length > 0 ? Object.keys(f.rows[0]) : [];
      const isUtenti = isUtentiFormat(keys);

      if (isUtenti) {
        const users = processUtentiRows(f.rows);
        allUtenti.push(...users);

        // Save to Firebase
        try {
          await saveDataset({
            fileName: f.name,
            fileBlob: f.file,
            records: [],
            utenti: users,
            fileType: 'utenti',
          });
        } catch (e) {
          console.error("Firebase save failed for", f.name, e);
        }
      } else {
        const records = processRawRows(f.rows, f.eventName);
        allRecords.push(...records);

        // Save to Firebase
        try {
          await saveDataset({
            fileName: f.name,
            fileBlob: f.file,
            records,
            utenti: [],
            fileType: 'biglietti',
          });
        } catch (e) {
          console.error("Firebase save failed for", f.name, e);
        }
      }
    }

    // Merge with existing data (if adding new files to existing datasets)
    setData(prev => prev.length > 0 ? [...prev, ...allRecords] : allRecords);
    setUtentiData(prev => prev.length > 0 ? [...prev, ...allUtenti] : allUtenti);
    setCloudStatus("saved");
    toast("Dati salvati nel cloud", "success");
    setStep("dashboard");
    setActiveTab("overview");
  }, [files, toast]);

  // Reload from Firebase
  const reloadFromCloud = useCallback(async () => {
    setCloudStatus("saving");
    try {
      const { records, utenti, datasets } = await loadAllData();
      setData(records);
      setUtentiData(utenti);
      setSavedDatasets(datasets);
      setCloudStatus("saved");
      toast("Dati ricaricati dal cloud", "success");
      if (records.length > 0 || utenti.length > 0) {
        setStep("dashboard");
      }
    } catch (e) {
      console.error("Reload failed:", e);
      setCloudStatus("error");
      toast("Errore nel caricamento dati", "error");
    }
  }, [toast]);

  // Delete a dataset from Firebase
  const handleDeleteDataset = useCallback(async (datasetId) => {
    try {
      await deleteDataset(datasetId);
      await reloadFromCloud();
    } catch (e) {
      console.error("Delete failed:", e);
    }
  }, [reloadFromCloud]);

  // Save event config and apply to data
  const handleSaveEventConfig = useCallback(async (config) => {
    const success = await saveEventConfig(config);
    if (success) {
      setEventConfig(config);
      setData(prev => applyEventConfig(prev, config));
      toast("Configurazione eventi salvata", "success");
    }
  }, [toast]);

  // Helper: get genres for a record (from record or BRAND_REGISTRY fallback)
  const getRecordGenres = useCallback((r) => {
    if (r.genres && Array.isArray(r.genres) && r.genres.length > 0) return r.genres;
    const config = BRAND_REGISTRY[r.brand];
    if (config?.genres) return config.genres;
    if (r.brand) {
      const lower = r.brand.toLowerCase();
      for (const [key, cfg] of Object.entries(BRAND_REGISTRY)) {
        if (key.toLowerCase() === lower) return cfg.genres || [];
      }
    }
    return [];
  }, []);

  // Filtered data based on category, genre & brand selection
  const filtered = useMemo(() => {
    let d = data;
    if (selectedCategory !== "all") d = d.filter(r => r.category === selectedCategory);
    if (selectedGenre !== "all") d = d.filter(r => getRecordGenres(r).includes(selectedGenre));
    if (selectedBrand !== "all") d = d.filter(r => r.brand === selectedBrand);
    if (selectedEdition !== "all") d = d.filter(r => r.editionLabel === selectedEdition);
    return d;
  }, [data, selectedCategory, selectedGenre, selectedBrand, selectedEdition, getRecordGenres]);

  // Analytics
  const analytics = useMemo(() => {
    if (!filtered.length) return null;

    const total = filtered.length;
    const entered = filtered.filter(r => r.attended).length;
    const conv = total > 0 ? parseFloat(((entered / total) * 100).toFixed(1)) : 0;
    const noShowRate = total > 0 ? parseFloat((((total - entered) / total) * 100).toFixed(1)) : 0;
    const brands = [...new Set(filtered.map(r => r.brand))].filter(Boolean);
    const eventStats = getEventStats(filtered);

    const hourlyReg = getHourlyData(filtered);
    // If a single brand is selected, group by edition; otherwise group by brand
    const groupKey = selectedBrand !== "all" ? 'editionLabel' : 'brand';
    const hourlyRegByEvent = getHourlyDataByGroup(filtered, groupKey);
    const hourlyPeak = hourlyReg.reduce((max, h) => h.registrazioni > (max?.registrazioni || 0) ? h : max, null);

    // Compute trend vs previous edition (if a single edition is selected)
    let trend = null;
    if (selectedEdition !== "all" && selectedBrand !== "all") {
      // Find all editions of this brand sorted by date
      const brandRecords = data.filter(r => r.brand === selectedBrand);
      const editions = [...new Set(brandRecords.map(r => r.editionLabel))].filter(Boolean);
      const editionsByDate = editions.sort((a, b) => {
        const aRow = brandRecords.find(r => r.editionLabel === a);
        const bRow = brandRecords.find(r => r.editionLabel === b);
        return (aRow?.eventDate || 0) - (bRow?.eventDate || 0);
      });
      const currentIdx = editionsByDate.indexOf(selectedEdition);
      if (currentIdx > 0) {
        const prevEdition = editionsByDate[currentIdx - 1];
        const prevRecords = brandRecords.filter(r => r.editionLabel === prevEdition);
        const prevTotal = prevRecords.length;
        const prevEntered = prevRecords.filter(r => r.attended).length;
        const prevConv = prevTotal > 0 ? parseFloat(((prevEntered / prevTotal) * 100).toFixed(1)) : 0;
        trend = {
          prevEdition,
          total: prevTotal > 0 ? parseFloat((((total - prevTotal) / prevTotal) * 100).toFixed(1)) : null,
          entered: prevEntered > 0 ? parseFloat((((entered - prevEntered) / prevEntered) * 100).toFixed(1)) : null,
          conv: prevConv > 0 ? parseFloat((conv - prevConv).toFixed(1)) : null,
        };
      }
    }

    // Determine if the selected edition is a future event (not yet happened)
    // Use the 6 AM day-after grace period (same as comparisonEngine)
    let isEditionFuture = false;
    if (selectedEdition !== "all") {
      const edRow = filtered.find(r => r.eventDate);
      if (edRow?.eventDate) {
        const dayAfter = new Date(edRow.eventDate);
        dayAfter.setDate(dayAfter.getDate() + 1);
        dayAfter.setHours(6, 0, 0, 0);
        isEditionFuture = new Date() < dayAfter;
      }
    }

    return {
      total, entered, conv, noShowRate,
      brands,
      eventStats,
      trend,
      isEditionFuture,
      hourlyReg,
      hourlyRegByEvent,
      hourlyPeak,
      dowData: getDowData(filtered),
      daysBeforeData: getDaysBeforeData(filtered),
      fasciaData: getFasciaData(filtered),
      convByFascia: getConversionByFascia(filtered),
      heatmapGrid: getHeatmapData(filtered),
      trendData: getTrendData(filtered),
      trendByGroup: getTrendDataByGroup(filtered, groupKey),
      userStats: getUserStats(filtered),
      multiEvent: brands.length > 1,
    };
  }, [filtered, selectedBrand, selectedEdition, data]);

  // Available categories and brands for filters (exclude senior)
  const categories = useMemo(() => {
    const cats = [...new Set(data.map(d => d.category))].filter(c => c && c !== 'unknown' && c !== 'senior');
    return cats;
  }, [data]);

  const availableBrands = useMemo(() => {
    let d = data.filter(r => r.category !== 'senior');
    if (selectedCategory !== "all") d = d.filter(r => r.category === selectedCategory);
    if (selectedGenre !== "all") d = d.filter(r => getRecordGenres(r).includes(selectedGenre));
    return [...new Set(d.map(r => r.brand))].filter(Boolean).sort();
  }, [data, selectedCategory, selectedGenre, getRecordGenres]);

  // Available editions when a brand is selected
  const availableEditions = useMemo(() => {
    if (selectedBrand === "all") return [];
    const editions = [...new Set(data.filter(r => r.brand === selectedBrand).map(r => r.editionLabel))].filter(Boolean);
    // Sort by event date
    return editions.sort((a, b) => {
      const aRow = data.find(r => r.brand === selectedBrand && r.editionLabel === a);
      const bRow = data.find(r => r.brand === selectedBrand && r.editionLabel === b);
      return (aRow?.eventDate || 0) - (bRow?.eventDate || 0);
    });
  }, [data, selectedBrand]);

  // Map edition → year (short, e.g. "'24") for year tags
  const editionYearMap = useMemo(() => {
    const map = {};
    for (const r of data) {
      if (r.editionLabel && r.eventDate && !map[r.editionLabel]) {
        map[r.editionLabel] = "'" + String(r.eventDate.getFullYear()).slice(-2);
      }
    }
    return map;
  }, [data]);

  // Tab definitions
  const tabs = [
    { key: "overview", label: "Panoramica" },
    { key: "heatmap", label: "Heatmap" },
    { key: "fasce", label: "Fasce Orarie" },
    { key: "trends", label: "Trend" },
    { key: "confronti", label: "Confronti", highlight: true },
    { key: "utenti", label: "Utenti" },
    { key: "compleanni", label: "Compleanni", icon: Gift },
  ];

  // Direction-aware tab switch
  const switchTab = (newKey) => {
    const oldIdx = tabs.findIndex(t => t.key === activeTab);
    const newIdx = tabs.findIndex(t => t.key === newKey);
    setTabDirection(newIdx >= oldIdx ? 1 : -1);
    prevTabRef.current = activeTab;
    setActiveTab(newKey);
  };

  // Loading screen — skeleton dashboard
  if (step === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: colors.bg.page, color: colors.text.primary }}>
        {/* Skeleton top bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12, padding: "10px 20px",
          background: colors.bg.solid, borderBottom: `1px solid ${colors.border.default}`,
        }}>
          <div style={{ fontWeight: 900, fontSize: font.size.lg, background: gradients.brand, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Ultranalytics
          </div>
          <span style={{ fontSize: font.size.xs, color: colors.text.disabled }}>Caricamento dati...</span>
        </div>
        <SkeletonDashboard />
      </div>
    );
  }

  if (step === "upload") {
    return (
      <UploadScreen
        files={files}
        isDragging={isDragging}
        onFilesAdded={handleFilesAdded}
        onRemoveFile={removeFile}
        onUpdateEventName={updateEventName}
        onAnalyze={buildData}
        onDragState={setIsDragging}
        cloudStatus={cloudStatus}
        savedDatasets={savedDatasets}
        onReloadCloud={reloadFromCloud}
        onDeleteDataset={handleDeleteDataset}
      />
    );
  }

  if (!analytics) return null;

  // Cloud status indicator
  const CloudIndicator = () => (
    <div className="cloud-indicator" style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8 }}>
      {cloudStatus === "saving" && <Loader size={12} color={colors.status.warning} style={{ animation: "spin 1s linear infinite" }} />}
      {cloudStatus === "saved" && <Cloud size={12} color={colors.status.success} />}
      {cloudStatus === "error" && <CloudOff size={12} color={colors.status.error} />}
      {cloudStatus === "idle" && <CloudOff size={12} color={colors.text.disabled} />}
      <span style={{ fontSize: font.size.xs, color: cloudStatus === "saved" ? colors.status.success : cloudStatus === "error" ? colors.status.error : colors.text.disabled }}>
        {cloudStatus === "saving" ? "Salvando..." : cloudStatus === "saved" ? "Cloud sync" : cloudStatus === "error" ? "Errore sync" : "Locale"}
      </span>
    </div>
  );

  // Shared filter button style helper
  const filterBtn = (isActive) => ({
    padding: "5px 12px", borderRadius: radius.lg, fontSize: font.size.xs, border: "none", cursor: "pointer",
    background: isActive ? colors.interactive.active : colors.interactive.inactive,
    color: isActive ? colors.interactive.activeText : colors.interactive.inactiveText,
    transition: tr.normal,
  });

  return (
    <div style={{ minHeight: "100vh", background: colors.bg.page, color: colors.text.primary }}>
      {/* Top Bar */}
      <div className="top-bar" style={{
        display: "flex", alignItems: "center", gap: 12, padding: "10px 20px",
        background: colors.bg.solid, borderBottom: `1px solid ${colors.border.default}`, flexWrap: "wrap",
      }}>
        <div className="top-bar-logo" style={{ fontWeight: font.weight.black, fontSize: font.size.lg, background: gradients.brand, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", flexShrink: 0 }}>
          Ultranalytics
        </div>
        <CloudIndicator />

        {/* Mobile filter toggle */}
        <button className="mobile-filter-toggle" onClick={() => setShowMobileFilters(v => !v)} style={{
          background: showMobileFilters ? colors.interactive.active : colors.bg.elevated,
          border: "none", borderRadius: radius.md, padding: "5px 10px", cursor: "pointer",
          display: "none", alignItems: "center", gap: 4,
          color: showMobileFilters ? colors.interactive.activeText : colors.text.muted,
          fontSize: font.size.xs,
        }}>
          <SlidersHorizontal size={13} /> Filtri
        </button>

        {/* Filters container — collapses on mobile */}
        <div className={`filters-container${showMobileFilters ? " open" : ""}`} style={{
          display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap", flex: 1,
        }}>
          {/* Category filter */}
          <div className="filter-row" style={{ display: "flex", gap: 4, marginLeft: 16, alignItems: "center" }}>
            <button onClick={() => { setSelectedCategory("all"); setSelectedGenre("all"); setSelectedBrand("all"); setSelectedEdition("all"); }}
              style={filterBtn(selectedCategory === "all" && selectedGenre === "all")}>Tutti</button>
            {categories.map(c => (
              <button key={c} onClick={() => { setSelectedCategory(c); setSelectedGenre("all"); setSelectedBrand("all"); setSelectedEdition("all"); }}
                style={{ ...filterBtn(selectedCategory === c && selectedGenre === "all"), textTransform: "capitalize" }}>{c}</button>
            ))}
          </div>

          {/* Genre filter */}
          <div className="filter-row filter-separator" style={{ display: "flex", gap: 4, alignItems: "center", borderLeft: `1px solid ${colors.border.strong}`, paddingLeft: 8 }}>
            {Object.entries(GENRE_LABELS).map(([g, genreInfo]) => (
              <button key={g} onClick={() => { setSelectedGenre(g); setSelectedCategory("all"); setSelectedBrand("all"); setSelectedEdition("all"); }} style={{
                ...filterBtn(selectedGenre === g),
                background: selectedGenre === g ? (genreInfo.color || colors.interactive.active) : colors.interactive.inactive,
                whiteSpace: "nowrap",
              }}>{genreInfo.label}</button>
            ))}
          </div>

          {/* Brand filter */}
          <Dropdown
            value={selectedBrand}
            onChange={v => { setSelectedBrand(v); setSelectedEdition("all"); }}
            placeholder="Brand"
            options={[
              { value: "all", label: "Tutti i brand", count: availableBrands.length },
              ...availableBrands.map(b => ({ value: b, label: b })),
            ]}
          />
        </div>

        {/* Right side: data management + user */}
        <div className="top-bar-actions" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} title={theme === "dark" ? "Tema chiaro" : "Tema scuro"} style={{
            background: colors.bg.elevated, border: "none", borderRadius: radius.md,
            color: colors.text.muted, fontSize: font.size.xs, padding: "5px 10px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
          </button>
          <button onClick={async () => {
            const { default: html2canvas } = await import('html2canvas');
            const el = document.querySelector('.app-content');
            if (!el) return;
            toast("Generando screenshot...", "info", 2000);
            // Use the resolved CSS variable for background (dark/light aware)
            const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-solid').trim() || '#1e293b';
            const canvas = await html2canvas(el, { backgroundColor: bgColor, scale: 2, useCORS: true });
            const fileName = `ultranalytics-${activeTab}-${new Date().toISOString().slice(0,10)}.png`;
            // Use Web Share API on mobile (saves to camera roll on iOS)
            if (navigator.share && navigator.canShare) {
              try {
                const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
                const file = new File([blob], fileName, { type: 'image/png' });
                if (navigator.canShare({ files: [file] })) {
                  await navigator.share({ files: [file], title: 'Ultranalytics' });
                  toast("Screenshot condiviso", "success");
                  return;
                }
              } catch (e) {
                if (e.name === 'AbortError') return; // user cancelled share
              }
            }
            // Fallback: direct download
            const link = document.createElement('a');
            link.download = fileName;
            link.href = canvas.toDataURL();
            link.click();
            toast("Screenshot scaricato", "success");
          }} title="Esporta screenshot" style={{
            background: colors.bg.elevated, border: "none", borderRadius: radius.md,
            color: colors.text.muted, fontSize: font.size.xs, padding: "5px 10px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <Download size={13} />
          </button>
          <button onClick={() => setShowEventManager(true)} title="Gestione eventi" style={{
            background: colors.bg.elevated, border: "none", borderRadius: radius.md,
            color: colors.text.muted, fontSize: font.size.xs, padding: "5px 10px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <Settings size={13} />
          </button>
          <button onClick={() => { setStep("upload"); setFiles([]); }} style={{
            background: colors.bg.elevated, border: "none", borderRadius: radius.md,
            color: colors.text.muted, fontSize: font.size.xs, padding: "5px 12px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <Database size={11} /> <span className="action-btn-label">Gestisci dati</span>
          </button>

          {/* User avatar + logout */}
          <div className="user-section" style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 2 }}>
            {user?.photoURL && (
              <img src={user.photoURL} alt="" style={{
                width: 24, height: 24, borderRadius: "50%",
                border: `1px solid ${colors.border.strong}`,
              }} referrerPolicy="no-referrer" />
            )}
            <button onClick={logout} title="Esci" style={{
              background: "none", border: "none", cursor: "pointer", padding: 4,
              display: "flex", alignItems: "center",
            }}>
              <LogOut size={14} color={colors.text.disabled} />
            </button>
          </div>
        </div>
      </div>

      {/* Edition selector - shown when a brand with multiple editions is selected */}
      {selectedBrand !== "all" && availableEditions.length > 1 && (
        <div className="edition-bar" style={{
          padding: "8px 20px",
          background: `${colors.bg.card}80`, borderBottom: `1px solid ${colors.border.default}`,
          alignItems: "center",
        }}>
          {/* Desktop: buttons row */}
          <div className="edition-buttons" style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span style={{ fontSize: font.size.xs, color: colors.text.disabled, marginRight: 4, whiteSpace: "nowrap" }}>Edizione:</span>
            <button
              onClick={() => setSelectedEdition("all")}
              style={{ ...filterBtn(selectedEdition === "all"), whiteSpace: "nowrap" }}
            >Tutte ({availableEditions.length})</button>
            {availableEditions.map(ed => (
              <button
                key={ed}
                onClick={() => setSelectedEdition(ed)}
                style={{ ...filterBtn(selectedEdition === ed), whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4 }}
              >{ed}{editionYearMap[ed] && <span style={{ fontSize: 9, opacity: 0.5 }}>{editionYearMap[ed]}</span>}</button>
            ))}
          </div>
          {/* Mobile: compact dropdown */}
          <div className="edition-dropdown" style={{ display: "none" }}>
            <Dropdown
              value={selectedEdition}
              onChange={setSelectedEdition}
              placeholder="Edizione"
              options={[
                { value: "all", label: `Tutte le edizioni (${availableEditions.length})` },
                ...availableEditions.map(ed => ({ value: ed, label: editionYearMap[ed] ? `${ed} ${editionYearMap[ed]}` : ed })),
              ]}
            />
          </div>
        </div>
      )}

      {/* KPI Row — hide Presenze/Conv/No-Show for future events */}
      {(() => {
        const showAttendance = !analytics.isEditionFuture;
        const kpiCols = showAttendance ? 4 : 2;
        return (
          <StaggerList className="kpi-grid" style={{ display: "grid", gridTemplateColumns: `repeat(${kpiCols}, 1fr)`, gap: 10, padding: "16px 20px" }}>
            <StaggerItem><KPI icon={Users} label="Registrazioni" value={analytics.total} color={colors.brand.purple} trend={analytics.trend?.total} sub={analytics.trend ? `vs ${analytics.trend.prevEdition}` : undefined} /></StaggerItem>
            {showAttendance && (
              <StaggerItem><KPI icon={Check} label="Presenze" value={analytics.entered} color={colors.status.success} trend={analytics.trend?.entered} /></StaggerItem>
            )}
            {showAttendance && (
              <StaggerItem>
                <motion.div
                  whileHover={{ scale: 1.03, boxShadow: shadows.md }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  style={{
                    background: colors.bg.card, borderRadius: radius["2xl"], padding: "14px 16px",
                    border: `1px solid ${colors.border.default}`, ...glass.card, boxShadow: shadows.sm, cursor: "default",
                  }}
                >
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                        <TrendingUp size={12} color={colors.brand.cyan} style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: font.size.xs, color: colors.text.muted, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>Conv.</span>
                      </div>
                      <div style={{ fontSize: font.size["3xl"], fontWeight: font.weight.bold, color: colors.text.primary, whiteSpace: "nowrap" }}>{analytics.conv}%</div>
                    </div>
                    <div style={{ width: 1, background: colors.border.default, alignSelf: "stretch" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                        <X size={12} color={colors.status.error} style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: font.size.xs, color: colors.text.muted, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>No-Show</span>
                      </div>
                      <div style={{ fontSize: font.size["3xl"], fontWeight: font.weight.bold, color: colors.text.primary, whiteSpace: "nowrap" }}>{analytics.noShowRate}%</div>
                    </div>
                  </div>
                </motion.div>
              </StaggerItem>
            )}
            <StaggerItem><KPI icon={Calendar} label="Brand" value={analytics.brands.length} color={colors.status.warning} /></StaggerItem>
          </StaggerList>
        );
      })()}

      {/* Tab Navigation — Desktop: buttons */}
      <div className="tab-bar tab-bar-buttons" style={{ display: "flex", gap: 4, padding: "0 20px 12px", overflowX: "auto" }}>
        {tabs.map(t => {
          const isActive = activeTab === t.key;
          return (
            <button key={t.key} onClick={() => switchTab(t.key)} style={{
              padding: "8px 18px", borderRadius: radius.lg, fontSize: font.size.base, border: "none", cursor: "pointer",
              background: isActive
                ? (t.highlight ? gradients.brand : colors.interactive.active)
                : colors.bg.card,
              color: isActive ? colors.interactive.activeText : colors.interactive.inactiveText,
              fontWeight: isActive ? font.weight.semibold : font.weight.medium,
              whiteSpace: "nowrap",
              transition: "all 0.2s ease",
              boxShadow: isActive ? "0 0 16px rgba(13,148,136,0.25)" : "none",
              transform: isActive ? "translateY(-1px)" : "none",
            }}>{t.label}</button>
          );
        })}
      </div>
      {/* Tab Navigation — Mobile: dropdown */}
      <div className="tab-bar-dropdown" style={{ display: "none", padding: "0 20px 12px" }}>
        <Dropdown
          value={activeTab}
          onChange={(key) => switchTab(key)}
          placeholder="Sezione"
          options={tabs.map(t => ({ value: t.key, label: t.label }))}
        />
      </div>

      {/* Tab Content */}
      <div className="app-content" style={{ padding: "0 20px 40px" }}>
        <TabTransition tabKey={activeTab} direction={tabDirection}>
        {activeTab === "overview" && (
          <OverviewTab
            analytics={analytics}
            filtered={filtered}
            selectedBrand={selectedBrand}
            graphHeights={graphHeights}
            setGraphHeights={setGraphHeights}
          />
        )}

        {activeTab === "heatmap" && (
          <HeatmapTab heatmapGrid={analytics.heatmapGrid} />
        )}

        {activeTab === "fasce" && (
          <FasceTab
            fasciaData={analytics.fasciaData}
            convByFascia={analytics.convByFascia}
            graphHeights={graphHeights}
            setGraphHeights={setGraphHeights}
          />
        )}

        {activeTab === "trends" && (
          <TrendsTab
            trendData={analytics.trendData}
            trendByGroup={analytics.trendByGroup}
            multiEvent={analytics.multiEvent}
          />
        )}

        {activeTab === "confronti" && (
          <ComparisonTab data={data} filtered={filtered} selectedBrand={selectedBrand} selectedCategory={selectedCategory} selectedEdition={selectedEdition} />
        )}

        {activeTab === "utenti" && (
          <UsersTab userStats={analytics.userStats} />
        )}

        {activeTab === "compleanni" && (
          <BirthdaysTab
            data={utentiData.length > 0 ? utentiData : filtered}
            allData={data}
            userStats={analytics.userStats}
            selectedCategory={selectedCategory}
            selectedGenre={selectedGenre}
          />
        )}
        </TabTransition>
      </div>

      {/* AI Assistant */}
      <AiChat data={data} analytics={analytics} userStats={analytics?.userStats} />

      {/* Event Manager Modal */}
      {showEventManager && (
        <EventManagerModal
          data={data}
          eventConfig={eventConfig}
          onSave={handleSaveEventConfig}
          onClose={() => setShowEventManager(false)}
        />
      )}
    </div>
  );
}
