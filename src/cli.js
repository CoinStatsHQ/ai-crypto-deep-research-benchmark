#!/usr/bin/env node

require('dotenv').config({ quiet: true });

const fs = require('fs');
const path = require('path');
const { loadBenchmark, loadCases, loadSubmission, loadSubmissionBundle } = require('./io');
const { prepareJudgeBundle } = require('./prepare');
const { buildSummary, buildMarkdownReport } = require('./score');
const { createAnthropicJudgeClient, getDefaultJudgeModel, runJudge } = require('./judge');
const { runBenchmark } = require('./run');

const DEFAULT_BENCHMARK_PATH = path.resolve(__dirname, '..', 'benchmarks', 'core-v1.json');
const DEFAULT_OUT_DIR = path.resolve(process.cwd(), 'benchmark-results');

function parseArgs(argv) {
    const [firstArg, ...restArgs] = argv;
    const hasExplicitCommand = firstArg && !firstArg.startsWith('--');
    const command = hasExplicitCommand ? firstArg : 'run';
    const rest = hasExplicitCommand ? restArgs : argv;
    const options = {};

    for (let index = 0; index < rest.length; index++) {
        const arg = rest[index];
        if (!arg.startsWith('--')) continue;
        options[arg.slice(2)] = rest[index + 1];
        index += 1;
    }

    return { command, options };
}

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJudgments(judgmentsDir) {
    const judgmentsByTaskId = {};

    for (const fileName of fs.readdirSync(judgmentsDir).filter(name => name.endsWith('.json')).sort()) {
        const taskId = fileName.replace(/\.json$/u, '');
        judgmentsByTaskId[taskId] = readJson(path.join(judgmentsDir, fileName));
    }

    return judgmentsByTaskId;
}

function getTaskDefinitions({ benchmarkPath, caseDir }) {
    if (benchmarkPath) {
        return loadBenchmark(benchmarkPath).tasks;
    }

    if (caseDir) {
        return loadCases(caseDir);
    }

    if (fs.existsSync(DEFAULT_BENCHMARK_PATH)) {
        return loadBenchmark(DEFAULT_BENCHMARK_PATH).tasks;
    }

    throw new Error('A benchmark file is required. Pass --benchmark <file>.');
}

function getSubmissionBundle(submissionInput) {
    if (!submissionInput) {
        throw new Error('A submission input is required. Pass --submission <file>.');
    }

    const stats = fs.statSync(submissionInput);
    return stats.isDirectory() ? loadSubmissionBundle(submissionInput) : loadSubmission(submissionInput);
}

function getJudgeClient({ model, mockJudgeResponse }) {
    if (mockJudgeResponse) {
        const parsed = JSON.parse(mockJudgeResponse);
        return {
            async judgePrompt() {
                return parsed;
            }
        };
    }

    return createAnthropicJudgeClient({
        apiKey: process.env.ANTHROPIC_API_KEY,
        model,
        baseURL: process.env.ANTHROPIC_BASE_URL
    });
}

function runPrepare({ benchmarkPath, caseDir, submissionInput, outDir }) {
    const taskMap = new Map(getTaskDefinitions({ benchmarkPath, caseDir }).map(taskDefinition => [taskDefinition.id, taskDefinition]));
    const submissionBundle = getSubmissionBundle(submissionInput);

    ensureDir(outDir);

    for (const [taskId, answerMarkdown] of Object.entries(submissionBundle.answers)) {
        const taskDefinition = taskMap.get(taskId);
        if (!taskDefinition) continue;

        const bundle = prepareJudgeBundle({ caseDefinition: taskDefinition, answerMarkdown });
        fs.writeFileSync(path.join(outDir, `${taskId}.prompt.md`), bundle.promptText);
        writeJson(path.join(outDir, `${taskId}.metrics.json`), bundle.metrics);
    }
}

function runScore({ benchmarkPath, caseDir, submissionInput, judgmentsDir, outDir }) {
    const summary = buildSummary({
        taskDefinitions: getTaskDefinitions({ benchmarkPath, caseDir }),
        submissionBundle: getSubmissionBundle(submissionInput),
        judgmentsByTaskId: readJudgments(judgmentsDir)
    });

    ensureDir(outDir);
    writeJson(path.join(outDir, 'summary.json'), summary);
    fs.writeFileSync(path.join(outDir, 'summary.md'), buildMarkdownReport(summary));
}

function printUsage() {
    console.log(`AI Crypto Deep Research Benchmark

Simple usage:
  node run-benchmark.js --submission <submission.json>
  node run-benchmark.js --submission <submission.json> --benchmark <benchmark.json> --out <dir>
  npx ai-crypto-deep-research-benchmark --submission <submission.json>

Advanced usage:
  node run-benchmark.js run --submission <submission.json>
  node run-benchmark.js prepare --submission <submission.json> [--benchmark <benchmark.json>] --out <dir>
  node run-benchmark.js judge --submission <submission.json> [--benchmark <benchmark.json>] --out <dir> [--model <anthropic-model>]
  node run-benchmark.js score --submission <submission.json> [--benchmark <benchmark.json>] --judgments <dir> --out <dir>

Defaults:
  benchmark: ${DEFAULT_BENCHMARK_PATH}
  out: ${DEFAULT_OUT_DIR}`);
}

async function main() {
    const { command, options } = parseArgs(process.argv.slice(2));

    if (process.argv.length <= 2 || process.argv.includes('--help') || process.argv.includes('-h')) {
        printUsage();
        return;
    }

    const benchmarkPath = options.benchmark || (options.cases ? null : DEFAULT_BENCHMARK_PATH);
    const submissionInput = options.submission;
    const outDir = options.out || DEFAULT_OUT_DIR;

    if (command === 'prepare') {
        runPrepare({
            benchmarkPath,
            caseDir: options.cases,
            submissionInput,
            outDir
        });
        return;
    }

    if (command === 'score') {
        runScore({
            benchmarkPath,
            caseDir: options.cases,
            submissionInput,
            judgmentsDir: options.judgments,
            outDir
        });
        return;
    }

    if (command === 'judge') {
        const judgeModel = options.model || process.env.ANTHROPIC_MODEL || getDefaultJudgeModel();
        const judgeClient = getJudgeClient({
            model: judgeModel,
            mockJudgeResponse: options['mock-judge-response']
        });

        await runJudge({
            benchmarkPath,
            caseDir: options.cases,
            submissionPath: submissionInput,
            submissionDir: submissionInput,
            outDir,
            judgeClient,
            judgeProvider: 'anthropic',
            judgeModel
        });
        return;
    }

    if (command === 'run') {
        const judgeModel = options.model || process.env.ANTHROPIC_MODEL || getDefaultJudgeModel();
        const judgeClient = getJudgeClient({
            model: judgeModel,
            mockJudgeResponse: options['mock-judge-response']
        });

        await runBenchmark({
            benchmarkPath,
            submissionPath: submissionInput,
            outDir,
            judgeClient,
            judgeProvider: 'anthropic',
            judgeModel
        });
        return;
    }

    throw new Error(`Unknown command: ${command}`);
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
