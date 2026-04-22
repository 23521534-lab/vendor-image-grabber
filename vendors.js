/**
 * ============================================================
 *  VENDOR REGISTRY — vendors.js
 * ============================================================
 *  To add a new vendor:
 *  1. Add a new entry to the VENDORS object below
 *  2. Set the domain (or partial domain string to match)
 *  3. Pick an icon, name, and color
 *  4. Write the scraper() function for that site
 *
 *  The scraper() runs INSIDE the vendor's page (injected),
 *  so you have full access to document, window, etc.
 *  It must return an array of absolute image URL strings.
 *
 *  Scraper tips:
 *  - Use document.querySelectorAll to find img tags
 *  - Use innerHTML/innerText regex for CDN URLs
 *  - Check Network tab in DevTools on the vendor site
 *    to find where images load from
 *  - Filter out icons/logos with the filterUrl() helper
 * ============================================================
 */

const VENDORS = {

  // ──────────────────────────────────────────────
  //  BASSETT MIRROR
  //  Site: https://www.bassettmirror.com
  // ──────────────────────────────────────────────
  "bassettmirror.com": {
    name: "Bassett Mirror",
    icon: "🪞",
    color: "#7c6af7",
    scraper: function () {
      const seen = new Set();
      const results = [];

      function add(url) {
        if (!url || seen.has(url)) return;
        // Skip icons, logos, spinners, placeholders
        if (/icon|logo|sprite|placeholder|blank|pixel|loading|spinner|favicon/i.test(url)) return;
        // Must look like an image
        if (!url.match(/\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i)) return;
        seen.add(url);
        results.push(url);
      }

      // 1. All <img> tags
      document.querySelectorAll("img").forEach(img => {
        add(img.src);
        add(img.dataset.src);
        add(img.dataset.lazySrc);
        add(img.dataset.original);
      });

      // 2. Zoom / gallery data attributes
      document.querySelectorAll("[data-zoom-image],[data-large],[data-full],[data-image],[data-img]").forEach(el => {
        ["data-zoom-image","data-large","data-full","data-image","data-img"].forEach(attr => add(el.getAttribute(attr)));
      });

      // 3. CSS background-image
      document.querySelectorAll("[style*='background']").forEach(el => {
        const m = (el.getAttribute("style") || "").match(/url\(['"]?([^'")\s]+)['"]?\)/i);
        if (m) add(m[1]);
      });

      // 4. <a href> pointing to image files
      document.querySelectorAll("a[href]").forEach(a => add(a.href));

      // 5. Scan raw HTML for any image CDN URLs
      const cdnPattern = /https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|webp)/gi;
      (document.body.innerHTML.match(cdnPattern) || []).forEach(url => add(url.split('"')[0].split("'")[0]));

      return results;
    }
  },

  // ──────────────────────────────────────────────
  //  WORLDWIDE HOME FURNISHINGS
  //  Site: https://worldwidehomefurnishingsinc.com
  // ──────────────────────────────────────────────
  "worldwidehomefurnishingsinc.com": {
    name: "Worldwide Home",
    icon: "🏠",
    color: "#4ade80",
    scraper: function () {
      const seen = new Set();
      const results = [];

      function add(url) {
        if (!url || seen.has(url)) return;
        if (/icon|logo|sprite|placeholder|blank|pixel|loading|spinner|favicon/i.test(url)) return;
        if (!url.match(/\.(jpg|jpeg|png|webp)(\?.*)?$/i)) return;
        seen.add(url);
        results.push(url);
      }

      // 1. Portal CDN — their main image host
      const portalPattern = /https:\/\/portal\.worldwidehomefurnishingsinc\.com\/[^\s"'<>]+\.(jpg|jpeg|png)/gi;
      (document.body.innerHTML.match(portalPattern) || []).forEach(url => add(url.split('"')[0].split("'")[0]));

      // 2. All <img> tags
      document.querySelectorAll("img").forEach(img => {
        add(img.src);
        add(img.dataset.src);
      });

      // 3. DOWNLOADS section — product pages list full-res URLs as plain text
      const allEls = Array.from(document.querySelectorAll("*"));
      const dlSection = allEls.find(el =>
        el.childElementCount === 0 && el.textContent.trim() === "DOWNLOADS"
      );
      if (dlSection) {
        let parent = dlSection.parentElement;
        for (let i = 0; i < 6 && parent; i++) {
          parent.innerText.split("\n").forEach(line => {
            const t = line.trim();
            if (/^https?:\/\/.+\.(jpg|jpeg|png)/i.test(t)) add(t);
          });
          parent = parent.parentElement;
        }
      }

      // 4. <a href> pointing to images
      document.querySelectorAll("a[href]").forEach(a => add(a.href));

      return results;
    }
  },

  // ──────────────────────────────────────────────
  //  LEISUREMOD
  //  Site: https://www.leisuremod.com
  //  Platform: Shopify
  //  Images served from:
  //    - cdn.shopify.com/s/files/...
  //    - leisuremod.com/cdn/shop/files/...  (Shopify storefront CDN)
  //  Notes:
  //    - Product galleries use Swiper/slider with lazy-loaded slides
  //    - Shopify resizes images via ?width= query param — we strip it
  //      to request the original full-resolution file
  //    - Variant color swatch images also use data-src
  //    - The provided gallery script (revealAllGalleryImages) clicks
  //      through sliders, but inside the extension popup we can't await
  //      async interactions — so we extract all pre-loaded src/data-src
  //      attrs across every slide, including hidden/inactive ones
  // ──────────────────────────────────────────────
  "leisuremod.com": {
    name: "LeisureMod",
    icon: "🛋",
    color: "#f59e0b",
    scraper: function () {
      const seen = new Set();
      const results = [];

      function add(url) {
        if (!url || typeof url !== "string") return;
        url = url.trim();
        if (!url.startsWith("http")) return;
        if (seen.has(url)) return;
        // Skip UI chrome — logos, icons, spinners, badges, placeholders
        if (/logo|icon|sprite|placeholder|blank|pixel|loading|spinner|favicon|badge|avatar|star|rating/i.test(url)) return;
        // Must be an image file
        if (!url.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i)) return;
        // Skip Shopify UI/theme assets (not product images)
        if (/\/assets\/.*\.(jpg|jpeg|png|webp)/i.test(url) && !/\/files\//i.test(url)) return;
        seen.add(url);

        // Shopify resizes images with ?width=N or ?height=N — strip those
        // to get the original full-resolution file
        const cleanUrl = url
          .replace(/[?&]width=\d+/gi, "")
          .replace(/[?&]height=\d+/gi, "")
          .replace(/[?&]crop=[^&]*/gi, "")
          // Remove Shopify size suffix embedded in filename: _100x, _100x200, _x200
          .replace(/_\d*x\d*(?=\.(jpg|jpeg|png|webp))/gi, "")
          // Clean up dangling ? or &
          .replace(/[?&]$/, "");

        results.push(cleanUrl);
      }

      // ── 1. All <img> tags + every data-* source attr ──────────────
      // Shopify lazy-loads gallery slides — the real URL may be in
      // data-src, data-zoom-src, or data-srcset even if src is a tiny
      // placeholder or blank SVG
      document.querySelectorAll("img").forEach(img => {
        add(img.src);
        add(img.getAttribute("data-src"));
        add(img.getAttribute("data-zoom-src"));
        add(img.getAttribute("data-zoom-image"));
        add(img.getAttribute("data-large"));
        add(img.getAttribute("data-full"));
        add(img.getAttribute("data-original"));
        add(img.getAttribute("data-lazy-src"));
        // srcset — grab the highest-resolution entry (last one)
        const srcset = img.getAttribute("srcset") || img.getAttribute("data-srcset") || "";
        if (srcset) {
          const entries = srcset.split(",").map(s => s.trim().split(/\s+/)[0]).filter(Boolean);
          if (entries.length) add(entries[entries.length - 1]);
        }
      });

      // ── 2. Swiper / slider slide elements ─────────────────────────
      // LeisureMod uses a Swiper gallery — inactive slides are in the
      // DOM but not yet "src"-loaded; their URL lives in data-src
      document.querySelectorAll(
        ".swiper-slide, .slick-slide, [class*='slide'], [class*='gallery-item'], [class*='product-media']"
      ).forEach(slide => {
        // Check direct data attrs on the slide container itself
        ["data-src","data-bg","data-background","data-image"].forEach(attr => {
          const v = slide.getAttribute(attr);
          if (v && v.match(/\.(jpg|jpeg|png|webp)/i)) add(v);
        });
      });

      // ── 3. Shopify CDN regex — two URL patterns ────────────────────
      // Pattern A: cdn.shopify.com/s/files/...  (legacy/API)
      // Pattern B: leisuremod.com/cdn/shop/files/...  (storefront CDN)
      const html = document.body.innerHTML;

      const cdnA = /https:\/\/cdn\.shopify\.com\/s\/files\/[^\s"'<>]+\.(jpg|jpeg|png|webp)/gi;
      (html.match(cdnA) || []).forEach(u => add(u.split('"')[0].split("'")[0]));

      const cdnB = /https:\/\/(?:www\.)?leisuremod\.com\/cdn\/shop\/files\/[^\s"'<>]+\.(jpg|jpeg|png|webp)/gi;
      (html.match(cdnB) || []).forEach(u => add(u.split('"')[0].split("'")[0]));

      // ── 4. JSON product data embedded in page ─────────────────────
      // Shopify injects product JSON into <script type="application/json">
      // or window.ShopifyAnalytics / window.__st — parse it for image URLs
      document.querySelectorAll('script[type="application/json"], script[data-product-json]').forEach(script => {
        try {
          const data = JSON.parse(script.textContent || "");
          const text = JSON.stringify(data);
          const matches = text.match(/https:\\?\/\\?\/cdn\.shopify\.com[^"'\\]+\.(jpg|jpeg|png|webp)/gi) || [];
          matches.forEach(u => add(u.replace(/\\+\//g, "/").split('"')[0]));
        } catch (_) {}
      });

      // Also scan inline <script> blocks for Shopify product JSON blobs
      document.querySelectorAll("script:not([src])").forEach(script => {
        const text = script.textContent || "";
        if (!text.includes("cdn.shopify.com") && !text.includes("/cdn/shop/files/")) return;
        const matches = text.match(/https?:\/\/[^\s"']+\.(jpg|jpeg|png|webp)/gi) || [];
        matches.forEach(u => add(u.split('"')[0].split("'")[0].split("\\")[0]));
      });

      // ── 5. CSS background-image on gallery/swatch elements ─────────
      document.querySelectorAll("[style*='background']").forEach(el => {
        const m = (el.getAttribute("style") || "").match(/url\(['"]?([^'")\s]+)['"]?\)/i);
        if (m) add(m[1]);
      });

      // ── 6. <a href> pointing directly to image files ───────────────
      document.querySelectorAll("a[href]").forEach(a => {
        if (a.href && a.href.match(/\.(jpg|jpeg|png|webp)(\?|$)/i)) add(a.href);
      });

      return results;
    }
  },

  // ──────────────────────────────────────────────
  //  ★ TEMPLATE — Copy this block to add a vendor
  //
  //  "example-vendor.com": {
  //    name: "Example Vendor",
  //    icon: "🛋",         ← any emoji
  //    color: "#f59e0b",   ← accent color for the UI
  //    scraper: function () {
  //      const seen = new Set();
  //      const results = [];
  //
  //      function add(url) {
  //        if (!url || seen.has(url)) return;
  //        if (/icon|logo|placeholder/i.test(url)) return;
  //        if (!url.match(/\.(jpg|jpeg|png|webp)(\?.*)?$/i)) return;
  //        seen.add(url);
  //        results.push(url);
  //      }
  //
  //      // --- Write your detection logic here ---
  //      // Look at the vendor site in DevTools:
  //      //   1. Inspect product images — what's their src/data-src?
  //      //   2. Check Network tab — what CDN domain serves images?
  //      //   3. View Source — are URLs embedded in the HTML?
  //
  //      // Common patterns:
  //      document.querySelectorAll("img").forEach(img => add(img.src));
  //      // CDN scan:
  //      // const cdn = /https:\/\/cdn\.example\.com\/[^\s"']+\.(jpg|png)/gi;
  //      // (document.body.innerHTML.match(cdn)||[]).forEach(u => add(u));
  //
  //      return results;
  //    }
  //  },
  // ──────────────────────────────────────────────

};

// Detect which vendor matches a given URL
function detectVendor(url) {
  for (const [domain, config] of Object.entries(VENDORS)) {
    if (url.includes(domain)) {
      return { domain, ...config };
    }
  }
  return null;
}

// Export for use in popup.js
if (typeof module !== "undefined") module.exports = { VENDORS, detectVendor };
