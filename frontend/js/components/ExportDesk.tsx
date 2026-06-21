import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import type { RankedResult } from '../lib/scorer';
import Papa from 'papaparse';

interface ExportDeskProps {
  candidates: RankedResult[];
}

export default function ExportDesk({ candidates }: ExportDeskProps) {
  
  const handleDownloadCSV = () => {
    if (candidates.length === 0) return;
    
    // Structure rows for hackathon validator
    const csvRows = candidates.map(r => ({
      candidate_id: r.candidate.candidate_id,
      rank: r.rank,
      score: r.score.toFixed(4),
      reasoning: r.reason || ''
    }));

    const csvContent = Papa.unparse(csvRows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "submission.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadExcel = async () => {
    if (candidates.length === 0) return;
    
    try {
      const XLSX = await import('xlsx');
      const excelRows = candidates.map(r => ({
        Rank: r.rank,
        ID: r.candidate.candidate_id,
        Name: r.candidate.profile.anonymized_name || 'Incognito',
        Title: r.candidate.profile.current_title || 'Unknown',
        Company: r.candidate.profile.current_company || 'Unknown',
        Score: `${(r.score * 100).toFixed(0)}%`,
        Reasoning: r.reason || ''
      }));

      const ws = XLSX.utils.json_to_sheet(excelRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ranked Fits");
      XLSX.writeFile(wb, "recruitiq_ranked_submission.xlsx");
    } catch (err) {
      console.error("Failed to load xlsx library:", err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Download Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* CSV Card */}
        <div className="glass-panel p-8 border border-[var(--border)] flex flex-col justify-between hover:border-indigo-500/20">
          <div>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-6 border border-indigo-500/20">
              <FileText size={22} />
            </div>
            <h3 className="text-lg font-display font-extrabold text-primary-theme mb-2">Hackathon Spec CSV</h3>
            <p className="text-xs text-muted-theme font-medium leading-relaxed mb-6">
              Generate and download the graded candidate leaderboard output exactly aligned with redrob validation predicates. Perfect for direct upload submissions.
            </p>
          </div>
          <button
            onClick={handleDownloadCSV}
            disabled={candidates.length === 0}
            className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-display font-black text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <Download size={14} /> Download submission.csv
          </button>
        </div>

        {/* Excel Card */}
        <div className="glass-panel p-8 border border-[var(--border)] flex flex-col justify-between hover:border-fuchsia-500/20">
          <div>
            <div className="w-12 h-12 rounded-xl bg-fuchsia-500/10 flex items-center justify-center text-fuchsia-400 mb-6 border border-fuchsia-500/20">
              <FileSpreadsheet size={22} />
            </div>
            <h3 className="text-lg font-display font-extrabold text-primary-theme mb-2">Recruiter Worksheet Excel</h3>
            <p className="text-xs text-muted-theme font-medium leading-relaxed mb-6">
              Compile the detailed candidates leaderboard sheet into a rich Microsoft Excel workbook containing candidate names, titles, fit percentages, and reasoning lists.
            </p>
          </div>
          <button
            onClick={handleDownloadExcel}
            disabled={candidates.length === 0}
            className="w-full py-3.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white font-display font-black text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <Download size={14} /> Export ranked_fits.xlsx
          </button>
        </div>

      </div>

      {/* Grid Sheet Preview */}
      {candidates.length > 0 && (
        <div className="glass-panel p-8 border border-[var(--border)]">
          <h3 className="text-xs font-display font-extrabold text-primary-theme uppercase tracking-wider mb-6 flex items-center gap-2">
            📋 Workspace Export Sheet Preview (Top 10)
          </h3>
          <div className="w-full overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[var(--surface-3)] text-muted-theme border-b border-[var(--border)] font-mono font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-4 px-6 text-center">Rank</th>
                  <th className="py-4 px-6">Candidate ID</th>
                  <th className="py-4 px-6 text-center">Fit Score</th>
                  <th className="py-4 px-6">Neural Reason Explainer Justification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-slate-950/20">
                {candidates.slice(0, 10).map((r) => (
                  <tr key={r.candidate.candidate_id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-4 px-6 text-center font-bold text-indigo-400">#{r.rank}</td>
                    <td className="py-4 px-6 font-mono font-bold text-primary-theme">{r.candidate.candidate_id}</td>
                    <td className="py-4 px-6 text-center font-mono font-black text-emerald-400">{(r.score * 100).toFixed(0)}%</td>
                    <td className="py-4 px-6 text-muted-theme max-w-sm truncate italic">"{r.reason}"</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
