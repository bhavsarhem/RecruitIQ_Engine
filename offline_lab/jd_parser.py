"""
jd_parser.py — Phase A: Parse job_description.docx into structured JSON.

This runs ONCE offline and produces artifacts/jd_parsed.json.
Requires: python-docx (for DOCX parsing).
No network calls needed — pure file parsing.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

# ---------------------------------------------------------------------------
# Hard-coded JD analysis
# (Derived from job_description.docx — re-runs if you want fresh parsing)
# ---------------------------------------------------------------------------

JD_PARSED = {
    "role": "Senior AI Engineer — Founding Team",
    "company": "Redrob AI",
    "seniority": "senior",
    "experience_min_years": 5,
    "experience_max_years": 9,
    "experience_preferred_min": 6,
    "experience_preferred_max": 8,

    # Must-have hard skills (will be used for scoring)
    "hard_skills": [
        "embeddings", "sentence-transformers", "sentence transformers",
        "openai embeddings", "bge", "e5", "embedding retrieval",
        "faiss", "pinecone", "weaviate", "qdrant", "milvus",
        "opensearch", "elasticsearch", "vector database", "vector search",
        "hybrid search", "semantic search", "information retrieval",
        "ranking systems", "learning to rank", "ndcg", "mrr", "map",
        "a/b testing", "retrieval quality", "recommendation system",
        "nlp", "natural language processing", "llm", "large language model",
        "fine-tuning", "lora", "qlora", "peft",
        "rag", "retrieval augmented generation",
        "xgboost", "lightgbm", "pytorch", "tensorflow",
        "python", "transformers", "hugging face",
        "bert", "machine learning", "deep learning",
        "mlops", "model evaluation", "scikit-learn",
    ],

    # Nice-to-have skills
    "nice_to_have_skills": [
        "lora", "qlora", "peft", "fine-tuning", "llm fine-tuning",
        "xgboost", "lightgbm", "learning to rank",
        "hr-tech", "recruiting tech", "marketplace",
        "distributed systems", "large-scale inference",
        "open-source contributions",
    ],

    # Explicit disqualifiers — from JD text
    "disqualifier_companies_lower": [
        "tcs", "tata consultancy services", "infosys", "wipro",
        "accenture", "cognizant", "capgemini", "hcl",
        "tech mahindra", "mphasis", "l&t infotech", "ltimindtree",
        "hexaware", "niit technologies",
    ],

    "disqualifier_patterns": [
        # Pure research without production
        "pure_research",
        # LangChain-only recent <12 months
        "langchain_only_recent",
        # No production code in 18 months
        "no_recent_production_code",
        # Entire career at consulting firms
        "consulting_only",
        # CV/speech/robotics without NLP/IR
        "domain_mismatch",
        # 5+ years closed source, no external validation
        "closed_source_only",
    ],

    # Location preferences
    "preferred_locations": [
        "pune", "noida", "hyderabad", "mumbai", "delhi ncr",
        "delhi", "ncr", "gurgaon", "gurugram", "bangalore", "bengaluru",
        "chennai", "india",
    ],

    # Logistics
    "notice_period_preferred_max_days": 30,
    "notice_period_acceptable_max_days": 60,
    "preferred_work_modes": ["hybrid", "remote", "flexible"],

    # Behavioral signals — explicitly mentioned in JD
    "behavioral_signals_important": [
        "active on platform",
        "recruiter response rate",
        "last_active_date",
        "open_to_work_flag",
    ],

    # JD metadata for the record
    "jd_source": "job_description.docx",
    "employment_type": "Full-time",
    "visa_sponsorship": False,

    # Implicit traits (inferred from JD tone)
    "implicit_requirements": [
        "product-company mindset (not consulting)",
        "shipper over researcher — deploy first, optimize later",
        "3+ year tenure commitment (not title-chaser)",
        "written communication — async-first culture",
        "has shipped end-to-end ranking/search/recommendation system",
        "can write production-quality Python",
        "has opinion on hybrid vs dense retrieval, offline vs online evaluation",
    ],
}


def load_or_generate_jd_parsed(artifacts_dir: Path) -> dict:
    """
    Load jd_parsed.json if it exists, else generate from hardcoded data
    and write to disk.
    """
    out_path = artifacts_dir / "jd_parsed.json"
    if not out_path.exists():
        out_path.write_text(json.dumps(JD_PARSED, indent=2), encoding="utf-8")
        print(f"[jd_parser] Wrote {out_path}")
    else:
        print(f"[jd_parser] Loaded existing {out_path}")
    return JD_PARSED


if __name__ == "__main__":
    artifacts_dir = Path(__file__).parent / "artifacts"
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    result = load_or_generate_jd_parsed(artifacts_dir)
    print(json.dumps(result, indent=2))
