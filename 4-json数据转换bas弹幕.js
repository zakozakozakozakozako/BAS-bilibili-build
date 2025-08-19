const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const progress = require('cli-progress');

program
  .option('-i, --input <path>', '输入JSON目录', './svgjson')
  .option('-o, --out <path>', 'BAS输出目录', './bas_output')
  .option('-w, --width <number>', 'BAS画布宽', '4000')
  .option('-h, --height <number>', 'BAS画布高', '3620')
  .option('--fps <number>', '帧率', '30')
  .option('--maxsize <number>', '每个文件最大弹幕数', '3000')
  .parse(process.argv);

const options = program.opts();
const inputDir = options.input;
const outDir = options.out;
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const fps = parseInt(options.fps);
const width = parseInt(options.width);
const height = parseInt(options.height);
const maxSize = parseInt(options.maxsize);

function flipSvgPath(d) {
  return d.replace(/([0-9]*\.?[0-9]+)/g, (num, idx, str) => {
    if (str[idx - 1] === '-' || (idx > 0 && /[a-zA-Z]/.test(str[idx - 1]))) return num;
    return (height - parseFloat(num)).toString();
  });
}

// 把 JSON 转为 BAS 语法
function jsonToBas(jsonArr, startFrame) {
  let lines = [];
  jsonArr.forEach((frame, idx) => {
    const frameNum = startFrame + idx;
    const duration = Math.round(1000 / fps); // 每帧时长 (ms)
    frame.paths.forEach((p, pidx) => {
      if (!p.d) return;
      const flipped = flipSvgPath(p.d);

      const objName = `f${frameNum}_p${pidx}`;
      // 定义路径对象
      lines.push(`def path ${objName} {`);
      lines.push(`  d = "${flipped}"`);
      lines.push(`  color = 0xffffff`);
      lines.push(`}`);
      // 设置显示时长
      lines.push(`set ${objName} { alpha = 1 } ${duration}ms`);
      lines.push(""); // 空行分隔
    });
  });
  return lines;
}

async function main() {
  const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.json')).sort();
  const progressBar = new progress.Bar({
    format: '{bar} | {percentage}% | 已处理: {value}/{total} | 当前: {filename}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
    clearOnComplete: true
  });
  progressBar.start(files.length, 0, { filename: '' });

  let allLines = [];
  let part = 1;
  let frameCount = 0;

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    progressBar.update(i + 1, { filename: f });
    const arr = JSON.parse(fs.readFileSync(path.join(inputDir, f), 'utf-8'));
    const basLines = jsonToBas(arr, frameCount);
    allLines.push(...basLines);
    frameCount += arr.length;

    if (allLines.length >= maxSize || i === files.length - 1) {
      const outPath = path.join(outDir, `output_part${part}.bas`);
      fs.writeFileSync(outPath, allLines.join('\n'), 'utf-8');
      allLines = [];
      part++;
    }
  }

  progressBar.stop();
  console.log('\n✓ BAS 脚本生成完成!\n');
}

main();