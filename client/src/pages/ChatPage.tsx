import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../stores/auth.store';
import api from '../lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ title: string; url: string; source: string }>;
}

export default function ChatPage() {
  const { user } = useAuthStore();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Create a conversation on mount
  useEffect(() => {
    api.post<{ data: { conversationId: string } }>('/chat/conversations')
      .then((r) => setConversationId(r.data.data.conversationId))
      .catch(console.error);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !conversationId || streaming) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    const query = input;
    setInput('');
    setStreaming(true);

    const assistantId = (Date.now() + 1).toString();
    let assistantContent = '';
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1'}/chat/conversations/${conversationId}/stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: JSON.stringify({ query, topics: user?.preferences.topics }),
        },
      );

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value).split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6)) as {
              type: string; content?: string;
              sources?: Array<{ title: string; url: string; source: string }>;
            };

            if (event.type === 'token') {
              assistantContent += event.content ?? '';
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, content: assistantContent } : m)
              );
            } else if (event.type === 'done') {
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, sources: event.sources } : m)
              );
            }
          } catch { /* skip malformed lines */ }
        }
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) =>
        prev.map((m) => m.id === assistantId
          ? { ...m, content: 'Something went wrong. Please try again.' }
          : m)
      );
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col h-screen">
      <h1 className="text-xl font-bold text-white mb-6">💬 Ask NewsOra</h1>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <p className="text-4xl mb-3">🤖</p>
            <p className="font-medium text-gray-400">Ask me anything about the news</p>
            <p className="text-sm mt-2">I'll search recent articles and cite my sources.</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-100'
            }`}>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {msg.content}
                {streaming && msg.role === 'assistant' && msg.content === '' && (
                  <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-1" />
                )}
              </p>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <p className="text-xs text-gray-500 mb-2">Sources:</p>
                  {msg.sources.map((s, i) => (
                    <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                      className="block text-xs text-blue-400 hover:text-blue-300 truncate">
                      [{i + 1}] {s.title} — {s.source}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
          placeholder="Ask about the news..."
          disabled={streaming}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition disabled:opacity-50"
        />
        <button
          onClick={() => void sendMessage()}
          disabled={!input.trim() || streaming}
          className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl transition"
        >
          {streaming ? '⏳' : '→'}
        </button>
      </div>
    </div>
  );
}
