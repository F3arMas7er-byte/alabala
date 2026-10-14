/**
 * Dropping-Odds 24/7 Live Monitoring Daemon
 * Continuously scrapes https://dropping-odds.com/index.php?view=live
 * Checks EVERY match in the LIVE section with no exceptions
 * Follows match link to event.php?id=<id>&t=total
 * Checks TOTAL section for DROP >= 0.65
 * Sends EXACTLY 1 Telegram alert per game
 */

process.on('uncaughtException', (err) => {
  console.error('[FATAL CAUGHT] Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL CAUGHT] Unhandled rejection:', reason);
});

const TOKEN = '8249195603:AAHwKdMhC8MUNN10rfoKpkNI5ka_33w3phs';
const CHAT_ID = '2065059615';
const DROP_THRESHOLD = 0.65;
const POLL_INTERVAL_MS = 20000; // 20s

const alertedMatchIds = new Set(['13292943', '13288087']);

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

async function sendTelegramAlert(match, minPlayed, dropVal) {
  const alertHtml = `🚨 <b>LIVE HIGH DROP DETECTED (≥ ${DROP_THRESHOLD.toFixed(2)})</b> 🚨\n\n` +
    `⚽ <b>Match:</b> ${match.home} vs ${match.away}\n` +
    `🌍 <b>League:</b> ${match.league}\n` +
    `📊 <b>Score:</b> ${match.score} | ⏱️ <b>Time:</b> ${match.time} (Min: ${minPlayed}')\n\n` +
    `📉 <b>Section:</b> TOTAL\n` +
    `⚡ <b>DROP Value:</b> <code>${dropVal.toFixed(2)}</code> (Threshold: ${DROP_THRESHOLD.toFixed(2)})\n\n` +
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
      log(`❌ Telegram error: ${data.description}`);
    }
  } catch (err) {
    log(`❌ Failed sending Telegram alert: ${err.message}`);
  }
}

async function pollOnce() {
  log('🔍 Scanning live games on https://dropping-odds.com/index.php?view=live...');
  const liveRes = await fetch('https://dropping-odds.com/index.php?view=live', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
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

  log(`Found ${currentMatches.length} live games in Dropping Odds section.`);

  // Clean up finished games that left the live table
  for (const id of alertedMatchIds) {
    if (!currentMatches.some(m => m.id === id)) {
      alertedMatchIds.delete(id);
    }
  }

  // Check each match's TOTAL section
  for (const match of currentMatches) {
    if (alertedMatchIds.has(match.id)) {
      continue;
    }

    try {
      const totalUrl = `https://dropping-odds.com/event.php?id=${match.id}&t=total`;
      const totalRes = await fetch(totalUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(10000)
      });
      const totalHtml = await totalRes.text();

      const rowRegex = /<tr>[\s\S]*?<td class='hide'>[\s\S]*?<\/td>[\s\S]*?<td>(.*?)<\/td>[\s\S]*?<td>(.*?)<\/td>[\s\S]*?<td>(.*?)<\/td>[\s\S]*?<td>(.*?)<\/td>[\s\S]*?<td>(.*?)<\/td>[\s\S]*?<td class='(?:red\d|green\d)?'>(.*?)<\/td>/g;

      let rMatch;
      let highestDrop = -999;
      let highestMin = '';

      while ((rMatch = rowRegex.exec(totalHtml)) !== null) {
        const [__, mTime, mScore, over, hcap, under, dropStr] = rMatch;
        const dropVal = parseFloat(dropStr.trim().replace(',', '.'));
        const minVal = mTime.trim();

        if (!isNaN(dropVal) && dropVal >= DROP_THRESHOLD && minVal) {
          if (dropVal > highestDrop) {
            highestDrop = dropVal;
            highestMin = minVal;
          }
        }
      }

      if (highestDrop >= DROP_THRESHOLD && !alertedMatchIds.has(match.id)) {
        alertedMatchIds.add(match.id);
        log(`🚨 [1-ALERT-PER-GAME] ${match.home} vs ${match.away} | Min: ${highestMin}' | Highest DROP: ${highestDrop} >= ${DROP_THRESHOLD}`);
        await sendTelegramAlert(match, highestMin, highestDrop);
      }
    } catch (err) {
      log(`Note on match #${match.id}: ${err.message}`);
    }
  }
}

async function main() {
  log('==================================================');
  log('🚀 DROPPING-ODDS LIVE BACKGROUND SCRAPER STARTED (CRASH-PROOF)');
  log(`🎯 Monitored Target: https://dropping-odds.com/index.php?view=live`);
  log(`📊 Sub-Page Checked: event.php?id=<id>&t=total (TOTAL Drop)`);
  log(`⚡ Alert Threshold: DROP >= ${DROP_THRESHOLD}`);
  log(`📲 Recipient Chat ID: ${CHAT_ID}`);
  log('==================================================');

  while (true) {
    try {
      await pollOnce();
    } catch (err) {
      log(`Error in poll cycle (recovering): ${err.message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

main();
