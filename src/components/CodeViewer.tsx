import React, { useState } from 'react';
import { 
  FileCode, 
  Copy, 
  Check, 
  Download, 
  Search, 
  FileText,
  FileCheck2,
  FolderTree
} from 'lucide-react';
import { BOT_FILES, CodeFile } from '../botCode/files';

export const CodeViewer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<CodeFile>(BOT_FILES[1]); // scraper.py by default
  const [copied, setCopied] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSingle = () => {
    const blob = new Blob([selectedFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredFiles = BOT_FILES.filter(f => 
    f.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h3 className="text-base font-extrabold text-zinc-100 flex items-center space-x-2">
            <FileCode className="w-5 h-5 text-emerald-400" />
            <span>Python Source Code Inspector</span>
          </h3>
          <p className="text-xs text-zinc-400">
            Browse the complete 24/7 scraping, monitoring, and Telegram notification source code.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : `Copy ${selectedFile.name}`}</span>
          </button>

          <button
            onClick={handleDownloadSingle}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download File</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Code Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[650px] rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
        {/* Left: File Tree */}
        <div className="lg:col-span-1 border-b lg:border-b-0 lg:border-r border-zinc-800 bg-zinc-900/50 flex flex-col h-full">
          <div className="p-3 border-b border-zinc-800 bg-zinc-900">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter files..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          <div className="p-2 space-y-1 overflow-y-auto flex-1 font-mono text-xs">
            <div className="px-2 py-1 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
              Project Structure
            </div>
            {filteredFiles.map((file) => {
              const isSelected = selectedFile.name === file.name;
              return (
                <button
                  key={file.name}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center space-x-2 transition-all ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  }`}
                >
                  <FileText className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-zinc-500'}`} />
                  <span className="truncate">{file.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Code Viewer */}
        <div className="lg:col-span-3 flex flex-col h-full bg-zinc-950">
          {/* File Header Bar */}
          <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/70 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center space-x-2 text-zinc-300">
              <span className="text-zinc-500">path:</span>
              <span className="font-semibold text-emerald-400">{selectedFile.path}</span>
            </div>
            <span className="text-zinc-500 text-[11px] hidden sm:inline">
              {selectedFile.language.toUpperCase()} &bull; {selectedFile.content.split('\n').length} lines
            </span>
          </div>

          {/* Description banner */}
          <div className="px-4 py-2 bg-zinc-900/30 border-b border-zinc-800/60 text-xs text-zinc-400">
            {selectedFile.description}
          </div>

          {/* Code Body with Line Numbers */}
          <div className="flex-1 overflow-auto p-4 font-mono text-xs text-zinc-300 leading-relaxed bg-zinc-950 select-text">
            <pre className="flex">
              {/* Line numbers column */}
              <span className="text-zinc-600 select-none pr-4 text-right border-r border-zinc-800 mr-4 font-mono text-[11px]">
                {selectedFile.content.split('\n').map((_, i) => (
                  <span key={i} className="block leading-5">
                    {i + 1}
                  </span>
                ))}
              </span>
              {/* Code text */}
              <code className="text-zinc-200 leading-5 whitespace-pre">
                {selectedFile.content}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
