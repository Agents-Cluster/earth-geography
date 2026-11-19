import type { Country } from '../types';
import { CONTINENT_ZH, escHtml } from '../data/i18n';

export interface Tooltip {
  show(c: Country, x: number, y: number): void;
  move(x: number, y: number): void;
  hide(): void;
}

/** 跟随鼠标的玻璃拟态 tooltip：中文名 + 英文名 + 大洲 */
export function createTooltip(el: HTMLElement): Tooltip {
  let visible = false;
  let current: Country | null = null;

  function place(x: number, y: number) {
    const pad = 14;
    let left = x + pad;
    let top = y + pad;
    if (left + el.offsetWidth > window.innerWidth - 10) left = x - el.offsetWidth - pad;
    if (top + el.offsetHeight > window.innerHeight - 10) top = y - el.offsetHeight - pad;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }

  return {
    show(c, x, y) {
      // 同一个国家只更新位置，避免每次 mousemove 都重写 innerHTML
      if (visible && current === c) {
        place(x, y);
        return;
      }
      current = c;
      const region = CONTINENT_ZH[c.region] ?? c.region;
      el.innerHTML = [
        `<div class="tt-zh">${escHtml(c.zh)}</div>`,
        `<div class="tt-en">${escHtml(c.en)}</div>`,
        region ? `<div class="tt-region">${escHtml(region)}</div>` : '',
      ].join('');
      place(x, y);
      el.classList.add('on');
      visible = true;
    },
    move(x, y) {
      if (visible) place(x, y);
    },
    hide() {
      el.classList.remove('on');
      visible = false;
      current = null;
    },
  };
}
