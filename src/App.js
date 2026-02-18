// Club Analytics v3.0 - Multi-level comparison dashboard
import { useState, useMemo, useEffect, useCallback } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Users, Check, TrendingUp, X, Calendar, Gift } from "lucide-react";

import { processRawRows, isUtentiFormat, processUtentiRows } from "./utils/csvProcessor";
import { getHourlyData, getHourlyDataByGroup, getDowData, getFasciaData, getDaysBeforeData, getTrendData, getTrendDataByGroup, getConversionByFascia, getHeatmapData, getUserStats, getEventStats } from "./utils/dataTransformers";

import KPI from "./components/shared/KPI";
import UploadScreen from "./components/screens/UploadScreen";
import OverviewTab from "./components/tabs/OverviewTab";
import HeatmapTab from "./components/tabs/HeatmapTab";
import FasceTab from "./components/tabs/FasceTab";
import TrendsTab from "./components/tabs/TrendsTab";
import UsersTab from "./components/tabs/UsersTab";
import ComparisonTab from "./components/tabs/ComparisonTab";
import BirthdaysTab from "./components/tabs/BirthdaysTab";

function eventNameFromFile(filename) {
  return filename.replace(/\.(csv|xlsx|xls|tsv)$/i, "").replace(/registrazioni[_\s]*/i, "").replace(/_/g, " ").trim();
}

export default function ClubAnalytics() {
  const [step, setStep] = useState("upload");
  const [files, setFiles] = useState([]);
  const [data, setData] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [isDragging, setIsDragging] = useState(false);
  const [utentiData, setUtentiData] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all"); // all | standard | young
  const [selectedBrand, setSelectedBrand] = useState("all");
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

  // File processing
  const processFile = useCallback(async (file) => {
    const name = file.name.toLowerCase();
    return new Promise((resolve, reject) => {
      if (name.endsWith('.csv') || name.endsWith('.tsv')) {
        Papa.parse(file, {
          header: true, skipEmptyLines: true,
          complete: (r) => resolve({ name: file.name, eventName: eventNameFromFile(file.name), rows: r.data }),
          error: reject,
        });
      } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const wb = XLSX.read(e.target.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          resolve({ name: file.name, eventName: eventNameFromFile(file.name), rows: XLSX.utils.sheet_to_json(ws) });
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

  const buildData = useCallback(() => {
    const allRecords = [];
    const allUtenti = [];
    for (const f of files) {
      const keys = f.rows.length > 0 ? Object.keys(f.rows[0]) : [];
      if (isUtentiFormat(keys)) {
        allUtenti.push(...processUtentiRows(f.rows));
      } else {
        allRecords.push(...processRawRows(f.rows, f.eventName));
      }
    }
    setData(allRecords);
    setUtentiData(allUtenti);
    setStep("dashboard");
    setActiveTab("overview");
  }, [files]);

  // Filtered data based on category & brand selection
  const filtered = useMemo(() => {
    let d = data;
    if (selectedCategory !== "all") d = d.filter(r => r.category === selectedCategory);
    if (selectedBrand !== "all") d = d.filter(r => r.brand === selectedBrand);
    return d;
  }, [data, selectedCategory, selectedBrand]);

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
    const hourlyRegByEvent = getHourlyDataByGroup(filtered, 'brand');
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
      trendByGroup: getTrendDataByGroup(filtered, 'brand'),
      userStats: getUserStats(filtered),
      multiEvent: brands.length > 1,
    };
  }, [filtered]);

  // Available categories and brands for filters
  const categories = useMemo(() => {
    const cats = [...new Set(data.map(d => d.category))].filter(c => c && c !== 'unknown');
    return cats;
  }, [data]);

  const availableBrands = useMemo(() => {
    let d = data;
    if (selectedCategory !== "all") d = d.filter(r => r.category === selectedCategory);
    return [...new Set(d.map(r => r.brand))].filter(Boolean).sort();
  }, [data, selectedCategory]);

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
      />
    );
  }

  if (!analytics) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#f1f5f9" }}>
      {/* Top Bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "10px 20px",
        background: "#1e293b", borderBottom: "1px solid #334155", flexWrap: "wrap",
      }}>
        <div style={{ fontWeight: 800, fontSize: 16, background: "linear-gradient(135deg, #7c3aed, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Club Analytics
        </div>

        {/* Category filter */}
        <div style={{ display: "flex", gap: 4, marginLeft: 16 }}>
          <button onClick={() => { setSelectedCategory("all"); setSelectedBrand("all"); }} style={{
            padding: "4px 10px", borderRadius: 6, fontSize: 10, border: "none", cursor: "pointer",
            background: selectedCategory === "all" ? "#8b5cf6" : "#334155",
            color: selectedCategory === "all" ? "#fff" : "#94a3b8",
          }}>Tutti</button>
          {categories.map(c => (
            <button key={c} onClick={() => { setSelectedCategory(c); setSelectedBrand("all"); }} style={{
              padding: "4px 10px", borderRadius: 6, fontSize: 10, border: "none", cursor: "pointer",
              background: selectedCategory === c ? "#8b5cf6" : "#334155",
              color: selectedCategory === c ? "#fff" : "#94a3b8", textTransform: "capitalize",
            }}>{c}</button>
          ))}
        </div>

        {/* Brand filter */}
        <select
          value={selectedBrand}
          onChange={e => setSelectedBrand(e.target.value)}
          style={{
            background: "#334155", border: "1px solid #475569", borderRadius: 6,
            color: "#f1f5f9", fontSize: 11, padding: "4px 8px", outline: "none",
          }}
        >
          <option value="all">Tutti i brand ({availableBrands.length})</option>
          {availableBrands.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        <button onClick={() => { setStep("upload"); setData([]); setUtentiData([]); setFiles([]); }} style={{
          marginLeft: "auto", background: "#334155", border: "none", borderRadius: 6,
          color: "#94a3b8", fontSize: 11, padding: "5px 12px", cursor: "pointer",
        }}>
          Nuovo file
        </button>
      </div>

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, padding: "16px 20px" }}>
        <KPI icon={Users} label="Registrazioni" value={analytics.total} color="#8b5cf6" />
        <KPI icon={Check} label="Presenze" value={analytics.entered} sub={`${analytics.conv}% conversione`} color="#10b981" />
        <KPI icon={TrendingUp} label="Conversione" value={`${analytics.conv}%`} color="#06b6d4" />
        <KPI icon={X} label="No-Show" value={`${analytics.noShowRate}%`} color="#ef4444" />
        <KPI icon={Calendar} label="Brand" value={analytics.brands.length} color="#f59e0b" />
      </div>

      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: 4, padding: "0 20px 12px", overflowX: "auto" }}>
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
      <div style={{ padding: "0 20px 40px" }}>
        {activeTab === "overview" && (
          <OverviewTab
            analytics={analytics}
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
          <ComparisonTab data={filtered} />
        )}

        {activeTab === "utenti" && (
          <UsersTab userStats={analytics.userStats} />
        )}

        {activeTab === "compleanni" && (
          <BirthdaysTab
            data={utentiData.length > 0 ? utentiData : filtered}
            userStats={analytics.userStats}
          />
        )}
      </div>
    </div>
  );
}
