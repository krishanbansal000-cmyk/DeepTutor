import type { StreamEvent } from "./unified-ws";

export type RagCitation = {
  citationId: string;
  kbName: string;
  filename: string;
  pages: string[];
};

function basename(value: string): string {
  return value.split(/[\\/]/).filter(Boolean).pop() ?? value;
}

function pageLabel(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

/** Collect source events into one card per retrieved KB file. */
export function collectRagCitations(
  events: StreamEvent[],
  answer = "",
): RagCitation[] {
  const citations = new Map<string, RagCitation>();

  for (const event of events) {
    if (event.type !== "sources") continue;
    const sources = Array.isArray(event.metadata?.sources)
      ? event.metadata.sources
      : [];
    for (const raw of sources) {
      if (!raw || typeof raw !== "object") continue;
      const source = raw as Record<string, unknown>;
      if (source.type !== "rag") continue;
      const kbName = String(source.kb_name ?? "").trim();
      const filename = basename(
        String(source.title ?? source.source ?? "").trim(),
      );
      if (!kbName || !filename) continue;
      const citationId = String(source.citation_id ?? "").trim();
      const key = citationId || `${kbName}\u0000${filename}`;
      const page = pageLabel(source.page);
      const existing = citations.get(key);
      if (existing) {
        if (page && !existing.pages.includes(page)) existing.pages.push(page);
        continue;
      }
      citations.set(key, {
        citationId,
        kbName,
        filename,
        pages: page ? [page] : [],
      });
    }
  }

  const result = [...citations.values()];
  if (!answer) return result;

  const citedOrder = new Map<string, number>();
  for (const match of answer.matchAll(/\b(rag-\d+)\b/gi)) {
    const id = String(match[1] || "").toLowerCase();
    if (!citedOrder.has(id)) citedOrder.set(id, citedOrder.size);
  }
  return result.sort((a, b) => {
    const aOrder = citedOrder.get(a.citationId.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    const bOrder = citedOrder.get(b.citationId.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder;
  });
}
