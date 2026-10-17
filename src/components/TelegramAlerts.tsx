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
  Copy, 
  RefreshCw, 
  Bot, 
  UserCheck, 
  MessageSquare, 
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { BotAlert, BotConfig } from '../types';
import { sendTelegramMessage, formatTelegramHTML, getTelegramBotInfo } from '../services/telegram';
import confetti from 'canvas-confetti';

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

  // Bot Verification state
  const [isCheckingBot, setIsCheckingBot] = useState(false);
  const [botVerification, setBotVerification] = useState<{
    tested: boolean;
    valid?: boolean;
    botName?: string;
    username?: string;
    error?: string;
  }>({ tested: false });

  // Guide toggle
  const [showFullGuide, setShowFullGuide] = useState(true);

  const handleVerifyBotToken = async () => {
    if (!tokenInput.trim()) return;
    setIsCheckingBot(true);
    try {
      const res = await getTelegramBotInfo(tokenInput.trim());
      if (res.ok) {
        setBotVerification({
          tested: true,
          valid: true,
          botName: res.botName,
          username: res.username
        });
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      } else {
        setBotVerification({
          tested: true,
          valid: false,
          error: res.error || 'Invalid Bot Token'
        });
      }
    } finally {
      setIsCheckingBot(false);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(thresholdInput);
    setConfig(prev => ({
      ...prev,
      telegramToken: tokenInput.trim(),
      telegramChatId: chatIdInput.trim(),
      dropThreshold: isNaN(val) ? 0.90 : val
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
      {/* Visual 3-Step Setup Wizard Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-zinc-100 flex items-center space-x-2">
                <span>Connect to Telegram in 3 Steps</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300">
                  Quick Guide
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Receive instant notifications when TOTAL DROP &ge; {config.dropThreshold.toFixed(2)} on your phone or desktop.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowFullGuide(!showFullGuide)}
            className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center space-x-1"
          >
            <span>{showFullGuide ? 'Hide Steps' : 'Show Steps'}</span>
            {showFullGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showFullGuide && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            {/* Step 1 */}
            <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-mono font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1 font-semibold"
                >
                  <span>@BotFather</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <h4 className="text-xs font-bold text-zinc-200">
                Get Your Bot Token
              </h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Open <strong className="text-blue-400">@BotFather</strong>, send <code className="text-zinc-200">/newbot</code>, give it a name and username. Copy the resulting HTTP API token.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-mono font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <a
                  href="https://t.me/userinfobot"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1 font-semibold"
                >
                  <span>@userinfobot</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <h4 className="text-xs font-bold text-zinc-200">
                Find Your Chat ID
              </h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Open <strong className="text-blue-400">@userinfobot</strong> and press Start. It tells you your numeric ID (e.g. <code className="text-zinc-200">123456789</code>).
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-mono font-bold text-xs flex items-center justify-center">
                  3
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                  IMPORTANT
                </span>
              </div>
              <h4 className="text-xs font-bold text-zinc-200">
                Press /start on Your Bot
              </h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Open the chat with <strong className="text-zinc-200">your new bot</strong> in Telegram and press <strong className="text-emerald-400">/start</strong>. Telegram security prevents bots from messaging users who haven&apos;t started them!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Configuration & Test Form */}
      <div className="p-6 rounded-3xl bg-zinc-950 border border-zinc-800 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div>
            <h3 className="text-base font-extrabold text-zinc-100 flex items-center space-x-2">
              <Settings className="w-4 h-4 text-emerald-400" />
              <span>Telegram Bot Credentials &amp; Live Verification</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Configure credentials here for live browser alerts or in <code className="text-zinc-300">.env</code> for the 24/7 Python bot.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onSendTestMessage}
              disabled={isSendingTest}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-950 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSendingTest ? 'Sending Test...' : 'Send Test Alert to Telegram'}</span>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Token */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-zinc-300">
                  Telegram Bot Token
                </label>
                {tokenInput && (
                  <button
                    type="button"
                    onClick={handleVerifyBotToken}
                    disabled={isCheckingBot}
                    className="text-[10px] text-blue-400 hover:underline flex items-center space-x-1"
                  >
                    {isCheckingBot ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Checking...</span>
                      </>
                    ) : (
                      <span>Verify Token</span>
                    )}
                  </button>
                )}
              </div>
              <input
                type="password"
                placeholder="e.g. 7123456789:ABCdefGhIJKlmNoPQRsTUVwX-Yz"
                value={tokenInput}
                onChange={(e) => {
                  setTokenInput(e.target.value);
                  setBotVerification({ tested: false });
                }}
                className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 font-mono"
              />
              {botVerification.tested && (
                <div className="mt-1.5 text-[11px] font-mono">
                  {botVerification.valid ? (
                    <span className="text-emerald-400 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Connected: @{botVerification.username} ({botVerification.botName})</span>
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center space-x-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{botVerification.error}</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Chat ID */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Telegram Chat ID
              </label>
              <input
                type="text"
                placeholder="e.g. 123456789 or @your_channel"
                value={chatIdInput}
                onChange={(e) => setChatIdInput(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 font-mono"
              />
              <span className="text-[10px] text-zinc-500 mt-1 block">Your numeric ID from @userinfobot</span>
            </div>

            {/* Threshold */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                DROP Threshold (TOTAL Section)
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  step="0.01"
                  min="0.10"
                  max="2.00"
                  value={thresholdInput}
                  onChange={(e) => setThresholdInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 font-mono font-bold focus:outline-none focus:border-emerald-500/60"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors whitespace-nowrap cursor-pointer shadow-sm"
                >
                  {saveSuccess ? 'Saved!' : 'Save Settings'}
                </button>
              </div>
              <span className="text-[10px] text-zinc-500 mt-1 block">Alert fires when DROP &ge; 0.90</span>
            </div>
          </div>
        </form>

        {/* Group / Channel Instructions */}
        <div className="p-4 bg-zinc-900/40 rounded-2xl border border-zinc-800 text-xs text-zinc-400 space-y-1.5">
          <div className="flex items-center space-x-1.5 text-zinc-300 font-semibold">
            <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
            <span>Sending alerts to a Telegram Group or Channel:</span>
          </div>
          <p className="leading-relaxed">
            To send alerts to a private group or public channel instead of your personal DM:
            1. Add your bot to the group or channel as an <strong className="text-zinc-200">Administrator</strong>.
            2. For public channels, use your channel handle (e.g. <code className="text-zinc-200">@my_odds_channel</code>) as the Chat ID.
            3. For private groups, forward a message from the group to <strong className="text-zinc-200">@RawDataBot</strong> to find the negative group ID (e.g. <code className="text-zinc-200">-1001234567890</code>).
          </p>
        </div>
      </div>

      {/* Live Alerts Feed */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <h3 className="text-base font-extrabold text-zinc-100">
              Triggered Drop Alerts Feed ({alerts.length})
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
              PRIMARY ≥ 0.90 | RE-ALERTS AT ≥ 1.10
            </span>
          </div>

          {alerts.length > 0 && (
            <button
              onClick={onClearAlerts}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-900 text-xs transition-colors self-start sm:self-auto"
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
              When any live game&apos;s horizontal DROP matrix column under the &quot;TOTAL&quot; section hits 0.90 or higher, an instant notification is logged and dispatched. If that game subsequently escalates to a drop value of 1.10 or greater, a secondary alert is dispatched.
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
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        DROP: {alert.dropValue.toFixed(2)} ≥ {alert.threshold.toFixed(2)}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        1/1 SENT (SUBSEQUENT MINUTES BLOCKED)
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
