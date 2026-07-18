"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  AskUserOptions,
  extractAskUserPayload,
} from "@/components/chat/home/AskUserOptions";
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
  onSubmitUserReply,
}: {
  question: string;
  content: string;
  events: StreamEvent[];
  isStreaming: boolean;
  onOpenSource?: (attachment: MessageAttachment) => void;
  onSubmitUserReply: (reply: {
    text?: string;
    answers?: Array<{ questionId: string; text: string }>;
  }) => void;
}) {
  const { t } = useTranslation();
  const checkpoint = useMemo(() => extractAskUserPayload(events), [events]);
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
      className="flex min-h-0 min-w-0 flex-1 py-1.5 sm:py-2"
    >
      <TeachingBoard
        embedded
        title={title}
        steps={steps}
        streaming={isStreaming && generatedSteps.length > 0}
        checkpointPending={Boolean(checkpoint && !checkpoint.resolved)}
        checkpoint={
          checkpoint ? (
            <div aria-label={t("Classroom checkpoint")}>
              <AskUserOptions
                data={checkpoint}
                onSubmit={onSubmitUserReply}
                collapsible={checkpoint.resolved}
                defaultCollapsed={checkpoint.resolved}
              />
            </div>
          ) : undefined
        }
        activity={
          isStreaming ? (
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
