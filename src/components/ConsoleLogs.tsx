import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Trash2, 
  Pause, 
  Play, 
  Search, 
  ShieldAlert, 
  Info, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { LogEntry } from '../types';

interface ConsoleLogsProps {
  logs: LogEntry[];
  onClearLogs: () => void;
  isRunning: boolean;
  onToggleRunning: () => void;
}

export const ConsoleLogs: React.FC<ConsoleLogsProps> = ({
  logs,
  onClearLogs,
  isRunning,
  onToggleRunning
}) => {
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== 'ALL' && log.level !== filterLevel) return false;
    if (searchTerm && !log.message.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getLevelStyle = (level: LogEntry['level']) => {
    switch (level) {
      case 'ALERT':
        return 'text-rose-400 bg-rose-950/40 border border-rose-500/40 font-bold';
      case 'WARNING':
        return 'text-amber-400 bg-amber-950/40 border border-amber-500/30';
      case 'SUCCESS':
        return 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/30';
      case 'ERROR':
        return 'text-red-400 bg-red-950/40 border border-red-500/30';
      default:
        return 'text-zinc-400 bg-zinc-900 border border-zinc-800';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-extrabold text-zinc-100 flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <span>24/7 Monitor Worker Console</span>
          </h3>
          <p className="text-xs text-zinc-400">
            Real-time scraping cycles, match discovery, and threshold trigger logs.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onToggleRunning}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isRunning 
                ? 'bg-zinc-900 text-zinc-200 border-zinc-700 hover:bg-zinc-800' 
                : 'bg-emerald-600 text-white border-emerald-500 font-bold'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? 'Pause Stream' : 'Resume Stream'}</span>
          </button>

          <button
            onClick={onClearLogs}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-zinc-800 transition-colors"
            title="Clear Console"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal Window */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl flex flex-col h-[550px]">
        {/* Terminal Header Controls */}
        <div className="px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
            <span className="w-3 h-3 rounded-full bg-yellow-500/80"></span>
            <span className="w-3 h-3 rounded-full bg-green-500/80"></span>
            <span className="ml-2 font-mono text-zinc-400 font-semibold text-[11px]">
              python3 main.py --verbose
            </span>
          </div>

          <div className="flex items-center space-x-2 font-mono">
            {/* Level filters */}
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="px-2 py-1 bg-zinc-950 border border-zinc-800 rounded-md text-[11px] text-zinc-300 focus:outline-none"
            >
              <option value="ALL">ALL LEVELS</option>
              <option value="ALERT">ALERT (DROP ≥ 0.90)</option>
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
            </select>

            <label className="flex items-center space-x-1 text-[11px] text-zinc-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded bg-zinc-900 border-zinc-700 text-emerald-500 focus:ring-0"
              />
              <span>Auto-scroll</span>
            </label>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-zinc-300 space-y-1.5 select-text">
          {filteredLogs.map((log) => (
            <div key={log.id} className="flex items-start space-x-2.5 hover:bg-zinc-900/50 p-1 rounded transition-colors">
              <span className="text-zinc-600 select-none text-[10px] whitespace-nowrap mt-0.5">
                {log.timestamp}
              </span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] whitespace-nowrap ${getLevelStyle(log.level)}`}>
                {log.level}
              </span>
              <span className={`leading-relaxed ${log.level === 'ALERT' ? 'text-rose-300 font-bold' : 'text-zinc-300'}`}>
                {log.message}
              </span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
};
