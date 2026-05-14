module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/__tests__"],
  testMatch: ["**/*.test.js"],
  testTimeout: 60000,
  setupFilesAfterEnv: ["<rootDir>/__tests__/helpers/setup.js"],
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "routes/**/*.js",
    "middleware/**/*.js",
    "models/**/*.js",
    "!**/node_modules/**",
  ],
};
