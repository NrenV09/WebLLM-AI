import { ChatSession } from '../types';
import { parseThinkingContent } from './thinkingParser';

/**
 * Escapes special LaTeX characters in plain text while preserving math blocks and code
 */
function escapeLatexText(text: string): string {
  if (!text) return '';

  // Split into math ($...$, $$...$$, \[...\], \(...\)) and non-math segments
  const parts: string[] = [];
  const mathRegex = /(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mathRegex.exec(text)) !== null) {
    // Non-math preceding text
    if (match.index > lastIndex) {
      parts.push(escapePlainLatex(text.substring(lastIndex, match.index)));
    }
    // Math block preserved verbatim
    parts.push(match[0]);
    lastIndex = match.index + match[0].length;
  }

  // Trailing non-math text
  if (lastIndex < text.length) {
    parts.push(escapePlainLatex(text.substring(lastIndex)));
  }

  return parts.join('');
}

function escapePlainLatex(str: string): string {
  return str
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([%#&_{}])/g, '\\$1')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/~/g, '\\textasciitilde{}');
}

/**
 * Generates a complete, compilable LaTeX (.tex) document from a ChatSession.
 * Operates 100% locally in the browser with zero network or server dependencies.
 */
export function generateLatexSource(session: ChatSession): string {
  const title = session.title || 'Conversation';
  const escapedTitle = escapePlainLatex(title);
  const createdDate = new Date(session.createdAt || Date.now()).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const modelName = session.modelId || 'Qwen WebGPU';

  let tex = `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[margin=1in]{geometry}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{xcolor}
\\usepackage{tcolorbox}
\\usepackage{fancyhdr}
\\usepackage{hyperref}
\\usepackage{enumitem}

\\hypersetup{
    colorlinks=true,
    linkcolor=blue,
    urlcolor=blue
}

\\pagestyle{fancy}
\\fancyhf{}
\\rhead{\\small ${escapedTitle}}
\\lhead{\\small Local WebGPU AI}
\\cfoot{\\thepage}

\\title{\\textbf{${escapedTitle}}}
\\author{Local WebGPU Inference \\\\ \\small Model: \\texttt{${escapePlainLatex(modelName)}}}
\\date{${createdDate}}

\\begin{document}
\\maketitle
\\thispagestyle{fancy}

\\vspace{1em}
\\hrule
\\vspace{1.5em}

`;

  for (const message of session.messages) {
    if (!message.content || !message.content.trim()) continue;

    if (message.role === 'user') {
      tex += `\\begin{tcolorbox}[colback=blue!5!white,colframe=blue!40!black,title=\\textbf{User Prompt},arc=3mm]
${escapeLatexText(message.content.trim())}
\\end{tcolorbox}
\\vspace{1em}

`;
    } else if (message.role === 'assistant') {
      const { thinking, answer } = parseThinkingContent(message.content);

      if (thinking && thinking.trim().length > 0) {
        tex += `\\begin{tcolorbox}[colback=purple!5!white,colframe=purple!50!black,title=\\textbf{Internal Reasoning Process},arc=2mm]
\\small
${escapeLatexText(thinking.trim())}
\\end{tcolorbox}
\\vspace{0.5em}

`;
      }

      tex += `\\subsection*{Response}
${escapeLatexText(answer.trim())}

\\vspace{1.5em}
\\hrule
\\vspace{1.5em}

`;
    }
  }

  tex += `\\end{document}\n`;
  return tex;
}

/**
 * Exports a ChatSession to a downloadable .tex file completely offline
 */
export function exportChatSessionToLatex(session: ChatSession): { blob: Blob; filename: string } {
  const texContent = generateLatexSource(session);
  const blob = new Blob([texContent], { type: 'text/x-tex;charset=utf-8' });
  const sanitizedTitle = (session.title || 'chat_session')
    .replace(/[^a-zA-Z0-9_\- ]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .substring(0, 40) || 'chat_export';

  return {
    blob,
    filename: `${sanitizedTitle}.tex`
  };
}

/**
 * Triggers an immediate browser download of the chat as a .tex file
 */
export function downloadChatSessionAsLatex(session: ChatSession): void {
  const { blob, filename } = exportChatSessionToLatex(session);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}
