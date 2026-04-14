from fastapi import APIRouter
from app.models.schemas import HealthResponse
from app.core.config import settings

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health():
    """
    Lightweight health check — just confirms FastAPI is up and API key is configured.
    Does NOT call Claude on every health ping (would be slow + costly).
    Use GET /health/claude to explicitly test the Anthropic connection.
    """
    api_key_configured = bool(
        settings.anthropic_api_key and
        not settings.anthropic_api_key.startswith("sk-ant-placeholder")
    )

    return HealthResponse(
        status="UP",
        service="proptrack-ai-service",
        anthropic_connected=api_key_configured,
    )


@router.get("/health/claude")
async def health_claude():
    """
    Explicit Claude connectivity test — call this manually, not on every startup.
    """
    from app.core.claude_client import claude
    try:
        response = claude.messages.create(
            model=settings.haiku_model,
            max_tokens=10,
            messages=[{"role": "user", "content": "ping"}],
        )
        return {"status": "OK", "response": response.content[0].text}
    except Exception as e:
        return {"status": "ERROR", "detail": str(e)}