from pydantic import BaseModel
from typing import Optional


# ── Health ────────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    service: str
    anthropic_connected: bool


# ── OCR ───────────────────────────────────────────────────────────────────────

class OcrPaymentRequest(BaseModel):
    image_url: str               # Supabase Storage public URL
    payment_id: str              # For audit / callback reference


class OcrPaymentResponse(BaseModel):
    utr_number: Optional[str] = None
    amount: Optional[float] = None
    payment_date: Optional[str] = None   # ISO date string
    bank_name: Optional[str] = None
    sender_name: Optional[str] = None
    receiver_name: Optional[str] = None
    confidence: str = "LOW"              # LOW | MEDIUM | HIGH
    raw_text: Optional[str] = None


class OcrDocumentRequest(BaseModel):
    document_url: str
    doc_type: str                # SALE_AGREEMENT | ALLOTMENT_LETTER | etc.
    property_id: str


class OcrDocumentResponse(BaseModel):
    possession_date: Optional[str] = None
    total_consideration: Optional[float] = None
    penalty_per_day: Optional[str] = None
    payment_milestones: list[str] = []
    builder_obligations: list[str] = []
    key_clauses: list[str] = []
    summary: str = ""


# ── Financial Advisor Chat ─────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str          # "user" | "assistant"
    content: str


class AdvisorChatRequest(BaseModel):
    property_id: str
    messages: list[ChatMessage]
    # Context injected by Spring Boot — no extra DB call from AI service
    context: Optional[dict] = None


class AdvisorChatResponse(BaseModel):
    message: str
    suggested_actions: list[str] = []


# ── Prepayment Analysis ────────────────────────────────────────────────────────

class PrepaymentRequest(BaseModel):
    principal_outstanding: float
    interest_rate: float          # Annual %, e.g. 8.75
    remaining_months: int
    prepayment_amount: float
    alternate_investment_rate: float = 12.0   # Assumed CAGR % if not prepaying


class PrepaymentResponse(BaseModel):
    months_saved: int
    interest_saved: float
    prepayment_roi_percent: float
    alternate_investment_value: float
    recommendation: str            # "PREPAY" | "INVEST" | "SPLIT"
    reasoning: str
    summary: str


# ── Email Generation ───────────────────────────────────────────────────────────

class EmailRequest(BaseModel):
    alert_type: str        # EMI_DUE | PAYMENT_CONFIRMED | IMBALANCE | MONTHLY_SUMMARY
    recipient_name: str
    context: dict          # Flexible context payload from Spring Boot


class EmailResponse(BaseModel):
    subject: str
    body_html: str
    body_text: str