// netlify/functions/login.js
// Authenticates a client against the PORTAL_CLIENTS env var
// and returns a short-lived session token.

export default async (req, context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // PORTAL_CLIENTS is a JSON array stored as one env var in Netlify:
    // [{"email":"...","password":"...","dashboard":"valerie","name":"Margarita"}, ...]
    const clients = JSON.parse(Netlify.env.get("PORTAL_CLIENTS") || "[]");

    const client = clients.find(
      (c) =>
        c.email.toLowerCase() === String(email).toLowerCase() &&
        c.password === password
    );

    if (!client) {
      // Constant-ish delay to slow brute force a little
      await new Promise((r) => setTimeout(r, 400));
      return new Response(
        JSON.stringify({ error: "Invalid email or password" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Simple signed token: base64(email:dashboard:timestamp:hmac)
    const secret = Netlify.env.get("PORTAL_SECRET") || "change-me-in-env-vars";
    const payload = `${client.email}:${client.dashboard}:${Date.now()}`;
    const sig = await hmac(secret, payload);
    const token = btoa(`${payload}:${sig}`);

    return new Response(
      JSON.stringify({
        success: true,
        token,
        name: client.name,
        dashboard: client.dashboard,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message)
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const config = {
  path: "/api/login",
};
