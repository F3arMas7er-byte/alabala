import { BotAlert } from '../types';

export function formatTelegramHTML(alert: BotAlert): string {
  return (
    `🚨 <b>HIGH DROP DETECTED (≥ ${alert.threshold.toFixed(2)})</b> 🚨\n\n` +
    `⚽ <b>Match:</b> ${alert.matchName}\n` +
    `🌍 <b>League:</b> ${alert.country} - ${alert.league}\n` +
    `📊 <b>Score:</b> ${alert.score} | ⏱️ <b>Time:</b> ${alert.minute}'\n\n` +
    `📉 <b>Section:</b> TOTAL\n` +
    `⚡ <b>DROP Value:</b> <code>${alert.dropValue.toFixed(2)}</code> (Threshold: ${alert.threshold.toFixed(2)})\n` +
    `📊 <b>Line:</b> ${alert.line} @ ${alert.odd.toFixed(2)}\n\n` +
    `🔗 <a href="${alert.link}">Open Match Page on Dropping-Odds</a>\n` +
    `🤖 <i>Dropping-Odds 24/7 Sentinel Bot</i>`
  );
}

export async function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string
): Promise<{ success: boolean; simulated?: boolean; error?: string }> {
  if (!token || !chatId || token.trim() === '' || chatId.trim() === '') {
    return {
      success: true,
      simulated: true,
      error: 'Simulated (Configure Bot Token & Chat ID for real delivery)'
    };
  }

  try {
    const url = `https://api.telegram.org/bot${token.trim()}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId.trim(),
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }),
    });

    const data = await res.json();
    if (data.ok) {
      return { success: true };
    } else {
      return { success: false, error: data.description || 'Telegram API returned error' };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export async function getTelegramBotInfo(token: string): Promise<{
  ok: boolean;
  botName?: string;
  username?: string;
  error?: string;
}> {
  if (!token || token.trim() === '') {
    return { ok: false, error: 'Token is empty' };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token.trim()}/getMe`);
    const data = await res.json();
    if (data.ok && data.result) {
      return {
        ok: true,
        botName: data.result.first_name,
        username: data.result.username
      };
    } else {
      return { ok: false, error: data.description || 'Invalid token' };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

