import React from 'react';
import { 
  Activity, 
  Send, 
  Download, 
  Code2, 
  Terminal, 
  Bell, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause,
  ExternalLink
} from 'lucide-react';
import { BotConfig } from '../types';

interface NavbarProps {
  activeTab: 'monitor' | 'alerts' | 'save' | 'code' | 'logs';
  setActiveTab: (tab: 'monitor' | 'alerts' | 'save' | 'code' | 'logs') => void;
  config: BotConfig;
  setConfig: React.Dispatch<React.SetStateAction<BotConfig>>;
  isRunning: boolean;
  setIsRunning: (running: boolean) => void;
  onDownloadZip: () => void;
  onOpenTestSuite: () => void;
  alertCount: number;
  activeMatchCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  config,
  setConfig,
  isRunning,
  setIsRunning,
  onDownloadZip,
  onOpenTestSuite,
  alertCount,
  activeMatchCount
}) => {
  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 text-zinc-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Status */}
          <div className="flex items-center space-x-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 shadow-lg shadow-emerald-950/50">
              <Activity className="w-5 h-5 text-zinc-950 stroke-[2.5]" />
              {isRunning && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-zinc-100 via-zinc-200 to-emerald-400 bg-clip-text text-transparent">
                  DROPPING-ODDS 24/7
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold tracking-wider rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  TOTAL DROP ≥ {config.dropThreshold.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-medium hidden sm:block">
                Telegram Sentinel &amp; Real-Time Scraper Dashboard
              </p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800/80 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('monitor')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg transition-all ${
                activeTab === 'monitor'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Live Monitor</span>
              <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/20 text-emerald-200">
                {activeMatchCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('alerts')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg transition-all ${
                activeTab === 'alerts'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Telegram Alerts</span>
              {alertCount > 0 && (
                <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500 text-white font-bold animate-pulse">
                  {alertCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('save')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg transition-all ${
                activeTab === 'save'
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-900/30 font-extrabold'
                  : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save This Bot</span>
            </button>

            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg transition-all ${
                activeTab === 'code'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Python Code</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg transition-all ${
                activeTab === 'logs'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Bot Logs</span>
            </button>
          </nav>

          {/* Right Action Tools */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Audio Toggle */}
            <button
              onClick={() => setConfig(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
              title={config.soundEnabled ? 'Audio alerts active' : 'Audio alerts muted'}
              className={`p-2 rounded-lg border transition-colors ${
                config.soundEnabled
                  ? 'bg-zinc-900 border-zinc-800 text-emerald-400 hover:border-emerald-500/40'
                  : 'bg-zinc-900/50 border-zinc-800/50 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {config.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Test Suite Trigger */}
            <button
              onClick={onOpenTestSuite}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-bold border border-emerald-500/30 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 transition-all cursor-pointer shadow-sm"
              title="Open Automated Test Suite & Simulation Triggers"
            >
              <span>🧪</span>
              <span className="hidden sm:inline">Test Suite</span>
            </button>

            {/* Run/Pause Loop */}
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                isRunning
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/60'
                  : 'bg-zinc-900 text-amber-400 border-amber-500/30 hover:bg-zinc-800'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">24/7 Running</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Paused</span>
                </>
              )}
            </button>

            {/* Download Zip CTA */}
            <button
              onClick={onDownloadZip}
              className="flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shadow-md shadow-emerald-950/50 hover:shadow-emerald-900/50 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download (.ZIP)</span>
            </button>
          </div>
        </div>

        {/* Mobile Tab Bar */}
        <div className="flex md:hidden overflow-x-auto py-2 space-x-2 border-t border-zinc-800/50 text-xs">
          <button
            onClick={() => setActiveTab('monitor')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${activeTab === 'monitor' ? 'bg-emerald-600 text-white font-bold' : 'text-zinc-400 bg-zinc-900'}`}
          >
            Live Monitor ({activeMatchCount})
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${activeTab === 'alerts' ? 'bg-emerald-600 text-white font-bold' : 'text-zinc-400 bg-zinc-900'}`}
          >
            Alerts {alertCount > 0 && `(${alertCount})`}
          </button>
          <button
            onClick={() => setActiveTab('save')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${activeTab === 'save' ? 'bg-amber-500 text-zinc-950 font-bold' : 'text-amber-400 bg-zinc-900'}`}
          >
            Save Bot
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${activeTab === 'code' ? 'bg-emerald-600 text-white font-bold' : 'text-zinc-400 bg-zinc-900'}`}
          >
            Python Code
          </button>
          <button
            onClick={onOpenTestSuite}
            className="px-3 py-1.5 rounded-lg whitespace-nowrap text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 font-bold"
          >
            🧪 Test Suite
          </button>
        </div>
      </div>
    </header>
  );
};
