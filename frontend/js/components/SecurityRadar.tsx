import { ShieldCheck, ShieldAlert, AlertOctagon } from 'lucide-react';
import type { RankedResult } from '../lib/scorer';

interface SecurityRadarProps {
  flaggedCandidates: RankedResult[];
}

export default function SecurityRadar({ flaggedCandidates }: SecurityRadarProps) {
  const hasThreats = flaggedCandidates.length > 0;

  return (
    <div className="space-y-6">
      
      {/* Radar Console Sweeper */}
      <div className={`radar-section-container p-8 ${hasThreats ? 'border-red-500/20 bg-red-500/[0.02]' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
        <div className={`radar-container ${hasThreats ? 'border-red-500/35' : 'border-emerald-500/35'}`}>
          <div 
            className="radar-sweep" 
            style={{
              background: hasThreats 
                ? 'conic-gradient(from 0deg, rgba(239, 68, 68, 0.22) 0deg, rgba(239, 68, 68, 0.03) 90deg, transparent 180deg)'
                : 'conic-gradient(from 0deg, rgba(16, 185, 129, 0.22) 0deg, rgba(16, 185, 129, 0.03) 90deg, transparent 180deg)'
            }}
          />
          <div 
            className="radar-crosshair-h" 
            style={{ background: hasThreats ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)' }} 
          />
          <div 
            className="radar-crosshair-v" 
            style={{ background: hasThreats ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)' }} 
          />
        </div>

        {hasThreats ? (
          <div className="text-center space-y-2 mt-4">
            <h2 className="text-xl font-display font-extrabold text-red-400 uppercase tracking-widest flex items-center justify-center gap-2">
              <ShieldAlert size={20} className="animate-pulse" /> THREAT DETECTOR SCANNING [ALERT]
            </h2>
            <p className="text-muted-theme text-xs max-w-md mx-auto font-medium">
              Ingestion sweep isolated {flaggedCandidates.length} suspicious profiles matching keyword stuffing or chronologic anomaly vectors.
            </p>
          </div>
        ) : (
          <div className="text-center space-y-2 mt-4">
            <h2 className="text-xl font-display font-extrabold text-emerald-400 uppercase tracking-widest flex items-center justify-center gap-2">
              <ShieldCheck size={20} /> SWEED SECURE [NO ALERTS]
            </h2>
            <p className="text-muted-theme text-xs max-w-md mx-auto font-medium">
              Candidate database checks completed successfully. 0 fraud indicators detected. Pool is clean.
            </p>
          </div>
        )}
      </div>

      {/* Threats Isolated list */}
      {hasThreats && (
        <div className="glass-panel p-8 border border-[var(--border)]">
          <h3 className="text-xs font-display font-extrabold text-primary-theme uppercase tracking-wider mb-6 flex items-center gap-2">
            🚨 Quarantined Profiles ({flaggedCandidates.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {flaggedCandidates.map((r) => {
              const c = r.candidate;
              return (
                <div 
                  key={c.candidate_id} 
                  className="border border-red-500/25 bg-red-500/[0.02] rounded-xl p-5 flex flex-col justify-between hover:border-red-500/40 hover:bg-red-500/[0.04] transition-all"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-display font-extrabold text-primary-theme text-sm leading-tight">
                        {c.profile.anonymized_name || 'Quarantined Profile'}
                      </h4>
                      <span className="text-[9px] font-mono font-bold bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/20">
                        {c.candidate_id}
                      </span>
                    </div>
                    <p className="text-xs text-secondary-theme font-semibold">{c.profile.current_title || 'Unknown Title'}</p>
                    <p className="text-[10px] text-muted-theme mt-0.5 mb-4">{c.profile.current_company || 'Unknown Company'}</p>
                  </div>
                  
                  <div className="space-y-1.5 border-t border-red-500/10 pt-3">
                    <span className="text-[9px] font-mono font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
                      <AlertOctagon size={10} /> Quarantined Reasons:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {r.honeypotReasons.map((flag, idx) => (
                        <span key={idx} className="text-[9px] font-mono font-bold bg-red-500/10 text-red-300 border border-red-500/15 py-0.5 px-2 rounded">
                          {flag.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
