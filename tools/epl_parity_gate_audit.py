#!/usr/bin/env python3
"""EPL parity V12 historical gate audit, research-only (no Official edits).

Usage: python tools/epl_parity_gate_audit.py EPL_Parity_CountDispersion_V12_Complete.zip
Requires only the Python 3 standard library.
"""
import csv
import hashlib
import io
import json
import math
import sys
import zipfile
from collections import defaultdict
from datetime import datetime

MEMBER = "EPL_Parity_CountDispersion_V12/results/selected_picks.csv"
SEASONS = {"2024-2025", "2025-2026"}
CANDIDATES = {"fixed_data", "fixed_calendar", "fixed_meta"}

def stats(items, denom):
    n = len(items)
    hits = sum(x["correct"] for x in items)
    return {"hits": hits, "n": n, "accuracy": round(hits/n, 6) if n else None,
            "coverage": round(n/denom, 6) if denom else 0}

def main(path):
    with zipfile.ZipFile(path) as z:
        bad = z.testzip()
        if bad:
            raise ValueError("Corrupted archive member: "+bad)
        raw = z.read(MEMBER)
    entries=[]
    for row in csv.DictReader(io.StringIO(raw.decode("utf-8-sig"))):
        if row["season"] not in SEASONS or row["candidate"] not in CANDIDATES:
            continue
        t=datetime.fromisoformat(row["local"])
        c=datetime.fromisoformat(row["prediction_cutoff"])
        if c>t:
            raise ValueError("Prediction after scheduled kickoff: "+row["match_id"])
        odd=float(row["p_odd"])
        vote=int(row["vote"])
        target=int(row["target"])
        correct=int(row["correct"])
        if not 0<=odd<=1 or vote not in (0,1) or target not in (0,1) or correct != (vote==target):
            raise ValueError("Invalid frozen outcome/probability")
        entries.append({"season":row["season"],"round":row["round_id"],
                        "match":row["match_id"],"candidate":row["candidate"],
                        "rank":int(row["rank"]),"p_odd":odd,"vote":vote,
                        "correct":correct,"strict":c<t})
    expected=38*2*len(SEASONS)*len(CANDIDATES)
    if len(entries)!=expected:
        raise ValueError("Missing entries, expected "+str(expected))
    rounds=defaultdict(set)
    selected=defaultdict(list)
    for x in entries:
        key=(x["season"],x["round"],x["candidate"])
        if x["rank"] in rounds[key]:
            raise ValueError("Duplicate rank: "+str(key))
        rounds[key].add(x["rank"])
        selected[(x["season"],x["round"],x["match"])].append(x)
    if len(rounds)!=38*len(SEASONS)*len(CANDIDATES) or any(v!={1,2} for v in rounds.values()):
        raise ValueError("Incomplete round rankings")
    base=[x for x in entries if x["candidate"]=="fixed_data"]
    margin=[x for x in base if abs(x["p_odd"]-0.5)>=0.01]
    stability=[x for x in base if sum(y["vote"]==x["vote"]
                for y in selected[(x["season"],x["round"],x["match"])])>=2]
    stable={x["match"] for x in stability}
    both=[x for x in margin if x["match"] in stable]
    experiments={"BASE_V12_fixed_data":base,"MARGIN_ge_1pp":margin,
                 "STABILITY_2of3_same_match_and_direction":stability,
                 "MARGIN_AND_STABILITY":both}
    denominator=sum(x["strict"] for x in base)
    metrics={name:{"legacy":stats(items,len(base)),
                   "strict_pre_kick":stats([x for x in items if x["strict"]],denominator)}
             for name,items in experiments.items()}
    output={"study":"EPL-PARITY-GATES-V1-20261109","status":"RESEARCH_ONLY_NOT_PROMOTED",
            "source_archive":path,"source_member_sha256":hashlib.sha256(raw).hexdigest(),
            "strict_pre_kick_eligible":denominator,
            "equal_to_kickoff_excluded":len(base)-denominator,
            "metrics":metrics,
            "risk_gate":"NOT_RUN_MISSING_PREMATCH_RISK_FEATURES",
            "qualification":"historical exploratory; not blind; not current EPL Official selector"}
    print(json.dumps(output,ensure_ascii=False,indent=2))

if __name__ == "__main__":
    if len(sys.argv)!=2:
        sys.exit("Usage: python epl_parity_gate_audit.py <V12.zip>")
    main(sys.argv[1])
