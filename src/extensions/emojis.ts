import { CompletionContext, type CompletionResult } from "@codemirror/autocomplete";

const EMOJIS = [
  { label: ":smile:", detail: "😄", apply: "😄" },
  { label: ":joy:", detail: "😂", apply: "😂" },
  { label: ":sob:", detail: "😭", apply: "😭" },
  { label: ":heart:", detail: "❤️", apply: "❤️" },
  { label: ":thumbsup:", detail: "👍", apply: "👍" },
  { label: ":thumbsdown:", detail: "👎", apply: "👎" },
  { label: ":rocket:", detail: "🚀", apply: "🚀" },
  { label: ":fire:", detail: "🔥", apply: "🔥" },
  { label: ":check:", detail: "✅", apply: "✅" },
  { label: ":x:", detail: "❌", apply: "❌" },
  { label: ":warning:", detail: "⚠️", apply: "⚠️" },
  { label: ":bulb:", detail: "💡", apply: "💡" },
  { label: ":star:", detail: "⭐", apply: "⭐" },
  { label: ":tada:", detail: "🎉", apply: "🎉" },
  { label: ":eyes:", detail: "👀", apply: "👀" },
  { label: ":100:", detail: "💯", apply: "💯" },
  { label: ":pencil:", detail: "✏️", apply: "✏️" },
  { label: ":book:", detail: "📖", apply: "📖" },
  { label: ":brain:", detail: "🧠", apply: "🧠" },
  { label: ":atom:", detail: "⚛️", apply: "⚛️" },
  { label: ":chart:", detail: "📈", apply: "📈" },
  { label: ":calendar:", detail: "📅", apply: "📅" },
  { label: ":clock:", detail: "⏰", apply: "⏰" },
  { label: ":bell:", detail: "🔔", apply: "🔔" },
  { label: ":search:", detail: "🔍", apply: "🔍" },
  { label: ":link:", detail: "🔗", apply: "🔗" },
  { label: ":image:", detail: "🖼️", apply: "🖼️" },
  { label: ":video:", detail: "📹", apply: "📹" },
  { label: ":audio:", detail: "🔊", apply: "🔊" },
  { label: ":file:", detail: "📁", apply: "📁" },
];

export function emojiCompletion(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/:\w*/);
  if (!word) return null;
  if (word.from === word.to && !context.explicit) return null;

  return {
    from: word.from,
    options: EMOJIS,
  };
}
