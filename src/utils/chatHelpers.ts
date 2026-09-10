import { ChatMessage } from '../types';

/**
 * Prunes chat message history to strictly fit within the WebGPU KV-cache budget.
 * Prevents memory limit crashes after 3-4 prompts in the same chat.
 */
export function buildPrunedChatHistory(
  systemPrompt: string,
  messages: ChatMessage[],
  contextWindowSize: number = 3072,
  maxOutputTokens: number = 4096
): { role: 'system' | 'user' | 'assistant'; content: string }[] {
  // Approximate character-to-token ratio (avg ~3.8 chars per token for English & code)
  const estimateTokens = (text: string): number => Math.ceil((text || '').length / 3.8);

  // Leave budget for output tokens
  const outputReservation = Math.min(maxOutputTokens, Math.floor(contextWindowSize * 0.45));
  const maxHistoryBudget = Math.max(800, contextWindowSize - outputReservation);

  const systemTokens = estimateTokens(systemPrompt);
  let remainingBudget = maxHistoryBudget - systemTokens;

  // Filter valid messages: ignore empty or whitespace-only messages from aborted completions
  const validMessages = messages.filter(
    (m) => m && m.content && m.content.trim().length > 0
  );

  const selectedMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];

  // Traverse backwards from newest to oldest message
  for (let i = validMessages.length - 1; i >= 0; i--) {
    const msg = validMessages[i];
    const cost = estimateTokens(msg.content) + 4; // overhead per message turn

    if (cost <= remainingBudget || selectedMessages.length === 0) {
      selectedMessages.unshift({
        role: msg.role,
        content: msg.content.trim()
      });
      remainingBudget -= cost;
    } else {
      // Cannot fit older turns within KV-cache budget
      break;
    }
  }

  return [
    { role: 'system', content: systemPrompt },
    ...selectedMessages
  ];
}

/**
 * Detects if model generation has entered an infinite text repetition loop
 * (common with certain quantizations like Phi-4 Mini on small contexts).
 */
export function detectTextRepetition(text: string): boolean {
  if (!text || text.length < 90) return false;

  // Check repeating phrase lengths from 18 to 60 characters
  for (let len = 18; len <= 60; len += 4) {
    if (text.length < len * 3) continue;
    const chunk1 = text.slice(-len);
    const chunk2 = text.slice(-len * 2, -len);
    const chunk3 = text.slice(-len * 3, -len * 2);

    if (chunk1 === chunk2 && chunk2 === chunk3) {
      return true;
    }
  }

  // Also check newline-delimited line loops
  const lines = text.split('\n').filter((l) => l.trim().length > 10);
  if (lines.length >= 4) {
    const last1 = lines[lines.length - 1].trim();
    const last2 = lines[lines.length - 2].trim();
    const last3 = lines[lines.length - 3].trim();
    if (last1 === last2 && last2 === last3) {
      return true;
    }
  }

  return false;
}

/**
 * Trims repeating trailing phrase once a loop is detected so final output is clean.
 */
export function trimRepetitionLoop(text: string): string {
  for (let len = 18; len <= 60; len += 4) {
    if (text.length < len * 3) continue;
    const chunk1 = text.slice(-len);
    const chunk2 = text.slice(-len * 2, -len);
    if (chunk1 === chunk2) {
      return text.slice(0, -len).trim();
    }
  }
  return text.trim();
}
