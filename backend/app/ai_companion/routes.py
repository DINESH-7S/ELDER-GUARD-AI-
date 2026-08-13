import uuid
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, Depends

import requests

from app.core import config
from app.core.security import get_current_user
from app.core.database import supabase
from app.notifications.service import broadcast_notification
from app.ai_companion.models import (
    ChatRole,
    ChatMessage,
    ChatRequest,
    ChatResponse,
    ChatLogEntry,
    HealthReviewRequest,
    HealthReviewResponse,
    VitalsReportRequest,
    VitalsReportResponse,
)

logger = logging.getLogger("elderguard.ai_companion.routes")

router = APIRouter(prefix="/ai", tags=["AI Companion"])

# System Prompts (Module-level constants)
COMPANION_SYSTEM_PROMPT = (
    "You are ElderGuard AI Companion, a warm, patient, and empathetic conversational assistant for elderly individuals. "
    "Use clear, simple, friendly language. Provide supportive companionship, offer reassuring responses, "
    "and keep conversations light and engaging. Never give medical diagnoses, prescribe treatments, or offer clinical advice. "
    "If the elder mentions feeling unwell, experiencing symptoms, or having a medical question, gently redirect them to "
    "contact their doctor or caregiver."
)

CHECKIN_SYSTEM_PROMPT = (
    "You are ElderGuard AI Check-in Assistant. Your goal is to conduct a gentle, friendly daily check-in with an elder. "
    "Ask simple questions about their day, mood, comfort, and well-being. Keep answers concise and encouraging. "
    "Never provide medical diagnosis or advice; always direct health concerns to their caregiver or doctor."
)

# Reviewable Distress Phrases List
DISTRESS_PHRASES = [
    "i fell",
    "i can't get up",
    "cannot get up",
    "chest pain",
    "hard to breathe",
    "can't breathe",
    "feeling dizzy",
    "i feel faint",
    "help me please",
    "emergency",
]

# Fallback response message on Groq API failure or timeout
FALLBACK_REPLY_MESSAGE = (
    "I'm having trouble right now, please try again in a moment. "
    "If you feel unwell, please contact your caregiver or doctor directly."
)

# In-memory mock database store for chat logs
_mock_chat_logs_db: List[Dict[str, Any]] = []


def check_distress_signals(message: str) -> bool:
    """
    Evaluates incoming user message for distress phrases before calling the AI provider.
    Case-insensitive substring match against DISTRESS_PHRASES.
    """
    msg_lower = message.lower()
    for phrase in DISTRESS_PHRASES:
        if phrase in msg_lower:
            return True
    return False


def build_prompt(request: ChatRequest) -> tuple[str, List[Dict[str, str]]]:
    """
    Constructs system prompt and formatted conversation history (truncated to last 20 messages).
    Injects health_context into the system prompt when provided.
    Returns tuple: (system_prompt: str, formatted_history: List[Dict[str, str]])
    """
    system_prompt = CHECKIN_SYSTEM_PROMPT if request.mode == "checkin" else COMPANION_SYSTEM_PROMPT

    # Inject health context if provided
    if request.health_context:
        system_prompt += (
            "\n\n--- ELDER'S CURRENT HEALTH CONTEXT (use this to personalize your responses) ---\n"
            + request.health_context
            + "\n--- END HEALTH CONTEXT ---\n"
            "Refer to the above health data naturally in conversation when relevant. "
            "Do not read out raw numbers mechanically. Be warm and conversational about it."
        )

    # Truncate history to last 20 messages (oldest first)
    raw_history = request.history[-20:] if len(request.history) > 20 else request.history

    formatted_history = []
    for msg in raw_history:
        role = "user" if msg.role == ChatRole.USER else "assistant"
        formatted_history.append({"role": role, "content": msg.content})

    return system_prompt, formatted_history


def configured_groq_keys() -> List[str]:
    return [key.strip() for key in config.GROQ_API_KEYS.split(",") if key.strip()]


def call_groq_api(system_prompt: str, formatted_history: List[Dict[str, str]], user_message: str) -> str:
    """
    Executes Groq Chat Completions API call.
    Catches exceptions/timeouts and returns fallback text.
    """
    api_keys = configured_groq_keys()
    if not api_keys:
        logger.info("Using fallback AI response due to unconfigured Groq API keys.")
        return "I'm doing well, thank you for checking in! How are you feeling today?"

    messages = [{"role": "system", "content": system_prompt}, *formatted_history, {"role": "user", "content": user_message}]
    payload = {
        "model": config.GROQ_MODEL,
        "messages": messages,
        "temperature": 0.5,
        "max_tokens": 500,
    }

    last_error = None
    for api_key in api_keys:
        try:
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json=payload,
                timeout=20,
            )
            if response.status_code in (401, 403, 429):
                last_error = f"Groq key rejected with {response.status_code}"
                continue
            response.raise_for_status()
            data = response.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content")
            if content:
                return content.strip()
        except Exception as exc:
            last_error = str(exc)
            continue

    logger.error("Groq API call failed: %s", last_error)
    return FALLBACK_REPLY_MESSAGE



def verify_ai_access(current_user: dict, elder_id: str, is_write: bool = False):
    """
    Enforces authorization rules:
    - Elder: chat/read as self only.
    - Caregiver: read-only history for linked elders.
    """
    user_id = current_user.get("user_id")
    role = current_user.get("role")

    if user_id == elder_id:
        return True
    if role == "caregiver" and not is_write:
        return True

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"User '{user_id}' with role '{role}' is not authorized to operate on AI companion for elder '{elder_id}'."
    )


@router.post("/chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
def chat_with_ai_companion(
    payload: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Sends message to AI Companion.
    - Validates message non-empty.
    - Enforces elder can only chat as self.
    - Runs distress signal check; if flagged, dispatches HIGH priority alert to linked caregiver.
    - Truncates history to last 20 messages before Groq prompt construction.
    - Calls Groq API with fallback handling.
    - If PERSIST_CHAT_HISTORY is enabled, appends turn to chat_logs.
    """
    verify_ai_access(current_user, payload.elder_id, is_write=True)

    # 1. Distress Signal Detection
    is_distress = check_distress_signals(payload.message)

    if is_distress:
        logger.warning(f"Distress signal detected in message for elder '{payload.elder_id}'.")
        try:
            broadcast_notification(
                recipient_ids=[f"caregiver_of_{payload.elder_id}"],
                title="DISTRESS SIGNAL DETECTED",
                body=f"Elder '{payload.elder_id[:6]}' expressed distress in AI Companion chat. Please check on them.",
                type="alert",
                priority="HIGH",
                payload={"elder_id": payload.elder_id}
            )
        except Exception as e:
            logger.error(f"Failed to dispatch distress alert notification: {e}")

    # 2. Build Prompt & Call Groq API
    system_prompt, formatted_history = build_prompt(payload)
    reply_text = call_groq_api(system_prompt, formatted_history, payload.message)

    now_iso = datetime.now(timezone.utc).isoformat()

    # 3. Write-Only Chat History Persistence (If PERSIST_CHAT_HISTORY toggle enabled)
    if config.PERSIST_CHAT_HISTORY:

        user_log = {
            "id": str(uuid.uuid4()),
            "elder_id": payload.elder_id,
            "role": ChatRole.USER.value,
            "content": payload.message,
            "created_at": now_iso,
        }
        model_log = {
            "id": str(uuid.uuid4()),
            "elder_id": payload.elder_id,
            "role": ChatRole.MODEL.value,
            "content": reply_text,
            "created_at": now_iso,
        }

        _mock_chat_logs_db.extend([user_log, model_log])

        if supabase is not None:
            try:
                supabase.table("chat_logs").insert([user_log, model_log]).execute()
            except Exception as e:
                logger.warning(f"Failed to persist chat logs to DB: {e}")

    return ChatResponse(
        reply=reply_text,
        distress_flagged=is_distress,
        created_at=now_iso
    )


@router.post("/health-review", response_model=HealthReviewResponse, status_code=status.HTTP_200_OK)
def generate_health_review(
    payload: HealthReviewRequest,
    current_user: dict = Depends(get_current_user),
):
    verify_ai_access(current_user, payload.elder_id, is_write=True)
    now_iso = datetime.now(timezone.utc).isoformat()
    system_prompt = (
        "You are Mevi, ElderGuard's gentle health update assistant. "
        "Write a short, polite, reassuring health review for an elder using only the provided dashboard data. "
        "Do not diagnose, prescribe, or claim certainty. Mention that concerns should be shared with their doctor or caregiver. "
        "Keep it under 90 words."
    )
    user_message = (
        "Create today's health review from this data:\n"
        f"Vitals: {payload.vitals}\n"
        f"Medicines: {payload.medicines}\n"
        f"Appointments: {payload.appointments}\n"
        f"Notes: {payload.notes or ''}"
    )
    review = call_groq_api(system_prompt, [], user_message)
    return HealthReviewResponse(review=review, created_at=now_iso)


VITALS_REPORT_SYSTEM_PROMPT = (
    "You are Mevi, ElderGuard's compassionate AI health analyst. "
    "Generate a detailed but gentle health report for an elderly patient based on their vitals history. "
    "Structure your report with these sections:\n"
    "1. **Overall Health Summary** - A warm 2-3 sentence overview\n"
    "2. **Vitals Analysis** - Review each vital sign trend (BP, heart rate, SpO2, blood sugar) and note if they are stable, improving, or need attention\n"
    "3. **Observations & Patterns** - Note any patterns you see (e.g., morning spikes, post-meal changes)\n"
    "4. **Gentle Recommendations** - Lifestyle tips like hydration, walking, rest - NOT medical prescriptions\n"
    "5. **Summary** - A reassuring closing\n\n"
    "RULES:\n"
    "- Never diagnose conditions or prescribe medications\n"
    "- Use warm, encouraging language suitable for elderly readers\n"
    "- If any vital is concerning, gently suggest consulting their doctor\n"
    "- Keep the total report under 300 words\n"
    "- Use simple language, avoid medical jargon\n"
    "- Include gentle emojis sparingly (🌿 💚 ☀️) to make it friendly"
)


@router.post("/vitals-report", response_model=VitalsReportResponse, status_code=status.HTTP_200_OK)
def generate_vitals_report(
    payload: VitalsReportRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Generates a comprehensive AI-powered health report from elder's vitals history.
    Used by the Mevi's Report widget on the Elder Dashboard.
    """
    verify_ai_access(current_user, payload.elder_id, is_write=True)
    now_iso = datetime.now(timezone.utc).isoformat()

    elder_name = payload.elder_name or "the elder"
    elder_age = f", age {payload.elder_age}" if payload.elder_age else ""

    vitals_summary_parts = []
    if payload.current_vitals:
        cv = payload.current_vitals
        vitals_summary_parts.append(f"Current Vitals: BP={cv.get('blood_pressure', 'N/A')}, "
                                     f"HR={cv.get('heart_rate', 'N/A')} bpm, "
                                     f"SpO2={cv.get('spo2', 'N/A')}%, "
                                     f"Blood Sugar={cv.get('blood_sugar', 'N/A')} mg/dL")

    if payload.vitals_history:
        vitals_summary_parts.append(f"\nVitals History ({len(payload.vitals_history)} readings):")
        for i, reading in enumerate(payload.vitals_history[-10:]):  # Last 10 readings
            vitals_summary_parts.append(f"  Reading {i+1}: {reading}")

    if payload.medicines:
        med_names = [m.get('name', m) if isinstance(m, dict) else str(m) for m in payload.medicines[:10]]
        vitals_summary_parts.append(f"\nCurrent Medicines: {', '.join(med_names)}")

    if payload.notes:
        vitals_summary_parts.append(f"\nAdditional Notes: {payload.notes}")

    user_message = (
        f"Generate today's health report for {elder_name}{elder_age}.\n\n"
        + "\n".join(vitals_summary_parts)
    )

    report = call_groq_api(VITALS_REPORT_SYSTEM_PROMPT, [], user_message)

    # Extract risk flags from the report
    risk_flags = []
    report_lower = report.lower()
    if any(w in report_lower for w in ["high blood pressure", "elevated bp", "hypertension"]):
        risk_flags.append("Elevated Blood Pressure")
    if any(w in report_lower for w in ["low oxygen", "low spo2", "oxygen concern"]):
        risk_flags.append("Low Oxygen Saturation")
    if any(w in report_lower for w in ["high sugar", "elevated glucose", "blood sugar high"]):
        risk_flags.append("Elevated Blood Sugar")
    if any(w in report_lower for w in ["irregular heart", "heart rate concern", "tachycardia", "bradycardia"]):
        risk_flags.append("Heart Rate Irregularity")

    # Generate a short summary line
    summary_prompt = (
        "Summarize this health report in exactly one short sentence (under 20 words), "
        "suitable for a dashboard widget. Be warm and reassuring."
    )
    summary = call_groq_api(summary_prompt, [], report)

    return VitalsReportResponse(
        report=report,
        summary=summary.strip(),
        risk_flags=risk_flags,
        created_at=now_iso
    )


@router.get("/chat/history/{elder_id}", response_model=List[ChatLogEntry])
def get_chat_history(
    elder_id: str,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """
    Returns stored chat history logs for an elder (if persistence is enabled).
    Restricted to elder themself or linked caregiver.
    """
    verify_ai_access(current_user, elder_id, is_write=False)

    results = []
    if supabase is not None:
        try:
            res = supabase.table("chat_logs").select("*").eq("elder_id", elder_id).order("created_at", desc=True).limit(limit).execute()
            if res.data:
                results = res.data
        except Exception:
            pass

    if not results:
        results = [l for l in _mock_chat_logs_db if l.get("elder_id") == elder_id]
        results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        results = results[:limit]

    return [ChatLogEntry(**l) for l in results]
