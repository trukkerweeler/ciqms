#!/usr/bin/env python3
"""
Convert all .js files in public/js to ES6 .mjs modules with dynamic API URLs.
Replaces hardcoded localhost:port with dynamic getApiUrl().
"""

import os
import re
from pathlib import Path

# Directory containing the JS files
JS_DIR = Path(__file__).parent / "public" / "js"

# Patterns to replace
LOCALHOST_PATTERN = re.compile(r"`http://localhost:\$\{port\}(/[^`]*)`")


def has_localhost_urls(content):
    """Check if file has hardcoded localhost URLs."""
    return "http://localhost:${port}" in content


def needs_port_var(content):
    """Check if file defines or uses port variable."""
    return "port" in content and ("myport" in content or "const port" in content)


def convert_file(js_path):
    """Convert a single .js file to .mjs with dynamic URLs."""
    with open(js_path, "r", encoding="utf-8") as f:
        content = f.read()

    mjs_path = js_path.with_suffix(".mjs")

    # Skip if already converted
    if mjs_path.exists():
        print(f"⏭️  {js_path.name} -> {mjs_path.name} (already exists)")
        return False

    has_localhost = has_localhost_urls(content)

    if not has_localhost:
        print(f"⏭️  {js_path.name} (no localhost URLs found)")
        return False

    original_content = content

    # Step 1: Add imports at the top (before any other code)
    import_line = 'import { getApiUrl } from "./utils.mjs";\n'

    # Skip adding import if it's already there or if it's a test/empty file
    if "import" not in content and "script" not in content.lower():
        if content.startswith("//"):
            # Add after initial comments
            lines = content.split("\n")
            comment_end = 0
            for i, line in enumerate(lines):
                if not line.startswith("//"):
                    comment_end = i
                    break
            lines.insert(comment_end, import_line)
            content = "\n".join(lines)
        else:
            content = import_line + content

    # Step 2: Replace hardcoded port declarations with apiUrl
    # Handle various patterns: const port = myport(), let port = ..., etc.
    port_patterns = [
        (r"const\s+port\s*=\s*myport\(\)[^;]*;", 'let apiUrl = "";'),
        (r"const\s+port\s*=\s*myport\(\)\s*\|\|\s*\d+[^;]*;", 'let apiUrl = "";'),
        (r"let\s+port\s*=\s*[^;]*;", 'let apiUrl = "";'),
    ]

    for pattern, replacement in port_patterns:
        content = re.sub(pattern, replacement, content)

    # Step 3: Add DOMContentLoaded initialization if it doesn't exist
    # and file has localhost URLs
    if "DOMContentLoaded" not in content and has_localhost:
        # Find a good place to add initialization
        # Look for function declarations or variable declarations
        init_code = """
// Initialize API URL
document.addEventListener('DOMContentLoaded', async () => {
  const apiUrl = await getApiUrl();
"""

        # Find where main logic starts (after imports and variable declarations)
        lines = content.split("\n")
        insert_pos = 0
        for i, line in enumerate(lines):
            if (
                line.strip()
                and not line.startswith("import")
                and not line.startswith("//")
            ):
                insert_pos = i
                break

        # We'll handle this case by case - for now, just mark for manual review
        if insert_pos > 0:
            lines.insert(insert_pos, init_code)
            content = "\n".join(lines)

    # Step 4: Replace all localhost URLs with apiUrl
    content = re.sub(r"`http://localhost:\$\{port\}", "`${apiUrl}", content)

    # Step 5: Save as .mjs file
    with open(mjs_path, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"✅ {js_path.name} → {mjs_path.name}")
    return True


def main():
    """Convert all .js files to .mjs."""
    if not JS_DIR.exists():
        print(f"❌ Directory not found: {JS_DIR}")
        return

    js_files = sorted(JS_DIR.glob("*.js"))

    if not js_files:
        print(f"❌ No .js files found in {JS_DIR}")
        return

    print(f"🔄 Converting {len(js_files)} .js files to .mjs...\n")

    converted = 0
    skipped = 0

    for js_path in js_files:
        try:
            if convert_file(js_path):
                converted += 1
            else:
                skipped += 1
        except Exception as e:
            print(f"❌ Error converting {js_path.name}: {e}")
            skipped += 1

    print(f"\n📊 Summary:")
    print(f"  ✅ Converted: {converted}")
    print(f"  ⏭️  Skipped: {skipped}")
    print(f"  📁 Total files: {len(js_files)}")

    if converted > 0:
        print(f"\n⚠️  Manual review needed:")
        print(f"   - Check files that weren't wrapped in DOMContentLoaded")
        print(f"   - Verify apiUrl is accessible in all functions")
        print(f"   - Test functionality in dev and prod modes")


if __name__ == "__main__":
    main()
