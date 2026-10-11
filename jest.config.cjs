module.exports = {
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>/src/**/*.test.ts?(x)"],
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest",
  },
  setupFilesAfterEnv: ["<rootDir>/src/test-setup.ts"],
  coverageProvider: "babel",
  coverageDirectory: "<rootDir>/coverage",
  coverageReporters: ["text", "lcov"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.test.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/test-setup.ts",
  ],
  coverageThreshold: {
    "./src/App.tsx": { branches: 80, functions: 80, lines: 80, statements: 80 },
    "./src/api/menuApi.ts": { branches: 80, functions: 80, lines: 80, statements: 80 },
    "./src/features/catalog/CatalogPage.tsx": { branches: 80, functions: 80, lines: 80, statements: 80 },
    "./src/features/catalog/EntryCard.tsx": { branches: 80, functions: 80, lines: 80, statements: 80 },
    "./src/features/categories/CategoryPage.tsx": { branches: 80, functions: 80, lines: 80, statements: 80 },
    "./src/features/categories/CategoryFormDialog.tsx": { branches: 80, functions: 80, lines: 80, statements: 80 },
    "./src/shared/SearchField.tsx": { branches: 80, functions: 80, lines: 80, statements: 80 },
  },
};
