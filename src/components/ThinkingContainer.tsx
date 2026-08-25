import { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { ChevronDown, ChevronRight, Brain, Sparkles, Loader2 } from 'lucide-react';
import { CodeBlock } from './CodeBlock';

interface ThinkingContainerProps {
  thinking: string;
  isStreaming: boolean;
  durationMs?: number;
  preprocessLatex: (content: string) => string;
}

export function ThinkingContainer({
  thinking,
  isStreaming,
  durationMs,
  preprocessLatex
}: ThinkingContainerProps) {
  // Keep open while streaming, let user collapse/expand at will
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [elapsedSec, setElapsedSec] = useState<number>(0);

  useEffect(() => {
    let timer: any = null;
    if (isStreaming) {
      const start = Date.now();
      timer = setInterval(() => {
        setElapsedSec(Math.max(1, Math.round((Date.now() - start) / 1000)));
      }, 500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isStreaming]);

  const thoughtTimeDisplay = durationMs 
    ? `${(durationMs / 1000).toFixed(1)}s`
    : elapsedSec > 0 
      ? `${elapsedSec}s` 
      : '';

  return (
    <div className="w-full my-3 border border-white/[0.08] bg-[#12141a]/60 backdrop-blur-md rounded-2xl overflow-hidden transition-all duration-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-white/[0.14] group">
      {/* Header bar / Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2.5 flex items-center justify-between bg-white/[0.02] hover:bg-white/[0.05] text-xs transition-colors duration-200 cursor-pointer select-none text-left"
      >
        <div className="flex items-center gap-2.5 text-white/80">
          <div className="relative flex items-center justify-center">
            {isStreaming ? (
              <span className="relative flex h-3 w-3 mr-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 shadow-[0_0_8px_rgba(168,199,250,0.6)]"></span>
              </span>
            ) : (
              <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                <Brain className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
          
          <span className="font-medium text-white/90">
            {isStreaming ? 'Thinking...' : 'Reasoning Process'}
          </span>

          {thoughtTimeDisplay && (
            <span className="text-[11px] font-mono text-white/50 bg-black/40 px-2 py-0.5 rounded-full border border-white/[0.06]">
              {isStreaming ? `streaming (${thoughtTimeDisplay})` : `thought for ${thoughtTimeDisplay}`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-white/40 group-hover:text-white/80 transition-colors">
          <span className="text-[11px] hidden sm:inline">
            {isExpanded ? 'Hide' : 'Show'}
          </span>
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </div>
      </button>

      {/* Expandable Thinking Content */}
      {isExpanded && (
        <div className="px-4 py-3 border-t border-white/[0.05] bg-black/30 text-[13.5px] leading-relaxed text-[#9aa0a6] font-sans animate-in fade-in duration-150">
          {thinking.trim() ? (
            <div className="markdown-body prose prose-invert prose-sm max-w-none text-[#9aa0a6] italic prose-p:my-1.5 prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/5">
              <Markdown 
                remarkPlugins={[remarkMath, remarkGfm]} 
                rehypePlugins={[rehypeKatex]}
                components={{
                  code({ node, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeContent = String(children).replace(/\n$/, '');
                    if (match) {
                      return <CodeBlock language={match[1]} value={codeContent} />;
                    }
                    return (
                      <code className="bg-white/10 px-1.5 py-0.5 rounded text-[#a8c7fa] font-mono text-[12.5px]" {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {preprocessLatex(thinking)}
              </Markdown>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-white/50 py-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#a8c7fa]" />
              <span>Analyzing problem structure and reasoning steps...</span>
            </div>
          )}

          {isStreaming && thinking.trim() && (
            <span className="inline-block w-1.5 h-3.5 bg-gradient-to-r from-blue-400 to-indigo-400 ml-1 animate-pulse align-middle rounded-full" />
          )}
        </div>
      )}
    </div>
  );
}

