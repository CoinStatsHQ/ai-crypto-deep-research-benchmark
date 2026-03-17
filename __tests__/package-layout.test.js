const fs = require('fs');
const os = require('os');
const path = require('path');

const { loadCases, loadSubmissionBundle } = require('../src/io');

function makeTempDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'crypto-benchmark-'));
}

describe('crypto deep research benchmark package layout', () => {
    test('loads benchmark cases and submission manifest from the standalone package layout', () => {
        const rootDir = makeTempDir();
        const caseDir = path.join(rootDir, 'cases');
        const submissionDir = path.join(rootDir, 'submission');
        const answersDir = path.join(submissionDir, 'answers');

        fs.mkdirSync(caseDir, { recursive: true });
        fs.mkdirSync(answersDir, { recursive: true });

        fs.writeFileSync(
            path.join(caseDir, 'deep-research-001.json'),
            JSON.stringify(
                {
                    id: 'deep-research-001',
                    category: 'token-status',
                    prompt: 'Find projects without a token that raised more than $10M since 2024.',
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
                    submission_id: 'sample-submission',
                    model_name: 'Example Model',
                    generated_at: '2026-03-17T00:00:00.000Z'
                },
                null,
                2
            )
        );

        fs.writeFileSync(
            path.join(answersDir, 'deep-research-001.md'),
            '# Research Findings\n\n- Project Alpha raised $12M.\n'
        );

        const cases = loadCases(caseDir);
        const submissionBundle = loadSubmissionBundle(submissionDir);

        expect(cases).toHaveLength(1);
        expect(cases[0].id).toBe('deep-research-001');
        expect(submissionBundle.manifest.model_name).toBe('Example Model');
        expect(submissionBundle.answers['deep-research-001']).toContain('Project Alpha');
    });
});
