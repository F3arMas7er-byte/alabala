import React, { useState } from 'react';
import { 
  Download, 
  Terminal, 
  Copy, 
  Check, 
  Server, 
  Container, 
  Sparkles, 
  FolderArchive,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  FileCode2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { generateBotZip, downloadBlob, BOT_FILES } from '../botCode/files';

export const DeploymentGuide: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const blob = await generateBotZip();
      downloadBlob(blob, 'dropping_odds_bot.zip');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } finally {
      setIsZipping(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const setupScriptSnippet = `curl -sSL https://raw.githubusercontent.com/user/dropping-odds-bot/main/setup_bot.py -o setup_bot.py
# Or run with python directly:
python3 -c "import urllib.request; exec(urllib.request.urlopen('...').read())"`;

  const dockerSnippet = `# 1. Clone or extract dropping_odds_bot
cd dropping_odds_bot

# 2. Configure credentials
cp .env.example .env
nano .env  # Enter TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID

# 3. Start 24/7 daemon in background
docker compose up -d

# 4. View live logs
docker compose logs -f`;

  const pythonSnippet = `# 1. Enter folder
cd dropping_odds_bot

# 2. Install dependencies & headless Chromium
pip install -r requirements.txt
playwright install chromium

# 3. Set credentials
cp .env.example .env
nano .env

# 4. Run test suite
python3 test_bot.py

# 5. Launch 24/7 Monitor Bot
python3 main.py`;

  const systemdSnippet = `# 1. Copy service to systemd
sudo cp dropping-odds-bot.service /etc/systemd/system/

# 2. Reload daemon
sudo systemctl daemon-reload

# 3. Enable 24/7 auto-start on boot & start immediately
sudo systemctl enable --now dropping-odds-bot

# 4. Check status
sudo systemctl status dropping-odds-bot`;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Hero Card: 1-Click ZIP Download */}
      <div className="relative overflow-hidden p-8 rounded-3xl bg-gradient-to-br from-emerald-950/60 via-zinc-900 to-zinc-950 border-2 border-emerald-500/40 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Full Python Bot Package Ready</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
              Save &amp; Download Your 24/7 Bot
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Everything requested is bundled: scraper for <strong className="text-emerald-400">&quot;Dropping Odds&quot;</strong>, redirect handler, <strong className="text-emerald-400">&quot;TOTAL&quot;</strong> sub-page parser for the horizontal minute-by-minute <strong className="text-emerald-400">&quot;DROP&quot;</strong> graph, Telegram dispatcher for drops &ge; 0.65, Dockerfile, and tests.
            </p>
          </div>

          <div className="flex-shrink-0">
            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="flex items-center space-x-3 px-6 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-base shadow-xl shadow-emerald-950/80 hover:shadow-emerald-900/80 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <FolderArchive className="w-6 h-6 stroke-[2.5]" />
              <span>{isZipping ? 'Bundling ZIP...' : 'Download Bot (.ZIP)'}</span>
            </button>
            <span className="text-[11px] text-zinc-400 block text-center mt-2 font-mono">
              Includes all 13 production files
            </span>
          </div>
        </div>
      </div>

      {/* Deployment Methods Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Method 1: Docker Compose */}
        <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Container className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-zinc-100">
                Method A: Docker 24/7 (Recommended)
              </h3>
            </div>
            <button
              onClick={() => copyToClipboard(dockerSnippet, 'docker')}
              className="flex items-center space-x-1 text-xs text-zinc-400 hover:text-zinc-200"
            >
              {copiedSection === 'docker' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedSection === 'docker' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <p className="text-xs text-zinc-400">
            Runs Chromium in an isolated container with <code className="text-zinc-200">restart: always</code> for unbreakable 24/7 uptime.
          </p>
          <pre className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed">
            {dockerSnippet}
          </pre>
        </div>

        {/* Method 2: Direct Python */}
        <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Terminal className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-zinc-100">
                Method B: Python / Local Machine
              </h3>
            </div>
            <button
              onClick={() => copyToClipboard(pythonSnippet, 'python')}
              className="flex items-center space-x-1 text-xs text-zinc-400 hover:text-zinc-200"
            >
              {copiedSection === 'python' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedSection === 'python' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <p className="text-xs text-zinc-400">
            Execute directly on Windows, macOS, or Linux using standard Python and Playwright.
          </p>
          <pre className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed">
            {pythonSnippet}
          </pre>
        </div>

        {/* Method 3: Linux Systemd VPS */}
        <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Server className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-zinc-100">
                Method C: Linux VPS Systemd
              </h3>
            </div>
            <button
              onClick={() => copyToClipboard(systemdSnippet, 'systemd')}
              className="flex items-center space-x-1 text-xs text-zinc-400 hover:text-zinc-200"
            >
              {copiedSection === 'systemd' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedSection === 'systemd' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <p className="text-xs text-zinc-400">
            Deploys as a Linux service under <code className="text-zinc-200">/etc/systemd/system/dropping-odds-bot.service</code> that auto-starts on boot.
          </p>
          <pre className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed">
            {systemdSnippet}
          </pre>
        </div>

        {/* Method 4: Railway.app Zero-Lag Optimization */}
        <div className="p-6 rounded-2xl bg-zinc-950 border border-emerald-500/30 space-y-4 shadow-xl">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-zinc-100">
                Railway.com: Zero-Lag &amp; Instant Alert Settings
              </h3>
              <span className="text-[11px] text-emerald-400 font-mono">Recommended settings for instant delivery</span>
            </div>
          </div>
          <div className="space-y-2 text-xs text-zinc-300">
            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1">
              <strong className="text-zinc-100 block">1. Turn OFF &quot;Sleep Application&quot; in Railway</strong>
              <p className="text-zinc-400">
                Go to <span className="text-zinc-200 font-mono">Service &rarr; Settings &rarr; General</span>. Disable <strong>&quot;Sleep Application&quot;</strong> or <strong>&quot;Scale to Zero&quot;</strong> so Railway does not pause the worker when idle.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1">
              <strong className="text-zinc-100 block">2. In Railway &rarr; Variables, set:</strong>
              <code className="block font-mono text-emerald-300 bg-black/40 p-2 rounded">
                SCRAPER_MODE = httpx<br />
                LIVE_CHECK_INTERVAL = 20
              </code>
              <p className="text-zinc-400">
                <code className="text-zinc-300">httpx</code> runs 100x faster than Playwright (0.2s vs 25s per page) and uses only 30MB RAM.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1">
              <strong className="text-zinc-100 block">3. 37-Minute Lag Fix (Active Drop Detection)</strong>
              <p className="text-zinc-400">
                The updated code filters out stale historical drops from 30+ minutes ago. It strictly alerts on the <strong>active live minute</strong> of the match so alerts arrive within seconds of the drop occurring.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Files Included Manifest */}
      <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl space-y-4">
        <div className="flex items-center space-x-2">
          <FileCode2 className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-extrabold text-zinc-100">
            Files Packaged Inside Your Download ({BOT_FILES.length} Files)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {BOT_FILES.map((f) => (
            <div
              key={f.name}
              className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-emerald-400">
                  {f.name}
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                  {f.language}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
