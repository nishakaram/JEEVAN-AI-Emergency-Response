"""
Basic tests for the responder scoring/ranking algorithm.
Run with: pytest tests/test_matching.py
"""
import sys
import os
from types import SimpleNamespace

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.services.matching import score_responder


def make_responder(type_="Ambulance", availability="Available"):
    return SimpleNamespace(type=type_, availability=availability)


def test_closer_responder_scores_higher_distance_factor():
    close = score_responder(1.0, make_responder(), "Moderate")
    far = score_responder(10.0, make_responder(), "Moderate")
    assert close["distance_factor"] > far["distance_factor"]


def test_available_beats_offline():
    available = score_responder(5.0, make_responder(availability="Available"), "Moderate")
    offline = score_responder(5.0, make_responder(availability="Offline"), "Moderate")
    assert available["total_score"] > offline["total_score"]


def test_ambulance_favoured_for_critical():
    ambulance = score_responder(5.0, make_responder(type_="Ambulance"), "Critical")
    volunteer = score_responder(5.0, make_responder(type_="Medical Volunteer"), "Critical")
    assert ambulance["total_score"] > volunteer["total_score"]


def test_score_never_negative():
    far_offline = score_responder(500.0, make_responder(availability="Offline"), "Low")
    assert far_offline["total_score"] >= 0
