import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";

const formatRp = (val) => `Rp ${val.toLocaleString("id-ID")}`;

export default function FinancialDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  const assets = [
    { name: "Tabungan", value: 4500000, icon: "🏦", color: "#3b82f6" },
    { name: "Tabungan Emas", value: 1000000, icon: "🥇", color: "#f59e0b" },
    { name: "Dana Dingin", value: 2200000, icon: "💵", color: "#10b981" },
  ];
  const total = assets.reduce((a, b) => a + b.value, 0);

  const allocationPlan = [
    { name: "Dana Darurat", pct: 58, rp: 4500000, color: "#3b82f6", icon: "🛡️" },
    { name: "Emas (Top-up)", pct: 13, rp: 1000000, color: "#f59e0b", icon: "🥇" },
    { name: "Reksa Dana", pct: 16, rp: 1200000, color: "#8b5cf6", icon: "📈" },
    { name: "SBN / Obligasi", pct: 13, rp: 1000000, color: "#10b981", icon: "🏛️" },
  ];

  const projectionData = [
    { year: "2026", conservative: 8200000, moderate: 8600000, aggressive: 9200000 },
    { year: "2027", conservative: 8900000, moderate: 9700000, aggressive: 11000000 },
    { year: "2028", conservative: 9600000, moderate: 11000000, aggressive: 13200000 },
    { year: "2029", conservative: 10400000, moderate: 12400000, aggressive: 15800000 },
    { year: "2030", conservative: 11200000, moderate: 14000000, aggressive: 19000000 },
  ];

  const instruments = [
    {
      name: "Tambah Tabungan Emas", priority: "PRIORITAS 1", priorityColor: "#f59e0b", icon: "🥇",
      why: "Harga emas turun ke Rp 3.004.000/gram dari ATH Rp 3.168.000 — diskon ~5%. Momentum beli bagus.",
      modal: "Mulai Rp 10.000", platform: "Pegadaian Digital, BSI Emas", risiko: "Rendah", returnEst: "~15-20%/tahun",
      action: "Alokasikan Rp 700.000 dari dana dingin",
    },
    {
      name: "Reksa Dana Pasar Uang", priority: "PRIORITAS 2", priorityColor: "#8b5cf6", icon: "📊",
      why: "IHSG sedang volatile. Parkir dana dingin di RDPU lebih aman sambil menunggu pasar stabil.",
      modal: "Mulai Rp 10.000", platform: "Bibit, Bareksa, IPOT", risiko: "Sangat Rendah", returnEst: "~5-7%/tahun",
      action: "Alokasikan Rp 800.000 dari dana dingin",
    },
    {
      name: "SBN / SR / ORI", priority: "PRIORITAS 3", priorityColor: "#10b981", icon: "🏛️",
      why: "Instrumen negara, aman, return lebih tinggi dari deposito. Pantau penerbitan SR/ORI berikutnya.",
      modal: "Mulai Rp 1.000.000", platform: "Bank/Sekuritas resmi", risiko: "Sangat Rendah", returnEst: "~6.5-7.5%/tahun",
      action: "Sisihkan Rp 700.000 saat penerbitan berikutnya",
    },
    {
      name: "Saham Blue Chip (DCA)", priority: "JANGKA PANJANG", priorityColor: "#ef4444", icon: "📈",
      why: "IHSG merah adalah peluang beli bertahap. Fokus BBCA, BMRI. Gunakan strategi DCA, jangan all-in.",
      modal: "Mulai Rp 100.000/bulan", platform: "Ajaib, IPOT, Stockbit", risiko: "Menengah-Tinggi", returnEst: "~10-15%/tahun",
      action: "Terapkan setelah dana darurat aman",
    },
  ];

  const tabs = [
    { id: "overview", label: "📊 Overview" },
    { id: "allocation", label: "🎯 Alokasi" },
    { id: "instruments", label: "💡 Instrumen" },
    { id: "projection", label: "📈 Proyeksi" },
  ];

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#0f172a", minHeight: "100vh", color: "#e2e8f0", padding: "20px" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1e3a5f, #1e293b)", border: "1px solid #334155", borderRadius: 16, padding: "20px 24px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#f1f5f9" }}>💼 Financial Plan Dashboard</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>10 Maret 2026 · Total Aset: <strong style={{ color: "#60a5fa" }}>{formatRp(total)}</strong></p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ background: "#7f1d1d", color: "#fca5a5", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>📉 IHSG -3.27%</span>
            <span style={{ background: "#78350f", color: "#fcd34d", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>🥇 Emas Rp 3.004.000/gr</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: "9px 18px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
            background: activeTab === t.id ? "#3b82f6" : "#1e293b",
            color: activeTab === t.id ? "white" : "#94a3b8",
            boxShadow: activeTab === t.id ? "0 0 12px #3b82f660" : "none",
            transition: "all 0.2s"
          }}>{t.label}</button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === "overview" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
            {assets.map(a => (
              <div key={a.name} style={{ background: "#1e293b", border: `1px solid ${a.color}40`, borderRadius: 14, padding: 18 }}>
                <div style={{ fontSize: 30, marginBottom: 8 }}>{a.icon}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>{a.name}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: a.color }}>{formatRp(a.value)}</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{((a.value / total) * 100).toFixed(1)}% dari total</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, marginBottom: 14 }}>
            <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 14, padding: 20 }}>
              <h3 style={{ margin: "0 0 14px", fontSize: 14, color: "#f1f5f9" }}>Distribusi Aset</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={assets} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                    {assets.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatRp(v)} contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9" }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                {assets.map(a => (
                  <div key={a.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: a.color, flexShrink: 0 }} />
                    <span style={{ color: "#94a3b8" }}>{a.name}</span>
                    <span style={{ color: a.color, fontWeight: 600, marginLeft: "auto" }}>{formatRp(a.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "#1c1917", border: "1px solid #f59e0b50", borderRadius: 14, padding: 18 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 14, color: "#fbbf24" }}>⚠️ Analisis Pasar Hari Ini</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ background: "#7f1d1d40", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#fca5a5", lineHeight: 1.6 }}>
                  🔴 <strong>IHSG</strong> merah -3.27% di 7.337. Dipicu konflik geopolitik & lonjakan harga minyak. Ini peluang DCA saham blue chip secara bertahap.
                </div>
                <div style={{ background: "#78350f40", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#fcd34d", lineHeight: 1.6 }}>
                  🟡 <strong>Emas</strong> koreksi ~5% dari ATH Rp 3.168.000 → Rp 3.004.000. Momentum beli jangka panjang yang baik.
                </div>
                <div style={{ background: "#14532d40", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#86efac", lineHeight: 1.6 }}>
                  🟢 <strong>Strategi:</strong> Cicil investasi via DCA. Prioritaskan instrumen aman dahulu, baru ekspansi ke saham.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ALLOCATION */}
      {activeTab === "allocation" && (
        <div>
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 14, padding: 20, marginBottom: 14 }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 15, color: "#f1f5f9" }}>🎯 Rekomendasi Alokasi Optimal</h3>
            <p style={{ margin: "0 0 18px", fontSize: 12, color: "#64748b" }}>Total {formatRp(total)} dioptimalkan:</p>
            {allocationPlan.map(item => (
              <div key={item.name} style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{item.icon} {item.name}</span>
                  <span style={{ fontSize: 14, color: item.color, fontWeight: 700 }}>{formatRp(item.rp)} <span style={{ fontSize: 11, color: "#64748b" }}>({item.pct}%)</span></span>
                </div>
                <div style={{ background: "#0f172a", borderRadius: 6, height: 12, overflow: "hidden" }}>
                  <div style={{ width: `${item.pct}%`, background: `linear-gradient(90deg, ${item.color}, ${item.color}88)`, height: "100%", borderRadius: 6 }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: "#0f2a1a", border: "1px solid #10b98150", borderRadius: 14, padding: 18 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 14, color: "#34d399" }}>📋 Penggunaan Dana Dingin Rp 2.200.000</h3>
            {[
              { label: "Tambah tabungan emas (harga lagi koreksi)", rp: 700000, color: "#f59e0b" },
              { label: "Reksa Dana Pasar Uang (sambil tunggu momentum)", rp: 800000, color: "#8b5cf6" },
              { label: "Cadangan / SBN penerbitan berikutnya", rp: 700000, color: "#10b981" },
            ].map((item, i, arr) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: i < arr.length - 1 ? "1px solid #1e3a2a" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color }} />
                  <span style={{ fontSize: 13, color: "#94a3b8" }}>{item.label}</span>
                </div>
                <span style={{ color: item.color, fontWeight: 700, fontSize: 14 }}>{formatRp(item.rp)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* INSTRUMENTS */}
      {activeTab === "instruments" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {instruments.map((inst) => (
            <div key={inst.name} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 14, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 26 }}>{inst.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: 15, color: "#f1f5f9" }}>{inst.name}</span>
                </div>
                <span style={{ background: inst.priorityColor + "25", color: inst.priorityColor, padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{inst.priority}</span>
              </div>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>💡 {inst.why}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
                {[
                  { label: "Modal Awal", val: inst.modal },
                  { label: "Platform", val: inst.platform },
                  { label: "Risiko", val: inst.risiko },
                  { label: "Return Est.", val: inst.returnEst },
                ].map(d => (
                  <div key={d.label} style={{ background: "#0f172a", borderRadius: 8, padding: "8px 12px" }}>
                    <div style={{ fontSize: 10, color: "#64748b", marginBottom: 3 }}>{d.label}</div>
                    <div style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 600 }}>{d.val}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, background: "#0f2240", border: "1px solid #3b82f630", borderRadius: 8, padding: "9px 14px", fontSize: 12, color: "#93c5fd" }}>
                ✅ <strong>Aksi Sekarang:</strong> {inst.action}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PROJECTION */}
      {activeTab === "projection" && (
        <div>
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 14, padding: 20, marginBottom: 14 }}>
            <h3 style={{ margin: "0 0 4px", fontSize: 15, color: "#f1f5f9" }}>📈 Proyeksi Pertumbuhan 2026–2030</h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "#64748b" }}>Dengan disiplin menabung & investasi rutin bulanan</p>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={projectionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="year" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={v => `${(v / 1000000).toFixed(0)}jt`} />
                <Tooltip formatter={v => formatRp(v)} labelStyle={{ color: "#f1f5f9" }} contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} />
                <Line type="monotone" dataKey="conservative" name="Konservatif" stroke="#10b981" strokeWidth={2.5} dot={{ r: 5, fill: "#10b981" }} />
                <Line type="monotone" dataKey="moderate" name="Moderat" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 5, fill: "#3b82f6" }} />
                <Line type="monotone" dataKey="aggressive" name="Agresif" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 5, fill: "#f59e0b" }} />
              </LineChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
              {[{ c: "#10b981", l: "Konservatif (Emas+RDPU)" }, { c: "#3b82f6", l: "Moderat (+SBN)" }, { c: "#f59e0b", l: "Agresif (+Saham)" }].map(d => (
                <div key={d.l} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#94a3b8" }}>
                  <div style={{ width: 14, height: 3, background: d.c, borderRadius: 2 }} />{d.l}
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 14, padding: 20 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "#f1f5f9" }}>🗓️ Roadmap Investasi</h3>
            {[
              { period: "Bulan 1–2", color: "#f59e0b", steps: ["Dana Rp 4.5jt tetap sebagai dana darurat (jangan disentuh)", "Alokasikan Rp 700rb ke tabungan emas digital (harga lagi diskon)", "Buka akun Bibit/Bareksa, parkir Rp 800rb di Reksa Dana Pasar Uang"] },
              { period: "Bulan 3–6", color: "#3b82f6", steps: ["Pantau IHSG — jika stabil, mulai DCA saham BBCA/BMRI Rp 100rb/bln", "Sisihkan Rp 200rb/bulan tambah emas rutin", "Pantau penerbitan SBN/SR berikutnya untuk Rp 700rb cadangan"] },
              { period: "Bulan 6–12", color: "#10b981", steps: ["Evaluasi portofolio setiap 3 bulan", "Tingkatkan alokasi investasi seiring kenaikan penghasilan", "Target: total aset >Rp 10 juta di akhir 2026 🎯"] },
            ].map(r => (
              <div key={r.period} style={{ marginBottom: 18, paddingLeft: 16, borderLeft: `3px solid ${r.color}` }}>
                <div style={{ fontWeight: 700, color: r.color, fontSize: 13, marginBottom: 8 }}>{r.period}</div>
                {r.steps.map((s, i) => (
                  <div key={i} style={{ fontSize: 12, color: "#94a3b8", marginBottom: 5, display: "flex", gap: 6 }}>
                    <span style={{ color: r.color }}>→</span> {s}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 16, padding: "10px 16px", background: "#1e293b", borderRadius: 10, fontSize: 11, color: "#475569", textAlign: "center" }}>
        ⚠️ Rekomendasi edukatif, bukan saran finansial profesional. Konsultasikan dengan perencana keuangan bersertifikat (CFP) untuk keputusan besar.
      </div>
    </div>
  );
}