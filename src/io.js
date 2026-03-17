const fs = require('fs');
const path = require('path');

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function toAnswersMap(answerEntries) {
    if (Array.isArray(answerEntries)) {
        return Object.fromEntries(
            answerEntries
                .map(entry => [entry.task_id || entry.case_id || entry.id, entry.answer_markdown || entry.markdown || ''])
                .filter(([taskId]) => Boolean(taskId))
        );
    }

    if (answerEntries && typeof answerEntries === 'object') {
        return Object.fromEntries(
            Object.entries(answerEntries).filter(([, markdown]) => typeof markdown === 'string')
        );
    }

    return {};
}

function loadBenchmark(benchmarkPath) {
    const data = readJson(benchmarkPath);
    const tasks = Array.isArray(data.tasks) ? data.tasks : Array.isArray(data.cases) ? data.cases : [];

    return {
        benchmarkId: data.benchmark_id || data.id || path.basename(benchmarkPath, path.extname(benchmarkPath)),
        name: data.name || 'AI Crypto Deep Research Benchmark',
        description: data.description || '',
        version: data.version || null,
        tasks
    };
}

function loadCases(caseDir) {
    return fs
        .readdirSync(caseDir)
        .filter(fileName => fileName.endsWith('.json'))
        .sort()
        .map(fileName => readJson(path.join(caseDir, fileName)));
}

function loadSubmissionBundle(submissionDir) {
    const manifestPath = path.join(submissionDir, 'manifest.json');
    const answersDir = path.join(submissionDir, 'answers');
    const manifest = readJson(manifestPath);
    const answers = {};

    for (const fileName of fs.readdirSync(answersDir).filter(name => name.endsWith('.md')).sort()) {
        const caseId = fileName.replace(/\.md$/u, '');
        answers[caseId] = fs.readFileSync(path.join(answersDir, fileName), 'utf8');
    }

    return { manifest, answers };
}

function loadSubmission(submissionPath) {
    const data = readJson(submissionPath);

    return {
        manifest: {
            submission_id: data.submission_id,
            model_name: data.model_name,
            generated_at: data.generated_at,
            notes: data.notes
        },
        answers: toAnswersMap(data.answers)
    };
}

module.exports = {
    loadBenchmark,
    loadCases,
    loadSubmission,
    loadSubmissionBundle
};
