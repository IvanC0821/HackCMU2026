from contextlib import closing
from pathlib import Path

import boto3
from botocore.config import Config

from .config import settings


def client():
    cfg = settings()
    options = {}
    # Pydantic reads .env without exporting it into boto3's environment.
    if cfg.aws_access_key_id:
        options.update(
            aws_access_key_id=cfg.aws_access_key_id,
            aws_secret_access_key=cfg.aws_secret_access_key,
            aws_session_token=cfg.aws_session_token or None,
        )
    if cfg.s3_endpoint_url:
        options["config"] = Config(
            signature_version="s3v4",
            s3={"addressing_style": "path"},
            request_checksum_calculation="when_required",
            response_checksum_validation="when_required",
        )
    return boto3.client(
        "s3", region_name=cfg.s3_region, endpoint_url=cfg.s3_endpoint_url or None, **options
    )


def local_path(key):
    root = settings().storage_dir.resolve()
    path = (root / key).resolve()
    if not path.is_relative_to(root):
        raise ValueError("Invalid storage key")
    return path


def put(key, content):
    if settings().s3_bucket:
        # Supabase does not implement the AWS encryption request header.
        encryption = {} if settings().s3_endpoint_url else {"ServerSideEncryption": "AES256"}
        with closing(client()) as s3:
            s3.put_object(
                Bucket=settings().s3_bucket,
                Key=key,
                Body=content,
                ContentType="application/pdf",
                **encryption,
            )
    else:
        path = local_path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("xb") as handle:
            handle.write(content)
        path.chmod(0o600)


def get(key):
    if settings().s3_bucket:
        with closing(client()) as s3:
            body = s3.get_object(Bucket=settings().s3_bucket, Key=key)["Body"]
            try:
                return body.read()
            finally:
                body.close()
    return local_path(key).read_bytes()


def remove(key):
    if settings().s3_bucket:
        with closing(client()) as s3:
            s3.delete_object(Bucket=settings().s3_bucket, Key=key)
    else:
        Path(local_path(key)).unlink(missing_ok=True)
