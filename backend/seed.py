import random
from datetime import datetime, timezone, timedelta
from faker import Faker
from sqlmodel import Session, select
from backend.database import engine, init_db
from backend.models import Household, SupplyItem, DistributionRecord

fake = Faker('en_PH')

FILIPINO_SURNAMES = [
    "Santos", "Reyes", "Cruz", "Bautista", "Ocampo", "Garcia",
    "Mendoza", "Torres", "Tomas", "Andrada", "Aquino", "Dela Cruz",
    "Flores", "Gonzales", "Ramos", "Villanueva", "Castro", "Rivera"
]

FILIPINO_FIRST_NAMES = [
    "Rosa", "Maria", "Juan", "Pedro", "Ben", "Angel", "Crisanto",
    "Luzviminda", "Danilo", "Corazon", "Rodrigo", "Rowena", "Grace",
    "Eduardo", "Remedios", "Arnel", "Jocelyn", "Fernando", "Marites"
]

def seed_database():
    init_db()
    with Session(engine) as session:
        # Check if already seeded
        existing_count = len(session.exec(select(Household)).all())
        if existing_count >= 10:
            print(f"Database already populated with {existing_count} households.")
            return

        print("Seeding AlalAI database with synthetic evacuation records...")

        now = datetime.now(timezone.utc)

        # 1. Seed Supplies matching the spec (page 7 & 8: Rice 18kg, Water 24L, Diapers 2 packs)
        supplies = [
            SupplyItem(
                id="SUP-RICE",
                name="Rice",
                category="food",
                quantity=18.0,
                unit="kg",
                min_threshold=50.0,
                burn_rate_per_day=48.0,
                updated_at=now
            ),
            SupplyItem(
                id="SUP-WATER",
                name="Drinking water",
                category="water",
                quantity=24.0,
                unit="L",
                min_threshold=80.0,
                burn_rate_per_day=60.0,
                updated_at=now
            ),
            SupplyItem(
                id="SUP-DIAPERS",
                name="Diapers",
                category="infant",
                quantity=2.0,
                unit="packs",
                min_threshold=10.0,
                burn_rate_per_day=5.5,
                updated_at=now
            ),
            SupplyItem(
                id="SUP-FORMULA",
                name="Infant formula",
                category="infant",
                quantity=12.0,
                unit="boxes",
                min_threshold=15.0,
                burn_rate_per_day=4.0,
                updated_at=now
            ),
            SupplyItem(
                id="SUP-HYGIENE",
                name="Family hygiene kits",
                category="hygiene",
                quantity=35.0,
                unit="kits",
                min_threshold=20.0,
                burn_rate_per_day=10.0,
                updated_at=now
            ),
            SupplyItem(
                id="SUP-COOLER",
                name="Insulin cooler packs",
                category="medical",
                quantity=6.0,
                unit="coolers",
                min_threshold=5.0,
                burn_rate_per_day=2.0,
                updated_at=now
            ),
        ]

        for s in supplies:
            session.add(s)

        # 2. Add the specific Duplicate Match from the spec: "Rosa D. Santos" at Evacuation Center B
        rosa_duplicate = Household(
            id="FAM-ROSA-001",
            qr_code="ALALAI-FAM-ROSA-001-A9F2",
            representative_name="Rosa D. Santos",
            birthdate="1985-04-12",
            members_count=5,
            location="Evacuation Center B",
            has_infant=True,
            has_senior=True,
            has_medical_needs=True,
            medical_notes="Diabetic, insulin dependent; Bunso 8 months; Nanay 67",
            status="flagged_duplicate",
            created_offline=False,
            sync_status="synced",
            created_at=now - timedelta(days=1),
            updated_at=now - timedelta(days=1)
        )
        session.add(rosa_duplicate)

        # 3. Seed additional households to reach 128 families & ~463 individuals
        # 12 families flagged as pending reviews
        target_families = 127
        centers = ["Evacuation Center A", "Evacuation Center B", "Barangay Gymnasium", "Central Elementary School"]

        total_people = 5  # start with rosa
        for i in range(1, target_families + 1):
            first = random.choice(FILIPINO_FIRST_NAMES)
            last = random.choice(FILIPINO_SURNAMES)
            rep_name = f"{first} {last}"
            
            # calculate member size to reach approx 463
            m_count = random.choices([2, 3, 4, 5, 6], weights=[15, 30, 30, 15, 10])[0]
            total_people += m_count

            birth_year = random.randint(1955, 2005)
            birth_month = random.randint(1, 12)
            birth_day = random.randint(1, 28)
            bdate = f"{birth_year:04d}-{birth_month:02d}-{birth_day:02d}"

            has_inf = random.random() < 0.25
            has_sen = random.random() < 0.30
            has_med = random.random() < 0.20

            status = "flagged_duplicate" if i <= 11 else "verified"

            fam = Household(
                id=f"FAM-{i:03d}",
                qr_code=f"ALALAI-FAM-{i:03d}-{random.randint(1000, 9999)}",
                representative_name=rep_name,
                birthdate=bdate,
                members_count=m_count,
                location=random.choice(centers),
                has_infant=has_inf,
                has_senior=has_sen,
                has_medical_needs=has_med,
                medical_notes="Hypertension / Maintenance meds" if has_med else None,
                status=status,
                created_offline=False,
                sync_status="synced",
                created_at=now - timedelta(hours=random.randint(1, 72)),
                updated_at=now - timedelta(hours=random.randint(1, 72))
            )
            session.add(fam)

        # 4. Add initial distribution record
        dist = DistributionRecord(
            id="DIST-001",
            household_id="FAM-ROSA-001",
            family_name="Rosa D. Santos",
            item_name="Family Relief Pack",
            quantity=1.0,
            unit="pack",
            timestamp=now - timedelta(hours=14),
            distributed_by="Ben (Intake Volunteer)",
            notes="Initial intake pack distributed"
        )
        session.add(dist)

        session.commit()
        print(f"Seeding completed successfully! Total households: {target_families + 1}, Total people: {total_people}")

if __name__ == "__main__":
    seed_database()
