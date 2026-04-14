import numpy_financial as npf
from fastapi import APIRouter, HTTPException
from app.models.schemas import PrepaymentRequest, PrepaymentResponse
from app.core.claude_client import claude
from app.core.config import settings

router = APIRouter(prefix="/finance", tags=["finance"])


@router.post("/prepayment", response_model=PrepaymentResponse)
async def analyse_prepayment(req: PrepaymentRequest):
    """
    Step 1 — Python computes the hard numbers (months saved, interest saved, ROI).
    Step 2 — Claude reasons over those numbers with narrative context.
    The split is intentional: math is deterministic, reasoning is Claude's job.
    """
    try:
        # ── Step 1: Pure financial calculation ────────────────────────────────
        monthly_rate = req.interest_rate / 100 / 12

        # Current EMI
        emi = float(npf.pmt(monthly_rate, req.remaining_months, -req.principal_outstanding))

        # Total interest without prepayment
        total_without_prepayment = emi * req.remaining_months - req.principal_outstanding

        # After prepayment — new outstanding
        new_principal = req.principal_outstanding - req.prepayment_amount
        if new_principal <= 0:
            new_principal = 0.0

        # New tenure at same EMI (months saved)
        if new_principal > 0 and monthly_rate > 0:
            new_months = float(npf.nper(monthly_rate, -emi, new_principal))
            new_months = max(0.0, new_months)
        else:
            new_months = 0.0

        months_saved = max(0, int(req.remaining_months - new_months))

        # Interest saved
        total_with_prepayment = (emi * new_months) - new_principal if new_months > 0 else 0
        interest_saved = max(0.0, total_without_prepayment - total_with_prepayment)

        # Prepayment effective ROI (annualised interest saved / amount prepaid)
        years_saved = months_saved / 12
        if years_saved > 0 and req.prepayment_amount > 0:
            prepayment_roi = (interest_saved / req.prepayment_amount / years_saved) * 100
        else:
            prepayment_roi = req.interest_rate  # Effective = loan rate

        # Alternate investment value over same period
        alt_years = req.remaining_months / 12
        alt_rate = req.alternate_investment_rate / 100
        alternate_value = req.prepayment_amount * ((1 + alt_rate) ** alt_years)

        # ── Step 2: Claude reasoning over computed numbers ────────────────────
        prompt = f"""A property owner is deciding whether to make a prepayment on their home loan.

LOAN DETAILS:
- Outstanding principal: ₹{req.principal_outstanding:,.0f}
- Annual interest rate: {req.interest_rate}%
- Remaining tenure: {req.remaining_months} months ({req.remaining_months // 12} years {req.remaining_months % 12} months)

PREPAYMENT ANALYSIS (pre-calculated):
- Prepayment amount: ₹{req.prepayment_amount:,.0f}
- Months saved: {months_saved} months
- Interest saved: ₹{interest_saved:,.0f}
- Effective prepayment ROI: {prepayment_roi:.2f}% p.a.

ALTERNATE SCENARIO (invest instead of prepay):
- Expected CAGR: {req.alternate_investment_rate}%
- Value of ₹{req.prepayment_amount:,.0f} invested for {alt_years:.1f} years: ₹{alternate_value:,.0f}
- Gain from investment: ₹{alternate_value - req.prepayment_amount:,.0f}

Provide:
1. A clear RECOMMENDATION: PREPAY, INVEST, or SPLIT (50% each)
2. The primary reason for your recommendation in 2-3 sentences
3. One important caveat or consideration they should keep in mind

Be direct. Use the actual numbers. Consider Indian tax context (home loan interest deduction under Section 24 reduces effective loan cost)."""

        response = claude.messages.create(
            model=settings.sonnet_model,
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}],
        )
        reasoning = response.content[0].text

        # Parse recommendation keyword from Claude's response
        rec_upper = reasoning.upper()
        if "PREPAY" in rec_upper[:100]:
            recommendation = "PREPAY"
        elif "INVEST" in rec_upper[:100]:
            recommendation = "INVEST"
        else:
            recommendation = "SPLIT"

        summary = (
            f"Prepaying ₹{req.prepayment_amount:,.0f} saves {months_saved} months "
            f"and ₹{interest_saved:,.0f} in interest. "
            f"Effective ROI: {prepayment_roi:.1f}% vs "
            f"{req.alternate_investment_rate}% alternate investment."
        )

        return PrepaymentResponse(
            months_saved=months_saved,
            interest_saved=round(interest_saved, 2),
            prepayment_roi_percent=round(prepayment_roi, 2),
            alternate_investment_value=round(alternate_value, 2),
            recommendation=recommendation,
            reasoning=reasoning,
            summary=summary,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))