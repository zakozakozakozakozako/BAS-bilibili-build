const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const progress = require('cli-progress');
const { program } = require('commander');

program
  .option('-s, --start <number>', '起始索引 (1 开始)', 1)
  .option('-d, --dir <path>', '输入目录路径', './video_frames')
  .option('-o, --out <path>', '输出 JSON 目录', './svgjson')
  .parse(process.argv);

const options = program.opts();
const startFileIndex = parseInt(options.start) || 1;
const baseDir = options.dir;
const outputDir = options.out;

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const progressBar = new progress.Bar({
  format: '{bar} | {percentage}% | 已处理: {value}/{total} | 当前: {filename}',
  barCompleteChar: '\u2588',
  barIncompleteChar: '\u2591',
  hideCursor: true,
  clearOnComplete: true
});

async function processSVGs(startFileIndex, baseDir, outputDir) {
  const BATCH_SIZE = 30;

  // 检查是否只有 image_frame 文件夹
  const entries = fs.readdirSync(baseDir);
  const hasImageFrame = entries.includes('image_frame') && fs.statSync(path.join(baseDir, 'image_frame')).isDirectory();
  const frameFolders = entries.filter(f => fs.statSync(path.join(baseDir, f)).isDirectory() && /^\d+_\d+$/.test(f));

  if (hasImageFrame && frameFolders.length === 0) {
    // 只处理 image_frame 文件夹
    const folderPath = path.join(baseDir, 'image_frame');
    const svgFiles = fs.readdirSync(folderPath)
      .filter(f => f.endsWith('.svg') && f.length === 10)
      .sort();

    const frameData = {
      frameIndex: 0,
      data: []
    };

    progressBar.start(1, 0, { filename: 'image_frame' });

    for (const svgFile of svgFiles) {
      const filePath = path.join(folderPath, svgFile);
      const color = svgFile.replace('.svg', '');
      let dom = null;
      try {
        const xml = fs.readFileSync(filePath, 'utf8');
        dom = new JSDOM(xml, { contentType: 'image/svg+xml' });
        const paths = Array.from(dom.window.document.querySelectorAll('path'));
        const pathData = paths.map(p => p.getAttribute('d')).join(' ');
        frameData.data.push({ color, pathdata: pathData });
      } finally {
        if (dom) dom.window.close();
      }
    }

    const outputFile = path.join(outputDir, `1.json`);
    fs.writeFileSync(outputFile, JSON.stringify([frameData], null, 2));
    console.log(`已保存 ${outputFile}`);
    progressBar.update(1, { filename: 'image_frame' });
    progressBar.stop();
    console.log(`\n处理完成! 结果已保存到 ${outputDir} 目录`);
    return;
  }

  // 多帧文件夹处理逻辑
  const allFolders = frameFolders.sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]));

  if (allFolders.length === 0) {
    console.log('未找到任何时间点文件夹');
    return;
  }

  const startIndex = (startFileIndex - 1) * BATCH_SIZE;
  const foldersToProcess = allFolders.slice(startIndex);

  if (foldersToProcess.length === 0) {
    console.log('指定索引超出范围');
    return;
  }

  progressBar.start(foldersToProcess.length, 0, { filename: '' });

  let currentBatch = [];
  let jsonIndex = startFileIndex;

  for (const [i, folder] of foldersToProcess.entries()) {
    const folderPath = path.join(baseDir, folder);
    const [frameIndex] = folder.split('_');

    const svgFiles = fs.readdirSync(folderPath)
      .filter(f => f.endsWith('.svg') && f.length === 10)
      .sort();

    const frameData = {
      frameIndex: parseInt(frameIndex),
      data: []
    };

    progressBar.update(i, { filename: folder });

    for (const svgFile of svgFiles) {
      const filePath = path.join(folderPath, svgFile);
      const color = svgFile.replace('.svg', '');
      let dom = null;
      try {
        const xml = fs.readFileSync(filePath, 'utf8');
        dom = new JSDOM(xml, { contentType: 'image/svg+xml' });
        const paths = Array.from(dom.window.document.querySelectorAll('path'));
        const pathData = paths.map(p => p.getAttribute('d')).join(' ');
        frameData.data.push({ color, pathdata: pathData });
      } finally {
        if (dom) dom.window.close();
      }
    }

    currentBatch.push(frameData);

    if (currentBatch.length === BATCH_SIZE || i === foldersToProcess.length - 1) {
      const outputFile = path.join(outputDir, `${jsonIndex}.json`);
      fs.writeFileSync(outputFile, JSON.stringify(currentBatch, null, 2));
      console.log(`已保存 ${outputFile}`);
      currentBatch = [];
      jsonIndex++;
    }
  }

  progressBar.stop();
  console.log(`\n处理完成! 结果已保存到 ${outputDir} 目录`);
}

// 运行
processSVGs(startFileIndex, baseDir, outputDir);