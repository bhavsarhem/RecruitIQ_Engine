"""
honeypot_filter.py — Deterministic honeypot predicates.

All checks run in O(1) per candidate.
Returns True if the candidate is a honeypot / should be filtered out.
"""

from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any

# ---------------------------------------------------------------------------
# Framework / library launch dates (year first publicly available)
# Used to detect "12 years of React" style impossibilities.
# ---------------------------------------------------------------------------
FRAMEWORK_LAUNCH_YEARS: dict[str, int] = {
    "react": 2013,
    "react.js": 2013,
    "reactjs": 2013,
    "vue": 2014,
    "vue.js": 2014,
    "vuejs": 2014,
    "next.js": 2016,
    "nextjs": 2016,
    "svelte": 2016,
    "flutter": 2017,
    "fastapi": 2018,
    "pytorch": 2016,
    "tensorflow": 2015,
    "keras": 2015,
    "langchain": 2022,
    "llama": 2023,
    "llama2": 2023,
    "llama 2": 2023,
    "chatgpt": 2022,
    "gpt-4": 2023,
    "gpt4": 2023,
    "stable diffusion": 2022,
    "diffusion models": 2020,
    "transformers": 2018,  # hugging face library
    "bert": 2018,
    "gpt-3": 2020,
    "gpt3": 2020,
    "openai api": 2020,
    "pinecone": 2019,
    "weaviate": 2019,
    "qdrant": 2021,
    "milvus": 2019,
    "airflow": 2015,
    "apache airflow": 2015,
    "dbt": 2016,
    "kubernetes": 2014,
    "docker": 2013,
    "terraform": 2014,
    "rust": 2015,
    "kotlin": 2016,
    "swift": 2014,
    "typescript": 2012,
    "golang": 2012,
    "go": 2012,
    "ray": 2017,
    "mlflow": 2018,
    "wandb": 2018,
    "weights & biases": 2018,
    "vertex ai": 2021,
    "sagemaker": 2017,
    "aws sagemaker": 2017,
    "bedrock": 2023,
    "aws bedrock": 2023,
    "anthropic": 2021,
    "claude": 2023,
}

CURRENT_YEAR = datetime.now().year
CURRENT_DATE = datetime.now().date()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_DATE_CACHE: dict[str, date | None] = {}

def _parse_date(s: Any) -> date | None:
    if not s or not isinstance(s, str):
        return None
    
    s_clean = s.strip()
    if s_clean in _DATE_CACHE:
        return _DATE_CACHE[s_clean]
        
    res = None
    try:
        parts = s_clean.split("-")
        n_parts = len(parts)
        if n_parts >= 3:
            # YYYY-MM-DD (take first 2 chars of day in case of timezone/offset suffixes)
            y = int(parts[0])
            m = int(parts[1])
            d = int(parts[2][:2])
            res = date(y, m, d)
        elif n_parts == 2:
            # YYYY-MM
            y = int(parts[0])
            m = int(parts[1])
            res = date(y, m, 1)
        elif n_parts == 1:
            # YYYY
            y = int(parts[0])
            res = date(y, 1, 1)
    except ValueError:
        # Fallback to slow parser for non-standard formats
        for fmt in ("%Y-%m-%d", "%Y-%m", "%Y"):
            try:
                res = datetime.strptime(s_clean[:len(fmt) + 2], fmt).date()
                break
            except Exception:
                continue

    _DATE_CACHE[s_clean] = res
    return res


def _normalize_skill_name(name: str) -> str:
    return name.lower().strip()


# ---------------------------------------------------------------------------
# Predicate 1: Impossible career timelines
# ---------------------------------------------------------------------------

def timeline_impossible(career_history: list[dict]) -> bool:
    """
    Returns True if any of the following are detected:
    - A role has a start_date in the future (> today)
    - A role claims impossibly long duration (>40 years)
    - Massive gap between stated years_of_experience and actual career data
      (handled elsewhere via profile check)
    - Two non-current roles overlap by more than 6 months AND neither is marked current
    """
    if not career_history:
        return False

    parsed = []
    for role in career_history:
        start = _parse_date(role.get("start_date"))
        end = _parse_date(role.get("end_date"))
        is_current = role.get("is_current", False)

        if start is None:
            continue

        # Future start date
        if start > CURRENT_DATE:
            return True

        # Impossibly old role (before 1970)
        if start.year < 1970:
            return True

        # Duration sanity
        dur_months = role.get("duration_months", 0) or 0
        if dur_months > 480:  # 40 years
            return True

        parsed.append((start, end, is_current, dur_months))

    # Check for massive date overlaps between two past (non-current) roles
    past_roles = [(s, e) for s, e, cur, _ in parsed if not cur and e is not None]
    for i in range(len(past_roles)):
        for j in range(i + 1, len(past_roles)):
            s1, e1 = past_roles[i]
            s2, e2 = past_roles[j]
            # Overlap exists if max(start) < min(end)
            overlap_start = max(s1, s2)
            overlap_end = min(e1, e2)
            if overlap_start < overlap_end:
                overlap_months = (
                    (overlap_end.year - overlap_start.year) * 12
                    + (overlap_end.month - overlap_start.month)
                )
                if overlap_months > 6:
                    return True

    return False


# ---------------------------------------------------------------------------
# Predicate 2: Framework age impossibilities
# ---------------------------------------------------------------------------

def framework_age_impossible(skills: list[dict]) -> bool:
    """
    Returns True if a skill's claimed duration_months exceeds
    the framework's real-world age by more than 24 months.
    """
    for skill in skills:
        name_raw = skill.get("name", "")
        name_lower = _normalize_skill_name(name_raw)
        duration_months = skill.get("duration_months") or 0

        for framework, launch_year in FRAMEWORK_LAUNCH_YEARS.items():
            if framework in name_lower:
                max_possible_months = (CURRENT_YEAR - launch_year) * 12 + 6  # 6 months grace
                if duration_months > max_possible_months:
                    return True
                break

    return False


# ---------------------------------------------------------------------------
# Predicate 3: Zero-duration expert — expert skill with 0 months used
# ---------------------------------------------------------------------------

def zero_duration_expert(skills: list[dict]) -> bool:
    """
    Returns True if ANY skill is listed as 'expert' with duration_months == 0.
    A small number (1-2) might be data entry errors; flag at >= 2.
    """
    count = 0
    for skill in skills:
        if (skill.get("proficiency") == "expert"
                and (skill.get("duration_months") or 0) == 0):
            count += 1
            if count >= 2:
                return True
    return False


# ---------------------------------------------------------------------------
# Predicate 4: Skill stuffing — abnormally many expert/advanced skills,
#              all with 0 endorsements
# ---------------------------------------------------------------------------

def skill_stuffing(skills: list[dict]) -> bool:
    """
    Returns True if:
    - More than 12 skills are listed as 'expert' or 'advanced'
    - AND the average endorsements across those skills is < 1
    - AND the average duration_months across those skills is < 3

    This catches the "copy-paste 20 AI skills as expert" honeypot pattern.
    """
    high_prof = [
        s for s in skills
        if s.get("proficiency") in ("expert", "advanced")
    ]
    if len(high_prof) < 12:
        return False

    avg_endorsements = sum(s.get("endorsements", 0) for s in high_prof) / len(high_prof)
    avg_duration = sum(s.get("duration_months", 0) or 0 for s in high_prof) / len(high_prof)

    return avg_endorsements < 1.0 and avg_duration < 3.0


# ---------------------------------------------------------------------------
# Predicate 5: Impossible years of experience
# ---------------------------------------------------------------------------

def impossible_yoe(profile: dict, career_history: list[dict]) -> bool:
    """
    Returns True if stated years_of_experience significantly exceeds
    what the career history can support, OR is negative/implausible.
    """
    stated_yoe = profile.get("years_of_experience") or 0

    # Negative or extreme
    if stated_yoe < 0 or stated_yoe > 45:
        return True

    # Sum career durations
    total_months = sum(
        (role.get("duration_months") or 0) for role in career_history
    )
    max_plausible_months = total_months + 36  # 3 years buffer for gaps

    if stated_yoe * 12 > max_plausible_months + 60:  # 5-year tolerance
        return True

    return False


# ---------------------------------------------------------------------------
# Predicate 6: Title-skill extreme mismatch
# ---------------------------------------------------------------------------

AI_SKILL_KEYWORDS = frozenset([
    "machine learning", "deep learning", "neural network", "nlp",
    "natural language processing", "computer vision", "transformers",
    "bert", "gpt", "llm", "large language model", "rag",
    "retrieval augmented", "embedding", "vector", "faiss", "pytorch",
    "tensorflow", "keras", "xgboost", "lightgbm", "scikit-learn",
    "reinforcement learning", "generative ai", "diffusion", "fine-tuning",
    "lora", "qlora", "peft", "sentence-transformers", "hugging face",
    "openai", "langchain", "semantic search", "ranking", "recommendation",
    "information retrieval", "a/b testing", "ndcg", "mrr", "map",
    "pinecone", "weaviate", "qdrant", "milvus", "elasticsearch",
    "data science", "mlops", "feature engineering", "model training",
])

NON_AI_TITLES = frozenset([
    "marketing manager", "operations manager", "hr manager", "accountant",
    "sales executive", "graphic designer", "content writer",
    "customer support", "civil engineer", "mechanical engineer",
    "project manager", "business analyst", "product manager",
])


def title_skill_mismatch(profile: dict, skills: list[dict]) -> bool:
    """
    Returns True if the candidate's title is clearly non-technical (e.g.,
    Marketing Manager) yet they list an improbably large number of AI skills
    as 'expert' or 'advanced'. This is the classic keyword-stuffer pattern.
    """
    title = (profile.get("current_title") or "").lower().strip()

    is_non_ai_title = any(non_ai in title for non_ai in NON_AI_TITLES)
    if not is_non_ai_title:
        return False

    # Count AI skills claimed at high proficiency
    ai_expert_count = 0
    for skill in skills:
        skill_name = _normalize_skill_name(skill.get("name", ""))
        proficiency = skill.get("proficiency", "")
        if any(kw in skill_name for kw in AI_SKILL_KEYWORDS):
            if proficiency in ("expert", "advanced"):
                ai_expert_count += 1

    # A non-AI title with 6+ expert AI skills is a strong honeypot signal
    return ai_expert_count >= 6


# ---------------------------------------------------------------------------
# Master function
# ---------------------------------------------------------------------------

def is_honeypot(candidate: dict) -> tuple[bool, list[str]]:
    """
    Returns (is_honeypot: bool, reasons: list[str]).
    Run this before any scoring. If is_honeypot is True, discard the candidate.
    """
    profile = candidate.get("profile", {})
    career = candidate.get("career_history", [])
    skills = candidate.get("skills", [])

    reasons: list[str] = []

    if timeline_impossible(career):
        reasons.append("impossible_timeline")
    if framework_age_impossible(skills):
        reasons.append("framework_age_impossible")
    if zero_duration_expert(skills):
        reasons.append("zero_duration_expert")
    if skill_stuffing(skills):
        reasons.append("skill_stuffing")
    if impossible_yoe(profile, career):
        reasons.append("impossible_yoe")
    if title_skill_mismatch(profile, skills):
        reasons.append("title_skill_mismatch")

    return bool(reasons), reasons
