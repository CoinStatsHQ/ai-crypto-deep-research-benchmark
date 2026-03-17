const fs = require('fs');
const os = require('os');
const path = require('path');

const { loadBenchmark, loadSubmission } = require('../src/io');

function makeTempDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'crypto-benchmark-files-'));
}

describe('file-based benchmark inputs', () => {
    test('loads a benchmark json file and a submission json file', () => {
        const rootDir = makeTempDir();
        const benchmarkPath = path.join(rootDir, 'core-v1.json');
        const submissionPath = path.join(rootDir, 'submission.json');

        fs.writeFileSync(
            benchmarkPath,
            JSON.stringify(
                {
                    benchmark_id: 'core-v1',
                    name: 'Core Benchmark V1',
                    tasks: [
                        {
                            id: 'deep-research-001',
                            category: 'token-status',
                            prompt: 'Find projects without a token that raised more than $10M since 2024.',
                            expectations: ['List qualifying projects'],
                            red_flags: ['Unsupported claims']
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
                            answer_markdown: '# Findings\n\nProject Alpha raised $12M.\n'
                        }
                    ]
                },
                null,
                2
            )
        );

        const benchmark = loadBenchmark(benchmarkPath);
        const submission = loadSubmission(submissionPath);

        expect(benchmark.benchmarkId).toBe('core-v1');
        expect(benchmark.tasks).toHaveLength(1);
        expect(submission.manifest.model_name).toBe('Example Model');
        expect(submission.answers['deep-research-001']).toContain('Project Alpha');
    });
});
