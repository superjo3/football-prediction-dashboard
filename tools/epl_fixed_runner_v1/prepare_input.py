#!/usr/bin/env python3
"""Join source-stamped EPL fixtures/market prices and team statistics into a runner input.
This tool NEVER downloads data, invents odds, or changes model weights. CSVs are external inputs.
Use runner --mode prematch to independently validate timestamps and reject score leakage.
"""
from __future__ import annotations
import argparse,csv,json
from pathlib import Path

def load(path):
 with open(path,encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
def req(row,field,context):
 value=row.get(field)
 if value is None or str(value).strip()=='':raise ValueError(f'Missing {field} in {context}')
 return str(value).strip()
def number(row,field,context):return float(req(row,field,context))

def build(meta,fixtures,odds,teams):
 ps={};ts={}
 for row in odds:
  key=req(row,'match_id','odds');
  if key in ps:raise ValueError('Duplicate odds match '+key)
  ps[key]=row
 for row in teams:
  name=req(row,'team','team stats')
  if name in ts:raise ValueError('Duplicate team '+name)
  ts[name]={'played':int(req(row,'played',name)),'goals_for':int(req(row,'goals_for',name)),
   'goals_against':int(req(row,'goals_against',name)),
   'last_completed_match_total_odd':int(req(row,'last_completed_match_total_odd',name))}
 out=[]
 for fx in fixtures:
  mid=req(fx,'match_id','fixtures')
  if mid not in ps:raise ValueError('No odds for '+mid)
  r=ps[mid];ah=r.get('ah_line_home')
  AH=None
  if ah is not None and str(ah).strip():
   AH={'line_home':number(r,'ah_line_home',mid),'home':number(r,'ah_home',mid),'away':number(r,'ah_away',mid)}
  out.append({'match_id':mid,'home':req(fx,'home',mid),'away':req(fx,'away',mid),
   'kickoff_utc':req(fx,'kickoff_utc',mid),
   'market_odds':{'1X2':{'home':number(r,'home_1x2',mid),'draw':number(r,'draw_1x2',mid),'away':number(r,'away_1x2',mid)},
    'OU25':{'over':number(r,'over25',mid),'under':number(r,'under25',mid)},'AH':AH}})
 if len(ps)!=len(out):raise ValueError('Additional odds match not in fixtures')
 doc={'schema':'EPL-FIXED-INFERENCE-INPUT-V1',
  'purpose':meta['purpose'],'league':'EPL','season':meta['season'],'gw':meta['gw'],
  'record_id':meta['record_id'],'prediction_cutoff_utc':meta['prediction_cutoff_utc'],
  'first_kickoff_utc':meta['first_kickoff_utc'],'fixture_source_url':meta['fixture_source_url'],
  'market_snapshot':meta['market_snapshot'],'team_snapshot':{**meta['team_snapshot'],'teams':ts},
  'fixtures':out}
 return doc

def main():
 p=argparse.ArgumentParser(description=__doc__)
 for name in ('meta','fixtures','odds','teams','output'):p.add_argument('--'+name,type=Path,required=True)
 a=p.parse_args();doc=build(json.loads(a.meta.read_text()),load(a.fixtures),load(a.odds),load(a.teams))
 a.output.parent.mkdir(parents=True,exist_ok=True)
 a.output.write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Prepared',len(doc['fixtures']),'EPL fixtures; source values not independently verified until runner PREMATCH validation')
if __name__=='__main__':main()