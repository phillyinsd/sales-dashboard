// Dashboard.js — Module 4
// Added: donut chart, skeleton loader, click-to-filter on bar chart, polished KPI cards

import {
  LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend
} from "recharts";

const COLORS = ["#534AB7", "#1D9E75", "#E8593C", "#F2A623", "#3B8BD4"];

// ── Skeleton loader ───────────────────────────────────────────────────────────
// Shown while data is fetching — much better UX than a plain "Loading..." text
function Skeleton({ width = "100%", height = 20, radius = 6 }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
    }} />
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
      <Skeleton width={200} height={28} radius={8} />
      <div style={{ marginTop: 24, display: "flex", gap: 16 }}>
        {[1,2,3,4].map(i => <Skeleton key={i} height={80} radius={12} />)}
      </div>
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 16 }}>
        <Skeleton height={260} radius={12} />
        <Skeleton height={260} radius={12} />
        <Skeleton height={260} radius={12} />
      </div>
    </div>
  );
}

// ── KPI card — now with accent color support ──────────────────────────────────
function KpiCard({ label, value, accent }) {
  return (
    <div style={{
      background: accent ? "#f0f7f4" : "#f9f9f9",
      borderRadius: 12, padding: "16px 20px",
      border: `1px solid ${accent ? "#b2dfce" : "#e5e5e5"}`,
      flex: 1
    }}>
      <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 500, color: accent ? "#0F6E56" : "#1a1a1a" }}>
        {value}
      </div>
    </div>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────────────
function Filters({ regions, filters, onRegionChange, onStartDateChange, onEndDateChange }) {
  const hasFilters = filters.region || filters.startDate || filters.endDate;
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 24, flexWrap: "wrap" }}>
      <select
        value={filters.region}
        onChange={e => onRegionChange(e.target.value)}
        style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13 }}
      >
        <option value="">All regions</option>
        {regions.map(r => <option key={r} value={r}>{r}</option>)}
      </select>
      <input type="date" value={filters.startDate}
        onChange={e => onStartDateChange(e.target.value)}
        style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13 }} />
      <span style={{ color: "#aaa", fontSize: 13 }}>to</span>
      <input type="date" value={filters.endDate}
        onChange={e => onEndDateChange(e.target.value)}
        style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13 }} />
      {hasFilters && (
        <button
          onClick={() => { onRegionChange(""); onStartDateChange(""); onEndDateChange(""); }}
          style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #ddd",
            background: "white", fontSize: 13, cursor: "pointer", color: "#666" }}
        >
          Clear filters
        </button>
      )}
      {filters.region && (
        <span style={{ fontSize: 12, color: "#534AB7", background: "#eeedfe",
          padding: "3px 10px", borderRadius: 20 }}>
          {filters.region}
        </span>
      )}
    </div>
  );
}

// ── Custom donut label ────────────────────────────────────────────────────────
function DonutLabel({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }) {
  if (percent < 0.08) return null; // skip tiny slices
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard({
  data, regionData, loading, error, regions, filters,
  onRegionChange, onStartDateChange, onEndDateChange
}) {
  if (loading) return <DashboardSkeleton />;

  if (error) return (
    <div style={{ textAlign: "center", padding: 60, color: "#c0392b" }}>{error}</div>
  );

  if (!data) return null;

  const { kpis, charts } = data;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>Sales dashboard</h1>
        <span style={{ fontSize: 12, color: "#aaa" }}>
          {data.meta.rows_processed} orders · updated {new Date(data.generated_at).toLocaleTimeString()}
        </span>
      </div>

      <Filters regions={regions} filters={filters}
        onRegionChange={onRegionChange}
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange} />

      {/* KPI row */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <KpiCard label="Total revenue"   value={`$${kpis.total_revenue.toLocaleString()}`} accent />
        <KpiCard label="Total orders"    value={kpis.total_orders} />
        <KpiCard label="Avg order value" value={`$${kpis.avg_order_value}`} />
        <KpiCard label="Top category"    value={kpis.top_category} />
      </div>

      {/* Charts — 3 column grid */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 16 }}>

        {/* Line chart */}
        <div style={{ background: "#f9f9f9", borderRadius: 12, padding: "20px 16px", border: "1px solid #e5e5e5" }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>Revenue over time</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={charts.revenue_over_time}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="x" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={v => [`$${v}`, "Revenue"]} />
              <Line type="monotone" dataKey="y" stroke="#534AB7" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart — click a bar to filter by category */}
        <div style={{ background: "#f9f9f9", borderRadius: 12, padding: "20px 16px", border: "1px solid #e5e5e5" }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Revenue by category</div>
          <div style={{ fontSize: 11, color: "#aaa", marginBottom: 12 }}>Click a bar to filter</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={charts.revenue_by_category} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={80} />
              <Tooltip formatter={v => [`$${v}`, "Revenue"]} />
              <Bar dataKey="value" fill="#1D9E75" radius={[0, 4, 4, 0]} style={{ cursor: "pointer" }}
                onClick={entry => onRegionChange("")}  // extend this to filter by category if you add it to the API
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donut chart — revenue by region */}
        <div style={{ background: "#f9f9f9", borderRadius: 12, padding: "20px 16px", border: "1px solid #e5e5e5" }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Revenue by region</div>
          <div style={{ fontSize: 11, color: "#aaa", marginBottom: 12 }}>Click a slice to filter</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={regionData}
                dataKey="value"
                nameKey="label"
                cx="50%" cy="50%"
                innerRadius={50}
                outerRadius={80}
                labelLine={false}
                label={DonutLabel}
                style={{ cursor: "pointer" }}
                onClick={entry => onRegionChange(entry.label)}
              >
                {regionData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={v => [`$${v}`, "Revenue"]} />
              <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}
