"use client";

import { BookOpen, ExternalLink, FileText, Globe } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { MessageAttachment } from "@/context/UnifiedChatContext";
import {
  collectRagCitations,
  collectWebCitations,
} from "@/lib/chat-sources";
import { knowledgeBaseFilePath } from "@/lib/knowledge-api";
import type { StreamEvent } from "@/lib/unified-ws";

function mimeTypeFor(filename: string): string {
  return filename.toLowerCase().endsWith(".pdf")
    ? "application/pdf"
    : "application/octet-stream";
}

export default function ChatSourceCitations({
  events,
  answer,
  onOpen,
}: {
  events: StreamEvent[];
  answer?: string;
  onOpen?: (attachment: MessageAttachment) => void;
}) {
  const { t } = useTranslation();
  const ragCitations = useMemo(
    () => collectRagCitations(events, answer),
    [answer, events],
  );
  const webCitations = useMemo(() => collectWebCitations(events), [events]);

  if (!ragCitations.length && !webCitations.length) return null;

  return (
    <section
      id="references"
      className="mt-4 mb-3 rounded-xl border border-[var(--border)]/70 bg-[var(--card)]/70 px-3 py-2.5"
    >
      <div className="mb-2 flex items-center gap-1.5 text-[11.5px] font-medium text-[var(--muted-foreground)]">
        <BookOpen size={13} strokeWidth={1.7} />
        <span>{t("Sources used")}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {ragCitations.map((citation, index) => {
          const firstPage = citation.pages[0];
          const fileUrl = knowledgeBaseFilePath(
            citation.kbName,
            citation.filename,
          );
          const previewUrl = firstPage
            ? `${fileUrl}#page=${encodeURIComponent(firstPage)}`
            : fileUrl;
          const openSource = () =>
            onOpen?.({
              type: "file",
              filename: citation.filename,
              mime_type: mimeTypeFor(citation.filename),
              url: previewUrl,
              id: `kb-source:${citation.kbName}:${citation.filename}:${firstPage || "start"}`,
            });
          const content = (
            <>
              <span
                id={citation.citationId ? `ref-${citation.citationId}` : undefined}
                className="font-mono text-[10px] font-semibold text-[var(--primary)]"
              >
                [{index + 1}]
              </span>
              <FileText size={13} className="shrink-0 text-[var(--muted-foreground)]" />
              <span className="max-w-[260px] truncate">{citation.filename}</span>
              {citation.pages.length > 0 && (
                <span className="shrink-0 text-[10.5px] text-[var(--muted-foreground)]">
                  {t("Page {{page}}", {
                    page: citation.pages.slice(0, 3).join(", "),
                  })}
                </span>
              )}
            </>
          );

          return onOpen ? (
            <button
              key={`${citation.kbName}:${citation.filename}:${citation.citationId}`}
              type="button"
              onClick={openSource}
              className="inline-flex min-w-0 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-[11.5px] text-[var(--foreground)] transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/[0.04]"
              title={t("Open source")}
            >
              {content}
            </button>
          ) : (
            <a
              key={`${citation.kbName}:${citation.filename}:${citation.citationId}`}
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-w-0 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-[11.5px] text-[var(--foreground)] no-underline"
            >
              {content}
            </a>
          );
        })}
        {webCitations.map((citation, webIndex) => {
          const index = ragCitations.length + webIndex;
          const openSource = () =>
            onOpen?.({
              type: "file",
              filename: citation.title,
              mime_type: "text/html",
              url: citation.url,
              id: `web-source:${citation.url}`,
            });
          const content = (
            <>
              <span className="font-mono text-[10px] font-semibold text-[var(--primary)]">
                [{index + 1}]
              </span>
              <Globe
                size={13}
                className="shrink-0 text-[var(--muted-foreground)]"
              />
              <span className="max-w-[260px] truncate">{citation.title}</span>
              <ExternalLink
                size={11}
                className="shrink-0 text-[var(--muted-foreground)]"
              />
            </>
          );

          return onOpen ? (
            <button
              key={citation.url}
              type="button"
              onClick={openSource}
              className="inline-flex min-w-0 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-[11.5px] text-[var(--foreground)] transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/[0.04]"
              title={t("Open source")}
            >
              {content}
            </button>
          ) : (
            <a
              key={citation.url}
              href={citation.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-w-0 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-[11.5px] text-[var(--foreground)] no-underline"
            >
              {content}
            </a>
          );
        })}
      </div>
    </section>
  );
}
