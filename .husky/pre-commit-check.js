#!/usr/bin/env node

/**
 * Pre-commit hook to check for formatting and build errors
 * This script runs before every git commit
 */

const { execSync } = require("child_process");
const chalk = require("chalk");

console.log(chalk.blue("🔍 Running pre-commit checks...\n"));

let hasErrors = false;

// Check 1: Format check
try {
  console.log(chalk.yellow("📝 Checking code formatting..."));
  execSync("npm run format:check", { stdio: "inherit" });
  console.log(chalk.green("✓ Formatting check passed\n"));
} catch (error) {
  console.log(chalk.red("✗ Formatting check failed!"));
  console.log(
    chalk.yellow("Run 'npm run format' to auto-fix formatting issues\n")
  );
  hasErrors = true;
}

// Check 2: TypeScript compilation
try {
  console.log(chalk.yellow("🔨 Checking TypeScript compilation..."));
  execSync("npx tsc --noEmit", { stdio: "inherit" });
  console.log(chalk.green("✓ TypeScript compilation passed\n"));
} catch (error) {
  console.log(chalk.red("✗ TypeScript compilation failed!\n"));
  hasErrors = true;
}

// Check 3: Build check (optional, can be slow)
// Uncomment if you want to ensure builds pass before commit
/*
try {
  console.log(chalk.yellow('🏗️  Running production build...'));
  execSync('npm run build', { stdio: 'inherit' });
  console.log(chalk.green('✓ Build passed\n'));
} catch (error) {
  console.log(chalk.red('✗ Build failed!\n'));
  hasErrors = true;
}
*/

if (hasErrors) {
  console.log(
    chalk.red(
      "\n❌ Pre-commit checks failed! Please fix the errors above before committing.\n"
    )
  );
  process.exit(1);
} else {
  console.log(chalk.green("\n✅ All pre-commit checks passed!\n"));
  process.exit(0);
}
