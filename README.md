# Clear-Paths Client Portal

Password-protected client dashboards for clear-paths.com, built on Netlify Functions.

## How it works

1. A client visits `https://clear-paths.com/portal/`
2. They log in with an email and password you issued them
3. `/api/login` (a Netlify Function) checks credentials against the `PORTAL_CLIENTS` env var and returns an HMAC-signed session token (24h lifetime)
4. `/api/dashboard` validates that token and serves the client's personal HTML file from `_dashboards/`
5. The HTML is rendered inside an iframe on the portal page

Direct access to `_dashboards/*.html` is blocked by a redirect rule in `netlify.toml`, so only authenticated requests can fetch dashboards.

## File structure

```
.
├── netlify.toml                        # Redirects + functions config
├── netlify/
│   └── functions/
│       ├── login.js                    # POST /api/login
│       └── get-dashboard.js            # GET  /api/dashboard
├── portal/
│   └── index.html                      # Public login page
└── _dashboards/                        # Private client HTML files
    ├── example.html
    ├── valerie.html                    # Add one per client
    └── ...
```

## Setup — one time

### 1. Push these files to your GitHub repo
Drop everything in this folder into the root of the repo that Netlify is building from. Netlify will auto-deploy on push to `main`.

### 2. Set environment variables in Netlify
Go to **app.netlify.com → clear-paths → Site configuration → Environment variables** and add:

**`PORTAL_SECRET`** — any long random string (used to sign tokens). Example:
```
a4f9c2e1b8d6... (generate with: openssl rand -hex 32)
```

**`PORTAL_CLIENTS`** — a JSON array of clients. Example:
```json
[
  {"email":"margarita@email.com","password":"val-2026-xY9q","dashboard":"valerie","name":"Margarita"},
  {"email":"anna@email.com","password":"var-2026-Kp4m","dashboard":"varvara","name":"Anna"},
  {"email":"claire@email.com","password":"fra-2026-Lz7t","dashboard":"francis","name":"Claire"}
]
```

> Mark both as secret in the Netlify UI so they're not exposed to builds logs.

### 3. Trigger a deploy
Either push to GitHub, or in Netlify UI click **Deploys → Trigger deploy → Deploy site**.

### 4. Test
Visit `https://clear-paths.com/portal/` and sign in with one of the credentials.

## Adding a new client

1. Drop their HTML report into `_dashboards/their-slug.html`
2. In Netlify, edit `PORTAL_CLIENTS` and append a new entry with their email, password, slug, and name
3. Commit + push (or redeploy)
4. Send the client their email + password

## Security notes

- `_dashboards/*.html` are blocked from direct HTTP access via `netlify.toml`
- Tokens are HMAC-SHA256 signed with `PORTAL_SECRET`, expire after 24h
- Passwords live only in Netlify env vars, never in the repo
- All traffic is HTTPS (Netlify automatic)
- Path traversal protected — `dashboard` slug must match `[a-z0-9_-]+`

## Want stronger security?

For a production-grade portal, swap the plain-password check for `bcrypt` hashes and replace the custom token with real JWTs (`jsonwebtoken` npm package). Happy to upgrade this — just ask.
