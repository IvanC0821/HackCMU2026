import json
from pathlib import Path

from verity.api import app

Path("openapi.json").write_text(json.dumps(app.openapi(), indent=2) + "\n")
