import React from 'react';
import { createRoot } from 'react-dom/client';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import html2pdf from 'html2pdf.js';
import { ChatSession, ChatMessage } from '../types';
import { parseThinkingContent } from './thinkingParser';

interface PdfDocumentProps {
  session: ChatSession;
  preprocessLatex: (content: string) => string;
}

export const PdfDocumentTemplate: React.FC<PdfDocumentProps> = ({ session, preprocessLatex }) => {
  const createdDate = new Date(session.createdAt || Date.now()).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const exportDate = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Filter out any empty messages
  const validMessages = session.messages.filter(m => m.content && m.content.trim().length > 0);

  return (
    <div className="pdf-doc-root" id="pdf-doc-root">
      <style>{`
        .pdf-doc-root {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          padding: 36px 42px;
          line-height: 1.6;
          font-size: 13.5px;
          box-sizing: border-box;
          width: 794px;
        }

        /* Document Header */
        .pdf-header {
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 18px;
          margin-bottom: 24px;
          page-break-after: avoid;
        }
        .pdf-badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #2563eb;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          padding: 3px 8px;
          border-radius: 6px;
          margin-bottom: 8px;
        }
        .pdf-title {
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 8px 0;
          line-height: 1.25;
          letter-spacing: -0.02em;
        }
        .pdf-meta-row {
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 12px;
          color: #64748b;
        }

        /* Messages */
        .pdf-message-item {
          margin-bottom: 22px;
          page-break-inside: avoid;
        }

        .pdf-user-box {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px 18px;
        }
        .pdf-user-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
          font-weight: 600;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 8px;
        }
        .pdf-user-content {
          color: #0f172a;
          font-size: 14px;
          white-space: pre-wrap;
          word-break: break-word;
          line-height: 1.6;
        }

        .pdf-assistant-box {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }
        .pdf-assistant-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
          font-weight: 700;
          color: #2563eb;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 12px;
          padding-bottom: 6px;
          border-bottom: 1px solid #f1f5f9;
        }

        /* Thinking Process Callout */
        .pdf-thinking-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-left: 3px solid #6366f1;
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 14px;
          font-size: 12px;
          color: #475569;
        }
        .pdf-thinking-label {
          font-weight: 600;
          color: #4f46e5;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }

        /* Markdown & KaTeX Typography */
        .pdf-markdown {
          color: #0f172a;
          line-height: 1.65;
        }
        .pdf-markdown h1 { font-size: 18px; font-weight: 700; margin: 16px 0 8px 0; color: #0f172a; }
        .pdf-markdown h2 { font-size: 16px; font-weight: 700; margin: 14px 0 6px 0; color: #0f172a; }
        .pdf-markdown h3 { font-size: 14.5px; font-weight: 600; margin: 12px 0 4px 0; color: #0f172a; }
        .pdf-markdown p { margin: 0 0 10px 0; }
        .pdf-markdown ul { margin: 0 0 10px 20px; list-style-type: disc; }
        .pdf-markdown ol { margin: 0 0 10px 20px; list-style-type: decimal; }
        .pdf-markdown li { margin-bottom: 4px; }
        .pdf-markdown blockquote {
          border-left: 3px solid #cbd5e1;
          padding-left: 12px;
          margin: 10px 0;
          color: #475569;
          font-style: italic;
        }

        /* Code formatting */
        .pdf-code-block {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          margin: 12px 0;
          overflow: hidden;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }
        .pdf-code-header {
          background: #f1f5f9;
          border-bottom: 1px solid #e2e8f0;
          padding: 4px 12px;
          font-size: 10.5px;
          font-weight: 600;
          text-transform: uppercase;
          color: #64748b;
        }
        .pdf-code-content {
          padding: 10px 14px;
          font-size: 12px;
          color: #0f172a;
          line-height: 1.45;
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .pdf-inline-code {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          padding: 1.5px 5px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 12px;
          color: #0f172a;
        }

        /* Tables */
        .pdf-markdown table {
          width: 100%;
          border-collapse: collapse;
          margin: 12px 0;
          font-size: 12.5px;
        }
        .pdf-markdown th, .pdf-markdown td {
          border: 1px solid #cbd5e1;
          padding: 6px 10px;
          text-align: left;
        }
        .pdf-markdown th {
          background: #f1f5f9;
          font-weight: 600;
        }

        /* CRITICAL: KaTeX Formulas in PDF */
        .pdf-markdown .katex {
          color: #0f172a !important;
          font-size: 1.05em;
        }
        .pdf-markdown .katex-display {
          display: block;
          margin: 14px 0 !important;
          padding: 12px 16px !important;
          background: #f8fafc !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 8px !important;
          text-align: center !important;
          color: #0f172a !important;
          overflow-x: hidden !important;
        }
        .pdf-markdown .katex .katex-mathml {
          display: none !important;
          visibility: hidden !important;
          height: 0 !important;
          width: 0 !important;
        }

        /* Footer */
        .pdf-footer {
          margin-top: 32px;
          padding-top: 14px;
          border-top: 1px solid #e2e8f0;
          font-size: 11px;
          color: #94a3b8;
          display: flex;
          justify-content: space-between;
          align-items: center;
          page-break-before: avoid;
        }
      `}</style>

      {/* Header */}
      <div className="pdf-header">
        <div className="pdf-badge">On-Device AI Export</div>
        <h1 className="pdf-title">{session.title}</h1>
        <div className="pdf-meta-row">
          <span>Model: <strong>{session.modelId}</strong></span>
          <span>•</span>
          <span>Date: {createdDate}</span>
          <span>•</span>
          <span>{validMessages.length} message{validMessages.length === 1 ? '' : 's'}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="pdf-messages-list">
        {validMessages.map((msg: ChatMessage, idx: number) => {
          const isUser = msg.role === 'user';
          const timeStr = msg.timestamp
            ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '';

          if (isUser) {
            return (
              <div key={msg.id || idx} className="pdf-message-item">
                <div className="pdf-user-box">
                  <div className="pdf-user-header">
                    <span>You</span>
                    {timeStr && <span>{timeStr}</span>}
                  </div>
                  <div className="pdf-user-content">
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          }

          // Assistant message with KaTeX & Markdown
          const parsed = parseThinkingContent(msg.content);
          const answer = parsed.answer || msg.content;

          return (
            <div key={msg.id || idx} className="pdf-message-item">
              <div className="pdf-assistant-box">
                <div className="pdf-assistant-header">
                  <span>Assistant ({session.modelId})</span>
                  {timeStr && <span>{timeStr}</span>}
                </div>

                {/* Optional Reasoning Process */}
                {parsed.thinking && (
                  <div className="pdf-thinking-box">
                    <div className="pdf-thinking-label">Reasoning Process</div>
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {parsed.thinking}
                    </div>
                  </div>
                )}

                {/* Formatted Answer with LaTeX */}
                <div className="pdf-markdown">
                  <Markdown
                    remarkPlugins={[remarkMath, remarkGfm]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      code({ node, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        const codeContent = String(children).replace(/\n$/, '');
                        if (match) {
                          return (
                            <div className="pdf-code-block">
                              <div className="pdf-code-header">{match[1]}</div>
                              <pre className="pdf-code-content">{codeContent}</pre>
                            </div>
                          );
                        }
                        return (
                          <code className="pdf-inline-code" {...props}>
                            {children}
                          </code>
                        );
                      }
                    }}
                  >
                    {preprocessLatex(answer)}
                  </Markdown>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="pdf-footer">
        <span>Generated 100% locally via WebGPU on {exportDate}</span>
        <span>Private & Confidential</span>
      </div>
    </div>
  );
};

export async function exportChatSessionToPdf(
  session: ChatSession,
  preprocessLatex: (content: string) => string,
  onProgress?: (stage: 'preparing' | 'generating' | 'done') => void
): Promise<void> {
  onProgress?.('preparing');

  // 1. Create temporary off-screen container in DOM
  const container = document.createElement('div');
  container.id = `pdf-export-temp-${Date.now()}`;
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px'; // A4 pixel width at 96 DPI
  container.style.background = '#ffffff';
  container.style.zIndex = '-9999';
  container.style.boxSizing = 'border-box';
  document.body.appendChild(container);

  const root = createRoot(container);

  try {
    // 2. Render document with KaTeX and Markdown
    root.render(
      <PdfDocumentTemplate
        session={session}
        preprocessLatex={preprocessLatex}
      />
    );

    // 3. Allow React, KaTeX, and fonts to fully paint
    await new Promise((resolve) => setTimeout(resolve, 550));

    onProgress?.('generating');

    // 4. Configure html2pdf
    const sanitizedTitle = (session.title || 'chat_session')
      .replace(/[^a-zA-Z0-9_\- ]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .substring(0, 40) || 'chat_export';

    const h2p = (html2pdf as any).default || html2pdf;

    const opt = {
      margin: [10, 10, 12, 10] as [number, number, number, number],
      filename: `${sanitizedTitle}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2, // 2x high resolution for crisp LaTeX and typography
        useCORS: true,
        letterRendering: true,
        logging: false,
        backgroundColor: '#ffffff'
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    await h2p().set(opt).from(container).save();

    onProgress?.('done');
  } finally {
    // 5. Clean up DOM and root
    setTimeout(() => {
      try {
        root.unmount();
        container.remove();
      } catch (err) {
        console.warn('Cleanup error:', err);
      }
    }, 500);
  }
}

/**
 * Print session via Browser Print dialog (offers 100% Vector PDF)
 */
export async function printChatSessionViaBrowser(
  session: ChatSession,
  preprocessLatex: (content: string) => string
): Promise<void> {
  // Create hidden printable iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    throw new Error('Unable to access printable frame');
  }

  const container = doc.createElement('div');
  doc.body.appendChild(container);

  // Link KaTeX stylesheet into the iframe
  const link = doc.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://cdn.jsdelivr.net/npm/katex@0.18.1/dist/katex.min.css';
  doc.head.appendChild(link);

  const root = createRoot(container);
  root.render(
    <PdfDocumentTemplate
      session={session}
      preprocessLatex={preprocessLatex}
    />
  );

  // Wait for styles and KaTeX to load in iframe
  await new Promise((resolve) => setTimeout(resolve, 600));

  try {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  } finally {
    setTimeout(() => {
      try {
        root.unmount();
        iframe.remove();
      } catch {}
    }, 2000);
  }
}
