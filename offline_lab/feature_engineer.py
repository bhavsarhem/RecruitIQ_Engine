"""
feature_engineer.py — Phase A: Precompute feature vectors for all candidates.

Reads candidates.jsonl, extracts features using the same scorer.py logic
as ranker.py, and writes a compact numpy array + index for optional
pre-computation (not strictly needed since ranker.py is fast enough,
but useful for training the LightGBM model offline).

Run once:
    python offline_lab/feature_engineer.py \
        --candidates ../candidates.jsonl \
        --out offline_lab/artifacts/features.npz
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import numpy as np

# Allow importing from parent package
_REPO_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(_REPO_ROOT))

from ranker.scorer import feature_vector
from ranker.honeypot_filter import is_honeypot


FEATURE_NAMES_PATH = Path(__file__).parent / "artifacts" / "feature_names.json"


def _get_feature_names() -> list[str]:
    """Get ordered feature names from a dummy candidate."""
    dummy = {
        "candidate_id": "CAND_0000000",
        "profile": {
            "anonymized_name": "Test User",
            "headline": "Test",
            "summary": "Test summary",
            "location": "Mumbai",
            "country": "India",
            "years_of_experience": 5.0,
            "current_title": "Software Engineer",
            "current_company": "Startup",
            "current_company_size": "51-200",
            "current_industry": "Technology",
        },
        "career_history": [{
            "company": "Startup",
            "title": "Software Engineer",
            "start_date": "2020-01-01",
            "end_date": None,
            "duration_months": 60,
            "is_current": True,
            "industry": "Technology",
            "company_size": "51-200",
            "description": "Built ML systems",
        }],
        "education": [],
        "skills": [],
        "certifications": [],
        "languages": [],
        "redrob_signals": {
            "profile_completeness_score": 70.0,
            "signup_date": "2024-01-01",
            "last_active_date": "2026-06-01",
            "open_to_work_flag": True,
            "profile_views_received_30d": 10,
            "applications_submitted_30d": 1,
            "recruiter_response_rate": 0.5,
            "avg_response_time_hours": 24.0,
            "skill_assessment_scores": {},
            "connection_count": 100,
            "endorsements_received": 10,
            "notice_period_days": 30,
            "expected_salary_range_inr_lpa": {"min": 15, "max": 25},
            "preferred_work_mode": "hybrid",
            "willing_to_relocate": True,
            "github_activity_score": 30.0,
            "search_appearance_30d": 50,
            "saved_by_recruiters_30d": 2,
            "interview_completion_rate": 0.8,
            "offer_acceptance_rate": 0.7,
            "verified_email": True,
            "verified_phone": True,
            "linkedin_connected": True,
        },
    }
    feats = feature_vector(dummy)
    return list(feats.keys())


def build_feature_matrix(
    candidates_path: Path,
    output_path: Path,
    verbose: bool = True,
) -> tuple[np.ndarray, list[str], list[str]]:
    """
    Stream candidates.jsonl, extract features, save to .npz file.

    Returns:
        (feature_matrix, candidate_ids, feature_names)
    """
    t0 = time.perf_counter()

    feature_names = _get_feature_names()
    n_features = len(feature_names)

    if verbose:
        print(f"Extracting {n_features} features per candidate...")

    candidate_ids: list[str] = []
    rows: list[list[float]] = []

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
    skipped = 0

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

            flagged, _ = is_honeypot(candidate)
            if flagged:
                skipped += 1
                continue

            feats = feature_vector(candidate)
            row = [feats.get(k, 0.0) for k in feature_names]
            rows.append(row)
            candidate_ids.append(candidate.get("candidate_id", f"UNK_{total}"))

            if verbose and total % 10000 == 0:
                elapsed = time.perf_counter() - t0
                print(f"  Processed {total:,} | {elapsed:.1f}s")

    X = np.array(rows, dtype=np.float32)

    # Save
    output_path.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(
        output_path,
        X=X,
        candidate_ids=np.array(candidate_ids),
        feature_names=np.array(feature_names),
    )

    # Also save feature names as JSON for ranker.py compatibility
    FEATURE_NAMES_PATH.parent.mkdir(parents=True, exist_ok=True)
    import json as _json
    FEATURE_NAMES_PATH.write_text(_json.dumps(feature_names, indent=2), encoding="utf-8")

    elapsed = time.perf_counter() - t0
    if verbose:
        print(f"\nDone: {len(candidate_ids):,} candidates, {skipped:,} honeypots filtered")
        print(f"Feature matrix shape: {X.shape}")
        print(f"Saved to: {output_path}")
        print(f"Feature names: {FEATURE_NAMES_PATH}")
        print(f"Total time: {elapsed:.1f}s")

    return X, candidate_ids, feature_names


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidates", required=True)
    parser.add_argument("--out", default="offline_lab/artifacts/features.npz")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    build_feature_matrix(
        candidates_path=Path(args.candidates),
        output_path=Path(args.out),
        verbose=not args.quiet,
    )


if __name__ == "__main__":
    main()
