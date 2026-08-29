"""
Tests for the AI classifier's deterministic mock fallback (no network or
API key required — this is what CI / offline grading would run).
Run with: pytest tests/test_ai_classifier.py
"""
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.services.ai_classifier import classify_emergency, _classify_with_mock
from app.config import settings


def test_mock_classifies_critical_road_accident():
    result = _classify_with_mock(
        "There has been a road accident. The person is unconscious and bleeding."
    )
    assert result["emergency_type"] == "Road Accident"
    assert result["severity"] == "Critical"
    assert "unconscious" in result["indicators"]


def test_mock_classifies_fire():
    result = _classify_with_mock("There is a fire in the kitchen, lots of smoke.")
    assert result["emergency_type"] == "Fire"


def test_mock_classifies_low_severity_fall():
    result = _classify_with_mock("Grandma fell down but seems okay, just shaken.")
    assert result["emergency_type"] == "Fall"
    assert result["severity"] == "Low"


def test_mock_returns_all_required_fields():
    result = _classify_with_mock("Something happened, not sure what.")
    required = {"emergency_type", "severity", "summary", "assistance_required", "indicators"}
    assert required.issubset(result.keys())


def test_classify_emergency_falls_back_to_mock_without_api_key(monkeypatch):
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "")
    result = classify_emergency("There has been an accident, bleeding heavily.")
    assert result["emergency_type"] == "Road Accident"
    assert result["severity"] == "Critical"
