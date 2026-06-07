from pathlib import Path
import re

nested_rule_pattern = re.compile(
    r'\n\s*\.logo-mark img,\s*\n\s*\.logo-icon img\s*\{[^\}]*\}\s*',
    re.S
)

for path in Path('.').glob('*.html'):
    text = path.read_text(encoding='utf-8')
    original = text

    text = nested_rule_pattern.sub('', text)

    if '<style>' in text and '/* LOGO IMAGE FALLBACK */' not in text:
        injection = '''
    /* LOGO IMAGE FALLBACK */
    .logo-mark img, .logo-icon img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
    }
'''
        # insert before closing </style> of the first style tag
        text = text.replace('</style>', injection + '</style>', 1)

    if text != original:
        path.write_text(text, encoding='utf-8')
        print(f'Fixed CSS in {path}')
