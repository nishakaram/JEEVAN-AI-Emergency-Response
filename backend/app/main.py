from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import emergencies, responders, users

app = FastAPI(
    title="JEEVAN API",
    description=(
        "AI-Assisted Emergency Response & Responder Coordination System — "
        "PROTOTYPE ONLY. This is not a real emergency service. "
        "In a real emergency, contact official emergency services."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(emergencies.router)
app.include_router(responders.router)
app.include_router(users.router)


@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "JEEVAN API",
        "note": "This is a prototype, not a real emergency service.",
    }


@app.get("/api/health")
def health():
    return {"status": "healthy"}
