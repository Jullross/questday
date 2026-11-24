// QuestDay: o Lume (IA) passa por aqui para a chave da Anthropic nunca ir para o navegador.
// Só a dona (OWNER_ID) e quem estiver em qd_ai_access pode usar. O app manda o mesmo corpo da
// API de mensagens (system, tools, messages); o servidor fixa modelo permitido e limite de tokens.
// Segredo necessário: ANTHROPIC_API_KEY. Publicar: supabase functions deploy qd-lume
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const OWNER_ID = (Deno.env.get("OWNER_ID") ?? "").trim();
const ALLOWED = ["https://jullross.github.io", "http://localhost:8000", "http://127.0.0.1:8000", "http://localhost:5173"];
const MODELS = ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"];
const MAX_BODY = 200_000;

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
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await sb.auth.getUser(token);
  if (!user) return json(req, 401, { error: "login" });
  let allowed = !!OWNER_ID && user.id === OWNER_ID;
  if (!allowed) { const { data } = await sb.from("qd_ai_access").select("user_id").eq("user_id", user.id).maybeSingle(); allowed = !!data; }
  if (!allowed) return json(req, 403, { error: "forbidden" });

  const key = (Deno.env.get("ANTHROPIC_API_KEY") ?? "").replace(/[\s"'`]/g, "");
  if (!key) return json(req, 409, { error: "not_configured" });

  const raw = await req.text();
  if (raw.length > MAX_BODY) return json(req, 413, { error: "too_big" });
  let b: Record<string, unknown> = {};
  try { b = JSON.parse(raw); } catch { return json(req, 400, { error: "json" }); }
  if (b.ping) return json(req, 200, { ok: true });
  const body = {
    model: MODELS.includes(String(b.model)) ? b.model : MODELS[0],
    max_tokens: Math.min(Number(b.max_tokens) || 1024, 2048),
    system: typeof b.system === "string" ? b.system.slice(0, 40_000) : undefined,
    tools: Array.isArray(b.tools) ? b.tools.slice(0, 40) : undefined,
    messages: Array.isArray(b.messages) ? b.messages.slice(-30) : [],
  };
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify(body),
  });
  const out = await r.text();
  if (!r.ok) console.error("qd-lume", r.status, out.slice(0, 200));
  return new Response(out, { status: r.status, headers: { ...cors(req), "Content-Type": "application/json" } });
});
