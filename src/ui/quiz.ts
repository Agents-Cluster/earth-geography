import type { Country } from '../types';
import { CONTINENT_ZH, escHtml } from '../data/i18n';

export interface QuizDeps {
  /** 出题池来源（全部国家） */
  getCountries(): Country[];
  /** 回答正确时高亮所选国家 */
  onCorrect(c: Country): void;
  /** 答错/跳过时展示正确答案的高亮 */
  onReveal(c: Country): void;
  /** 清除高亮 */
  onClear(): void;
  /** 测验从内部退出（结算页「退出测验」）时回调，供外部复位入口按钮 */
  onExit?(): void;
}

export interface Quiz {
  isActive(): boolean;
  start(): void;
  stop(): void;
  /** 处理一次地球点击。返回 true 表示已被测验拦截（调用方不再走选中国家流程） */
  handlePick(c: Country | null): boolean;
}

const QUESTIONS_PER_ROUND = 10;
/** 出题池面积下限（km²）：过小的国家在球上无法瞄准，会破坏体验 */
const MIN_AREA = 20000;

/**
 * 地理测验模式：随机抽题「在地球上找到 XX 国」，用户旋转地球点击作答。
 * 答对连击累计，答错/跳过展示正确答案位置；一轮 10 题，结束后结算。
 */
export function createQuiz(el: HTMLElement, deps: QuizDeps): Quiz {
  let active = false;
  let answer: Country | null = null;
  let asked = 0;
  let correct = 0;
  let streak = 0;
  let bestStreak = 0;
  let used: Country[] = [];
  let nextTimer: number | undefined;
  let tipTimer: number | undefined;

  function pool(): Country[] {
    return deps.getCountries().filter((c) => c.centroid && c.area >= MIN_AREA);
  }

  function draw(): Country | null {
    const fresh = pool().filter((c) => !used.includes(c));
    const src = fresh.length ? fresh : pool();
    if (!src.length) return null;
    return src[Math.floor(Math.random() * src.length)];
  }

  function renderQuestion() {
    if (!answer) return;
    const region = CONTINENT_ZH[answer.region] ?? answer.region;
    el.innerHTML = `
      <div class="quiz-head">
        <span class="quiz-progress">第 ${asked + 1} / ${QUESTIONS_PER_ROUND} 题</span>
        <span class="quiz-score">✓ ${correct} · 连击 ${streak}</span>
      </div>
      <div class="quiz-question">在地球上找到</div>
      <div class="quiz-target">${escHtml(answer.zh)}</div>
      <div class="quiz-hint">提示：位于 ${escHtml(region)}</div>
      <div class="quiz-tip"></div>
      <button class="quiz-skip">跳过这题</button>
    `;
    el.querySelector('.quiz-skip')!.addEventListener('click', () => {
      asked++;
      reveal(false, '已跳过');
    });
  }

  function reveal(showAnswer: boolean, verdict: string) {
    if (!answer) return;
    deps.onReveal(answer);
    el.innerHTML = `
      <div class="quiz-feedback">
        <div class="quiz-verdict">${escHtml(verdict)}</div>
        <div class="quiz-answer">正确答案：${escHtml(answer.zh)}</div>
      </div>
      <div class="quiz-foot">下一题马上开始…</div>
    `;
    nextTimer = window.setTimeout(next, showAnswer ? 1800 : 2200);
  }

  function next() {
    deps.onClear();
    if (asked >= QUESTIONS_PER_ROUND) {
      settle();
      return;
    }
    answer = draw();
    renderQuestion();
  }

  function settle() {
    const rate = Math.round((correct / QUESTIONS_PER_ROUND) * 100);
    const praise =
      correct >= 9 ? '地理大神！' : correct >= 7 ? '很棒的水平！' : correct >= 5 ? '不错的成绩' : '继续加油～';
    el.innerHTML = `
      <div class="quiz-settle">
        <div class="quiz-settle-title">本轮结束</div>
        <div class="quiz-settle-score">${correct} / ${QUESTIONS_PER_ROUND}</div>
        <div class="quiz-settle-meta">正确率 ${rate}% · 最佳连击 ${bestStreak}</div>
        <div class="quiz-settle-praise">${praise}</div>
        <div class="quiz-settle-actions">
          <button class="quiz-again">再来一轮</button>
          <button class="quiz-exit">退出测验</button>
        </div>
      </div>
    `;
    el.querySelector('.quiz-again')!.addEventListener('click', () => {
      asked = 0;
      correct = 0;
      streak = 0;
      bestStreak = 0;
      used = [];
      next();
    });
    el.querySelector('.quiz-exit')!.addEventListener('click', () => stop());
  }

  function showTip(text: string) {
    const tip = el.querySelector('.quiz-tip');
    if (!tip) return;
    tip.textContent = text;
    clearTimeout(tipTimer);
    tipTimer = window.setTimeout(() => {
      tip.textContent = '';
    }, 1500);
  }

  return {
    isActive: () => active,

    start() {
      active = true;
      asked = 0;
      correct = 0;
      streak = 0;
      bestStreak = 0;
      used = [];
      el.classList.add('on');
      next();
    },

    stop() {
      active = false;
      clearTimeout(nextTimer);
      clearTimeout(tipTimer);
      deps.onClear();
      el.classList.remove('on');
      el.innerHTML = '';
      deps.onExit?.();
    },

    handlePick(c: Country | null): boolean {
      if (!active) return false;
      // 点在海洋上：轻提示，不算错
      if (!c) {
        showTip('点在陆地上试试～');
        return true;
      }
      used.push(c);
      if (answer && c === answer) {
        asked++;
        correct++;
        streak++;
        bestStreak = Math.max(bestStreak, streak);
        deps.onCorrect(c);
        reveal(true, `回答正确！连击 ×${streak}`);
      } else {
        asked++;
        streak = 0;
        reveal(false, '差一点，再找找');
      }
      return true;
    },
  };
}
