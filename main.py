"""
Dashboard Backend — Module 6
==============================
Added JWT authentication.
All /api/* routes now require a valid Bearer token.
New endpoints: POST /auth/login, POST /auth/register
"""

from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import psycopg2
import psycopg2.extras
from datetime import datetime

from auth import hash_password, verify_password, create_token, get_current_user


# ── 1. APP + CORS ─────────────────────────────────────────────────────────────
app = FastAPI(title="Sales Dashboard API", version="3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ── 2. DATABASE ───────────────────────────────────────────────────────────────
import os

DATABASE_URL = os.environ.get("DATABASE_URL")

def get_conn():
    return psycopg2.connect(DATABASE_URL)

def get_conn():
    return psycopg2.connect(**DB_CONFIG)


# ── 3. MODELS ─────────────────────────────────────────────────────────────────
class KPIs(BaseModel):
    total_revenue:   float
    total_orders:    int
    avg_order_value: float
    top_category:    str

class DashboardResponse(BaseModel):
    generated_at: str
    kpis:   KPIs
    charts: dict
    meta:   dict

class LoginRequest(BaseModel):
    email:    str
    password: str

class RegisterRequest(BaseModel):
    email:    str
    password: str


# ── 4. WHERE CLAUSE HELPER ────────────────────────────────────────────────────
def build_where(start_date, end_date, region):
    conditions, params = [], []
    if start_date:
        conditions.append("date >= %s")
        params.append(start_date)
    if end_date:
        conditions.append("date <= %s")
        params.append(end_date)
    if region:
        conditions.append("LOWER(region) = LOWER(%s)")
        params.append(region)
    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    return where, params


# ── 5. AUTH ENDPOINTS ─────────────────────────────────────────────────────────

@app.post("/auth/register")
def register(body: RegisterRequest):
    """
    Creates a new user with a hashed password.
    In a real app you'd add email validation and rate limiting.
    """
    conn = None
    try:
        conn = get_conn()
        cur  = conn.cursor()
        cur.execute("SELECT id FROM users WHERE email = %s", (body.email,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")
        hashed = hash_password(body.password)
        cur.execute(
            "INSERT INTO users (email, password) VALUES (%s, %s)",
            (body.email, hashed)
        )
        conn.commit()
        return {"message": "User created successfully"}
    finally:
        if conn:
            conn.close()


@app.post("/auth/login")
def login(body: LoginRequest):
    """
    Verifies credentials and returns a JWT token.
    The React app stores this token and sends it with every subsequent request.
    """
    conn = None
    try:
        conn = get_conn()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT * FROM users WHERE email = %s", (body.email,))
        user = cur.fetchone()

        if not user or not verify_password(body.password, user["password"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        token = create_token({"sub": user["email"]})
        return {"access_token": token, "token_type": "bearer"}
    finally:
        if conn:
            conn.close()


# ── 6. PROTECTED DASHBOARD ENDPOINTS ─────────────────────────────────────────
# Note: user = Depends(get_current_user) is the only addition needed to
# protect a route — FastAPI handles all the token extraction automatically.

@app.get("/api/dashboard", response_model=DashboardResponse)
def get_dashboard(
    start_date: Optional[str] = Query(None),
    end_date:   Optional[str] = Query(None),
    region:     Optional[str] = Query(None),
    user = Depends(get_current_user),          # ← protects this route
):
    where, params = build_where(start_date, end_date, region)
    conn = None
    try:
        conn = get_conn()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute(f"""
            SELECT
                ROUND(SUM(amount)::numeric, 2)  AS total_revenue,
                COUNT(DISTINCT order_id)         AS total_orders,
                ROUND(AVG(amount)::numeric, 2)   AS avg_order_value
            FROM sales {where}
        """, params)
        kpi_row = cur.fetchone()

        if not kpi_row or kpi_row["total_revenue"] is None:
            raise HTTPException(status_code=404, detail="No data for the given filters")

        cur.execute(f"""
            SELECT category FROM sales {where}
            GROUP BY category ORDER BY SUM(amount) DESC LIMIT 1
        """, params)
        top_cat = cur.fetchone()

        kpis = KPIs(
            total_revenue=float(kpi_row["total_revenue"]),
            total_orders=int(kpi_row["total_orders"]),
            avg_order_value=float(kpi_row["avg_order_value"]),
            top_category=top_cat["category"] if top_cat else "N/A",
        )

        cur.execute(f"""
            SELECT TO_CHAR(date, 'YYYY-MM-DD') AS x,
                   ROUND(SUM(amount)::numeric, 2) AS y
            FROM sales {where}
            GROUP BY date ORDER BY date
        """, params)
        revenue_over_time = [dict(r) for r in cur.fetchall()]

        cur.execute(f"""
            SELECT category AS label,
                   ROUND(SUM(amount)::numeric, 2) AS value
            FROM sales {where}
            GROUP BY category ORDER BY value DESC
        """, params)
        revenue_by_category = [dict(r) for r in cur.fetchall()]

        cur.execute(f"SELECT COUNT(*) AS n FROM sales {where}", params)
        row_count = cur.fetchone()["n"]

        return DashboardResponse(
            generated_at=datetime.utcnow().isoformat(),
            kpis=kpis,
            charts={
                "revenue_over_time":   revenue_over_time,
                "revenue_by_category": revenue_by_category,
            },
            meta={"rows_processed": row_count},
        )
    finally:
        if conn:
            conn.close()


@app.get("/api/regions")
def get_regions(user = Depends(get_current_user)):
    conn = None
    try:
        conn = get_conn()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT DISTINCT region FROM sales ORDER BY region")
        return {"regions": [r["region"] for r in cur.fetchall()]}
    finally:
        if conn:
            conn.close()


@app.get("/api/by-region")
def get_by_region(user = Depends(get_current_user)):
    conn = None
    try:
        conn = get_conn()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT region AS label,
                   ROUND(SUM(amount)::numeric, 2) AS value
            FROM sales GROUP BY region ORDER BY value DESC
        """)
        return {"data": [dict(r) for r in cur.fetchall()]}
    finally:
        if conn:
            conn.close()


# ── 7. HEALTH CHECK ───────────────────────────────────────────────────────────
@app.get("/health")
def health():
    try:
        conn = get_conn()
        conn.close()
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "database": str(e)}
