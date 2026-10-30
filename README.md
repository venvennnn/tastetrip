# TasteTrip 2.0

A Vercel-ready Next.js travel discovery app with a floating globe, balanced geographic clustering, unique visits across days, an all-clusters map, budget percentages and animated transitions.

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
7. Switch between day tabs: each venue belongs to only one day. Choose **All clusters** on the map to see the geographic groups in different colors.
8. Review the budget: Flights, Hotels, Food, Local travel and Reserve each show a percentage of your **total trip budget**, not their share of estimated spend.
9. Open **See the science** to inspect clustering, within-day distance and the candidate-order baseline. Export the complete trip as text.

For the complete questionnaire, start at Question 1 and enter departure/date/travelers; favorite movies, artists, books or places; previous destinations and pace; and budget. Demo autocomplete deliberately offers a small explicit sample set. Live autocomplete uses actual Qloo search results.

## Live Qloo implementation

Requests are made by Next.js server routes with `X-Api-Key`, never directly by the browser.

| TasteTrip route | Upstream Qloo operation |
| --- | --- |
| `GET /api/search?q=...` | `GET /search?query=...` — resolve exact favorite entities |
| `POST /api/discover` | `GET /v2/insights` with `filter.type=urn:entity:destination`, confirmed UUID interest IDs, `feature.explainability=true`, `take=30` |
| `POST /api/places` | `GET /v2/insights` with `filter.type=urn:entity:place`, the interest IDs, WKT `POINT(longitude latitude)`, 15,000 m radius, explainability and `take=50` |

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
- Routes: deduplicate IDs and near-identical names/coordinates; select up to the days × pace capacity; build a haversine distance matrix; use deterministic farthest-point initialization and balanced k-medoids (bounded iterations) to allocate venues to distinct days; order each day with a nearest-neighbor heuristic and bounded 2-opt. Each venue has exactly one owner day. Schedules enforce the visit/time allowance and never recycle stops to fill sparse days. Transfers assume 4.5 km/h walking using geodesic distances. This is not a road-routing or opening-hours-constrained solver.
- Feedback: category-prioritization and two-hour rescheduling. Free text recognizes the displayed phrases; it is not an LLM. Completed stops stay fixed. Swaps and adaptations exclude places scheduled on all other days; visited state persists across day changes. Unscheduled alternatives are used when available. Undo stores the full prior trip, not just one day.
- Maps: Leaflet renders coordinate-accurate colored clusters and visit order. The default street layer uses the public Esri World Street Map service with attribution. If the layer fails, the map falls back to an honest geographic overview with a decorative grid (the grid is not streets, terrain or district boundaries). Optional `NEXT_PUBLIC_MAPTILER_KEY` uses your MapTiler street basemap instead. Restrict this public browser key to your Vercel domain. Public OSM tiles are not requested. Dashed lines show stop order, not actual navigable routes.
- Globe: Three.js with a local Earth texture; includes a geographic software-rendered canvas fallback when WebGL is unavailable, drag rotation and reduced-motion handling.

## Important scope

This is a working discovery/demo starter, not a booking engine. Flights, hotels, opening hours, ticket prices, reservations, visas and accessibility are **not verified** by this project. Prior-trip memories are contextual only until an exact favorite-place entity is selected. Multi-traveler cost scaling is included; individual companion profiles and group-fairness optimization are not implemented. Sparse candidate pools leave lighter or empty days instead of repeating venues. The Kyoto demo contains 16 editorial venue records; the default four-day balanced schedule fits 14 of them, with 2 retained as alternatives. These are editorial demo places, not Qloo responses. Live mode clears all demo destinations, favorites and itinerary state; stale async responses are discarded after a mode switch. It never uses editorial prices. If no Qloo image is returned, a neutral placeholder is used rather than a photograph of a different city. Live visit durations are a user-selectable planning preference, not a verified fact.

Live flight/hotel prices are not automatically fetched. You can enter your own whole-group INR costs in the live budget card; missing categories remain Unknown. The panel labels partial totals and avoids interpreting unknown expenses as free.

All state is session-memory only; refresh resets the trip. No database, login, payment or permanent itinerary storage.

Before a public high-traffic launch, add persistent rate limiting and abuse protection to the Qloo proxy (e.g. Vercel Firewall or a Redis-backed limiter), monitor provider quotas, and connect practical travel providers. The included requests have bounded input sizes, timeouts, UUID validation and allowlisted Qloo base URLs, but these are not a replacement for deployment-level rate limiting.

## Checks

```bash
npm run test
npm run typecheck
npm run build
npm start
```

14 tests cover group cost accounting, budget denominator/overruns, unknown live costs, time budgets, non-overlapping visits, absence of fake demo affinity, distance calculations, response normalization, cross-day uniqueness across cities/lengths/paces, geographically separated clusters, sparse pools, deterministic clustering and identity deduplication. Production build and tests passed during development. Browser QA exercised the production app because the managed preview's development streaming did not finish hydration.

## Project map

- `app/page.tsx`, `app/layout.tsx`: Next.js entry points and metadata.
- `components/TasteTrip.tsx`: questionnaire, demo/live controls, discovery, timeline, adaptation, export and explanation modals.
- `components/Globe.tsx`: geographic rotating globe with software fallback.
- `components/RouteMap.tsx`: numbered Leaflet route map.
- `app/globals.css`: responsive visual system.
- `app/api/*`: server-only Qloo integration.
- `lib/planner.ts`: cost accounting, ranking, haversine k-medoids, daily ordering and 2-opt.
- `components/BudgetPanel.tsx`: category percentages, provenance and optional user-entered live costs.
- `lib/qloo-shapes.ts`: response normalization.
- `lib/demo.ts`: clearly separated editorial demonstration data.
- `tests/planner.test.ts`: meaningful planner/adapter checks.

## Assets

Travel inspiration photographs were downloaded from Unsplash image URLs; they are illustrative travel imagery and are not proof of a venue's current appearance. Check suitability before production use, especially generic illustrations beside museum/venue names. Earth texture: Three.js example `textures/planets/earth_atmos_2048.jpg` (NASA Blue Marble imagery). See `ASSETS.md` for source URLs. Street maps retain MapTiler/OpenStreetMap attribution when configured. Google Fonts is optional; system fonts remain as fallback.
