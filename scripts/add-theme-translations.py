#!/usr/bin/env python3
"""Add GLOBAL.THEME translation keys to en.json and es.json"""
import json
import os

EN_KEYS = {
    "LABEL": "Theme",
    "DARK_MODE": "Dark Mode",
    "LIGHT_MODE": "Light Mode",
    "TOGGLE": "Toggle Theme"
}
ES_KEYS = {
    "LABEL": "Tema",
    "DARK_MODE": "Modo Oscuro",
    "LIGHT_MODE": "Modo Claro",
    "TOGGLE": "Cambiar Tema"
}

def add_theme_keys(filepath, theme_keys):
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    if 'GLOBAL' not in data:
        data['GLOBAL'] = {}
    if 'THEME' not in data['GLOBAL']:
        data['GLOBAL']['THEME'] = theme_keys
        changed = True
    else:
        changed = False
        for k, v in theme_keys.items():
            if k not in data['GLOBAL']['THEME']:
                data['GLOBAL']['THEME'][k] = v
                changed = True

    if changed:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f'Updated: {filepath}')
    else:
        print(f'Already up to date: {filepath}')

add_theme_keys('src/assets/i18n/en.json', EN_KEYS)
add_theme_keys('src/assets/i18n/es.json', ES_KEYS)
print('Done.')
