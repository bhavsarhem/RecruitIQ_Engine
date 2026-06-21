# RecruitIQ Engine
## Intelligent Candidate Discovery, Ranking & Security Auditing
### Redrob India Data & AI Hackathon 2026

---

**Version:** 1.0.0  
**Live Application:** https://recruitiq-engine.vercel.app  
**GitHub Repository:** https://github.com/bhavsarhem/RecruitIQ_Engine  
**Team:** bhavsarhem  
**Date:** June 2026  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Solution Overview](#3-solution-overview)
4. [System Architecture](#4-system-architecture)
5. [Phase A — Offline Lab (Model Training)](#5-phase-a--offline-lab)
6. [Phase B — Online Ranker (Graded Pipeline)](#6-phase-b--online-ranker)
7. [Phase C — Interactive UI (Frontend Dashboard)](#7-phase-c--interactive-ui)
8. [Honeypot Detection System](#8-honeypot-detection-system)
9. [Feature Engineering — 47-Dimension Scoring](#9-feature-engineering--47-dimension-scoring)
10. [LightGBM LambdaRank Model](#10-lightgbm-lambdarank-model)
11. [Security Architecture](#11-security-architecture)
12. [Frontend Design System](#12-frontend-design-system)
13. [Performance & Constraints Compliance](#13-performance--constraints-compliance)
14. [Project File Structure](#14-project-file-structure)
15. [Deployment & DevOps](#15-deployment--devops)
16. [Results & Validation](#16-results--validation)
17. [Future Roadmap](#17-future-roadmap)

---

## 1. Executive Summary

**RecruitIQ Engine** is a full-stack AI-powered candidate ranking and integrity verification system built for the *Redrob India Data & AI Hackathon 2026*. The system evaluates 100,000 job applicants for a *Senior AI Engineer* role using a combination of deterministic fraud detection, 47-dimension feature engineering, and a trained LightGBM LambdaRank model — all executing on a CPU-only environment in under 93 seconds (well within the 300-second hackathon budget).

### Key Achievements at a Glance

| Metric | Result |
|---|---|
| Total Candidates Processed | 100,000 |
| Honeypots Detected & Filtered | 3,693 (3.69%) |
| Survivors Scored & Ranked | 96,307 |
| Top Candidates Delivered | 100 |
| Total Pipeline Runtime | **92.63 seconds** |
| Budget Remaining | **207.4s of 300s** |
| Memory Usage | < 2 GB |
| GPU Required | ❌ None (CPU only) |
| Network Calls | ❌ Zero |
| Submission Validity | ✅ Validated |

---

## 2. Problem Statement

### The Resume Screening Crisis in Technical Recruitment

Modern technical recruitment — especially for specialized roles like Senior AI Engineers — faces two compounding crises:

### 2.1 Volume Overload
- Large organizations receive **thousands of applications** per senior technical role.
- Standard ATS systems perform shallow keyword matching, producing ranked lists that don't reflect actual candidate quality.
- Recruiter attention is diluted across a massive pool, with most of their time spent on unqualified applications.

### 2.2 Profile Fraud & Honeypots
A growing challenge in automated screening is **honeypot profiles** — fraudulent resumes crafted specifically to game ATS systems:

- **Keyword Stuffing:** Candidates copy-paste job descriptions into their resume in white text (invisible to humans, readable by parsers).
- **Impossible Experience Claims:** A candidate claims "12 years of FastAPI experience" despite FastAPI only being released in 2018.
- **Timeline Fabrication:** Career histories with overlapping employment dates or zero-duration but "Expert"-proficiency skills.
- **Title-Skill Mismatch:** A "Marketing Coordinator" claiming 8 advanced Machine Learning skills.

### 2.3 Lack of Objective Scoring
- Most ATS systems score on simple keyword frequency, not signal quality.
- Subjective recruiter bias means two equally skilled candidates can receive wildly different outcomes.
- No standardized behavioral signal weighting (response rates, open-to-work status, notice periods).

---

## 3. Solution Overview

**RecruitIQ Engine** solves all three problems through a three-phase pipeline:

```
Phase A: Offline Training (run once, no time constraints)
    → Feature engineering, weak label generation, LightGBM training

Phase B: Online Ranking (≤300s, ≤16GB, CPU only, zero network)
    → Stream JSONL → Honeypot Gate → Feature Extraction → Scoring → CSV Export

Phase C: Interactive Dashboard (Vite/React, deployed on Vercel)
    → Real-time browser-side evaluation, visualization, and export
```

### Design Principles

1. **Security-First:** Fraud detection runs before any scoring — contaminated profiles never enter the ranking pool.
2. **Explainable AI:** Every ranked candidate receives a template-based natural language reasoning justification.
3. **Graceful Degradation:** If the LightGBM model is absent, the pipeline falls back to the pure weighted scorer — no crashes.
4. **Pickle-Free Architecture:** The LightGBM model is serialized as a native text booster (`lgbm_ranker.txt`), completely eliminating pickle-based code injection attack vectors.
5. **Dependency-Minimal:** The graded pipeline (`ranker.py`) can run on pure Python stdlib with zero pip installs if no model is present.

---

## 4. System Architecture

### High-Level Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                         RECRUITIQ ENGINE                             │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  PHASE A — OFFLINE LAB (Unlimited time, run once)               │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │ │
│  │  │ jd_parser.py │  │feature_eng.. │  │ model_trainer.py     │  │ │
│  │  │ JD → JSON    │  │ 100k → NPZ   │  │ LambdaRank Training  │  │ │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                              ↓                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  PHASE B — ONLINE RANKER (≤300s · ≤16GB · CPU · No network)    │ │
│  │                                                                 │ │
│  │  candidates.jsonl                                               │ │
│  │       ↓                                                         │ │
│  │  [Honeypot Gate] ──── flagged ──→ [Anomaly Log]                 │ │
│  │       ↓ cleared                                                 │ │
│  │  [Feature Extractor] → [LightGBM Scorer / Weighted Fallback]    │ │
│  │       ↓                                                         │ │
│  │  [Explainer] → [Top-100 Selection] → [CSV Export]              │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                              ↓                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  PHASE C — INTERACTIVE UI (Vercel · Vite · React · TypeScript)  │ │
│  │  Ingestion Control → Dashboard → Threat Radar → Export Console  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 5. Phase A — Offline Lab

The offline lab consists of four scripts that prepare model artifacts. These are run **once** before grading, with no time or resource constraints.

### 5.1 `jd_parser.py` — Job Description Parser
- Reads the `.docx` job description file using `python-docx`.
- Extracts structured fields: required skills, preferred skills, experience range, location, and title.
- Outputs a canonical JSON representation used for feature weighting.

### 5.2 `feature_engineer.py` — Feature Matrix Construction
- Streams `candidates.jsonl` (100k records, 487 MB).
- For each candidate, extracts all 47 numerical features into a row vector.
- Saves the complete feature matrix as a compressed NumPy `.npz` file (~4.7 MB).
- Runtime: ~42 seconds on CPU.

### 5.3 `weak_label_generator.py` — Relevance Label Generation
- Applies rule-based heuristics to assign relevance labels (0–3) to each candidate.
- Uses the same scoring logic as `scorer.py` to create training supervision signal.
- Labels are grouped into query groups for LightGBM's learning-to-rank format.
- Outputs `labels.json` (~9 MB).

### 5.4 `model_trainer.py` — LightGBM LambdaRank Training
- Loads `features.npz` and `labels.json`.
- Trains a **LightGBM LambdaRank** model (learning-to-rank objective).
- Saves the trained booster as a native text file `lgbm_ranker.txt` — **not pickle** — eliminating deserialization attack risks.
- Exports MinMaxScaler parameters as `scaler_config.json` for reproducible normalization.

---

## 6. Phase B — Online Ranker

The online ranker is the **graded artifact** that must run under the hackathon constraints: ≤300 seconds, ≤16 GB RAM, CPU only, zero network calls.

### 6.1 Pipeline Execution Timing

| Step | Operation | Time (100k candidates) |
|---|---|---|
| 0 | Load LightGBM text booster artifact | 8.83s |
| 1–3 | Stream JSONL + Honeypot gate + Feature extraction | 81.95s |
| 6 | Sort 96,307 survivors, select Top-100 | 0.36s |
| 7 | Template reasoning for Top-100 | 0.10s |
| 9 | Write CSV to disk | 0.01s |
| **Total** | | **92.63s** |

### 6.2 Key Optimizations

**Date Parsing Cache (`O(1)` lookup):**
The pipeline's inner loop processes 100,000+ career history entries, each containing ISO date strings. We replaced `datetime.strptime()` with a dict-based cache keyed by raw string — reducing repeated parsing overhead by approximately 85%.

```python
_DATE_CACHE: dict[str, Optional[date]] = {}

def _parse_date(s: str) -> Optional[date]:
    if s in _DATE_CACHE:
        return _DATE_CACHE[s]
    # fast path: slice ISO string
    result = _parse_date_impl(s)
    _DATE_CACHE[s] = result
    return result
```

**Pickle-Free Model Loading:**
```python
# Old (insecure):
model = pickle.load(open("model.pkl", "rb"))

# New (secure):
model = lgb.Booster(model_file="lgbm_ranker.txt")
```

**Manual MinMax Normalization:**
Replaced `sklearn.preprocessing.MinMaxScaler` with direct arithmetic using stored JSON parameters, removing the scikit-learn runtime dependency from the graded pipeline.

---

## 7. Phase C — Interactive UI

The frontend is a **Vite/React/TypeScript** single-page application deployed on Vercel at:  
**https://recruitiq-engine.vercel.app**

### 7.1 Application Tabs

| Tab | Description |
|---|---|
| **Ingestion Control** | Drag-and-drop or click to upload CSV/JSON/JSONL candidate files |
| **Leaderboard FIT** | Ranked candidate cards, SVG match distribution curve, KPI metrics |
| **Threat Radar** | Rotating conic radar sweep visualization, flagged candidate list |
| **Export Console** | Download submission CSV or XLSX, preview top-100 |

### 7.2 Custom Animated Cursor
A signature feature of the UI is the custom GSAP-powered cursor:
- A **6px indigo center dot** that follows the mouse with zero lag.
- A **28px trailing outer ring** that follows with smooth physics (`power3.out` easing, 200ms).
- On hover over interactive elements (buttons, cards, links), the ring **expands to 48px** and glows **fuchsia** (`#d946ef`).
- Implemented with `mix-blend-mode: difference` on the center dot for a premium visual effect.

---

## 8. Honeypot Detection System

The **Honeypot Gate** is the first and most critical step in the pipeline. It runs O(1) per candidate — six deterministic predicates that flag fraudulent profiles before any scoring occurs.

### Predicate 1: Timeline Impossibility
**Flags candidates whose career history contains:**
- A start date in the future (after today).
- A start date before 1970 (implausible).
- Non-current roles with end dates before start dates.
- Overlapping non-current roles with >6 months of overlap.
- Any single role with a duration exceeding 40 years.

### Predicate 2: Framework Age Impossibility
**Flags candidates claiming experience in a framework older than the framework itself:**

| Framework | Launch Year | Max Valid Experience |
|---|---|---|
| React | 2013 | 12 years |
| FastAPI | 2018 | 7 years |
| PyTorch | 2016 | 9 years |
| Kubernetes | 2014 | 11 years |
| Transformers (HuggingFace) | 2019 | 6 years |
| LangChain | 2022 | 3 years |
| Llama | 2023 | 2 years |

If a candidate claims "15 years of React experience" → **Flagged as Honeypot.**

### Predicate 3: Zero-Duration Expert
**Flags candidates with ≥2 skills listed as "Expert" or "Advanced" but with 0 months of usage duration.** This pattern indicates skill fabrication.

### Predicate 4: Skill Stuffing
**Flags candidates who have ALL of the following:**
- More than 12 advanced/expert skills
- Average endorsement count < 1.0 (no community validation)
- Average skill duration < 3 months

### Predicate 5: Impossible YOE Discrepancy
**Flags candidates where stated years_of_experience exceeds the sum of career duration_months by more than 36 months** (3 years of unaccounted time).

### Predicate 6: Title-Skill Mismatch
**Flags non-technical profiles claiming advanced AI/ML skills:**
- Disqualifying titles: `accountant`, `sales`, `marketing`, `operations`, `administrative`, `customer support`
- Threshold: ≥6 Expert or Advanced AI/ML skills on a non-technical profile.

### Results
Out of 100,000 candidates:
- **3,693 honeypots detected** (3.69%) — within the ≤10% allowable threshold.
- **96,307 survivors** passed to the scoring engine.

---

## 9. Feature Engineering — 47-Dimension Scoring

Each surviving candidate is represented as a 47-element feature vector. Features are normalized to [0, 1] range.

### Feature Clusters

#### Cluster 1: Skills & JD Match (~30% weight)
| Feature | Description |
|---|---|
| `hard_skill_weight_sum` | Weighted sum of matched JD keywords |
| `embedding_skill_count` | Count of vector DB skills (FAISS, Qdrant, Pinecone, etc.) |
| `ai_skill_density` | Fraction of skills that are AI/ML related |
| `ranking_eval_skill` | Has evaluation/ranking-specific skills |
| `python_capable` | Has Python in skills list |
| `skill_assessment_score` | Normalized skill assessment score |
| `avg_endorsement_count` | Average endorsements per skill |
| `expert_skill_fraction` | Fraction of skills at expert level |

#### Cluster 2: Career & Experience (~20% weight)
| Feature | Description |
|---|---|
| `yoe_in_range` | Whether YOE falls in the ideal 5–10 year range |
| `yoe_score` | Smooth curve peaking at 6–8 years |
| `product_company_ratio` | Fraction of career at product companies |
| `avg_tenure_months` | Average months per role |
| `consulting_only` | Negative: only consulting/services history |
| `pure_research_flag` | Negative: only academic/research roles |
| `seniority_match` | Title seniority matches target level |

#### Cluster 3: Behavioral Signals (~25% weight)
| Feature | Description |
|---|---|
| `recency_score` | Activity recency (last active date) |
| `open_to_work_flag` | Explicit job-seeking signal |
| `recruiter_response_rate` | Historical response rate to recruiters |
| `interview_completion_rate` | Interview no-show history |
| `profile_views_score` | Inbound interest signal |
| `github_activity_score` | GitHub commits, repos, and stars |

#### Cluster 4: Trust & Verification (~10% weight)
| Feature | Description |
|---|---|
| `verified_contact` | Email and phone both verified |
| `linkedin_connected` | LinkedIn profile linked |
| `profile_completeness` | Fraction of optional fields filled |
| `connection_count_score` | Professional network size |

#### Cluster 5: Location & Logistics (~15% weight)
| Feature | Description |
|---|---|
| `location_match` | City in target locations (Bengaluru, Hyderabad, Pune, Mumbai, Chennai, Delhi NCR, Remote) |
| `notice_ok` | Notice period ≤ 60 days |
| `notice_period_score` | Inverse of notice period (immediate is best) |

---

## 10. LightGBM LambdaRank Model

### Training Configuration
```python
params = {
    "objective": "lambdarank",
    "metric": "ndcg",
    "ndcg_eval_at": [10, 50, 100],
    "learning_rate": 0.1,
    "num_leaves": 31,
    "n_estimators": 200,
    "min_child_samples": 20,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
}
```

### Model Performance
- **Training Dataset:** 96,307 candidates × 47 features
- **Best Iteration:** 3 (early stopping)
- **NDCG@10:** Optimized ranking quality for top candidates
- **Model Size:** 21 KB (text booster format)
- **Load Time:** ~8.8 seconds on CPU

### Why LambdaRank?
Standard regression models optimize for absolute score accuracy. LambdaRank directly optimizes for **ranking quality** (NDCG — Normalized Discounted Cumulative Gain), ensuring the top candidates are correctly ordered relative to each other — which is the actual objective of this recruitment task.

---

## 11. Security Architecture

### 11.1 Pickle-Free Serialization
The traditional Python `pickle` library allows arbitrary code execution during deserialization — a critical security vulnerability when loading models from untrusted sources.

**RecruitIQ Engine completely eliminates pickle usage:**
- LightGBM model saved as native text: `booster.save_model("lgbm_ranker.txt")`
- Scaler parameters saved as plain JSON: `scaler_config.json`
- Loaded at runtime: `lgb.Booster(model_file="lgbm_ranker.txt")`

### 11.2 Zero Network Policy
The graded pipeline makes **zero network calls** — it reads only from local filesystem paths, ensuring no data exfiltration and full compliance with hackathon rules.

### 11.3 Input Validation
- All JSONL records are validated against the candidate schema before processing.
- Malformed records are skipped with a warning, not silently corrupted.
- All date fields are parsed with error handling — invalid dates default to `None` without crashing the pipeline.

---

## 12. Frontend Design System

### 12.1 Design Philosophy
The UI was designed with a **cyber-dark developer console** aesthetic — premium, high-tech, and data-forward. Every visual decision reinforces the idea that this is a powerful, intelligent engine.

### 12.2 Color System (HSL Tokens)
| Token | Color | Usage |
|---|---|---|
| `--accent` | `#6366f1` (Indigo) | Primary CTAs, borders, cursor dot |
| `--accent-gradient` | Indigo → Fuchsia | Active tab backgrounds, progress bars |
| Fuchsia `#d946ef` | Hover glow | Cursor ring on interactive hover |
| Emerald `#10b981` | Success/Elite badge | Top-ranked candidates |
| Amber `#f59e0b` | Warning | Threat/flagged indicators |
| Danger `#ef4444` | Radar / Honeypots | Flagged candidate alerts |

### 12.3 Component Architecture

| Component | Description |
|---|---|
| `Hero3D.tsx` | Three.js particle network background, mouse-reactive |
| `CustomCursor.tsx` | GSAP-powered trailing cursor with hover state transitions |
| `LenisProvider.tsx` | Smooth scroll physics wrapper (Lenis library) |
| `IngestionConsole.tsx` | Drag-and-drop file upload with live parsing feedback |
| `Dashboard.tsx` | Ranked leaderboard, SVG match curve, KPI tiles |
| `CandidateCard.tsx` | Animated radial score ring + candidate info card |
| `CandidateModal.tsx` | Full-screen detail overlay with AI reasoning timeline |
| `SecurityRadar.tsx` | Conic CSS radar sweep + flagged candidate list |
| `ExportDesk.tsx` | CSV/XLSX download console with data preview |

### 12.4 Animation Stack
- **GSAP 3.15:** Tab transitions (`power2.out`), staggered card entrances, scroll-triggered parallax.
- **Lenis 1.3:** Physics-based smooth scrolling with configurable lerp and duration.
- **CSS Keyframes:** `@keyframes radarRotate` for the security radar sweep.
- **Custom Cursor:** GSAP `gsap.set()` (instant) for the dot + `gsap.to()` (200ms `power3.out`) for the ring.

---

## 13. Performance & Constraints Compliance

### Hackathon Constraint Verification

| Constraint | Limit | Actual | Status |
|---|---|---|---|
| Pipeline Runtime | ≤ 300 seconds | **92.63 seconds** | ✅ 3.2× under limit |
| Memory Usage | ≤ 16 GB | **< 2 GB** | ✅ 8× under limit |
| Compute | CPU only | No GPU used | ✅ Compliant |
| Network Calls | Zero | Zero | ✅ Compliant |
| Honeypot Detection Rate | ≤ 10% | **3.69%** | ✅ Compliant |
| Output Rows | Exactly 100 | **100** | ✅ Compliant |
| CSV Column Spec | As specified | All columns present | ✅ Validated |

### Submission Validation
```bash
> python validate_submission.py submission.csv
Submission is valid. ✅
```

---

## 14. Project File Structure

```
d:\RecruitIQ_Engine\
│
├── dataset/                          # All raw data and specifications
│   ├── candidates.jsonl              # 487 MB · 100,000 candidates (gitignored)
│   ├── sample_candidates.json        # 50-candidate sandbox for UI testing
│   ├── candidate_schema.json         # Canonical field definitions
│   ├── features.npz                  # Pre-computed feature matrix (gitignored)
│   ├── labels.json                   # Weak supervision labels (gitignored)
│   ├── job_description.docx          # Original JD document
│   └── *.txt / *.docx                # Specification and signal documents
│
├── backend/                          # Python pipeline and model training
│   ├── ranker/
│   │   ├── ranker.py                 # ← GRADED ENTRYPOINT
│   │   ├── honeypot_filter.py        # 6 deterministic fraud predicates
│   │   ├── scorer.py                 # 47-feature extraction & scoring
│   │   ├── explainer.py              # Natural language justification generator
│   │   └── export.py                 # CSV writer with spec formatting
│   ├── offline_lab/
│   │   ├── model_trainer.py          # LightGBM LambdaRank training
│   │   ├── feature_engineer.py       # Feature matrix construction
│   │   ├── weak_label_generator.py   # Rule-based relevance labeling
│   │   ├── jd_parser.py              # Job description parser
│   │   └── artifacts/
│   │       ├── lgbm_ranker.txt       # Trained text booster (no pickle)
│   │       ├── scaler_config.json    # MinMax normalization params
│   │       └── feature_names.json    # Feature index labels
│   ├── smoke_test.py                 # 50-candidate quick sanity check
│   ├── validate_submission.py        # Hackathon spec CSV validator
│   ├── inspect_submission.py         # Submission spot checker
│   └── requirements.txt              # Python dependencies
│
├── frontend/                         # Vite React TypeScript UI
│   ├── css/
│   │   └── index.css                 # Global cyber-dark design system
│   ├── js/
│   │   ├── App.tsx                   # Root layout & tab router
│   │   ├── main.tsx                  # Vite DOM mount
│   │   ├── lib/scorer.ts             # TypeScript client-side scorer
│   │   └── components/
│   │       ├── CustomCursor.tsx      # GSAP trailing cursor animation
│   │       ├── Hero3D.tsx            # Three.js particle background
│   │       ├── LenisProvider.tsx     # Smooth scroll provider
│   │       ├── IngestionConsole.tsx  # File upload & parsing portal
│   │       ├── Dashboard.tsx         # Ranked leaderboard & KPIs
│   │       ├── CandidateCard.tsx     # Radial ring candidate card
│   │       ├── CandidateModal.tsx    # Detail overlay with AI reasoning
│   │       ├── SecurityRadar.tsx     # Conic radar sweep
│   │       └── ExportDesk.tsx        # CSV/XLSX export console
│   ├── public/
│   │   ├── sample_candidates.json    # Sandbox dataset for live demo
│   │   └── favicon.svg               # RecruitIQ robot favicon
│   ├── package.json                  # Dependencies (Vite, React, GSAP, Lenis, Three.js)
│   └── vite.config.ts                # Build configuration
│
└── .gitignore                        # Ignores large files & build artifacts
```

---

## 15. Deployment & DevOps

### Local Development
```bash
# Backend (Python ranker)
cd backend
pip install -r requirements.txt
python ranker/ranker.py --candidates ../dataset/candidates.jsonl --out submission.csv
python validate_submission.py submission.csv

# Frontend (Vite React)
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### Production Deployment (Vercel)
The frontend is continuously deployed to Vercel:

| Setting | Value |
|---|---|
| Platform | Vercel |
| Framework | Vite |
| Root Directory | `frontend/` |
| Build Command | `npm run build` |
| Output Directory | `dist/` |
| Production URL | https://recruitiq-engine.vercel.app |
| Build Time | 13 seconds |

### Git Configuration
- **Repository:** https://github.com/bhavsarhem/RecruitIQ_Engine
- **Branch:** `main`
- **Large files gitignored:** `candidates.jsonl`, `features.npz`, `labels.json`, `node_modules/`, `dist/`

---

## 16. Results & Validation

### Top 10 Ranked Candidates (Sample)

| Rank | Candidate ID | Title | YOE | Score | Key Skills |
|---|---|---|---|---|---|
| 1 | CAND_0000031 | Recommendation Systems Engineer | 6.0y | 0.7275 | Sentence Transformers, FAISS, Embeddings |
| 2 | CAND_0000038 | Java Developer | 6.7y | 0.5310 | Weaviate, MLOps |
| 3 | CAND_0000001 | Backend Engineer | 6.9y | 0.5304 | NLP, Milvus, Fine-tuning LLMs |
| 4 | CAND_0000014 | Frontend Engineer | 8.4y | 0.5185 | FAISS, OpenSearch |
| 5 | CAND_0000015 | Software Engineer | 5.4y | 0.5083 | Qdrant, PyTorch |

### Production Build Verification
```
vite v8.0.16 building client environment for production...
✓ 1597 modules transformed.
dist/index.html              0.98 kB │ gzip:   0.52 kB
dist/assets/index.css       49.42 kB │ gzip:   9.02 kB
dist/assets/index.js      1250.88 kB │ gzip: 353.66 kB
✓ built in 1.07s
```

---

## 17. Future Roadmap

### Near-Term (v1.1)
- [ ] Code-split large JS bundle with dynamic `import()` for faster initial page load.
- [ ] Add SHAP feature importance visualization in the candidate detail modal.
- [ ] Support `.xlsx` direct upload in addition to CSV/JSON/JSONL.

### Mid-Term (v2.0)
- [ ] Add a real-time WebSocket feed for processing live candidate updates.
- [ ] Build a recruiter collaboration layer with notes and shortlist sharing.
- [ ] Implement A/B scoring comparison between weighted scorer and LightGBM.

### Long-Term (v3.0)
- [ ] Fine-tune a domain-specific LLM for richer candidate reasoning generation.
- [ ] Multi-role support — allow simultaneous scoring across multiple JD profiles.
- [ ] Enterprise SSO integration (Okta, Auth0).

---

*Built with ❤️ for the Redrob India Data & AI Hackathon 2026.*  
*Live at: https://recruitiq-engine.vercel.app*
