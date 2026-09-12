"""Start the isolated judge classroom, quick tunnel, and keep-awake process."""
from pathlib import Path
import json,os,subprocess,time,re
ROOT=Path(__file__).resolve().parents[2]
RUNTIME=ROOT/'infra/vercel/runtime'
RUNTIME.mkdir(parents=True,exist_ok=True)
pid_file=RUNTIME/'processes.json'
if pid_file.exists():
 for name,pid in json.loads(pid_file.read_text()).items():
  try:os.kill(pid,0)
  except ProcessLookupError:continue
  raise SystemExit(f'{name} is already running (PID {pid}); stop the previous judge processes first')
env=os.environ.copy()
env.update(MAX_PDF_PAGES='20',OPENAI_MODEL='gpt-5.4',OPENAI_REASONING_EFFORT='medium',VERITY_AI_CALL_LIMIT='12',VERITY_AI_BUDGET_DB=str(RUNTIME/'ai-budget.db'))
processes={}
offsets={}
for name,cmd,cwd in [
 ('classroom',[str(ROOT/'backend/.venv/bin/python'),'run_classroom.py','--port','3008','--allow-ai','--ai-hints'],ROOT/'backend'),
 ('tunnel',[str(ROOT/'infra/vercel/bin/cloudflared'),'tunnel','--url','http://127.0.0.1:3008','--no-autoupdate'],ROOT),
 ('keep-awake',['/usr/bin/caffeinate','-dims'],ROOT),
]:
 with (RUNTIME/f'{name}.log').open('ab') as log:
  offsets[name]=log.tell()
  p=subprocess.Popen(cmd,cwd=cwd,env=env,stdin=subprocess.DEVNULL,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
 processes[name]=p.pid
(RUNTIME/'processes.json').write_text(json.dumps(processes,indent=2))
for _ in range(40):
 text=(RUNTIME/'tunnel.log').read_bytes()[offsets['tunnel']:].decode(errors='replace')
 match=re.search(r'https://[a-z0-9-]+\.trycloudflare\.com',text)
 if match:
  (RUNTIME/'origin.txt').write_text(match.group(0))
  print(match.group(0));break
 time.sleep(.5)
else:raise SystemExit('Tunnel not ready; check runtime/tunnel.log')
