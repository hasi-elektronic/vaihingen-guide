// Vaihingen Guide API — D1 + R2
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};
const J = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...CORS, ...extra } });

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}
async function makeToken(env) {
  const exp = Date.now() + 30 * 864e5;
  return exp + "." + (await hmac(env.ADMIN_PASSWORD, String(exp)));
}
async function checkAuth(req, env) {
  const h = req.headers.get("Authorization") || "";
  const t = h.replace("Bearer ", "");
  const [exp, sig] = t.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return sig === (await hmac(env.ADMIN_PASSWORD, exp));
}
const FIELDS = ["type","category","name","slug","desc_de","desc_en","address","lat","lng","phone","email","website","hours","images","featured","status"];

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const p = url.pathname;
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

    // ---- R2 image proxy: /img/:key ----
    if (p.startsWith("/img/")) {
      const key = decodeURIComponent(p.slice(5));
      const obj = await env.R2.get(key);
      if (!obj) return new Response("Not found", { status: 404, headers: CORS });
      const etag = obj.httpEtag;
      if (req.headers.get("If-None-Match") === etag)
        return new Response(null, { status: 304, headers: { ETag: etag, "Cache-Control": "public, max-age=300, must-revalidate", ...CORS } });
      return new Response(obj.body, { headers: {
        "Content-Type": obj.httpMetadata?.contentType || "image/jpeg",
        "Cache-Control": "public, max-age=300, must-revalidate",
        ETag: etag, ...CORS } });
    }

    // ---- public: GET /api/places, /api/places/:idOrSlug ----
    if (p === "/api/places" && req.method === "GET") {
      let sql = "SELECT * FROM places WHERE status='published'", binds = [];
      const t = url.searchParams.get("type"), c = url.searchParams.get("cat"), q = url.searchParams.get("q");
      if (t) { sql += " AND type=?"; binds.push(t); }
      if (c) { sql += " AND category=?"; binds.push(c); }
      if (q) { sql += " AND (name LIKE ? OR desc_de LIKE ?)"; binds.push(`%${q}%`, `%${q}%`); }
      sql += " ORDER BY featured DESC, name ASC";
      const r = await env.DB.prepare(sql).bind(...binds).all();
      return J(r.results);
    }
    const mPub = p.match(/^\/api\/places\/([^/]+)$/);
    if (mPub && req.method === "GET") {
      const v = decodeURIComponent(mPub[1]);
      const r = await env.DB.prepare("SELECT * FROM places WHERE status='published' AND (id=? OR slug=?)").bind(v, v).first();
      return r ? J(r) : J({ error: "not found" }, 404);
    }

    // ---- login ----
    if (p === "/api/login" && req.method === "POST") {
      const b = await req.json().catch(() => ({}));
      if (b.password && b.password === env.ADMIN_PASSWORD) return J({ token: await makeToken(env) });
      return J({ error: "wrong password" }, 401);
    }

    // ---- admin ----
    if (p.startsWith("/api/admin/")) {
      if (!(await checkAuth(req, env))) return J({ error: "unauthorized" }, 401);

      if (p === "/api/admin/places" && req.method === "GET") {
        const r = await env.DB.prepare("SELECT * FROM places ORDER BY type, name").all();
        return J(r.results);
      }
      if (p === "/api/admin/places" && req.method === "POST") {
        const b = await req.json();
        const cols = FIELDS.filter(f => b[f] !== undefined);
        const sql = `INSERT INTO places (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`;
        const r = await env.DB.prepare(sql).bind(...cols.map(f => b[f])).run();
        return J({ ok: true, id: r.meta.last_row_id });
      }
      const mAdm = p.match(/^\/api\/admin\/places\/(\d+)$/);
      if (mAdm && req.method === "PUT") {
        const b = await req.json();
        const cols = FIELDS.filter(f => b[f] !== undefined);
        if (!cols.length) return J({ error: "empty" }, 400);
        const sql = `UPDATE places SET ${cols.map(f => f + "=?").join(",")}, updated_at=datetime('now') WHERE id=?`;
        await env.DB.prepare(sql).bind(...cols.map(f => b[f]), mAdm[1]).run();
        return J({ ok: true });
      }
      if (mAdm && req.method === "DELETE") {
        await env.DB.prepare("DELETE FROM places WHERE id=?").bind(mAdm[1]).run();
        return J({ ok: true });
      }
      if (p === "/api/admin/upload" && req.method === "POST") {
        const form = await req.formData();
        const file = form.get("file");
        if (!file) return J({ error: "no file" }, 400);
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        const key = Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
        await env.R2.put(key, file.stream(), { httpMetadata: { contentType: file.type || "image/jpeg" } });
        return J({ ok: true, key, path: "/img/" + key });
      }
    }
    return J({ error: "not found" }, 404);
  },
};
