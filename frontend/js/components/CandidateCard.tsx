import type { RankedResult } from '../lib/scorer';

interface CandidateCardProps {
  result: RankedResult;
  rank: number;
  onSelect: (c: RankedResult) => void;
}

export default function CandidateCard({ result, rank, onSelect }: CandidateCardProps) {
  const c = result.candidate;
  const scorePct = Math.round(result.score * 100);
  const isElite = result.score >= 0.70;
  const isStrong = result.score >= 0.40 && result.score < 0.70;

  // Determine border and shadow based on score tier
  const cardBorderClass = isElite 
    ? 'border-emerald-500/20 hover:border-emerald-400/40 shadow-emerald-950/5' 
    : isStrong 
      ? 'border-indigo-500/20 hover:border-indigo-400/40 shadow-indigo-950/5' 
      : 'border-[var(--border)] hover:border-slate-500/35 shadow-slate-950/5';

  return (
    <div 
      onClick={() => onSelect(result)}
      className={`glass-panel p-6 border ${cardBorderClass} cursor-pointer group flex flex-col justify-between hover:shadow-2xl transition-all duration-300 relative overflow-hidden`}
    >
      {/* Decorative neon pulse backdrop for elite candidates */}
      {isElite && (
        <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-emerald-500/5 blur-xl group-hover:bg-emerald-500/10 transition-all duration-500" />
      )}
      
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm transition-transform duration-300 group-hover:scale-105
              ${isElite ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                isStrong ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 
                'bg-[var(--surface-3)] text-muted-theme border border-[var(--border)]'}`}>
              #{rank}
            </div>
            <div>
              <h3 className="font-display font-extrabold text-primary-theme group-hover:text-indigo-400 transition-colors text-sm md:text-base leading-tight">
                {c.profile.anonymized_name || 'Candidate'}
              </h3>
              <span className="text-[10px] font-mono text-muted-theme font-bold uppercase tracking-wider">{c.candidate_id}</span>
            </div>
          </div>

          {/* Interactive Progress Ring */}
          <div className="w-11 h-11 flex items-center justify-center relative">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="3" />
              <circle 
                cx="18" cy="18" r="16" 
                fill="transparent" 
                stroke={isElite ? 'var(--success)' : isStrong ? 'var(--accent)' : 'var(--text-muted)'} 
                strokeWidth="3" 
                strokeDasharray={`${scorePct}, 100`} 
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <span className="absolute text-[10px] font-mono font-black text-primary-theme">
              {scorePct}%
            </span>
          </div>
        </div>

        {/* Company & Role */}
        <div className="mb-4">
          <p className="text-xs text-secondary-theme font-bold">{c.profile.current_title || 'Software Engineer'}</p>
          <p className="text-[10px] text-muted-theme mt-0.5">{c.profile.current_company || 'Incognito Company'}</p>
        </div>

        <div className="mb-4">
          {isElite ? (
            <span className="badge-fit badge-fit-elite">🔥 Elite Fit</span>
          ) : isStrong ? (
            <span className="badge-fit badge-fit-strong">⚡ Strong Fit</span>
          ) : (
            <span className="badge-fit badge-fit-contender">● Contender</span>
          )}
        </div>

        {/* Skill tags */}
        <div className="flex gap-2 flex-wrap mb-4">
          {c.skills?.slice(0, 3).map((sk: any, idx: number) => (
            <span 
              key={idx} 
              className="px-2.5 py-1 rounded bg-[var(--surface-3)] text-primary-theme border border-[var(--border)] text-[9px] font-mono font-bold uppercase tracking-wider transition-colors group-hover:border-indigo-500/20"
            >
              {sk.name}
            </span>
          ))}
          {c.skills && c.skills.length > 3 && (
            <span className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-bold">
              +{c.skills.length - 3} MORE
            </span>
          )}
        </div>
      </div>

      {/* Footer information */}
      <div className="flex justify-between items-center text-[10px] text-muted-theme border-t border-[var(--border)] pt-4 mt-auto font-semibold">
        <span className="flex items-center gap-1">📍 {c.profile.location || 'Remote'}</span>
        <span className="flex items-center gap-1">💼 {c.profile.years_of_experience || 0} YoE</span>
      </div>
    </div>
  );
}
