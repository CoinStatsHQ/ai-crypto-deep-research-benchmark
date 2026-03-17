const fs = require('fs');
const os = require('os');
const path = require('path');

const { runJudge, getDefaultJudgeModel } = require('../src/judge');

function makeTempDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'crypto-benchmark-judge-'));
}

describe('runJudge', () => {
    test('uses claude-opus-4-6 as the default judge model', () => {
        expect(getDefaultJudgeModel()).toBe('claude-opus-4-6');
    });

    test('builds prompt bundles and writes one judgment JSON per answered case', async () => {
        const rootDir = makeTempDir();
        const caseDir = path.join(rootDir, 'cases');
        const submissionDir = path.join(rootDir, 'submission');
        const answersDir = path.join(submissionDir, 'answers');
        const outDir = path.join(rootDir, 'judgments');

        fs.mkdirSync(caseDir, { recursive: true });
        fs.mkdirSync(answersDir, { recursive: true });

        fs.writeFileSync(
            path.join(caseDir, 'deep-research-001.json'),
            JSON.stringify(
                {
                    id: 'deep-research-001',
                    category: 'market-structure',
                    prompt: 'Analyze the correlation between ETF inflows and BTC price action.',
                    expectations: ['Cover both variables', 'Use citations'],
                    red_flags: ['Claims causation without support'],
                    minimum_citations: 2
                },
                null,
                2
            )
        );

        fs.writeFileSync(
            path.join(submissionDir, 'manifest.json'),
            JSON.stringify(
                {
                    submission_id: 'judge-submission',
                    model_name: 'Research Model',
                    generated_at: '2026-03-17T00:00:00.000Z'
                },
                null,
                2
            )
        );

        fs.writeFileSync(
            path.join(answersDir, 'deep-research-001.md'),
            '# BTC ETF Flow Analysis\n\n- [ETF source](https://example.com/etf)\n- [Market source](https://example.com/market)\n'
        );

        const seenPrompts = [];
        const judgeClient = {
            async judgePrompt(promptText) {
                seenPrompts.push(promptText);
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

        const result = await runJudge({
            caseDir,
            submissionDir,
            outDir,
            judgeClient,
            judgeProvider: 'anthropic',
            judgeModel: 'claude-opus-4-6'
        });

        const writtenJudgment = JSON.parse(fs.readFileSync(path.join(outDir, 'deep-research-001.json'), 'utf8'));

        expect(seenPrompts).toHaveLength(1);
        expect(seenPrompts[0]).toContain('AI Crypto Deep Research Benchmark');
        expect(result.results).toHaveLength(1);
        expect(result.results[0].caseId).toBe('deep-research-001');
        expect(writtenJudgment.verdict).toBe('pass');
        expect(writtenJudgment.task_id).toBe('deep-research-001');
        expect(writtenJudgment.judge_provider).toBe('anthropic');
        expect(writtenJudgment.judge_model).toBe('claude-opus-4-6');
    });
});
