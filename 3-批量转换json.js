const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { program } = require('commander');
const progress = require('cli-progress');

program
    .option('-s, --start <number>', '起始批次号', 1)
    .option('-d, --dir <path>', '输入SVG目录', './svgs')
    .option('-o, --out <path>', 'JSON输出目录', './svgjson')
    .parse(process.argv);

const options = program.opts();
const inputDir = options.dir;
const outputDir = options.out;

// 确保输出目录存在
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const BATCH_SIZE = 100;
const progressBar = new progress.Bar({
    format: '{bar} | {percentage}% | 已处理: {value}/{total} | 当前: {filename}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
    clearOnComplete: true
});

function findSvgFiles(dir) {
    return fs.readdirSync(dir).filter(f => f.endsWith('.svg')).map(f => path.join(dir, f));
}

function parseSvg(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const dom = new JSDOM(content, { contentType: 'image/svg+xml' });
    const paths = [...dom.window.document.querySelectorAll('path')].map(p => ({
        d: p.getAttribute('d'),
        fill: p.getAttribute('fill')
    }));
    return { file: path.basename(filePath), paths };
}

async function main() {
    const { default: ora } = await import('ora');
    const spinner = ora('正在扫描目录...').start();

    try {
        const svgFiles = findSvgFiles(inputDir);
        if (svgFiles.length === 0) {
            spinner.fail('未找到任何SVG文件');
            process.exit(1);
        }

        spinner.succeed(`找到 ${svgFiles.length} 个SVG文件`);
        console.log('\n');
        progressBar.start(svgFiles.length, 0, { filename: '' });

        let batchIndex = parseInt(options.start) || 1;
        let batch = [];

        for (let i = 0; i < svgFiles.length; i++) {
            const file = svgFiles[i];
            const parsed = parseSvg(file);
            batch.push(parsed);

            progressBar.update(i + 1, { filename: path.basename(file) });

            if (batch.length >= BATCH_SIZE || i === svgFiles.length - 1) {
                const outPath = path.join(outputDir, `output_${batchIndex}.json`);
                fs.writeFileSync(outPath, JSON.stringify(batch, null, 2));
                batch = [];
                batchIndex++;
            }
        }

        progressBar.stop();
        console.log('\n✓ 转换完成!\n');
    } catch (err) {
        spinner.fail('处理过程中发生错误:');
        console.error(err);
        process.exit(1);
    }
}

main();