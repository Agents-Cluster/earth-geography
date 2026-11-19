# 寰宇 · Earth Geography

基于 **Three.js + Vite + TypeScript** 的交互式地理学习地球仪：悬停高亮国家、点击飞行定位、详情卡展示国家属性与历史贡献、支持中英文搜索。桌面与移动浏览器均可使用。

## 快速开始

```bash
npm install
npm run dev        # 开发服务器（默认 http://localhost:5173）
npm run build      # 生产构建 → dist/
npm run preview    # 预览构建产物
npm run gen:data   # 重新生成国家属性数据（见下文「数据来源」）
```

## 功能

- **悬停拾取**：鼠标悬停任意国家，精确高亮边界并显示中文名 / 英文名 / 大洲
- **点击定位**：点击国家后相机沿球面飞行至该国正面，右侧弹出详情卡
- **详情卡**：旗帜、首都、人口、面积、官方语言、货币、时区、电话区号、陆上邻国（可点击跳转），以及历史概览、世界贡献、世界之最
- **百科内容**：选中国家后按需加载中文维基百科历史章节；贡献和世界之最使用本地结构化事实，7 天缓存和离线兜底保证内容可读
- **事实高亮**：时间/事件、人物/制度、科技/知识、地理/自然使用不同颜色标记，所有事实保留来源
- **搜索**：顶部搜索框支持中文 / 英文 / ISO 代码模糊匹配，↑↓ + Enter 键盘操作
- **氛围**：程序化星空、大气辉光、缓慢自转（交互时暂停，选中国家时停止）

## 技术方案

**颜色索引拾取（核心）**：每个国家在 4096×2048 离屏画布上按 equirectangular 投影填充成「编码 = 下标」的唯一颜色；悬停时射线与单位球解析求交得到经纬度，直接读像素解码出国家，O(1) 且任意缩放级别精确。投影约定见 `src/globe/geo.ts`，与 three.js SphereGeometry 的 UV 展开严格对齐。

**渲染分层**（无逐帧重绘）：

| 层 | 说明 |
| --- | --- |
| 主球体 r=1.0 | 静态纹理：海洋 + 大陆 + 国界线 + 经纬网，一次性绘制 |
| 高亮层 r=1.002 | GPU shader 直接从拾取纹理解码编码并着色，hover / 选中零延迟，选中带呼吸动画 |
| 大气层 r=1.16 | 背面球 fresnel 辉光，AdditiveBlending |
| 星空 | 两层圆形光点 Points，缓慢漂移 |

**微型国家兜底**：投影后不足 3px 的国家在拾取层补一个圆点，保证小国也能悬停命中。

## 目录结构

```
src/
  main.ts              入口与交互接线
  state.ts             hover / select 状态分发
  types.ts             类型定义
  data/
    world.ts           TopoJSON 几何 × 属性数据合并（numeric/id 匹配 + 名称兜底）
    countries.json     生成的国家属性数据（提交进仓库）
    i18n.ts            大洲/次区域中文对照、Intl 语言货币名、数字格式化
  globe/
    scene.ts           渲染器 / 相机 / OrbitControls / 帧循环
    geo.ts             经纬度 ↔ 球面向量（全项目唯一的球面映射约定）
    earth.ts           主纹理绘制
    picking.ts         颜色索引拾取
    highlight.ts       GPU 高亮 shader
    atmosphere.ts      大气辉光
    stars.ts           星空
    flyTo.ts           相机球面飞行动画
  ui/
    tooltip.ts  detailPanel.ts  search.ts
scripts/
  generate-countries.mjs  数据生成脚本
```

## 数据来源

| 数据 | 来源 |
| --- | --- |
| 国界几何 | Natural Earth 50m（npm `world-atlas`，TopoJSON） |
| 国名/中文名/首都/区域/邻国/货币/语言/区号/面积 | `world-countries`（mledoze/countries 的 npm 镜像） |
| 人口 | 世界银行 API（SP.POP.TOTL 最新非空值） |
| 时区 | `countries-and-timezones` |
| 旗帜图 | flagcdn.com（详情卡，失败回退 emoji） |
| 历史 | 中文维基百科 REST API（按需加载；失败回退本地摘要，成功结果缓存 7 天） |
| 世界贡献/世界之最 | 本地结构化事实，记录来源链接；无可靠纪录时明确显示暂无 |

修改 `scripts/generate-countries.mjs`（如补充中文首都对照表）后运行 `npm run gen:data` 重新生成。

## 生产部署

- `main` 分支 push 后，GitHub Actions 执行 `npm ci`、类型检查和生产构建。
- 生产服务器 `8.153.164.28` 上的 systemd 定时器每分钟拉取公开 `main` 分支；构建通过后写入新 release，再原子切换 `current`，失败不会替换当前版本。
- Nginx 和 Certbot 为 `https://earth.aniday-ai.top` 提供 HTTPS 静态服务，服务器配置模板位于 `deploy/earth.aniday-ai.top.nginx.conf`。

## 已知限制

- 移动端详情卡会从右侧改为底部抽屉，较长内容需要在卡片内滚动
- 服务器定时拉取通常在 `main` 分支 push 后一分钟内开始发布；构建期间仍继续提供上一版页面
- 自定义域名为 `https://earth.aniday-ai.top`
- Natural Earth 图层中 ISO 编码为 -99 的区域（索马里兰、北塞浦路斯）使用人工补充的简化数据
- 法国（含海外领地几何）的人口/面积口径为本土数据；摩纳哥等微型国家依赖拾取层圆点兜底
- 电话区号/语言/货币名优先中文显示（Intl.DisplayNames），老浏览器回退英文
