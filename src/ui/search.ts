import type { Country } from '../types';
import { escHtml } from '../data/i18n';

export interface SearchDeps {
  getCountries(): Country[];
  onSelect(c: Country): void;
  /** 当前选中国家（失焦回显用，可缺省） */
  getSelected?(): Country | null;
}

/**
 * 顶部搜索框：中/英文国名模糊匹配 + 键盘操作（↑↓ 切换候选、Enter 选中、Esc 收起）。
 * 选中后由外部回调执行飞行定位 + 打开详情卡。
 */
export function createSearch(container: HTMLElement, deps: SearchDeps) {
  container.innerHTML = `
    <input class="search-input" type="text"
      placeholder="搜索国家（中文 / English）"
      aria-label="搜索国家，支持中文、英文或 ISO 代码"
      autocomplete="off" spellcheck="false" />
    <ul class="search-list"></ul>
  `;
  const input = container.querySelector<HTMLInputElement>('.search-input')!;
  const list = container.querySelector<HTMLUListElement>('.search-list')!;

  let items: Country[] = [];
  let active = 0;

  /** 打分匹配：完全相等 > 前缀 > 包含 > 别名包含；同分按人口排序 */
  function query(q: string): Country[] {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const scored: Array<{ c: Country; score: number }> = [];
    for (const c of deps.getCountries()) {
      const zh = c.zh.toLowerCase();
      const en = c.en.toLowerCase();
      let score = Infinity;
      if (zh === s || en === s || c.a2.toLowerCase() === s || c.a3.toLowerCase() === s) {
        score = 0;
      } else if (zh.startsWith(s) || en.startsWith(s)) {
        score = 1;
      } else if (zh.includes(s) || en.includes(s)) {
        score = 2;
      } else if (c.alt.some((a) => a.includes(s))) {
        score = 3;
      }
      if (score < Infinity) scored.push({ c, score });
    }
    scored.sort((a, b) => a.score - b.score || b.c.pop - a.c.pop);
    return scored.slice(0, 8).map((x) => x.c);
  }

  function render() {
    if (!items.length) {
      // 有输入但无匹配：显示空态而不是收起
      if (input.value.trim()) {
        list.innerHTML = '<li class="search-empty">未找到匹配的国家，换个关键词试试</li>';
        list.classList.add('on');
      } else {
        list.classList.remove('on');
        list.innerHTML = '';
      }
      return;
    }
    list.innerHTML = items
      .map(
        (c, i) => `
        <li data-i="${i}" class="${i === active ? 'active' : ''}">
          <span class="s-zh">${escHtml(c.zh)}</span>
          <span class="s-en">${escHtml(c.en)}</span>
        </li>`,
      )
      .join('');
    list.classList.add('on');
    // 用 mousedown 而非 click：阻止 input 先失焦导致列表提前收起
    for (const li of list.querySelectorAll('li')) {
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        select(items[Number((li as HTMLElement).dataset.i)]);
      });
    }
  }

  function select(c: Country) {
    deps.onSelect(c);
    // 输入框回填所选国名并全选，方便直接输入下一个关键词
    input.value = c.zh;
    closeList();
    input.focus();
    input.select();
  }

  function closeList() {
    items = [];
    active = 0;
    list.classList.remove('on');
  }

  input.addEventListener('input', () => {
    active = 0;
    items = query(input.value);
    render();
  });
  input.addEventListener('focus', () => {
    if (input.value.trim()) {
      active = 0;
      items = query(input.value);
      render();
    }
  });
  input.addEventListener('blur', () => {
    // 失焦时若尚未选择，输入框回显当前选中国家（或清空）
    setTimeout(() => {
      if (!input.value.trim() && deps.getSelected?.()) input.value = deps.getSelected()!.zh;
      closeList();
    }, 120);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeList();
      input.blur();
      return;
    }
    if (!items.length || items[0] === undefined) return;
    if (e.key === 'ArrowDown') {
      active = (active + 1) % items.length;
      render();
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      active = (active - 1 + items.length) % items.length;
      render();
      e.preventDefault();
    } else if (e.key === 'Enter') {
      select(items[active]);
    }
  });
}
