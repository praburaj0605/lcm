"""Unit tests for public quotation respond logic (no HTTP)."""

import uuid

from app.api.public import _apply_respond
from app.models.documents import QuotationRow


def test_apply_respond_accept(db_session):
    qid = str(uuid.uuid4())
    tok = "secret-token"
    db_session.add(
        QuotationRow(
            id=qid,
            data={
                "quoteId": "Q-1",
                "status": "Sent",
                "clientResponseToken": tok,
            },
        )
    )
    db_session.commit()

    ok, code, msg = _apply_respond(db_session, qid, tok, "accept")
    assert ok
    assert code == "Accepted"
    row = db_session.get(QuotationRow, qid)
    assert row.data["status"] == "Accepted"
    assert "clientRespondedAt" in row.data


def test_apply_respond_idempotent_conflict(db_session):
    qid = str(uuid.uuid4())
    tok = "t2"
    db_session.add(
        QuotationRow(
            id=qid,
            data={"status": "Sent", "clientResponseToken": tok},
        )
    )
    db_session.commit()
    assert _apply_respond(db_session, qid, tok, "accept")[0]
    ok, code, _ = _apply_respond(db_session, qid, tok, "reject")
    assert not ok
    assert code == "conflict"


def test_apply_respond_bad_action(db_session):
    qid = str(uuid.uuid4())
    db_session.add(QuotationRow(id=qid, data={"clientResponseToken": "x", "status": "Sent"}))
    db_session.commit()
    ok, code, _ = _apply_respond(db_session, qid, "x", "hold")
    assert not ok
    assert code == "bad_action"
