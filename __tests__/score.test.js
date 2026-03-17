const { scoreSubmission, buildMarkdownReport } = require('../src/score');

describe('benchmark scoring', () => {
    test('scores a submission from returned judge JSON and emits warnings for missing citation coverage', () => {
        const caseDefinition = {
            id: 'deep-research-011',
            prompt: 'Compare Uniswap, Aave, and MakerDAO fee models.',
            minimum_citations: 3
        };

        const answerMarkdown = `# Revenue Model Comparison

- [Uniswap fee switch overview](https://docs.uniswap.org/concepts/uniswap-protocol)
- [Aave governance docs](https://aave.com/docs/developers/governance)
`;

        const judgment = {
            verdict: 'pass',
            overall_score: 84,
            summary: 'Strong answer overall, but citation breadth is a bit thin.',
            criteria: [
                { name: 'task_completion', score: 17, max_score: 20, reasoning: 'Covered all three protocols.' },
                { name: 'factual_precision', score: 16, max_score: 20, reasoning: 'Mostly precise.' },
                { name: 'citation_grounding', score: 12, max_score: 15, reasoning: 'Could use more citations.' },
                { name: 'source_diversity', score: 11, max_score: 15, reasoning: 'Only two distinct domains.' },
                { name: 'analytical_depth', score: 18, max_score: 20, reasoning: 'Strong comparisons.' },
                { name: 'uncertainty_calibration', score: 10, max_score: 10, reasoning: 'Good caveats.' }
            ]
        };

        const result = scoreSubmission({ caseDefinition, answerMarkdown, judgment });
        const markdownReport = buildMarkdownReport({
            submissionId: 'sample-submission',
            modelName: 'Example Model',
            generatedAt: '2026-03-17T00:00:00.000Z',
            results: [result]
        });

        expect(result.caseId).toBe('deep-research-011');
        expect(result.overallScore).toBe(84);
        expect(result.warnings).toContain('Answer cites fewer sources than the case minimum.');
        expect(result.metrics.citationCount).toBe(2);
        expect(markdownReport).toContain('Example Model');
        expect(markdownReport).toContain('deep-research-011');
        expect(markdownReport).toContain('84');
        expect(markdownReport).toContain('Task Completion');
        expect(markdownReport).toContain('17 / 20');
        expect(markdownReport).toContain('Covered all three protocols.');
        expect(markdownReport).toContain('Factual Precision');
        expect(markdownReport).toContain('16 / 20');
    });
});
