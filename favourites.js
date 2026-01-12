const DATA_URL = "data/animals.json";
const FAV_KEY = "jw_favourites_a1";

const grid = document.getElementById("favGrid");
const clearBtn = document.getElementById("clearBtn");
const exportBtn = document.getElementById("exportBtn");
const favCount = document.getElementById("favCount");

function loadFavIds(){
  try{
    const raw = localStorage.getItem(FAV_KEY);
    if(!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  }catch{ return []; }
}

function saveFavIds(ids){
  localStorage.setItem(FAV_KEY, JSON.stringify(ids));
}

function setCount(n){
  if(!favCount) return;
  favCount.textContent = `${n} saved`;
}

function removeFav(id){
  const ids = loadFavIds().filter(x => x !== id);
  saveFavIds(ids);
  render();
}

async function fetchAnimals(){
  const res = await fetch(DATA_URL, { cache: "no-store" });
  const json = await res.json();
  return json.animals || [];
}

function favCard(a){
  const el = document.createElement("article");
  el.className = "card";
  el.innerHTML = `
    <img class="photo" src="${a.image}" alt="${a.alt}" loading="lazy" decoding="async">
    <div class="section-title" style="margin-top:12px;">
      <div>
        <h3>${a.name}</h3>
        <p style="margin:6px 0 0;"><strong>${a.enclosure}</strong> • <em>${a.scientific}</em></p>
      </div>
      <span class="pill">${a.status}</span>
    </div>

    <p>${a.summary}</p>

    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
      <a class="btn good" href="map.html?focus=${a.id}">Show on map</a>
      <a class="btn primary" href="animals.html#${a.id}">Open record</a>
      <button class="btn danger" type="button" data-remove="${a.id}">Remove</button>
    </div>
  `;
  return el;
}

function emptyState(){
  grid.innerHTML = `
    <div class="card">
      <h3>No favourites yet</h3>
      <p>
        Browse the Animals page and tap “☆ Favourite” to save an animal here.
        Your list is stored on this device and stays available after install.
      </p>
      <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;">
        <a class="btn primary" href="animals.html">Browse animals</a>
        <a class="btn" href="map.html">Open map</a>
        <a class="btn soft" href="help.html">Safety guide</a>
      </div>
    </div>
  `;
}

async function render(){
  grid.innerHTML = "";
  const favIds = loadFavIds();
  setCount(favIds.length);

  if(favIds.length === 0){
    emptyState();
    return;
  }

  const animals = await fetchAnimals();
  const favAnimals = favIds.map(id => animals.find(a => a.id === id)).filter(Boolean);

  favAnimals.forEach(a => grid.appendChild(favCard(a)));

  grid.querySelectorAll("[data-remove]").forEach(btn=>{
    btn.addEventListener("click", () => removeFav(btn.getAttribute("data-remove")));
  });
}

clearBtn?.addEventListener("click", () => {
  const ids = loadFavIds();
  if(ids.length === 0){
    alert("Nothing to clear — you have no favourites saved yet.");
    return;
  }

  const ok = confirm("Clear all favourites? This will remove your saved shortlist from this device.");
  if(!ok) return;

  localStorage.removeItem(FAV_KEY);
  render();
});

exportBtn?.addEventListener("click", async () => {
  const favIds = loadFavIds();
  if(favIds.length === 0){
    alert("No favourites to export yet.");
    return;
  }

  try{
    const animals = await fetchAnimals();
    const favAnimals = favIds.map(id => animals.find(a => a.id === id)).filter(Boolean);

    const lines = favAnimals.map(a =>
      `${a.name} — ${a.enclosure} (${a.scientific})`
    );

    const text = `Jacob Wildlife Centre – Favourite shortlist\n\n${lines.join("\n")}`;

    if(navigator.clipboard?.writeText){
      await navigator.clipboard.writeText(text);
      alert("Export copied to clipboard ✅ You can paste it into Notes or a document.");
    }else{
      // fallback
      prompt("Copy your shortlist:", text);
    }
  }catch{
    alert("Unable to export right now. Please try again.");
  }
});

render();
