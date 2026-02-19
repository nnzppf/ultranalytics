// Ultranalytics v3.1 - Multi-level comparison dashboard with Firebase persistence & auth
import { useState, useMemo, useEffect, useCallback } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Users, Check, TrendingUp, X, Calendar, Gift, Cloud, CloudOff, Loader, Database, LogOut } from "lucide-react";

import { useAuth } from "./contexts/AuthContext";
import LoginScreen from "./components/screens/LoginScreen";
import { processRawRows, isUtentiFormat, processUtentiRows } from "./utils/csvProcessor";
import { getHourlyData, getHourlyDataByGroup, getDowData, getFasciaData, getDaysBeforeData, getTrendData, getTrendDataByGroup, getConversionByFascia, getHeatmapData, getUserStats, getEventStats } from "./utils/dataTransformers";
import { saveDataset, loadAllData, deleteDataset, hasStoredData } from "./services/firebaseDataService";

import { GENRE_LABELS, BRAND_REGISTRY } from "./config/eventConfig";
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

function eventNameFromFile(filename) {
  return filename.replace(/\.(csv|xlsx|xls|tsv)$/i, "").replace(/registrazioni[_\s]*/i, "").replace(/_/g, " ").trim();
}

export default function ClubAnalytics() {
  const { isAuthenticated, loading: authLoading, user, logout } = useAuth();

  // Show login screen if not authenticated
  if (authLoading) {
    return (
      <div style={{
        minHeight: "100vh", background: "#0f172a", display: "flex",
        alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16,
      }}>
        <Loader size={32} color="#8b5cf6" style={{ animation: "spin 1s linear infinite" }} />
        <div style={{ color: "#94a3b8", fontSize: 14 }}>Verifica autenticazione...</div>
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

  // On mount: check Firebase for stored data
  useEffect(() => {
    async function checkCloud() {
      try {
        const hasData = await hasStoredData();
        if (hasData) {
          const { records, utenti, datasets } = await loadAllData();
          if (records.length > 0 || utenti.length > 0) {
            setData(records);
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
    setStep("dashboard");
    setActiveTab("overview");
  }, [files]);

  // Reload from Firebase
  const reloadFromCloud = useCallback(async () => {
    setCloudStatus("saving");
    try {
      const { records, utenti, datasets } = await loadAllData();
      setData(records);
      setUtentiData(utenti);
      setSavedDatasets(datasets);
      setCloudStatus("saved");
      if (records.length > 0 || utenti.length > 0) {
        setStep("dashboard");
      }
    } catch (e) {
      console.error("Reload failed:", e);
      setCloudStatus("error");
    }
  }, []);

  // Delete a dataset from Firebase
  const handleDeleteDataset = useCallback(async (datasetId) => {
    try {
      await deleteDataset(datasetId);
      await reloadFromCloud();
    } catch (e) {
      console.error("Delete failed:", e);
    }
  }, [reloadFromCloud]);

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

    return {
      total, entered, conv, noShowRate,
      brands,
      eventStats,
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
  }, [filtered, selectedBrand]);

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

  // Loading screen
  if (step === "loading") {
    return (
      <div style={{
        minHeight: "100vh", background: "#0f172a", display: "flex",
        alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16,
      }}>
        <Loader size={32} color="#8b5cf6" style={{ animation: "spin 1s linear infinite" }} />
        <div style={{ color: "#94a3b8", fontSize: 14 }}>Caricamento dati dal cloud...</div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
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
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8 }}>
      {cloudStatus === "saving" && <Loader size={12} color="#f59e0b" style={{ animation: "spin 1s linear infinite" }} />}
      {cloudStatus === "saved" && <Cloud size={12} color="#10b981" />}
      {cloudStatus === "error" && <CloudOff size={12} color="#ef4444" />}
      {cloudStatus === "idle" && <CloudOff size={12} color="#64748b" />}
      <span style={{ fontSize: 9, color: cloudStatus === "saved" ? "#10b981" : cloudStatus === "error" ? "#ef4444" : "#64748b" }}>
        {cloudStatus === "saving" ? "Salvando..." : cloudStatus === "saved" ? "Cloud sync" : cloudStatus === "error" ? "Errore sync" : "Locale"}
      </span>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#f1f5f9" }}>
      {/* Top Bar */}
      <div className="top-bar" style={{
        display: "flex", alignItems: "center", gap: 12, padding: "10px 20px",
        background: "#1e293b", borderBottom: "1px solid #334155", flexWrap: "wrap",
      }}>
        <div style={{ fontWeight: 800, fontSize: 16, background: "linear-gradient(135deg, #7c3aed, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Ultranalytics
        </div>
        <CloudIndicator />

        {/* Category filter */}
        <div className="filter-row" style={{ display: "flex", gap: 4, marginLeft: 16, alignItems: "center" }}>
          <button onClick={() => { setSelectedCategory("all"); setSelectedGenre("all"); setSelectedBrand("all"); setSelectedEdition("all"); }} style={{
            padding: "4px 10px", borderRadius: 6, fontSize: 10, border: "none", cursor: "pointer",
            background: selectedCategory === "all" && selectedGenre === "all" ? "#8b5cf6" : "#334155",
            color: selectedCategory === "all" && selectedGenre === "all" ? "#fff" : "#94a3b8",
          }}>Tutti</button>
          {categories.map(c => (
            <button key={c} onClick={() => { setSelectedCategory(c); setSelectedGenre("all"); setSelectedBrand("all"); setSelectedEdition("all"); }} style={{
              padding: "4px 10px", borderRadius: 6, fontSize: 10, border: "none", cursor: "pointer",
              background: selectedCategory === c && selectedGenre === "all" ? "#8b5cf6" : "#334155",
              color: selectedCategory === c && selectedGenre === "all" ? "#fff" : "#94a3b8", textTransform: "capitalize",
            }}>{c}</button>
          ))}
        </div>

        {/* Genre filter */}
        <div className="filter-row filter-separator" style={{ display: "flex", gap: 4, alignItems: "center", borderLeft: "1px solid #475569", paddingLeft: 8 }}>
          {Object.entries(GENRE_LABELS).map(([g, genreInfo]) => (
            <button key={g} onClick={() => { setSelectedGenre(g); setSelectedCategory("all"); setSelectedBrand("all"); setSelectedEdition("all"); }} style={{
              padding: "4px 10px", borderRadius: 6, fontSize: 10, border: "none", cursor: "pointer",
              background: selectedGenre === g ? (genreInfo.color || "#8b5cf6") : "#334155",
              color: selectedGenre === g ? "#fff" : "#94a3b8",
              whiteSpace: "nowrap",
            }}>{genreInfo.label}</button>
          ))}
        </div>

        {/* Brand filter */}
        <select
          value={selectedBrand}
          onChange={e => { setSelectedBrand(e.target.value); setSelectedEdition("all"); }}
          style={{
            background: "#334155", border: "1px solid #475569", borderRadius: 6,
            color: "#f1f5f9", fontSize: 11, padding: "4px 8px", outline: "none",
          }}
        >
          <option value="all">Tutti i brand ({availableBrands.length})</option>
          {availableBrands.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        {/* Right side: data management + user */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => { setStep("upload"); setFiles([]); }} style={{
            background: "#334155", border: "none", borderRadius: 6,
            color: "#94a3b8", fontSize: 11, padding: "5px 12px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <Database size={11} /> Gestisci dati
          </button>

          {/* User avatar + logout */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {user?.photoURL && (
              <img src={user.photoURL} alt="" style={{
                width: 24, height: 24, borderRadius: "50%",
                border: "1px solid #475569",
              }} referrerPolicy="no-referrer" />
            )}
            <button onClick={logout} title="Esci" style={{
              background: "none", border: "none", cursor: "pointer", padding: 4,
              display: "flex", alignItems: "center",
            }}>
              <LogOut size={14} color="#64748b" />
            </button>
          </div>
        </div>
      </div>

      {/* Edition selector - shown when a brand with multiple editions is selected */}
      {selectedBrand !== "all" && availableEditions.length > 1 && (
        <div className="edition-bar" style={{
          display: "flex", gap: 4, padding: "8px 20px",
          background: "#1e293b80", borderBottom: "1px solid #334155",
          alignItems: "center", overflowX: "auto",
        }}>
          <span style={{ fontSize: 10, color: "#64748b", marginRight: 4, whiteSpace: "nowrap" }}>Edizione:</span>
          <button
            onClick={() => setSelectedEdition("all")}
            style={{
              padding: "3px 10px", borderRadius: 6, fontSize: 10, border: "none", cursor: "pointer",
              background: selectedEdition === "all" ? "#8b5cf6" : "#334155",
              color: selectedEdition === "all" ? "#fff" : "#94a3b8",
              whiteSpace: "nowrap",
            }}
          >Tutte ({availableEditions.length})</button>
          {availableEditions.map(ed => (
            <button
              key={ed}
              onClick={() => setSelectedEdition(ed)}
              style={{
                padding: "3px 10px", borderRadius: 6, fontSize: 10, border: "none", cursor: "pointer",
                background: selectedEdition === ed ? "#8b5cf6" : "#334155",
                color: selectedEdition === ed ? "#fff" : "#94a3b8",
                whiteSpace: "nowrap",
              }}
            >{ed}</button>
          ))}
        </div>
      )}

      {/* KPI Row */}
      <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, padding: "16px 20px" }}>
        <KPI icon={Users} label="Registrazioni" value={analytics.total} color="#8b5cf6" />
        <KPI icon={Check} label="Presenze" value={analytics.entered} sub={`${analytics.conv}% conversione`} color="#10b981" />
        <KPI icon={TrendingUp} label="Conversione" value={`${analytics.conv}%`} color="#06b6d4" />
        <KPI icon={X} label="No-Show" value={`${analytics.noShowRate}%`} color="#ef4444" />
        <KPI icon={Calendar} label="Brand" value={analytics.brands.length} color="#f59e0b" />
      </div>

      {/* Tab Navigation */}
      <div className="tab-bar" style={{ display: "flex", gap: 4, padding: "0 20px 12px", overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: "7px 16px", borderRadius: 8, fontSize: 12, border: "none", cursor: "pointer",
            background: activeTab === t.key
              ? (t.highlight ? "linear-gradient(135deg, #7c3aed, #ec4899)" : "#8b5cf6")
              : "#1e293b",
            color: activeTab === t.key ? "#fff" : "#94a3b8",
            fontWeight: activeTab === t.key ? 600 : 400,
            whiteSpace: "nowrap",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="app-content" style={{ padding: "0 20px 40px" }}>
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
          <ComparisonTab data={data} filtered={filtered} selectedBrand={selectedBrand} selectedCategory={selectedCategory} />
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
      </div>

      {/* AI Assistant */}
      <AiChat data={data} analytics={analytics} userStats={analytics?.userStats} />
    </div>
  );
}
