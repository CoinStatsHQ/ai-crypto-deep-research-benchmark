const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const { loadBenchmark, loadCases, loadSubmission, loadSubmissionBundle } = require('./io');
const { prepareJudgeBundle } = require('./prepare');
const { JUDGMENT_RESPONSE_SCHEMA } = require('./judge-schema');

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getCaseMap(caseDir) {
    return new Map(loadCases(caseDir).map(caseDefinition => [caseDefinition.id, caseDefinition]));
}

function getTaskMap({ benchmarkPath, caseDir }) {
    if (benchmarkPath) {
        return new Map(loadBenchmark(benchmarkPath).tasks.map(taskDefinition => [taskDefinition.id, taskDefinition]));
    }

    return getCaseMap(caseDir);
}

function getSubmissionBundle({ submissionPath, submissionDir }) {
    if (submissionPath) {
        const stats = fs.statSync(submissionPath);
        if (stats.isDirectory()) {
            return loadSubmissionBundle(submissionPath);
        }

        return loadSubmission(submissionPath);
    }

    return loadSubmissionBundle(submissionDir);
}

function parseJsonResult(text) {
    const jsonMatch = text.match(/\{[\s\S]*\}/u);
    if (!jsonMatch) {
        throw new Error('Judge response did not contain a JSON object.');
    }

    return JSON.parse(jsonMatch[0]);
}

function getDefaultJudgeModel() {
    return 'claude-opus-4-6';
}

function createAnthropicJudgeClient({ apiKey, model = getDefaultJudgeModel(), baseURL } = {}) {
    if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY is required to run the built-in judge.');
    }

    const client = new Anthropic({
        apiKey,
        ...(baseURL ? { baseURL } : {})
    });

    return {
        async judgePrompt(promptText) {
            const response = await client.messages.create({
                model,
                max_tokens: 4096,
                system: `Return only valid JSON matching this schema: ${JSON.stringify(JUDGMENT_RESPONSE_SCHEMA)}`,
                messages: [
                    {
                        role: 'user',
                        content: promptText
                    }
                ]
            });

            const outputText = (response.content || [])
                .filter(block => block.type === 'text')
                .map(block => block.text)
                .join('\n')
                .trim();
            if (!outputText) {
                throw new Error('Anthropic judge returned an empty response.');
            }

            return parseJsonResult(outputText);
        }
    };
}

async function runJudge({ caseDir, submissionDir, benchmarkPath, submissionPath, outDir, judgeClient, judgeProvider, judgeModel }) {
    const caseMap = getTaskMap({ benchmarkPath, caseDir });
    const submissionBundle = getSubmissionBundle({ submissionPath, submissionDir });
    const results = [];

    ensureDir(outDir);

    for (const [caseId, answerMarkdown] of Object.entries(submissionBundle.answers)) {
        const caseDefinition = caseMap.get(caseId);
        if (!caseDefinition) continue;

        const bundle = prepareJudgeBundle({ caseDefinition, answerMarkdown });
        const judgment = await judgeClient.judgePrompt(bundle.promptText);
        const judgmentWithMetadata = {
            ...judgment,
            task_id: caseId,
            case_id: caseId,
            judge_provider: judgeProvider,
            judge_model: judgeModel,
            judged_at: new Date().toISOString()
        };

        writeJson(path.join(outDir, `${caseId}.json`), judgmentWithMetadata);
        results.push({
            caseId,
            judgment: judgmentWithMetadata
        });
    }

    return {
        submissionId: submissionBundle.manifest.submission_id,
        modelName: submissionBundle.manifest.model_name,
        results
    };
}

module.exports = {
    createAnthropicJudgeClient,
    getDefaultJudgeModel,
    runJudge
};
