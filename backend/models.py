from datetime import datetime, timezone
from typing import Optional, List
from sqlmodel import SQLModel, Field

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

# SQLModel database tables

class Household(SQLModel, table=True):
    id: str = Field(primary_key=True)
    qr_code: str = Field(index=True)
    representative_name: str = Field(index=True)
    birthdate: str
    members_count: int
    location: str
    has_infant: bool = False
    has_senior: bool = False
    has_medical_needs: bool = False
    medical_notes: Optional[str] = None
    status: str = Field(default="registered")  # registered, verified, flagged_duplicate, merged
    merged_into_id: Optional[str] = None
    created_offline: bool = False
    sync_status: str = Field(default="synced")  # synced, pending
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

class SupplyItem(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str = Field(index=True)
    category: str  # food, water, medical, hygiene, infant
    quantity: float
    unit: str  # kg, L, packs, kits, coolers
    min_threshold: float
    burn_rate_per_day: float
    updated_at: datetime = Field(default_factory=utc_now)

class DistributionRecord(SQLModel, table=True):
    id: str = Field(primary_key=True)
    household_id: str = Field(index=True)
    family_name: str
    item_name: str
    quantity: float
    unit: str
    timestamp: datetime = Field(default_factory=utc_now)
    distributed_by: str = Field(default="Relief Volunteer")
    notes: Optional[str] = None

class ResupplyAlert(SQLModel, table=True):
    id: str = Field(primary_key=True)
    item_name: str = Field(index=True)
    current_stock: float
    unit: str
    runout_hours: float
    status: str = Field(default="urgent")  # urgent, warning, normal, requested
    draft_request: str
    requested_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=utc_now)

# Pydantic schemas for API requests & responses

class IntakeVoiceRequest(SQLModel):
    audio_base64: Optional[str] = None
    text: Optional[str] = None
    language: Optional[str] = "tagalog"

class IntakePhotoRequest(SQLModel):
    image_base64: Optional[str] = None
    extracted_text: Optional[str] = None

class ExtractedHousehold(SQLModel):
    representative_name: str
    birthdate: str
    members_count: int
    location: str
    has_infant: bool = False
    has_senior: bool = False
    has_medical_needs: bool = False
    medical_notes: Optional[str] = None
    confidence_scores: dict[str, float] = {}
    raw_transcript: Optional[str] = None

class DuplicateCheckRequest(SQLModel):
    representative_name: str
    birthdate: Optional[str] = None
    location: Optional[str] = None
    members_count: Optional[int] = None

class DuplicateMatch(SQLModel):
    id: str
    representative_name: str
    birthdate: str
    location: str
    members_count: int
    match_score: float  # 0 to 100
    match_reasons: List[str]
    is_strong_match: bool

class SupplyCalculationRequest(SQLModel):
    members_count: int
    has_infant: bool = False
    has_senior: bool = False
    has_medical_needs: bool = False

class CalculatedSupply(SQLModel):
    name: str
    amount: str
    description: str
    category: str

class HouseholdCreateRequest(SQLModel):
    representative_name: str
    birthdate: str
    members_count: int
    location: str
    has_infant: bool = False
    has_senior: bool = False
    has_medical_needs: bool = False
    medical_notes: Optional[str] = None
    created_offline: bool = False

class ReliefScanRequest(SQLModel):
    qr_code: str
    item_name: Optional[str] = "Family Relief Pack"
    quantity: Optional[float] = 1.0

class ReliefScanResponse(SQLModel):
    success: bool
    message: str
    household: Optional[Household] = None
    already_claimed: bool = False
    last_claimed_at: Optional[str] = None

class SyncPayload(SQLModel):
    device_id: Optional[str] = "volunteer-phone"
    households: List[Household] = []
    distributions: List[DistributionRecord] = []

class DashboardStats(SQLModel):
    total_families: int
    total_individuals: int
    pending_reviews: int
    low_stock_items: int
    active_evacuation_centers: int
    recent_registrations: List[Household]
