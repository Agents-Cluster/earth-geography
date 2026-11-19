import type { Feature, Geometry } from 'geojson';

/** scripts/generate-countries.mjs 生成的原始国家记录（字段均为压缩后的短名） */
export interface RawCountry {
  /** ISO 3166-1 numeric，如 "156"；Natural Earth 编码为 -99 的区域无此字段 */
  id?: string;
  /** ISO alpha-2，如 "CN" */
  a2: string;
  /** ISO alpha-3，如 "CHN" */
  a3: string;
  /** 英文简称 */
  en: string;
  /** 中文简称（数据集缺省时运行时回退英文） */
  zh?: string;
  /** 英文首都 */
  cap: string[];
  /** 中文首都（可缺省，回退英文） */
  capZh?: string;
  /** 大洲（英文） */
  region: string;
  /** 次区域（英文，可缺省） */
  subregion?: string;
  /** 人口 */
  pop: number;
  /** 面积 km² */
  area: number;
  /** 语言：ISO 639 code -> 英文名 */
  lang: Record<string, string>;
  /** 货币：ISO 4217 code -> 符号 */
  cur: Record<string, string>;
  /** 时区偏移，如 "UTC+08:00" */
  tz: string[];
  /** 国际电话区号 */
  idd: { root?: string; suf?: string[] };
  /** 陆上邻国（alpha-3） */
  b: string[];
  /** 旗帜 emoji */
  emoji: string;
  /** 英文别名（小写，用于搜索） */
  alt: string[];
}

/** 运行时国家：原始记录 + 国界几何 + 拾取编码 */
export interface Country extends RawCountry {
  /** 中文名（保证非空：缺省时回退英文名） */
  zh: string;
  /**
   * 国界几何数组。Natural Earth 中同一条记录可能对应多条 feature
   * （如澳大利亚本土与塔斯马尼亚同为 ISO 036），合并后共享拾取编码，
   * 选中时全部区域一起高亮。人工补充的记录没有几何。
   */
  features: Feature<Geometry>[];
  /** 质心 [经度, 纬度]（度），取面积最大那块几何的质心；无几何时为 null */
  centroid: [number, number] | null;
  /** 颜色索引拾取编码（= 可拾取列表下标 + 1）；无几何时为 undefined */
  code?: number;
}
