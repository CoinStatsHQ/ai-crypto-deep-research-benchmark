const RUBRIC = [
    {
        name: 'task_completion',
        label: 'Task Completion',
        maxScore: 20,
        description: 'Did the answer actually complete the crypto deep research task and cover the requested scope?'
    },
    {
        name: 'factual_precision',
        label: 'Factual Precision',
        maxScore: 20,
        description: 'Are the claims precise, verifiable, and free from obvious factual mistakes or fabrications?'
    },
    {
        name: 'citation_grounding',
        label: 'Citation Grounding',
        maxScore: 15,
        description: 'Are important claims grounded in citations and are those citations used in a trustworthy way?'
    },
    {
        name: 'source_diversity',
        label: 'Source Diversity',
        maxScore: 15,
        description: 'Does the answer rely on a diverse set of sources instead of a single outlet or source type?'
    },
    {
        name: 'analytical_depth',
        label: 'Analytical Depth',
        maxScore: 20,
        description: 'Does the answer synthesize evidence into meaningful analysis instead of just listing facts?'
    },
    {
        name: 'uncertainty_calibration',
        label: 'Uncertainty Calibration',
        maxScore: 10,
        description: 'Does the answer avoid overclaiming and clearly note uncertainty, caveats, or conflicting evidence?'
    }
];

function buildJudgePrompt({ caseDefinition, answerMarkdown, metrics }) {
    const criteriaBlock = RUBRIC.map(
        (criterion, index) => `${index + 1}. ${criterion.label} (${criterion.maxScore}): ${criterion.description}`
    ).join('\n');

    const expectations = (caseDefinition.expectations || []).map(item => `- ${item}`).join('\n') || '- None provided';
    const redFlags = (caseDefinition.red_flags || []).map(item => `- ${item}`).join('\n') || '- None provided';
    const domains = metrics.citationDomains.length > 0 ? metrics.citationDomains.join(', ') : 'none';

    return `You are evaluating a markdown deep-research answer for the AI Crypto Deep Research Benchmark.

Score the answer strictly against the benchmark case below. Use the structural metrics as objective evidence, but make the final judgment from the answer content.

## Benchmark Case
ID: ${caseDefinition.id}
Category: ${caseDefinition.category}
Prompt: ${caseDefinition.prompt}

### Expectations
${expectations}

### Red Flags
${redFlags}

## Markdown Metrics
- Word count: ${metrics.wordCount}
- Heading count: ${metrics.headingCount}
- Bullet count: ${metrics.bulletCount}
- Citation count: ${metrics.citationCount}
- Unique citation domains: ${metrics.uniqueCitationDomains}
- Citation domains: ${domains}

## Answer Markdown
${answerMarkdown}

## Rubric
${criteriaBlock}

## Instructions
1. Judge the answer as a crypto deep-research output only.
2. Penalize uncited, unsupported, or overconfident claims.
3. Be strict about source grounding and analytical quality.
4. If the answer is short, vague, or missing required scope, reflect that in the score.
5. Return ONLY a valid JSON object with the exact schema below.

{
  "verdict": "pass|borderline|fail",
  "overall_score": 0,
  "summary": "short assessment",
  "criteria": [
    { "name": "task_completion", "score": 0, "max_score": 20, "reasoning": "..." },
    { "name": "factual_precision", "score": 0, "max_score": 20, "reasoning": "..." },
    { "name": "citation_grounding", "score": 0, "max_score": 15, "reasoning": "..." },
    { "name": "source_diversity", "score": 0, "max_score": 15, "reasoning": "..." },
    { "name": "analytical_depth", "score": 0, "max_score": 20, "reasoning": "..." },
    { "name": "uncertainty_calibration", "score": 0, "max_score": 10, "reasoning": "..." }
  ]
}

You MUST respond with ONLY a valid JSON object. Do not include markdown fences, commentary, or extra text. ONLY a valid JSON object is allowed.`;
}

module.exports = {
    RUBRIC,
    buildJudgePrompt
};
