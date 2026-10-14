import React, { useState } from 'react';
import { 
  X, 
  ExternalLink, 
  Clock, 
  MapPin, 
  Trophy, 
  TrendingDown, 
  Layers, 
  ShieldAlert,
  ChevronRight
} from 'lucide-react';
import { Match, MatchSubPage } from '../types';
import { TotalSectionDropGraph } from './TotalSectionDropGraph';

interface MatchDetailModalProps {
  match: Match | null;
  onClose: () => void;
  threshold: number;
  onSimulateSpike?: (matchId: string, customDrop: number) => void;
  isAlerted?: boolean;
}

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({
  match,
  onClose,
  threshold,
  onSimulateSpike,
  isAlerted = false
}) => {
  const [activeSubTab, setActiveSubTab] = useState<MatchSubPage>('TOTAL');

  if (!match) return null;

  const subTabs: MatchSubPage[] = ['1X2', 'TOTAL', 'HANDICAP', 'HT TOTAL', 'HT 1X2'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-5xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-5 bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
              ID: {match.id}
            </span>
            <div className="flex items-center space-x-1.5 text-xs text-zinc-400">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>{match.country}</span>
              <ChevronRight className="w-3 h-3 text-zinc-600" />
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-zinc-200 font-medium">{match.league}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <a
              href={`https://dropping-odds.com/event.php?id=${match.id}&t=total`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-lg transition-colors"
            >
              <span>dropping-odds.com</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Score & Match Presentation */}
        <div className="p-6 bg-zinc-900/40 border-b border-zinc-800/80">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Home Team */}
            <div className="flex-1 text-center md:text-right">
              <h3 className="text-lg md:text-xl font-extrabold text-zinc-100 tracking-tight">
                {match.homeTeam}
              </h3>
              <span className="text-xs text-zinc-400 font-mono">Home</span>
            </div>

            {/* Score & Minute */}
            <div className="flex flex-col items-center px-6 py-2 bg-zinc-950 rounded-xl border border-zinc-800 shadow-inner">
              <span className="text-3xl font-extrabold font-mono tracking-widest text-emerald-400">
                {match.score}
              </span>
              <div className="mt-1 flex items-center space-x-1.5 text-xs font-mono font-semibold text-zinc-300">
                <Clock className="w-3 h-3 text-emerald-400 animate-pulse" />
                <span>{match.time} (Min: {match.currentMinute}&apos;)</span>
              </div>
            </div>

            {/* Away Team */}
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-lg md:text-xl font-extrabold text-zinc-100 tracking-tight">
                {match.awayTeam}
              </h3>
              <span className="text-xs text-zinc-400 font-mono">Away</span>
            </div>
          </div>
        </div>

        {/* Website Sub-Tabs Navigation */}
        <div className="px-6 pt-4 border-b border-zinc-800 bg-zinc-950 flex flex-wrap items-center justify-between gap-2">
          <div className="flex space-x-1 overflow-x-auto pb-2">
            {subTabs.map((tab) => {
              const isActive = activeSubTab === tab;
              const isTargetTab = tab === 'TOTAL';
              return (
                <button
                  key={tab}
                  onClick={() => setActiveSubTab(tab)}
                  className={`relative px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all flex items-center space-x-1.5 ${
                    isActive
                      ? isTargetTab 
                        ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-950 font-black'
                        : 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  <span>{tab}</span>
                  {isTargetTab && (
                    <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${isActive ? 'bg-zinc-950 text-emerald-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      TARGET
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="text-[11px] font-mono text-zinc-400 pb-2">
            Target Page: <code className="text-emerald-400 font-bold">/event.php?id={match.id}&t=total</code>
          </div>
        </div>

        {/* Sub-Page Content */}
        <div className="p-6 max-h-[65vh] overflow-y-auto">
          {activeSubTab === 'TOTAL' ? (
            <TotalSectionDropGraph 
              match={match} 
              threshold={threshold}
              onSimulateSpike={onSimulateSpike}
              isAlerted={isAlerted}
            />
          ) : (
            <div className="py-12 text-center space-y-3">
              <Layers className="w-10 h-10 text-zinc-600 mx-auto" />
              <h4 className="text-sm font-bold text-zinc-300 uppercase tracking-wide">
                Sub-Page: {activeSubTab}
              </h4>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Per your instructions, the 24/7 bot specifically monitors the <strong className="text-emerald-400">&quot;TOTAL&quot;</strong> section for the horizontal <strong className="text-emerald-400">&quot;DROP&quot;</strong> graph.
              </p>
              <button
                onClick={() => setActiveSubTab('TOTAL')}
                className="mt-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors"
              >
                Switch to Monitored TOTAL Section
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
