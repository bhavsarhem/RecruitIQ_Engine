# 🤖 RecruitIQ Engine
### Intelligent Candidate Discovery & Ranking — Redrob Hackathon 2026

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python)](https://python.org)
[![LightGBM](https://img.shields.io/badge/LightGBM-LambdaRank-brightgreen)](https://lightgbm.readthedocs.io)
[![UI](https://img.shields.io/badge/UI-Next.js-000000?logo=nextdotjs)](https://nextjs.org)
[![CPU Only](https://img.shields.io/badge/Compute-CPU--only-orange)]()
[![Runtime](https://img.shields.io/badge/100k%20candidates-~45s-success)]()
[![License](https://img.shields.io/badge/License-MIT-lightgrey)](LICENSE)

---

## 📌 Overview

**RecruitIQ Engine** is a fully constraint-compliant AI candidate ranking system built for the **Redrob India Data & AI Hackathon 2026**. It ranks 100,000 candidates for a *Senior AI Engineer* role using a 47-feature weighted ensemble (with optional LightGBM LambdaRank upgrade), deterministic honeypot detection, and template-based reasoning generation — all running in **~45 seconds on CPU with zero network calls**.

---

## ✨ Features

| Capability | Detail |
|---|---|
| 🍯 **Honeypot Detection** | 6 deterministic predicates — catches fake/stuffed profiles |
| 🧠 **47-Feature Scoring** | Skills match, career trajectory, behavioral signals, education |
| 🌲 **LightGBM LambdaRank** | Trained on weak labels; falls back to weighted scorer if no model |
| 💬 **Reasoning Generation** | Human-readable justification per candidate |
| ⚡ **Speed** | 100k candidates ranked in ~45s (CPU only, no GPU, no internet) |
| 🖥️ **Next.js UI** | Modern Next.js dashboard for interactive discovery |
| 📤 **CSV Export** | Submission-ready output validated against hackathon spec |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  A. OFFLINE LAB  (run once — no constraints)                     │
│     offline_lab/                                                 │
│     ├── jd_parser.py             JD → structured JSON            │
│     ├── feature_engineer.py      100k candidates → features.npz  │
│     ├── weak_label_generator.py  Rule-based relevance labels      │
│     └── model_trainer.py         LightGBM LambdaRank training    │
│                                                                  │
│  B. ONLINE RANKER  (≤300s · ≤16GB · CPU only)                   │
│     ranker/ranker.py  ← GRADED ENTRYPOINT                        │
│     Stream JSONL → Honeypot Gate → Features → Score → CSV        │
│                                                                  │
│  C. INTERACTIVE UI  (Next.js App)                                 │
│     recruitiq-ui/                                                │
│     Modern React/Next.js dashboard for talent discovery          │
└──────────────────────────────────────────────────────────────────┘
```

### Phase B Pipeline

| Step | Operation | Time (100k) |
|---|---|---|
| 0 | Load artifacts (LightGBM model if available) | <0.01s |
| 1–3 | Stream JSONL + Honeypot gate + Feature extraction | ~42s |
| 6 | Sort 96k survivors, select Top-100 | ~0.1s |
| 7 | Template reasoning for Top-100 | ~0.02s |
| 9 | CSV export | <0.1s |
| **Total** | | **~45s** |

---

## 🍯 Honeypot Detection (6 Deterministic Predicates)

All run in O(1) per candidate:

1. **Timeline impossible** — future start dates or overlapping past roles (>6mo)
2. **Framework age impossible** — e.g. "15 years of React" (React launched 2013)
3. **Zero-duration expert** — Expert skill with 0 months used (≥2 flags)
4. **Skill stuffing** — >12 advanced/expert skills, avg endorsements <1, avg duration <3mo
5. **Impossible YOE** — Stated experience >> sum of career `duration_months`
6. **Title-skill mismatch** — Non-technical title + 6+ expert AI skills

**Detected:** 3,693 honeypots (3.69% of 100k) — well within the ≤10% threshold.

---

## 🧠 Scoring: 47-Feature Weighted Ensemble

| Feature Group | Weight | Key Features |
|---|---|---|
| Skills & JD match | ~30% | `hard_skill_weight_sum`, `embedding_skill_count`, `ranking_eval_skill` |
| Career trajectory | ~20% | `product_company_ratio`, `yoe_in_range`, `consulting_only` (negative) |
| Behavioral signals | ~25% | `recency_score`, `open_to_work`, `recruiter_response_rate` |
| Profile quality | ~10% | `verified_contact`, `profile_completeness`, `linkedin_connected` |
| Location/logistics | ~8% | `location_match`, `notice_ok` |
| Education | ~5% | `edu_tier`, `cs_degree` |
| Disqualifiers | negative | `domain_disqualifier`, `pure_research_flag`, `consulting_only` |

> When LightGBM model artifacts are present, the trained model replaces the weighted scorer.

---

## 🚀 Quick Start

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Run the ranker (produces submission CSV)

```bash
python ranker/ranker.py \
    --candidates ./candidates.jsonl \
    --out ./submission.csv
```

**Expected output:**
```
[0] Artifacts loaded (LightGBM) | 2.5s
[1-3] Ingested 100,000 candidates | Filtered 3,693 honeypots (3.7%) | 96,307 survivors | 42.3s
[6] Sorted 96,307 survivors, selected top 100 | 0.1s
[7] Reasoning generated for 100 candidates | 0.02s
[9] CSV written to ./submission.csv | 0.05s

Total runtime: 45.7s
Budget remaining: 254.3s (of 300s)
Scorer: LightGBM
```

### 3. Validate submission

```bash
python validate_submission.py submission.csv
# → Submission is valid. ✅
```

### 4. Launch the Next.js UI

```bash
cd recruitiq-ui
npm install
npm run dev
```

Then open **http://localhost:3000** in your browser.

---

## 🔬 Phase A — Offline Lab (Optional)

Run these once to train the LightGBM model. Not required — `ranker.py` falls back to the weighted scorer if no artifacts exist.

```bash
# 1. Extract features (~42 seconds)
python offline_lab/feature_engineer.py \
    --candidates ./candidates.jsonl \
    --out offline_lab/artifacts/features.npz

# 2. Generate weak labels
python offline_lab/weak_label_generator.py \
    --candidates ./candidates.jsonl \
    --out offline_lab/artifacts/labels.json

# 3. Train LightGBM LambdaRank model
python offline_lab/model_trainer.py \
    --features offline_lab/artifacts/features.npz \
    --labels offline_lab/artifacts/labels.json \
    --out offline_lab/artifacts/lgbm_ranker.pkl
```

---

## 🖥️ Interactive Next.js UI (Phase C)

The React/Next.js UI (`recruitiq-ui/`) provides a world-class candidate discovery interface:

- **Dashboard View**: Clean visuals showing qualification metrics, anomaly detections, and elite fit candidates.
- **Dynamic Search**: Interactive filters for experience, locations, and skills.
- **Theme Switcher**: Smooth live toggle between Premium Dark Mode and Clean Light Mode.
- **Smooth Physics**: Integrates Lenis smooth scrolling and GSAP animations.

```bash
cd recruitiq-ui
npm install
npm run dev
```

---

## 📊 Compute Constraints (Verified ✅)

| Constraint | Limit | Actual |
|---|---|---|
| Runtime | ≤300s | **~45s** (6.5× margin) |
| Memory | ≤16GB | **<2GB** |
| Compute | CPU-only | ✅ No GPU |
| Network | None | ✅ Zero calls |
| Honeypot rate | ≤10% | **3.69%** |
| Output | 100 ranked rows | ✅ Validated |

---

## 📁 Repository Structure

```
recruitiq-engine/
├── offline_lab/                  # Phase A — unlimited time
│   ├── jd_parser.py
│   ├── honeypot_rules.py
│   ├── feature_engineer.py
│   ├── weak_label_generator.py
│   ├── model_trainer.py
│   └── artifacts/                # serialized model, features (gitignored)
├── ranker/                       # Phase B — graded artifact
│   ├── ranker.py                 ← ENTRYPOINT
│   ├── honeypot_filter.py
│   ├── scorer.py
│   ├── explainer.py
│   └── export.py
├── recruitiq-ui/                 # Phase C — Next.js UI
│   └── (Next.js files & components)
├── smoke_test.py                 # Quick sanity check on 50-candidate sample
├── inspect_submission.py         # Inspect generated submission CSV
├── submission_final.csv          # Final submission output
├── submission_metadata.yaml      # Hackathon metadata template
├── requirements.txt
└── README.md
```

---

## 🧪 Smoke Test

Run a quick sanity check against the 50-candidate sample:

```bash
python smoke_test.py
```

Expected output:
```
--- Sample of 50 candidates ---
Honeypots detected: 0 / 50

Top 10:
  0.7278 | CAND_0000031 | Recommendation Systems Engineer (6.0y) | AI:6 | ['Sentence Transformers', 'FAISS', 'Embeddings']
  0.5314 | CAND_0000038 | Java Developer (6.7y) | AI:1 | ['Weaviate', 'MLOps']
  ...
```

---

## 📋 Requirements

```
numpy>=1.24.0
lightgbm>=4.3.0
scikit-learn>=1.4.0
python-docx>=1.1.0    # offline_lab only

```

> The weighted baseline (`ranker.py` without a model) runs on **stdlib only** — no pip installs required for the graded artifact if no LightGBM model is present.

---

## 📄 License

MIT — see [LICENSE](LICENSE)

---

*Built for the Redrob India Data & AI Hackathon 2026.*
