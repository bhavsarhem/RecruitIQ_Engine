"""
scorer.py — Feature extraction + weighted scoring for each candidate.

This module produces:
  1. A feature dictionary (47 numeric/boolean features)
  2. A raw weighted score (0–1) without ML model
  3. A detailed scoring breakdown for explainability

The weighted scoring is used as a strong baseline (Days 1-3).
Once the LightGBM model is trained (Phase A), ranker.py will call
lgbm_score() instead. Both paths share the same feature_vector().
"""

from __future__ import annotations

import math
import re
from datetime import datetime, date
from typing import Any

# ---------------------------------------------------------------------------
# Job Description — hard-coded parsed constants
# (derived from offline_lab/jd_parser.py — inlined here for zero-dependency)
# ---------------------------------------------------------------------------

JD_HARD_SKILLS: list[tuple[str, float]] = [
    # (canonical_keyword, weight) — weight reflects JD priority
    ("embeddings", 1.0),
    ("sentence-transformers", 1.0),
    ("sentence transformers", 1.0),
    ("openai embeddings", 0.9),
    ("bge", 0.8),
    ("e5", 0.7),
    ("embedding", 0.9),
    ("faiss", 1.0),
    ("pinecone", 0.9),
    ("weaviate", 0.9),
    ("qdrant", 0.9),
    ("milvus", 0.9),
    ("opensearch", 0.8),
    ("elasticsearch", 0.8),
    ("vector database", 1.0),
    ("vector db", 1.0),
    ("vector search", 0.9),
    ("hybrid search", 0.9),
    ("semantic search", 0.9),
    ("retrieval", 0.9),
    ("information retrieval", 1.0),
    ("ranking", 1.0),
    ("learning to rank", 1.0),
    ("ltr", 0.9),
    ("ndcg", 0.9),
    ("mrr", 0.8),
    ("map", 0.7),
    ("a/b testing", 0.8),
    ("ab testing", 0.7),
    ("recommendation", 0.8),
    ("recommendation system", 0.9),
    ("nlp", 0.9),
    ("natural language processing", 1.0),
    ("llm", 0.9),
    ("large language model", 0.9),
    ("fine-tuning", 0.8),
    ("fine tuning", 0.8),
    ("lora", 0.8),
    ("qlora", 0.8),
    ("peft", 0.8),
    ("rag", 0.9),
    ("retrieval augmented", 0.9),
    ("xgboost", 0.7),
    ("lightgbm", 0.7),
    ("pytorch", 0.8),
    ("tensorflow", 0.7),
    ("python", 0.9),
    ("transformers", 0.8),
    ("hugging face", 0.8),
    ("huggingface", 0.8),
    ("bert", 0.7),
    ("gpt", 0.7),
    ("machine learning", 0.8),
    ("deep learning", 0.8),
    ("mlops", 0.7),
    ("model evaluation", 0.8),
    ("scikit-learn", 0.6),
    ("sklearn", 0.6),
]

# Flattened set for fast membership check
JD_HARD_SKILL_TERMS = set(kw for kw, _ in JD_HARD_SKILLS)

# Disqualifier companies (consulting / services)
DISQUALIFIER_COMPANIES = frozenset([
    "tcs", "tata consultancy", "infosys", "wipro", "accenture",
    "cognizant", "capgemini", "hcl", "hcl technologies", "tech mahindra",
    "mphasis", "l&t infotech", "ltimindtree", "hexaware", "niit technologies",
    "mastech", "igate", "patni",
])

DISQUALIFIER_INDUSTRIES = frozenset([
    "it services", "it consulting", "consulting", "bpo", "outsourcing",
    "staffing", "it staffing",
])

DISQUALIFIER_DOMAINS = ["computer vision", "speech recognition", "robotics", "autonomous vehicles"]

RESEARCH_INDICATORS = ["university", "iit", "iisc", "lab", "research institute",
                        "academia", "research center", "national lab", "institute of technology"]

PRODUCT_COMPANY_INDICATORS = [
    "saas", "startup", "fintech", "edtech", "healthtech", "ai", "analytics",
    "platform", "marketplace", "product", "software", "technology",
]

PREFERRED_LOCATIONS = ["pune", "noida", "hyderabad", "mumbai", "delhi",
                        "ncr", "gurgaon", "gurugram", "bangalore", "bengaluru",
                        "chennai", "india"]

AI_CORE_SKILLS_FOR_DISPLAY = [
    "embeddings", "faiss", "pinecone", "weaviate", "qdrant", "milvus",
    "retrieval", "ranking", "nlp", "llm", "rag", "pytorch", "sentence-transformers",
    "transformers", "fine-tuning", "lora", "vector", "recommendation",
]

CURRENT_DATE = datetime.now().date()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _normalize(text: str) -> str:
    return text.lower().strip() if text else ""


def _days_since(date_str: Any) -> float:
    if not date_str or not isinstance(date_str, str):
        return 365 * 2  # assume stale
    try:
        d = datetime.strptime(date_str[:10], "%Y-%m-%d").date()
        return (CURRENT_DATE - d).days
    except Exception:
        return 365 * 2


def _skill_matches_jd(skill_name: str) -> tuple[bool, float]:
    """Check if a skill name matches any JD keyword. Returns (matched, weight)."""
    name_lower = _normalize(skill_name)
    for kw, weight in JD_HARD_SKILLS:
        if kw in name_lower or name_lower in kw:
            return True, weight
    return False, 0.0


def _is_product_company(company: str, industry: str) -> bool:
    """Heuristic: is this a product/startup company vs pure services?"""
    company_lower = _normalize(company)
    industry_lower = _normalize(industry)

    # Explicit consulting check
    if any(dc in company_lower for dc in DISQUALIFIER_COMPANIES):
        return False
    if any(di in industry_lower for di in DISQUALIFIER_INDUSTRIES):
        return False

    # Product signals
    if any(p in industry_lower for p in PRODUCT_COMPANY_INDICATORS):
        return True

    return True  # Default: assume product unless explicitly services


def _edu_tier_score(tier: str) -> int:
    return {"tier_1": 4, "tier_2": 3, "tier_3": 2, "tier_4": 1, "unknown": 1}.get(tier, 1)


def _edu_level_score(degree: str) -> int:
    d = _normalize(degree)
    if any(x in d for x in ["phd", "ph.d", "doctorate"]):
        return 4
    if any(x in d for x in ["mtech", "m.tech", "ms ", "m.s", "msc", "m.sc", "mba", "m.e"]):
        return 3
    if any(x in d for x in ["btech", "b.tech", "be ", "b.e", "bsc", "b.sc", "ba ", "b.a"]):
        return 2
    if any(x in d for x in ["diploma", "associate"]):
        return 1
    return 2  # default


# ---------------------------------------------------------------------------
# Feature extraction — 47 features
# ---------------------------------------------------------------------------

def feature_vector(candidate: dict) -> dict[str, float]:
    """
    Extract all 47 numeric features from a candidate dict.
    Returns a flat dict of {feature_name: float}.
    """
    profile = candidate.get("profile", {})
    career = candidate.get("career_history", [])
    education = candidate.get("education", [])
    skills = candidate.get("skills", [])
    signals = candidate.get("redrob_signals", {})
    certs = candidate.get("certifications", [])

    # ----------------------------------------------------------------
    # === SKILLS FEATURES (15) ===
    # ----------------------------------------------------------------
    matched_skills = []
    total_weight_sum = 0.0
    endorsement_sum = 0
    duration_sum = 0

    ai_skill_count = 0
    embedding_skill_count = 0
    ranking_eval_flag = 0
    python_flag = 0
    llm_finetune_flag = 0
    ltr_flag = 0

    for skill in skills:
        name = skill.get("name", "")
        name_lower = _normalize(name)
        proficiency = skill.get("proficiency", "beginner")
        endorsements = skill.get("endorsements", 0) or 0
        duration = skill.get("duration_months", 0) or 0

        matched, weight = _skill_matches_jd(name)
        if matched:
            # Proficiency multiplier
            prof_mult = {"beginner": 0.4, "intermediate": 0.7, "advanced": 0.9, "expert": 1.0}.get(proficiency, 0.5)
            matched_skills.append({
                "name": name, "weight": weight * prof_mult,
                "endorsements": endorsements, "duration": duration
            })
            total_weight_sum += weight * prof_mult
            endorsement_sum += endorsements
            duration_sum += duration

        # Specific sub-checks
        if any(kw in name_lower for kw in ["embedding", "faiss", "vector", "sentence-transformer",
                                            "pinecone", "weaviate", "qdrant", "milvus"]):
            embedding_skill_count += 1

        if any(kw in name_lower for kw in ["ndcg", "mrr", "map", "a/b test", "ranking eval",
                                            "evaluation", "learning to rank", "ltr"]):
            ranking_eval_flag = 1

        if "python" in name_lower:
            python_flag = 1

        if any(kw in name_lower for kw in ["fine-tun", "finetun", "lora", "qlora", "peft"]):
            llm_finetune_flag = 1

        if any(kw in name_lower for kw in ["xgboost", "lightgbm", "learning to rank",
                                             "ltr", "lambdamart", "ranknet"]):
            ltr_flag = 1

        if any(kw in name_lower for kw in ["machine learning", "deep learning", "nlp",
                                            "neural", "ai ", "artificial intelligence"]):
            ai_skill_count += 1

    n_matched = len(matched_skills)
    n_skills_total = len(skills)

    # Skill assessment scores
    assessment_scores = signals.get("skill_assessment_scores", {}) or {}
    assessment_vals = list(assessment_scores.values())
    skill_assessment_avg = sum(assessment_vals) / len(assessment_vals) if assessment_vals else 0.0
    skill_assessment_count = len(assessment_vals)

    f = {}

    f["f_hard_skill_count"] = min(n_matched / 10.0, 1.0)  # normalized 0-1
    f["f_hard_skill_raw"] = float(n_matched)
    f["f_hard_skill_weight_sum"] = min(total_weight_sum / 15.0, 1.0)
    f["f_hard_skill_expert_count"] = min(
        sum(1 for s in matched_skills if s.get("weight", 0) >= 0.9) / 5.0, 1.0
    )
    f["f_hard_skill_endorsed_count"] = min(
        sum(1 for s in matched_skills if s.get("endorsements", 0) > 5) / 5.0, 1.0
    )
    f["f_hard_skill_duration_sum"] = min(duration_sum / 120.0, 1.0)  # 120 months = 10 years
    f["f_ai_keyword_density"] = (ai_skill_count / max(n_skills_total, 1))
    f["f_embedding_skill_count"] = min(embedding_skill_count / 3.0, 1.0)
    f["f_ranking_eval_skill"] = float(ranking_eval_flag)
    f["f_python_skill"] = float(python_flag)
    f["f_llm_finetune_skill"] = float(llm_finetune_flag)
    f["f_ltr_skill"] = float(ltr_flag)
    f["f_skill_assessment_avg"] = skill_assessment_avg / 100.0
    f["f_skill_assessment_count"] = min(skill_assessment_count / 5.0, 1.0)
    f["f_max_skill_endorsements"] = min(
        max((s.get("endorsements", 0) for s in matched_skills), default=0) / 50.0, 1.0
    )

    # ----------------------------------------------------------------
    # === CAREER & EXPERIENCE FEATURES (12) ===
    # ----------------------------------------------------------------
    yoe = profile.get("years_of_experience") or 0.0

    # YOE range check (5-9 years preferred, 6-8 ideal)
    if 6.0 <= yoe <= 8.0:
        yoe_in_range = 1.0
    elif 5.0 <= yoe <= 9.0:
        yoe_in_range = 0.8
    elif 4.0 <= yoe <= 10.0:
        yoe_in_range = 0.5
    else:
        yoe_in_range = 0.2

    yoe_preferred = 1.0 if 6.0 <= yoe <= 8.0 else 0.0

    # Career analysis
    total_career_months = 0
    product_months = 0
    consulting_only = True
    current_role_ai = False
    tenure_list = []
    pure_research = True
    domain_disqualifier = False

    title_lower = _normalize(profile.get("current_title", ""))
    career_ai_titles = ["engineer", "scientist", "developer", "researcher", "architect",
                         "analyst", "ml ", "ai ", "data ", "nlp", "machine learning"]
    if any(t in title_lower for t in career_ai_titles):
        current_role_ai = True

    for role in career:
        dur = role.get("duration_months", 0) or 0
        company = role.get("company", "")
        industry = role.get("industry", "")
        desc = _normalize(role.get("description", ""))
        role_title = _normalize(role.get("title", ""))

        total_career_months += dur
        tenure_list.append(dur)

        if _is_product_company(company, industry):
            product_months += dur
            consulting_only = False
        elif dur > 0:
            pass  # stays consulting_only unless product found

        if not any(ri in _normalize(company) for ri in RESEARCH_INDICATORS):
            pure_research = False

        if any(d in desc or d in role_title for d in DISQUALIFIER_DOMAINS):
            domain_disqualifier = True

    if not career:
        consulting_only = True
        pure_research = False

    product_ratio = product_months / max(total_career_months, 1)
    career_tenure_avg = (sum(tenure_list) / len(tenure_list)) if tenure_list else 0.0

    # Seniority match
    seniority_score = 0.5
    if any(s in title_lower for s in ["senior", "lead", "principal", "staff", "head"]):
        seniority_score = 1.0
    elif any(s in title_lower for s in ["junior", "intern", "fresher", "entry"]):
        seniority_score = 0.2

    f["f_years_experience"] = min(yoe / 12.0, 1.0)
    f["f_yoe_in_range"] = yoe_in_range
    f["f_yoe_preferred"] = yoe_preferred
    f["f_product_company_months"] = min(product_months / 84.0, 1.0)  # 7 years max
    f["f_product_company_ratio"] = product_ratio
    f["f_consulting_only"] = 1.0 if consulting_only else 0.0
    f["f_current_role_relevant"] = 1.0 if current_role_ai else 0.0
    f["f_career_tenure_avg"] = min(career_tenure_avg / 36.0, 1.0)  # normalize by 3 years
    f["f_recent_ai_role"] = 1.0 if current_role_ai else 0.0
    f["f_seniority_match"] = seniority_score
    f["f_domain_disqualifier"] = 1.0 if domain_disqualifier else 0.0
    f["f_pure_research_flag"] = 1.0 if pure_research else 0.0

    # ----------------------------------------------------------------
    # === LOCATION & LOGISTICS FEATURES (4) ===
    # ----------------------------------------------------------------
    location = _normalize(profile.get("location", "") + " " + profile.get("country", ""))
    willing_relocate = signals.get("willing_to_relocate", False)
    notice_days = signals.get("notice_period_days", 90) or 90

    location_score = 0.0
    if any(loc in location for loc in ["pune", "noida", "hyderabad", "mumbai",
                                        "delhi", "ncr", "gurgaon", "gurugram",
                                        "bangalore", "bengaluru", "chennai"]):
        location_score = 1.0
    elif "india" in location or profile.get("country", "").lower() == "india":
        location_score = 0.7
    elif willing_relocate:
        location_score = 0.4

    if notice_days <= 30:
        notice_score = 1.0
    elif notice_days <= 60:
        notice_score = 0.7
    elif notice_days <= 90:
        notice_score = 0.4
    else:
        notice_score = 0.2

    f["f_location_match"] = location_score
    f["f_willing_to_relocate"] = 1.0 if willing_relocate else 0.0
    f["f_notice_days"] = 1.0 - min(notice_days / 180.0, 1.0)  # inverted: shorter = better
    f["f_notice_ok"] = notice_score

    # ----------------------------------------------------------------
    # === BEHAVIORAL SIGNAL FEATURES (13) ===
    # ----------------------------------------------------------------
    recency_days = _days_since(signals.get("last_active_date"))
    open_to_work = signals.get("open_to_work_flag", False)
    rr = signals.get("recruiter_response_rate", 0.0) or 0.0
    avg_resp_hours = signals.get("avg_response_time_hours", 168) or 168
    profile_completeness = signals.get("profile_completeness_score", 0.0) or 0.0
    views_30d = signals.get("profile_views_received_30d", 0) or 0
    saved_30d = signals.get("saved_by_recruiters_30d", 0) or 0
    github_raw = signals.get("github_activity_score", -1)
    if github_raw is None or github_raw < 0:
        github_raw = 0.0
    interview_rate = signals.get("interview_completion_rate", 0.0) or 0.0
    offer_rate = signals.get("offer_acceptance_rate", -1)
    if offer_rate is None or offer_rate < 0:
        offer_rate = 0.5  # unknown → neutral
    verified_email = signals.get("verified_email", False)
    verified_phone = signals.get("verified_phone", False)
    linkedin = signals.get("linkedin_connected", False)
    connections = signals.get("connection_count", 0) or 0

    # Recency: fresher is better; cap at 365 days
    recency_score = max(0.0, 1.0 - recency_days / 365.0)
    resp_speed_score = 1.0 / (1.0 + avg_resp_hours / 24.0)  # 0 hours → 1.0, 168 hours → 0.14

    f["f_recency_score"] = recency_score
    f["f_open_to_work"] = 1.0 if open_to_work else 0.3
    f["f_recruiter_response_rate"] = rr
    f["f_response_speed"] = resp_speed_score
    f["f_profile_completeness"] = profile_completeness / 100.0
    f["f_profile_views_30d"] = min(views_30d / 100.0, 1.0)
    f["f_saved_by_recruiters"] = min(saved_30d / 20.0, 1.0)
    f["f_github_score"] = github_raw / 100.0
    f["f_interview_completion"] = interview_rate
    f["f_offer_acceptance"] = offer_rate
    f["f_verified_contact"] = (int(verified_email) + int(verified_phone)) / 2.0
    f["f_linkedin_connected"] = 1.0 if linkedin else 0.0
    f["f_connection_count"] = min(connections / 500.0, 1.0)

    # ----------------------------------------------------------------
    # === EDUCATION FEATURES (3) ===
    # ----------------------------------------------------------------
    best_tier = 1
    best_level = 2
    cs_degree = False

    for edu in education:
        tier = edu.get("tier", "unknown")
        degree = edu.get("degree", "")
        field = _normalize(edu.get("field_of_study", ""))

        tier_score = _edu_tier_score(tier)
        best_tier = max(best_tier, tier_score)
        best_level = max(best_level, _edu_level_score(degree))

        if any(x in field for x in ["computer science", "computer engineering",
                                      "information technology", "it", "cs",
                                      "mathematics", "statistics", "data science",
                                      "electrical engineering", "electronics"]):
            cs_degree = True

    f["f_edu_tier"] = best_tier / 4.0
    f["f_cs_degree"] = 1.0 if cs_degree else 0.5
    f["f_edu_level"] = best_level / 4.0

    return f


# ---------------------------------------------------------------------------
# Weighted scoring (baseline — used before LightGBM is trained)
# ---------------------------------------------------------------------------

SCORE_WEIGHTS = {
    # Skills cluster (30%)
    "f_hard_skill_weight_sum":     0.12,
    "f_hard_skill_count":          0.05,
    "f_hard_skill_endorsed_count": 0.04,
    "f_embedding_skill_count":     0.03,
    "f_ranking_eval_skill":        0.03,
    "f_python_skill":              0.02,
    "f_llm_finetune_skill":        0.01,

    # Career cluster (20%)
    "f_yoe_in_range":              0.06,
    "f_product_company_ratio":     0.07,
    "f_current_role_relevant":     0.04,
    "f_seniority_match":           0.02,
    "f_career_tenure_avg":         0.01,

    # Penalize disqualifiers
    "f_consulting_only":           -0.08,
    "f_domain_disqualifier":       -0.05,
    "f_pure_research_flag":        -0.05,

    # Behavioral signals (25%)
    "f_recency_score":             0.06,
    "f_open_to_work":              0.04,
    "f_recruiter_response_rate":   0.05,
    "f_profile_completeness":      0.03,
    "f_interview_completion":      0.03,
    "f_github_score":              0.02,
    "f_saved_by_recruiters":       0.02,

    # Trust / profile quality (10%)
    "f_verified_contact":          0.04,
    "f_profile_views_30d":         0.02,
    "f_linkedin_connected":        0.02,
    "f_skill_assessment_avg":      0.02,

    # Location / logistics (8%)
    "f_location_match":            0.05,
    "f_notice_ok":                 0.03,

    # Education (5%)
    "f_edu_tier":                  0.02,
    "f_cs_degree":                 0.02,
    "f_edu_level":                 0.01,
}


def weighted_score(features: dict[str, float]) -> float:
    """
    Compute a simple weighted linear score (0–1) from the feature dict.
    Clipped to [0, 1].
    """
    raw = sum(features.get(k, 0.0) * w for k, w in SCORE_WEIGHTS.items())
    return max(0.0, min(1.0, raw))


# ---------------------------------------------------------------------------
# AI core skill count helper (for reasoning templates)
# ---------------------------------------------------------------------------

def count_ai_core_skills(candidate: dict) -> int:
    """Count how many JD-relevant AI/ML core skills the candidate has."""
    skills = candidate.get("skills", [])
    count = 0
    for skill in skills:
        name_lower = _normalize(skill.get("name", ""))
        if any(kw in name_lower for kw in AI_CORE_SKILLS_FOR_DISPLAY):
            count += 1
    return count


def top_matched_skills(candidate: dict, n: int = 3) -> list[str]:
    """Return the top-n JD-matched skill names for this candidate."""
    skills = candidate.get("skills", [])
    matched = []
    for skill in skills:
        name = skill.get("name", "")
        ok, weight = _skill_matches_jd(name)
        if ok:
            matched.append((weight, name))
    matched.sort(reverse=True)
    return [name for _, name in matched[:n]]
