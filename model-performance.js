/* Unified parity model performance registry.
   Policy: any active/prematch-sealed alternative track gets an overall table and R1/R2/R3 table.
   Historical/OOS/replay evidence is displayed separately and never pooled with live-forward results. */
window.MODEL_PERFORMANCE_DATA = {
  schema:"MODEL-PERFORMANCE-MATRIX-V1",
  updated_at:"2026-11-24",
  market:"parity",
  policy:{
    active:"Prematch-sealed / displayed / settleable tracks are listed under current-forward.",
    historical:"Backtest, OOS, replay and retrospective studies are separate reference rows.",
    no_pooling:"Official / Research / Shadow / Challenger and retrospective samples are never pooled.",
    pass:"PASS or rank-not-assigned is shown as N/A, never as 0%.",
    rejected_sweeps:"One-off rejected parameter sweeps without a persistent prediction identity are excluded from the main matrix."
  },
  leagues:{
    EPL:{
      active:[
        {model:"A · Official",status:"OFFICIAL",scope:"2026-27 GW11 strict-forward",overall:{h:6,n:10},r1:{h:1,n:1},r2:{h:1,n:1},r3:{h:0,n:1},top2:{h:2,n:2},top3:{h:2,n:3},note:"現行網站正式線；GW11 已結算。"},
        {model:"B · R90 Recovery Shadow",status:"RESEARCH_SHADOW",scope:"2026-27 GW11 first live-forward",overall:{h:6,n:10},r1:{h:0,n:1},r2:{h:1,n:1},r3:{h:1,n:1},top2:{h:1,n:2},top3:{h:2,n:3},note:"獨立 Shadow；不計 Official。"}
      ],
      historical:[
        {model:"舊 R90 V1 recovered archive",status:"HISTORICAL_RECOVERY",scope:"2022–25 recovered R1/R2 archive",overall_text:"N/A（未恢復完整逐場方向）",r1:{h:84,n:114},r2:{h:68,n:114},r3_text:"N/A",top2:{h:152,n:228},top3_text:"N/A",note:"歷史輸出恢復；原權重／同輪時間戳未完整恢復，不等同目前 Shadow。"}
      ]
    },
    BUNDESLIGA:{
      active:[
        {model:"Official · V2-RG1",status:"OFFICIAL",scope:"2026-27 GW10",overall:{h:6,n:9},r1_text:"PASS",r2_text:"PASS",r3_text:"PASS",top2_text:"PASS",top3_text:"PASS",note:"正式方向9場；正式單雙R位PASS。"},
        {model:"Phase2 Shadow",status:"RESEARCH_SHADOW",scope:"GW10 prematch shadow",overall:{h:6,n:9},r1:{h:1,n:1},r2:{h:0,n:1},r3:{h:1,n:1},top2:{h:1,n:2},top3:{h:2,n:3},note:"方向與Official相同；只改R排序。"},
        {model:"Phase12 三術共振",status:"RESEARCH_PREVIEW",scope:"GW10 research preview",overall:{h:6,n:9},r1:{h:1,n:1},r2:{h:1,n:1},r3:{h:0,n:1},top2:{h:2,n:2},top3:{h:2,n:3},note:"方向不翻；Preview非正式賽前封存。"},
        {model:"P17 Proxy",status:"RESEARCH_PROXY",scope:"GW10 proxy replay",overall:{h:6,n:9},r1_text:"N/A",r2_text:"N/A",r3_text:"N/A",top2_text:"N/A",top3_text:"N/A",note:"有逐場方向；未指派R位。"},
        {model:"P18 Proxy",status:"RESEARCH_PROXY",scope:"GW10 proxy replay",overall:{h:6,n:9},r1_text:"N/A",r2_text:"N/A",r3_text:"N/A",top2_text:"N/A",top3_text:"N/A",note:"有逐場方向；未指派R位。"},
        {model:"Phase2 × P17 × P18 KEEP",status:"RESEARCH_PROXY",scope:"GW10 consensus subset",overall:{h:3,n:3},r1_text:"N/A",r2_text:"N/A",r3_text:"N/A",top2_text:"N/A",top3_text:"N/A",note:"3/9場KEEP subset，全中3/3；不是整輪勝率。"}
      ],
      historical:[
        {model:"Phase2",status:"RETROSPECTIVE",scope:"2024–26 replay · 68 rounds",overall_text:"N/A（R排序研究）",r1:{h:41,n:68},r2:{h:47,n:68},r3:{h:44,n:68},top2:{h:88,n:136},top3:{h:132,n:204},note:"歷史回放，已受研究影響；非新盲測。"},
        {model:"Phase12",status:"RETROSPECTIVE",scope:"2024–26 replay · 68 rounds",overall_text:"N/A（R排序研究）",r1:{h:47,n:68},r2:{h:45,n:68},r3:{h:42,n:68},top2:{h:92,n:136},top3:{h:134,n:204},note:"歷史回放；PROMOTE NONE。"},
        {model:"P17/P18 consensus KEEP",status:"EXPLORATORY",scope:"2024–26 exploratory subset",overall:{h:35,n:45},r1_text:"N/A",r2_text:"N/A",r3_text:"N/A",top2_text:"N/A",top3_text:"N/A",note:"只覆蓋45/136歷史R位置；不可當整輪77.78%。"}
      ]
    },
    LALIGA:{
      active:[
        {model:"A · V2 Research Continuity",status:"RESEARCH",scope:"2026-27 GW13 prospective",overall:{h:5,n:10},r1:{h:1,n:1},r2:{h:1,n:1},r3:{h:1,n:1},top2:{h:2,n:2},top3:{h:3,n:3},note:"正式高信心仍PASS；研究順位。"},
        {model:"B · Fixed EXTENDED",status:"RESEARCH_CHALLENGER",scope:"2026-27 GW13 prospective",overall:{h:7,n:10},r1:{h:1,n:1},r2:{h:1,n:1},r3:{h:0,n:1},top2:{h:2,n:2},top3:{h:2,n:3},note:"六季固定模型；GW13是真正賽前前推。"},
        {model:"C · REBUILT V1",status:"RESEARCH_CHALLENGER",scope:"2026-27 GW13 prospective",overall:{h:8,n:10},r1:{h:1,n:1},r2:{h:1,n:1},r3:{h:1,n:1},top2:{h:2,n:2},top3:{h:3,n:3},note:"GW13 賽前封存的新重建研究版，非原版 V2 Exact；GW14 賽前預測尚未結算，不計入勝率。"},
        {model:"MARKETPROXY · GW13早期基準",status:"RESEARCH_BASELINE",scope:"2026-27 GW13 pre-match",overall:{h:7,n:10},r1:{h:1,n:1},r2:{h:0,n:1},r3:{h:1,n:1},top2:{h:1,n:2},top3:{h:2,n:3},note:"11/09獨立研究版本，不是A/B/C第四條主線；只作GW13基準，不與三主線或Official混算。"}
      ],
      historical:[
        {model:"A · V2 Research",status:"HISTORICAL_FROZEN",scope:"GW9–12 original frozen",overall:{h:30,n:40},r1_text:"N/A",r2_text:"N/A",r3_text:"N/A",top2:{h:7,n:8},top3_text:"N/A",note:"只保存R1+R2合計，不能拆成個別R位。"},
        {model:"B · EXTENDED matched subset",status:"RETROSPECTIVE_HOLDOUT",scope:"GW9–12 matched",overall:{h:21,n:40},r1_text:"N/A",r2_text:"N/A",r3_text:"N/A",top2:{h:8,n:8},top3_text:"N/A",note:"回溯留出，不是當時逐輪發布。"},
        {model:"B · EXTENDED",status:"RETROSPECTIVE_HOLDOUT",scope:"GW1–12 holdout",overall:{h:74,n:119},r1:{h:10,n:12},r2:{h:11,n:12},r3:{h:9,n:12},top2:{h:21,n:24},top3:{h:30,n:36},note:"回溯留出；與GW13 prospective分開。"}
      ]
    },
    SERIEA:{
      active:[
        {model:"A · 現行網站 Research",status:"RESEARCH",scope:"2026-27 GW12 prospective",overall:{h:5,n:10},r1:{h:1,n:1},r2:{h:0,n:1},r3:{h:1,n:1},top2:{h:1,n:2},top3:{h:2,n:3},note:"EARLY-MARKETPROXY；非舊WF6/R90 Exact。"},
        {model:"B · Fixed Runner V1",status:"FROZEN_CHALLENGER",scope:"2026-27 GW12 first forward comparison",overall:{h:3,n:10},r1:{h:0,n:1},r2:{h:0,n:1},r3:{h:1,n:1},top2:{h:0,n:2},top3:{h:1,n:3},note:"可重複固定模型；尚未PROMOTE。"},
        {model:"C · Xuan Robust Vote",status:"RESEARCH_SHADOW",scope:"2026-27 GW12 forward shadow",overall:{h:3,n:10},r1:{h:0,n:1},r2:{h:1,n:1},r3:{h:0,n:1},top2:{h:1,n:2},top3:{h:1,n:3},note:"目前C版；與下方舊XUAN_VOTE研究不是完全同一實作。"}
      ],
      historical:[
        {model:"B · Fixed Runner V1",status:"HOLDOUT",scope:"2025–26 holdout",overall:{h:210,n:380},r1:{h:20,n:38},r2:{h:21,n:38},r3:{h:22,n:38},top2:{h:41,n:76},top3:{h:63,n:114},note:"與現行B同一固定模型家族；只作模型卡。"},
        {model:"BAZI",status:"OOS_RESEARCH",scope:"2024–26 OOS audit",overall:{h:388,n:760},r1:{h:37,n:76},r2:{h:45,n:76},r3:{h:38,n:76},top2:{h:82,n:152},top3:{h:120,n:228},note:"玄學方向研究；未PROMOTE。"},
        {model:"MEIHUA",status:"OOS_RESEARCH",scope:"2024–26 OOS audit",overall:{h:381,n:760},r1:{h:40,n:76},r2:{h:33,n:76},r3:{h:40,n:76},top2:{h:73,n:152},top3:{h:113,n:228},note:"玄學方向研究。"},
        {model:"ZIWEI",status:"OOS_RESEARCH",scope:"2024–26 OOS audit",overall:{h:380,n:760},r1:{h:42,n:76},r2:{h:33,n:76},r3:{h:38,n:76},top2:{h:75,n:152},top3:{h:113,n:228},note:"玄學方向研究。"},
        {model:"XUAN_VOTE",status:"OOS_RESEARCH",scope:"2024–26 OOS audit",overall:{h:388,n:760},r1:{h:46,n:76},r2:{h:34,n:76},r3:{h:36,n:76},top2:{h:80,n:152},top3:{h:116,n:228},note:"舊OOS三術票決研究；不等同目前C robust-cycle實作。"},
        {model:"XUAN_MEAN",status:"OOS_RESEARCH",scope:"2024–26 OOS audit",overall:{h:380,n:760},r1:{h:46,n:76},r2:{h:34,n:76},r3:{h:38,n:76},top2:{h:80,n:152},top3:{h:118,n:228},note:"研究線。"},
        {model:"TIME_ONLY",status:"NEGATIVE_CONTROL",scope:"2024–26 OOS audit",overall:{h:365,n:760},r1:{h:31,n:76},r2:{h:41,n:76},r3:{h:34,n:76},top2:{h:72,n:152},top3:{h:106,n:228},note:"純時間負對照。"},
        {model:"XUAN_CAL",status:"OOS_RESEARCH",scope:"2024–26 OOS audit",overall:{h:378,n:760},r1:{h:40,n:76},r2:{h:29,n:76},r3:{h:35,n:76},top2:{h:69,n:152},top3:{h:104,n:228},note:"Phase12式校準研究。"},
        {model:"TIME+XUAN",status:"OOS_RESEARCH",scope:"2024–26 OOS audit",overall:{h:367,n:760},r1:{h:42,n:76},r2:{h:34,n:76},r3:{h:41,n:76},top2:{h:76,n:152},top3:{h:117,n:228},note:"時間＋玄學研究。"}
      ]
    },
    LIGUE1:{
      active:[
        {model:"Official sparse selector",status:"OFFICIAL",scope:"2026-27 GW11",overall_text:"PASS（0注）",r1_text:"PASS",r2_text:"PASS",r3_text:"PASS",top2_text:"PASS",top3_text:"PASS",note:"正式單雙selector沒有觸發。"},
        {model:"BASE / Relative Shadow",status:"SHADOW",scope:"GW11 prospective",overall:{h:6,n:9},r1:{h:0,n:1},r2:{h:0,n:1},r3:{h:1,n:1},top2:{h:0,n:2},top3:{h:1,n:3},note:"底層方向6/9；forced-relative R只1/3。"},
        {model:"BAZI",status:"XUAN_SHADOW",scope:"GW11 prospective R-ranking",overall_text:"同BASE方向 6/9",r1:{h:1,n:1},r2:{h:1,n:1},r3:{h:1,n:1},top2:{h:2,n:2},top3:{h:3,n:3},note:"只改選場/排序，不翻方向。"},
        {model:"MEIHUA",status:"XUAN_SHADOW",scope:"GW11 prospective R-ranking",overall_text:"同BASE方向 6/9",r1:{h:1,n:1},r2:{h:1,n:1},r3:{h:1,n:1},top2:{h:2,n:2},top3:{h:3,n:3},note:"只改選場/排序。"},
        {model:"ZIWEI",status:"XUAN_SHADOW",scope:"GW11 prospective R-ranking",overall_text:"同BASE方向 6/9",r1:{h:1,n:1},r2:{h:0,n:1},r3:{h:1,n:1},top2:{h:1,n:2},top3:{h:2,n:3},note:"只改選場/排序。"},
        {model:"XUAN-VOTE",status:"XUAN_SHADOW",scope:"GW11 prospective R-ranking",overall_text:"同BASE方向 6/9",r1:{h:1,n:1},r2:{h:1,n:1},r3:{h:1,n:1},top2:{h:2,n:2},top3:{h:3,n:3},note:"首輪3/3；樣本極小。"},
        {model:"XUAN-MEAN",status:"XUAN_SHADOW",scope:"GW11 prospective R-ranking",overall_text:"同BASE方向 6/9",r1:{h:1,n:1},r2:{h:0,n:1},r3:{h:1,n:1},top2:{h:1,n:2},top3:{h:2,n:3},note:"首輪2/3。"},
        {model:"TIME-ONLY",status:"NEGATIVE_CONTROL",scope:"GW11 prospective R-ranking",overall_text:"同BASE方向 6/9",r1:{h:1,n:1},r2:{h:1,n:1},r3:{h:0,n:1},top2:{h:2,n:2},top3:{h:2,n:3},note:"負對照也有2/3，不能把玄學3/3過度解讀。"},
        {model:"TIME-CONTROL",status:"NEGATIVE_CONTROL",scope:"GW11 prospective R-ranking",overall_text:"同BASE方向 6/9",r1:{h:0,n:1},r2:{h:1,n:1},r3:{h:1,n:1},top2:{h:1,n:2},top3:{h:2,n:3},note:"時間控制。"},
        {model:"XUAN-CAL",status:"XUAN_SHADOW",scope:"GW11 prospective R-ranking",overall_text:"同BASE方向 6/9",r1:{h:0,n:1},r2:{h:1,n:1},r3:{h:1,n:1},top2:{h:1,n:2},top3:{h:2,n:3},note:"Phase12 challenger。"},
        {model:"TIME+XUAN",status:"XUAN_SHADOW",scope:"GW11 prospective R-ranking",overall_text:"同BASE方向 6/9",r1:{h:0,n:1},r2:{h:1,n:1},r3:{h:1,n:1},top2:{h:1,n:2},top3:{h:2,n:3},note:"時間＋三術。"}
      ],
      historical:[
        {model:"BASE",status:"FIXED_EVAL",scope:"2024–26 · 68 rounds",overall_text:"N/A（R排序評估）",r1:{h:28,n:68},r2:{h:36,n:68},r3:{h:38,n:68},top2:{h:64,n:136},top3:{h:102,n:204},note:"forced-relative baseline；不是正式sparse selector。"},
        {model:"BAZI",status:"FIXED_EVAL",scope:"2024–26 · 68 rounds",overall_text:"同BASE方向；只重排",r1:{h:37,n:68},r2:{h:37,n:68},r3:{h:39,n:68},top2:{h:74,n:136},top3:{h:113,n:204},note:"歷史固定評估。"},
        {model:"MEIHUA",status:"FIXED_EVAL",scope:"2024–26 · 68 rounds",overall_text:"同BASE方向；只重排",r1:{h:38,n:68},r2:{h:38,n:68},r3:{h:38,n:68},top2:{h:76,n:136},top3:{h:114,n:204},note:"歷史最佳Top2 55.88%；仍未達75%。"},
        {model:"ZIWEI",status:"FIXED_EVAL",scope:"2024–26 · 68 rounds",overall_text:"同BASE方向；只重排",r1:{h:30,n:68},r2:{h:36,n:68},r3:{h:29,n:68},top2:{h:66,n:136},top3:{h:95,n:204},note:"歷史固定評估。"},
        {model:"XUAN-VOTE",status:"FIXED_EVAL",scope:"2024–26 · 68 rounds",overall_text:"同BASE方向；只重排",r1:{h:33,n:68},r2:{h:38,n:68},r3:{h:35,n:68},top2:{h:71,n:136},top3:{h:106,n:204},note:"歷史固定評估。"},
        {model:"XUAN-MEAN",status:"FIXED_EVAL",scope:"2024–26 · 68 rounds",overall_text:"同BASE方向；只重排",r1:{h:33,n:68},r2:{h:35,n:68},r3:{h:35,n:68},top2:{h:68,n:136},top3:{h:103,n:204},note:"歷史固定評估。"},
        {model:"TIME-ONLY",status:"NEGATIVE_CONTROL",scope:"2024–26 · 68 rounds",overall_text:"同BASE方向；只重排",r1:{h:34,n:68},r2:{h:37,n:68},r3:{h:36,n:68},top2:{h:71,n:136},top3:{h:107,n:204},note:"純時間負對照。"},
        {model:"TIME-CONTROL",status:"NEGATIVE_CONTROL",scope:"2024–26 · 68 rounds",overall_text:"同BASE方向；只重排",r1:{h:27,n:68},r2:{h:38,n:68},r3:{h:31,n:68},top2:{h:65,n:136},top3:{h:96,n:204},note:"時間控制。"},
        {model:"XUAN-CAL",status:"FIXED_EVAL",scope:"2024–26 · 68 rounds",overall_text:"同BASE方向；只重排",r1:{h:29,n:68},r2:{h:31,n:68},r3:{h:29,n:68},top2:{h:60,n:136},top3:{h:89,n:204},note:"Phase12式校準；Top2低於BASE。"},
        {model:"TIME+XUAN",status:"FIXED_EVAL",scope:"2024–26 · 68 rounds",overall_text:"同BASE方向；只重排",r1:{h:28,n:68},r2:{h:30,n:68},r3:{h:30,n:68},top2:{h:58,n:136},top3:{h:88,n:204},note:"時間＋三術固定評估。"}
      ]
    }
  }
};