#!/usr/bin/env python3
"""EPL parity Research-only prematch gate V1.

Read a sealed pre-kick JSON snapshot; never fetch results, train, modify
official picks, or use any information not present in the supplied snapshot.

Run: python tools/epl_parity_shadow_gate_v1.py snapshot.json
Input:
{
  "league":"EPL","season":"2026-27","gw":11,
  "record_id":"immutable-prematch-record-id",
  "captured_at_utc":"2026-11-18T09:00:00Z",
  "first_kickoff_utc":"2026-11-20T12:00:00Z",
  "fixtures":[
    {"id":"EPL-GW11-01","home":"Team A","away":"Team B",
     "signals":{
        "data":{"p_odd":0.57,"vote":"單","selected":true},
        "calendar":{"p_odd":0.55,"vote":"單","selected":true},
        "meta":{"p_odd":0.52,"vote":"單","selected":false}
     }
    }
  ]
}
All model signals must have been recorded in the immutable input snapshot.
Examples above describe the schema, NOT actual fixtures/probabilities.
"""
import datetime as dt
import json
import sys
from pathlib import Path

def parse_time(s):
    value=dt.datetime.fromisoformat(s.replace("Z","+00:00"))
    if value.tzinfo is None:
        raise ValueError("Timezone required")
    return value.astimezone(dt.timezone.utc)

def run(snapshot):
    if snapshot.get("league")!="EPL" or not isinstance(snapshot.get("gw"),int):
        raise ValueError("Expected EPL and numeric GW")
    required=("record_id","captured_at_utc","first_kickoff_utc","fixtures")
    if any(k not in snapshot for k in required):
        raise ValueError("Missing snapshot identity/timestamp/fixtures")
    first=parse_time(snapshot["first_kickoff_utc"])
    captured=parse_time(snapshot["captured_at_utc"])
    if not captured<first:
        raise ValueError("Snapshot not strictly before earliest kickoff")
    rows=[]
    ids=set()
    for f in snapshot["fixtures"]:
        mid=f["id"]
        if mid in ids:
            raise ValueError("Duplicate match id")
        ids.add(mid)
        signals=f.get("signals") or {}
        d=signals.get("data")
        row={"match_id":mid,"fixture":f["home"]+" vs "+f["away"],
             "margin":"MISSING","stability":"MISSING","risk":"NOT_RUN",
             "shadow_candidate":False,"direction":None}
        if isinstance(d,dict) and d.get("vote") in ("單","雙") and d.get("selected") is True:
            p=d.get("p_odd")
            if isinstance(p,(int,float)) and 0<=p<=1:
                margin=abs(p-0.5)
                row["margin"]="PASS" if margin>=0.01 else "FAIL"
                row["margin_value"]=round(margin,6)
                valid=[]
                for name in ("data","calendar","meta"):
                    m=signals.get(name)
                    if not isinstance(m,dict):continue
                    v=m.get("p_odd")
                    if m.get("selected") is True and m.get("vote") in ("單","雙") and isinstance(v,(int,float)) and 0<=v<=1:
                        valid.append(m)
                if len(valid)>=2:
                    matches=sum(x["vote"]==d["vote"] for x in valid)
                    row["stability"]="PASS" if matches>=2 else "FAIL"
                row["direction"]=d["vote"]
                row["shadow_candidate"]=row["margin"]=="PASS" and row["stability"]=="PASS"
        rows.append(row)
    passed=sorted((r for r in rows if r["shadow_candidate"]),
                  key=lambda r:(-r["margin_value"],r["match_id"]))
    ranked={f"R{i}":(
        {"fixture":passed[i-1]["fixture"],"match_id":passed[i-1]["match_id"],
         "direction":passed[i-1]["direction"]}
        if i<=len(passed) else "PASS"
    ) for i in (1,2,3)}
    return {"record_id":snapshot["record_id"],"league":"EPL",
            "season":snapshot.get("season"),"gw":snapshot["gw"],
            "status":"RESEARCH_ONLY_NOT_PROMOTED",
            "captured_at_utc":snapshot["captured_at_utc"],
            "research_ranks":ranked,"fixture_gates":rows,
            "risk_gate":"NOT_RUN_UNTIL_FROZEN_PREMATCH_RISK_FEATURES",
            "official_change":"NONE","result_input_used":False}

if __name__=="__main__":
    if len(sys.argv)!=2:sys.exit("Usage: epl_parity_shadow_gate_v1.py snapshot.json")
    data=json.loads(Path(sys.argv[1]).read_text(encoding="utf8"))
    print(json.dumps(run(data),ensure_ascii=False,indent=2))
