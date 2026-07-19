const CACHE='vg-v4';
const SHELL=['/','/index.html','/entdecken.html','/guide.html','/ortsteile.html','/karte.html','/ort.html','/style.css','/app.js','/manifest.webmanifest','/icons/icon-192.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET')return;
  if(u.pathname.startsWith('/api/')||u.hostname.includes('workers.dev')){
    // network-first, cache fallback (offline)
    e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));return r}).catch(()=>caches.match(e.request)));
    return;
  }
  if(u.origin===location.origin){
    e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(rr=>{const cp=rr.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));return rr})));
  }
});
