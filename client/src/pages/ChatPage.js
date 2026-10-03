import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../stores/auth.store';
import api from '../lib/api';
export default function ChatPage() {
    const { user } = useAuthStore();
    const [conversationId, setConversationId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [streaming, setStreaming] = useState(false);
    const bottomRef = useRef(null);
    // Create a conversation on mount
    useEffect(() => {
        api.post('/chat/conversations')
            .then((r) => setConversationId(r.data.data.conversationId))
            .catch(console.error);
    }, []);
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    const sendMessage = async () => {
        if (!input.trim() || !conversationId || streaming)
            return;
        const userMsg = { id: Date.now().toString(), role: 'user', content: input };
        setMessages((prev) => [...prev, userMsg]);
        const query = input;
        setInput('');
        setStreaming(true);
        const assistantId = (Date.now() + 1).toString();
        let assistantContent = '';
        setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1'}/chat/conversations/${conversationId}/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify({ query, topics: user?.preferences.topics }),
            });
            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            if (!reader)
                throw new Error('No reader');
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                const lines = decoder.decode(value).split('\n');
                for (const line of lines) {
                    if (!line.startsWith('data: '))
                        continue;
                    try {
                        const event = JSON.parse(line.slice(6));
                        if (event.type === 'token') {
                            assistantContent += event.content ?? '';
                            setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: assistantContent } : m));
                        }
                        else if (event.type === 'done') {
                            setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, sources: event.sources } : m));
                        }
                    }
                    catch { /* skip malformed lines */ }
                }
            }
        }
        catch (err) {
            console.error(err);
            setMessages((prev) => prev.map((m) => m.id === assistantId
                ? { ...m, content: 'Something went wrong. Please try again.' }
                : m));
        }
        finally {
            setStreaming(false);
        }
    };
    return (_jsxs("div", { className: "max-w-3xl mx-auto px-4 py-8 flex flex-col h-screen", children: [_jsx("h1", { className: "text-xl font-bold text-white mb-6", children: "\uD83D\uDCAC Ask NewsOra" }), _jsxs("div", { className: "flex-1 overflow-y-auto space-y-4 mb-4", children: [messages.length === 0 && (_jsxs("div", { className: "text-center py-16 text-gray-500", children: [_jsx("p", { className: "text-4xl mb-3", children: "\uD83E\uDD16" }), _jsx("p", { className: "font-medium text-gray-400", children: "Ask me anything about the news" }), _jsx("p", { className: "text-sm mt-2", children: "I'll search recent articles and cite my sources." })] })), messages.map((msg) => (_jsx("div", { className: `flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`, children: _jsxs("div", { className: `max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-800 text-gray-100'}`, children: [_jsxs("p", { className: "whitespace-pre-wrap text-sm leading-relaxed", children: [msg.content, streaming && msg.role === 'assistant' && msg.content === '' && (_jsx("span", { className: "inline-block w-2 h-4 bg-blue-400 animate-pulse ml-1" }))] }), msg.sources && msg.sources.length > 0 && (_jsxs("div", { className: "mt-3 pt-3 border-t border-gray-700", children: [_jsx("p", { className: "text-xs text-gray-500 mb-2", children: "Sources:" }), msg.sources.map((s, i) => (_jsxs("a", { href: s.url, target: "_blank", rel: "noopener noreferrer", className: "block text-xs text-blue-400 hover:text-blue-300 truncate", children: ["[", i + 1, "] ", s.title, " \u2014 ", s.source] }, i)))] }))] }) }, msg.id))), _jsx("div", { ref: bottomRef })] }), _jsxs("div", { className: "flex gap-3", children: [_jsx("input", { value: input, onChange: (e) => setInput(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            void sendMessage();
                        } }, placeholder: "Ask about the news...", disabled: streaming, className: "flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition disabled:opacity-50" }), _jsx("button", { onClick: () => void sendMessage(), disabled: !input.trim() || streaming, className: "px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl transition", children: streaming ? '⏳' : '→' })] })] }));
}
