const fs = require('fs');
const path = require('path');

const { loadBenchmark, loadSubmission } = require('./io');
const { runJudge } = require('./judge');
const { buildSummary, buildMarkdownReport } = require('./score');

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function readJudgments(judgmentsDir) {
    const judgments = {};

    for (const fileName of fs.readdirSync(judgmentsDir).filter(name => name.endsWith('.json')).sort()) {
        const taskId = fileName.replace(/\.json$/u, '');
        judgments[taskId] = JSON.parse(fs.readFileSync(path.join(judgmentsDir, fileName), 'utf8'));
    }

    return judgments;
}

async function runBenchmark({ benchmarkPath, submissionPath, outDir, judgeClient, judgeProvider, judgeModel }) {
    const benchmark = loadBenchmark(benchmarkPath);
    const submissionBundle = loadSubmission(submissionPath);
    const judgmentsDir = path.join(outDir, 'judgments');

    ensureDir(outDir);

    await runJudge({
        benchmarkPath,
        submissionPath,
        outDir: judgmentsDir,
        judgeClient,
        judgeProvider,
        judgeModel
    });

    const summary = buildSummary({
        taskDefinitions: benchmark.tasks,
        submissionBundle,
        judgmentsByTaskId: readJudgments(judgmentsDir)
    });

    writeJson(path.join(outDir, 'summary.json'), summary);
    fs.writeFileSync(path.join(outDir, 'summary.md'), buildMarkdownReport(summary));

    return {
        benchmark,
        summary
    };
}

module.exports = {
    runBenchmark
};
