import type { CompletionContext, CompletionResult } from "@codemirror/autocomplete";

import { gemoji } from 'gemoji';

const EMOJIS = gemoji.flatMap(g => g.names.map(name => ({
  label: `:${name}:`,
  detail: g.emoji,
  apply: g.emoji,
  // Add boost for common ones? 
  // boost: g.tags.includes('smile') ? 99 : 0 // Optional optimization
})));

export function emojiCompletion(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/:\w*/);
  if (!word) return null;
  if (word.from === word.to && !context.explicit) return null;

  return {
    from: word.from,
    options: EMOJIS,
  };
}
