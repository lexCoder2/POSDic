# Git Pre-commit Hooks Setup

This project uses Git pre-commit hooks to automatically check for formatting and build errors before each commit.

## What Gets Checked

Before every commit, the following checks run automatically:

1. **Code Formatting** - Prettier checks all TypeScript, HTML, SCSS, and JSON files
2. **TypeScript Compilation** - Ensures no TypeScript errors
3. **Auto-formatting** - Staged files are automatically formatted

## Installation

### One-time Setup

Run the setup script:

```powershell
.\setup-git-hooks.ps1
```

Or manually:

```bash
npm install
npm run prepare
```

This will:
- Install husky, lint-staged, and prettier
- Initialize Git hooks
- Create the pre-commit hook

## Usage

### Normal Git Workflow

```bash
git add .
git commit -m "Your commit message"
```

The pre-commit hook will run automatically. If any checks fail:
- The commit will be blocked
- You'll see error messages
- Fix the errors and try again

### Manual Formatting

Format all files:
```bash
npm run format
```

Check formatting without fixing:
```bash
npm run format:check
```

### Bypassing Hooks (Not Recommended)

Only in emergency situations:
```bash
git commit --no-verify -m "Emergency fix"
```

## Configuration Files

- **`.prettierrc`** - Prettier configuration
- **`.prettierignore`** - Files to ignore for formatting
- **`package.json`** - Husky and lint-staged configuration
- **`.husky/pre-commit`** - Pre-commit hook script

## What Gets Formatted

File types checked:
- `*.ts` - TypeScript files
- `*.js` - JavaScript files
- `*.html` - HTML templates
- `*.scss` - SCSS stylesheets
- `*.css` - CSS stylesheets
- `*.json` - JSON files

Excluded:
- `node_modules/`
- `dist/` and `dist-test/`
- `*.log` files
- Build artifacts
- Third-party libraries

## Troubleshooting

### Hook Not Running

```bash
# Reinstall hooks
npx husky install
```

### Formatting Errors

```bash
# Auto-fix all formatting issues
npm run format

# Then commit again
git add .
git commit -m "Your message"
```

### TypeScript Errors

```bash
# Check errors
npx tsc --noEmit

# Fix the errors in your code
# Then commit again
```

### "Husky command not found"

```bash
# Install dependencies
npm install

# Run prepare script
npm run prepare
```

### Slow Commits

If pre-commit checks are too slow, you can:

1. Commit smaller changes more frequently
2. Edit `.husky/pre-commit` to remove the full build check
3. Use `--no-verify` sparingly for work-in-progress commits

## Prettier Rules

Current formatting rules (`.prettierrc`):
- **Semicolons**: Yes (`;`)
- **Quotes**: Double (`"`)
- **Print Width**: 80 characters
- **Tab Width**: 2 spaces
- **Trailing Commas**: ES5 compatible
- **End of Line**: LF (Unix-style)

To change these, edit `.prettierrc`.

## Benefits

✅ **Consistent Code Style** - Everyone follows the same formatting
✅ **Catch Errors Early** - TypeScript errors found before commit
✅ **Automated** - No manual formatting needed
✅ **Cleaner Git History** - No "fix formatting" commits
✅ **Better Code Reviews** - Focus on logic, not style

## Disabling (Not Recommended)

To disable pre-commit hooks:

```bash
# Remove the hook
rm .husky/pre-commit

# Or bypass for one commit
git commit --no-verify
```

**Note**: Only disable in emergency situations. The checks help maintain code quality.

## CI/CD Integration

These same checks should run in your CI/CD pipeline:

```bash
# In GitHub Actions, GitLab CI, etc.
npm run format:check
npx tsc --noEmit
npm run build
```

This ensures code quality even if someone bypasses local hooks.
