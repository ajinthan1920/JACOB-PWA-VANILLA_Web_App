const DATA_URL = "data/animals.json";

// UI
const canvas = document.getElementById("mapCanvas");
const ctx = canvas.getContext("2d");
const enclosureGrid = document.getElementById("enclosureGrid");

const locText = document.getElementById("locText");
const focusText = document.getElementById("focusText");
const zoomLabel = document.getElementById("zoomLabel");

const locBtn = document.getElementById("locBtn");
const zoomInBtn = document.getElementById("zoomIn");
const zoomOutBtn = document.getElementById("zoomOut");
const recenterBtn = document.getElementById("recenter");

// Map state
const DEFAULT_CENTRE = { lat: 53.4084, lng: -2.9916 }; // Liverpool
let centre = { ...DEFAULT_CENTRE };
let zoom = 14;

// Data
let animals = [];
let focusedId = null;

// User location
let userLoc = null;

// Drag pan
let isDragging = false;
let lastPointer = null;

// Query string focus
function qs(name) { return new URLSearchParams(location.search).get(name); }
function setText(el, t) { if (el) el.textContent = t; }

// ---------- Web Mercator helpers ----------
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function latLngToWorld(lat, lng, z) {
  const sin = Math.sin(lat * Math.PI / 180);
  const n = Math.pow(2, z);
  const x = (lng + 180) / 360 * n;
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * n;
  return { x, y };
}

function worldToLatLng(x, y, z) {
  const n = Math.pow(2, z);
  const lng = (x / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)));
  const lat = latRad * 180 / Math.PI;
  return { lat, lng };
}

function tileURL(z, x, y) {
  return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// ---------- Tile drawing ----------
const tileCache = new Map(); // key -> Image

function getTileImage(z, x, y) {
  const key = `${z}/${x}/${y}`;
  if (tileCache.has(key)) return tileCache.get(key);

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = tileURL(z, x, y);
  tileCache.set(key, img);

  img.onload = () => draw();
  img.onerror = () => draw();
  return img;
}

function drawBackground(w, h) {
  ctx.fillStyle = "rgba(0,0,0,0.02)";
  ctx.fillRect(0, 0, w, h);
}

function draw() {
  resizeCanvas();
  const w = canvas.getBoundingClientRect().width;
  const h = canvas.getBoundingClientRect().height;

  drawBackground(w, h);

  const tileSize = 256;

  const cWorld = latLngToWorld(centre.lat, centre.lng, zoom);
  const topLeftWorld = {
    x: cWorld.x - (w / tileSize) / 2,
    y: cWorld.y - (h / tileSize) / 2
  };

  const minTileX = Math.floor(topLeftWorld.x);
  const minTileY = Math.floor(topLeftWorld.y);
  const maxTileX = Math.floor(topLeftWorld.x + w / tileSize) + 1;
  const maxTileY = Math.floor(topLeftWorld.y + h / tileSize) + 1;

  const n = Math.pow(2, zoom);

  for (let tx = minTileX; tx <= maxTileX; tx++) {
    for (let ty = minTileY; ty <= maxTileY; ty++) {
      const xWrap = ((tx % n) + n) % n;
      const yClamp = clamp(ty, 0, n - 1);

      const img = getTileImage(zoom, xWrap, yClamp);

      const px = (tx - topLeftWorld.x) * tileSize;
      const py = (ty - topLeftWorld.y) * tileSize;

      if (img.complete && img.naturalWidth) {
        ctx.drawImage(img, px, py, tileSize, tileSize);
      } else {
        ctx.fillStyle = "rgba(0,0,0,0.03)";
        ctx.fillRect(px, py, tileSize, tileSize);
      }
    }
  }

  drawMarkers(w, h, topLeftWorld, tileSize);
  setText(zoomLabel, `Zoom: ${zoom}`);
}

function pointFromLatLng(lat, lng, topLeftWorld, tileSize) {
  const p = latLngToWorld(lat, lng, zoom);
  return {
    x: (p.x - topLeftWorld.x) * tileSize,
    y: (p.y - topLeftWorld.y) * tileSize
  };
}

function drawPin(x, y, colour, label) {
  ctx.beginPath();
  ctx.fillStyle = colour;
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1;
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillText(label, x + 10, y - 8);
}

function drawMarkers(w, h, topLeftWorld, tileSize) {
  animals.forEach(a => {
    const pt = pointFromLatLng(a.coords.lat, a.coords.lng, topLeftWorld, tileSize);
    const isFocus = a.id === focusedId;
    if (pt.x < -30 || pt.y < -30 || pt.x > w + 30 || pt.y > h + 30) return;
    drawPin(pt.x, pt.y, isFocus ? "#ef4444" : "#2b59ff", a.name);
  });

  if (userLoc) {
    const pt = pointFromLatLng(userLoc.lat, userLoc.lng, topLeftWorld, tileSize);
    if (!(pt.x < -30 || pt.y < -30 || pt.x > w + 30 || pt.y > h + 30)) {
      drawPin(pt.x, pt.y, "#06b6d4", "You");
    }
  }
}

// ---------- Interaction ----------
function focusAnimal(id) {
  const a = animals.find(x => x.id === id);
  if (!a) return;
  focusedId = id;
  setText(focusText, `Focus: ${a.name}`);
  centre = { lat: a.coords.lat, lng: a.coords.lng };
  draw();
}

function requestLocation() {
  if (!("geolocation" in navigator)) {
    setText(locText, "Location: not supported");
    return;
  }

  setText(locText, "Location: requesting…");

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setText(locText, `Location: ${userLoc.lat.toFixed(5)}, ${userLoc.lng.toFixed(5)}`);

      // ✅ FORCE VISIBLE UPDATE
      centre = { ...userLoc };
      zoom = 16;                 // make it obvious
      tileCache.clear();         // clear old tiles so new region loads
      focusedId = null;
      setText(focusText, "Focus: your location");

      draw();
    },
    (err) => {
      const reasons = { 1: "Permission denied", 2: "Position unavailable", 3: "Timeout" };
      setText(locText, `Location: ${reasons[err.code] || "Error"} (${err.message})`);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

function zoomTo(delta) {
  zoom = clamp(zoom + delta, 3, 18);
  if (tileCache.size > 300) tileCache.clear();
  draw();
}

function recenter() {
  centre = { ...DEFAULT_CENTRE };
  focusedId = null;
  setText(focusText, "Focus: none");
  draw();
}

function onPointerDown(e) {
  isDragging = true;
  lastPointer = { x: e.clientX, y: e.clientY };
  canvas.setPointerCapture?.(e.pointerId);
}

function onPointerMove(e) {
  if (!isDragging || !lastPointer) return;
  const dx = e.clientX - lastPointer.x;
  const dy = e.clientY - lastPointer.y;
  lastPointer = { x: e.clientX, y: e.clientY };

  const tileSize = 256;
  const cWorld = latLngToWorld(centre.lat, centre.lng, zoom);
  const newWorld = { x: cWorld.x - dx / tileSize, y: cWorld.y - dy / tileSize };
  centre = worldToLatLng(newWorld.x, newWorld.y, zoom);
  draw();
}

function onPointerUp() {
  isDragging = false;
  lastPointer = null;
}

// ---------- Render list fallback ----------
function renderList() {
  enclosureGrid.innerHTML = "";
  animals.forEach(a => {
    const el = document.createElement("article");
    el.className = "card";
    el.innerHTML = `
      <div class="section-title">
        <div>
          <h4>${a.name}</h4>
          <p style="margin:6px 0 0;"><strong>${a.enclosure}</strong> • <em>${a.scientific}</em></p>
        </div>
        <span class="pill">${a.status}</span>
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
        <button class="btn good" type="button" data-focus="${a.id}">Focus on map</button>
        <a class="btn primary" href="animals.html#${a.id}">Open record</a>
      </div>
    `;
    enclosureGrid.appendChild(el);
  });

  enclosureGrid.querySelectorAll("[data-focus]").forEach(btn => {
    btn.addEventListener("click", () => focusAnimal(btn.getAttribute("data-focus")));
  });
}

// ---------- Init ----------
async function init() {
  resizeCanvas();

  const res = await fetch(DATA_URL, { cache: "no-store" });
  const json = await res.json();
  animals = json.animals || [];

  renderList();

  const focusId = qs("focus");
  if (focusId) focusAnimal(focusId);
  else setText(focusText, "Focus: none");

  setText(locText, "Location: not requested");
  setText(zoomLabel, `Zoom: ${zoom}`);

  locBtn?.addEventListener("click", requestLocation);
  zoomInBtn?.addEventListener("click", () => zoomTo(+1));
  zoomOutBtn?.addEventListener("click", () => zoomTo(-1));
  recenterBtn?.addEventListener("click", recenter);

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);

  window.addEventListener("resize", draw);

  draw();
}

init();
