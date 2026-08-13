import { useState, useEffect } from 'react';
import { FileDown, FileText, Trash2, Eye, Download, Search, CheckCircle2, Sparkles, Filter } from 'lucide-react';
import { getHistory, deleteReport as apiDeleteReport } from '../services/api';
import { printAssessmentPDF } from '../utils/printPdf';

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUseCase, setSelectedUseCase] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);

  // Load saved reports from localStorage + API
  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    let localData = [];
    try {
      const stored = localStorage.getItem('locavista_saved_reports');
      if (stored) {
        localData = JSON.parse(stored);
      }
    } catch (err) {
      localData = [];
    }

    let mappedApiReports = [];
    try {
      const apiHistory = await getHistory();
      if (Array.isArray(apiHistory) && apiHistory.length > 0) {
        mappedApiReports = apiHistory.map((item) => ({
          id: `REP-API-${item.id}`,
          apiId: item.id,
          location_name: item.result?.location_name || `Lat ${Number(item.latitude).toFixed(4)}, Lng ${Number(item.longitude).toFixed(4)}`,
          latitude: Number(item.latitude),
          longitude: Number(item.longitude),
          use_case: item.result?.use_case || 'restaurant',
          score: item.result?.score ?? item.result?.site_readiness_score ?? item.result?.overall_score ?? item.score ?? 75.0,
          date: item.created_at ? item.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
          status: 'Approved',
          recommendation: item.result?.explanation?.recommendation || 'Evaluated spatial site.',
          raw: item.result
        }));
      }
    } catch (err) {
      // Ignore API fetch error
    }

    // Deduplicate: filter out local items that match an API item (by apiId, id, or lat/lng/useCase/score)
    const uniqueLocal = localData.filter((localItem) => {
      const isDuplicate = mappedApiReports.some((apiItem) => {
        if (localItem.apiId && apiItem.apiId === localItem.apiId) return true;
        if (localItem.id === apiItem.id) return true;
        const sameLat = Math.abs(Number(localItem.latitude) - Number(apiItem.latitude)) < 0.0005;
        const sameLng = Math.abs(Number(localItem.longitude) - Number(apiItem.longitude)) < 0.0005;
        const sameUseCase = String(localItem.use_case || '').toLowerCase() === String(apiItem.use_case || '').toLowerCase();
        const sameScore = Math.abs(Number(localItem.score) - Number(apiItem.score)) < 0.2;
        return sameLat && sameLng && sameUseCase && sameScore;
      });
      return !isDuplicate;
    });

    const combined = [...mappedApiReports, ...uniqueLocal];
    setReports(combined);

    // Clean up local storage to permanently remove old duplicate entries
    try {
      localStorage.setItem('locavista_saved_reports', JSON.stringify(uniqueLocal));
    } catch (err) {
      // Ignore storage write error
    }
  };

  const handleDeleteReport = async (report) => {
    if (!window.confirm(`Are you sure you want to delete report ${report.id}?`)) return;

    if (report.apiId) {
      try {
        await apiDeleteReport(report.apiId);
      } catch (err) {
        // Ignore API delete error
      }
    }

    const updated = reports.filter((r) => r.id !== report.id);
    setReports(updated);
    localStorage.setItem('locavista_saved_reports', JSON.stringify(updated.filter((r) => !r.apiId)));
    if (selectedReport?.id === report.id) setSelectedReport(null);
  };

  const handleClearAllReports = async () => {
    if (reports.length === 0) return;
    if (!window.confirm('Are you sure you want to PERMANENTLY clear ALL saved assessment reports? This action cannot be undone.')) {
      return;
    }

    // Delete all API-backed reports
    const apiReports = reports.filter((r) => r.apiId);
    for (const report of apiReports) {
      try {
        await apiDeleteReport(report.apiId);
      } catch (err) {
        // Ignore individual API delete error
      }
    }

    // Clear local storage
    localStorage.removeItem('locavista_saved_reports');

    // Clear component state
    setReports([]);
    setSelectedReport(null);
  };

  const filteredReports = reports.filter((r) => {
    const matchesQuery =
      r.location_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.use_case.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesUseCase = selectedUseCase === 'all' || r.use_case.toLowerCase() === selectedUseCase.toLowerCase();
    return matchesQuery && matchesUseCase;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header Panel */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600">
            <FileText size={20} />
            <h2 className="text-xl font-bold text-slate-900">Saved Assessment Reports & Exports</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">Archive of all saved location evaluations, ML market capture reports, and revenue simulations.</p>
        </div>

        <div className="flex items-center gap-2 whitespace-nowrap overflow-x-auto max-w-full shrink-0 py-1">
          <button
            onClick={() => {
              if (reports.length > 0) printAssessmentPDF(reports[0]);
              else window.print();
            }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs shrink-0 whitespace-nowrap"
          >
            <Download size={14} className="text-blue-600" /> Export PDF
          </button>
          <button
            onClick={handleClearAllReports}
            disabled={reports.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs shrink-0 whitespace-nowrap"
            title="Permanently delete all saved reports from storage & database"
          >
            <Trash2 size={14} className="text-rose-600" /> Clear All Saved Data
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Box */}
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2">
            <Search size={16} className="text-slate-400 shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports by location name, ID, or use case..."
              className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none"
            />
          </div>

          {/* Use Case Filter Pills */}
          <div className="flex items-center gap-1.5 text-xs overflow-x-auto py-1">
            <Filter size={14} className="text-slate-400 mr-1 shrink-0" />
            {['all', 'restaurant', 'retail', 'office', 'school'].map((uc) => (
              <button
                key={uc}
                onClick={() => setSelectedUseCase(uc)}
                className={
                  'rounded-xl px-3 py-1.5 font-semibold capitalize transition shrink-0 ' +
                  (selectedUseCase === uc
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100')
                }
              >
                {uc === 'all' ? 'All Use Cases' : uc}
              </button>
            ))}
          </div>
        </div>

        {/* Reports Archive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="pb-3">Report ID</th>
                <th className="pb-3">Target Location</th>
                <th className="pb-3">Use Case</th>
                <th className="pb-3">Readiness Score</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No assessment reports found matching "{searchQuery}".
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-blue-50/50 transition">
                    <td className="py-3.5 font-bold font-mono text-slate-900">{report.id}</td>
                    <td className="py-3.5 text-slate-900 font-bold">{report.location_name}</td>
                    <td className="py-3.5 capitalize font-medium">{report.use_case}</td>
                    <td className="py-3.5 font-extrabold text-blue-600 text-sm">
                      {typeof report.score === 'number' ? (Number.isInteger(report.score) ? report.score : report.score.toFixed(2)) : report.score}
                    </td>
                    <td className="py-3.5 text-slate-500">{report.date}</td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={11} /> {report.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedReport(report)}
                          className="flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 transition"
                          title="View Report Details"
                        >
                          <Eye size={14} /> View
                        </button>
                        <button
                          onClick={() => handleDeleteReport(report)}
                          className="flex items-center gap-1 font-semibold text-rose-500 hover:text-rose-700 transition ml-2"
                          title="Delete Report"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold font-mono text-blue-600">{selectedReport.id}</span>
                <h3 className="text-xl font-bold text-slate-900">{selectedReport.location_name}</h3>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl bg-blue-50 p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Site Readiness Score</p>
              <p className="text-4xl font-extrabold text-blue-600 mt-1">{selectedReport.score}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">AI Recommendation</p>
              <p className="text-xs text-slate-800 font-medium leading-relaxed">{selectedReport.recommendation}</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => printAssessmentPDF(selectedReport)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-2xs"
              >
                <Download size={14} className="text-blue-600" /> Export PDF
              </button>
              <button
                onClick={() => setSelectedReport(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
