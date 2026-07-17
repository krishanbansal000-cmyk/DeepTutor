import test from "node:test";
import assert from "node:assert/strict";

import { collectRagCitations } from "../lib/chat-sources";
import type { StreamEvent } from "../lib/unified-ws";

function sourcesEvent(sources: Array<Record<string, unknown>>): StreamEvent {
  return {
    type: "sources",
    source: "rag",
    stage: "responding",
    content: "",
    metadata: { sources },
    timestamp: 0,
  };
}

test("collectRagCitations deduplicates chunks and retains retrieved pages", () => {
  const citations = collectRagCitations([
    sourcesEvent([
      {
        type: "rag",
        kb_name: "bu-c-programming",
        title: "books/c-programming.pdf",
        citation_id: "rag-123456",
        page: 18,
      },
      {
        type: "rag",
        kb_name: "bu-c-programming",
        title: "books/c-programming.pdf",
        citation_id: "rag-123456",
        page: 19,
      },
      {
        type: "rag",
        kb_name: "bu-c-programming",
        title: "books/c-programming.pdf",
        citation_id: "rag-123456",
        page: 18,
      },
    ]),
  ]);

  assert.deepEqual(citations, [
    {
      citationId: "rag-123456",
      kbName: "bu-c-programming",
      filename: "c-programming.pdf",
      pages: ["18", "19"],
    },
  ]);
});

test("collectRagCitations orders cards by citation appearance in the answer", () => {
  const citations = collectRagCitations(
    [
      sourcesEvent([
        {
          type: "rag",
          kb_name: "kb",
          title: "first.pdf",
          citation_id: "rag-111111",
        },
        {
          type: "rag",
          kb_name: "kb",
          title: "second.pdf",
          citation_id: "rag-222222",
        },
      ]),
    ],
    "The second source supports this [rag-222222].",
  );

  assert.deepEqual(
    citations.map((citation) => citation.filename),
    ["second.pdf", "first.pdf"],
  );
});
