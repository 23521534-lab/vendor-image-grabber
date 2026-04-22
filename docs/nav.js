// nav.js — inject consistent nav + footer into every page
// Each page sets window.ACTIVE_PAGE before loading this script

(function () {
  const pages = [
    { href: "index.html",    label: "Home" },
    { href: "how-it-works.html", label: "How It Works" },
    { href: "features.html",  label: "Features" },
    { href: "vendors.html",   label: "Vendors" },
    { href: "add-vendor.html",label: "Add Vendor" },
    { href: "install.html",   label: "Install", cta: true },
  ];

  const active = window.ACTIVE_PAGE || "";

  const navLinks = pages.map(p => `
    <li><a href="${p.href}" class="${p.cta ? "nav-cta" : ""}${active === p.href ? " active" : ""}">${p.label}</a></li>
  `).join("");

  const navHTML = `
    <nav>
      <a href="index.html" class="nav-logo">IMAGE<span>GRAB</span></a>
      <ul class="nav-links">${navLinks}</ul>
    </nav>
  `;

  const footerHTML = `
    <footer>
      <span class="f-logo">IMAGE<span>GRAB</span></span>
      <span>Vendor Image Grabber · Chrome Extension</span>
      <div class="f-links">
        <a href="add-vendor.html">Add Vendor</a>
        <a href="install.html">Install</a>
        <a href="https://github.com" target="_blank">GitHub</a>
      </div>
    </footer>
  `;

  document.body.insertAdjacentHTML("afterbegin", navHTML);
  document.body.insertAdjacentHTML("beforeend", footerHTML);
})();
