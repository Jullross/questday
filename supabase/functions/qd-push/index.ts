// QuestDay: envia os lembretes vencidos como notificação push (Web Push).
// Chamada a cada minuto pelo pg_cron do próprio banco, com o cabeçalho x-cron-secret.
// As chaves VAPID e o segredo do cron ficam no Vault e são lidos via qd_push_cfg() (só service_role).
// Publicar: supabase functions deploy qd-push --no-verify-jwt
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const LATE_MIN = 20; // lembrete atrasado mais que isso não é enviado (seria só ruído)

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method", { status: 405 });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: cfg, error: cfgErr } = await sb.rpc("qd_push_cfg");
  if (cfgErr || !cfg) return new Response("cfg", { status: 500 });
  if (!cfg.qd_cron_secret || req.headers.get("x-cron-secret") !== cfg.qd_cron_secret) return new Response("forbidden", { status: 403 });
  webpush.setVapidDetails("mailto:questday@jullross.github.io", cfg.qd_vapid_public, cfg.qd_vapid_private);

  const now = Date.now();
  const { data: due, error } = await sb.from("qd_reminders").select("id,user_id,fire_at,title,body,tag")
    .is("sent_at", null).lte("fire_at", new Date(now + 30_000).toISOString()).order("fire_at").limit(200);
  if (error) return new Response("db", { status: 500 });
  if (!due?.length) return Response.json({ sent: 0 });

  const stale = due.filter((r) => now - Date.parse(r.fire_at) > LATE_MIN * 60_000).map((r) => r.id);
  const live = due.filter((r) => !stale.includes(r.id));
  const users = [...new Set(live.map((r) => r.user_id))];
  const { data: subs } = users.length ? await sb.from("qd_push_subs").select("endpoint,user_id,p256dh,auth").in("user_id", users) : { data: [] };

  let sent = 0; const gone: string[] = [];
  for (const r of live) {
    const payload = JSON.stringify({ title: r.title, body: r.body, tag: r.tag || `qd-${r.id}`, url: "./" });
    for (const s of (subs ?? []).filter((x) => x.user_id === r.user_id)) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 900, urgency: "high" });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) gone.push(s.endpoint);
        else console.error("qd-push", code, String((e as Error).message ?? e).slice(0, 160));
      }
    }
  }
  const done = due.map((r) => r.id);
  await sb.from("qd_reminders").update({ sent_at: new Date().toISOString() }).in("id", done);
  if (gone.length) await sb.from("qd_push_subs").delete().in("endpoint", [...new Set(gone)]);
  return Response.json({ sent, reminders: live.length, skipped: stale.length, removed: gone.length });
});
