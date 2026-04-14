import json
import httpx
from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    OcrPaymentRequest, OcrPaymentResponse,
    OcrDocumentRequest, OcrDocumentResponse,
)
from app.core.claude_client import claude
from app.core.config import settings

router = APIRouter(prefix="/ocr", tags=["ocr"])


@router.post("/payment", response_model=OcrPaymentResponse)
async def extract_payment_details(req: OcrPaymentRequest):
    """
    Accepts a payment screenshot URL (Supabase Storage).
    Claude Vision extracts UTR, amount, date, bank name.
    Returns structured JSON — Spring Boot pre-fills the payment form.
    """
    try:
        # Fetch image bytes and encode for Claude Vision
        async with httpx.AsyncClient() as client:
            img_response = await client.get(req.image_url, timeout=15)
            img_response.raise_for_status()

        image_data = img_response.content
        import base64
        b64_image = base64.standard_b64encode(image_data).decode("utf-8")
        media_type = img_response.headers.get("content-type", "image/jpeg")

        response = claude.messages.create(
            model=settings.sonnet_model,
            max_tokens=500,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": b64_image,
                            },
                        },
                        {
                            "type": "text",
                            "text": """Extract payment details from this bank transfer screenshot.
Return ONLY valid JSON with these exact keys (use null if not found):
{
  "utr_number": "12-digit UTR or reference number",
  "amount": 12345.00,
  "payment_date": "YYYY-MM-DD",
  "bank_name": "Bank name",
  "sender_name": "Sender name",
  "receiver_name": "Receiver name",
  "confidence": "HIGH|MEDIUM|LOW",
  "raw_text": "All text visible in image"
}
Return ONLY the JSON object. No explanation, no markdown.""",
                        },
                    ],
                }
            ],
        )

        raw = response.content[0].text.strip()
        data = json.loads(raw)
        return OcrPaymentResponse(**data)

    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="Claude returned non-JSON response")
    except httpx.HTTPError as e:
        raise HTTPException(status_code=400, detail=f"Could not fetch image: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/document", response_model=OcrDocumentResponse)
async def extract_document_details(req: OcrDocumentRequest):
    """
    Accepts a property document URL (PDF).
    Claude extracts: possession date, penalty clauses, payment milestones,
    builder obligations, and a plain-language summary.
    """
    try:
        async with httpx.AsyncClient() as client:
            doc_response = await client.get(req.document_url, timeout=30)
            doc_response.raise_for_status()

        import base64
        b64_doc = base64.standard_b64encode(doc_response.content).decode("utf-8")

        response = claude.messages.create(
            model=settings.sonnet_model,
            max_tokens=1500,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "document",
                            "source": {
                                "type": "base64",
                                "media_type": "application/pdf",
                                "data": b64_doc,
                            },
                        },
                        {
                            "type": "text",
                            "text": f"""This is a {req.doc_type} for a property purchase in India.
Extract key details and return ONLY valid JSON:
{{
  "possession_date": "YYYY-MM-DD or null",
  "total_consideration": 5000000.00,
  "penalty_per_day": "Description of delay penalty or null",
  "payment_milestones": ["List of payment milestone descriptions"],
  "builder_obligations": ["List of what builder must deliver"],
  "key_clauses": ["List of 3-5 most important clauses in plain language"],
  "summary": "2-3 sentence plain language summary of the document"
}}
Return ONLY the JSON object.""",
                        },
                    ],
                }
            ],
        )

        raw = response.content[0].text.strip()
        data = json.loads(raw)
        return OcrDocumentResponse(**data)

    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="Claude returned non-JSON response")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))