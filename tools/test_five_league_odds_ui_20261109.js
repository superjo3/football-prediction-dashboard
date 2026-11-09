'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const D=JSON.parse(fs.readFileSync('data/dashboard.json','utf8'));
const sandbox={window:{FOOTBALL_DATA:D},document:{querySelector:()=>null},console};
vm.createContext(sandbox);
for(const path of ['five-league-sync.js','market-prekick.js','epl-parity-tracks.js'])vm.runInContext(fs.readFileSync(path,'utf8'),sandbox,{filename:path});
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

const official=D.rounds.find(r=>r.league==='EPL'&&r.gw===11&&!r.research_only);
const research=D.rounds.find(r=>r.league==='EPL'&&r.gw===11&&r.id.includes('R90-RECOVERY-SHADOW'));
assert(official&&research,'Both original frozen records must remain');
sandbox.testRecordId=official.id;
const shadowRecord=get('eplShadowRecord(roundById.get(testRecordId))');
assert(shadowRecord&&shadowRecord.predictions.length===10,'Valid pregame Shadow must render');
const combined=get('eplParityOneTable(roundById.get(testRecordId),true)');
assert(combined.includes('A · Official 正式版')&&combined.includes('B · Recovery Shadow'),'Combined parity column headers missing');
assert((combined.match(/<tr>/g)||[]).length===11,'Combined parity view must have one header and ten fixture rows');
assert(combined.includes('Aston Villa vs Sunderland')&&combined.includes('Research／不計 Official'),'Missing per-fixture side-by-side content');
const pack=get('packageFor(testRecordId)');
let disagreements=0;
for(const f of pack.fixtures){
 const sr=shadowRecord.predictions.find(x=>x.match_id===f.match_id);
 assert(sr,'Shadow missing matching fixture');
 if(f.parity!==sr.direction)disagreements++;
}
assert.equal(disagreements,4,'Preserve the four archived disagreement fixtures');
sandbox.testFixture=pack.fixtures[3];
const different=get('eplParityComparisonCells(roundById.get(testRecordId),testFixture)');
assert.equal(different.directionA,'單');
assert.equal(different.directionB,'雙');
assert.equal(different.rankA,2);
const first=get('eplParityComparisonCells(roundById.get(testRecordId),packageFor(testRecordId).fixtures[0])');
assert.equal(first.directionA,'雙');
assert.equal(first.directionB,'雙');
assert(!combined.includes('NOT_RUN'),'Valid archived Shadow must not falsely display NOT_RUN');
sandbox.MyParity={panel:()=>'',cell:()=>''};
const fullPage=get('packagePage(testRecordId)');
assert(fullPage.includes('A · Official 單雙')&&fullPage.includes('B · Recovery Shadow 單雙'),'Official match page must show both in same table');
assert(fullPage.includes('賠率／變化'),'All-league odds column must remain');
sandbox.testShadowId=research.id;
assert.equal(get('eplOfficialRound(testShadowId).id'),official.id,'Shadow page should resolve to official combined record');
assert.equal(get("latest('EPL').id"),official.id,'EPL latest should select Official not Shadow');
assert.equal((D.official_forecasts||[]).filter(x=>x.record_id===official.id).length,1);
assert.equal((D.research_forecasts||[]).filter(x=>x.record_id===research.id).length,1);
console.log('PASS: EPL Official + Shadow single 10-row table; four disagreements; ranks; original records unchanged');

