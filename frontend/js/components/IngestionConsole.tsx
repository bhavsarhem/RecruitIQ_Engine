import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Upload, FileCheck2, AlertTriangle, Terminal, Plus, X, RefreshCw, Zap, MapPin, Briefcase, Clock } from 'lucide-react';
import type { JobConfig } from '../lib/scorer';
import { extractSkills } from '../lib/scorer';

interface IngestionConsoleProps {
  candidatesCount: number;
  isParsing: boolean;
  uploadError: string | null;
  onLoadSample: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  jobConfig: JobConfig;
  onJobConfigChange: (cfg: JobConfig) => void;
  onRerank: () => void;
}

// ── tiny chip input (shared for cities & skills) ──────────────────────────
function ChipInput({
  chips,
  placeholder,
  onAdd,
  onRemove,
  colorClass = 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30',
}: {
  chips: string[];
  placeholder: string;
  onAdd: (val: string) => void;
  onRemove: (val: string) => void;
  colorClass?: string;
}) {
  const [draft, setDraft] = useState('');

  const commit = useCallback(() => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    // allow comma-separated
    trimmed.split(',').forEach(t => {
      const v = t.trim();
      if (v && !chips.map(c => c.toLowerCase()).includes(v.toLowerCase())) {
        onAdd(v);
      }
    });
    setDraft('');
  }, [draft, chips, onAdd]);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && draft === '' && chips.length > 0) {
      onRemove(chips[chips.length - 1]);
    }
  };

  return (
    <div className="w-full min-h-[48px] flex flex-wrap gap-1.5 p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] focus-within:border-indigo-500/50 transition-colors cursor-text"
      onClick={() => (document.activeElement as HTMLElement)?.blur?.()}>
      {chips.map((chip, i) => (
        <span key={i} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${colorClass}`}>
          {chip}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(chip); }}
            className="opacity-60 hover:opacity-100 transition-opacity cursor-pointer ml-0.5"
          >
            <X size={9} />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={handleKey}
        onBlur={commit}
        placeholder={chips.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[80px] bg-transparent outline-none text-xs text-primary-theme placeholder:text-muted-theme/50 font-medium"
      />
    </div>
  );
}

// ── number stepper ─────────────────────────────────────────────────────────
function NumberStepper({
  label, value, onChange, min = 0, max = 30,
}: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-muted-theme uppercase tracking-wider mb-2 font-mono">
        {label}
      </label>
      <div className="flex items-center gap-0 rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--surface-2)]">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="px-3 py-3 text-muted-theme hover:text-primary-theme hover:bg-white/5 transition-colors text-sm font-bold cursor-pointer"
        >−</button>
        <span className="flex-1 text-center text-sm font-display font-black text-primary-theme tabular-nums">
          {value} <span className="text-[10px] font-mono text-muted-theme">yrs</span>
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="px-3 py-3 text-muted-theme hover:text-primary-theme hover:bg-white/5 transition-colors text-sm font-bold cursor-pointer"
        >+</button>
      </div>
    </div>
  );
}

// ── main component ──────────────────────────────────────────────────────────
export default function IngestionConsole({
  candidatesCount,
  isParsing,
  uploadError,
  onLoadSample,
  onFileUpload,
  jobConfig,
  onJobConfigChange,
  onRerank,
}: IngestionConsoleProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [taxonomyDraft, setTaxonomyDraft] = useState(jobConfig.taxonomyText);
  const [applyFlash, setApplyFlash] = useState(false);

  // Keep local taxonomy textarea in sync with external config (e.g. on reset)
  useEffect(() => {
    setTaxonomyDraft(jobConfig.taxonomyText);
  }, [jobConfig.taxonomyText]);

  // Helper to patch a field and mark dirty
  const patch = useCallback(<K extends keyof JobConfig>(key: K, value: JobConfig[K]) => {
    onJobConfigChange({ ...jobConfig, [key]: value });
    setIsDirty(true);
  }, [jobConfig, onJobConfigChange]);

  const addCity = (v: string) => patch('cities', [...jobConfig.cities, v.toLowerCase().trim()]);
  const removeCity = (v: string) => patch('cities', jobConfig.cities.filter(c => c !== v));

  const addSkill = (v: string) => patch('requiredSkills', [...jobConfig.requiredSkills, v.toLowerCase().trim()]);
  const removeSkill = (v: string) => patch('requiredSkills', jobConfig.requiredSkills.filter(s => s !== v));

  // Auto-extract skills from taxonomy text on blur
  const handleTaxonomyBlur = () => {
    const extracted = extractSkills(taxonomyDraft);
    const merged = Array.from(new Set([...jobConfig.requiredSkills, ...extracted]));
    onJobConfigChange({ ...jobConfig, taxonomyText: taxonomyDraft, requiredSkills: merged });
    setIsDirty(true);
  };

  const handleApply = () => {
    onRerank();
    setIsDirty(false);
    setApplyFlash(true);
    setTimeout(() => setApplyFlash(false), 1200);
  };

  const skillCount = jobConfig.requiredSkills.length;
  const cityCount = jobConfig.cities.length;

  return (
    <div className="space-y-6">

      {/* Pipeline Status Banner */}
      <div className={`glass-panel p-4 flex items-center justify-between border transition-all duration-300
        ${candidatesCount > 0
          ? 'border-emerald-500/20 bg-emerald-500/5'
          : 'border-amber-500/20 bg-amber-500/5'}`}>
        <div className="flex items-center gap-3">
          <FileCheck2 className={candidatesCount > 0 ? 'text-emerald-400' : 'text-amber-400'} size={20} />
          <span className="text-xs font-mono font-bold text-secondary-theme">
            {candidatesCount > 0
              ? `[READY] PIPELINE FEED ACTIVE: ${candidatesCount.toLocaleString()} candidates loaded in client-side storage.`
              : '[AWAITING] FEED INACTIVE: Ingest candidate profiles in JSON, JSONL, or CSV spreadsheet formats to initialize ranker.'}
          </span>
        </div>

        {/* Live config pill */}
        <div className="hidden sm:flex items-center gap-3 shrink-0 ml-4">
          <span className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">
            <MapPin size={9} /> {cityCount} cities
          </span>
          <span className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-fuchsia-400 bg-fuchsia-500/10 border border-fuchsia-500/20 px-2.5 py-1 rounded-full">
            <Zap size={9} /> {skillCount} skills
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* ── Left Card: Dynamic Job Target Parameters ── */}
        <div className="glass-panel p-8 border border-[var(--border)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-extrabold border border-indigo-500/20 font-mono">1</div>
                <div>
                  <h2 className="text-lg font-display font-extrabold text-primary-theme">Job Target Parameters</h2>
                  <p className="text-muted-theme text-xs font-semibold uppercase tracking-wider mt-0.5">Define neural scorer matching filters</p>
                </div>
              </div>
              {isDirty && (
                <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full animate-pulse shrink-0">
                  unsaved changes
                </span>
              )}
            </div>

            <div className="space-y-5">

              {/* Job Title */}
              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-bold text-muted-theme uppercase tracking-wider mb-2 font-mono">
                  <Briefcase size={10} /> Target Job Title
                </label>
                <input
                  type="text"
                  value={jobConfig.jobTitle}
                  onChange={e => patch('jobTitle', e.target.value)}
                  placeholder="e.g. Senior ML Engineer"
                  className="w-full input-field"
                />
              </div>

              {/* Target Cities */}
              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-bold text-muted-theme uppercase tracking-wider mb-2 font-mono">
                  <MapPin size={10} /> Target Match Cities
                  <span className="text-indigo-400 font-bold">({cityCount})</span>
                  <span className="text-muted-theme/50 font-normal normal-case ml-1">— type + Enter or comma</span>
                </label>
                <ChipInput
                  chips={jobConfig.cities}
                  placeholder="Add city (e.g. Bangalore)…"
                  onAdd={addCity}
                  onRemove={removeCity}
                  colorClass="bg-emerald-600/15 text-emerald-300 border-emerald-500/25"
                />
              </div>

              {/* YoE Range */}
              <div className="grid grid-cols-2 gap-4">
                <NumberStepper
                  label="Experience Range Lower"
                  value={jobConfig.yoeMin}
                  onChange={v => patch('yoeMin', Math.min(v, jobConfig.yoeMax))}
                />
                <NumberStepper
                  label="Experience Range Upper"
                  value={jobConfig.yoeMax}
                  onChange={v => patch('yoeMax', Math.max(v, jobConfig.yoeMin))}
                />
              </div>

              {/* Taxonomy textarea + skill chips */}
              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-bold text-muted-theme uppercase tracking-wider mb-2 font-mono">
                  <Clock size={10} /> Job Description / Taxonomy
                  <span className="text-muted-theme/50 font-normal normal-case ml-1">— blur to extract skills</span>
                </label>
                <textarea
                  rows={3}
                  value={taxonomyDraft}
                  onChange={e => setTaxonomyDraft(e.target.value)}
                  onBlur={handleTaxonomyBlur}
                  className="w-full input-field resize-none text-xs font-mono"
                  placeholder="Paste job description… skills are auto-extracted on blur."
                />
              </div>

              {/* Required Skills Chips */}
              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-bold text-muted-theme uppercase tracking-wider mb-2 font-mono">
                  <Zap size={10} /> Required Skills
                  <span className="text-fuchsia-400 font-bold ml-1">({skillCount})</span>
                  <span className="text-muted-theme/50 font-normal normal-case ml-1">— type + Enter or comma</span>
                </label>
                <ChipInput
                  chips={jobConfig.requiredSkills}
                  placeholder="Add skill (e.g. faiss)…"
                  onAdd={addSkill}
                  onRemove={removeSkill}
                  colorClass="bg-fuchsia-600/15 text-fuchsia-300 border-fuchsia-500/25"
                />
              </div>
            </div>
          </div>

          {/* Apply & Rerank */}
          <button
            onClick={handleApply}
            disabled={candidatesCount === 0}
            className={`w-full mt-8 py-4 rounded-xl font-display font-black text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed
              ${applyFlash
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                : isDirty
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:shadow-lg hover:shadow-amber-500/20 text-white'
                  : 'bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:shadow-lg hover:shadow-indigo-500/20 text-white'
              }`}
          >
            {applyFlash
              ? <><RefreshCw size={14} className="animate-spin" /> Reranking…</>
              : isDirty
                ? <><Zap size={14} /> Apply & Rerank</>
                : <><RefreshCw size={14} /> Rerank with Current Config</>
            }
          </button>
        </div>

        {/* ── Right Card: File Upload & Ingestion ── */}
        <div className="glass-panel p-8 border border-[var(--border)] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-extrabold border border-indigo-500/20 font-mono">2</div>
              <div>
                <h2 className="text-lg font-display font-extrabold text-primary-theme">Ingest &amp; Run Pipeline</h2>
                <p className="text-muted-theme text-xs font-semibold uppercase tracking-wider mt-0.5">Upload candidates metadata spreadsheet</p>
              </div>
            </div>

            {uploadError && (
              <div className="p-4 mb-6 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-400 font-bold flex items-center gap-2">
                <AlertTriangle size={16} /> {uploadError}
              </div>
            )}

            <div className="space-y-6">
              <input
                type="file"
                ref={fileInputRef}
                onChange={onFileUpload}
                accept=".json,.jsonl,.csv"
                className="hidden"
              />

              <div
                onClick={() => !isParsing && fileInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--border)] hover:border-indigo-500/40 hover:bg-indigo-500/[0.01] transition-all rounded-2xl p-10 text-center cursor-pointer flex flex-col items-center justify-center group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-grid-pattern opacity-10" />
                <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300 border border-indigo-500/20">
                  {isParsing ? (
                    <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload className="text-indigo-400 group-hover:translate-y-[-2px] transition-transform" size={24} />
                  )}
                </div>

                <h3 className="font-display font-extrabold text-primary-theme text-sm mb-1">
                  {isParsing ? 'Streaming candidate dataset...' : 'Upload Ingestion Sheet'}
                </h3>
                <p className="text-xs text-muted-theme font-medium">Supports JSON, JSON Lines, or CSV spreadsheets</p>
              </div>

              <div className="flex items-center gap-3 text-xs bg-slate-900/30 p-4 rounded-xl border border-[var(--border)] font-mono">
                <Terminal className="text-indigo-400" size={16} />
                <span className="text-muted-theme">Verification: Auto-audits for fake/honeypot profiles upon ingestion.</span>
              </div>

              {/* Active config summary */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-3)] p-4 space-y-2">
                <p className="text-[9px] font-mono font-bold text-muted-theme uppercase tracking-widest mb-3">Active Scoring Config</p>
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <Briefcase size={10} className="text-indigo-400 shrink-0" />
                  <span className="text-muted-theme">Role:</span>
                  <span className="text-primary-theme font-bold truncate">{jobConfig.jobTitle || '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <MapPin size={10} className="text-emerald-400 shrink-0" />
                  <span className="text-muted-theme">YoE:</span>
                  <span className="text-primary-theme font-bold">{jobConfig.yoeMin}–{jobConfig.yoeMax} yrs</span>
                </div>
                <div className="flex items-start gap-2 text-[10px] font-mono">
                  <Zap size={10} className="text-fuchsia-400 mt-0.5 shrink-0" />
                  <span className="text-muted-theme shrink-0">Skills:</span>
                  <span className="text-fuchsia-300 font-bold line-clamp-2">
                    {jobConfig.requiredSkills.slice(0, 6).join(', ')}{jobConfig.requiredSkills.length > 6 ? ` +${jobConfig.requiredSkills.length - 6} more` : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={onLoadSample}
            disabled={isParsing}
            className="w-full mt-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:shadow-lg hover:shadow-indigo-500/20 disabled:opacity-50 text-white font-display font-black text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <Plus size={14} /> Ingest Sandbox Dataset
          </button>
        </div>

      </div>
    </div>
  );
}
