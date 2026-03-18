"""
Dashboard Data Layer — Module 1
================================
Reads a CSV, calls a REST API, shapes data for a frontend dashboard.
Think of this like a set of Oracle views — raw tables in, clean result sets out.
"""

import pandas as pd
import requests
from datetime import datetime


# ── 1. LOAD CSV ──────────────────────────────────────────────────────────────
# pd.read_csv() is your SELECT * FROM csv_file
# parse_dates converts the string column to actual datetime objects (like TO_DATE in Oracle)

df = pd.read_csv("sales.csv", parse_dates=["date"])

print(df.dtypes)       # Like DESCRIBE table — shows column types
print(df.head())       # Like SELECT * ... WHERE ROWNUM <= 5


# ── 2. CLEAN THE DATA ────────────────────────────────────────────────────────
# Drop rows where amount is missing (like DELETE WHERE amount IS NULL — but non-destructive)
df = df.dropna(subset=["amount"])

# Normalize text columns — inconsistent casing breaks GROUP BY logic
df["category"] = df["category"].str.strip().str.title()
df["region"]   = df["region"].str.strip().str.title()

# Add a derived column (like a computed column in Oracle)
df["month"] = df["date"].dt.to_period("M").astype(str)  # e.g. "2024-01"


# ── 3. AGGREGATE — KPI CARDS ─────────────────────────────────────────────────
# These feed the big number cards at the top of the dashboard
# Equivalent to: SELECT SUM(amount), COUNT(*), AVG(amount) FROM sales

kpis = {
    "total_revenue":  round(df["amount"].sum(), 2),
    "total_orders":   int(df["order_id"].nunique()),
    "avg_order_value": round(df["amount"].mean(), 2),
    "top_category":   df.groupby("category")["amount"].sum().idxmax(),
}


# ── 4. AGGREGATE — LINE CHART DATA (revenue over time) ───────────────────────
# Equivalent to: SELECT date, SUM(amount) FROM sales GROUP BY date ORDER BY date
# The frontend chart library expects an array of {x, y} points

revenue_by_date = (
    df.groupby("date")["amount"]
    .sum()
    .reset_index()                          # Turns the GroupBy back into a flat table
    .rename(columns={"date": "x", "amount": "y"})
    .assign(x=lambda d: d["x"].dt.strftime("%Y-%m-%d"))  # Serialize dates to strings
    .to_dict(orient="records")              # → [{"x": "2024-01-03", "y": 149.99}, ...]
)


# ── 5. AGGREGATE — BAR CHART DATA (revenue by category) ─────────────────────
# Equivalent to: SELECT category, SUM(amount) FROM sales GROUP BY category ORDER BY 2 DESC

revenue_by_category = (
    df.groupby("category")["amount"]
    .sum()
    .reset_index()
    .rename(columns={"category": "label", "amount": "value"})
    .sort_values("value", ascending=False)
    .to_dict(orient="records")             # → [{"label": "Electronics", "value": 850.0}, ...]
)


# ── 6. CALL A REST API ───────────────────────────────────────────────────────
# Fetches supplemental data — e.g. FX rates, product catalog, live inventory
# In real projects you'd pass auth headers (Bearer tokens, API keys)

def fetch_exchange_rate(base="USD", target="EUR"):
    """
    Calls a public exchange rate API.
    Returns a float like 0.92, or None on failure.
    Always wrap API calls in try/except — networks are unreliable.
    """
    try:
        url = f"https://api.exchangerate-api.com/v4/latest/{base}"
        response = requests.get(url, timeout=5)  # timeout prevents hanging forever
        response.raise_for_status()              # raises an error on 4xx/5xx HTTP codes
        data = response.json()
        return data["rates"].get(target)
    except requests.RequestException as e:
        print(f"API call failed: {e}")
        return None

eur_rate = fetch_exchange_rate()


# ── 7. ASSEMBLE FINAL PAYLOAD ────────────────────────────────────────────────
# This is the single dict your FastAPI endpoint will return as JSON.
# Structure it to match exactly what your React components expect.

dashboard_data = {
    "generated_at": datetime.utcnow().isoformat(),   # timestamp for cache-busting
    "kpis": kpis,
    "charts": {
        "revenue_over_time":    revenue_by_date,
        "revenue_by_category":  revenue_by_category,
    },
    "meta": {
        "eur_rate": eur_rate,
        "rows_processed": len(df),
    }
}

# In the next module this dict becomes the return value of a FastAPI route:
# @app.get("/api/dashboard") → return dashboard_data

import json
print(json.dumps(dashboard_data, indent=2))
