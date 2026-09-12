"""Assignment-scoped reviewed hint banks."""

import sqlalchemy as sa
from alembic import op

revision = "a281d40c791f"
down_revision = "f351b39cf030"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "assignment_hint_banks",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("course_id", sa.String(36), sa.ForeignKey("courses.id"), nullable=False),
        sa.Column("scope", sa.String(80), nullable=False),
        sa.Column("fingerprint", sa.String(64), nullable=False),
        sa.Column("context", sa.JSON(), nullable=False),
        sa.Column("entries", sa.JSON(), nullable=False),
        sa.Column("original", sa.JSON(), nullable=False),
        sa.Column("provenance", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("approved_by", sa.String(36), sa.ForeignKey("users.id")),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.UniqueConstraint("scope", "fingerprint"),
    )
    for column in ("created_at", "course_id", "scope"):
        op.create_index(f"ix_assignment_hint_banks_{column}", "assignment_hint_banks", [column])


def downgrade():
    op.drop_table("assignment_hint_banks")
