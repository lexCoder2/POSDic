#!/usr/bin/env python3
"""Fix remaining SCSS compilation errors after bulk migration."""
import re
import os

FIXES = [
    # (filepath, old_string, new_string)
    # --- modal.component.scss: transparentize with CSS var ---
    (
        'src/app/components/modal/modal.component.scss',
        'transparentize(var(--bg-tertiary), 0.05)',
        'var(--bg-tertiary)',
    ),
    # --- weight-modal: lighten(var(...)) from partial replace ---
    (
        'src/app/components/pos/weight-modal/weight-modal.component.scss',
        'lighten(var(--color-success-light), 5%)',
        'var(--color-success-light)',
    ),
    (
        'src/app/components/pos/weight-modal/weight-modal.component.scss',
        'darken(var(--color-success-light), 5%)',
        'var(--color-success-dark)',
    ),
]

REGEX_FIXES = [
    # For all component files: fix SCSS color functions called with CSS vars
    (r'darken\(var\(--([^)]+)\)[^)]*\)', lambda m: f'var(--{m.group(1)}-dark)' if not m.group(1).endswith('-dark') else f'var(--{m.group(1)})'),
    (r'lighten\(var\(--([^)]+)\)[^)]*\)', lambda m: f'var(--{m.group(1)}-light)' if not m.group(1).endswith('-light') else f'var(--{m.group(1)})'),
    (r'transparentize\(var\(--([^)]+)\),\s*[0-9.]+\)', lambda m: f'var(--{m.group(1)})'),
    (r'color\.adjust\(var\(--([^)]+)\)[^)]*\)', lambda m: f'var(--{m.group(1)}-dark)' if 'lightness: -' in m.group(0) else f'var(--{m.group(1)}-light)'),
    (r'color\.scale\(var\(--([^)]+)\)[^)]*\)', lambda m: f'var(--{m.group(1)}-dark)' if 'lightness: -' in m.group(0) else f'var(--{m.group(1)}-light)'),
    # Fix $border-radius-* → var(--radius-*)
    (r'\$border-radius-sm\b', 'var(--radius-sm)'),
    (r'\$border-radius-md\b', 'var(--radius-md)'),
    (r'\$border-radius-lg\b', 'var(--radius-lg)'),
    (r'\$border-radius-xl\b', 'var(--radius-xl)'),
    (r'\$border-radius-full\b', 'var(--radius-full)'),
]

compiled_regex = [(re.compile(p), r if callable(r) else r) for p, r in REGEX_FIXES]


def fix_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = original = f.read()

    for pattern, repl in compiled_regex:
        if callable(repl):
            content = pattern.sub(repl, content)
        else:
            content = pattern.sub(repl, content)

    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False


if __name__ == '__main__':
    # Apply targeted string fixes first
    for path, old, new in FIXES:
        if os.path.exists(path):
            txt = open(path).read()
            if old in txt:
                open(path, 'w').write(txt.replace(old, new))
                print(f'string-fixed: {path}')

    # Then do regex fixes across all component scss files
    count = 0
    for root, dirs, files in os.walk('src/app/components'):
        for fname in files:
            if fname.endswith('.scss') and not fname.startswith('_layout-'):
                full = os.path.join(root, fname)
                if fix_file(full):
                    print(f'regex-fixed: {full}')
                    count += 1

    print(f'Done. {count} files updated.')
