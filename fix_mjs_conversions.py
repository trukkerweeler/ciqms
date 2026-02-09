#!/usr/bin/env python3
"""
Fix and properly convert .js files to ES6 .mjs modules.
This version is more careful about imports and initialization.
"""

import os
import re
from pathlib import Path

JS_DIR = Path(__file__).parent / "public" / "js"

def fix_converted_file(js_path):
    """Fix a .mjs file that was improperly converted."""
    mjs_path = js_path.with_suffix('.mjs')
    
    if not mjs_path.exists():
        return False
    
    with open(mjs_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Fix 1: Repair broken import statements
    # Pattern: import { ... with DOMContentLoaded injected in the middle
    if 'import {' in content and 'DOMContentLoaded' in content:
        # Find the complete import block
       lines = content.split('\n')
        fixed_lines = []
        in_import = False
        import_lines = []
        
        for i, line in enumerate(lines):
            if line.strip().startswith('import {'):
                in_import = True
                import_lines = [line]
            elif in_import:
                if '} from' in line or ('}' in line and 'from' in lines[i] if i+1 < len(lines) else False):
                    import_lines.append(line)
                    in_import = False
                    # Add the complete import statement
                    fixed_lines.extend(import_lines)
                elif 'DOMContentLoaded' in line:
                    # Skip this line, it was injected incorrectly
                    continue
                else:
                    import_lines.append(line)
            else:
                fixed_lines.append(line)
        
        content = '\n'.join(fixed_lines)
    
    # Fix 2: Remove duplicate apiUrl declarations
    # Keep only the one in DOMContentLoaded
    apiurl_lines = [i for i, line in enumerate(content.split('\n')) if 'let apiUrl = ""' in line]
    if len(apiurl_lines) > 1:
        lines = content.split('\n')
        # Remove the first occurrence (outside DOMContentLoaded), keep the one inside
        for idx in sorted([apiurl_lines[0]], reverse=True):
            del lines[idx]
        content = '\n'.join(lines)
    
    # Fix 3: Check if getApiUrl is imported
    if '${apiUrl}' in content and 'getApiUrl' not in content and 'import' in content:
        # Add getApiUrl to imports
        content = re.sub(
            r'import\s*{\s*([^}]*?)\s*}\s*from\s*"\.\/utils\.mjs"',
            lambda m: f'import {{ {m.group(1)}, getApiUrl }} from "./utils.mjs"' if 'getApiUrl' not in m.group(1) else m.group(0),
            content
        )
    
    # Fix 4: Ensure apiUrl is accessible in DOMContentLoaded
    # If DOMContentLoaded exists, make sure apiUrl is declared and initialized
    if 'DOMContentLoaded' in content and '${apiUrl}' in content:
        # Check if apiUrl initialization is missing within DOMContentLoaded
        dom_match = re.search(r"document\.addEventListener\('DOMContentLoaded'.*?\{", content, re.DOTALL)
        if dom_match:
            dom_start = dom_match.end()
            # Check if apiUrl is initialized near the start
            next_100_chars = content[dom_start:dom_start+200]
            if 'apiUrl = await getApiUrl()' not in next_100_chars and 'const apiUrl = await getApiUrl()' not in next_100_chars:
                # Insert initialization
                indent = '  '
                init_code = f'\n{indent}const apiUrl = await getApiUrl();'
                content = content[:dom_start] + init_code + content[dom_start:]
    
    if content != original:
        with open(mjs_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    
    return False

def main():
    """Fix all converted .mjs files."""
    if not JS_DIR.exists():
        print(f"❌ Directory not found: {JS_DIR}")
        return
    
    js_files = sorted(JS_DIR.glob('*.js'))
    
    print(f"🔧 Fixing converted .mjs files...\n")
    
    fixed = 0
    for js_path in js_files:
        try:
            if fix_converted_file(js_path):
                print(f"✅ Fixed: {js_path.stem}.mjs")
                fixed += 1
        except Exception as e:
            print(f"⚠️  Could not fully fix {js_path.stem}.mjs: {e}")
    
    print(f"\n📊 Fixed: {fixed} files")

if __name__ == "__main__":
    main()
