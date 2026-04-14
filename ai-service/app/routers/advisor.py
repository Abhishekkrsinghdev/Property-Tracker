import httpx
from fastapi import APIRouter, HTTPException, Request
from app.models.schemas import AdvisorChatRequest, AdvisorChatResponse
from app.core.claude_client import claude
from app.core.config import settings

router = APIRouter(prefix="/advisor", tags=["advisor"])

# Tool definition — Claude calls this to get live property data from Spring Boot
PROPERTY_CONTEXT_TOOL = {
    "name": "get_property_context",
    "description": (
        "Fetches the current financial context for a property: loan balance, "
        "EMIs paid, partner contributions, valuation history, and upcoming EMIs. "
        "Always call this before answering any financial question."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "property_id": {
                "type": "string",
                "description": "The UUID of the property to fetch context for",
            }
        },
        "required": ["property_id"],
    },
}

SYSTEM_PROMPT = """You are PropTrack's AI financial advisor — a knowledgeable, 
practical assistant specialising in Indian real estate investment, home loans, 
and property co-ownership.

Before answering any financial question, always call get_property_context to 
retrieve the user's live data. Base your answers on their actual numbers, not 
generic assumptions.

Guidelines:
- Be direct and specific — quote actual numbers from the context
- Consider Indian tax implications (Section 24, LTCG, indexation)
- Acknowledge market uncertainty — give ranges, not false precision  
- For prepayment vs. invest decisions, compare effective loan rate vs. expected returns
- Keep responses concise but complete — 150-250 words is ideal
- End with 1-2 concrete suggested next actions"""


async def _fetch_property_context(property_id: str, context: dict | None, auth_token: str | None) -> str:
    """
    Fetches live context from Spring Boot OR uses the pre-injected context
    passed in the request (avoids a second DB round-trip if Spring Boot already
    assembled it before calling us).
    """
    if context:
        return str(context)

    try:
        async with httpx.AsyncClient() as client:
            headers = {}
            if auth_token:
                headers["Authorization"] = auth_token
            response = await client.get(
                f"{settings.spring_boot_url}/api/advisor/context/{property_id}",
                headers=headers,
                timeout=10,
            )
            response.raise_for_status()
            return response.text
    except Exception as e:
        return f"Context unavailable: {e}"


@router.post("/chat", response_model=AdvisorChatResponse)
async def advisor_chat(req: AdvisorChatRequest, request: Request):
    """
    Multi-turn financial advisor chat with tool use.
    Claude fetches live property context before reasoning.
    """
    try:
        messages = [{"role": m.role, "content": m.content} for m in req.messages]

        # Agentic loop — handle tool use calls from Claude
        while True:
            response = claude.messages.create(
                model=settings.sonnet_model,
                max_tokens=1024,
                system=SYSTEM_PROMPT,
                tools=[PROPERTY_CONTEXT_TOOL],
                messages=messages,
            )

            # Claude finished — return the text response
            if response.stop_reason == "end_turn":
                text = next(
                    (b.text for b in response.content if hasattr(b, "text")), ""
                )
                return AdvisorChatResponse(
                    message=text,
                    suggested_actions=_extract_actions(text),
                )

            # Claude wants to call a tool
            if response.stop_reason == "tool_use":
                tool_use_block = next(
                    b for b in response.content if b.type == "tool_use"
                )
                property_id = tool_use_block.input.get("property_id", req.property_id)
                auth_token = request.headers.get("Authorization")
                context_data = await _fetch_property_context(property_id, req.context, auth_token)

                # Append Claude's tool call + our result back into the conversation
                messages.append({"role": "assistant", "content": response.content})
                messages.append({
                    "role": "user",
                    "content": [
                        {
                            "type": "tool_result",
                            "tool_use_id": tool_use_block.id,
                            "content": context_data,
                        }
                    ],
                })
                continue

            # Unexpected stop reason
            break

        raise HTTPException(status_code=500, detail="Advisor loop ended unexpectedly")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _extract_actions(text: str) -> list[str]:
    """
    Heuristic: pull out bullet-point suggested actions from Claude's response.
    Returns up to 3 action strings.
    """
    actions = []
    for line in text.split("\n"):
        stripped = line.strip()
        if stripped.startswith(("- ", "• ", "* ", "1.", "2.", "3.")):
            action = stripped.lstrip("-•*0123456789. ").strip()
            if action and len(action) > 10:
                actions.append(action)
        if len(actions) >= 3:
            break
    return actions