# Kutbi V5.1 — Complete Image Path Fix

This is a SAFE deployment patch for the existing Kutbi Aluminium Glass & Hardware
GitHub Pages repository.

## What it fixes

It scans the entire repository during deployment and repairs image references
on ALL HTML and CSS files, including:

- `images/photo.jpg`
- `./images/photo.jpg`
- `/images/photo.jpg`
- `srcset`
- lazy-load image attributes
- CSS `url(...)`

It does not delete or replace your existing pages.

## Very important

Your current repository stores the three project JPGs in the repository root:

- `upvc-sliding-door-project-bangalore.jpg`
- `mosquito-mesh-window-project-bangalore.jpg`
- `upvc-sliding-window-project-bangalore.jpg`

Your current homepage references them as `images/...`, which is why the
browser shows broken-image icons. V5.1 corrects those references automatically
during deployment.

## Upload these two files

Upload:

`.github/workflows/pages-v5-1.yml`
and
`fix-images.py`

to the ROOT of your existing repository.

Do NOT delete your existing HTML pages, JPG files, CSS, sitemap, robots.txt,
or Search Console verification files.

## GitHub Pages setting

After uploading the two files:

1. Open GitHub repository.
2. Open **Actions**.
3. Run **Deploy Kutbi Website V5.1** if it does not start automatically.
4. Open **Settings → Pages**.
5. Set **Build and deployment → Source** to **GitHub Actions**.
6. Wait for the workflow to show a green check.
7. Open your website in a private/incognito tab.

The workflow creates `image-fix-report.txt` during the build. It is useful for
checking whether any local image reference remains unresolved.

## Why this is safer than replacing all pages

You already have many Bangalore area and service pages. This package does not
recreate those pages and therefore does not risk deleting your SEO content.
It patches the image references at deployment time.
