/**
 * Dropping-Odds 24/7 Live Monitoring Daemon
 * Continuously scrapes https://dropping-odds.com/index.php?view=live
 * Checks EVERY match in the LIVE section with no exceptions
 * Follows match link to event.php?id=<id>&t=total
 * Checks TOTAL section for DROP >= 0.65
 * Sends EXACTLY 1 Telegram alert per game (Strict Anti-Spam)
 */

const fs = require('fs');
const path = require('path');

process.on('uncaughtException', (err) => {
  console.error('[FATAL CAUGHT] Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL CAUGHT] Unhandled rejection:', reason);
});

// Single-instance process lock check
const PID_FILE = path.join('/tmp', 'live-bot-daemon.pid');
try {
  if (fs.existsSync(PID_FILE)) {
    const oldPid = parseInt(fs.readFileSync(PID_FILE, 'utf8'), 10);
    if (!isNaN(oldPid) && oldPid !== process.pid) {
      try {
        process.kill(oldPid, 0); // Check if alive
        console.log(`[INIT] Terminating previous daemon instance with PID ${oldPid}`);
        process.kill(oldPid, 'SIGTERM');
      } catch (e) {
        // Old process not running
      }
    }
  }
  fs.writeFileSync(PID_FILE, String(process.pid));
} catch (e) {
  // Ignore PID file errors
}

const TOKEN = '8249195603:AAHwKdMhC8MUNN10rfoKpkNI5ka_33w3phs';
const CHAT_ID = '2065059615';
const DROP_THRESHOLD = 0.65;
const POLL_INTERVAL_MS = 25000; // 25s between live sweeps

// Map of matchId -> timestamp alerted (retains for 12 hours to guarantee 1 alert per game)
const alertedMatchMap = new Map();

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

async function sendTelegramAlert(match, minPlayed, dropVal, lineInfo = '') {
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
    const data = await res.json();
    if (data.ok) {
      log(`✅ Telegram alert delivered for ${match.home} vs ${match.away} (Drop: ${dropVal})`);
    } else {
      log(`❌ Telegram API error: ${data.description}`);
    }
  } catch (err) {
    log(`❌ Failed sending Telegram alert: ${err.message}`);
  }
}

async function checkMatchTotal(match) {
  // STRICT RULE: Exactly 1 alert per game
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

    let rMatch;
    let qualifyingDrop = null;

    // Scan all table entries in TOTAL section for drops >= DROP_THRESHOLD
    while ((rMatch = rowRegex.exec(totalHtml)) !== null) {
      const [__, mTime, mScore, over, hcap, under, dropStr] = rMatch;
      const dropVal = parseFloat(dropStr.trim().replace(',', '.'));
      const minVal = parseInt(mTime.trim(), 10);

      if (!isNaN(dropVal) && dropVal >= DROP_THRESHOLD) {
        // Keep the highest drop detected for this game
        if (!qualifyingDrop || dropVal > qualifyingDrop.drop) {
          qualifyingDrop = {
            min: !isNaN(minVal) ? minVal : (mTime.trim() || match.time),
            drop: dropVal,
            line: `Over ${hcap.trim()} (O: ${over.trim()}, U: ${under.trim()})`,
            score: mScore.trim() || match.score,
          };
        }
      }
    }

    if (qualifyingDrop && !alertedMatchMap.has(match.id)) {
      alertedMatchMap.set(match.id, Date.now());
      log(`🚨 [STRICT 1-ALERT] ${match.home} vs ${match.away} | Live Time: ${match.time} | Drop Min: ${qualifyingDrop.min}' | DROP: ${qualifyingDrop.drop} >= ${DROP_THRESHOLD}`);
      await sendTelegramAlert(match, String(qualifyingDrop.min), qualifyingDrop.drop, qualifyingDrop.line);
    }
  } catch (err) {
    log(`⚠️ Match #${match.id} (${match.home} vs ${match.away}) error: ${err.message}`);
  }
}

async function pollOnce() {
  log('🔍 Scanning LIVE games on https://dropping-odds.com/index.php?view=live...');
  const liveRes = await fetch('https://dropping-odds.com/index.php?view=live', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    signal: AbortSignal.timeout(12000)
  });
  const liveHtml = await liveRes.text();

  const matchRegex = /<tr class='a_link' game_id='(\d+)'>[\s\S]*?<td>.*?<\/td>[\s\S]*?<td class='hide'>(.*?)<\/td>[\s\S]*?<td>(.*?)<\/td>[\s\S]*?<td>(.*?)<\/td>[\s\S]*?<td>(.*?)<\/td>[\s\S]*?<td class='hide'>(.*?)<\/td>/g;

  const currentMatches = [];
  let matchMatch;
  while ((matchMatch = matchRegex.exec(liveHtml)) !== null) {
    const [_, id, league, home, score, away, time] = matchMatch;
    currentMatches.push({
      id: id.trim(),
      league: league.trim(),
      home: home.trim(),
      score: score.trim(),
      away: away.trim(),
      time: time.trim(),
    });
  }

  log(`Live table parsed: ${currentMatches.length} games. Active alerts in memory: ${alertedMatchMap.size}`);

  // Purge matches alerted more than 12 hours ago
  const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
  for (const [id, ts] of alertedMatchMap.entries()) {
    if (ts < twelveHoursAgo) {
      alertedMatchMap.delete(id);
    }
  }

  // Check each match in batches of 4 concurrent requests with gentle pacing
  const matchesToCheck = currentMatches.filter(m => !alertedMatchMap.has(m.id));
  const BATCH_SIZE = 4;
  for (let i = 0; i < matchesToCheck.length; i += BATCH_SIZE) {
    const batch = matchesToCheck.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(batch.map(m => checkMatchTotal(m)));
    if (i + BATCH_SIZE < matchesToCheck.length) {
      await new Promise(r => setTimeout(r, 600)); // 600ms throttle between batches
    }
  }
}

async function main() {
  log('================================================================');
  log('🚀 DROPPING-ODDS 24/7 LIVE MONITORING DAEMON (BULLETPROOF)');
  log(`🎯 Monitored View: https://dropping-odds.com/index.php?view=live`);
  log(`📊 Section Checked: event.php?id=<id>&t=total (TOTAL Section Drop)`);
  log(`⚡ Alert Threshold: DROP >= ${DROP_THRESHOLD}`);
  log(`🔒 Deduplication: Strictly 1 Alert Per Game (12-hour memory)`);
  log(`📲 Target Chat ID: ${CHAT_ID}`);
  log('================================================================');

  while (true) {
    try {
      await pollOnce();
    } catch (err) {
      log(`⚠️ Live sweep recovered from error: ${err.message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

main();
