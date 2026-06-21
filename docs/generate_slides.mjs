// RecruitIQ Engine — Google Slides / PPTX Generator
// Uses pptxgenjs to create a 14-slide presentation deck
// Run: node generate_slides.js
// Output: docs/RecruitIQ_Engine_Presentation.pptx

import PptxGenJS from 'pptxgenjs';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, 'RecruitIQ_Engine_Presentation.pptx');

// ─── Design Tokens ───────────────────────────────────────────────────────────
const C = {
  bg:       '030712',   // near-black
  surface:  '0b0f19',   // dark navy
  indigo:   '6366f1',   // accent indigo
  fuchsia:  'd946ef',   // hover fuchsia
  emerald:  '10b981',   // success green
  amber:    'f59e0b',   // warning amber
  red:      'ef4444',   // danger red
  white:    'f3f4f6',   // text primary
  muted:    '9ca3af',   // text muted
  border:   '1e1b4b',   // indigo-900
};

const FONT_TITLE  = 'Segoe UI';
const FONT_BODY   = 'Segoe UI';
const FONT_MONO   = 'Courier New';

// ─── Helper Builders ─────────────────────────────────────────────────────────
function slideBase(prs) {
  const sld = prs.addSlide();

  // Full-bleed dark background
  sld.addShape(prs.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: '100%',
    fill: { color: C.bg },
    line: { color: C.bg },
  });

  // Subtle top gradient bar (indigo → fuchsia)
  sld.addShape(prs.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: 0.07,
    fill: { type: 'grad', stops: [
      { position: 0, color: C.indigo },
      { position: 100, color: C.fuchsia },
    ]},
    line: { color: C.bg },
  });

  // Bottom accent line
  sld.addShape(prs.ShapeType.rect, {
    x: 0, y: 7.43, w: '100%', h: 0.07,
    fill: { color: C.border },
    line: { color: C.bg },
  });

  return sld;
}

function addTitle(sld, text, x = 0.4, y = 0.25, w = 9.2, fontSize = 32) {
  sld.addText(text, {
    x, y, w, h: 0.7,
    fontSize,
    bold: true,
    color: C.white,
    fontFace: FONT_TITLE,
  });
}

function addSubtitle(sld, text, x = 0.4, y = 0.95, w = 9.2) {
  sld.addText(text, {
    x, y, w, h: 0.4,
    fontSize: 14,
    color: C.indigo,
    fontFace: FONT_BODY,
    bold: true,
  });
}

function addBullets(sld, items, x = 0.5, y = 1.5, w = 9.0, fontSize = 14) {
  const rows = items.map(item => {
    const isHeader = item.startsWith('##');
    const text = item.replace(/^##\s*/, '').replace(/^\*\*(.+)\*\*:/, '$1:');
    return {
      text,
      options: {
        fontSize: isHeader ? 16 : fontSize,
        bold: isHeader,
        color: isHeader ? C.indigo : C.white,
        bullet: !isHeader ? { type: 'bullet' } : false,
        indentLevel: item.startsWith('  ') ? 1 : 0,
      },
    };
  });

  sld.addText(rows, {
    x, y, w, h: 5.5,
    fontFace: FONT_BODY,
    valign: 'top',
  });
}

function addCodeBox(sld, code, x = 0.4, y = 3.5, w = 9.2, h = 2.8) {
  sld.addShape(prs.ShapeType.rect, {
    x, y, w, h,
    fill: { color: '111827' },
    line: { color: C.border, pt: 1 },
    rectRadius: 0.1,
  });
  sld.addText(code, {
    x: x + 0.15, y: y + 0.1, w: w - 0.3, h: h - 0.2,
    fontSize: 10,
    color: '86efac',
    fontFace: FONT_MONO,
    valign: 'top',
  });
}

function addTable(sld, head, rows, x = 0.4, y = 1.5, w = 9.2) {
  const tableData = [
    head.map(h => ({
      text: h,
      options: { bold: true, color: C.white, fill: { color: C.border }, fontSize: 12, align: 'center' },
    })),
    ...rows.map((row, ri) => row.map(cell => ({
      text: cell,
      options: { color: C.white, fill: { color: ri % 2 === 0 ? '0b0f19' : '111827' }, fontSize: 11 },
    }))),
  ];
  sld.addTable(tableData, {
    x, y, w,
    colW: Array(head.length).fill(w / head.length),
    border: { pt: 1, color: C.border },
    fontFace: FONT_BODY,
  });
}

function addKPI(sld, items, y = 2.2) {
  // items = [{label, value, color}]
  const cols = items.length;
  const colW = 10 / cols;
  items.forEach((kpi, i) => {
    const x = i * colW + 0.1;
    sld.addShape(prs.ShapeType.rect, {
      x, y, w: colW - 0.2, h: 1.8,
      fill: { color: '0b0f19' },
      line: { color: kpi.color || C.indigo, pt: 1 },
      rectRadius: 0.1,
    });
    sld.addText(kpi.value, {
      x, y: y + 0.2, w: colW - 0.2, h: 0.8,
      fontSize: 28, bold: true, color: kpi.color || C.indigo,
      fontFace: FONT_TITLE, align: 'center',
    });
    sld.addText(kpi.label, {
      x, y: y + 1.1, w: colW - 0.2, h: 0.5,
      fontSize: 10, color: C.muted,
      fontFace: FONT_BODY, align: 'center',
    });
  });
}

// ─── Presentation Build ───────────────────────────────────────────────────────
const prs = new PptxGenJS();
prs.layout = 'LAYOUT_WIDE'; // 13.33" x 7.5"

// ── SLIDE 1: Title ────────────────────────────────────────────────────────────
{
  const sld = slideBase(prs);

  // Logo box
  sld.addShape(prs.ShapeType.rect, {
    x: 0.4, y: 1.0, w: 1.0, h: 1.0,
    fill: { type: 'grad', stops: [
      { position: 0, color: C.indigo },
      { position: 100, color: C.fuchsia },
    ]},
    line: { color: C.bg },
    rectRadius: 0.15,
  });
  sld.addText('🤖', { x: 0.4, y: 1.05, w: 1.0, h: 1.0, fontSize: 40, align: 'center', valign: 'middle' });

  sld.addText('RecruitIQ Engine', {
    x: 1.6, y: 1.0, w: 8.0, h: 1.0,
    fontSize: 48, bold: true, color: C.white, fontFace: FONT_TITLE,
  });
  sld.addText('Intelligent Candidate Discovery, Ranking & Security Auditing', {
    x: 1.6, y: 2.1, w: 8.0, h: 0.6,
    fontSize: 18, color: C.indigo, fontFace: FONT_BODY, bold: true,
  });
  sld.addText('Redrob India Data & AI Hackathon 2026', {
    x: 1.6, y: 2.75, w: 8.0, h: 0.4,
    fontSize: 13, color: C.muted, fontFace: FONT_BODY,
  });

  // Stat pills
  const pills = [
    { label: '100K Candidates', color: C.indigo },
    { label: '92.6s Runtime', color: C.emerald },
    { label: '47 Features', color: C.fuchsia },
    { label: 'CPU Only', color: C.amber },
    { label: 'Vercel Deployed', color: C.red },
  ];
  pills.forEach((p, i) => {
    const x = 0.4 + i * 1.92;
    sld.addShape(prs.ShapeType.rect, { x, y: 4.0, w: 1.8, h: 0.4,
      fill: { color: '0b0f19' }, line: { color: p.color, pt: 1 }, rectRadius: 0.2 });
    sld.addText(p.label, { x, y: 4.0, w: 1.8, h: 0.4,
      fontSize: 10, color: p.color, fontFace: FONT_BODY, bold: true, align: 'center', valign: 'middle' });
  });

  sld.addText('https://recruitiq-engine.vercel.app', {
    x: 0.4, y: 6.5, w: 9.2, h: 0.4,
    fontSize: 11, color: C.muted, fontFace: FONT_MONO, align: 'center',
    hyperlink: { url: 'https://recruitiq-engine.vercel.app' },
  });
}

// ── SLIDE 2: Problem Statement ────────────────────────────────────────────────
{
  const sld = slideBase(prs);
  addTitle(sld, '😤 The Resume Screening Crisis');
  addSubtitle(sld, 'Why current ATS systems fail technical recruiting');

  const problems = [
    '## Volume Overload',
    '  Recruiters receive thousands of applications per senior role — human attention is diluted.',
    '  Standard ATS keyword matching rewards quantity over quality.',
    '## Profile Fraud & Honeypots',
    '  Fraudulent profiles claim impossible experience (e.g. "15 years of React" — React launched 2013).',
    '  Skill stuffing: copy-pasting JD requirements as invisible skills in resumes.',
    '## Lack of Objective Scoring',
    '  No standardized weighting of behavioral signals (response rates, availability).',
    '  Subjective recruiter bias creates inconsistent rankings across equally qualified candidates.',
  ];
  addBullets(sld, problems, 0.5, 1.45, 9.0, 13);
}

// ── SLIDE 3: Solution Overview ────────────────────────────────────────────────
{
  const sld = slideBase(prs);
  addTitle(sld, '🧠 The RecruitIQ Solution');
  addSubtitle(sld, 'Three-phase pipeline: Offline Training → Online Ranking → Interactive UI');

  const phases = [
    { label: 'Phase A\nOffline Lab', desc: 'Feature engineering,\nweak label generation,\nLightGBM training', color: C.amber, x: 0.4 },
    { label: 'Phase B\nOnline Ranker', desc: 'Stream JSONL →\nHoneypot Gate →\n47-feature scoring', color: C.indigo, x: 3.6 },
    { label: 'Phase C\nInteractive UI', desc: 'Vite/React dashboard,\nleaderboard, radar sweep,\nCSV export', color: C.emerald, x: 6.8 },
  ];

  phases.forEach(p => {
    sld.addShape(prs.ShapeType.rect, {
      x: p.x, y: 1.6, w: 2.8, h: 3.8,
      fill: { color: '0b0f19' }, line: { color: p.color, pt: 2 }, rectRadius: 0.12,
    });
    sld.addText(p.label, {
      x: p.x, y: 1.7, w: 2.8, h: 0.8,
      fontSize: 15, bold: true, color: p.color, fontFace: FONT_TITLE, align: 'center',
    });
    sld.addText(p.desc, {
      x: p.x + 0.15, y: 2.65, w: 2.5, h: 2.6,
      fontSize: 12, color: C.white, fontFace: FONT_BODY, align: 'center', valign: 'top',
    });
  });

  // Arrows between boxes
  sld.addText('→', { x: 3.15, y: 3.1, w: 0.6, h: 0.5, fontSize: 24, color: C.indigo, align: 'center' });
  sld.addText('→', { x: 6.35, y: 3.1, w: 0.6, h: 0.5, fontSize: 24, color: C.indigo, align: 'center' });
}

// ── SLIDE 4: Results at a Glance ──────────────────────────────────────────────
{
  const sld = slideBase(prs);
  addTitle(sld, '📊 Results at a Glance');
  addSubtitle(sld, 'All hackathon constraints satisfied with significant margin');

  addKPI(sld, [
    { label: 'Candidates Processed', value: '100,000', color: C.white },
    { label: 'Honeypots Detected', value: '3,693', color: C.red },
    { label: 'Survivors Scored', value: '96,307', color: C.emerald },
    { label: 'Pipeline Runtime', value: '92.6s', color: C.indigo },
    { label: 'Budget Remaining', value: '207s', color: C.amber },
  ], 2.0);

  addTable(sld,
    ['Constraint', 'Limit', 'Actual', 'Status'],
    [
      ['Runtime', '≤ 300s', '92.63s (3.2× margin)', '✅'],
      ['Memory', '≤ 16 GB', '< 2 GB (8× margin)', '✅'],
      ['Compute', 'CPU only', 'No GPU', '✅'],
      ['Network', 'Zero calls', 'Zero', '✅'],
      ['Honeypot Rate', '≤ 10%', '3.69%', '✅'],
      ['Output Rows', 'Exactly 100', '100', '✅'],
    ],
    0.4, 4.2, 9.2
  );
}

// ── SLIDE 5: Honeypot Detection ────────────────────────────────────────────────
{
  const sld = slideBase(prs);
  addTitle(sld, '🍯 Honeypot Detection Gate', 0.4, 0.25, 9.2, 28);
  addSubtitle(sld, '6 deterministic O(1) fraud predicates run before any scoring');

  const predicates = [
    ['1', 'Timeline Impossibility', 'Future dates, overlapping roles (>6mo), durations >40y'],
    ['2', 'Framework Age Impossible', '"15 years of React" — React launched 2013. Impossible.'],
    ['3', 'Zero-Duration Expert', '≥2 Expert skills with 0 months of usage duration'],
    ['4', 'Skill Stuffing', '>12 expert skills, avg endorsements <1, avg duration <3mo'],
    ['5', 'Impossible YOE', 'Stated YOE exceeds career duration sum by >36 months'],
    ['6', 'Title-Skill Mismatch', 'Marketing/Sales title claiming 6+ Expert AI/ML skills'],
  ];

  addTable(sld,
    ['#', 'Predicate', 'Description'],
    predicates,
    0.4, 1.4, 9.2
  );

  sld.addShape(prs.ShapeType.rect, {
    x: 0.4, y: 6.2, w: 9.2, h: 0.6,
    fill: { color: '1a0b0b' }, line: { color: C.red, pt: 1 }, rectRadius: 0.1,
  });
  sld.addText('Detected: 3,693 honeypots (3.69% of 100,000)  •  Threshold: ≤10%  •  Status: ✅ Compliant', {
    x: 0.4, y: 6.2, w: 9.2, h: 0.6,
    fontSize: 12, color: C.red, fontFace: FONT_BODY, align: 'center', valign: 'middle', bold: true,
  });
}

// ── SLIDE 6: 47-Feature Scoring ────────────────────────────────────────────────
{
  const sld = slideBase(prs);
  addTitle(sld, '🧮 47-Dimension Feature Scoring');
  addSubtitle(sld, 'Normalized feature vectors across 5 semantic clusters');

  addTable(sld,
    ['Feature Cluster', 'Weight', 'Key Features'],
    [
      ['Skills & JD Match', '~30%', 'hard_skill_weight_sum, embedding_skill_count, ai_skill_density'],
      ['Career & Experience', '~20%', 'yoe_in_range, product_company_ratio, avg_tenure_months'],
      ['Behavioral Signals', '~25%', 'open_to_work_flag, recruiter_response_rate, github_activity_score'],
      ['Trust & Verification', '~10%', 'verified_contact, linkedin_connected, profile_completeness'],
      ['Location & Logistics', '~15%', 'location_match (Bengaluru/Remote/etc), notice_ok (≤60 days)'],
      ['Disqualifiers', 'Negative', 'consulting_only, pure_research_flag, domain_disqualifier'],
    ],
    0.4, 1.4, 9.2
  );
}

// ── SLIDE 7: LightGBM Model ───────────────────────────────────────────────────
{
  const sld = slideBase(prs);
  addTitle(sld, '🌲 LightGBM LambdaRank Model');
  addSubtitle(sld, 'Trained on 96,307 candidates × 47 features — optimizes NDCG ranking quality');

  const bullets = [
    '## Why LambdaRank?',
    '  Standard regression optimizes absolute scores. LambdaRank directly optimizes NDCG — the actual ranking quality metric.',
    '## Training Configuration',
    '  Objective: lambdarank  |  NDCG evaluated at @10, @50, @100',
    '  Learning Rate: 0.1  |  Num Leaves: 31  |  Estimators: 200',
    '## Artifacts (Pickle-Free)',
    '  Model saved as lgbm_ranker.txt (native text booster — zero pickle security risk).',
    '  Scaler parameters saved as scaler_config.json (no scikit-learn at inference time).',
    '## Fallback Safety',
    '  If model artifacts are missing, pipeline falls back to weighted scorer automatically — zero crashes.',
  ];
  addBullets(sld, bullets, 0.5, 1.45, 9.0, 13);
}

// ── SLIDE 8: Security Architecture ────────────────────────────────────────────
{
  const sld = slideBase(prs);
  addTitle(sld, '🔒 Security Architecture');
  addSubtitle(sld, 'Pickle-free serialization, zero network, validated inputs');

  const boxes = [
    { title: 'Pickle-Free Model', body: 'Model saved as native LightGBM text booster.\nLoaded via lgb.Booster(model_file=…)\nEliminates arbitrary code execution risk.', color: C.emerald, x: 0.4, y: 1.6 },
    { title: 'Zero Network Policy', body: 'Pipeline reads ONLY from local filesystem.\nNo HTTP calls, no DNS lookups, no sockets.\nFull hackathon compliance guaranteed.', color: C.indigo, x: 3.55, y: 1.6 },
    { title: 'Input Validation', body: 'All JSONL records validated against schema.\nMalformed records are skipped, not crashed.\nDate fields have full error handling.', color: C.amber, x: 6.7, y: 1.6 },
  ];

  boxes.forEach(b => {
    sld.addShape(prs.ShapeType.rect, {
      x: b.x, y: b.y, w: 2.9, h: 3.5,
      fill: { color: '0b0f19' }, line: { color: b.color, pt: 1 }, rectRadius: 0.12,
    });
    sld.addText(b.title, {
      x: b.x, y: b.y + 0.15, w: 2.9, h: 0.6,
      fontSize: 13, bold: true, color: b.color, fontFace: FONT_TITLE, align: 'center',
    });
    sld.addText(b.body, {
      x: b.x + 0.15, y: b.y + 0.9, w: 2.6, h: 2.4,
      fontSize: 11, color: C.white, fontFace: FONT_BODY, valign: 'top',
    });
  });
}

// ── SLIDE 9: Frontend UI Overview ─────────────────────────────────────────────
{
  const sld = slideBase(prs);
  addTitle(sld, '🎨 Premium Interactive Dashboard');
  addSubtitle(sld, 'Vite · React 19 · TypeScript · GSAP · Lenis · Three.js — Deployed on Vercel');

  const tabs = [
    { name: 'Ingestion Control', desc: 'Drag-and-drop CSV/JSON/JSONL upload\nLive parsing feedback & error states\nSchema alignment & validation', color: C.indigo },
    { name: 'Leaderboard FIT', desc: 'Ranked candidate cards with radial score rings\nSVG match distribution curve\nLive search + skill/YOE/score filters', color: C.emerald },
    { name: 'Threat Radar', desc: 'Conic CSS radar sweep animation\nFlagged candidate audit list\nHoneypot rule breakdown per candidate', color: C.red },
    { name: 'Export Console', desc: 'One-click CSV and XLSX download\nData preview table\nSubmission metadata generator', color: C.amber },
  ];

  tabs.forEach((t, i) => {
    const x = 0.4 + (i % 2) * 4.8;
    const y = 1.6 + Math.floor(i / 2) * 2.5;
    sld.addShape(prs.ShapeType.rect, {
      x, y, w: 4.4, h: 2.2,
      fill: { color: '0b0f19' }, line: { color: t.color, pt: 1 }, rectRadius: 0.1,
    });
    sld.addText(t.name, {
      x, y: y + 0.1, w: 4.4, h: 0.5,
      fontSize: 13, bold: true, color: t.color, fontFace: FONT_TITLE, align: 'center',
    });
    sld.addText(t.desc, {
      x: x + 0.2, y: y + 0.65, w: 4.0, h: 1.4,
      fontSize: 11, color: C.white, fontFace: FONT_BODY, valign: 'top',
    });
  });
}

// ── SLIDE 10: Custom Cursor & Animations ──────────────────────────────────────
{
  const sld = slideBase(prs);
  addTitle(sld, '✨ Custom Cursor & Animation Stack');
  addSubtitle(sld, 'GSAP physics-based cursor trailing with reactive hover states');

  const bullets = [
    '## Custom GSAP Cursor (CustomCursor.tsx)',
    '  6px center dot — follows mouse instantly via gsap.set() (zero lag)',
    '  28px trailing ring — gsap.to() with power3.out easing (200ms smooth physics)',
    '  On hover: ring expands to 48px + glows fuchsia (#d946ef) + 8px dot',
    '  mix-blend-mode: difference on center dot for premium visual contrast effect',
    '  Responsive: only active on pointer:fine devices (not touch/mobile)',
    '## GSAP Tab Transitions',
    '  Tab panels animate in with opacity + scale + y transforms on every switch',
    '## Lenis Smooth Scroll',
    '  Physics-normalized mouse wheel scrolling for premium inertia feel',
    '## Three.js Particle Background',
    '  Reactive particle network — mouse proximity connects nearby nodes',
  ];
  addBullets(sld, bullets, 0.5, 1.45, 9.0, 13);
}

// ── SLIDE 11: Pipeline Execution Flow ────────────────────────────────────────
{
  const sld = slideBase(prs);
  addTitle(sld, '⚡ Pipeline Execution Flow');
  addSubtitle(sld, 'Streaming JSONL → Fraud Gate → Scoring → CSV in 92.63 seconds');

  addTable(sld,
    ['Step', 'Operation', 'Runtime (100k)'],
    [
      ['0', 'Load LightGBM text booster artifact', '8.83s'],
      ['1–3', 'Stream JSONL + Honeypot gate + Feature extraction', '81.95s'],
      ['6', 'Sort 96,307 survivors, select Top-100', '0.36s'],
      ['7', 'Template reasoning for Top-100 candidates', '0.10s'],
      ['9', 'Write submission.csv to disk', '0.01s'],
      ['TOTAL', '', '92.63s (207.4s budget remaining)'],
    ],
    0.4, 1.4, 9.2
  );

  sld.addShape(prs.ShapeType.rect, { x: 0.4, y: 5.7, w: 9.2, h: 0.6,
    fill: { color: '0a1f0a' }, line: { color: C.emerald, pt: 1 }, rectRadius: 0.1 });
  sld.addText('Key Optimization: Date Parsing O(1) Cache — replaced datetime.strptime() inner-loop overhead with dict-based cache (~85% speedup)', {
    x: 0.4, y: 5.7, w: 9.2, h: 0.6,
    fontSize: 11, color: C.emerald, fontFace: FONT_BODY, align: 'center', valign: 'middle',
  });
}

// ── SLIDE 12: Tech Stack ──────────────────────────────────────────────────────
{
  const sld = slideBase(prs);
  addTitle(sld, '🛠️ Technology Stack');
  addSubtitle(sld, 'Full-stack Python + React/Vite — deployed on Vercel with CI/CD via GitHub');

  addTable(sld,
    ['Layer', 'Technology', 'Usage'],
    [
      ['Python Backend', 'LightGBM 4.3+, NumPy 1.24+', 'LambdaRank model training & ranking pipeline'],
      ['Python Backend', 'Pure stdlib (no pip at inference)', 'Weighted scorer fallback — zero dependencies'],
      ['Frontend Core', 'Vite 8 + React 19 + TypeScript 6', 'SPA framework with HMR and production builds'],
      ['Animations', 'GSAP 3.15 + CSS keyframes', 'Tab transitions, cursor physics, staggered cards'],
      ['Scroll Physics', 'Lenis 1.3', 'Inertia-based smooth scrolling normalization'],
      ['3D Graphics', 'Three.js + @react-three/fiber', 'Interactive particle network background'],
      ['Data Export', 'PapaParse + XLSX + PptxGenJS', 'CSV/JSONL parsing, Excel/PPTX generation'],
      ['Deployment', 'Vercel + GitHub (main branch)', 'Auto-deploy on push — 13 second build time'],
    ],
    0.4, 1.4, 9.2
  );
}

// ── SLIDE 13: Project Structure ───────────────────────────────────────────────
{
  const sld = slideBase(prs);
  addTitle(sld, '📁 Project Architecture');
  addSubtitle(sld, 'Clean 3-folder monorepo: frontend/ · backend/ · dataset/');

  const cols = [
    {
      title: 'dataset/', color: C.amber,
      items: ['candidates.jsonl (487 MB)', 'sample_candidates.json', 'features.npz', 'labels.json', 'job_description.docx', '*.txt specifications'],
      x: 0.4,
    },
    {
      title: 'backend/', color: C.indigo,
      items: ['ranker/ranker.py ← ENTRYPOINT', 'ranker/honeypot_filter.py', 'ranker/scorer.py', 'offline_lab/model_trainer.py', 'artifacts/lgbm_ranker.txt', 'validate_submission.py'],
      x: 3.5,
    },
    {
      title: 'frontend/', color: C.emerald,
      items: ['css/index.css (design system)', 'js/App.tsx + main.tsx', 'js/components/*.tsx (8 files)', 'js/lib/scorer.ts', 'public/sample_candidates.json', 'package.json + vite.config.ts'],
      x: 6.6,
    },
  ];

  cols.forEach(col => {
    sld.addShape(prs.ShapeType.rect, { x: col.x, y: 1.6, w: 2.9, h: 5.2,
      fill: { color: '0b0f19' }, line: { color: col.color, pt: 1 }, rectRadius: 0.1 });
    sld.addText(col.title, { x: col.x, y: 1.7, w: 2.9, h: 0.5,
      fontSize: 14, bold: true, color: col.color, fontFace: FONT_TITLE, align: 'center' });
    col.items.forEach((item, i) => {
      sld.addText('• ' + item, { x: col.x + 0.15, y: 2.35 + i * 0.65, w: 2.6, h: 0.6,
        fontSize: 10, color: C.white, fontFace: FONT_MONO });
    });
  });
}

// ── SLIDE 14: Business Impact & Next Steps ────────────────────────────────────
{
  const sld = slideBase(prs);
  addTitle(sld, '🚀 Business Impact & Roadmap');
  addSubtitle(sld, 'Enterprise-ready candidate intelligence — shipped and live');

  const impacts = [
    { icon: '🛡️', title: 'Zero Fraud Ingestion', desc: 'Filters all honeypot/fake profiles before scoring — clean candidate pools only', color: C.red },
    { icon: '⚡', title: 'Ultra-Fast Screening', desc: '100,000 candidates ranked in 92.6 seconds on CPU — 3.2× under budget', color: C.amber },
    { icon: '🧠', title: 'Explainable Rankings', desc: 'Every candidate receives human-readable AI reasoning — zero black-box decisions', color: C.indigo },
    { icon: '🌐', title: 'Live on Vercel', desc: 'Deployed at recruitiq-engine.vercel.app — GitHub-connected CI/CD pipeline', color: C.emerald },
  ];

  impacts.forEach((imp, i) => {
    const x = 0.4 + (i % 2) * 4.8;
    const y = 1.6 + Math.floor(i / 2) * 2.3;
    sld.addShape(prs.ShapeType.rect, { x, y, w: 4.4, h: 2.0,
      fill: { color: '0b0f19' }, line: { color: imp.color, pt: 1 }, rectRadius: 0.1 });
    sld.addText(imp.icon + ' ' + imp.title, { x, y: y + 0.1, w: 4.4, h: 0.6,
      fontSize: 14, bold: true, color: imp.color, fontFace: FONT_TITLE, align: 'center' });
    sld.addText(imp.desc, { x: x + 0.2, y: y + 0.8, w: 4.0, h: 1.0,
      fontSize: 11, color: C.white, fontFace: FONT_BODY, align: 'center' });
  });

  sld.addText('github.com/bhavsarhem/RecruitIQ_Engine  •  recruitiq-engine.vercel.app', {
    x: 0.4, y: 6.9, w: 9.2, h: 0.4,
    fontSize: 11, color: C.muted, fontFace: FONT_MONO, align: 'center',
  });
}

// ─── Write PPTX ──────────────────────────────────────────────────────────────
await prs.writeFile({ fileName: OUTPUT_PATH });
console.log(`✅ Presentation saved to: ${OUTPUT_PATH}`);
