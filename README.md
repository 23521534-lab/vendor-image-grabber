# 🖼 Vendor Image Grabber

A Chrome Extension that automatically detects and batch-downloads product images from furniture vendor websites.

**Built as a portfolio project by a software developer intern.**

---

## Features

- **Auto-detects** product images using 4 parallel scraping methods
- **Live preview grid** with thumbnail checkboxes before downloading
- **Batch download** to a named `vendor-images/` folder
- **Preserves original filenames** from the server
- **Real-time activity log** with success/error per image
- **Vendor-specific scrapers** tuned for each site's HTML structure

## Supported Vendors

| Vendor | URL | Platform | Detection Methods |
|--------|-----|----------|-------------------|
| Bassett Mirror | bassettmirror.com | Custom | img[src], data-zoom-image, background-image, CDN regex, a[href] |
| Worldwide Home | worldwidehomefurnishingsinc.com | Custom | Portal CDN regex, DOWNLOADS section, img[src], href links |
| LeisureMod | leisuremod.com | Shopify | cdn.shopify.com regex, data-src/data-zoom-src, Swiper slides, embedded product JSON, srcset |

## Tech Stack

- Chrome Extension Manifest V3
- `chrome.scripting` API (tab script injection)
- `chrome.downloads` API (native download manager)
- `chrome.tabs` API (active tab detection)
- Service Worker background script
- Vanilla JS + CSS (no frameworks)

## Installation (Local/Dev)

1. Clone or download this repo
2. Open `chrome://extensions` in Chrome
3. Enable **Developer Mode** (top-right toggle)
4. Click **Load unpacked**
5. Select the `vendor-image-grabber/` directory
6. The extension icon appears in your Chrome toolbar

## Usage

1. Navigate to a supported vendor product page
2. Click the extension icon in the toolbar
3. Hit **Scan for Images**
4. Review the thumbnail grid — click to toggle selection
5. Click **Download Selected** — files save to `~/Downloads/vendor-images/`

## Project Structure

```
vendor-image-grabber/
├── manifest.json       # Extension config (MV3)
├── popup.html          # Extension UI
├── popup.js            # UI logic + scraper injection
├── background.js       # Service worker (download handling)
├── portfolio-page.html # Portfolio landing page
└── icons/              # Extension icons
```

## Why a Chrome Extension?

This started as a DevTools console script copy-pasted manually on vendor pages. The extension packages that into a proper, installable tool with:
- A real UI (not a raw console script)
- Native download management
- Vendor auto-detection
- No copy-paste workflow

---

*Portfolio project — open to internship opportunities in frontend/full-stack development.*
