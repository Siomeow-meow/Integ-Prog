"use client";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import MessagesShell from "@/app/components/messages/MessagesShell";

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const conversationId = searchParams.get("conversationId") ?? undefined;

  return (
    <MessagesShell
      activeOtherUserId={id}
      initialConversationId={conversationId}
    />
  );
}
