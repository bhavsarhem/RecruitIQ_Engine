"""
export.py — CSV writer for submission output.

Ensures exact column order, UTF-8 encoding, and score format
matching the sample_submission.csv spec.
"""

from __future__ import annotations

import csv
import io
from pathlib import Path
from typing import Sequence


REQUIRED_HEADER = ["candidate_id", "rank", "score", "reasoning"]


def write_submission(
    rows: Sequence[dict],
    output_path: str | Path,
) -> None:
    """
    Write the submission CSV.

    Each dict in `rows` must have keys:
        candidate_id (str), rank (int), score (float), reasoning (str)

    Rows must already be sorted by rank (ascending) before calling this.
    Score is written as a float with 4 decimal places.
    """
    path = Path(output_path)

    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(REQUIRED_HEADER)

        for row in rows:
            writer.writerow([
                row["candidate_id"],
                str(int(row["rank"])),
                f"{row['score']:.4f}",
                row["reasoning"],
            ])
