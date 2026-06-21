#!/usr/bin/env python3
"""
ranker.py — RecruitIQ Engine: Candidate Ranking Pipeline
Redrob Hackathon — Intelligent Candidate Discovery

ENTRYPOINT. Produces a submission CSV ranking the top 100 candidates
from candidates.jsonl for the Senior AI Engineer JD.

Usage:
    python ranker.py --candidates ./candidates.jsonl --out ./submission.csv

Constraints satisfied:
    - No network calls
    - No GPU operations
    - ≤16 GB RAM (streaming JSONL — never loads full file into memory)
    - ≤300 seconds on 100k candidates (target: <120s)
    - Exactly 100 ranked candidates in output
    - Output matches sample_submission.csv format byte-for-byte
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

# ---------------------------------------------------------------------------
# Path setup — allow running from any directory
# ---------------------------------------------------------------------------
_RANKER_DIR = Path(__file__).parent
_REPO_ROOT = _RANKER_DIR.parent
sys.path.insert(0, str(_REPO_ROOT))

from ranker.honeypot_filter import is_honeypot
from ranker.scorer import feature_vector, weighted_score, count_ai_core_skills, top_matched_skills
from ranker.export import write_submission

# ---------------------------------------------------------------------------
# Optional: load LightGBM model if pre-computed artifacts exist
# ---------------------------------------------------------------------------
_ARTIFACTS_DIR = _REPO_ROOT / "offline_lab" / "artifacts"
_LGBM_MODEL_PATH = _ARTIFACTS_DIR / "lgbm_ranker.txt"
_FEATURE_NAMES_PATH = _ARTIFACTS_DIR / "feature_names.json"

_lgbm_model = None
_feature_names = None

def _try_load_lgbm():
    """Attempt to load the pre-trained LightGBM model from disk."""
    global _lgbm_model, _feature_names

    if not _LGBM_MODEL_PATH.exists():
        return False

    try:
        import lightgbm as lgb
        # Secure, pickle-free loading of native LightGBM text format booster
        _lgbm_model = lgb.Booster(model_file=str(_LGBM_MODEL_PATH))

        if _FEATURE_NAMES_PATH.exists():
            with open(_FEATURE_NAMES_PATH, "r", encoding="utf-8") as f:
                _feature_names = json.load(f)
        else:
            _feature_names = _lgbm_model.feature_name()

        return _feature_names is not None
    except Exception as e:
        print(f"[WARN] Could not load LightGBM model: {e}. Using weighted scorer.", file=sys.stderr)
        return False



# ---------------------------------------------------------------------------
# Scoring logic — dispatches to LGBM or weighted baseline
# ---------------------------------------------------------------------------

def _score_candidate(candidate: dict, features: dict[str, float]) -> float:
    """
    Returns a score for the candidate.
    Uses LightGBM if available, falls back to weighted linear scorer.
    """
    if _lgbm_model is not None and _feature_names is not None:
        try:
            import numpy as np
            feat_row = np.array([[features.get(k, 0.0) for k in _feature_names]], dtype=np.float32)
            raw = float(_lgbm_model.predict(feat_row)[0])
            return raw  # will be normalized to [0,1] relative to pool
        except Exception:
            pass  # fallback

    return weighted_score(features)




# ---------------------------------------------------------------------------
# Tie-breaking: equal scores → candidate_id ascending
# ---------------------------------------------------------------------------

def _sort_key(item: tuple[str, float, dict, dict]) -> tuple[float, str]:
    cid, score, _, _ = item
    # Primary: descending score (6dp precision to avoid float noise)
    # Secondary: ascending candidate_id (lexicographic — satisfies validator tie-break)
    return (-round(score, 6), cid)


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def rank_candidates(
    candidates_path: str | Path,
    out_path: str | Path,
    top_n: int = 100,
    verbose: bool = True,
) -> None:
    t0 = time.perf_counter()

    # ----------------------------------------------------------------
    # Step 0: Load artifacts
    # ----------------------------------------------------------------
    t_step = time.perf_counter()
    lgbm_loaded = _try_load_lgbm()
    if verbose:
        scorer_name = "LightGBM" if lgbm_loaded else "Weighted linear scorer (baseline)"
        print(f"[0] Artifacts loaded ({scorer_name}) | {time.perf_counter() - t_step:.3f}s")

    # ----------------------------------------------------------------
    # Step 1+2+3: Stream JSONL → honeypot gate → feature extraction
    # ----------------------------------------------------------------
    t_step = time.perf_counter()

    candidates_path = Path(candidates_path)

    total_read = 0
    total_honeypot = 0
    survivors: list[tuple[str, float, dict, dict]] = []  # (cid, score, candidate, features)

    # Buffer for batch LGBM scoring
    batch_buffer: list[tuple[str, dict, dict]] = []  # (cid, candidate, features)
    BATCH_SIZE = 5000  # process in batches for memory efficiency

    def _process_batch(buf: list[tuple[str, dict, dict]]) -> None:
        for cid, cand, feats in buf:
            score = _score_candidate(cand, feats)
            survivors.append((cid, score, cand, feats))

    # Detect format: plain JSONL vs gzipped
    open_fn = open
    open_kwargs = {"encoding": "utf-8"}

    # Check for gzip magic bytes
    with open(candidates_path, "rb") as probe:
        magic = probe.read(2)
    if magic == b'\x1f\x8b':
        import gzip
        open_fn = gzip.open
        open_kwargs = {"mode": "rt", "encoding": "utf-8"}

    with open_fn(candidates_path, **open_kwargs) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                candidate = json.loads(line)
            except json.JSONDecodeError:
                continue

            total_read += 1

            # ---- Step 2: Honeypot gate ----
            flagged, reasons = is_honeypot(candidate)
            if flagged:
                total_honeypot += 1
                continue

            # ---- Step 3: Feature extraction ----
            feats = feature_vector(candidate)
            cid = candidate.get("candidate_id", f"UNKNOWN_{total_read}")

            batch_buffer.append((cid, candidate, feats))

            if len(batch_buffer) >= BATCH_SIZE:
                _process_batch(batch_buffer)
                batch_buffer.clear()

    # Process remaining batch
    if batch_buffer:
        _process_batch(batch_buffer)
        batch_buffer.clear()

    t_ingest = time.perf_counter() - t_step
    if verbose:
        print(
            f"[1-3] Ingested {total_read:,} candidates | "
            f"Filtered {total_honeypot:,} honeypots ({100*total_honeypot/max(total_read,1):.1f}%) | "
            f"{len(survivors):,} survivors | {t_ingest:.3f}s"
        )

    # ----------------------------------------------------------------
    # Step 5: Normalize scores to [0, 1] across the full pool
    # (Important when using raw LightGBM scores which can be any float)
    # ----------------------------------------------------------------
    if survivors and _lgbm_model is not None:
        all_scores = [s for _, s, _, _ in survivors]
        min_s, max_s = min(all_scores), max(all_scores)
        score_range = max_s - min_s
        if score_range > 1e-10:
            survivors = [
                (cid, (score - min_s) / score_range, cand, feats)
                for cid, score, cand, feats in survivors
            ]

    # ----------------------------------------------------------------
    # Step 6: Sort and select Top-N
    # ----------------------------------------------------------------
    t_step = time.perf_counter()
    survivors.sort(key=_sort_key)
    top_candidates = survivors[:top_n]

    # ---- Ensure scores are strictly non-increasing when written to 4dp ----
    # The validator requires:
    #   1. score[rank_i] >= score[rank_i+1]  (non-increasing)
    #   2. If score[rank_i] == score[rank_i+1] at 4dp, then cid[rank_i] < cid[rank_i+1]
    #
    # Strategy: Re-sort top candidates by (-score_4dp, cid) to ensure
    # the 4dp-rounded order matches the cid tie-break. Then apply a
    # tiny monotonic rank-nudge (1e-5 per step) to make all 4dp scores unique.

    # Step 1: Re-sort by (4dp score descending, cid ascending)
    top_candidates_with_rounded = [
        (cid, round(score, 4), score, cand, feats)
        for cid, score, cand, feats in top_candidates
    ]
    top_candidates_with_rounded.sort(key=lambda x: (-x[1], x[0]))

    # Step 2: Re-assign scores to be strictly decreasing at 4dp
    # Start from the top score and subtract 0.0001 for each tie group
    adjusted = []
    if top_candidates_with_rounded:
        prev_4dp = top_candidates_with_rounded[0][1]
        current_score = prev_4dp
        for idx, (cid, score_4dp, raw_score, cand, feats) in enumerate(top_candidates_with_rounded):
            if idx == 0:
                adjusted.append((cid, current_score, cand, feats))
            else:
                if score_4dp < prev_4dp:
                    # New lower score band — step down accordingly
                    current_score = score_4dp
                else:
                    # Same 4dp score as previous — step down by 0.0001
                    current_score = adjusted[-1][1] - 0.0001
                adjusted.append((cid, round(current_score, 4), cand, feats))
                prev_4dp = score_4dp

    top_candidates = adjusted

    if verbose:
        print(f"[6] Sorted {len(survivors):,} survivors, selected top {top_n} | {time.perf_counter() - t_step:.3f}s")

    # ----------------------------------------------------------------
    # Step 7: Generate reasoning + build output rows
    # ----------------------------------------------------------------
    t_step = time.perf_counter()

    # Import explainer here (only for top-N, so minor overhead)
    from ranker.explainer import generate_reasoning

    output_rows = []
    for rank_pos, (cid, score, candidate, features) in enumerate(top_candidates, start=1):
        ai_count = count_ai_core_skills(candidate)
        top_skills = top_matched_skills(candidate, n=3)

        reasoning = generate_reasoning(
            candidate=candidate,
            features=features,
            score=score,
            rank=rank_pos,
            ai_core_count=ai_count,
            top_skills=top_skills,
        )

        output_rows.append({
            "candidate_id": cid,
            "rank": rank_pos,
            "score": score,
            "reasoning": reasoning,
        })

    if verbose:
        print(f"[7] Reasoning generated for {len(output_rows)} candidates | {time.perf_counter() - t_step:.3f}s")

    # ----------------------------------------------------------------
    # Step 9: Export CSV
    # ----------------------------------------------------------------
    t_step = time.perf_counter()
    write_submission(output_rows, out_path)
    if verbose:
        print(f"[9] CSV written to {out_path} | {time.perf_counter() - t_step:.3f}s")

    # ----------------------------------------------------------------
    # Summary
    # ----------------------------------------------------------------
    total_time = time.perf_counter() - t0
    if verbose:
        print(f"\n{'='*60}")
        print(f"Total runtime: {total_time:.2f}s")
        print(f"Budget remaining: {300 - total_time:.1f}s (of 300s)")
        print(f"Honeypot filter rate: {100*total_honeypot/max(total_read,1):.2f}%")
        print(f"Top score: {output_rows[0]['score']:.4f} | Bottom score: {output_rows[-1]['score']:.4f}")
        print(f"Scorer: {'LightGBM' if lgbm_loaded else 'Weighted baseline'}")
        print(f"Output: {out_path}")
        print(f"{'='*60}")

    if total_time > 280:
        print(f"[WARNING] Runtime {total_time:.1f}s is dangerously close to 300s limit!", file=sys.stderr)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="RecruitIQ Engine — Candidate Ranking Pipeline"
    )
    parser.add_argument(
        "--candidates",
        required=True,
        help="Path to candidates.jsonl (or .jsonl.gz)",
    )
    parser.add_argument(
        "--out",
        required=True,
        help="Output CSV path (e.g. submission.csv)",
    )
    parser.add_argument(
        "--top-n",
        type=int,
        default=100,
        help="Number of top candidates to output (default: 100)",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Suppress progress output",
    )
    args = parser.parse_args()

    rank_candidates(
        candidates_path=args.candidates,
        out_path=args.out,
        top_n=args.top_n,
        verbose=not args.quiet,
    )


if __name__ == "__main__":
    main()
