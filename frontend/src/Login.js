// Login.js — Module 6 (updated)
// Added: password confirmation, minimum password requirements, strength indicator

import { useState } from "react";

const API = "https://sales-dashboard-api-vxcy.onrender.com";

function PasswordStrength({ password }) {
  if (!password) return null;
  const checks = [
    { label: "8+ characters",  pass: password.length >= 8 },
    { label: "Uppercase",      pass: /[A-Z]/.test(password) },
    { label: "Number",         pass: /[0-9]/.test(password) },
    { label: "Special char",   pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.pass).length;
  const color = score <= 1 ? "#e74c3c" : score === 2 ? "#e67e22" : score === 3 ? "#f1c40f" : "#1D9E75";
  const label = score <= 1 ? "Weak" : score === 2 ? "Fair" : score === 3 ? "Good" : "Strong";

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= score ? color : "#eee",
            transition: "background 0.2s"
          }}/>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {checks.map(c => (
            <span key={c.label} style={{
              fontSize: 10, color: c.pass ? "#1D9E75" : "#bbb"
            }}>
              {c.pass ? "✓" : "○"} {c.label}
            </span>
          ))}
        </div>
        <span style={{ fontSize: 11, color, fontWeight: 500 }}>{label}</span>
      </div>
    </div>
  );
}

function validatePassword(password) {
  const errors = [];
  if (password.length < 8)          errors.push("At least 8 characters");
  if (!/[A-Z]/.test(password))      errors.push("One uppercase letter");
  if (!/[0-9]/.test(password))      errors.push("One number");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("One special character");
  return errors;
}

export default function Login({ onLogin }) {
  const [email,           setEmail]           = useState("");
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error,           setError]           = useState(null);
  const [loading,         setLoading]         = useState(false);
  const [mode,            setMode]            = useState("login");
  const [showPassword,    setShowPassword]    = useState(false);

  function validate() {
    if (!email.includes("@")) {
      setError("Please enter a valid email address"); return false;
    }
    if (mode === "register") {
      const pwErrors = validatePassword(password);
      if (pwErrors.length > 0) {
        setError("Password must have: " + pwErrors.join(", ")); return false;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match"); return false;
      }
    }
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    setLoading(true);
    const endpoint = mode === "login" ? "/auth/login" : "/auth/register";

    try {
      const res = await fetch(`${API}${endpoint}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Something went wrong");

      if (mode === "register") {
        setMode("login");
        setPassword("");
        setConfirmPassword("");
        setError(null);
        alert("Account created! Please sign in.");
      } else {
        localStorage.setItem("token", data.access_token);
        onLogin(data.access_token);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: "1px solid #ddd", fontSize: 14, boxSizing: "border-box"
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#f5f5f5", fontFamily: "sans-serif"
    }}>
      <div style={{
        background: "white", borderRadius: 16, padding: "40px 36px",
        width: 380, boxShadow: "0 2px 24px rgba(0,0,0,0.08)"
      }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 500, color: "#1a1a1a" }}>
            {mode === "login" ? "Sign in" : "Create account"}
          </div>
          <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>Sales dashboard</div>
        </div>

        {error && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8,
            padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#c0392b"
          }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Email */}
          <div>
            <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>Email</label>
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={inputStyle}
            />
          </div>

          {/* Password */}
          <div>
            <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ ...inputStyle, paddingRight: 44 }}
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  cursor: "pointer", fontSize: 12, color: "#888", userSelect: "none"
                }}
              >
                {showPassword ? "Hide" : "Show"}
              </span>
            </div>
            {mode === "register" && <PasswordStrength password={password} />}
          </div>

          {/* Confirm password — register only */}
          {mode === "register" && (
            <div>
              <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>
                Confirm password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  ...inputStyle,
                  borderColor: confirmPassword && confirmPassword !== password ? "#fecaca" : "#ddd"
                }}
              />
              {confirmPassword && confirmPassword !== password && (
                <div style={{ fontSize: 11, color: "#e74c3c", marginTop: 4 }}>
                  Passwords do not match
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !email || !password || (mode === "register" && !confirmPassword)}
            style={{
              marginTop: 4, padding: "10px", borderRadius: 8,
              background: loading ? "#9b97d4" : "#534AB7",
              color: "white", border: "none", fontSize: 14,
              fontWeight: 500, cursor: loading ? "default" : "pointer",
            }}
          >
            {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </div>

        <div style={{ marginTop: 20, textAlign: "center", fontSize: 13, color: "#888" }}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <span
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); setPassword(""); setConfirmPassword(""); }}
            style={{ color: "#534AB7", cursor: "pointer", fontWeight: 500 }}
          >
            {mode === "login" ? "Register" : "Sign in"}
          </span>
        </div>
      </div>
    </div>
  );
}
