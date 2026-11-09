'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const D=JSON.parse(fs.readFileSync('data/dashboard.json','utf8'));
const sandbox={window:{FOOTBALL_DATA:D},document:{querySelector:()=>null},console};
vm.createContext(sandbox);
for(const path of ['five-league-sync.js','market-prekick.js'])vm.runInContext(fs.readFileSync(path,'utf8'),sandbox,{filename:path});
const src=fs.readFileSync('app.js','utf8');
assert(src.includes("window.addEventListener('hashchange',render);render();"));
vm.runInContext(src.replace("window.addEventListener('hashchange',render);render();",""),sandbox,{filename:'app.js'});
function get(key,id){return vm.runInContext(key,sandbox)} 
const expected=[
 ['EPL',11,6,10,10,0],
 ['BUNDESLIGA',10,3,9,9,9],
 ['LALIGA',13,6,10,10,0],
 ['SERIEA',12,0,0,0,0],
 ['LIGUE1',11,0,0,0,0]
];
for(const [league,gw,high,n1,nou,nah] of expected){
 const round=D.rounds.find(r=>r.league===league&&r.gw===gw&&((league==='LALIGA'||league==='SERIEA')?r.research_only:!r.research_only));
 assert(round,league+' GW'+gw+' absent');
 sandbox.testRecordId=round.id;
 const p=get('packageFor(testRecordId)');
 assert(p&&p.fixtures.length,'Package/fixtures missing '+league);
 const f=p.fixtures;
 let one=0,over=0,ah=0;
 for(let i=0;i<f.length;i++){
  sandbox.testFixture=f[i];
  const cell=get('marketOddsCell(roundById.get(testRecordId),testFixture)');
  assert(cell.includes('PRE-KICK')&&cell.includes('1X2')&&cell.includes('O/U2.5')&&cell.includes('AH'),league+' missing unified UI');
  assert(!cell.includes('→'),league+' unexpectedly fabricated price movement');
  const opening=get("oddsSnapshot(oddsMarketRecord(roundById.get(testRecordId),testFixture),'open')");
  if(opening['1X2']?.home)one++;
  if(opening.OU25?.over)over++;
  if(opening.AH?.line_home!==undefined&&opening.AH?.line_home!==null)ah++;
 }
 assert.equal(one,n1,league+' 1X2 coverage');
 assert.equal(over,nou,league+' OU coverage');
 assert.equal(ah,nah,league+' AH coverage');
 sandbox.testFixtures=f;
 const html=get('marketHighOddsPanel(roundById.get(testRecordId),testFixtures)');
 assert(html.includes(high+' 筆超過門檻'),league+' >1.80 count mismatch');
 if(!n1)assert(html.includes('MISSING'),league+' missing odds should not look like zero odds');
}
const round=D.rounds.find(r=>r.league==='EPL'&&r.gw===11&&!r.research_only);
sandbox.testRecordId=round.id;
const f=get('packageFor(testRecordId).fixtures[0]');
sandbox.testFixture=f;
const snapshot={record_id:round.id,match_id:f.match_id,snapshot_type:'PRE_KICK',captured_at_utc:'2026-11-21T11:45:00Z',bookmaker:'single_test_book',source_url:'https://example.com/test',validated:true,comparable_to_open:true,odds:{'1X2':{home:1.52,draw:4.70,away:6.15},'OU25':{over:1.53,under:2.48},'AH':null}};
sandbox.window.FOOTBALL_PREKICK_SNAPSHOTS.snapshots.push(snapshot);
const changed=get('marketOddsCell(roundById.get(testRecordId),testFixture)');
assert(changed.includes('1.46 → 1.52')&&changed.includes('↑ +0.06'),'Valid prekick delta missing');
console.log('PASS: all five leagues, 1.80 counts, MISSING handling, validated PRE-KICK price movement');
