import os
import random
import socket
import logging
import tempfile
from datetime import date, datetime, timezone, timedelta
from functools import lru_cache
from pathlib import Path
from threading import Lock
from typing import Any, List, Optional
from io import BytesIO
from fastapi import FastAPI, Depends, HTTPException, Query, Response, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select, func

from backend.database import get_session, init_db
from backend.models import (
    Household, SupplyItem, DistributionRecord, ResupplyAlert,
    IntakeVoiceRequest, IntakePhotoRequest, ExtractedHousehold,
    DuplicateCheckRequest, DuplicateMatch,
    SupplyCalculationRequest, CalculatedSupply,
    HouseholdCreateRequest, ReliefScanRequest, ReliefScanResponse,
    SyncPayload, DashboardStats
)
from backend.tala import (
    tala_parse_voice, tala_parse_photo_text,
    tala_check_duplicates, tala_calculate_needs,
    tala_predict_alerts, tala_generate_sms_ulat
)
from backend.reports import generate_evacuation_pdf
from backend.seed import seed_database

logger = logging.getLogger("alalai.intake")
MAX_AUDIO_BYTES = 25 * 1024 * 1024
MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_IMAGE_PIXELS = 25_000_000
_WHISPER_LOCK = Lock()


@lru_cache(maxsize=1)
def _get_whisper_model(model_name: str) -> Any:
    try:
        from faster_whisper import WhisperModel
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail="Speech recognition is not installed on the AlalAI hub. Install backend requirements first.",
        ) from exc

    try:
        return WhisperModel(model_name, device="cpu", compute_type="int8")
    except Exception as exc:
        logger.exception("Unable to load the local Whisper model %s", model_name)
        raise HTTPException(
            status_code=503,
            detail=f"Taga-alalAI could not load Whisper model '{model_name}'. Connect the hub to download it once, then retry.",
        ) from exc


@lru_cache(maxsize=1)
def _get_ocr_engine() -> Any:
    try:
        from rapidocr_onnxruntime import RapidOCR
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail="ID text recognition is not installed on the AlalAI hub. Install backend requirements first.",
        ) from exc

    return RapidOCR()


def _read_upload(file: UploadFile, max_bytes: int, allowed_types: set[str], allowed_suffixes: set[str]) -> tuple[bytes, str]:
    suffix = Path(file.filename or "").suffix.lower()
    content_type = (file.content_type or "").lower().split(";", 1)[0].strip()
    if content_type not in allowed_types and suffix not in allowed_suffixes:
        raise HTTPException(status_code=415, detail="Unsupported file type.")

    content = file.file.read(max_bytes + 1)
    if not content:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")
    if len(content) > max_bytes:
        raise HTTPException(status_code=413, detail=f"Files must be no larger than {max_bytes // (1024 * 1024)} MB.")
    return content, suffix


def _parse_photo_text(ocr_text: str, ocr_confidence: Optional[float] = None) -> ExtractedHousehold:
    result = tala_parse_photo_text(ocr_text)
    name = result["representative_name"].strip()
    if len(name) < 3 or not any(character.isalpha() for character in name):
        raise HTTPException(
            status_code=422,
            detail="Taga-alalAI could not read a person's name. Retake a clear, well-lit photo of the ID or enter the details manually.",
        )

    if ocr_confidence is not None:
        result["confidence_scores"]["ocr_text"] = round(ocr_confidence, 3)
    return ExtractedHousehold(**result)


def get_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

app = FastAPI(
    title="AlalAI Hub Laptop Backend",
    description="Offline-first Disaster Evacuation Intake & Coordination API powered by Taga-alalAI Local AI",
    version="1.0.0"
)

# Enable CORS for local hotspot Wi-Fi communication between phones and laptop
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()
    seed_database()

@app.get("/")
@app.get("/health")
@app.get("/api/status")
def health_check(session: Session = Depends(get_session)):
    count = session.exec(select(func.count(Household.id))).one()
    local_ip = get_local_ip()
    return {
        "status": "online",
        "app": "AlalAI",
        "taga_alalai": "Taga-alalAI Local AI Hub Active",
        "tala_ai": "Taga-alalAI Local AI Hub Active",
        "database": "SQLite connected",
        "registered_households": count,
        "local_ip": local_ip,
        "hotspot_url": f"http://{local_ip}:8000",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# --- 1. KWENTO (Voice Intake) ---
@app.post("/api/intake/voice", response_model=ExtractedHousehold)
def intake_voice(req: IntakeVoiceRequest):
    """
    Kwento Voice Intake:
    Processes natural spoken Tagalog/Bisaya/Taglish transcript into structured household fields.
    """
    transcript = (req.text or "").strip()
    if not transcript:
        raise HTTPException(status_code=400, detail="Voice transcript or text input is required")

    result = tala_parse_voice(transcript)
    return ExtractedHousehold(**result)

# Audio file upload endpoint for faster-whisper / audio processing
@app.post("/api/intake/voice/upload", response_model=ExtractedHousehold)
def intake_voice_upload(file: UploadFile = File(...)):
    audio_bytes, suffix = _read_upload(
        file,
        MAX_AUDIO_BYTES,
        {"audio/mp4", "audio/m4a", "audio/mpeg", "audio/wav", "audio/x-wav", "audio/webm", "audio/ogg", "audio/aac", "application/octet-stream"},
        {".m4a", ".mp4", ".mp3", ".wav", ".webm", ".ogg", ".aac", ".3gp"},
    )
    model = _get_whisper_model(os.getenv("ALALAI_WHISPER_MODEL", "base"))
    temporary_path: Optional[str] = None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix or ".m4a", delete=False) as temporary:
            temporary.write(audio_bytes)
            temporary_path = temporary.name

        with _WHISPER_LOCK:
            segments, _ = model.transcribe(temporary_path, beam_size=5, vad_filter=True)
            transcript = " ".join(segment.text.strip() for segment in segments).strip()
    except Exception as exc:
        logger.exception("Local Whisper transcription failed")
        raise HTTPException(
            status_code=422,
            detail="Taga-alalAI could not transcribe this recording. Try recording again in a quiet place or enter the details manually.",
        ) from exc
    finally:
        if temporary_path:
            Path(temporary_path).unlink(missing_ok=True)

    if not transcript:
        raise HTTPException(status_code=422, detail="No speech was recognized. Try recording again or enter the details manually.")

    result = tala_parse_voice(transcript)
    return ExtractedHousehold(**result)

# --- 2. KUHA (Photo Intake) ---
@app.post("/api/intake/photo", response_model=ExtractedHousehold)
def intake_photo(req: IntakePhotoRequest):
    """
    Kuha Photo Intake:
    Parses OCR text or ID photo content into structured household fields.
    """
    ocr_text = (req.extracted_text or "").strip()
    if not ocr_text:
        raise HTTPException(status_code=400, detail="Extracted text or document content is required")

    return _parse_photo_text(ocr_text)


@app.post("/api/intake/photo/upload", response_model=ExtractedHousehold)
def intake_photo_upload(file: UploadFile = File(...)):
    image_bytes, _ = _read_upload(
        file,
        MAX_IMAGE_BYTES,
        {"image/jpeg", "image/png", "image/webp", "application/octet-stream"},
        {".jpg", ".jpeg", ".png", ".webp"},
    )

    try:
        import numpy as np
        from PIL import Image, UnidentifiedImageError
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail="Image processing is not installed on the AlalAI hub. Install backend requirements first.",
        ) from exc

    try:
        with Image.open(BytesIO(image_bytes)) as source:
            if source.format not in {"JPEG", "PNG", "WEBP"}:
                raise HTTPException(status_code=415, detail="Upload a JPEG, PNG, or WebP ID image.")
            if source.width * source.height > MAX_IMAGE_PIXELS:
                raise HTTPException(status_code=413, detail="The image resolution is too large. Choose a smaller ID photo.")
            image = np.asarray(source.convert("RGB"))
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise HTTPException(status_code=422, detail="The uploaded file is not a readable image.") from exc

    engine = _get_ocr_engine()
    try:
        result, _ = engine(image)
    except Exception as exc:
        logger.exception("Local ID OCR failed")
        raise HTTPException(
            status_code=422,
            detail="Taga-alalAI could not read this image. Retake a clear, well-lit photo with the whole ID in frame.",
        ) from exc

    recognized_lines = [
        (entry[1].strip(), float(entry[2]))
        for entry in (result or [])
        if len(entry) >= 3 and entry[1].strip()
    ]
    ocr_text = "\n".join(text for text, _ in recognized_lines)
    if not ocr_text:
        raise HTTPException(status_code=422, detail="No readable text was found. Retake the ID photo or enter the details manually.")

    average_confidence = sum(score for _, score in recognized_lines) / len(recognized_lines)
    return _parse_photo_text(ocr_text, average_confidence)

# --- 3. KILALA (Duplicate Detection) ---
@app.post("/api/duplicates/check", response_model=List[DuplicateMatch])
def check_duplicates(
    req: DuplicateCheckRequest,
    session: Session = Depends(get_session)
):
    """
    Kilala Duplicate Check:
    Uses RapidFuzz to match candidate family with existing database records.
    Catches variations like 'Rosa Santos' vs 'Rosa D. Santos' vs 'Rosalinda Santos'.
    """
    all_households = session.exec(select(Household)).all()
    matches = tala_check_duplicates(
        candidate_name=req.representative_name,
        candidate_birthdate=req.birthdate,
        candidate_location=req.location,
        existing_households=all_households
    )
    return [DuplicateMatch(**m) for m in matches]

# --- 4. BILANG (Needs Counter) ---
@app.post("/api/needs/calculate", response_model=List[CalculatedSupply])
def calculate_needs(req: SupplyCalculationRequest):
    """
    Bilang Needs Counter:
    Calculates specific supply allocations based on household size and vulnerable members.
    """
    supplies = tala_calculate_needs(
        members_count=req.members_count,
        has_infant=req.has_infant,
        has_senior=req.has_senior,
        has_medical_needs=req.has_medical_needs
    )
    return [CalculatedSupply(**s) for s in supplies]

# --- 5. HOUSEHOLDS CRUD ---
@app.get("/api/households", response_model=List[Household])
def list_households(
    search: Optional[str] = None,
    location: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    session: Session = Depends(get_session)
):
    query = select(Household).order_by(Household.created_at.desc())
    if location:
        query = query.where(Household.location == location)
    if search:
        query = query.where(Household.representative_name.contains(search))
    return session.exec(query.offset(offset).limit(limit)).all()

@app.post("/api/households", response_model=Household)
def create_household(
    req: HouseholdCreateRequest,
    session: Session = Depends(get_session)
):
    representative_name = req.representative_name.strip()
    location = req.location.strip()
    birthdate = req.birthdate.strip()
    if len(representative_name) < 2:
        raise HTTPException(status_code=422, detail="A household representative name is required.")
    if len(location) < 2:
        raise HTTPException(status_code=422, detail="An evacuation center or location is required.")
    if birthdate:
        try:
            parsed_birthdate = date.fromisoformat(birthdate)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail="Birthdate must use YYYY-MM-DD format.") from exc
        if parsed_birthdate.isoformat() != birthdate:
            raise HTTPException(status_code=422, detail="Birthdate must use YYYY-MM-DD format.")
        if parsed_birthdate > date.today():
            raise HTTPException(status_code=422, detail="Birthdate cannot be in the future.")

    # Generate unique ID and Kard AlalAI QR Code
    count = session.exec(select(func.count(Household.id))).one()
    fam_id = f"FAM-{count + 1:04d}"
    qr_code = f"ALALAI-{fam_id}-{random.randint(1000, 9999)}"

    now = datetime.now(timezone.utc)
    household = Household(
        id=fam_id,
        qr_code=qr_code,
        representative_name=representative_name,
        birthdate=birthdate,
        members_count=req.members_count,
        location=location,
        has_infant=req.has_infant,
        has_senior=req.has_senior,
        has_medical_needs=req.has_medical_needs,
        medical_notes=req.medical_notes,
        status="registered",
        created_offline=req.created_offline,
        sync_status="synced",
        created_at=now,
        updated_at=now
    )
    session.add(household)
    session.commit()
    session.refresh(household)
    return household

@app.get("/api/households/{household_id}", response_model=Household)
def get_household(household_id: str, session: Session = Depends(get_session)):
    household = session.get(Household, household_id)
    if not household:
        # Check by QR
        statement = select(Household).where(Household.qr_code == household_id)
        household = session.exec(statement).first()
    if not household:
        raise HTTPException(status_code=404, detail="Household not found")
    return household

@app.post("/api/households/{household_id}/merge")
def merge_household(
    household_id: str,
    target_id: str,
    session: Session = Depends(get_session)
):
    source = session.get(Household, household_id)
    target = session.get(Household, target_id)
    if not source or not target:
        raise HTTPException(status_code=404, detail="One or both households not found")

    source.status = "merged"
    source.merged_into_id = target.id
    source.updated_at = datetime.now(timezone.utc)
    session.add(source)
    session.commit()
    return {"status": "success", "message": f"Merged {source.id} into {target.id}"}

# --- 6. DASHBOARD & STATS ---
@app.get("/api/dashboard/stats", response_model=DashboardStats)
def get_dashboard_stats(session: Session = Depends(get_session)):
    total_families = session.exec(select(func.count(Household.id))).one()
    total_individuals = session.exec(select(func.sum(Household.members_count))).one() or 0
    pending_reviews = session.exec(select(func.count(Household.id)).where(Household.status == "flagged_duplicate")).one()

    # Calculate low stock count
    inventory = session.exec(select(SupplyItem)).all()
    alerts = tala_predict_alerts(inventory, total_individuals)
    low_stock_items = len(alerts)

    # Active evacuation centers
    centers = len(set(h.location for h in session.exec(select(Household.location)).all()))

    recent = session.exec(select(Household).order_by(Household.created_at.desc()).limit(5)).all()

    return DashboardStats(
        total_families=total_families,
        total_individuals=int(total_individuals),
        pending_reviews=pending_reviews,
        low_stock_items=low_stock_items,
        active_evacuation_centers=max(1, centers),
        recent_registrations=recent
    )

# --- 7. ABISO (Alerts & Inventory) ---
@app.get("/api/inventory", response_model=List[SupplyItem])
def get_inventory(session: Session = Depends(get_session)):
    return session.exec(select(SupplyItem)).all()

@app.get("/api/alerts")
def get_supply_alerts(session: Session = Depends(get_session)):
    total_people = session.exec(select(func.sum(Household.members_count))).one() or 463
    inventory = session.exec(select(SupplyItem)).all()
    alerts = tala_predict_alerts(inventory, int(total_people))
    return alerts

@app.post("/api/alerts/{item_id}/request")
def request_resupply(item_id: str, session: Session = Depends(get_session)):
    item = session.get(SupplyItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return {
        "status": "approved",
        "message": f"Resupply request for {item.name} officially approved and queued for MDRRMO SMS transmission."
    }

# --- 8. TEXT ULAT (SMS Report) ---
@app.get("/api/reports/sms")
def get_sms_report(
    camp: Optional[str] = "Evacuation Center A",
    session: Session = Depends(get_session)
):
    total_families = session.exec(select(func.count(Household.id))).one()
    total_individuals = session.exec(select(func.sum(Household.members_count))).one() or 0
    pending_reviews = session.exec(select(func.count(Household.id)).where(Household.status == "flagged_duplicate")).one()

    inventory = session.exec(select(SupplyItem)).all()
    alerts = tala_predict_alerts(inventory, int(total_individuals))
    low_items = [a["name"] for a in alerts]

    sms_text = tala_generate_sms_ulat(
        camp_name=camp,
        families=total_families,
        people=int(total_individuals),
        low_stock_items=low_items,
        pending_reviews=pending_reviews
    )

    return {
        "sms_body": sms_text,
        "char_count": len(sms_text),
        "recipient": "MDRRMO Command Center",
        "is_under_160_chars": len(sms_text) <= 160
    }

# --- 9. PRINTABLE PDF REPORT ---
@app.get("/api/reports/pdf")
def download_pdf_report(
    camp: Optional[str] = "Evacuation Center A",
    session: Session = Depends(get_session)
):
    stats = get_dashboard_stats(session).model_dump()
    households = session.exec(select(Household).order_by(Household.created_at.desc()).limit(30)).all()
    inventory = session.exec(select(SupplyItem)).all()
    alerts = tala_predict_alerts(inventory, stats["total_individuals"])

    pdf_bytes = generate_evacuation_pdf(camp, stats, households, alerts)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=AlalAI_Evacuation_Report.pdf"}
    )

# --- 10. KARD ALALAI (QR Code Relief Line Scan) ---
@app.post("/api/relief/scan", response_model=ReliefScanResponse)
def scan_relief_card(
    req: ReliefScanRequest,
    session: Session = Depends(get_session)
):
    """
    Kard AlalAI QR Code Distribution Line:
    Scans family QR code. Enforces double-claim prevention!
    """
    # Find household by QR or ID
    statement = select(Household).where(
        (Household.qr_code == req.qr_code) | (Household.id == req.qr_code)
    )
    household = session.exec(statement).first()
    if not household:
        return ReliefScanResponse(
            success=False,
            message=f"Invalid Kard AlalAI QR code: '{req.qr_code}'. No matching household record.",
            already_claimed=False
        )

    # Check previous distribution within 12 hours
    cutoff = datetime.now(timezone.utc) - timedelta(hours=12)
    last_dist = session.exec(
        select(DistributionRecord).where(
            (DistributionRecord.household_id == household.id) &
            (DistributionRecord.item_name == req.item_name) &
            (DistributionRecord.timestamp >= cutoff)
        )
    ).first()

    if last_dist:
        time_str = last_dist.timestamp.strftime("%I:%M %p")
        return ReliefScanResponse(
            success=False,
            message=f"WARNING: Double-claim detected! {household.representative_name} already claimed {req.item_name} at {time_str} today.",
            household=household,
            already_claimed=True,
            last_claimed_at=time_str
        )

    # Record distribution
    new_dist = DistributionRecord(
        id=f"DIST-{random.randint(10000, 99999)}",
        household_id=household.id,
        family_name=household.representative_name,
        item_name=req.item_name,
        quantity=req.quantity or 1.0,
        unit="pack",
        timestamp=datetime.now(timezone.utc),
        distributed_by="Relief Desk Volunteer"
    )
    session.add(new_dist)

    # Update household status to verified
    household.status = "verified"
    household.updated_at = datetime.now(timezone.utc)
    session.add(household)
    session.commit()

    return ReliefScanResponse(
        success=True,
        message=f"Kard AlalAI Verified! Relief pack successfully issued to {household.representative_name} ({household.members_count} members).",
        household=household,
        already_claimed=False
    )

# --- 11. PASA (Sync Endpoint) ---
@app.post("/api/sync")
def sync_offline_records(
    payload: SyncPayload,
    session: Session = Depends(get_session)
):
    """
    Pasa (Sync):
    Receives offline-saved records from volunteer phones and updates laptop hub.
    """
    inserted_households = 0
    now = datetime.now(timezone.utc)

    for h in payload.households:
        existing = session.get(Household, h.id)
        if not existing:
            h.sync_status = "synced"
            h.created_at = now
            h.updated_at = now
            session.add(h)
            inserted_households += 1

    for d in payload.distributions:
        existing_d = session.get(DistributionRecord, d.id)
        if not existing_d:
            session.add(d)

    session.commit()

    stats = get_dashboard_stats(session)
    return {
        "status": "success",
        "synced_households": inserted_households,
        "current_total_households": stats.total_families,
        "current_total_individuals": stats.total_individuals,
        "message": f"Successfully synchronized {inserted_households} new offline households to hub laptop database."
    }
