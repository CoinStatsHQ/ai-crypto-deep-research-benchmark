# AI Crypto Deep Research Benchmark

`ai-crypto-deep-research-benchmark` is a file-based benchmark for evaluating crypto deep-research outputs in markdown format.

The repository ships:

- a public benchmark definition in JSON
- a built-in Anthropic judge
- structured per-task judgments
- aggregate JSON and markdown reports

## Overview

A benchmark run consumes two inputs:

1. `benchmark.json`
   A benchmark definition with task prompts, expectations, and red flags.
2. `submission.json`
   A submission file with metadata and one markdown answer per task.

For each answered task, the benchmark:

1. builds a judge prompt from the task definition and answer markdown
2. includes structural markdown metrics as additional context
3. sends the prompt to Anthropic
4. saves the raw judgment as JSON
5. builds aggregate reports across the submission

The default benchmark bundled with the repository is [benchmarks/core-v1.json](./benchmarks/core-v1.json).

## Quick Start

Requirements:

- Node.js `>= 20`
- an Anthropic API key

Install dependencies:

```bash
npm install
```

Configure Anthropic:

```bash
cp .env.example .env
```

`.env`

```bash
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ANTHROPIC_MODEL=claude-opus-4-6
```

Run the example submission against the bundled benchmark:

```bash
node run-benchmark.js --submission examples/submission.json
```

Equivalent package invocation:

```bash
npx ai-crypto-deep-research-benchmark --submission examples/submission.json
```

Default paths:

- benchmark: `benchmarks/core-v1.json`
- output: `./benchmark-results`

Generated artifacts:

- `benchmark-results/judgments/*.json`
- `benchmark-results/summary.json`
- `benchmark-results/summary.md`

## CLI

The default action is `run`.

```bash
node run-benchmark.js --submission <submission.json>
```

Common flags:

- `--benchmark <benchmark.json>`
- `--submission <submission.json>`
- `--out <directory>`
- `--model <anthropic-model>`

Advanced subcommands:

```bash
node run-benchmark.js prepare --submission <submission.json> --out /tmp/prepared
node run-benchmark.js judge --submission <submission.json> --out /tmp/judgments
node run-benchmark.js score --submission <submission.json> --judgments /tmp/judgments --out /tmp/report
```

Use `prepare` to inspect the exact prompt and markdown metrics without making a model call.

Use `judge` and `score` separately when you want to persist or inspect intermediate artifacts.

Show help:

```bash
node run-benchmark.js --help
```

## Input Format

### Benchmark File

A benchmark file is a single JSON document with top-level benchmark metadata and a `tasks` array.

Minimal example:

```json
{
  "benchmark_id": "core-v1",
  "name": "AI Crypto Deep Research Benchmark",
  "tasks": [
    {
      "id": "deep-research-001",
      "category": "funding-and-token-status",
      "prompt": "Find crypto projects without a token that raised more than $10M since 2024.",
      "expectations": [
        "List qualifying projects",
        "Cite sources"
      ],
      "red_flags": [
        "Claims token status without evidence"
      ]
    }
  ]
}
```

Relevant schema:

- [schemas/benchmark.schema.json](./schemas/benchmark.schema.json)

### Submission File

A submission file is a single JSON document with run metadata and an `answers` array.

Minimal example:

```json
{
  "submission_id": "my-run-001",
  "model_name": "My Research Assistant",
  "generated_at": "2026-03-17T12:00:00.000Z",
  "answers": [
    {
      "task_id": "deep-research-001",
      "answer_markdown": "# Findings\n\nYour markdown answer here with citations."
    }
  ]
}
```

Relevant schema:

- [schemas/submission.schema.json](./schemas/submission.schema.json)

## Judge Pipeline

Each task is evaluated independently.

The prompt sent to Anthropic contains:

- task id
- task category
- task prompt
- task expectations
- task red flags
- the full answer markdown
- markdown metrics extracted from the answer
- the benchmark rubric and output schema

The built-in judge expects strict JSON output and writes one file per answered task.

Default judge configuration:

- provider: `Anthropic`
- model: `claude-opus-4-6`

Environment variables:

- `ANTHROPIC_API_KEY` required
- `ANTHROPIC_MODEL` optional
- `ANTHROPIC_BASE_URL` optional

## Rubric

Each answer is scored on the following criteria:

- `task_completion`
- `factual_precision`
- `citation_grounding`
- `source_diversity`
- `analytical_depth`
- `uncertainty_calibration`

The benchmark also computes markdown-level metrics:

- word count
- heading count
- bullet count
- citation count
- unique citation domains

These metrics are provided to the judge as structured context and are also surfaced in the final report.

## Output Artifacts

A standard run produces:

```text
benchmark-results/
  judgments/
    deep-research-001.json
    deep-research-004.json
  summary.json
  summary.md
```

### Per-Task Judgment

Each file in `judgments/` contains the raw model judgment plus benchmark metadata.

Example:

```json
{
  "verdict": "pass",
  "overall_score": 84,
  "summary": "Strong comparison with a clear conclusion, though it still needs broader sourcing for a top-tier score.",
  "criteria": [
    {
      "name": "task_completion",
      "score": 17,
      "max_score": 20,
      "reasoning": "All requested protocols are covered."
    }
  ],
  "task_id": "deep-research-004",
  "judge_provider": "anthropic",
  "judge_model": "claude-opus-4-6",
  "judged_at": "2026-03-17T00:00:00.000Z"
}
```

Relevant schema:

- [schemas/judgment.schema.json](./schemas/judgment.schema.json)

### Aggregate Reports

`summary.json` is the machine-readable aggregate report.

`summary.md` is the human-readable report and includes:

- per-task score table
- verdict and summary per task
- criterion-by-criterion scores and reasoning
- markdown metrics
- structural warnings such as missing citations or low word count

## Repository Layout

Key files:

- [benchmarks/core-v1.json](./benchmarks/core-v1.json)
- [examples/submission.json](./examples/submission.json)
- [run-benchmark.js](./run-benchmark.js)
- [src/judge.js](./src/judge.js)
- [src/score.js](./src/score.js)

## Scope

Current repository scope:

- crypto benchmark tasks
- markdown answer evaluation
- Anthropic-based judging
- file-based benchmark artifacts and reports

## Development

Run tests:

```bash
npm test
```

## Origin

This benchmark was created to test and benchmark [CoinStats AI Agent](https://coinstats.app/ai).

## License

ISC
