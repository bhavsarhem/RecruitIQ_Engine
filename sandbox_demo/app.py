# -*- coding: utf-8 -*-
"""
app.py — RecruitIQ Candidate Intelligence Platform
Premium dark-mode UI. Production grade.
"""
from __future__ import annotations
import csv, io, json, re, sys, time
from pathlib import Path

import streamlit as st

_APP_DIR   = Path(__file__).parent
_REPO_ROOT = _APP_DIR.parent
sys.path.insert(0, str(_REPO_ROOT))

# ── Pipeline imports ──────────────────────────────────────────────────────────
_PIPELINE_ERROR = None
try:
    from ranker.honeypot_filter import is_honeypot
    from ranker.scorer import count_ai_core_skills, feature_vector, top_matched_skills, weighted_score
    from ranker.explainer import generate_reasoning
except Exception as ie:
    _PIPELINE_ERROR = str(ie)

# ── Favicon ───────────────────────────────────────────────────────────────────
def _favicon():
    try:
        from PIL import Image
        p = _APP_DIR / "favicon.png"
        if p.exists(): return Image.open(p)
    except Exception: pass
    return "🔍"

st.set_page_config(
    page_title="RecruitIQ — Candidate Intelligence",
    page_icon=_favicon(),
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ═══════════════════════════════════════════════════════════════════════════════
# DESIGN SYSTEM
# ═══════════════════════════════════════════════════════════════════════════════
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=JetBrains+Mono:wght@500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');

/* --- Reset & Core --- */
:root {
  --bg: #030508;
  --surface: rgba(10, 14, 22, 0.75);
  --surface-hover: rgba(16, 22, 35, 0.88);
  --surface-2: #070a0f;
  --surface-3: #121824;
  --border: rgba(255, 255, 255, 0.05);
  --border-hover: rgba(255, 255, 255, 0.12);
  --border-focus: rgba(99, 102, 241, 0.6);
  --accent: #6366f1;
  --accent-glow: rgba(99, 102, 241, 0.2);
  --accent-gradient: linear-gradient(135deg, #6366f1, #a855f7);
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --text-muted: #475569;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
}

*, *::before, *::after { box-sizing: border-box; }
html, body, [class*="css"], .stApp {
  font-family: 'Inter', sans-serif !important;
  background-color: var(--bg) !important;
  background-image:
    radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.08) 0px, transparent 50%),
    radial-gradient(at 100% 0%, rgba(168, 85, 247, 0.06) 0px, transparent 50%),
    radial-gradient(at 50% 100%, rgba(6, 182, 212, 0.04) 0px, transparent 50%) !important;
  background-attachment: fixed !important;
  color: var(--text-primary) !important;
}

h1, h2, h3, h4, h5, h6, .topbar-title, .section-title {
  font-family: 'Plus Jakarta Sans', sans-serif !important;
  color: var(--text-primary) !important;
  letter-spacing: -0.02em !important;
}

.c-id, .circle-text, .m-value, .score-num, .sig-v, .cmap td, .sec-hdr-count, .terminal-dots {
  font-family: 'JetBrains Mono', monospace !important;
}

/* Hide Streamlit Sidebar & Header elements */
section[data-testid="stSidebar"] {
  display: none !important;
}
[data-testid="collapsedControl"] {
  display: none !important;
}
#MainMenu, footer, header {
  visibility: hidden;
  height: 0;
  padding: 0;
}

.block-container {
  padding: 2rem 3rem 4rem !important;
  max-width: 1550px !important;
  margin: 0 auto !important;
}

/* --- Top Header / Branding --- */
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1.5rem;
  margin-bottom: 1.8rem;
  border-bottom: 1px solid var(--border);
}
.logo-area {
  display: flex;
  align-items: center;
  gap: 14px;
}
.logo-badge {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--accent-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
}
.topbar-title {
  font-size: 1.65rem;
  font-weight: 800;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 !important;
}
.topbar-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
}
.topbar-status {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.2);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #34d399;
}
.pulse-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
  animation: pulse-ring 1.6s infinite;
}
@keyframes pulse-ring {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

/* --- Vercel Tab Style Overrides --- */
div[data-testid="stTabs"] {
  background: rgba(10, 14, 22, 0.5) !important;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border) !important;
  border-radius: 16px !important;
  padding: 8px !important;
  margin-bottom: 2rem !important;
}
div[data-testid="stTabs"] [role="tablist"] {
  gap: 6px !important;
  border-bottom: none !important;
}
div[data-testid="stTabs"] [role="tab"] {
  font-family: 'Plus Jakarta Sans', sans-serif !important;
  font-size: 0.82rem !important;
  font-weight: 700 !important;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary) !important;
  border-radius: 10px !important;
  padding: 10px 20px !important;
  border: none !important;
  background: transparent !important;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
}
div[data-testid="stTabs"] [role="tab"]:hover {
  color: var(--text-primary) !important;
  background: rgba(255, 255, 255, 0.03) !important;
}
div[data-testid="stTabs"] [role="tabpanel"] {
  background: transparent !important;
  padding: 1rem 0 0 0 !important;
}
div[data-testid="stTabs"] [role="tab"][aria-selected="true"] {
  background: var(--accent-gradient) !important;
  color: #ffffff !important;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3) !important;
}

/* --- Section Containers --- */
.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 1.5rem;
}
.section-num {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: var(--accent-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 800;
  color: #fff;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}
.section-title {
  font-size: 1.25rem;
  font-weight: 750;
  color: var(--text-primary);
}
.section-subtitle {
  font-size: 0.82rem;
  color: var(--text-secondary);
}

/* --- Drag & Drop visual wrapper --- */
.custom-uploader-wrapper {
  background: rgba(13, 17, 24, 0.45);
  border: 1px dashed rgba(99, 102, 241, 0.3);
  border-radius: 16px;
  padding: 2.2rem 1.5rem;
  margin-bottom: 1.25rem;
  text-align: center;
  position: relative;
  transition: all 0.3s ease;
}
.custom-uploader-wrapper:hover {
  border-color: rgba(99, 102, 241, 0.7);
  background: rgba(99, 102, 241, 0.03);
}
.up-graphic {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.up-icon {
  font-size: 2.8rem;
  background: linear-gradient(135deg, #a5b4fc, #c084fc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: pulse-glow 2.5s infinite alternate;
}
@keyframes pulse-glow {
  0% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(99, 102, 241, 0.2)); }
  100% { transform: scale(1.05); filter: drop-shadow(0 0 10px rgba(99, 102, 241, 0.6)); }
}
.up-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
}
.up-subtitle {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

/* Hide default file uploader layouts and style widget */
[data-testid="stFileUploader"] {
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
}
[data-testid="stFileUploader"] section {
  background: rgba(255, 255, 255, 0.01) !important;
  border: 1px dashed rgba(99, 102, 241, 0.25) !important;
  border-radius: 12px !important;
  padding: 1.2rem !important;
  transition: all 0.2s ease !important;
}
[data-testid="stFileUploader"] section:hover {
  border-color: rgba(99, 102, 241, 0.6) !important;
  background: rgba(99, 102, 241, 0.03) !important;
}
[data-testid="stFileUploader"] section [data-testid="stMarkdownContainer"] p {
  color: var(--text-secondary) !important;
  font-size: 0.78rem !important;
}
[data-testid="stFileUploader"] section button {
  background: var(--accent-gradient) !important;
  color: #fff !important;
  border: none !important;
  font-weight: 600 !important;
  font-size: 0.78rem !important;
  padding: 6px 14px !important;
  border-radius: 8px !important;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2) !important;
}

/* Uploader mapping table */
.cmap {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border);
}
.cmap th {
  padding: 8px 12px;
  text-align: left;
  font-size: 0.7rem;
  text-transform: uppercase;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
}
.cmap td {
  padding: 8px 12px;
  font-size: 0.78rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.02);
}
.cmap td.ok { color: var(--success); font-weight: 600; }
.cmap td.na { color: var(--text-muted); }

/* --- KPI Metric Cards --- */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 2rem;
}
@media (max-width: 1200px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .kpi-grid { grid-template-columns: 1fr; } }

.kpi-tile {
  background: var(--surface) !important;
  backdrop-filter: blur(16px) !important;
  -webkit-backdrop-filter: blur(16px) !important;
  border: 1px solid var(--border) !important;
  border-radius: 20px;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
}
.kpi-tile:hover {
  transform: translateY(-4px) !important;
  border-color: rgba(255, 255, 255, 0.1) !important;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5) !important;
}
.kpi-tile::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  opacity: 0.6;
  transition: opacity 0.3s;
}
.kpi-tile:hover::after { opacity: 1; }
.kpi-tile.t-blue::after  { background: linear-gradient(90deg, #3b82f6, #8b5cf6); }
.kpi-tile.t-amber::after { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.kpi-tile.t-green::after { background: linear-gradient(90deg, #10b981, #34d399); }
.kpi-tile.t-cyan::after  { background: linear-gradient(90deg, #06b6d4, #22d3ee); }
.kpi-icon { font-size: 1.75rem; margin-bottom: 0.5rem; }
.kpi-value { font-size: 2.4rem; font-weight: 800; color: var(--text-primary); letter-spacing: -1px; font-family: 'Plus Jakarta Sans', sans-serif; }
.kpi-label { font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 6px; }
.kpi-sub { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }

/* --- Candidate Grid and Interactive Cards --- */
.candidate-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 20px;
  margin-top: 1rem;
}

.ccard {
  background: rgba(10, 14, 22, 0.6) !important;
  backdrop-filter: blur(16px) !important;
  -webkit-backdrop-filter: blur(16px) !important;
  border: 1px solid var(--border) !important;
  border-radius: 20px;
  padding: 1.6rem;
  position: relative;
  display: flex;
  flex-direction: column;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}
.ccard:hover {
  transform: translateY(-6px) scale(1.01) !important;
  border-color: rgba(99, 102, 241, 0.35) !important;
  box-shadow: 
    0 20px 40px rgba(0, 0, 0, 0.5),
    0 0 25px rgba(99, 102, 241, 0.12) !important;
}

.ccard::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  border-radius: 20px 20px 0 0;
}
.ccard.r1::before  { background: linear-gradient(90deg, #fbbf24, #f59e0b); }
.ccard.r2::before  { background: linear-gradient(90deg, #cbd5e1, #94a3b8); }
.ccard.r3::before  { background: linear-gradient(90deg, #d97706, #b45309); }
.ccard.rtop::before { background: var(--accent-gradient); }
.ccard.rmid::before { background: linear-gradient(90deg, #10b981, #059669); }
.ccard.rlow::before { background: linear-gradient(90deg, #475569, #334155); }

.ccard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.25rem;
  gap: 12px;
}
.ccard-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.rank-badge {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
}
.rc-1 { background: linear-gradient(135deg, #fbbf24, #f59e0b); box-shadow: 0 4px 12px rgba(251,191,36,0.3); }
.rc-2 { background: linear-gradient(135deg, #cbd5e1, #94a3b8); box-shadow: 0 4px 12px rgba(148,163,184,0.2); }
.rc-3 { background: linear-gradient(135deg, #d97706, #b45309); box-shadow: 0 4px 12px rgba(217,119,6,0.25); }
.rc-top { background: var(--accent-gradient); box-shadow: 0 4px 12px rgba(99,102,241,0.3); }
.rc-mid { background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 4px 12px rgba(16,185,129,0.2); }
.rc-low { background: var(--surface-3); color: var(--text-secondary); }

/* SVG Circular Gauge */
.score-circle-wrapper {
  flex-shrink: 0; display: flex; justify-content: center; align-items: center;
}
.score-circle { transform: rotate(-90deg); }
.circle-fg { transition: stroke-dasharray 0.8s ease; }
.circle-text {
  transform: rotate(90deg); transform-origin: center;
  font-family: 'JetBrains Mono', monospace !important;
}

.ccard-body {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.ccard-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.4rem;
  line-height: 1.35;
  font-family: 'Plus Jakarta Sans', sans-serif !important;
}
.ccard-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--text-secondary);
}
.meta-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--text-muted);
}

.ccard-skills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 1.25rem;
  min-height: 56px;
  align-content: flex-start;
}
.chip {
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 600;
  border: 1px solid rgba(99, 102, 241, 0.18);
  background: rgba(99, 102, 241, 0.05);
  color: #a5b4fc;
}
.chip.matched {
  border-color: rgba(16, 185, 129, 0.28);
  background: rgba(16, 185, 129, 0.08);
  color: #34d399;
}
.chip.ai {
  border-color: rgba(168, 85, 247, 0.28);
  background: rgba(168, 85, 247, 0.08);
  color: #c084fc;
}

.ccard-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 1.25rem;
  padding: 12px 14px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 12px;
  border: 1px solid var(--border);
}
.metric-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.metric-item .m-label {
  font-size: 0.65rem;
  color: var(--text-muted);
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.metric-item .m-value {
  font-size: 0.85rem;
  color: var(--text-primary);
  font-weight: 700;
}

.ccard-otw {
  margin-bottom: 1.25rem;
}
.otw-badge {
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 0.72rem;
  font-weight: 700;
  border: 1px solid;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.otw-yes {
  border-color: rgba(16, 185, 129, 0.25);
  background: rgba(16, 185, 129, 0.08);
  color: #34d399;
}
.otw-no {
  border-color: var(--border);
  background: rgba(255, 255, 255, 0.02);
  color: var(--text-secondary);
}

/* macOS Reasoning Terminal Console */
.ccard-reason {
  margin-top: auto;
  background: #05070a !important;
  border: 1px solid rgba(255, 255, 255, 0.03) !important;
  border-radius: 12px !important;
  padding: 14px !important;
  font-size: 0.76rem !important;
  line-height: 1.55 !important;
  color: var(--text-secondary) !important;
}
.reason-hdr {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.terminal-dots {
  display: flex;
  gap: 6px;
}
.tdot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
}
.td-r { background: #ef4444; }
.td-y { background: #f59e0b; }
.td-g { background: #10b981; }
.reason-title {
  font-size: 0.68rem !important;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 4px;
}
.reason-text {
  font-family: 'Inter', sans-serif !important;
  font-style: italic;
  color: #cbd5e1;
}

/* --- Segment Headers --- */
.sec-hdr {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 1.5rem;
  padding-bottom: 0.8rem;
  border-bottom: 1px solid var(--border);
}
.sec-hdr h2 {
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--text-primary);
  font-family: 'Plus Jakarta Sans', sans-serif;
  margin: 0 !important;
}
.sec-hdr-count {
  font-size: 0.78rem;
  font-weight: 700;
  padding: 3px 12px;
  border-radius: 20px;
  background: rgba(99, 102, 241, 0.15);
  color: #a5b4fc;
  border: 1px solid rgba(99, 102, 241, 0.25);
}
.sec-hdr-meta {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin-left: auto;
}

/* Anomaly grid */
.hp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
}
.hp-card {
  background: rgba(239, 68, 68, 0.02);
  border: 1px solid rgba(239, 68, 68, 0.12);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.hp-id {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-primary);
}
.hp-title {
  font-size: 0.78rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hp-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}
.hp-tag {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 20px;
  background: rgba(239, 68, 68, 0.08);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.15);
}

/* Skill pills for JD view */
.jd-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.jd-pill {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
  background: rgba(99, 102, 241, 0.08);
  color: #a5b4fc;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

/* Empty placeholder styling */
.empty-state {
  text-align: center;
  padding: 6.5rem 2rem;
  background: rgba(13, 17, 24, 0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: 20px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
  max-width: 620px;
  margin: 3rem auto;
}
.empty-state-icon {
  font-size: 4rem;
  margin-bottom: 1.25rem;
  animation: float-anim 3s ease-in-out infinite;
}
@keyframes float-anim {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
  100% { transform: translateY(0px); }
}
.empty-state-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}
.empty-state-subtitle {
  font-size: 0.88rem;
  color: var(--text-secondary);
  line-height: 1.6;
  max-width: 440px;
  margin: 0 auto;
}

/* Streamlit Input Overrides */
input, textarea, select, [data-testid="stNumberInput"] input {
  background: var(--surface-2) !important;
  border: 1px solid var(--border) !important;
  color: var(--text-primary) !important;
  border-radius: 12px !important;
  padding: 12px 16px !important;
  font-size: 0.88rem !important;
  transition: all 0.2s ease !important;
}
input:focus, textarea:focus, select:focus {
  border-color: var(--border-focus) !important;
  box-shadow: 0 0 0 3px var(--accent-glow) !important;
}

/* Custom styled sliders */
[data-testid="stSlider"] [data-testid="stSliderTrack"] {
  background: var(--surface-3) !important;
}
[data-testid="stSlider"] [data-testid="stSliderThumb"] {
  background: var(--accent) !important;
  border: 2px solid #ffffff !important;
}

/* Buttons overrides */
.stDownloadButton > button, .stButton > button {
  background: var(--accent-gradient) !important;
  color: #fff !important;
  border: none !important;
  border-radius: 12px !important;
  font-weight: 700 !important;
  font-size: 0.88rem !important;
  padding: 10px 20px !important;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.25) !important;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
}
.stDownloadButton > button:hover, .stButton > button:hover {
  transform: translateY(-2px) !important;
  box-shadow: 
    0 8px 20px rgba(99, 102, 241, 0.35),
    0 0 12px rgba(99, 102, 241, 0.2) !important;
}

</style>
""", unsafe_allow_html=True)

# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════
def _safe(d, *keys, default=None):
    cur = d
    for k in keys:
        if not isinstance(cur, dict): return default
        cur = cur.get(k)
        if cur is None: return default
    return cur if cur is not None else default

def _pct(v, fb="—"):
    try: return f"{float(v):.0%}"
    except: return fb

def _score_color(s):
    if s >= 0.70: return "#34d399"
    if s >= 0.45: return "#fbbf24"
    return "#f87171"

def _rank_css(r):
    if r == 1: return ("r1","rc-1")
    if r == 2: return ("r2","rc-2")
    if r == 3: return ("r3","rc-3")
    if r <= 10: return ("rtop","rc-top")
    if r <= 30: return ("rmid","rc-mid")
    return ("rlow","rc-low")

# ── Skill extraction from JD text ─────────────────────────────────────────────
_VOCAB = sorted([
    "python","java","javascript","typescript","golang","rust","scala","kotlin","swift","c++","c#",
    "sql","nosql","mongodb","postgresql","mysql","redis","cassandra","bigquery",
    "pytorch","tensorflow","keras","scikit-learn","xgboost","lightgbm","catboost",
    "transformers","hugging face","bert","gpt","llm","large language model",
    "embeddings","sentence transformers","faiss","pinecone","weaviate","qdrant","milvus",
    "opensearch","elasticsearch","vector database","vector search","semantic search",
    "retrieval","information retrieval","ranking","learning to rank","ltr","ndcg","mrr",
    "recommendation","recommendation system","nlp","natural language processing",
    "fine-tuning","lora","qlora","peft","rag","retrieval augmented generation",
    "mlops","model evaluation","a/b testing","ab testing","deep learning","machine learning",
    "computer vision","generative ai","diffusion models","reinforcement learning",
    "docker","kubernetes","aws","gcp","azure","spark","kafka","airflow","dbt",
    "react","node.js","django","fastapi","flask","rest api","graphql","microservices",
    "feature engineering","model training","model serving","data engineering","data science",
    "langchain","openai","anthropic","ray","mlflow","wandb","vertex ai","sagemaker",
    "ci/cd","git","agile","scrum",
], key=len, reverse=True)

def extract_skills(text: str) -> list[str]:
    t = text.lower()
    found, seen = [], set()
    for sk in _VOCAB:
        if re.search(r'\b' + re.escape(sk) + r'\b', t):
            words = set(sk.split())
            if not words & seen:
                found.append(sk)
                seen.update(words)
    return found[:35]

# ── CSV/Excel ─────────────────────────────────────────────────────────────────
_CMAP = {
    "candidate_id":"candidate_id","id":"candidate_id",
    "current_title":"current_title","title":"current_title","job_title":"current_title",
    "years_of_experience":"yoe","yoe":"yoe","experience_years":"yoe","experience":"yoe",
    "current_company":"company","company":"company","employer":"company",
    "location":"location","city":"location",
    "country":"country",
    "skills":"skills","skill_list":"skills","technologies":"skills","tech_stack":"skills",
    "recruiter_response_rate":"rrr","response_rate":"rrr",
    "notice_period_days":"notice","notice_period":"notice","notice":"notice",
    "open_to_work":"otw","open_to_work_flag":"otw",
    "github_activity_score":"github","github_score":"github",
    "profile_completeness_score":"completeness","profile_completeness":"completeness",
    "last_active_date":"last_active","last_active":"last_active",
}
def _cbool(v):
    if isinstance(v,bool): return v
    if isinstance(v,(int,float)): return bool(v)
    if isinstance(v,str): return v.strip().lower() in ("true","yes","1","y")
    return False
def _cfloat(v, d=0.0):
    try: return float(v)
    except: return d

def _row_to_cand(row:dict, dc:dict) -> dict:
    m = {}
    for col,val in row.items():
        can = dc.get(col.lower().strip(),"")
        if can: m[can] = "" if val is None else str(val)
    skills = [{"name":s.strip(),"proficiency":"intermediate","duration_months":12,"endorsements":0}
               for s in re.split(r"[,;|]", m.get("skills","")) if s.strip()]
    return {
        "candidate_id": m.get("candidate_id","") or f"ROW_{id(row)}",
        "profile": {
            "current_title":   m.get("current_title","—"),
            "current_company": m.get("company","—"),
            "location":        m.get("location","—"),
            "country":         m.get("country",""),
            "years_of_experience": _cfloat(m.get("yoe",0)),
        },
        "skills": skills, "career_history": [], "education": [], "certifications": [],
        "redrob_signals": {
            "recruiter_response_rate":    _cfloat(m.get("rrr",0.5)),
            "notice_period_days":         int(_cfloat(m.get("notice",90))),
            "open_to_work_flag":          _cbool(m.get("otw",False)),
            "github_activity_score":      _cfloat(m.get("github",-1)),
            "profile_completeness_score": _cfloat(m.get("completeness",50)),
            "last_active_date":           m.get("last_active",""),
            "willing_to_relocate":False,"verified_email":False,
            "verified_phone":False,"linkedin_connected":False,"connection_count":0,
        },
    }

def _detect_cols(headers): return {h.lower().strip(): _CMAP[h.lower().strip()] for h in headers if h.lower().strip() in _CMAP}

def parse_upload(raw:bytes, name:str):
    import pandas as pd
    df = pd.read_excel(io.BytesIO(raw)) if name.endswith((".xlsx",".xls")) else pd.read_csv(io.BytesIO(raw))
    df = df.where(df.notna(), None)
    dc = _detect_cols(list(df.columns))
    return [_row_to_cand(r, dc) for r in df.to_dict(orient="records")], dc, list(df.columns)

@st.cache_data(show_spinner=False)
def run_pipeline(j: str, n: int):
    cands = json.loads(j)
    t0 = time.perf_counter()
    results, hp_n = [], 0
    for c in cands:
        if not isinstance(c, dict): continue
        try: fl, rs = is_honeypot(c)
        except: fl, rs = False, []
        feats={}; score=0.0; aic=0; tsk=[]
        try: feats = feature_vector(c)
        except: pass
        try: score = weighted_score(feats)
        except: pass
        try: aic   = count_ai_core_skills(c)
        except: pass
        try: tsk   = top_matched_skills(c, n=5)
        except: pass
        results.append({"c":c,"f":feats,"score":score,"ai":aic,"skills":tsk,"hp":fl,"hpr":rs})
        if fl: hp_n += 1
    non_hp = sorted([r for r in results if not r["hp"]],
                    key=lambda x: (-round(x["score"],6), x["c"].get("candidate_id","")))
    hp_l = [r for r in results if r["hp"]]
    ranked = []
    for pos, r in enumerate(non_hp[:n], 1):
        r["rank"] = pos
        try:
            r["reason"] = generate_reasoning(
                candidate=r["c"], features=r["f"], score=r["score"],
                rank=pos, ai_core_count=r["ai"], top_skills=r["skills"])
        except: r["reason"] = "Ranking analysis unavailable."
        ranked.append(r)
    return ranked, hp_l, hp_n, (time.perf_counter()-t0)*1000

# ═══════════════════════════════════════════════════════════════════════════════
# STATE MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════
if "candidates" not in st.session_state:
    st.session_state.candidates = []

if "mapped_cols" not in st.session_state:
    st.session_state.mapped_cols = {}

if "raw_headers" not in st.session_state:
    st.session_state.raw_headers = []

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN INTERFACE (SPA TABS)
# ═══════════════════════════════════════════════════════════════════════════════
# ── Top Navbar (Branding + Status) ────────────────────────────────────────────
st.markdown("""
<div class="topbar">
  <div class="logo-area">
    <div class="logo-badge">🔍</div>
    <div>
      <h1 class="topbar-title">RecruitIQ Engine</h1>
      <div class="topbar-desc">Enterprise Candidate Fit Intelligence & Neural Scoring</div>
    </div>
  </div>
  <div class="topbar-status">
    <span class="pulse-dot"></span>
    Pipeline Active V1.4
  </div>
</div>
""", unsafe_allow_html=True)

# ── SPA Tab Router ────────────────────────────────────────────────────────────
tab_setup, tab_dashboard, tab_security, tab_export = st.tabs([
    "⚡ SETUP & CONFIGURATION",
    "📊 FIT SCORES DASHBOARD",
    "🛡️ SECURITY & ANOMALIES",
    "💾 EXPORT WORKSPACE"
])

# ── 1. SETUP & CONFIGURATION ──────────────────────────────────────────────────
with tab_setup:
    col_left, col_right = st.columns([1, 1], gap="large")
    
    with col_left:
        st.markdown("""
        <div class="section-header">
          <div class="section-num">1</div>
          <div>
            <div class="section-title">Job Specification Target</div>
            <div class="section-subtitle">Define candidate screening requirements</div>
          </div>
        </div>
        """, unsafe_allow_html=True)
        
        job_title = st.text_input("Target Job Title", "Senior AI / ML Engineer")
        jd_location = st.text_input("Target Match Locations", "Bangalore · Pune · Noida · Hyderabad · Remote")
        
        yoe_c1, yoe_c2 = st.columns([1, 1])
        with yoe_c1:
            yoe_min = st.number_input("Minimum Experience (Years Required)", 0, 30, 5)
        with yoe_c2:
            yoe_max = st.number_input("Maximum Experience (Years Target)", 0, 40, 9)
            
        jd_text = st.text_area(
            "Job Description Context Text",
            height=210,
            placeholder="Paste the job description context text here…",
            value=(
                "We are hiring a Senior AI/ML Engineer. You will design and scale our "
                "candidate ranking and recommendation systems. Required: Python, PyTorch, "
                "embeddings, FAISS, vector databases, NLP, LLMs, RAG, fine-tuning, LightGBM, "
                "information retrieval, ranking evaluation (NDCG, MRR), A/B testing, MLOps. "
                "5–9 years in product companies. Locations: Bangalore, Pune, Noida, Hyderabad."
            ),
        )
        
        jd_skills = extract_skills(jd_text)
        st.markdown(f"**{len(jd_skills)} Auto-Detected System Taxonomy Skills:**", help="Skills extracted match the built-in system vocabularies.")
        if jd_skills:
            pills = "".join(f'<span class="jd-pill">{s}</span>' for s in jd_skills)
            st.markdown(f'<div class="jd-pills">{pills}</div>', unsafe_allow_html=True)
        else:
            st.caption("Paste a job description to extract skills.")
            
    with col_right:
        st.markdown("""
        <div class="section-header">
          <div class="section-num">2</div>
          <div>
            <div class="section-title">Candidate Pool & Scoring Tuners</div>
            <div class="section-subtitle">Manage uploaded profile records & adjust thresholds</div>
          </div>
        </div>
        """, unsafe_allow_html=True)
        
        st.markdown("##### ⚙️ Threshold Scoring Rules")
        top_n = st.slider("Max Candidates Ranked & Shown", 5, 100, 20, 5)
        min_score = st.slider("Minimum Fit Score Cut-Off", 0.0, 1.0, 0.0, 0.05)
        
        st.write("---")
        st.markdown("##### 📥 Populate Candidate Pool")
        
        # Loader tab selection
        load_tabs = st.tabs(["📁 Upload File", "📋 Load Sample Data"])
        
        with load_tabs[0]:
            st.markdown("""
            <div class="custom-uploader-wrapper">
              <div class="up-graphic">
                <span class="up-icon">📥</span>
                <span class="up-title">Drag & drop candidate spreadsheet</span>
                <span class="up-subtitle">Supports JSON, CSV, or Excel formats</span>
              </div>
            </div>
            """, unsafe_allow_html=True)

            fmt = st.radio("Upload Format Mode", ["JSON", "CSV", "Excel"], horizontal=True, label_visibility="collapsed")
            ext = {"JSON":["json"],"CSV":["csv"],"Excel":["xlsx","xls"]}[fmt]
            
            up = st.file_uploader("Drop candidate pool file here", type=ext, label_visibility="collapsed")
            if up:
                raw = up.read()
                if fmt == "JSON":
                    try:
                        raw_j = json.loads(raw)
                        st.session_state.candidates = raw_j if isinstance(raw_j, list) else [raw_j]
                        st.session_state.mapped_cols = {}
                        st.session_state.raw_headers = []
                        st.toast(f"✅ Loaded {len(st.session_state.candidates)} JSON candidate nodes.")
                    except Exception as e:
                        st.error(f"JSON parse error: {e}")
                else:
                    try:
                        candidates, dc, hdr = parse_upload(raw, up.name)
                        st.session_state.candidates = candidates
                        st.session_state.mapped_cols = dc
                        st.session_state.raw_headers = hdr
                        st.toast(f"✅ Parsed {len(candidates)} candidates from file.")
                    except Exception as e:
                        st.error(f"Failed to parse spreadsheet file: {e}")
                        
            # Render mapping if columns were parsed
            if st.session_state.mapped_cols:
                all_canon = sorted(set(_CMAP.values()))
                rows = ""
                for c in all_canon:
                    mc = next((h for h in st.session_state.raw_headers if _CMAP.get(h.lower().strip()) == c), None)
                    rows += f"<tr><td>{c}</td><td class='{'ok' if mc else 'na'}'>{mc or '—'}</td></tr>"
                st.markdown(f'<table class="cmap"><tr><th>Canonical Field</th><th>Source Mapped Header</th></tr>{rows}</table>', unsafe_allow_html=True)
                
            # CSV Download Template helper
            st.write("")
            _tcols = ["candidate_id","current_title","years_of_experience","current_company",
                      "location","country","skills","recruiter_response_rate","notice_period_days",
                      "open_to_work","github_activity_score","profile_completeness_score"]
            _tbuf = io.StringIO()
            _tw = csv.writer(_tbuf)
            _tw.writerow(_tcols)
            _tw.writerow(["C001","ML Engineer",6.5,"TechCorp","Bangalore","India",
                          "Python,PyTorch,NLP,RAG",0.75,30,True,72,85])
            st.download_button("⬇️ Download CSV Template Headers", _tbuf.getvalue().encode(),
                               "candidates_template.csv","text/csv", use_container_width=True)

        with load_tabs[1]:
            st.markdown("<p style='font-size:0.85rem;color:var(--text-secondary);margin-bottom:1rem;'>Click the button below to load 100 sample candidates with realistic backgrounds, experiences, responses, and skills.</p>", unsafe_allow_html=True)
            if st.button("⚡ Load Built-in Sandbox Sample Dataset", use_container_width=True):
                sp = [
                    _REPO_ROOT.parent / "[PUB] India_runs_data_and_ai_challenge" / "India_runs_data_and_ai_challenge" / "sample_candidates.json",
                    _REPO_ROOT / "[PUB] India_runs_data_and_ai_challenge" / "India_runs_data_and_ai_challenge" / "sample_candidates.json",
                    Path("sample_candidates.json"),
                    _APP_DIR / "sample_candidates.json",
                    _REPO_ROOT / "sample_candidates.json"
                ]
                sample_found = False
                for p in sp:
                    if p.exists():
                        try:
                            with open(p, encoding="utf-8") as fh:
                                st.session_state.candidates = json.load(fh)
                            st.session_state.mapped_cols = {}
                            st.session_state.raw_headers = []
                            st.toast("✅ Loaded sandbox dataset successfully.")
                            sample_found = True
                        except Exception as e:
                            st.error(f"Error loading sample dataset: {e}")
                        break
                if not sample_found:
                    st.warning("Built-in sample candidate data path not resolved. Please upload your own spreadsheet.")
                    
        # Active Pool Stats card
        if st.session_state.candidates:
            st.write("---")
            col_stat, col_clr = st.columns([1.8, 1])
            with col_stat:
                st.markdown(f"<div style='font-size:0.85rem;color:var(--text-secondary);padding-top:8px;'>Currently holding <strong>{len(st.session_state.candidates)}</strong> candidates inside local memory pool.</div>", unsafe_allow_html=True)
            with col_clr:
                if st.button("🗑️ Clear Local Candidate Pool", use_container_width=True):
                    st.session_state.candidates = []
                    st.session_state.mapped_cols = {}
                    st.session_state.raw_headers = []
                    st.rerun()

# ── Pipeline Calculations (computed globally if pool has elements) ────────────
candidates = st.session_state.candidates
if _PIPELINE_ERROR:
    ranked, hp_list, hp_count, elapsed_ms = [], [], 0, 0.0
elif candidates:
    ranked, hp_list, hp_count, elapsed_ms = run_pipeline(json.dumps(candidates), top_n)
else:
    ranked, hp_list, hp_count, elapsed_ms = [], [], 0, 0.0

# ── 2. FIT SCORES DASHBOARD ───────────────────────────────────────────────────
with tab_dashboard:
    if _PIPELINE_ERROR:
        st.error(f"Pipeline calculation failed to initialize: {_PIPELINE_ERROR}. Verify local ranker packages.")
    elif not candidates:
        st.markdown("""
        <div class="empty-state">
          <div class="empty-state-icon">📊</div>
          <h2 class="empty-state-title">Awaiting Candidate Pool</h2>
          <div class="empty-state-subtitle">Please load candidate profiles or load the sandbox sample data inside the <strong>Setup & Configuration</strong> tab first.</div>
        </div>
        """, unsafe_allow_html=True)
    else:
        # Apply score filter
        ranked_f = [r for r in ranked if r["score"] >= min_score]
        total    = len(candidates)
        top_sc   = ranked[0]["score"] if ranked else 0.0
        hp_rate  = hp_count / max(total, 1) * 100

        # KPIs Grid
        st.markdown(f"""
        <div class="kpi-grid">
          <div class="kpi-tile t-blue">
            <div class="kpi-icon">👥</div>
            <div class="kpi-value">{total:,}</div>
            <div class="kpi-label">Active Pool</div>
            <div class="kpi-sub">candidates evaluated</div>
          </div>
          <div class="kpi-tile t-amber">
            <div class="kpi-icon">⚠️</div>
            <div class="kpi-value">{hp_count}</div>
            <div class="kpi-label">Anomalies Detected</div>
            <div class="kpi-sub">{hp_rate:.1f}% flagged as malicious</div>
          </div>
          <div class="kpi-tile t-green">
            <div class="kpi-icon">✅</div>
            <div class="kpi-value">{len(ranked_f)}</div>
            <div class="kpi-label">Qualified Fits</div>
            <div class="kpi-sub">scored above {min_score:.2f} threshold</div>
          </div>
          <div class="kpi-tile t-cyan">
            <div class="kpi-icon">⭐</div>
            <div class="kpi-value">{top_sc:.3f}</div>
            <div class="kpi-label">Elite Fit Score</div>
            <div class="kpi-sub">maximum pipeline fit score</div>
          </div>
        </div>
        """, unsafe_allow_html=True)

        # Score distribution chart
        if len(ranked_f) > 1:
            import pandas as pd
            cdf = pd.DataFrame([{"Rank": r["rank"], "Fit Score": round(r["score"], 4)} for r in ranked_f])
            with st.expander("📈 Visual Score Distribution Curve", expanded=False):
                st.line_chart(cdf.set_index("Rank")["Fit Score"], color="#6366f1", height=180)

        # Section Header
        st.markdown(f"""
        <div class="sec-hdr" style="margin-top:0.5rem">
          <h2>Neural Fit Score Leaderboard</h2>
          <span class="sec-hdr-count">{len(ranked_f)}</span>
          <span class="sec-hdr-meta">Targeting: {job_title} &nbsp;·&nbsp; Processed in {elapsed_ms:.1f}ms</span>
        </div>
        """, unsafe_allow_html=True)

        if not ranked_f:
            st.info("No candidates match the selected minimum fit score threshold. Tweak the slider in the Setup & Configuration tab.")
        else:
            jd_sl = {s.lower() for s in jd_skills}
            cards_html_list = []

            for r in ranked_f:
                c       = r["c"]
                profile = c.get("profile") or {}
                sigs    = c.get("redrob_signals") or {}
                rank    = r["rank"]
                score   = r["score"]

                cid     = c.get("candidate_id") or "—"
                title   = profile.get("current_title") or "—"
                company = profile.get("current_company") or "—"
                loc     = profile.get("location") or "—"
                ctry    = profile.get("country") or ""
                yoe     = float(profile.get("years_of_experience") or 0)
                loc_str = f"{loc}, {ctry}".strip(", ") if ctry and ctry not in loc else loc

                rr      = float(sigs.get("recruiter_response_rate") or 0)
                notice  = int(float(sigs.get("notice_period_days") or 90))
                gh      = sigs.get("github_activity_score", -1)
                github  = float(gh) if gh is not None and str(gh) not in ("","-1") and float(gh) >= 0 else -1.0
                active  = (sigs.get("last_active_date") or "")[:10] or "—"
                otw     = bool(sigs.get("open_to_work_flag", False))
                comp    = int(float(sigs.get("profile_completeness_score") or 0))

                card_cls, circ_cls = _rank_css(rank)
                comp_col = "#10b981" if comp >= 80 else ("#f59e0b" if comp >= 50 else "#ef4444")
                sc_col = _score_color(score)

                # Skill chips
                chips_html = ""
                for sk in (r.get("skills") or [])[:5]:
                    is_m = any(j in sk.lower() or sk.lower() in j for j in jd_sl)
                    chips_html += f'<span class="chip {"matched" if is_m else ""}">{sk}</span>'
                if r.get("ai", 0):
                    chips_html += f'<span class="chip ai">🧠 {r["ai"]} AI skills</span>'

                reason = r.get("reason") or "—"
                otw_html = ('<span class="otw-badge otw-yes">● Open to work</span>'
                            if otw else '<span class="otw-badge otw-no">● Not active</span>')

                score_pct = int(score * 100)
                svg_ring = f"""
                <div class="score-circle-wrapper">
                  <svg class="score-circle" width="56" height="56" viewBox="0 0 36 36">
                    <path class="circle-bg"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="2.5" />
                    <path class="circle-fg" stroke-dasharray="{score_pct}, 100"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="{sc_col}" stroke-width="2.5" stroke-linecap="round" />
                    <text x="18" y="20.35" class="circle-text" fill="{sc_col}" font-size="8.5" font-weight="800" text-anchor="middle">{score_pct}%</text>
                  </svg>
                </div>
                """

                card_html = f"""
                <div class="ccard {card_cls}">
                  <div class="ccard-header">
                    <div class="ccard-header-left">
                      <div class="rank-badge {circ_cls}">#{rank}</div>
                      <div>
                        <div class="ccard-title">{title}</div>
                        <div class="ccard-meta">
                          <span class="c-id">{cid}</span>
                          <span class="meta-dot"></span>
                          <span>{company}</span>
                        </div>
                      </div>
                    </div>
                    {svg_ring}
                  </div>
                  <div class="ccard-body">
                    <div class="ccard-meta" style="margin-bottom: 12px;">
                      <span>📍 {loc_str}</span>
                      <span class="meta-dot"></span>
                      <span>💼 {yoe:.1f} yrs experience</span>
                    </div>
                    <div class="ccard-skills">{chips_html}</div>
                    <div class="ccard-metrics">
                      <div class="metric-item">
                        <span class="m-label">Resp. Rate</span>
                        <span class="m-value">{_pct(rr)}</span>
                      </div>
                      <div class="metric-item">
                        <span class="m-label">Notice</span>
                        <span class="m-value">{notice}d</span>
                      </div>
                      <div class="metric-item">
                        <span class="m-label">Last Active</span>
                        <span class="m-value">{active}</span>
                      </div>
                      <div class="metric-item">
                        <span class="m-label">Profile</span>
                        <span class="m-value" style="color:{comp_col}">{comp}%</span>
                      </div>
                    </div>
                    <div class="ccard-otw">{otw_html}</div>
                    <div class="ccard-reason">
                      <div class="reason-hdr">
                        <div class="terminal-dots">
                          <span class="tdot td-r"></span>
                          <span class="tdot td-y"></span>
                          <span class="tdot td-g"></span>
                        </div>
                        <span class="reason-title">🧠 AI Fit Analysis</span>
                      </div>
                      <div class="reason-text">"{reason}"</div>
                    </div>
                  </div>
                </div>
                """
                cards_html_list.append(card_html)

            grid_html = f"""
            <div class="candidate-grid">
              {"".join(cards_html_list)}
            </div>
            """
            st.markdown(grid_html, unsafe_allow_html=True)

# ── 3. SECURITY & ANOMALIES ──────────────────────────────────────────────────
with tab_security:
    if not candidates:
        st.markdown("""
        <div class="empty-state">
          <div class="empty-state-icon">🛡️</div>
          <h2 class="empty-state-title">Awaiting Candidate Pool</h2>
          <div class="empty-state-subtitle">Please load data in the Setup & Configuration tab to execute honeypot and pattern security checks.</div>
        </div>
        """, unsafe_allow_html=True)
    elif not hp_list:
        st.markdown("""
        <div style="text-align:center;padding:5.5rem 2rem;background:rgba(16,185,129,0.02);border:1px dashed rgba(16,185,129,0.25);border-radius:20px;max-width:600px;margin:3rem auto;">
          <div style="font-size:3.8rem;margin-bottom:1.25rem;">🛡️</div>
          <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:1.3rem;font-weight:750;color:#34d399;margin-bottom:0.5rem">No Anomalies Registered</div>
          <div style="font-size:0.85rem;color:var(--text-secondary);max-width:440px;margin:0 auto;line-height:1.6">All loaded candidates passed structural check validations. Honeypot detectors mapped no signal overlaps.</div>
        </div>
        """, unsafe_allow_html=True)
    else:
        st.markdown(f"""
        <div class="sec-hdr">
          <h2>Malicious Pattern Warnings & Flagged Anomalies</h2>
          <span class="sec-hdr-count" style="background:rgba(239,68,68,0.15);color:#fca5a5;border-color:rgba(239,68,68,0.25);">{len(hp_list)}</span>
          <span class="sec-hdr-meta">removed from the ranked matching leaderboard</span>
        </div>
        """, unsafe_allow_html=True)
        st.caption("These profiles were excluded automatically due to invalid formatting, copy-pasted details, or anomalous metrics.")
        
        hp_html_list = []
        for r in hp_list:
            c = r["c"]; pr = c.get("profile") or {}
            cid  = c.get("candidate_id","—")
            ttl  = pr.get("current_title","—")
            tags = "".join(f'<span class="hp-tag">{t.replace("_"," ")}</span>' for t in (r.get("hpr") or []))
            html = f"""
            <div class="hp-card">
              <div class="hp-id">{cid}</div>
              <div class="hp-title">{ttl}</div>
              <div class="hp-tags">{tags}</div>
            </div>
            """
            hp_html_list.append(html)
            
        st.markdown(f'<div class="hp-grid">{"".join(hp_html_list)}</div>', unsafe_allow_html=True)

# ── 4. EXPORT WORKSPACE ───────────────────────────────────────────────────────
with tab_export:
    if not candidates:
        st.markdown("""
        <div class="empty-state">
          <div class="empty-state-icon">💾</div>
          <h2 class="empty-state-title">Awaiting Candidate Pool</h2>
          <div class="empty-state-subtitle">Please load data in the Setup & Configuration tab to generate export spreadsheets.</div>
        </div>
        """, unsafe_allow_html=True)
    else:
        ranked_f = [r for r in ranked if r["score"] >= min_score]
        
        st.markdown("""
        <div class="sec-hdr">
          <h2>Export Match Results</h2>
        </div>
        """, unsafe_allow_html=True)
        
        if not ranked_f:
            st.info("No candidates match the score threshold. Adjust sliders to export data.")
        else:
            col_ex1, col_ex2 = st.columns(2, gap="large")
            with col_ex1:
                buf = io.StringIO()
                w = csv.writer(buf)
                w.writerow(["rank","candidate_id","title","company","location","yoe",
                            "fit_score","ai_skills","matched_skills","open_to_work","notice_days","reasoning"])
                for r in ranked_f:
                    c=r["c"]; pr=c.get("profile") or {}; sg=c.get("redrob_signals") or {}
                    w.writerow([r["rank"],c.get("candidate_id",""),
                                pr.get("current_title",""),pr.get("current_company",""),
                                pr.get("location",""),pr.get("years_of_experience",""),
                                f"{r['score']:.4f}",r.get("ai",0),
                                "|".join(r.get("skills") or []),
                                sg.get("open_to_work_flag",""),sg.get("notice_period_days",""),
                                r.get("reason","")])
                fn = f"ranked_{job_title.replace(' ','_').lower()}.csv"
                st.download_button("⬇️ Download CSV Fit Scores", buf.getvalue().encode(), fn, "text/csv", use_container_width=True)

            with col_ex2:
                try:
                    import pandas as pd
                    rows = []
                    for r in ranked_f:
                        c=r["c"]; pr=c.get("profile") or {}; sg=c.get("redrob_signals") or {}
                        rows.append({"Rank":r["rank"],"ID":c.get("candidate_id",""),
                                     "Title":pr.get("current_title",""),"Company":pr.get("current_company",""),
                                     "Location":pr.get("location",""),"YoE":pr.get("years_of_experience",""),
                                     "Score":round(r["score"],4),"AI Skills":r.get("ai",0),
                                     "Top Skills":" | ".join(r.get("skills") or []),
                                     "OTW":sg.get("open_to_work_flag",""),"Notice":sg.get("notice_period_days",""),
                                     "Reasoning":r.get("reason","")})
                    xbuf = io.BytesIO()
                    pd.DataFrame(rows).to_excel(xbuf, index=False, engine="openpyxl")
                    xfn = f"ranked_{job_title.replace(' ','_').lower()}.xlsx"
                    st.download_button("⬇️ Download Excel Spreadsheet", xbuf.getvalue(), xfn,
                                       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", use_container_width=True)
                except Exception as ex_err:
                    st.error(f"Excel export failed (engine openpyxl check): {ex_err}")

            st.write("---")
            st.markdown("### 📊 Raw Candidate Fit Table")
            if "pd" not in dir(): import pandas as pd
            tdf = pd.DataFrame([{
                "Rank": r["rank"],
                "Candidate ID": r["c"].get("candidate_id","—"),
                "Title": _safe(r["c"],"profile","current_title",default="—"),
                "Company": _safe(r["c"],"profile","current_company",default="—"),
                "Location": _safe(r["c"],"profile","location",default="—"),
                "YoE": _safe(r["c"],"profile","years_of_experience",default="—"),
                "Fit Score": f"{r['score']:.4f}",
                "AI Core Skills": r.get("ai",0),
            } for r in ranked_f])
            st.dataframe(tdf, use_container_width=True, hide_index=True, height=350)

# ── Footer ────────────────────────────────────────────────────────────────────
st.markdown("""
<div style="text-align:center;padding:3rem 0 2rem;font-size:0.75rem;color:var(--text-muted);border-top:1px solid var(--border);margin-top:4rem">
  RecruitIQ Engine &nbsp;·&nbsp; Enterprise Candidate Fit Intelligence Platform
</div>
""", unsafe_allow_html=True)
