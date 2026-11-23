'use strict';
/*
 * Five-league append-only pre-kick odds monitor.
 * Source: ESPN public scoreboard (schedule) + The Odds API v4 (odds, key required).
 * Does not modify Official, Shadow, Research, OPEN, or user R1/R2/R3.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'data');
const sports = {
  EPL: ['eng.1', 'soccer_epl'],
  BUNDESLIGA: ['ger.1', 'soccer_germany_bundesliga'],
  LALIGA: ['esp.1', 'soccer_spain_la_liga'],
  SERIEA: ['ita.1', 'soccer_italy_serie_a'],
  LIGUE1: ['fra.1', 'soccer_france_ligue_one']
};
const aliases = {
  'man united': 'manchester united', 'man utd': 'manchester united',
  'man city': 'manchester city', 'spurs': 'tottenham',
  'internazionale': 'inter', 'inter milan': 'inter',
  'bayern munich': 'bayern munchen', 'bayern': 'bayern munchen',
  'atletico madrid': 'atletico madrid',
  'borussia dortmund': 'dortmund',
  'monza brianza': 'monza', 'ac monza': 'monza',
  'fiorentina': 'fiorentina'
};
function norm(s) {
  const v = String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/&/g, 'and').replace(/[^\w ]/g, ' ')
    .replace(/\b(fc|cf|afc|ssc|ac|sd|calcio|football|club|de|the)\b/g, ' ')
    .replace(/\s+/g, ' ').trim();
  return aliases[v] || v;
}
function teamsMatch(a, b, c, d) {
  return norm(a) === norm(c) && norm(b) === norm(d);
}
function iso(d) { return new Date(d).toISOString(); }
function utcDate(d) { return new Date(d).toISOString().slice(0, 10).replace(/-/g, ''); }
function validOdd(v) { return Number.isFinite(v) && v > 1; }
function safeRead(file, fallback) { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback; }
function writeNew(file, obj) {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', {flag: 'wx'});
}
function hash(s) { return crypto.createHash('sha256').update(s).digest('hex').slice(0, 20); }
async function getJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const r = await fetch(url, {headers: {'User-Agent': 'five-league-prekick-monitor/1.0'}, signal: controller.signal});
    if (!r.ok) { const e = new Error('HTTP_' + r.status); e.httpStatus = r.status; throw e; }
    return await r.json();
  } finally { clearTimeout(timer); }
}
function fixtureFrom(entry) {
  if (!entry || !entry.fixture_id || !entry.kickoff_at_utc) return null;
  const k = Date.parse(entry.kickoff_at_utc);
  if (!Number.isFinite(k)) return null;
  return Object.assign({}, entry, {kickoff_at_utc: iso(k), t60_due_at_utc: iso(k - 3600000)});
}
function allFixtures() {
  const base = safeRead(path.join(dataDir, 'fixture_schedule_20261120_20261127.json'), {fixtures: []});
  const map = new Map();
  for (const f of base.fixtures || []) { const x = fixtureFrom(f); if (x) map.set(x.fixture_id, x); }
  const folder = path.join(dataDir, 'schedule_extensions');
  if (fs.existsSync(folder)) for (const file of fs.readdirSync(folder).filter(x => x.endsWith('.json')).sort()) {
    const ext = safeRead(path.join(folder, file), {});
    for (const f of ext.fixtures || []) {
      const x = fixtureFrom(f);
      if (x && !map.has(x.fixture_id)) map.set(x.fixture_id, x);
    }
    for (const c of ext.changes || []) {
      const target = map.get(c.fixture_id || c.update_of_fixture_id);
      if (target && c.kickoff_at_utc) {
        const x = fixtureFrom(Object.assign({}, target, {kickoff_at_utc: c.kickoff_at_utc,
          source: c.source || target.source, last_verified_at: c.checked_at_utc || target.last_verified_at}));
        if (x) map.set(x.fixture_id, x);
      }
    }
  }
  return [...map.values()];
}
function eventTeams(e) {
  const cs = (e.competitions && e.competitions[0] && e.competitions[0].competitors) || [];
  const home = cs.find(x => x.homeAway === 'home'), away = cs.find(x => x.homeAway === 'away');
  return {home: home && home.team && (home.team.displayName || home.team.name),
    away: away && away.team && (away.team.displayName || away.team.name)};
}
async function verifySchedule(fixtures, now, full) {
  const checked = [], newFixtures = [], changes = [];
  const byKey = new Map(fixtures.map(f => [f.fixture_id, f]));
  const days = full ? 8 : 1;
  for (const [league, [espn]] of Object.entries(sports)) {
    for (let n = 0; n < days; n++) {
      const date = new Date(now.getTime() + n * 86400000);
      const url = 'https://site.api.espn.com/apis/site/v2/sports/soccer/' + espn +
        '/scoreboard?dates=' + utcDate(date);
      const check = {league, date: utcDate(date), source_url: url, status: 'SOURCE_UNAVAILABLE', event_count: null};
      try {
        const resp = await getJson(url);
        if (!Array.isArray(resp.events)) throw new Error('BAD_ESPN_RESPONSE');
        check.status = 'VERIFIED_FROM_ESPN';
        check.event_count = resp.events.length;
        for (const e of resp.events) {
          const names = eventTeams(e);
          const kickoff = Date.parse(e.date);
          if (!names.home || !names.away || !Number.isFinite(kickoff)) continue;
          if (kickoff < now.getTime() - 86400000 || kickoff > now.getTime() + 8 * 86400000) continue;
          const match = fixtures.find(f => f.league === league &&
            teamsMatch(f.home, f.away, names.home, names.away));
          if (match) {
            if (Math.abs(Date.parse(match.kickoff_at_utc) - kickoff) > 120 &&
                !changes.some(x => x.fixture_id === match.fixture_id)) {
              changes.push({fixture_id: match.fixture_id, previous_kickoff_at_utc: match.kickoff_at_utc,
                kickoff_at_utc: iso(kickoff), checked_at_utc: now.toISOString(),
                source: url, reason: 'ESPN_KICKOFF_CHANGED'});
            }
          } else {
            // Do not create ambiguous duplicate records if a team or same-time slot already exists.
            const possible = fixtures.some(f => f.league === league &&
              Math.abs(Date.parse(f.kickoff_at_utc) - kickoff) < 10800000 &&
              [norm(f.home), norm(f.away)].some(x => x === norm(names.home) || x === norm(names.away)));
            if (possible) continue;
            const id = league + '-2026-27-ESPN-' + String(e.id);
            if (!byKey.has(id)) {
              const item = fixtureFrom({fixture_id: id, fixture_id_type: 'ESPN_EVENT_ID',
                league, season: '2026-27', GW: null, home: names.home, away: names.away,
                kickoff_at_utc: iso(kickoff), source: url,
                last_verified_at: now.toISOString(), verification_level: 'ESPN_API'});
              if (item) { byKey.set(id, item); newFixtures.push(item); fixtures.push(item); }
            }
          }
        }
      } catch (e) { check.reason = e.message; }
      checked.push(check);
    }
  }
  if (newFixtures.length || changes.length) {
    const stamp = now.toISOString().replace(/:/g, '-').replace(/\./g, '-');
    const file = path.join(dataDir, 'schedule_extensions', stamp + '-espn.json');
    writeNew(file, {schema_version: 'FIVE_LEAGUE_FIXTURE_EXTENSION_V1', append_only: true,
      checked_at_utc: now.toISOString(), source_name: 'ESPN_PUBLIC_SCOREBOARD',
      fixtures: newFixtures, changes, coverage_complete: checked.every(x => x.status === 'VERIFIED_FROM_ESPN')});
    for (const c of changes) {
      const f = fixtures.find(x => x.fixture_id === c.fixture_id);
      if (f) Object.assign(f, fixtureFrom(Object.assign({}, f, {kickoff_at_utc: c.kickoff_at_utc, source: c.source})));
    }
  }
  return {checked, new_count: newFixtures.length, changed_count: changes.length,
    complete: checked.every(x => x.status === 'VERIFIED_FROM_ESPN')};
}
function price(o) { return typeof o?.price === 'number' ? o.price : Number(o?.price); }
function marketToOdds(b, home, away, now) {
  const markets = Object.fromEntries((b.markets || []).map(m => [m.key, m]));
  const out = {'1X2': {home: null, draw: null, away: null},
    OU25: {over: null, under: null},
    AH: {line_home: null, home: null, away: null}};
  const times = {};
  const h = markets.h2h;
  if (h) {
    for (const o of h.outcomes || []) {
      const key = norm(o.name) === norm(home) ? 'home' : norm(o.name) === norm(away) ? 'away' :
        norm(o.name) === 'draw' ? 'draw' : null;
      if (key && validOdd(price(o))) out['1X2'][key] = price(o);
    }
    if (h.last_update) times['1X2'] = h.last_update;
  }
  const t = markets.totals;
  if (t) {
    for (const o of t.outcomes || []) {
      if (Math.abs(Number(o.point) - 2.5) > 0.00001) continue;
      const name = norm(o.name);
      if (name === 'over' && validOdd(price(o))) out.OU25.over = price(o);
      if (name === 'under' && validOdd(price(o))) out.OU25.under = price(o);
    }
    if (t.last_update) times.OU25 = t.last_update;
  }
  const s = markets.spreads;
  if (s) {
    const homeObj = (s.outcomes || []).find(o => norm(o.name) === norm(home));
    const awayObj = (s.outcomes || []).find(o => norm(o.name) === norm(away));
    if (homeObj && awayObj && Number.isFinite(Number(homeObj.point)) &&
      Math.abs(Number(homeObj.point) + Number(awayObj.point)) < 0.00001 &&
      validOdd(price(homeObj)) && validOdd(price(awayObj))) {
      out.AH = {line_home: Number(homeObj.point), home: price(homeObj), away: price(awayObj)};
    }
    if (s.last_update) times.AH = s.last_update;
  }
  const missing = [];
  for (const [k, fields] of Object.entries(out)) {
    for (const [field, value] of Object.entries(fields)) if (value === null) missing.push(k + '.' + field);
  }
  const stale = Object.keys(out).filter(k => !times[k] || !Number.isFinite(Date.parse(times[k])) ||
    Date.parse(times[k]) > now.getTime() ||
    now.getTime() - Date.parse(times[k]) > 30 * 60000);
  return {odds: out, market_last_update: times, missing, stale, complete: !missing.length && !stale.length};
}
function chooseBook(event, now) {
  const bookies = (event.bookmakers || []).map(b => {
    const m = marketToOdds(b, event.home_team, event.away_team, now);
    const favorite = /bet365/i.test(b.key || '') || /bet365/i.test(b.title || '');
    return Object.assign({key: b.key, title: b.title, last_update: b.last_update, favorite}, m);
  });
  bookies.sort((a, b) => Number(b.complete) - Number(a.complete) ||
    Number(a.missing.length) - Number(b.missing.length) ||
    Number(a.stale.length) - Number(b.stale.length) ||
    Number(b.favorite) - Number(a.favorite));
  return bookies[0] || null;
}
function snapshot(f, event, book, now, source) {
  const obj = {fixture_id: f.fixture_id, league: f.league, fixture: f.home + ' vs ' + f.away,
    kickoff_at: f.kickoff_at_utc, due_at: f.t60_due_at_utc,
    captured_at_utc: now.toISOString(), minutes_to_kickoff: +((Date.parse(f.kickoff_at_utc) - now.getTime()) / 60000).toFixed(2),
    snapshot_type: 'PRE_KICK', source_provider: 'THE_ODDS_API_V4',
    source_url: source, provider_event_id: event.id,
    bookmaker: book.key, bookmaker_title: book.title,
    odds: book.odds, market_last_update: book.market_last_update,
    missing_markets: book.missing, stale_market_timestamps: book.stale,
    crossbook_proxy: false, source_time_type: book.stale.length ? 'LIVE_OBSERVED_AT' : 'API_MARKET_LAST_UPDATE',
    status: book.complete ? 'PRE_KICK_RECORDED' : 'PARTIAL_ODDS',
    validated: book.complete, comparable_to_open: false,
    ah_market_type: 'PROVIDER_SPREADS_HANDICAP_NOT_INDEPENDENTLY_ASIAN_VERIFIED'};
  // Provider "spreads" is not independently verified as an Asian-handicap market.
  // Never claim a complete 1X2 + OU2.5 + Asian Handicap Bet365 snapshot from this proxy.
  if (book.complete) { obj.status = 'PARTIAL_ODDS'; obj.validated = false; obj.missing_markets = ['AH.ASIAN_HANDICAP_MARKET_TYPE_UNVERIFIED']; }
  obj.record_id = 'ODDS-' + hash(JSON.stringify([obj.fixture_id, obj.bookmaker, obj.odds,
    obj.market_last_update, obj.missing_markets]));
  return obj;
}
function novig(values) {
  const inv = values.map(v => 1 / v), sum = inv.reduce((a, b) => a + b, 0);
  return inv.map(v => +(v / sum).toFixed(5));
}
function buildAuditRow(f, now, state, source) {
  const minutes = (Date.parse(f.kickoff_at_utc) - now.getTime()) / 60000;
  return {fixture_id: f.fixture_id, league: f.league, home: f.home, away: f.away,
    kickoff_at: f.kickoff_at_utc, due_at: iso(Date.parse(f.kickoff_at_utc) - 3600000),
    run_at: now.toISOString(), minutes_to_kickoff: +minutes.toFixed(2), status: state,
    attempted_sources: source ? [source] : [], reason: ''};
}
async function run() {
  const now = new Date();
  const fixtures = allFixtures();
  const checkFull = process.argv.includes('--check-schedule') || process.env.GITHUB_EVENT_NAME === 'push' ||
    (now.getUTCHours() % 6 === 0 && now.getUTCMinutes() < 10);
  const schedule = await verifySchedule(fixtures, now, checkFull);
  const file = path.join(dataDir, 'market_prekick_snapshots.json');
  const master = safeRead(file, {schema_version: 'FIVE_LEAGUES_PREKICK_SNAPSHOTS_V1', snapshots: []});
  if (!Array.isArray(master.snapshots)) throw Error('INVALID_SNAPSHOT_MASTER');
  const existing = new Set(master.snapshots.map(x => x.record_id));
  const done = new Set(master.snapshots.filter(x => x.status === 'PRE_KICK_RECORDED' && x.validated)
    .map(x => x.fixture_id));
  const existingPartial = new Map();
  for (const rec of master.snapshots.filter(x => x.status === 'PARTIAL_ODDS')) {
    const prior = existingPartial.get(rec.fixture_id);
    const quality = x => (x.missing_markets || []).length + (x.stale_market_timestamps || []).length;
    if (!prior || quality(rec) < quality(prior)) existingPartial.set(rec.fixture_id, rec);
  }
  const oddsUrlBase = 'https://api.the-odds-api.com/v4/sports/';
  const sourceLabel = 'https://the-odds-api.com/liveapi/guides/v4/';
  const apiKey = process.env.ODDS_API_KEY || '';
  const lookup = new Map(), errors = new Map();
  const due = fixtures.filter(f => {
    const minutes = (Date.parse(f.kickoff_at_utc) - now.getTime()) / 60000;
    return minutes >= 0 && minutes <= 60 && !done.has(f.fixture_id);
  });
  if (due.length && apiKey) {
    for (const league of new Set(due.map(x => x.league))) {
      const sport = sports[league][1];
      const safe = oddsUrlBase + sport + '/odds/?regions=uk,eu&markets=h2h,spreads,totals&oddsFormat=decimal';
      try {
        const u = new URL(safe);
        u.searchParams.set('apiKey', apiKey);
        const data = await getJson(u.toString());
        if (!Array.isArray(data)) throw new Error('BAD_ODDS_RESPONSE');
        lookup.set(league, {events: data, source: safe});
      } catch (e) { errors.set(league, {reason: e.httpStatus === 401 || e.httpStatus === 403 ?
        'API_KEY_REQUIRED' : e.httpStatus === 429 ? 'RATE_LIMIT' : 'SOURCE_UNAVAILABLE',
        detail: e.message, source: safe}); }
    }
  }
  const rows = [], appended = [];
  for (const f of fixtures) {
    const row = buildAuditRow(f, now, 'PENDING', f.source || null);
    const minutes = row.minutes_to_kickoff;
    if (done.has(f.fixture_id)) { row.status = 'PRE_KICK_RECORDED'; row.reason = 'Validated pre-kick record already exists'; }
    else if (minutes < 0 && minutes >= -1440) { row.status = 'MISSED_T60'; row.reason = 'Kickoff passed without validated pre-kick record; no post-kick odds backfill'; }
    else if (minutes < -1440) { row.status = 'HISTORICAL_OUTSIDE_24H'; row.reason = 'Outside last-24-hour missing snapshot window'; }
    else if (minutes > 60) { row.status = 'PENDING'; row.reason = 'Outside 0-60 minute capture window'; }
    else {
      const sport = sports[f.league][1];
      const src = oddsUrlBase + sport + '/odds/?regions=uk,eu&markets=h2h,spreads,totals&oddsFormat=decimal';
      row.attempted_sources.push(src, sourceLabel);
      if (!apiKey) { row.status = 'API_KEY_REQUIRED'; row.reason = 'Set GitHub Actions secret ODDS_API_KEY; no odds request performed'; }
      else if (errors.has(f.league)) {
        row.status = errors.get(f.league).reason; row.reason = errors.get(f.league).detail;
      } else {
        const events = (lookup.get(f.league) || {}).events || [];
        const matches = events.filter(e => teamsMatch(f.home, f.away, e.home_team, e.away_team) &&
          Math.abs(Date.parse(e.commence_time) - Date.parse(f.kickoff_at_utc)) <= 30 * 60000);
        if (matches.length !== 1) { row.status = 'SOURCE_UNAVAILABLE'; row.reason = matches.length ?
          'Multiple event matches, refuse ambiguous odds' : 'Fixture absent from odds provider or kickoff mismatch'; }
        else {
          const book = chooseBook(matches[0], now);
          if (!book) { row.status = 'MARKET_MISSING'; row.reason = 'No bookmaker market data'; }
          else {
            const rec = snapshot(f, matches[0], book, now, src);
            row.status = rec.status; row.bookmaker = book.key; row.record_id = rec.record_id;
            row.reason = rec.missing_markets.concat(rec.stale_market_timestamps.map(x => 'STALE_TIMESTAMP:' + x)).join('; ') ||
              'Provider handicap not verified as Asian handicap';
            const prior = existingPartial.get(rec.fixture_id);
            const quality = x => (x.missing_markets || []).length + (x.stale_market_timestamps || []).length;
            if (!existing.has(rec.record_id) && (!prior || quality(rec) < quality(prior))) {
              appended.push(rec); existing.add(rec.record_id); existingPartial.set(rec.fixture_id, rec);
            } else row.reason += '; unchanged or not-improved partial snapshot not appended';
          }
        }
      }
    }
    rows.push(row);
  }
  if (appended.length) {
    master.snapshots.push(...appended);
    master.status = 'HAS_PARTIAL_OR_VALIDATED_PREKICK_SNAPSHOTS';
    fs.writeFileSync(file, JSON.stringify(master, null, 2) + '\n');
  }
  const stamp = now.toISOString().replace(/:/g, '-').replace(/\./g, '-');
  const auditFile = path.join(dataDir, 'prekick_audits', stamp + '-automation.json');
  const audit = {schema_version: 'FIVE_LEAGUE_PREKICK_AUDIT_V2', append_only: true, run_at: now.toISOString(),
    fixture_count: fixtures.length, window_count: due.length, recent_24h_missed_count:
      rows.filter(x => x.status === 'MISSED_T60').length, new_snapshots: appended.length,
    api_configured: Boolean(apiKey), schedule_check: schedule, fixtures: rows,
    notes: ['The Odds API soccer spreads not independently validated as Asian Handicap; recorded as PARTIAL_ODDS only.',
      'Bet365 soccer availability is not assumed. No cross-book synthesis.',
      'No post-kick backfill. Existing OPEN/Official/Shadow/Research/R1-R3 never modified.']};
  writeNew(auditFile, audit);
  const confirm = safeRead(auditFile, null);
  if (!confirm || confirm.fixtures.length !== rows.length) throw Error('NOT_PERSISTED_AUDIT_LOCAL');
  if (appended.length && safeRead(file, {}).snapshots.length !== master.snapshots.length) throw Error('NOT_PERSISTED_SNAPSHOT_LOCAL');
  console.log(JSON.stringify({audit_file: path.relative(root, auditFile), fixture_count: rows.length,
    due: due.length, missed: audit.recent_24h_missed_count, new_snapshots: appended.length,
    odds_api_configured: Boolean(apiKey), schedule_checked: schedule.checked.length,
    schedule_check_complete: schedule.complete, additions: schedule.new_count, changes: schedule.changed_count}, null, 2));
}
module.exports = {norm, teamsMatch, marketToOdds, chooseBook, snapshot, novig, fixtureFrom, buildAuditRow};
if (require.main === module) run().catch(e => {console.error('PREKICK_MONITOR_FAILED ' + e.stack); process.exitCode = 1;});
