/**
 * scorer.ts — RecruitIQ Candidate Scoring & Honeypot Filtering Engine (TypeScript)
 * Ported directly from ranker/scorer.py, honeypot_filter.py, and explainer.py
 */

// ---------------------------------------------------------------------------
// Job Configuration — drives all dynamic scoring parameters
// ---------------------------------------------------------------------------

export interface JobConfig {
  jobTitle: string;
  cities: string[];         // lowercase city names the scorer accepts as location match
  yoeMin: number;           // preferred lower bound (sweet-spot centre)
  yoeMax: number;           // preferred upper bound
  requiredSkills: string[]; // keywords extracted from JD — each gets weight 1.0
  taxonomyText: string;     // free-text JD blob shown in the UI textarea
}

export const DEFAULT_JOB_CONFIG: JobConfig = {
  jobTitle: 'Senior AI / ML Engineer',
  cities: ['bangalore', 'bengaluru', 'pune', 'noida', 'hyderabad', 'gurgaon', 'gurugram'],
  yoeMin: 5,
  yoeMax: 9,
  requiredSkills: [
    'python', 'pytorch', 'embeddings', 'faiss', 'sentence-transformers',
    'vector database', 'pinecone', 'milvus', 'qdrant', 'information retrieval',
    'lightgbm', 'ltr', 'ranking', 'ndcg', 'mrr', 'map', 'a/b testing', 'mlops'
  ],
  taxonomyText:
    'Requires Python, PyTorch, embeddings (FAISS, Sentence-Transformers), vector databases ' +
    '(Pinecone, Milvus, Qdrant), information retrieval, LightGBM/LTR, ranking metrics ' +
    '(NDCG, MRR, MAP), A/B testing, and MLOps. Preferred: Product company backgrounds.',
};

export interface Skill {
  name: string;
  proficiency?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  duration_months?: number;
  endorsements?: number;
}

export interface CareerRole {
  company: string;
  title: string;
  industry?: string;
  start_date?: string;
  end_date?: string;
  duration_months?: number;
  description?: string;
  is_current?: boolean;
}

export interface Education {
  degree: string;
  field_of_study?: string;
  tier?: 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4' | 'unknown';
  school?: string;
}

export interface RedrobSignals {
  recruiter_response_rate?: number;
  notice_period_days?: number;
  open_to_work_flag?: boolean;
  github_activity_score?: number;
  profile_completeness_score?: number;
  last_active_date?: string;
  willing_to_relocate?: boolean;
  verified_email?: boolean;
  verified_phone?: boolean;
  linkedin_connected?: boolean;
  connection_count?: number;
  skill_assessment_scores?: Record<string, number>;
  avg_response_time_hours?: number;
  interview_completion_rate?: number;
  offer_acceptance_rate?: number;
  profile_views_received_30d?: number;
  saved_by_recruiters_30d?: number;
}

export interface Candidate {
  candidate_id: string;
  profile: {
    anonymized_name?: string;
    name?: string;
    current_title?: string;
    current_company?: string;
    location?: string;
    country?: string;
    years_of_experience?: number;
  };
  skills?: Skill[];
  career_history?: CareerRole[];
  education?: Education[];
  certifications?: any[];
  redrob_signals?: RedrobSignals;
}

// Framework Launch Years (from honeypot_filter.py)
export const FRAMEWORK_LAUNCH_YEARS: Record<string, number> = {
  react: 2013,
  'react.js': 2013,
  reactjs: 2013,
  vue: 2014,
  'vue.js': 2014,
  vuejs: 2014,
  'next.js': 2016,
  nextjs: 2016,
  svelte: 2016,
  flutter: 2017,
  fastapi: 2018,
  pytorch: 2016,
  tensorflow: 2015,
  keras: 2015,
  langchain: 2022,
  llama: 2023,
  llama2: 2023,
  'llama 2': 2023,
  chatgpt: 2022,
  'gpt-4': 2023,
  gpt4: 2023,
  'stable diffusion': 2022,
  'diffusion models': 2020,
  transformers: 2018,
  bert: 2018,
  'gpt-3': 2020,
  gpt3: 2020,
  'openai api': 2020,
  pinecone: 2019,
  weaviate: 2019,
  qdrant: 2021,
  milvus: 2019,
  airflow: 2015,
  'apache airflow': 2015,
  dbt: 2016,
  kubernetes: 2014,
  docker: 2013,
  terraform: 2014,
  rust: 2015,
  kotlin: 2016,
  swift: 2014,
  typescript: 2012,
  golang: 2012,
  go: 2012,
  ray: 2017,
  mlflow: 2018,
  wandb: 2018,
  'weights & biases': 2018,
  'vertex ai': 2021,
  sagemaker: 2017,
  'aws sagemaker': 2017,
  bedrock: 2023,
  'aws bedrock': 2023,
  anthropic: 2021,
  claude: 2023,
};

// Hardcoded matching constants (from scorer.py)
export const JD_HARD_SKILLS: [string, number][] = [
  ["embeddings", 1.0],
  ["sentence-transformers", 1.0],
  ["sentence transformers", 1.0],
  ["openai embeddings", 0.9],
  ["bge", 0.8],
  ["e5", 0.7],
  ["embedding", 0.9],
  ["faiss", 1.0],
  ["pinecone", 0.9],
  ["weaviate", 0.9],
  ["qdrant", 0.9],
  ["milvus", 0.9],
  ["opensearch", 0.8],
  ["elasticsearch", 0.8],
  ["vector database", 1.0],
  ["vector db", 1.0],
  ["vector search", 0.9],
  ["hybrid search", 0.9],
  ["semantic search", 0.9],
  ["retrieval", 0.9],
  ["information retrieval", 1.0],
  ["ranking", 1.0],
  ["learning to rank", 1.0],
  ["ltr", 0.9],
  ["ndcg", 0.9],
  ["mrr", 0.8],
  ["map", 0.7],
  ["a/b testing", 0.8],
  ["ab testing", 0.7],
  ["recommendation", 0.8],
  ["recommendation system", 0.9],
  ["nlp", 0.9],
  ["natural language processing", 1.0],
  ["llm", 0.9],
  ["large language model", 0.9],
  ["fine-tuning", 0.8],
  ["fine tuning", 0.8],
  ["lora", 0.8],
  ["qlora", 0.8],
  ["peft", 0.8],
  ["rag", 0.9],
  ["retrieval augmented", 0.9],
  ["xgboost", 0.7],
  ["lightgbm", 0.7],
  ["pytorch", 0.8],
  ["tensorflow", 0.7],
  ["python", 0.9],
  ["transformers", 0.8],
  ["hugging face", 0.8],
  ["huggingface", 0.8],
  ["bert", 0.7],
  ["gpt", 0.7],
  ["machine learning", 0.8],
  ["deep learning", 0.8],
  ["mlops", 0.7],
  ["model evaluation", 0.8],
  ["scikit-learn", 0.6],
  ["sklearn", 0.6],
];

export const DISQUALIFIER_COMPANIES = new Set([
  "tcs", "tata consultancy", "infosys", "wipro", "accenture",
  "cognizant", "capgemini", "hcl", "hcl technologies", "tech mahindra",
  "mphasis", "l&t infotech", "ltimindtree", "hexaware", "niit technologies",
  "mastech", "igate", "patni"
]);

export const DISQUALIFIER_INDUSTRIES = new Set([
  "it services", "it consulting", "consulting", "bpo", "outsourcing",
  "staffing", "it staffing"
]);

export const DISQUALIFIER_DOMAINS = ["computer vision", "speech recognition", "robotics", "autonomous vehicles"];

export const RESEARCH_INDICATORS = [
  "university", "iit", "iisc", "lab", "research institute",
  "academia", "research center", "national lab", "institute of technology"
];

export const PRODUCT_COMPANY_INDICATORS = [
  "saas", "startup", "fintech", "edtech", "healthtech", "ai", "analytics",
  "platform", "marketplace", "product", "software", "technology"
];

export const AI_CORE_SKILLS_FOR_DISPLAY = [
  "embeddings", "faiss", "pinecone", "weaviate", "qdrant", "milvus",
  "retrieval", "ranking", "nlp", "llm", "rag", "pytorch", "sentence-transformers",
  "transformers", "fine-tuning", "lora", "vector", "recommendation"
];

// Anchor date matching Python context (June 2026)
export const CURRENT_DATE = new Date("2026-06-21");
export const CURRENT_YEAR = CURRENT_DATE.getFullYear();

export const VOCAB = [
  "python","java","javascript","typescript","golang","rust","scala","kotlin","swift","c++","c#",
  "sql","nosql","mongodb","postgresql","mysql","redis","cassandra","bigquery",
  "pytorch","tensorflow","keras","scikit-learn","xgboost","lightgbm","catboost",
  "transformers","hugging face","bert","gpt","llm","large language model",
  "embeddings","sentence transformers","faiss","pinecone","weaviate","qdrant","milvus",
  "opensearch","elasticsearch","vector database","vector search","semantic search",
  "retrieval","information retrieval","ranking","learning to rank","ltr","ndcg","mrr",
  "recommendation","recommendation system","nlp","natural language processing",
  "fine-tuning","lora","qlora","peft","rag","retrieval augmented generation",
  "mlops","model evaluation","a/b testing","ab testing","deep learning","machine learning",
  "computer vision","generative ai","diffusion models","reinforcement learning",
  "docker","kubernetes","aws","gcp","azure","spark","kafka","airflow","dbt",
  "react","node.js","django","fastapi","flask","rest api","graphql","microservices",
  "feature engineering","model training","model serving","data engineering","data science",
  "langchain","openai","anthropic","ray","mlflow","wandb","vertex ai","sagemaker",
  "ci/cd","git","agile","scrum"
].sort((a, b) => b.length - a.length);

export function extractSkills(text: string): string[] {
  const t = text.toLowerCase();
  const found: string[] = [];
  const seen = new Set<string>();

  for (const sk of VOCAB) {
    const escaped = sk.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`);
    if (regex.test(t)) {
      const words = sk.split(/\s+/);
      const hasOverlap = words.some(w => seen.has(w));
      if (!hasOverlap) {
        found.push(sk);
        words.forEach(w => seen.add(w));
      }
    }
  }
  return found.slice(0, 35);
}

// Helper functions
function normalize(text: string | undefined): string {
  return text ? text.toLowerCase().trim() : "";
}

function parseDate(s: any): Date | null {
  if (!s || typeof s !== "string") return null;
  const cleaned = s.trim();
  const match = cleaned.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = match[2] ? parseInt(match[2], 10) - 1 : 0;
  const day = match[3] ? parseInt(match[3], 10) : 1;
  return new Date(year, month, day);
}

function daysSince(dateStr: string | undefined): number {
  if (!dateStr || typeof dateStr !== "string") {
    return 365 * 2; // assume stale
  }
  const d = parseDate(dateStr);
  if (!d) return 365 * 2;
  const diffTime = CURRENT_DATE.getTime() - d.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays < 0 ? 0 : diffDays;
}

function skillMatchesJd(
  skillName: string,
  config?: JobConfig
): { matched: boolean; weight: number } {
  const nameLower = normalize(skillName);

  // Dynamic required skills from job config (weight 1.0 for exact, 0.85 for partial)
  if (config && config.requiredSkills.length > 0) {
    for (const req of config.requiredSkills) {
      const reqLower = req.toLowerCase().trim();
      if (reqLower.length < 2) continue;
      if (nameLower.includes(reqLower) || reqLower.includes(nameLower)) {
        return { matched: true, weight: nameLower === reqLower ? 1.0 : 0.85 };
      }
    }
  }

  // Fallback: check static JD_HARD_SKILLS table
  for (const [kw, weight] of JD_HARD_SKILLS) {
    if (nameLower.includes(kw) || kw.includes(nameLower)) {
      return { matched: true, weight };
    }
  }
  return { matched: false, weight: 0.0 };
}

function isProductCompany(company: string, industry: string): boolean {
  const companyLower = normalize(company);
  const industryLower = normalize(industry);

  // Check explicit disqualifiers
  for (const dc of DISQUALIFIER_COMPANIES) {
    if (companyLower.includes(dc)) return false;
  }
  for (const di of DISQUALIFIER_INDUSTRIES) {
    if (industryLower.includes(di)) return false;
  }

  // Product industry signals
  for (const p of PRODUCT_COMPANY_INDICATORS) {
    if (industryLower.includes(p)) return true;
  }

  return true; // Default to product
}

function eduTierScore(tier: string | undefined): number {
  return { tier_1: 4, tier_2: 3, tier_3: 2, tier_4: 1, unknown: 1 }[tier || "unknown"] || 1;
}

function eduLevelScore(degree: string | undefined): number {
  const d = normalize(degree);
  if (["phd", "ph.d", "doctorate"].some((x) => d.includes(x))) return 4;
  if (["mtech", "m.tech", "ms ", "m.s", "msc", "m.sc", "mba", "m.e"].some((x) => d.includes(x))) return 3;
  if (["btech", "b.tech", "be ", "b.e", "bsc", "b.sc", "ba ", "b.a"].some((x) => d.includes(x))) return 2;
  if (["diploma", "associate"].some((x) => d.includes(x))) return 1;
  return 2; // Default
}

// ---------------------------------------------------------------------------
// Honeypot Filter Predicates
// ---------------------------------------------------------------------------

export function timelineImpossible(careerHistory: CareerRole[]): boolean {
  if (!careerHistory || careerHistory.length === 0) return false;

  const parsed: { start: Date; end: Date | null; isCurrent: boolean; durMonths: number }[] = [];
  for (const role of careerHistory) {
    const start = parseDate(role.start_date);
    const end = parseDate(role.end_date);
    const isCurrent = !!role.is_current;

    if (!start) continue;

    // Future start date
    if (start > CURRENT_DATE) return true;

    // Impossibly old role (before 1970)
    if (start.getFullYear() < 1970) return true;

    // Duration sanity
    const durMonths = role.duration_months || 0;
    if (durMonths > 480) return true; // 40 years

    parsed.push({ start, end, isCurrent, durMonths });
  }

  // Check past role overlaps
  const pastRoles = parsed.filter((r) => !r.isCurrent && r.end !== null) as { start: Date; end: Date }[];
  for (let i = 0; i < pastRoles.length; i++) {
    for (let j = i + 1; j < pastRoles.length; j++) {
      const r1 = pastRoles[i];
      const r2 = pastRoles[j];

      const overlapStart = new Date(Math.max(r1.start.getTime(), r2.start.getTime()));
      const overlapEnd = new Date(Math.min(r1.end.getTime(), r2.end.getTime()));

      if (overlapStart < overlapEnd) {
        const overlapMonths =
          (overlapEnd.getFullYear() - overlapStart.getFullYear()) * 12 +
          (overlapEnd.getMonth() - overlapStart.getMonth());
        if (overlapMonths > 6) return true;
      }
    }
  }

  return false;
}

export function frameworkAgeImpossible(skills: Skill[]): boolean {
  for (const skill of skills) {
    const nameLower = normalize(skill.name);
    const durationMonths = skill.duration_months || 0;

    for (const [framework, launchYear] of Object.entries(FRAMEWORK_LAUNCH_YEARS)) {
      if (nameLower.includes(framework)) {
        const maxPossibleMonths = (CURRENT_YEAR - launchYear) * 12 + 6;
        if (durationMonths > maxPossibleMonths) return true;
        break;
      }
    }
  }
  return false;
}

export function zeroDurationExpert(skills: Skill[]): boolean {
  let count = 0;
  for (const skill of skills) {
    if (skill.proficiency === "expert" && (skill.duration_months || 0) === 0) {
      count++;
      if (count >= 2) return true;
    }
  }
  return false;
}

export function skillStuffing(skills: Skill[]): boolean {
  const highProf = skills.filter((s) => s.proficiency === "expert" || s.proficiency === "advanced");
  if (highProf.length < 12) return false;

  const totalEndorsements = highProf.reduce((sum, s) => sum + (s.endorsements || 0), 0);
  const totalDuration = highProf.reduce((sum, s) => sum + (s.duration_months || 0), 0);

  const avgEndorsements = totalEndorsements / highProf.length;
  const avgDuration = totalDuration / highProf.length;

  return avgEndorsements < 1.0 && avgDuration < 3.0;
}

export function impossibleYoe(profile: Candidate["profile"], careerHistory: CareerRole[]): boolean {
  const statedYoe = profile.years_of_experience || 0;

  if (statedYoe < 0 || statedYoe > 45) return true;

  const totalMonths = careerHistory.reduce((sum, role) => sum + (role.duration_months || 0), 0);
  const maxPlausibleMonths = totalMonths + 36; // 3 years buffer

  if (statedYoe * 12 > maxPlausibleMonths + 60) return true; // 5 years tolerance

  return false;
}

export const AI_SKILL_KEYWORDS = new Set([
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
  "data science", "mlops", "feature engineering", "model training"
]);

export const NON_AI_TITLES = new Set([
  "marketing manager", "operations manager", "hr manager", "accountant",
  "sales executive", "graphic designer", "content writer",
  "customer support", "civil engineer", "mechanical engineer",
  "project manager", "business analyst", "product manager"
]);

export function titleSkillMismatch(profile: Candidate["profile"], skills: Skill[]): boolean {
  const title = normalize(profile.current_title);

  const isNonAiTitle = Array.from(NON_AI_TITLES).some((nonAi) => title.includes(nonAi));
  if (!isNonAiTitle) return false;

  let aiExpertCount = 0;
  for (const skill of skills) {
    const skillName = normalize(skill.name);
    const proficiency = skill.proficiency || "";
    const hasAiKeyword = Array.from(AI_SKILL_KEYWORDS).some((kw) => skillName.includes(kw));

    if (hasAiKeyword && (proficiency === "expert" || proficiency === "advanced")) {
      aiExpertCount++;
    }
  }

  return aiExpertCount >= 6;
}

export function isHoneypot(candidate: Candidate): { flagged: boolean; reasons: string[] } {
  const profile = candidate.profile || {};
  const career = candidate.career_history || [];
  const skills = candidate.skills || [];

  const reasons: string[] = [];

  if (timelineImpossible(career)) reasons.push("impossible_timeline");
  if (frameworkAgeImpossible(skills)) reasons.push("framework_age_impossible");
  if (zeroDurationExpert(skills)) reasons.push("zero_duration_expert");
  if (skillStuffing(skills)) reasons.push("skill_stuffing");
  if (impossibleYoe(profile, career)) reasons.push("impossible_yoe");
  if (titleSkillMismatch(profile, skills)) reasons.push("title_skill_mismatch");

  return { flagged: reasons.length > 0, reasons };
}

// ---------------------------------------------------------------------------
// 47 Features Extraction
// ---------------------------------------------------------------------------

export function extractFeatureVector(candidate: Candidate, config?: JobConfig): Record<string, number> {
  const profile = candidate.profile || {};
  const career = candidate.career_history || [];
  const skills = candidate.skills || [];
  const signals = candidate.redrob_signals || {};

  const matchedSkills: { name: string; weight: number; endorsements: number; duration: number }[] = [];
  let totalWeightSum = 0.0;
  let endorsementSum = 0;
  let durationSum = 0;

  let aiSkillCount = 0;
  let embeddingSkillCount = 0;
  let rankingEvalFlag = 0;
  let pythonFlag = 0;
  let llmFinetuneFlag = 0;
  let ltrFlag = 0;

  for (const skill of skills) {
    const name = skill.name || "";
    const nameLower = normalize(name);
    const proficiency = skill.proficiency || "beginner";
    const endorsements = skill.endorsements || 0;
    const duration = skill.duration_months || 0;

    const matchRes = skillMatchesJd(name, config);
    if (matchRes.matched) {
      const profMult = { beginner: 0.4, intermediate: 0.7, advanced: 0.9, expert: 1.0 }[proficiency] || 0.5;
      const finalWeight = matchRes.weight * profMult;
      matchedSkills.push({
        name,
        weight: finalWeight,
        endorsements,
        duration,
      });
      totalWeightSum += finalWeight;
      endorsementSum += endorsements;
      durationSum += duration;
    }

    if (
      ["embedding", "faiss", "vector", "sentence-transformer", "pinecone", "weaviate", "qdrant", "milvus"].some((kw) =>
        nameLower.includes(kw)
      )
    ) {
      embeddingSkillCount++;
    }

    if (
      ["ndcg", "mrr", "map", "a/b test", "ranking eval", "evaluation", "learning to rank", "ltr"].some((kw) =>
        nameLower.includes(kw)
      )
    ) {
      rankingEvalFlag = 1;
    }

    if (nameLower.includes("python")) {
      pythonFlag = 1;
    }

    if (["fine-tun", "finetun", "lora", "qlora", "peft"].some((kw) => nameLower.includes(kw))) {
      llmFinetuneFlag = 1;
    }

    if (["xgboost", "lightgbm", "learning to rank", "ltr", "lambdamart", "ranknet"].some((kw) => nameLower.includes(kw))) {
      ltrFlag = 1;
    }

    if (
      ["machine learning", "deep learning", "nlp", "neural", "ai ", "artificial intelligence"].some((kw) =>
        nameLower.includes(kw)
      )
    ) {
      aiSkillCount++;
    }
  }

  const nMatched = matchedSkills.length;
  const nSkillsTotal = skills.length;

  const assessmentScores = signals.skill_assessment_scores || {};
  const assessmentVals = Object.values(assessmentScores);
  const skillAssessmentAvg = assessmentVals.length > 0 ? assessmentVals.reduce((sum, v) => sum + v, 0) / assessmentVals.length : 0.0;
  const skillAssessmentCount = assessmentVals.length;

  const f: Record<string, number> = {};

  f["f_hard_skill_count"] = Math.min(nMatched / 10.0, 1.0);
  f["f_hard_skill_raw"] = nMatched;
  f["f_hard_skill_weight_sum"] = Math.min(totalWeightSum / 15.0, 1.0);
  f["f_hard_skill_expert_count"] = Math.min(matchedSkills.filter((s) => s.weight >= 0.9).length / 5.0, 1.0);
  f["f_hard_skill_endorsed_count"] = Math.min(matchedSkills.filter((s) => s.endorsements > 5).length / 5.0, 1.0);
  f["f_hard_skill_duration_sum"] = Math.min(durationSum / 120.0, 1.0);
  f["f_ai_keyword_density"] = aiSkillCount / Math.max(nSkillsTotal, 1);
  f["f_embedding_skill_count"] = Math.min(embeddingSkillCount / 3.0, 1.0);
  f["f_ranking_eval_skill"] = rankingEvalFlag;
  f["f_python_skill"] = pythonFlag;
  f["f_llm_finetune_skill"] = llmFinetuneFlag;
  f["f_ltr_skill"] = ltrFlag;
  f["f_skill_assessment_avg"] = skillAssessmentAvg / 100.0;
  f["f_skill_assessment_count"] = Math.min(skillAssessmentCount / 5.0, 1.0);
  f["f_max_skill_endorsements"] = Math.min(
    (matchedSkills.length > 0 ? Math.max(...matchedSkills.map((s) => s.endorsements)) : 0) / 50.0,
    1.0
  );

  const yoe = profile.years_of_experience || 0.0;

  // Dynamic YoE scoring based on config bounds
  const cfgMin = config ? config.yoeMin : 5;
  const cfgMax = config ? config.yoeMax : 9;
  const cfgMid1 = cfgMin + (cfgMax - cfgMin) * 0.2;
  const cfgMid2 = cfgMax - (cfgMax - cfgMin) * 0.2;
  const cfgBuffer = Math.max(1, (cfgMax - cfgMin) * 0.25);

  let yoeInRange = 0.2;
  if (yoe >= cfgMid1 && yoe <= cfgMid2) yoeInRange = 1.0;
  else if (yoe >= cfgMin && yoe <= cfgMax) yoeInRange = 0.8;
  else if (yoe >= cfgMin - cfgBuffer && yoe <= cfgMax + cfgBuffer) yoeInRange = 0.5;

  const yoePreferred = yoe >= cfgMid1 && yoe <= cfgMid2 ? 1.0 : 0.0;

  let totalCareerMonths = 0;
  let productMonths = 0;
  let consultingOnly = true;
  let currentRoleAi = false;
  const tenureList: number[] = [];
  let pureResearch = true;
  let domainDisqualifier = false;

  const titleLower = normalize(profile.current_title);
  const careerAiTitles = [
    "engineer", "scientist", "developer", "researcher", "architect",
    "analyst", "ml ", "ai ", "data ", "nlp", "machine learning"
  ];
  if (careerAiTitles.some((t) => titleLower.includes(t))) {
    currentRoleAi = true;
  }

  for (const role of career) {
    const dur = role.duration_months || 0;
    const company = role.company || "";
    const industry = role.industry || "";
    const desc = normalize(role.description);
    const roleTitle = normalize(role.title);

    totalCareerMonths += dur;
    tenureList.push(dur);

    if (isProductCompany(company, industry)) {
      productMonths += dur;
      consultingOnly = false;
    }

    if (!RESEARCH_INDICATORS.some((ri) => normalize(company).includes(ri))) {
      pureResearch = false;
    }

    if (DISQUALIFIER_DOMAINS.some((d) => desc.includes(d) || roleTitle.includes(d))) {
      domainDisqualifier = true;
    }
  }

  if (career.length === 0) {
    consultingOnly = true;
    pureResearch = false;
  }

  const productRatio = productMonths / Math.max(totalCareerMonths, 1);
  const careerTenureAvg = tenureList.length > 0 ? tenureList.reduce((sum, v) => sum + v, 0) / tenureList.length : 0.0;

  let seniorityScore = 0.5;
  if (["senior", "lead", "principal", "staff", "head"].some((s) => titleLower.includes(s))) {
    seniorityScore = 1.0;
  } else if (["junior", "intern", "fresher", "entry"].some((s) => titleLower.includes(s))) {
    seniorityScore = 0.2;
  }

  f["f_years_experience"] = Math.min(yoe / 12.0, 1.0);
  f["f_yoe_in_range"] = yoeInRange;
  f["f_yoe_preferred"] = yoePreferred;
  f["f_product_company_months"] = Math.min(productMonths / 84.0, 1.0);
  f["f_product_company_ratio"] = productRatio;
  f["f_consulting_only"] = consultingOnly ? 1.0 : 0.0;
  f["f_current_role_relevant"] = currentRoleAi ? 1.0 : 0.0;
  f["f_career_tenure_avg"] = Math.min(careerTenureAvg / 36.0, 1.0);
  f["f_recent_ai_role"] = currentRoleAi ? 1.0 : 0.0;
  f["f_seniority_match"] = seniorityScore;
  f["f_domain_disqualifier"] = domainDisqualifier ? 1.0 : 0.0;
  f["f_pure_research_flag"] = pureResearch ? 1.0 : 0.0;

  const location = normalize((profile.location || "") + " " + (profile.country || ""));
  const willingRelocate = !!signals.willing_to_relocate;
  const noticeDays = signals.notice_period_days ?? 90;

  // Dynamic location scoring — use config cities when available
  const activeCities = config && config.cities.length > 0
    ? config.cities.map(c => c.toLowerCase().trim())
    : ["pune", "noida", "hyderabad", "mumbai", "delhi", "ncr", "gurgaon", "gurugram", "bangalore", "bengaluru", "chennai"];

  let locationScore = 0.0;
  if (activeCities.some((loc) => location.includes(loc))) {
    locationScore = 1.0;
  } else if (location.includes("india") || normalize(profile.country) === "india") {
    locationScore = 0.7;
  } else if (willingRelocate) {
    locationScore = 0.4;
  }

  let noticeScore = 0.2;
  if (noticeDays <= 30) noticeScore = 1.0;
  else if (noticeDays <= 60) noticeScore = 0.7;
  else if (noticeDays <= 90) noticeScore = 0.4;

  f["f_location_match"] = locationScore;
  f["f_willing_to_relocate"] = willingRelocate ? 1.0 : 0.0;
  f["f_notice_days"] = 1.0 - Math.min(noticeDays / 180.0, 1.0);
  f["f_notice_ok"] = noticeScore;

  const recencyDays = daysSince(signals.last_active_date);
  const openToWork = !!signals.open_to_work_flag;
  const rr = signals.recruiter_response_rate ?? 0.0;
  const avgRespHours = signals.avg_response_time_hours ?? 168;
  const profileCompleteness = signals.profile_completeness_score ?? 0.0;
  const views30d = signals.profile_views_received_30d ?? 0;
  const saved30d = signals.saved_by_recruiters_30d ?? 0;
  let githubRaw = signals.github_activity_score ?? -1;
  if (githubRaw < 0) githubRaw = 0.0;
  const interviewRate = signals.interview_completion_rate ?? 0.0;
  let offerRate = signals.offer_acceptance_rate ?? -1;
  if (offerRate < 0) offerRate = 0.5;
  const verifiedEmail = !!signals.verified_email;
  const verifiedPhone = !!signals.verified_phone;
  const linkedin = !!signals.linkedin_connected;
  const connections = signals.connection_count ?? 0;

  const recencyScore = Math.max(0.0, 1.0 - recencyDays / 365.0);
  const respSpeedScore = 1.0 / (1.0 + avgRespHours / 24.0);

  f["f_recency_score"] = recencyScore;
  f["f_open_to_work"] = openToWork ? 1.0 : 0.3;
  f["f_recruiter_response_rate"] = rr;
  f["f_response_speed"] = respSpeedScore;
  f["f_profile_completeness"] = profileCompleteness / 100.0;
  f["f_profile_views_30d"] = Math.min(views30d / 100.0, 1.0);
  f["f_saved_by_recruiters"] = Math.min(saved30d / 20.0, 1.0);
  f["f_github_score"] = githubRaw / 100.0;
  f["f_interview_completion"] = interviewRate;
  f["f_offer_acceptance"] = offerRate;
  f["f_verified_contact"] = (Number(verifiedEmail) + Number(verifiedPhone)) / 2.0;
  f["f_linkedin_connected"] = linkedin ? 1.0 : 0.0;
  f["f_connection_count"] = Math.min(connections / 500.0, 1.0);

  let bestTier = 1;
  let bestLevel = 2;
  let csDegree = false;

  const education = candidate.education || [];
  for (const edu of education) {
    const tier = edu.tier || "unknown";
    const degree = edu.degree || "";
    const field = normalize(edu.field_of_study);

    const tScore = eduTierScore(tier);
    bestTier = Math.max(bestTier, tScore);
    bestLevel = Math.max(bestLevel, eduLevelScore(degree));

    if (
      ["computer science", "computer engineering", "information technology", "it", "cs", "mathematics", "statistics", "data science", "electrical engineering", "electronics"].some(
        (x) => field.includes(x)
      )
    ) {
      csDegree = true;
    }
  }

  f["f_edu_tier"] = bestTier / 4.0;
  f["f_cs_degree"] = csDegree ? 1.0 : 0.5;
  f["f_edu_level"] = bestLevel / 4.0;

  return f;
}

// Linear weights from scorer.py
export const SCORE_WEIGHTS: Record<string, number> = {
  f_hard_skill_weight_sum: 0.12,
  f_hard_skill_count: 0.05,
  f_hard_skill_endorsed_count: 0.04,
  f_embedding_skill_count: 0.03,
  f_ranking_eval_skill: 0.03,
  f_python_skill: 0.02,
  f_llm_finetune_skill: 0.01,
  f_yoe_in_range: 0.06,
  f_product_company_ratio: 0.07,
  f_current_role_relevant: 0.04,
  f_seniority_match: 0.02,
  f_career_tenure_avg: 0.01,
  f_consulting_only: -0.08,
  f_domain_disqualifier: -0.05,
  f_pure_research_flag: -0.05,
  f_recency_score: 0.06,
  f_open_to_work: 0.04,
  f_recruiter_response_rate: 0.05,
  f_profile_completeness: 0.03,
  f_interview_completion: 0.03,
  f_github_score: 0.02,
  f_saved_by_recruiters: 0.02,
  f_verified_contact: 0.04,
  f_profile_views_30d: 0.02,
  f_linkedin_connected: 0.02,
  f_skill_assessment_avg: 0.02,
  f_location_match: 0.05,
  f_notice_ok: 0.03,
  f_edu_tier: 0.02,
  f_cs_degree: 0.02,
  f_edu_level: 0.01,
};

export function computeWeightedScore(features: Record<string, number>): number {
  let raw = 0.0;
  for (const [k, w] of Object.entries(SCORE_WEIGHTS)) {
    raw += (features[k] || 0.0) * w;
  }
  return Math.max(0.0, Math.min(1.0, raw));
}

export function countAiCoreSkills(candidate: Candidate): number {
  const skills = candidate.skills || [];
  let count = 0;
  for (const skill of skills) {
    const nameLower = normalize(skill.name);
    if (AI_CORE_SKILLS_FOR_DISPLAY.some((kw) => nameLower.includes(kw))) {
      count++;
    }
  }
  return count;
}

export function topMatchedSkills(candidate: Candidate, n: number = 3): string[] {
  const skills = candidate.skills || [];
  const matched: { weight: number; name: string }[] = [];

  for (const skill of skills) {
    const name = skill.name || "";
    const matchRes = skillMatchesJd(name);
    if (matchRes.matched) {
      matched.push({ weight: matchRes.weight, name });
    }
  }

  matched.sort((a, b) => b.weight - a.weight);
  return matched.slice(0, n).map((item) => item.name);
}

// ---------------------------------------------------------------------------
// Explainer (Reasoning String Generator)
// ---------------------------------------------------------------------------

function activityPhrase(signals: RedrobSignals): string {
  const days = daysSince(signals.last_active_date);
  if (days <= 7) return "active this week";
  if (days <= 30) return "active in last 30 days";
  if (days <= 90) return "active in last 90 days";
  return `last active ${days} days ago`;
}

function responsePhrase(rr: number): string {
  if (rr >= 0.8) return "very high recruiter responsiveness";
  if (rr >= 0.5) return "good recruiter responsiveness";
  if (rr >= 0.3) return "moderate recruiter responsiveness";
  return "low recruiter responsiveness";
}

function noticePhrase(days: number): string {
  if (days <= 15) return "immediate availability";
  if (days <= 30) return `${days}-day notice`;
  if (days <= 60) return `${days}-day notice (buyout possible)`;
  return `${days}-day notice`;
}

function gapPhrase(features: Record<string, number>): string {
  const gaps: string[] = [];

  if ((features["f_embedding_skill_count"] || 0) < 0.3) {
    gaps.push("limited vector DB / embeddings depth");
  }
  if (!(features["f_ranking_eval_skill"] || 0)) {
    gaps.push("no explicit ranking-eval experience (NDCG/MRR/A-B)");
  }
  if (!(features["f_python_skill"] || 0)) {
    gaps.push("Python not explicitly listed");
  }
  if ((features["f_product_company_ratio"] || 0) < 0.4) {
    gaps.push("majority of career in services/consulting");
  }
  if ((features["f_recency_score"] || 0) < 0.3) {
    gaps.push("profile not recently active");
  }

  if (gaps.length === 0) return "no major skill gaps identified";
  return gaps.slice(0, 2).join("; ");
}

export function generateReasoning(
  candidate: Candidate,
  features: Record<string, number>,
  _score: number,
  rank: number,
  aiCoreCount: number,
  topSkills: string[]
): string {
  const profile = candidate.profile || {};
  const signals = candidate.redrob_signals || {};
  const career = candidate.career_history || [];

  const title = profile.current_title || "Candidate";
  const yoe = profile.years_of_experience || 0.0;
  const location = profile.location || "Unknown";
  const country = profile.country || "";
  const company = profile.current_company || "";

  const rr = signals.recruiter_response_rate ?? 0.0;
  const notice = signals.notice_period_days ?? 90;
  const github = signals.github_activity_score ?? -1;
  const completeness = signals.profile_completeness_score ?? 0;

  const actPhrase = activityPhrase(signals);
  const resp = responsePhrase(rr);
  const ntcPhrase = noticePhrase(notice);

  const topSkillStr = topSkills.length > 0 ? topSkills.slice(0, 2).join(", ") : "relevant AI skills";
  const locStr = country && !location.includes(country) ? `${location}, ${country}` : location;

  let isProduct = false;
  for (const role of career) {
    if (isProductCompany(role.company || "", role.industry || "")) {
      isProduct = true;
      break;
    }
  }
  const companyType = isProduct ? "product company" : "services company";

  const gapNote = gapPhrase(features);

  let githubNote = "";
  if (github >= 60) {
    githubNote = `; strong GitHub activity (score ${github.toFixed(0)}/100)`;
  } else if (github <= 0) {
    githubNote = "; no GitHub activity linked";
  }

  if (rank <= 5) {
    return (
      `Top match: ${title} with ${yoe.toFixed(1)} yrs experience, ` +
      `${aiCoreCount} JD-aligned AI skills (including ${topSkillStr}), ` +
      `at ${company} (${companyType}); ` +
      `${actPhrase}, ${resp} (${(rr * 100).toFixed(0)}%), ${ntcPhrase}` +
      `${githubNote}.`
    );
  } else if (rank <= 15) {
    return (
      `Strong fit: ${title} with ${yoe.toFixed(1)} yrs, ${aiCoreCount} aligned AI skills ` +
      `(${topSkillStr}); based in ${locStr}, ${actPhrase}, ` +
      `recruiter response rate ${(rr * 100).toFixed(0)}%, ${ntcPhrase}.`
    );
  } else if (rank <= 30) {
    return (
      `${title} (${yoe.toFixed(1)} yrs) with ${aiCoreCount} relevant JD skills; ` +
      `${actPhrase}, profile completeness ${completeness.toFixed(0)}%, ${resp}. ` +
      `Minor concern: ${gapNote}.`
    );
  } else if (rank <= 50) {
    return (
      `Partial match — ${title} with ${aiCoreCount} overlapping AI/ML skills ` +
      `and ${yoe.toFixed(1)} yrs experience; ${actPhrase}, ${ntcPhrase}. ` +
      `Gap: ${gapNote}.`
    );
  } else if (rank <= 75) {
    return (
      `Borderline fit: ${aiCoreCount} relevant skills, ${yoe.toFixed(1)} yrs exp; ` +
      `ranked here primarily on ${topSkills.length > 0 ? topSkillStr : "behavioral signals"}. ` +
      `Notable gap: ${gapNote}.`
    );
  } else {
    return (
      `Adjacent profile — ${title} with ${yoe.toFixed(1)} yrs; ${aiCoreCount} overlapping skills. ` +
      `Included for coverage; key gap: ${gapNote}.`
    );
  }
}

// ---------------------------------------------------------------------------
// Main In-browser Pipeline
// ---------------------------------------------------------------------------

export interface RankedResult {
  candidate: Candidate;
  features: Record<string, number>;
  score: number;
  aiCoreCount: number;
  topSkills: string[];
  isHoneypot: boolean;
  honeypotReasons: string[];
  rank?: number;
  reason?: string;
}

export function runRankingPipeline(
  candidates: Candidate[],
  topN: number = 20,
  config?: JobConfig
): {
  ranked: RankedResult[];
  honeypots: RankedResult[];
  honeypotCount: number;
  elapsedMs: number;
} {
  const t0 = performance.now();
  const results: RankedResult[] = [];
  let hpCount = 0;

  for (const c of candidates) {
    if (!c || typeof c !== "object") continue;

    const hpRes = isHoneypot(c);
    const feats = extractFeatureVector(c, config);
    const score = computeWeightedScore(feats);
    const aiCoreCount = countAiCoreSkills(c);
    const topSkills = topMatchedSkills(c, 5);

    results.push({
      candidate: c,
      features: feats,
      score,
      aiCoreCount,
      topSkills,
      isHoneypot: hpRes.flagged,
      honeypotReasons: hpRes.reasons,
    });

    if (hpRes.flagged) {
      hpCount++;
    }
  }

  // Filter out honeypots and sort non-honeypots
  const nonHoneypots = results
    .filter((r) => !r.isHoneypot)
    .sort((a, b) => {
      const diff = b.score - a.score;
      if (Math.abs(diff) > 1e-6) {
        return diff;
      }
      // Tie breaker: candidate_id ascending
      return a.candidate.candidate_id.localeCompare(b.candidate.candidate_id);
    });

  const honeypots = results.filter((r) => r.isHoneypot);

  // Apply ranking nudge logic from ranker.py for non-increasing rounded scores
  const topCandidates = nonHoneypots.slice(0, topN);
  
  // Step 1: Re-sort by (4dp score descending, cid ascending)
  const topCandidatesWithRounded = topCandidates.map(r => ({
    ...r,
    score4dp: Math.round(r.score * 10000) / 10000
  }));
  
  topCandidatesWithRounded.sort((a, b) => {
    const diff = b.score4dp - a.score4dp;
    if (Math.abs(diff) > 1e-6) {
      return diff;
    }
    return a.candidate.candidate_id.localeCompare(b.candidate.candidate_id);
  });

  // Step 2: Re-assign scores to be strictly decreasing at 4dp
  const finalRanked: RankedResult[] = [];
  if (topCandidatesWithRounded.length > 0) {
    let prev4dp = topCandidatesWithRounded[0].score4dp;
    let currentScore = prev4dp;

    for (let idx = 0; idx < topCandidatesWithRounded.length; idx++) {
      const item = topCandidatesWithRounded[idx];
      const rankPos = idx + 1;
      let finalScore = item.score4dp;

      if (idx === 0) {
        finalScore = currentScore;
      } else {
        if (item.score4dp < prev4dp) {
          currentScore = item.score4dp;
        } else {
          currentScore = finalRanked[finalRanked.length - 1].score - 0.0001;
        }
        finalScore = Math.round(currentScore * 10000) / 10000;
        prev4dp = item.score4dp;
      }

      const reasoning = generateReasoning(
        item.candidate,
        item.features,
        finalScore,
        rankPos,
        item.aiCoreCount,
        item.topSkills
      );

      finalRanked.push({
        ...item,
        score: finalScore,
        rank: rankPos,
        reason: reasoning,
      });
    }
  }

  const elapsedMs = performance.now() - t0;

  return {
    ranked: finalRanked,
    honeypots,
    honeypotCount: hpCount,
    elapsedMs,
  };
}
