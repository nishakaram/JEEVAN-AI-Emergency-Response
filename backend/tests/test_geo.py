"""
Basic tests for the Haversine distance and ETA calculations.
Run with: pytest tests/test_geo.py
"""
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.services.geo import haversine_distance_km, estimate_eta_minutes


def test_distance_zero_for_same_point():
    d = haversine_distance_km(26.9124, 75.7873, 26.9124, 75.7873)
    assert d == 0


def test_distance_is_symmetric():
    d1 = haversine_distance_km(26.9124, 75.7873, 26.8530, 75.8060)
    d2 = haversine_distance_km(26.8530, 75.8060, 26.9124, 75.7873)
    assert round(d1, 5) == round(d2, 5)


def test_distance_known_approx():
    # Jaipur city center to Malviya Nagar area, roughly 7-8 km apart.
    d = haversine_distance_km(26.9124, 75.7873, 26.8530, 75.8060)
    assert 5 < d < 10


def test_eta_scales_with_distance():
    eta_near = estimate_eta_minutes(5, 40)
    eta_far = estimate_eta_minutes(20, 40)
    assert eta_far > eta_near


def test_eta_none_for_zero_speed():
    assert estimate_eta_minutes(5, 0) is None
