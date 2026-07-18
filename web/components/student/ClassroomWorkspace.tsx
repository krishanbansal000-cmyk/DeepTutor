"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import ChatSourceCitations from "@/components/chat/home/ChatSourceCitations";
import { AssistantActivity } from "@/components/chat/home/TracePanels";
import type { MessageAttachment } from "@/context/UnifiedChatContext";
import {
  boardTitleFromMarkdown,
  lessonStepsFromMarkdown,
} from "@/lib/teaching-board";
import type { StreamEvent } from "@/lib/unified-ws";

import { TeachingBoard } from "./TeachingBoard";

export default function ClassroomWorkspace({
  question,
  content,
  events,
  isStreaming,
  onOpenSource,
}: {
  question: string;
  content: string;
  events: StreamEvent[];
  isStreaming: boolean;
  onOpenSource?: (attachment: MessageAttachment) => void;
}) {
  const { t } = useTranslation();
  const generatedSteps = useMemo(
    () => lessonStepsFromMarkdown(content),
    [content],
  );
  const steps = generatedSteps.length
    ? generatedSteps
    : [
        isStreaming
          ? t("Drona is preparing the lesson on the board...")
          : t("Ask a question below to begin the classroom lesson."),
      ];
  const title = boardTitleFromMarkdown(question || content || t("Classroom"));

  return (
    <section
      aria-label={t("Classroom")}
      className="flex min-h-0 min-w-0 flex-1 py-3"
    >
      <TeachingBoard
        embedded
        title={title}
        steps={steps}
        streaming={isStreaming && generatedSteps.length > 0}
        activity={
          isStreaming || events.length > 0 ? (
            <AssistantActivity
              events={events}
              isStreaming={isStreaming}
              content={content}
            />
          ) : undefined
        }
        supplementary={
          <ChatSourceCitations
            events={events}
            answer={content}
            onOpen={onOpenSource}
          />
        }
      />
    </section>
  );
}
