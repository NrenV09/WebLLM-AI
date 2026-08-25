import React, { useState } from 'react';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { Sparkles, Copy, Check, Activity, Clock, Zap, Cpu } from 'lucide-react';
import { ChatMessage } from '../types';
import { ThinkingContainer } from './ThinkingContainer';
import { CodeBlock } from './CodeBlock';
import { parseThinkingContent } from '../utils/thinkingParser';

interface MessageItemProps {
  message: ChatMessage;
  index: number;
  isStreaming: boolean;
  isLast: boolean;
  preprocessLatex: (content: string) => string;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  index,
  isStreaming,
  isLast,
  preprocessLatex
}) => {
  const [copied, setCopied] = useState(false);

  const isUser = message.role === 'user';
  const isStreamingThis = isStreaming && isLast && !isUser;

  const parsed = parseThinkingContent(message.content);
  const isCurrentlyThinking = isStreamingThis && parsed.isThinkingStreaming;
  const hasThinking = parsed.thinking !== null || isCurrentlyThinking;

  const handleCopyAnswer = async () => {
    const textToCopy = parsed.answer || message.content;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end w-full my-4 px-1 sm:px-2">
        <div className="max-w-[85%] sm:max-w-[75%] bg-white/[0.06] backdrop-blur-md text-[#e6e8ec] px-5 py-3.5 rounded-3xl rounded-tr-md text-[15px] leading-relaxed shadow-lg shadow-black/20 border border-white/[0.08] break-words whitespace-pre-wrap select-text transition-all duration-200 hover:border-white/[0.14]">
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant Message
  return (
    <div className="flex items-start gap-3.5 sm:gap-4 w-full my-5 px-1 sm:px-2 group select-text">
      {/* Iridescent Gemini Sparkle Avatar */}
      <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 via-indigo-400 to-purple-400 p-[1px] shadow-[0_0_12px_rgba(99,102,241,0.25)] flex items-center justify-center mt-1">
        <div className="w-full h-full rounded-full bg-[#0b0d11] flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-[#a8c7fa] animate-in zoom-in duration-200" />
        </div>
      </div>

      <div className="flex flex-col w-full min-w-0">
        {/* Thinking / Reasoning Container */}
        {hasThinking && (
          <ThinkingContainer
            thinking={parsed.thinking || ''}
            isStreaming={isCurrentlyThinking}
            durationMs={message.metrics?.durationMs}
            preprocessLatex={preprocessLatex}
          />
        )}

        {/* Final Response Body */}
        {(parsed.answer || (!hasThinking && isStreamingThis) || (!hasThinking && !parsed.answer)) && (
          <div className="w-full text-[15px] leading-relaxed text-[#e6e8ec] py-1">
            <div className="markdown-body prose prose-invert max-w-none">
              {parsed.answer ? (
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
                        <code className="bg-white/[0.08] px-1.5 py-0.5 rounded-md text-[#a8c7fa] font-mono text-[13px] border border-white/[0.06]" {...props}>
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {preprocessLatex(parsed.answer)}
                </Markdown>
              ) : isStreamingThis && !isCurrentlyThinking ? (
                <div className="flex gap-1.5 items-center h-6 opacity-80 px-1 py-2">
                  <span className="w-2 h-2 bg-[#4285F4] rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-[#9B72CB] rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                  <span className="w-2 h-2 bg-[#D96570] rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Performance Metrics Strip & Copy Button */}
        {message.content && !isStreamingThis && (
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 pt-3 mt-1.5 border-t border-white/[0.04] text-[11px] font-mono text-[#9aa0a6]">
            <button
              onClick={handleCopyAnswer}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-white/70 hover:text-white border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200 cursor-pointer active:scale-95 shadow-xs"
              title="Copy message response"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-white/50" />
                  <span>Copy</span>
                </>
              )}
            </button>

            {message.metrics?.tokSec && (
              <span className="flex items-center gap-1 bg-white/[0.03] px-2 py-0.5 rounded-lg border border-white/[0.06] text-[#a8c7fa]">
                <Zap className="w-3 h-3 text-[#a8c7fa]" />
                <span>{message.metrics.tokSec} tok/s</span>
              </span>
            )}

            {message.metrics?.ttftMs !== undefined && message.metrics.ttftMs > 0 && (
              <span className="flex items-center gap-1 bg-white/[0.03] px-2 py-0.5 rounded-lg border border-white/[0.06] text-white/60">
                <Activity className="w-3 h-3 text-white/40" />
                <span>TTFT: {message.metrics.ttftMs}ms</span>
              </span>
            )}

            {message.metrics?.totalTokens !== undefined && message.metrics.totalTokens > 0 && (
              <span className="flex items-center gap-1 bg-white/[0.03] px-2 py-0.5 rounded-lg border border-white/[0.06] text-white/60">
                <Cpu className="w-3 h-3 text-white/40" />
                <span>Tokens: {message.metrics.totalTokens}</span>
              </span>
            )}

            {message.metrics?.durationMs !== undefined && message.metrics.durationMs > 0 && (
              <span className="flex items-center gap-1 bg-white/[0.03] px-2 py-0.5 rounded-lg border border-white/[0.06] text-white/60">
                <Clock className="w-3 h-3 text-white/40" />
                <span>Duration: {(message.metrics.durationMs / 1000).toFixed(1)}s</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
