import type { Country, CountryInsight, HighlightToken, RawCountry } from '../types';
import rawCountries from './countries.json';
import { getCountryFacts } from './countryFacts';

/** 国家资料的稳定键。属地和争议地区可能没有 ISO alpha-3。 */
export function countryInsightKey(country: Pick<Country, 'a3' | 'id' | 'en'>): string {
  return country.a3 || country.id || country.en;
}

const REGION_HISTORY: Record<string, string> = {
  Africa: '其历史受到古代贸易网络、殖民时期与独立建国进程的共同影响，现代社会也延续着多元族群和文化传统。',
  Americas: '其历史交织着原住民文明、跨大西洋交流与近现代国家建构，形成了多层次的社会与文化传统。',
  Asia: '其历史延续了古代文明、区域贸易与近现代国家建构的长期演变，社会文化具有鲜明的地域连续性。',
  Europe: '其历史与古代文明、宗教传统、近代国家形成和现代一体化进程紧密相连，留下了丰富的制度与文化遗产。',
  Oceania: '其历史植根于海洋迁徙、原住民传统与近现代跨洲交流，现代社会保留了独特的岛屿文化记忆。',
  Antarctic: '其现代历史主要围绕科学考察、国际合作与南极环境治理展开。',
};

const REGION_NAME_ZH: Record<string, string> = {
  Africa: '非洲',
  Americas: '美洲',
  Asia: '亚洲',
  Europe: '欧洲',
  Oceania: '大洋洲',
  Antarctic: '南极洲',
};

const HISTORY_OVERRIDES: Record<string, HighlightToken[]> = {
  CHN: [
    { text: '中国拥有延续' },
    { text: '数千年的文明史', kind: 'time' },
    { text: '，先后形成' },
    { text: '秦汉', kind: 'time' },
    { text: '以来的统一国家传统，并经历近现代社会转型，建立了现代中国。' },
  ],
  IND: [
    { text: '印度河流域文明、古典王朝、伊斯兰王朝与殖民时期共同塑造了印度历史，' },
    { text: '1947 年独立', kind: 'time' },
    { text: '后成为现代共和国。' },
  ],
  EGY: [
    { text: '埃及孕育了' },
    { text: '尼罗河文明和古代王国', kind: 'geography' },
    { text: '，后经历希腊罗马、伊斯兰与近代国家时期。' },
  ],
  GRC: [
    { text: '古希腊城邦创造了重要的' },
    { text: '哲学与政治传统', kind: 'technology' },
    { text: '，之后历经希腊化、拜占庭和奥斯曼时期。' },
  ],
  FRA: [
    { text: '法国经历高卢、法兰克王国、君主制与' },
    { text: '1789 年革命', kind: 'time' },
    { text: '，并发展为现代共和国。' },
  ],
  GBR: [
    { text: '英国经历' },
    { text: '议会制度发展与工业革命', kind: 'technology' },
    { text: '，并逐步形成现代国家。' },
  ],
  USA: [
    { text: '美国于' },
    { text: '1776 年宣布独立', kind: 'time' },
    { text: '，随后经历联邦建设、内战与工业化。' },
  ],
  JPN: [
    { text: '日本经历古代律令国家、幕府时代和' },
    { text: '明治维新', kind: 'time' },
    { text: '，随后完成现代化转型。' },
  ],
  RUS: [
    { text: '俄罗斯历史从东欧罗斯和莫斯科公国发展到' },
    { text: '帝国、苏联与现代联邦', kind: 'time' },
    { text: '，经历了深刻的政治和社会变迁。' },
  ],
  ZAF: [
    { text: '南非经历原住民社会、殖民扩张、' },
    { text: '种族隔离与民主转型', kind: 'time' },
    { text: '，1994 年后建立现代民主制度。' },
  ],
};

function makeLocalInsight(record: RawCountry): CountryInsight {
  const name = record.zh || record.en;
  const regionName = REGION_NAME_ZH[record.region] ?? '所在地区';
  const history =
    HISTORY_OVERRIDES[record.a3] ?? [
      {
        text: `${name}的历史与${regionName}的文明交流、社会变迁和现代国家建构相连。${REGION_HISTORY[record.region] ?? '这些经历形成了具有地域特色的文化传统。'}`,
      },
    ];
  const facts = getCountryFacts(record);
  return {
    history,
    contribution: facts.contribution,
    worldRecords: facts.worldRecords,
    source: '本地资料摘要',
    fallback: true,
    contributionSource: facts.contributionSource,
  };
}

const localInsightEntries = (rawCountries as unknown as RawCountry[]).map((record) => [
  record.a3 || record.id || record.en,
  makeLocalInsight(record),
] as const);

/** 全量本地兜底内容；与 countries.json 同步构建。 */
export const localInsights = new Map<string, CountryInsight>(localInsightEntries);

export function getLocalInsight(country: Country): CountryInsight {
  return localInsights.get(countryInsightKey(country)) ?? makeLocalInsight(country);
}
