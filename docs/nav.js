// nav.js — inject consistent nav + footer into every page
// Each page sets window.ACTIVE_PAGE before loading this script

(function () {
  const GITHUB_URL = "https://github.com/23521534-lab/vendor-image-grabber";
  const GITHUB_ZIP = "https://github.com/23521534-lab/vendor-image-grabber/archive/refs/heads/main.zip";

  const pages = [
    { href: "index.html",        label: "Home" },
    { href: "how-it-works.html", label: "How It Works" },
    { href: "features.html",     label: "Features" },
    { href: "vendors.html",      label: "Vendors" },
    { href: "add-vendor.html",   label: "Add Vendor" },
    { href: "install.html",      label: "Install", cta: true },
  ];

  const active = window.ACTIVE_PAGE || "";

  const navLinks = pages.map(p => `
    <li><a href="${p.href}" class="${p.cta ? "nav-cta" : ""}${active === p.href ? " active" : ""}">${p.label}</a></li>
  `).join("");

  const navHTML = `
    <nav>
      <a href="index.html" class="nav-logo">
        <img
          src="../icons/icon48.png"
          alt="Vendor Image Grabber"
          style="width:32px;height:32px;border-radius:8px;object-fit:cover;display:block;"
          onerror="this.style.display='none';this.nextElementSibling.style.display='inline';"
        />
        <span style="display:none;font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:0.14em;">IMAGE<span style="color:var(--accent)">GRAB</span></span>
      </a>
      <ul class="nav-links">${navLinks}</ul>
    </nav>
  `;

  const footerHTML = `
    <footer>
      <div style="display:flex;align-items:center;gap:10px;">
        <img
          src="../icons/icon48.png"
          alt="logo"
          style="width:28px;height:28px;border-radius:7px;object-fit:cover;"
          onerror="this.style.display='none';"
        />
        <span class="f-logo">IMAGE<span>GRAB</span></span>
      </div>
      <span>Vendor Image Grabber · Chrome Extension</span>
      <div class="f-links">
        <a href="add-vendor.html">Add Vendor</a>
        <a href="install.html">Install</a>
        <a href="${GITHUB_URL}" target="_blank">GitHub ↗</a>
      </div>
    </footer>
  `;

  document.body.insertAdjacentHTML("afterbegin", navHTML);
  document.body.insertAdjacentHTML("beforeend", footerHTML);

  // Expose GitHub URLs globally so any page can use them
  window.GITHUB_URL = GITHUB_URL;
  window.GITHUB_ZIP = GITHUB_ZIP;
})();
