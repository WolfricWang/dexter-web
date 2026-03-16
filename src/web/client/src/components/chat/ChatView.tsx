import { useEffect, useCallback, useRef } from 'react';
import { useChat } from '../../api/useChat';
import { MessageList } from './MessageList';
import { InputBar } from './InputBar';

interface ChatViewProps {
  sessionId: string | null;
  onSessionCreated: (id: string) => void;
  model?: string;
  provider?: string;
}

export function ChatView({ sessionId, onSessionCreated, model, provider }: ChatViewProps) {
  const chat = useChat();
  const prevSessionId = useRef<string | null>(null);

  useEffect(() => {
    if (sessionId === prevSessionId.current) return;
    prevSessionId.current = sessionId;

    if (sessionId) {
      // Don't reload if the chat hook already owns this session (e.g. we just created it via sendMessage)
      if (sessionId !== chat.sessionId) {
        chat.loadSession(sessionId);
      }
    } else {
      chat.clearChat();
    }
  }, [sessionId]);

  const handleSend = useCallback(
    async (query: string) => {
      await chat.sendMessage(query, model, provider);
    },
    [chat, model, provider],
  );

  useEffect(() => {
    if (chat.sessionId && chat.sessionId !== sessionId) {
      onSessionCreated(chat.sessionId);
    }
  }, [chat.sessionId, sessionId, onSessionCreated]);

  useEffect(() => {
    const handler = (e: Event) => {
      const query = (e as CustomEvent).detail;
      if (query) handleSend(query);
    };
    window.addEventListener('quickQuery', handler);
    return () => window.removeEventListener('quickQuery', handler);
  }, [handleSend]);

  return (
    <div className="flex flex-col h-full">
      <MessageList messages={chat.messages} isStreaming={chat.isStreaming} />
      <InputBar
        onSend={handleSend}
        onStop={chat.stopGeneration}
        isStreaming={chat.isStreaming}
      />
    </div>
  );
}
