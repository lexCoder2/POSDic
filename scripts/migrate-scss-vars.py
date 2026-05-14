#!/usr/bin/env python3
"""
migrate-scss-vars.py
Replaces SCSS color variables with CSS custom properties across component files.
Run from project root: python3 scripts/migrate-scss-vars.py
"""
import os
import re
import sys

# Files/dirs to skip (already using CSS props or are definition files)
SKIP_PATTERNS = [
    '_theme.scss', '_tokens.scss', '_mixins.scss', '_animations.scss',
    '_typography.scss', '_utilities.scss', '_layout-',
    'table.scss', 'styles.scss',
]

def should_skip(path):
    filename = os.path.basename(path)
    return any(p in filename for p in SKIP_PATTERNS)

# ============================================================
# Replacement rules — ORDER MATTERS: longest patterns first
# ============================================================
REPLACEMENTS = [
    # --- rgba() with SCSS vars (must come first: replaces $var inside rgba()) ---
    (r'rgba\(\s*\$blue-primary\s*,', 'rgba(var(--color-primary-rgb),'),
    (r'rgba\(\s*\$primary-dark\s*,',  'rgba(var(--color-primary-rgb),'),
    (r'rgba\(\s*\$primary\s*,',       'rgba(var(--color-primary-rgb),'),
    (r'rgba\(\s*\$success\s*,',       'rgba(var(--color-success-rgb),'),
    (r'rgba\(\s*\$danger\s*,',        'rgba(var(--color-danger-rgb),'),
    (r'rgba\(\s*\$warning\s*,',       'rgba(var(--color-warning-rgb),'),
    (r'rgba\(\s*\$info\s*,',          'rgba(var(--color-info-rgb),'),
    (r'rgba\(\s*\$gray-700\s*,',      'rgba(55, 65, 81,'),
    (r'rgba\(\s*\$gray-600\s*,',      'rgba(75, 85, 99,'),
    (r'rgba\(\s*\$gray-500\s*,',      'rgba(107, 114, 128,'),
    (r'rgba\(\s*\$white\s*,',         'rgba(255, 255, 255,'),

    # --- darken() / lighten() calls ---
    (r'darken\(\s*\$blue-primary\s*,[^)]*\)', 'var(--color-primary-dark)'),
    (r'darken\(\s*\$primary\s*,[^)]*\)',      'var(--color-primary-dark)'),
    (r'darken\(\s*\$success\s*,[^)]*\)',      'var(--color-success-dark)'),
    (r'darken\(\s*\$danger\s*,[^)]*\)',       'var(--color-danger-dark)'),
    (r'darken\(\s*\$warning\s*,[^)]*\)',      'var(--color-warning-dark)'),
    (r'darken\(\s*\$info\s*,[^)]*\)',         'var(--color-info-dark)'),
    (r'lighten\(\s*\$primary\s*,[^)]*\)',     'var(--color-primary-light)'),
    (r'lighten\(\s*\$success\s*,[^)]*\)',     'var(--color-success-light)'),
    (r'lighten\(\s*\$danger\s*,[^)]*\)',      'var(--color-danger-light)'),
    (r'lighten\(\s*\$warning\s*,[^)]*\)',     'var(--color-warning-light)'),
    (r'lighten\(\s*\$info\s*,[^)]*\)',        'var(--color-info-light)'),

    # --- Direct SCSS color variables (longest names first!) ---
    (r'\$blue-primary',         'var(--color-primary)'),
    (r'\$primary-dark',         'var(--color-primary-dark)'),
    (r'\$primary-light',        'var(--color-primary-light)'),
    (r'\$primary',              'var(--color-primary)'),
    (r'\$success-dark',         'var(--color-success-dark)'),
    (r'\$success-light',        'var(--color-success-light)'),
    (r'\$success',              'var(--color-success)'),
    (r'\$danger-dark',          'var(--color-danger-dark)'),
    (r'\$danger-light',         'var(--color-danger-light)'),
    (r'\$danger',               'var(--color-danger)'),
    (r'\$warning-dark',         'var(--color-warning-dark)'),
    (r'\$warning-light',        'var(--color-warning-light)'),
    (r'\$warning',              'var(--color-warning)'),
    (r'\$info-dark',            'var(--color-info-dark)'),
    (r'\$info-light',           'var(--color-info-light)'),
    (r'\$info',                 'var(--color-info)'),

    # --- Gray scale ---
    (r'\$gray-50',              'var(--bg-tertiary)'),
    (r'\$gray-100',             'var(--bg-hover)'),
    (r'\$gray-200',             'var(--border-color)'),
    (r'\$gray-300',             'var(--border-light)'),
    (r'\$gray-400',             'var(--text-light)'),
    (r'\$gray-500',             'var(--text-muted)'),
    (r'\$gray-600',             'var(--text-secondary)'),
    (r'\$gray-700',             'var(--text-primary)'),
    (r'\$gray-800',             'var(--text-primary)'),
    (r'\$gray-900',             'var(--text-primary)'),

    # --- Neumorphic backgrounds ---
    (r'\$neumorphic-surface',   'var(--bg-secondary)'),
    (r'\$neumorphic-bg',        'var(--bg-primary)'),

    # --- White / Black ---
    (r'\$white',                '#fff'),
    (r'\$black',                '#000'),

    # --- Shadow variables ---
    (r'\$shadow-sm\b',          'var(--shadow-1)'),
    (r'\$shadow-neumorphic\b',  'var(--shadow-2)'),
    (r'\$shadow-md\b',          'var(--shadow-2)'),
    (r'\$shadow-lg\b',          'var(--shadow-3)'),
]

compiled = [(re.compile(pat), repl) for pat, repl in REPLACEMENTS]

def migrate_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        original = f.read()

    content = original
    for pattern, replacement in compiled:
        content = pattern.sub(replacement, content)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        changes = sum(1 for a, b in zip(original.splitlines(), content.splitlines()) if a != b)
        return changes
    return 0

def main():
    root = os.path.join(os.path.dirname(__file__), '..', 'src', 'app', 'components')
    root = os.path.normpath(root)
    total_files = 0
    total_changes = 0
    for dirpath, dirnames, filenames in os.walk(root):
        for fname in filenames:
            if not fname.endswith('.scss'):
                continue
            if should_skip(fname):
                continue
            full = os.path.join(dirpath, fname)
            changes = migrate_file(full)
            if changes:
                rel = os.path.relpath(full, os.path.join(root, '..', '..'))
                print(f'  {rel}  ({changes} lines changed)')
                total_files += 1
                total_changes += changes

    print(f'\nMigrated {total_files} files, ~{total_changes} lines changed.')

if __name__ == '__main__':
    main()
