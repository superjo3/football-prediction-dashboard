'use strict';
const D=window.FOOTBALL_DATA;
const $=s=>document.querySelector(s);
const esc=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const M={'1x2':'1X2 勝和負',ou25:'全場大小 2.5',parity:'全場單雙'};
const names=Object.fromEntries(D.leagues.map(l=>[l.id,l.name]));
let homeLeague='EPL';
const roundById=new Map(D.rounds.map(r=>[r.id,r]));
const resultByKey=new Map(D.results.map(r=>[r.record_id+'|'+r.match_id,r]));
function result(p){return resultByKey.get(p.record_id+'|'+p.match_id)}
function actual(p,m){const r=result(p);if(!r?.score)return null;const [h,a]=r.score;return m==='1x2'?(h>a?'主勝':h<a?'客勝':'和'):m==='ou25'?(h+a>2?'大':'小'):((h+a)%2?'單':'雙')}
function hit(p,m){return p.directions[m]&&actual(p,m)!==null?p.directions[m]===actual(p,m):null}
function effective(rid,version='base'){
 const ps=D.predictions.filter(p=>p.record_id===rid).map(p=>({...p,ranks:{...p.ranks},directions:{...p.directions}}));
 for(const u of D.updates.filter(u=>u.record_id===rid))for(const x of u.rank_additions||[]){const p=ps.find(p=>p.match_id===x.match_id);if(p)p.ranks[x.market]=x.rank;}
 const u=D.updates.find(u=>u.record_id===rid&&u.id===version&&u.selectable);
 if(u)for(const [m,ids] of Object.entries(u.rank_overrides||{})){ps.forEach(p=>p.ranks[m]=null);ids.forEach((mid,i)=>{const p=ps.find(p=>p.match_id===mid);if(p)p.ranks[m]=i+1})}
 return ps;
}
function calc(ps,m,rank=null){let h=0,n=0;for(const p of ps){if(rank!==null&&p.ranks[m]!==rank)continue;const v=hit(p,m);if(v!==null){h+=Number(v);n++}}return {h,n,kind:'逐場核算'}}
function rstats(r,m,rank=null,version='base'){
 const s=calc(effective(r.id,version),m,rank);
 if(rank===null){const q=D.market_reports.find(q=>q.record_id===r.id&&q.market===m);if(q&&q.n>s.n)return {h:q.hits,n:q.n,kind:'來源結算摘要',source:q.source,detail:s}}
 return s;
}
function stats(league,m,rank=null,model=''){
 let h=0,n=0,summaryN=0;const rs=D.rounds.filter(r=>r.league===league&&!r.research_only&&(!model||r.model===model));
 for(const r of rs){const s=rstats(r,m,rank);h+=s.h;n+=s.n;if(s.kind==='來源結算摘要')summaryN+=s.n;}
 if(!model&&rank===null)for(const q of D.market_reports.filter(q=>q.league===league&&q.market===m&&!q.record_id)){h+=q.hits;n+=q.n;summaryN+=q.n;}
 if(!model&&rank!==null)for(const q of D.rank_summaries.filter(q=>q.league===league&&q.market===m)){if(q.hits[rank]!==undefined){h+=q.hits[rank];n+=q.sample_each;summaryN+=q.sample_each}}
 return {h,n,summaryN};
}
const rate=s=>s.n?(100*s.h/s.n).toFixed(1)+'%':'—';
function stattext(s){return `${rate(s)} <span class="muted">${s.n?`${s.h}/${s.n}`:'無已結算樣本'}</span>${s.kind==='來源結算摘要'?'<span class="outcome ambertext">摘要</span>':''}`}
function badge(s,c=''){return `<span class="badge ${c}">${esc(s)}</span>`}
function source(r){return r?`<a class="source" href="#source/${r.version}/${r.start_line}">Master v${r.version} · L${r.start_line}–${r.end_line} ↗</a>`:''}
function table(headers,rows){return `<div class="tablewrap"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}
function heading(k,h,sub,action=''){return `<div class="heading"><div><p class="eyebrow">${k}</p><h1>${h}</h1><p class="sub">${sub}</p></div>${action}</div>`}
const getLeague=id=>D.leagues.find(l=>l.id===id);
const leagueOptions=chosen=>D.leagues.map(l=>`<option value="${l.id}" ${l.id===chosen?'selected':''}>${l.name} · ${l.english}</option>`).join('');
function latest(id){const rid=D.LATEST_RESEARCH?.[id]||D.LATEST_BY_LEAGUE?.[id];if(rid)return roundById.get(rid);return D.rounds.filter(r=>r.league===id).sort((a,b)=>b.gw-a.gw)[0]}
function versions(rid){return D.updates.filter(u=>u.record_id===rid&&u.selectable)}
function latestLink(r){if(packageFor(r.id))return '#round/'+r.id;const u=versions(r.id).at(-1);return '#round/'+r.id+(u?'/'+u.id:'')}
function roundStatus(r){
 const p=packageFor(r.id), ps=effective(r.id);
 const scored=ps.filter(x=>Array.isArray(result(x)?.score)&&result(x).score.length===2).length;
 const excluded=ps.filter(x=>result(x)?.status==='ABANDONED').length;
 const total=p?.fixtures?.length||ps.length;
 const report=p?.results||p?.result_summary||p?.settlement||{};
 const hasResults=scored>0||D.market_reports.some(q=>q.record_id===r.id);
 const complete=total>0&&scored+excluded===total;
 const review=D.reviews.some(v=>v.record_id===r.id&&!['PREMATCH_AUDIT','MODEL_POLICY'].includes(v.type))||p?.postmatch_review?.status==='COMPLETE'||p?.review?.state==='COMPLETE';
 const label=(r.research_only?'Research · ':'')+(complete?'RESULT · SETTLEMENT_COMPLETE':scored?'RESULT · PARTIAL':p?'OPEN / PRE-KICK':hasResults?'RESULT 部分摘要':'OPEN');
 return {scored,excluded,total,hasResults,label,review,prekick:D.updates.some(u=>u.record_id===r.id&&u.type==='PRE-KICK')||!!p?.pre_kick_status&&!['PENDING','NOT_FOUND_NOT_SETTLED','NOT_FOUND'].includes(p.pre_kick_status)};
}
function cards(id,round=null,version='base',model=''){return `<div class="grid kpis">${Object.entries(M).map(([m,label])=>{const s=round?rstats(round,m,null,version):stats(id,m,null,model);return `<div class="card"><span class="muted">${label}</span><div class="metric">${rate(s)} <small>${s.h} / ${s.n}</small></div><div class="muted">${round?(s.kind==='來源結算摘要'?`來源結算摘要 · 逐場可核 ${s.detail.h}/${s.detail.n}`:'本輪可核對樣本'):`${names[id]} · 可用封存結算${s.summaryN?'（含摘要'+s.summaryN+'筆）':''}`}</div><div class="bar"><i style="width:${s.n?100*s.h/s.n:0}%"></i></div></div>`}).join('')}</div>`}
function ranktable(id,model=''){return table(['市場','R1 累計','R2 累計','R3 累計'],Object.entries(M).map(([m,l])=>[l,...[1,2,3].map(n=>stattext(stats(id,m,n,model)))]))}
function historical(id){const rows=D.historical_totals.filter(t=>t.league===id);return !rows.length?'':`<details><summary>Master 報告的歷史累計（獨立對照，不與上表相加）</summary><div class="panel">${table(['市場／範圍','全場','R1','R2','R3','來源'],rows.map(t=>[M[t.market]+`<div class="muted">${esc(t.scope)}</div><div class="tiny">${esc(t.note)}</div>`,t.n?stattext({h:t.hits,n:t.n}):'未列全場累計',...[1,2,3].map(k=>t.ranks[k]?stattext({h:t.ranks[k][0],n:t.ranks[k][1]}):'未列'),source(t.source)]))}<p class="muted">上方重算採已匯入的逐場資料與明示輪次摘要。此處完整保留原文累計，其涵蓋範圍可能較大；不倒推缺失場次。</p></div></details>`}
function recent(id){const top=latest(id)?.gw||0;return `<div class="panel"><h2>最近 5 輪 <span class="muted">${names[id]} · GW${Math.max(1,top-4)}–${top}</span></h2>${table(['輪次','1X2','大小2.5','單雙','資料狀態'],Array.from({length:Math.min(5,top)},(_,i)=>top-4+i).filter(gw=>gw>0).map(gw=>{const r=D.rounds.find(r=>r.league===id&&r.gw===gw);return [r?`<a class="good" href="${latestLink(r)}">GW${gw} →</a>`:'GW'+gw,...Object.keys(M).map(m=>{if(r)return stattext(rstats(r,m));const q=D.market_reports.find(q=>q.league===id&&q.gw===gw&&q.market===m&&!q.record_id);return q?stattext({h:q.hits,n:q.n,kind:'來源結算摘要'}):'—'}),r?badge(roundStatus(r).label,roundStatus(r).hasResults?'':'gray'):D.rank_summaries.some(s=>s.league===id&&s.gw===gw)?badge('R位摘要','gray'):badge('未收錄','gray')]}))}<p class="muted">未收錄／未結算不當0%；摘要與逐場計算有不同涵蓋範圍。</p></div>`}
function home(){return heading('FIVE LEAGUES / RESEARCH WORKSPACE','每一輪，都有跡可循。','五大聯賽已接入 · 原始預測、盤前更新、賽果與檢討分層保存。')+`<div class="grid leaguegrid">${D.leagues.map(l=>{const rs=D.rounds.filter(r=>r.league===l.id),r=latest(l.id);return `<a class="leaguecard" href="#league/${l.id}"><div class="code">${l.id}</div><strong>${l.name} <span class="muted">↗</span></strong>${badge(rs.length+'輪逐場')}<div class="muted">最新 GW${r.gw} · ${esc(roundStatus(r).label)}</div>${packageCard(r.id)}</a>`}).join('')}</div><div class="panel"><div class="heading"><h2>五大聯賽累計表現</h2>${badge('已匯入範圍 · 跨歷代版本','gray')}</div>${table(['聯賽','1X2','大小2.5','單雙','最新一輪'],D.leagues.map(l=>[esc(l.name),...Object.keys(M).map(m=>stattext(stats(l.id,m))),`<a class="good" href="${latestLink(latest(l.id))}">GW${latest(l.id).gw} →</a>`]))}<p class="muted">只累計已匯入逐場與明示的輪次結算摘要；不等於所有歷史輪次，亦非單一模型勝率。原文更長期累計可在各聯賽頁獨立查閱。</p></div><div class="filters"><label for="homeleague">查看聯賽</label><select id="homeleague">${leagueOptions(homeLeague)}</select></div><div id="homebody"></div>`}
function homebody(){const id=homeLeague,r=latest(id);$('#homebody').innerHTML=MyParity.panel(personalContexts(),'我的單雙累計命中率')+packageSummary(r.id)+cards(id)+`<div class="panel"><h2>${names[id]} · R1 / R2 / R3 已匯入累計</h2>${ranktable(id)}<p class="muted">原始版＋賽前R3補充為預設統計基準；更新版另比較，單輪不重複累加。候補R3不計。法甲R位為原文相對排名，非80%精選。</p></div>`+recent(id)+`<div class="heroaside"><h2>${names[id]}最新紀錄 · GW${r.gw}</h2><p>${esc(r.note)}</p><a href="${latestLink(r)}">查看最新版本 →</a></div>`+historical(id);bindPersonal()}
function league(id){const l=getLeague(id);if(!l)return empty();const rs=D.rounds.filter(r=>r.league===id);return heading(l.english,names[id]+' · 賽季檔案','2026–27 · 保存已收錄原始版本；新舊模型分欄、候補與正式R位分開。',`<a class="button primary" href="${latestLink(latest(id))}">最新 GW${latest(id).gw} →</a>`)+D.audit_notes.filter(n=>n.league===id&&!(n.message.includes('GW8無逐場Record')&&rs.some(r=>r.gw===8))).map(n=>`<div class="notice">${esc(n.message)} ${source(n.source)}</div>`).join('')+`<div class="filters"><label>賽季 <select id="seasonfilter"><option>2026-27</option></select></label><label>模型版本 <select id="modelfilter"><option value="">歷代紀錄（跨版本）</option>${[...new Set(rs.map(r=>r.model))].map(m=>`<option>${esc(m)}</option>`).join('')}</select></label><label>輪次 <select id="gwfilter"><option value="">全部輪次</option>${[...new Set([...rs.map(r=>r.gw),...D.rank_summaries.filter(s=>s.league===id).map(s=>s.gw),...D.market_reports.filter(s=>s.league===id).map(s=>s.gw)])].sort((a,b)=>a-b).map(g=>`<option>${g}</option>`).join('')}</select></label><label>狀態 <select id="statefilter"><option value="">全部狀態</option><option>OPEN</option><option>PRE-KICK</option><option>RESULT</option><option>REVIEW</option></select></label></div><div id="leaguebody"></div>`}
function leaguebody(id){const gw=$('#gwfilter').value,model=$('#modelfilter').value,st=$('#statefilter').value;let rs=D.rounds.filter(r=>r.league===id&&(!model||r.model===model)&&(!gw||r.gw===+gw)).sort((a,b)=>b.gw-a.gw);rs=rs.filter(r=>{const s=roundStatus(r);return !st||st==='OPEN'&&!s.hasResults||st==='RESULT'&&s.hasResults||st==='PRE-KICK'&&s.prekick||st==='REVIEW'&&s.review});let rows=rs.map(r=>{const s=roundStatus(r);return [`<a class="good" href="#round/${r.id}"><strong>GW${r.gw} →</strong></a><div class="tiny">${versions(r.id).length?'含獨立更新版':''}</div>`,esc(r.snapshot),`<span class="mini">${esc(r.model)}</span>`,badge(s.label,s.hasResults?'':'gray')+' '+(s.review?badge('REVIEW'):'')+' '+badge(s.prekick?'PRE-KICK':'PRE-KICK 缺','gray'),...Object.keys(M).map(m=>stattext(rstats(r,m))),[1,2,3].map(n=>`R${n} ${stattext(rstats(r,'parity',n))}`).join('<br>')]});if(!model&&(!st||st==='RESULT')){const known=new Set(D.rounds.filter(r=>r.league===id).map(r=>r.gw));const gs=[...new Set([...D.rank_summaries,...D.market_reports].filter(q=>q.league===id&&!known.has(q.gw)&&(!gw||q.gw===+gw)).map(q=>q.gw))].sort((a,b)=>b-a);for(const g of gs){const q=D.rank_summaries.find(q=>q.league===id&&q.gw===g);rows.push(['GW'+g,'僅來源摘要','逐場資料未收錄',badge('RESULT 摘要','gray'),...Object.keys(M).map(m=>{const a=D.market_reports.find(a=>a.league===id&&a.gw===g&&a.market===m);return a?stattext({h:a.hits,n:a.n}):'—'}),q?Object.entries(q.hits).map(([k,h])=>`R${k} ${h}/1`).join(' · ')+'<br>'+source(q.source):'—'])}}
$('#leaguebody').innerHTML=cards(id,null,'base',model)+`<div class="panel"><h2>輪次封存</h2>${rows.length?table(['GW','版本','模型','狀態','1X2','大小','單雙','單雙R位'],rows):'<div class="empty">沒有符合條件的紀錄。缺失快照不會補造。</div>'}</div><div class="panel"><h2>已匯入 R1 / R2 / R3 累計</h2>${ranktable(id,model)}<p class="muted">此處依模型篩選；不隨輪次／狀態篩選改變累計。不同歷代模型合計只表示封存軌跡，不能當成單一模型能力。</p></div>`+historical(id)+recent(id)}
function raw(s){return `<details><summary>${esc(s.title)}　${source(s.source)}</summary><pre class="raw">${esc(s.text)}</pre></details>`}
function sourceSection(r){return D.source_sections.find(s=>s.source.version===r.version&&s.source.start_line<=r.start_line&&s.source.end_line>=r.start_line)}
function round(id,version='base'){if(packageFor(id))return packagePage(id);const r=roundById.get(id);if(!r)return empty();const st=roundStatus(r),u=D.updates.find(u=>u.id===version&&u.record_id===id);return heading(`${r.league} / 2026–27 / MATCHWEEK ${r.gw}`,`${names[r.league]} 第 ${r.gw} 輪`,`${esc(r.model)}<br><span class="tiny">${esc(r.id)}</span>`,`<a class="button" href="#league/${r.league}">← 返回${names[r.league]}</a>`)+`<div class="notice">${esc(r.note)} ${source(r.source)}</div><div class="filters"><label for="versionfilter">預測版本</label><select id="versionfilter"><option value="base" ${version==='base'?'selected':''}>${r.coverage==='recovered'?'恢復版（XUAN更新後）':'原始版＋賽前R3補充'}</option>${versions(id).map(u=>`<option value="${u.id}" ${version===u.id?'selected':''}>${esc(u.label)}</option>`).join('')}</select>${u?badge(u.type,'amber'):badge(r.snapshot,'gray')}</div>${u?`<div class="notice">目前顯示 ${esc(u.label)}，原始預測未變更。${source(u.source)} ${esc(u.status||'')}</div>`:''}<div class="timeline"><span class="stage done">${r.coverage==='recovered'?'恢復紀錄':'OPEN'} · ${esc(r.snapshot)}</span><span class="stage ${st.prekick?'done':'missing'}">PRE-KICK · ${st.prekick?'已收錄':'缺失'}</span><span class="stage ${st.hasResults?'done':'missing'}">RESULT · ${st.hasResults?`${st.scored}/${st.total}筆比分${st.excluded?'，另'+st.excluded+'場排除':''}`:'待結算'}</span><span class="stage ${st.review?'done':'missing'}">REVIEW · ${st.review?'已追加':'未收錄'}</span></div>`+cards(r.league,r,version)+`<div class="panel"><h2>本版本三市場 R1 / R2 / R3</h2>${selectionTable(id,version)}</div>${bundesligaOddsPanel(r,effective(id,version))}<div class="tabs" role="group" aria-label="詳情類別">${[['matches','比賽與命中'],['predictions','原始預測'],['updates','盤前更新／盤口'],['results','正式賽果'],['reviews','賽後檢討／修正']].map(([v,n],i)=>`<button data-tab="${v}" class="${i===0?'selected':''}">${n}</button>`).join('')}</div><div id="roundbody"></div>`}
function selectionTable(id,version){const ps=effective(id,version);return table(['市場','R1','R2','R3'],Object.entries(M).map(([m,label])=>[label,...[1,2,3].map(rank=>{const p=ps.find(p=>p.ranks[m]===rank);if(!p)return '未正式封存';const h=hit(p,m);return `<strong>${esc(p.fixture)}</strong><br>${esc(p.directions[m])} ${h===null?badge('待結算','gray'):badge(h?'命中':'未中',h?'':'amber')}`})]))}
function renderTextTable(text){const ls=text.split('\n');let out='',i=0;while(i<ls.length){if(ls[i].startsWith('|')){const rows=[];while(i<ls.length&&ls[i].startsWith('|')){const l=ls[i++];if(!/^\|[-: |]+\|$/.test(l))rows.push(l.trim().replace(/^\||\|$/g,'').split('|').map(x=>esc(x.replaceAll('**','').replaceAll('`','').trim())))}out+=table(rows[0]||[],rows.slice(1));}else{const chunk=[];while(i<ls.length&&!ls[i].startsWith('|'))chunk.push(ls[i++]);out+=`<pre class="raw textblock">${esc(chunk.join('\n'))}</pre>`}}return out}
function roundbody(id,version,tab='matches'){
 const r=roundById.get(id),ps=effective(id,version);let html='';
 if(tab==='matches')html=`<div class="filters"><input id="fixturefilter" aria-label="搜尋球隊" placeholder="搜尋球隊…"><label><input id="rankonly" type="checkbox" style="min-width:0"> 只看本版本 R1 / R2 / R3</label></div><div id="personal-round-summary">${MyParity.panel(personalContexts().filter(c=>c.record_id===id),'我的本輪單雙命中率')}</div><div id="matches"></div>`;
 if(tab==='predictions'){html=`<div class="notice">以下只讀原始預測層。後來R3補充與順位修正存於盤前更新，從不回寫此表。${source(r.source)}</div>`+table(['場次',...Object.values(M),'原始R位'],D.predictions.filter(p=>p.record_id===id).map(p=>[esc(p.fixture),...Object.keys(M).map(m=>esc(p.directions[m]||'未收錄原始方向')),esc(Object.entries(p.ranks).filter(x=>x[1]).map(([m,n])=>M[m]+' R'+n).join(' / '))]))+raw(sourceSection(r.source));}
 if(tab==='updates'){
  const us=D.updates.filter(u=>u.record_id===id);html=`<div class="notice">MID／MARKETUPDATE／二次審計不是 T-1h PRE-KICK。缺少同源快照時，不生成正式 OPEN→PRE-KICK 命中統計。</div>`;
  html+=us.map(u=>`<div class="panel"><h2>${esc(u.label||u.type)} · ${esc(u.recorded_at)}</h2>${source(u.source)}${u.selectable?`<p><a class="button" href="#round/${id}/${u.id}">切換至這個版本 →</a></p>`:''}${u.rank_additions?table(['賽前新增','市場','順位'],u.rank_additions.map(x=>[esc(ps.find(p=>p.match_id===x.match_id)?.fixture),M[x.market],'R'+x.rank])):''}${u.rank_overrides?table(['市場','原始版R1/R2/R3','更新版R1/R2/R3'],Object.keys(u.rank_overrides).map(m=>[M[m],[1,2,3].map(k=>effective(id).find(p=>p.ranks[m]===k)?.fixture||'未列').map(esc).join('<br>'),u.rank_overrides[m].map(mid=>esc(ps.find(p=>p.match_id===mid)?.fixture)).join('<br>')])):''}${u.text?renderTextTable(u.text):''}</div>`).join('');
  if(!us.length)html+='<div class="empty">沒有獨立盤前更新；原始Record的市場背景保留如下。</div>';
  html+=raw(sourceSection(r.source));
 }
 if(tab==='results')html=`<div class="panel">${table(['比賽','比分','1X2實際','大小實際','單雙實際','來源'],ps.map(p=>[esc(p.fixture),result(p)?.score?result(p).score.join(' – '):result(p)?.status==='ABANDONED'?'腰斬／排除':'未收錄',...Object.keys(M).map(m=>actual(p,m)||'—'),result(p)?source(result(p).source):'—']))}</div>`;
 if(tab==='reviews'){const vs=D.reviews.filter(v=>v.record_id===id);html=vs.map(v=>`<div class="panel"><h2>${esc(v.title||'賽後檢討與修正建議')}</h2>${badge(v.type==='PREMATCH_AUDIT'?'賽前審計，非賽後檢討':'追加紀錄 · 不回改預測','amber')} ${source(v.source)}${renderTextTable(v.text)}</div>`).join('')||'<div class="empty">未收錄獨立檢討。</div>';}
 $('#roundbody').innerHTML=html;
 if(tab==='matches'){matchtable(id,version);$('#fixturefilter').oninput=()=>matchtable(id,version);$('#rankonly').onchange=()=>matchtable(id,version)}
}
function matchtable(id,version){let ps=effective(id,version);const q=$('#fixturefilter').value.trim();if(q)ps=ps.filter(p=>p.fixture.includes(q));if($('#rankonly').checked)ps=ps.filter(p=>Object.values(p.ranks).some(Boolean));const r=roundById.get(id),headers=r?.league==='BUNDESLIGA'?['比賽','最終比分',...Object.values(M),'賠率／盤口','我的單雙']:['比賽','最終比分',...Object.values(M),'我的單雙'];$('#matches').innerHTML=`<div class="panel">${ps.length?table(headers,ps.map(p=>{const row=[`<div class="match"><strong>${esc(p.fixture)}</strong><div class="tiny muted">${p.match_id}</div></div>`,`<span class="score">${result(p)?.score?result(p).score.join(' – '):result(p)?.status==='ABANDONED'?'腰斬':'—'}</span>`,...Object.keys(M).map(m=>{const v=hit(p,m),reported=D.reported_predictions.find(x=>x.match_id===p.match_id&&x.record_id===id)?.directions[m];return `<div class="resultcell">${esc(p.directions[m]||'未收錄原始方向')}${p.ranks[m]?`<span class="ranktag">R${p.ranks[m]}</span>`:''}<span class="outcome ${v===true?'good':v===false?'bad':'muted'}">${v===null?result(p)?.status==='ABANDONED'?'排除統計':'— 無逐筆結算':`${v?'✓ 命中':'× 未中'} · 實際 ${actual(p,m)}`}</span>${!p.directions[m]&&reported?`<span class="outcome ambertext">結算追述：${esc(reported)}<br>另存，未倒填預測</span>`:''}${p.market_status?.[m]?`<span class="outcome muted">${esc(p.market_status[m])}</span>`:''}</div>`})];if(r?.league==='BUNDESLIGA')row.push(bundesligaOddsCell(r,p));row.push(MyParity.cell(personalContext(r,p)));return row})):'<div class="empty">沒有符合的場次。</div>'}<p class="muted">缺原始預測或賠率的欄位不反推；歷史未保存的賠率一律標 MISSING。</p></div>`;bindPersonal();}
function research(){return heading('PARITY RESEARCH LAB','單雙研究室','五大聯賽分開查看 · 來源封存摘要，非本次重新回測。')+`<div class="notice">英超Exact與四聯賽Common Proxy分開。其他聯賽未有Exact資料時明示缺口，不能以Proxy冒充。</div><div class="filters"><label>聯賽 <select id="researchleague">${leagueOptions('EPL')}</select></label><label>模型 <select id="researchmodel"><option value="">全部模型</option></select></label><label>賽季 <select id="researchseason"><option value="">全部賽季</option></select></label></div><div id="researchtable"></div>`}
function researchFilters(){const id=$('#researchleague').value,rows=D.research.filter(r=>(r.league||'EPL')===id);$('#researchmodel').innerHTML='<option value="">全部模型</option>'+[...new Set(rows.map(r=>r.model))].map(m=>`<option>${esc(m)}</option>`).join('');$('#researchseason').innerHTML='<option value="">全部賽季</option>'+[...new Set(rows.map(r=>r.season))].sort().map(s=>`<option>${esc(s)}</option>`).join('');researchtable()}
function researchtable(){const id=$('#researchleague').value,m=$('#researchmodel').value,s=$('#researchseason').value;const rows=D.research.filter(r=>(r.league||'EPL')===id&&(!m||r.model===m)&&(!s||r.season===s));$('#researchtable').innerHTML=(id==='EPL'?'<div class="notice"><strong>R90 V1 第三階段來源稽核｜Research only</strong> · 檢查 21 份 ZIP（19 份不同封存），未找到原始英超方向及 Q 模型權重；251 欄 Exact 矩陣只存 152 筆舊 R1 身份，其他候選缺原始 Q。原 R90 未能精確重跑；不更動 Official。<a href="https://github.com/superjo3/football-prediction-dashboard/blob/main/research/R90_V1_Stage3_Recovery_Report_20261109.md" target="_blank" rel="noopener noreferrer">查看來源稽核</a></div>':'')+(id==='EPL'?'<div class="notice"><strong>舊 R90 V1：歷史輸出找回，模型權重尚缺</strong> · 復原 2022–25 共 114 輪、228 筆 R1/R2；R1 84/114（73.7%）、R2 68/114（59.6%），2024–25 R1＋R2 55/76（72.4%）。原 R1 與另一封存 114/114 場核對一致；新版模仿選場未達 Exact，缺原始方向權重與 Q 係數。同輪時間戳尚待驗證，Official 不變。<a href="https://github.com/superjo3/football-prediction-dashboard/blob/main/research/R90_V1_Recovery_Research_Report_20261109.md" target="_blank" rel="noopener noreferrer">查看恢復稽核</a></div>':'')+(id==='EPL'?'<div class="notice"><strong>V14 方向重建｜Research、未升級</strong> · 11 季 4,180 場；2025–26 同場全輪 V13 183/380（48.2%），V14 驗證期選出方法 177/380（46.6%），R1＋R2 34/76 vs 38/76（不同選場）。其餘候選最佳 41/76，但沒有統計顯著改善。此季已被先前研究看過，不是新盲測；Official 不變。<a href="https://github.com/superjo3/football-prediction-dashboard/blob/main/research/EPL_Parity_V14_Distribution_Report_20261109.md" target="_blank" rel="noopener noreferrer">V14 完整報告</a></div>':'')+(id==='EPL'?'<div class="notice"><strong>V12 vs V13 同場檢驗｜未升級</strong> · 2025–26 相同 76 場：V12 37/76（48.7%）、V13 39/76（51.3%）；嚴格時間 62 場：27/62 vs 28/62。差異不顯著。V13 R1＋R2 34/76（44.7%），信心排名缺乏辨識力。<a href="https://github.com/superjo3/football-prediction-dashboard/blob/main/research/EPL_Parity_V12_V13_Paired_Report_20261109.md" target="_blank" rel="noopener noreferrer">完整同場研究報告</a>（Research，非 Official）</div>':'')+(id==='EPL'?'<div class="notice"><strong>V13 完整歷史研究 · 不升級</strong>｜11 季 4,180 場；2025–26 保留季全輪 183/380（48.2%），R1＋R2 34/76（44.7%）。勝出研究模型未超越基準；Official 不變。<a href="https://github.com/superjo3/football-prediction-dashboard/blob/main/research/EPL_Parity_V13_FullHistory_Report_20261109.md" target="_blank" rel="noopener noreferrer">查看 V13 稽核報告</a></div>':'')+(id!=='EPL'?`<div class="notice">${names[id]} XUAN-R1 Exact：N/A，缺完整73欄；以下為Common Proxy／Native。CONFIRM、AGAINST與PASS只列合併期間，不補造分季。</div>`:'')+`<div class="panel">${rows.length?table(['模型','賽季','樣本','命中率','用途／限制','來源'],rows.map(r=>[esc(r.model),esc(r.season),r.n,stattext({h:r.hits,n:r.n}),esc(r.scope),source(r.source)])):'<div class="empty">沒有此條件的封存統計。</div>'}</div>`+(id==='EPL'?'<div class="notice">CONFIRM／AGAINST／無訊號分組共74筆，與76筆總樣本有2筆未說明的缺口；不自行補造分類。PASS漂亮數字屬探索性，不等同正式前推能力。</div>':'')+D.source_sections.filter(x=>x.source.version===56&&(id==='EPL'?x.title.includes('EPL 單雙玄學'):x.title.startsWith('Research Result｜CROSS-LEAGUE'))).map(raw).join('')}
function cross(){return heading('CROSS-LEAGUE-PARITY-XUAN-V1','跨聯賽，經得起驗證嗎？','固定方向，只比較選場。Exact與Proxy分開，原有正式模型保持獨立。')+`<div class="notice"><strong>跨聯賽泛化：未通過升級。</strong> 四聯賽Exact尚未驗證；Proxy總淨增益 −2，不足以升級。</div><div class="grid kpis"><div class="card"><div class="muted">英超 Exact · 兩季</div><div class="metric">+2 <small>淨增益</small></div><div class="muted">52/76 → 54/76</div></div><div class="card"><div class="muted">四聯賽 Common Proxy</div><div class="metric">−2 <small>淨增益</small></div><div class="muted">205/394 → 203/394</div></div><div class="card"><div class="muted">跨聯賽 Exact 狀態</div><div class="metric" style="font-size:25px">尚未驗證</div><div class="muted">缺完整73個底層欄位</div></div></div><div class="panel">${table(['聯賽／期間','研究線','BASE','XUAN','改場','救回','害掉','淨增益'],D.cross_league.map(r=>[names[r.league]+`<div class="tiny muted">${esc(r.seasons)}</div>`,badge(r.line,r.line==='Exact'?'':'amber'),stattext({h:r.base[0],n:r.base[1]}),stattext({h:r.xuan[0],n:r.xuan[1]}),r.changed,r.rescued,r.harmed,`<strong class="${r.net>0?'good':'bad'}">${r.net>0?'+':''}${r.net}</strong><br>${source(r.source)}`]))}</div><div class="panel"><h2>四聯賽 Proxy 分季結果</h2>${table(['聯賽','賽季','BASE','XUAN_PROXY','淨差','Native R1'],D.cross_seasons.map(r=>r.map(esc)))}</div>`+D.source_sections.filter(s=>s.source.version===56&&s.title.includes('CROSS-LEAGUE-PARITY-XUAN-V1')).map(raw).join('')}
function archive(){return heading('SOURCE OF TRUTH','正式歷史來源','Master v55、v56與v57均保留原始檔；新版追加資料，不覆寫舊快照。')+`<div class="filters"><input id="sourcesearch" placeholder="搜尋Record、聯賽、研究或關鍵字" aria-label="搜尋來源"><select id="sourceversion" aria-label="來源版本"><option value="57">Master v57（最新）</option><option value="56">Master v56</option><option value="55">Master v55（第一版）</option></select><a class="button" href="source/R1_R2_Master_v57.md" download>下載Master v57</a></div><div id="sourcelist"></div>`}
function sourcelist(){const q=$('#sourcesearch').value.toLowerCase(),v=+$('#sourceversion').value;$('#sourcelist').innerHTML=D.source_sections.filter(s=>s.source.version===v&&s.text.toLowerCase().includes(q)).map(raw).join('')||'<div class="empty">找不到相符段落。</div>'}
function about(){return heading('DATA CONTRACT / V2','保留歷史，讓新紀錄接續。','HTML / CSS / JavaScript + JSON · 本機開啟 · 無需後端')+`<div class="panel"><h2>資料層與統計口徑</h2>${table(['資料','用途','規則'],[['predictions.json','原始賽前方向／原始順位','保留v1條目，追加四聯賽'],['updates.json','R3追加、MARKETUPDATE、二次審計','新ID；順位覆蓋只在所選版本的畫面套用'],['results.json','比分／腰斬','腰斬不計；缺比分不補'],['reviews.json','檢討、政策、審計','賽前審計明示，不當賽後分析'],['reported_predictions.json','只在結算表追述的方向','不倒填原始預測'],['market_reports.json','有全輪結算數、缺完整明細','取代該輪部分明細統計，絕不相加'],['rank_summaries.json','缺逐場表的早期R位結算','有明示順位結果才累計'],['historical_totals.json','Master報告的完整累計快照','獨立對照，不與重算合併'],['research.json','研究分季／合併期間','不和本季正式實績混合']])}<p>全輪累計使用已匯入輪次；有明示結算摘要時整輪採摘要，避免以少量已知比分代表全輪。R位統計採可核對的逐場順位與早期順位摘要。候補R3排除。每輪只計原始版＋賽前R3補充一次，更新版獨立比較。</p><p>德甲模型版本改變、法甲1X2 challenger與V1近似參考均保留標記。「歷代紀錄」不是同一模型的驗證成績。</p><h2>如何使用與更新</h2><ol class="auditlist"><li>解壓縮後雙擊index.html；無需伺服器，字體沿用加大版。</li><li>新增Master另存快照。不要改寫既有預測；使用新ID新增事件或新輪次。</li><li>tools/append_event.py支援既有輪次追加比分、非方向性快照和檢討；新增輪次或排序修正需擴充匯入器、重新驗證。</li><li>網站不會自動抓盤、同步其他對話或重新執行模型。</li></ol><button id="export">匯出Dashboard JSON</button><details><summary>來源版本與SHA-256</summary><pre class="raw">${esc(JSON.stringify(D.sources,null,2))}</pre></details><p class="muted">靜態檔案不能阻止人工編輯；雜湊與追加工具用於偵測意外改動，不是不可竄改資料庫。</p></div>`}
function empty(){return '<div class="empty">找不到頁面。<a href="#home">返回首頁</a></div>'}
function render(){
 const [page='home',id,arg]=(location.hash.slice(1)||'home').split('/');
 document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+page+(page==='league'?'/'+id:'')));
 $('#crumb').textContent='工作空間 / '+({home:'總覽',league:names[id],round:'輪次詳細',research:'單雙研究室',cross:'跨聯賽驗證',archive:'來源檔案',source:'來源追溯',about:'資料與更新方式',mypicks:'我的單雙'}[page]||'總覽');
 $('#app').innerHTML=page==='mypicks'?heading('MY PARITY PICKS','我的單雙','只計有填的場次，與模型正式統計分開。')+MyParity.page(personalContexts()):page==='home'?home():page==='league'?league(id):page==='round'?round(id,arg||'base'):page==='research'?research():page==='cross'?cross():page==='archive'?archive():page==='about'?about():page==='source'?(()=>{const r={version:arg?+id:55,start_line:arg?+arg:+id},s=sourceSection(r);return s?heading('MASTER V'+r.version,'原始來源追溯',`定位至第 ${r.start_line} 行`)+`<div class="panel"><h2>${esc(s.title)}</h2>${source(s.source)}${renderTextTable(s.text)}</div>`:empty()})():empty();
 if(page==='home'){homebody();$('#homeleague').onchange=()=>{homeLeague=$('#homeleague').value;homebody()}}
 if(page==='league'&&getLeague(id)){leaguebody(id);for(const k of ['gwfilter','modelfilter','statefilter','seasonfilter'])$('#'+k).onchange=()=>leaguebody(id)}
 if(page==='round'&&roundById.has(id)&&!packageFor(id)){const v=arg||'base';roundbody(id,v);$('#versionfilter').onchange=()=>{location.hash='round/'+id+($('#versionfilter').value==='base'?'':'/'+$('#versionfilter').value)};document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');roundbody(id,v,b.dataset.tab)})}
 if(page==='research'){researchFilters();$('#researchleague').onchange=researchFilters;$('#researchmodel').onchange=researchtable;$('#researchseason').onchange=researchtable}
 if(page==='archive'){sourcelist();$('#sourcesearch').oninput=sourcelist;$('#sourceversion').onchange=sourcelist}
 if($('#export'))$('#export').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(D,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='football-dashboard-v2.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
 bindPersonal();
 window.scrollTo(0,0);
}

function packageFor(id){return [...(D.official_forecasts||[]),...(D.research_forecasts||[])].find(p=>p.record_id===id)}
function displayValue(v){return typeof v==='string'?v:JSON.stringify(v)}
function fmtOdds(v){if(v===undefined||v===null||v==='')return '<span class="odds-missing">MISSING</span>';if(Array.isArray(v))return esc(v.join(' / '));if(typeof v==='object')return esc(Object.entries(v).map(([k,x])=>k+': '+x).join(' · '));return esc(v)}
function oddsRecord(r,f){
 const fixture=f.fixture||f.home+' vs '+f.away;
 const p=packageFor(r.id);
 const pools=[...(p?.market_odds||[]),...(p?.odds||[]),...(p?.matches||[]),...(D.market_odds||[])];
 return pools.find(x=>{
   const fx=x.fixture||x.match||((x.home&&x.away)?x.home+' vs '+x.away:'');
   return fx&&fx.replace(/\s+/g,'').toLowerCase()===fixture.replace(/\s+/g,'').toLowerCase();
 })||{};
}
function oddsNum(v){const n=Number(v);return Number.isFinite(n)?n.toFixed(2):esc(v)}
function signedHandicap(v){const n=Number(v);if(!Number.isFinite(n))return esc(v);return n>0?'+'+n:n===0?'0':String(n)}
function fixturePick(f,m){return m==='1X2'?(f['1X2']||f.pick_1x2||f.directions?.['1x2']):m==='OU25'?(f.OU25||f.pick_ou25||f.directions?.ou25):null}
function selectedOdds(m,val,f){
 if(!val||typeof val!=='object')return null;
 const pick=fixturePick(f,m);
 if(m==='1X2'){
   const k=String(pick||'').includes('主勝')?'home':String(pick||'').includes('客勝')?'away':String(pick||'').includes('和')?'draw':null;
   return k&&Number.isFinite(Number(val[k]))?Number(val[k]):null;
 }
 if(m==='OU25'){
   const k=String(pick||'').includes('大')?'over':String(pick||'').includes('小')?'under':null;
   return k&&Number.isFinite(Number(val[k]))?Number(val[k]):null;
 }
 return null;
}
function formattedMarketOdds(m,val,f){
 if(val===undefined||val===null||val==='')return '<span class="odds-missing">MISSING</span>';
 if(!val||typeof val!=='object'||Array.isArray(val))return fmtOdds(val);
 const pick=fixturePick(f,m), selected=selectedOdds(m,val,f);
 const wrap=(k,label)=>{
   const raw=val[k];if(raw===undefined||raw===null||raw==='')return label+' —';
   const isSelected=m==='1X2'?(k==='home'&&String(pick).includes('主勝'))||(k==='away'&&String(pick).includes('客勝'))||(k==='draw'&&String(pick).includes('和')):(k==='over'&&String(pick).includes('大'))||(k==='under'&&String(pick).includes('小'));
   return '<span class="'+(isSelected?'odds-selected-value':'')+'">'+label+' '+oddsNum(raw)+'</span>';
 };
 const body=m==='1X2'?[wrap('home','主'),wrap('draw','和'),wrap('away','客')].join(' ｜ '):[wrap('over','大'),wrap('under','小')].join(' ｜ ');
 return body+(selected>1.8?'<span class="high-odds-badge">選中 '+oddsNum(selected)+' &gt; 1.80</span>':'');
}
function formattedAH(val,f){
 if(val===undefined||val===null||val==='')return '<span class="odds-missing">MISSING</span>';
 if(!val||typeof val!=='object'||Array.isArray(val))return fmtOdds(val);
 const h=Number(val.line_home),home=f.home||String(f.fixture||'').split(' vs ')[0]||'主隊',away=f.away||String(f.fixture||'').split(' vs ')[1]||'客隊';
 if(!Number.isFinite(h))return fmtOdds(val);
 return '<span class="ah-readable"><strong>'+esc(home)+' '+signedHandicap(h)+' @'+oddsNum(val.home)+'</strong><span>｜</span><strong>'+esc(away)+' '+signedHandicap(-h)+' @'+oddsNum(val.away)+'</strong></span>';
}
function bundesligaPredictionCell(r,f,m){
 const pick=fixturePick(f,m)||'—',o=oddsRecord(r,f),open=o.open||o.OPEN||o.openproxy||o.OPENPROXY||o.odds_open||{};
 const val=m==='1X2'?(open['1X2']||open.one_x_two||o.open_1x2):(open.OU25||open.ou25||open['O/U2.5']||o.open_ou25);
 const selected=selectedOdds(m,val,f),high=selected>1.8;
 return '<div class="'+(high?'prediction-high-odds':'')+'"><strong>'+esc(pick)+'</strong>'+(high?'<span class="high-odds-badge">賠率 '+oddsNum(selected)+' &gt; 1.80</span>':'')+'</div>';
}
function bundesligaOddsCell(r,f){
 if(r.league!=='BUNDESLIGA')return '—';
 const o=oddsRecord(r,f),open=o.open||o.OPEN||o.openproxy||o.OPENPROXY||o.odds_open||{},pre=o.pre_kick||o.PRE_KICK||o.prekick||o.odds_pre_kick||{};
 const movement=o.movement||o.market_move||o.delta||{};
 const line=(label,val,m)=>{const high=(m==='1X2'||m==='OU25')&&selectedOdds(m,val,f)>1.8;const body=m==='AH'?formattedAH(val,f):formattedMarketOdds(m,val,f);return '<div class="odds-line '+(high?'odds-line-high':'')+'"><span>'+label+'</span><strong>'+body+'</strong></div>';};
 const open1=open['1X2']||open.one_x_two||o.open_1x2;
 const openOU=open.OU25||open.ou25||open['O/U2.5']||o.open_ou25;
 const openAH=open.AH||open.ah||o.open_ah;
 const pre1=pre['1X2']||pre.one_x_two||o.pre_1x2;
 const preOU=pre.OU25||pre.ou25||pre['O/U2.5']||o.pre_ou25;
 const preAH=pre.AH||pre.ah||o.pre_ah;
 const move=movement.label||movement.status||movement.summary||o.market_move_label;
 return '<div class="odds-cell">'
   +'<div class="odds-head">OPEN / OPENPROXY</div>'+line('1X2',open1,'1X2')+line('O/U2.5',openOU,'OU25')+line('AH',openAH,'AH')
   +'<div class="odds-head">PRE-KICK</div>'+line('1X2',pre1,'1X2')+line('O/U2.5',preOU,'OU25')+line('AH',preAH,'AH')
   +'<div class="odds-move">'+(move?badge(move, /Against|Strong Against/i.test(String(move))?'amber':''):'<span class="odds-missing">Movement: MISSING</span>')+'</div>'
   +'</div>';
}
function bundesligaOddsPanel(r,fixtures){
 if(r.league!=='BUNDESLIGA')return '';
 return '<div class="panel odds-panel"><div class="heading"><div><h2>每場賠率／盤口</h2><p class="muted">德甲固定保存：1X2、O/U2.5、AH；OPEN/OPENPROXY → PRE-KICK。模型選中方向賠率 &gt; 1.80 以琥珀色標示；高賠率不代表更高勝率。缺資料只顯示 MISSING，不事後補造。</p></div>'+badge('EVERY MATCH')+'</div>'
   +table(['比賽','賠率／盤口'],fixtures.map(f=>[esc(f.fixture||f.home+' vs '+f.away),bundesligaOddsCell(r,f)]))+'</div>';
}
function packageCard(id){const p=packageFor(id);if(!p)return '';return `<div class="tiny">${p.research_only?'Research · ':''}${esc(displayValue(p.PASS))}<br>${(p.ranked_picks.parity||[]).map(x=>esc(x.rank+' '+(x.match||x.home+' vs '+x.away)+' → '+x.pick)).join('<br>')}</div>`}
function packageSummary(id){
 const p=packageFor(id);if(!p)return '';
 const round=roundById.get(id),state=round?roundStatus(round):null;
 const ps=D.predictions.filter(x=>x.record_id===id);
 const vals=Object.entries(M).map(([m,label])=>{let hits=0,n=0;for(const x of ps){const v=hit(x,m);if(v!==null){hits+=Number(v);n++}}return {label,hits,n}});
 const kpis=vals.some(v=>v.n)?'<div class="grid kpis">'+vals.map(v=>'<div class="card"><span class="muted">'+esc(v.label)+'</span><div class="metric">'+v.hits+' / '+v.n+'</div></div>').join('')+'</div>':'';
 const rtable=table(['市場','R1','R2','R3'],['1X2','OU25','parity'].map(m=>[m,...['R1','R2','R3'].map(rank=>{const x=(p.ranked_picks?.[m]||[]).find(x=>x.rank===rank);return x?esc((x.match||x.home+' vs '+x.away)+' → '+x.pick)+(x.formal_selector===false?' '+badge('SHADOW / 非正式精選','gray'):'')+(x.status?' '+badge(x.status,'gray'):''):'—'})]));
 return '<div class="panel"><h2>最新 GW'+esc(p.gw)+' · '+(p.research_only?'Research':'封存預測')+'</h2><p><strong>目前核對狀態：</strong>'+esc(state?.label||'未核對')+'</p><details><summary>查看原始 Package 狀態</summary><pre class="raw">'+esc(displayValue(p.status))+'</pre></details>'+kpis+rtable+'<p>PASS: '+esc(displayValue(p.PASS))+'</p></div>';
}
function packageSettlementPanel(p){
 const ps=D.predictions.filter(x=>x.record_id===p.record_id);
 const scored=ps.filter(x=>Array.isArray(result(x)?.score)&&result(x).score.length===2);
 if(!scored.length)return '<div class="panel"><h2>賽後對答案</h2><p class="muted">尚未有本輪正式比分，維持 OPEN / PRE-KICK；不顯示命中率。</p></div>';
 const research=!!p.research_only;
 const actuals=(x,m)=>actual(x,m);
 const rankNote=(m)=>research?'Research / 非正式':m==='parity'&&p.ranked_picks?.parity?.[0]?.formal_selector===false?'Shadow / 正式 PASS':m==='ou25'&&p.ranked_picks?.OU25?.[0]?.formal_selector===false?'Relative / 正式 PASS':'正式／封存順位';
 const norm={};
 const marks=(x,m)=>{
  const v=x.directions?.[m],a=actuals(x,m),hitResult=hit(x,m);
  const rank=x.ranks?.[m],rankText=rank?' '+badge('R'+rank+' · '+rankNote(m),'gray'):'';
  return v?'<strong>'+esc(v)+'</strong>'+rankText+' '+(a===null?badge('待結算','gray'):badge(hitResult?'命中':'未中',hitResult?'':'amber')):'PASS / MISSING';
 };
 const rows=ps.map(x=>{
  const r=result(x),sc=r?.score;
  return [esc(x.fixture),Array.isArray(sc)?esc(sc.join(' – ')):'待結算',marks(x,'1x2'),marks(x,'ou25'),marks(x,'parity')];
 });
 const total=p.fixtures?.length||ps.length,complete=scored.length===total;
 const summ=Object.entries(M).map(([m,name])=>{let h=0,n=0;for(const x of ps){const v=hit(x,m);if(v!==null){h+=Number(v);n++}}return name+': '+h+'/'+n});
 const summary='<p><strong>'+esc((research?'Research / 不計 Official · ':'')+(complete?'SETTLEMENT_COMPLETE':'PARTIAL / INCOMPLETE')+' · '+scored.length+'/'+total)+'</strong></p><p>'+esc(summ.join('　｜　'))+'</p>';
 const rankRows=Object.entries(M).map(([m,name])=>[name,...[1,2,3].map(n=>{const x=ps.find(y=>y.ranks?.[m]===n);if(!x)return m==='parity'&&p.PASS?.parity?'PASS':'未選／PASS';const h=hit(x,m);return esc(x.fixture)+' · '+esc(x.directions[m]||'PASS')+' '+badge(rankNote(m),'gray')+' '+(h===null?badge('待結算','gray'):badge(h?'命中':'未中',h?'':'amber'))})]);
 return '<div class="panel"><h2>逐場對答案｜最終比分與三市場命中</h2>'+summary+table(['比賽','最終比分','1X2','O/U2.5','單雙'],rows)+'<h3>R1 / R2 / R3 對答案</h3>'+table(['市場','R1','R2','R3'],rankRows)+'<p class="muted">只按原封存預測與比分核算，PASS 不計；Research、Shadow、Relative 不計入正式精選績效。缺資料不補造。</p></div>';
}
function packagePage(id){const p=packageFor(id),r=roundById.get(id);return heading(r.league+' / GW'+p.gw,names[r.league]+' 第 '+p.gw+' 輪',p.research_only?'Research · RESEARCH_ONLY · 不計入 official 統計':'正式封存 Package',`<a class="button" href="#league/${r.league}">返回聯賽</a>`)+packageSummary(id)+`<div class="panel"><h2>封存狀態與模型</h2>${table(['欄位','Package 原值'],['record_id','status','model','PASS','PARITY_SKEW_ALERT','XUAN_status','pre_kick_status','research_only','counts_as_official_forward_result','integrity_flags'].map(k=>[esc(k),esc(displayValue(p[k]))]))}<p>GitHub: ${esc(D.github_status)}</p><a href="${r.package_path}">原始 Dashboard Package JSON</a></div>${MyParity.panel(personalContexts().filter(c=>c.record_id===id),'我的本輪單雙命中率')}<div class="panel"><h2>本輪已封存預測</h2>${table(r.league==='BUNDESLIGA'?['比賽','1X2','OU25','單雙','賠率／盤口','我的單雙']:['比賽','1X2','OU25','單雙','我的單雙'],p.fixtures.map(f=>r.league==='BUNDESLIGA'?[esc(f.home+' vs '+f.away),bundesligaPredictionCell(r,f,'1X2'),bundesligaPredictionCell(r,f,'OU25'),esc(f.parity),bundesligaOddsCell(r,f),MyParity.cell(personalContext(r,f))]:[esc(f.home+' vs '+f.away),esc(f['1X2']),esc(f.OU25),esc(f.parity),MyParity.cell(personalContext(r,f))]))}</div>${packageSettlementPanel(p)}${bundesligaOddsPanel(r,p.fixtures)}`}


function personalContext(r,f){
 const fixture=f.fixture||f.home+' vs '+f.away;
 const same=D.predictions.filter(x=>{const rr=roundById.get(x.record_id);return rr?.league===r.league&&rr.season===r.season&&rr.gw===r.gw&&x.fixture.replace(/\s+/g,'')===fixture.replace(/\s+/g,'')});
 const scored=same.map(result).find(x=>x?.score||x?.status==='ABANDONED')||result(f);
 const raw=packageFor(r.id);
 const extra=[...(raw?.predictions||[]),...(raw?.matches||[])].find(x=>x.match===fixture||x.fixture===fixture)||{};
 const taipei=f.kickoff_taipei||extra.kickoff_taipei;
 const kickoff=f.kickoff_utc||extra.kickoff_utc||(taipei?taipei.replace(' ','T')+':00+08:00':null);
 return {league:r.league,season:r.season,gw:r.gw,record_id:r.id,fixture,score:scored?.score||f.score||null,abandoned:scored?.status==='ABANDONED',kickoff};
}
function personalContexts(){return D.rounds.flatMap(r=>(packageFor(r.id)?.fixtures||effective(r.id)).map(f=>personalContext(r,f)))}
function bindPersonal(){MyParity.bind(personalContexts(),()=>{const y=window.scrollY;render();window.scrollTo(0,y)})}

window.addEventListener('hashchange',render);render();
