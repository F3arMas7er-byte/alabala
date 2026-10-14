import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { LiveMonitor } from './components/LiveMonitor';
import { MatchDetailModal } from './components/MatchDetailModal';
import { TelegramAlerts } from './components/TelegramAlerts';
import { DeploymentGuide } from './components/DeploymentGuide';
import { CodeViewer } from './components/CodeViewer';
import { ConsoleLogs } from './components/ConsoleLogs';
import { TestSuiteModal } from './components/TestSuiteModal';
import { Match, BotAlert, BotConfig, LogEntry } from './types';
import { INITIAL_MATCHES, SAMPLE_CANDIDATE_GAMES } from './services/mockData';
import { generateBotZip, downloadBlob } from './botCode/files';
import { playAlertSound } from './services/sound';
import { sendTelegramMessage, formatTelegramHTML } from './services/telegram';
import confetti from 'canvas-confetti';

export default function App() {
  const [activeTab, setActiveTab] = useState<'monitor' | 'alerts' | 'save' | 'code' | 'logs'>('monitor');
  const [matches, setMatches] = useState<Match[]>(INITIAL_MATCHES);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
  const [isTestSuiteOpen, setIsTestSuiteOpen] = useState<boolean>(false);

  const [config, setConfig] = useState<BotConfig>({
    telegramToken: '8249195603:AAHwKdMhC8MUNN10rfoKpkNI5ka_33w3phs',
    telegramChatId: '2065059615',
    dropThreshold: 0.65,
    checkIntervalSeconds: 15,
    soundEnabled: true,
    autoScrollToAlert: true,
    filterHighDropsOnly: false,
  });

  // Seed initial alerts matching the 0.65+ matches in INITIAL_MATCHES
  const [alerts, setAlerts] = useState<BotAlert[]>([
    {
      id: 'alert-1',
      matchId: '36156592',
      matchName: 'Moravia (W) vs Municipal Pococi (W)',
      league: 'Primera Division Women',
      country: 'Costa Rica',
      score: '0:1',
      minute: 79,
      dropValue: 0.72,
      threshold: 0.65,
      line: 'Over 2.5',
      odd: 1.42,
      timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      telegramStatus: 'SENT',
      link: 'https://dropping-odds.com/event.php?id=36156592&t=total',
    },
    {
      id: 'alert-2',
      matchId: '36108425',
      matchName: 'Karsiyaka SK vs Erbaaspor',
      league: '3. Lig Group 2',
      country: 'Turkey',
      score: '1:1',
      minute: 84,
      dropValue: 0.68,
      threshold: 0.65,
      line: 'Over 2.5',
      odd: 1.45,
      timestamp: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
      telegramStatus: 'SENT',
      link: 'https://dropping-odds.com/event.php?id=36108425&t=total',
    },
  ]);

  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'log-1',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toLocaleTimeString(),
      level: 'INFO',
      message: 'OddsMonitor initialized: target=https://dropping-odds.com/index.php?view=live',
    },
    {
      id: 'log-2',
      timestamp: new Date(Date.now() - 14 * 60 * 1000).toLocaleTimeString(),
      level: 'INFO',
      message: 'Filtering section: "Dropping Odds" (COUNTRY, LEAGUE, HOME, SCORE, AWAY, TIME)',
    },
    {
      id: 'log-3',
      timestamp: new Date(Date.now() - 11 * 60 * 1000).toLocaleTimeString(),
      level: 'ALERT',
      message: '🚨 High Drop Detected! Match #36108425 Karsiyaka SK (Min: 84\') DROP: 0.68 >= 0.65',
    },
    {
      id: 'log-4',
      timestamp: new Date(Date.now() - 4 * 60 * 1000).toLocaleTimeString(),
      level: 'ALERT',
      message: '🚨 High Drop Detected! Match #36156592 Moravia (W) (Min: 79\') DROP: 0.72 >= 0.65',
    },
    {
      id: 'log-5',
      timestamp: new Date().toLocaleTimeString(),
      level: 'INFO',
      message: 'Tracking 6 live active matches in "Dropping Odds" section.',
    },
  ]);

  // Keep alerted keys set in ref to prevent duplicate alerts for the same (matchId, minute)
  const alertedKeysRef = useRef<Set<string>>(
    new Set(['36156592-79', '36108425-84', '36199411-71'])
  );

  const addLog = (level: LogEntry['level'], message: string, matchId?: string) => {
    setLogs((prev) => [
      ...prev.slice(-150),
      {
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: new Date().toLocaleTimeString(),
        level,
        message,
        matchId,
      },
    ]);
  };

  // 24/7 background worker simulation cycle
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(async () => {
      setIsScanning(true);

      // Simulate match minute advances
      setMatches((currentMatches) => {
        return currentMatches.map((match) => {
          // Advance minute randomly
          const shouldAdvance = Math.random() > 0.4;
          if (!shouldAdvance) return match;

          const nextMinute = match.currentMinute + 1;
          if (nextMinute > 90) return match;

          // Compute slight drift or drop shift
          const dropDelta = (Math.random() * 0.04) - 0.01;
          const newDrop = Math.max(0.05, parseFloat((match.currentDrop + dropDelta).toFixed(2)));
          const newOdd = Math.max(1.05, parseFloat((match.currentOdd - (dropDelta * 0.4)).toFixed(2)));

          const newHistory = [
            ...match.history,
            {
              minute: nextMinute,
              drop: newDrop,
              totalLine: match.line,
              odd: newOdd,
            },
          ];

          // Check if this new minute drop triggers threshold
          const dedupKey = `${match.id}-${nextMinute}`;
          if (newDrop >= config.dropThreshold && !alertedKeysRef.current.has(dedupKey)) {
            alertedKeysRef.current.add(dedupKey);

            // Trigger Alert
            const newAlert: BotAlert = {
              id: `alert-${Date.now()}-${match.id}`,
              matchId: match.id,
              matchName: `${match.homeTeam} vs ${match.awayTeam}`,
              league: match.league,
              country: match.country,
              score: match.score,
              minute: nextMinute,
              dropValue: newDrop,
              threshold: config.dropThreshold,
              line: match.line,
              odd: newOdd,
              timestamp: new Date().toISOString(),
              telegramStatus: config.telegramToken ? 'PENDING' : 'SIMULATED',
              link: `https://dropping-odds.com/event.php?id=${match.id}&t=total`,
            };

            setAlerts((prevAlerts) => [newAlert, ...prevAlerts]);
            addLog(
              'ALERT',
              `🚨 High Drop Triggered! ${match.homeTeam} vs ${match.awayTeam} (Min: ${nextMinute}') DROP: ${newDrop.toFixed(2)} >= ${config.dropThreshold.toFixed(2)}`,
              match.id
            );

            if (config.soundEnabled) {
              playAlertSound(0.35);
            }

            // Dispatch to real Telegram if token is set
            if (config.telegramToken && config.telegramChatId) {
              const html = formatTelegramHTML(newAlert);
              sendTelegramMessage(config.telegramToken, config.telegramChatId, html).then(
                (res) => {
                  setAlerts((latestAlerts) =>
                    latestAlerts.map((a) =>
                      a.id === newAlert.id
                        ? {
                            ...a,
                            telegramStatus: res.success ? 'SENT' : 'FAILED',
                            telegramError: res.error,
                          }
                        : a
                    )
                  );
                  if (res.success) {
                    addLog('SUCCESS', `Telegram notification delivered to chat ${config.telegramChatId}`);
                  } else {
                    addLog('ERROR', `Telegram delivery failed: ${res.error}`);
                  }
                }
              );
            }
          }

          return {
            ...match,
            currentMinute: nextMinute,
            time: `${nextMinute}:00`,
            currentDrop: newDrop,
            currentOdd: newOdd,
            history: newHistory,
          };
        });
      });

      setTimeout(() => setIsScanning(false), 800);
    }, config.checkIntervalSeconds * 1000);

    return () => clearInterval(interval);
  }, [isRunning, config]);

  // Simulate new match arrival
  const handleSimulateNewMatch = () => {
    const candidate = SAMPLE_CANDIDATE_GAMES[Math.floor(Math.random() * SAMPLE_CANDIDATE_GAMES.length)];
    const newId = String(36200000 + Math.floor(Math.random() * 90000));

    const newMatch: Match = {
      id: newId,
      country: candidate.country,
      league: candidate.league,
      homeTeam: candidate.homeTeam,
      awayTeam: candidate.awayTeam,
      score: candidate.score,
      time: "12:30",
      currentMinute: 13,
      isNew: true,
      status: 'LIVE',
      currentDrop: 0.18,
      line: candidate.line,
      initialOdd: candidate.initialOdd,
      currentOdd: candidate.initialOdd - 0.1,
      link: `https://dropping-odds.com/event.php?id=${newId}&t=total`,
      history: [
        { minute: 5, drop: 0.06, totalLine: candidate.line, odd: candidate.initialOdd },
        { minute: 10, drop: 0.12, totalLine: candidate.line, odd: candidate.initialOdd - 0.05 },
        { minute: 13, drop: 0.18, totalLine: candidate.line, odd: candidate.initialOdd - 0.10 },
      ],
    };

    setMatches((prev) => [newMatch, ...prev]);
    addLog(
      'SUCCESS',
      `🟢 [NEW GAME ARRIVED] ${newMatch.homeTeam} vs ${newMatch.awayTeam} (${newMatch.country} - ${newMatch.league}) Time: ${newMatch.time}`,
      newId
    );
  };

  // Simulate match removal (finished game)
  const handleSimulateRemoveMatch = () => {
    if (matches.length <= 2) return;
    const removed = matches[matches.length - 1];
    setMatches((prev) => prev.slice(0, prev.length - 1));
    addLog(
      'INFO',
      `🔴 [GAME FINISHED & REMOVED] ${removed.homeTeam} vs ${removed.awayTeam} (${removed.score})`,
      removed.id
    );
  };

  // Simulate drop spike (e.g. 0.78)
  const handleSimulateSpike = (matchId: string, customDrop: number = 0.78) => {
    setMatches((prev) =>
      prev.map((m) => {
        if (m.id !== matchId) return m;

        const nextMin = m.currentMinute + 1;
        const newHistory = [
          ...m.history,
          {
            minute: nextMin,
            drop: customDrop,
            totalLine: m.line,
            odd: Math.max(1.1, m.currentOdd - 0.25),
          },
        ];

        const dedupKey = `${m.id}-${nextMin}`;
        if (!alertedKeysRef.current.has(dedupKey)) {
          alertedKeysRef.current.add(dedupKey);

          const alertObj: BotAlert = {
            id: `alert-spike-${Date.now()}`,
            matchId: m.id,
            matchName: `${m.homeTeam} vs ${m.awayTeam}`,
            league: m.league,
            country: m.country,
            score: m.score,
            minute: nextMin,
            dropValue: customDrop,
            threshold: config.dropThreshold,
            line: m.line,
            odd: Math.max(1.1, m.currentOdd - 0.25),
            timestamp: new Date().toISOString(),
            telegramStatus: config.telegramToken ? 'PENDING' : 'SIMULATED',
            link: `https://dropping-odds.com/event.php?id=${m.id}&t=total`,
          };

          setAlerts((prevA) => [alertObj, ...prevA]);
          addLog(
            'ALERT',
            `🚨 [SPIKE TEST] ${m.homeTeam} vs ${m.awayTeam} (Min: ${nextMin}') DROP: ${customDrop.toFixed(2)} >= ${config.dropThreshold.toFixed(2)}`,
            m.id
          );

          if (config.soundEnabled) {
            playAlertSound(0.4);
          }

          if (config.telegramToken && config.telegramChatId) {
            const html = formatTelegramHTML(alertObj);
            sendTelegramMessage(config.telegramToken, config.telegramChatId, html).then(
              (res) => {
                setAlerts((latest) =>
                  latest.map((a) =>
                    a.id === alertObj.id
                      ? {
                          ...a,
                          telegramStatus: res.success ? 'SENT' : 'FAILED',
                          telegramError: res.error,
                        }
                      : a
                  )
                );
              }
            );
          }
        }

        return {
          ...m,
          currentMinute: nextMin,
          time: `${nextMin}:00`,
          currentDrop: customDrop,
          currentOdd: Math.max(1.1, m.currentOdd - 0.25),
          history: newHistory,
        };
      })
    );
  };

  // Test telegram sender button
  const handleSendTestMessage = async () => {
    setIsSendingTest(true);
    try {
      const text =
        `✅ <b>Dropping-Odds 24/7 Sentinel Bot Test</b>\n\n` +
        `Your Telegram integration is online and active!\n` +
        `The bot will automatically dispatch alerts whenever any live match in the <b>"TOTAL"</b> section records a <b>DROP ≥ ${config.dropThreshold.toFixed(2)}</b>.`;

      const res = await sendTelegramMessage(config.telegramToken, config.telegramChatId, text);
      if (res.success) {
        addLog('SUCCESS', `Telegram test message successfully delivered!`);
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
      } else {
        addLog('ERROR', `Telegram test message failed: ${res.error}`);
      }
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleDownloadZip = async () => {
    const blob = await generateBotZip();
    downloadBlob(blob, 'dropping_odds_bot.zip');
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    addLog('INFO', 'Downloaded dropping_odds_bot.zip with all 13 production files.');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500 selection:text-zinc-950">
      {/* Top Header Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        config={config}
        setConfig={setConfig}
        isRunning={isRunning}
        setIsRunning={setIsRunning}
        onDownloadZip={handleDownloadZip}
        onOpenTestSuite={() => setIsTestSuiteOpen(true)}
        alertCount={alerts.length}
        activeMatchCount={matches.length}
      />

      {/* Quick Interactive Testing Banner */}
      <div className="bg-zinc-900/60 border-b border-zinc-800/80 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-zinc-300">Quick Test Controls:</span>
            <span className="text-zinc-500 hidden sm:inline">&mdash; Test DROP &ge; 0.65 alert, table parsing, and Telegram dispatcher:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsTestSuiteOpen(true)}
              className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <span>🧪 Run 7 Automated Tests</span>
            </button>

            <button
              onClick={() => {
                if (matches.length > 0) {
                  handleSimulateSpike(matches[0].id, 0.78);
                }
              }}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer"
            >
              <span>⚡ Trigger 0.78 Spike</span>
            </button>

            <button
              onClick={handleSimulateNewMatch}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-xs font-semibold transition-all cursor-pointer"
            >
              <span>🟢 Arrive Game</span>
            </button>

            <button
              onClick={handleSendTestMessage}
              disabled={isSendingTest}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-blue-300 border border-zinc-700 text-xs font-semibold transition-all cursor-pointer"
            >
              <span>📩 Test Telegram</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'monitor' && (
          <LiveMonitor
            matches={matches}
            threshold={config.dropThreshold}
            onSelectMatch={(m) => setSelectedMatch(m)}
            onSimulateNewMatch={handleSimulateNewMatch}
            onSimulateRemoveMatch={handleSimulateRemoveMatch}
            onSimulateSpike={handleSimulateSpike}
            isScanning={isScanning}
          />
        )}

        {activeTab === 'alerts' && (
          <TelegramAlerts
            alerts={alerts}
            config={config}
            setConfig={setConfig}
            onClearAlerts={() => setAlerts([])}
            onSendTestMessage={handleSendTestMessage}
            isSendingTest={isSendingTest}
          />
        )}

        {activeTab === 'save' && (
          <DeploymentGuide />
        )}

        {activeTab === 'code' && (
          <CodeViewer />
        )}

        {activeTab === 'logs' && (
          <ConsoleLogs
            logs={logs}
            onClearLogs={() => setLogs([])}
            isRunning={isRunning}
            onToggleRunning={() => setIsRunning(!isRunning)}
          />
        )}
      </main>

      {/* Match Detail Modal (TOTAL Sub-Page & Horizontal Graph) */}
      <MatchDetailModal
        match={selectedMatch}
        onClose={() => setSelectedMatch(null)}
        threshold={config.dropThreshold}
        onSimulateSpike={handleSimulateSpike}
      />

      {/* Automated Test Suite Modal */}
      <TestSuiteModal
        isOpen={isTestSuiteOpen}
        onClose={() => setIsTestSuiteOpen(false)}
        onTriggerSpike={() => {
          if (matches.length > 0) {
            handleSimulateSpike(matches[0].id, 0.78);
          }
        }}
        onTriggerNewMatch={handleSimulateNewMatch}
        onSendTelegramTest={handleSendTestMessage}
      />
    </div>
  );
}
