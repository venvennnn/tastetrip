import type { City, Profile, Scheduled, Stop } from './types';
export const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
export const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export function haversine(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const r = Math.PI / 180, dl = (b.lat - a.lat) * r, dn = (b.lon - a.lon) * r;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(Math.sin(dl / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dn / 2) ** 2)));
}
export function estimate(city: City, p: Profile) {
  // Editorial sample prices must never leak into a live response.
  if (city.status !== 'demo' || !city.costs) return null;
  const k = p.days / 4, rooms = Math.ceil(p.travelers / 2), flights = city.costs.flights * p.travelers;
  const stay = city.costs.stay * ((p.days - 1) / 3) * rooms, food = city.costs.food * k * p.travelers, local = city.costs.local * k * p.travelers;
  const reserve = Math.ceil((flights + stay + food + local) * .1);
  return { flights, stay, food, local, reserve, total: flights + stay + food + local + reserve };
}
export const percentOfBudget = (cost: number, budget: number) => budget > 0 ? cost / budget * 100 : null;
export function rankCities(cities: City[], p: Profile) {
  const affinities = cities.map(c => c.affinity).filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
  const low = Math.min(...affinities), high = Math.max(...affinities);
  return cities.map(c => {
    const est = estimate(c, p), taste = c.affinity === undefined ? null : high === low ? .5 : (c.affinity - low) / (high - low);
    const affordability = est ? Math.max(0, 1 - est.total / p.budget) : null;
    const score = taste === null ? null : Math.round(100 * (affordability === null ? taste : .8 * taste + .2 * affordability));
    return { city: c, est, score, within: est ? est.total <= p.budget : null };
  }).sort((a, b) => a.within !== b.within && a.within !== null && b.within !== null ? a.within ? -1 : 1 : (b.score ?? 0) - (a.score ?? 0) || (a.est?.total ?? 0) - (b.est?.total ?? 0));
}
export function uniqueStops(stops: Stop[]) {
  const result: Stop[] = [];
  for (const s of stops) {
    if (!Number.isFinite(s.lat) || !Number.isFinite(s.lon) || Math.abs(s.lat) > 90 || Math.abs(s.lon) > 180) continue;
    const name = s.name.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    if (result.some(x => x.id === s.id || (x.name.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '') === name && haversine(s, x) < .2))) continue;
    result.push(s);
  }
  return result;
}
export function routeDistance(stops: { lat: number; lon: number }[]) {
  return stops.slice(1).reduce((n, s, i) => n + haversine(stops[i], s), 0);
}
// Nearest insertion, followed by bounded 2-opt. Distances are geodesic proxies, not road routes.
export function orderStops(stops: Stop[], start?: { lat: number; lon: number }, preferred?: string) {
  const pool = [...stops], route: Stop[] = [];
  let point = start ?? pool[0];
  while (pool.length) {
    pool.sort((a, b) => {
      const cost = (s: Stop) => haversine(point, s) - (s.category === preferred ? .3 : 0) - (s.affinity ?? 0) * .1;
      return cost(a) - cost(b);
    });
    const next = pool.shift()!; route.push(next); point = next;
  }
  for (let iteration = 0; iteration < 6; iteration++) {
    let improved = false;
    for (let i = 0; i < route.length - 2; i++) for (let j = i + 2; j < route.length; j++) {
      const candidate = [...route.slice(0, i + 1), ...route.slice(i + 1, j + 1).reverse(), ...route.slice(j + 1)];
      if (routeDistance(candidate) + 1e-6 < routeDistance(route)) { route.splice(0, route.length, ...candidate); improved = true; }
    }
    if (!improved) break;
  }
  return route;
}
export function buildDay(stops: Stop[], _day: number, pace: Profile['pace'], hours = 8, start?: { lat: number; lon: number }, preferred?: string): Scheduled[] {
  const cap = pace === 'Relaxed' ? 3 : pace === 'Packed' ? 5 : 4;
  const ordered = orderStops(uniqueStops(stops), start, preferred), out: Scheduled[] = [];
  let point = start ?? ordered[0], time = 9 * 60;
  for (const next of ordered) {
    if (out.length >= cap) break;
    const travel = out.length || start ? Math.max(5, Math.ceil(haversine(point, next) / 4.5 * 60)) : 0;
    if (time + travel + next.duration > 9 * 60 + hours * 60) continue;
    out.push({ ...next, arrival: time + travel, travel }); time += travel + next.duration + 20; point = next;
  }
  return out;
}
export type TripPlan = { days: Record<number, Scheduled[]>; clusters: { day: number; center: Stop | null; count: number; spread: number }[]; unplanned: Stop[]; uniqueCount: number; distanceKm: number; baselineKm: number };
// Balanced k-medoids on a haversine matrix. Seeds are actual venues; each venue has one owner day.
export function buildTrip(stops: Stop[], numberOfDays: number, pace: Profile['pace']): TripPlan {
  const daysCount = Math.max(1, Math.min(14, Math.floor(numberOfDays))), cap = pace === 'Relaxed' ? 3 : pace === 'Packed' ? 5 : 4;
  const candidates = uniqueStops(stops), chosen = [...candidates].sort((a, b) => (b.affinity ?? 0) - (a.affinity ?? 0)).slice(0, daysCount * cap);
  const k = Math.min(daysCount, chosen.length), days: Record<number, Scheduled[]> = {};
  for (let d = 1; d <= daysCount; d++) days[d] = [];
  if (!k) return { days, clusters: [], unplanned: candidates, uniqueCount: 0, distanceKm: 0, baselineKm: 0 };
  const distance = chosen.map(a => chosen.map(b => haversine(a, b)));
  let medoids = [0];
  while (medoids.length < k) {
    let best = -1, farthest = -1;
    for (let i = 0; i < chosen.length; i++) if (!medoids.includes(i)) {
      const nearest = Math.min(...medoids.map(m => distance[i][m]));
      if (nearest > farthest) { best = i; farthest = nearest; }
    }
    medoids.push(best);
  }
  const capacity = Math.min(cap, Math.ceil(chosen.length / k)); let groups: number[][] = [];
  for (let iteration = 0; iteration < 8; iteration++) {
    groups = medoids.map(m => [m]); const assigned = new Set(medoids);
    const edges = chosen.flatMap((_, i) => medoids.map((m, j) => ({ i, j, dist: distance[i][m] }))).sort((a, b) => a.dist - b.dist || a.i - b.i || a.j - b.j);
    for (const { i, j } of edges) if (!assigned.has(i) && groups[j].length < capacity) { groups[j].push(i); assigned.add(i); }
    const next = groups.map(g => [...g].sort((a, b) => g.reduce((n, x) => n + distance[a][x], 0) - g.reduce((n, x) => n + distance[b][x], 0) || a - b)[0]);
    if (next.every((m, i) => m === medoids[i])) break;
    medoids = next;
  }
  // Stable spatial ordering of clusters avoids reshuffling days when names change.
  groups.sort((a, b) => Math.min(...a) - Math.min(...b));
  const clusters = groups.map((g, i) => {
    const members = g.map(n => chosen[n]), center = members.reduce((best, s) => members.reduce((n, x) => n + haversine(s, x), 0) < members.reduce((n, x) => n + haversine(best, x), 0) ? s : best);
    days[i + 1] = buildDay(members, 1, pace);
    return { day: i + 1, center, count: days[i + 1].length, spread: Math.max(...members.map(s => haversine(center, s))) };
  });
  const visited = new Set(Object.values(days).flat().map(s => s.id)), unplanned = candidates.filter(s => !visited.has(s.id));
  const distanceKm = Object.values(days).reduce((n, route) => n + routeDistance(route), 0);
  // Compare the exact scheduled venue set with candidate-order slices of identical daily sizes.
  const baselinePool = candidates.filter(s => visited.has(s.id)); let offset = 0, baselineKm = 0;
  for (const route of Object.values(days)) { baselineKm += routeDistance(baselinePool.slice(offset, offset + route.length)); offset += route.length; }
  return { days, clusters, unplanned, uniqueCount: visited.size, distanceKm, baselineKm };
}
