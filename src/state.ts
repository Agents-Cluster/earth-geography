import type { Country } from './types';

type Handler = (c: Country | null) => void;

/** 极简状态源：hover / select 两个状态 + 变更分发 */
export function createStore() {
  const state: { hovered: Country | null; selected: Country | null } = {
    hovered: null,
    selected: null,
  };
  const listeners: { hover: Set<Handler>; select: Set<Handler> } = {
    hover: new Set(),
    select: new Set(),
  };

  return {
    get hovered() {
      return state.hovered;
    },
    get selected() {
      return state.selected;
    },
    setHovered(c: Country | null) {
      if (state.hovered === c) return;
      state.hovered = c;
      listeners.hover.forEach((fn) => fn(c));
    },
    setSelected(c: Country | null) {
      if (state.selected === c) return;
      state.selected = c;
      listeners.select.forEach((fn) => fn(c));
    },
    on(type: 'hover' | 'select', fn: Handler): () => void {
      listeners[type].add(fn);
      return () => listeners[type].delete(fn);
    },
  };
}

export type Store = ReturnType<typeof createStore>;
