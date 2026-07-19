const API = 'https://vaihingen-guide-api.hguencavdi.workers.dev';
const ICONS = {gastro:'🍽️',einkaufen:'🛍️',dienstleistung:'🔧',kultur:'🏛️',natur:'🌿',aktiv:'🚴',ortsteil:'🏘️'};

/* ---------- i18n ---------- */
const T = {
  de:{nav_ent:'Entdecken',nav_guide:'Betriebe',nav_ot:'Stadtteile',nav_map:'Karte',sec_ot:'Stadtteile',
    hero_eyebrow:'Stadt an der Enz · erstmals erwähnt 779',
    hero_h:'Entdecke Vaihingen an der Enz.',hero_p:'Sehenswürdigkeiten, lokale Betriebe und die schönsten Ecken der Stadt – in einem Guide.',
    feat:'Empfohlen',sec_sights:'Sehenswürdigkeiten',sec_biz:'Lokale Betriebe',all:'Alle anzeigen',
    cat_all:'Alle',cat_gastro:'Gastronomie',cat_einkaufen:'Einkaufen',cat_dienstleistung:'Dienstleistung',
    cat_kultur:'Kultur',cat_ortsteil:'Ortsteil',cat_natur:'Natur',cat_aktiv:'Aktiv',search:'Suchen …',map:'Karte',
    back:'← Zurück',website:'Webseite',empty:'Keine Einträge gefunden.',details:'Details',
    tab_home:'Start',tab_ent:'Entdecken',tab_biz:'Betriebe',tab_ot:'Orte',tab_map:'Karte',
    foot:'Ein Community-Projekt für Vaihingen an der Enz.'},
  en:{nav_ent:'Discover',nav_guide:'Businesses',nav_ot:'Districts',nav_map:'Map',sec_ot:'Districts',
    hero_eyebrow:'Town on the Enz · first mentioned 779',
    hero_h:'Discover Vaihingen an der Enz.',hero_p:'Sights, local businesses and the most beautiful corners of the town – in one guide.',
    feat:'Featured',sec_sights:'Sights',sec_biz:'Local businesses',all:'Show all',
    cat_all:'All',cat_gastro:'Food & drink',cat_einkaufen:'Shopping',cat_dienstleistung:'Services',
    cat_kultur:'Culture',cat_ortsteil:'District',cat_natur:'Nature',cat_aktiv:'Active',search:'Search …',map:'Map',
    back:'← Back',website:'Website',empty:'No entries found.',details:'Details',
    tab_home:'Home',tab_ent:'Discover',tab_biz:'Places',tab_ot:'Areas',tab_map:'Map',
    foot:'A community project for Vaihingen an der Enz.'}
};
let LANG = localStorage.getItem('vg_lang') || 'de';
const t = k => (T[LANG] && T[LANG][k]) || k;
function applyI18n(){
  document.documentElement.lang = LANG;
  document.querySelectorAll('[data-i]').forEach(el=>{ el.textContent = t(el.dataset.i); });
  document.querySelectorAll('[data-i-ph]').forEach(el=>{ el.placeholder = t(el.dataset.iPh); });
  const b = document.getElementById('langBtn'); if(b) b.textContent = LANG==='de' ? 'EN' : 'DE';
}
function toggleLang(){ LANG = LANG==='de'?'en':'de'; localStorage.setItem('vg_lang',LANG); location.reload(); }

/* ---------- helpers ---------- */
const desc = p => (LANG==='en' && p.desc_en) ? p.desc_en : (p.desc_de||'');
const imgs = p => { try{return JSON.parse(p.images||'[]')}catch(e){return []} };
const skeletonHTML = (n=6) => Array(n).fill('<div class="card skeleton" aria-hidden="true"></div>').join('');

function cardHTML(p){
  const im = imgs(p);
  const media = im.length
    ? `<img class="ph" loading="lazy" src="${API+im[0]}" alt="${p.name}">`
    : `<div class="ph-fallback">${ICONS[p.category]||'📍'}</div>`;
  return `<a class="card cat-${p.category}" href="ort.html?id=${p.slug||p.id}">
    ${media}<div class="scrim"></div>
    ${p.featured?`<span class="feat">★ ${t('feat')}</span>`:''}
    <div class="body">
      <span class="cat">${t('cat_'+p.category)}</span>
      <h3>${p.name}</h3>
    </div>
  </a>`;
}
async function fetchPlaces(params={}){
  const u = new URL(API+'/api/places');
  Object.entries(params).forEach(([k,v])=>v&&u.searchParams.set(k,v));
  return (await fetch(u)).json();
}
function initMap(el, places){
  if(!window.L || !places.length) return null;
  const map = L.map(el).setView([48.933,8.960],14);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    {attribution:'&copy; OpenStreetMap', maxZoom:19}).addTo(map);
  const pts=[];
  places.forEach(p=>{ if(p.lat&&p.lng){
    pts.push([p.lat,p.lng]);
    const im = imgs(p);
    const thumb = im.length ? `<img src="${API+im[0]}" alt="">` : '';
    L.marker([p.lat,p.lng]).addTo(map)
     .bindPopup(`${thumb}<span class="pop-name">${p.name}</span><a href="ort.html?id=${p.slug||p.id}">${t('details')} →</a>`);
  }});
  if(pts.length>1) map.fitBounds(pts,{padding:[30,30]});
  return map;
}

/* ---------- hero photo ---------- */
function setHeroBg(url){
  const el = document.getElementById('heroMedia');
  if(!el || !url) return;
  const img = new Image();
  img.onload = () => { el.style.backgroundImage = `url('${url}')`; el.classList.add('loaded'); };
  img.src = url;
}

/* ---------- bottom tab bar (mobile app-feel) ---------- */
function renderTabbar(){
  if(document.querySelector('.tabbar')) return;
  const pg = document.body.dataset.page;
  const items = [
    {href:'index.html', page:'home', ic:'🏠', key:'tab_home'},
    {href:'entdecken.html', page:'entdecken', ic:'🧭', key:'tab_ent'},
    {href:'guide.html', page:'guide', ic:'🍽️', key:'tab_biz'},
    {href:'ortsteile.html', page:'ortsteile', ic:'🏘️', key:'tab_ot'},
    {href:'karte.html', page:'karte', ic:'🗺️', key:'tab_map'},
  ];
  const nav = document.createElement('nav');
  nav.className = 'tabbar';
  nav.innerHTML = items.map(i =>
    `<a href="${i.href}" class="${pg===i.page?'active':''}"><span class="ic">${i.ic}</span><span>${t(i.key)}</span></a>`
  ).join('');
  document.body.appendChild(nav);
}

/* ---------- pages ---------- */
async function pageHome(){
  ['featSights','featBiz','featOt'].forEach(id=>{ const el=document.getElementById(id); if(el) el.innerHTML = skeletonHTML(4); });
  const all = await fetchPlaces();
  const featB = all.filter(p=>p.type==='business'&&p.featured);
  const featS = all.filter(p=>p.type==='sight'&&p.featured);
  document.getElementById('featSights').innerHTML = (featS.length?featS:all.filter(p=>p.type==='sight').slice(0,4)).map(cardHTML).join('');
  document.getElementById('featBiz').innerHTML = (featB.length?featB:all.filter(p=>p.type==='business').slice(0,4)).map(cardHTML).join('');
  const ot = all.filter(p=>p.type==='ortsteil');
  const otEl = document.getElementById('featOt'); if(otEl) otEl.innerHTML = ot.map(cardHTML).join('');
  const heroPlace = all.find(p=>p.slug==='schloss-kaltenstein' && imgs(p).length) || all.find(p=>p.type==='sight' && imgs(p).length);
  if(heroPlace) setHeroBg(API+imgs(heroPlace)[0]);
}
async function pageList(type, cats){
  const chipsEl = document.getElementById('chips');
  if(!cats.length) chipsEl.classList.add('hide');
  chipsEl.innerHTML = ['all',...cats].map(c=>`<button class="chip${c==='all'?' on':''}" data-c="${c}">${t('cat_'+c)}</button>`).join('');
  const grid = document.getElementById('grid');
  grid.innerHTML = skeletonHTML(6);
  let cur='all';
  async function load(){
    const q = document.getElementById('q').value.trim();
    const rows = await fetchPlaces({type, cat:cur==='all'?'':cur, q});
    grid.innerHTML = rows.length ? rows.map(cardHTML).join('') : `<p>${t('empty')}</p>`;
    const mapEl = document.getElementById('map');
    if(mapEl){ if(mapEl._m){mapEl._m.remove();mapEl._m=null} mapEl._m = initMap(mapEl, rows); }
  }
  chipsEl.addEventListener('click',e=>{
    const b=e.target.closest('.chip'); if(!b)return;
    chipsEl.querySelectorAll('.chip').forEach(x=>x.classList.remove('on'));
    b.classList.add('on'); cur=b.dataset.c; load();
  });
  let tm; document.getElementById('q').addEventListener('input',()=>{clearTimeout(tm);tm=setTimeout(load,300)});
  load();
}
async function pageKarte(){
  const grid = document.getElementById('mapFull');
  const filtersEl = document.getElementById('karteFilters');
  const all = await fetchPlaces();
  const uniqueCats = [...new Set(all.map(p=>p.category))];
  filtersEl.innerHTML = ['all',...uniqueCats].map(c=>`<button class="chip${c==='all'?' on':''}" data-c="${c}">${c==='all'?t('cat_all'):t('cat_'+c)}</button>`).join('');
  let cur='all';
  function draw(){
    const rows = cur==='all' ? all : all.filter(p=>p.category===cur);
    if(grid._m){ grid._m.remove(); grid._m=null; }
    grid._m = initMap(grid, rows);
  }
  filtersEl.addEventListener('click', e=>{
    const b=e.target.closest('.chip'); if(!b)return;
    filtersEl.querySelectorAll('.chip').forEach(x=>x.classList.remove('on'));
    b.classList.add('on'); cur=b.dataset.c; draw();
  });
  draw();
}
async function pageDetail(){
  const id = new URLSearchParams(location.search).get('id');
  const p = await (await fetch(API+'/api/places/'+encodeURIComponent(id))).json();
  if(p.error){ document.getElementById('d').innerHTML='<p>Not found.</p>'; return; }
  document.title = p.name+' – Vaihingen Guide';
  const im = imgs(p);
  const backHref = p.type==='sight'?'entdecken':p.type==='ortsteil'?'ortsteile':'guide';
  document.getElementById('d').innerHTML = `
    <a class="back" href="${backHref}.html">${t('back')}</a>
    <span class="eyebrow" style="margin-top:14px">${t('cat_'+p.category)}${p.featured?' · ★ '+t('feat'):''}</span>
    <h1>${p.name}</h1>
    ${im.length?`<div class="gal">${im.map(i=>`<img src="${API+i}" alt="${p.name}">`).join('')}</div>${p.img_credit?`<p style="font-size:.72rem;color:var(--ink-soft);margin-top:-8px">${p.img_credit}</p>`:''}`:''}
    <p class="desc">${desc(p)}</p>
    <div class="meta">
      ${p.address?`<div><span>📍</span>${p.address}</div>`:''}
      ${p.phone?`<div><span>📞</span><a href="tel:${p.phone}">${p.phone}</a></div>`:''}
      ${p.email?`<div><span>✉️</span><a href="mailto:${p.email}">${p.email}</a></div>`:''}
      ${p.website?`<div><span>🌐</span><a href="${p.website}" target="_blank" rel="noopener">${t('website')}</a></div>`:''}
      ${p.hours?`<div><span>🕐</span>${p.hours}</div>`:''}
    </div>
    ${p.lat&&p.lng?'<div id="map" style="height:300px"></div>':''}`;
  if(p.lat&&p.lng){
    const map=L.map('map').setView([p.lat,p.lng],16);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap',maxZoom:19}).addTo(map);
    L.marker([p.lat,p.lng]).addTo(map);
  }
}

/* ---------- image fade-in (delegated; 'load' doesn't bubble, so capture phase) ---------- */
document.addEventListener('load', e=>{
  const img = e.target;
  if(img.tagName==='IMG' && (img.classList.contains('ph') || img.closest('.gal'))) img.classList.add('loaded');
}, true);

/* ---------- boot ---------- */
document.addEventListener('DOMContentLoaded',()=>{
  applyI18n();
  renderTabbar();
  const b=document.getElementById('langBtn'); if(b) b.onclick=toggleLang;
  const pg=document.body.dataset.page;
  if(pg==='home') pageHome();
  if(pg==='guide') pageList('business',['gastro','einkaufen','dienstleistung']);
  if(pg==='entdecken') pageList('sight',['kultur','natur','aktiv']);
  if(pg==='ortsteile') pageList('ortsteil',[]);
  if(pg==='karte') pageKarte();
  if(pg==='detail') pageDetail();
  if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
});
