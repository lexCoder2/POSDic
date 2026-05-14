#!/usr/bin/env python3
"""Fix focus-ring mixin call sites"""
import os

files_primary = [
    'src/app/components/pos/internal-sale-modal/internal-sale-modal.component.scss',
    'src/app/components/pos/weight-modal/weight-modal.component.scss',
    'src/app/components/pos/checkout-modal/checkout-modal.component.scss',
    'src/app/components/pos/pos.component.scss',
    'src/app/components/pos/quick-product-modal/quick-product-modal.component.scss',
]
files_warning = [
    'src/app/components/pos/returns-modal/returns-modal.component.scss',
]

for f in files_primary:
    txt = open(f).read()
    new = txt.replace('@include focus-ring(var(--color-primary));', '@include focus-ring();')
    if new != txt:
        open(f, 'w').write(new)
        print('fixed (primary)', f)

for f in files_warning:
    txt = open(f).read()
    new = txt.replace(
        '@include focus-ring(var(--color-warning));',
        'outline: none; box-shadow: 0 0 0 2px rgba(var(--color-warning-rgb), 0.25);'
    )
    if new != txt:
        open(f, 'w').write(new)
        print('fixed (warning)', f)

print('done')
