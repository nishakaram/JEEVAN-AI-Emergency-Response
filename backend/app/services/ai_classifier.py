"""
AI-assisted emergency classification.

Given raw emergency description text, returns structured data:
    emergency_type, severity, summary, assistance_required, indicators

If ANTHROPIC_API_KEY is not set, OR the API call fails for ANY reason
(network, bad response, rate limit, missing package), this falls back to
a deterministic, keyword-based mock classifier — the prototype must keep
working even with no key and no internet. That fallback is what makes
Demo Mode (Phase 8) reliable.

IMPORTANT: this is AI-assisted classification for a college prototype,
NOT a medical diagnosis. It must never be presented to a user as one.
"""
import json
import re
from typing import Dict, List

from app.config import settings

VALID_TYPES = {"Road Accident", "Medical Emergency", "Fall", "Fire", "Other"}
VALID_SEVERITIES = {"Low", "Moderate", "Critical"}

SYSTEM_PROMPT = """You are an emergency-triage assistant inside a college prototype
called JEEVAN. You are given a short, possibly panicked description of an
emergency situation. Classify it and respond with ONLY a JSON object, no
other text, in exactly this shape:

{
  "emergency_type": one of ["Road Accident", "Medical Emergency", "Fall", "Fire", "Other"],
  "severity": one of ["Low", "Moderate", "Critical"],
  "summary": a short one-sentence summary of the situation,
  "assistance_required": a short phrase describing what help is needed,
  "indicators": a list of short keywords/phrases from the text that justify the classification (e.g. "unconscious", "bleeding")
}

This is NOT a medical diagnosis. Do not add any commentary, markdown, or
text outside the JSON object."""


def classify_emergency(description_text: str) -> Dict:
    if settings.ANTHROPIC_API_KEY:
        try:
            return _classify_with_llm(description_text)
        except Exception:
            # Swallow ALL errors here on purpose — any failure falls
            # straight through to the mock classifier below.
            pass
    return _classify_with_mock(description_text)


def _classify_with_llm(description_text: str) -> Dict:
    import anthropic  # imported lazily so the package is only required if a key is set

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    response = client.messages.create(
        model="claude-sonnet-5",
        max_tokens=400,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": description_text}],
    )
    raw_text = response.content[0].text.strip()
    raw_text = re.sub(r"^```(json)?|```$", "", raw_text, flags=re.MULTILINE).strip()
    data = json.loads(raw_text)
    return _sanitize(data)


def _sanitize(data: Dict) -> Dict:
    """Guards against a malformed/unexpected LLM response by falling back
    to safe defaults for any missing or invalid field, so a weird model
    response can never crash the app or corrupt the database."""
    emergency_type = data.get("emergency_type") if data.get("emergency_type") in VALID_TYPES else "Other"
    severity = data.get("severity") if data.get("severity") in VALID_SEVERITIES else "Moderate"
    summary = str(data.get("summary") or "Emergency reported.")[:500]
    assistance_required = str(data.get("assistance_required") or "General assistance")[:200]
    indicators = data.get("indicators") or []
    if not isinstance(indicators, list):
        indicators = [str(indicators)]
    indicators = [str(i) for i in indicators][:10]

    return {
        "emergency_type": emergency_type,
        "severity": severity,
        "summary": summary,
        "assistance_required": assistance_required,
        "indicators": indicators,
    }


# --- Deterministic mock fallback --------------------------------------

_TYPE_KEYWORDS = {
    "Road Accident": ["accident", "crash", "hit by", "vehicle", "car", "bike", "collision", "run over"],
    "Fall": ["fell", "fall", "slipped", "tripped"],
    "Fire": ["fire", "smoke", "burning", "flames"],
    "Medical Emergency": [
        "chest pain", "heart attack", "stroke", "seizure", "breathing",
        "faint", "diabetic", "allergic",
    ],
}

_CRITICAL_KEYWORDS = [
    "unconscious", "not breathing", "severe bleeding", "heavy bleeding",
    "no pulse", "not responding",
]
_MODERATE_KEYWORDS = ["bleeding", "pain", "injured", "broken", "fracture"]


def _classify_with_mock(description_text: str) -> Dict:
    text = description_text.lower()

    emergency_type = "Other"
    for etype, keywords in _TYPE_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            emergency_type = etype
            break

    if any(kw in text for kw in _CRITICAL_KEYWORDS):
        severity = "Critical"
    elif any(kw in text for kw in _MODERATE_KEYWORDS):
        severity = "Moderate"
    else:
        severity = "Low"

    indicators: List[str] = []
    indicators += [kw for kw in _CRITICAL_KEYWORDS if kw in text]
    indicators += [kw for kw in _MODERATE_KEYWORDS if kw in text]
    for keywords in _TYPE_KEYWORDS.values():
        indicators += [kw for kw in keywords if kw in text]
    indicators = list(dict.fromkeys(indicators))[:10]  # dedupe, keep order

    assistance_required = (
        "Immediate medical assistance" if severity == "Critical"
        else "Medical assistance" if severity == "Moderate"
        else "General assistance"
    )

    summary = f"{emergency_type} reported" + (
        f" — indicators: {', '.join(indicators)}." if indicators else "."
    )

    return {
        "emergency_type": emergency_type,
        "severity": severity,
        "summary": summary,
        "assistance_required": assistance_required,
        "indicators": indicators,
    }
