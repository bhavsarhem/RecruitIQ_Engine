import sys, json
sys.path.insert(0, r'd:\RecruitIQ_Engine\backend')
from ranker.honeypot_filter import is_honeypot
from ranker.scorer import feature_vector, weighted_score, count_ai_core_skills, top_matched_skills

base = r'd:\RecruitIQ_Engine\dataset'
with open(base + r'\sample_candidates.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

honeypot_count = 0
scores = []
for c in data:
    flagged, reasons = is_honeypot(c)
    feats = feature_vector(c)
    score = weighted_score(feats)
    ai_cnt = count_ai_core_skills(c)
    top_skills = top_matched_skills(c)
    cid = c['candidate_id']
    title = c['profile']['current_title']
    yoe = c['profile']['years_of_experience']
    if flagged:
        honeypot_count += 1
        print("HONEYPOT:", cid, "|", title, "| reasons:", reasons)
    scores.append((score, cid, title, yoe, ai_cnt, top_skills, flagged))

scores.sort(reverse=True)
print("\n--- Sample of 50 candidates ---")
print("Honeypots detected:", honeypot_count, "/", len(data))
print("\nTop 10:")
for score, cid, title, yoe, ai_cnt, top_skills, flagged in scores[:10]:
    print(f"  {score:.4f} | {cid} | {title} ({yoe}y) | AI:{ai_cnt} | {top_skills}")
print("\nBottom 5:")
for score, cid, title, yoe, ai_cnt, top_skills, flagged in scores[-5:]:
    print(f"  {score:.4f} | {cid} | {title} ({yoe}y) | AI:{ai_cnt}")
