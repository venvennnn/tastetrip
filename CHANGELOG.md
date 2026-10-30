# TasteTrip 2.0

- Earth now floats vertically as well as rotating; brighter ocean rendering in the software fallback, atmospheric glow and orbit details.
- Globe-first composition, refined typography/card hierarchy, hover states, question/day/page transitions and reduced-motion handling.
- Balanced haversine k-medoids across all days, then nearest-neighbor ordering and bounded 2-opt within each day.
- Every venue is assigned once. Sparse days remain sparse. Deduplication uses IDs and matching names close in space.
- Swaps/feedback cannot reuse venues from another day; visited state survives day changes. Undo restores the full prior trip.
- All-clusters map with per-day colors and computed geographic radii. Public Esri street layer with a geometric fallback when external tiles fail. Optional MapTiler street layer.
- Budget shows each category's percentage of total user budget, overrun or remainder, and source/status. Live costs can be entered manually; missing values stay unknown.
- Live mode purges sample state and discards stale responses. No sample costs or curated city imagery masquerade as live data.
- Cultural-compass bars use the actual selected favorites, replacing fixed decorative values.
- Qloo venue request enlarged to 50 real candidates for better multi-day coverage; configurable visit-duration assumption.
- 14 meaningful planner/adapter tests and production build checks.

Still not provided: live flight/hotel quote retrieval, opening-hours verification, booking, visa checks, accessibility verification or navigable road routes. Qloo supplies cultural affinity, not those practical facts. No credential-backed Qloo test was possible without a key in this workspace.
