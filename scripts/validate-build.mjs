import { existsSync, readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';

const distRoot = resolve('dist');
const indexPath = resolve(distRoot, 'index.html');

if (!existsSync(indexPath)) {
  throw new Error('构建产物缺少 dist/index.html');
}

const html = readFileSync(indexPath, 'utf8');
const moduleScripts = [...html.matchAll(/<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)].map(
  (match) => match[1],
);

if (moduleScripts.length === 0 || moduleScripts.some((src) => src.includes('/src/'))) {
  throw new Error('dist/index.html 没有可用的生产模块入口脚本');
}

const localAssets = [
  ...moduleScripts,
  ...[...html.matchAll(/<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi)].map(
    (match) => match[1],
  ),
];

for (const asset of localAssets) {
  if (/^(?:https?:)?\/\//i.test(asset)) continue;
  const pathname = asset.split(/[?#]/, 1)[0].replace(/^\//, '');
  const resolved = resolve(distRoot, pathname);
  if (!resolved.startsWith(`${distRoot}${sep}`) || !existsSync(resolved)) {
    throw new Error(`dist/index.html 引用了不存在的资源：${asset}`);
  }
}

console.log(`构建产物校验通过：${moduleScripts.length} 个模块入口，${localAssets.length} 个入口资源`);
