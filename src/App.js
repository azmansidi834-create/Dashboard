cat > src/App.js << 'ENDOFFILE'
import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";

// ── Firebase Config ──────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyBUJK_OXNb407pKxkyLIKCQFaFJovK1KXk",
  authDomain: "fintrack-dashboard-d57d9.firebaseapp.com",
  databaseURL: "https://fintrack-dashboard-d57d9-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "fintrack-dashboard-d57d9",
  storageBucket: "fintrack-dashboard-d57d9.firebasestorage.app",
  messagingSenderId: "928828301575",
  appId: "1:928828301575:web:ea06525865729172af65a2"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

const fmt = (v) => `Rp ${Number(v).toLocaleString("id-ID")}`;
const fmtS = (v) => v >= 1e6 ? `${(v/1e6).toFixed(1)}jt` : `${(v/1e3).toFixed(0)}rb`;
const todayStr = () => new Date().toISOString().slice(0, 10);

const DEF_PORT = [
  { id: 1, name: "Tabungan", value: 4500000, color: "#4e9af1", icon: "◈" },
  { id: 2, name: "Tabungan Emas", value: 1000000, color: "#c9a84c", icon: "◆" },
  { id: 3, name: "Dana Dingin", value: 2200000, color: "#3ecf8e", icon: "◉" },
];

async function getAI(portfolio, goldData, ihsgData) {
  const total = portfolio.reduce((s, a) => s + Number(a.value), 0);
  const prompt = `Kamu adalah penasihat keuangan pribadi berpengalaman di pasar Indonesia.

PORTOFOLIO:
${portfolio.map(a => `- ${a.name}: ${fmt(a.value)}`).join('\n')}
Total: ${fmt(total)}

EMAS TERBARU:
${goldData.slice(-3).map(d => `- ${d.date}: Rp ${Number(d.price).toLocaleString('id-ID')}/gr`).join('\n') || '- Belum ada data'}

IHSG TERBARU:
${ihsgData.slice(-3).map(d => `- ${d.date}: ${Number(d.value).toLocaleString('id-ID')}`).join('\n') || '- Belum ada data'}

Berikan analisis dalam bahasa Indonesia:
1. KONDISI PASAR (1-2 kalimat)
2. EVALUASI PORTOFOLIO (1-2 kalimat)
3. REKOMENDASI AKSI (2-3 aksi dengan nominal spesifik)
4. PERINGATAN RISIKO (jika ada)`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] })
  });
  const data = await res.json();
  return data.content?.[0]?.text || "Gagal mendapatkan analisis.";
}

function Spark({ data, color }) {
  if (!data || data.length < 2) return <div style={{ fontSize: 11, color: "#1e2d3d", padding: "10px 0" }}>Belum ada data</div>;
  return (
    <ResponsiveContainer width="100%" height={44}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs><linearGradient id={"g" + color.slice(1)} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={color} stopOpacity={0.3} />
          <stop offset="95%" stopColor={color} stopOpacity={0} />
        </linearGradient></defs>
        <Area type="monotone" dataKey="val" stroke={color} strokeWidth={1.5} fill={"url(#g" + color.slice(1) + ")"} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [port, setPort] = useState(DEF_PORT);
  const [gold, setGold] = useState([]);
  const [ihsg, setIhsg] = useState([]);
  const [gIn, setGIn] = useState({ date: todayStr(), price: "" });
  const [iIn, setIIn] = useState({ date: todayStr(), value: "" });
  const [ai, setAi] = useState("");
  const [aiLoad, setAiLoad] = useState(false);
  const [nAsset, setNAsset] = useState({ name: "", value: "" });
  const [editId, setEditId] = useState(null);
  const [editV, setEditV] = useState("");
  const [synced, setSynced] = useState(false);

  // ── Load from Firebase ──
  useEffect(() => {
    onValue(ref(db, "portfolio"), snap => {
      if (snap.exists()) setPort(snap.val());
    });
    onValue(ref(db, "gold"), snap => {
      if (snap.exists()) setGold(snap.val());
    });
    onValue(ref(db, "ihsg"), snap => {
      if (snap.exists()) setIhsg(snap.val());
    });
    setSynced(true);
  }, []);

  // ── Save to Firebase ──
  const savePort = (data) => { setPort(data); set(ref(db, "portfolio"), data); };
  const saveGold = (data) => { setGold(data); set(ref(db, "gold"), data); };
  const saveIhsg = (data) => { setIhsg(data); set(ref(db, "ihsg"), data); };

  const total = port.reduce((s, a) => s + Number(a.value), 0);
  const lastG = gold.at(-1); const prevG = gold.at(-2);
  const lastI = ihsg.at(-1); const prevI = ihsg.at(-2);
  const gChg = lastG && prevG ? ((lastG.price - prevG.price) / prevG.price * 100) : null;
  const iChg = lastI && prevI ? ((lastI.value - prevI.value) / prevI.value * 100) : null;

  const addGold = () => {
    if (!gIn.price) return;
    const u = [...gold.filter(d => d.date !== gIn.date), { date: gIn.date, price: Number(gIn.price) }].sort((a, b) => a.date.localeCompare(b.date));
    saveGold(u); setGIn({ date: todayStr(), price: "" });
  };
  const addIHSG = () => {
    if (!iIn.value) return;
    const u = [...ihsg.filter(d => d.date !== iIn.date), { date: iIn.date, value: Number(iIn.value) }].sort((a, b) => a.date.localeCompare(b.date));
    saveIhsg(u); setIIn({ date: todayStr(), value: "" });
  };
  const fetchAI = async () => {
    setAiLoad(true); setAi("");
    try { setAi(await getAI(port, gold, ihsg)); } catch { setAi("Gagal. Coba lagi."); }
    setAiLoad(false);
  };

  const C = {
    page: { fontFamily: "system-ui,sans-serif", background: "#080c10", minHeight: "100vh", color: "#e2e8f0" },
    bar: { background: "#0a0f17", borderBottom: "1px solid #111d2b", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 54, position: "sticky", top: 0, zIndex: 99 },
    wrap: { padding: "24px", maxWidth: 960, margin: "0 auto" },
    card: { background: "#0d1520", border: "1px solid #111d2b", borderRadius: 12, padding: 20 },
    lbl: { fontSize: 10, color: "#3d4f63", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 },
    g2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
    ga: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 },
    inp: { background: "#0a0f17", border: "1px solid #1e2d3d", color: "#e2e8f0", borderRadius: 8, padding: "10px 14px", fontFamily: "inherit", fontSize: 13, outline: "none", width: "100%" },
    btnG: { background: "linear-gradient(135deg,#c9a84c,#e8c96d)", color: "#080c10", border: "none", borderRadius: 8, padding: "10px 20px", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
    btnO: { background: "transparent", color: "#64748b", border: "1px solid #1e2d3d", borderRadius: 8, padding: "8px 14px", fontFamily: "inherit", fontSize: 12, cursor: "pointer" },
  };

  const TABS = [["dashboard","Dashboard"],["market","Market Data"],["portfolio","Portofolio"],["advisor","AI Advisor"]];

  return (
    <div style={C.page}>
      <div style={C.bar}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:28, height:28, background:"linear-gradient(135deg,#c9a84c,#e8c96d)", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, color:"#080c10", fontWeight:700 }}>◆</div>
          <span style={{ fontSize:14, fontWeight:600, color:"#f1f5f9" }}>fintrack</span>
          <span style={{ fontSize:10, color: synced ? "#3ecf8e" : "#f59e0b", marginLeft:4 }}>{synced ? "● Firebase" : "● Connecting..."}</span>
        </div>
        <div style={{ display:"flex", gap:2 }}>
          {TABS.map(([id,lbl]) => (
            <button key={id} onClick={() => setTab(id)} style={{ padding:"6px 14px", borderRadius:6, border:"none", cursor:"pointer", fontSize:12, fontWeight: tab===id?600:400, background: tab===id?"#111d2b":"transparent", color: tab===id?"#c9a84c":"#64748b" }}>{lbl}</button>
          ))}
        </div>
        <span style={{ fontSize:11, color:"#3d4f63" }}>{new Date().toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"})}</span>
      </div>

      <div style={C.wrap}>

        {tab === "dashboard" && (
          <div>
            <div style={{ marginBottom:24 }}>
              <div style={C.lbl}>Total Aset</div>
              <div style={{ fontSize:36, fontWeight:700, letterSpacing:"-1px", color:"#f1f5f9" }}>{fmt(total)}</div>
            </div>
            <div style={{ ...C.ga, marginBottom:20 }}>
              {port.map(a => (
                <div key={a.id} style={C.card}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                    <span style={{ fontSize:10, color:"#3d4f63", textTransform:"uppercase" }}>{a.name}</span>
                    <span style={{ color:a.color }}>{a.icon}</span>
                  </div>
                  <div style={{ fontSize:18, fontWeight:600, color:"#f1f5f9" }}>{fmt(a.value)}</div>
                  <div style={{ marginTop:10, height:3, background:"#111d2b", borderRadius:2 }}>
                    <div style={{ width:`${a.value/total*100}%`, height:"100%", background:a.color, borderRadius:2 }} />
                  </div>
                  <div style={{ fontSize:10, color:"#3d4f63", marginTop:5 }}>{(a.value/total*100).toFixed(1)}%</div>
                </div>
              ))}
            </div>
            <div style={{ ...C.g2, marginBottom:20 }}>
              {[
                { lbl:"Emas Antam", val:lastG?`Rp ${lastG.price.toLocaleString("id-ID")}/gr`:"—", chg:gChg, spark:gold.slice(-14).map(d=>({val:d.price})), color:"#c9a84c" },
                { lbl:"IHSG", val:lastI?lastI.value.toLocaleString("id-ID"):"—", chg:iChg, spark:ihsg.slice(-14).map(d=>({val:d.value})), color:"#4e9af1" },
              ].map(m => (
                <div key={m.lbl} style={C.card}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <span style={{ fontSize:10, color:"#3d4f63", textTransform:"uppercase" }}>{m.lbl}</span>
                    {m.chg!==null && <span style={{ fontSize:11, color:m.chg>=0?"#3ecf8e":"#f87171" }}>{m.chg>=0?"▲":"▼"} {Math.abs(m.chg).toFixed(2)}%</span>}
                  </div>
                  <div style={{ fontSize:20, fontWeight:600, color:"#f1f5f9", marginBottom:8 }}>{m.val}</div>
                  <Spark data={m.spark} color={m.color} />
                </div>
              ))}
            </div>
            <div style={C.card}>
              <div style={{ ...C.lbl, marginBottom:14 }}>Alokasi Aset</div>
              <div style={{ display:"flex", height:6, borderRadius:6, overflow:"hidden", marginBottom:14, gap:1 }}>
                {port.map(a => <div key={a.id} style={{ width:`${a.value/total*100}%`, background:a.color }} />)}
              </div>
              <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
                {port.map(a => (
                  <div key={a.id} style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:8, height:8, borderRadius:2, background:a.color }} />
                    <span style={{ fontSize:12, color:"#64748b" }}>{a.name}</span>
                    <span style={{ fontSize:12, color:"#94a3b8" }}>{(a.value/total*100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "market" && (
          <div>
            <div style={C.lbl}>Market Data Tracker</div>
            <div style={{ ...C.g2, margin:"16px 0 20px" }}>
              {[
                { lbl:"Emas Antam", icon:"◆", ic:"#c9a84c", inp:gIn, setInp:setGIn, ph:"Harga per gram (Rp)", vkey:"price", onSave:addGold },
                { lbl:"IHSG", icon:"◈", ic:"#4e9af1", inp:iIn, setInp:setIIn, ph:"Nilai IHSG", vkey:"value", onSave:addIHSG },
              ].map(x => (
                <div key={x.lbl} style={C.card}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
                    <span style={{ color:x.ic }}>{x.icon}</span>
                    <span style={{ fontSize:13, fontWeight:600 }}>{x.lbl}</span>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    <input type="date" style={C.inp} value={x.inp.date} onChange={e=>x.setInp(p=>({...p,date:e.target.value}))} />
                    <input type="number" style={C.inp} placeholder={x.ph} value={x.inp[x.vkey]} onChange={e=>x.setInp(p=>({...p,[x.vkey]:e.target.value}))} />
                    <button style={C.btnG} onClick={x.onSave}>Simpan ke Firebase</button>
                  </div>
                </div>
              ))}
            </div>
            {gold.length >= 2 && (
              <div style={{ ...C.card, marginBottom:16 }}>
                <div style={{ ...C.lbl, marginBottom:14 }}>Grafik Emas (Rp/gram)</div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={gold}>
                    <defs><linearGradient id="gg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#c9a84c" stopOpacity={0.25}/><stop offset="95%" stopColor="#c9a84c" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#111d2b"/>
                    <XAxis dataKey="date" stroke="#1e2d3d" tick={{fontSize:10,fill:"#3d4f63"}} tickFormatter={d=>d.slice(5)}/>
                    <YAxis stroke="#1e2d3d" tick={{fontSize:10,fill:"#3d4f63"}} tickFormatter={v=>`${(v/1e6).toFixed(2)}M`} width={58}/>
                    <Tooltip contentStyle={{background:"#0d1520",border:"1px solid #1e2d3d",borderRadius:8,fontSize:12}} formatter={v=>[fmt(v),"Harga"]}/>
                    <Area type="monotone" dataKey="price" stroke="#c9a84c" strokeWidth={2} fill="url(#gg)" dot={false} activeDot={{r:4}}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
            {ihsg.length >= 2 && (
              <div style={{ ...C.card, marginBottom:16 }}>
                <div style={{ ...C.lbl, marginBottom:14 }}>Grafik IHSG</div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={ihsg}>
                    <defs><linearGradient id="gi" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4e9af1" stopOpacity={0.25}/><stop offset="95%" stopColor="#4e9af1" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#111d2b"/>
                    <XAxis dataKey="date" stroke="#1e2d3d" tick={{fontSize:10,fill:"#3d4f63"}} tickFormatter={d=>d.slice(5)}/>
                    <YAxis stroke="#1e2d3d" tick={{fontSize:10,fill:"#3d4f63"}} width={58}/>
                    <Tooltip contentStyle={{background:"#0d1520",border:"1px solid #1e2d3d",borderRadius:8,fontSize:12}} formatter={v=>[v.toLocaleString("id-ID"),"IHSG"]}/>
                    <Area type="monotone" dataKey="value" stroke="#4e9af1" strokeWidth={2} fill="url(#gi)" dot={false} activeDot={{r:4}}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
            <div style={C.g2}>
              {[
                { title:"Riwayat Emas", data:gold.slice(-10).reverse(), key:"price", fv:v=>fmt(v) },
                { title:"Riwayat IHSG", data:ihsg.slice(-10).reverse(), key:"value", fv:v=>v.toLocaleString("id-ID") },
              ].map(t => (
                <div key={t.title} style={C.card}>
                  <div style={{ ...C.lbl, marginBottom:12 }}>{t.title}</div>
                  {t.data.length===0
                    ? <div style={{ fontSize:12, color:"#1e2d3d", textAlign:"center", padding:"16px 0" }}>Belum ada data</div>
                    : t.data.map((d,i) => (
                      <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:i<t.data.length-1?"1px solid #0f1924":"none" }}>
                        <span style={{ fontSize:11, color:"#3d4f63" }}>{d.date}</span>
                        <span style={{ fontSize:12, color:"#94a3b8" }}>{t.fv(d[t.key])}</span>
                      </div>
                    ))
                  }
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "portfolio" && (
          <div>
            <div style={C.lbl}>Manajemen Portofolio</div>
            <div style={{ ...C.card, margin:"16px 0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div><div style={C.lbl}>Total Aset</div><div style={{ fontSize:28, fontWeight:700, color:"#f1f5f9" }}>{fmt(total)}</div></div>
              <div style={{ textAlign:"right" }}><div style={C.lbl}>Jumlah Pos</div><div style={{ fontSize:28, fontWeight:700, color:"#c9a84c" }}>{port.length}</div></div>
            </div>
            <div style={{ ...C.card, marginBottom:16 }}>
              <div style={{ ...C.lbl, marginBottom:14 }}>Daftar Aset</div>
              {port.map((a,i) => (
                <div key={a.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:i<port.length-1?"1px solid #0f1924":"none" }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:a.color+"20", display:"flex", alignItems:"center", justifyContent:"center", color:a.color, flexShrink:0 }}>{a.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500 }}>{a.name}</div>
                    <div style={{ fontSize:11, color:"#3d4f63" }}>{(a.value/total*100).toFixed(1)}%</div>
                  </div>
                  {editId===a.id ? (
                    <div style={{ display:"flex", gap:8 }}>
                      <input style={{ ...C.inp, width:140, padding:"6px 10px" }} type="number" value={editV} onChange={e=>setEditV(e.target.value)} />
                      <button style={{ ...C.btnG, padding:"6px 14px" }} onClick={() => { const u=port.map(x=>x.id===a.id?{...x,value:Number(editV)}:x); savePort(u); setEditId(null); }}>✓</button>
                      <button style={C.btnO} onClick={()=>setEditId(null)}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <span style={{ fontSize:14, fontWeight:600, color:"#f1f5f9" }}>{fmtS(a.value)}</span>
                      <button style={C.btnO} onClick={()=>{setEditId(a.id);setEditV(a.value);}}>Edit</button>
                      <button onClick={()=>savePort(port.filter(x=>x.id!==a.id))} style={{ background:"none", border:"none", color:"#3d4f63", cursor:"pointer", fontSize:18 }}>×</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ ...C.card, border:"1px dashed #1e2d3d" }}>
              <div style={{ ...C.lbl, marginBottom:12 }}>Tambah Aset Baru</div>
              <div style={{ display:"flex", gap:10 }}>
                <input style={{ ...C.inp, flex:1 }} placeholder="Nama aset" value={nAsset.name} onChange={e=>setNAsset(p=>({...p,name:e.target.value}))} />
                <input style={{ ...C.inp, flex:1 }} type="number" placeholder="Nominal (Rp)" value={nAsset.value} onChange={e=>setNAsset(p=>({...p,value:e.target.value}))} />
                <button style={C.btnG} onClick={()=>{ if(!nAsset.name||!nAsset.value)return; const cols=["#f472b6","#a78bfa","#fb923c","#34d399","#60a5fa"]; const u=[...port,{id:Date.now(),name:nAsset.name,value:Number(nAsset.value),color:cols[port.length%cols.length],icon:"◇"}]; savePort(u); setNAsset({name:"",value:""});}}>Tambah</button>
              </div>
            </div>
          </div>
        )}

        {tab === "advisor" && (
          <div>
            <div style={C.lbl}>AI Financial Advisor</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, margin:"16px 0 20px" }}>
              {[
                { lbl:"Total Aset", val:fmtS(total), color:"#c9a84c" },
                { lbl:"Data Emas", val:gold.length+" hari", color:gold.length?"#3ecf8e":"#3d4f63" },
                { lbl:"Data IHSG", val:ihsg.length+" hari", color:ihsg.length?"#3ecf8e":"#3d4f63" },
              ].map(x => (
                <div key={x.lbl} style={{ ...C.card, textAlign:"center" }}>
                  <div style={C.lbl}>{x.lbl}</div>
                  <div style={{ fontSize:18, fontWeight:600, color:x.color }}>{x.val}</div>
                </div>
              ))}
            </div>
            <button onClick={fetchAI} disabled={aiLoad} style={{ ...C.btnG, width:"100%", padding:14, fontSize:14, marginBottom:20, opacity:aiLoad?0.7:1 }}>
              {aiLoad ? "Menganalisis..." : "✦ Analisis Portofolio Saya"}
            </button>
            {ai ? (
              <div style={C.card}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:"#c9a84c" }} />
                  <span style={{ fontSize:10, color:"#c9a84c", textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600 }}>Analisis AI — Firebase Synced</span>
                </div>
                <div style={{ fontSize:13, color:"#94a3b8", lineHeight:1.9, whiteSpace:"pre-wrap" }}>{ai}</div>
                <div style={{ height:1, background:"linear-gradient(90deg,transparent,#1e2d3d,transparent)", margin:"16px 0" }} />
                <div style={{ fontSize:10, color:"#1e2d3d" }}>Dianalisis {new Date().toLocaleString("id-ID")} · Bukan saran finansial profesional</div>
              </div>
            ) : !aiLoad && (
              <div style={{ ...C.card, border:"1px dashed #1e2d3d", textAlign:"center", padding:"48px 24px" }}>
                <div style={{ fontSize:32, marginBottom:12, opacity:0.2 }}>◆</div>
                <div style={{ fontSize:13, color:"#1e2d3d" }}>Klik tombol di atas untuk analisis cerdas berdasarkan data Anda</div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
ENDOFFILE