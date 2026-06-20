'use client';

import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';
import { Upload, Search, ShieldAlert, Download, Activity, Users, Star, Code2, AlertTriangle } from 'lucide-react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function Home() {
  const [activeTab, setActiveTab] = useState(0);
  const mainRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!mainRef.current) return;
    
    // Parallax effect on the header
    gsap.to('.hero-title', {
      y: 50,
      opacity: 0,
      scrollTrigger: {
        trigger: '.hero-section',
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      }
    });

    // Animate tab content entry
    gsap.fromTo('.tab-content', 
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
    );
  }, [activeTab]);

  const tabs = [
    { name: 'SETUP & CONFIGURATION', icon: <Upload size={18} /> },
    { name: 'FIT SCORES DASHBOARD', icon: <Activity size={18} /> },
    { name: 'SECURITY & ANOMALIES', icon: <ShieldAlert size={18} /> },
    { name: 'EXPORT WORKSPACE', icon: <Download size={18} /> }
  ];

  return (
    <div ref={mainRef} className="min-h-screen flex flex-col pt-10 px-8 pb-24 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-fuchsia-600/20 blur-[120px]" />
      </div>

      <header className="hero-section flex items-center justify-between mb-12 glass-panel p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 text-2xl">
            🔍
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white hero-title">RecruitIQ Engine</h1>
            <p className="text-slate-400 text-sm font-medium">Enterprise Candidate Fit Intelligence & Neural Scoring</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-slate-900/50 px-4 py-2 rounded-full border border-slate-800">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-slate-300">Pipeline Active V2.0</span>
        </div>
      </header>

      {/* Custom Tabs */}
      <div className="flex space-x-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(idx)}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-300 whitespace-nowrap
              ${activeTab === idx 
                ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]' 
                : 'bg-slate-900/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
              }`}
          >
            {tab.icon}
            {tab.name}
          </button>
        ))}
      </div>

      <main className="tab-content flex-1">
        {activeTab === 0 && <SetupTab />}
        {activeTab === 1 && <DashboardTab />}
        {activeTab === 2 && <SecurityTab />}
        {activeTab === 3 && <ExportTab />}
      </main>
    </div>
  );
}

function SetupTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="glass-panel p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/30">1</div>
          <div>
            <h2 className="text-xl font-bold text-white">Job Specification Target</h2>
            <p className="text-slate-400 text-sm">Define candidate screening requirements</p>
          </div>
        </div>
        
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Target Job Title</label>
            <input type="text" defaultValue="Senior AI / ML Engineer" className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Target Match Locations</label>
            <input type="text" defaultValue="Bangalore · Pune · Noida · Hyderabad · Remote" className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Min Experience</label>
              <input type="number" defaultValue={5} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Max Experience</label>
              <input type="number" defaultValue={9} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Job Description Context</label>
            <textarea rows={6} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none" defaultValue={"We are hiring a Senior AI/ML Engineer. You will design and scale our candidate ranking and recommendation systems. Required: Python, PyTorch, embeddings, FAISS, vector databases, NLP, LLMs, RAG, fine-tuning, LightGBM, information retrieval, ranking evaluation (NDCG, MRR), A/B testing, MLOps. 5–9 years in product companies. Locations: Bangalore, Pune, Noida, Hyderabad."}></textarea>
          </div>
        </div>
      </div>

      <div className="glass-panel p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/30">2</div>
          <div>
            <h2 className="text-xl font-bold text-white">Candidate Pool & Scoring Tuners</h2>
            <p className="text-slate-400 text-sm">Manage uploaded profile records & adjust thresholds</p>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">⚙️ Threshold Scoring Rules</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-2"><span>Max Candidates Ranked</span><span>20</span></div>
              <input type="range" min="5" max="100" defaultValue="20" className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-2"><span>Min Fit Score Cut-Off</span><span>0.0</span></div>
              <input type="range" min="0" max="1" step="0.05" defaultValue="0" className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">📥 Populate Candidate Pool</h3>
          <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500/50 transition-colors rounded-xl p-8 text-center bg-slate-900/30 cursor-pointer flex flex-col items-center justify-center group">
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <Upload className="text-indigo-400" size={24} />
            </div>
            <p className="font-semibold text-white mb-1">Drag & drop candidate spreadsheet</p>
            <p className="text-sm text-slate-500">Supports JSON, CSV, or Excel formats</p>
          </div>
          
          <button className="w-full mt-4 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors flex items-center justify-center gap-2">
            ⚡ Load Built-in Sandbox Sample Dataset
          </button>
        </div>
      </div>
    </div>
  );
}

function DashboardTab() {
  return (
    <div className="space-y-8">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <Users size={24}/>, val: '100', label: 'Active Pool', sub: 'candidates evaluated', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
          { icon: <AlertTriangle size={24}/>, val: '12', label: 'Anomalies Detected', sub: '12.0% flagged as malicious', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
          { icon: <ShieldAlert size={24}/>, val: '88', label: 'Qualified Fits', sub: 'scored above 0.00 threshold', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          { icon: <Star size={24}/>, val: '0.942', label: 'Elite Fit Score', sub: 'maximum pipeline fit score', color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20' }
        ].map((kpi, i) => (
          <div key={i} className={`glass-panel p-6 flex flex-col justify-center border ${kpi.border} hover:scale-[1.02] transition-transform`}>
            <div className={`w-12 h-12 rounded-lg ${kpi.bg} ${kpi.color} flex items-center justify-center mb-4`}>
              {kpi.icon}
            </div>
            <div className="text-3xl font-bold text-white mb-1">{kpi.val}</div>
            <div className="text-sm font-semibold text-slate-300">{kpi.label}</div>
            <div className="text-xs text-slate-500">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Candidate List (Mocked visually) */}
      <div className="glass-panel p-8">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              Neural Fit Score Leaderboard
              <span className="bg-indigo-600/20 text-indigo-400 py-1 px-3 rounded-full text-sm font-bold border border-indigo-500/30">88</span>
            </h2>
            <p className="text-slate-400 text-sm mt-1">Targeting: Senior AI / ML Engineer · Processed in 12.4ms</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Mock Candidate 1 */}
          <div className="border border-slate-800 rounded-xl p-6 bg-slate-900/40 hover:bg-slate-800/60 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-black font-bold flex items-center justify-center text-xl">
                  #1
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    Alexander Volkov
                    <span className="text-xs py-0.5 px-2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">🔥 Elite Fit</span>
                  </h3>
                  <p className="text-sm text-slate-400">C004 · Principal Data Scientist · Meta</p>
                </div>
              </div>
              <div className="w-14 h-14 rounded-full border-[3px] border-emerald-500 flex items-center justify-center bg-emerald-500/10">
                <span className="text-emerald-400 font-bold">94%</span>
              </div>
            </div>
            
            <div className="flex gap-2 mb-4 flex-wrap">
              <span className="px-3 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs">Python</span>
              <span className="px-3 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs">PyTorch</span>
              <span className="px-3 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs">RAG</span>
              <span className="px-3 py-1 rounded bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 text-xs">🧠 8 AI skills</span>
            </div>

            <div className="p-4 bg-slate-900/80 rounded-lg border border-slate-800 text-sm text-slate-300 leading-relaxed">
              <span className="font-bold text-white mr-2">🧠 AI Fit Analysis:</span>
              "Exceptional match. Demonstrates mastery in PyTorch, LLMs, and RAG architectures at hyperscale. High response rate and immediately available."
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityTab() {
  return (
    <div className="glass-panel p-8 border-amber-500/30">
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-32 h-32 relative mb-8 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-amber-500/20 animate-[ping_3s_infinite]" />
          <div className="absolute inset-4 rounded-full border-2 border-amber-500/40" />
          <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center animate-pulse">
            <ShieldAlert className="text-amber-400" size={32} />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-amber-400 mb-2">ACTIVE ANOMALY RADAR SCANNING</h2>
        <p className="text-slate-400 max-w-lg mb-8">Ingestion feeds flagged anomalous data nodes. Integrity breaches filtered below.</p>
        
        <div className="w-full max-w-3xl text-left bg-slate-900/50 rounded-xl border border-slate-800 p-6">
          <h3 className="font-bold text-white mb-4">Malicious Pattern Warnings (12 flagged)</h3>
          <div className="text-sm text-slate-400">
            Detected keyword stuffing, impossibly overlapping timelines, and known honeypot artifacts. Profiles automatically sandboxed.
          </div>
        </div>
      </div>
    </div>
  );
}

function ExportTab() {
  return (
    <div className="glass-panel p-8">
      <h2 className="text-2xl font-bold text-white mb-6">Export Match Results</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-slate-900/40 hover:bg-slate-800/60 transition-colors cursor-pointer group">
          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Download className="text-blue-400" size={32} />
          </div>
          <h3 className="font-bold text-white text-lg mb-2">Download CSV Pipeline</h3>
          <p className="text-slate-400 text-sm">Raw structured data containing feature vectors, scores, and metadata.</p>
        </div>
        
        <div className="border border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-slate-900/40 hover:bg-slate-800/60 transition-colors cursor-pointer group">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Download className="text-emerald-400" size={32} />
          </div>
          <h3 className="font-bold text-white text-lg mb-2">Executive Excel Report</h3>
          <p className="text-slate-400 text-sm">Formatted executive summary with conditional formatting and radar charts.</p>
        </div>
      </div>
    </div>
  );
}
