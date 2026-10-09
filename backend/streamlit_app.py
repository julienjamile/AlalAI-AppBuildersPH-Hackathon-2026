import streamlit as st
import pandas as pd
from datetime import datetime, timezone
from sqlmodel import Session, select, func
from backend.database import engine, init_db
from backend.models import Household, SupplyItem, DistributionRecord
from backend.taga-alalai import tala_predict_alerts, tala_generate_sms_ulat
from backend.reports import generate_evacuation_pdf

st.set_page_config(
    page_title="AlalAI — Camp Manager Dashboard",
    page_icon="🏠",
    layout="wide"
)

init_db()

st.title("🏠 AlalAI — Camp Manager Hub Dashboard")
st.caption("Disaster Evacuation Operations & Supply Intelligence · Taga-alalAI Local AI Hub (Zero-Internet Mode)")

with Session(engine) as session:
    total_families = session.exec(select(func.count(Household.id))).one()
    total_individuals = session.exec(select(func.sum(Household.members_count))).one() or 0
    pending_reviews = session.exec(select(func.count(Household.id)).where(Household.status == "flagged_duplicate")).one()

    inventory = session.exec(select(SupplyItem)).all()
    alerts = tala_predict_alerts(inventory, int(total_individuals))

    # Top KPI Metrics
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Registered Families", f"{total_families}")
    col2.metric("Total Individuals", f"{int(total_individuals)}")
    col3.metric("Pending Duplicate Reviews", f"{pending_reviews}", delta_color="inverse")
    col4.metric("Critical Low-Stock Items", f"{len(alerts)}", delta_color="inverse")

    st.markdown("---")

    # Tabs
    tab_overview, tab_alerts, tab_families, tab_sms = st.tabs([
        "📊 Camp Overview & Inventory",
        "🚨 Abiso: Supply Alerts & Requests",
        "👥 Registered Families & Kard AlalAI",
        "📩 Text Ulat (SMS to MDRRMO)"
    ])

    with tab_overview:
        st.subheader("Inventory Stock & Burn Rates")
        inv_data = []
        for item in inventory:
            inv_data.append({
                "Item Name": item.name,
                "Category": item.category.title(),
                "Current Stock": f"{item.quantity} {item.unit}",
                "Min Threshold": f"{item.min_threshold} {item.unit}",
                "Daily Burn": f"{item.burn_rate_per_day} {item.unit}/day",
            })
        st.dataframe(pd.DataFrame(inv_data), use_container_width=True)

        # PDF Download Button
        pdf_bytes = generate_evacuation_pdf(
            "Evacuation Center A",
            {"total_families": total_families, "total_individuals": total_individuals, "pending_reviews": pending_reviews, "low_stock_items": len(alerts)},
            session.exec(select(Household).order_by(Household.created_at.desc()).limit(20)).all(),
            alerts
        )
        st.download_button(
            label="📄 Download Official PDF Report (MDRRMO / MSWDO)",
            data=pdf_bytes,
            file_name=f"AlalAI_Evacuation_Report_{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf",
            mime="application/pdf"
        )

    with tab_alerts:
        st.subheader("Abiso: Predictive Supply Runout Warnings")
        if alerts:
            for alert in alerts:
                with st.expander(f"⚠️ {alert['name']} — {alert['status']} ({alert['quantity']})", expanded=True):
                    st.write(f"**Predicted Exhaustion:** In approximately **{alert['runout_hours']} hours**")
                    st.info(f"**Taga-alalAI AI Drafted Request:**\n\n{alert['draft_request']}")
                    if st.button(f"Approve & Send Resupply Request for {alert['name']}", key=f"btn_{alert['id']}"):
                        st.success(f"Request approved! Ready to pack into Text Ulat SMS for MDRRMO dispatch.")
        else:
            st.success("All inventory levels are currently above safe buffer thresholds.")

    with tab_families:
        st.subheader("Registered Households")
        search = st.text_input("Search family representative or center:")
        query = select(Household).order_by(Household.created_at.desc())
        if search:
            query = query.where(Household.representative_name.contains(search))
        households = session.exec(query.limit(50)).all()

        h_data = []
        for h in households:
            h_data.append({
                "ID": h.id,
                "QR Code": h.qr_code,
                "Representative": h.representative_name,
                "Birthdate": h.birthdate,
                "Members": h.members_count,
                "Location": h.location,
                "Infant": "👶 Yes" if h.has_infant else "No",
                "Senior": "👵 Yes" if h.has_senior else "No",
                "Medical": "💊 Yes" if h.has_medical_needs else "No",
                "Status": h.status.upper()
            })
        st.dataframe(pd.DataFrame(h_data), use_container_width=True)

    with tab_sms:
        st.subheader("Text Ulat: 160-Character SMS Generator")
        camp_input = st.text_input("Evacuation Center Name", "Gym A")
        low_items = [a["name"] for a in alerts]
        sms_body = tala_generate_sms_ulat(
            camp_name=camp_input,
            families=total_families,
            people=int(total_individuals),
            low_stock_items=low_items,
            pending_reviews=pending_reviews
        )
        st.text_area("Generated SMS Text (Character Count: " + str(len(sms_body)) + "/160)", sms_body, height=100)
        st.caption("This concise text can be sent via standard 2G cellular SMS to MDRRMO / MSWDO when internet infrastructure is down.")
