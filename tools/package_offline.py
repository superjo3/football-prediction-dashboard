from pathlib import Path
P=Path(__file__).resolve().parents[1]
s=(P/'index.html').read_text()
s=s.replace('<link rel="stylesheet" href="style.css">','<style>'+(P/'style.css').read_text()+'</style>')
for name in ['data.js','my-picks.js','app.js']:
 s=s.replace('<script src="'+name+'"></script>','<script>'+(P/name).read_text().replace('</script','<\\/script')+'</script>')
(P/'dashboard-standalone.html').write_text(s)
print('Standalone snapshot updated')
