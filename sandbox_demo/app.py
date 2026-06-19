"""
app.py — RecruitIQ Engine Sandbox Demo (Phase C)
Streamlit app for HuggingFace Spaces deployment.

Showcases the ranking system on up to 100 candidates.
NOT subject to runtime/network constraints — this is the showcase UI.

Deploy to HuggingFace Spaces:
    1. Create a new Space: https://huggingface.co/new-space
    2. Select Streamlit SDK
    3. Push this file + requirements.txt
"""

import json
import sys
from pathlib import Path

import streamlit as st

# Allow imports from parent
_APP_DIR = Path(__file__).parent
_REPO_ROOT = _APP_DIR.parent
sys.path.insert(0, str(_REPO_ROOT))

# ─────────────────────────────────────────────────────────────────────────────
# Page config
# ─────────────────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="RecruitIQ Engine — AI Candidate Ranker",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ─────────────────────────────────────────────────────────────────────────────
# Custom CSS
# ─────────────────────────────────────────────────────────────────────────────
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
    }

    .main-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 2rem 2rem 1.5rem;
        border-radius: 16px;
        margin-bottom: 1.5rem;
        color: white;
    }

    .rank-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        font-weight: 700;
        font-size: 14px;
        color: white;
    }

    .rank-1  { background: linear-gradient(135deg, #FFD700, #FFA500); }
    .rank-2  { background: linear-gradient(135deg, #C0C0C0, #A0A0A0); }
    .rank-3  { background: linear-gradient(135deg, #CD7F32, #A0522D); }
    .rank-top { background: linear-gradient(135deg, #667eea, #764ba2); }
    .rank-mid { background: #4CAF50; }
    .rank-low { background: #9E9E9E; }

    .candidate-card {
        background: white;
        border: 1px solid #e8ecef;
        border-radius: 12px;
        padding: 1.2rem;
        margin-bottom: 0.8rem;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        transition: box-shadow 0.2s ease;
    }

    .candidate-card:hover {
        box-shadow: 0 4px 16px rgba(102,126,234,0.15);
        border-color: #667eea;
    }

    .score-bar {
        height: 6px;
        border-radius: 3px;
        background: linear-gradient(90deg, #667eea, #764ba2);
    }

    .skill-tag {
        display: inline-block;
        background: #EEF2FF;
        color: #4338CA;
        padding: 2px 10px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
        margin: 2px;
    }

    .honeypot-badge {
        background: #FEE2E2;
        color: #DC2626;
        padding: 2px 10px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
    }

    .metric-box {
        background: #F8F9FF;
        border: 1px solid #E8EBFF;
        border-radius: 10px;
        padding: 0.8rem;
        text-align: center;
    }

    .reasoning-box {
        background: #F0FDF4;
        border-left: 4px solid #22C55E;
        padding: 0.6rem 0.8rem;
        border-radius: 0 8px 8px 0;
        font-style: italic;
        font-size: 0.9rem;
        color: #374151;
    }
</style>
""", unsafe_allow_html=True)

# ─────────────────────────────────────────────────────────────────────────────
# Header
# ─────────────────────────────────────────────────────────────────────────────
st.markdown("""
<div class="main-header">
    <h1 style="margin:0; font-size: 2rem; font-weight: 700;">🤖 RecruitIQ Engine</h1>
    <p style="margin: 0.5rem 0 0; opacity: 0.9; font-size: 1.1rem;">
        Intelligent Candidate Discovery & Ranking — Redrob Hackathon 2026
    </p>
    <p style="margin: 0.3rem 0 0; opacity: 0.75; font-size: 0.85rem;">
        Senior AI Engineer, Founding Team @ Redrob AI
    </p>
</div>
""", unsafe_allow_html=True)

# ─────────────────────────────────────────────────────────────────────────────
# Sidebar
# ─────────────────────────────────────────────────────────────────────────────
with st.sidebar:
    st.header("⚙️ Settings")

    input_mode = st.radio(
        "Data source",
        ["Upload JSON file", "Use sample data"],
        index=1,
    )

    top_n = st.slider("Candidates to rank", min_value=5, max_value=100, value=20, step=5)

    st.divider()
    st.subheader("🎯 JD Highlights")
    st.markdown("""
    **Senior AI Engineer — Redrob AI**
    - 5–9 years experience (ideal: 6–8)
    - Embeddings, FAISS, vector DBs
    - Ranking eval (NDCG, MRR, A/B)
    - Product company background
    - Pune / Noida preferred
    """)

    st.divider()
    st.caption("⚡ Pipeline: streaming JSONL → honeypot gate → 47 features → weighted score → reasoning")
    st.caption("🏆 Runtime on 100k candidates: ~27 seconds (CPU only)")

# ─────────────────────────────────────────────────────────────────────────────
# Load / upload candidates
# ─────────────────────────────────────────────────────────────────────────────
candidates = []

if input_mode == "Upload JSON file":
    uploaded = st.file_uploader(
        "Upload candidates.json (list of candidate objects)",
        type=["json"],
        help="JSON array of candidate objects matching the Redrob schema",
    )
    if uploaded:
        try:
            raw = json.loads(uploaded.read())
            if isinstance(raw, list):
                candidates = raw
            elif isinstance(raw, dict):
                candidates = [raw]
            st.success(f"Loaded {len(candidates)} candidates from upload")
        except Exception as e:
            st.error(f"Error parsing JSON: {e}")

else:
    # Try to load sample data
    sample_paths = [
        _REPO_ROOT / "[PUB] India_runs_data_and_ai_challenge" / "India_runs_data_and_ai_challenge" / "sample_candidates.json",
        _APP_DIR.parent.parent / "[PUB] India_runs_data_and_ai_challenge" / "India_runs_data_and_ai_challenge" / "sample_candidates.json",
        Path("sample_candidates.json"),
    ]

    for p in sample_paths:
        if p.exists():
            with open(p, "r", encoding="utf-8") as f:
                candidates = json.load(f)
            st.info(f"📁 Using {len(candidates)} sample candidates from `sample_candidates.json`")
            break

    if not candidates:
        st.warning("Sample candidates file not found. Please upload a JSON file.")

# ─────────────────────────────────────────────────────────────────────────────
# Run ranking
# ─────────────────────────────────────────────────────────────────────────────
if candidates:
    import time

    try:
        from ranker.honeypot_filter import is_honeypot
        from ranker.scorer import feature_vector, weighted_score, count_ai_core_skills, top_matched_skills
        from ranker.explainer import generate_reasoning

        with st.spinner("🔄 Running RecruitIQ ranking pipeline..."):
            t0 = time.perf_counter()

            honeypot_count = 0
            results = []

            for c in candidates:
                flagged, reasons = is_honeypot(c)
                feats = feature_vector(c)
                score = weighted_score(feats)
                ai_count = count_ai_core_skills(c)
                top_skills = top_matched_skills(c, n=5)

                results.append({
                    "candidate": c,
                    "features": feats,
                    "score": score,
                    "ai_count": ai_count,
                    "top_skills": top_skills,
                    "is_honeypot": flagged,
                    "honeypot_reasons": reasons,
                })
                if flagged:
                    honeypot_count += 1

            # Sort: non-honeypots first, then by score descending
            non_honeypots = [r for r in results if not r["is_honeypot"]]
            honeypots_list = [r for r in results if r["is_honeypot"]]

            non_honeypots.sort(key=lambda x: (-round(x["score"], 6), x["candidate"].get("candidate_id", "")))

            # Assign ranks and generate reasoning
            ranked = []
            for rank_pos, r in enumerate(non_honeypots[:top_n], start=1):
                r["rank"] = rank_pos
                r["reasoning"] = generate_reasoning(
                    candidate=r["candidate"],
                    features=r["features"],
                    score=r["score"],
                    rank=rank_pos,
                    ai_core_count=r["ai_count"],
                    top_skills=r["top_skills"],
                )
                ranked.append(r)

            elapsed = time.perf_counter() - t0

        # ─────────────────────────────────────────────────────────────────
        # Summary metrics
        # ─────────────────────────────────────────────────────────────────
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("📋 Total Candidates", len(candidates))
        with col2:
            st.metric("🍯 Honeypots Filtered", honeypot_count,
                      delta=f"{100*honeypot_count/max(len(candidates),1):.1f}% rate",
                      delta_color="inverse")
        with col3:
            st.metric("✅ Ranked", len(ranked))
        with col4:
            st.metric("⚡ Runtime", f"{elapsed*1000:.0f}ms")

        # ─────────────────────────────────────────────────────────────────
        # Score distribution
        # ─────────────────────────────────────────────────────────────────
        if len(ranked) > 1:
            import pandas as pd
            scores_df = pd.DataFrame([{
                "rank": r["rank"],
                "score": round(r["score"], 4),
                "title": r["candidate"].get("profile", {}).get("current_title", "Unknown"),
                "yoe": r["candidate"].get("profile", {}).get("years_of_experience", 0),
            } for r in ranked])

            with st.expander("📊 Score Distribution", expanded=False):
                st.line_chart(scores_df.set_index("rank")["score"])

        # ─────────────────────────────────────────────────────────────────
        # Ranked candidates
        # ─────────────────────────────────────────────────────────────────
        st.subheader(f"🏆 Top {len(ranked)} Candidates")

        for r in ranked:
            c = r["candidate"]
            profile = c.get("profile", {})
            signals = c.get("redrob_signals", {})

            rank = r["rank"]
            score = r["score"]

            # Rank badge class
            if rank == 1:
                badge_class = "rank-1"
            elif rank == 2:
                badge_class = "rank-2"
            elif rank == 3:
                badge_class = "rank-3"
            elif rank <= 10:
                badge_class = "rank-top"
            elif rank <= 30:
                badge_class = "rank-mid"
            else:
                badge_class = "rank-low"

            with st.container():
                col_rank, col_main, col_signals = st.columns([1, 6, 3])

                with col_rank:
                    st.markdown(
                        f'<div class="rank-badge {badge_class}" style="margin-top:8px">#{rank}</div>',
                        unsafe_allow_html=True
                    )

                with col_main:
                    title = profile.get("current_title", "Unknown")
                    yoe = profile.get("years_of_experience", 0)
                    company = profile.get("current_company", "")
                    location = profile.get("location", "")
                    cid = c.get("candidate_id", "")

                    st.markdown(f"**{title}** at {company}")
                    st.caption(f"{cid} · {yoe:.1f} yrs · {location}")

                    # Score bar
                    bar_width = int(score * 100)
                    st.markdown(
                        f'<div style="background:#f0f0f0; border-radius:3px; height:6px; margin:4px 0;">'
                        f'<div class="score-bar" style="width:{bar_width}%;"></div>'
                        f'</div>',
                        unsafe_allow_html=True
                    )

                    # Skills
                    if r["top_skills"]:
                        skills_html = " ".join(
                            f'<span class="skill-tag">{s}</span>'
                            for s in r["top_skills"][:4]
                        )
                        st.markdown(skills_html, unsafe_allow_html=True)

                    # Reasoning
                    st.markdown(
                        f'<div class="reasoning-box">{r["reasoning"]}</div>',
                        unsafe_allow_html=True
                    )

                with col_signals:
                    rr = signals.get("recruiter_response_rate", 0) or 0
                    active = signals.get("last_active_date", "")[:10]
                    notice = signals.get("notice_period_days", 90)
                    github = signals.get("github_activity_score", -1)
                    otw = "✅ OTW" if signals.get("open_to_work_flag") else "⏸ Not OTW"

                    st.markdown(f"""
                    <div class="metric-box">
                        <div style="font-size:1.4rem; font-weight:700; color:#667eea">{score:.3f}</div>
                        <div style="font-size:0.75rem; color:#6B7280">Fit Score</div>
                    </div>
                    """, unsafe_allow_html=True)

                    st.caption(f"📬 Response: {rr:.0%}")
                    st.caption(f"📅 Active: {active}")
                    st.caption(f"⏰ Notice: {notice}d")
                    if github >= 0:
                        st.caption(f"🐙 GitHub: {github:.0f}/100")
                    st.caption(otw)

                st.divider()

        # ─────────────────────────────────────────────────────────────────
        # Honeypots section
        # ─────────────────────────────────────────────────────────────────
        if honeypots_list:
            with st.expander(f"🍯 Filtered Honeypots ({len(honeypots_list)})", expanded=False):
                for r in honeypots_list:
                    c = r["candidate"]
                    cid = c.get("candidate_id", "")
                    title = c["profile"].get("current_title", "")
                    reasons = ", ".join(r["honeypot_reasons"])
                    st.markdown(
                        f'**{cid}** — {title} · '
                        f'<span class="honeypot-badge">🚨 {reasons}</span>',
                        unsafe_allow_html=True
                    )

        # ─────────────────────────────────────────────────────────────────
        # CSV download
        # ─────────────────────────────────────────────────────────────────
        st.divider()
        if ranked:
            import csv
            import io

            buf = io.StringIO()
            writer = csv.writer(buf)
            writer.writerow(["candidate_id", "rank", "score", "reasoning"])
            for r in ranked:
                writer.writerow([
                    r["candidate"].get("candidate_id", ""),
                    r["rank"],
                    f"{r['score']:.4f}",
                    r["reasoning"],
                ])

            st.download_button(
                label="⬇️ Download Submission CSV",
                data=buf.getvalue().encode("utf-8"),
                file_name="submission.csv",
                mime="text/csv",
            )

    except ImportError as e:
        st.error(f"Import error: {e}. Make sure you're running from the repo root.")

else:
    st.info("👆 Select 'Use sample data' or upload a candidates JSON file to start ranking.")

# ─────────────────────────────────────────────────────────────────────────────
# Footer
# ─────────────────────────────────────────────────────────────────────────────
st.markdown("---")
st.caption("RecruitIQ Engine | Redrob Hackathon 2026 | Constraint-compliant: CPU-only, no network calls, <300s on 100k candidates")
