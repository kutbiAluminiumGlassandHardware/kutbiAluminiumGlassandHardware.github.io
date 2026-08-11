# Kutbi V5 — Complete Image Fix Package

This V5 package is designed for the existing Kutbi Aluminium Glass & Hardware GitHub Pages repository.

## What it fixes

The current repository stores these project images in the repository ROOT:

- upvc-sliding-door-project-bangalore.jpg
- mosquito-mesh-window-project-bangalore.jpg
- upvc-sliding-window-project-bangalore.jpg

Some HTML pages reference them as `images/filename.jpg`, which causes the broken-image icon.

V5 automatically scans ALL HTML pages — service pages AND area pages — and changes:

`images/filename.jpg` → `filename.jpg`

It also fixes `/images/filename.jpg` and `./images/filename.jpg`, plus common `srcset` and CSS `url()` references.

## Files in this package

`.github/fix_all_images.py`
- Scans every HTML file and fixes the incorrect image paths.

`.github/workflows/pages.yml`
- Automatically runs the fixer whenever you push to `main`.
- Deploys the corrected site to GitHub Pages.

## IMPORTANT: Do not delete your existing website pages or JPG files.

This is an upgrade to your existing repository. Keep all current service and area pages.

## Upload steps on GitHub (phone)

1. Open your Kutbi repository.
2. Open `.github` if it exists, otherwise create the folders:
   `.github/workflows`
3. Upload `fix_all_images.py` into:
   `.github/`
4. Upload `pages.yml` into:
   `.github/workflows/`
5. Commit the changes to `main`.
6. Open GitHub → Actions.
7. Open `Deploy Kutbi Website to GitHub Pages`.
8. Wait for the workflow to finish.
9. Open Settings → Pages.
10. Under Build and deployment → Source, select `GitHub Actions`.
11. Open the website again.

## If Pages is already using GitHub Actions

You only need to upload the two workflow files and commit.

## Verification

After deployment, check:
- Home page project photos
- Aluminium Windows page
- uPVC Windows page
- Window Repair page
- Mosquito Mesh page
- Pigeon Net page
- Several area pages such as Arekere, Gottigere, JP Nagar, Jayanagar, BTM Layout and Electronic City.

The existing area/service URLs are not changed by this package.

## SEO-safe

The package does not remove page titles, descriptions, links, schema, service-area pages or your existing content. It only corrects image references during the deployment build.
