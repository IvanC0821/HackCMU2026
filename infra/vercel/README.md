# Judge deployment

Public app: https://verity-hackcmu.vercel.app
Example files: https://verity-hackcmu.vercel.app/examples/

The Vercel deployment serves the actual student and TA UI and the three explicitly approved example PDFs. `/classroom/*` forwards to an isolated FastAPI classroom on this Mac through a Cloudflare quick tunnel. The private `.env`, SQLite database, access codes, and uploaded file storage are never included in the Vercel deployment. The existing recording classroom on port 3006 and the team's classroom on port 3004 are untouched.

**This is a temporary hackathon deployment. Keep this Mac on, connected to the internet, and the tunnel/backend processes running.** `caffeinate` prevents idle sleep; it does not keep a closed or powered-off laptop online. Vercel continues serving downloads when the backend is offline. This is a shared demo classroom, with open Student/TA switching, not a multi-tenant production service.

## Runtime

- Checkout: `HackCMU2026-vercel-judges`, branch `agent/infra/vercel-judges`, based on `0b4d540` (contains latest `origin/main` at launch, `2822353`).
- Backend: `http://127.0.0.1:3008`, `backend/run_classroom.py --allow-ai --ai-hints`.
- GPT-5.4, medium reasoning; limit 12 new paid requests across assessment, rubric, and hint generation. The persistent counter is `runtime/ai-budget.db`; automatic provider retries are disabled in this deployment. This is a request limit, not a guaranteed dollar ceiling. Previously saved results remain browsable.
- State copied with SQLite backup from the verified recording demo. One rubric v1, approved hints, real graded attempt retained. Judges can upload new work and review it.
- `runtime/processes.json`: PIDs for the backend, tunnel, and keep-awake process. Logs stay under `runtime/` (ignored).
- The Vercel project's Git integration is disconnected so a push to main cannot replace the working deployment with an unconfigured build.

## Build / redeploy

The selected PDFs are local deployment assets, intentionally excluded from Git:

| Download | Original file |
| --- | --- |
| `student-homework.pdf` | `/Users/a1111/Downloads/Problem_Set_01_Jeffrey_Lau.pdf` |
| `professor-solution.pdf` | `/Users/a1111/code/HackCMU2026-realtest/professor/PS1 Solutions (official).pdf` |
| `graded-homework.pdf` | `/Users/a1111/Downloads/submission_423590481.pdf` |

Copy these into `public/examples/`. Backend `.env`, `.venv`, data snapshot and frontend PDF.js dependency must be provisioned locally before starting. `bin/cloudflared` is the official Cloudflare macOS ARM64 binary and is ignored.

Start only when the existing judge processes are stopped:

```sh
python3 infra/vercel/start-local.py
```

Read the resulting `infra/vercel/runtime/origin.txt`, then set `VERITY_ORIGIN` to that HTTPS URL:

```sh
VERITY_ORIGIN=https://<active-tunnel>.trycloudflare.com node infra/vercel/build.mjs
vercel deploy --prod --yes --cwd infra/vercel/site
```

A new quick tunnel gets a new origin URL; rebuild and redeploy when it changes. `build.mjs` stages only public UI/assets/downloads, vendors PDF.js outside `node_modules` so Vercel includes it, and configures an uncached API rewrite.

For independent long-term hosting, move the Python process and its persistent storage to a managed backend and update the API origin. A Vercel-only static deployment cannot run the current durable background grading worker.
