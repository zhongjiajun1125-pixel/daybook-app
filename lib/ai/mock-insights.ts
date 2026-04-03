import type { Entry, InsightBundle } from "@/types";

function topWords(entries: Entry[]) {
  const words = new Map<string, number>();
  entries
    .flatMap((entry) => entry.content.split(/[\s，。、“”‘’！？；：,.!?;:]+/))
    .filter((word) => word.length >= 2)
    .forEach((word) => {
      words.set(word, (words.get(word) ?? 0) + 1);
    });

  return [...words.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
}

export function buildMockInsights(entries: Entry[]): InsightBundle {
  const words = topWords(entries);
  const hasVoice = entries.some((entry) => entry.input_mode === "voice");
  const hasMixed = entries.some((entry) => entry.input_mode === "mixed");

  return {
    themes: words.slice(0, 3).map((word) => `你最近常常回到「${word}」附近。`),
    tensions: [
      hasVoice ? "说出来的时候更快，留下来的时候更稳。" : "这几天更像在慢慢整理自己。",
      hasMixed ? "有些句子先冲出来，后来又被收紧了。" : "表达还在继续聚拢。"
    ],
    repeatedPatterns: [
      "最近几次记录之间，语气正在变得更靠近核心。",
      "反复出现的不是事件本身，而是停住的地方。"
    ],
    suggestedTags: words.slice(0, 4)
  };
}
