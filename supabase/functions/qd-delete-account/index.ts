// QuestDay: "Excluir minha conta". Apaga todos os dados do QuestDay da pessoa logada.
// A conta de login é compartilhada com o Fluxo Previsto (mesmo projeto Supabase): se a pessoa tiver
// dados lá, o login é mantido e só o QuestDay é apagado; senão, o usuário de login também é excluído.
// Publicar: supabase functions deploy qd-delete-account
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED = ["https://jullross.github.io", "http://localhost:8000", "http://127.0.0.1:8000"];
function cors(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED.includes(origin) ? origin : ALLOWED[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
const json = (req: Request, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, 405, { error: "method" });

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: { user } } = await anon.auth.getUser(token);
  if (!user) return json(req, 401, { error: "login" });

  let body: { confirm?: string } = {};
  try { body = await req.json(); } catch { /* sem corpo */ }
  if (body.confirm !== "EXCLUIR") return json(req, 400, { error: "confirm" });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  for (const t of ["qd_reminders", "qd_push_subs", "qd_backup", "qd_data", "qd_ai_access"]) {
    const { error } = await admin.from(t).delete().eq("user_id", user.id);
    if (error) { console.error("qd-delete", t, error.message); return json(req, 500, { error: "delete_failed" }); }
  }

  // Outro app do mesmo projeto ainda usa este login?
  let shared = false;
  for (const t of ["fluxo_data", "fluxo_backup"]) {
    const { count } = await admin.from(t).select("user_id", { count: "exact", head: true }).eq("user_id", user.id);
    if (count) { shared = true; break; }
  }
  if (!shared) {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) { console.error("qd-delete auth", error.message); return json(req, 500, { error: "auth_delete_failed" }); }
  }
  return json(req, 200, { ok: true, login_deleted: !shared });
});
