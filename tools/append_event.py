"""Append an event to an EXISTING imported round. No external dependencies.
Usage: python3 tools/append_event.py results new_event.json
Run only on a backup copy. Existing result pairs and selection assignments are immutable.
"""
import json,hashlib,sys,re
from pathlib import Path
P=Path(__file__).resolve().parents[1]
def dump(x):return json.dumps(x,ensure_ascii=False,indent=2)
def digest(x):return hashlib.sha256(json.dumps(x,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
def main():
 if len(sys.argv)!=3:raise ValueError(__doc__)
 layer,path=sys.argv[1:]
 if layer not in ['results','updates','reviews']:raise ValueError('Only results / updates / reviews supported; new rounds require reviewed importer extension.')
 d=json.loads((P/'data/dashboard.json').read_text());lock=json.loads((P/'data/integrity.json').read_text());e=json.loads(Path(path).read_text())
 for snapshot in d.get('sources',[d['source']]):
  if hashlib.sha256((P/snapshot.get('file','source/R1_R2_Master.md')).read_bytes()).hexdigest()!=snapshot['sha256']:raise ValueError('Master snapshot modified')
 for name,hashes in lock.items():
  if [digest(x) for x in d[name]]!=hashes:raise ValueError('Existing history changed: '+name)
  if json.loads((P/f'data/{name}.json').read_text())!=d[name]:raise ValueError('Layer differs from projection: '+name)
 if not isinstance(e,dict) or not all(k in e for k in ['id','record_id','source','recorded_at']):raise ValueError('Required: id, record_id, source, recorded_at')
 if not re.fullmatch(r'[A-Za-z0-9_.-]+',e['id']):raise ValueError('Invalid event ID')
 if any(e['id']==x['id'] for n in ['predictions','results','updates','reviews'] for x in d[n]):raise ValueError('Duplicate event ID')
 if e['record_id'] not in [r['id'] for r in d['rounds']]:raise ValueError('Unknown record_id')
 src=e['source']
 if not isinstance(src,dict) or not all(k in src for k in ['file','version','start_line','end_line']):raise ValueError('Source requires file, version, start_line, end_line')
 sourcepath=(P/src['file']).resolve()
 if not sourcepath.is_relative_to(P/'source') or not sourcepath.is_file():raise ValueError('Source must be a separate existing snapshot in source/')
 if not 1<=src['start_line']<=src['end_line']<=len(sourcepath.read_text().splitlines()):raise ValueError('Invalid source lines')
 ps=[p for p in d['predictions'] if p['record_id']==e['record_id']]
 if layer=='results':
  if e.get('match_id') not in [p['match_id'] for p in ps]:raise ValueError('Unknown match')
  if any(x['record_id']==e['record_id'] and x['match_id']==e['match_id'] for x in d['results']):raise ValueError('Result already exists; no overwrite')
  if not isinstance(e.get('score'),list) or len(e['score'])!=2 or any(type(v)!=int or v<0 for v in e['score']):raise ValueError('Invalid score')
 if layer=='updates':
  if e.get('type') not in ['MID-SNAPSHOT','PRE-KICK']:raise ValueError('This helper only adds non-directional snapshots; ranking/direction changes require new prediction record')
  if 'rank_additions' in e:raise ValueError('No rank rewriting')
 if layer=='reviews' and not isinstance(e.get('text'),str):raise ValueError('Review text required')
 e['source']['sha256']=hashlib.sha256(sourcepath.read_bytes()).hexdigest()
 d[layer].append(e);lock[layer].append(digest(e))
 # All validation happens before writes. Each file is atomically replaced; keep a folder backup for cross-file recovery.
 outputs={f'data/{layer}.json':dump(d[layer]),'data/dashboard.json':dump(d),'data/integrity.json':dump(lock),'data.js':'window.FOOTBALL_DATA = '+json.dumps(d,ensure_ascii=False).replace('</','<\\/')+';\n'}
 for name,content in outputs.items():
  target=P/name;tmp=target.with_suffix(target.suffix+'.tmp');tmp.write_text(content);tmp.replace(target)
 print('Appended',e['id'],'; existing records preserved. Refresh index.html.')
if __name__=='__main__':
 try:main()
 except (ValueError,KeyError,TypeError) as ex:sys.exit(str(ex))
