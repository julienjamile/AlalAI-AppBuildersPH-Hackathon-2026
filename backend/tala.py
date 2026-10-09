import re
import json
import logging
from datetime import datetime, date
from typing import List, Optional, Tuple, Dict, Any
from rapidfuzz import fuzz

logger = logging.getLogger("taga-alalai")

# Filipino/Taglish number word mapping
NUMBER_WORDS = {
    "isa": 1, "isang": 1,
    "dalawa": 2, "dalawang": 2,
    "tatlo": 3, "tatlong": 3,
    "apat": 4, "apat na": 4,
    "lima": 5, "limang": 5,
    "anim": 6, "anim na": 6,
    "pito": 7, "pitong": 7,
    "walo": 8, "walong": 8,
    "siyam": 9, "siyam na": 9,
    "sampu": 10, "sampung": 10
}

def tala_parse_voice(transcript: str) -> Dict[str, Any]:
    """
    Taga-alalAI Brain: Understands Tagalog/Bisaya/Taglish voice transcript
    and extracts structured household information purely from user input.
    """
    clean_text = transcript.strip()
    if not clean_text:
        return {
            "representative_name": "",
            "birthdate": "",
            "members_count": 1,
            "location": "Evacuation Center",
            "has_infant": False,
            "has_senior": False,
            "has_medical_needs": False,
            "medical_notes": None,
            "confidence_scores": {},
            "raw_transcript": ""
        }
    
    # Try Ollama if service is reachable
    try:
        import ollama
        prompt = f"""
        Ikaw si Taga-alalAI, isang emergency evacuation intake assistant para sa Pilipinas.
        Suriin ang sumusunod na pag-uusap/transcript ng isang pamilya at ibalik lamang ang JSON:
        Transcript: "{clean_text}"

        Format ng JSON:
        {{
            "representative_name": "Pangalan ng kinatawan o blangko",
            "birthdate": "YYYY-MM-DD o tantiyang petsa",
            "members_count": bilang ng miyembro (integer),
            "location": "Pangalan ng evacuation center",
            "has_infant": true/false,
            "has_senior": true/false,
            "has_medical_needs": true/false,
            "medical_notes": "mga kailangang gamot o sakit"
        }}
        Sagutin LAMANG gamit ang wastong JSON.
        """
        response = ollama.chat(
            model="qwen2.5:3b",
            messages=[{"role": "user", "content": prompt}],
            options={"temperature": 0.1}
        )
        content = response["message"]["content"]
        json_match = re.search(r"\{.*\}", content, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group(0))
            data["confidence_scores"] = {
                "representative_name": 0.95,
                "birthdate": 0.85,
                "members_count": 0.90,
                "location": 0.80,
                "special_needs": 0.95
            }
            data["raw_transcript"] = clean_text
            return data
    except Exception as e:
        logger.debug(f"Ollama unavailable, running local NLP heuristic parser: {e}")

    # Pure extraction from user text (no hardcoded fallback names)
    name = ""
    age: Optional[int] = None
    
    # Check leading pattern: "[First Last], [Age]" or "[First Last] [Age]"
    leading_match = re.match(r"^([A-Za-z\s]+?)[,\s]+(\d{1,2})\b", clean_text)
    if leading_match:
        cand_name = leading_match.group(1).strip()
        if len(cand_name) > 3 and not any(kw in cand_name.lower() for kw in ["kasama", "anak", "nanay", "tatay", "kami"]):
            name = cand_name.title()
            try:
                age = int(leading_match.group(2))
            except ValueError:
                age = None
    else:
        # Check "ako si [Name]" or "pangalan ko ay [Name]"
        intro_match = re.search(r"(?:ako si|pangalan ko(?: ay)?)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)", clean_text, re.IGNORECASE)
        if intro_match:
            cand = intro_match.group(1).strip()
            if cand.lower() not in ["nanay", "tatay", "lolo", "lola"]:
                name = cand.title()

    # Birthdate: explicit in text or calculated from detected age
    birthdate = ""
    bday_match = re.search(r"(\d{4}[-/]\d{1,2}[-/]\d{1,2})|(\d{1,2}[-/]\d{1,2}[-/]\d{4})", clean_text)
    if bday_match:
        birthdate = bday_match.group(0).replace("/", "-")
    elif age is not None:
        current_year = datetime.now().year
        birthdate = f"{current_year - age}-01-01"

    # Household members count derived purely from user's text
    children_count = 0
    for word, num in NUMBER_WORDS.items():
        if re.search(
            rf"\b{word}\s+(?:na\s+)?(?:anak|bata|miyembro|tao|kasama)\b",
            clean_text,
            re.IGNORECASE,
        ):
            children_count = num
            break
    
    if children_count == 0:
        digits_children = re.search(
            r"(\d+)\s*(?:na\s+)?(?:anak|bata|miyembro|tao)\b",
            clean_text,
            re.IGNORECASE,
        )
        if digits_children:
            children_count = int(digits_children.group(1))

    # Relatives mentioned
    relatives_found = re.findall(r"\b(nanay|inay|tatay|itay|lolo|lola|asawa|biyanan)\b", clean_text, re.IGNORECASE)
    relative_count = len(relatives_found)

    if children_count > 0 or relative_count > 0:
        members = 1 + children_count + relative_count
    else:
        kami_match = re.search(r"\b(isa|dalawa|tatlo|apat|lima|anim|pito|walo|siyam|sampu|\d+)\s+kami\b", clean_text, re.IGNORECASE)
        if kami_match:
            val = kami_match.group(1).lower()
            members = NUMBER_WORDS.get(val, int(val) if val.isdigit() else 1)
        else:
            members = 1

    # Special Needs Detection from user text
    has_infant = bool(re.search(r"\b(bunso|baby|sanggol|infant|months? old|buwan|bata)\b", clean_text, re.IGNORECASE))
    has_senior = bool(re.search(r"\b(nanay|tatay|lolo|lola|senior|elderly|matanda|6\d|7\d|8\d)\b", clean_text, re.IGNORECASE))
    
    medical_matches = []
    if re.search(r"\b(diabetic|diabetes)\b", clean_text, re.IGNORECASE):
        medical_matches.append("Diabetic")
    if re.search(r"\b(insulin|nag-iinsulin|iniksyon)\b", clean_text, re.IGNORECASE):
        medical_matches.append("Insulin-dependent")
    if re.search(r"\b(hypertension|high blood|maintenance)\b", clean_text, re.IGNORECASE):
        medical_matches.append("Hypertension/Maintenance")
    if re.search(r"\b(buntis|pregnant)\b", clean_text, re.IGNORECASE):
        medical_matches.append("Pregnant / Buntis")
    if re.search(r"\b(pwd|kapansanan|wheelchair)\b", clean_text, re.IGNORECASE):
        medical_matches.append("PWD (Person with Disability)")

    has_medical_needs = len(medical_matches) > 0
    medical_notes = ", ".join(medical_matches) if medical_matches else None

    # Location detection from user text
    location = "Evacuation Center"
    loc_match = re.search(r"\b(?:evacuation center|covered court|gymnasium|gym|school)\s+([A-Za-z0-9\s]+)", clean_text, re.IGNORECASE)
    if loc_match:
        found_loc = loc_match.group(0).strip()
        if len(found_loc) < 30:
            location = found_loc.title()

    return {
        "representative_name": name,
        "birthdate": birthdate,
        "members_count": max(1, members),
        "location": location,
        "has_infant": has_infant,
        "has_senior": has_senior,
        "has_medical_needs": has_medical_needs,
        "medical_notes": medical_notes,
        "confidence_scores": {
            "representative_name": 0.95 if name else 0.50,
            "birthdate": 0.88 if birthdate else 0.50,
            "members_count": 0.92,
            "location": 0.85,
            "special_needs": 0.98 if (has_infant or has_senior or has_medical_needs) else 0.70
        },
        "raw_transcript": clean_text
    }


def tala_parse_photo_text(ocr_text: str) -> Dict[str, Any]:
    """
    Taga-alalAI Eyes: Parses text recognized from IDs or documents purely from user input.
    """
    clean_text = ocr_text.strip()
    if not clean_text:
        return {
            "representative_name": "",
            "birthdate": "",
            "members_count": 1,
            "location": "Evacuation Center",
            "has_infant": False,
            "has_senior": False,
            "has_medical_needs": False,
            "medical_notes": None,
            "confidence_scores": {},
            "raw_transcript": ""
        }

    name = ""
    lines = [re.sub(r"\s+", " ", line).strip(" :\t") for line in clean_text.splitlines()]
    line_text = "\n".join(lines)

    surname_match = re.search(r"^(?:SURNAME|LAST NAME|APELYIDO)\s*[:\-]\s*([^\n]+)", line_text, re.IGNORECASE | re.MULTILINE)
    given_match = re.search(r"^(?:GIVEN NAME|FIRST NAME|PANGALAN)\s*[:\-]\s*([^\n]+)", line_text, re.IGNORECASE | re.MULTILINE)
    middle_match = re.search(r"^MIDDLE NAME\s*[:\-]\s*([^\n]+)", line_text, re.IGNORECASE | re.MULTILINE)
    if surname_match and given_match:
        name_parts = [given_match.group(1), middle_match.group(1) if middle_match else "", surname_match.group(1)]
        name = " ".join(part.strip(" ,.-") for part in name_parts if part.strip(" ,.-")).title()
    if not name:
        name_match = re.search(
            r"^(?:NAME(?: OF (?:CARDHOLDER|HOLDER|PERSON|REPRESENTATIVE))?|PANGALAN|G\.|GNG\.)\s*[:\-]\s*([^\n]+)",
            line_text,
            re.IGNORECASE | re.MULTILINE,
        )
        if name_match:
            name_value = re.split(
                r"\s+(?:DOB|DATE OF BIRTH|BIRTHDATE|ADDRESS|SEX|GENDER)\s*[:\-]",
                name_match.group(1),
                maxsplit=1,
                flags=re.IGNORECASE,
            )[0]
            name = name_value.strip(" ,.-").title()
    if not name:
        excluded_lines = (
            "REPUBLIC", "PHILIPPINE", "IDENTIFICATION", "PHILSYS", "CARD",
            "NATIONAL ID", "DATE OF BIRTH", "ADDRESS", "NATIONALITY",
            "CITIZEN", "PAMBANSANG PAGKAKAKILANLAN",
        )
        for line in lines:
            clean_line = re.sub(r"[^a-zA-ZñÑ\s.'-]", "", line).strip(" .'-")
            if len(clean_line) > 5 and not any(keyword in line.upper() for keyword in excluded_lines):
                name = clean_line.title()
                break
    if name.casefold() in {"id", "id card", "national id", "no name", "unknown"}:
        name = ""

    labeled_date = re.search(
        r"(?:DATE OF BIRTH|BIRTHDATE|DOB)\s*[:\-]?\s*((?:19|20)\d{2}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{4})",
        clean_text,
        re.IGNORECASE,
    )
    bday_match = labeled_date or re.search(
        r"\b((?:19|20)\d{2}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{4})\b",
        clean_text,
    )
    birthdate = ""
    if bday_match:
        raw_date = bday_match.group(1)
        year_first = re.fullmatch(r"((?:19|20)\d{2})[-/](\d{1,2})[-/](\d{1,2})", raw_date)
        month_first = re.fullmatch(r"(\d{1,2})[-/](\d{1,2})[-/](\d{4})", raw_date)
        try:
            if year_first:
                birthdate = date(
                    int(year_first.group(1)),
                    int(year_first.group(2)),
                    int(year_first.group(3)),
                ).isoformat()
            elif month_first:
                birthdate = date(
                    int(month_first.group(3)),
                    int(month_first.group(1)),
                    int(month_first.group(2)),
                ).isoformat()
        except ValueError:
            birthdate = ""

    return {
        "representative_name": name,
        "birthdate": birthdate,
        "members_count": 1,
        "location": "",
        "has_infant": False,
        "has_senior": False,
        "has_medical_needs": False,
        "medical_notes": None,
        "confidence_scores": {
            "representative_name": 0.85 if name else 0.0,
            "birthdate": 0.85 if birthdate else 0.0,
            "members_count": 0.50,
            "location": 0.0
        },
        "raw_transcript": clean_text
    }


def tala_check_duplicates(
    candidate_name: str,
    candidate_birthdate: Optional[str],
    candidate_location: Optional[str],
    existing_households: List[Any]
) -> List[Dict[str, Any]]:
    """
    Kilala (Duplicate Check):
    Compares candidate family representative name and details with all
    existing database households using RapidFuzz.
    """
    if not candidate_name or len(candidate_name.strip()) < 2:
        return []

    matches = []
    c_name_clean = re.sub(r"[^a-zA-Z\s]", "", candidate_name).lower().strip()

    for item in existing_households:
        rep_name = item.representative_name
        rep_clean = re.sub(r"[^a-zA-Z\s]", "", rep_name).lower().strip()
        if not rep_clean:
            continue

        ratio = fuzz.ratio(c_name_clean, rep_clean)
        token_sort = fuzz.token_sort_ratio(c_name_clean, rep_clean)
        token_set = fuzz.token_set_ratio(c_name_clean, rep_clean)

        combined_score = (ratio * 0.3) + (token_sort * 0.35) + (token_set * 0.35)

        reasons = []
        if combined_score >= 65:
            reasons.append(f"Similar full name ({round(combined_score)}% match: '{rep_name}')")

            if candidate_birthdate and item.birthdate:
                if candidate_birthdate == item.birthdate:
                    combined_score = min(100.0, combined_score + 15)
                    reasons.append("Exact birthdate match")
                elif len(candidate_birthdate) >= 4 and len(item.birthdate) >= 4 and candidate_birthdate[:4] == item.birthdate[:4]:
                    combined_score = min(100.0, combined_score + 5)
                    reasons.append("Same birth year")

            if candidate_location and item.location:
                if candidate_location.lower() != item.location.lower():
                    reasons.append(f"Registered at different location: {item.location}")
                else:
                    reasons.append(f"Registered at same center: {item.location}")

            matches.append({
                "id": item.id,
                "representative_name": rep_name,
                "birthdate": item.birthdate,
                "location": item.location,
                "members_count": item.members_count,
                "match_score": round(combined_score, 1),
                "match_reasons": reasons,
                "is_strong_match": combined_score >= 80
            })

    matches.sort(key=lambda x: x["match_score"], reverse=True)
    return matches[:5]


def tala_calculate_needs(
    members_count: int,
    has_infant: bool = False,
    has_senior: bool = False,
    has_medical_needs: bool = False
) -> List[Dict[str, str]]:
    """
    Bilang (Needs Counter):
    Turns family size and vulnerable members into exact supply needs allocations.
    """
    count = max(1, members_count)
    supplies = []

    # 1. Rice: 0.5 kg per person
    rice_kg = round(count * 0.5, 1)
    supplies.append({
        "name": "Rice",
        "amount": f"{rice_kg} kg",
        "description": f"Standard household allocation ({count} members)",
        "category": "food"
    })

    # 2. Drinking Water: 2 Liters per person per day
    water_l = count * 2
    supplies.append({
        "name": "Drinking water",
        "amount": f"{water_l} L",
        "description": "Daily potable water requirement",
        "category": "water"
    })

    # 3. Hygiene Kit
    hygiene_kits = 2 if count > 6 else 1
    supplies.append({
        "name": "Family hygiene kit",
        "amount": f"{hygiene_kits} kit" if hygiene_kits == 1 else f"{hygiene_kits} kits",
        "description": "Soap, toothbrushes, toothpaste, sanitation packs",
        "category": "hygiene"
    })

    # 4. Ready-to-eat food packs
    canned_packs = count * 3
    supplies.append({
        "name": "Canned & dry goods pack",
        "amount": f"{canned_packs} tins/pouches",
        "description": "Canned protein and ready-to-eat disaster rations",
        "category": "food"
    })

    # Vulnerability-driven supplies
    if has_infant:
        supplies.append({
            "name": "Infant diapers",
            "amount": "1 pack (8-12 pcs)",
            "description": "Special baby care supplies for infant under 2 yrs",
            "category": "infant"
        })
        supplies.append({
            "name": "Baby formula / feeding kit",
            "amount": "1 box / sterile kit",
            "description": "Infant feeding and hydration kit",
            "category": "infant"
        })

    if has_senior:
        supplies.append({
            "name": "Senior care pack",
            "amount": "1 care pack",
            "description": "Adult hygiene, vitamins, and high-protein nutrition",
            "category": "medical"
        })

    if has_medical_needs:
        supplies.append({
            "name": "Insulin cold storage cooler",
            "amount": "1 insulated pouch",
            "description": "Cold-chain preservation for temperature-sensitive medicine",
            "category": "medical"
        })
        supplies.append({
            "name": "First-aid & chronic meds pack",
            "amount": "1 kit",
            "description": "Emergency maintenance medications & bandages",
            "category": "medical"
        })

    return supplies


def tala_predict_alerts(inventory_items: List[Any], total_people: int) -> List[Dict[str, Any]]:
    """
    Abiso (Alerts & Predictor):
    Evaluates remaining stock against burn rate to predict exhaustion time.
    Generates formal Taga-alalAI resupply request draft.
    """
    alerts = []
    people = max(1, total_people)

    for item in inventory_items:
        daily_burn = item.burn_rate_per_day
        if daily_burn <= 0:
            daily_burn = 1.0

        hourly_burn = daily_burn / 24.0
        current_qty = item.quantity
        hours_left = current_qty / hourly_burn if hourly_burn > 0 else 999.0

        is_low = current_qty <= item.min_threshold or hours_left <= 24.0

        if is_low:
            urgency = "urgent" if hours_left < 12 else "warning"
            draft_msg = (
                f"RESUPPLY REQUEST [{item.name.upper()}]: "
                f"Current stock is down to {current_qty} {item.unit}. "
                f"With {people} individuals sheltered, stock will deplete in approximately "
                f"{round(hours_left, 1)} hours. Requesting immediate delivery of "
                f"{int(item.min_threshold * 2)} {item.unit} to Evacuation Center."
            )
            alerts.append({
                "id": f"alert-{item.name.lower().replace(' ', '-')}",
                "name": item.name,
                "status": "Low stock" if urgency == "urgent" else "Needs review",
                "quantity": f"{current_qty} {item.unit} remaining",
                "current_stock": current_qty,
                "unit": item.unit,
                "runout_hours": round(hours_left, 1),
                "urgency": urgency,
                "draft_request": draft_msg
            })

    return alerts


def tala_generate_sms_ulat(
    camp_name: str,
    families: int,
    people: int,
    low_stock_items: List[str],
    pending_reviews: int
) -> str:
    """
    Text Ulat:
    Packs the entire evacuation center's status into a strict 160-character SMS
    so it transmits reliably via 2G/GSM without mobile internet.
    """
    low_str = ",".join(low_stock_items[:3]) if low_stock_items else "None"
    msg = f"ALALAI:[{camp_name}] {families}fam,{people}ind. Low:{low_str}. {pending_reviews}rev. Resupply req sent. MDRRMO copy."
    if len(msg) > 160:
        msg = f"ALALAI:[{camp_name[:8]}] {families}f,{people}p. Low:{low_str[:20]}. {pending_reviews}rev. Need supply. MDRRMO."
    return msg[:160]
