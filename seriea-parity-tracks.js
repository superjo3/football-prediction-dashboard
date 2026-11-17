/* Serie A GW12 three-track parity comparison. A is the already-archived website Research line; B/C are independent Research/Shadow tracks. */
window.SERIEA_PARITY_TRIPLE = {
  "schema_version":"SERIEA-PARITY-THREE-TRACK-V1",
  "league":"SERIEA",
  "season":"2026-27",
  "gw":12,
  "record_id":"SERIEA-2026-27-GW12-20261109-EARLY-MARKETPROXY-RESEARCH",
  "updated_at_taipei":"2026-11-17",
  "policy":{
    "A":"Existing GW12 website Research / EARLY-MARKETPROXY parity line; not old WF6/R90 Exact",
    "B":"SERIEA-R90-STYLE-REPRO-V1-FROZEN; deterministic Fixed Runner challenger; TEST_ONLY on the frozen GW12 input",
    "C":"Bazi + Meihua + Ziwei Robust Vote; Research/Shadow",
    "official_stats":"A/B/C are not merged into historical Official hit-rate denominators",
    "archive":"Original A record remains immutable; B/C are display-side research tracks"
  },
  "fixtures":[
    {"home":"Como","away":"Cagliari","a_direction":"雙","a_rank":3,"b_direction":"雙","b_rank":null,"c_direction":"單","c_rank":1},
    {"home":"Lazio","away":"Lecce","a_direction":"雙","a_rank":null,"b_direction":"雙","b_rank":null,"c_direction":"單","c_rank":2},
    {"home":"Parma","away":"Roma","a_direction":"單","a_rank":null,"b_direction":"單","b_rank":2,"c_direction":"單","c_rank":3},
    {"home":"Napoli","away":"Torino","a_direction":"雙","a_rank":2,"b_direction":"單","b_rank":null,"c_direction":"單","c_rank":null},
    {"home":"Juventus","away":"Venezia","a_direction":"雙","a_rank":null,"b_direction":"單","b_rank":null,"c_direction":"單","c_rank":null},
    {"home":"Bologna","away":"Udinese","a_direction":"單","a_rank":null,"b_direction":"單","b_rank":null,"c_direction":"單","c_rank":null},
    {"home":"Sassuolo","away":"Genoa","a_direction":"雙","a_rank":null,"b_direction":"單","b_rank":null,"c_direction":"單","c_rank":null},
    {"home":"Milan","away":"Frosinone","a_direction":"雙","a_rank":1,"b_direction":"單","b_rank":null,"c_direction":"單","c_rank":null},
    {"home":"Atalanta","away":"Inter","a_direction":"雙","a_rank":null,"b_direction":"單","b_rank":1,"c_direction":"單","c_rank":null},
    {"home":"Monza","away":"Fiorentina","a_direction":"雙","a_rank":null,"b_direction":"單","b_rank":3,"c_direction":"單","c_rank":null}
  ],
  "b_artifact":{
    "model":"SERIEA-R90-STYLE-REPRO-V1-FROZEN",
    "model_sha256":"bf958e0ebee03aef84a02696120ffb1ab845bce5f680e63395b233785b13297e",
    "input_sha256":"f7ce4d0257e4fc0e3bfa75d019bf9b795d1d43a821d8c41bd52dcead316774a3",
    "status":"TEST_ONLY / FROZEN_CHALLENGER"
  },
  "c_artifact":{
    "model":"XUAN-ROBUST-VOTE-V1",
    "methods":["Bazi cyclic","Meihua robust","Ziwei cyclic"],
    "status":"RESEARCH_SHADOW_NOT_PROMOTED"
  }
};
