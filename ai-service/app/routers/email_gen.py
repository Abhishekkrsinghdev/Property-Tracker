from fastapi import APIRouter, HTTPException
from app.models.schemas import EmailRequest, EmailResponse
from app.core.claude_client import claude
from app.core.config import settings

router = APIRouter(prefix="/email", tags=["email"])

TEMPLATES = {
    "EMI_DUE": "EMI payment due reminder",
    "PAYMENT_CONFIRMED": "Partner payment confirmation",
    "IMBALANCE": "Co-ownership contribution imbalance alert",
    "MONTHLY_SUMMARY": "Monthly property financial summary",
    "ANNUAL_REPORT": "Annual property investment summary",
}


@router.post("/generate", response_model=EmailResponse)
async def generate_email(req: EmailRequest):
    """
    Generates personalised email content using Claude Haiku (cost-optimised).
    Spring Boot calls this from @Scheduled jobs, then sends via Resend.
    """
    if req.alert_type not in TEMPLATES:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown alert_type. Valid: {list(TEMPLATES.keys())}",
        )

    ctx = req.context
    prompt = _build_prompt(req.alert_type, req.recipient_name, ctx)

    try:
        response = claude.messages.create(
            model=settings.haiku_model,   # Haiku — 20× cheaper than Sonnet
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text

        # Parse subject and body from Claude's structured response
        subject, body_text = _parse_email_response(raw, req.alert_type, req.recipient_name)
        body_html = _text_to_html(body_text)

        return EmailResponse(
            subject=subject,
            body_html=body_html,
            body_text=body_text,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _build_prompt(alert_type: str, recipient_name: str, ctx: dict) -> str:
    base = f"""Write a professional, friendly email for PropTrack property management app.
Recipient: {recipient_name}
Alert type: {TEMPLATES[alert_type]}

Context data:
{_format_context(ctx)}

Format your response EXACTLY as:
SUBJECT: <email subject line>
BODY:
<email body — plain text, no HTML>

Guidelines:
- Use the actual numbers from the context
- Warm but professional tone
- 80-120 words for the body
- End with a clear call-to-action if applicable
- Sign off as "PropTrack Team"
"""
    return base


def _format_context(ctx: dict) -> str:
    return "\n".join(f"- {k}: {v}" for k, v in ctx.items())


def _parse_email_response(raw: str, alert_type: str, recipient: str) -> tuple[str, str]:
    lines = raw.strip().split("\n")
    subject = f"PropTrack: {TEMPLATES[alert_type]}"
    body_lines = []
    in_body = False

    for line in lines:
        if line.startswith("SUBJECT:"):
            subject = line.replace("SUBJECT:", "").strip()
        elif line.startswith("BODY:"):
            in_body = True
        elif in_body:
            body_lines.append(line)

    body = "\n".join(body_lines).strip() or raw.strip()
    return subject, body


def _text_to_html(text: str) -> str:
    """Minimal plain-text → HTML conversion."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    html_parts = ["<html><body style='font-family:sans-serif;line-height:1.6;max-width:600px;margin:auto;padding:20px'>"]
    for para in paragraphs:
        html_parts.append(f"<p>{para}</p>")
    html_parts.append("</body></html>")
    return "\n".join(html_parts)