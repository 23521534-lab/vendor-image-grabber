// scraper.js
// Injected into the vendor page via chrome.scripting.executeScript({ files: ["scraper.js"] })
// CSP-compliant — no eval(), no new Function().
// Each scraper targets only the main product gallery to avoid picking up
// related products, nav thumbnails, footer images, etc.

(function () {

  const href = window.location.href;

  // ── Shared collector factory ─────────────────────────────────────
  function makeCollector(extraFilter) {
    const seen = new Set();
    const results = [];
    function add(url) {
      if (!url || typeof url !== "string") return;
      url = url.trim();
      if (!url.startsWith("http")) return;
      if (seen.has(url)) return;
      if (/icon|logo|sprite|placeholder|blank|pixel|loading|spinner|favicon|badge|avatar|star|rating/i.test(url)) return;
      if (!url.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i)) return;
      if (extraFilter && extraFilter(url)) return;
      seen.add(url);
      results.push(url);
    }
    return { add, results };
  }

  // ── Find main product gallery container ──────────────────────────
  function findGallery(selectors) {
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el) return el;
      } catch (_) {}
    }
    return null;
  }

  // ════════════════════════════════════════════════════════════════
  //  BASSETT MIRROR — bassettmirror.com
  //
  //  Scoped to the product gallery container so we only grab the
  //  current product's images, not related products or nav images.
  //  Zoom data attributes are checked document-wide since they are
  //  sometimes placed outside the gallery div.
  // ════════════════════════════════════════════════════════════════
  function scrapeBassett() {
    const { add, results } = makeCollector();

    const scope = findGallery([
      ".product-gallery",
      ".product-images",
      ".product-media",
      ".product__media-wrapper",
      ".product__photos",
      ".product-single__photos",
      ".main-product-images",
      "[class*='product-gallery']",
      "[class*='product-image']",
      ".image-carousel",
      ".swiper-wrapper",
      ".slick-slider",
      ".photoswipe-container",
    ]);

    const root = scope || document;

    // 1. img tags within gallery scope
    root.querySelectorAll("img").forEach(img => {
      add(img.src);
      add(img.getAttribute("data-src"));
      add(img.getAttribute("data-lazy-src"));
      add(img.getAttribute("data-original"));
    });

    // 2. Zoom / high-res data attributes within scope
    root.querySelectorAll("[data-zoom-image],[data-large],[data-full],[data-image],[data-img],[data-zoom-src]").forEach(el => {
      ["data-zoom-image","data-zoom-src","data-large","data-full","data-image","data-img"]
        .forEach(attr => add(el.getAttribute(attr)));
    });

    // 3. Also check document-wide for zoom attrs — often outside gallery div
    if (scope) {
      document.querySelectorAll("[data-zoom-image],[data-zoom-src]").forEach(el => {
        add(el.getAttribute("data-zoom-image"));
        add(el.getAttribute("data-zoom-src"));
      });
    }

    // 4. CSS background-image within scope only
    root.querySelectorAll("[style*='background']").forEach(el => {
      const m = (el.getAttribute("style") || "").match(/url\(['"]?([^'")\s]+)['"]?\)/i);
      if (m) add(m[1]);
    });

    // NOTE: No full-page CDN regex or a[href] scan — those grab
    // related products, nav images, footer logos, etc.

    return results;
  }

  // ════════════════════════════════════════════════════════════════
  //  WORLDWIDE HOME — worldwidehomefurnishingsinc.com
  //
  //  Portal CDN pattern is specific enough to be safe on full HTML.
  //  img tags are scoped to the product content area.
  //  DOWNLOADS section is found by locating the heading element
  //  and walking up to its containing block.
  // ════════════════════════════════════════════════════════════════
  function scrapeWorldwide() {
    const { add, results } = makeCollector();

    // 1. Portal CDN — specific URL, safe to scan full HTML
    const portalPattern = /https:\/\/portal\.worldwidehomefurnishingsinc\.com\/[^\s"'<>]+\.(jpg|jpeg|png)/gi;
    (document.body.innerHTML.match(portalPattern) || [])
      .forEach(url => add(url.split('"')[0].split("'")[0]));

    // 2. img tags scoped to product content area
    const scope = findGallery([
      ".product-detail",
      ".product-content",
      ".product-info",
      ".product-images",
      ".product-gallery",
      ".product-media",
      ".product__content",
      "article",
      "main",
      "#main-content",
      "#content",
    ]);

    const root = scope || document;
    root.querySelectorAll("img").forEach(img => {
      add(img.src);
      add(img.getAttribute("data-src"));
    });

    // 3. DOWNLOADS section — plain text URLs listed on product pages
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

    // 4. <a href> image links — scoped to product area only
    root.querySelectorAll("a[href]").forEach(a => {
      if (a.href && a.href.match(/\.(jpg|jpeg|png)(\?|$)/i)) add(a.href);
    });

    return results;
  }

  // ════════════════════════════════════════════════════════════════
  //  LEISUREMOD — leisuremod.com (Shopify)
  //
  //  img tags and slider elements scoped to product gallery.
  //  Shopify CDN regex is safe on full HTML because the pattern
  //  cdn.shopify.com/s/files/ only matches uploaded product files.
  //  Resize params stripped from all URLs to get full-res images.
  // ════════════════════════════════════════════════════════════════
  function scrapeLeisureMod() {
    // Skip Shopify theme assets (not product images)
    const { add, results } = makeCollector(url =>
      /\/assets\/.*\.(jpg|jpeg|png|webp)/i.test(url) && !/\/files\//i.test(url)
    );

    // Strip Shopify resize params to get original full-res file
    function cleanShopifyUrl(url) {
      if (!url) return null;
      return url
        .replace(/[?&]width=\d+/gi, "")
        .replace(/[?&]height=\d+/gi, "")
        .replace(/[?&]crop=[^&]*/gi, "")
        .replace(/_\d*x\d*(?=\.(jpg|jpeg|png|webp))/gi, "")
        .replace(/[?&]$/, "");
    }

    function addClean(url) {
      const clean = cleanShopifyUrl(url);
      if (clean) add(clean);
    }

    // Scope to Shopify product gallery/media section
    const scope = findGallery([
      ".product__media-gallery",
      ".product-single__media-group",
      ".product__media-wrapper",
      ".product-gallery",
      ".product-images",
      ".product-media",
      ".product__photos",
      ".swiper-wrapper",
      ".slick-slider",
      "[class*='product-gallery']",
      "[class*='product-media']",
      "[class*='product-image']",
      "product-media-gallery",
    ]);

    const root = scope || document;

    // 1. img tags + all data-* source attrs within gallery scope
    root.querySelectorAll("img").forEach(img => {
      addClean(img.src);
      addClean(img.getAttribute("data-src"));
      addClean(img.getAttribute("data-zoom-src"));
      addClean(img.getAttribute("data-zoom-image"));
      addClean(img.getAttribute("data-large"));
      addClean(img.getAttribute("data-full"));
      addClean(img.getAttribute("data-original"));
      addClean(img.getAttribute("data-lazy-src"));
      // srcset — grab highest resolution (last entry)
      const srcset = img.getAttribute("srcset") || img.getAttribute("data-srcset") || "";
      if (srcset) {
        const entries = srcset.split(",").map(s => s.trim().split(/\s+/)[0]).filter(Boolean);
        if (entries.length) addClean(entries[entries.length - 1]);
      }
    });

    // 2. Swiper / slider slide elements (inactive slides hold URL in data-src)
    root.querySelectorAll(
      ".swiper-slide, .slick-slide, [class*='slide'], [class*='gallery-item'], [class*='product-media']"
    ).forEach(slide => {
      ["data-src","data-bg","data-background","data-image"].forEach(attr => {
        const v = slide.getAttribute(attr);
        if (v && v.match(/\.(jpg|jpeg|png|webp)/i)) addClean(v);
      });
    });

    // 3. Shopify CDN regex — safe on full HTML because the pattern is
    //    specific to uploaded product files under /s/files/
    const html = document.body.innerHTML;

    const cdnA = /https:\/\/cdn\.shopify\.com\/s\/files\/[^\s"'<>]+\.(jpg|jpeg|png|webp)/gi;
    (html.match(cdnA) || []).forEach(u => addClean(u.split('"')[0].split("'")[0]));

    const cdnB = /https:\/\/(?:www\.)?leisuremod\.com\/cdn\/shop\/files\/[^\s"'<>]+\.(jpg|jpeg|png|webp)/gi;
    (html.match(cdnB) || []).forEach(u => addClean(u.split('"')[0].split("'")[0]));

    // 4. Embedded product JSON in <script type="application/json">
    document.querySelectorAll('script[type="application/json"], script[data-product-json]').forEach(script => {
      try {
        const text = JSON.stringify(JSON.parse(script.textContent || ""));
        const matches = text.match(/https:\\?\/\\?\/cdn\.shopify\.com[^"'\\]+\.(jpg|jpeg|png|webp)/gi) || [];
        matches.forEach(u => addClean(u.replace(/\\+\//g, "/").split('"')[0]));
      } catch (_) {}
    });

    // 5. Inline <script> blocks — only those referencing Shopify CDN
    document.querySelectorAll("script:not([src])").forEach(script => {
      const text = script.textContent || "";
      if (!text.includes("cdn.shopify.com") && !text.includes("/cdn/shop/files/")) return;
      const matches = text.match(/https?:\/\/[^\s"']+\.(jpg|jpeg|png|webp)/gi) || [];
      matches.forEach(u => addClean(u.split('"')[0].split("'")[0].split("\\")[0]));
    });

    // 6. CSS background-image within scope only
    root.querySelectorAll("[style*='background']").forEach(el => {
      const m = (el.getAttribute("style") || "").match(/url\(['"]?([^'")\s]+)['"]?\)/i);
      if (m) addClean(m[1]);
    });

    return results;
  }

  // ════════════════════════════════════════════════════════════════
  //  ROUTER — pick scraper based on current page URL
  // ════════════════════════════════════════════════════════════════
  if (href.includes("bassettmirror.com"))               return scrapeBassett();
  if (href.includes("worldwidehomefurnishingsinc.com")) return scrapeWorldwide();
  if (href.includes("leisuremod.com"))                  return scrapeLeisureMod();

  return [];

})();
