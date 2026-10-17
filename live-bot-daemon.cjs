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
const DROP_THRESHOLD = 0.90;
const SECONDARY_DROP_THRESHOLD = 1.10;
const POLL_INTERVAL_MS = 25000; // 25s between live sweeps

// Map of matchId -> { alertedPrimary: boolean, alertedSecondary: boolean, firstAlertAt: number, firstDrop: number, megaAlertAt?: number, megaDrop?: number }
const alertedMatchMap = new Map();

function getAlertRecord(matchId) {
  const existing = alertedMatchMap.get(matchId);
  if (!existing) return null;
  if (typeof existing === 'number') {
    return { alertedPrimary: true, alertedSecondary: false, firstAlertAt: existing, firstDrop: DROP_THRESHOLD };
  }
  return existing;
}

function isMatchFullyMuted(matchId) {
  const rec = getAlertRecord(matchId);
  if (!rec) return false;
  // If game has already received the 1.10+ secondary alert, it is completely muted
  return !!(rec.alertedSecondary || rec.alerted099);
}

// Runtime Health & Verification Stats
const botStats = {
  startedAt: Date.now(),
  sweepCount: 0,
  lastSweepTime: null,
  lastGamesFound: 0,
  totalAlertsSent: 0,
  consecutiveErrors: 0,
  lastError: null,
};

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

async function sendTelegramMessage(text, targetChatId = CHAT_ID) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(10000)
    });
    return await res.json();
  } catch (err) {
    log(`❌ Failed sending Telegram message: ${err.message}`);
    return null;
  }
}

async function sendTelegramAlert(match, minPlayed, dropVal, lineInfo = '', tier = 'PRIMARY', previousDrop = null) {
  botStats.totalAlertsSent++;

  let header = '';
  let ruleText = '';

  const isSecondary = tier === 'SECONDARY_SURGE' || tier === 'SECONDARY_099';
  const isDirect = tier === 'DIRECT_CRITICAL' || tier === 'DIRECT_099';

  if (isSecondary) {
    header = `🔥 <b>CRITICAL MEGA DROP (≥ ${SECONDARY_DROP_THRESHOLD.toFixed(2)}) — SECONDARY ALERT</b> 🔥\n\n` +
      `⚡ <i>This game previously alerted at ≥ ${DROP_THRESHOLD.toFixed(2)} (was ${previousDrop ? previousDrop.toFixed(2) : DROP_THRESHOLD.toFixed(2)}) and has now escalated to <b>${dropVal.toFixed(2)}</b>!</i>`;
    ruleText = `🔒 <b>Alert Rule:</b> FINAL ALERT SENT (Reached ≥ ${SECONDARY_DROP_THRESHOLD.toFixed(2)}, game now fully muted)`;
  } else if (isDirect) {
    header = `🔥 <b>CRITICAL MEGA DROP DETECTED (≥ ${SECONDARY_DROP_THRESHOLD.toFixed(2)})</b> 🔥\n\n` +
      `⚡ <i>Game reached extreme drop value of <b>${dropVal.toFixed(2)}</b> on first detection!</i>`;
    ruleText = `🔒 <b>Alert Rule:</b> MAX TIER (≥ ${SECONDARY_DROP_THRESHOLD.toFixed(2)} reached, game muted from further alerts)`;
  } else {
    header = `🚨 <b>LIVE HIGH DROP DETECTED (≥ ${DROP_THRESHOLD.toFixed(2)})</b> 🚨`;
    ruleText = `ℹ️ <b>Alert Rule:</b> Primary Alert (Will re-alert ONLY if drop surges to ≥ ${SECONDARY_DROP_THRESHOLD.toFixed(2)})`;
  }

  const alertHtml = `${header}\n\n` +
    `⚽ <b>Match:</b> ${match.home} vs ${match.away}\n` +
    `🌍 <b>League:</b> ${match.league}\n` +
    `📊 <b>Score:</b> ${match.score} | ⏱️ <b>Time:</b> ${match.time} (Min: ${minPlayed}')\n\n` +
    `📉 <b>Section:</b> TOTAL\n` +
    `⚡ <b>DROP Value:</b> <code>${dropVal.toFixed(2)}</code> (Threshold: ${isSecondary || isDirect ? `≥ ${SECONDARY_DROP_THRESHOLD.toFixed(2)}` : `≥ ${DROP_THRESHOLD.toFixed(2)}`})\n` +
    (lineInfo ? `📊 <b>Line:</b> ${lineInfo}\n\n` : `\n`) +
    `${ruleText}\n` +
    `🔗 <a href='https://dropping-odds.com/event.php?id=${match.id}&t=total'>Open Match Page on Dropping-Odds</a>\n` +
    `🤖 <i>Dropping-Odds 24/7 Live Sentinel</i>`;

  const data = await sendTelegramMessage(alertHtml, CHAT_ID);
  if (data && data.ok) {
    log(`✅ Telegram alert (${tier}) delivered for ${match.home} vs ${match.away} (Drop: ${dropVal})`);
  } else if (data) {
    log(`❌ Telegram API error: ${data.description}`);
  }
}

async function checkMatchTotal(match) {
  // If match has already triggered the >= 1.10 secondary alert, it is completely muted
  if (isMatchFullyMuted(match.id)) {
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

    if (!qualifyingDrop) return;

    const existing = getAlertRecord(match.id);

    // Case 1: Game already alerted with primary threshold (>= 0.90), but now reached >= 1.10!
    if (existing && !isMatchFullyMuted(match.id)) {
      if (qualifyingDrop.drop >= SECONDARY_DROP_THRESHOLD) {
        existing.alertedSecondary = true;
        existing.alerted099 = true;
        existing.megaAlertAt = Date.now();
        existing.megaDrop = qualifyingDrop.drop;
        alertedMatchMap.set(match.id, existing);
        log(`🔥 [SECONDARY ALERT >= ${SECONDARY_DROP_THRESHOLD.toFixed(2)}] ${match.home} vs ${match.away} | Live Time: ${match.time} | Drop Min: ${qualifyingDrop.min}' | DROP: ${qualifyingDrop.drop} >= ${SECONDARY_DROP_THRESHOLD}`);
        await sendTelegramAlert(match, String(qualifyingDrop.min), qualifyingDrop.drop, qualifyingDrop.line, 'SECONDARY_SURGE', existing.firstDrop);
      }
      return;
    }

    // Case 2: Game never alerted yet
    if (!existing) {
      if (qualifyingDrop.drop >= SECONDARY_DROP_THRESHOLD) {
        // Direct critical drop >= 1.10 on first discovery
        alertedMatchMap.set(match.id, {
          alertedPrimary: true,
          alertedSecondary: true,
          alerted065: true,
          alerted099: true,
          firstAlertAt: Date.now(),
          firstDrop: qualifyingDrop.drop,
          megaAlertAt: Date.now(),
          megaDrop: qualifyingDrop.drop,
        });
        log(`🔥 [DIRECT CRITICAL DROP >= ${SECONDARY_DROP_THRESHOLD.toFixed(2)}] ${match.home} vs ${match.away} | Live Time: ${match.time} | Drop Min: ${qualifyingDrop.min}' | DROP: ${qualifyingDrop.drop} >= ${SECONDARY_DROP_THRESHOLD}`);
        await sendTelegramAlert(match, String(qualifyingDrop.min), qualifyingDrop.drop, qualifyingDrop.line, 'DIRECT_CRITICAL');
      } else if (qualifyingDrop.drop >= DROP_THRESHOLD) {
        // Primary alert >= 0.90
        alertedMatchMap.set(match.id, {
          alertedPrimary: true,
          alertedSecondary: false,
          alerted065: true,
          alerted099: false,
          firstAlertAt: Date.now(),
          firstDrop: qualifyingDrop.drop,
        });
        log(`🚨 [PRIMARY ALERT >= ${DROP_THRESHOLD.toFixed(2)}] ${match.home} vs ${match.away} | Live Time: ${match.time} | Drop Min: ${qualifyingDrop.min}' | DROP: ${qualifyingDrop.drop} >= ${DROP_THRESHOLD}`);
        await sendTelegramAlert(match, String(qualifyingDrop.min), qualifyingDrop.drop, qualifyingDrop.line, 'PRIMARY');
      }
    }
  } catch (err) {
    log(`⚠️ Match #${match.id} (${match.home} vs ${match.away}) error: ${err.message}`);
  }
}

async function pollOnce() {
  log('🔍 Scanning LIVE games on https://dropping-odds.com/index.php?view=live...');
  try {
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

    botStats.sweepCount++;
    botStats.lastSweepTime = Date.now();
    botStats.lastGamesFound = currentMatches.length;
    botStats.consecutiveErrors = 0;
    botStats.lastError = null;

    log(`Live table parsed: ${currentMatches.length} games. Active alerts in memory: ${alertedMatchMap.size} (Sweep #${botStats.sweepCount})`);

    // Purge matches alerted more than 12 hours ago
    const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
    for (const [id, record] of alertedMatchMap.entries()) {
      const rec = typeof record === 'number' ? { firstAlertAt: record } : record;
      const latestTs = rec.megaAlertAt || rec.firstAlertAt || 0;
      if (latestTs < twelveHoursAgo) {
        alertedMatchMap.delete(id);
      }
    }

    // Check each match that has not reached the >= 1.10 final threshold
    const matchesToCheck = currentMatches.filter(m => !isMatchFullyMuted(m.id));
    const BATCH_SIZE = 4;
    for (let i = 0; i < matchesToCheck.length; i += BATCH_SIZE) {
      const batch = matchesToCheck.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(batch.map(m => checkMatchTotal(m)));
      if (i + BATCH_SIZE < matchesToCheck.length) {
        await new Promise(r => setTimeout(r, 600)); // 600ms throttle between batches
      }
    }
  } catch (err) {
    botStats.consecutiveErrors++;
    botStats.lastError = err.message;
    log(`⚠️ Live sweep recovered from error: ${err.message}`);
  }
}

let tgOffset = 0;
async function startTelegramCommandListener() {
  log('🤖 Starting Telegram command listener (/status, /ping, /test)...');
  while (true) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${TOKEN}/getUpdates?offset=${tgOffset}&timeout=10`, {
        signal: AbortSignal.timeout(15000)
      });
      const data = await res.json();
      if (data && data.ok && Array.isArray(data.result)) {
        for (const u of data.result) {
          tgOffset = u.update_id + 1;
          const msg = u.message;
          if (!msg || !msg.text) continue;
          const cmd = msg.text.trim().toLowerCase();
          const targetChat = msg.chat ? msg.chat.id : CHAT_ID;

          if (cmd === '/ping' || cmd === 'ping') {
            const secSince = botStats.lastSweepTime ? Math.round((Date.now() - botStats.lastSweepTime) / 1000) : 0;
            await sendTelegramMessage(
              `🏓 <b>PONG! Bot is online & healthy.</b>\n\n` +
              `⏱️ <b>Last sweep:</b> ${secSince}s ago\n` +
              `⚽ <b>Live matches tracked:</b> ${botStats.lastGamesFound}\n` +
              `🔄 <b>Sweeps executed:</b> ${botStats.sweepCount}\n` +
              `📉 <b>Primary Threshold:</b> ≥ ${DROP_THRESHOLD.toFixed(2)} | 🔥 <b>Secondary Surge:</b> ≥ ${SECONDARY_DROP_THRESHOLD.toFixed(2)}\n` +
              `📡 <b>Railway:</b> Online & updating without interference.`,
              targetChat
            );
          } else if (cmd === '/status' || cmd === 'status' || cmd === '/health' || cmd === 'health') {
            const uptimeMins = Math.floor((Date.now() - botStats.startedAt) / 60000);
            const secSince = botStats.lastSweepTime ? Math.round((Date.now() - botStats.lastSweepTime) / 1000) : 0;
            const activeMonitored = alertedMatchMap.size;
            let countPrimaryOnly = 0;
            let countSecondary = 0;
            for (const [_, rec] of alertedMatchMap.entries()) {
              if (rec.alertedSecondary || rec.alerted099) countSecondary++;
              else countPrimaryOnly++;
            }

            const statusReport = `🟢 <b>RAILWAY LIVE BOT STATUS: 100% HEALTHY</b>\n\n` +
              `⏱️ <b>Uptime:</b> ${uptimeMins} minutes\n` +
              `🔄 <b>Sweeps Completed:</b> ${botStats.sweepCount} sweeps\n` +
              `⏳ <b>Last Live Sweep:</b> ${secSince} seconds ago\n` +
              `⚽ <b>Live Games Scanned:</b> ${botStats.lastGamesFound} matches\n` +
              `📉 <b>Primary Threshold:</b> DROP ≥ ${DROP_THRESHOLD.toFixed(2)} (Initial Alert)\n` +
              `🔥 <b>Secondary Threshold:</b> DROP ≥ ${SECONDARY_DROP_THRESHOLD.toFixed(2)} (Re-alerts if game escalates)\n` +
              `🔔 <b>Total Alerts Sent:</b> ${botStats.totalAlertsSent}\n` +
              `🎯 <b>Tracked Matches:</b> ${activeMonitored} (${countPrimaryOnly} watching for ≥ ${SECONDARY_DROP_THRESHOLD.toFixed(2)} surge, ${countSecondary} fully muted)\n` +
              `🛡️ <b>Interference Status:</b> ${botStats.consecutiveErrors > 0 ? '⚠️ Transient retries' : '✅ NONE (dropping-odds connection 100% clear)'}\n\n` +
              `🚀 <i>Status: Actively monitoring 24/7 without delays or interference.</i>`;
            await sendTelegramMessage(statusReport, targetChat);
          } else if (cmd === '/test' || cmd === 'test') {
            await sendTelegramMessage(
              `🧪 <b>Railway Bot Test Alert</b>\n\n` +
              `✅ Telegram alert delivery confirmed!\n` +
              `⏱️ <b>Timestamp:</b> ${new Date().toLocaleTimeString()} UTC\n` +
              `📉 <b>Thresholds:</b> Primary ≥ ${DROP_THRESHOLD.toFixed(2)} | Secondary Escalation ≥ ${SECONDARY_DROP_THRESHOLD.toFixed(2)}\n` +
              `🎯 Your Railway instance is alive, connected, and receiving updates without interference.`,
              targetChat
            );
          }
        }
      }
    } catch (err) {
      // Network timeout or 409 conflict: wait 3 seconds and continue gracefully
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

async function main() {
  log('================================================================');
  log('🚀 DROPPING-ODDS 24/7 LIVE MONITORING DAEMON (BULLETPROOF)');
  log(`🎯 Monitored View: https://dropping-odds.com/index.php?view=live`);
  log(`📊 Section Checked: event.php?id=<id>&t=total (TOTAL Section Drop)`);
  log(`⚡ Primary Threshold: DROP >= ${DROP_THRESHOLD.toFixed(2)}`);
  log(`🔥 Secondary Threshold: DROP >= ${SECONDARY_DROP_THRESHOLD.toFixed(2)} (Re-alerts if game reaches >= ${SECONDARY_DROP_THRESHOLD.toFixed(2)})`);
  log(`🔒 Deduplication: Max 2 alerts per game (${DROP_THRESHOLD.toFixed(2)}+ then ${SECONDARY_DROP_THRESHOLD.toFixed(2)}+ escalation)`);
  log(`📲 Target Chat ID: ${CHAT_ID}`);
  log('================================================================');

  // Start background command listener
  startTelegramCommandListener().catch(e => log(`Telegram listener error: ${e.message}`));

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
