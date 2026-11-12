#!/usr/bin/env python3
"""Repro and anti-leakage gate. Synthetic GW12 is ENGINEERING-ONLY, never a football forecast."""
from __future__ import annotations
import copy,datetime as dt,hashlib,json,subprocess,sys,tempfile
from pathlib import Path
import numpy as np
import pandas as pd
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT));import run_epl_fixed as engine

def test():
 inp=json.loads((ROOT/'inputs/gw11_archived.json').read_text());model=ROOT/'assets/R90_RECOVERY_MATH5_SHADOW_GW11.joblib';prior=ROOT/'assets/prior_rates_2025.json';manifest=ROOT/'model_manifest.json';origin=pd.read_csv(ROOT/'tests/GW11_MODEL_OUTPUTS.csv')
 with tempfile.TemporaryDirectory(prefix='epl_fixed_v1_') as d:
  root=Path(d);out=[]
  for suffix in ('a','b'):
   path=root/f'replay_{suffix}';f=engine.run(ROOT/'inputs/gw11_archived.json',model,prior,manifest,'replay',path)
   out.append(path);assert len(f['predictions'])==10
  csv_sha=lambda p:engine.sha(p/'MODEL_OUTPUTS.csv')
  assert csv_sha(out[0])==csv_sha(out[1])==engine.sha(ROOT/'tests/GW11_MODEL_OUTPUTS.csv'),'GW11 full 38-column CSV not byte-for-byte identical'
  assert engine.sha(out[0]/'forecast.json')==engine.sha(out[1]/'forecast.json'),'Replay output must be deterministic'
  b=pd.read_csv(out[0]/'MODEL_OUTPUTS.csv');assert list(origin.columns)==list(b.columns) and origin.shape==b.shape
  for col in ['pick_1x2','rank_1x2','pick_ou25','rank_ou25','official_direction','official_rank','shadow_direction','shadow_rank']:
   assert (origin[col].fillna('-')==b[col].fillna('-')).all(),col
  print('PASS 1/10: GW11 replay twice, 38 columns byte-identical, all 10 directions and 4 R slots')
  copy_doc=copy.deepcopy(inp);copy_doc['fixtures']=list(reversed(copy_doc['fixtures']));ff=root/'shuffled.json';ff.write_text(json.dumps(copy_doc,ensure_ascii=False))
  engine.run(ff,model,prior,manifest,'replay',root/'shuffled');assert csv_sha(root/'shuffled')==csv_sha(out[0])
  print('PASS 2/10: fixture order invariant')
  synthetic=copy.deepcopy(inp);synthetic.update({'purpose':'TEST_ONLY','gw':12,'record_id':'EPL-2026-27-GW12-SYNTHETIC-DO-NOT-PUBLISH'})
  def advance(s,days):return (engine.utcdate(s)+dt.timedelta(days=days)).isoformat()
  synthetic['prediction_cutoff_utc']=advance(inp['prediction_cutoff_utc'],7)
  synthetic['first_kickoff_utc']=advance(inp['first_kickoff_utc'],7)
  synthetic['team_snapshot']['through_gw']=11
  for f in synthetic['fixtures']:
   f['match_id']=f['match_id'].replace('GW11','GW12');f['kickoff_utc']=advance(f['kickoff_utc'],7)
   f['market_odds']['1X2']['home']+=.25;f['market_odds']['OU25']['over']+=.18
  ff=root/'synthetic_gw12.json';ff.write_text(json.dumps(synthetic,ensure_ascii=False))
  outpath=root/'synthetic_gw12';res=engine.run(ff,model,prior,manifest,'test',outpath)
  assert res['status']=='TEST_ONLY' and res['gw']==12 and len(res['predictions'])==10
  assert csv_sha(outpath)!=csv_sha(out[0]);assert all(x['match_id'].startswith('EPL-2026-27-GW12-') for x in res['predictions'])
  print('PASS 3/10: different synthetic GW12 input, SAME runner and weights, outputs TEST_ONLY')
  def must_block(mutator,mode='test',model_path=model,prior_path=prior,manifest_path=manifest):
   draft=copy.deepcopy(synthetic);mutator(draft)
   path=root/'invalid.json';path.write_text(json.dumps(draft,ensure_ascii=False))
   try:engine.run(path,model_path,prior_path,manifest_path,mode,root/'bad_output')
   except (ValueError,KeyError):return
   raise AssertionError('Validation failed to block invalid input')
  must_block(lambda x:x['fixtures'][1].update(match_id=x['fixtures'][0]['match_id']))
  print('PASS 4/10: duplicate fixture blocked')
  must_block(lambda x:x['team_snapshot']['teams'].pop('Everton'))
  print('PASS 5/10: missing team snapshot blocked')
  must_block(lambda x:x['fixtures'][3]['market_odds']['OU25'].update(over=0.8))
  print('PASS 6/10: invalid odds blocked')
  must_block(lambda x:x.update(prediction_cutoff_utc=x['first_kickoff_utc']))
  print('PASS 7/10: cutoff not before first kickoff blocked')
  must_block(lambda x:x['fixtures'][0].update(score=[1,0]))
  print('PASS 8/10: post-match score leakage blocked')
  must_block(lambda x:x.update(purpose='PREMATCH'),mode='prematch')
  def bad_prematch(x):
   x['purpose']='PREMATCH';x['market_snapshot'].update(capture_time_verified=True,captured_at_utc=advance(x['prediction_cutoff_utc'],1));x['team_snapshot'].update(capture_time_verified=True,captured_at_utc=x['prediction_cutoff_utc'])
  must_block(bad_prematch,mode='prematch')
  print('PASS 9/10: unverifiable and post-cutoff source times blocked')
  badmanifest=json.loads(manifest.read_text());badmanifest['model_sha256']='0'*64;badfile=root/'tampered_manifest.json';badfile.write_text(json.dumps(badmanifest))
  try:engine.run(ff,model,prior,badfile,'test',root/'bad_output');raise AssertionError('Tampered artifact passed')
  except ValueError:pass
  print('PASS 10/10: frozen model SHA256 tamper blocked')
 print('ALL PASS: round-independent fixed two-track execution engine; GW12 sample is synthetic, not an actual prediction')
if __name__=='__main__':test()