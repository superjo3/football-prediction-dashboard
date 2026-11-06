'use strict';
// Personal selections stay separate from every archived forecast and result.
window.MyParity=(()=>{
 const KEY='football-dashboard.my-parity.v1';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let state={schema:1,picks:{}},error='';
 try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved?.schema===1&&saved.picks&&typeof saved.picks==='object')state=saved;}catch(e){error='無法讀取瀏覽器紀錄；請確認儲存權限，或匯入備份。'}
 const roundKey=c=>[c.league,c.season,c.gw].join('|');
 const key=c=>roundKey(c)+'|'+c.fixture.replace(/\s+/g,'').toLowerCase();
 function score(c){return Array.isArray(c.score)&&c.score.length===2&&c.score.every(n=>Number.isInteger(n)&&n>=0)?c.score:null;}
 function outcome(c,p){if(c.abandoned)return 'excluded';const s=score(c);return !s?'pending':((s[0]+s[1])%2?'單':'雙')===p.pick?'hit':'miss';}
 function locked(c){return !!score(c)||c.abandoned||!!(c.kickoff&&Date.now()>=Date.parse(c.kickoff));}
 function persist(next){try{localStorage.setItem(KEY,JSON.stringify(next));state=next;error='';return true;}catch(e){error='儲存失敗：瀏覽器未允許儲存或空間不足。請先匯出備份；這次變更未保存。';return false;}}
 function summary(contexts){let h=0,n=0,pending=0,excluded=0,total=0;const ranks=[1,2,3].map(()=>({h:0,n:0}));const seen=new Set();
  for(const c of contexts){const k=key(c);if(seen.has(k))continue;seen.add(k);const p=state.picks[k];if(!p||!['單','雙'].includes(p.pick))continue;total++;const o=outcome(c,p);if(o==='pending'){pending++;continue;}if(o==='excluded'){excluded++;continue;}n++;h+=o==='hit';if(p.rank){ranks[p.rank-1].n++;ranks[p.rank-1].h+=o==='hit';}}
  return {h,n,pending,excluded,total,ranks};
 }
 function rate(s){return s.n?`${(100*s.h/s.n).toFixed(1)}%（${s.h}/${s.n}）`:'—（尚無結算）';}
 function status(c,p){if(!p)return locked(c)?'已開賽／已結算，不能補填':'留空不計入統計';const o=outcome(c,p);return o==='hit'?'✓ 命中':o==='miss'?'× 未中':o==='excluded'?'腰斬／排除統計':'待結算';}
 function cell(c){const p=state.picks[key(c)],disabled=locked(c)?'disabled':'';return `<div class="personal-cell"><label>我的單雙<select data-personal-pick="${esc(key(c))}" aria-label="${esc(c.fixture)} 我的單雙" ${disabled}><option value="">不選</option>${['單','雙'].map(v=>`<option ${p?.pick===v?'selected':''}>${v}</option>`).join('')}</select></label><label>我的順位<select data-personal-rank="${esc(key(c))}" aria-label="${esc(c.fixture)} 我的順位" ${disabled||!p?'disabled':''}><option value="">不排名</option>${[1,2,3].map(v=>`<option value="${v}" ${p?.rank===v?'selected':''}>R${v}</option>`).join('')}</select></label><span class="outcome ${p&&outcome(c,p)==='hit'?'good':p&&outcome(c,p)==='miss'?'bad':'muted'}">${status(c,p)}</span>${p?`<span class="tiny muted">${p.restored?'備份還原 · ':''}已保存 ${esc(new Date(p.saved_at).toLocaleString('zh-TW'))}</span>`:''}</div>`;}
 function panel(contexts,title='我的單雙命中率'){const s=summary(contexts);return `<section class="panel personal-panel"><h2>${esc(title)}</h2><div class="personal-stats"><strong>全部自選 ${rate(s)}</strong>${s.ranks.map((r,i)=>`<span>我的 R${i+1}：${rate(r)}</span>`).join('')}</div><p class="muted">已選 ${s.total} 場 · 待結算 ${s.pending} 場 · 排除 ${s.excluded} 場。只計你有填、且已有正式比分的場次；不選與待結算都不算輸。R1／R2／R3 各輪、各聯賽獨立，可只填一場。</p><p class="muted">自選自動保存於此瀏覽器，不會跨裝置同步。網站追加比分後會自動對答案；已開賽（有開賽時間時）或已結算的場次不能補填。未提供開賽時間的場次，於網站收錄賽果時鎖定。</p><div class="filters"><a class="button" href="#mypicks">查看全部自選 →</a><button type="button" data-personal-export>匯出自選備份</button><label class="button">匯入自選備份<input type="file" accept="application/json,.json" data-personal-import hidden></label></div><p class="personal-feedback ${error?'bad':'muted'}" role="status" aria-live="polite">${esc(error||'選擇後自動保存；請定期匯出備份，清除瀏覽器資料會刪除自選紀錄。')}</p></section>`;}
 function save(c,pick,rank,contexts){if(locked(c)){error='這場已開賽或已結算，無法更改。';return false;}const next=JSON.parse(JSON.stringify(state));const k=key(c);
  if(!pick)delete next.picks[k];else{
   if(!['單','雙'].includes(pick)||![null,1,2,3].includes(rank))return false;
   if(rank)for(const [other,v] of Object.entries(next.picks)){if(other!==k&&v.round_key===roundKey(c)&&v.rank===rank){const old=contexts.find(x=>key(x)===other);if(old&&locked(old)){error='此順位已由本輪鎖定的場次使用，請選其他順位。';return false;}v.rank=null;}}
   next.picks[k]={pick,rank,round_key:roundKey(c),league:c.league,season:c.season,gw:c.gw,fixture:c.fixture,record_id:c.record_id,saved_at:new Date().toISOString()};
  }return persist(next);
 }
 function exportFile(){const u=URL.createObjectURL(new Blob([JSON.stringify({...state,exported_at:new Date().toISOString()},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='my-parity-picks-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
 function importState(value,contexts){if(value?.schema!==1||!value.picks||typeof value.picks!=='object'||Array.isArray(value.picks))throw Error('備份格式不正確');const next=JSON.parse(JSON.stringify(state));let added=0,skipped=0;const byKey=new Map(contexts.map(c=>[key(c),c]));
  for(const [k,p] of Object.entries(value.picks)){const c=byKey.get(k);if(!c||!p||!['單','雙'].includes(p.pick)||![null,1,2,3].includes(p.rank)||!Number.isFinite(Date.parse(p.saved_at))){skipped++;continue;}
   // Never overwrite an existing choice or import a post-result entry as a prematch pick.
   if(next.picks[k]){skipped++;continue;}if(c.kickoff&&Date.parse(p.saved_at)>=Date.parse(c.kickoff)||Date.parse(p.saved_at)>Date.now()){skipped++;continue;}
   if(p.rank&&Object.values(next.picks).some(x=>x.round_key===roundKey(c)&&x.rank===p.rank)){skipped++;continue;}
   next.picks[k]={pick:p.pick,rank:p.rank,round_key:roundKey(c),league:c.league,season:c.season,gw:c.gw,fixture:c.fixture,record_id:c.record_id,saved_at:p.saved_at,restored:true};added++;
  }if(!persist(next))throw Error(error);return {added,skipped};
 }
 function bind(contexts,refresh){const byKey=new Map(contexts.map(c=>[key(c),c]));document.querySelectorAll('[data-personal-pick]').forEach(el=>el.onchange=()=>{const c=byKey.get(el.dataset.personalPick);if(c)save(c,el.value,state.picks[key(c)]?.rank??null,contexts);refresh();});document.querySelectorAll('[data-personal-rank]').forEach(el=>el.onchange=()=>{const c=byKey.get(el.dataset.personalRank),p=c&&state.picks[key(c)];if(p)save(c,p.pick,el.value?Number(el.value):null,contexts);refresh();});document.querySelectorAll('[data-personal-export]').forEach(el=>el.onclick=exportFile);document.querySelectorAll('[data-personal-import]').forEach(el=>el.onchange=async()=>{try{if(!el.files[0])return;const r=importState(JSON.parse(await el.files[0].text()),contexts);refresh();document.querySelectorAll('.personal-feedback').forEach(x=>x.textContent=`已匯入 ${r.added} 場，略過 ${r.skipped} 場（已有紀錄、未收錄場次或無法驗證賽前時間）。`);}catch(e){error='匯入失敗：'+e.message;refresh();}});}
 function page(contexts){const unique=[...new Map(contexts.map(c=>[key(c),c])).values()].filter(c=>state.picks[key(c)]);return panel(contexts,'我的全部單雙命中率')+`<div class="panel"><h2>我的自選紀錄</h2>${unique.length?`<div class="tablewrap"><table><thead><tr><th>聯賽／輪次</th><th>比賽</th><th>比分</th><th>我的單雙</th></tr></thead><tbody>${unique.map(c=>`<tr><td>${esc(c.league)} · GW${c.gw}</td><td><a href="#round/${esc(c.record_id)}">${esc(c.fixture)}</a></td><td>${score(c)?c.score.join(' – '):'—'}</td><td>${cell(c)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">還沒有自選紀錄。到最新一輪，在「我的單雙」選擇你想預測的場次即可。</p>'}</div>`;}
 return {key,cell,panel,bind,page,summary};
})();
