FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir uv==0.12.13
COPY pyproject.toml uv.lock ./
COPY verity ./verity
RUN uv sync --frozen --no-dev --no-editable
COPY alembic.ini ./
COPY migrations ./migrations
COPY scripts ./scripts
COPY examples ./examples
RUN useradd --create-home app && mkdir -p /app/data/documents && chown -R app:app /app/data
USER app
ENV PATH="/app/.venv/bin:$PATH" PYTHONUNBUFFERED=1
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "verity.api:app", "--host", "0.0.0.0", "--port", "8000"]
