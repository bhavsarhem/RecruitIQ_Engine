"""
weak_label_generator.py — Phase A: Generate weak supervision labels.

Applies a hand-coded rule system to score candidates and generates
relevance labels for training the LightGBM ranking model.

Label scale (0–3):
    0 = Honeypot / clearly irrelevant
    1 = Probably irrelevant (wrong domain, wrong seniority)
    2 = Partial match (some relevant skills/experience)
    3 = Strong match (clear AI/ML engineer at product company, right YOE)

Run from repo root:
    python offline_lab/weak_label_generator.py \
        --candidates candidates.jsonl \
        --out offline_lab/artifacts/labels.json
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(_REPO_ROOT))

from ranker.scorer import (
    feature_vector, weighted_score, _normalize,
    DISQUALIFIER_COMPANIES, DISQUALIFIER_INDUSTRIES,
    JD_HARD_SKILLS, AI_CORE_SKILLS_FOR_DISPLAY,
)
from ranker.honeypot_filter import is_honeypot


def label_candidate(candidate: dict) -> tuple[int, str]:
    """
    Assign a relevance label (0-3) to a candidate.
    Returns (label, reason).
    """
    profile = candidate.get("profile", {})
    career = candidate.get("career_history", [])
    skills = candidate.get("skills", [])
    signals = candidate.get("redrob_signals", {})

    # Honeypot → label 0
    flagged, reasons = is_honeypot(candidate)
    if flagged:
        return 0, f"honeypot: {','.join(reasons)}"

    feats = feature_vector(candidate)
    title = _normalize(profile.get("current_title", ""))
    yoe = profile.get("years_of_experience", 0.0)

    # Hard disqualifiers → label 0 or 1
    # Wrong domain entirely (non-technical, non-AI)
    non_tech_titles = [
        "marketing", "sales", "accountant", "hr manager", "operations manager",
        "graphic designer", "content writer", "customer support",
        "civil engineer", "mechanical engineer", "project manager",
        "business analyst",
    ]
    is_non_tech = any(nt in title for nt in non_tech_titles)

    # AI skill count
    n_ai_skills = sum(
        1 for s in skills
        if any(kw in _normalize(s.get("name", "")) for kw in AI_CORE_SKILLS_FOR_DISPLAY)
    )

    # JD keyword match count
    n_jd_match = sum(
        1 for s in skills
        for kw, _ in JD_HARD_SKILLS
        if kw in _normalize(s.get("name", ""))
    )

    # Career at product companies
    product_ratio = feats.get("f_product_company_ratio", 0.0)
    consulting_only = feats.get("f_consulting_only", 0.0) > 0.5

    # Behavioral availability
    active_recently = feats.get("f_recency_score", 0.0) > 0.5
    open_to_work = signals.get("open_to_work_flag", False)

    # --- Label assignment logic ---

    # Label 0: Non-technical + very few AI skills
    if is_non_tech and n_ai_skills < 3:
        return 0, "non_technical_title_no_ai_skills"

    # Label 0: Consulting only + wrong domain
    if consulting_only and n_jd_match < 2:
        return 0, "consulting_only_no_jd_match"

    # Label 3: Strong match
    # AI/ML engineer title + relevant JD skills + product company + right YOE
    ai_ml_titles = [
        "ai engineer", "ml engineer", "machine learning", "data scientist",
        "nlp engineer", "research engineer", "senior engineer", "senior developer",
        "recommendation", "search engineer", "ranking engineer",
    ]
    has_ai_title = any(t in title for t in ai_ml_titles)

    if (has_ai_title
            and n_jd_match >= 4
            and 4.0 <= yoe <= 10.0
            and product_ratio >= 0.4):
        return 3, "strong_ai_title_skills_yoe_product"

    # Label 3: Strong match via skills even if title is generic "software engineer"
    generic_tech_titles = ["software engineer", "backend engineer", "full stack",
                            "platform engineer", "data engineer"]
    has_generic_tech = any(t in title for t in generic_tech_titles)

    if (has_generic_tech
            and n_jd_match >= 5
            and 4.0 <= yoe <= 10.0
            and not consulting_only):
        return 3, "strong_skills_generic_title"

    # Label 2: Partial match
    if n_jd_match >= 3 and not is_non_tech and not consulting_only:
        return 2, "partial_match_jd_skills"

    if has_ai_title and n_jd_match >= 2:
        return 2, "partial_match_ai_title"

    if n_jd_match >= 2 and yoe >= 3.0 and not consulting_only:
        return 2, "partial_match_some_skills"

    # Label 1: Adjacent but not matching
    return 1, "adjacent_profile"


def generate_labels(
    candidates_path: Path,
    output_path: Path,
    verbose: bool = True,
) -> dict:
    """
    Read candidates.jsonl, label each, and save labels JSON.
    Returns {candidate_id: {"label": int, "reason": str}}
    """
    labels = {}
    label_counts = [0, 0, 0, 0]

    # Detect gzip
    open_fn = open
    open_kwargs = {"encoding": "utf-8"}
    with open(candidates_path, "rb") as probe:
        magic = probe.read(2)
    if magic == b'\x1f\x8b':
        import gzip
        open_fn = gzip.open
        open_kwargs = {"mode": "rt", "encoding": "utf-8"}

    total = 0
    with open_fn(candidates_path, **open_kwargs) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                candidate = json.loads(line)
            except Exception:
                continue
            total += 1
            cid = candidate.get("candidate_id", f"UNK_{total}")
            label, reason = label_candidate(candidate)
            labels[cid] = {"label": label, "reason": reason}
            label_counts[label] += 1

            if verbose and total % 10000 == 0:
                print(f"  Labeled {total:,}...")

    if verbose:
        print(f"\nLabeling complete: {total:,} candidates")
        for i, cnt in enumerate(label_counts):
            print(f"  Label {i}: {cnt:,} ({100*cnt/max(total,1):.1f}%)")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(labels, indent=2), encoding="utf-8")
    print(f"Labels saved to: {output_path}")

    return labels


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidates", required=True)
    parser.add_argument("--out", default="offline_lab/artifacts/labels.json")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    generate_labels(
        candidates_path=Path(args.candidates),
        output_path=Path(args.out),
        verbose=not args.quiet,
    )


if __name__ == "__main__":
    main()
