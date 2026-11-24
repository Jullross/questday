// QuestDay: o Lume (IA) passa por aqui para a chave nunca ir para o navegador.
// Usa o Gemini (segredo GEMINI_API_KEY, o mesmo do Fluxo Previsto). O app fala no formato da API de
// mensagens da Anthropic (system, tools, messages com tool_use/tool_result); aqui é traduzido de/para o Gemini.
// Só a dona (OWNER_ID) e quem estiver em qd_ai_access pode usar. Publicar: supabase functions deploy qd-lume
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const OWNER_ID = (Deno.env.get("OWNER_ID") ?? "").trim();
const ALLOWED = ["https://jullross.github.io", "http://localhost:8000", "http://127.0.0.1:8000", "http://localhost:5173"];
const MODELS = ["gemini-3.5-flash-lite", "gemini-3.8-flash"]; // leve primeiro; se falhar, o mais capaz
const MAX_BODY = 200_000, TIMEOUT_MS = 45_000;

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

// JSON Schema -> subconjunto aceito pelo Gemini.
const KEEP = new Set(["type", "description", "properties", "required", "items", "enum", "minimum", "maximum", "format", "nullable"]);
function schema(s: unknown): unknown {
  if (Array.isArray(s)) return s.map(schema);
  if (!s || typeof s !== "object") return s;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s as Record<string, unknown>)) {
    if (!KEEP.has(k)) continue;
    if (k === "properties") out[k] = Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([pk, pv]) => [pk, schema(pv)]));
    else if (k === "items") out[k] = schema(v);
    else out[k] = v;
  }
  return out;
}

type Block = { type: string; text?: string; id?: string; name?: string; input?: unknown; signature?: string; tool_use_id?: string; content?: unknown };
type Msg = { role: string; content: string | Block[] };

function toGemini(messages: Msg[]) {
  const names: Record<string, string> = {};
  const contents = [];
  for (const m of messages) {
    const blocks: Block[] = typeof m.content === "string" ? [{ type: "text", text: m.content }] : (m.content || []);
    const parts: Record<string, unknown>[] = [];
    for (const b of blocks) {
      if (b.type === "text" && b.text) parts.push({ text: String(b.text).slice(0, 8000), ...(b.signature ? { thoughtSignature: b.signature } : {}) });
      else if (b.type === "tool_use") { names[b.id!] = b.name!; parts.push({ functionCall: { name: b.name, args: b.input ?? {} }, ...(b.signature ? { thoughtSignature: b.signature } : {}) }); }
      else if (b.type === "tool_result") parts.push({ functionResponse: { name: names[b.tool_use_id!] || "tool", response: { result: typeof b.content === "string" ? b.content : JSON.stringify(b.content ?? "") } } });
    }
    if (parts.length) contents.push({ role: m.role === "assistant" ? "model" : "user", parts });
  }
  return contents;
}

function fromGemini(out: any) {
  const parts = out?.candidates?.[0]?.content?.parts ?? [];
  const content: Block[] = [];
  let k = 0;
  for (const p of parts) {
    if (p.thought) continue;
    if (p.functionCall) content.push({ type: "tool_use", id: `g${Date.now().toString(36)}${k++}`, name: p.functionCall.name, input: p.functionCall.args ?? {}, ...(p.thoughtSignature ? { signature: p.thoughtSignature } : {}) });
    else if (p.text) content.push({ type: "text", text: p.text, ...(p.thoughtSignature ? { signature: p.thoughtSignature } : {}) });
  }
  return { content, stop_reason: content.some((c) => c.type === "tool_use") ? "tool_use" : "end_turn" };
}

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

  const key = (Deno.env.get("GEMINI_API_KEY") ?? "").replace(/[\s"'`]/g, "");
  if (!key) return json(req, 409, { error: "not_configured" });

  const raw = await req.text();
  if (raw.length > MAX_BODY) return json(req, 413, { error: "too_big" });
  let b: { ping?: boolean; system?: string; tools?: { name: string; description?: string; input_schema?: unknown }[]; messages?: Msg[]; max_tokens?: number } = {};
  try { b = JSON.parse(raw); } catch { return json(req, 400, { error: "json" }); }
  if (b.ping) return json(req, 200, { ok: true });

  const body = {
    systemInstruction: { parts: [{ text: String(b.system ?? "").slice(0, 40_000) }] },
    contents: toGemini((Array.isArray(b.messages) ? b.messages : []).slice(-30)),
    ...(Array.isArray(b.tools) && b.tools.length ? { tools: [{ functionDeclarations: b.tools.slice(0, 40).map((t) => ({ name: t.name, description: t.description ?? "", parameters: schema(t.input_schema ?? { type: "object", properties: {} }) })) }] } : {}),
    generationConfig: { temperature: 0.4, maxOutputTokens: Math.min(Number(b.max_tokens) || 1024, 4096) },
  };
  if (!body.contents.length) return json(req, 400, { error: "no_message" });

  let last = "";
  for (const model of MODELS) {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), TIMEOUT_MS), t0 = Date.now();
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST", signal: ctl.signal, headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify(body),
      });
      if (r.status === 429) return json(req, 429, { error: { message: "rate_limited" } });
      if (!r.ok) { let d = ""; try { d = String((await r.json())?.error?.message ?? "").slice(0, 200); } catch { /* sem corpo */ } last = `${r.status} ${d}`; console.error("qd-lume", model, last); continue; }
      const res = fromGemini(await r.json());
      console.log("qd-lume", model, res.stop_reason, Date.now() - t0, "ms");
      if (res.content.length) return json(req, 200, { model, ...res });
      last = "vazio";
    } catch (e) { last = ctl.signal.aborted ? "timeout" : String((e as Error).message ?? e); console.error("qd-lume", model, last); }
    finally { clearTimeout(timer); }
  }
  return json(req, 502, { error: { message: last || "falhou" } });
});
