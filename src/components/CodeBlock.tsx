import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  language?: string;
  value: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language = 'text', value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  return (
    <div className="my-4 rounded-2xl overflow-hidden border border-white/[0.08] bg-[#08090c]/95 backdrop-blur-md shadow-xl font-mono text-[13px] text-left transition-all duration-200 hover:border-white/[0.14] group">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.03] border-b border-white/[0.06] select-none">
        <div className="flex items-center gap-2">
          {/* macOS window indicator dots */}
          <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]/80 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]/80 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]/80 inline-block"></span>
          </div>
          <span className="ml-1.5 px-2 py-0.5 rounded-md bg-white/[0.05] text-[11px] font-medium tracking-wide uppercase text-white/60 border border-white/[0.04]">
            {language}
          </span>
        </div>

        <button
          onClick={handleCopy}
          aria-label="Copy code to clipboard"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/[0.08] border border-transparent hover:border-white/[0.08] transition-all duration-200 cursor-pointer active:scale-95"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400 animate-in zoom-in-50 duration-150" />
              <span className="text-emerald-400 text-[11px] font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-white/50" />
              <span className="text-[11px] font-medium">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <div className="p-4 overflow-x-auto text-[#e6e8ec] leading-relaxed selection:bg-blue-500/30">
        <pre className="!bg-transparent !p-0 !m-0 !border-0 font-mono text-[13px]">
          <code>{value}</code>
        </pre>
      </div>
    </div>
  );
};

