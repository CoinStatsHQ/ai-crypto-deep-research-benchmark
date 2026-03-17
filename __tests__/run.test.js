const fs = require('fs');
const os = require('os');
const path = require('path');

const { runBenchmark } = require('../src/run');

function makeTempDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'crypto-benchmark-run-'));
}

describe('runBenchmark', () => {
    test('judges and scores a submission in one call', async () => {
        const rootDir = makeTempDir();
        const benchmarkPath = path.join(rootDir, 'core-v1.json');
        const submissionPath = path.join(rootDir, 'submission.json');
        const outDir = path.join(rootDir, 'results');

        fs.writeFileSync(
            benchmarkPath,
            JSON.stringify(
                {
                    benchmark_id: 'core-v1',
                    name: 'Core Benchmark V1',
                    tasks: [
                        {
                            id: 'deep-research-001',
                            category: 'market-structure',
                            prompt: 'Analyze the correlation between ETF inflows and BTC price action.',
                            expectations: ['Cover both variables', 'Use citations'],
                            red_flags: ['Claims causation without support'],
                            minimum_citations: 2
                        }
                    ]
                },
                null,
                2
            )
        );

        fs.writeFileSync(
            submissionPath,
            JSON.stringify(
                {
                    submission_id: 'sample-submission',
                    model_name: 'Example Model',
                    generated_at: '2026-03-17T00:00:00.000Z',
                    answers: [
                        {
                            task_id: 'deep-research-001',
                            answer_markdown: '# BTC ETF Flow Analysis\n\n- [ETF source](https://example.com/etf)\n- [Market source](https://example.com/market)\n'
                        }
                    ]
                },
                null,
                2
            )
        );

        const judgeClient = {
            async judgePrompt() {
                return {
                    verdict: 'pass',
                    overall_score: 82,
                    summary: 'Good answer overall.',
                    criteria: [
                        { name: 'task_completion', score: 16, max_score: 20, reasoning: 'Covered the requested variables.' }
                    ]
                };
            }
        };

        const result = await runBenchmark({
            benchmarkPath,
            submissionPath,
            outDir,
            judgeClient,
            judgeProvider: 'anthropic',
            judgeModel: 'claude-opus-4-6'
        });

        expect(result.summary.results).toHaveLength(1);
        expect(fs.existsSync(path.join(outDir, 'judgments', 'deep-research-001.json'))).toBe(true);
        expect(fs.existsSync(path.join(outDir, 'summary.json'))).toBe(true);
        expect(fs.existsSync(path.join(outDir, 'summary.md'))).toBe(true);
    });
});
