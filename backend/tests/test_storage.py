from io import BytesIO

import pytest
from botocore.awsrequest import AWSResponse
from botocore.stub import Stubber
from pydantic import ValidationError

from verity import storage
from verity.config import Settings


class RawResponse(BytesIO):
    def stream(self, amt=None, decode_content=False):
        while chunk := self.read(amt or -1):
            yield chunk


def supabase_settings(tmp_path, monkeypatch):
    for name in ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN"):
        monkeypatch.delenv(name, raising=False)
    dotenv = tmp_path / ".env"
    dotenv.write_text(
        "S3_BUCKET=homework\n"
        "S3_REGION=us-east-1\n"
        "S3_ENDPOINT_URL=https://project.storage.supabase.co/storage/v1/s3\n"
        "AWS_ACCESS_KEY_ID=supabase-test-access\n"
        "AWS_SECRET_ACCESS_KEY=supabase-test-secret\n"
    )
    cfg = Settings(_env_file=dotenv)
    monkeypatch.setattr(storage, "settings", lambda: cfg)
    return cfg


def test_supabase_signed_storage_round_trip_from_dotenv(tmp_path, monkeypatch):
    supabase_settings(tmp_path, monkeypatch)
    make_client = storage.client
    objects = {}
    requests = []

    def respond(request, **kwargs):
        # Exercise actual boto3 serialization and signing without cloud credentials.
        requests.append(request)
        assert request.url == (
            "https://project.storage.supabase.co/storage/v1/s3/homework/course/work.pdf"
        )
        assert b"Credential=supabase-test-access/" in request.headers["Authorization"]
        headers = {name.lower(): value for name, value in request.headers.items()}
        assert "x-amz-server-side-encryption" not in headers
        assert "x-amz-sdk-checksum-algorithm" not in headers
        assert "x-amz-trailer" not in headers
        payload = b""
        if request.method == "PUT":
            assert headers["content-type"] == b"application/pdf"
            objects[request.url] = request.body.read()
        elif request.method == "GET":
            payload = objects[request.url]
        elif request.method == "DELETE":
            del objects[request.url]
        return AWSResponse(
            request.url,
            204 if request.method == "DELETE" else 200,
            {"content-length": str(len(payload))},
            RawResponse(payload),
        )

    def intercepted_client():
        sdk = make_client()
        sdk.meta.events.register("before-send.s3", respond)
        return sdk

    monkeypatch.setattr(storage, "client", intercepted_client)
    storage.put("course/work.pdf", b"%PDF-test-content")
    assert storage.get("course/work.pdf") == b"%PDF-test-content"
    storage.remove("course/work.pdf")
    assert objects == {}
    assert [request.method for request in requests] == ["PUT", "GET", "DELETE"]


def test_standard_s3_keeps_encryption(tmp_path, monkeypatch):
    cfg = supabase_settings(tmp_path, monkeypatch)
    cfg.s3_endpoint_url = ""
    sdk = storage.client()
    monkeypatch.setattr(storage, "client", lambda: sdk)
    with Stubber(sdk) as stub:
        stub.add_response(
            "put_object",
            {},
            {
                "Bucket": "homework",
                "Key": "work.pdf",
                "Body": b"pdf",
                "ContentType": "application/pdf",
                "ServerSideEncryption": "AES256",
            },
        )
        storage.put("work.pdf", b"pdf")
        stub.assert_no_pending_responses()


@pytest.mark.parametrize("scheme", ["postgres", "postgresql", "postgresql+psycopg"])
def test_supabase_database_uri_uses_installed_driver(scheme):
    cfg = Settings(
        _env_file=None,
        database_url=f"{scheme}://postgres.ref:p%40ss@pooler.test:5432/postgres?sslmode=require",
        aws_access_key_id="",
        aws_secret_access_key="",
    )
    assert cfg.database_url == (
        "postgresql+psycopg://postgres.ref:p%40ss@pooler.test:5432/postgres?sslmode=require"
    )


@pytest.mark.parametrize("access,secret", [("key", ""), ("", "secret")])
def test_incomplete_storage_credentials_fail_at_startup(access, secret):
    with pytest.raises(ValidationError, match="Configure AWS_ACCESS_KEY_ID"):
        Settings(_env_file=None, aws_access_key_id=access, aws_secret_access_key=secret)
