from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from src.pipelines.pipeline import run_research_pipeline


# ============================================
# FastAPI Initialization
# ============================================

app = FastAPI(
    title="LangChain Multi-Agent Research API",
    description="AI research pipeline using LangChain, Groq, Tavily, scraping, writer and critic agents.",
    version="1.0.0",
)

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR / "frontend"

app.mount(
    "/static",
    StaticFiles(directory=FRONTEND_DIR / "static"),
    name="static",
)


# ============================================
# Request Schema
# ============================================

class ResearchRequest(BaseModel):
    topic: str = Field(
        ...,
        min_length=3,
        max_length=300,
        description="Research topic"
    )


# ============================================
# Health Check Route
# ============================================

@app.get("/")
def frontend():
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/health")
def health_check():

    return {
        "status": "ok",
        "message": "LangChain Multi-Agent Research API is running"
    }


# ============================================
# Research Endpoint
# ============================================

@app.post("/research")
def research(request: ResearchRequest):

    try:

        result = run_research_pipeline(request.topic)

        return {
            "topic": request.topic,
            "search_results": result.get("search_results", ""),
            "scraped_content_preview": result.get("scraped_content", "")[:1000],
            "report": result.get("report", ""),
            "feedback": result.get("feedback", "")
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Research pipeline failed: {str(e)}"
        )
