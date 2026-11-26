/* Traditional Chinese display-only localization for all five football leagues.
   IMPORTANT: do not modify source fixtures, model IDs, ranks, archived predictions,
   odds, settlement, or calculations. This file only translates visible strings. */
(function(){
  'use strict';
  const lexicon={
  "Premier League": "英超",
  "English Premier League": "英超",
  "Bundesliga": "德甲",
  "German Bundesliga": "德甲",
  "La Liga": "西甲",
  "LaLiga": "西甲",
  "Spanish La Liga": "西甲",
  "Serie A": "義甲",
  "Italian Serie A": "義甲",
  "Ligue 1": "法甲",
  "French Ligue 1": "法甲",
  "EPL": "英超",
  "BUNDESLIGA": "德甲",
  "LALIGA": "西甲",
  "SERIEA": "義甲",
  "LIGUE1": "法甲",
  "Manchester City": "曼城",
  "Manchester United": "曼聯",
  "Fulham": "富勒姆",
  "Bournemouth": "伯恩茅斯",
  "Nottingham Forest": "諾丁漢森林",
  "Aston Villa": "阿斯頓維拉",
  "Sunderland": "桑德蘭",
  "Chelsea": "切爾西",
  "Leeds United": "里茲聯",
  "Coventry City": "考文垂",
  "Crystal Palace": "水晶宮",
  "Tottenham Hotspur": "托特納姆熱刺",
  "Tottenham": "熱刺",
  "Ipswich Town": "伊普斯維奇",
  "Newcastle United": "紐卡索聯",
  "Arsenal": "阿森納",
  "Hull City": "赫爾城",
  "Brighton & Hove Albion": "布萊頓",
  "Brighton": "布萊頓",
  "Liverpool": "利物浦",
  "Brentford": "布倫特福德",
  "Everton": "艾佛頓",
  "Bayern Munich": "拜仁慕尼黑",
  "FC Bayern München": "拜仁慕尼黑",
  "Cologne": "科隆",
  "FC Köln": "科隆",
  "Bayer Leverkusen": "勒沃庫森",
  "Paderborn": "帕德博恩",
  "Eintracht Frankfurt": "法蘭克福",
  "Hoffenheim": "霍芬海姆",
  "Union Berlin": "柏林聯合",
  "RB Leipzig": "萊比錫紅牛",
  "Borussia Monchengladbach": "門興格拉德巴赫",
  "Borussia Mönchengladbach": "門興格拉德巴赫",
  "Borussia Dortmund": "多特蒙德",
  "Elversberg": "艾禾斯堡",
  "Freiburg": "弗萊堡",
  "Schalke 04": "沙爾克04",
  "Stuttgart": "斯圖加特",
  "Augsburg": "奧格斯堡",
  "Mainz": "美因茨",
  "Werder Bremen": "文達不萊梅",
  "Hamburg": "漢堡",
  "RB萊比錫": "萊比錫紅牛",
  "Athletic Club": "畢爾包競技",
  "Athletic Bilbao": "畢爾包競技",
  "Espanyol": "西班牙人",
  "Alaves": "阿拉維斯",
  "Deportivo La Coruna": "拉科魯尼亞",
  "Deportivo La Coruña": "拉科魯尼亞",
  "Rayo Vallecano": "巴列卡諾",
  "Valencia": "瓦倫西亞",
  "Sevilla": "塞維亞",
  "Real Betis": "皇家貝提斯",
  "Real Madrid": "皇家馬德里",
  "Celta Vigo": "塞爾塔",
  "Barcelona": "巴塞隆納",
  "Villarreal": "比利亞雷亞爾",
  "Racing Santander": "桑坦德競技",
  "Real Sociedad": "皇家社會",
  "Osasuna": "奧薩蘇納",
  "Malaga": "馬拉加",
  "Málaga": "馬拉加",
  "Getafe": "赫塔費",
  "Atletico Madrid": "馬德里競技",
  "Atlético Madrid": "馬德里競技",
  "Levante": "萊萬特",
  "Elche": "埃爾切",
  "Como 1907": "科莫",
  "Como": "科莫",
  "Cagliari Calcio": "卡利亞里",
  "Cagliari": "卡利亞里",
  "SS Lazio": "拉齊奧",
  "Lazio": "拉齊奧",
  "US Lecce": "萊切",
  "Lecce": "萊切",
  "Parma Calcio 1913": "帕爾馬",
  "Parma": "帕爾馬",
  "AS Roma": "羅馬",
  "Roma": "羅馬",
  "SSC Napoli": "拿坡里",
  "Napoli": "拿坡里",
  "Torino FC": "杜林",
  "Torino": "杜林",
  "Juventus FC": "尤文圖斯",
  "Juventus": "尤文圖斯",
  "Venezia FC": "威尼斯",
  "Venezia": "威尼斯",
  "Bologna FC 1909": "波隆那",
  "Bologna": "波隆那",
  "Udinese Calcio": "烏迪內斯",
  "Udinese": "烏迪內斯",
  "US Sassuolo Calcio": "薩索羅",
  "Sassuolo": "薩索羅",
  "Genoa CFC": "熱那亞",
  "Genoa": "熱那亞",
  "AC Milan": "AC米蘭",
  "Milan": "AC米蘭",
  "Frosinone Calcio": "弗羅西諾內",
  "Frosinone": "弗羅西諾內",
  "Atalanta BC": "亞特蘭大",
  "Atalanta": "亞特蘭大",
  "FC Internazionale Milano": "國際米蘭",
  "Internazionale": "國際米蘭",
  "Inter": "國際米蘭",
  "AC Monza": "蒙札",
  "Monza": "蒙札",
  "ACF Fiorentina": "佛羅倫斯",
  "Fiorentina": "佛羅倫斯",
  "Troyes": "特魯瓦",
  "Le Havre": "勒阿弗爾",
  "Nice": "尼斯",
  "Paris Saint-Germain": "巴黎聖日耳曼",
  "Paris SG": "巴黎聖日耳曼",
  "PSG": "巴黎聖日耳曼",
  "Monaco": "摩納哥",
  "Auxerre": "歐塞爾",
  "Lens": "朗斯",
  "Toulouse": "土魯斯",
  "Lille": "里爾",
  "Lyon": "里昂",
  "Strasbourg": "史特拉斯堡",
  "Brest": "布雷斯特",
  "Paris FC": "巴黎足球會",
  "Angers": "昂熱",
  "Lorient": "洛里昂",
  "Rennes": "雷恩",
  "Marseille": "馬賽",
  "Le Mans": "勒芒"
};
  const ordered=Object.entries(lexicon).sort((a,b)=>b[0].length-a[0].length);
  const escapeRx=s=>s.replace(/[.*+?^$\{\}()|[\]\\]/g,'\\$&');
  const rules=ordered.map(([a,b])=>[new RegExp('(^|[^A-Za-z0-9_])'+escapeRx(a)+'(?=$|[^A-Za-z0-9_])','g'),b]);
  function translate(text){
    let out=String(text??'');
    for(const [re,zh] of rules) out=out.replace(re,(_whole,prefix)=>prefix+zh);
    out=out.replace(/(英超|德甲|西甲|義甲|法甲)\\s+\\1/g,'$1');
    return out;
  }
  window.FOOTBALL_ZH_TW=Object.freeze({translate,lexicon:Object.freeze(lexicon)});
  function translateNode(root){
    if(!root || (root.nodeType!==1 && root.nodeType!==3))return;
    const ignored='SCRIPT,STYLE,TEXTAREA,CODE,PRE,NOSCRIPT';
    if(root.nodeType===3){
      if(!root.parentElement || root.parentElement.closest('script,style,textarea,code,pre,noscript'))return;
      const before=root.nodeValue,after=translate(before);
      if(after!==before)root.nodeValue=after;
      return;
    }
    if(root.matches && root.matches('script,style,textarea,code,pre,noscript'))return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    for(const node of nodes){
      if(!node.parentElement || node.parentElement.closest('script,style,textarea,code,pre,noscript'))continue;
      const a=node.nodeValue,b=translate(a);if(a!==b)node.nodeValue=b;
    }
    if(root.querySelectorAll)for(const element of [root,...root.querySelectorAll('[title],[aria-label],[placeholder]')]){
      for(const attr of ['title','aria-label','placeholder']){
        const v=element.getAttribute?.(attr);if(v && v!==translate(v))element.setAttribute(attr,translate(v));
      }
    }
  }
  function init(){
    document.title=translate(document.title);
    translateNode(document.body);
    new MutationObserver(records=>{
      for(const record of records)for(const node of record.addedNodes)translateNode(node);
    }).observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
