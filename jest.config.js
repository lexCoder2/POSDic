/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-preset-angular",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.spec.ts"],
  setupFilesAfterEnv: ["<rootDir>/setup-jest.ts"],
  collectCoverageFrom: [
    "src/app/services/**/*.ts",
    "src/app/guards/**/*.ts",
    "src/app/interceptors/**/*.ts",
    "src/app/pipes/**/*.ts",
    "src/app/components/**/*.ts",
    "!src/app/**/*.routes.ts",
    "!src/main.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  moduleNameMapper: {
    "^@app/(.*)$": "<rootDir>/src/app/$1",
    "^@environments/(.*)$": "<rootDir>/src/environments/$1",
    "^@styles/(.*)$": "<rootDir>/src/styles/$1",
    "^@bwip-js/browser$": "<rootDir>/src/__mocks__/bwip-js-browser.js",
    "^html5-qrcode$": "<rootDir>/src/__mocks__/html5-qrcode.js",
  },
  transform: {
    "^.+\\.(ts|mjs|js|html)$": [
      "jest-preset-angular",
      {
        tsconfig: "<rootDir>/tsconfig.spec.json",
        stringifyContentPathRegex: "\\.(html|svg)$",
      },
    ],
  },
  transformIgnorePatterns: ["node_modules/(?!.*\.mjs$)"],
};
