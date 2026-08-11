#!/usr/bin/env python3
"""
Kutbi V5.1 - repair image references across the entire GitHub Pages site.

Safe behavior:
- Never deletes HTML, images, CSS, sitemap or other content.
- Only changes image references when a matching local image file exists.
- Converts references such as images/photo.jpg to photo.jpg when photo.jpg
  exists in the repository root.
- Also handles ./images/, /images/, srcset and CSS url(...) references.
- Leaves external URLs and data: URLs untouched.
- Writes a report to image-fix-report.txt.
"""

from pathlib import Path
import re
from urllib.parse import unquote

ROOT = Path(".")
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif"}

# Build a case-insensitive index of image files by basename.
images = {}
for p in ROOT.rglob("*"):
    if p.is_file() and p.suffix.lower() in IMAGE_EXTS:
        rel = p.relative_to(ROOT).as_posix()
        images.setdefault(p.name.lower(), []).append(rel)

def local_candidate(ref: str):
    ref = unquote(ref.strip())
    if not ref or ref.startswith(("#", "data:", "http://", "https://", "//", "mailto:", "tel:")):
        return None

    # Remove query/fragment while preserving them for later.
    m = re.match(r"([^?#]*)([?#].*)?$", ref)
    path = m.group(1) if m else ref
    suffix = (m.group(2) if m else "") or ""

    # Normalize common bad prefixes.
    normalized = path.replace("\\", "/")
    while normalized.startswith("./"):
        normalized = normalized[2:]
    if normalized.startswith("/"):
        normalized = normalized[1:]

    basename = Path(normalized).name
    matches = images.get(basename.lower(), [])

    # Prefer root-level match for the known Kutbi project photos.
    root_matches = [x for x in matches if "/" not in x]
    if root_matches:
        return root_matches[0] + suffix

    # If the exact normalized path exists, keep it.
    exact = ROOT / normalized
    if exact.is_file():
        return normalized + suffix

    # Otherwise, if there is one unique basename match, use it.
    if len(matches) == 1:
        return matches[0] + suffix

    return None

# HTML attributes: src, data-src, poster, and srcset.
attr_re = re.compile(r'(?P<prefix>\b(?:src|data-src|data-lazy-src|poster)\s*=\s*)(?P<q>["\'])(?P<url>.*?)(?P=q)', re.I)
srcset_re = re.compile(r'(?P<prefix>\b(?:srcset|data-srcset)\s*=\s*)(?P<q>["\'])(?P<url>.*?)(?P=q)', re.I)
css_url_re = re.compile(r'url\(\s*(?P<q>["\']?)(?P<url>[^)"\']+)(?P=q)\s*\)', re.I)

changed_files = []
changed_refs = []
unresolved = []

def fix_url(ref, file_path):
    new = local_candidate(ref)
    if new and new != ref:
        changed_refs.append((file_path.as_posix(), ref, new))
        return new
    # Record likely-local image references that still don't resolve.
    clean = unquote(ref.split("?",1)[0].split("#",1)[0])
    if clean.lower().endswith(tuple(IMAGE_EXTS)) and not clean.startswith(("http://","https://","//","data:")):
        if not new:
            unresolved.append((file_path.as_posix(), ref))
    return ref

for f in ROOT.rglob("*"):
    if not f.is_file():
        continue
    if f.suffix.lower() == ".html":
        text = f.read_text(encoding="utf-8", errors="ignore")
        original = text

        def attr_sub(m):
            return m.group("prefix")+m.group("q")+fix_url(m.group("url"), f)+m.group("q")
        text = attr_re.sub(attr_sub, text)

        def srcset_sub(m):
            parts=[]
            for item in m.group("url").split(","):
                item=item.strip()
                if not item:
                    continue
                bits=item.split()
                bits[0]=fix_url(bits[0], f)
                parts.append(" ".join(bits))
            return m.group("prefix")+m.group("q")+", ".join(parts)+m.group("q")
        text = srcset_re.sub(srcset_sub, text)

        if text != original:
            f.write_text(text, encoding="utf-8")
            changed_files.append(f.as_posix())

    elif f.suffix.lower() == ".css":
        text = f.read_text(encoding="utf-8", errors="ignore")
        original = text
        def css_sub(m):
            return "url("+m.group("q")+fix_url(m.group("url"), f)+m.group("q")+")"
        text = css_url_re.sub(css_sub, text)
        if text != original:
            f.write_text(text, encoding="utf-8")
            changed_files.append(f.as_posix())

report = []
report.append("KUTBI V5.1 IMAGE PATH REPAIR REPORT")
report.append("")
report.append(f"HTML/CSS files changed: {len(changed_files)}")
report.append(f"Image references changed: {len(changed_refs)}")
report.append(f"Unresolved local-looking image references: {len(unresolved)}")
report.append("")
report.append("CHANGED FILES:")
report.extend(" - "+x for x in changed_files)
report.append("")
report.append("CHANGED REFERENCES:")
for file, old, new in changed_refs:
    report.append(f" - {file}: {old} -> {new}")
report.append("")
report.append("UNRESOLVED REFERENCES:")
for file, ref in unresolved:
    report.append(f" - {file}: {ref}")

Path("image-fix-report.txt").write_text("\n".join(report)+"\n", encoding="utf-8")
print("\n".join(report))
