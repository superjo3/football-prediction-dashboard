#!/usr/bin/env python3
"""EPL parity Sparse Selector V2: optional R1 only, 85% goal.

Input is immutable V1 rolling season-by-season model predictions (2021-2025),
not original R90 Exact. No model retraining. Pre-declared candidate gates,
thresholds, sample/season coverage criteria; select using 2021-23 ONLY.
Evaluate 2024-25 without using those outcomes for model or rule selection.
Note: 2024-25 seasons were viewed in V1, so evaluation is a reused historical
benchmark, not an untouched blind test or prospective evidence.
"""
from __future__ import annotations
import hashlib, json
from pathlib import Path
import numpy as np
import pandas as pd
from scipy.stats import binomtest

ROOT=Path(__file__).resolve().parent
DATA=ROOT/'EPL_RESEARCH_ROLLING_MODEL_SCORES.csv'
d=pd.read_csv(DATA).sort_values(['season','round','date','home','away'],kind='stable').reset_index(drop=True)
assert d.shape[0]==1900 and set(d.season)=={2021,2022,2023,2024,2025}
assert len(d.groupby(['season','round']))==190
assert all(d.groupby(['season','round']).size()==10)
assert not d[['p_median','p_mean','label','group_id']].isna().any().any()

# THIS search space and all selection criteria are authored before looking at V2 holdout rankings.
MODELS=['logit_market','logit_form','logit_all','hgb_all','rf_all','median','mean']
GATES=['any','agree4','agree5','draw_high','low_over','agree4_draw_high','agree5_draw_high','agree4_low_over','agree5_low_over']
THRESHOLDS=[0,.01,.02,.03,.04,.05,.06,.07,.08,.10,.125]

# Independent simple baseline family: pregame high-draw / low-goals, pick EVEN.
DRAW_LEVELS=[.25,.27,.29,.31,.33,.35]
OVER_CAPS=[.40,.45,.50,.55]

# Necessary minimum for R1-only rule discovery (validation 3 seasons / 114 rounds).
MIN_VALIDATION_SELECTED=30
MIN_VALIDATION_EACH_SEASON=5
MIN_VALIDATION_ROUNDS=30
# No rule will be promoted unless out-of-sample >= 85%, sufficient coverage and prospective replication.
TARGET_RATE=.85

assert len(MODELS)*len(GATES)*len(THRESHOLDS)==693

def wilson(h,n):
 if not n:return [None,None]
 z=1.95996398454;p=h/n;den=1+z*z/n
 mid=(p+z*z/(2*n))/den
 rad=z*np.sqrt(p*(1-p)/n+z*z/(4*n*n))/den
 return [round(mid-rad,5),round(mid+rad,5)]

def ranked(p, model, gate, threshold):
 if model=='always_even':
  confidence=p.p_draw.to_numpy(dtype=float)
  prediction=np.zeros(len(p),dtype=int)
  eligible=np.isfinite(confidence) & (confidence>=threshold)
  if gate=='low_over':eligible &= p.p_over25.fillna(1).to_numpy()<.5
  if gate=='any':pass
  if gate=='overcap':raise ValueError('must call even_drawlow selector')
 else:
  v=p['p_'+model].to_numpy(dtype=float)
  confidence=abs(v-.5)
  prediction=(v>=.5).astype(int)
  eligible=np.isfinite(confidence)&(confidence>=threshold-1e-12)
  agree4=p.agree4.astype(bool).to_numpy();agree5=p.agree5.astype(bool).to_numpy()
  highdraw=p.p_draw.to_numpy()>=.27
  lowover=p.p_over25.fillna(1).to_numpy()<.5
  if 'agree4' in gate:eligible &= agree4
  if 'agree5' in gate:eligible &= agree5
  if 'draw_high' in gate:eligible &= highdraw
  if 'low_over' in gate:eligible &= lowover
 groups=p.group_id.to_numpy()
 selected=[]
 for group in pd.unique(groups):
  loc=np.flatnonzero((groups==group)&eligible)
  if not len(loc):continue
  best=loc[np.argsort(-confidence[loc],kind='stable')[0]]
  x=p.iloc[best]
  selected.append(dict(season=int(x.season),round=int(x['round']),match_id=f'{x.season}-{int(x["round"])}-{x.home}-{x.away}',home=x.home,away=x.away,pick='單' if prediction[best] else '雙',actual='單' if int(x.label) else '雙',hit=bool(prediction[best]==int(x.label)),confidence_score=float(confidence[best]),p_draw=None if pd.isna(x.p_draw) else float(x.p_draw),p_over25=None if pd.isna(x.p_over25) else float(x.p_over25)))
 return selected

def even_drawlow(p,draw_t,over_cap):
 prediction=np.zeros(len(p),dtype=int)
 confidence=p.p_draw.to_numpy(dtype=float)
 eligible=np.isfinite(confidence)&(confidence>=draw_t)&(p.p_over25.fillna(1).to_numpy()<over_cap)
 selected=[];groups=p.group_id.to_numpy()
 for group in pd.unique(groups):
  loc=np.flatnonzero((groups==group)&eligible)
  if not len(loc):continue
  best=loc[np.argsort(-confidence[loc],kind='stable')[0]]
  x=p.iloc[best]
  selected.append(dict(season=int(x.season),round=int(x['round']),match_id=f'{x.season}-{int(x["round"])}-{x.home}-{x.away}',home=x.home,away=x.away,pick='雙',actual='單' if int(x.label) else '雙',hit=bool(int(x.label)==0),confidence_score=float(confidence[best]),p_draw=float(x.p_draw),p_over25=float(x.p_over25)))
 return selected

def assess(rows, num_rounds):
 n=len(rows);h=sum(int(r['hit']) for r in rows)
 per=[]
 for season in [2021,2022,2023,2024,2025]:
  a=[r for r in rows if r['season']==season]
  if a:per.append(dict(season=season,selected=len(a),hits=sum(int(z['hit']) for z in a),rate=round(np.mean([z['hit'] for z in a]),5)))
 return dict(hit=h,n=n,accuracy=round(h/n,5) if n else None,ci95=wilson(h,n),rounds_covered=n,rounds_total=num_rounds,round_coverage=round(n/num_rounds,5),season_breakdown=per,binomial_vs_even50_p=round(float(binomtest(h,n,.5,alternative='greater').pvalue),6) if n else None)

val=d[d.season<=2023].reset_index(drop=True)
ho=d[d.season>=2024].reset_index(drop=True)
rows=[]
for model in MODELS:
 for gate in GATES:
  for t in THRESHOLDS:
   picks=ranked(val,model,gate,t)
   res=assess(picks,114)
   rows.append(dict(id=f'{model}__{gate}__{t:.3f}',model=model,gate=gate,threshold=t,kind='model',**res))
for draw in DRAW_LEVELS:
 for cap in OVER_CAPS:
  picks=even_drawlow(val,draw,cap);res=assess(picks,114)
  rows.append(dict(id=f'always_even__draw_{draw:.2f}__OU_{cap:.2f}',model='always_even',gate='draw_under',threshold=draw,under_cap=cap,kind='even_drawlow',**res))

eligible=[]
for r in rows:
  ss={z['season']:z['selected'] for z in r['season_breakdown']}
  if r['n']>=MIN_VALIDATION_SELECTED and all(ss.get(y,0)>=MIN_VALIDATION_EACH_SEASON for y in [2021,2022,2023]):
   eligible.append(r)
assert eligible
eligible.sort(key=lambda r:(-r['ci95'][0],-r['accuracy'],-r['n'],r['id']))
chosen=eligible[0]
def do_select(p,r):
 if r['kind']=='model':return ranked(p,r['model'],r['gate'],r['threshold'])
 return even_drawlow(p,r['threshold'],r['under_cap'])
val_picks=do_select(val,chosen)
ho_picks=do_select(ho,chosen)
assert len(val_picks)==chosen['n']
ho_stats=assess(ho_picks,76)

# Explicit fixed comparators, not opportunistically selected by test results.
comparators=[]
for model,gate,t in [('logit_form','draw_high',0),('logit_form','any',0),('logit_market','any',0),('median','agree5',0),('median','agree5',.05),('mean','any',0),('hgb_all','any',0)]:
 r=ranked(ho,model,gate,t)
 comparators.append(dict(id=f'{model}__{gate}__{t}',**assess(r,76)))
# A simple R1 baseline from each round's first match (not tuned).
r=[]
for (season,week),g in ho.groupby(['season','round'],sort=False):
 x=g.iloc[0]
 r.append(dict(season=int(season),round=int(week),hit=bool(int(x.label)==0)))
comparators.append(dict(id='always_even_first_fixture_each_round',**assess(r,76)))

# No promotion based on reused historical test: explicit rule status.
report={
 'schema':'EPL_PARITY_SPARSE_R1_85_RESEARCH_V2',
 'date_taipei':'2026-11-27',
 'status':'RESEARCH_REPLAY_ONLY_NOT_OFFICIAL',
 'goal':'At most 1 qualified parity R1 per EPL round; target >85% true forward accuracy with meaningful coverage; PASS otherwise',
 'protocol':{
  'upstream':'Reused frozen EPL 2021–2025 season-wise rolling predictions from V1; no retraining of direction models',
  'model_prediction_season_fit':'Each target season model trained only on previous seasons (per V1)',
  'rule_selection_only':'2021–23 (114 matchweeks)',
  'historical_benchmark_only':'2024–25 (76 matchweeks); already viewed in V1, hence NOT an untouched blind holdout',
  'candidate_models':MODELS,'gate_types':GATES,'model_margin_thresholds':THRESHOLDS,
  'independent_even_rule_draw_levels':DRAW_LEVELS,'independent_even_rule_over_caps':OVER_CAPS,
  'rules_evaluated':len(rows), 'eligible_rule_min_samples':MIN_VALIDATION_SELECTED,
  'per_season_min_samples':MIN_VALIDATION_EACH_SEASON,
  'ranking_policy':'Rank only eligible candidates by fixed margin, tie broken by sorted source fixture order. Never more than 1 per round. Empty => PASS.',
  'rule_choose':'Highest validation Wilson 95% lower bound with min sample constraints, then validation accuracy then count then ID.',
  'no_prediction_target_leakage':'Model score file uses only prior season training; match label used only in validation scoring and subsequent historical test.',
  'no_model_refit_in_this_run':True,
  'target_accuracy_percent':85,
  'substantive_acceptance':'Need >85% on fresh prospective rounds, >=30/ preferably >=50 selected picks across multiple seasons and credible calibration, without tuning on those future outcomes.'
 },
 'input':{'path':str(DATA.name),'sha256':hashlib.sha256(DATA.read_bytes()).hexdigest(),'rows':len(d)},
 'validation':{'season':[2021,2022,2023],'rounds':114,'best':chosen,'eligible_candidates':len(eligible),'any_85pct_n30':sum(r['accuracy']>=.85 for r in eligible),'top_10':[dict(id=x['id'],h=x['hit'],n=x['n'],rate=x['accuracy'],ci95=x['ci95'],coverage=x['round_coverage']) for x in eligible[:10]]},
 'historical_benchmark':{'seasons':[2024,2025],'chosen_rule_only':ho_stats,'fixed_comparators':comparators},
 'qualified_rule':chosen['id'],
 'decision':'NO_PROMOTION_RESEARCH_ONLY',
 'cautions':['2024–25 matches have been examined in prior V1 and should not be described as blind testing',
             'Derived features from prior archived historical cache lack independent provider-timestamp audit',
             'This is not original sealed R90 Exact or Official R90 Recovery Shadow',
             'No changes to pre-existing GW11/GW12 or current website',
             'Never select a new rule or threshold based on benchmark seasons.']
}
(ROOT/'EPL_SPARSE_R1_85_RESEARCH_V2_RESULTS.json').write_text(json.dumps(report,ensure_ascii=False,indent=2,allow_nan=False)+'\n')
pd.DataFrame(val_picks).to_csv(ROOT/'V2_R1_85_VALIDATION_PICKS.csv',index=False,encoding='utf-8-sig')
pd.DataFrame(ho_picks).to_csv(ROOT/'V2_R1_85_HISTORICAL_BENCHMARK_PICKS.csv',index=False,encoding='utf-8-sig')
# Result digest for reproducibility comparison across runs.
for p in ['EPL_SPARSE_R1_85_RESEARCH_V2_RESULTS.json','V2_R1_85_VALIDATION_PICKS.csv','V2_R1_85_HISTORICAL_BENCHMARK_PICKS.csv']:
 fp=ROOT/p;print(p,hashlib.sha256(fp.read_bytes()).hexdigest())
print('Candidate count',len(rows),'eligible',len(eligible),'85 eligible',report['validation']['any_85pct_n30'])
print('Selected:',chosen['id'],chosen['hit'],chosen['n'],chosen['accuracy'],'validation CI',chosen['ci95'])
print('Historical reused benchmark:',ho_stats['hit'],ho_stats['n'],ho_stats['accuracy'],'CI',ho_stats['ci95'],'coverage',ho_stats['round_coverage'])
print('Historical years:',ho_stats['season_breakdown'])
