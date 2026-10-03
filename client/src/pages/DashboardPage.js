import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import api from '../lib/api';
export default function DashboardPage() {
    const { user } = useAuthStore();
    const [articles, setArticles] = useState([]);
    const [latestBriefing, setLatestBriefing] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const topics = user?.preferences.topics.join(',') ?? '';
        Promise.all([
            api.get(`/articles?limit=12${topics ? `&topics=${topics}` : ''}`),
            api.get('/briefings?limit=1'),
        ])
            .then(([articlesRes, briefingsRes]) => {
            setArticles(articlesRes.data.data);
            setLatestBriefing(briefingsRes.data.data[0] ?? null);
        })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [user?.preferences.topics]);
    const handleGenerateBriefing = async () => {
        setGenerating(true);
        try {
            const res = await api.post('/briefings/generate', { type: 'daily' });
            setLatestBriefing(res.data.data);
        }
        catch (e) {
            console.error(e);
        }
        finally {
            setGenerating(false);
        }
    };
    const importanceColor = (n) => n >= 8 ? 'bg-red-500' : n >= 6 ? 'bg-orange-500' : 'bg-blue-500';
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsx("div", { className: "w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" }) }));
    }
    return (_jsxs("div", { className: "max-w-7xl mx-auto px-4 py-8", children: [_jsxs("div", { className: "flex items-center justify-between mb-8", children: [_jsxs("div", { children: [_jsxs("h1", { className: "text-2xl font-bold text-white", children: ["Good morning, ", user?.name.split(' ')[0], " \uD83D\uDC4B"] }), _jsx("p", { className: "text-gray-400 mt-1", children: "Here's what's happening in your world" })] }), _jsxs("div", { className: "flex gap-3", children: [_jsx(Link, { to: "/chat", className: "px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition text-sm", children: "\uD83D\uDCAC Ask AI" }), _jsx("button", { onClick: () => void handleGenerateBriefing(), disabled: generating, className: "px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition text-sm", children: generating ? '⏳ Generating...' : '📰 Generate Briefing' })] })] }), latestBriefing && (_jsxs("div", { className: "mb-8 p-6 bg-gray-900 border border-gray-800 rounded-2xl", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("h2", { className: "text-lg font-semibold text-white", children: "Latest Briefing" }), _jsxs("span", { className: "text-xs text-gray-500", children: [new Date(latestBriefing.generatedAt).toLocaleDateString(), " \u2022 ", latestBriefing.articleCount, " articles"] })] }), _jsxs("div", { className: "prose prose-invert prose-sm max-w-none text-gray-300 line-clamp-6 whitespace-pre-wrap", children: [latestBriefing.content.slice(0, 600), "..."] }), _jsx(Link, { to: `/briefings/${latestBriefing._id}`, className: "text-blue-400 text-sm mt-3 inline-block hover:text-blue-300", children: "Read full briefing \u2192" })] })), _jsx("h2", { className: "text-lg font-semibold text-white mb-4", children: "Top Stories" }), articles.length === 0 ? (_jsxs("div", { className: "text-center py-16 text-gray-500", children: [_jsx("p", { className: "text-4xl mb-3", children: "\uD83D\uDCED" }), _jsx("p", { children: "No articles yet. The ingestion worker will populate your feed shortly." })] })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: articles.map((article) => (_jsxs("a", { href: article.url, target: "_blank", rel: "noopener noreferrer", className: "block bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition group", children: [_jsxs("div", { className: "flex items-start justify-between gap-2 mb-2", children: [_jsx("div", { className: "flex gap-2 flex-wrap", children: article.topics.slice(0, 2).map((t) => (_jsx("span", { className: "text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded-full", children: t }, t))) }), _jsx("span", { className: `w-2 h-2 rounded-full flex-shrink-0 mt-1 ${importanceColor(article.importance)}`, title: `Importance: ${article.importance}` })] }), _jsx("h3", { className: "text-sm font-medium text-white group-hover:text-blue-300 transition line-clamp-2 mb-2", children: article.title }), _jsx("p", { className: "text-xs text-gray-500 line-clamp-2", children: article.summary }), _jsxs("div", { className: "flex items-center justify-between mt-3", children: [_jsx("span", { className: "text-xs text-gray-600", children: article.source }), _jsx("span", { className: "text-xs text-gray-600", children: new Date(article.publishedAt).toLocaleDateString() })] })] }, article._id))) }))] }));
}
