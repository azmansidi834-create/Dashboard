import { useState, useEffect, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

// ── Fonts ──────────────────────────────────────────────────────
const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Sora', sans-serif; background: #080c10; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #1e2a38; border-radius: 4px; }
  .tab-btn { transition: all 0.25s cubic-bezier(.4,0,.2,1); }
  .tab-btn:hover { background: #1a2535 !important; }
  .card { transition: transform 0.2s, box-shadow 0.2s; }
  .card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.4) !important; }
  .input-field { background: #0d1520; border: 1px solid #1e2d3d; color: #e2e8f0; border-radius: 8px; padding: 10px 14px; font-family: 'Sora', sans-serif; font-size: 13px; outline: none; width: 100%; transition: border-color 0.2s; }
  .input-field:focus { border-color: #c9a84c; }
  .btn-primary { background: linear-gradient(135deg, #c9a84c, #e8c96d); color: #080c10; border: none; border-radius: 8px; padding: 10px 20px; font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
  .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(201,168,76,0.4); }
  .btn-secondary { background: transparent; color: #94a3b8; border: 1px solid #1e2d3d; border-radius: 8px; padding: 8px 16px; font-family: 'Sora', sans-serif; font-size: 12px; cursor: pointer; transition: all 0.2s; }
  .btn-secondary:hover { border-color: #c9a84c; color: #c9a84c; }
  .ai-thinking { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #c9a84c; animation: pulse 1s infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.8); } }
  .fade-in { animation: fadeIn 0.4s ease; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .tag { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .divider { height: 1px; background: linear-gradient(90deg, transparent, #1e2d3d, transparent); margin: 16px 0; }
`;
const styleEl = document.createElement("style");
styleEl.textContent = css;
document.head.appendChild(styleEl);

// ── Helpers ────────────────────────────────────────────────────
const fmt = (v) => `Rp ${Number(v).toLocaleString("id-ID")}`;
const fmtShort = (v) => v >= 1e9 ? `${(v/1e9).toFixed(1)}M` : v >= 1e6 ? `${(v/1e6).toFixed(1)}jt` : `${(v/1e3).toFixed(0)}rb`;
const today = () => new Date().toISOString().slice(0, 10);
const GOLD_KEY = "findb:gold";
const IHSG_KEY = "findb:ihsg";
const PORT_KEY = "findb:portfolio";

// ── AI Advisor ─────────────────────────────────────────────────
async function getAIAdvice(portfolio, goldData, ihsgData) {
  const lastGold = goldData.slice(-3);
  const lastIHSG = ihsgData.slice(-3);
  const totalAsset = portfolio.reduce((s, a) => s + Number(a.value), 0);

  const prompt = `Kamu adalah penasihat keuangan pribadi yang cerdas dan berpengalaman di pasar Indonesia.

DATA PORTOFOLIO SAAT INI:
${portfolio.map(a => `- ${a.name}: ${fmt(a.value)}`).join('\n')}
Total Aset: ${fmt(totalAsset)}

DATA HARGA EMAS TERBARU (Rp/gram):
${lastGold.length ? lastGold.map(d => `- ${d.date}: Rp ${Number(d.price).toLocaleString('id-ID')}`).join('\n') : '- Belum ada data'}

DATA IHSG TERBARU:
${lastIHSG.length ? lastIHSG.map(d => `- ${d.date}: ${Number(d.value).toLocaleString('id-ID')}`).join('\n') : '- Belum ada data'}

Berikan ANALISIS SINGKAT & TAJAM dalam format berikut (gunakan bahasa Indonesia yang natural dan profesional, BUKAN list poin yang panjang):

1. KONDISI PASAR (1-2 kalimat tentang tren emas & IHSG)
2. EVALUASI PORTOFOLIO (1-2 kalimat kekuatan/kelemahan)
3. REKOMENDASI AKSI (2-3 aksi konkret yang spesifik dengan nominal)
4. PERINGATAN RISIKO (jika ada)

Gunakan format teks biasa, singkat, dan berikan insight yang genuinely berguna. Jangan berlebihan.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await res.json();
  return data.content?.[0]?.text || "Gagal mendapatkan analisis.";
}

// ── Sparkline ─────────────────────────────────────────────────
function Sparkline({ data, color }) {
  if (!data || data.length < 2) return <div style={{ fontSize: 11, color: "#3d4f63" }}>Belum ada data</div>;
  return (
    <ResponsiveContainer width="100%" height={48}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="val" stroke={color} strokeWidth={1.5} fill={`url(#sg-${color.replace('#','')})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Main App ───────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [portfolio, setPortfolio] = useState([
    { id: 1, name: "Tabungan", value: 4500000, color: "#4e9af1", icon: "◈" },
    { id: 2, name: "Tabungan Emas", value: 1000000, color: "#c9a84c", icon: "◆" },
    { id: 3, name: "Dana Dingin", value: 2200000, color: "#3ecf8e", icon: "◉" },
  ]);
  const [goldHistory, setGoldHistory] = useState([]);
  const [ihsgHistory, setIhsgHistory] = useState([]);
  const [goldInput, setGoldInput] = useState({ date: today(), price: "" });
  const [ihsgInput, setIhsgInput] = useState({ date: today(), value: "" });
  const [aiAdvice, setAiAdvice] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [newAsset, setNewAsset] = useState({ name: "", value: "" });
  const [editId, setEditId] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [storageReady, setStorageReady] = useState(false);

  // Load from storage
  useEffect(() => {
    async function load() {
      try {
        const g = await window.storage.get(GOLD_KEY);
        if (g) setGoldHistory(JSON.parse(g.value));
      } catch {}
      try {
        const i = await window.storage.get(IHSG_KEY);
        if (i) setIhsgHistory(JSON.parse(i.value));
      } catch {}
      try {
        const p = await window.storage.get(PORT_KEY);
        if (p) setPortfolio(JSON.parse(p.value));
      } catch {}
      setStorageReady(true);
    }
    load();
  }, []);

  // Save portfolio
  useEffect(() => {
    if (!storageReady) return;
    window.storage.set(PORT_KEY, JSON.stringify(portfolio)).catch(() => {});
  }, [portfolio, storageReady]);

  const totalAsset = portfolio.reduce((s, a) => s + Number(a.value), 0);

  const addGold = async () => {
    if (!goldInput.price) return;
    const updated = [...goldHistory.filter(d => d.date !== goldInput.date), { date: goldInput.date, price: Number(goldInput.price) }].sort((a, b) => a.date.localeCompare(b.date));
    setGoldHistory(updated);
    await window.storage.set(GOLD_KEY, JSON.stringify(updated)).catch(() => {});
    setGoldInput({ date: today(), price: "" });
  };

  const addIHSG = async () => {
    if (!ihsgInput.value) return;
    const updated = [...ihsgHistory.filter(d => d.date !== ihsgInput.date), { date: ihsgInput.date, value: Number(ihsgInput.value) }].sort((a, b) => a.date.localeCompare(b.date));
    setIhsgHistory(updated);
    await window.storage.set(IHSG_KEY, JSON.stringify(updated)).catch(() => {});
    setIhsgInput({ date: today(), value: "" });
  };

  const fetchAdvice = async () => {
    setAiLoading(true);
    setAiAdvice("");
    try {
      const text = await getAIAdvice(portfolio, goldHistory, ihsgHistory);
      setAiAdvice(text);
    } catch (e) {
      setAiAdvice("Gagal terhubung ke AI. Coba lagi.");
    }
    setAiLoading(false);
  };

  const saveEdit = (id) => {
    setPortfolio(p => p.map(a => a.id === id ? { ...a, value: Number(editVal) } : a));
    setEditId(null);
  };

  const addAsset = () => {
    if (!newAsset.name || !newAsset.value) return;
    const colors = ["#f472b6", "#a78bfa", "#fb923c", "#34d399", "#60a5fa"];
    setPortfolio(p => [...p, { id: Date.now(), name: newAsset.name, value: Number(newAsset.value), color: colors[p.length % colors.length], icon: "◇" }]);
    setNewAsset({ name: "", value: "" });
  };

  const removeAsset = (id) => setPortfolio(p => p.filter(a => a.id !== id));

  const lastGold = goldHistory.at(-1);
  const prevGold = goldHistory.at(-2);
  const goldChange = lastGold && prevGold ? ((lastGold.price - prevGold.price) / prevGold.price * 100) : null;
  const lastIHSG = ihsgHistory.at(-1);
  const prevIHSG = ihsgHistory.at(-2);
  const ihsgChange = lastIHSG && prevIHSG ? ((lastIHSG.value - prevIHSG.value) / prevIHSG.value * 100) : null;

  const goldSparkData = goldHistory.slice(-14).map(d => ({ val: d.price, date: d.date }));
  const ihsgSparkData = ihsgHistory.slice(-14).map(d => ({ val: d.value, date: d.date }));

  const TABS = [
    { id: "dashboard", label: "Dashboard" },
    { id: "market", label: "Market Data" },
    { id: "portfolio", label: "Portofolio" },
    { id: "advisor", label: "AI Advisor" },
  ];

  return (
    <div style={{ fontFamily: "'Sora', sans-serif", background: "#080c10", minHeight: "100vh", color: "#e2e8f0" }}>
      {/* ── TOP BAR ── */}
      <div style={{ background: "#0a0f17", borderBottom: "1px solid #111d2b", padding: "0 24px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 28, height: 28, background: "linear-gradient(135deg, #c9a84c, #e8c96d)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>◆</div>
            <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.3px", color: "#f1f5f9" }}>fintrack</span>
            <span style={{ fontSize: 11, color: "#3d4f63", fontFamily: "'DM Mono', monospace" }}>v2.0</span>
          </div>
          <div style={{ display: "flex", gap: 2 }}>
            {TABS.map(t => (
              <button key={t.id} className="tab-btn" onClick={() => setTab(t.id)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: tab === t.id ? 600 : 400, background: tab === t.id ? "#111d2b" : "transparent", color: tab === t.id ? "#c9a84c" : "#64748b" }}>
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#3d4f63" }}>{new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</div>
        </div>
      </div>

      <div style={{ padding: "24px", maxWidth: 960, margin: "0 auto" }}>

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && (
          <div className="fade-in">
            {/* Total */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: "#3d4f63", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Total Aset</div>
              <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-1px", color: "#f1f5f9" }}>{fmt(totalAsset)}</div>
              <div style={{ fontSize: 12, color: "#3d4f63", marginTop: 4 }}>Diperbarui {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</div>
            </div>

            {/* Asset Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
              {portfolio.map(a => (
                <div key={a.id} className="card" style={{ background: "#0d1520", border: "1px solid #111d2b", borderRadius: 12, padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <span style={{ fontSize: 10, color: "#3d4f63", textTransform: "uppercase", letterSpacing: "0.08em" }}>{a.name}</span>
                    <span style={{ color: a.color, fontSize: 16 }}>{a.icon}</span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: "#f1f5f9", letterSpacing: "-0.5px" }}>{fmt(a.value)}</div>
                  <div style={{ marginTop: 8, height: 3, background: "#111d2b", borderRadius: 2 }}>
                    <div style={{ width: `${(a.value / totalAsset * 100)}%`, height: "100%", background: a.color, borderRadius: 2 }} />
                  </div>
                  <div style={{ fontSize: 10, color: "#3d4f63", marginTop: 6 }}>{(a.value / totalAsset * 100).toFixed(1)}%</div>
                </div>
              ))}
            </div>

            {/* Market Ticker */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Emas Antam", val: lastGold ? `Rp ${lastGold.price.toLocaleString("id-ID")}/gr` : "–", change: goldChange, spark: goldSparkData, color: "#c9a84c" },
                { label: "IHSG", val: lastIHSG ? lastIHSG.value.toLocaleString("id-ID") : "–", change: ihsgChange, spark: ihsgSparkData, color: "#4e9af1" },
              ].map(m => (
                <div key={m.label} className="card" style={{ background: "#0d1520", border: "1px solid #111d2b", borderRadius: 12, padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 10, color: "#3d4f63", textTransform: "uppercase", letterSpacing: "0.08em" }}>{m.label}</span>
                    {m.change !== null && (
                      <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: m.change >= 0 ? "#3ecf8e" : "#f87171", fontWeight: 500 }}>
                        {m.change >= 0 ? "▲" : "▼"} {Math.abs(m.change).toFixed(2)}%
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: "#f1f5f9", letterSpacing: "-0.5px", marginBottom: 8 }}>{m.val}</div>
                  <Sparkline data={m.spark} color={m.color} />
                </div>
              ))}
            </div>

            {/* Allocation */}
            <div style={{ background: "#0d1520", border: "1px solid #111d2b", borderRadius: 12, padding: "20px 24px" }}>
              <div style={{ fontSize: 11, color: "#3d4f63", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Alokasi Aset</div>
              <div style={{ display: "flex", height: 6, borderRadius: 6, overflow: "hidden", marginBottom: 16, gap: 1 }}>
                {portfolio.map(a => (
                  <div key={a.id} style={{ width: `${a.value / totalAsset * 100}%`, background: a.color, transition: "width 0.4s" }} />
                ))}
              </div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                {portfolio.map(a => (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: a.color }} />
                    <span style={{ fontSize: 12, color: "#64748b" }}>{a.name}</span>
                    <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: "#94a3b8" }}>{(a.value / totalAsset * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── MARKET DATA ── */}
        {tab === "market" && (
          <div className="fade-in">
            <div style={{ fontSize: 11, color: "#3d4f63", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 20 }}>Market Data Tracker</div>

            {/* Input panels */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
              {/* Gold Input */}
              <div style={{ background: "#0d1520", border: "1px solid #111d2b", borderRadius: 12, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <span style={{ color: "#c9a84c" }}>◆</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>Harga Emas</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input type="date" className="input-field" value={goldInput.date} onChange={e => setGoldInput(p => ({ ...p, date: e.target.value }))} />
                  <input type="number" className="input-field" placeholder="Harga per gram (Rp)" value={goldInput.price} onChange={e => setGoldInput(p => ({ ...p, price: e.target.value }))} />
                  <button className="btn-primary" onClick={addGold}>Simpan</button>
                </div>
              </div>
              {/* IHSG Input */}
              <div style={{ background: "#0d1520", border: "1px solid #111d2b", borderRadius: 12, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <span style={{ color: "#4e9af1" }}>◈</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>IHSG</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input type="date" className="input-field" value={ihsgInput.date} onChange={e => setIhsgInput(p => ({ ...p, date: e.target.value }))} />
                  <input type="number" className="input-field" placeholder="Nilai IHSG" value={ihsgInput.value} onChange={e => setIhsgInput(p => ({ ...p, value: e.target.value }))} />
                  <button className="btn-primary" onClick={addIHSG}>Simpan</button>
                </div>
              </div>
            </div>

            {/* Gold Chart */}
            {goldHistory.length >= 2 && (
              <div style={{ background: "#0d1520", border: "1px solid #111d2b", borderRadius: 12, padding: 20, marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: "#3d4f63", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Grafik Emas (Rp/gram)</div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={goldHistory}>
                    <defs>
                      <linearGradient id="gGold" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c9a84c" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#c9a84c" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#111d2b" />
                    <XAxis dataKey="date" stroke="#1e2d3d" tick={{ fontSize: 10, fill: "#3d4f63", fontFamily: "DM Mono" }} tickFormatter={d => d.slice(5)} />
                    <YAxis stroke="#1e2d3d" tick={{ fontSize: 10, fill: "#3d4f63", fontFamily: "DM Mono" }} tickFormatter={v => `${(v/1e6).toFixed(2)}M`} width={56} />
                    <Tooltip contentStyle={{ background: "#0d1520", border: "1px solid #1e2d3d", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#94a3b8" }} formatter={v => [fmt(v), "Harga"]} />
                    <Area type="monotone" dataKey="price" stroke="#c9a84c" strokeWidth={2} fill="url(#gGold)" dot={false} activeDot={{ r: 4, fill: "#c9a84c" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* IHSG Chart */}
            {ihsgHistory.length >= 2 && (
              <div style={{ background: "#0d1520", border: "1px solid #111d2b", borderRadius: 12, padding: 20, marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: "#3d4f63", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Grafik IHSG</div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={ihsgHistory}>
                    <defs>
                      <linearGradient id="gIHSG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4e9af1" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#4e9af1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#111d2b" />
                    <XAxis dataKey="date" stroke="#1e2d3d" tick={{ fontSize: 10, fill: "#3d4f63", fontFamily: "DM Mono" }} tickFormatter={d => d.slice(5)} />
                    <YAxis stroke="#1e2d3d" tick={{ fontSize: 10, fill: "#3d4f63", fontFamily: "DM Mono" }} width={56} />
                    <Tooltip contentStyle={{ background: "#0d1520", border: "1px solid #1e2d3d", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#94a3b8" }} formatter={v => [v.toLocaleString("id-ID"), "IHSG"]} />
                    <Area type="monotone" dataKey="value" stroke="#4e9af1" strokeWidth={2} fill="url(#gIHSG)" dot={false} activeDot={{ r: 4, fill: "#4e9af1" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* History Tables */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { title: "Riwayat Emas", data: goldHistory.slice(-10).reverse(), keyA: "price", fmt: v => fmt(v) },
                { title: "Riwayat IHSG", data: ihsgHistory.slice(-10).reverse(), keyA: "value", fmt: v => v.toLocaleString("id-ID") },
              ].map(t => (
                <div key={t.title} style={{ background: "#0d1520", border: "1px solid #111d2b", borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 11, color: "#3d4f63", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>{t.title}</div>
                  {t.data.length === 0 ? (
                    <div style={{ fontSize: 12, color: "#1e2d3d", textAlign: "center", padding: "20px 0" }}>Belum ada data</div>
                  ) : t.data.map((d, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < t.data.length - 1 ? "1px solid #0f1924" : "none" }}>
                      <span style={{ fontSize: 11, color: "#3d4f63", fontFamily: "'DM Mono', monospace" }}>{d.date}</span>
                      <span style={{ fontSize: 12, color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>{t.fmt(d[t.keyA])}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PORTFOLIO ── */}
        {tab === "portfolio" && (
          <div className="fade-in">
            <div style={{ fontSize: 11, color: "#3d4f63", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 20 }}>Manajemen Portofolio</div>

            {/* Summary */}
            <div style={{ background: "#0d1520", border: "1px solid #111d2b", borderRadius: 12, padding: "16px 24px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, color: "#3d4f63", marginBottom: 4 }}>Total Aset</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.5px" }}>{fmt(totalAsset)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#3d4f63", marginBottom: 4" }}>Jumlah Pos</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#c9a84c" }}>{portfolio.length}</div>
              </div>
            </div>

            {/* Asset List */}
            <div style={{ background: "#0d1520", border: "1px solid #111d2b", borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#3d4f63", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Daftar Aset</div>
              {portfolio.map((a, i) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < portfolio.length - 1 ? "1px solid #0f1924" : "none" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: a.color + "20", display: "flex", alignItems: "center", justifyContent: "center", color: a.color, fontSize: 14, flexShrink: 0 }}>{a.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#e2e8f0" }}>{a.name}</div>
                    <div style={{ fontSize: 11, color: "#3d4f63" }}>{(a.value / totalAsset * 100).toFixed(1)}% dari total</div>
                  </div>
                  {editId === a.id ? (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input className="input-field" type="number" value={editVal} onChange={e => setEditVal(e.target.value)} style={{ width: 140, padding: "6px 10px" }} />
                      <button className="btn-primary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => saveEdit(a.id)}>✓</button>
                      <button className="btn-secondary" style={{ padding: "6px 12px" }} onClick={() => setEditId(null)}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9", fontFamily: "'DM Mono', monospace" }}>{fmtShort(a.value)}</span>
                      <button className="btn-secondary" style={{ padding: "5px 10px" }} onClick={() => { setEditId(a.id); setEditVal(a.value); }}>Edit</button>
                      <button onClick={() => removeAsset(a.id)} style={{ background: "transparent", border: "none", color: "#3d4f63", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add New Asset */}
            <div style={{ background: "#0d1520", border: "1px dashed #1e2d3d", borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 11, color: "#3d4f63", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Tambah Aset Baru</div>
              <div style={{ display: "flex", gap: 10 }}>
                <input className="input-field" placeholder="Nama aset" value={newAsset.name} onChange={e => setNewAsset(p => ({ ...p, name: e.target.value }))} style={{ flex: 1 }} />
                <input className="input-field" type="number" placeholder="Nominal (Rp)" value={newAsset.value} onChange={e => setNewAsset(p => ({ ...p, value: e.target.value }))} style={{ flex: 1 }} />
                <button className="btn-primary" onClick={addAsset}>Tambah</button>
              </div>
            </div>
          </div>
        )}

        {/* ── AI ADVISOR ── */}
        {tab === "advisor" && (
          <div className="fade-in">
            <div style={{ fontSize: 11, color: "#3d4f63", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 20 }}>AI Financial Advisor</div>

            {/* Context */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
              <div style={{ background: "#0d1520", border: "1px solid #111d2b", borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#3d4f63", marginBottom: 6 }}>TOTAL ASET</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#c9a84c" }}>{fmtShort(totalAsset)}</div>
              </div>
              <div style={{ background: "#0d1520", border: "1px solid #111d2b", borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#3d4f63", marginBottom: 6 }}>DATA EMAS</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: goldHistory.length ? "#3ecf8e" : "#3d4f63" }}>{goldHistory.length} hari</div>
              </div>
              <div style={{ background: "#0d1520", border: "1px solid #111d2b", borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#3d4f63", marginBottom: 6 }}>DATA IHSG</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: ihsgHistory.length ? "#3ecf8e" : "#3d4f63" }}>{ihsgHistory.length} hari</div>
              </div>
            </div>

            <button className="btn-primary" onClick={fetchAdvice} disabled={aiLoading} style={{ width: "100%", padding: "14px", fontSize: 14, marginBottom: 20, opacity: aiLoading ? 0.7 : 1 }}>
              {aiLoading ? <span>Menganalisis <span className="ai-thinking" /> <span className="ai-thinking" style={{ animationDelay: "0.2s" }} /> <span className="ai-thinking" style={{ animationDelay: "0.4s" }} /></span> : "✦ Analisis Portofolio Saya"}
            </button>

            {aiAdvice && (
              <div style={{ background: "#0d1520", border: "1px solid #1e2d3d", borderRadius: 12, padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#c9a84c" }} />
                  <span style={{ fontSize: 11, color: "#c9a84c", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Analisis AI</span>
                </div>
                <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{aiAdvice}</div>
                <div className="divider" />
                <div style={{ fontSize: 10, color: "#1e2d3d" }}>Dianalisis {new Date().toLocaleString("id-ID")} · Bukan saran finansial profesional</div>
              </div>
            )}

            {!aiAdvice && !aiLoading && (
              <div style={{ background: "#0d1520", border: "1px dashed #111d2b", borderRadius: 12, padding: "40px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.3 }}>◆</div>
                <div style={{ fontSize: 13, color: "#1e2d3d" }}>Klik tombol di atas untuk mendapatkan analisis cerdas berdasarkan data portofolio & market Anda</div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}