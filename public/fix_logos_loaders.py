from pathlib import Path
import re

new_loader = '''    <div class="loader" id="loader">
        <div class="loader-content">
            <div class="loader-logo">
                <img src="images/logowtb.png" alt="Messianic Movement logo" class="loader-logo-img">
                <div class="loader-ring"></div>
                <div class="loader-ring loader-ring--soft"></div>
            </div>
            <div class="loader-text">
                <span>Loading</span>
                <span class="loader-dots"><span>.</span><span>.</span><span>.</span></span>
            </div>
            <div class="loader-bar">
                <div class="loader-progress"></div>
            </div>
        </div>
    </div>'''

loader_pattern = re.compile(
    r'<div class="loader" id="loader">.*?<div class="loader-progress"></div>\s*</div>\s*</div>\s*</div>',
    re.S
)

logo_mark_pattern = re.compile(r'(\.logo-mark\s*\{[^}]*\})', re.S)
logo_icon_pattern = re.compile(r'(\.logo-icon\s*\{[^}]*\})', re.S)

for path in Path('.').glob('*.html'):
    text = path.read_text(encoding='utf-8')
    original = text

    # Normalize loader block
    if 'id="loader"' in text:
        text = loader_pattern.sub(new_loader, text)

    # Fix page-specific logo image sizing inside inline <style>
    if '<style>' in text:
        def ensure_img_rule(match):
            block = match.group(1)
            if 'logo-mark img' not in block:
                insert_point = block.rfind('}')
                if insert_point != -1:
                    block = block[:insert_point] + '    .logo-mark img,\n    .logo-icon img {\n        width: 100%;\n        height: 100%;\n        object-fit: contain;\n        display: block;\n    }\n' + block[insert_point:]
            if 'overflow: hidden' not in block and '.logo-mark' in block:
                block = re.sub(r'(\.logo-mark\s*\{)', r'\1\n    overflow: hidden;', block, 1)
            return block

        text = logo_mark_pattern.sub(ensure_img_rule, text)
        text = logo_icon_pattern.sub(ensure_img_rule, text)

    if text != original:
        path.write_text(text, encoding='utf-8')
        print(f'Patched {path}')
