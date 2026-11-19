/** 大洲中文对照（world-countries 的 region 取值） */
export const CONTINENT_ZH: Record<string, string> = {
  Africa: '非洲',
  Americas: '美洲',
  Asia: '亚洲',
  Europe: '欧洲',
  Oceania: '大洋洲',
  Antarctic: '南极洲',
};

/** 次区域中文对照（world-countries 的 subregion 取值，未收录时回退英文） */
export const SUBREGION_ZH: Record<string, string> = {
  'Northern Africa': '北非',
  'Western Africa': '西非',
  'Middle Africa': '中部非洲',
  'Eastern Africa': '东非',
  'Southern Africa': '南部非洲',
  'Southern Europe': '南欧',
  'Eastern Europe': '东欧',
  'Western Europe': '西欧',
  'Northern Europe': '北欧',
  'Central Europe': '中欧',
  'Southeast Europe': '东南欧',
  'Central Asia': '中亚',
  'Eastern Asia': '东亚',
  'South-Eastern Asia': '东南亚',
  'Southern Asia': '南亚',
  'Western Asia': '西亚',
  'North America': '北美',
  'Northern America': '北美',
  'Central America': '中美',
  Caribbean: '加勒比',
  'South America': '南美',
  'Australia and New Zealand': '澳大利亚与新西兰',
  Melanesia: '美拉尼西亚',
  Micronesia: '密克罗尼西亚',
  Polynesia: '波利尼西亚',
  Antarctica: '南极地区',
};

let languageNames: Intl.DisplayNames | null = null;
try {
  languageNames = new Intl.DisplayNames(['zh'], { type: 'language' });
} catch {
  /* 老浏览器不支持时回退英文名 */
}

let currencyNames: Intl.DisplayNames | null = null;
try {
  currencyNames = new Intl.DisplayNames(['zh'], { type: 'currency' });
} catch {
  /* 同上 */
}

/** Intl.DisplayNames 安全取值：不支持或查不到时返回 null */
function intlOf(dn: Intl.DisplayNames | null, code: string): string | null {
  try {
    const s = dn?.of(code);
    return s && s !== code ? s : null;
  } catch {
    return null;
  }
}

/** 语言 code -> 中文名（回退英文名） */
export function languageZh(code: string, fallbackEn: string): string {
  return intlOf(languageNames, code) ?? fallbackEn;
}

/** 货币 code -> 中文名（查不到返回 null，由调用方回退显示 code） */
export function currencyZh(code: string): string | null {
  return intlOf(currencyNames, code);
}

/** 去掉数字尾部多余的 0：6.80 -> 6.8，14.00 -> 14 */
function trimZero(s: string): string {
  return s.replace(/\.?0+$/, '');
}

/** 人口格式化：亿 / 万 中文单位 */
export function formatPopulation(n: number): string {
  if (!n) return '—';
  if (n >= 1e8) return `${trimZero((n / 1e8).toFixed(2))} 亿`;
  if (n >= 1e4) return `${Math.round(n / 1e4).toLocaleString('zh-CN')} 万`;
  return n.toLocaleString('zh-CN');
}

/** 面积格式化：>= 1万 km² 用「万 km²」 */
export function formatArea(a: number): string {
  if (!a) return '—';
  if (a >= 1e4) return `${trimZero((a / 1e4).toFixed(1))} 万 km²`;
  return `${a.toLocaleString('zh-CN')} km²`;
}

/** 电话区号格式化：root 兼容自带 "+" 前缀的数据；后缀过多时只显示主区号 */
export function formatIDD(idd: { root?: string; suf?: string[] }): string {
  if (!idd.root) return '—';
  const root = idd.root.replace(/^\+/, '');
  if (!idd.suf?.length || idd.suf.length > 3) return `+${root}`;
  return idd.suf.map((s) => `+${root}${s}`).join('、');
}

/** HTML 转义（国名等外部数据渲染前统一过一遍） */
export function escHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string,
  );
}
