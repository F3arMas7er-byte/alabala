import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOKEN = '8249195603:AAHwKdMhC8MUNN10rfoKpkNI5ka_33w3phs';
const CHAT_ID = '2065059615';
const DROP_THRESHOLD = 0.65;
const POLL_INTERVAL_MS = 25000;

interface LiveMatch {
  id: string;
  league: string;
  home: string;
  score: string;
  away: string;
  time: string;
  currentDrop?: number;
  highestLine?: string;
  lastChecked?: string;
}

interface AlertRecord {
  id: string;
  matchId: string;
  matchName: string;
  league: string;
  score: string;
  minute: string;
  dropValue: number;
  threshold: number;
  line: string;
  timestamp: string;
  telegramStatus: 'SENT' | 'FAILED';
  link: string;
}

// 12-hour memory cache: matchId -> timestamp
const alertedMatchMap = new Map<string, number>();
let liveMatchesCache: LiveMatch[] = [];
const alertsHistory: AlertRecord[] = [];
let scanCount = 0;
let lastScanTimestamp: string | null = null;
let lastScanDurationMs = 0;
let botIsActive = true;

function log(msg: string) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

async function sendTelegramAlert(match: LiveMatch, minPlayed: string, dropVal: number, lineInfo: string = '') {
  const alertHtml = `🚨 <b>LIVE HIGH DROP DETECTED (≥ ${DROP_THRESHOLD.toFixed(2)})</b> 🚨\n\n` +
    `⚽ <b>Match:</b> ${match.home} vs ${match.away}\n` +
    `🌍 <b>League:</b> ${match.league}\n` +
    `📊 <b>Score:</b> ${match.score} | ⏱️ <b>Time:</b> ${match.time} (Min: ${minPlayed}')\n\n` +
    `📉 <b>Section:</b> TOTAL\n` +
    `⚡ <b>DROP Value:</b> <code>${dropVal.toFixed(2)}</code> (Threshold: ${DROP_THRESHOLD.toFixed(2)})\n` +
    (lineInfo ? `📊 <b>Line:</b> ${lineInfo}\n\n` : `\n`) +
    `🔒 <b>Alert Rule:</b> STRICT 1 ALERT PER GAME (Subsequent drops muted)\n` +
    `🔗 <a href='https://dropping-odds.com/event.php?id=${match.id}&t=total'>Open Match Page on Dropping-Odds</a>\n` +
    `🤖 <i>Dropping-Odds 24/7 Live Sentinel</i>`;

  let status: 'SENT' | 'FAILED' = 'FAILED';
  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: alertHtml,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }),
      signal: AbortSignal.timeout(10000)
    });
    const data = await res.json() as { ok: boolean; description?: string };
    if (data.ok) {
      status = 'SENT';
      log(`✅ Telegram alert delivered for ${match.home} vs ${match.away} (Drop: ${dropVal})`);
    } else {
      log(`❌ Telegram error: ${data.description}`);
    }
  } catch (err: any) {
    log(`❌ Failed sending Telegram alert: ${err.message}`);
  }

  alertsHistory.unshift({
    id: `alert-${Date.now()}-${match.id}`,
    matchId: match.id,
    matchName: `${match.home} vs ${match.away}`,
    league: match.league,
    score: match.score,
    minute: minPlayed,
    dropValue: dropVal,
    threshold: DROP_THRESHOLD,
    line: lineInfo || 'Total Over/Under',
    timestamp: new Date().toISOString(),
    telegramStatus: status,
    link: `https://dropping-odds.com/event.php?id=${match.id}&t=total`,
  });

  if (alertsHistory.length > 50) {
    alertsHistory.pop();
  }
}

async function checkMatchTotal(match: LiveMatch) {
  if (alertedMatchMap.has(match.id)) {
    return;
  }

  try {
    const totalUrl = `https://dropping-odds.com/event.php?id=${match.id}&t=total`;
    const totalRes = await fetch(totalUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(8000)
    });
    const totalHtml = await totalRes.text();

    const rowRegex = /<tr>[\s\S]*?<td class='hide'>[\s\S]*?<\/td>[\s\S]*?<td>(.*?)<\/td>[\s\S]*?<td>(.*?)<\/td>[\s\S]*?<td>(.*?)<\/td>[\s\S]*?<td>(.*?)<\/td>[\s\S]*?<td>(.*?)<\/td>[\s\S]*?<td class='(?:red\d|green\d)?'>(.*?)<\/td>/g;

    const matchMinNum = parseInt(match.time.replace(/[^0-9]/g, ''), 10) || 0;

    // Parse all rows into chronological list
    const entries: { min: number; drop: number; line: string; score: string }[] = [];
    while ((rMatch = rowRegex.exec(totalHtml)) !== null) {
      const [__, mTime, mScore, over, hcap, under, dropStr] = rMatch;
      const dropVal = parseFloat(dropStr.trim().replace(',', '.'));
      const minVal = parseInt(mTime.trim(), 10);
      if (!isNaN(dropVal) && !isNaN(minVal)) {
        entries.push({
          min: minVal,
          drop: dropVal,
          line: `Over ${hcap.trim()} (O: ${over.trim()}, U: ${under.trim()})`,
          score: mScore.trim(),
        });
      }
    }

    if (entries.length === 0) return;

    // Look at recent live entries (last 6 entries) to detect active live drops
    // and filter out stale historical drops from 10+ minutes ago (e.g. 37 min lag)
    const recentEntries = entries.slice(-6);
    let activeDrop = -999;
    let activeMin = '';
    let activeLine = '';

    for (let i = recentEntries.length - 1; i >= 0; i--) {
      const entry = recentEntries[i];
      if (entry.drop >= DROP_THRESHOLD) {
        if (matchMinNum > 15 && (matchMinNum - entry.min > 8)) {
          continue;
        }
        activeDrop = entry.drop;
        activeMin = String(entry.min);
        activeLine = entry.line;
        break;
      }
    }

    // Fallback: If match just kicked off (<= 15 min), check all entries
    if (activeDrop < DROP_THRESHOLD && matchMinNum <= 15) {
      for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i];
        if (entry.drop >= DROP_THRESHOLD) {
          activeDrop = entry.drop;
          activeMin = String(entry.min);
          activeLine = entry.line;
          break;
        }
      }
    }

    if (activeDrop > -999) {
      match.currentDrop = activeDrop;
      match.highestLine = activeLine;
    }

    if (activeDrop >= DROP_THRESHOLD && !alertedMatchMap.has(match.id)) {
      alertedMatchMap.set(match.id, Date.now());
      log(`🚨 [STRICT 1-ALERT] ${match.home} vs ${match.away} | Live Time: ${match.time} | Drop Min: ${activeMin}' | DROP: ${activeDrop} >= ${DROP_THRESHOLD}`);
      await sendTelegramAlert(match, activeMin, activeDrop, activeLine);
    }
  } catch (err) {
    // Network jitter or timeout
  }
}

async function runLiveScanCycle() {
  if (!botIsActive) return;

  const startMs = Date.now();
  try {
    const liveRes = await fetch('https://dropping-odds.com/index.php?view=live', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(12000)
    });
    const liveHtml = await liveRes.text();

    const matchRegex = /<tr class='a_link' game_id='(\d+)'>[\s\S]*?<td>.*?<\/td>[\s\S]*?<td class='hide'>(.*?)<\/td>[\s\S]*?<td>(.*?)<\/td>[\s\S]*?<td>(.*?)<\/td>[\s\S]*?<td>(.*?)<\/td>[\s\S]*?<td class='hide'>(.*?)<\/td>/g;

    const parsed: LiveMatch[] = [];
    let matchMatch;
    while ((matchMatch = matchRegex.exec(liveHtml)) !== null) {
      const [_, id, league, home, score, away, time] = matchMatch;
      parsed.push({
        id: id.trim(),
        league: league.trim(),
        home: home.trim(),
        score: score.trim(),
        away: away.trim(),
        time: time.trim(),
      });
    }

    liveMatchesCache = parsed;
    scanCount++;
    lastScanTimestamp = new Date().toISOString();
    lastScanDurationMs = Date.now() - startMs;

    // Prune alerts older than 12 hours
    const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
    for (const [id, ts] of alertedMatchMap.entries()) {
      if (ts < twelveHoursAgo) {
        alertedMatchMap.delete(id);
      }
    }

    // Inspect matches that haven't been alerted yet in gentle batches of 4
    const unalerted = parsed.filter(m => !alertedMatchMap.has(m.id));
    const BATCH_SIZE = 4;
    for (let i = 0; i < unalerted.length; i += BATCH_SIZE) {
      const batch = unalerted.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(batch.map(m => checkMatchTotal(m)));
      if (i + BATCH_SIZE < unalerted.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    }
  } catch (err: any) {
    log(`⚠️ Live sweep recovered from error: ${err.message}`);
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // REST API Endpoints
  app.get('/api/status', (req, res) => {
    res.json({
      online: true,
      botIsActive,
      scanCount,
      lastScanTimestamp,
      lastScanDurationMs,
      liveGamesCount: liveMatchesCache.length,
      alertedMatchCount: alertedMatchMap.size,
      alertedMatchIds: Array.from(alertedMatchMap.keys()),
      dropThreshold: DROP_THRESHOLD,
      chatId: CHAT_ID,
    });
  });

  app.get('/api/live-matches', (req, res) => {
    res.json({
      matches: liveMatchesCache,
      alertedMatchIds: Array.from(alertedMatchMap.keys()),
      lastScanTimestamp,
      scanCount,
    });
  });

  app.get('/api/alerts', (req, res) => {
    res.json({
      alerts: alertsHistory,
      count: alertsHistory.length,
    });
  });

  app.post('/api/bot/toggle', (req, res) => {
    botIsActive = !botIsActive;
    log(`Bot toggled: ${botIsActive ? 'ACTIVE' : 'PAUSED'}`);
    res.json({ botIsActive });
  });

  app.post('/api/test-telegram', async (req, res) => {
    try {
      const testMsg = `🧪 <b>Telegram Alert Test</b>\n\n` +
        `✅ Connection verified between Dropping-Odds Bot and your Telegram account.\n` +
        `⏱️ <b>Time:</b> ${new Date().toLocaleTimeString()}\n` +
        `🎯 <b>Rule:</b> 100% LIVE Games Checked | DROP ≥ 0.65 (Strict 1 Alert/Game)\n` +
        `🤖 <i>Dropping-Odds Sentinel Live</i>`;

      const tgRes = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: testMsg,
          parse_mode: 'HTML',
        }),
      });
      const data = await tgRes.json() as { ok: boolean; description?: string };
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Start continuous polling loop
  log('================================================================');
  log('🚀 SERVER EMBEDDED LIVE BOT STARTED');
  log(`🎯 Monitored View: https://dropping-odds.com/index.php?view=live`);
  log(`⚡ Alert Threshold: DROP >= ${DROP_THRESHOLD}`);
  log(`🔒 Deduplication: Strictly 1 Alert Per Game (12-hour memory)`);
  log('================================================================');

  // Initial scan immediately
  runLiveScanCycle();
  // Continuous recurring scan
  setInterval(runLiveScanCycle, POLL_INTERVAL_MS);

  // Vite middlewares in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`📡 Fullstack Server & Live Bot listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
