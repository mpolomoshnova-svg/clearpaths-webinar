// netlify/functions/get-dashboard.js
// Validates the Bearer token and returns the client's HTML dashboard.

import { readFileSync } from "fs";
import { join } from "path";

export default async (req, context) => {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const decoded = atob(token);
    const parts = decoded.split(":");
    if (parts.length < 4) {
      return new Response("Invalid token", { status: 401 });
    }
    const [email, dashboard, timestamp, signature] = parts;
    const payload = `${email}:${dashboard}:${timestamp}`;

    const secret = process.env.PORTAL_SECRET || "change-me-in-env-vars";
    const expected = await hmac(secret, payload);
    if (expected !== signature) {
      return new Response("Invalid token", { status: 401 });
    }

    const clients = JSON.parse(process.env.PORTAL_CLIENTS || "[]");
    const client = clients.find(
      (c) =>
        c.email.toLowerCase() === email.toLowerCase() &&
        c.dashboard === dashboard
    );
    if (!client) return new Response("Unauthorized", { status: 401 });

    const age = Date.now() - parseInt(timestamp, 10);
    if (age > 24 * 60 * 60 * 1000) {
      return new Response("Session expired", { status: 401 });
    }

    if (!/^[a-z0-9_-]+$/i.test(dashboard)) {
      return new Response("Invalid dashboard", { status: 400 });
    }

    const filePath = join(process.cwd(), "_dashboards", `${dashboard}.html`);
    const html = readFileSync(filePath, "utf-8");

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return new Response("Error loading dashboard", { status: 500 });
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
  path: "/api/dashboard",
  includedFiles: ["_dashboards/**"],
};
