import axios from 'axios';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { logger } from '../../utils/logger.js';

/**
 * Attempt to extract the full article text from a URL using Mozilla Readability.
 * Falls back to an empty string if the page is paywalled or JS-heavy.
 */
export async function extractArticleContent(url: string): Promise<string> {
  try {
    const response = await axios.get<string>(url, {
      timeout: 12_000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; NewsOra/1.0; +https://github.com/newsora)',
        Accept: 'text/html,application/xhtml+xml',
      },
      maxContentLength: 2 * 1024 * 1024, // 2 MB cap
    });

    const dom = new JSDOM(response.data, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article?.textContent) return '';

    // Trim to 4 000 chars to protect M0 storage budget
    return article.textContent.replace(/\s+/g, ' ').trim().slice(0, 4_000);
  } catch (err) {
    logger.debug({ url, err }, 'Content extraction failed — using snippet only');
    return '';
  }
}
