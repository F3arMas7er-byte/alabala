import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  ExternalLink, 
  Clock, 
  TrendingDown, 
  ShieldAlert, 
  Plus, 
  Trash2, 
  Zap, 
  RefreshCw,
  Eye,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { Match } from '../types';

interface LiveMonitorProps {
  matches: Match[];
  threshold: number;
  alertedMatchIds: Set<string>;
  onSelectMatch: (match: Match) => void;
  onSimulateNewMatch: () => void;
  onSimulateRemoveMatch: () => void;
  onSimulateSpike: (matchId: string, customDrop: number) => void;
  isScanning: boolean;
}

export const LiveMonitor: React.FC<LiveMonitorProps> = ({
  matches,
  threshold,
  alertedMatchIds,
  onSelectMatch,
  onSimulateNewMatch,
  onSimulateRemoveMatch,
  onSimulateSpike,
  isScanning
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyHighDrops, setOnlyHighDrops] = useState(false);

  const filteredMatches = matches.filter((m) => {
    const matchesSearch =
      m.homeTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.awayTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.league.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.country.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (onlyHighDrops) {
      return m.currentDrop >= threshold;
    }
    return true;
  });

  const highDropCount = matches.filter(m => m.currentDrop >= threshold).length;

  return (
    <div className="space-y-6">
      {/* Top Section Header & Live URL */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-extrabold text-zinc-100 tracking-tight">
              Section: &quot;Dropping Odds&quot;
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isScanning ? 'bg-emerald-400 animate-ping' : 'bg-emerald-500'}`}></span>
              <span>LIVE POLLING</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              100% OF LIVE GAMES MONITORED (NO EXCEPTIONS)
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-blue-300 border border-blue-500/20">
              STRICT 1 ALERT PER GAME
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 flex items-center space-x-1.5 font-mono">
            <span>Target URL:</span>
            <a 
              href="https://dropping-odds.com/index.php?view=live" 
              target="_blank" 
              rel="noreferrer"
              className="text-emerald-400 hover:underline flex items-center space-x-1"
            >
              <span>https://dropping-odds.com/index.php?view=live</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>

        {/* Live Simulator Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onSimulateNewMatch}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-colors"
            title="Simulate a new game arriving on the live page"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Simulate New Game</span>
          </button>

          <button
            onClick={onSimulateRemoveMatch}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-colors"
            title="Simulate a concluded game leaving the live table"
          >
            <Trash2 className="w-3.5 h-3.5 text-zinc-400" />
            <span>Simulate Finished</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search country, league, team..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        {/* Filter High Drops */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setOnlyHighDrops(!onlyHighDrops)}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
              onlyHighDrops
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Only DROP ≥ {threshold.toFixed(2)}</span>
            <span className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-black/40 text-rose-300">
              {highDropCount}
            </span>
          </button>
        </div>
      </div>

      {/* Main Table: Exact Columns Required */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-900/90 border-b border-zinc-800 text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                <th className="py-3 px-4 font-bold">COUNTRY</th>
                <th className="py-3 px-4 font-bold">LEAGUE</th>
                <th className="py-3 px-4 font-bold">HOME</th>
                <th className="py-3 px-3 font-bold text-center">SCORE</th>
                <th className="py-3 px-4 font-bold">AWAY</th>
                <th className="py-3 px-3 font-bold text-center">TIME</th>
                <th className="py-3 px-4 font-bold text-center bg-zinc-900/50">
                  <div className="flex items-center justify-center space-x-1 text-emerald-400">
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>DROP (TOTAL)</span>
                  </div>
                </th>
                <th className="py-3 px-4 font-bold text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-medium">
              {filteredMatches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500 text-xs">
                    No active live matches found matching your filters in &quot;Dropping Odds&quot;.
                  </td>
                </tr>
              ) : (
                filteredMatches.map((match) => {
                  const isHigh = match.currentDrop >= threshold;
                  const hasAlerted = alertedMatchIds.has(match.id);
                  return (
                    <tr
                      key={match.id}
                      onClick={() => onSelectMatch(match)}
                      className={`group hover:bg-zinc-900/70 cursor-pointer transition-colors ${
                        isHigh ? 'bg-rose-950/20' : ''
                      }`}
                    >
                      {/* COUNTRY */}
                      <td className="py-3.5 px-4 text-zinc-300 font-semibold whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          {match.isNew && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                          )}
                          <span>{match.country}</span>
                        </div>
                      </td>

                      {/* LEAGUE */}
                      <td className="py-3.5 px-4 text-zinc-400 whitespace-nowrap">
                        <span className="max-w-[160px] truncate block" title={match.league}>
                          {match.league}
                        </span>
                      </td>

                      {/* HOME */}
                      <td className="py-3.5 px-4 text-zinc-100 font-bold whitespace-nowrap">
                        {match.homeTeam}
                      </td>

                      {/* SCORE */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md bg-zinc-900 font-mono font-bold text-emerald-400 border border-zinc-800">
                          {match.score}
                        </span>
                      </td>

                      {/* AWAY */}
                      <td className="py-3.5 px-4 text-zinc-100 font-bold whitespace-nowrap">
                        {match.awayTeam}
                      </td>

                      {/* TIME */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap font-mono text-zinc-300">
                        <div className="flex items-center justify-center space-x-1">
                          <Clock className="w-3 h-3 text-emerald-400" />
                          <span>{match.time}</span>
                        </div>
                      </td>

                      {/* DROP (TOTAL) */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap bg-zinc-900/30">
                        <div className="flex flex-col items-center justify-center space-y-1">
                          <div className="flex items-center justify-center space-x-2">
                            <span
                              className={`font-mono font-extrabold px-2 py-0.5 rounded text-xs ${
                                isHigh
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                                  : 'bg-zinc-800 text-zinc-300'
                              }`}
                            >
                              {match.currentDrop.toFixed(2)}
                            </span>
                            {isHigh && (
                              <span className="text-[10px] font-bold text-rose-400 tracking-wider font-mono">
                                ≥ {threshold.toFixed(2)}
                              </span>
                            )}
                          </div>

                          {/* 1-Alert-Per-Game Status Badge */}
                          {hasAlerted ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center space-x-1">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                              <span>ALERT SENT (1/1)</span>
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono text-zinc-500">
                              MONITORING (0/1)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* ACTION */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-2">
                          {/* Spike button to test alert trigger */}
                          <button
                            onClick={() => onSimulateSpike(match.id, 0.76)}
                            className={`p-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                              hasAlerted
                                ? 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-400'
                                : 'bg-zinc-800 hover:bg-rose-950/60 hover:text-rose-400 text-zinc-400 border-zinc-700 hover:border-rose-500/40'
                            }`}
                            title={
                              hasAlerted
                                ? 'This match has already sent its 1 alert (subsequent minute drops are blocked)'
                                : 'Simulate sudden drop spike >= 0.65'
                            }
                          >
                            <Zap className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onSelectMatch(match)}
                            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Inspect TOTAL</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info helper banner */}
      <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 flex items-start space-x-3 text-xs text-zinc-400">
        <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-zinc-200">Strict 1 Alert Per Game Rule:</strong> The bot polls the &quot;Dropping Odds&quot; table and tracks every live match. When a game enters the <strong className="text-emerald-400">&quot;TOTAL&quot;</strong> section with a <strong className="text-rose-400 font-mono font-bold">DROP &ge; {threshold.toFixed(2)}</strong>, it fires <strong className="text-emerald-400 font-semibold">exactly 1 alert to Telegram</strong>. Once notified, that match is marked as alerted and subsequent minute drops are suppressed so your Telegram is never flooded with minute-by-minute messages.
        </div>
      </div>
    </div>
  );
};
