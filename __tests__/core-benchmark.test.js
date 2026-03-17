const fs = require('fs');
const path = require('path');

const { loadBenchmark } = require('../src/io');

describe('core benchmark definition', () => {
    test('uses consecutive task ids for the 12-task benchmark', () => {
        const benchmark = loadBenchmark(path.join(process.cwd(), 'benchmarks', 'core-v1.json'));
        const taskIds = benchmark.tasks.map(task => task.id);
        const expectedIds = Array.from({ length: 12 }, (_, index) => `deep-research-${String(index + 1).padStart(3, '0')}`);

        expect(taskIds).toHaveLength(12);
        expect(taskIds).toEqual(expectedIds);

        for (const task of benchmark.tasks.slice(6)) {
            expect(task.expectations.length).toBeGreaterThanOrEqual(4);
            expect(task.red_flags.length).toBeGreaterThanOrEqual(3);
            expect(task.minimum_citations).toBeGreaterThanOrEqual(4);
            expect(task.minimum_words).toBeGreaterThanOrEqual(600);
        }
    });
});
