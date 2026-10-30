# TasteTrip

A Vercel-ready Next.js travel discovery app inspired by the supplied white globe and Kyoto itinerary designs.

## Run locally

Requires Node.js 22 or newer.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. You do not need an API key for the demo.

## Deploy to Vercel

1. Extract this project and push its contents to a new GitHub repository (package.json must be at the repository root).
2. Import that repository in Vercel. Framework: **Next.js**. Keep the default build/output settings. Use Node.js 22 or newer.
3. Deploy. The full demo works immediately.
4. To enable live discovery, add these **server-side** environment variables in Vercel → Project Settings → Environment Variables, then redeploy:

```dotenv
QLOO_API_KEY=your_key
QLOO_BASE_URL=https://hackathon.api.qloo.com
```

Hackathon keys require the hackathon base URL. Production/staging access needs the corresponding key and URL. Never name the key NEXT_PUBLIC_QLOO_API_KEY. Nothing should expose your key in a browser bundle.

Alternatively, deploy from the project directory with Vercel CLI (`npx vercel`) after you sign in to your own account.

## Two-minute demo

1. Click **Try a demo**. This loads Spirited Away, Nujabes and Norwegian Wood as sample favorites.
2. Adjust the trip budget, then select **Find my cities**.
3. Explore the globe or the city cards. All sample costs are plainly labeled as illustrative assumptions, not live quotes. There is no fabricated Qloo payload in demo mode.
4. Select **Kyoto**. Inspect the timeline, numbered map, budget and planning explanation.
5. Select a stop, open **Why this stop?**, swap an unvisited stop, and mark a stop visited.
6. Choose **Loved this**, **More outdoors**, or **2 hours left**. The remaining route updates and visited stops are preserved for that day. Use Undo to restore the previous route.
7. Change day tabs and export the itinerary as text.

For the complete questionnaire, start at Question 1 and enter departure/date/travelers; favorite movies, artists, books or places; previous destinations and pace; and budget. Demo autocomplete deliberately offers a small explicit sample set. Live autocomplete uses actual Qloo search results.

## Live Qloo implementation

Requests are made by Next.js server routes with `X-Api-Key`, never directly by the browser.

| TasteTrip route | Upstream Qloo operation |
| --- | --- |
| `GET /api/search?q=...` | `GET /search?query=...` — resolve exact favorite entities |
| `POST /api/discover` | `GET /v2/insights` with `filter.type=urn:entity:destination`, confirmed UUID interest IDs, `feature.explainability=true`, `take=30` |
| `POST /api/places` | `GET /v2/insights` with `filter.type=urn:entity:place`, the interest IDs, WKT `POINT(longitude latitude)`, 15,000 m radius, explainability and `take=30` |

`/search` intentionally starts with the documented query-only request, avoiding assumptions that its `types` enum is identical to Insights' `filter.type`. The category tabs guide entry; result labels disambiguate actual returned types. Results keep returned entity IDs; the code never invents Qloo IDs or tag URNs. The adapter preserves returned affinity/explainability and rejects invalid coordinates. Missing explanation evidence remains missing. No legacy `/recommendations` or `/recs` requests are used.

Only the endpoints needed by this build are called. Qloo's optional `GET /entities?entity_ids=...` hydration and `GET /v2/tags?filter.query=...` theme lookup can be added if those features are introduced; freeform memories are not passed as unvalidated IDs or tags.

These contracts follow the official documentation reviewed while writing the accompanying spec. **No credential-backed Qloo request was run during this build because no key was supplied.** Validate live search, destination and place responses with your account before a judged live demo. Response envelopes are adapted in `lib/qloo-shapes.ts`; extend this adapter if your account's payload differs. Destinations can include neighborhoods or areas, not just cities.

Official references:
- https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide
- https://docs.qloo.com/reference/get-search
- https://docs.qloo.com/reference/insights-api-deep-dive
- https://docs.qloo.com/reference/parameters
- https://docs.qloo.com/reference/available-parameters-by-entity-type

## What the planner does

- Demo: shows six real destinations and real venue names, with editorial descriptions and deliberately labeled illustrative INR costs. Sample departure assumption is Bengaluru; prices are not live or date-specific. Costs scale per person for flights/food, per room for stays and by trip duration, with a contingency reserve. Demo picks are sorted by affordability; they do not pretend to be personalized Qloo affinity results.
- Live: normalizes actual affinity within the returned candidate pool into a relative fit score. A missing score stays unknown. There are no live flight/hotel quotes, so live budgets are explicitly unverified rather than invented.
- Routes: deterministic greedy selection combines supplied affinity, proximity and category feedback under a daily time allowance. Transfers assume 4.5 km/h walking using straight-line distances. This is an approximate visit-order planner, not a time-window-constrained routing solver.
- Feedback: category-prioritization and two-hour rescheduling. Free text recognizes the displayed phrases; this starter does not send text to an LLM. Completed stops are fixed within the current day. Not a real-time agent or physical-risk assessment.
- Maps: Leaflet with OpenStreetMap tiles and attribution. Dashed lines show stop order, not actual navigable routes. External map tiles require network access.
- Globe: Three.js with a local Earth texture; includes a geographic software-rendered canvas fallback when WebGL is unavailable, drag rotation and reduced-motion handling.

## Important scope

This is a working discovery/demo starter, not a booking engine. Flights, hotels, opening hours, ticket prices, reservations, visas and accessibility are **not verified** by this project. Prior-trip memories are contextual only until an exact favorite-place entity is selected. Multi-traveler cost scaling is included; individual companion profiles and group-fairness optimization are not implemented. Candidate pools may repeat venues on later days and the interface says so. All state is session-memory only; refresh resets the trip. No database, login, payment or permanent itinerary storage.

Before a public high-traffic launch, add persistent rate limiting and abuse protection to the Qloo proxy (e.g. Vercel Firewall or a Redis-backed limiter), monitor provider quotas, and connect practical travel providers. The included requests have bounded input sizes, timeouts, UUID validation and allowlisted Qloo base URLs, but these are not a replacement for deployment-level rate limiting.

## Checks

```bash
npm run test
npm run typecheck
npm run build
npm start
```

Tests cover group cost accounting, unknown live costs, time budgets, non-overlapping visits, absence of fake demo affinity, distance calculations and response normalization. Production build and tests passed during development. Browser QA exercised the production app because the managed preview's development streaming did not finish hydration.

## Project map

- `app/page.tsx`, `app/layout.tsx`: Next.js entry points and metadata.
- `components/TasteTrip.tsx`: questionnaire, demo/live controls, discovery, timeline, adaptation, export and explanation modals.
- `components/Globe.tsx`: geographic rotating globe with software fallback.
- `components/RouteMap.tsx`: numbered Leaflet route map.
- `app/globals.css`: responsive visual system.
- `app/api/*`: server-only Qloo integration.
- `lib/planner.ts`: cost accounting, ranking and route heuristics.
- `lib/qloo-shapes.ts`: response normalization.
- `lib/demo.ts`: clearly separated editorial demonstration data.
- `tests/planner.test.ts`: meaningful planner/adapter checks.

## Assets

Travel inspiration photographs were downloaded from Unsplash image URLs; they are illustrative travel imagery and are not proof of a venue's current appearance. Check suitability before production use, especially generic illustrations beside museum/venue names. Earth texture: Three.js example `textures/planets/earth_atmos_2048.jpg` (NASA Blue Marble imagery). See `ASSETS.md` for source URLs. Maps retain OpenStreetMap attribution. Google Fonts is optional; system fonts remain as fallback.
