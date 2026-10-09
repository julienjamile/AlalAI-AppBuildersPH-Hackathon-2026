# Silong (AlalAI) — Kalinga Kahit Walang Signal

> **Disaster Evacuation Registration, Supply Intelligence & Offline Coordination**  
> Built for the AppBuildersPH Hackathon 2026

---

## 🌟 Overview

When typhoons and natural disasters hit the Philippines, power grids and cellular networks often fail. Evacuation centers resort to chaotic paper registrations, leading to duplicate counting, missed vulnerable individuals (infants, seniors, insulin-dependent patients), and delayed municipal relief reports.

**Silong** is an offline-first disaster response system powered by **Tala Local AI**:
- **Volunteer Mobile App (TypeScript / Expo)**: Runs on Android & iOS devices inside evacuation centers. Works with zero internet.
- **Hub Laptop Backend (Python FastAPI + SQLite)**: Acts as the local operations brain over a battery-powered hotspot or router (mobile data OFF).
- **Tala Local AI**: Performs on-device/local NLP intake, fuzzy duplicate detection, vulnerability rule counting, predictive resupply alerts, and 160-character SMS report compression.

---

## 🚀 Core Features

| Feature | Description | Engine / Tech |
| :--- | :--- | :--- |
| **🎙️ Kwento (Voice Intake)** | Volunteer records family speech in Tagalog, Bisaya, or Taglish. Automatically extracts representative name, age, household size, and flags infant/senior/medical needs. | Faster-Whisper / Tala NLP Brain |
| **📷 Kuha (Photo Intake)** | Reads text from Philippine National IDs (PhilSys), Barangay vouchers, or intake slips. | ML Kit / Tala Eyes OCR |
| **🔎 Kilala (Duplicate Check)** | Compares applicants across all evacuation centers to catch duplicate registrations (e.g., *"Rosa Santos"* vs *"Rosa D. Santos"*). | RapidFuzz similarity matching |
| **🧮 Bilang (Needs Counter)** | Converts household size and vulnerable demographics into exact relief allocations (Rice, Water, Diapers, Formula, Insulin cooler). | Deterministic Bilang rules |
| **🚨 Abiso (Supply Alerts)** | Tracks inventory burn rates against sheltered population. Predicts stock-out hours and drafts official resupply letters. | Abiso Burn Rate Predictor |
| **📩 Text Ulat (SMS Report)** | Condenses the whole evacuation center's status into a strict **160-character SMS** for 2G cellular transmission to MDRRMO. | Tala Summarizer + `expo-sms` |
| **🪪 Kard Silong (QR Card)** | Generates unique scannable QR relief credentials for each family. Distribution line scanner catches double-claims instantly. | `react-native-qrcode-svg` |
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
│   ├── tala.py              # Tala Local AI: Voice, Photo, Kilala, Bilang, Abiso, Text Ulat
│   ├── seed.py              # Synthetic evacuation dataset (128 families, initial stock)
│   ├── reports.py           # ReportLab printable PDF evacuation summary generator
│   ├── streamlit_app.py     # Camp Manager operations dashboard (Streamlit)
│   └── silong.db            # SQLite database file
├── src/
│   ├── app/
│   │   ├── _layout.tsx      # Expo Router root layout
│   │   └── index.tsx        # Main navigation container & registration state
│   ├── screen/
│   │   ├── DashboardScreen.tsx    # Relief center overview & Kard Silong line scanner
│   │   ├── RegistrationScreen.tsx # Kwento, Kuha, Confirm, Kilala, Kard Silong QR
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
pip install fastapi uvicorn sqlmodel rapidfuzz streamlit reportlab faker python-multipart

# 2. Seed database (creates 128 sample households and duplicate candidates)
python -m backend.seed

# 3. Start the FastAPI server
uvicorn main:app --host 0.0.0.0 --port 8000

# 4. (Optional) Launch the Camp Manager Streamlit Dashboard
streamlit run backend/streamlit_app.py
```

- **Interactive API Documentation**: Visit `http://localhost:8000/docs`
- **Health Check**: `http://localhost:8000/health`

### 2. Volunteer Phone App (Frontend)

Ensure Node.js 18+ is installed.

```bash
# 1. Install dependencies
npm install

# 2. Start Expo development server
npx expo start
```

- **Web Preview**: Press `w` in the terminal to view in your web browser.
- **Physical Phone**: Scan the QR code using the **Expo Go** app on your Android or iOS phone connected to the same Wi-Fi/Hotspot as your laptop.

---

## 📡 Hotspot Connection (Zero-Internet Mode)

1. Turn on the Wi-Fi hotspot from a phone (with **Mobile Data turned OFF**).
2. Connect both the Hub laptop and the volunteer phones to this hotspot.
3. Check the laptop's local IP address (e.g. `192.168.43.10`).
4. Tap the **OFFLINE / HUB CONNECTED** pill in the mobile app header and input `http://<laptop-ip>:8000`.
5. Tap **Test Connection** — the app is now fully linked to the laptop hub with zero internet!

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