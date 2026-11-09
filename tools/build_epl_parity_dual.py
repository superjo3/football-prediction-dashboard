#!/usr/bin/env python3
"""Validate the EPL dual-track parity policy and generate the browser's offline JS bridge.

Usage: python tools/build_epl_parity_dual.py --root .
This does not generate model predictions, alter Official data or infer missing scores.
"""
import argparse
import datetime as dt
import hashlib
import json
from pathlib import Path


def parse_time(s):
    d = dt.datetime.fromisoformat(s.replace('Z', '+00:00'))
    if d.tzinfo is None:
        raise ValueError('Timestamp must include timezone')
    return d


def validate(doc):
    assert doc['schema_version'] == 'EPL-PARITY-DUAL-V1'
    assert doc['league'] == 'EPL' and doc['market'] == 'parity'
    assert doc['effective_from_gw'] >= 11
    assert [x['track_id'] for x in doc['tracks']] == ['OFFICIAL', 'R90_RECOVERY_SHADOW']
    assert doc['tracks'][0]['is_official'] and not doc['tracks'][1]['is_official']
    seen = set()
    for round_rec in doc['shadow_records']:
        for key in doc['required_shadow_record_fields']:
            if key not in round_rec:
                raise ValueError(f"Missing shadow field {key}")
        if round_rec['record_id'] in seen:
            raise ValueError('Duplicate Shadow record_id')
        seen.add(round_rec['record_id'])
        if round_rec['season'] != doc['season'] or int(round_rec['gw']) < doc['effective_from_gw']:
            raise ValueError('Shadow records cannot backfill earlier rounds')
        if not round_rec['record_id'].endswith('R90-RECOVERY-SHADOW'):
            raise ValueError('Shadow record_id must use independent suffix')
        if round_rec['status'] not in ('PREMATCH_FROZEN', 'SETTLED', 'SETTLEMENT_INCOMPLETE'):
            raise ValueError('Shadow records must be frozen, not provisional')
        if parse_time(round_rec['prediction_cutoff_utc']) >= parse_time(round_rec['first_kickoff_utc']):
            raise ValueError('Prediction timestamp is not strictly pre-kickoff')
        for field in ('model_artifact_sha256','seal_sha256'):
            if len(round_rec[field]) != 64 or any(c not in '0123456789abcdef' for c in round_rec[field].lower()):
                raise ValueError('Missing valid SHA256: '+field)
        rank_seen, match_seen = set(), set()
        for pick in round_rec['predictions']:
            for key in doc['required_prediction_fields']:
                if key not in pick:
                    raise ValueError(f'Missing pick field: {key}')
            if pick['match_id'] in match_seen:
                raise ValueError('Duplicate match_id')
            match_seen.add(pick['match_id'])
            if pick['direction'] not in ('單','雙','PASS'):
                raise ValueError('Direction must be 單/雙/PASS')
            rank = pick['rank']
            if rank is not None:
                if pick['direction'] == 'PASS' or rank not in (1,2,3) or rank in rank_seen:
                    raise ValueError('Duplicate/invalid R1/R2/R3 rank')
                rank_seen.add(rank)
        if rank_seen != {1,2,3}:
            raise ValueError('R1/R2/R3 must all be present and active when sealing a round')
        if len(round_rec['predictions']) != 10:
            raise ValueError('EPL shadow must include all 10 fixtures (may PASS)')
    return doc


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=Path('.'))
    args = parser.parse_args()
    source = args.root/'data/epl_parity_dual_track.json'
    target = args.root/'epl-parity-tracks.js'
    doc = validate(json.loads(source.read_text(encoding='utf-8')))
    output = '/* Generated from data/epl_parity_dual_track.json: do not edit manually. */\nwindow.EPL_PARITY_DUAL = '+json.dumps(doc, ensure_ascii=False, separators=(',',':'))+';\n'
    target.write_text(output, encoding='utf-8')
    print(f"VALID schema={doc['schema_version']} shadow_records={len(doc['shadow_records'])}")
    print(f"JSON SHA256={hashlib.sha256(source.read_bytes()).hexdigest()}")
    print(f"JS SHA256={hashlib.sha256(target.read_bytes()).hexdigest()}")

if __name__=='__main__':
    main()