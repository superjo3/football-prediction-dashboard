/* Mandatory latest-round display regression. Run from repository root: node tools/test_latest_high_odds.js */
'use strict';
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm'), assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const scripts=[...index.matchAll(/<script\s+src="([^"?]+)(?:\?[^"]*)?"/g)].map(x=>x[1]).filter(x=>/^latest-rounds-.*\.js$/.test(x));
assert.equal(scripts.length,1,'Expected exactly one active latest-round overlay');
const context={window:{FOOTBALL_DATA:{}}};
vm.runInNewContext(fs.readFileSync(path.join(root,scripts[0]),'utf8'),context,{filename:scripts[0]});
const w=context.window, rs=w.NEXT_ROUND_DATA;
assert.equal(new Set(rs.map(r=>r.league)).size,5,'Five leagues required');
function key(f,m){
 const p=String((m==='1X2'?f.one:f.ou)?.pick||'').toUpperCase();
 if(m==='1X2')return /主勝|^1$|^H$|^HOME$/.test(p)?'home':/客勝|^2$|^A$|^AWAY$/.test(p)?'away':/和|平|^X$|^D$|^DRAW$/.test(p)?'draw':null;
 return /大|^OVER|^O2/.test(p)?'over':/小|^UNDER|^U2/.test(p)?'under':null;
}
function expected(r){
 let total=0,known=0;
 for(const f of r.rows)for(const m of ['1X2','OU25']){
  const k=key(f,m),v=k?f.market?.[m]?.[k]:null;
  if(v!=null&&v!==''&&Number.isFinite(Number(v))&&Number(v)>1){known++;if(Number(v)>1.8)total++}
 }
 return {total,known};
}
function verify(r){
 const {total,known}=expected(r);
 const html=w.latestRoundView(r.record_id);
 assert.ok(html.includes('本輪預測方向賠率 &gt; 1.80'),r.league+' missing high-odds summary');
 const head=html.match(/(\d+) 筆超過1\.80；(\d+)\/(\d+) 筆預測方向有封存比較價/);
 assert.ok(head,r.league+' missing odds counts');
 assert.equal(Number(head[1]),total,r.league+' summary count');
 assert.equal(Number(head[2]),known,r.league+' known prices');
 assert.equal(Number(head[3]),r.rows.length*2,r.league+' market denominator');
 const list=html.split('<h2>本輪預測方向賠率 &gt; 1.80</h2>')[1].split('<h2>全輪預測及賠率</h2>')[0];
 assert.equal((list.match(/class="high-odds-badge"/g)||[]).length,total,r.league+' independent list count');
 const table=html.split('<h2>全輪預測及賠率</h2>')[1].split('<h2>各版本 R1／R2／R3</h2>')[0];
 assert.equal((table.match(/class="prediction-high-odds"/g)||[]).length,total,r.league+' prediction cell highlight count');
 return total;
}
for(const r of rs)console.log(r.league+' GW'+r.gw+': '+verify(r)+' high-odds entries PASS');
assert.equal((w.latestRoundsView().match(/<h3>預測方向賠率 &gt; 1\.80<\/h3>/g)||[]).length,5,'Missing overview lists');
// Boundary and nonselected-price regression: mutate in-memory copy only, never source files.
const r=rs[0],f=r.rows[0],old=f.market;
f.one={...f.one,pick:'主勝'};f.ou={...f.ou,pick:'大2.5'};
f.market={'1X2':{home:1.8,draw:9,away:8},OU25:{over:null,under:5},AH:null};
verify(r);
f.market={'1X2':{home:1.81,draw:9,away:8},OU25:{over:1.8001,under:5},AH:null};
verify(r);
f.market=old;
console.log('PASS: strict >1.80, missing values and non-selected prices; no source data mutated.');
