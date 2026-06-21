import csv, json

# Load candidates for spot checking top results
base = r'd:\RecruitIQ_Engine\dataset'
cand_lookup = {}
with open(base + r'\candidates.jsonl', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if i > 20000: break
        try:
            c = json.loads(line)
            cand_lookup[c['candidate_id']] = c
        except:
            pass

# Check submission.csv top 15
print("=== submission.csv TOP 15 ===")
with open(r'd:\RecruitIQ_Engine\backend\submission.csv', newline='', encoding='utf-8') as f:
    rows = list(csv.reader(f))

for row in rows[1:16]:
    cid, rank, score, reasoning = row
    c = cand_lookup.get(cid, {})
    if c:
        p = c.get('profile', {})
        title = p.get('current_title', '?')
        yoe = p.get('years_of_experience', '?')
        company = p.get('current_company', '?')
        industry = p.get('current_industry', '?')
        print(f"  {rank:3s} {score} {cid} | {title} ({yoe}y) @ {company} [{industry}]")
    else:
        print(f"  {rank:3s} {score} {cid} (not in first 20k lookup)")
