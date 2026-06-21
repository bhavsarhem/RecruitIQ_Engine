import { 
  X, Briefcase, GraduationCap, Mail, Phone, 
  Linkedin, Cpu
} from 'lucide-react';
import type { RankedResult } from '../lib/scorer';

interface CandidateModalProps {
  candidate: RankedResult;
  onClose: () => void;
}

export default function CandidateModal({ candidate, onClose }: CandidateModalProps) {
  const c = candidate.candidate;
  const scorePct = Math.round(candidate.score * 100);
  const p = c.profile;
  const sig = c.redrob_signals || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark backdrop blur */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300"
      />

      {/* Modal Container */}
      <div className="glass-panel w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-indigo-500/20 bg-slate-950/90 shadow-2xl relative z-10 p-6 md:p-8 flex flex-col scrollbar-hide">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 border border-white/10 text-muted-theme hover:text-primary-theme hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Top Header Card */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-[var(--border)] pb-6 mb-6">
          <div className="flex gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white text-3xl shadow-lg shadow-indigo-500/20">
              👤
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl md:text-2xl font-display font-extrabold text-primary-theme">
                  {p.anonymized_name || 'Candidate Profile'}
                </h2>
                <span className="text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 py-0.5 px-2.5 rounded-full">
                  RANK #{candidate.rank}
                </span>
              </div>
              <p className="text-sm font-bold text-secondary-theme mt-1">
                {p.current_title} &bull; <span className="text-indigo-400 font-semibold">{p.current_company || 'Incognito Company'}</span>
              </p>
              <p className="text-xs text-muted-theme mt-0.5">📍 {p.location || 'Remote'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-[var(--surface-3)] border border-[var(--border)] py-3 px-6 rounded-2xl">
            <div>
              <p className="text-[10px] font-bold text-muted-theme uppercase tracking-wider">Fit Score</p>
              <p className="text-2xl font-mono font-black text-indigo-400">{scorePct}%</p>
            </div>
            <div className="w-[1px] h-8 bg-indigo-500/20" />
            <div>
              <p className="text-[10px] font-bold text-muted-theme uppercase tracking-wider">Experience</p>
              <p className="text-2xl font-mono font-black text-fuchsia-400">{p.years_of_experience || 0} Yrs</p>
            </div>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Columns: Signals & Contact & Verification (1/3) */}
          <div className="space-y-6 lg:border-r lg:border-[var(--border)] lg:pr-8">
            {/* Contact Verification */}
            <div>
              <h4 className="text-[10px] font-bold text-muted-theme uppercase tracking-wider mb-3">Verification Checks</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs glass-panel py-2.5 px-4">
                  <span className="flex items-center gap-2 text-secondary-theme"><Mail size={14} className="text-muted-theme" /> Email Address</span>
                  {sig.verified_email ? <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Verified</span> : <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Pending</span>}
                </div>
                <div className="flex items-center justify-between text-xs glass-panel py-2.5 px-4">
                  <span className="flex items-center gap-2 text-secondary-theme"><Phone size={14} className="text-muted-theme" /> Phone Number</span>
                  {sig.verified_phone ? <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Verified</span> : <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Pending</span>}
                </div>
                <div className="flex items-center justify-between text-xs glass-panel py-2.5 px-4">
                  <span className="flex items-center gap-2 text-secondary-theme"><Linkedin size={14} className="text-muted-theme" /> LinkedIn Profile</span>
                  {sig.linkedin_connected ? <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Connected</span> : <span className="text-[9px] font-bold text-muted-theme bg-white/5 px-2 py-0.5 rounded border border-white/5">Disconnected</span>}
                </div>
              </div>
            </div>

            {/* Behavioral Indices */}
            <div>
              <h4 className="text-[10px] font-bold text-muted-theme uppercase tracking-wider mb-3">Recruiter Signals</h4>
              <div className="space-y-3 bg-[var(--surface-2)] p-4 rounded-xl border border-[var(--border)]">
                <div>
                  <div className="flex justify-between text-xs mb-1 font-semibold">
                    <span className="text-muted-theme">Availability Notice</span>
                    <span className="text-primary-theme font-bold">{sig.notice_period_days ?? 90} Days</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.max(10, 100 - ((sig.notice_period_days ?? 90) / 180) * 100)}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-semibold">
                    <span className="text-muted-theme">Response Speed</span>
                    <span className="text-primary-theme font-bold">{sig.avg_response_time_hours ?? 24} Hours</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-fuchsia-500 h-1.5 rounded-full" style={{ width: `${Math.max(10, 100 - ((sig.avg_response_time_hours ?? 24) / 168) * 100)}%` }} />
                  </div>
                </div>

                <div className="flex justify-between text-xs border-t border-[var(--border)] pt-2 mt-2 font-semibold">
                  <span className="text-muted-theme">Response Rate</span>
                  <span className="text-emerald-400 font-mono">{((sig.recruiter_response_rate ?? 0.8) * 100).toFixed(0)}%</span>
                </div>
                
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-muted-theme">GitHub Commit Index</span>
                  <span className="text-indigo-400 font-mono">{sig.github_activity_score ?? 0}/100</span>
                </div>

                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-muted-theme">Profile Completeness</span>
                  <span className="text-fuchsia-400 font-mono">{sig.profile_completeness_score ?? 0}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Columns: AI reasoning & Career history (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* AI Reasoning Block */}
            <div className="border border-indigo-500/20 bg-indigo-500/5 p-5 rounded-2xl relative overflow-hidden">
              <div className="absolute top-4 right-4 text-indigo-400 opacity-20"><Cpu size={40} /></div>
              <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Cpu size={12} /> Neural Explainer Justification</h4>
              <blockquote className="text-sm font-medium text-secondary-theme italic leading-relaxed">
                "{candidate.reason || 'Candidate meets key profile features and possesses strong credentials.'}"
              </blockquote>
            </div>

            {/* Career history */}
            <div>
              <h4 className="text-[10px] font-bold text-muted-theme uppercase tracking-wider mb-3">Work History Chronology</h4>
              {c.career_history && c.career_history.length > 0 ? (
                <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-indigo-500/20">
                  {c.career_history.map((role, idx) => (
                    <div key={idx} className="flex gap-4 relative">
                      <div className="w-6 h-6 rounded-full bg-[var(--surface-3)] border border-indigo-500/30 flex items-center justify-center text-xs text-indigo-400 shrink-0 z-10">
                        <Briefcase size={10} />
                      </div>
                      <div className="glass-panel p-4 flex-1">
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <h5 className="text-xs font-bold text-primary-theme leading-none">{role.title}</h5>
                          <span className="text-[9px] font-mono font-bold bg-white/5 py-0.5 px-2 rounded border border-white/5 whitespace-nowrap">
                            {role.duration_months ?? 0} Mos
                          </span>
                        </div>
                        <p className="text-[10px] text-indigo-400 font-bold mb-2">{role.company} &bull; <span className="text-muted-theme font-medium">{role.industry || 'Technology'}</span></p>
                        {role.description && (
                          <p className="text-[10px] text-muted-theme leading-relaxed bg-black/20 p-2.5 rounded border border-white/5">{role.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass-panel p-4 text-center text-muted-theme text-xs">No career data available.</div>
              )}
            </div>

            {/* Education & Certs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-[10px] font-bold text-muted-theme uppercase tracking-wider mb-2">Education Credentials</h4>
                {c.education && c.education.length > 0 ? (
                  c.education.map((edu, idx) => (
                    <div key={idx} className="glass-panel p-4 border border-[var(--border)] flex gap-3">
                      <div className="text-indigo-400 shrink-0"><GraduationCap size={16} /></div>
                      <div>
                        <p className="text-xs font-bold text-primary-theme leading-tight">{edu.degree}</p>
                        <p className="text-[10px] text-muted-theme mt-1">{edu.field_of_study}</p>
                        <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider mt-1">{edu.school || 'Unknown Institution'} ({edu.tier?.replace('_', ' ') || 'Tier 4'})</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="glass-panel p-4 text-center text-muted-theme text-xs">No education details.</div>
                )}
              </div>

              <div>
                <h4 className="text-[10px] font-bold text-muted-theme uppercase tracking-wider mb-2">Technical Skill Matrix</h4>
                <div className="glass-panel p-4 border border-[var(--border)] space-y-3">
                  {c.skills && c.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {c.skills.map((sk, idx) => {
                        const isExp = sk.proficiency === 'expert';
                        const isAdv = sk.proficiency === 'advanced';
                        return (
                          <span 
                            key={idx} 
                            className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider font-mono
                              ${isExp 
                                ? 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/25' 
                                : isAdv 
                                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25' 
                                  : 'bg-white/5 text-muted-theme border-white/5'}`}
                          >
                            {sk.name} {sk.duration_months ? `(${Math.round(sk.duration_months / 12)}y)` : ''}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center text-muted-theme text-xs">No skills listed.</div>
                  )}
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
