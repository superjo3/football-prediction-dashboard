/* Five-league postmatch settlement sync — 2026-11-24.
   Adds verified scores to existing immutable prematch records; does not rewrite predictions. */
(function(){'use strict';
 const D=window.FOOTBALL_DATA;if(!D)throw new Error('FOOTBALL_DATA required');
 const sets={"EPL-2026-27-GW11-20261109-MARKETPROXY-RECOVERED":[["Manchester City vs Fulham",[1,1]],["Bournemouth vs Nottingham Forest",[2,0]],["Aston Villa vs Sunderland",[0,0]],["Chelsea vs Leeds United",[1,4]],["Coventry City vs Crystal Palace",[3,2]],["Tottenham vs Ipswich Town",[2,0]],["Newcastle United vs Arsenal",[2,2]],["Hull City vs Brighton",[2,0]],["Liverpool vs Manchester United",[4,0]],["Brentford vs Everton",[4,0]]],"EPL-2026-27-GW11-20261109-R90-RECOVERY-SHADOW":[["Manchester City vs Fulham",[1,1]],["Bournemouth vs Nottingham Forest",[2,0]],["Aston Villa vs Sunderland",[0,0]],["Chelsea vs Leeds United",[1,4]],["Coventry City vs Crystal Palace",[3,2]],["Tottenham vs Ipswich Town",[2,0]],["Newcastle United vs Arsenal",[2,2]],["Hull City vs Brighton",[2,0]],["Liverpool vs Manchester United",[4,0]],["Brentford vs Everton",[4,0]]],"BUNDESLIGA-2026-27-GW10-20261109-SKEW-AUDIT-FINAL":[["拜仁 vs 科隆",[1,1]],["勒沃庫森 vs 柏德博恩",[4,0]],["法蘭克福 vs 霍芬海姆",[1,0]],["柏林聯 vs RB萊比錫",[1,5]],["門興 vs 多特蒙德",[0,1]],["艾禾斯堡 vs 弗賴堡",[0,1]],["沙爾克04 vs 史特加",[0,0]],["奧格斯堡 vs 美因茨",[3,1]],["雲達不萊梅 vs 漢堡",[4,0]]],"LALIGA-2026-27-GW13-20261116-V2-RESEARCH-CONTINUITY-A":[["畢爾包 vs 愛斯賓奴",[0,1]],["艾拉維斯 vs 拉科魯尼亞",[3,1]],["華歷簡奴 vs 華倫西亞",[0,1]],["西維爾 vs 貝迪斯",[1,1]],["皇家馬德里 vs 切爾達",[2,1]],["巴塞隆拿 vs 維拉利爾",[3,2]],["桑坦德 vs 皇家蘇斯達",[3,2]],["奧沙辛拿 vs 馬拉加",[1,0]],["加泰 vs 馬德里體育會",[0,3]],["利雲特 vs 艾爾切",[1,1]]],"LALIGA-2026-27-GW13-20261117-EXTENDED-FROZEN-PROXY-RESEARCH":[["畢爾包 vs 愛斯賓奴",[0,1]],["艾拉維斯 vs 拉科魯尼亞",[3,1]],["華歷簡奴 vs 華倫西亞",[0,1]],["西維爾 vs 貝迪斯",[1,1]],["皇家馬德里 vs 切爾達",[2,1]],["巴塞隆拿 vs 維拉利爾",[3,2]],["桑坦德 vs 皇家蘇斯達",[3,2]],["奧沙辛拿 vs 馬拉加",[1,0]],["加泰 vs 馬德里體育會",[0,3]],["利雲特 vs 艾爾切",[1,1]]],"SERIEA-2026-27-GW12-20261109-EARLY-MARKETPROXY-RESEARCH":[["Como vs Cagliari",[2,0]],["Lazio vs Lecce",[3,0]],["Parma vs Roma",[1,5]],["Napoli vs Torino",[1,0]],["Juventus vs Venezia",[4,0]],["Bologna vs Udinese",[1,1]],["Sassuolo vs Genoa",[0,2]],["Milan vs Frosinone",[5,1]],["Atalanta vs Inter",[4,4]],["Monza vs Fiorentina",[3,0]]],"LIGUE1-2026-27-GW11-20261109-MARKETPROXY":[["Troyes vs Le Havre",[3,1]],["Nice vs Paris SG",[2,3]],["Monaco vs Auxerre",[1,1]],["Lens vs Toulouse",[1,1]],["Lille vs Lyon",[0,1]],["Strasbourg vs Brest",[0,1]],["Paris FC vs Angers",[4,0]],["Lorient vs Rennes",[1,1]],["Marseille vs Le Mans",[2,3]]]};
 const summaries={"EPL-2026-27-GW11-20261109-MARKETPROXY-RECOVERED":{"status":"COMPLETE","completed_matches":10,"expected_matches":10,"round":{"1x2":"5/10 = 50.0%","ou25":"4/10 = 40.0%","parity":"6/10 = 60.0%"},"ranks":{"1x2":"1/3","ou25":"2/3","parity":"2/3"},"pre_kick":"MISSING_NOT_BACKFILLED"},"EPL-2026-27-GW11-20261109-R90-RECOVERY-SHADOW":{"status":"COMPLETE","completed_matches":10,"expected_matches":10,"round":{"parity":"6/10 = 60.0%"},"ranks":{"parity":"2/3"},"pre_kick":"MISSING_NOT_BACKFILLED","research_only":true},"BUNDESLIGA-2026-27-GW10-20261109-SKEW-AUDIT-FINAL":{"status":"COMPLETE","completed_matches":9,"expected_matches":9,"round":{"1x2":"6/9 = 66.7%","ou25":"4/9 = 44.4%","parity":"6/9 = 66.7%"},"ranks":{"1x2":"2/3","ou25":"1/3","parity":"PASS"},"pre_kick":"NOT_EVALUABLE_NO_VALIDATED_SNAPSHOT"},"LALIGA-2026-27-GW13-20261116-V2-RESEARCH-CONTINUITY-A":{"status":"COMPLETE","completed_matches":10,"expected_matches":10,"round":{"1x2":"5/10 = 50.0%","ou25":"5/10 = 50.0%","parity":"5/10 = 50.0%"},"ranks":{"1x2":"2/3","ou25":"3/3","parity":"3/3"},"pre_kick":"MISSING_NOT_BACKFILLED","research_only":true},"LALIGA-2026-27-GW13-20261117-EXTENDED-FROZEN-PROXY-RESEARCH":{"status":"COMPLETE","completed_matches":10,"expected_matches":10,"round":{"parity":"7/10 = 70.0%"},"ranks":{"parity":"2/3"},"pre_kick":"MISSING_NOT_BACKFILLED","research_only":true},"SERIEA-2026-27-GW12-20261109-EARLY-MARKETPROXY-RESEARCH":{"status":"COMPLETE","completed_matches":10,"expected_matches":10,"round":{"1x2":"6/10 = 60.0%","ou25":"8/10 = 80.0%","parity":"5/10 = 50.0%"},"ranks":{"1x2":"3/3","ou25":"2/3","parity":"2/3"},"pre_kick":"MISSING_NOT_BACKFILLED","research_only":true,"tracks":{"B_parity":"3/10 = 30.0%","C_parity":"3/10 = 30.0%"}},"LIGUE1-2026-27-GW11-20261109-MARKETPROXY":{"status":"COMPLETE","completed_matches":9,"expected_matches":9,"round":{"1x2":"3/9 = 33.3%","ou25":"5/9 = 55.6%","parity_base":"6/9 = 66.7%"},"ranks":{"1x2":"2/3","ou25_relative":"1/3","parity_shadow":"1/3"},"pre_kick":"MISSING_NOT_BACKFILLED"}};
 const reviews={"EPL-2026-27-GW11-20261109-MARKETPROXY-RECOVERED":{"status":"COMPLETE","decision":"KEEP/WATCH; no model promotion; Shadow separated"},"EPL-2026-27-GW11-20261109-R90-RECOVERY-SHADOW":{"status":"COMPLETE","decision":"RESEARCH_ONLY; no Official merge"},"BUNDESLIGA-2026-27-GW10-20261109-SKEW-AUDIT-FINAL":{"status":"COMPLETE","decision":"KEEP Official; TEST research guards; PROMOTE NONE"},"LALIGA-2026-27-GW13-20261116-V2-RESEARCH-CONTINUITY-A":{"status":"COMPLETE","decision":"KEEP research continuity; parity R1-R3 3/3 but full round 5/10; PROMOTE NONE"},"LALIGA-2026-27-GW13-20261117-EXTENDED-FROZEN-PROXY-RESEARCH":{"status":"COMPLETE","decision":"KEEP frozen challenger; parity 7/10; PROMOTE NONE"},"SERIEA-2026-27-GW12-20261109-EARLY-MARKETPROXY-RESEARCH":{"status":"COMPLETE","decision":"A KEEP/WATCH; B/C REJECT promotion; TEST forward only"},"LIGUE1-2026-27-GW11-20261109-MARKETPROXY":{"status":"COMPLETE","decision":"KEEP; TEST research; PROMOTE NONE"}};
 const norm=s=>String(s||'').replace(/\s+/g,'').toLowerCase();
 const packages=()=>[...(D.official_forecasts||[]),...(D.research_forecasts||[])];
 const rankNum=v=>{const m=String(v??'').match(/\d+/);return m?Number(m[0]):null;};
 const ensurePredictions=rid=>{
   let ps=(D.predictions||[]).filter(p=>p.record_id===rid);
   if(ps.length)return ps;
   const pkg=packages().find(p=>p.record_id===rid);
   if(!pkg?.fixtures?.length)return ps;
   if(!Array.isArray(D.predictions))D.predictions=[];
   for(const f of pkg.fixtures){
     const fixture=(f.home&&f.away)?f.home+' vs '+f.away:(f.fixture||f.match||'');
     if(!fixture)continue;
     D.predictions.push({
       id:rid+'-AUTO-'+(f.match_id||fixture),
       record_id:rid,
       match_id:f.match_id||rid+'-'+String(D.predictions.length+1).padStart(2,'0'),
       fixture,
       directions:{'1x2':f['1X2']??f.pick_1x2??null,ou25:f.OU25??f.pick_ou25??null,parity:f.parity??f.pick_parity??null},
       ranks:{'1x2':rankNum(f.rank_1x2),ou25:rankNum(f.rank_ou25),parity:rankNum(f.rank_parity)},
       market_status:{'1x2':'RESEARCH_ONLY',ou25:'RESEARCH_ONLY',parity:'RESEARCH_ONLY'}
     });
   }
   return D.predictions.filter(p=>p.record_id===rid);
 };
 if(!Array.isArray(D.results))D.results=[];
 const existing=new Set(D.results.map(x=>x.record_id+'|'+x.match_id));
 for(const [rid,rows] of Object.entries(sets)){
   const preds=ensurePredictions(rid);
   for(const [fixture,score] of rows){
     const p=preds.find(x=>norm(x.fixture)===norm(fixture));
     if(!p)continue;
     const key=rid+'|'+p.match_id;
     if(existing.has(key))continue;
     D.results.push({id:rid+'-RESULT-'+p.match_id,record_id:rid,match_id:p.match_id,score,source:{type:'POSTMATCH_SYNC_20261124'}});
     existing.add(key);
   }
   const pkg=packages().find(p=>p.record_id===rid);
   if(pkg){
     pkg.settlement=Object.assign({},pkg.settlement||{},summaries[rid]||{});
     pkg.postmatch_review=Object.assign({},pkg.postmatch_review||{},reviews[rid]||{});
     if(!pkg.pre_kick_status||pkg.pre_kick_status==='PENDING')pkg.pre_kick_status='NOT_FOUND_NOT_SETTLED';
   }
 }
 D.LATEST_BY_LEAGUE=Object.assign({},D.LATEST_BY_LEAGUE||{},{EPL:'EPL-2026-27-GW11-20261109-MARKETPROXY-RECOVERED',BUNDESLIGA:'BUNDESLIGA-2026-27-GW10-20261109-SKEW-AUDIT-FINAL',LIGUE1:'LIGUE1-2026-27-GW11-20261109-MARKETPROXY'});
 D.LATEST_RESEARCH=Object.assign({},D.LATEST_RESEARCH||{},{LALIGA:'LALIGA-2026-27-GW13-20261116-V2-RESEARCH-CONTINUITY-A',SERIEA:'SERIEA-2026-27-GW12-20261109-EARLY-MARKETPROXY-RESEARCH'});
 if(window.LALIGA_PARITY_DUAL?.GW13){
   const map=new Map(sets['LALIGA-2026-27-GW13-20261116-V2-RESEARCH-CONTINUITY-A'].map(x=>[norm(x[0]),x[1]]));
   for(const f of window.LALIGA_PARITY_DUAL.GW13.fixtures){
     const sc=map.get(norm(f.home+' vs '+f.away));if(!sc)continue;
     f.score=sc; f.actual_parity=((sc[0]+sc[1])%2?'單':'雙');
     f.A_hit=f.A_pick===f.actual_parity; f.B_hit=f.B_pick===f.actual_parity;
   }
   window.LALIGA_PARITY_DUAL.GW13.settlement={status:'COMPLETE',A_parity:'5/10',B_parity:'7/10',A_R1R2R3:'3/3',B_R1R2R3:'2/3'};
 }
 if(window.SERIEA_PARITY_TRIPLE){
   const map=new Map(sets['SERIEA-2026-27-GW12-20261109-EARLY-MARKETPROXY-RESEARCH'].map(x=>[norm(x[0]),x[1]]));
   for(const f of window.SERIEA_PARITY_TRIPLE.fixtures){
     const sc=map.get(norm(f.home+' vs '+f.away));if(!sc)continue;
     f.score=sc; f.actual_parity=((sc[0]+sc[1])%2?'單':'雙');
     f.a_hit=f.a_direction===f.actual_parity; f.b_hit=f.b_direction===f.actual_parity; f.c_hit=f.c_direction===f.actual_parity;
   }
   window.SERIEA_PARITY_TRIPLE.settlement={status:'COMPLETE',A_parity:'5/10',B_parity:'3/10',C_parity:'3/10',A_R1R2R3:'2/3',B_R1R2R3:'1/3',C_R1R2R3:'1/3'};
 }
 D.FIVE_LEAGUE_POSTMATCH_SYNC={as_of:'2026-11-24',status:'COMPLETE',rounds:{EPL:11,BUNDESLIGA:10,LALIGA:13,SERIEA:12,LIGUE1:11},pre_kick_policy:'MISSING_NOT_BACKFILLED'};
})();