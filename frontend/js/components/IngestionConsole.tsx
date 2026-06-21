import React, { useRef } from 'react';
import { Upload, FileCheck2, AlertTriangle, Terminal } from 'lucide-react';

interface IngestionConsoleProps {
  candidatesCount: number;
  isParsing: boolean;
  uploadError: string | null;
  onLoadSample: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function IngestionConsole({
  candidatesCount,
  isParsing,
  uploadError,
  onLoadSample,
  onFileUpload
}: IngestionConsoleProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Card: Target Profile Specifications */}
        <div className="glass-panel p-8 border border-[var(--border)] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-extrabold border border-indigo-500/20 font-mono">1</div>
              <div>
                <h2 className="text-lg font-display font-extrabold text-primary-theme">Job Target Parameters</h2>
                <p className="text-muted-theme text-xs font-semibold uppercase tracking-wider mt-0.5">Define neural scorer matching filters</p>
              </div>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-muted-theme uppercase tracking-wider mb-2 font-mono">Target Job Title</label>
                <input type="text" readOnly value="Senior AI / ML Engineer" className="w-full input-field opacity-70 cursor-not-allowed select-all" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-theme uppercase tracking-wider mb-2 font-mono">Target Match Cities</label>
                <input type="text" readOnly value="Bangalore · Pune · Noida · Hyderabad · Gurgaon" className="w-full input-field opacity-70 cursor-not-allowed select-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-theme uppercase tracking-wider mb-2 font-mono">Experience Range Lower</label>
                  <input type="text" readOnly value="5 Years" className="w-full input-field opacity-70 cursor-not-allowed text-center" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-theme uppercase tracking-wider mb-2 font-mono">Experience Range Upper</label>
                  <input type="text" readOnly value="9 Years" className="w-full input-field opacity-70 cursor-not-allowed text-center" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-theme uppercase tracking-wider mb-2 font-mono">Parsed Job Taxonomy Constraints</label>
                <textarea 
                  rows={4} 
                  readOnly 
                  className="w-full input-field resize-none opacity-70 cursor-not-allowed text-xs font-mono"
                  value="Requires Python, PyTorch, embeddings (FAISS, Sentence-Transformers), vector databases (Pinecone, Milvus, Qdrant), information retrieval, LightGBM/LTR, ranking metrics (NDCG, MRR, MAP), A/B testing, and MLOps. Preferred: Product company backgrounds."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: File Upload & Ingestion Tuners */}
        <div className="glass-panel p-8 border border-[var(--border)] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-extrabold border border-indigo-500/20 font-mono">2</div>
              <div>
                <h2 className="text-lg font-display font-extrabold text-primary-theme">Ingest & Run Pipeline</h2>
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
            </div>
          </div>

          <button 
            onClick={onLoadSample}
            disabled={isParsing}
            className="w-full mt-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:shadow-lg hover:shadow-indigo-500/20 disabled:opacity-50 text-white font-display font-black text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            ⚡ Ingest Sandbox Sandbox Dataset
          </button>
        </div>

      </div>
    </div>
  );
}
