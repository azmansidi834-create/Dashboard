import { useState, useEffect } from "react";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const fmt = (v) => `Rp ${Number(v).toLocaleString("id-ID")}`;
const fmtShort = (v) => v >= 1e6 ? `${(v/1e6).toFixed(1)}jt` : `${(v/1e3).toFixed(0)}rb`;
const todayStr = () => new Date().toISOString().slice(0, 10);
const GOLD_KEY = "findb:gold";
const IHSG_KEY = "findb:ihsg";
const PORT_KEY = "findb:portfolio";

async function getAIAdvice(portfolio, goldData, ihsgData) {
  const totalAsset = portfolio.reduce((s, a) => s + Number(a.value), 0);
  const prompt = `Kamu adalah penasihat keuangan pribadi yang berpengalaman di pasar Indonesia.

DATA PORTOFOLIO:
${portfolio.map(a => `- ${a.name}: ${fmt(a.value)}`).join('\n')}
Total Aset: ${fmt(totalAsset)}

DATA EMAS TERBARU:
${goldData.slice(-3).map(d => `- ${d.date}: Rp ${Number(d.price).toLocaleString('id-ID')}/gr`).join('\n') || '- Belum ada data'}

DATA IHSG TERBARU:
${ihsgData.slice(-3).map(d => `- ${d.date}: ${Number(d.value).toLocaleString('id-ID')}`).join('\n') || '- Belum ada data'}

Berikan analisis singkat dan tajam dalam bahasa Indonesia:
1. KONDISI PASAR (1-2 kalimat)
2. EVALUASI PORTOFOLIO (1-2 kalimat)
3. REKOMENDASI AKSI (2-3 aksi konkret dengan nominal)
4. PERINGATAN RISIKO (jika ada)`;

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

function Sparkline({ data, color }) {
  if (!data || data.length < 2) return <div style={{ fontSize: 11, color: "#1e2d3d", padding: "12px 0" }}>Belum ada data</div>;
  return (
    <ResponsiveContainer width="100%" height={48}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={"g" + color.replace("#", "")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="val" stroke={color} strokeWidth={1.5} fill={"url(#g" + color.replace("#", "") + ")"} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [portfolio, setPortfolio] = useState([
    { id: 1, name: "Tabungan", value: 4500000, color: "#4e9af1", icon: "◈" },
    { id: 2, name: "Tabungan Emas", value: 1000000, color: "#c9a84c", icon: "◆" },
    { id: 3, name: "Dana Dingin", value: 2200000, color: "#3ecf8e", icon: "◉" },
  ]);
  const [goldHistory, setGoldHistory] = useState([]);
  const [ihsgHistory, setIhsgHistory] = useState([]);
  const [goldInput, setGoldInput] = useState({ date: todayStr(), price: "" });
  const [ihsgInput, setIhsgInput] = useState({ date: todayStr(), value: "" });
  const [aiAdvice, setAiAdvice] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [newAsset, setNewAsset] = useState({ name: "", value: "" });
  const [editId, setEditId] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function load() {
      try { const g = await window.storage.get(GOLD_KEY); if (g) setGoldHistory(JSON.parse(g.value)); } catch {}
      try { const i = await window.storage.get(IHSG_KEY); if (i) setIhsgHistory(JSON.parse(i.value)); } catch {}
      try { const p = await window.storage.get(PORT_KEY); if (p) setPortfolio(JSON.parse(p.value)); } catch {}
      setReady(true);
    }
    load();
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.storage.set(PORT_KEY, JSON.stringify(portfolio)).catch(() => {});
  }, [portfolio, ready]);

  const total = portfolio.reduce((s, a) => s + Number(a.value), 0);

  const addGold = async () => {
    if (!goldInput.price) return;
    const updated = [...goldHistory.filter(d => d.date !== goldInput.date), { date: goldInput.date, price: Number(goldInput.price) }].sort((a, b) => a.date.localeCompare(b.date));
    setGoldHistory(updated);
    await window.storage.set(GOLD_KEY, JSON.stringify(updated)).catch(() => {});
    setGoldInput({ date: todayStr(), price: "" });
  };

  const addIHSG = async () => {
    if (!ihsgInput.value) return;
    const updated = [...ihsgHistory.filter(d => d.date !== ihsgInput.date), { date: ihsgInput.date, value: Number(ihsgInput.value) }].sort((a, b) => a.date.localeCompare(b.date));
    setIhsgHistory(updated);
    await window.storage.set(IHSG_KEY, JSON.stringify(updated)).catch(() => {});
    setIhsgInput({ date: todayStr(), value: "" });
  };

  const fetchAdvice = async () => {
    setAiLoading(true);
    setAiAdvice("");
    try {
      const text = await getAIAdvice(portfolio, goldHistory, ihsgHistory);
      setAiAdvice(text);
    } catch { setAiAdvice("Gagal terhubung. Coba lagi."); }
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

  const lastGold = goldHistory.at(-1);
  const prevGold = goldHistory.at(-2);
  const goldChange = lastGold && prevGold ? ((lastGold.price - prevGold.price) / prevGold.price * 100) : null;
  const lastIHSG = ihsgHistory.at(-1);
  const prevIHSG = ihsgHistory.at(-2);
  const ihsgChange = lastIHSG && prevIHSG ? ((lastIHSG.value - prevIHSG.value) / prevIHSG.value * 100) : null;

  const S = {
    page: { fontFamily: "system-ui, sans-serif", background: "#080c10", minHeight: "100vh", color: "#e2e8f0" },
    topbar: { background: "#0a0f17", borderBottom: "1px solid #111d2b", padding: "0 24px", position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 },
    logo: { display: "flex", alignItems: "center", gap: 10 },
    logoBox: { width: 28, height: 28, background: "linear-gradient(135deg, #c9a84c, #e8c96d)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#080c10", fontWeight: 700 },
    tabs: { display: "flex", gap: 2 },
    content: { padding: 24, maxWidth: 960, margin: "0 auto" },
    label: { fontSize: 10, color: "#3d4f63", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 },
    card: { background: "#0d1520", border: "1px solid #111d2b", borderRadius: 12, padding: 20 },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
    gridAuto: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 },
    input: { background: "#0a0f17", border: "1px solid #1e2d3d", color: "#e2e8f0", borderRadius: 8, padding: "10px 14px", fontFamily: "inherit", fontSize: 13, outline: "none", width: "100%" },
    btnGold: { background: "linear-gradient(135deg, #c9a84c, #e8c96d)", color: "#080c10", border: "none", borderRadius: 8, padding: "10px 20px", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
    btnGhost: { background: "transparent", color: "#64748b", border: "1px solid #1e2d3d", borderRadius: 8, padding: "8px 14px", fontFamily: "inherit", fontSize: 12, cursor: "pointer" },
    divider: { height: 1, background: "linear-gradient(90deg, transparent, #1e2d3d, transparent)", margin: "16px 0" },
  };

  const TABS = ["dashboard", "market", "portfolio", "advisor"];
  const LABELS = { dashboard: "Dashboard", market: "Market Data", portfolio: "Portofolio", advisor: "AI Advisor" };

  return (
    <div style={S.page}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <div style={S.topbar}>
        <div style={S.logo}>
          <div style={S.logoBox}>◆</div>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9", letterSpacing: "-0.3px" }}>fintrack</span>
        </div>
        <div style={S.tabs}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: tab === t ? 600 : 400, background: tab === t ? "#111d2b" : "transparent", color: tab === t ? "#c9a84c" : "#64748b" }}>
              {LABELS[t]}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "#3d4f63", fontFamily: "DM Mono, monospace" }}>{new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</div>
      </div>

      <div style={S.content}>

        {tab === "dashboard" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={S.label}>Total Aset</div>
              <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-1px", color: "#f1f5f9" }}>{fmt(total)}</div>
            </div>

            <div style={{ ...S.gridAuto, marginBottom: 20 }}>
              {portfolio.map(a => (
                <div key={a.id} style={S.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 10, color: "#3d4f63", textTransform: "uppercase", letterSpacing: "0.06em" }}>{a.name}</span>
                    <span style={{ color: a.color }}>{a.icon}</span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: "#f1f5f9" }}>{fmt(a.value)}</div>
                  <div style={{ marginTop: 10, height: 3, background: "#111d2b", borderRadius: 2 }}>
                    <div style={{ width: `${(a.value / total * 100)}%`, height: "100%", background: a.color, borderRadius: 2 }} />
                  </div>
                  <div style={{ fontSize: 10, color: "#3d4f63", marginTop: 5 }}>{(a.value / total * 100).toFixed(1)}%</div>
                </div>
              ))}
            </div>

            <div style={{ ...S.grid2, marginBottom: 20 }}>
              {[
                { label: "Emas Antam", val: lastGold ? `Rp ${lastGold.price.toLocaleString("id-ID")}/gr` : "—", change: goldChange, spark: goldHistory.slice(-14).map(d => ({ val: d.price })), color: "#c9a84c" },
                { label: "IHSG", val: lastIHSG ? lastIHSG.value.toLocaleString("id-ID") : "—", change: ihsgChange, spark: ihsgHistory.slice(-14).map(d => ({ val: d.value })), color: "#4e9af1" },
              ].map(m => (
                <div key={m.label} style={S.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: "#3d4f63", textTransform: "uppercase", letterSpacing: "0.06em" }}>{m.label}</span>
                    {m.change !== null && (
                      <span style={{ fontSize: 11, color: m.change >= 0 ? "#3ecf8e" : "#f87171", fontFamily: "DM Mono, monospace" }}>
                        {m.change >= 0 ? "▲" : "▼"} {Math.abs(m.change).toFixed(2)}%
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: "#f1f5f9", marginBottom: 8 }}>{m.val}</div>
                  <Sparkline data={m.spark} color={m.color} />
                </div>
              ))}
            </div>

            <div style={S.card}>
              <div style={{ ...S.label, marginBottom: 14 }}>Alokasi Aset</div>
              <div style={{ display: "flex", height: 6, borderRadius: 6, overflow: "hidden", marginBottom: 14, gap: 1 }}>
                {portfolio.map(a => (
                  <div key={a.id} style={{ width: `${a.value / total * 100}%`, background: a.color }} />
                ))}
              </div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                {portfolio.map(a => (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: a.color }} />
                    <span style={{ fontSize: 12, color: "#64748b" }}>{a.name}</span>
                    <span style={{ fontSize: 12, color: "#94a3b8", fontFamily: "DM Mono, monospace" }}>{(a.value / total * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "market" && (
          <div>
            <div style={S.label}>Market Data Tracker</div>
            <div style={{ ...S.grid2, margin: "16px 0 24px" }}>
              <div style={S.card}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <span style={{ color: "#c9a84c" }}>◆</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Harga Emas</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input type="date" style={S.input} value={goldInput.date} onChange={e => setGoldInput(p => ({ ...p, date: e.target.value }))} />
                  <input type="number" style={S.input} placeholder="Harga per gram (Rp)" value={goldInput.price} onChange={e => setGoldInput(p => ({ ...p, price: e.target.value }))} />
                  <button style={S.btnGold} onClick={addGold}>Simpan</button>
                </div>
              </div>
              <div style={S.card}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <span style={{ color: "#4e9af1" }}>◈</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>IHSG</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input type="date" style={S.input} value={ihsgInput.date} onChange={e => setIhsgInput(p => ({ ...p, date: e.target.value }))} />
                  <input type="number" style={S.input} placeholder="Nilai IHSG" value={ihsgInput.value} onChange={e => setIhsgInput(p => ({ ...p, value: e.target.value }))} />
                  <button style={S.btnGold} onClick={addIHSG}>Simpan</button>
                </div>
              </div>
            </div>

            {goldHistory.length >= 2 && (
              <div style={{ ...S.card, marginBottom: 16 }}>
                <div style={{ ...S.label, marginBottom: 14 }}>Grafik Emas (Rp/gram)</div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={goldHistory}>
                    <defs>
                      <linearGradient id="gGold" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c9a84c" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#c9a84c" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#111d2b" />
                    <XAxis dataKey="date" stroke="#1e2d3d" tick={{ fontSize: 10, fill: "#3d4f63" }} tickFormatter={d => d.slice(5)} />
                    <YAxis stroke="#1e2d3d" tick={{ fontSize: 10, fill: "#3d4f63" }} tickFormatter={v => `${(v/1e6).toFixed(2)}M`} width={58} />
                    <Tooltip contentStyle={{ background: "#0d1520", border: "1px solid #1e2d3d", borderRadius: 8, fontSize: 12 }} formatter={v => [fmt(v), "Harga"]} />
                    <Area type="monotone" dataKey="price" stroke="#c9a84c" strokeWidth={2} fill="url(#gGold)" dot={false} activeDot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {ihsgHistory.length >= 2 && (
              <div style={{ ...S.card, marginBottom: 16 }}>
                <div style={{ ...S.label, marginBottom: 14 }}>Grafik IHSG</div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={ihsgHistory}>
                    <defs>
                      <linearGradient id="gIHSG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4e9af1" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#4e9af1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#111d2b" />
                    <XAxis dataKey="date" stroke="#1e2d3d" tick={{ fontSize: 10, fill: "#3d4f63" }} tickFormatter={d => d.slice(5)} />
                    <YAxis stroke="#1e2d3d" tick={{ fontSize: 10, fill: "#3d4f63" }} width={58} />
                    <Tooltip contentStyle={{ background: "#0d1520", border: "1px solid #1e2d3d", borderRadius: 8, fontSize: 12 }} formatter={v => [v.toLocaleString("id-ID"), "IHSG"]} />
                    <Area type="monotone" dataKey="value" stroke="#4e9af1" strokeWidth={2} fill="url(#gIHSG)" dot={false} activeDot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            <div style={S.grid2}>
              {[
                { title: "Riwayat Emas", data: goldHistory.slice(-10).reverse(), key: "price", fmtVal: v => fmt(v) },
                { title: "Riwayat IHSG", data: ihsgHistory.slice(-10).reverse(), key: "value", fmtVal: v => v.toLocaleString("id-ID") },
              ].map(t => (
                <div key={t.title} style={S.card}>
                  <div style={{ ...S.label, marginBottom: 12 }}>{t.title}</div>
                  {t.data.length === 0 ? (
                    <div style={{ fontSize: 12, color: "#1e2d3d", textAlign: "center", padding: "16px 0" }}>Belum ada data</div>
                  ) : t.data.map((d, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: i < t.data.length - 1 ? "1px solid #0f1924" : "none" }}>
                      <span style={{ fontSize: 11, color: "#3d4f63", fontFamily: "DM Mono, monospace" }}>{d.date}</span>
                      <span style={{ fontSize: 12, color: "#94a3b8", fontFamily: "DM Mono, monospace" }}>{t.fmtVal(d[t.key])}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "portfolio" && (
          <div>
            <div style={S.label}>Manajemen Portofolio</div>
            <div style={{ ...S.card, margin: "16px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={S.label}>Total Aset</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.5px" }}>{fmt(total)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={S.label}>Jumlah Pos</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#c9a84c" }}>{portfolio.length}</div>
              </div>
            </div>

            <div style={{ ...S.card, marginBottom: 16 }}>
              <div style={{ ...S.label, marginBottom: 14 }}>Daftar Aset</div>
              {portfolio.map((a, i) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < portfolio.length - 1 ? "1px solid #0f1924" : "none" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: a.color + "20", display: "flex", alignItems: "center", justifyContent: "center", color: a.color, flexShrink: 0 }}>{a.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{a.name}</div>
                    <div style={{ fontSize: 11, color: "#3d4f63" }}>{(a.value / total * 100).toFixed(1)}%</div>
                  </div>
                  {editId === a.id ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <input style={{ ...S.input, width: 140, padding: "6px 10px" }} type="number" value={editVal} onChange={e => setEditVal(e.target.value)} />
                      <button style={{ ...S.btnGold, padding: "6px 14px" }} onClick={() => saveEdit(a.id)}>✓</button>
                      <button style={S.btnGhost} onClick={() => setEditId(null)}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 14, fontWeight: 600, fontFamily: "DM Mono, monospace", color: "#f1f5f9" }}>{fmtShort(a.value)}</span>
                      <button style={S.btnGhost} onClick={() => { setEditId(a.id); setEditVal(a.value); }}>Edit</button>
                      <button onClick={() => setPortfolio(p => p.filter(x => x.id !== a.id))} style={{ background: "none", border: "none", color: "#3d4f63", cursor: "pointer", fontSize: 18 }}>×</button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ ...S.card, border: "1px dashed #1e2d3d" }}>
              <div style={{ ...S.label, marginBottom: 12 }}>Tambah Aset Baru</div>
              <div style={{ display: "flex", gap: 10 }}>
                <input style={{ ...S.input, flex: 1 }} placeholder="Nama aset" value={newAsset.name} onChange={e => setNewAsset(p => ({ ...p, name: e.target.value }))} />
                <input style={{ ...S.input, flex: 1 }} type="number" placeholder="Nominal (Rp)" value={newAsset.value} onChange={e => setNewAsset(p => ({ ...p, value: e.target.value }))} />
                <button style={S.btnGold} onClick={addAsset}>Tambah</button>
              </div>
            </div>
          </div>
        )}

        {tab === "advisor" && (
          <div>
            <div style={S.label}>AI Financial Advisor</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, margin: "16px 0 20px" }}>
              {[
                { label: "Total Aset", val: fmtShort(total), color: "#c9a84c" },
                { label: "Data Emas", val: goldHistory.length + " hari", color: goldHistory.length ? "#3ecf8e" : "#3d4f63" },
                { label: "Data IHSG", val: ihsgHistory.length + " hari", color: ihsgHistory.length ? "#3ecf8e" : "#3d4f63" },
              ].map(x => (
                <div key={x.label} style={{ ...S.card, textAlign: "center" }}>
                  <div style={S.label}>{x.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: x.color }}>{x.val}</div>
                </div>
              ))}
            </div>

            <button onClick={fetchAdvice} disabled={aiLoading} style={{ ...S.btnGold, width: "100%", padding: 14, fontSize: 14, marginBottom: 20, opacity: aiLoading ? 0.7 : 1 }}>
              {aiLoading ? "Menganalisis..." : "✦ Analisis Portofolio Saya"}
            </button>

            {aiAdvice ? (
              <div style={S.card}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#c9a84c" }} />
                  <span style={{ fontSize: 10, color: "#c9a84c", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Analisis AI</span>
                </div>
                <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{aiAdvice}</div>
                <div style={S.divider} />
                <div style={{ fontSize: 10, color: "#1e2d3d" }}>Dianalisis {new Date().toLocaleString("id-ID")} · Bukan saran finansial profesional</div>
              </div>
            ) : !aiLoading && (
              <div style={{ ...S.card, border: "1px dashed #1e2d3d", textAlign: "center", padding: "48px 24px" }}>
                <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.2 }}>◆</div>
                <div style={{ fontSize: 13, color: "#1e2d3d" }}>Klik tombol di atas untuk analisis cerdas berdasarkan data Anda</div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
