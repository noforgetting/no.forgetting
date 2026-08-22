export function initNavbar() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  document.querySelectorAll("[data-nav-page]").forEach((link) => {
    const isActive = link.dataset.navPage === currentPage;
    link.classList.toggle("active", isActive);
    link.toggleAttribute("aria-current", isActive);
  });

  const sidebar = document.querySelector(".sidebar");
  let menuButton = document.querySelector(".mobile-menu-button");

  if (!menuButton && sidebar) {
    menuButton = document.createElement("button");
    menuButton.className = "mobile-menu-button";
    menuButton.type = "button";
    menuButton.setAttribute("aria-label", "Open navigation");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.innerHTML = "<span></span><span></span><span></span>";
    sidebar.append(menuButton);
  }

  if (!document.querySelector('link[href="js/mobile-nav.css"]')) {
    const mobileStyles = document.createElement("link");
    mobileStyles.rel = "stylesheet";
    mobileStyles.href = "js/mobile-nav.css";
    document.head.append(mobileStyles);
  }
  menuButton?.addEventListener("click", () => {
    const open = document.body.classList.toggle("menu-open");
    menuButton.setAttribute("aria-expanded", String(open));
  });

  if (!window.NoForgettingDeleteDialogReady) {
    window.NoForgettingDeleteDialogReady = true;
    const approvedButtons = new WeakSet();
    const dialog = document.createElement("div");
    dialog.innerHTML = `<div role="dialog" aria-modal="true" aria-labelledby="deleteDialogTitle" style="position:fixed;inset:0;z-index:100;display:none;place-items:center;padding:20px;background:rgba(0,0,0,.58)"><div style="width:min(100%,380px);padding:22px;background:#242424;border:1px solid #3b3b3b;border-radius:8px;box-shadow:0 18px 50px rgba(0,0,0,.4)"><h2 id="deleteDialogTitle" style="margin:0;color:#e7e7e5;font-size:1.1rem">Delete this reminder?</h2><p style="margin:9px 0 20px;color:#a3a3a0;font-size:.9rem;line-height:1.5">This action cannot be reverted!!</p><div style="display:flex;justify-content:flex-end;gap:8px"><button type="button" data-cancel-delete style="color:#e7e7e5;background:#303030;border-color:#424242">Cancel</button><button type="button" data-confirm-delete>Delete</button></div></div></div>`;
    document.body.append(dialog);
    const overlay = dialog.firstElementChild;
    let pendingButton = null;
    const close = () => { overlay.style.display = "none"; pendingButton = null; };
    dialog.querySelector("[data-cancel-delete]").addEventListener("click", close);
    dialog.querySelector("[data-confirm-delete]").addEventListener("click", () => {
      if (!pendingButton) return;
      const button = pendingButton;
      close();
      approvedButtons.add(button);
      const originalConfirm = window.confirm;
      window.confirm = () => true;
      button.click();
      window.confirm = originalConfirm;
    });
    overlay.addEventListener("click", (event) => { if (event.target === overlay) close(); });
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-delete]");
      if (!button) return;
      if (approvedButtons.has(button)) { approvedButtons.delete(button); return; }
      event.preventDefault();
      event.stopImmediatePropagation();
      pendingButton = button;
      overlay.style.display = "grid";
    }, true);
  }
}
