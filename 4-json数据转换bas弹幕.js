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
  .option('--starttime <number>', '起始时间 (ms)', '0')
  .parse(process.argv);

const options = program.opts();
const inputDir = options.input;
const outDir = options.out;
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const fps = parseInt(options.fps);
const width = parseInt(options.width);
const height = parseInt(options.height);
const maxSize = parseInt(options.maxsize);
let startTime = parseInt(options.starttime);

function flipSvgPath(d) {
  return d.replace(/([0-9]*\.?[0-9]+)/g, (num, idx, str) => {
    if (str[idx - 1] === '-' || (idx > 0 && /[a-zA-Z]/.test(str[idx - 1]))) return num;
    return (height - parseFloat(num)).toString();
  });
}

function jsonToBas(jsonArr, startFrame) {
  let lines = [];
  jsonArr.forEach((frame, idx) => {
    const frameNum = startFrame + idx;
    const time = startTime + Math.round((frameNum / fps) * 1000);
    frame.paths.forEach(p => {
      if (!p.d) return;
      const flipped = flipSvgPath(p.d);
      lines.push(`${time},0,25,16777215,baseline,${flipped}`);
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
      const outPath = path.join(outDir, `output_part${part}.txt`);
      fs.writeFileSync(outPath, allLines.join('\n'), 'utf-8');
      allLines = [];
      part++;
    }
  }

  progressBar.stop();
  console.log('\n✓ BAS 转换完成!\n');
}

main();