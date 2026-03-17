const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

function makeTempDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'crypto-benchmark-cli-'));
}

describe('benchmark CLI', () => {
    test('prepare writes judge prompt files and score writes summary reports', () => {
        const rootDir = makeTempDir();
        const caseDir = path.join(rootDir, 'cases');
        const submissionDir = path.join(rootDir, 'submission');
        const answersDir = path.join(submissionDir, 'answers');
        const judgmentsDir = path.join(rootDir, 'judgments');
        const prepareDir = path.join(rootDir, 'prepared');
        const reportDir = path.join(rootDir, 'reports');
        const cliPath = path.join(process.cwd(), 'run-benchmark.js');

        fs.mkdirSync(caseDir, { recursive: true });
        fs.mkdirSync(answersDir, { recursive: true });
        fs.mkdirSync(judgmentsDir, { recursive: true });

        fs.writeFileSync(
            path.join(caseDir, 'deep-research-001.json'),
            JSON.stringify(
                {
                    id: 'deep-research-001',
                    category: 'funding-and-token-status',
                    prompt: 'Find crypto projects without a token that raised more than $10M since 2024.',
                    expectations: ['List qualifying projects', 'Verify token status', 'Cite sources'],
                    red_flags: ['Claims token status without evidence'],
                    minimum_citations: 3
                },
                null,
                2
            )
        );

        fs.writeFileSync(
            path.join(submissionDir, 'manifest.json'),
            JSON.stringify(
                {
                    submission_id: 'cli-submission',
                    model_name: 'CLI Model',
                    generated_at: '2026-03-17T00:00:00.000Z'
                },
                null,
                2
            )
        );

        fs.writeFileSync(
            path.join(answersDir, 'deep-research-001.md'),
            '# Findings\n\n- [Source one](https://example.com/one)\n- [Source two](https://example.org/two)\n'
        );

        fs.writeFileSync(
            path.join(judgmentsDir, 'deep-research-001.json'),
            JSON.stringify(
                {
                    verdict: 'pass',
                    overall_score: 78,
                    summary: 'Solid answer with limited source breadth.',
                    criteria: [
                        { name: 'task_completion', score: 16, max_score: 20, reasoning: 'Covers the task.' },
                        { name: 'factual_precision', score: 15, max_score: 20, reasoning: 'Reasonably precise.' },
                        { name: 'citation_grounding', score: 12, max_score: 15, reasoning: 'Grounded but limited.' },
                        { name: 'source_diversity', score: 10, max_score: 15, reasoning: 'Only two domains.' },
                        { name: 'analytical_depth', score: 15, max_score: 20, reasoning: 'Some analysis.' },
                        { name: 'uncertainty_calibration', score: 10, max_score: 10, reasoning: 'Good caveats.' }
                    ]
                },
                null,
                2
            )
        );

        execFileSync('node', [cliPath, 'prepare', '--cases', caseDir, '--submission', submissionDir, '--out', prepareDir], {
            cwd: process.cwd()
        });

        execFileSync(
            'node',
            [cliPath, 'score', '--cases', caseDir, '--submission', submissionDir, '--judgments', judgmentsDir, '--out', reportDir],
            {
                cwd: process.cwd()
            }
        );

        expect(fs.existsSync(path.join(prepareDir, 'deep-research-001.prompt.md'))).toBe(true);
        expect(fs.existsSync(path.join(reportDir, 'summary.json'))).toBe(true);
        expect(fs.existsSync(path.join(reportDir, 'summary.md'))).toBe(true);

        const summary = JSON.parse(fs.readFileSync(path.join(reportDir, 'summary.json'), 'utf8'));
        expect(summary.results[0].overallScore).toBe(78);
        expect(summary.modelName).toBe('CLI Model');
    });

    test('default command judges and builds reports from single benchmark and submission files', () => {
        const rootDir = makeTempDir();
        const benchmarkPath = path.join(rootDir, 'benchmark.json');
        const submissionPath = path.join(rootDir, 'submission.json');
        const reportDir = path.join(rootDir, 'benchmark-results');
        const cliPath = path.join(process.cwd(), 'run-benchmark.js');

        fs.writeFileSync(
            benchmarkPath,
            JSON.stringify(
                {
                    benchmark_id: 'core-v1',
                    name: 'AI Crypto Deep Research Benchmark',
                    tasks: [
                        {
                            id: 'deep-research-001',
                            category: 'funding-and-token-status',
                            prompt: 'Find crypto projects without a token that raised more than $10M since 2024.',
                            expectations: ['List qualifying projects', 'Verify token status', 'Cite sources'],
                            red_flags: ['Claims token status without evidence'],
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
                    submission_id: 'cli-run-submission',
                    model_name: 'CLI Run Model',
                    generated_at: '2026-03-17T00:00:00.000Z',
                    answers: [
                        {
                            task_id: 'deep-research-001',
                            answer_markdown:
                                '# Findings\n\nProject Alpha raised capital and has no token launch confirmed.\n\n- [Source one](https://example.com/one)\n- [Source two](https://example.org/two)\n'
                        }
                    ]
                },
                null,
                2
            )
        );

        execFileSync(
            'node',
            [
                cliPath,
                '--benchmark',
                benchmarkPath,
                '--submission',
                submissionPath,
                '--out',
                reportDir,
                '--mock-judge-response',
                JSON.stringify({
                    verdict: 'pass',
                    overall_score: 81,
                    summary: 'Good answer.',
                    criteria: [{ name: 'task_completion', score: 16, max_score: 20, reasoning: 'Covered the task.' }]
                })
            ],
            {
                cwd: process.cwd()
            }
        );

        expect(fs.existsSync(path.join(reportDir, 'judgments', 'deep-research-001.json'))).toBe(true);
        expect(fs.existsSync(path.join(reportDir, 'summary.json'))).toBe(true);

        const summary = JSON.parse(fs.readFileSync(path.join(reportDir, 'summary.json'), 'utf8'));
        expect(summary.results[0].overallScore).toBe(81);
        expect(summary.modelName).toBe('CLI Run Model');
    });
});
