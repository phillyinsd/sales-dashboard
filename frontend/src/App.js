// App.js — Module 6
// Added: token storage, auth headers on every fetch, logout button

import { useState, useEffect } from "react";
import Dashboard from "./Dashboard";
import Login from "./Login";

const API = "https://sales-dashboard-api-vxcy.onrender.com";

export default function App() {
  // Check localStorage for an existing token on page load
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  const [data,       setData]       = useState(null);
  const [regionData, setRegionData] = useState([]);
  const [regions,    setRegions]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  const [region,    setRegion]    = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate,   setEndDate]   = useState("");

  // Helper — adds Authorization header to every request
  function authHeaders() {
    return { "Authorization": `Bearer ${token}` };
  }

  // If token is invalid/expired the API returns 401 — log the user out
  function handleAuthError(res) {
    if (res.status === 401) {
      localStorage.removeItem("token");
      setToken(null);
      return true;
    }
    return false;
  }

  function logout() {
    localStorage.removeItem("token");
    setToken(null);
  }

  // Fetch static data once after login
  useEffect(() => {
    if (!token) return;

    fetch(`${API}/api/regions`, { headers: authHeaders() })
      .then(r => { if (handleAuthError(r)) return; return r.json(); })
      .then(d => d && setRegions(d.regions))
      .catch(() => {});

    fetch(`${API}/api/by-region`, { headers: authHeaders() })
      .then(r => { if (handleAuthError(r)) return; return r.json(); })
      .then(d => d && setRegionData(d.data))
      .catch(() => {});
  }, [token]);

  // Fetch dashboard data when filters change
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (region)    params.append("region", region);
    if (startDate) params.append("start_date", startDate);
    if (endDate)   params.append("end_date", endDate);

    fetch(`${API}/api/dashboard?${params}`, { headers: authHeaders() })
      .then(r => {
        if (handleAuthError(r)) return;
        if (!r.ok) throw new Error("No data for selected filters");
        return r.json();
      })
      .then(d => { if (d) { setData(d); setLoading(false); } })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [token, region, startDate, endDate]);

  // Show login page if no token
  if (!token) {
    return <Login onLogin={t => { setToken(t); }} />;
  }

  return (
    <div style={{ padding: "24px", maxWidth: 1200, margin: "0 auto", fontFamily: "sans-serif" }}>
      {/* Logout button */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button
          onClick={logout}
          style={{
            fontSize: 12, padding: "5px 12px", borderRadius: 8,
            border: "1px solid #ddd", background: "white",
            cursor: "pointer", color: "#666"
          }}
        >
          Sign out
        </button>
      </div>

      <Dashboard
        data={data}
        regionData={regionData}
        loading={loading}
        error={error}
        regions={regions}
        filters={{ region, startDate, endDate }}
        onRegionChange={setRegion}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
      />
    </div>
  );
}
