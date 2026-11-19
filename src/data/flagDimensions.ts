/** flagcdn w320 PNG 的稳定尺寸；宽度固定为 320，高度用于加载前预留相同比例。 */
const FLAG_HEIGHTS: Record<number, string> = {
  126: 'qa',
  160: 'ae ai am as au az ba bm bn bs by ca cc ck cu cx dm eh er et fj fk gb gi gs gw hm hn hr hu ie im io jo jm kp kw ky kz lc lk lv ly md me mk mn mp ms my nc nf ng nr nu nz ph pn ps sb sc sd sh si ss st tc tj tk tl to tv vg ws zw',
  168: 'fm lr mh um us',
  172: 'gu',
  176: 'py',
  181: 'sv',
  183: 'ir mx om',
  188: 'cv',
  192: 'bd bg bh bi bz cr de gd gy ht je kg km li lt lu ni tt vu',
  196: 'fi',
  198: 'tg',
  200: 'ar gt pl pw se',
  204: 'ee',
  205: 'kh',
  209: 'ax',
  218: 'bo',
  224: 'ad br',
  229: 'al xk',
  230: 'is',
  233: 'bv fo no sj',
  240: 'cd ga pg sm',
  242: 'dk',
  256: 'mc',
  274: 'ne',
  277: 'be',
  320: 'ch va',
  390: 'np',
};

const heightByCode = new Map<string, number>();
for (const [height, codes] of Object.entries(FLAG_HEIGHTS)) {
  for (const code of codes.split(' ')) heightByCode.set(code, Number(height));
}

export function getFlagDimensions(a2: string): { width: 320; height: number } {
  return { width: 320, height: heightByCode.get(a2.toLowerCase()) ?? 213 };
}
