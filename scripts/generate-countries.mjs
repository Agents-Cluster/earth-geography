/**
 * 一次性数据生成脚本（npm run gen:data）
 *
 * 数据源（全部免鉴权）：
 *  1. world-countries（mledoze/countries 的 npm 镜像）：国名/中文名/首都/大洲/邻国/货币/语言/区号/面积/旗帜 emoji
 *  2. 世界银行 API：人口（取各国最新非空值 SP.POP.TOTL）
 *  3. countries-and-timezones：时区 UTC 偏移
 *
 * 运行时零网络依赖，本脚本只在开发期执行一次，产物提交进仓库。
 */
import { writeFile, readFile } from 'node:fs/promises';

/** 中文首都对照表（key = ISO 3166-1 alpha-2）。只收录有把握的条目，缺省时回退英文。 */
const CAPITAL_ZH = {
  // ── 亚洲 ──
  CN: '北京', JP: '东京', KR: '首尔', KP: '平壤', MN: '乌兰巴托', TW: '台北',
  IN: '新德里', PK: '伊斯兰堡', BD: '达卡', LK: '斯里贾亚瓦德纳普拉科特',
  NP: '加德满都', BT: '廷布', MV: '马累', AF: '喀布尔', IR: '德黑兰',
  IQ: '巴格达', SA: '利雅得', YE: '萨那', OM: '马斯喀特', AE: '阿布扎比',
  QA: '多哈', KW: '科威特城', BH: '麦纳麦', IL: '耶路撒冷', PS: '拉马拉',
  JO: '安曼', LB: '贝鲁特', SY: '大马士革', TR: '安卡拉', CY: '尼科西亚',
  GE: '第比利斯', AM: '埃里温', AZ: '巴库', KZ: '阿斯塔纳', UZ: '塔什干',
  TM: '阿什哈巴德', KG: '比什凯克', TJ: '杜尚别', BN: '斯里巴加湾市',
  MY: '吉隆坡', SG: '新加坡', ID: '雅加达', PH: '马尼拉', VN: '河内',
  LA: '万象', TH: '曼谷', MM: '内比都', KH: '金边',
  // ── 欧洲 ──
  RU: '莫斯科', UA: '基辅', BY: '明斯克', MD: '基希讷乌', PL: '华沙',
  LT: '维尔纽斯', LV: '里加', EE: '塔林', FI: '赫尔辛基', SE: '斯德哥尔摩',
  NO: '奥斯陆', DK: '哥本哈根', IS: '雷克雅未克', IE: '都柏林', GB: '伦敦',
  NL: '阿姆斯特丹', BE: '布鲁塞尔', LU: '卢森堡市', FR: '巴黎', MC: '摩纳哥',
  DE: '柏林', CH: '伯尔尼', AT: '维也纳', CZ: '布拉格', SK: '布拉迪斯拉发',
  HU: '布达佩斯', SI: '卢布尔雅那', HR: '萨格勒布', BA: '萨拉热窝',
  RS: '贝尔格莱德', ME: '波德戈里察', MK: '斯科普里', XK: '普里什蒂纳',
  AL: '地拉那', GR: '雅典', BG: '索非亚', RO: '布加勒斯特', IT: '罗马',
  SM: '圣马力诺', VA: '梵蒂冈城', ES: '马德里', AD: '安道尔城',
  PT: '里斯本', MT: '瓦莱塔', LI: '瓦杜兹',
  // ── 非洲 ──
  EG: '开罗', LY: '的黎波里', TN: '突尼斯市', DZ: '阿尔及尔', MA: '拉巴特',
  EH: '阿尤恩', MR: '努瓦克肖特', SN: '达喀尔', GM: '班珠尔', GW: '比绍',
  GN: '科纳克里', SL: '弗里敦', LR: '蒙罗维亚', CI: '亚穆苏克罗',
  GH: '阿克拉', TG: '洛美', BJ: '波多诺伏', BF: '瓦加杜古', ML: '巴马科',
  NE: '尼亚美', NG: '阿布贾', TD: '恩贾梅纳', CF: '班吉', CM: '雅温得',
  GQ: '马拉博', GA: '利伯维尔', CG: '布拉柴维尔', CD: '金沙萨',
  ST: '圣多美', AO: '罗安达', ZM: '卢萨卡', MW: '利隆圭', MZ: '马普托',
  ZW: '哈拉雷', BW: '哈博罗内', NA: '温得和克', ZA: '比勒陀利亚',
  LS: '马塞卢', SZ: '姆巴巴内', MG: '安塔那那利佛', KM: '莫罗尼',
  MU: '路易港', SC: '维多利亚', DJ: '吉布提市', SO: '摩加迪沙',
  SS: '朱巴', SD: '喀土穆', ER: '阿斯马拉', ET: '亚的斯亚贝巴',
  KE: '内罗毕', UG: '坎帕拉', RW: '基加利', BI: '基特加', TZ: '多多马',
  CV: '普拉亚',
  // ── 美洲 ──
  US: '华盛顿', CA: '渥太华', MX: '墨西哥城', GT: '危地马拉市',
  BZ: '贝尔莫潘', SV: '圣萨尔瓦多', HN: '特古西加尔巴', NI: '马那瓜',
  CR: '圣何塞', PA: '巴拿马城', CU: '哈瓦那', JM: '金斯顿', HT: '太子港',
  DO: '圣多明各', BS: '拿骚', BB: '布里奇敦', TT: '西班牙港',
  GD: '圣乔治', DM: '罗索', AG: '圣约翰', KN: '巴斯特尔', LC: '卡斯特里',
  VC: '金斯敦', GY: '乔治敦', SR: '帕拉马里博', UY: '蒙得维的亚',
  PY: '亚松森', BO: '苏克雷', AR: '布宜诺斯艾利斯', CL: '圣地亚哥',
  PE: '利马', EC: '基多', CO: '波哥大', VE: '加拉加斯', BR: '巴西利亚',
  PR: '圣胡安',
  // ── 大洋洲 ──
  AU: '堪培拉', NZ: '惠灵顿', PG: '莫尔兹比港', SB: '霍尼亚拉',
  VU: '维拉港', FJ: '苏瓦', TO: '努库阿洛法', WS: '阿皮亚',
  FM: '帕利基尔', PW: '恩吉鲁穆德', MH: '马朱罗', KI: '塔拉瓦',
  TV: '富纳富提', NR: '亚伦', CK: '阿瓦鲁阿', NU: '阿洛菲',
  // ── 主要属地 ──
  GL: '努克', FO: '托尔斯港', GI: '直布罗陀', NC: '努美阿',
  PF: '帕皮提', GU: '阿加尼亚', BM: '汉密尔顿',
};

/** Natural Earth 图层里 ISO 编码为 -99、且 world-countries 没有对应记录的区域，人工补充 */
const PSEUDO = [
  { id: undefined, a2: '', a3: '', en: 'Somaliland', zh: '索马里兰', cap: [], capZh: '哈尔格萨', region: 'Africa', subregion: 'Eastern Africa', pop: 0, area: 176120, lang: {}, cur: {}, tz: ['UTC+03:00'], idd: { root: '252', suf: [] }, b: [], emoji: '', alt: [] },
  { id: undefined, a2: '', a3: '', en: 'N. Cyprus', zh: '北塞浦路斯', cap: [], capZh: '北尼科西亚', region: 'Asia', subregion: 'Western Asia', pop: 0, area: 3355, lang: {}, cur: {}, tz: ['UTC+02:00'], idd: { root: '392', suf: [] }, b: [], emoji: '', alt: [] },
];

/** 世行人口库缺失条目的人工补充 */
const POP_OVERRIDE = { TWN: 23420536 };

async function main() {
  // ── 1. mledoze 数据 ──
  const wcPath = new URL('../node_modules/world-countries/dist/countries.json', import.meta.url);
  const wc = JSON.parse(await readFile(wcPath, 'utf8'));
  console.log(`world-countries 读取 ${wc.length} 条记录`);

  // ── 2. 世界银行人口（最新非空值） ──
  const wbRes = await fetch(
    'https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&mrnev=1&per_page=500',
  );
  if (!wbRes.ok) throw new Error(`世界银行请求失败: HTTP ${wbRes.status}`);
  const wbJson = await wbRes.json();
  const popByIso3 = new Map(
    (wbJson?.[1] ?? []).map((d) => [d.countryiso3code, d.value]),
  );
  console.log(`世行人口覆盖 ${popByIso3.size} 个条目`);

  // ── 3. 时区 ──
  const ct = await import('countries-and-timezones');
  const tzOf = (a2) => {
    const country = a2 ? ct.getCountry(a2) : null;
    if (!country?.timezones?.length) return [];
    const offsets = new Set();
    for (const tzId of country.timezones) {
      const tz = ct.getTimezone(tzId);
      if (tz?.utcOffsetStr) offsets.add(`UTC${tz.utcOffsetStr}`);
    }
    return [...offsets].sort();
  };

  // ── 合并压缩 ──
  const records = wc.map((c) => ({
    id: c.ccn3 || undefined,
    a2: c.cca2,
    a3: c.cca3,
    en: c.name?.common ?? c.cca3,
    zh: c.translations?.zho?.common || undefined,
    cap: Array.isArray(c.capital) ? c.capital : [],
    capZh: CAPITAL_ZH[c.cca2],
    region: c.region ?? '',
    subregion: c.subregion || undefined,
    pop: c.cca3 ? (popByIso3.get(c.cca3) ?? POP_OVERRIDE[c.cca3] ?? 0) : 0,
    area: c.area ?? 0,
    lang: c.languages ?? {},
    cur: Object.fromEntries(
      Object.entries(c.currencies ?? {}).map(([code, v]) => [code, v.symbol ?? '']),
    ),
    tz: tzOf(c.cca2),
    idd: { root: c.idd?.root, suf: (c.idd?.suffixes ?? []).filter((s) => s) },
    b: c.borders ?? [],
    emoji: c.flag ?? '',
    alt: (c.altSpellings ?? []).map((s) => s.toLowerCase()).slice(0, 6),
  }));
  for (const p of PSEUDO) records.push(p);

  const missingZh = records.filter((r) => !r.zh).length;
  const missingCapZh = records.filter((r) => r.cap.length > 0 && !r.capZh).length;
  console.log(
    `共 ${records.length} 条；缺中文名 ${missingZh} 条、首都缺中文 ${missingCapZh} 条（运行时回退英文）`,
  );

  await writeFile(
    new URL('../src/data/countries.json', import.meta.url),
    JSON.stringify(records),
    'utf8',
  );
  console.log('已写入 src/data/countries.json');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
