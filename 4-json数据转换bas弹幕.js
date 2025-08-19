#!/usr/bin/env node
/**
 * 4) JSON → BAS 文本
 * 适配 GitHub Actions 工作流，支持参数：
 *   -i 输入 JSON 目录（默认 ./svgjson）
 *   -o 输出目录（默认 ./bas_output）
 *   -w 画布宽
 *   -h 画布高
 *   -fps 帧率
 *   -maxsize 单文件最大字符数
 *   -starttime 起始时间偏移（毫秒）
 */

const fs = require('fs');
const path = require('path');

// 简单参数解析器
function getArg(flag, def) {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  return def;
}

const inDir = getArg('-i', './svgjson');
const outDir = getArg('-o', './bas_output');
const width = parseInt(getArg('-w', '4000'), 10);
const height = parseInt(getArg('-h', '3620'), 10);
const fps = parseFloat(getArg('-fps', '5'));
const maxSize = parseInt(getArg('-maxsize', '500000'), 10);
const startOffset = parseInt(getArg('-starttime', '3000'), 10);

// 确保输出目录存在
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 列出输入 JSON 文件
let files = fs.readdirSync(inDir).filter(f => f.endsWith('.json'));
files.sort();

console.log(`📂 输入目录: ${inDir}`);
console.log(`📂 输出目录: ${outDir}`);
console.log(`🖼 画布: ${width}x${height}, fps=${fps}`);
console.log(`📝 最大字符数: ${maxSize}, 起始偏移: ${startOffset}ms`);
console.log(`共 ${files.length} 个 JSON 批次`);

let fileIndex = 0;

for (let i = 0; i < files.length; i++) {
  const filePath = path.join(inDir, files[i]);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  let basLines = [];
  for (const shape of data.shapes) {
    // 这里保留你原本的 JSON → BAS 逻辑
    // 假设 shape 已经包含坐标、时间等信息
    const line = `...`; // ← 替换成你的转换规则
    basLines.push(line);
  }

  let content = basLines.join('\n');

  // 如果内容超过 maxSize，则切分
  let part = 0;
  while (content.length > 0) {
    const chunk = content.slice(0, maxSize);
    content = content.slice(maxSize);

    const outName = `${startOffset + i * (1000 / fps)}_${fileIndex}${part > 0 ? `_p${part}` : ''}.txt`;
    const outPath = path.join(outDir, outName);

    fs.writeFileSync(outPath, chunk, 'utf-8');
    console.log(`✅ 写入 ${outPath} (${chunk.length} chars)`);

    part++;
  }
  fileIndex++;
}

console.log(`🎉 全部完成，输出在 ${outDir}`);