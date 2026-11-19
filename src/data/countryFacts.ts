import type { Country, HighlightToken, InsightSource, WorldRecord } from '../types';

function countryInsightKey(country: Pick<Country, 'a3' | 'id' | 'en'>): string {
  return country.a3 || country.id || country.en;
}

export interface CountryFacts {
  contribution: HighlightToken[];
  contributionSource?: InsightSource;
  worldRecords: WorldRecord[];
}

const UNESCO: InsightSource = {
  name: '联合国教科文组织',
  url: 'https://www.unesco.org/en',
};
const UN: InsightSource = {
  name: '联合国',
  url: 'https://www.un.org/en/',
};
const UNESCO_GREAT_WALL: InsightSource = {
  name: '联合国教科文组织：长城',
  url: 'https://whc.unesco.org/en/list/438/',
};
const UNESCO_GIZA: InsightSource = {
  name: '联合国教科文组织：孟菲斯及其墓地',
  url: 'https://whc.unesco.org/en/list/86/',
};
const WORLD_BANK_AREA: InsightSource = {
  name: '世界银行：国土面积数据',
  url: 'https://data.worldbank.org/indicator/AG.SRF.TOTL.K2',
};
const GUINNESS_COAST: InsightSource = {
  name: '吉尼斯世界纪录：最长海岸线',
  url: 'https://www.guinnessworldrecords.com/world-records/longest-coastline',
};
const GUINNESS_BUILDING: InsightSource = {
  name: '吉尼斯世界纪录：最高建筑',
  url: 'https://www.guinnessworldrecords.com/world-records/tallest-building',
};
const BRITANNICA_KAZ: InsightSource = {
  name: '大英百科全书：哈萨克斯坦',
  url: 'https://www.britannica.com/place/Kazakhstan',
};
const NATIONAL: Record<string, InsightSource> = {
  CHN: { name: '中国国家文物局', url: 'https://www.ncha.gov.cn/' },
  FRA: { name: '法国外交部', url: 'https://www.diplomatie.gouv.fr/en/' },
  GBR: { name: '英国国家档案馆', url: 'https://www.nationalarchives.gov.uk/' },
  JPN: { name: '日本外务省', url: 'https://www.mofa.go.jp/' },
  KOR: { name: '韩国政府', url: 'https://www.korea.net/' },
  USA: { name: '美国国家航空航天局', url: 'https://www.nasa.gov/' },
  ARE: { name: '阿联酋政府', url: 'https://u.ae/en' },
  CHE: { name: '瑞士联邦政府', url: 'https://www.admin.ch/gov/en/start.html' },
  ZAF: { name: '南非政府', url: 'https://www.gov.za/' },
};

const facts: Record<string, CountryFacts> = {
  CHN: {
    contribution: [
      { text: '中国在' },
      { text: '造纸、印刷、火药和指南针', kind: 'technology' },
      { text: '等技术，以及哲学、文学、农业和工程领域留下了广泛世界影响。' },
    ],
    contributionSource: UNESCO,
    worldRecords: [
      {
        title: '世界最长的城墙体系',
        detail: [
          { text: '中国的' },
          { text: '长城', kind: 'geography' },
          { text: '是世界规模最大的古代防御工程之一。' },
        ],
        source: UNESCO_GREAT_WALL,
      },
    ],
  },
  IND: {
    contribution: [
      { text: '印度在' },
      { text: '数学、医学、语言文学和宗教思想', kind: 'technology' },
      { text: '等领域持续贡献全球知识体系。' },
    ],
    contributionSource: UNESCO,
    worldRecords: [],
  },
  EGY: {
    contribution: [
      { text: '埃及在文字、建筑、历法、医学和' },
      { text: '考古遗产', kind: 'geography' },
      { text: '方面影响深远。' },
    ],
    contributionSource: UNESCO,
    worldRecords: [
      {
        title: '现存最古老的古代世界奇迹',
        detail: [
          { text: '吉萨的' },
          { text: '胡夫金字塔', kind: 'geography' },
          { text: '是现存最古老的古代世界奇迹。' },
        ],
        source: UNESCO_GIZA,
      },
    ],
  },
  GRC: {
    contribution: [
      { text: '古希腊在' },
      { text: '哲学、几何学、戏剧、历史学与民主政治思想', kind: 'technology' },
      { text: '方面构成了现代世界许多学科与制度的重要基础。' },
    ],
    contributionSource: UNESCO,
    worldRecords: [],
  },
  ITA: {
    contribution: [
      { text: '意大利在罗马法、' },
      { text: '文艺复兴艺术、建筑、音乐与设计', kind: 'technology' },
      { text: '等领域对世界文化影响显著。' },
    ],
    contributionSource: UNESCO,
    worldRecords: [],
  },
  FRA: {
    contribution: [
      { text: '法国在' },
      { text: '启蒙思想、民法典、文学艺术和科学研究', kind: 'technology' },
      { text: '方面形成了广泛影响。' },
    ],
    contributionSource: NATIONAL.FRA,
    worldRecords: [],
  },
  DEU: {
    contribution: [
      { text: '德国在' },
      { text: '哲学、音乐、化学、工程和工业制造', kind: 'technology' },
      { text: '等方面贡献了重要成果。' },
    ],
    contributionSource: UN,
    worldRecords: [],
  },
  GBR: {
    contribution: [
      { text: '英国在' },
      { text: '工业革命、议会制度、自然科学和文学', kind: 'technology' },
      { text: '等领域发挥了重要作用。' },
    ],
    contributionSource: NATIONAL.GBR,
    worldRecords: [],
  },
  USA: {
    contribution: [
      { text: '美国在' },
      { text: '航空航天、计算机、医学和现代企业', kind: 'technology' },
      { text: '等领域持续推动全球技术与社会变革。' },
    ],
    contributionSource: NATIONAL.USA,
    worldRecords: [],
  },
  JPN: {
    contribution: [
      { text: '日本在' },
      { text: '精密制造、材料科学、交通工程和传统工艺', kind: 'technology' },
      { text: '等方面形成了鲜明的世界影响。' },
    ],
    contributionSource: NATIONAL.JPN,
    worldRecords: [],
  },
  KOR: {
    contribution: [
      { text: '韩国在' },
      { text: '半导体、通信、造船和数字内容产业', kind: 'technology' },
      { text: '等方面为全球社会提供了重要成果。' },
    ],
    contributionSource: NATIONAL.KOR,
    worldRecords: [],
  },
  TUR: {
    contribution: [
      { text: '土耳其连接欧亚文明，在' },
      { text: '建筑、陶瓷、饮食与跨区域贸易', kind: 'geography' },
      { text: '方面贡献了独特传统。' },
    ],
    contributionSource: UNESCO,
    worldRecords: [],
  },
  BRA: {
    contribution: [
      { text: '巴西在' },
      { text: '农业、生态研究、音乐和多元文化表达', kind: 'geography' },
      { text: '等方面对世界产生了广泛影响。' },
    ],
    contributionSource: UN,
    worldRecords: [],
  },
  MEX: {
    contribution: [
      { text: '墨西哥在' },
      { text: '玉米农业、天文学、建筑和饮食文化', kind: 'geography' },
      { text: '方面保留并传播了重要文明成果。' },
    ],
    contributionSource: UNESCO,
    worldRecords: [],
  },
  RUS: {
    contribution: [
      { text: '俄罗斯在' },
      { text: '数学、航天、文学、音乐和基础科学', kind: 'technology' },
      { text: '领域形成了重要世界贡献。' },
    ],
    contributionSource: UN,
    worldRecords: [
      {
        title: '世界面积最大的国家',
        detail: [
          { text: '俄罗斯国土面积约为' },
          { text: '1,710 万平方公里', kind: 'geography' },
          { text: '，是世界面积最大的国家。' },
        ],
        source: WORLD_BANK_AREA,
      },
    ],
  },
  ZAF: {
    contribution: [
      { text: '南非在' },
      { text: '古人类学、公共卫生与和解政治实践', kind: 'technology' },
      { text: '方面提供了具有全球意义的经验。' },
    ],
    contributionSource: NATIONAL.ZAF,
    worldRecords: [],
  },
  AUS: {
    contribution: [
      { text: '澳大利亚在' },
      { text: '天文学、医学、生态保护和海洋研究', kind: 'technology' },
      { text: '方面贡献了重要知识。' },
    ],
    contributionSource: UN,
    worldRecords: [],
  },
  CAN: {
    contribution: [
      { text: '加拿大在' },
      { text: '医学、人工智能、自然资源治理和多元社会制度', kind: 'technology' },
      { text: '方面形成了国际影响。' },
    ],
    contributionSource: UN,
    worldRecords: [
      {
        title: '世界最长的海岸线',
        detail: [
          { text: '加拿大拥有世界最长的' },
          { text: '海岸线', kind: 'geography' },
          { text: '，临接三大洋。' },
        ],
        source: GUINNESS_COAST,
      },
    ],
  },
  IRN: {
    contribution: [
      { text: '伊朗在' },
      { text: '数学、天文学、医学、诗歌和建筑', kind: 'technology' },
      { text: '等方面延续了波斯文明的世界影响。' },
    ],
    contributionSource: UNESCO,
    worldRecords: [],
  },
  SAU: {
    contribution: [
      { text: '沙特阿拉伯在' },
      { text: '伊斯兰文化遗产、能源工程和沙漠研究', kind: 'geography' },
      { text: '方面发挥了重要作用。' },
    ],
    contributionSource: UN,
    worldRecords: [],
  },
  ARE: {
    contribution: [
      { text: '阿联酋在' },
      { text: '沙漠城市建设、可再生能源和航天探索', kind: 'technology' },
      { text: '方面形成了区域示范。' },
    ],
    contributionSource: NATIONAL.ARE,
    worldRecords: [
      {
        title: '世界最高建筑所在地',
        detail: [
          { text: '迪拜的' },
          { text: '哈利法塔', kind: 'geography' },
          { text: '是世界最高建筑。' },
        ],
        source: GUINNESS_BUILDING,
      },
    ],
  },
  CHE: {
    contribution: [
      { text: '瑞士在' },
      { text: '精密制造、医学、国际组织治理和金融服务', kind: 'technology' },
      { text: '等方面形成了国际影响。' },
    ],
    contributionSource: NATIONAL.CHE,
    worldRecords: [],
  },
  VAT: {
    contribution: [
      { text: '梵蒂冈保存了重要的' },
      { text: '宗教艺术、建筑与档案遗产', kind: 'geography' },
      { text: '，并参与国际文化保护。' },
    ],
    contributionSource: UNESCO,
    worldRecords: [],
  },
  MCO: {
    contribution: [
      { text: '摩纳哥在' },
      { text: '海洋保护、滨海城市治理和国际慈善', kind: 'geography' },
      { text: '方面开展了持续实践。' },
    ],
    contributionSource: UN,
    worldRecords: [],
  },
  KAZ: {
    contribution: [
      { text: '哈萨克斯坦在' },
      { text: '草原生态研究、能源合作和航天发射', kind: 'geography' },
      { text: '方面具有区域影响。' },
    ],
    contributionSource: UN,
    worldRecords: [
      {
        title: '世界最大的内陆国',
        detail: [
          { text: '哈萨克斯坦是世界面积最大的' },
          { text: '内陆国家', kind: 'geography' },
          { text: '。' },
        ],
        source: BRITANNICA_KAZ,
      },
    ],
  },
  DZA: {
    contribution: [
      { text: '阿尔及利亚在' },
      { text: '撒哈拉生态研究、能源合作和反殖民历史研究', kind: 'geography' },
      { text: '方面具有重要区域意义。' },
    ],
    contributionSource: UN,
    worldRecords: [
      {
        title: '非洲面积最大的国家',
        detail: [
          { text: '阿尔及利亚是' },
          { text: '非洲面积最大的国家', kind: 'geography' },
          { text: '。' },
        ],
        source: WORLD_BANK_AREA,
      },
    ],
  },
  SGP: {
    contribution: [
      { text: '新加坡在' },
      { text: '港口物流、城市治理、公共住房和热带城市规划', kind: 'technology' },
      { text: '方面形成了国际案例。' },
    ],
    contributionSource: UN,
    worldRecords: [],
  },
  IDN: {
    contribution: [
      { text: '印度尼西亚在' },
      { text: '海洋生态、热带生物多样性和群岛文化', kind: 'geography' },
      { text: '方面贡献了重要经验。' },
    ],
    contributionSource: UN,
    worldRecords: [],
  },
};

const EMPTY_FACTS: CountryFacts = {
  contribution: [{ text: '暂无可靠的逐国贡献资料。' }],
  worldRecords: [],
};

export function getCountryFacts(country: Pick<Country, 'a3' | 'id' | 'en'>): CountryFacts {
  return facts[countryInsightKey(country)] ?? EMPTY_FACTS;
}

export function hasCuratedCountryFacts(country: Pick<Country, 'a3' | 'id' | 'en'>): boolean {
  return countryInsightKey(country) in facts;
}
