export interface ParsedMessageContent {
  thinking: string | null;
  isThinkingStreaming: boolean;
  answer: string;
}

export function parseThinkingContent(raw: string): ParsedMessageContent {
  if (!raw) {
    return { thinking: null, isThinkingStreaming: false, answer: '' };
  }

  // 1. Check for complete <think>...</think> or <thought>...</thought> or <reasoning>...</reasoning>
  const closedRegex = /<(think|thought|reasoning)>([\s\S]*?)<\/\1>/i;
  const closedMatch = raw.match(closedRegex);

  if (closedMatch && closedMatch.index !== undefined) {
    const thinking = closedMatch[2].trim();
    const beforeTag = raw.slice(0, closedMatch.index).trim();
    const afterTag = raw.slice(closedMatch.index + closedMatch[0].length).trim();
    const answer = [beforeTag, afterTag].filter(Boolean).join('\n\n');
    return {
      thinking: thinking || null,
      isThinkingStreaming: false,
      answer
    };
  }

  // 2. Check for unclosed <think>... (currently streaming the thinking process)
  const openRegex = /<(think|thought|reasoning)>([\s\S]*)$/i;
  const openMatch = raw.match(openRegex);
  if (openMatch && openMatch.index !== undefined) {
    const beforeTag = raw.slice(0, openMatch.index).trim();
    const thinking = openMatch[2];
    return {
      thinking: thinking,
      isThinkingStreaming: true,
      answer: beforeTag
    };
  }

  // 3. Check for closing </think> without an opening <think>
  const closeOnlyRegex = /([\s\S]*?)<\/(think|thought|reasoning)>/i;
  const closeOnlyMatch = raw.match(closeOnlyRegex);
  if (closeOnlyMatch && closeOnlyMatch.index !== undefined) {
    const thinking = closeOnlyMatch[1].trim();
    const afterTag = raw.slice(closeOnlyMatch.index + closeOnlyMatch[0].length).trim();
    return {
      thinking: thinking || null,
      isThinkingStreaming: false,
      answer: afterTag
    };
  }

  // 4. No thinking tags found
  return {
    thinking: null,
    isThinkingStreaming: false,
    answer: raw
  };
}
