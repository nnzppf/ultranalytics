// Club Analytics v2.0 - Phase 3 Complete - Deployment fix
import { useState, useMemo, useEffect } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Cell, Legend, PieChart, Pie, LineChart, Line
} from "recharts";
import { Upload, Users, TrendingUp, BarChart2, Calendar, X, Plus, Check } from "lucide-react";
import _ from "lodash";

const COLORS = ["#8b5cf6","#ec4899","#06b6d4","#f59e0b","#10b981","#f43f5e","#6366f1","#14b8a6","#e879f9","#fb923c"];
const DAYS_ORDER = ["Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato","Domenica"];
const DAYS_SHORT = ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];
const HOURS = Array.from({length:24},(_,i)=>i);
const FASCE = ["00:00-06:00 (Notte)","06:00-12:00 (Mattina)","12:00-18:00 (Pomeriggio)","18:00-24:00 (Sera)"];
const FASCE_SHORT = ["Notte","Mattina","Pomeriggio","Sera"];

const MESI_IT = {gen:0,feb:1,mar:2,apr:3,mag:4,giu:5,lug:6,ago:7,set:8,ott:9,nov:10,dic:11,
  gennaio:0,febbraio:1,marzo:2,aprile:3,maggio:4,giugno:5,luglio:6,agosto:7,settembre:8,ottobre:9,novembre:10,dicembre:11};

function parseItalianDate(dateStr, timeStr) {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  // "08 Dic 2025" or "08/12/2025"
  let m = s.match(/(\d{1,2})\s+([A-Za-zÀ-ú]+)\s+(\d{4})/);
  if (m) {
    const day = parseInt(m[1]);
    const month = MESI_IT[m[2].toLowerCase()];
    const year = parseInt(m[3]);
    if (month !== undefined) {
      const t = timeStr ? String(timeStr).trim().match(/(\d{1,2})[:.](\d{2})/) : null;
      return new Date(year, month, day, t ? parseInt(t[1]) : 0, t ? parseInt(t[2]) : 0);
    }
  }
  // DD/MM/YYYY
  m = s.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m) {
    const t = timeStr ? String(timeStr).trim().match(/(\d{1,2})[:.](\d{2})/) : null;
    return new Date(parseInt(m[3]), parseInt(m[2])-1, parseInt(m[1]), t?parseInt(t[1]):0, t?parseInt(t[2]):0);
  }
  return null;
}

function eventNameFromFile(filename) {
  return filename.replace(/\.(csv|xlsx|xls|tsv)$/i,"").replace(/registrazioni[_\s]*/i,"").replace(/_/g," ").trim();
}

/* ── Demo data ─────────────────────────────── */
function generateDemoData() {
  const events = [
    { name: "Purple Rain — 20 Dic 2025", eventDate: new Date(2025,11,20), count: 350 },
    { name: "Halloween Night — 31 Ott 2025", eventDate: new Date(2025,9,31), count: 280 },
    { name: "Capodanno 2026 — 31 Dic 2025", eventDate: new Date(2025,11,31), count: 420 },
  ];
  const firstNames = ["Marco","Luca","Giulia","Sofia","Alessandro","Chiara","Matteo","Francesca","Lorenzo","Valentina","Andrea","Sara","Davide","Elena","Simone","Martina","Federico","Alessia","Giovanni","Anna","Elisa","Nicola","Beatrice","Aurora","Emma"];
  const lastNames = ["Rossi","Russo","Ferrari","Bianchi","Romano","Colombo","Ricci","Marino","Greco","Bruno","Gallo","Conti","Mancini","Costa","Giordano","Lombardi","Moretti","Bertoncello","Gastaldello","Viero"];
  const pick = a => a[Math.floor(Math.random()*a.length)];
  const allData = [];

  events.forEach(ev => {
    const n = Math.floor(ev.count*(0.85+Math.random()*0.3));
    for (let i=0; i<n; i++) {
      const daysBefore = Math.random()<0.4 ? 0 : Math.floor(Math.random()*12)+1;
      const regDate = new Date(ev.eventDate);
      regDate.setDate(regDate.getDate()-daysBefore);
      let h;
      if (daysBefore===0) {
        const r=Math.random();
        if (r<0.15) h=Math.floor(Math.random()*6); // notte 0-5 (registrazioni post-apertura)
        else if (r<0.35) h=6+Math.floor(Math.random()*6); // mattina
        else if (r<0.6) h=12+Math.floor(Math.random()*6); // pomeriggio
        else h=18+Math.floor(Math.random()*6); // sera
      } else {
        const r=Math.random();
        if (r<0.25) h=9+Math.floor(Math.random()*3);
        else if (r<0.6) h=14+Math.floor(Math.random()*4);
        else if (r<0.85) h=18+Math.floor(Math.random()*4);
        else h=Math.floor(Math.random()*24);
      }
      const min = Math.floor(Math.random()*60);
      regDate.setHours(h,min);
      const dow = regDate.getDay();
      const dowName = ["Domenica","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato"][dow];
      let fascia;
      if (h<6) fascia=FASCE[0]; else if (h<12) fascia=FASCE[1]; else if (h<18) fascia=FASCE[2]; else fascia=FASCE[3];

      allData.push({
        event: ev.name,
        nomeCliente: `${pick(firstNames)} ${pick(lastNames)}`,
        registrationDate: regDate,
        giornoSettimana: dowName,
        fasciaOraria: fascia,
        haPartecipato: Math.random() < (daysBefore===0&&h>=22 ? 0.85 : daysBefore<=1 ? 0.7 : 0.45),
      });
    }
  });
  return allData;
}

/* ── Small components ─────────────────────── */
const tt = {backgroundColor:"#1e293b",border:"1px solid #475569",borderRadius:8,fontSize:12};

function KPI({icon:Icon,label,value,sub,color}) {
  return (
    <div style={{background:"#1e293b",borderRadius:12,padding:"14px 16px",border:"1px solid #334155"}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
        <Icon size={14} color={color}/>
        <span style={{fontSize:11,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.05em"}}>{label}</span>
      </div>
      <div style={{fontSize:22,fontWeight:700,color:"#f1f5f9"}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:"#64748b",marginTop:2}}>{sub}</div>}
    </div>
  );
}

function Section({title,children}) {
  return (
    <div>
      <h3 style={{fontSize:11,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:10,fontWeight:500}}>{title}</h3>
      <div style={{background:"#1e293b",borderRadius:12,padding:16,border:"1px solid #334155"}}>{children}</div>
    </div>
  );
}

function Heatmap({data}) {
  const {grid,max} = useMemo(() => {
    const g = Array.from({length:7},()=>Array(24).fill(0));
    let mx=0;
    data.forEach(d => {
      if (!d.registrationDate) return;
      const dow = DAYS_ORDER.indexOf(d.giornoSettimana);
      if (dow<0) return;
      const h = d.registrationDate.getHours();
      g[dow][h]++;
      if (g[dow][h]>mx) mx=g[dow][h];
    });
    return {grid:g,max:mx||1};
  },[data]);
  const color = v => {
    if (!v) return "#1a1a2e";
    const t=v/max;
    return `rgb(${Math.round(30+t*109)},${Math.round(20+t*52)},${Math.round(60+t*186)})`;
  };
  return (
    <div style={{overflowX:"auto"}}>
      <div style={{display:"grid",gridTemplateColumns:"44px repeat(24,1fr)",gap:2,minWidth:580}}>
        <div/>
        {HOURS.map(h=><div key={h} style={{textAlign:"center",fontSize:9,color:"#64748b"}}>{String(h).padStart(2,"0")}</div>)}
        {DAYS_SHORT.map((day,di)=>[
          <div key={`l${di}`} style={{fontSize:11,color:"#94a3b8",display:"flex",alignItems:"center"}}>{day}</div>,
          ...HOURS.map(h=>(
            <div key={`${di}-${h}`} title={`${day} ${String(h).padStart(2,"0")}:00 — ${grid[di][h]} registrazioni`}
              style={{backgroundColor:color(grid[di][h]),borderRadius:3,minHeight:20,aspectRatio:"1",transition:"transform 0.1s",cursor:"crosshair"}}
              onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.35)";e.currentTarget.style.zIndex=10;}}
              onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.zIndex=0;}}
            />
          ))
        ])}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"flex-end",marginTop:10}}>
        <span style={{fontSize:10,color:"#64748b"}}>Meno</span>
        {[0,.25,.5,.75,1].map((v,i)=><div key={i} style={{width:13,height:13,borderRadius:3,backgroundColor:color(v*max)}}/>)}
        <span style={{fontSize:10,color:"#64748b"}}>Più</span>
      </div>
    </div>
  );
}

/* ── Main App ──────────────────────────────── */
export default function ClubAnalytics() {
  const [step, setStep] = useState("upload"); // upload | dashboard
  const [files, setFiles] = useState([]); // [{name, eventName, rows}]
  const [data, setData] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedEvent, setSelectedEvent] = useState("all");
  const [selectedEdition, setSelectedEdition] = useState("all");
  const [timeGranularity, setTimeGranularity] = useState("hourly"); // "hourly" | "30min" | "15min"
  const [stackedView, setStackedView] = useState(false);
  const [fasciaStackedView, setFasciaStackedView] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Ridimensionamento grafici
  const [graphHeights, setGraphHeights] = useState({
    hourly: 250,
    dowData: 220,
    daysBeforeData: 220,
    fasciaData: 250,
    convByFascia: 220,
    heatmap: 300,
    trend: 300,
  });

  // Tab Utenti
  const [usersSearchTerm, setUsersSearchTerm] = useState("");
  const [userSegmentFilter, setUserSegmentFilter] = useState("all"); // "all"|"vip"|"fedeli"|"occasionali"|"ghost"
  const [userConversionMinFilter, setUserConversionMinFilter] = useState(0);
  const [userParticipantsOnly, setUserParticipantsOnly] = useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);

  const processFile = (file) => {
    return new Promise(resolve => {
      const ext = file.name.split(".").pop().toLowerCase();
      if (ext==="csv"||ext==="tsv") {
        Papa.parse(file, {
          header:true, skipEmptyLines:true,
          complete: r => resolve({name:file.name, eventName:eventNameFromFile(file.name), rows:r.data})
        });
      } else {
        const reader = new FileReader();
        reader.onload = e => {
          const wb = XLSX.read(e.target.result,{type:"array"});
          const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
          resolve({name:file.name, eventName:eventNameFromFile(file.name), rows:json});
        };
        reader.readAsArrayBuffer(file);
      }
    });
  };

  const handleFiles = async (fileList) => {
    const results = [];
    for (const f of fileList) {
      const result = await processFile(f);
      results.push(result);
    }
    setFiles(prev => [...prev, ...results]);
  };

  const removeFile = (idx) => setFiles(prev => prev.filter((_,i)=>i!==idx));

  const updateEventName = (idx, name) => {
    setFiles(prev => prev.map((f,i)=>i===idx?{...f,eventName:name}:f));
  };

  // Carica graphHeights da localStorage al mount
  useEffect(() => {
    const saved = localStorage.getItem('clubAnalyticsGraphHeights');
    if (saved) {
      try {
        setGraphHeights(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  // Salva graphHeights in localStorage quando cambia
  useEffect(() => {
    localStorage.setItem('clubAnalyticsGraphHeights', JSON.stringify(graphHeights));
  }, [graphHeights]);

  const buildData = () => {
    const allData = [];
    files.forEach(f => {
      // Auto-detect columns
      if (!f.rows.length) return;
      const cols = Object.keys(f.rows[0]);
      const findCol = (candidates) => cols.find(c => candidates.some(k => c.toLowerCase().includes(k)));
      const dateCol = findCol(["data"]) || cols[0];
      const timeCol = findCol(["ora"]) || cols[1];
      const nameCol = findCol(["nome","client"]) || cols[2];
      const dowCol = findCol(["giorno","settimana"]);
      const fasciaCol = findCol(["fascia","orari"]);
      const partCol = findCol(["partecipat","ha part"]);

      f.rows.forEach(row => {
        const regDate = parseItalianDate(row[dateCol], row[timeCol]);
        if (!regDate) return;

        const haPartRaw = row[partCol];
        const haPartecipato = haPartRaw ? (String(haPartRaw).toLowerCase().startsWith("s") || String(haPartRaw)==="1" || String(haPartRaw).toLowerCase()==="true") : false;

        const h = regDate.getHours();
        let fascia = row[fasciaCol] || "";
        if (!fascia) {
          if (h<6) fascia=FASCE[0]; else if (h<12) fascia=FASCE[1]; else if (h<18) fascia=FASCE[2]; else fascia=FASCE[3];
        }

        const dow = regDate.getDay();
        const dowName = row[dowCol] || ["Domenica","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato"][dow];

        // Extract base event name (before "—") and edition date
        const baseEventName = f.eventName.split("—")[0].trim();
        const editionDate = `${regDate.getFullYear()}-${String(regDate.getMonth()+1).padStart(2,"0")}-${String(regDate.getDate()).padStart(2,"0")}`;

        allData.push({
          event: f.eventName,
          baseEventName,
          editionDate,
          nomeCliente: row[nameCol] || "",
          registrationDate: regDate,
          giornoSettimana: dowName,
          fasciaOraria: fascia,
          haPartecipato,
        });
      });
    });
    setData(allData);
    setStep("dashboard");
  };

  const loadDemo = () => { setData(generateDemoData()); setStep("dashboard"); };

  /* ── Utility functions for granular time and stacked data ── */
  const getHourlyDataByGranularity = (filtered, granularity) => {
    if (granularity === "hourly") {
      return HOURS.map(h=>({
        hour:`${String(h).padStart(2,"0")}:00`,
        registrazioni: filtered.filter(d=>d.registrationDate?.getHours()===h).length,
      }));
    } else if (granularity === "30min") {
      const buckets = [];
      for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 30) {
          const startMin = m;
          const endMin = m + 30;
          const count = filtered.filter(d => {
            const dh = d.registrationDate?.getHours();
            const dm = d.registrationDate?.getMinutes();
            return dh === h && dm >= startMin && dm < endMin;
          }).length;
          buckets.push({
            hour:`${String(h).padStart(2,"0")}:${String(startMin).padStart(2,"0")}`,
            registrazioni: count,
          });
        }
      }
      return buckets;
    } else if (granularity === "15min") {
      const buckets = [];
      for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 15) {
          const startMin = m;
          const endMin = m + 15;
          const count = filtered.filter(d => {
            const dh = d.registrationDate?.getHours();
            const dm = d.registrationDate?.getMinutes();
            return dh === h && dm >= startMin && dm < endMin;
          }).length;
          buckets.push({
            hour:`${String(h).padStart(2,"0")}:${String(startMin).padStart(2,"0")}`,
            registrazioni: count,
          });
        }
      }
      return buckets;
    }
  };

  const getHourlyRegByEvent = (filtered, granularity) => {
    let buckets;
    if (granularity === "hourly") {
      buckets = HOURS.map(h => ({ hour:`${String(h).padStart(2,"0")}:00` }));
      filtered.forEach(d => {
        const h = d.registrationDate?.getHours();
        const idx = buckets.findIndex(b => b.hour === `${String(h).padStart(2,"0")}:00`);
        if (idx >= 0) {
          const ev = d.event;
          buckets[idx][ev] = (buckets[idx][ev] || 0) + 1;
        }
      });
    } else if (granularity === "30min") {
      buckets = [];
      for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 30) {
          buckets.push({ hour:`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}` });
        }
      }
      filtered.forEach(d => {
        const h = d.registrationDate?.getHours();
        const m = d.registrationDate?.getMinutes();
        const bucket = Math.floor(m / 30);
        const hourStr = `${String(h).padStart(2,"0")}:${String(bucket * 30).padStart(2,"0")}`;
        const idx = buckets.findIndex(b => b.hour === hourStr);
        if (idx >= 0) {
          const ev = d.event;
          buckets[idx][ev] = (buckets[idx][ev] || 0) + 1;
        }
      });
    } else if (granularity === "15min") {
      buckets = [];
      for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 15) {
          buckets.push({ hour:`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}` });
        }
      }
      filtered.forEach(d => {
        const h = d.registrationDate?.getHours();
        const m = d.registrationDate?.getMinutes();
        const bucket = Math.floor(m / 15);
        const hourStr = `${String(h).padStart(2,"0")}:${String(bucket * 15).padStart(2,"0")}`;
        const idx = buckets.findIndex(b => b.hour === hourStr);
        if (idx >= 0) {
          const ev = d.event;
          buckets[idx][ev] = (buckets[idx][ev] || 0) + 1;
        }
      });
    }
    return buckets;
  };

  const getDowDataByEvent = (filtered) => {
    const buckets = DAYS_ORDER.map((d,i) => ({ giorno: DAYS_SHORT[i] }));
    filtered.forEach(row => {
      const idx = buckets.findIndex(b => b.giorno === DAYS_SHORT[DAYS_ORDER.indexOf(row.giornoSettimana)]);
      if (idx >= 0) {
        const ev = row.event;
        buckets[idx][ev] = (buckets[idx][ev] || 0) + 1;
      }
    });
    return buckets;
  };

  const getDaysBeforeDataByEvent = (data, filtered, events) => {
    const daysBeforeByEvent = {};
    events.forEach(ev => {
      const evRows = data.filter(d=>d.event===ev);
      const latestDate = _.maxBy(evRows, r=>r.registrationDate?.getTime()||0)?.registrationDate;
      if (!latestDate) return;
      const end = new Date(latestDate); end.setHours(23,59,59);
      daysBeforeByEvent[ev] = {};
      evRows.forEach(d => {
        if (!d.registrationDate) return;
        const diff = Math.min(Math.floor((end-d.registrationDate)/864e5),14);
        daysBeforeByEvent[ev][diff] = (daysBeforeByEvent[ev][diff]||0)+1;
      });
    });
    return Array.from({length:15},(_,i)=>({
      days: i===0?"Giorno evento":`-${i}g`,
      ...Object.fromEntries(events.map(ev => [ev, daysBeforeByEvent[ev]?.[i]||0]))
    })).reverse();
  };

  const getFasciaDataByEvent = (filtered, events) => {
    const fasciaByEvent = {};
    events.forEach(ev => {
      fasciaByEvent[ev] = FASCE.map((f,i)=>({
        fascia: FASCE_SHORT[i],
        count: filtered.filter(d=>d.event===ev && d.fasciaOraria===f).length,
      })).filter(d => d.count > 0);
    });
    return fasciaByEvent;
  };

  const getUserStats = (data) => {
    // Raggruppa per nomeCliente
    const userMap = {};
    data.forEach(row => {
      const name = row.nomeCliente || "Unknown";
      if (!userMap[name]) {
        userMap[name] = {
          name,
          totalRegs: 0,
          totalParticipated: 0,
          events: [],
          lastReg: null,
        };
      }
      userMap[name].totalRegs++;
      if (row.haPartecipato) userMap[name].totalParticipated++;
      if (!userMap[name].events.find(e => e.event === row.event)) {
        userMap[name].events.push({event: row.event, count: 1, participated: row.haPartecipato ? 1 : 0});
      } else {
        const ev = userMap[name].events.find(e => e.event === row.event);
        ev.count++;
        if (row.haPartecipato) ev.participated++;
      }
      const regTime = row.registrationDate?.getTime() || 0;
      const lastTime = userMap[name].lastReg?.getTime() || 0;
      if (regTime > lastTime) userMap[name].lastReg = row.registrationDate;
    });

    // Calcola conversion e segment per ogni utente
    return Object.values(userMap)
      .map(user => ({
        ...user,
        conversion: user.totalRegs > 0 ? ((user.totalParticipated / user.totalRegs) * 100).toFixed(1) : 0,
        eventCount: user.events.length,
      }))
      .map(user => {
        let segment = "occasionali";
        if (user.conversion >= 80) segment = "vip";
        else if (user.eventCount >= 3) segment = "fedeli";
        else if (user.conversion === 0) segment = "ghost";
        return {...user, segment};
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  /* ── Analytics ────────────────────────── */
  const analytics = useMemo(() => {
    if (!data.length) return null;
    const events = _.uniq(data.map(d=>d.event));
    let filtered = selectedEvent==="all" ? data : data.filter(d=>d.event===selectedEvent);
    // Apply edition filter if selected
    if (selectedEdition !== "all") {
      filtered = filtered.filter(d=>d.editionDate===selectedEdition);
    }
    const total = filtered.length;
    const entered = filtered.filter(d=>d.haPartecipato).length;
    const conv = total ? ((entered/total)*100).toFixed(1) : "0";

    // Per-event stats
    const eventStats = events.map(ev => {
      const rows = data.filter(d=>d.event===ev);
      const ent = rows.filter(d=>d.haPartecipato).length;
      return {event:ev, registrations:rows.length, entries:ent, conversion:rows.length?((ent/rows.length)*100).toFixed(1):"0"};
    }).sort((a,b)=>b.registrations-a.registrations);

    // Hourly registration distribution (with granularity support)
    const hourlyReg = getHourlyDataByGranularity(filtered, timeGranularity);

    // Hourly registration by event (for stacked view)
    const hourlyRegByEvent = getHourlyRegByEvent(filtered, timeGranularity);

    // Fascia oraria breakdown
    const fasciaData = FASCE.map((f,i)=>({
      fascia: FASCE_SHORT[i],
      count: filtered.filter(d=>d.fasciaOraria===f).length,
      partecipato: filtered.filter(d=>d.fasciaOraria===f && d.haPartecipato).length,
    }));

    // Day-of-week breakdown
    const dowData = DAYS_ORDER.map((d,i)=>({
      giorno: DAYS_SHORT[i],
      count: filtered.filter(r=>r.giornoSettimana===d).length,
      partecipato: filtered.filter(r=>r.giornoSettimana===d && r.haPartecipato).length,
    }));

    // Days before event
    const daysMap = {};
    events.forEach(ev => {
      const evRows = data.filter(d=>d.event===ev);
      const latestDate = _.maxBy(evRows, r=>r.registrationDate?.getTime()||0)?.registrationDate;
      if (!latestDate) return;
      const end = new Date(latestDate); end.setHours(23,59,59);
      evRows.forEach(d => {
        if (!d.registrationDate) return;
        const diff = Math.min(Math.floor((end-d.registrationDate)/864e5),14);
        daysMap[diff] = (daysMap[diff]||0)+1;
      });
    });
    const daysBeforeData = Array.from({length:15},(_,i)=>({
      days: i===0?"Giorno evento":`-${i}g`, count:daysMap[i]||0
    })).reverse();

    // Registration trend (daily)
    const trendBucket = {};
    filtered.forEach(d => {
      if (!d.registrationDate) return;
      const key = `${d.registrationDate.getFullYear()}-${String(d.registrationDate.getMonth()+1).padStart(2,"0")}-${String(d.registrationDate.getDate()).padStart(2,"0")}`;
      if (!trendBucket[key]) trendBucket[key]={date:key,total:0,partecipato:0};
      trendBucket[key].total++;
      if (d.haPartecipato) trendBucket[key].partecipato++;
    });
    const trend = Object.values(trendBucket).sort((a,b)=>a.date.localeCompare(b.date));

    // Conversion by fascia
    const convByFascia = FASCE.map((f,i) => {
      const rows = filtered.filter(d=>d.fasciaOraria===f);
      const ent = rows.filter(d=>d.haPartecipato).length;
      return {fascia:FASCE_SHORT[i], conversione: rows.length?parseFloat(((ent/rows.length)*100).toFixed(1)):0, registrazioni:rows.length};
    });

    // Per-event comparison for multi-event stacked charts
    const trendByEvent = {};
    filtered.forEach(d => {
      if (!d.registrationDate) return;
      const key = `${d.registrationDate.getFullYear()}-${String(d.registrationDate.getMonth()+1).padStart(2,"0")}-${String(d.registrationDate.getDate()).padStart(2,"0")}`;
      if (!trendByEvent[key]) trendByEvent[key]={date:key};
      trendByEvent[key][d.event] = (trendByEvent[key][d.event]||0)+1;
    });
    const trendMulti = Object.values(trendByEvent).sort((a,b)=>a.date.localeCompare(b.date));

    // Stacked data for panoramica section
    const dowDataByEvent = getDowDataByEvent(filtered);
    const daysBeforeDataByEvent = getDaysBeforeDataByEvent(data, filtered, events);
    const fasciaDataByEvent = getFasciaDataByEvent(filtered, events);

    // User stats
    const userStats = getUserStats(data);

    // Phase 3 Analytics - Tasso No-Show
    const noShowRate = total > 0 ? (((total - entered) / total) * 100).toFixed(1) : "0";

    // Phase 3 Analytics - Picco di Registrazioni
    const hourlyPeak = hourlyReg?.reduce((max, curr) =>
      curr.registrazioni > max.registrazioni ? curr : max,
      {hour: "—", registrazioni: 0}
    );

    return {events,filtered,total,entered,conv,eventStats,hourlyReg,hourlyRegByEvent,hourlyPeak,fasciaData,dowData,dowDataByEvent,daysBeforeData,daysBeforeDataByEvent,trend,trendMulti,convByFascia,fasciaDataByEvent,userStats,noShowRate,avgPerEvent:events.length?Math.round(total/events.length):0};
  },[data,selectedEvent,selectedEdition,timeGranularity]);

  /* ── Edition Analytics (per confronto edizioni) ── */
  const editionAnalytics = useMemo(() => {
    if (!analytics || !selectedEvent || selectedEvent==="all") return null;

    // Raggruppa per baseEventName
    const editions = _.uniq(analytics.filtered.map(d=>({date:d.editionDate, event:d.event}))).sort((a,b)=>a.date.localeCompare(b.date));
    if (editions.length < 2) return null; // Almeno 2 edizioni

    // Per ogni edizione, calcola metriche
    const editionStats = editions.map(ed => {
      const rows = analytics.filtered.filter(d=>d.editionDate===ed.date);
      const ent = rows.filter(d=>d.haPartecipato).length;
      const total = rows.length;
      const conv = total ? ((ent/total)*100).toFixed(1) : "0";
      return {date:ed.date, event:ed.event, registrations:total, entries:ent, conversion:conv};
    });

    // Trend per giorno prima evento (by edition)
    const daysBeforeByEdition = {};
    editions.forEach(ed => {
      const edRows = analytics.filtered.filter(d=>d.editionDate===ed.date);
      const latestDate = _.maxBy(edRows, r=>r.registrationDate?.getTime()||0)?.registrationDate;
      if (!latestDate) return;
      const end = new Date(latestDate); end.setHours(23,59,59);
      daysBeforeByEdition[ed.date] = {};
      edRows.forEach(d => {
        if (!d.registrationDate) return;
        const diff = Math.min(Math.floor((end-d.registrationDate)/864e5),14);
        daysBeforeByEdition[ed.date][diff] = (daysBeforeByEdition[ed.date][diff]||0)+1;
      });
    });

    const trendByDaysBeforeEdition = Array.from({length:15},(_,i)=>({
      days: i===0?"Giorno evento":`-${i}g`,
      ...Object.fromEntries(editions.map(ed=>[ed.date, daysBeforeByEdition[ed.date]?.[i]||0]))
    })).reverse();

    // Fascia oraria by edition
    const fasciaByEdition = {};
    editions.forEach(ed => {
      const edRows = analytics.filtered.filter(d=>d.editionDate===ed.date);
      fasciaByEdition[ed.date] = FASCE.map((f,i) => {
        const rows = edRows.filter(d=>d.fasciaOraria===f);
        return {fascia:FASCE_SHORT[i], [`${ed.date}`]:rows.length};
      });
    });

    // Merge fascia data
    const fasciaDataMerged = FASCE.map((f,i) => {
      const obj = {fascia:FASCE_SHORT[i]};
      editions.forEach(ed => {
        obj[ed.date] = fasciaByEdition[ed.date][i][ed.date] || 0;
      });
      return obj;
    });

    // KPI confronto
    const avgReg = Math.round(editionStats.reduce((s,e)=>s+e.registrations,0) / editionStats.length);
    const maxReg = Math.max(...editionStats.map(e=>e.registrations));
    const maxRegEdition = editionStats.find(e=>e.registrations===maxReg);
    const bestConv = Math.max(...editionStats.map(e=>parseFloat(e.conversion)));
    const bestConvEdition = editionStats.find(e=>parseFloat(e.conversion)===bestConv);
    const growthPercent = editionStats.length >= 2
      ? (((editionStats[editionStats.length-1].registrations - editionStats[0].registrations) / editionStats[0].registrations) * 100).toFixed(1)
      : "0";

    return {editionStats, trendByDaysBeforeEdition, fasciaDataMerged, editions, avgReg, maxRegEdition, bestConvEdition, growthPercent};
  },[analytics, selectedEvent]);

  /* ════════════════ UPLOAD SCREEN ═════════════════ */
  if (step==="upload") {
    return (
      <div style={{minHeight:"100vh",background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center",padding:16,fontFamily:"system-ui,-apple-system,sans-serif"}}>
        <div style={{maxWidth:520,width:"100%"}}>
          {/* Header */}
          <div style={{textAlign:"center",marginBottom:32}}>
            <div style={{width:64,height:64,background:"linear-gradient(135deg,#7c3aed,#ec4899)",borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
              <BarChart2 size={32} color="white"/>
            </div>
            <h1 style={{fontSize:28,fontWeight:700,color:"#f1f5f9",margin:"0 0 6px"}}>Club Analytics</h1>
            <p style={{fontSize:14,color:"#94a3b8",margin:0}}>Carica i CSV dei tuoi eventi per analizzare registrazioni e presenze</p>
          </div>

          {/* Drop zone */}
          <div
            style={{border:"2px dashed",borderColor:isDragging?"#a78bfa":"#475569",borderRadius:16,padding:"40px 24px",cursor:"pointer",transition:"all 0.2s",background:isDragging?"rgba(139,92,246,0.08)":"transparent",textAlign:"center"}}
            onDragOver={e=>{e.preventDefault();setIsDragging(true);}}
            onDragLeave={()=>setIsDragging(false)}
            onDrop={e=>{e.preventDefault();setIsDragging(false);handleFiles(Array.from(e.dataTransfer.files));}}
            onClick={()=>{const inp=document.createElement("input");inp.type="file";inp.accept=".csv,.xlsx,.xls,.tsv";inp.multiple=true;inp.onchange=e=>handleFiles(Array.from(e.target.files));inp.click();}}
          >
            <Upload size={36} style={{margin:"0 auto 10px",display:"block",color:"#64748b"}}/>
            <p style={{color:"#f1f5f9",fontWeight:500,margin:"0 0 4px",fontSize:15}}>Trascina qui i tuoi file</p>
            <p style={{color:"#64748b",fontSize:13,margin:0}}>CSV o Excel — puoi caricare più eventi insieme</p>
          </div>

          {/* File list */}
          {files.length>0 && (
            <div style={{marginTop:20}}>
              <p style={{fontSize:12,color:"#94a3b8",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.05em"}}>
                {files.length} {files.length===1?"file caricato":"file caricati"} — {files.reduce((s,f)=>s+f.rows.length,0)} righe totali
              </p>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {files.map((f,i)=>(
                  <div key={i} style={{background:"#1e293b",borderRadius:10,padding:"10px 14px",border:"1px solid #334155",display:"flex",alignItems:"center",gap:10}}>
                    <Check size={16} color="#10b981"/>
                    <div style={{flex:1}}>
                      <input
                        value={f.eventName}
                        onChange={e=>updateEventName(i,e.target.value)}
                        style={{background:"transparent",border:"none",color:"#f1f5f9",fontSize:14,fontWeight:500,width:"100%",outline:"none",padding:0}}
                        title="Clicca per modificare il nome dell'evento"
                      />
                      <div style={{fontSize:11,color:"#64748b"}}>{f.rows.length} registrazioni • {f.name}</div>
                    </div>
                    <button onClick={(e)=>{e.stopPropagation();removeFile(i);}} style={{background:"none",border:"none",cursor:"pointer",padding:4,color:"#64748b"}}>
                      <X size={14}/>
                    </button>
                  </div>
                ))}
              </div>

              {/* Add more */}
              <button
                onClick={()=>{const inp=document.createElement("input");inp.type="file";inp.accept=".csv,.xlsx,.xls,.tsv";inp.multiple=true;inp.onchange=e=>handleFiles(Array.from(e.target.files));inp.click();}}
                style={{marginTop:10,background:"none",border:"1px dashed #475569",borderRadius:8,padding:"8px 16px",color:"#94a3b8",fontSize:12,cursor:"pointer",width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}
              >
                <Plus size={14}/> Aggiungi altro evento
              </button>

              {/* Analyze button */}
              <button
                onClick={buildData}
                style={{marginTop:16,width:"100%",padding:"12px 16px",borderRadius:10,fontSize:14,fontWeight:600,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#7c3aed,#a855f7)",color:"white",transition:"opacity 0.2s"}}
              >
                Analizza {files.length} {files.length===1?"evento":"eventi"} →
              </button>
            </div>
          )}

          {/* Demo link */}
          <div style={{textAlign:"center",marginTop:20}}>
            <button onClick={loadDemo} style={{background:"none",border:"none",color:"#a78bfa",cursor:"pointer",fontSize:13,textDecoration:"underline",textUnderlineOffset:4}}>
              Prova con dati demo
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════ DASHBOARD ═════════════════════ */
  if (!analytics) return null;
  const multiEvent = analytics.events.length>1;
  const hasMultipleEditions = editionAnalytics !== null;
  const tabs = [
    {id:"overview",label:"Panoramica"},
    {id:"heatmap",label:"Heatmap"},
    {id:"fasce",label:"Fasce Orarie"},
    {id:"trends",label:"Trend"},
    ...(hasMultipleEditions?[{id:"confronto-edizioni",label:"Confronto Edizioni"}]:[]),
    ...(multiEvent?[{id:"confronto",label:"Confronto"}]:[]),
    {id:"utenti",label:"Utenti"},
  ];

  // ResizeHandle componente
  const ResizeHandle = ({sectionKey, label}) => (
    <div style={{fontSize:11,marginTop:8,display:"flex",gap:8,alignItems:"center",padding:"8px 12px",background:"#1e293b",borderRadius:8}}>
      <span style={{color:"#64748b",minWidth:50}}>{label}:</span>
      <input
        type="range"
        min="150"
        max="600"
        value={graphHeights[sectionKey] || 250}
        onChange={(e)=>setGraphHeights({...graphHeights,[sectionKey]:parseInt(e.target.value)})}
        style={{flex:1}}
      />
      <span style={{color:"#94a3b8",fontSize:10,minWidth:45}}>{graphHeights[sectionKey] || 250}px</span>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#0f172a",color:"#f1f5f9",fontFamily:"system-ui,-apple-system,sans-serif",fontSize:14}}>
      {/* Top bar */}
      <div style={{borderBottom:"1px solid #1e293b",padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:30,height:30,background:"linear-gradient(135deg,#7c3aed,#ec4899)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <BarChart2 size={16} color="white"/>
          </div>
          <span style={{fontWeight:700,fontSize:15}}>Club Analytics</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {multiEvent && (
            <select
              style={{background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:"6px 10px",fontSize:12,color:"#e2e8f0",outline:"none"}}
              value={selectedEvent} onChange={e=>setSelectedEvent(e.target.value)}
            >
              <option value="all">Tutti gli eventi ({analytics.events.length})</option>
              {analytics.events.map(ev=><option key={ev} value={ev}>{ev}</option>)}
            </select>
          )}
          <button onClick={()=>{setStep("upload");setData([]);setFiles([]);}} style={{fontSize:11,color:"#64748b",background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>Nuovo file</button>
        </div>
      </div>

      {/* KPI */}
      <div style={{padding:16,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12}}>
        <KPI icon={Users} label="Registrazioni" value={analytics.total.toLocaleString("it")} color="#8b5cf6"/>
        <KPI icon={Check} label="Partecipato" value={analytics.entered.toLocaleString("it")} sub={`su ${analytics.total.toLocaleString("it")} registrati`} color="#06b6d4"/>
        <KPI icon={TrendingUp} label="Conversione" value={`${analytics.conv}%`} sub="Registrati → Presenti" color="#10b981"/>
        <KPI icon={X} label="Tasso No-show" value={`${analytics.noShowRate}%`} sub={`${(analytics.total - analytics.entered).toLocaleString("it")} non partecipanti`} color="#ef4444"/>
        <KPI icon={Calendar} label="Eventi" value={analytics.events.length} sub={`Media ${analytics.avgPerEvent}/evento`} color="#f59e0b"/>
      </div>

      {/* Tabs */}
      <div style={{padding:"0 16px",display:"flex",gap:2,borderBottom:"1px solid #1e293b",overflowX:"auto"}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            style={{padding:"10px 14px",fontSize:12,fontWeight:500,background:"none",border:"none",cursor:"pointer",color:activeTab===t.id?"#a78bfa":"#64748b",borderBottom:activeTab===t.id?"2px solid #a78bfa":"2px solid transparent",transition:"all 0.15s",whiteSpace:"nowrap"}}
          >{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{padding:16}}>

        {/* ═══ OVERVIEW ═══ */}
        {activeTab==="overview" && (
          <div style={{display:"flex",flexDirection:"column",gap:24}}>
            <div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                <h3 style={{fontSize:11,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.05em",margin:0}}>Registrazioni per ora del giorno</h3>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>setTimeGranularity("hourly")} style={{padding:"4px 10px",borderRadius:6,fontSize:11,border:timeGranularity==="hourly"?"2px solid #a78bfa":"1px solid #475569",background:timeGranularity==="hourly"?"rgba(167,139,250,0.1)":"transparent",color:timeGranularity==="hourly"?"#a78bfa":"#94a3b8",cursor:"pointer"}}>Oraria</button>
                  <button onClick={()=>setTimeGranularity("30min")} style={{padding:"4px 10px",borderRadius:6,fontSize:11,border:timeGranularity==="30min"?"2px solid #a78bfa":"1px solid #475569",background:timeGranularity==="30min"?"rgba(167,139,250,0.1)":"transparent",color:timeGranularity==="30min"?"#a78bfa":"#94a3b8",cursor:"pointer"}}>30 min</button>
                  <button onClick={()=>setTimeGranularity("15min")} style={{padding:"4px 10px",borderRadius:6,fontSize:11,border:timeGranularity==="15min"?"2px solid #a78bfa":"1px solid #475569",background:timeGranularity==="15min"?"rgba(167,139,250,0.1)":"transparent",color:timeGranularity==="15min"?"#a78bfa":"#94a3b8",cursor:"pointer"}}>15 min</button>
                </div>
              </div>
              <div style={{background:"#1e293b",borderRadius:12,padding:16,border:"1px solid #334155"}}>
                <ResponsiveContainer width="100%" height={graphHeights.hourly}>
                  <BarChart data={stackedView && selectedEvent==="all" ? analytics.hourlyRegByEvent : analytics.hourlyReg}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155"/>
                    <XAxis dataKey="hour" tick={{fill:"#94a3b8",fontSize:9}} interval={Math.max(1, Math.floor(analytics.hourlyReg.length / 15))}/>
                    <YAxis tick={{fill:"#94a3b8",fontSize:11}}/>
                    <Tooltip contentStyle={tt}/>
                    {stackedView && selectedEvent==="all" ? (
                      <>
                        <Legend wrapperStyle={{fontSize:11}}/>
                        {analytics.events.slice(0,8).map((ev,i)=>(
                          <Bar key={ev} dataKey={ev} stackId="a" fill={COLORS[i%COLORS.length]}/>
                        ))}
                      </>
                    ) : (
                      <Bar dataKey="registrazioni" fill="#8b5cf6" radius={[4,4,0,0]}/>
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <ResizeHandle sectionKey="hourly" label="Altezza"/>
              <div style={{fontSize:12,color:"#94a3b8",marginTop:8}}>
                📊 Picco: <span style={{color:"#a78bfa",fontWeight:600}}>{analytics.hourlyPeak.hour}</span> con <span style={{color:"#c4b5fd",fontWeight:600}}>{analytics.hourlyPeak.registrazioni}</span> registrazioni
              </div>
              {selectedEvent==="all" && (
                <div style={{marginTop:12,display:"flex",gap:8}}>
                  <button onClick={()=>setStackedView(!stackedView)} style={{padding:"6px 12px",borderRadius:6,fontSize:11,border:"1px solid #475569",background:stackedView?"rgba(16,185,129,0.1)":"transparent",color:stackedView?"#10b981":"#94a3b8",cursor:"pointer"}}>
                    {stackedView ? "✓ Suddividi per evento" : "Suddividi per evento"}
                  </button>
                </div>
              )}
            </div>

            <div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                <h3 style={{fontSize:11,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.05em",margin:0}}>Registrazioni per giorno della settimana</h3>
              </div>
              <div style={{background:"#1e293b",borderRadius:12,padding:16,border:"1px solid #334155"}}>
                <ResponsiveContainer width="100%" height={graphHeights.dowData}>
                  <BarChart data={stackedView && selectedEvent==="all" ? analytics.dowDataByEvent : analytics.dowData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155"/>
                    <XAxis dataKey="giorno" tick={{fill:"#94a3b8",fontSize:11}}/>
                    <YAxis tick={{fill:"#94a3b8",fontSize:11}}/>
                    <Tooltip contentStyle={tt}/>
                    {stackedView && selectedEvent==="all" ? (
                      <>
                        <Legend wrapperStyle={{fontSize:11}}/>
                        {analytics.events.slice(0,8).map((ev,i)=>(
                          <Bar key={ev} dataKey={ev} stackId="a" fill={COLORS[i%COLORS.length]}/>
                        ))}
                      </>
                    ) : (
                      <>
                        <Legend wrapperStyle={{fontSize:11}}/>
                        <Bar dataKey="count" name="Registrazioni" fill="#8b5cf6" radius={[4,4,0,0]}/>
                        <Bar dataKey="partecipato" name="Partecipato" fill="#06b6d4" radius={[4,4,0,0]}/>
                      </>
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <ResizeHandle sectionKey="dowData" label="Altezza"/>
            </div>

            <div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                <h3 style={{fontSize:11,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.05em",margin:0}}>Quando si registrano (giorni prima dell'evento)</h3>
              </div>
              <div style={{background:"#1e293b",borderRadius:12,padding:16,border:"1px solid #334155"}}>
                <ResponsiveContainer width="100%" height={graphHeights.daysBeforeData}>
                  <AreaChart data={stackedView && selectedEvent==="all" ? analytics.daysBeforeDataByEvent : analytics.daysBeforeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155"/>
                    <XAxis dataKey="days" tick={{fill:"#94a3b8",fontSize:9}} interval={1} angle={-20} textAnchor="end" height={45}/>
                    <YAxis tick={{fill:"#94a3b8",fontSize:11}}/>
                    <Tooltip contentStyle={tt}/>
                    {stackedView && selectedEvent==="all" ? (
                      <>
                        <Legend wrapperStyle={{fontSize:11}}/>
                        {analytics.events.slice(0,8).map((ev,i)=>(
                          <Area key={ev} type="monotone" dataKey={ev} stackId="1" fill={COLORS[i%COLORS.length]} fillOpacity={0.6} stroke={COLORS[i%COLORS.length]} strokeWidth={2}/>
                        ))}
                      </>
                    ) : (
                      <Area type="monotone" dataKey="count" fill="#8b5cf6" fillOpacity={0.25} stroke="#8b5cf6" strokeWidth={2} name="Registrazioni"/>
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <ResizeHandle sectionKey="daysBeforeData" label="Altezza"/>
            </div>
          </div>
        )}

        {/* ═══ HEATMAP ═══ */}
        {activeTab==="heatmap" && (
          <div>
            <Section title="Heatmap registrazioni — Giorno della settimana × Ora">
              <Heatmap data={analytics.filtered}/>
            </Section>
            <p style={{fontSize:11,color:"#475569",marginTop:8}}>Passa il mouse sulle celle per i dettagli</p>
          </div>
        )}

        {/* ═══ FASCE ORARIE ═══ */}
        {activeTab==="fasce" && (
          <div style={{display:"flex",flexDirection:"column",gap:24}}>
            <div>
              <h3 style={{fontSize:11,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:10,fontWeight:500}}>Legenda Fasce Orarie</h3>
              <div style={{background:"#1e293b",borderRadius:12,padding:16,border:"1px solid #334155",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
                <div><span style={{color:"#a78bfa",fontWeight:600}}>Notte:</span> <span style={{color:"#94a3b8"}}>00:00 - 06:00</span></div>
                <div><span style={{color:"#a78bfa",fontWeight:600}}>Mattina:</span> <span style={{color:"#94a3b8"}}>06:00 - 12:00</span></div>
                <div><span style={{color:"#a78bfa",fontWeight:600}}>Pomeriggio:</span> <span style={{color:"#94a3b8"}}>12:00 - 18:00</span></div>
                <div><span style={{color:"#a78bfa",fontWeight:600}}>Sera:</span> <span style={{color:"#94a3b8"}}>18:00 - 24:00</span></div>
              </div>
            </div>

            <Section title="Registrazioni per fascia oraria">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={analytics.fasciaData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155"/>
                  <XAxis dataKey="fascia" tick={{fill:"#94a3b8",fontSize:11}}/>
                  <YAxis tick={{fill:"#94a3b8",fontSize:11}}/>
                  <Tooltip contentStyle={tt}/>
                  <Legend wrapperStyle={{fontSize:11}}/>
                  <Bar dataKey="count" name="Registrazioni" fill="#8b5cf6" radius={[4,4,0,0]}/>
                  <Bar dataKey="partecipato" name="Partecipato" fill="#10b981" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </Section>

            <Section title="Tasso di conversione per fascia oraria">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={analytics.convByFascia}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155"/>
                  <XAxis dataKey="fascia" tick={{fill:"#94a3b8",fontSize:11}}/>
                  <YAxis tick={{fill:"#94a3b8",fontSize:11}} unit="%" domain={[0,100]}/>
                  <Tooltip contentStyle={tt} formatter={v=>typeof v==="number"?`${v}%`:v}/>
                  <Bar dataKey="conversione" name="Conversione %" fill="#f59e0b" radius={[4,4,0,0]}>
                    {analytics.convByFascia.map((e,i)=>(
                      <Cell key={i} fill={e.conversione>=65?"#10b981":e.conversione>=45?"#f59e0b":"#ef4444"}/>
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p style={{fontSize:11,color:"#64748b",marginTop:8}}>
                Chi si registra di notte (durante l'evento) ha più probabilità di partecipare
              </p>
            </Section>

            {/* Distribution pie */}
            <div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                <h3 style={{fontSize:11,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.05em",margin:0}}>Distribuzione registrazioni per fascia</h3>
                {selectedEvent==="all" && (
                  <button onClick={()=>setFasciaStackedView(!fasciaStackedView)} style={{padding:"6px 12px",borderRadius:6,fontSize:11,border:"1px solid #475569",background:fasciaStackedView?"rgba(16,185,129,0.1)":"transparent",color:fasciaStackedView?"#10b981":"#94a3b8",cursor:"pointer"}}>
                    {fasciaStackedView ? "✓ Suddividi per evento" : "Suddividi per evento"}
                  </button>
                )}
              </div>
              {!fasciaStackedView || selectedEvent !== "all" ? (
                <div style={{background:"#1e293b",borderRadius:12,padding:16,border:"1px solid #334155"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={analytics.fasciaData.filter(d=>d.count>0)} dataKey="count" nameKey="fascia" cx="50%" cy="50%"
                          innerRadius={55} outerRadius={95} paddingAngle={3} label={({fascia,percent})=>`${fascia} ${(percent*100).toFixed(0)}%`}
                          style={{fontSize:11}}
                        >
                          {analytics.fasciaData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                        </Pie>
                        <Tooltip contentStyle={tt}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fit,minmax(300px,1fr))`,gap:16}}>
                  {analytics.events.slice(0,8).map((ev,i)=>{
                    const eventData = analytics.fasciaDataByEvent[ev];
                    return (
                      <div key={ev} style={{background:"#1e293b",borderRadius:12,padding:16,border:"1px solid #334155"}}>
                        <p style={{fontSize:11,color:"#94a3b8",textAlign:"center",marginBottom:12,fontWeight:500}}>{ev}</p>
                        <ResponsiveContainer width="100%" height={180}>
                          <PieChart>
                            <Pie data={eventData} dataKey="count" nameKey="fascia" cx="50%" cy="50%"
                              innerRadius={35} outerRadius={65} paddingAngle={2} label={({fascia,percent})=>`${(percent*100).toFixed(0)}%`}
                              style={{fontSize:10}}
                            >
                              {eventData.map((_,j)=><Cell key={j} fill={COLORS[j%COLORS.length]}/>)}
                            </Pie>
                            <Tooltip contentStyle={tt}/>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ TRENDS ═══ */}
        {activeTab==="trends" && (
          <div style={{display:"flex",flexDirection:"column",gap:24}}>
            <Section title="Registrazioni giornaliere nel tempo">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155"/>
                  <XAxis dataKey="date" tick={{fill:"#94a3b8",fontSize:9}} angle={-30} textAnchor="end" height={55}/>
                  <YAxis tick={{fill:"#94a3b8",fontSize:11}}/>
                  <Tooltip contentStyle={tt}/>
                  <Legend wrapperStyle={{fontSize:11}}/>
                  <Bar dataKey="total" name="Registrazioni" fill="#8b5cf6" radius={[4,4,0,0]}/>
                  <Bar dataKey="partecipato" name="Partecipato" fill="#06b6d4" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </Section>

            {multiEvent && (
              <Section title="Registrazioni per evento nel tempo">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.trendMulti}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155"/>
                    <XAxis dataKey="date" tick={{fill:"#94a3b8",fontSize:9}} angle={-30} textAnchor="end" height={55}/>
                    <YAxis tick={{fill:"#94a3b8",fontSize:11}}/>
                    <Tooltip contentStyle={tt}/>
                    <Legend wrapperStyle={{fontSize:11}}/>
                    {analytics.events.slice(0,8).map((ev,i)=>(
                      <Bar key={ev} dataKey={ev} stackId="a" fill={COLORS[i%COLORS.length]}/>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </Section>
            )}
          </div>
        )}

        {/* ═══ CONFRONTO EDIZIONI ═══ */}
        {activeTab==="confronto-edizioni" && hasMultipleEditions && editionAnalytics && (
          <div style={{display:"flex",flexDirection:"column",gap:24}}>
            {/* KPI Confronto Rapido */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12}}>
              <KPI icon={Users} label="Media Registrazioni" value={editionAnalytics.avgReg} color="#8b5cf6"/>
              <KPI icon={TrendingUp} label="Migliore Conversione" value={`${editionAnalytics.bestConvEdition.conversion}%`} sub={editionAnalytics.bestConvEdition.date} color="#10b981"/>
              <KPI icon={Calendar} label="Picco Registrazioni" value={editionAnalytics.maxRegEdition.registrations} sub={editionAnalytics.maxRegEdition.date} color="#f59e0b"/>
              <KPI icon={TrendingUp} label="Crescita" value={`${editionAnalytics.growthPercent}%`} sub={`da 1ª a ultima edizione`} color="#ec4899"/>
            </div>

            {/* Tabella Side-by-Side */}
            <Section title="Confronto Edizioni Side-by-Side">
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead>
                    <tr style={{borderBottom:"1px solid #334155"}}>
                      <th style={{textAlign:"left",padding:"10px 12px",color:"#94a3b8",fontWeight:500}}>Data</th>
                      <th style={{textAlign:"right",padding:"10px 12px",color:"#94a3b8",fontWeight:500}}>Registrazioni</th>
                      <th style={{textAlign:"right",padding:"10px 12px",color:"#94a3b8",fontWeight:500}}>Partecipati</th>
                      <th style={{textAlign:"right",padding:"10px 12px",color:"#94a3b8",fontWeight:500}}>Conversione</th>
                      <th style={{textAlign:"right",padding:"10px 12px",color:"#94a3b8",fontWeight:500}}>Δ Reg</th>
                      <th style={{textAlign:"right",padding:"10px 12px",color:"#94a3b8",fontWeight:500}}>Δ Conv</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editionAnalytics.editionStats.map((ed,i)=>{
                      const prevReg = i>0?editionAnalytics.editionStats[i-1].registrations:null;
                      const prevConv = i>0?parseFloat(editionAnalytics.editionStats[i-1].conversion):null;
                      const deltaReg = prevReg ? (((ed.registrations-prevReg)/prevReg)*100).toFixed(1) : "—";
                      const deltaConv = prevConv ? (parseFloat(ed.conversion)-prevConv).toFixed(1) : "—";
                      return(
                        <tr key={i} style={{borderBottom:"1px solid rgba(51,65,85,0.5)"}}>
                          <td style={{padding:"10px 12px",color:"#f1f5f9"}}>{ed.date}</td>
                          <td style={{padding:"10px 12px",textAlign:"right",color:"#c4b5fd"}}>{ed.registrations.toLocaleString("it")}</td>
                          <td style={{padding:"10px 12px",textAlign:"right",color:"#67e8f9"}}>{ed.entries.toLocaleString("it")}</td>
                          <td style={{padding:"10px 12px",textAlign:"right"}}>
                            <span style={{padding:"2px 8px",borderRadius:6,fontSize:12,fontWeight:500,
                              background:parseFloat(ed.conversion)>=65?"rgba(16,185,129,0.15)":parseFloat(ed.conversion)>=45?"rgba(245,158,11,0.15)":"rgba(239,68,68,0.15)",
                              color:parseFloat(ed.conversion)>=65?"#6ee7b7":parseFloat(ed.conversion)>=45?"#fcd34d":"#fca5a5"
                            }}>{ed.conversion}%</span>
                          </td>
                          <td style={{padding:"10px 12px",textAlign:"right",color:deltaReg==="—"?"#94a3b8":deltaReg>0?"#6ee7b7":"#fca5a5"}}>{deltaReg==="—"?"—":`${deltaReg>0?"+":""}${deltaReg}%`}</td>
                          <td style={{padding:"10px 12px",textAlign:"right",color:deltaConv==="—"?"#94a3b8":deltaConv>0?"#6ee7b7":"#fca5a5"}}>{deltaConv==="—"?"—":`${deltaConv>0?"+":""}${deltaConv}pp`}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Section>

            {/* Timeline Trend Comparato */}
            <Section title="Timeline Trend — Giorni Prima Evento">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={editionAnalytics.trendByDaysBeforeEdition}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155"/>
                  <XAxis dataKey="days" tick={{fill:"#94a3b8",fontSize:9}} interval={2}/>
                  <YAxis tick={{fill:"#94a3b8",fontSize:11}}/>
                  <Tooltip contentStyle={tt}/>
                  <Legend wrapperStyle={{fontSize:11}}/>
                  {editionAnalytics.editions.map((ed,i)=>(
                    <Area key={ed.date} type="monotone" dataKey={ed.date} fill={COLORS[i%COLORS.length]} fillOpacity={0.2} stroke={COLORS[i%COLORS.length]} strokeWidth={2} name={ed.date}/>
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </Section>

            {/* Fasce Orarie Comparate */}
            <Section title="Registrazioni per Fascia Oraria — Confronto Edizioni">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={editionAnalytics.fasciaDataMerged}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155"/>
                  <XAxis dataKey="fascia" tick={{fill:"#94a3b8",fontSize:11}}/>
                  <YAxis tick={{fill:"#94a3b8",fontSize:11}}/>
                  <Tooltip contentStyle={tt}/>
                  <Legend wrapperStyle={{fontSize:11}}/>
                  {editionAnalytics.editions.map((ed,i)=>(
                    <Bar key={ed.date} dataKey={ed.date} fill={COLORS[i%COLORS.length]} radius={[4,4,0,0]} name={ed.date}/>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Section>

            {/* Filtro Edizione */}
            {editionAnalytics.editions.length > 0 && (
              <Section title="Visualizza Singola Edizione">
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <button
                    onClick={()=>setSelectedEdition("all")}
                    style={{padding:"6px 12px",borderRadius:6,fontSize:12,border:selectedEdition==="all"?"2px solid #a78bfa":"1px solid #475569",background:selectedEdition==="all"?"rgba(167,139,250,0.1)":"transparent",color:selectedEdition==="all"?"#a78bfa":"#94a3b8",cursor:"pointer"}}
                  >
                    Confronta Tutte
                  </button>
                  {editionAnalytics.editions.map((ed,i)=>(
                    <button
                      key={ed.date}
                      onClick={()=>setSelectedEdition(ed.date)}
                      style={{padding:"6px 12px",borderRadius:6,fontSize:12,border:selectedEdition===ed.date?"2px solid #a78bfa":"1px solid #475569",background:selectedEdition===ed.date?"rgba(167,139,250,0.1)":"transparent",color:selectedEdition===ed.date?"#a78bfa":"#94a3b8",cursor:"pointer"}}
                    >
                      {ed.date}
                    </button>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}

        {/* ═══ CONFRONTO ═══ */}
        {activeTab==="confronto" && multiEvent && (
          <div style={{display:"flex",flexDirection:"column",gap:24}}>
            <Section title="Registrazioni vs Presenze per evento">
              <ResponsiveContainer width="100%" height={Math.max(200,analytics.eventStats.length*55)}>
                <BarChart data={analytics.eventStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155"/>
                  <XAxis type="number" tick={{fill:"#94a3b8",fontSize:11}}/>
                  <YAxis type="category" dataKey="event" tick={{fill:"#94a3b8",fontSize:10}} width={170}/>
                  <Tooltip contentStyle={tt}/>
                  <Legend wrapperStyle={{fontSize:11}}/>
                  <Bar dataKey="registrations" name="Registrazioni" fill="#8b5cf6" radius={[0,4,4,0]}/>
                  <Bar dataKey="entries" name="Presenze" fill="#06b6d4" radius={[0,4,4,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </Section>

            <Section title="Trend Registrazioni — Andamento per Evento">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.trendMulti}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155"/>
                  <XAxis dataKey="date" tick={{fill:"#94a3b8",fontSize:9}} angle={-30} textAnchor="end" height={55}/>
                  <YAxis tick={{fill:"#94a3b8",fontSize:11}}/>
                  <Tooltip contentStyle={tt}/>
                  <Legend wrapperStyle={{fontSize:11}}/>
                  {analytics.events.slice(0,8).map((ev,i)=>(
                    <Line key={ev} type="monotone" dataKey={ev} stroke={COLORS[i%COLORS.length]} strokeWidth={2} dot={{r:3}} name={ev}/>
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Section>

            <Section title="Tasso di conversione per evento">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics.eventStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155"/>
                  <XAxis dataKey="event" tick={{fill:"#94a3b8",fontSize:9}} angle={-12} textAnchor="end" height={50}/>
                  <YAxis tick={{fill:"#94a3b8",fontSize:11}} unit="%" domain={[0,100]}/>
                  <Tooltip contentStyle={tt} formatter={v=>`${v}%`}/>
                  <Bar dataKey="conversion" name="Conversione" radius={[4,4,0,0]}>
                    {analytics.eventStats.map((e,i)=><Cell key={i} fill={parseFloat(e.conversion)>=65?"#10b981":parseFloat(e.conversion)>=45?"#f59e0b":"#ef4444"}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Section>

            {/* Table */}
            <Section title="Dettaglio eventi">
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead>
                    <tr style={{borderBottom:"1px solid #334155"}}>
                      <th style={{textAlign:"left",padding:"10px 12px",color:"#94a3b8",fontWeight:500}}>Evento</th>
                      <th style={{textAlign:"right",padding:"10px 12px",color:"#94a3b8",fontWeight:500}}>Registrazioni</th>
                      <th style={{textAlign:"right",padding:"10px 12px",color:"#94a3b8",fontWeight:500}}>Presenze</th>
                      <th style={{textAlign:"right",padding:"10px 12px",color:"#94a3b8",fontWeight:500}}>Conversione</th>
                      <th style={{textAlign:"right",padding:"10px 12px",color:"#94a3b8",fontWeight:500}}>Engagement Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.eventStats.map((ev,i)=>(
                      <tr key={i} style={{borderBottom:"1px solid rgba(51,65,85,0.5)"}}>
                        <td style={{padding:"10px 12px",color:"#f1f5f9"}}>{ev.event}</td>
                        <td style={{padding:"10px 12px",textAlign:"right",color:"#c4b5fd"}}>{ev.registrations.toLocaleString("it")}</td>
                        <td style={{padding:"10px 12px",textAlign:"right",color:"#67e8f9"}}>{ev.entries.toLocaleString("it")}</td>
                        <td style={{padding:"10px 12px",textAlign:"right"}}>
                          <span style={{padding:"2px 8px",borderRadius:6,fontSize:12,fontWeight:500,
                            background:parseFloat(ev.conversion)>=65?"rgba(16,185,129,0.15)":parseFloat(ev.conversion)>=45?"rgba(245,158,11,0.15)":"rgba(239,68,68,0.15)",
                            color:parseFloat(ev.conversion)>=65?"#6ee7b7":parseFloat(ev.conversion)>=45?"#fcd34d":"#fca5a5"
                          }}>{ev.conversion}%</span>
                        </td>
                        <td style={{padding:"10px 12px",textAlign:"right"}}>
                          <span style={{padding:"2px 8px",borderRadius:6,fontSize:12,fontWeight:500,
                            background:parseFloat(ev.conversion)>=70?"rgba(16,185,129,0.15)":parseFloat(ev.conversion)>=50?"rgba(245,158,11,0.15)":"rgba(239,68,68,0.15)",
                            color:parseFloat(ev.conversion)>=70?"#6ee7b7":parseFloat(ev.conversion)>=50?"#fcd34d":"#fca5a5"
                          }}>{ev.conversion}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          </div>
        )}

        {/* ═══ UTENTI ═══ */}
        {activeTab==="utenti" && (
          <div style={{display:"flex",flexDirection:"column",gap:24}}>
            {/* Segmentazione Widget */}
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {[
                {key:"all",label:`All Users (${analytics.userStats?.length || 0})`,count:analytics.userStats?.length || 0},
                {key:"vip",label:"👑 VIP",count:analytics.userStats?.filter(u=>u.segment==="vip").length || 0},
                {key:"fedeli",label:"🔄 Fedeli",count:analytics.userStats?.filter(u=>u.segment==="fedeli").length || 0},
                {key:"occasionali",label:"🎯 Occasionali",count:analytics.userStats?.filter(u=>u.segment==="occasionali").length || 0},
                {key:"ghost",label:"👻 Ghost",count:analytics.userStats?.filter(u=>u.segment==="ghost").length || 0},
              ].map(seg => (
                <button
                  key={seg.key}
                  onClick={()=>setUserSegmentFilter(seg.key)}
                  style={{
                    padding:"8px 12px",borderRadius:8,fontSize:12,fontWeight:500,
                    border:userSegmentFilter===seg.key?"2px solid #a78bfa":"1px solid #475569",
                    background:userSegmentFilter===seg.key?"rgba(167,139,250,0.1)":"transparent",
                    color:userSegmentFilter===seg.key?"#a78bfa":"#94a3b8",
                    cursor:"pointer"
                  }}
                >
                  {seg.label} ({seg.count})
                </button>
              ))}
            </div>

            {/* Filtri */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
              <input
                type="text"
                placeholder="Cerca nome..."
                value={usersSearchTerm}
                onChange={(e)=>setUsersSearchTerm(e.target.value)}
                style={{
                  padding:"8px 12px",borderRadius:8,fontSize:12,
                  background:"#1e293b",border:"1px solid #334155",
                  color:"#f1f5f9",
                }}
              />
              <div>
                <label style={{fontSize:11,color:"#94a3b8",display:"block",marginBottom:4}}>Conversione minima: {userConversionMinFilter}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={userConversionMinFilter}
                  onChange={(e)=>setUserConversionMinFilter(parseInt(e.target.value))}
                  style={{width:"100%"}}
                />
              </div>
              <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#94a3b8",cursor:"pointer"}}>
                <input
                  type="checkbox"
                  checked={userParticipantsOnly}
                  onChange={(e)=>setUserParticipantsOnly(e.target.checked)}
                  style={{cursor:"pointer"}}
                />
                Solo partecipanti
              </label>
            </div>

            {/* Tabella Utenti */}
            <Section title="Lista Utenti">
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr style={{borderBottom:"2px solid #334155"}}>
                      <th style={{textAlign:"left",padding:"10px 12px",color:"#94a3b8",fontWeight:600}}>Nome</th>
                      <th style={{textAlign:"right",padding:"10px 12px",color:"#94a3b8",fontWeight:600}}>Registrazioni</th>
                      <th style={{textAlign:"right",padding:"10px 12px",color:"#94a3b8",fontWeight:600}}>Partecipazioni</th>
                      <th style={{textAlign:"right",padding:"10px 12px",color:"#94a3b8",fontWeight:600}}>Conversione %</th>
                      <th style={{textAlign:"left",padding:"10px 12px",color:"#94a3b8",fontWeight:600}}>Tipo</th>
                      <th style={{textAlign:"left",padding:"10px 12px",color:"#94a3b8",fontWeight:600}}>Ultima Registrazione</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.userStats
                      ?.filter(u => {
                        const matchName = u.name.toLowerCase().includes(usersSearchTerm.toLowerCase());
                        const matchSeg = userSegmentFilter==="all" || u.segment===userSegmentFilter;
                        const matchConv = parseFloat(u.conversion) >= userConversionMinFilter;
                        const matchPart = !userParticipantsOnly || u.totalParticipated > 0;
                        return matchName && matchSeg && matchConv && matchPart;
                      })
                      ?.map((user,i)=>(
                        <tr
                          key={i}
                          onClick={()=>setSelectedUserDetail(user)}
                          style={{
                            borderBottom:"1px solid rgba(51,65,85,0.5)",
                            cursor:"pointer",
                            background:selectedUserDetail?.name===user.name?"rgba(167,139,250,0.1)":"transparent",
                            transition:"background 0.2s"
                          }}
                          onMouseEnter={(e)=>e.currentTarget.style.background="rgba(167,139,250,0.05)"}
                          onMouseLeave={(e)=>e.currentTarget.style.background=selectedUserDetail?.name===user.name?"rgba(167,139,250,0.1)":"transparent"}
                        >
                          <td style={{padding:"10px 12px",color:"#f1f5f9"}}>{user.name}</td>
                          <td style={{padding:"10px 12px",textAlign:"right",color:"#c4b5fd"}}>{user.totalRegs}</td>
                          <td style={{padding:"10px 12px",textAlign:"right",color:"#67e8f9"}}>{user.totalParticipated}</td>
                          <td style={{padding:"10px 12px",textAlign:"right",color:"#6ee7b7"}}>{user.conversion}%</td>
                          <td style={{padding:"10px 12px",color:"#94a3b8"}}>{
                            user.segment==="vip"?"👑 VIP":
                            user.segment==="fedeli"?"🔄 Fedeli":
                            user.segment==="ghost"?"👻 Ghost":
                            "🎯 Occasionale"
                          }</td>
                          <td style={{padding:"10px 12px",color:"#94a3b8",fontSize:11}}>{user.lastReg?.toLocaleDateString("it") || "—"}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Section>

            {/* Modal Dettagli Utente */}
            {selectedUserDetail && (
              <div style={{
                position:"fixed",top:0,left:0,right:0,bottom:0,
                background:"rgba(0,0,0,0.5)",
                display:"flex",alignItems:"center",justifyContent:"center",
                zIndex:1000
              }} onClick={()=>setSelectedUserDetail(null)}>
                <div style={{
                  background:"#0f172a",
                  border:"1px solid #334155",
                  borderRadius:12,
                  padding:24,
                  maxWidth:600,
                  width:"90%",
                  maxHeight:"80vh",
                  overflowY:"auto",
                  boxShadow:"0 20px 25px rgba(0,0,0,0.5)"
                }} onClick={(e)=>e.stopPropagation()}>
                  {/* Header */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                    <div>
                      <h2 style={{margin:0,color:"#f1f5f9",fontSize:18}}>{selectedUserDetail.name}</h2>
                      <span style={{
                        display:"inline-block",marginTop:8,padding:"4px 10px",borderRadius:6,fontSize:11,fontWeight:600,
                        background:selectedUserDetail.segment==="vip"?"rgba(251,191,36,0.15)":
                                   selectedUserDetail.segment==="fedeli"?"rgba(16,185,129,0.15)":
                                   selectedUserDetail.segment==="ghost"?"rgba(239,68,68,0.15)":
                                   "rgba(6,182,212,0.15)",
                        color:selectedUserDetail.segment==="vip"?"#fcd34d":
                              selectedUserDetail.segment==="fedeli"?"#6ee7b7":
                              selectedUserDetail.segment==="ghost"?"#fca5a5":
                              "#22d3ee"
                      }}>
                        {selectedUserDetail.segment==="vip"?"👑 VIP":
                         selectedUserDetail.segment==="fedeli"?"🔄 Fedeli":
                         selectedUserDetail.segment==="ghost"?"👻 Ghost":
                         "🎯 Occasionale"}
                      </span>
                    </div>
                    <button onClick={()=>setSelectedUserDetail(null)} style={{background:"none",border:"none",color:"#94a3b8",fontSize:24,cursor:"pointer"}}>✕</button>
                  </div>

                  {/* Stats */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
                    <div style={{background:"#1e293b",padding:12,borderRadius:8}}>
                      <p style={{margin:"0 0 6px 0",fontSize:11,color:"#94a3b8",textTransform:"uppercase"}}>Registrazioni</p>
                      <p style={{margin:0,fontSize:20,fontWeight:600,color:"#c4b5fd"}}>{selectedUserDetail.totalRegs}</p>
                    </div>
                    <div style={{background:"#1e293b",padding:12,borderRadius:8}}>
                      <p style={{margin:"0 0 6px 0",fontSize:11,color:"#94a3b8",textTransform:"uppercase"}}>Partecipazioni</p>
                      <p style={{margin:0,fontSize:20,fontWeight:600,color:"#67e8f9"}}>{selectedUserDetail.totalParticipated}</p>
                    </div>
                    <div style={{background:"#1e293b",padding:12,borderRadius:8}}>
                      <p style={{margin:"0 0 6px 0",fontSize:11,color:"#94a3b8",textTransform:"uppercase"}}>Conversione</p>
                      <p style={{margin:0,fontSize:20,fontWeight:600,color:"#6ee7b7"}}>{selectedUserDetail.conversion}%</p>
                    </div>
                    <div style={{background:"#1e293b",padding:12,borderRadius:8}}>
                      <p style={{margin:"0 0 6px 0",fontSize:11,color:"#94a3b8",textTransform:"uppercase"}}>Eventi</p>
                      <p style={{margin:0,fontSize:20,fontWeight:600,color:"#f1f5f9"}}>{selectedUserDetail.eventCount}</p>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div>
                    <h3 style={{margin:"0 0 12px 0",fontSize:13,color:"#94a3b8",textTransform:"uppercase"}}>Timeline Eventi</h3>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {selectedUserDetail.events.map((ev,i)=>(
                        <div key={i} style={{background:"#1e293b",padding:12,borderRadius:8,borderLeft:"3px solid #a78bfa"}}>
                          <p style={{margin:"0 0 4px 0",fontSize:12,fontWeight:600,color:"#f1f5f9"}}>{ev.event}</p>
                          <p style={{margin:0,fontSize:11,color:"#94a3b8"}}>{ev.count} iscrizione{ev.count>1?"i":""} • {ev.participated} partecipazione{ev.participated!==1?"i":""}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}