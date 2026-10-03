import { StateGraph, START, END, Annotation } from '@langchain/langgraph';
import Groq from 'groq-sdk';
import { config } from '../config/index.js';
import { Article, User } from '../models/index.js';
import { hybridSearch } from '../services/rag/search.js';
import { logger } from '../utils/logger.js';

// ─── State Definition ─────────────────────────────────────────────────────────

const BriefingState = Annotation.Root({
  userId: Annotation<string>(),
  briefingType: Annotation<'daily' | 'weekly'>(),
  userTopics: Annotation<string[]>(),
  rawArticles: Annotation<Article[]>(),
  filteredArticles: Annotation<Article[]>(),
  sections: Annotation<BriefingSection[]>(),
  finalBriefing: Annotation<string>(),
  error: Annotation<string | undefined>(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface Article {
  _id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: Date;
  topics: string[];
  importance: number;
}

interface BriefingSection {
  topic: string;
  headline: string;
  summary: string;
  articles: Array<{ title: string; source: string; url: string }>;
}

type BriefingStateType = typeof BriefingState.State;

// ─── LLM Client ───────────────────────────────────────────────────────────────

const groq = new Groq({ apiKey: config.GROQ_API_KEY });

// ─── Graph Nodes ──────────────────────────────────────────────────────────────

/**
 * Node 1: Load user preferences and collect top articles for their topics.
 */
async function collectNode(state: BriefingStateType): Promise<Partial<BriefingStateType>> {
  try {
    const user = await User.findById(state.userId);
    if (!user) return { error: 'User not found' };

    const userTopics = user.preferences.topics.length > 0
      ? user.preferences.topics
      : ['Technology', 'Business', 'Science'];

    // Fetch recent articles for user topics
    const hoursBack = state.briefingType === 'daily' ? 24 : 168;
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    const articleDocs = await Article.find({
      topics: { $in: userTopics },
      publishedAt: { $gte: since },
    })
      .sort({ importance: -1, publishedAt: -1 })
      .limit(30)
      .lean();

    const rawArticles: Article[] = articleDocs.map((a) => ({
      _id: a._id.toString(),
      title: a.title,
      summary: a.summary,
      source: a.source,
      url: a.url,
      publishedAt: a.publishedAt,
      topics: a.topics,
      importance: a.importance,
    }));

    logger.debug({ count: rawArticles.length }, 'Briefing: articles collected');
    return { userTopics, rawArticles };
  } catch (err) {
    return { error: String(err) };
  }
}

/**
 * Node 2: Filter articles by importance and deduplicate by topic.
 * Keeps top-3 per topic, max 15 total.
 */
async function filterNode(state: BriefingStateType): Promise<Partial<BriefingStateType>> {
  const articles = state.rawArticles;
  if (!articles || articles.length === 0) {
    return { filteredArticles: [] };
  }

  // Group by primary topic
  const byTopic = new Map<string, Article[]>();
  for (const article of articles) {
    const primaryTopic = article.topics[0] ?? 'General';
    const existing = byTopic.get(primaryTopic) ?? [];
    if (existing.length < 3) {
      byTopic.set(primaryTopic, [...existing, article]);
    }
  }

  // Flatten, sort by importance
  const filtered = [...byTopic.values()]
    .flat()
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 15);

  logger.debug({ count: filtered.length }, 'Briefing: articles filtered');
  return { filteredArticles: filtered };
}

/**
 * Node 3: LLM-powered section generation per topic.
 */
async function analyzeNode(state: BriefingStateType): Promise<Partial<BriefingStateType>> {
  const articles = state.filteredArticles;
  if (!articles || articles.length === 0) return { sections: [] };

  // Group by topic for section generation
  const byTopic = new Map<string, Article[]>();
  for (const article of articles) {
    const topic = article.topics[0] ?? 'General';
    byTopic.set(topic, [...(byTopic.get(topic) ?? []), article]);
  }

  const sections: BriefingSection[] = [];

  for (const [topic, topicArticles] of byTopic) {
    const articleSummaries = topicArticles
      .map((a, i) => `${i + 1}. ${a.title} (${a.source}): ${a.summary}`)
      .join('\n');

    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{
          role: 'user',
          content: `Create a briefing section for the topic "${topic}". Respond with JSON only.

Articles:
${articleSummaries}

Required JSON format:
{"headline": "<catchy 1-line headline for this topic>", "summary": "<2-3 sentence executive summary combining all articles>"}`,
        }],
        temperature: 0.3,
        max_tokens: 200,
      });

      const text = completion.choices[0]?.message?.content ?? '';
      const match = /\{[\s\S]*\}/.exec(text);
      if (!match) throw new Error('No JSON in response');

      const parsed = JSON.parse(match[0]) as { headline?: string; summary?: string };

      sections.push({
        topic,
        headline: parsed.headline ?? `${topic} Update`,
        summary: parsed.summary ?? topicArticles.map((a) => a.summary).join(' '),
        articles: topicArticles.map((a) => ({
          title: a.title,
          source: a.source,
          url: a.url,
        })),
      });
    } catch {
      // Fallback section without LLM
      sections.push({
        topic,
        headline: `${topic} Update`,
        summary: topicArticles.map((a) => a.summary).join(' ').slice(0, 300),
        articles: topicArticles.map((a) => ({ title: a.title, source: a.source, url: a.url })),
      });
    }
  }

  return { sections };
}

/**
 * Node 4: Compile all sections into a final formatted briefing.
 */
async function writeNode(state: BriefingStateType): Promise<Partial<BriefingStateType>> {
  const sections = state.sections;
  if (!sections || sections.length === 0) {
    return { finalBriefing: 'No news to report for your topics today.' };
  }

  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const typeLabel = state.briefingType === 'daily' ? 'Daily' : 'Weekly';
  let briefing = `# ${typeLabel} News Briefing — ${date}\n\n`;

  for (const section of sections) {
    briefing += `## ${section.topic}: ${section.headline}\n\n`;
    briefing += `${section.summary}\n\n`;
    briefing += section.articles
      .map((a) => `- [${a.title}](${a.url}) — *${a.source}*`)
      .join('\n');
    briefing += '\n\n';
  }

  return { finalBriefing: briefing };
}

// ─── Conditional Edge ─────────────────────────────────────────────────────────

function shouldContinue(state: BriefingStateType): string {
  if (state.error) return END;
  if (!state.rawArticles || state.rawArticles.length === 0) return END;
  return 'filter';
}

// ─── Build Graph ──────────────────────────────────────────────────────────────

const graph = new StateGraph(BriefingState)
  .addNode('collect', collectNode)
  .addNode('filter', filterNode)
  .addNode('analyze', analyzeNode)
  .addNode('write', writeNode)
  .addEdge(START, 'collect')
  .addConditionalEdges('collect', shouldContinue, { filter: 'filter', [END]: END })
  .addEdge('filter', 'analyze')
  .addEdge('analyze', 'write')
  .addEdge('write', END);

export const briefingGraph = graph.compile();

// ─── Run Briefing ─────────────────────────────────────────────────────────────

export interface BriefingOutput {
  content: string;
  sections: BriefingSection[];
  articleCount: number;
}

export async function runBriefingAgent(
  userId: string,
  briefingType: 'daily' | 'weekly',
): Promise<BriefingOutput> {
  const result = await briefingGraph.invoke({
    userId,
    briefingType,
    userTopics: [],
    rawArticles: [],
    filteredArticles: [],
    sections: [],
    finalBriefing: '',
    error: undefined,
  });

  if (result.error) {
    throw new Error(result.error);
  }

  return {
    content: result.finalBriefing,
    sections: result.sections,
    articleCount: result.filteredArticles.length,
  };
}
