from pathlib import Path

import boto3

from .config import settings


def client():
    cfg = settings()
    return boto3.client("s3", region_name=cfg.s3_region, endpoint_url=cfg.s3_endpoint_url or None)


def local_path(key):
    root = settings().storage_dir.resolve()
    path = (root / key).resolve()
    if not path.is_relative_to(root):
        raise ValueError("Invalid storage key")
    return path


def put(key, content):
    if settings().s3_bucket:
        client().put_object(
            Bucket=settings().s3_bucket,
            Key=key,
            Body=content,
            ContentType="application/pdf",
            ServerSideEncryption="AES256",
        )
    else:
        path = local_path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("xb") as handle:
            handle.write(content)
        path.chmod(0o600)


def get(key):
    if settings().s3_bucket:
        return client().get_object(Bucket=settings().s3_bucket, Key=key)["Body"].read()
    return local_path(key).read_bytes()


def remove(key):
    if settings().s3_bucket:
        client().delete_object(Bucket=settings().s3_bucket, Key=key)
    else:
        Path(local_path(key)).unlink(missing_ok=True)
