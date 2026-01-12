const DATA_URL = "data/animals.json";
const FAV_KEY = "jw_favourites_a1";

const grid = document.getElementById("animalsGrid");
const detailCard = document.getElementById("detailCard");
const detailContent = document.getElementById("detailContent");
const closeDetail = document.getElementById("closeDetail");
const searchBox = document.getElementById("searchBox");
const filterStatus = document.getElementById("filterStatus");

let allAnimals = [];
let favourites = new Set(loadFavourites());

function loadFavourites(){
  try{
    const raw = localStorage.getItem(FAV_KEY);
    if(!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  }catch{ return []; }
}

function saveFavourites(){
  localStorage.setItem(FAV_KEY, JSON.stringify([...favourites]));
}

function isFav(id){ return favourites.has(id); }

function toggleFavourite(id){
  if(isFav(id)) favourites.delete(id);
  else favourites.add(id);

  saveFavourites();
  renderList();

  
  const btn = document.querySelector(`[data-detail-fav="${id}"]`);
  if(btn) btn.textContent = isFav(id) ? "★ Saved" : "☆ Add to favourites";
}

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function makeMetaLine(a){
  const enclosure = escapeHtml(a.enclosure);
  const scientific = escapeHtml(a.scientific);
  return `<strong>${enclosure}</strong> • <em>${scientific}</em>`;
}

function makeCard(a){
  const favText = isFav(a.id) ? "★ Saved" : "☆ Favourite";
  const safeName = escapeHtml(a.name);
  const safeAlt = escapeHtml(a.alt);
  const safeSummary = escapeHtml(a.summary);
  const safeStatus = escapeHtml(a.status);

  const card = document.createElement("article");
  card.className = "card";
  card.id = a.id;               
  card.setAttribute("tabindex", "-1");
  card.setAttribute("aria-label", `${a.name} record`);

  card.innerHTML = `
    <img class="photo" src="${a.image}" alt="${safeAlt}" loading="lazy" decoding="async">

    <div class="section-title" style="margin-top:12px;">
      <div>
        <h3 style="margin:0;">${safeName}</h3>
        <p style="margin:6px 0 0;">${makeMetaLine(a)}</p>
      </div>
      <span class="pill" aria-label="Conservation status">${safeStatus}</span>
    </div>

    <p style="margin-top:10px;">
      ${safeSummary}
    </p>

    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
      <button class="btn primary" type="button" data-open="${a.id}" aria-label="Open details for ${safeName}">
        View record
      </button>

      <a class="btn soft" href="map.html?focus=${a.id}" aria-label="Show ${safeName} on the map">
        View on map
      </a>

      <button class="btn" type="button" data-fav="${a.id}" aria-label="Toggle favourite for ${safeName}">
        ${favText}
      </button>
    </div>

    <p style="margin-top:10px;font-size:.95rem;">
      Tip: You can share this record using <em>animals.html#${escapeHtml(a.id)}</em>.
    </p>
  `;

  return card;
}

function renderDetail(a){
  detailCard.style.display = "block";

  const safeName = escapeHtml(a.name);
  const safeAlt = escapeHtml(a.alt);
  const safeStatus = escapeHtml(a.status);
  const safeAbout = escapeHtml(a.detail || a.summary);
  const safeHelp = escapeHtml(a.helpTip);

  const favBtnText = isFav(a.id) ? "★ Saved" : "☆ Add to favourites";

  detailContent.innerHTML = `
    <div class="grid cols-2" style="align-items:start;">
      <div>
        <img class="photo tall" src="${a.image}" alt="${safeAlt}" loading="lazy" decoding="async">
        <div class="notice" style="margin-top:12px;">
          <strong style="color:inherit;">Quick facts</strong>
          <p style="margin:6px 0 0;">${makeMetaLine(a)}</p>
          <p style="margin:6px 0 0;">Status: <strong>${safeStatus}</strong></p>
        </div>
      </div>

      <div>
        <div class="section-title">
          <div>
            <h3 style="margin:0;">${safeName}</h3>
            <p style="margin:6px 0 0;">${makeMetaLine(a)}</p>
          </div>
          <span class="pill">${safeStatus}</span>
        </div>

        <div class="notice" style="margin-top:12px;">
          <strong style="color:inherit;">About this species</strong>
          <p style="margin:6px 0 0;">${safeAbout}</p>
        </div>

        <div class="notice" style="margin-top:12px;">
          <strong style="color:inherit;">How you can help</strong>
          <p style="margin:6px 0 0;">${safeHelp}</p>
        </div>

        <div class="notice" style="margin-top:12px;">
          <strong style="color:inherit;">Safety guidance</strong>
          <p style="margin:6px 0 0;">
            Observe quietly and keep a safe distance. Do not feed, chase, or handle wildlife unless advised by trained rescue staff.
          </p>
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
          <button class="btn primary" type="button" data-detail-fav="${a.id}" aria-label="Add ${safeName} to favourites">
            ${favBtnText}
          </button>
          <a class="btn good" href="map.html?focus=${a.id}" aria-label="Show ${safeName} on the map">
            Open map location
          </a>
          <a class="btn soft" href="favourites.html" aria-label="Open favourites list">
            Open favourites
          </a>
        </div>

        <div class="notice" style="margin-top:12px;">
          <strong style="color:inherit;">Share this record</strong>
          <p style="margin:6px 0 0;">
            Copy this link: <em>animals.html#${escapeHtml(a.id)}</em>
          </p>
        </div>
      </div>
    </div>
  `;

  detailContent.querySelector(`[data-detail-fav="${a.id}"]`)
    .addEventListener("click", () => toggleFavourite(a.id));

  detailCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function applyFilters(list){
  const q = (searchBox?.value || "").trim().toLowerCase();
  const status = filterStatus?.value || "all";

  return list.filter(a => {
    const matchesText =
      a.name.toLowerCase().includes(q) ||
      a.scientific.toLowerCase().includes(q) ||
      a.enclosure.toLowerCase().includes(q) ||
      a.summary.toLowerCase().includes(q);

    const matchesStatus = (status === "all") ? true : (a.status === status);
    return matchesText && matchesStatus;
  });
}

function renderList(){
  if(!grid) return;

  grid.innerHTML = "";
  const filtered = applyFilters(allAnimals);

  if(filtered.length === 0){
    grid.innerHTML = `
      <div class="card">
        <h3 style="margin:0;">No matching records</h3>
        <p style="margin-top:8px;">
          Try a shorter search term, or switch the status filter back to <strong>All statuses</strong>.
        </p>
      </div>
    `;
    return;
  }

  filtered.forEach(a => grid.appendChild(makeCard(a)));

  grid.querySelectorAll("[data-open]").forEach(btn=>{
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-open");
      location.hash = id;
      const a = allAnimals.find(x => x.id === id);
      if(a) renderDetail(a);
    });
  });

  grid.querySelectorAll("[data-fav]").forEach(btn=>{
    // Show correct state immediately (in case renderList gets called from outside)
    const id = btn.getAttribute("data-fav");
    btn.textContent = isFav(id) ? "★ Saved" : "☆ Favourite";

    btn.addEventListener("click", () => {
      toggleFavourite(id);
      btn.textContent = isFav(id) ? "★ Saved" : "☆ Favourite";
    });
  });
}

function openFromHash(){
  const id = (location.hash || "").replace("#","").trim();
  if(!id) return;

  const anchor = document.getElementById(id);
  if(anchor){
    anchor.scrollIntoView({ behavior: "smooth", block: "start" });
    anchor.focus({ preventScroll: true });
  }

  const a = allAnimals.find(x => x.id === id);
  if(a) renderDetail(a);
}

async function init(){
  try{
    const res = await fetch(DATA_URL, { cache: "no-store" });
    const json = await res.json();
    allAnimals = Array.isArray(json.animals) ? json.animals : [];

    renderList();
    openFromHash();
  }catch(e){
    if(grid){
      grid.innerHTML = `
        <div class="card">
          <h3 style="margin:0;">Unable to load animal records</h3>
          <p style="margin-top:8px;">
            This usually happens when opening the site using <strong>file://</strong>.
            Run the app using <strong>Live Server</strong> or your hosted URL (e.g., Firebase) so the JSON file can load.
          </p>
          <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;">
            <a class="btn primary" href="index.html">Go home</a>
            <a class="btn" href="help.html">Open help</a>
          </div>
        </div>
      `;
    }
  }
}

searchBox?.addEventListener("input", renderList);
filterStatus?.addEventListener("change", renderList);
window.addEventListener("hashchange", openFromHash);

closeDetail?.addEventListener("click", () => {
  detailCard.style.display = "none";
});

init();
