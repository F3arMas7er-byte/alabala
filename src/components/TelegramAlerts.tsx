import React, { useState } from 'react';
import { 
  Send, 
  Settings, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ExternalLink, 
  Trash2, 
  ShieldAlert, 
  HelpCircle,
  TrendingDown,
  Sparkles,
  Check,
  Copy
} from 'lucide-react';
import { BotAlert, BotConfig } from '../types';
import { sendTelegramMessage, formatTelegramHTML } from '../services/telegram';

interface TelegramAlertsProps {
  alerts: BotAlert[];
  config: BotConfig;
  setConfig: React.Dispatch<React.SetStateAction<BotConfig>>;
  onClearAlerts: () => void;
  onSendTestMessage: () => void;
  isSendingTest: boolean;
}

export const TelegramAlerts: React.FC<TelegramAlertsProps> = ({
  alerts,
  config,
  setConfig,
  onClearAlerts,
  onSendTestMessage,
  isSendingTest
}) => {
  const [tokenInput, setTokenInput] = useState(config.telegramToken);
  const [chatIdInput, setChatIdInput] = useState(config.telegramChatId);
  const [thresholdInput, setThresholdInput] = useState(config.dropThreshold.toString());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(thresholdInput);
    setConfig(prev => ({
      ...prev,
      telegramToken: tokenInput.trim(),
      telegramChatId: chatIdInput.trim(),
      dropThreshold: isNaN(val) ? 0.65 : val
    }));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const copyHTML = (alert: BotAlert) => {
    const html = formatTelegramHTML(alert);
    navigator.clipboard.writeText(html);
    setCopiedId(alert.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Configuration & Test Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-zinc-800 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-zinc-100">
                Telegram Dispatcher &amp; Bot Settings
              </h3>
              <p className="text-xs text-zinc-400">
                Connected to Telegram Bot API. Alerts trigger when TOTAL DROP &ge; {config.dropThreshold.toFixed(2)}.
              </p>
            </div>
          </div>

          <button
            onClick={onSendTestMessage}
            disabled={isSendingTest}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-950 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSendingTest ? 'Sending Test...' : 'Send Test Alert to Telegram'}</span>
          </button>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSaveSettings} className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Telegram Bot Token
            </label>
            <input
              type="password"
              placeholder="e.g. 7123456789:ABCdefGhIJKlmNoPQRsTUVwX-Yz"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 font-mono"
            />
            <span className="text-[10px] text-zinc-500 mt-1 block">From @BotFather on Telegram</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Telegram Chat ID
            </label>
            <input
              type="text"
              placeholder="e.g. 123456789 or @your_channel"
              value={chatIdInput}
              onChange={(e) => setChatIdInput(e.target.value)}
              className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 font-mono"
            />
            <span className="text-[10px] text-zinc-500 mt-1 block">From @userinfobot or channel ID</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              DROP Alert Threshold
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                step="0.01"
                min="0.10"
                max="2.00"
                value={thresholdInput}
                onChange={(e) => setThresholdInput(e.target.value)}
                className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 font-mono font-bold focus:outline-none focus:border-emerald-500/60"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold text-xs transition-colors whitespace-nowrap cursor-pointer"
              >
                {saveSuccess ? 'Saved!' : 'Save'}
              </button>
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Your target: 0.65 or greater</span>
          </div>
        </form>

        {/* Quick Instructions Dropdown */}
        <div className="mt-4 p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 text-xs text-zinc-400 flex items-start space-x-2.5">
          <HelpCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="text-zinc-200 font-semibold">How to get your credentials:</span>
            <p>
              1. Search <strong className="text-emerald-400">@BotFather</strong> on Telegram &rarr; Send <code className="text-zinc-200">/newbot</code> &rarr; Copy the HTTP API token.
            </p>
            <p>
              2. Search <strong className="text-emerald-400">@userinfobot</strong> on Telegram &rarr; Send any message &rarr; Copy your numeric ID (e.g., <code>123456789</code>).
            </p>
          </div>
        </div>
      </div>

      {/* Live Alerts Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <h3 className="text-base font-extrabold text-zinc-100">
              Triggered Drop Alerts Feed ({alerts.length})
            </h3>
          </div>

          {alerts.length > 0 && (
            <button
              onClick={onClearAlerts}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-900 text-xs transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {alerts.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/50">
            <ShieldAlert className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-zinc-300">No Alerts Triggered Yet</h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
              When any live game&apos;s horizontal DROP matrix column under the &quot;TOTAL&quot; section hits 0.65 or higher, an instant notification is logged and dispatched to your Telegram here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl space-y-4 hover:border-zinc-700 transition-all"
              >
                {/* Alert Top Info */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        DROP: {alert.dropValue.toFixed(2)} ≥ {alert.threshold.toFixed(2)}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-500 flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-zinc-100 mt-2">
                      {alert.matchName}
                    </h4>
                    <p className="text-xs text-zinc-400">
                      {alert.country} &bull; {alert.league}
                    </p>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    alert.telegramStatus === 'SENT' 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : alert.telegramStatus === 'SIMULATED'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}>
                    {alert.telegramStatus}
                  </span>
                </div>

                {/* Score & Drop Details */}
                <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800/80 grid grid-cols-3 gap-2 text-center text-xs font-mono">
                  <div>
                    <span className="text-zinc-500 text-[10px] block">SCORE</span>
                    <strong className="text-zinc-200">{alert.score}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] block">MINUTE</span>
                    <strong className="text-emerald-400">{alert.minute}&apos;</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] block">LINE</span>
                    <strong className="text-zinc-200">{alert.line}</strong>
                  </div>
                </div>

                {/* Telegram Message Preview Box */}
                <div className="p-3 bg-zinc-900/40 rounded-xl border border-zinc-800 text-[11px] font-mono text-zinc-300 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-zinc-500 flex items-center justify-between">
                    <span>Telegram Message Preview</span>
                    <button
                      onClick={() => copyHTML(alert)}
                      className="text-zinc-400 hover:text-zinc-200 flex items-center space-x-1"
                    >
                      {copiedId === alert.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === alert.id ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="text-zinc-300 leading-relaxed font-sans pt-1">
                    🚨 <strong>HIGH DROP DETECTED (≥ {alert.threshold.toFixed(2)})</strong><br />
                    ⚽ {alert.matchName}<br />
                    📊 Score: {alert.score} | Min: {alert.minute}&apos;<br />
                    ⚡ DROP Value: <code className="text-rose-400 font-bold">{alert.dropValue.toFixed(2)}</code> (Threshold: {alert.threshold.toFixed(2)})
                  </div>
                </div>

                {/* Link */}
                <div className="flex items-center justify-between pt-1">
                  <a
                    href={alert.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-emerald-400 hover:underline flex items-center space-x-1 font-mono"
                  >
                    <span>Inspect on dropping-odds.com</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
