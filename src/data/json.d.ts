/**
 * 用环境声明替代对 world-atlas 大 JSON 的字面量类型推导，
 * 避免 tsc 为 ~800KB 的 TopoJSON 生成巨型类型拖慢编译。
 * （非相对路径的 ambient 声明优先于文件解析，Vite 运行时仍按 JSON 正常导入）
 */
declare module 'world-atlas/countries-50m.json' {
  import type { Topology } from 'topojson-specification';
  const topology: Topology;
  export default topology;
}
