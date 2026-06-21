import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Upload, Activity, ShieldAlert, Download, Sun, Moon, Sparkles } from 'lucide-react';
import { runRankingPipeline } from './lib/scorer';
import type { Candidate, RankedResult } from './lib/scorer';
import Hero3D from './components/Hero3D';
import LenisProvider from './components/LenisProvider';
import IngestionConsole from './components/IngestionConsole';
import Dashboard from './components/Dashboard';
import SecurityRadar from './components/SecurityRadar';
import ExportDesk from './components/ExportDesk';
import CandidateModal from './components/CandidateModal';
import CustomCursor from './components/CustomCursor';
import Papa from 'papaparse';

export default function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [theme, setTheme] = useState('dark');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [rankedResults, setRankedResults] = useState<RankedResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [minYoe, setMinYoe] = useState(5);
  const [minScore, setMinScore] = useState(0.0);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<RankedResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const mainRef = useRef<HTMLDivElement>(null);

  // Initialize and read theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const handleThemeToggle = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  // Run initial mock database loading
  useEffect(() => {
    loadSampleDataset();
  }, []);

  const loadSampleDataset = async () => {
    try {
      setIsParsing(true);
      const res = await fetch('/sample_candidates.json');
      const data = await res.json();
      if (Array.isArray(data)) {
        setCandidates(data);
        const pipelineRes = runRankingPipeline(data, 100);
        setRankedResults(pipelineRes.ranked.concat(pipelineRes.honeypots));
      }
      setIsParsing(false);
    } catch (err) {
      console.error("Failed to load sample candidates:", err);
      setIsParsing(false);
    }
  };

  useEffect(() => {
    if (!mainRef.current) return;
    
    // Content entry transition animation
    gsap.fromTo('.tab-content-panel',
      { opacity: 0, scale: 0.99, y: 10 },
      { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: 'power2.out' }
    );
  }, [activeTab]);

  // File parsing logic
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsParsing(true);
    setUploadError(null);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        let parsedData: Candidate[] = [];

        // Check if it is JSON array
        if (text.trim().startsWith('[')) {
          parsedData = JSON.parse(text);
        } else if (text.trim().startsWith('{')) {
          // Check if JSON Lines (JSONL)
          const lines = text.split('\n');
          parsedData = lines
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => JSON.parse(line));
        } else {
          // Assume CSV, parse with PapaParse
          const parseResult = Papa.parse(text, { header: true, skipEmptyLines: true });
          // Convert flat CSV rows to nested Candidate structures
          parsedData = parseResult.data.map((row: any, idx) => {
            const skillsArray = row.skills 
              ? row.skills.split(',').map((s: string) => ({ name: s.trim(), proficiency: 'expert' }))
              : [];
            return {
              candidate_id: row.candidate_id || `CAND_${idx + 1}`,
              profile: {
                anonymized_name: row.name || row.anonymized_name || `Candidate ${idx + 1}`,
                current_title: row.current_title || row.title || 'Software Engineer',
                current_company: row.current_company || row.company || 'Tech Corp',
                location: row.location || 'Remote',
                years_of_experience: Number(row.years_of_experience || row.yoe || 0),
              },
              skills: skillsArray,
              career_history: [],
              education: [],
              redrob_signals: {
                notice_period_days: Number(row.notice || 30),
                open_to_work_flag: row.open_to_work === 'true',
                recruiter_response_rate: Number(row.response_rate || 0.8),
              }
            };
          });
        }

        if (Array.isArray(parsedData) && parsedData.length > 0) {
          setCandidates(parsedData);
          const pipelineRes = runRankingPipeline(parsedData, 100);
          setRankedResults(pipelineRes.ranked.concat(pipelineRes.honeypots));
          setActiveTab(1); // Jump to dashboard
        } else {
          setUploadError("Could not detect any valid candidates in the file.");
        }
      } catch (err: any) {
        setUploadError(`Failed to parse file: ${err.message}`);
      } finally {
        setIsParsing(false);
      }
    };

    reader.readAsText(file);
  };

  const tabs = [
    { name: 'Ingestion Control', icon: <Upload size={14} /> },
    { name: 'Leaderboard FIT', icon: <Activity size={14} /> },
    { name: 'Threat Radar', icon: <ShieldAlert size={14} /> },
    { name: 'Export Console', icon: <Download size={14} /> }
  ];

  const cleanCandidates = rankedResults.filter(r => !r.isHoneypot);
  const flaggedCandidates = rankedResults.filter(r => r.isHoneypot);

  // Filters logic
  const filteredCandidates = cleanCandidates.filter(r => {
    const c = r.candidate;
    const name = c.profile.anonymized_name || 'Candidate';
    const title = c.profile.current_title || '';
    const company = c.profile.current_company || '';
    
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          company.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesYoe = (c.profile.years_of_experience || 0) >= minYoe;
    const matchesScore = r.score >= minScore;
    
    const candidateSkills = c.skills?.map(s => s.name.toLowerCase()) || [];
    const matchesSkills = selectedSkills.length === 0 || 
                          selectedSkills.every(s => candidateSkills.includes(s.toLowerCase()));
    
    return matchesSearch && matchesYoe && matchesScore && matchesSkills;
  });

  const toggleSkillFilter = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  return (
    <LenisProvider>
      {/* Custom trailing animated cursor */}
      <CustomCursor />
      
      <div ref={mainRef} className="min-h-screen flex flex-col pt-8 px-4 md:px-8 pb-16 relative overflow-hidden transition-colors duration-500">
        
        {/* Particle Canvas */}
        <Hero3D />

        {/* Floating background gradient light orb */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-500/5 blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-fuchsia-500/5 blur-3xl -z-10 pointer-events-none" />

        {/* Global interactive header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 glass-panel p-6 border border-[var(--border)] relative overflow-hidden bg-slate-950/40">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white text-2xl shadow-lg shadow-indigo-500/10">
              🤖
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-display font-black tracking-tight text-primary-theme flex items-center gap-2 leading-none">
                RecruitIQ <span className="text-indigo-400">Engine</span>
                <span className="text-[9px] font-mono font-bold uppercase py-0.5 px-2 bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20">V1.0.0</span>
              </h1>
              <p className="text-muted-theme text-[9px] font-mono font-bold uppercase tracking-widest mt-1">Enterprise Anomaly Filter & Candidate Evaluator</p>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <div className="hidden sm:flex items-center gap-2 bg-[var(--surface-3)] border border-[var(--border)] px-4 py-2 rounded-xl">
              <span className={`w-2 h-2 rounded-full ${candidates.length > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-[10px] font-mono font-bold text-secondary-theme">
                {candidates.length > 0 ? `${candidates.length.toLocaleString()} INGESTED` : 'FEED EMPTY'}
              </span>
            </div>

            <button 
              onClick={handleThemeToggle}
              className="w-10 h-10 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-primary-theme flex items-center justify-center transition-all duration-300 active:scale-95 cursor-pointer shadow-sm hover:border-indigo-500/40"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-indigo-600" />}
            </button>
          </div>
        </header>

        {/* Tab controller navigation */}
        <div className="flex space-x-1.5 mb-8 overflow-x-auto pb-2 scrollbar-hide bg-[var(--surface)] p-1.5 rounded-2xl border border-[var(--border)] max-w-full w-fit">
          {tabs.map((tab, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all duration-300 whitespace-nowrap cursor-pointer
                ${activeTab === idx 
                  ? 'bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white shadow-lg shadow-indigo-500/20' 
                  : 'text-muted-theme hover:text-primary-theme hover:bg-white/5 border border-transparent'
                }`}
            >
              {tab.icon}
              {tab.name}
            </button>
          ))}
        </div>

        {/* Master Panel Switcher */}
        <main className="tab-content-panel flex-1">
          {activeTab === 0 && (
            <IngestionConsole 
              candidatesCount={candidates.length} 
              isParsing={isParsing} 
              uploadError={uploadError}
              onLoadSample={loadSampleDataset}
              onFileUpload={handleFileUpload}
            />
          )}
          
          {activeTab === 1 && (
            <Dashboard 
              candidates={filteredCandidates} 
              totalCount={cleanCandidates.length}
              flaggedCount={flaggedCandidates.length}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              minYoe={minYoe}
              setMinYoe={setMinYoe}
              minScore={minScore}
              setMinScore={setMinScore}
              selectedSkills={selectedSkills}
              toggleSkillFilter={toggleSkillFilter}
              onSelectCandidate={setSelectedCandidate}
            />
          )}

          {activeTab === 2 && (
            <SecurityRadar flaggedCandidates={flaggedCandidates} />
          )}
          
          {activeTab === 3 && (
            <ExportDesk candidates={cleanCandidates} />
          )}
        </main>

        {/* Detail Info Overlays Overlay */}
        {selectedCandidate && (
          <CandidateModal 
            candidate={selectedCandidate} 
            onClose={() => setSelectedCandidate(null)} 
          />
        )}

        {/* Footer */}
        <footer className="text-center pt-16 text-[10px] font-mono font-bold text-muted-theme border-t border-[var(--border)] mt-20 flex items-center justify-center gap-1.5 uppercase tracking-wider">
          <Sparkles size={12} className="text-indigo-400" /> RecruitIQ Engine &bull; Redrob India Hackathon Presentation Portal
        </footer>
      </div>
    </LenisProvider>
  );
}
