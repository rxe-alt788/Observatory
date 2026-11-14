const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const MAX_BODY_BYTES = 32_000;
const MAX_MESSAGES = 32;
const MAX_MESSAGE_CHARS = 8_000;

const SYSTEM_PROMPT = `You are CLIVE, the resident AI guide of The Commons. You are a character with timing, dry humour, curiosity and a little mischief. You are present in the room but never the main event. Answer the visitor first; then, when useful, add a short aside, challenge, observation or practical nudge. Do not force jokes or interrupt every turn. Never pretend to know personal history, infer trauma, diagnose, or manufacture intimacy. When memory is low, treat the visitor as a new arrival with no assumed backstory. Keep humour affectionate, never cruel. Use only context actually supplied in the conversation or visitor preferences. Distinguish fact, inference and invention. The visitor is in charge; you are a guide, not an authority. Avoid generic assistant preambles and wrap-ups.`;

function response(body, status = 200, origin = "") {
  const headers = new Headers(JSON_HEADERS);
  headers.set("cache-control", "no-store");
  if (origin) {
    headers.set("access-control-allow-origin", origin);
    headers.set("vary", "Origin");
    headers.set("access-control-allow-methods", "POST, OPTIONS");
    headers.set("access-control-allow-headers", "content-type");
    headers.set("access-control-max-age", "86400");
  }
  return new Response(JSON.stringify(body), { status, headers });
}

async function verifyTurnstile(token, ip, secret) {
  if (!token) return false;
  const form = new FormData();
  form.set("secret", secret);
  form.set("response", token);
  if (ip) form.set("remoteip", ip);
  const result = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form
  });
  if (!result.ok) return false;
  const data = await result.json();
  return data.success === true;
}

function validMessages(messages) {
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > MAX_MESSAGES) return false;
  return messages.every(m =>
    m &&
    (m.role === "user" || m.role === "assistant") &&
    typeof m.content === "string" &&
    m.content.length > 0 &&
    m.content.length <= MAX_MESSAGE_CHARS
  );
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = env.ALLOWED_ORIGIN || "";
    if (!allowedOrigin || origin !== allowedOrigin) {
      return response({ error: "Origin not allowed." }, 403);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": allowedOrigin,
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": "content-type",
          "access-control-max-age": "86400",
          "vary": "Origin"
        }
      });
    }

    if (request.method !== "POST") {
      return response({ error: "Method not allowed." }, 405, allowedOrigin);
    }

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return response({ error: "Request too large." }, 413, allowedOrigin);
    }

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const limit = await env.RATE_LIMITER.limit({ key: ip });
    if (!limit.success) {
      return response({ error: "Clive needs a moment. Please try again shortly." }, 429, allowedOrigin);
    }

    let body;
    try {
      const raw = await request.text();
      if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
        return response({ error: "Request too large." }, 413, allowedOrigin);
      }
      body = JSON.parse(raw);
    } catch {
      return response({ error: "Invalid JSON." }, 400, allowedOrigin);
    }

    if (!env.OPENAI_API_KEY || !env.OPENAI_MODEL || !env.TURNSTILE_SECRET) {
      return response({ error: "Clive gateway is not fully configured yet." }, 503, allowedOrigin);
    }
    if (!await verifyTurnstile(body.turnstileToken, ip, env.TURNSTILE_SECRET)) {
      return response({ error: "Please complete the visitor check and try again." }, 403, allowedOrigin);
    }
    if (!validMessages(body.messages)) {
      return response({ error: "Invalid conversation payload." }, 400, allowedOrigin);
    }

    const nodes = body.preferences || {};
    const memory = Math.max(0, Math.min(5, Number(nodes.memory) || 0));
    const creativity = Math.max(0, Math.min(5, Number(nodes.creativity) || 0));
    const initiative = Math.max(0, Math.min(5, Number(nodes.initiative) || 0));
    const preferenceNote = `Visitor operating preferences (0–5): Memory ${memory}; Creative freedom ${creativity}; Initiative ${initiative}. Respect these as preferences, not permissions. Memory controls how much prior context to carry forward; creative freedom controls how far to explore beyond the request; initiative controls how proactively to suggest next steps. Never take external actions or claim to have done work outside this conversation.`;

    try {
      const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "authorization": `Bearer ${env.OPENAI_API_KEY}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT + "\\n\\n" + preferenceNote },
            ...body.messages
          ],
          stream: false,
          max_completion_tokens: 1200
        })
      });
      const result = await upstream.text();
      return new Response(result, {
        status: upstream.status,
        headers: {
          "content-type": upstream.headers.get("content-type") || "application/json",
          "cache-control": "no-store",
          "access-control-allow-origin": allowedOrigin,
          "vary": "Origin"
        }
      });
    } catch {
      return response({ error: "The model service could not be reached." }, 502, allowedOrigin);
    }
  }
};
