# Judge deployment

Public app: https://verity-hackcmu.vercel.app
Example files: https://verity-hackcmu.vercel.app/examples/

The public demo uses only the existing generated, fictional homework dataset. No real class papers, solutions, student names, grades, or derived rubric remain in the active classroom. The two earlier Vercel deployments containing real files were deleted; their download paths and document IDs are withdrawn. Original local files were preserved privately.

## Five example downloads

Sources are in `/Users/a1111/code/HackCMU2026-demo-data`. `example-files.json` records the exact allowlist, relative source paths, page counts and SHA-256 hashes. The build checks every hash, starts with a clean output directory, and publishes only these five PDFs.

| Download | Fictional material | Pages |
| --- | --- | --- |
| `fictional-student.pdf` | Hiro Tanaka, ungraded submission | 6 |
| `fictional-professor.pdf` | Generated professor solution | 5 |
| `fictional-graded-farid.pdf` | Farid Haddad, graded example | 8 |
| `fictional-graded-victoria.pdf` | Victoria Lam, graded example | 9 |
| `fictional-graded-yusuf.pdf` | Yusuf Demir, graded example | 7 |

The matching fictional blank assignment is already attached to the classroom. The rubric and demo-approved hints are seeded from the generated grading guidelines; they are not copied from an actual professor. Three past grades are imported as professor records, not represented as new AI assessments. Hiro's six pages map one-to-one to the six questions.

## Hosting

Vercel serves the real UI, PDF.js and approved downloads. `/classroom/*` forwards to an isolated FastAPI process on this Mac through a Cloudflare quick tunnel. Private `.env`, SQLite database, access codes, uploaded storage and local archives are excluded from the deployment and Git.

**Keep this Mac awake, online, and the tunnel/backend processes running.** This is temporary hackathon hosting. `caffeinate` prevents idle sleep, not shutdown or lid-closed sleep. Downloads remain available on Vercel independently. The classroom is a shared demo with open Student/TA switching.

- Checkout: `HackCMU2026-vercel-judges`, branch `agent/infra/vercel-judges`.
- Backend: `http://127.0.0.1:3008`, `backend/run_classroom.py --allow-ai --ai-hints`.
- GPT-5.4, medium reasoning. Persistent ceiling: 12 new paid requests total across rubric/hints/assessment; no automatic provider retries. This is a request ceiling, not a dollar guarantee. The existing count was preserved during the dataset swap.
- `runtime/processes.json` identifies backend, tunnel and keep-awake PIDs. Logs and budget database remain under ignored `runtime/`.
- The Vercel project's Git integration is disconnected so pushes cannot replace the working deployment with an unconfigured build.
- The team's port 3004 and recording port 3006 were not changed. Ivan explicitly confirmed the existing video stays unchanged; the fictional-material requirement applies to the public website.

## Prepare / redeploy

Copy the five allowlisted sources into `public/examples/` using the names in `example-files.json`. Provision the local virtual environment, `.env`, official `bin/cloudflared`, and frontend PDF.js dependency.

For a fresh isolated classroom (with the backend stopped and no real data in its active database):

```sh
MAX_PDF_PAGES=20 backend/.venv/bin/python backend/seed_judge_demo.py /Users/a1111/code/HackCMU2026-demo-data
```

The seed imports only three past students and one new student, plus assignment/solution. It does not read hidden answer keys or call a model. Repeat seeding preserves an already prepared fictional classroom.

Start only when the old judge processes are stopped:

```sh
python3 infra/vercel/start-local.py
```

Read `infra/vercel/runtime/origin.txt`, set `VERITY_ORIGIN` to that HTTPS URL, and deploy:

```sh
VERITY_ORIGIN=https://<active-tunnel>.trycloudflare.com node infra/vercel/build.mjs
vercel deploy --prod --yes --cwd infra/vercel/site
```

A changed tunnel URL requires rebuilding and redeploying. For independent long-term hosting, move the Python process and persistent storage to a managed backend and update the API origin.
