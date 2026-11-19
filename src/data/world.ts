import { feature } from 'topojson-client';
import { geoCentroid, geoArea } from 'd3-geo';
import type { FeatureCollection, Geometry } from 'geojson';
import topology from 'world-atlas/countries-50m.json';
import rawJson from './countries.json';
import type { Country, RawCountry } from '../types';

/**
 * 构建「几何 + 属性」合并后的国家列表：
 * - Natural Earth（world-atlas countries-50m）提供国界几何，feature.id 为 ISO numeric
 * - countries.json 提供中文名、人口、邻国等属性
 * 两者通过 ISO numeric 匹配；NE 编码为 -99 的特殊区域（挪威/科索沃等）回退按英文名匹配，
 * 仍无结果的（索马里兰/北塞浦路斯）命中人工补充的 pseudo 记录。
 *
 * NE 中同一条记录可能对应多条 feature（澳大利亚本土与塔斯马尼亚同为 036），
 * 按 record 聚合到同一个 Country 并共享拾取编码，选中时全部区域一起高亮。
 */
const rawList = rawJson as unknown as RawCountry[];

const byNumeric = new Map<string, RawCountry>();
const byName = new Map<string, RawCountry>();
for (const r of rawList) {
  if (r.id) byNumeric.set(r.id, r);
  byName.set(r.en.toLowerCase(), r);
}

const collection = feature(topology, topology.objects.countries) as unknown as FeatureCollection<Geometry>;

/** 全部国家（按 record 去重；含未出现在地图上的记录，供搜索与邻国解析） */
export const countries: Country[] = [];
/** 有国界几何、可被拾取的国家子集（code = 下标 + 1） */
export const pickableCountries: Country[] = [];
/** alpha-3 -> Country（邻国 chip 跳转用） */
export const countryByA3 = new Map<string, Country>();

/** 未能匹配到属性数据的 NE feature 名（应恒为空，供测试断言） */
export const unmatchedFeatures: string[] = [];

// 按 record 聚合 feature
const byRecord = new Map<RawCountry, Country>();
for (const f of collection.features) {
  const id = f.id != null ? String(f.id) : '';
  const name = ((f.properties as { name?: string } | null)?.name ?? '').toLowerCase();
  const rec = (id && id !== '-99' ? byNumeric.get(id) : undefined) ?? byName.get(name);
  if (!rec) {
    unmatchedFeatures.push(name || id);
    continue;
  }
  let country = byRecord.get(rec);
  if (!country) {
    country = { ...rec, zh: rec.zh || rec.en, features: [], centroid: null };
    byRecord.set(rec, country);
    countries.push(country);
    if (rec.a3) countryByA3.set(rec.a3, country);
  }
  country.features.push(f);
}

// 无几何的记录也纳入列表（搜索可查、详情卡可看，只是不能飞行定位）
for (const r of rawList) {
  if (r.a3 && !countryByA3.has(r.a3)) {
    const country: Country = { ...r, zh: r.zh || r.en, features: [], centroid: null };
    countries.push(country);
    countryByA3.set(r.a3, country);
  }
}

// 分配拾取编码；质心取球面面积最大的那块几何
for (const c of countries) {
  if (!c.features.length) continue;
  c.code = pickableCountries.length + 1;
  pickableCountries.push(c);
  let best = c.features[0];
  let bestArea = -1;
  for (const f of c.features) {
    const area = geoArea(f);
    if (area > bestArea) {
      bestArea = area;
      best = f;
    }
  }
  c.centroid = geoCentroid(best);
}

if (unmatchedFeatures.length) console.warn('未匹配到属性数据的区域：', unmatchedFeatures);
