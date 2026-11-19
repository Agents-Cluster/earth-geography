import type { Country, CountryInsight, HighlightToken, InsightSource, WorldRecord } from '../types';
import {
  CONTINENT_ZH,
  SUBREGION_ZH,
  languageZh,
  currencyZh,
  formatPopulation,
  formatArea,
  formatIDD,
  escHtml,
} from '../data/i18n';
import { getLocalInsight } from '../data/insights';
import { loadCountryInsight } from '../data/wiki';

export interface PanelDeps {
  /** alpha-3 -> Country（解析邻国） */
  getCountry(a3: string): Country | undefined;
  /** 邻国 chip 点击回调（跳转 + 打开新详情卡） */
  onSelect(c: Country): void;
  /** 详情卡被关闭时回调（同步清除选中态与 URL） */
  onClosed?(): void;
}

export interface DetailPanel {
  open(c: Country): void;
  close(): void;
  isOpen(): boolean;
}

/** 详情卡：旗帜图 + 中英文名 + 大洲标签 + 属性行 + 邻国 chips */
export function createPanel(el: HTMLElement, deps: PanelDeps): DetailPanel {
  let opened = false;
  let requestId = 0;

  function open(c: Country) {
    const currentRequest = ++requestId;
    el.innerHTML = render(c, getLocalInsight(c), true);
    el.classList.add('open');
    opened = true;
    bindEvents();

    void loadCountryInsight(c).then((insight) => {
      if (!opened || currentRequest !== requestId) return;
      const insightEl = el.querySelector<HTMLElement>('.panel-insights');
      if (!insightEl) return;
      insightEl.outerHTML = renderInsights(insight, false);
    });
  }

  function close() {
    requestId += 1;
    el.classList.remove('open');
    opened = false;
  }

  function bindEvents() {
    el.querySelector('.panel-close')?.addEventListener('click', () => {
      close();
      deps.onClosed?.();
    });
    el.querySelectorAll<HTMLButtonElement>('.chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = deps.getCountry(btn.dataset.a3 ?? '');
        if (target) deps.onSelect(target);
      });
    });
  }

  function render(c: Country, insight: CountryInsight, loading: boolean): string {
    const flag = c.a2
      ? `<img class="panel-flag" src="https://flagcdn.com/w320/${c.a2.toLowerCase()}.png"
            alt="${escHtml(c.en)} 旗帜" onerror="this.style.display='none'">`
      : c.emoji
        ? `<div class="panel-flag panel-flag-fallback">${escHtml(c.emoji)}</div>`
        : '';

    const region = CONTINENT_ZH[c.region] ?? c.region;
    const sub = c.subregion ? SUBREGION_ZH[c.subregion] ?? c.subregion : null;
    // 多首都国家：中文词条只收录一个，其余以英文补充在 title 里
    const capitalText = escHtml((c.capZh ?? c.cap.join('、')) || '—');
    const capitalTitle = c.cap.length > 1 ? escHtml(c.cap.join(' / ')) : undefined;

    const langs = Object.entries(c.lang)
      .map(([code, en]) => languageZh(code, en))
      .join('、');

    const currencies = Object.entries(c.cur)
      .map(([code, sym]) => {
        const zh = currencyZh(code);
        return `${zh ?? code}${sym ? `（${escHtml(sym)}）` : ''}`;
      })
      .join('、');

    const tz = c.tz.length
      ? `${escHtml(c.tz.slice(0, 4).join('、'))}${c.tz.length > 4 ? ` 等 ${c.tz.length} 个时区` : ''}`
      : '—';

    const neighbors = c.b
      .map((a3) => deps.getCountry(a3))
      .filter((n): n is Country => !!n);
    const chips = neighbors.length
      ? neighbors
          .map(
            (n) =>
              `<button class="chip" data-a3="${escHtml(n.a3)}" title="查看 ${escHtml(n.zh)}">${escHtml(n.zh)}</button>`,
          )
          .join('')
      : '<span class="panel-empty">四面环海，没有陆上邻国</span>';

    return `
      <button class="panel-close" aria-label="关闭">✕</button>
      ${flag}
      <h2 class="panel-name-zh">${escHtml(c.zh)}</h2>
      <div class="panel-name-en">${escHtml(c.en)}</div>
      <div class="panel-region">
        ${region ? `<span>${escHtml(region)}</span>` : ''}
        ${sub ? `<span>${escHtml(sub)}</span>` : ''}
      </div>
      <dl class="panel-grid">
        <div class="p-row"><dt>首都</dt><dd ${capitalTitle ? `title="${capitalTitle}"` : ''}>${capitalText}</dd></div>
        <div class="p-row"><dt>人口</dt><dd>${formatPopulation(c.pop)}</dd></div>
        <div class="p-row"><dt>面积</dt><dd>${formatArea(c.area)}</dd></div>
        <div class="p-row"><dt>官方语言</dt><dd>${langs ? escHtml(langs) : '—'}</dd></div>
        <div class="p-row"><dt>货币</dt><dd>${currencies ? escHtml(currencies) : '—'}</dd></div>
        <div class="p-row"><dt>时区</dt><dd>${tz}</dd></div>
        <div class="p-row"><dt>电话区号</dt><dd>${formatIDD(c.idd)}</dd></div>
      </dl>
      ${renderInsights(insight, loading)}
      <h3 class="section">${neighbors.length ? `陆上邻国 · ${neighbors.length}` : '地理概况'}</h3>
      <div class="chips">${chips}</div>
    `;
  }

  function renderInsights(insight: CountryInsight, loading: boolean): string {
    const historySource = insight.source
      ? renderSource({ name: insight.source, url: insight.sourceUrl })
      : '';
    const contributionSource = insight.contributionSource
      ? renderSource(insight.contributionSource)
      : '本地资料摘要';
    let updated = '';
    if (insight.fetchedAt) {
      const date = new Date(insight.fetchedAt);
      if (!Number.isNaN(date.getTime())) {
        updated = ` · 更新于 ${escHtml(new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(date))}`;
      }
    }
    const historyStatus = loading
      ? '正在查询中文维基百科…'
      : `来源：${historySource || '本地资料摘要'}${updated}`;
    return `
      <section class="panel-insights" aria-live="polite">
        <h3 class="section">历史概览</h3>
        <p class="panel-copy">${renderTokens(insight.history)}</p>
        <div class="panel-source">${historyStatus}</div>
        <h3 class="section">世界贡献</h3>
        <p class="panel-copy">${renderTokens(insight.contribution)}</p>
        <div class="panel-source">来源：${contributionSource}${insight.fallback ? ' · 本地结构化事实' : ''}</div>
        <h3 class="section">世界之最</h3>
        ${renderWorldRecords(insight.worldRecords)}
      </section>
    `;
  }

  function renderTokens(tokens: HighlightToken[]): string {
    return tokens
      .map((token) => {
        const text = escHtml(token.text);
        return token.kind ? `<mark class="keyword keyword-${token.kind}">${text}</mark>` : text;
      })
      .join('');
  }

  function renderSource(source: InsightSource): string {
    const url = source.url?.startsWith('https://') ? source.url : null;
    if (!url) return escHtml(source.name);
    return `<a href="${escHtml(url)}" target="_blank" rel="noreferrer">${escHtml(source.name)}</a>`;
  }

  function renderWorldRecords(records: WorldRecord[]): string {
    if (!records.length) return '<p class="panel-empty">暂无可靠世界纪录</p>';
    return `<div class="world-records">${records
      .map(
        (record) => `
          <article class="world-record">
            <h4>${escHtml(record.title)}</h4>
            <p class="panel-copy">${renderTokens(record.detail)}</p>
            <div class="panel-source">来源：${renderSource(record.source)}</div>
          </article>`,
      )
      .join('')}</div>`;
  }

  return {
    open,
    close,
    isOpen: () => opened,
  };
}
