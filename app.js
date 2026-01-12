// ----------------- Active nav highlighting (Top + Bottom) -----------------
(function setActiveNav(){
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("[data-nav]").forEach(a=>{
    const href = (a.getAttribute("href") || "").trim();
    if(href === path) a.classList.add("active");
  });
})();

// ----------------- Network info badge -----------------
(function networkBanner(){
  const el = document.getElementById("netStatus");
  if(!el) return;

  function render(){
    const online = navigator.onLine;
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const type = conn?.effectiveType ? ` (${conn.effectiveType})` : "";
    el.textContent = online ? `Online${type}` : "Offline";
  }

  window.addEventListener("online", render);
  window.addEventListener("offline", render);
  navigator.connection?.addEventListener?.("change", render);
  render();
})();

// ----------------- Helpers -----------------
function byId(id){ return document.getElementById(id); }
function setText(id, text){ const el = byId(id); if(el) el.textContent = text; }
function show(id, yes){ const el = byId(id); if(el) el.hidden = !yes; }

// ----------------- PWA install + SW -----------------
let deferredPrompt = null;

async function registerSW(){
  if(!("serviceWorker" in navigator)) return false;
  try{
    await navigator.serviceWorker.register("sw.js");
    return true;
  }catch{
    return false;
  }
}

function setupInstallUI(){
  const btn = byId("installBtn");
  if(!btn) return; // not on this page

  // Default state text
  setText("installState", "Tip: Install opens the app in its own window for faster access.");

  btn.addEventListener("click", async () => {
    if(!deferredPrompt){
      alert(
        "Install prompt not available right now.\n\n" +
        "Use the browser menu:\n" +
        "⋮ → Install app / Add to Home Screen\n\n" +
        "Make sure you're running from Live Server:\n" +
        "http://127.0.0.1:5500 (or similar)\n"
      );
      return;
    }

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;

    deferredPrompt = null;
    show("installBtn", false);
    setText("installState", "Install started ✅ Follow the browser steps to complete it.");
  });

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    show("installBtn", true);
    setText("installState", "Ready ✅ Tap Install App to add this to your device.");
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    show("installBtn", false);
    setText("installState", "Installed ✅ You can open it from Start or the taskbar.");
  });
}

(async function init(){
  await registerSW();
  setupInstallUI();
})();
