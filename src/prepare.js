const { extractMarkdownMetrics } = require('./markdown');
const { buildJudgePrompt } = require('./rubric');

function prepareJudgeBundle({ caseDefinition, answerMarkdown }) {
    const metrics = extractMarkdownMetrics(answerMarkdown);

    return {
        caseId: caseDefinition.id,
        metrics,
        promptText: buildJudgePrompt({ caseDefinition, answerMarkdown, metrics })
    };
}

module.exports = {
    prepareJudgeBundle
};
