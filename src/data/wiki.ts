import type { Country, CountryInsight } from '../types';
import { countryInsightKey, getLocalInsight } from './insights';

const CACHE_VERSION = 'v2';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT = 8000;
const WIKI_API = 'https://zh.wikipedia.org/api/rest_v1/page/mobile-sections/';
const WIKI_SUMMARY_API = 'https://zh.wikipedia.org/api/rest_v1/page/summary/';

interface CachedInsight {
  savedAt: number;
  insight: CountryInsight;
}

interface WikiSection {
  line?: string;
  text?: string;
}

interface WikiMobileResponse {
  title?: string;
  timestamp?: string;
  url?: string;
  lead?: { sections?: WikiSection[] };
  remaining?: { sections?: WikiSection[] };
}

interface WikiSummaryResponse {
  title?: string;
  extract?: string;
  timestamp?: string;
  content_urls?: { desktop?: { page?: string } };
}

interface WikiHistoryResult {
  text: string;
  source: string;
  sourceUrl: string;
  fetchedAt: string;
}

function cacheKey(country: Country): string {
  return `earth-geography:insight:${CACHE_VERSION}:${countryInsightKey(country)}`;
}

function readCache(country: Country): CountryInsight | null {
  try {
    const raw = localStorage.getItem(cacheKey(country));
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedInsight;
    if (!cached.savedAt || Date.now() - cached.savedAt > CACHE_TTL) return null;
    if (!Array.isArray(cached.insight.history) || !Array.isArray(cached.insight.contribution)) return null;
    if (!Array.isArray(cached.insight.worldRecords)) return null;
    return cached.insight;
  } catch {
    return null;
  }
}

function writeCache(country: Country, insight: CountryInsight): void {
  try {
    const cached: CachedInsight = { savedAt: Date.now(), insight };
    localStorage.setItem(cacheKey(country), JSON.stringify(cached));
  } catch {
    // 隐私模式或存储空间不足时，内容仍可正常展示，只跳过缓存。
  }
}

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function pickSection(sections: WikiSection[], keywords: string[]): string | null {
  const match = sections.find((section) => {
    const line = section.line?.replace(/\s+/g, '') ?? '';
    return keywords.some((keyword) => line.includes(keyword));
  });
  if (!match?.text) return null;
  const text = stripHtml(match.text);
  return text || null;
}

function allSections(data: WikiMobileResponse): WikiSection[] {
  return [...(data.lead?.sections ?? []), ...(data.remaining?.sections ?? [])];
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Wikipedia HTTP ${response.status}`);
    return (await response.json()) as T;
  } finally {
    window.clearTimeout(timer);
  }
}

function sourceUrl(title: string): string {
  return `https://zh.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
}

async function fetchFromTitle(title: string): Promise<WikiHistoryResult | null> {
  const encodedTitle = encodeURIComponent(title.replace(/ /g, '_'));
  let sections: WikiSection[] = [];
  let timestamp: string | undefined;
  let pageUrl = sourceUrl(title);

  try {
    const mobile = await fetchJson<WikiMobileResponse>(`${WIKI_API}${encodedTitle}`);
    sections = allSections(mobile);
    timestamp = mobile.timestamp;
    pageUrl = mobile.url || pageUrl;
  } catch {
    // 移动章节接口在个别条目上不存在，继续尝试摘要接口。
  }

  let summary = sections.length > 0 ? stripHtml(sections[0]?.text ?? '') : '';
  if (!summary) {
    const data = await fetchJson<WikiSummaryResponse>(`${WIKI_SUMMARY_API}${encodedTitle}`);
    summary = data.extract?.trim() ?? '';
    timestamp = data.timestamp ?? timestamp;
    pageUrl = data.content_urls?.desktop?.page || pageUrl;
  }
  if (!summary) return null;

  const history = pickSection(sections, ['历史', '沿革', '起源', '独立']) ?? summary;
  return {
    text: history,
    source: '中文维基百科',
    sourceUrl: pageUrl,
    fetchedAt: timestamp ?? new Date().toISOString(),
  };
}

/**
 * 获取国家资料：缓存优先，中文名失败后尝试英文名，最终回退到本地摘要。
 */
export async function loadCountryInsight(country: Country): Promise<CountryInsight> {
  const cached = readCache(country);
  if (cached) return cached;

  const titles = [...new Set([country.zh, country.en].filter(Boolean))];
  for (const title of titles) {
    try {
      const insight = await fetchFromTitle(title);
      if (insight) {
        const local = getLocalInsight(country);
        const merged: CountryInsight = {
          ...local,
          history: [{ text: insight.text }],
          source: insight.source,
          sourceUrl: insight.sourceUrl,
          fetchedAt: insight.fetchedAt,
          fallback: false,
        };
        writeCache(country, merged);
        return merged;
      }
    } catch {
      // 尝试下一个标题，所有标题都失败后使用本地摘要。
    }
  }
  return getLocalInsight(country);
}
