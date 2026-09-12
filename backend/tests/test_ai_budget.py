from concurrent.futures import ThreadPoolExecutor

import pytest

from verity.ai_budget import demo_retries, reserve_ai_call


def test_public_call_limit_is_persistent_and_atomic(tmp_path, monkeypatch):
    monkeypatch.setenv("VERITY_AI_CALL_LIMIT", "3")
    monkeypatch.setenv("VERITY_AI_BUDGET_DB", str(tmp_path / "budget.db"))

    def request(_):
        try:
            reserve_ai_call()
            return True
        except RuntimeError:
            return False

    with ThreadPoolExecutor(max_workers=8) as workers:
        assert sum(workers.map(request, range(12))) == 3
    with pytest.raises(RuntimeError):
        reserve_ai_call()
    assert demo_retries(1) == 0


def test_normal_runtime_has_no_demo_ceiling(monkeypatch):
    monkeypatch.delenv("VERITY_AI_CALL_LIMIT", raising=False)
    monkeypatch.delenv("VERITY_AI_BUDGET_DB", raising=False)
    reserve_ai_call()
    assert demo_retries(1) == 1
