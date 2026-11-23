'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {teamsMatch, marketToOdds, chooseBook, snapshot, novig, fixtureFrom, buildAuditRow} = require('./prekick_t60_runner.js');
const now = new Date('2026-11-23T19:00:00Z');
const game = {id:'evt1',home_team:'Brentford',away_team:'Everton',commence_time:'2026-11-23T20:00:00Z',
  bookmakers:[{key:'pinnacle',title:'Pinnacle',last_update:'2026-11-23T18:59:00Z',
    markets:[
      {key:'h2h',last_update:'2026-11-23T18:59:00Z',outcomes:[
        {name:'Brentford',price:2.1},{name:'Draw',price:3.2},{name:'Everton',price:3.8}]},
      {key:'totals',last_update:'2026-11-23T18:59:00Z',outcomes:[
        {name:'Over',point:2.5,price:1.9},{name:'Under',point:2.5,price:1.95},
        {name:'Over',point:3.5,price:2.5}]},
      {key:'spreads',last_update:'2026-11-23T18:59:00Z',outcomes:[
        {name:'Brentford',point:-0.25,price:1.83},{name:'Everton',point:0.25,price:2.03}]}
    ]}]};
const fixture = fixtureFrom({fixture_id:'test',league:'EPL',home:'Brentford',away:'Everton',kickoff_at_utc:'2026-11-23T20:00:00Z'});
test('exact team normalization preserves direction',()=> {
  assert.equal(teamsMatch('AC Monza','Fiorentina','Monza','Fiorentina'), true);
  assert.equal(teamsMatch('Brentford','Everton','Everton','Brentford'), false);
});
test('fixture due is exactly 60 minutes before kickoff',()=> {
  assert.equal(fixture.t60_due_at_utc,'2026-11-23T19:00:00.000Z');
  assert.equal(buildAuditRow(fixture,now,'PENDING').minutes_to_kickoff,60);
});
test('parses source timestamps, exact OU2.5 and handicap line',()=> {
  const b=marketToOdds(game.bookmakers[0],game.home_team,game.away_team,now);
  assert.equal(b.complete,true);
  assert.deepEqual(b.missing,[]);
  assert.equal(b.odds.OU25.over,1.9);
  assert.equal(b.odds.AH.line_home,-0.25);
  assert.equal(b.odds['1X2'].draw,3.2);
});
test('does not claim provider spreads as verified Asian Handicap',()=> {
  const b=chooseBook(game,now);
  const s=snapshot(fixture,game,b,now,'https://api.the-odds-api.com/v4/sports/soccer_epl/odds');
  assert.equal(s.status,'PARTIAL_ODDS');
  assert.equal(s.validated,false);
  assert.ok(s.missing_markets.includes('AH.ASIAN_HANDICAP_MARKET_TYPE_UNVERIFIED'));
  assert.equal(s.minutes_to_kickoff,60);
  assert.ok(!JSON.stringify(s).includes('apiKey'));
});
test('rejects stale book updates for full validation',()=> {
  const g=structuredClone(game);
  for(const m of g.bookmakers[0].markets)m.last_update='2026-11-23T18:10:00Z';
  const b=chooseBook(g,now);
  assert.equal(b.complete,false);
  assert.equal(b.stale.length,3);
});
test('never promotes missing total to complete',()=> {
  const g=structuredClone(game);
  g.bookmakers[0].markets.splice(1,1);
  const b=chooseBook(g,now);
  const s=snapshot(fixture,g,b,now,'https://the-odds-api.com/');
  assert.equal(s.status,'PARTIAL_ODDS');
  assert.ok(s.missing_markets.includes('OU25.over'));
});
test('vig removal uses normalized inverse odds',()=> {
  const p=novig([2,3,4]); assert.ok(Math.abs(p.reduce((a,b)=>a+b,0)-1)<.00002);
});
