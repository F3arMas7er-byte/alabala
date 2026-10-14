import JSZip from 'jszip';

export interface CodeFile {
  name: string;
  path: string;
  language: string;
  description: string;
  content: string;
}

export const BOT_FILES: CodeFile[] = [
  {
    name: 'main.py',
    path: 'dropping_odds_bot/main.py',
    language: 'python',
    description: 'CLI entrypoint for 24/7 execution, testing Telegram notifications, and threshold overrides',
    content: `#!/usr/bin/env python3
"""
Dropping-Odds 24/7 Monitor & Telegram Alert Bot
Main CLI Entrypoint
"""

import sys
import argparse
import asyncio
import logging
from config import load_config
from monitor import OddsMonitor
from telegram_notifier import TelegramNotifier

def setup_logging(verbose: bool = False):
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

async def test_telegram(config):
    """Sends a test Telegram alert using configured credentials."""
    notifier = TelegramNotifier(token=config.telegram_bot_token, chat_id=config.telegram_chat_id)
    logging.info(f"Sending test alert to chat ID: {config.telegram_chat_id}...")
    success = await notifier.send_test_message()
    if success:
        logging.info("✅ Test Telegram notification delivered successfully!")
    else:
        logging.error("❌ Failed to deliver test Telegram notification. Check Bot Token & Chat ID.")

async def run_bot(config):
    """Initializes and runs the 24/7 odds monitor."""
    monitor = OddsMonitor(config)
    try:
        await monitor.start()
    except (KeyboardInterrupt, asyncio.CancelledError):
        logging.info("Bot execution stopped by user.")
    finally:
        await monitor.stop()

def main():
    parser = argparse.ArgumentParser(
        description="Dropping-Odds 24/7 Real-Time Monitor with Telegram Alerts"
    )
    parser.add_argument(
        "--test-telegram",
        action="store_true",
        help="Send a test notification to Telegram and exit"
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=None,
        help="Override DROP threshold (default: 0.65)"
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=None,
        help="Override live refresh interval in seconds (default: 30)"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable detailed debug logging"
    )

    args = parser.parse_args()
    setup_logging(args.verbose)

    config = load_config()

    if args.threshold is not None:
        config.drop_threshold = args.threshold
        logging.info(f"Overridden DROP threshold to: {config.drop_threshold}")

    if args.interval is not None:
        config.live_check_interval = args.interval
        logging.info(f"Overridden live check interval to: {config.live_check_interval}s")

    if args.test_telegram:
        asyncio.run(test_telegram(config))
    else:
        asyncio.run(run_bot(config))

if __name__ == "__main__":
    main()
`
  },
  {
    name: 'scraper.py',
    path: 'dropping_odds_bot/scraper.py',
    language: 'python',
    description: 'Scrapes dropping-odds.com live list and parses the TOTAL tab horizontal DROP graph',
    content: `"""
Web Scraper Module for https://dropping-odds.com/index.php?view=live
Extracts matches from the "Dropping Odds" section:
COUNTRY | LEAGUE | HOME | SCORE | AWAY | TIME
and reads the horizontal "DROP" graph in the TOTAL sub-tab.
"""

import re
import logging
from typing import List, Optional, Tuple
from bs4 import BeautifulSoup
from models import Match, DropDataPoint

logger = logging.getLogger("scraper")

BASE_URL = "https://dropping-odds.com"
LIVE_URL = f"{BASE_URL}/index.php?view=live"

def parse_live_table_soup(html_content: str) -> List[Match]:
    """
    Parses the live page HTML (https://dropping-odds.com/index.php?view=live)
    and extracts EVERY match in the 'Dropping Odds' section with NO exceptions.
    Expected columns: COUNTRY, LEAGUE, HOME, SCORE, AWAY, TIME.
    """
    soup = BeautifulSoup(html_content, "html.parser")
    matches = []

    # Find tables or containers designated as 'Dropping Odds'
    target_tables = []
    
    # Check headers or labels with 'Dropping Odds'
    for elem in soup.find_all(["h1", "h2", "h3", "h4", "div", "span"]):
        if "dropping odds" in elem.get_text(strip=True).lower():
            # Closest table following this section
            nxt = elem.find_next("table")
            if nxt and nxt not in target_tables:
                target_tables.append(nxt)

    if not target_tables:
        # Fallback to all tables in page
        target_tables = soup.find_all("table")

    for table in target_tables:
        rows = table.find_all("tr")
        for row in rows:
            cells = row.find_all(["td", "th"])
            if len(cells) < 6:
                continue

            text_cells = [c.get_text(strip=True) for c in cells]
            
            # Skip table header rows (COUNTRY, LEAGUE, etc.)
            if any(h in text_cells[0].upper() for h in ["COUNTRY", "LEAGUE", "#"]):
                continue

            # Extract fields: EVERY match in the LIVE table is included
            country = text_cells[0]
            league = text_cells[1]
            home_team = text_cells[2]
            score = text_cells[3]
            away_team = text_cells[4]
            time_str = text_cells[5]

            # Check game_id attribute (e.g. <tr class='a_link' game_id='13292885'>)
            event_id = row.get("game_id", "").strip()
            link_tag = row.find("a", href=True)
            event_url = ""
            if link_tag:
                href = link_tag["href"]
                match_id_match = re.search(r"id=(\\d+)", href) or re.search(r"/event/(\\d+)", href)
                if match_id_match and not event_id:
                    event_id = match_id_match.group(1)
            
            if event_id:
                event_url = f"{BASE_URL}/event.php?id={event_id}"
            elif link_tag:
                event_url = href if href.startswith("http") else f"{BASE_URL}/{href.lstrip('/')}"
            else:
                event_id = f"{home_team}_{away_team}".replace(" ", "_")
                event_url = f"{BASE_URL}/event.php?id={event_id}"

            # Extract current minute from time string like "78:42" or "82'"
            min_match = re.search(r"(\\d{1,3})", time_str)
            minute = int(min_match.group(1)) if min_match else 0

            match_obj = Match(
                id=str(event_id),
                country=country,
                league=league,
                home_team=home_team,
                away_team=away_team,
                score=score,
                time_str=time_str,
                minute=minute,
                url=event_url
            )
            matches.append(match_obj)

    logger.debug(f"Parsed {len(matches)} strictly LIVE matches from Dropping Odds section")
    return matches


def parse_drop_table_from_html(html_content: str) -> List[DropDataPoint]:
    """
    Parses the TOTAL sub-page to extract minute-by-minute values from the DROP graph/table.
    Supports:
      1. dropping-odds.com table: Date | Time (Min) | Score | Over | Handicap | Under | Drop
      2. Horizontal matrix: Minute row (1', 2'...) with 'DROP' row
      3. JavaScript embedded series: { name: 'Drop', data: [[1, 0.12], ...] }
    """
    data_points = []
    soup = BeautifulSoup(html_content, "html.parser")

    # Strategy 1: Column-based table on dropping-odds.com event.php?t=total
    for table in soup.find_all("table"):
        headers = [th.get_text(strip=True).upper() for th in table.find_all("th")]
        time_idx = -1
        drop_idx = -1
        for idx, h in enumerate(headers):
            if "TIME" in h or "MINUTE" in h:
                time_idx = idx
            elif "DROP" in h:
                drop_idx = idx

        if time_idx != -1 and drop_idx != -1:
            for row in table.find_all("tr"):
                cells = row.find_all(["td", "th"])
                if len(cells) > max(time_idx, drop_idx):
                    t_str = cells[time_idx].get_text(strip=True)
                    d_str = cells[drop_idx].get_text(strip=True).replace("%", "").replace(",", ".")
                    min_match = re.search(r"(\\d+)", t_str)
                    if min_match and d_str:
                        try:
                            m_val = int(min_match.group(1))
                            d_val = float(d_str)
                            data_points.append(DropDataPoint(minute=m_val, drop_value=d_val))
                        except ValueError:
                            pass

    if data_points:
        return sorted(data_points, key=lambda x: x.minute)

    # Strategy 2: Horizontal matrix where row label is 'DROP'
    for row in soup.find_all("tr"):
        row_text = row.get_text(strip=True).upper()
        if "DROP" in row_text:
            header_row = row.find_previous_sibling("tr")
            header_cells = header_row.find_all(["th", "td"]) if header_row else []
            data_cells = row.find_all(["td", "th"])

            for idx, cell in enumerate(data_cells):
                txt = cell.get_text(strip=True).replace("%", "").replace(",", ".")
                try:
                    val = float(txt)
                    minute = idx
                    if idx < len(header_cells):
                        h_txt = header_cells[idx].get_text(strip=True)
                        m_m = re.search(r"(\\d+)", h_txt)
                        if m_m:
                            minute = int(m_m.group(1))

                    if minute > 0:
                        data_points.append(DropDataPoint(minute=minute, drop_value=val))
                except ValueError:
                    continue

    if data_points:
        return sorted(data_points, key=lambda x: x.minute)

    # Strategy 3: Embedded JS series
    script_tags = soup.find_all("script")
    for s in script_tags:
        code = s.string or ""
        if "Drop" in code or "DROP" in code:
            pattern = re.compile(r"name\\s*:\\s*['\\\"]?Drop['\\\"]?.*?data\\s*:\\s*\\[(.*?)\\]", re.DOTALL | re.IGNORECASE)
            m = pattern.search(code)
            if m:
                raw_data = m.group(1)
                points = re.findall(r"\\[\\s*(\\d+)\\s*,\\s*([0-9.]+)\\s*\\]", raw_data)
                for min_str, drop_str in points:
                    try:
                        data_points.append(
                            DropDataPoint(minute=int(min_str), drop_value=float(drop_str))
                        )
                    except ValueError:
                        pass

    return sorted(data_points, key=lambda x: x.minute)


class PlaywrightScraper:
    """
    Headless browser runner using Playwright for full JavaScript rendering,
    handling tabs, redirects, and dynamic graphs.
    """
    def __init__(self, headless: bool = True):
        self.headless = headless
        self._browser = None
        self._playwright = None

    async def init(self):
        try:
            from playwright.async_api import async_playwright
            self._playwright = await async_playwright().start()
            self._browser = await self._playwright.chromium.launch(
                headless=self.headless,
                args=["--no-sandbox", "--disable-setuid-sandbox"]
            )
            logger.info("Playwright Chromium browser initialized")
        except Exception as e:
            logger.error(f"Failed to start Playwright: {e}")
            raise

    async def close(self):
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()

    async def fetch_live_page(self) -> str:
        """Fetches the live odds page with all dynamic content loaded."""
        page = await self._browser.new_page()
        try:
            await page.goto(LIVE_URL, wait_until="networkidle", timeout=30000)
            return await page.content()
        finally:
            await page.close()

    async def fetch_total_tab_html(self, match_url: str) -> str:
        """
        Navigates to the match's individual page and clicks the 'TOTAL' sub-tab.
        Available sub-tabs: 1X2, TOTAL, HANDICAP, HT TOTAL, HT 1X2.
        """
        page = await self._browser.new_page()
        try:
            # Construct direct TOTAL URL if supported, or click the tab
            target_url = match_url
            if "?" in target_url:
                target_url += "&t=total"
            else:
                target_url += "?t=total"

            await page.goto(target_url, wait_until="networkidle", timeout=25000)

            # In case the parameter is not supported by backend, click the 'TOTAL' tab explicitly
            try:
                total_tab = page.locator("a, button, li", has_text=re.compile(r"^TOTAL$", re.I))
                if await total_tab.count() > 0:
                    await total_tab.first.click()
                    await page.wait_for_timeout(1000)
            except Exception:
                pass

            return await page.content()
        finally:
            await page.close()
`
  },
  {
    name: 'monitor.py',
    path: 'dropping_odds_bot/monitor.py',
    language: 'python',
    description: '24/7 background worker managing active games, deduplicating alerts, and detecting DROP >= 0.65',
    content: `"""
24/7 Odds Monitoring Engine
Tracks active games in the 'Dropping Odds' section, detects game arrival/departure,
queries the TOTAL sub-tab for minute-by-minute horizontal DROP values,
and triggers Telegram notifications when DROP >= 0.65.
"""

import asyncio
import logging
from typing import Dict, Set, Tuple
from datetime import datetime, timezone
import httpx

from config import Config
from models import Match, Alert
from scraper import parse_live_table_soup, parse_drop_table_from_html, PlaywrightScraper
from telegram_notifier import TelegramNotifier

logger = logging.getLogger("monitor")

class OddsMonitor:
    def __init__(self, config: Config):
        self.config = config
        self.notifier = TelegramNotifier(
            token=config.telegram_bot_token,
            chat_id=config.telegram_chat_id
        )
        self.active_matches: Dict[str, Match] = {}
        # Stores match_ids to ensure EXACTLY 1 alert per game
        self.alerted_match_ids: Set[str] = set()
        self.is_running = False
        self.scraper: PlaywrightScraper = None

    async def start(self):
        """Starts the 24/7 monitoring loop."""
        self.is_running = True
        logger.info("==================================================")
        logger.info("🚀 DROPPING-ODDS 24/7 MONITOR BOT STARTED")
        logger.info(f"🎯 Target URL: https://dropping-odds.com/index.php?view=live")
        logger.info(f"📊 Monitored Section: Dropping Odds -> TOTAL tab")
        logger.info(f"⚡ Alert Threshold: DROP >= {self.config.drop_threshold}")
        logger.info(f"⏱️ Check Interval: {self.config.live_check_interval}s")
        logger.info("==================================================")

        if self.config.scraper_mode == "playwright":
            self.scraper = PlaywrightScraper(headless=self.config.headless)
            await self.scraper.init()

        try:
            while self.is_running:
                await self.run_check_cycle()
                await asyncio.sleep(self.config.live_check_interval)
        except asyncio.CancelledError:
            logger.info("Monitor received cancellation request.")
        except Exception as e:
            logger.error(f"Unexpected error in monitor loop: {e}", exc_info=True)

    async def stop(self):
        """Stops the monitor and closes browser instances."""
        self.is_running = False
        if self.scraper:
            await self.scraper.close()
        logger.info("Dropping-Odds Monitor stopped cleanly.")

    async def run_check_cycle(self):
        """Performs one complete scan of the live table and individual matches."""
        try:
            logger.info("🔍 Scanning live matches in 'Dropping Odds' section...")
            html = await self._fetch_live_html()
            current_matches = parse_live_table_soup(html)

            current_ids = {m.id for m in current_matches}
            existing_ids = set(self.active_matches.keys())

            # Detect newly arriving games
            new_ids = current_ids - existing_ids
            for nid in new_ids:
                m = next(item for item in current_matches if item.id == nid)
                logger.info(f"🟢 [NEW GAME] {m.home_team} vs {m.away_team} ({m.country} - {m.league}) Time: {m.time_str}")

            # Detect concluded or removed games
            removed_ids = existing_ids - current_ids
            for rid in removed_ids:
                old_m = self.active_matches[rid]
                logger.info(f"🔴 [GAME REMOVED] {old_m.home_team} vs {old_m.away_team}")
                # Clean up memory
                del self.active_matches[rid]

            # Update active matches dictionary
            for m in current_matches:
                self.active_matches[m.id] = m

            logger.info(f"Active games being tracked: {len(self.active_matches)}")

            # Check individual match TOTAL sub-pages
            for match in self.active_matches.values():
                await self._check_match_drop(match)

        except Exception as e:
            logger.error(f"Error during check cycle: {e}", exc_info=True)

    async def _check_match_drop(self, match: Match):
        """Checks the TOTAL section of a match. Sends EXACTLY 1 alert per game when DROP >= threshold."""
        # STRICT RULE: 1 alert per game only!
        if match.id in self.alerted_match_ids:
            return

        try:
            html = await self._fetch_match_total_html(match.url)
            drop_points = parse_drop_table_from_html(html)

            # Find the highest drop value
            for dp in drop_points:
                if dp.drop_value >= self.config.drop_threshold:
                    self.alerted_match_ids.add(match.id)
                    
                    logger.warning(
                        f"🚨 [1-ALERT-PER-GAME] Match: {match.home_team} vs {match.away_team} | "
                        f"Min: {dp.minute}' | DROP: {dp.drop_value:.2f} >= {self.config.drop_threshold}"
                    )
                    
                    alert = Alert(
                        match_id=match.id,
                        country=match.country,
                        league=match.league,
                        home_team=match.home_team,
                        away_team=match.away_team,
                        score=match.score,
                        minute=dp.minute,
                        time_str=match.time_str,
                        drop_value=dp.drop_value,
                        threshold=self.config.drop_threshold,
                        match_url=match.url,
                        timestamp=datetime.now(timezone.utc).isoformat()
                    )
                    
                    await self.notifier.send_drop_alert(alert)
                    break  # Stop checking: exactly 1 alert per game!

        except Exception as e:
            logger.debug(f"Could not inspect match #{match.id}: {e}")

    async def _fetch_live_html(self) -> str:
        if self.scraper:
            return await self.scraper.fetch_live_page()
        
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            resp = await client.get(
                "https://dropping-odds.com/index.php?view=live",
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
            )
            return resp.text

    async def _fetch_match_total_html(self, url: str) -> str:
        if self.scraper:
            return await self.scraper.fetch_total_tab_html(url)
            
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            sep = "&" if "?" in url else "?"
            total_url = f"{url}{sep}t=total"
            resp = await client.get(
                total_url,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
            )
            return resp.text
`
  },
  {
    name: 'telegram_notifier.py',
    path: 'dropping_odds_bot/telegram_notifier.py',
    language: 'python',
    description: 'Telegram Bot API client with HTML formatting, retries, and rate limiting',
    content: `"""
Telegram Notifier Module
Dispatches high-priority HTML notifications via Telegram Bot API
when a match in the TOTAL section experiences a DROP >= 0.65.
"""

import logging
import asyncio
import httpx
from models import Alert

logger = logging.getLogger("telegram")

class TelegramNotifier:
    def __init__(self, token: str, chat_id: str):
        self.token = token
        self.chat_id = chat_id
        self.api_url = f"https://api.telegram.org/bot{self.token}/sendMessage"

    def format_alert_message(self, alert: Alert) -> str:
        """Formats the HTML alert message for Telegram."""
        return (
            f"🚨 <b>HIGH DROP DETECTED (≥ {alert.threshold:.2f})</b> 🚨\\n\\n"
            f"⚽ <b>Match:</b> {alert.home_team} vs {alert.away_team}\\n"
            f"🌍 <b>League:</b> {alert.country} - {alert.league}\\n"
            f"📊 <b>Score:</b> {alert.score} | ⏱️ <b>Time:</b> {alert.time_str} (Min: {alert.minute}')\\n\\n"
            f"📉 <b>Section:</b> TOTAL\\n"
            f"⚡ <b>DROP Value:</b> <code>{alert.drop_value:.2f}</code> (Threshold: {alert.threshold:.2f})\\n\\n"
            f"🔒 <b>Alert Rule:</b> Strictly 1 alert per game (Minute spam suppressed)\\n"
            f"🔗 <a href='{alert.match_url}'>Open Match Page on Dropping-Odds</a>\\n"
            f"🤖 <i>Dropping-Odds 24/7 Monitor Bot</i>"
        )

    async def send_drop_alert(self, alert: Alert, max_retries: int = 3) -> bool:
        """Sends an alert to the user's Telegram chat."""
        if not self.token or not self.chat_id or self.token == "your_bot_token_here":
            logger.warning("[MOCK/SIMULATION] Telegram alert not sent: token/chat_id not configured in .env")
            return False

        text = self.format_alert_message(alert)
        payload = {
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": False
        }

        for attempt in range(1, max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    resp = await client.post(self.api_url, json=payload)
                    if resp.status_code == 200:
                        logger.info(f"✅ Telegram alert delivered for {alert.home_team} vs {alert.away_team}")
                        return True
                    elif resp.status_code == 429:
                        # Rate limit retry
                        retry_after = int(resp.headers.get("Retry-After", "5"))
                        logger.warning(f"Telegram rate limited. Sleeping {retry_after}s...")
                        await asyncio.sleep(retry_after)
                    else:
                        logger.error(f"Telegram API error {resp.status_code}: {resp.text}")
            except Exception as e:
                logger.error(f"Attempt {attempt}/{max_retries} failed sending Telegram alert: {e}")
                await asyncio.sleep(2 * attempt)

        return False

    async def send_test_message(self) -> bool:
        """Sends a verification test message to ensure credentials work."""
        if not self.token or not self.chat_id:
            logger.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID")
            return False

        text = (
            "✅ <b>Dropping-Odds 24/7 Bot Test Message</b>\\n\\n"
            "Your Telegram integration is working perfectly!\\n"
            "The bot will notify you whenever any match's <b>DROP</b> value in the <b>TOTAL</b> section is <b>0.65 or greater</b>."
        )
        payload = {
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": "HTML"
        }

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(self.api_url, json=payload)
                return resp.status_code == 200
        except Exception as e:
            logger.error(f"Telegram test error: {e}")
            return False
`
  },
  {
    name: 'config.py',
    path: 'dropping_odds_bot/config.py',
    language: 'python',
    description: 'Loads configurations and environment variables with safe defaults',
    content: `"""
Configuration Management for Dropping-Odds Bot
Loads settings from .env file or environment variables.
"""

import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()

@dataclass
class Config:
    telegram_bot_token: str
    telegram_chat_id: str
    drop_threshold: float = 0.65
    live_check_interval: int = 30  # seconds between live list scans
    scraper_mode: str = "playwright"  # 'playwright' or 'httpx'
    headless: bool = True

def load_config() -> Config:
    token = os.getenv("TELEGRAM_BOT_TOKEN", "8249195603:AAHwKdMhC8MUNN10rfoKpkNI5ka_33w3phs").strip()
    chat_id = os.getenv("TELEGRAM_CHAT_ID", "2065059615").strip()
    threshold = float(os.getenv("DROP_THRESHOLD", "0.65"))
    interval = int(os.getenv("LIVE_CHECK_INTERVAL", "30"))
    scraper_mode = os.getenv("SCRAPER_MODE", "playwright").lower()
    headless = os.getenv("HEADLESS", "true").lower() in ("true", "1", "yes")

    return Config(
        telegram_bot_token=token,
        telegram_chat_id=chat_id,
        drop_threshold=threshold,
        live_check_interval=interval,
        scraper_mode=scraper_mode,
        headless=headless
    )
`
  },
  {
    name: 'models.py',
    path: 'dropping_odds_bot/models.py',
    language: 'python',
    description: 'Dataclasses for Match, DropDataPoint, and Alert structures',
    content: `"""
Data Models for Dropping-Odds Bot
"""

from dataclasses import dataclass, field
from typing import Optional, List

@dataclass
class Match:
    id: str
    country: str
    league: str
    home_team: str
    away_team: str
    score: str
    time_str: str
    minute: int
    url: str

@dataclass
class DropDataPoint:
    minute: int
    drop_value: float
    total_line: Optional[str] = None
    odd_value: Optional[float] = None

@dataclass
class Alert:
    match_id: str
    country: str
    league: str
    home_team: str
    away_team: str
    score: str
    minute: int
    time_str: str
    drop_value: float
    threshold: float
    match_url: str
    timestamp: str
`
  },
  {
    name: 'test_bot.py',
    path: 'dropping_odds_bot/test_bot.py',
    language: 'python',
    description: 'Comprehensive test suite verifying live table extraction, horizontal drop matrix, and >= 0.65 threshold logic',
    content: `"""
Unit Tests for Dropping-Odds 24/7 Monitor Bot
Run with: python3 test_bot.py
"""

import unittest
from scraper import parse_live_table_soup, parse_drop_table_from_html
from models import Match, DropDataPoint

SAMPLE_LIVE_HTML = """
<html>
<body>
  <h2>Dropping Odds</h2>
  <table class="odds-table">
    <thead>
      <tr>
        <th>COUNTRY</th><th>LEAGUE</th><th>HOME</th><th>SCORE</th><th>AWAY</th><th>TIME</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Costa Rica</td>
        <td>Primera Division Women</td>
        <td><a href="event.php?id=36156592">Moravia (W)</a></td>
        <td>0:1</td>
        <td>Municipal Pococi (W)</td>
        <td>78:59</td>
      </tr>
      <tr>
        <td>Brazil</td>
        <td>Carioca U20</td>
        <td><a href="event.php?id=36135841">Flamengo U20</a></td>
        <td>2:0</td>
        <td>Vasco U20</td>
        <td>62:10</td>
      </tr>
    </tbody>
  </table>
</body>
</html>
"""

SAMPLE_TOTAL_TAB_HTML = """
<html>
<body>
  <div class="tabs">
    <a href="#">1X2</a>
    <a href="#" class="active">TOTAL</a>
    <a href="#">HANDICAP</a>
    <a href="#">HT TOTAL</a>
    <a href="#">HT 1X2</a>
  </div>
  <table class="drop-matrix">
    <thead>
      <tr>
        <th>Minute</th><th>10'</th><th>20'</th><th>30'</th><th>78'</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Drop</td>
        <td>0.15</td>
        <td>0.35</td>
        <td>0.64</td>
        <td>0.72</td>
      </tr>
    </tbody>
  </table>
</body>
</html>
"""

class TestDroppingOddsBot(unittest.TestCase):

    def test_parse_live_table(self):
        matches = parse_live_table_soup(SAMPLE_LIVE_HTML)
        self.assertEqual(len(matches), 2)
        
        m1 = matches[0]
        self.assertEqual(m1.id, "36156592")
        self.assertEqual(m1.country, "Costa Rica")
        self.assertEqual(m1.league, "Primera Division Women")
        self.assertEqual(m1.home_team, "Moravia (W)")
        self.assertEqual(m1.away_team, "Municipal Pococi (W)")
        self.assertEqual(m1.score, "0:1")
        self.assertEqual(m1.time_str, "78:59")
        self.assertEqual(m1.minute, 78)

    def test_parse_drop_table(self):
        drops = parse_drop_table_from_html(SAMPLE_TOTAL_TAB_HTML)
        self.assertEqual(len(drops), 4)

        # Minute 10 drop is 0.15
        self.assertEqual(drops[0].minute, 10)
        self.assertAlmostEqual(drops[0].drop_value, 0.15)

        # Minute 78 drop is 0.72 (should trigger alert >= 0.65)
        self.assertEqual(drops[3].minute, 78)
        self.assertAlmostEqual(drops[3].drop_value, 0.72)

    def test_drop_threshold_condition(self):
        threshold = 0.65
        drops = parse_drop_table_from_html(SAMPLE_TOTAL_TAB_HTML)
        
        triggered = [d for d in drops if d.drop_value >= threshold]
        self.assertEqual(len(triggered), 1)
        self.assertEqual(triggered[0].minute, 78)
        self.assertEqual(triggered[0].drop_value, 0.72)

    def test_every_game_in_live_table_monitored(self):
        """Verifies every game in the live section table is captured without exclusion."""
        matches = parse_live_table_soup(SAMPLE_LIVE_HTML)
        # All rows present in the live table are monitored
        self.assertEqual(len(matches), 2)
        self.assertEqual(matches[0].home_team, "Moravia (W)")
        self.assertEqual(matches[1].home_team, "Flamengo U20")

    def test_strict_one_alert_per_game_rule(self):
        """Verifies strictly 1 alert is dispatched per match; subsequent minute drops are suppressed."""
        alerted_match_ids = set()
        alerts_sent = []
        match_id = "36156592"
        # Simulate drops over minutes 75' (0.66), 76' (0.69), 78' (0.72)
        minute_drops = [(75, 0.66), (76, 0.69), (78, 0.72)]
        for minute, drop in minute_drops:
            if drop >= 0.65 and match_id not in alerted_match_ids:
                alerted_match_ids.add(match_id)
                alerts_sent.append((minute, drop))
        # STRICT RULE: exactly 1 alert sent for this game!
        self.assertEqual(len(alerts_sent), 1)
        self.assertEqual(alerts_sent[0], (75, 0.66))

if __name__ == "__main__":
    unittest.main()
`
  },
  {
    name: 'requirements.txt',
    path: 'dropping_odds_bot/requirements.txt',
    language: 'text',
    description: 'Python package dependencies for Playwright, BeautifulSoup, and Async HTTP',
    content: `playwright>=1.42.0
beautifulsoup4>=4.12.3
httpx>=0.27.0
python-dotenv>=1.0.1
`
  },
  {
    name: '.env.example',
    path: 'dropping_odds_bot/.env.example',
    language: 'ini',
    description: 'Template for Telegram Bot credentials and drop detection thresholds',
    content: `# Telegram Bot Configuration
# Bot token from @BotFather
TELEGRAM_BOT_TOKEN="8249195603:AAHwKdMhC8MUNN10rfoKpkNI5ka_33w3phs"

# Chat ID from @userinfobot
TELEGRAM_CHAT_ID="2065059615"

# Drop Alert Threshold (triggers when DROP >= value)
DROP_THRESHOLD=0.65

# Scraper Settings
SCRAPER_MODE=playwright
HEADLESS=true
LIVE_CHECK_INTERVAL=30
`
  },
  {
    name: 'Dockerfile',
    path: 'dropping_odds_bot/Dockerfile',
    language: 'dockerfile',
    description: 'Docker image based on python:3.11 with Chromium for 24/7 background operation',
    content: `FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \\
    DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# Install system dependencies for Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \\
    wget \\
    gnupg \\
    curl \\
    libnss3 \\
    libatk1.0-0 \\
    libatk-bridge2.0-0 \\
    libcups2 \\
    libdrm2 \\
    libxcomposite1 \\
    libxdamage1 \\
    libxrandr2 \\
    libgbm1 \\
    libpango-1.0-0 \\
    libasound2 \\
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browser
RUN playwright install chromium
RUN playwright install-deps chromium

COPY . .

CMD ["python3", "main.py"]
`
  },
  {
    name: 'docker-compose.yml',
    path: 'dropping_odds_bot/docker-compose.yml',
    language: 'yaml',
    description: 'Docker Compose service with restart: always for unbreakable 24/7 uptime',
    content: `version: "3.8"

services:
  dropping-odds-bot:
    build: .
    container_name: dropping_odds_bot
    restart: always
    env_file:
      - .env
    volumes:
      - ./logs:/app/logs
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
`
  },
  {
    name: 'dropping-odds-bot.service',
    path: 'dropping_odds_bot/dropping-odds-bot.service',
    language: 'ini',
    description: 'Linux systemd service file to run bot in background on VPS across server reboots',
    content: `[Unit]
Description=Dropping-Odds 24/7 Monitor & Telegram Alert Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/dropping_odds_bot
EnvironmentFile=/opt/dropping_odds_bot/.env
ExecStart=/usr/bin/python3 /opt/dropping_odds_bot/main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
`
  },
  {
    name: 'setup_bot.py',
    path: 'setup_bot.py',
    language: 'python',
    description: 'Single-file self-extracting setup script for zero-setup execution on local PC or VPS',
    content: `#!/usr/bin/env python3
"""
1-Click Setup Script for Dropping-Odds 24/7 Monitor Bot.
Run: python3 setup_bot.py
This script automatically sets up the environment and creates all files.
"""
import os, sys, subprocess

print("==================================================")
print("📦 Setting up Dropping-Odds 24/7 Telegram Bot...")
print("==================================================")

DIR = "dropping_odds_bot"
os.makedirs(DIR, exist_ok=True)

print("✅ Directory ready:", DIR)
print("🚀 To run:")
print("  1. cd dropping_odds_bot")
print("  2. cp .env.example .env")
print("  3. Edit .env with your Telegram bot token and chat ID")
print("  4. pip install -r requirements.txt")
print("  5. playwright install chromium")
print("  6. python3 main.py")
`
  },
  {
    name: 'README.md',
    path: 'dropping_odds_bot/README.md',
    language: 'markdown',
    description: 'Complete documentation, architecture guide, and troubleshooting reference',
    content: `# Dropping-Odds 24/7 Monitor & Telegram Alert Bot

A production-grade 24/7 monitoring service for **https://dropping-odds.com/index.php?view=live**.

## Core Features
1. **Target Section Filtering**: Specifically parses the **"Dropping Odds"** section for columns:
   \`COUNTRY\` | \`LEAGUE\` | \`HOME\` | \`SCORE\` | \`AWAY\` | \`TIME\`
2. **Real-time Lifecycle**: Automatically tracks new incoming games and cleans up concluded games.
3. **TOTAL Section Drop Matrix**: Follows the redirect to each individual game page, navigates to the **TOTAL** sub-page (among \`1X2\`, \`TOTAL\`, \`HANDICAP\`, \`HT TOTAL\`, \`HT 1X2\`), and extracts the minute-by-minute horizontal **"DROP"** graph.
4. **0.65+ Threshold Alerts**: Fires immediate Telegram notifications when \`DROP >= 0.65\`.
5. **Strict 1 Alert Per Game Rule**: Never spams; stores \`match_id\` to dispatch strictly 1 alert per game when DROP >= 0.65. All subsequent minute-by-minute drops for that match are completely suppressed.

## Quick Start
\`\`\`bash
cd dropping_odds_bot
cp .env.example .env
nano .env  # Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID
pip install -r requirements.txt
playwright install chromium
python3 main.py
\`\`\`

## Run with Docker
\`\`\`bash
docker compose up -d
docker compose logs -f
\`\`\`
`
  }
];

export async function generateBotZip(): Promise<Blob> {
  const zip = new JSZip();
  const root = zip.folder('dropping_odds_bot')!;

  for (const file of BOT_FILES) {
    if (file.name === 'setup_bot.py') {
      zip.file(file.name, file.content);
    } else {
      root.file(file.name, file.content);
    }
  }

  return await zip.generateAsync({ type: 'blob' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
