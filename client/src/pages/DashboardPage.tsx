import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import api from '../lib/api';

interface Article {
  _id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  topics: string[];
  importance: number;
}

interface Briefing {
  _id: string;
  type: string;
  content: string;
  generatedAt: string;
  articleCount: number;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [articles, setArticles] = useState<Article[]>([]);
  const [latestBriefing, setLatestBriefing] = useState<Briefing | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const topics = user?.preferences.topics.join(',') ?? '';
    Promise.all([
      api.get<{ data: Article[] }>(`/articles?limit=12${topics ? `&topics=${topics}` : ''}`),
      api.get<{ data: Briefing[] }>('/briefings?limit=1'),
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
      const res = await api.post<{ data: Briefing }>('/briefings/generate', { type: 'daily' });
      setLatestBriefing(res.data.data);
    } catch (e) { console.error(e); }
    finally { setGenerating(false); }
  };

  const importanceColor = (n: number) =>
    n >= 8 ? 'bg-red-500' : n >= 6 ? 'bg-orange-500' : 'bg-blue-500';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Good morning, {user?.name.split(' ')[0]} 👋</h1>
          <p className="text-gray-400 mt-1">Here's what's happening in your world</p>
        </div>
        <div className="flex gap-3">
          <Link to="/chat" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition text-sm">
            💬 Ask AI
          </Link>
          <button
            onClick={() => void handleGenerateBriefing()}
            disabled={generating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition text-sm"
          >
            {generating ? '⏳ Generating...' : '📰 Generate Briefing'}
          </button>
        </div>
      </div>

      {/* Latest Briefing */}
      {latestBriefing && (
        <div className="mb-8 p-6 bg-gray-900 border border-gray-800 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">Latest Briefing</h2>
            <span className="text-xs text-gray-500">
              {new Date(latestBriefing.generatedAt).toLocaleDateString()} • {latestBriefing.articleCount} articles
            </span>
          </div>
          <div className="prose prose-invert prose-sm max-w-none text-gray-300 line-clamp-6 whitespace-pre-wrap">
            {latestBriefing.content.slice(0, 600)}...
          </div>
          <Link to={`/briefings/${latestBriefing._id}`} className="text-blue-400 text-sm mt-3 inline-block hover:text-blue-300">
            Read full briefing →
          </Link>
        </div>
      )}

      {/* Article Feed */}
      <h2 className="text-lg font-semibold text-white mb-4">Top Stories</h2>
      {articles.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">📭</p>
          <p>No articles yet. The ingestion worker will populate your feed shortly.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((article) => (
            <a
              key={article._id}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition group"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex gap-2 flex-wrap">
                  {article.topics.slice(0, 2).map((t) => (
                    <span key={t} className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded-full">{t}</span>
                  ))}
                </div>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${importanceColor(article.importance)}`} title={`Importance: ${article.importance}`} />
              </div>
              <h3 className="text-sm font-medium text-white group-hover:text-blue-300 transition line-clamp-2 mb-2">
                {article.title}
              </h3>
              <p className="text-xs text-gray-500 line-clamp-2">{article.summary}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-600">{article.source}</span>
                <span className="text-xs text-gray-600">
                  {new Date(article.publishedAt).toLocaleDateString()}
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
