"""
honeypot_rules.py — Phase A mirror of ranker/honeypot_filter.py.

Provides the same predicates for offline analysis, validation,
and model training purposes. Import from here in offline_lab scripts.
"""
# Re-export everything from the ranker module
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from ranker.honeypot_filter import (
    is_honeypot,
    timeline_impossible,
    framework_age_impossible,
    zero_duration_expert,
    skill_stuffing,
    impossible_yoe,
    title_skill_mismatch,
    FRAMEWORK_LAUNCH_YEARS,
    AI_SKILL_KEYWORDS,
    NON_AI_TITLES,
    CURRENT_DATE,
    CURRENT_YEAR,
)

__all__ = [
    "is_honeypot",
    "timeline_impossible",
    "framework_age_impossible",
    "zero_duration_expert",
    "skill_stuffing",
    "impossible_yoe",
    "title_skill_mismatch",
    "FRAMEWORK_LAUNCH_YEARS",
    "AI_SKILL_KEYWORDS",
    "NON_AI_TITLES",
    "CURRENT_DATE",
    "CURRENT_YEAR",
]
