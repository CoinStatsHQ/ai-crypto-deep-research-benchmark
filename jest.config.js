/** @type {import('jest').Config} */
const config = {
    testEnvironment: 'node',
    coverageProvider: 'v8',
    testMatch: ['**/__tests__/**/*.test.js'],
    coveragePathIgnorePatterns: ['/node_modules/', '/db/', '/loggers/'],
    modulePathIgnorePatterns: ['<rootDir>/node_modules/']
};

module.exports = config;
