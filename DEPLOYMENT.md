# RoshanAI deployment

RoshanAI is deployed as two separate applications:

| Component | Hosting target | Source | Public responsibility |
|---|---|---|---|
| Frontend | GitHub Pages | Vite output under `dist/` | React UI, Firebase web authentication, local parsing, and calls to the backend URL |
| Backend | Vercel serverless functions | `api/[...path].ts` importing the secured Express app | Firebase token verification, rate limiting, provider API calls, and server-only secrets |

## GitHub Pages setup

Enable GitHub Pages for the repository using **GitHub Actions** as the source. Create an Actions environment named `github-pages` and add the secret `FIREBASE_WEB_CONFIG_JSON`. Its value must be the complete Firebase web configuration JSON used by the frontend, matching the shape of `firebase-applet-config.example.json`.

Create the repository variable `VITE_API_BASE_URL` with the deployed Vercel backend URL, for example `https://roshan-ai-api.vercel.app`. The Pages workflow uses `/RoshanAI/` as the Vite base path and copies `dist/index.html` to `dist/404.html` for SPA navigation fallback.

## Vercel setup

Create a Vercel project connected to this repository or linked manually with the Vercel CLI. Add the following GitHub repository secrets for the backend workflow:

| Secret | Purpose |
|---|---|
| `VERCEL_TOKEN` | Vercel deployment token |
| `VERCEL_ORG_ID` | Vercel team or account identifier |
| `VERCEL_PROJECT_ID` | Vercel project identifier |

Add the following environment variables to the Vercel project for the **Production** environment:

```text
OPENAI_API_KEY
OPENAI_MODEL
SERPAPI_KEY
JSEARCH_API_KEY
YOUTUBE_API_KEY
FIREBASE_PROJECT_ID
FIREBASE_SERVICE_ACCOUNT_JSON
ALLOWED_ORIGINS=https://maryumakram16.github.io
REQUIRE_API_AUTH=true
RATE_LIMIT_STORE=firestore
NODE_ENV=production
```

The correct variable name is `SERPAPI_KEY`; do not expose it through a `VITE_` variable.

`FIREBASE_SERVICE_ACCOUNT_JSON` must contain the complete service-account JSON as a single environment-variable value. Do not commit it to the repository or expose it through a `VITE_` variable. The Firebase service account must have only the permissions required for ID-token verification and the configured Firestore rate-limit collection.

## Workflow behavior

`.github/workflows/deploy-pages.yml` runs when frontend files change on `main` or when manually dispatched. It installs dependencies, runs the security regression suite, type-checks, builds the Pages artifact, and deploys it.

`.github/workflows/deploy-backend.yml` runs when backend or shared security files change on `main` or when manually dispatched. It runs the same validation and build checks, then uses the Vercel CLI to pull project settings, build the serverless output, and deploy it to production.

The backend must be deployed before the frontend’s `VITE_API_BASE_URL` variable is configured. After the first backend deployment, set that variable to the resulting Vercel URL and rerun the Pages workflow.

## Local development

Local development remains unchanged:

```bash
npm install
npm run dev
```

The local server continues to serve the Vite application and `/api/*` routes together. Production-like local testing can use `NODE_ENV=production`, `REQUIRE_API_AUTH=true`, and a valid Firebase Admin configuration.
