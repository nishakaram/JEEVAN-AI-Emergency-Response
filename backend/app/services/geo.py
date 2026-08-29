"""
Geospatial helper functions: distance between two coordinates, and a
rough ETA estimate. Used by the responder-matching algorithm (matching.py).
"""
import math

EARTH_RADIUS_KM = 6371.0


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two lat/lon points, in kilometers.

    The Haversine formula treats the Earth as a sphere and computes the
    shortest distance "as the crow flies" — it does not know about roads,
    so it will always be smaller than real driving distance. That's fine
    for a prototype's relative ranking, but not for turn-by-turn routing.
    """
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_KM * c


def estimate_eta_minutes(distance_km: float, speed_kmh: float):
    """Rough ETA = distance / speed. Illustrative/demo value only — does
    NOT account for real traffic, road networks, or routing. Returns None
    for stationary responders (e.g. hospitals, speed 0)."""
    if not speed_kmh or speed_kmh <= 0:
        return None
    hours = distance_km / speed_kmh
    return round(hours * 60, 1)
