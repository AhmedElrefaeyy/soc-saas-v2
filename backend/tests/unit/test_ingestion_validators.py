"""Unit tests for ingestion batch validators."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from app.core.exceptions import ValidationError
from app.ingestion.schemas import RawEventPayload
from app.ingestion.validators import validate_batch


def _make_event(event_id: str = "evt-001") -> RawEventPayload:
    return RawEventPayload(
        event_id=event_id,
        timestamp=datetime.now(tz=UTC),
        category="process",
        hostname="HOST1",
        os_type="windows",
    )


class TestValidateBatch:
    def test_valid_batch_passes(self):
        events = [_make_event(f"evt-{i}") for i in range(5)]
        validate_batch(events)  # should not raise

    def test_empty_batch_raises(self):
        with pytest.raises(ValidationError):
            validate_batch([])

    def test_duplicate_event_ids_raise(self):
        events = [_make_event("evt-001"), _make_event("evt-001")]
        with pytest.raises(ValidationError, match="duplicate"):
            validate_batch(events)

    def test_batch_exceeding_max_size_raises(self):
        from app.ingestion.validators import MAX_EVENTS_PER_BATCH

        events = [_make_event(f"evt-{i}") for i in range(MAX_EVENTS_PER_BATCH + 1)]
        with pytest.raises(ValidationError):
            validate_batch(events)


class TestFirewallFieldsAllowlist:
    """SourceAddress/DestAddress must survive the ingestion allowlist and reach the normalizer."""

    def _make_firewall_event(self) -> RawEventPayload:
        return RawEventPayload(
            event_id="fw-001",
            timestamp=datetime.now(tz=UTC),
            category="network",
            hostname="AHMED-ELREFAEY",
            os_type="windows",
            # Windows Firewall Event 5156 fields sent by the agent
            event_id_windows=5156,
            SourceAddress="172.20.10.2",
            DestAddress="10.0.0.1",
            SourcePort="0",
            DestPort="0",
            Protocol="1",
        )

    def test_source_address_in_allowed_extra_fields(self):
        from app.ingestion.service import _ALLOWED_EXTRA_FIELDS

        assert "SourceAddress" in _ALLOWED_EXTRA_FIELDS, (
            "SourceAddress must be in _ALLOWED_EXTRA_FIELDS so Windows Firewall "
            "Event 5156 src IP reaches the normalizer"
        )

    def test_dest_address_in_allowed_extra_fields(self):
        from app.ingestion.service import _ALLOWED_EXTRA_FIELDS

        assert "DestAddress" in _ALLOWED_EXTRA_FIELDS

    def test_build_stream_message_preserves_source_address(self):
        from unittest.mock import MagicMock
        from uuid import UUID

        from app.ingestion.service import _build_stream_message

        mock_agent = MagicMock()
        mock_agent.id = UUID("00000000-0000-0000-0000-000000000001")
        mock_agent.tenant_id = UUID("00000000-0000-0000-0000-000000000002")
        mock_agent.hostname = "AHMED-ELREFAEY"
        mock_agent.os_type = MagicMock(value="windows")

        event = self._make_firewall_event()
        msg = _build_stream_message(mock_agent, event)

        assert msg.get("SourceAddress") == "172.20.10.2", (
            "SourceAddress was stripped — detection rules using network.src_ip will never fire"
        )
        assert msg.get("DestAddress") == "10.0.0.1"
        assert msg.get("Protocol") == "1"

    def test_full_pipeline_firewall_event_to_normalized_network(self):
        """Ingestion → normalization round-trip: SourceAddress becomes network.src_ip."""
        from unittest.mock import MagicMock
        from uuid import UUID

        from app.ingestion.service import _build_stream_message
        from app.normalization.mapper import map_stream_message_to_normalized

        mock_agent = MagicMock()
        mock_agent.id = UUID("00000000-0000-0000-0000-000000000001")
        mock_agent.tenant_id = UUID("00000000-0000-0000-0000-000000000002")
        mock_agent.hostname = "AHMED-ELREFAEY"
        mock_agent.os_type = MagicMock(value="windows")

        event = self._make_firewall_event()
        stream_msg = _build_stream_message(mock_agent, event)
        # Simulate what the normalization worker receives from Redis
        stream_msg["tenant_id"] = "00000000-0000-0000-0000-000000000002"
        stream_msg["agent_id"] = "00000000-0000-0000-0000-000000000001"

        normalized = map_stream_message_to_normalized(stream_msg)

        assert normalized.network is not None, "network must not be None after full pipeline"
        assert normalized.network.src_ip == "172.20.10.2"
        assert normalized.network.protocol == "ICMP"


class TestCategoryValidation:
    def test_valid_categories_accepted(self):
        for cat in ("process", "network", "file", "auth", "registry", "dns", "other"):
            ev = RawEventPayload(
                event_id="id1",
                timestamp=datetime.now(tz=UTC),
                category=cat,
                hostname="H",
                os_type="linux",
            )
            assert ev.category == cat

    def test_unknown_category_defaults_to_other(self):
        ev = RawEventPayload(
            event_id="id1",
            timestamp=datetime.now(tz=UTC),
            category="weird_cat",
            hostname="H",
            os_type="linux",
        )
        assert ev.category == "other"
