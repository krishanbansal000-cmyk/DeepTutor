const MAX_BOARD_STEPS = 10;

/** Split a completed tutor answer into board-sized markdown sections. */
export function lessonStepsFromMarkdown(markdown: string): string[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: string[] = [];
  let buffer: string[] = [];
  let inFence = false;

  const flush = () => {
    const block = buffer.join("\n").trim();
    if (block) blocks.push(block);
    buffer = [];
  };

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      buffer.push(line);
      continue;
    }
    if (!inFence && !line.trim()) {
      flush();
      continue;
    }
    if (!inFence && /^#{1,3}\s+/.test(line) && buffer.length) flush();
    buffer.push(line);
  }
  flush();

  if (blocks.length <= MAX_BOARD_STEPS) return blocks;
  const grouped: string[] = [];
  const groupSize = Math.ceil(blocks.length / MAX_BOARD_STEPS);
  for (let index = 0; index < blocks.length; index += groupSize) {
    grouped.push(blocks.slice(index, index + groupSize).join("\n\n"));
  }
  return grouped;
}

export function boardTitleFromMarkdown(markdown: string): string {
  const heading = markdown.match(/^#{1,3}\s+(.+)$/m)?.[1]?.trim();
  if (heading) return heading.replace(/[*_`]/g, "").slice(0, 90);
  const first = markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#*_`>$]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return first.slice(0, 72) || "Drona teaching board";
}

export function boardSpeechText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " code example ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#*_`>$|]/g, " ")
    .replace(/\\[A-Za-z]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
