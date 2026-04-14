import anthropic
from app.core.config import settings

# Single shared client — thread-safe, reuses connections
claude = anthropic.Anthropic(api_key=settings.anthropic_api_key)