import { useState, useCallback, useRef } from 'react';
import { api, type SessionMessage } from './client';

export interface ToolEvent {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  status: 'running' | 'done' | 'error';
  progressMessage?: string;
  result?: string;
  error?: string;
  duration?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  thinking?: string[];
  tools?: ToolEvent[];
  tokenUsage?: { inputTokens: number; outputTokens: number; totalTokens: number };
  duration?: number;
  tokensPerSecond?: number;
}

export function useChat() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const toolCounterRef = useRef(0);

  const loadSession = useCallback(async (id: string) => {
    const { session } = await api.getSession(id);
    setSessionId(id);
    setMessages(
      session.messages.map((m: SessionMessage) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      })),
    );
  }, []);

  const clearChat = useCallback(() => {
    setSessionId(null);
    setMessages([]);
    setIsStreaming(false);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const sendMessage = useCallback(
    async (query: string, model?: string, provider?: string) => {
      const userMsg: ChatMessage = {
        role: 'user',
        content: query,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        thinking: [],
        tools: [],
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsStreaming(true);
      toolCounterRef.current = 0;

      try {
        const { sessionId: sid } = await api.sendMessage({
          sessionId: sessionId || undefined,
          query,
          model,
          provider,
        });
        setSessionId(sid);

        const token = localStorage.getItem('dexter_token');
        const streamUrl = token
          ? `/api/chat/${sid}/stream?token=${encodeURIComponent(token)}`
          : `/api/chat/${sid}/stream`;
        const es = new EventSource(streamUrl);
        eventSourceRef.current = es;

        const updateAssistant = (updater: (msg: ChatMessage) => ChatMessage) => {
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last?.role === 'assistant') {
              copy[copy.length - 1] = updater({ ...last });
            }
            return copy;
          });
        };

        es.addEventListener('thinking', (e: MessageEvent) => {
          const data = JSON.parse(e.data);
          if (data.message?.trim()) {
            updateAssistant((msg) => ({
              ...msg,
              thinking: [...(msg.thinking || []), data.message],
            }));
          }
        });

        es.addEventListener('tool_start', (e: MessageEvent) => {
          const data = JSON.parse(e.data);
          const toolId = `tool_${toolCounterRef.current++}`;
          const toolEvent: ToolEvent = {
            id: toolId,
            tool: data.tool,
            args: data.args,
            status: 'running',
          };
          updateAssistant((msg) => ({
            ...msg,
            tools: [...(msg.tools || []), toolEvent],
          }));
        });

        es.addEventListener('tool_progress', (e: MessageEvent) => {
          const data = JSON.parse(e.data);
          updateAssistant((msg) => {
            const tools = [...(msg.tools || [])];
            const running = tools.filter((t) => t.status === 'running' && t.tool === data.tool);
            const last = running[running.length - 1];
            if (last) {
              last.progressMessage = data.message;
            }
            return { ...msg, tools };
          });
        });

        es.addEventListener('tool_end', (e: MessageEvent) => {
          const data = JSON.parse(e.data);
          updateAssistant((msg) => {
            const tools = [...(msg.tools || [])];
            const running = tools.filter((t) => t.status === 'running' && t.tool === data.tool);
            const last = running[running.length - 1];
            if (last) {
              last.status = 'done';
              last.duration = data.duration;
              last.result = data.result;
            }
            return { ...msg, tools };
          });
        });

        es.addEventListener('tool_error', (e: MessageEvent) => {
          const data = JSON.parse(e.data);
          updateAssistant((msg) => {
            const tools = [...(msg.tools || [])];
            const running = tools.filter((t) => t.status === 'running' && t.tool === data.tool);
            const last = running[running.length - 1];
            if (last) {
              last.status = 'error';
              last.error = data.error;
            }
            return { ...msg, tools };
          });
        });

        es.addEventListener('done', (e: MessageEvent) => {
          const data = JSON.parse(e.data);
          updateAssistant((msg) => ({
            ...msg,
            content: data.answer || '',
            duration: data.totalTime,
            tokenUsage: data.tokenUsage,
            tokensPerSecond: data.tokensPerSecond,
          }));
          setIsStreaming(false);
          es.close();
          eventSourceRef.current = null;
        });

        es.onerror = () => {
          setIsStreaming(false);
          es.close();
          eventSourceRef.current = null;
        };
      } catch (err) {
        setIsStreaming(false);
        const errMsg = err instanceof Error ? err.message : String(err);
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === 'assistant') {
            copy[copy.length - 1] = { ...last, content: `Error: ${errMsg}` };
          }
          return copy;
        });
      }
    },
    [sessionId],
  );

  const stopGeneration = useCallback(async () => {
    if (sessionId) {
      try {
        await api.stopGeneration(sessionId);
      } catch {
        // ignore
      }
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
  }, [sessionId]);

  return {
    sessionId,
    messages,
    isStreaming,
    sendMessage,
    stopGeneration,
    loadSession,
    clearChat,
    setSessionId,
  };
}
