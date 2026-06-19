"""
explainer.py — Template-based reasoning string generator.

No LLM calls. Uses feature values + candidate profile data to fill
pre-defined reasoning templates. Templates vary by rank band to avoid
identical reasoning strings (which penalizes Stage 4 review).
"""

from __future__ import annotations

from datetime import datetime

CURRENT_DATE = datetime.now().date()


def _days_since(date_str: str | None) -> int:
    if not date_str:
        return 999
    try:
        d = datetime.strptime(date_str[:10], "%Y-%m-%d").date()
        return (CURRENT_DATE - d).days
    except Exception:
        return 999


def _activity_phrase(signals: dict) -> str:
    days = _days_since(signals.get("last_active_date"))
    if days <= 7:
        return "active this week"
    elif days <= 30:
        return "active in last 30 days"
    elif days <= 90:
        return "active in last 90 days"
    else:
        return f"last active {days} days ago"


def _response_phrase(rr: float) -> str:
    if rr >= 0.8:
        return "very high recruiter responsiveness"
    elif rr >= 0.5:
        return "good recruiter responsiveness"
    elif rr >= 0.3:
        return "moderate recruiter responsiveness"
    else:
        return "low recruiter responsiveness"


def _notice_phrase(days: int) -> str:
    if days <= 15:
        return "immediate availability"
    elif days <= 30:
        return f"{days}-day notice"
    elif days <= 60:
        return f"{days}-day notice (buyout possible)"
    else:
        return f"{days}-day notice"


def _gap_phrase(features: dict, candidate: dict) -> str:
    """Identify top skill gaps vs the JD."""
    gaps = []

    if features.get("f_embedding_skill_count", 0) < 0.3:
        gaps.append("limited vector DB / embeddings depth")
    if not features.get("f_ranking_eval_skill", 0):
        gaps.append("no explicit ranking-eval experience (NDCG/MRR/A-B)")
    if not features.get("f_python_skill", 0):
        gaps.append("Python not explicitly listed")
    if features.get("f_product_company_ratio", 0) < 0.4:
        gaps.append("majority of career in services/consulting")
    if features.get("f_recency_score", 0) < 0.3:
        gaps.append("profile not recently active")

    if not gaps:
        return "no major skill gaps identified"
    return "; ".join(gaps[:2])


def generate_reasoning(
    candidate: dict,
    features: dict,
    score: float,
    rank: int,
    ai_core_count: int,
    top_skills: list[str],
) -> str:
    """
    Generate a 1–2 sentence reasoning string for a given candidate.
    Varies by rank band to ensure non-identical strings.
    """
    profile = candidate.get("profile", {})
    signals = candidate.get("redrob_signals", {})
    career = candidate.get("career_history", [])

    title = profile.get("current_title", "Candidate")
    yoe = profile.get("years_of_experience", 0.0)
    location = profile.get("location", "Unknown")
    country = profile.get("country", "")
    company = profile.get("current_company", "")

    rr = signals.get("recruiter_response_rate", 0.0) or 0.0
    notice = signals.get("notice_period_days", 90) or 90
    open_to_work = signals.get("open_to_work_flag", False)
    github = signals.get("github_activity_score", -1) or -1
    completeness = signals.get("profile_completeness_score", 0) or 0
    interview_rate = signals.get("interview_completion_rate", 0.0) or 0.0

    activity = _activity_phrase(signals)
    resp_phrase = _response_phrase(rr)
    notice_phrase = _notice_phrase(notice)

    top_skill_str = ", ".join(top_skills[:2]) if top_skills else "relevant AI skills"
    loc_str = f"{location}, {country}" if country and country not in location else location

    # Determine company type
    from ranker.scorer import _is_product_company, _normalize
    is_product = False
    for role in career:
        if _is_product_company(role.get("company", ""), role.get("industry", "")):
            is_product = True
            break
    company_type = "product company" if is_product else "services company"

    # Gap note
    gap_note = _gap_phrase(features, candidate)

    # GitHub note
    github_note = ""
    if github >= 60:
        github_note = f"; strong GitHub activity (score {github:.0f}/100)"
    elif github <= 0:
        github_note = "; no GitHub activity linked"

    # ----------------------------------------------------------------
    # RANK BAND TEMPLATES
    # ----------------------------------------------------------------

    if rank <= 5:
        # Top 5: most detailed, most positive
        return (
            f"Top match: {title} with {yoe:.1f} yrs experience, "
            f"{ai_core_count} JD-aligned AI skills (including {top_skill_str}), "
            f"at {company} ({company_type}); "
            f"{activity}, {resp_phrase} ({rr:.0%}), {notice_phrase}"
            f"{github_note}."
        )

    elif rank <= 15:
        # Strong match
        return (
            f"Strong fit: {title} with {yoe:.1f} yrs, {ai_core_count} aligned AI skills "
            f"({top_skill_str}); based in {loc_str}, {activity}, "
            f"recruiter response rate {rr:.0%}, {notice_phrase}."
        )

    elif rank <= 30:
        # Good match with one nuance
        return (
            f"{title} ({yoe:.1f} yrs) with {ai_core_count} relevant JD skills; "
            f"{activity}, profile completeness {completeness:.0f}%, {resp_phrase}. "
            f"Minor concern: {gap_note}."
        )

    elif rank <= 50:
        # Partial match
        return (
            f"Partial match — {title} with {ai_core_count} overlapping AI/ML skills "
            f"and {yoe:.1f} yrs experience; {activity}, {notice_phrase}. "
            f"Gap: {gap_note}."
        )

    elif rank <= 75:
        # Borderline
        return (
            f"Borderline fit: {ai_core_count} relevant skills, {yoe:.1f} yrs exp; "
            f"ranked here primarily on {top_skill_str if top_skills else 'behavioral signals'}. "
            f"Notable gap: {gap_note}."
        )

    else:
        # Tail candidates (76-100)
        return (
            f"Adjacent profile — {title} with {yoe:.1f} yrs; {ai_core_count} overlapping skills. "
            f"Included for coverage; key gap: {gap_note}."
        )
