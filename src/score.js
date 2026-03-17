const { RUBRIC } = require('./rubric');
const { extractMarkdownMetrics } = require('./markdown');

const CRITERION_LABELS = Object.fromEntries(RUBRIC.map(criterion => [criterion.name, criterion.label]));

function buildWarnings(caseDefinition, metrics) {
    const warnings = [];

    if (caseDefinition.minimum_citations && metrics.citationCount < caseDefinition.minimum_citations) {
        warnings.push('Answer cites fewer sources than the case minimum.');
    }

    if (caseDefinition.minimum_words && metrics.wordCount < caseDefinition.minimum_words) {
        warnings.push('Answer is shorter than the case minimum word count.');
    }

    if (metrics.headingCount === 0) {
        warnings.push('Answer has no markdown headings.');
    }

    if (metrics.citationCount === 0) {
        warnings.push('Answer does not contain any markdown citations.');
    }

    return warnings;
}

function scoreSubmission({ caseDefinition, answerMarkdown, judgment }) {
    const metrics = extractMarkdownMetrics(answerMarkdown);

    return {
        taskId: caseDefinition.id,
        caseId: caseDefinition.id,
        verdict: judgment.verdict,
        overallScore: judgment.overall_score,
        summary: judgment.summary,
        criteria: judgment.criteria || [],
        metrics,
        warnings: buildWarnings(caseDefinition, metrics)
    };
}

function averageScore(results) {
    if (!results.length) return 0;
    const total = results.reduce((sum, result) => sum + (result.overallScore || 0), 0);
    return total / results.length;
}

function buildSummary({ taskDefinitions, submissionBundle, judgmentsByTaskId }) {
    const taskMap = new Map(taskDefinitions.map(taskDefinition => [taskDefinition.id, taskDefinition]));
    const results = [];

    for (const [taskId, answerMarkdown] of Object.entries(submissionBundle.answers)) {
        const taskDefinition = taskMap.get(taskId);
        const judgment = judgmentsByTaskId[taskId];

        if (!taskDefinition || !judgment) {
            continue;
        }

        results.push(scoreSubmission({ caseDefinition: taskDefinition, answerMarkdown, judgment }));
    }

    return {
        submissionId: submissionBundle.manifest.submission_id,
        modelName: submissionBundle.manifest.model_name,
        generatedAt: submissionBundle.manifest.generated_at,
        results
    };
}

function buildMarkdownReport({ submissionId, modelName, generatedAt, results }) {
    const avg = averageScore(results).toFixed(1);
    const rows = results
        .map(
            result =>
                `| ${result.taskId || result.caseId} | ${result.overallScore} | ${result.metrics.citationCount} | ${result.metrics.uniqueCitationDomains} | ${
                    result.warnings.length ? result.warnings.join('<br>') : 'None'
                } |`
        )
        .join('\n');

    const details = results
        .map(result => {
            const criteriaLines = (result.criteria || [])
                .map(criterion => {
                    const label = CRITERION_LABELS[criterion.name] || criterion.name;
                    return `- ${label}: ${criterion.score} / ${criterion.max_score}\n  ${criterion.reasoning}`;
                })
                .join('\n');
            const warningsBlock = result.warnings.length
                ? result.warnings.map(warning => `- ${warning}`).join('\n')
                : '- None';

            return `## ${result.taskId || result.caseId}

**Verdict:** ${result.verdict}
**Score:** ${result.overallScore}
**Summary:** ${result.summary}

### Criteria
${criteriaLines || '- None'}

### Metrics
- Word count: ${result.metrics.wordCount}
- Heading count: ${result.metrics.headingCount}
- Bullet count: ${result.metrics.bulletCount}
- Citation count: ${result.metrics.citationCount}
- Unique citation domains: ${result.metrics.uniqueCitationDomains}

### Warnings
${warningsBlock}`;
        })
        .join('\n\n');

    return `# Benchmark Report

- Submission ID: ${submissionId}
- Model: ${modelName}
- Generated At: ${generatedAt}
- Average Score: ${avg}

| Task | Score | Citations | Unique Domains | Warnings |
| --- | ---: | ---: | ---: | --- |
${rows}

${details}`;
}

module.exports = {
    buildSummary,
    scoreSubmission,
    buildMarkdownReport
};
