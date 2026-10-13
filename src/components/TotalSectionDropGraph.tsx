import React, { useState } from 'react';
import { 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Zap, 
  Maximize2, 
  Clock, 
  LineChart, 
  Table as TableIcon,
  ShieldAlert
} from 'lucide-react';
import { Match, DropMinutePoint } from '../types';

interface TotalSectionDropGraphProps {
  match: Match;
  threshold: number;
  onSimulateSpike?: (matchId: string, customDrop: number) => void;
}

export const TotalSectionDropGraph: React.FC<TotalSectionDropGraphProps> = ({
  match,
  threshold,
  onSimulateSpike
}) => {
  const [viewMode, setViewMode] = useState<'matrix' | 'chart'>('matrix');
  const [hoveredMinute, setHoveredMinute] = useState<DropMinutePoint | null>(null);

  const history = match.history || [];
  const latestDrop = history.length > 0 ? history[history.length - 1].drop : match.currentDrop;
  const isHighDrop = latestDrop >= threshold;

  // Max drop for scaling the chart
  const maxDropVal = Math.max(1.0, ...history.map(h => h.drop));

  return (
    <div className="space-y-6">
      {/* Total Section Status Banner */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isHighDrop 
          ? 'bg-rose-950/30 border-rose-500/40 text-rose-200' 
          : 'bg-zinc-900/60 border-zinc-800 text-zinc-300'
      }`}>
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-lg ${
            isHighDrop ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'bg-emerald-500/10 text-emerald-400'
          }`}>
            {isHighDrop ? <ShieldAlert className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                Monitored Sub-Tab:
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                TOTAL
              </span>
              <span className="text-xs font-mono text-zinc-400">
                Line: <strong className="text-zinc-100">{match.line}</strong>
              </span>
            </div>
            <div className="mt-1 flex items-center space-x-3 text-sm">
              <span>
                Current DROP:{' '}
                <strong className={`font-mono font-bold text-base ${isHighDrop ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {latestDrop.toFixed(2)}
                </strong>
              </span>
              <span className="text-zinc-500">|</span>
              <span className="text-zinc-400 text-xs">
                Threshold: <strong className="font-mono text-zinc-300">≥ {threshold.toFixed(2)}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {onSimulateSpike && (
            <button
              onClick={() => onSimulateSpike(match.id, 0.78)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-semibold transition-all cursor-pointer"
              title="Inject DROP = 0.78 to trigger instant alert"
            >
              <Zap className="w-3.5 h-3.5 text-rose-400" />
              <span>Simulate Drop Spike (0.78)</span>
            </button>
          )}

          <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => setViewMode('matrix')}
              className={`p-1.5 rounded text-xs flex items-center space-x-1 ${
                viewMode === 'matrix' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Horizontal Table Matrix"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="text-[11px] hidden sm:inline">Matrix</span>
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={`p-1.5 rounded text-xs flex items-center space-x-1 ${
                viewMode === 'chart' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Graph View"
            >
              <LineChart className="w-3.5 h-3.5" />
              <span className="text-[11px] hidden sm:inline">Graph</span>
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Matrix: Exact Website Reproduction */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-xl">
        <div className="px-4 py-3 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingDown className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
              Horizontal "DROP" Graph &amp; Minute-by-Minute Timeline
            </h4>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            {history.length} Minute Columns Recorded
          </span>
        </div>

        {viewMode === 'matrix' ? (
          <div className="p-4 overflow-x-auto">
            <div className="min-w-max pb-2">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-[11px] font-mono text-zinc-400 bg-zinc-900/40">
                    <th className="py-2.5 px-3 text-left font-bold uppercase tracking-wider text-zinc-300 w-28 sticky left-0 bg-zinc-900 z-10 border-r border-zinc-800">
                      MINUTE
                    </th>
                    {history.map((pt) => {
                      const isAlertMin = pt.drop >= threshold;
                      return (
                        <th 
                          key={`min-${pt.minute}`} 
                          className={`py-2 px-3 font-semibold min-w-[56px] ${
                            isAlertMin ? 'text-rose-400 bg-rose-950/30' : 'text-zinc-300'
                          }`}
                        >
                          <div className="flex flex-col items-center">
                            <span>{pt.minute}&apos;</span>
                            {isAlertMin && (
                              <span className="text-[9px] text-rose-400 font-extrabold uppercase">
                                ALERT
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {/* DROP Row: Exact target row */}
                  <tr className="border-b border-zinc-800/80 bg-zinc-950">
                    <td className="py-3 px-3 text-left font-bold text-xs uppercase tracking-wider text-emerald-400 sticky left-0 bg-zinc-950 z-10 border-r border-zinc-800">
                      <div className="flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span>DROP</span>
                      </div>
                    </td>
                    {history.map((pt) => {
                      const isAlertMin = pt.drop >= threshold;
                      return (
                        <td 
                          key={`drop-${pt.minute}`} 
                          className={`py-3 px-2 font-mono font-bold text-xs transition-all ${
                            isAlertMin 
                              ? 'bg-rose-500/20 text-rose-300 border-x border-rose-500/40 shadow-inner' 
                              : 'text-zinc-200 hover:bg-zinc-900'
                          }`}
                        >
                          <div className="flex flex-col items-center justify-center">
                            <span className={isAlertMin ? 'text-rose-200 text-sm' : ''}>
                              {pt.drop.toFixed(2)}
                            </span>
                            {/* Visual mini bar */}
                            <div className="w-8 h-1.5 bg-zinc-800 rounded-full mt-1 overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  isAlertMin ? 'bg-rose-500' : 'bg-emerald-500'
                                }`} 
                                style={{ width: `${Math.min(100, (pt.drop / 1.0) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Line / Odd Row */}
                  <tr className="text-zinc-400 text-[11px] font-mono bg-zinc-900/20">
                    <td className="py-2.5 px-3 text-left text-zinc-400 sticky left-0 bg-zinc-900 z-10 border-r border-zinc-800">
                      ODDS ({match.line})
                    </td>
                    {history.map((pt) => (
                      <td key={`odd-${pt.minute}`} className="py-2 px-2 text-zinc-400">
                        {pt.odd.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-[11px] text-zinc-500 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Highlighted columns represent minutes where <strong>DROP ≥ {threshold.toFixed(2)}</strong>. The bot triggers automated Telegram notifications upon detecting these values.</span>
            </p>
          </div>
        ) : (
          /* Visual Chart Representation */
          <div className="p-6">
            <div className="h-64 relative flex items-end justify-between gap-2 border-b border-l border-zinc-800 pt-8 pb-2 px-4">
              {/* Threshold line */}
              <div 
                className="absolute left-0 right-0 border-t-2 border-dashed border-rose-500/70 z-10 flex items-center justify-end pr-2"
                style={{ bottom: `${(threshold / maxDropVal) * 100}%` }}
              >
                <span className="bg-rose-950 text-rose-400 font-mono text-[10px] px-2 py-0.5 rounded border border-rose-500/40 font-bold -translate-y-1/2">
                  Alert Trigger Line: {threshold.toFixed(2)}
                </span>
              </div>

              {history.map((pt) => {
                const heightPct = Math.max(8, (pt.drop / maxDropVal) * 88);
                const isOver = pt.drop >= threshold;
                return (
                  <div 
                    key={`chart-${pt.minute}`}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                    onMouseEnter={() => setHoveredMinute(pt)}
                    onMouseLeave={() => setHoveredMinute(null)}
                  >
                    <span className={`text-[10px] font-mono font-bold mb-1 transition-transform group-hover:scale-110 ${
                      isOver ? 'text-rose-400' : 'text-zinc-300'
                    }`}>
                      {pt.drop.toFixed(2)}
                    </span>
                    <div 
                      className={`w-full max-w-[32px] rounded-t-md transition-all group-hover:brightness-125 ${
                        isOver 
                          ? 'bg-gradient-to-t from-rose-700 to-rose-500 shadow-lg shadow-rose-950/60' 
                          : 'bg-gradient-to-t from-emerald-800 to-emerald-500'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[10px] font-mono text-zinc-400 mt-2">
                      {pt.minute}&apos;
                    </span>
                  </div>
                );
              })}
            </div>

            {hoveredMinute && (
              <div className="mt-3 p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono flex items-center justify-between text-zinc-300">
                <span>Minute: <strong>{hoveredMinute.minute}&apos;</strong></span>
                <span>Drop Value: <strong className={hoveredMinute.drop >= threshold ? 'text-rose-400' : 'text-emerald-400'}>{hoveredMinute.drop.toFixed(2)}</strong></span>
                <span>Current Odd: <strong>{hoveredMinute.odd.toFixed(2)}</strong></span>
                <span>Status: {hoveredMinute.drop >= threshold ? '🚨 EXCEEDS 0.65' : '✅ Below Threshold'}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Explanation of the Website's DROP formula */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800 text-xs">
          <span className="text-zinc-400 font-semibold block mb-1">Target Section:</span>
          <p className="text-zinc-300">
            Monitors exclusively under the <strong className="text-emerald-400">&quot;TOTAL&quot;</strong> sub-page (ignoring 1X2, HANDICAP, HT).
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800 text-xs">
          <span className="text-zinc-400 font-semibold block mb-1">Horizontal Minute Columns:</span>
          <p className="text-zinc-300">
            For each minute played, a new column is appended along the horizontal matrix.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800 text-xs">
          <span className="text-zinc-400 font-semibold block mb-1">Detection Logic:</span>
          <p className="text-zinc-300">
            When <code className="text-rose-400 font-mono font-bold">DROP &ge; {threshold.toFixed(2)}</code>, the bot triggers Telegram HTML notification and caches the minute.
          </p>
        </div>
      </div>
    </div>
  );
};
