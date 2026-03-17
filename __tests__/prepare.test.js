const { prepareJudgeBundle } = require('../src/prepare');

describe('prepareJudgeBundle', () => {
    test('builds a per-case judge prompt with markdown answer, expectations, and citation metrics', () => {
        const caseDefinition = {
            id: 'deep-research-010',
            category: 'ecosystem-analysis',
            prompt: 'Research the Hyperliquid ecosystem in depth.',
            expectations: ['Cover team background', 'Explain tokenomics', 'Assess partnerships'],
            red_flags: ['Uses uncited claims'],
            minimum_citations: 2
        };

        const answerMarkdown = `# Hyperliquid Deep Dive

Hyperliquid has grown quickly since launch and now sits at the center of several perp-native workflows.

## Sources

- [Funding coverage](https://www.theblock.co/post/123/example)
- [Official docs](https://hyperliquid.xyz/docs/overview)
`;

        const bundle = prepareJudgeBundle({ caseDefinition, answerMarkdown });

        expect(bundle.caseId).toBe('deep-research-010');
        expect(bundle.metrics.citationCount).toBe(2);
        expect(bundle.metrics.uniqueCitationDomains).toBe(2);
        expect(bundle.metrics.headingCount).toBeGreaterThanOrEqual(2);
        expect(bundle.promptText).toContain(caseDefinition.prompt);
        expect(bundle.promptText).toContain('Hyperliquid Deep Dive');
        expect(bundle.promptText).toContain('ONLY a valid JSON object');
    });
});
