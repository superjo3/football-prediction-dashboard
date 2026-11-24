'use strict';
/* Non-destructive score view: preserves the sealed official/research/shadow forecasts. */
(function(){
 const data=window.FIVE_LEAGUE_VERIFIED_RESULTS;if(!data)return;
 const labels={EPL:'英超 Premier League',BUNDESLIGA:'德甲 Bundesliga',LALIGA:'西甲 La Liga',SERIEA:'義甲 Serie A',LIGUE1:'法甲 Ligue 1'};
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'" : '&#39;'}[c]));
 const leagues=Object.keys(labels);
 function view(){
  if(location.hash!=='#verified-results')return;
  const app=document.getElementById('app');if(!app)return;
  const all=data.items;
  const sections=leagues.map(league=>{
   const items=all.filter(x=>x.league===league).sort((a,b)=>a.date.localeCompare(b.date));
   return '<section class="panel" style="margin-bottom:20px"><h2>'+labels[league]+' · 已核實 '+items.length+' 場</h2><div class="tablewrap"><table><thead><tr><th>當地日期</th><th>主隊</th><th>比分</th><th>客隊</th><th>勝和負</th><th>大小2.5</th><th>單雙</th><th>來源</th></tr></thead><tbody>'+items.map(x=>'<tr><td>'+esc(x.date)+'</td><td>'+esc(x.home)+'</td><td><strong>'+x.score[0]+' : '+x.score[1]+'</strong></td><td>'+esc(x.away)+'</td><td>'+esc(x.outcomes['1X2'])+'</td><td>'+esc(x.outcomes.OU25)+'</td><td>'+esc(x.outcomes.parity)+'</td><td><a href="'+esc(x.source_url)+'" target="_blank" rel="noopener noreferrer">核對來源</a></td></tr>').join('')+'</tbody></table></div></section>';
  }).join('');
  app.innerHTML='<div style="margin-bottom:24px"><h1>五大聯賽 · 最新已完賽比分</h1><p class="muted">截至 '+esc(data.as_of)+' 核對。'+esc(data.scope)+' 共 <strong>'+all.length+'</strong> 場。</p><p class="muted">'+esc(data.data_quality_note)+' 比分與勝和負／大小／單雙結果為賽後事實；原封存方向、R1/R2/R3、Official／Research／Shadow 身分均不改動。</p></div>'+sections;
  const crumb=document.getElementById('crumb');if(crumb)crumb.textContent='工作空間 / 五大聯賽最新賽果';
 }
 window.addEventListener('hashchange',()=>setTimeout(view,0));
 view();
})();
