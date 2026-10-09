# AlalAI — Kalinga Kahit Walang Signal

> **Disaster Evacuation Registration, Supply Intelligence & Offline Coordination**  
> Built for the AppBuildersPH Hackathon 2026

---

## 🌟 Overview

When typhoons and natural disasters hit the Philippines, power grids and cellular networks often fail. Evacuation centers resort to chaotic paper registrations, leading to duplicate counting, missed vulnerable individuals (infants, seniors, insulin-dependent patients), and delayed municipal relief reports.

**AlalAI** is an offline-first disaster response system powered by **Taga-alalAI**:
- **Volunteer Mobile App (TypeScript / Expo)**: Runs on Android & iOS devices inside evacuation centers. Works with zero internet.
- **AlalAI Hub (Python FastAPI + SQLite)**: The shared source of truth for phones and the camp dashboard over local Wi-Fi; the hub does not need internet during registration.
- **Taga-alalAI**: Runs Whisper speech transcription and ID-image OCR on the hub, structures intake details, checks duplicates, calculates needs, and drafts supply alerts and SMS reports.

---

## 🚀 Core Features

| Feature | Description | Engine / Tech |
| :--- | :--- | :--- |
| **🎙️ Kwento (Voice Intake)** | Records an interview in Tagalog, Bisaya, or Taglish, transcribes it on the connected hub, and proposes editable household fields. | Local Faster-Whisper / Taga-alalAI |
| **📷 Kuha (Photo Intake)** | Takes an ID photo or chooses one from the device library, reads text on the hub, and proposes editable representative fields. | Local RapidOCR / Taga-alalAI |
| **🔎 Kilala (Duplicate Check)** | Compares applicants across all evacuation centers to catch duplicate registrations (e.g., *"Rosa Santos"* vs *"Rosa D. Santos"*). | RapidFuzz similarity matching |
| **🧮 Bilang (Needs Counter)** | Converts household size and vulnerable demographics into exact relief allocations (Rice, Water, Diapers, Formula, Insulin cooler). | Deterministic Bilang rules |
| **🚨 Abiso (Supply Alerts)** | Tracks inventory burn rates against sheltered population. Predicts stock-out hours and drafts official resupply letters. | Abiso Burn Rate Predictor |
| **📩 Text Ulat (SMS Report)** | Condenses the whole evacuation center's status into a strict **160-character SMS** for 2G cellular transmission to MDRRMO. | Taga-alalAI Summarizer + `expo-sms` |
| **🪪 Kard AlalAI (QR Card)** | Generates unique scannable QR relief credentials for each family. Distribution line scanner catches double-claims instantly. | `react-native-qrcode-svg` |
| **🔄 Pasa (Local Sync)** | Batches offline registrations and synchronizes with hub laptop over local Wi-Fi without internet. | REST API / SQLite Sync |
| **📊 Camp Dashboard** | Web operations portal for camp managers to review inventory, approve resupply requests, and export official PDF reports. | Streamlit & ReportLab |

---

## 🛠️ Project Structure

```
AlalAI/
├── backend/
│   ├── main.py              # FastAPI server with all endpoints (REST & CORS)
│   ├── models.py            # SQLModel database schemas & Pydantic contracts
│   ├── database.py          # SQLite engine & session management
│   ├── tala.py              # Taga-alalAI: Voice, Photo, Kilala, Bilang, Abiso, Text Ulat
│   ├── seed.py              # Synthetic evacuation dataset (128 families, initial stock)
│   ├── reports.py           # ReportLab printable PDF evacuation summary generator
│   ├── streamlit_app.py     # Camp Manager operations dashboard (Streamlit)
│   └── alalai.db            # SQLite database file
├── src/
│   ├── app/
│   │   ├── _layout.tsx      # Expo Router root layout
│   │   └── index.tsx        # Main navigation container & registration state
│   ├── screen/
│   │   ├── DashboardScreen.tsx    # Relief center overview & Kard AlalAI line scanner
│   │   ├── RegistrationScreen.tsx # Kwento, Kuha, Confirm, Kilala, Kard AlalAI QR
│   │   ├── NeedsScreen.tsx        # Bilang needs counter & supply allocation
│   │   └── ReportsScreen.tsx      # Abiso alerts, Text Ulat SMS & Pasa sync
│   ├── services/
│   │   └── api.ts           # Frontend API client with offline resilience
│   ├── components/          # Reusable UI components (AppHeader, ActionButton, Field, etc.)
│   ├── constants/           # Theme colors and registration step tokens
│   └── types/               # TypeScript domain models
├── main.py                  # Root uvicorn entry point
├── package.json             # Mobile app dependencies & Expo configuration
└── README.md
```

---

## 🏁 Quickstart Guide

### 1. Hub Laptop (Backend)

Ensure Python 3.11+ is installed.

```bash
# 1. Install dependencies
python -m pip install -r requirements.txt

# 2. (Optional) Seed the demo database
python -m backend.seed

# 3. Start the FastAPI server
uvicorn main:app --host 0.0.0.0 --port 8000

# 4. (Optional) Launch the Camp Manager Streamlit Dashboard
streamlit run backend/streamlit_app.py
```

- **Interactive API Documentation**: Visit `http://localhost:8000/docs`
- **Health Check**: `http://localhost:8000/health`
- The first voice transcription downloads the configured Faster-Whisper model (`base` by default). Warm it once while the hub has internet before operating offline; later transcription is local.
- Speech and ID images are processed by the connected hub and are not sent to a hosted AI service. Keep the hub on the same local Wi-Fi as the phones.

To download and warm the default speech model before going offline:

```bash
python -c "from faster_whisper import WhisperModel; WhisperModel('base', device='cpu', compute_type='int8')"
```

### 2. Volunteer Phone App (Frontend)

Ensure Node.js 18+ is installed.

```bash
# 1. Install dependencies
npm install

# 2. Start Expo development server
npx expo start
```

- **Web Preview**: Press `w` in the terminal to view in your web browser.
- **Physical Phone**: Scan the QR code using the **Expo Go** app on your Android or iOS phone connected to the same Wi-Fi/Hotspot as your laptop. Microphone and camera permission prompts are shown when those features are first used.
- The Expo Go app includes these Expo modules. A standalone native build must be rebuilt after adding or changing microphone/camera permissions.

---

## 📡 Hotspot Connection (Zero-Internet Mode)

1. Turn on the Wi-Fi hotspot from a phone (with **Mobile Data turned OFF**).
2. Connect both the Hub laptop and the volunteer phones to this hotspot.
3. Check the laptop's local IP address (e.g. `192.168.43.10`).
4. Tap the **OFFLINE / HUB CONNECTED** pill in the mobile app header and input `http://<laptop-ip>:8000`.
5. Tap **Test Connection** — the app is now fully linked to the laptop hub with zero internet!
- The hub's SQLite database is the shared record store. Voice/photo intake proposes details for a volunteer to review; an ID scan only identifies the representative and does not infer the rest of the household or verify identity. Confirm household size, location, and vulnerability details before saving.

---

## 🧪 Verification & Quality Checks

The codebase passes all Expo and TypeScript validation checks:

```bash
npx tsc --noEmit        # TypeScript compilation: 0 errors
npx eslint .            # ESLint code quality: 0 warnings, 0 errors
npx expo-doctor         # Expo environment: 21/21 checks passed
```

---

## ⚖️ License & Disclosure
Built for the **AppBuildersPH Hackathon 2026**. All demonstration citizen records and addresses are synthetically generated using Faker for privacy and safety.