/**
 * RSS feed URLs mapped by topic.
 * Google News RSS is unlimited, real-time, and free.
 * These are the primary data sources for news ingestion.
 */

export const TOPIC_FEEDS: Record<string, string[]> = {
  AI: [
    'https://news.google.com/rss/search?q=artificial+intelligence+machine+learning&hl=en-US&gl=US&ceid=US:en',
    'https://news.google.com/rss/search?q=large+language+models+LLM&hl=en-US&gl=US&ceid=US:en',
  ],
  Crypto: [
    'https://news.google.com/rss/search?q=cryptocurrency+bitcoin+ethereum&hl=en-US&gl=US&ceid=US:en',
    'https://cointelegraph.com/rss',
  ],
  Startups: [
    'https://news.google.com/rss/search?q=startup+funding+venture+capital&hl=en-US&gl=US&ceid=US:en',
    'https://techcrunch.com/feed/',
  ],
  Finance: [
    'https://news.google.com/rss/search?q=stock+market+finance+economy&hl=en-US&gl=US&ceid=US:en',
  ],
  Technology: [
    'https://news.google.com/rss/search?q=technology+tech+news&hl=en-US&gl=US&ceid=US:en',
    'https://feeds.arstechnica.com/arstechnica/index',
  ],
  Science: [
    'https://news.google.com/rss/search?q=science+research+discovery&hl=en-US&gl=US&ceid=US:en',
  ],
  Health: [
    'https://news.google.com/rss/search?q=health+medicine+medical&hl=en-US&gl=US&ceid=US:en',
  ],
  Climate: [
    'https://news.google.com/rss/search?q=climate+change+environment&hl=en-US&gl=US&ceid=US:en',
  ],
  Politics: [
    'https://news.google.com/rss/search?q=politics+government+policy&hl=en-US&gl=US&ceid=US:en',
  ],
  Business: [
    'https://news.google.com/rss/search?q=business+corporate+economy&hl=en-US&gl=US&ceid=US:en',
  ],
  Cybersecurity: [
    'https://news.google.com/rss/search?q=cybersecurity+hacking+data+breach&hl=en-US&gl=US&ceid=US:en',
  ],
  Space: [
    'https://news.google.com/rss/search?q=space+nasa+spacex+astronomy&hl=en-US&gl=US&ceid=US:en',
  ],
  Fintech: [
    'https://news.google.com/rss/search?q=fintech+financial+technology&hl=en-US&gl=US&ceid=US:en',
  ],
  Gaming: [
    'https://news.google.com/rss/search?q=gaming+video+games&hl=en-US&gl=US&ceid=US:en',
  ],
  Regulation: [
    'https://news.google.com/rss/search?q=regulation+law+policy+compliance&hl=en-US&gl=US&ceid=US:en',
  ],
};

/** All supported topic names for the predefined topic list */
export const SUPPORTED_TOPICS = Object.keys(TOPIC_FEEDS);

/**
 * Get feed URLs for a list of user-selected topics.
 * Falls back to a Google News general query for unknown topics.
 */
export function getFeedsForTopics(topics: string[]): string[] {
  const feedSet = new Set<string>();

  for (const topic of topics) {
    const feeds = TOPIC_FEEDS[topic];
    if (feeds) {
      feeds.forEach((f) => feedSet.add(f));
    } else {
      // Freeform topic fallback — query Google News RSS directly
      const encoded = encodeURIComponent(topic);
      feedSet.add(
        `https://news.google.com/rss/search?q=${encoded}&hl=en-US&gl=US&ceid=US:en`,
      );
    }
  }

  return Array.from(feedSet);
}

/** Sorted list of all predefined topic keys — used by the UI and preferences validation. */
export const PREDEFINED_TOPICS: string[] = Object.keys(TOPIC_FEEDS).sort();
