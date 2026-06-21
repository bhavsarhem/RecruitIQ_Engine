import { Users, AlertTriangle, CheckCircle2, Star, Search, HelpCircle } from 'lucide-react';
import type { RankedResult } from '../lib/scorer';
import { AI_CORE_SKILLS_FOR_DISPLAY } from '../lib/scorer';
import CandidateCard from './CandidateCard';

interface DashboardProps {
  candidates: RankedResult[];
  totalCount: number;
  flaggedCount: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  minYoe: number;
  setMinYoe: (v: number) => void;
  minScore: number;
  setMinScore: (v: number) => void;
  selectedSkills: string[];
  toggleSkillFilter: (s: string) => void;
  onSelectCandidate: (c: RankedResult) => void;
}

export default function Dashboard({
  candidates,
  totalCount,
  flaggedCount,
  searchQuery,
  setSearchQuery,
  minYoe,
  setMinYoe,
  minScore,
  setMinScore,
  selectedSkills,
  toggleSkillFilter,
  onSelectCandidate
}: DashboardProps) {
  
  const maxScore = candidates.length > 0 ? Math.max(...candidates.map(c => c.score)) : 0.0;

  // SVG Chart calculation for match curve distribution
  const top10 = candidates.slice(0, 10);
  const chartPoints = top10.map((c, i) => ({
    x: 50 + (i * 65),
    y: 120 - (c.score * 85),
    score: c.score,
    name: c.candidate.profile.anonymized_name || 'Candidate'
  }));

  return (
    <div className="space-y-8">
      
      {/* KPI Stats Block */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <Users size={18}/>, val: totalCount.toLocaleString(), label: 'Active Ingest Pool', sub: 'validated profiles cleared', color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
          { icon: <AlertTriangle size={18}/>, val: flaggedCount.toLocaleString(), label: 'Threats Isolated', sub: `${totalCount + flaggedCount > 0 ? ((flaggedCount / (totalCount + flaggedCount)) * 100).toFixed(1) : 0}% flagged as honeypot`, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
          { icon: <CheckCircle2 size={18}/>, val: candidates.length.toLocaleString(), label: 'Matched Fit Nodes', sub: `above ${(minScore * 100).toFixed(0)}% score threshold`, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          { icon: <Star size={18}/>, val: (maxScore * 100).toFixed(0) + '%', label: 'Peak Scorer Match', sub: 'highest candidate compatibility', color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20' }
        ].map((kpi, i) => (
          <div key={i} className={`glass-panel p-6 flex flex-col border ${kpi.border} relative overflow-hidden group`}>
            <div className={`w-10 h-10 rounded-xl ${kpi.bg} ${kpi.color} flex items-center justify-center mb-4 border border-[var(--border)] transition-transform duration-300 group-hover:-translate-y-1`}>
              {kpi.icon}
            </div>
            <div className="text-3xl font-display font-black text-primary-theme mb-1 tracking-tight">{kpi.val}</div>
            <div className="text-[10px] font-display font-extrabold text-secondary-theme uppercase tracking-wider">{kpi.label}</div>
            <div className="text-[10px] text-muted-theme mt-1 font-medium">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Match Distribution Distribution Chart */}
      {candidates.length > 1 && (
        <div className="glass-panel p-6 border border-[var(--border)]">
          <h3 className="text-[10px] font-display font-extrabold text-primary-theme uppercase tracking-widest mb-4">📈 Neural Match Distribution Curve (Top 10)</h3>
          <div className="w-full overflow-x-auto pb-2 scrollbar-hide">
            <svg className="w-full min-w-[700px] h-[150px]" viewBox="0 0 700 150">
              <defs>
                <linearGradient id="gradient-line" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#d946ef" />
                </linearGradient>
                <linearGradient id="gradient-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              
              {/* Grid Lines */}
              <line x1="40" y1="15" x2="680" y2="15" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
              <line x1="40" y1="65" x2="680" y2="65" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
              <line x1="40" y1="115" x2="680" y2="115" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" />

              {/* Curve Fill */}
              {chartPoints.length > 1 && (
                <>
                  <path
                    d={`M ${chartPoints[0].x} 115 ${chartPoints.map(p => `L ${p.x} ${p.y}`).join(' ')} L ${chartPoints[chartPoints.length - 1].x} 115 Z`}
                    fill="url(#gradient-fill)"
                  />
                  <path
                    d={`M ${chartPoints[0].x} ${chartPoints[0].y} ${chartPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')}`}
                    fill="none"
                    stroke="url(#gradient-line)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </>
              )}

              {/* Intersect Points */}
              {chartPoints.map((p, i) => (
                <g key={i} className="group cursor-pointer">
                  <circle cx={p.x} cy={p.y} r="5" fill="#ffffff" stroke="#d946ef" strokeWidth="2.5" />
                  <circle cx={p.x} cy={p.y} r="10" fill="transparent" className="hover:fill-fuchsia-500/10 transition-colors" />
                  <text x={p.x} y={p.y - 14} textAnchor="middle" fill="var(--text-primary)" fontSize="9" fontWeight="800" fontFamily="monospace">
                    {(p.score * 100).toFixed(0)}%
                  </text>
                  <text x={p.x} y="132" textAnchor="middle" fill="var(--text-muted)" fontSize="8" fontWeight="600" fontFamily="monospace">
                    #{i + 1}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      )}

      {/* Filters & Leaderboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* Sidebar Controls */}
        <div className="glass-panel p-6 space-y-6 lg:sticky lg:top-8 border border-[var(--border)]">
          <h3 className="text-[10px] font-display font-extrabold text-primary-theme uppercase tracking-wider border-b border-[var(--border)] pb-3">🎛️ Scorer Controllers</h3>
          
          {/* Keyword Search */}
          <div>
            <label className="block text-[10px] font-mono font-bold text-muted-theme uppercase tracking-wider mb-2">Search Candidate</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Name, role, company..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full input-field pl-10" 
              />
              <Search className="absolute left-3.5 top-3.5 text-muted-theme" size={14} />
            </div>
          </div>

          {/* YoE Threshold */}
          <div>
            <div className="flex justify-between text-xs text-muted-theme mb-2 font-semibold font-mono">
              <span>Experience limit</span>
              <span className="text-indigo-400 font-bold">{minYoe}+ yrs</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="15" 
              value={minYoe}
              onChange={(e) => setMinYoe(Number(e.target.value))}
              className="w-full accent-indigo-500 h-1 bg-[var(--surface-3)] rounded-lg appearance-none cursor-pointer" 
            />
          </div>

          {/* Fit score threshold */}
          <div>
            <div className="flex justify-between text-xs text-muted-theme mb-2 font-semibold font-mono">
              <span>Min Fit Score</span>
              <span className="text-indigo-400 font-bold">{(minScore * 100).toFixed(0)}%</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05"
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-full accent-indigo-500 h-1 bg-[var(--surface-3)] rounded-lg appearance-none cursor-pointer" 
            />
          </div>

          {/* Skill Keywords */}
          <div>
            <label className="block text-[10px] font-mono font-bold text-muted-theme uppercase tracking-wider mb-3">Require Skillset</label>
            <div className="flex flex-wrap gap-1.5">
              {AI_CORE_SKILLS_FOR_DISPLAY.slice(0, 15).map((skill, i) => {
                const isSelected = selectedSkills.includes(skill);
                return (
                  <button
                    key={i}
                    onClick={() => toggleSkillFilter(skill)}
                    className={`text-[9px] px-2.5 py-1.5 rounded-lg border font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer
                      ${isSelected
                        ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/40 font-black'
                        : 'border-[var(--border)] text-muted-theme hover:border-slate-500 hover:text-primary-theme'
                      }`}
                  >
                    {skill}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Candidate Leaderboard List */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
            <h2 className="text-lg font-display font-extrabold text-primary-theme flex items-center gap-3">
              Score Board Leaderboard
              <span className="bg-indigo-500/10 text-indigo-400 py-0.5 px-3 rounded-full text-xs font-mono font-bold border border-indigo-500/25">
                {candidates.length}
              </span>
            </h2>
            <span className="text-[10px] text-muted-theme font-bold uppercase tracking-wider">Filtered nodes</span>
          </div>

          {candidates.length === 0 ? (
            <div className="glass-panel p-16 text-center text-muted-theme border border-[var(--border)]">
              <HelpCircle className="mx-auto mb-4 text-muted-theme opacity-30" size={44} />
              <h4 className="font-display font-extrabold text-sm text-primary-theme mb-1">No matching profiles isolated</h4>
              <p className="text-xs">Adjust sliders or reset skill filter buttons.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {candidates.map((r, i) => (
                <CandidateCard 
                  key={r.candidate.candidate_id} 
                  result={r} 
                  rank={i + 1} 
                  onSelect={onSelectCandidate}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
