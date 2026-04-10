"""
Demo / sample CRM rows (sample_* ids) — used by CLI script and admin API.

Requires demo users in `users` (API lifespan seed or tests).
"""
from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.demo_image_urls import dicebear_company_logo
from app.models.app_data import AppSettingsRow, EmailTemplateRow
from app.models.documents import ClientRow, EnquiryRow, InvoiceRow, QuotationRow
from app.redis_cache import cache_delete

SEED_KEY = "seed"
SAMPLE_TAG = "sampleData"
VERSION = "v5"

# Bulk demo rows (ids bulk_*) — at least this many per CRM entity type, plus curated sample_* rows.
BULK_COUNT = 100
BULK_CLI_PREFIX = "bulk_cli_"
BULK_ENQ_PREFIX = "bulk_enq_"
BULK_Q_PREFIX = "bulk_q_"
BULK_INV_PREFIX = "bulk_inv_"

NOW = date.today().isoformat()
YESTERDAY = (date.today() - timedelta(days=1)).isoformat()
NEXT_WEEK = (date.today() + timedelta(days=7)).isoformat()
LAST_WEEK = (date.today() - timedelta(days=10)).isoformat()
OVERDUE = (date.today() - timedelta(days=5)).isoformat()

SAMPLE_CLIENT_IDS = [
    "sample_cli_acme",
    "sample_cli_globex",
    "sample_cli_initech",
    "sample_cli_wayne",
]
SAMPLE_ENQUIRY_IDS = [
    "sample_enq_new_air",
    "sample_enq_sea_progress",
    "sample_enq_road_quoted",
    "sample_enq_closed",
    "sample_enq_critical",
]
SAMPLE_QUOTE_IDS = [
    "sample_q_draft",
    "sample_q_sent",
    "sample_q_accepted",
    "sample_q_rejected",
    "sample_q_no_token",
    "sample_q_multiline",
]
SAMPLE_INV_IDS = [
    "sample_inv_pending",
    "sample_inv_paid",
    "sample_inv_overdue",
    "sample_inv_partial",
]


def _delete_samples(db: Session) -> None:
    # Remove bulk demo rows (prefix) — order: invoices → quotations → enquiries → clients
    db.execute(delete(InvoiceRow).where(InvoiceRow.id.like(f"{BULK_INV_PREFIX}%")))
    db.execute(delete(QuotationRow).where(QuotationRow.id.like(f"{BULK_Q_PREFIX}%")))
    db.execute(delete(EnquiryRow).where(EnquiryRow.id.like(f"{BULK_ENQ_PREFIX}%")))
    db.execute(delete(ClientRow).where(ClientRow.id.like(f"{BULK_CLI_PREFIX}%")))
    # Curated sample_* rows
    for iid in SAMPLE_INV_IDS:
        r = db.get(InvoiceRow, iid)
        if r:
            db.delete(r)
    for qid in SAMPLE_QUOTE_IDS:
        r = db.get(QuotationRow, qid)
        if r:
            db.delete(r)
    for eid in SAMPLE_ENQUIRY_IDS:
        r = db.get(EnquiryRow, eid)
        if r:
            db.delete(r)
    for cid in SAMPLE_CLIENT_IDS:
        r = db.get(ClientRow, cid)
        if r:
            db.delete(r)
    for tid in ["sample_tpl_client_note", "sample_tpl_quote_client"]:
        r = db.get(EmailTemplateRow, tid)
        if r:
            db.delete(r)


def _invalidate_crm_list_caches() -> None:
    for key in (
        "crm:clients:list",
        "crm:enquiries:list",
        "crm:quotations:list",
        "crm:invoices:list",
        "crm:email-templates:list",
        "crm:settings:brevo",
    ):
        cache_delete(key)


def demo_data_status(db: Session) -> dict:
    marker = db.get(AppSettingsRow, SEED_KEY)
    ver = (marker.data or {}).get(SAMPLE_TAG) if marker else None
    return {"installed": ver == VERSION, "version": ver}


def seed_demo_data(db: Session, *, replace: bool = False) -> dict:
    """
    Insert curated sample_* rows plus bulk_* rows (BULK_COUNT each for clients, enquiries, quotations, invoices),
    email templates, and merged brevo/ui hints. If already installed and replace is False, returns ok=False.
    """
    marker = db.get(AppSettingsRow, SEED_KEY)
    if marker and (marker.data or {}).get(SAMPLE_TAG) == VERSION and not replace:
        return {"ok": False, "installed": True, "detail": "Demo data already installed. Use replace=true to refresh."}

    if replace or not marker:
        _delete_samples(db)

    for row in _clients() + _bulk_clients():
        if not db.get(ClientRow, row.id):
            db.add(row)
    for row in _enquiries() + _bulk_enquiries():
        if not db.get(EnquiryRow, row.id):
            db.add(row)
    for row in _quotations() + _bulk_quotations():
        if not db.get(QuotationRow, row.id):
            db.add(row)
    for row in _invoices() + _bulk_invoices():
        if not db.get(InvoiceRow, row.id):
            db.add(row)

    for row in _settings_brevo_ui():
        existing = db.get(AppSettingsRow, row.key)
        if existing:
            base = dict(existing.data or {})
            existing.data = {**base, **row.data}
        else:
            db.add(row)

    for row in _templates():
        if not db.get(EmailTemplateRow, row.id):
            db.add(row)

    m = db.get(AppSettingsRow, SEED_KEY)
    if not m:
        m = AppSettingsRow(key=SEED_KEY, data={})
        db.add(m)
    data = dict(m.data or {})
    data[SAMPLE_TAG] = VERSION
    m.data = data

    db.commit()
    _invalidate_crm_list_caches()
    return {"ok": True, "installed": True, "replaced": replace}


def remove_demo_data(db: Session) -> dict:
    """Remove all sample_* CRM rows and the demo marker; does not remove real user data."""
    _delete_samples(db)
    m = db.get(AppSettingsRow, SEED_KEY)
    if m:
        d = dict(m.data or {})
        d.pop(SAMPLE_TAG, None)
        if not d:
            db.delete(m)
        else:
            m.data = d
    db.commit()
    _invalidate_crm_list_caches()
    return {"ok": True, "installed": False}


def _clients():
    return [
        ClientRow(
            id="sample_cli_acme",
            data={
                "clientName": "Acme Logistics Partner",
                "companyName": "Acme Freight Ltd",
                "email": "ops@acmefreight.example",
                "phone": "+1-415-555-0100",
                "alternatePhone": "+1-415-555-0101",
                "address": "100 Harbor Way",
                "city": "San Francisco",
                "state": "CA",
                "country": "US",
                "gstTaxId": "US-EIN-12-3456789",
                "industry": "Retail / e-commerce",
                "contactPersonName": "Jordan Lee",
                "contactPersonRole": "Logistics Manager",
                "contactPersonEmail": "jordan@acmefreight.example",
                "notes": "Prefers morning pickups; high volume peak Q4.",
                "status": "Active",
                "createdAt": LAST_WEEK,
                "logoUrl": dicebear_company_logo("Acme Freight Ltd"),
                "logoAlt": "Acme Freight Ltd logo",
            },
        ),
        ClientRow(
            id="sample_cli_globex",
            data={
                "clientName": "Globex EU",
                "companyName": "Globex Corporation BV",
                "email": "import@globex.example",
                "phone": "+31-20-555-0199",
                "address": "Keizersgracht 100",
                "city": "Amsterdam",
                "state": "",
                "country": "NL",
                "industry": "Manufacturing",
                "contactPersonName": "Elena Vogel",
                "contactPersonRole": "Supply Chain",
                "contactPersonEmail": "elena@globex.example",
                "notes": "Incoterms usually DAP Rotterdam.",
                "status": "Active",
                "createdAt": LAST_WEEK,
                "logoUrl": dicebear_company_logo("Globex Corporation BV"),
                "logoAlt": "Globex Corporation BV logo",
            },
        ),
        ClientRow(
            id="sample_cli_initech",
            data={
                "clientName": "Initech Supplies",
                "companyName": "Initech GmbH",
                "email": "warehouse@initech.example",
                "phone": "+49-89-555-0142",
                "city": "Munich",
                "country": "DE",
                "contactPersonName": "Samir Nagheenanajar",
                "contactPersonEmail": "samir@initech.example",
                "status": "Inactive",
                "notes": "Account on hold — credit review.",
                "createdAt": YESTERDAY,
                "logoUrl": dicebear_company_logo("Initech GmbH"),
                "logoAlt": "Initech GmbH logo",
            },
        ),
        ClientRow(
            id="sample_cli_wayne",
            data={
                "clientName": "Wayne Enterprises",
                "companyName": "Wayne Enterprises Inc",
                "email": "logistics@wayneenterprises.example",
                "phone": "+1-212-555-0180",
                "address": "1 Wayne Tower",
                "city": "Gotham",
                "state": "NY",
                "country": "US",
                "industry": "Conglomerate",
                "contactPersonName": "Lucius Fox",
                "contactPersonRole": "VP Operations",
                "contactPersonEmail": "lfox@wayneenterprises.example",
                "status": "Active",
                "createdAt": NOW,
                "logoUrl": dicebear_company_logo("Wayne Enterprises Inc"),
                "logoAlt": "Wayne Enterprises Inc logo",
            },
        ),
    ]


def _enquiries():
    return [
        EnquiryRow(
            id="sample_enq_new_air",
            data={
                "enquiryId": "ENQ-AIR-2401",
                "inquiryDate": YESTERDAY,
                "enquiryTemplate": "air_export",
                "salesChannel": "direct",
                "source": "email",
                "status": "New",
                "serviceType": "air",
                "modeType": "Express",
                "shipmentType": "export",
                "incoterms": "FOB",
                "priority": "High",
                "originCountry": "US",
                "originState": "IL",
                "originCity": "Chicago",
                "originPortCode": "ORD",
                "pickupType": "door",
                "pickupAddress": "2200 Cargo Rd, Dock 4, Elk Grove Village, IL 60007",
                "destCountry": "DE",
                "destState": "HE",
                "destCity": "Frankfurt",
                "destPortCode": "FRA",
                "deliveryType": "port",
                "deliveryAddress": "Frankfurt Cargo Center, Gate B12, 60549 Frankfurt",
                "commodityDescription": "Electronics — high value, temp controlled",
                "description": "2 pallets sensors",
                "hsCode": "8542.33",
                "cargoCategory": "fragile",
                "packagingType": "pallets",
                "numPackages": 10,
                "dimLengthCm": 120,
                "dimWidthCm": 100,
                "dimHeightCm": 145,
                "dimensionsDescription": "2 Euro pallets stackable; do not tilt",
                "grossWeightKg": 420,
                "netWeightKg": 395,
                "volumeCbm": 3.2,
                "weightPerPackageKg": 42,
                "cargoReadiness": NEXT_WEEK,
                "enquiryRemarks": "Demo: TSA known-shipper; dry ice not required.",
                "requiredSchedule": "Must arrive before plant shutdown Friday",
                "dangerousGoods": "no",
                "tempControlRequired": "yes",
                "tempRange": "+15°C to +25°C",
                "specialHandling": "Security escort at origin; photo POD required",
                "airChargeableWeightKg": 580,
                "airIataCode": "FWB pending",
                "airPreferredAirline": "LH / UA",
                "airTransitTimeReq": "48h door-to-airport",
                "airAwbType": "house",
                "readyDate": NEXT_WEEK,
                "pickupDate": NEXT_WEEK,
                "expectedDeliveryDate": (date.today() + timedelta(days=14)).isoformat(),
                "deadlineSla": (date.today() + timedelta(days=3)).isoformat(),
                "targetBudget": 8500,
                "currency": "USD",
                "paymentTerms": "Net 30",
                "paymentCollectMode": "prepaid",
                "attachHasInvoice": True,
                "attachHasPackingList": True,
                "attachHasMsds": False,
                "attachOtherNotes": "Packing list v3 on file",
                "assignedSalesUserId": "u_admin",
                "salesPersonAssigned": "Admin User",
                "branchLocation": "Chicago ORD",
                "internalNotes": "Demo seed — VIP lane if space tight",
                "followUpDate": (date.today() + timedelta(days=2)).isoformat(),
                "enquiryReceivedAt": f"{YESTERDAY}T10:30",
                "quoteSentAt": "",
                "linkedQuotationId": "",
                "customerCompanyName": "Acme Freight Ltd",
                "contactPerson": "Jordan Lee",
                "contactEmail": "jordan@acmefreight.example",
                "contactPhone": "+1-415-555-0100",
                "gstTaxId": "US-EIN-12-3456789",
                "customerType": "shipper",
                "clientId": "sample_cli_acme",
                "lineItems": [
                    {
                        "id": "li_enq_air_1",
                        "description": "Air freight ORD→FRA express",
                        "quantity": 1,
                        "assignedPricingUserIds": ["u_pricing1"],
                    }
                ],
                "assignedPricingUserIds": ["u_pricing1"],
                "pricingByUser": {},
                "cargoLines": [
                    {
                        "id": "cargo_air_1",
                        "description": "Temp-controlled sensors — Lot A",
                        "packagingType": "pallets",
                        "quantity": 2,
                        "grossWeightKg": 210,
                        "volumeCbm": 1.6,
                        "dimensionsCm": "120×100×145",
                    },
                    {
                        "id": "cargo_air_2",
                        "description": "Spare controllers — Lot B",
                        "packagingType": "cartons",
                        "quantity": 8,
                        "grossWeightKg": 210,
                        "volumeCbm": 1.6,
                        "dimensionsCm": "80×60×40",
                    },
                ],
                "additionalServiceTags": ["Cargo Insurance", "Inland Transport Origin"],
                "routePolText": "ORD / Chicago",
                "routePodText": "FRA / Frankfurt",
                "enquiryValidUntil": NEXT_WEEK,
                "declaredValueUsd": 120000,
                "insuranceRequired": "yes",
                "customsClearanceOrigin": "no",
                "customsClearanceDestination": "no",
                "createdAt": NOW,
            },
        ),
        EnquiryRow(
            id="sample_enq_sea_progress",
            data={
                "enquiryId": "ENQ-SEA-2402",
                "inquiryDate": LAST_WEEK,
                "enquiryTemplate": "sea_import",
                "salesChannel": "partner",
                "source": "referral",
                "status": "In Progress",
                "serviceType": "sea",
                "modeType": "FCL",
                "shipmentType": "import",
                "incoterms": "CIF",
                "priority": "Normal",
                "originCountry": "CN",
                "originState": "Shanghai",
                "originCity": "Shanghai",
                "originPortCode": "CNSHA",
                "pickupType": "port",
                "pickupAddress": "Yangshan Phase 3 CY — booking ref DEMO-SEA-01",
                "destCountry": "NL",
                "destState": "South Holland",
                "destCity": "Rotterdam",
                "destPortCode": "NLRTM",
                "deliveryType": "door",
                "deliveryAddress": "Globex DC, Botlekweg 12, 3197 KV Botlek",
                "commodityDescription": "Furniture — 40HC dry",
                "description": "1×40HC household goods",
                "hsCode": "9403.60",
                "cargoCategory": "general",
                "packagingType": "cartons",
                "numPackages": 240,
                "dimLengthCm": 1203,
                "dimWidthCm": 235,
                "dimHeightCm": 259,
                "dimensionsDescription": "Stuffed 40HC; max gross 28t",
                "grossWeightKg": 18500,
                "netWeightKg": 17200,
                "volumeCbm": 67,
                "grossWeightTons": 18.5,
                "cargoReadiness": YESTERDAY,
                "enquiryRemarks": "Demo: VGM submitted; prefer MSC or Maersk line",
                "requiredSchedule": "ETA RTM window +/− 5 days acceptable",
                "dangerousGoods": "no",
                "insuranceRequired": "no",
                "customsClearanceOrigin": "no",
                "customsClearanceDestination": "yes",
                "specialHandling": "Lift-off at consignee with tail-lift truck",
                "seaContainerType": "40HC",
                "seaContainerCount": 1,
                "seaLoadType": "FCL",
                "seaShippingLinePreference": "MSC / Maersk",
                "seaFreeDaysRequired": "14 combined",
                "seaPortCutoffDate": NEXT_WEEK,
                "readyDate": YESTERDAY,
                "pickupDate": YESTERDAY,
                "expectedDeliveryDate": (date.today() + timedelta(days=21)).isoformat(),
                "deadlineSla": (date.today() + timedelta(days=10)).isoformat(),
                "targetBudget": 18500,
                "expectedValue": 18500,
                "currency": "EUR",
                "paymentTerms": "Net 45",
                "paymentCollectMode": "collect",
                "attachHasInvoice": True,
                "attachHasPackingList": True,
                "attachHasMsds": False,
                "attachOtherNotes": "HS photos in shared drive /demo/sea",
                "assignedSalesUserId": "u_admin",
                "salesPersonAssigned": "Admin User",
                "branchLocation": "Rotterdam gateway",
                "internalNotes": "Demo seed — customs broker: Demo Brokers BV",
                "followUpDate": NOW,
                "enquiryReceivedAt": f"{LAST_WEEK}T08:15",
                "quoteSentAt": f"{YESTERDAY}T16:00",
                "customerCompanyName": "Globex Corporation BV",
                "contactPerson": "Elena Vogel",
                "contactEmail": "elena@globex.example",
                "contactPhone": "+31-20-555-0199",
                "gstTaxId": "NL123456789B01",
                "customerType": "consignee",
                "clientId": "sample_cli_globex",
                "lineItems": [
                    {
                        "id": "li_sea_1",
                        "description": "Ocean FCL SHA→RTM",
                        "quantity": 1,
                        "assignedPricingUserIds": ["u_pricing1", "u_pricing2"],
                    },
                    {
                        "id": "li_sea_2",
                        "description": "Destination trucking",
                        "quantity": 1,
                        "assignedPricingUserIds": ["u_pricing2"],
                    },
                ],
                "assignedPricingUserIds": ["u_pricing1", "u_pricing2"],
                "cargoLines": [
                    {
                        "id": "cargo_sea_1",
                        "description": "Furniture — 40HC consolidated",
                        "packagingType": "cartons",
                        "quantity": 1,
                        "grossWeightKg": 18500,
                        "volumeCbm": 67,
                        "dimensionsCm": "40HC internal",
                    }
                ],
                "additionalServiceTags": ["Customs Clearance (Dest.)", "Inland Transport Dest."],
                "routePolText": "CNSHA / Shanghai",
                "routePodText": "NLRTM / Rotterdam",
                "enquiryValidUntil": (date.today() + timedelta(days=20)).isoformat(),
                "declaredValueUsd": 95000,
                "createdAt": YESTERDAY,
            },
        ),
        EnquiryRow(
            id="sample_enq_road_quoted",
            data={
                "enquiryId": "ENQ-ROAD-2403",
                "inquiryDate": LAST_WEEK,
                "enquiryTemplate": "others",
                "salesChannel": "direct",
                "source": "call",
                "status": "Quoted",
                "serviceType": "road",
                "modeType": "FTL",
                "shipmentType": "domestic",
                "incoterms": "DAP",
                "priority": "Low",
                "originCountry": "DE",
                "originState": "Bavaria",
                "originCity": "Munich",
                "originPortCode": "",
                "pickupType": "door",
                "pickupAddress": "Initech Werk 3, Industriestr. 88, 80999 Munich",
                "destCountry": "DE",
                "destState": "Berlin",
                "destCity": "Berlin",
                "deliveryType": "door",
                "deliveryAddress": "Initech Berlin Hub, Am Borsigturm 1, 13507 Berlin",
                "commodityDescription": "Industrial parts — machined housings",
                "description": "FTL sealed, 13.6m tautliner",
                "hsCode": "8481.80",
                "cargoCategory": "general",
                "packagingType": "pallets",
                "numPackages": 18,
                "dimLengthCm": 1360,
                "dimWidthCm": 245,
                "dimHeightCm": 270,
                "dimensionsDescription": "13.6m EU trailer; 22 pallets max; strap at 4 points",
                "grossWeightKg": 12400,
                "netWeightKg": 11800,
                "volumeCbm": 82,
                "cargoReadiness": NOW,
                "enquiryRemarks": "Demo: ADR exempt; tail-lift not required",
                "requiredSchedule": "Night gate delivery 22:00–04:00 only",
                "roadVehicleType": "Tautliner 13.6m",
                "roadLoadType": "full",
                "roadRoutePreference": "A9 → A70 → A9; avoid Sunday HGV ban corridors",
                "roadTransitDays": 2,
                "roadTollPermitNotes": "DE Euro 6 truck class OK",
                "readyDate": NOW,
                "pickupDate": NEXT_WEEK,
                "expectedDeliveryDate": (date.today() + timedelta(days=5)).isoformat(),
                "targetBudget": 4200,
                "currency": "EUR",
                "paymentTerms": "Net 14",
                "paymentCollectMode": "prepaid",
                "attachHasInvoice": False,
                "attachHasPackingList": True,
                "attachHasMsds": False,
                "attachOtherNotes": "",
                "assignedSalesUserId": "u_admin",
                "branchLocation": "Munich road desk",
                "internalNotes": "Demo seed — carrier: Demo Road GmbH",
                "followUpDate": NOW,
                "enquiryReceivedAt": f"{LAST_WEEK}T11:00",
                "customerCompanyName": "Initech GmbH",
                "contactPerson": "Samir Nagheenanajar",
                "contactEmail": "samir@initech.example",
                "contactPhone": "+49-89-555-0142",
                "customerType": "shipper",
                "clientId": "sample_cli_initech",
                "lineItems": [
                    {"id": "li_road_1", "description": "FTL direct Munich–Berlin", "quantity": 1, "assignedPricingUserIds": []}
                ],
                "assignedPricingUserIds": [],
                "cargoLines": [
                    {
                        "id": "cargo_road_1",
                        "description": "Machined housings — batch R-2403",
                        "packagingType": "pallets",
                        "quantity": 18,
                        "grossWeightKg": 12400,
                        "volumeCbm": 82,
                        "dimensionsCm": "13.6m TL",
                    }
                ],
                "additionalServiceTags": ["Inland Transport Origin", "Palletization"],
                "routePolText": "DEHAM",
                "routePodText": "DEBER",
                "enquiryValidUntil": NEXT_WEEK,
                "declaredValueUsd": 28000,
                "insuranceRequired": "no",
                "customsClearanceOrigin": "no",
                "customsClearanceDestination": "no",
                "createdAt": LAST_WEEK,
            },
        ),
        EnquiryRow(
            id="sample_enq_closed",
            data={
                "enquiryId": "ENQ-OLD-2299",
                "inquiryDate": LAST_WEEK,
                "enquiryTemplate": "sea_import",
                "salesChannel": "direct",
                "source": "website",
                "status": "Closed",
                "serviceType": "multimodal",
                "modeType": "LCL",
                "shipmentType": "import",
                "incoterms": "DAP",
                "priority": "Normal",
                "originCountry": "SG",
                "originCity": "Singapore",
                "originPortCode": "SGSIN",
                "pickupType": "port",
                "pickupAddress": "PSA Terminal — demo booking CLOSED-2299",
                "destCountry": "US",
                "destState": "CA",
                "destCity": "Los Angeles",
                "destPortCode": "USLAX",
                "deliveryType": "door",
                "deliveryAddress": "Wayne Enterprises receiving, Long Beach, CA 90802",
                "commodityDescription": "Spare parts — closed won",
                "description": "LCL co-load + last-mile",
                "hsCode": "8708.99",
                "cargoCategory": "general",
                "packagingType": "cartons",
                "numPackages": 44,
                "grossWeightKg": 2100,
                "netWeightKg": 1980,
                "volumeCbm": 18.4,
                "dimensionsDescription": "2.4m max height on skid",
                "enquiryRemarks": "Demo: closed opportunity — keep for history",
                "seaContainerType": "40HC",
                "seaContainerCount": 0,
                "seaLoadType": "LCL",
                "seaShippingLinePreference": "Any",
                "readyDate": LAST_WEEK,
                "targetBudget": 11200,
                "currency": "USD",
                "paymentTerms": "Prepaid",
                "paymentCollectMode": "prepaid",
                "assignedSalesUserId": "u_admin",
                "internalNotes": "Demo seed — archived lane SIN→LAX",
                "customerCompanyName": "Wayne Enterprises Inc",
                "contactPerson": "Lucius Fox",
                "contactEmail": "lfox@wayneenterprises.example",
                "contactPhone": "+1-212-555-0180",
                "customerType": "consignee",
                "clientId": "sample_cli_wayne",
                "lineItems": [{"id": "li_old_1", "description": "LCL + drayage", "quantity": 1, "assignedPricingUserIds": []}],
                "assignedPricingUserIds": [],
                "cargoLines": [
                    {
                        "id": "cargo_closed_1",
                        "description": "Spare parts — mixed SKUs",
                        "packagingType": "cartons",
                        "quantity": 44,
                        "grossWeightKg": 2100,
                        "volumeCbm": 18.4,
                        "dimensionsCm": "120×100×200",
                    }
                ],
                "additionalServiceTags": ["Customs Clearance (Dest.)", "Warehousing"],
                "routePolText": "USNYC",
                "routePodText": "DEHAM",
                "enquiryValidUntil": YESTERDAY,
                "declaredValueUsd": 45000,
                "insuranceRequired": "yes",
                "customsClearanceOrigin": "no",
                "customsClearanceDestination": "yes",
                "createdAt": LAST_WEEK,
            },
        ),
        EnquiryRow(
            id="sample_enq_critical",
            data={
                "enquiryId": "ENQ-URG-2405",
                "inquiryDate": NOW,
                "enquiryTemplate": "air_export",
                "salesChannel": "direct",
                "source": "call",
                "status": "In Progress",
                "serviceType": "air",
                "modeType": "Charter",
                "shipmentType": "export",
                "incoterms": "FCA",
                "priority": "Critical",
                "originCountry": "US",
                "originState": "TX",
                "originCity": "Dallas",
                "originPortCode": "DFW",
                "pickupType": "door",
                "pickupAddress": "MedSupply DC, 5000 Freeport Pkwy, Irving, TX 75063",
                "destCountry": "BR",
                "destCity": "São Paulo",
                "destPortCode": "GRU",
                "deliveryType": "port",
                "deliveryAddress": "GRU cargo terminal — consignee pickup",
                "commodityDescription": "Medical supplies — AOG",
                "description": "Charter or part-charter; temp 2–8°C",
                "hsCode": "3002.15",
                "cargoCategory": "perishable",
                "packagingType": "cartons",
                "numPackages": 6,
                "grossWeightKg": 890,
                "netWeightKg": 820,
                "volumeCbm": 4.1,
                "tempControlRequired": "yes",
                "tempRange": "+2°C to +8°C",
                "dangerousGoods": "no",
                "specialHandling": "GDP handling; active logger ID DEMO-LOG-01",
                "airChargeableWeightKg": 1200,
                "airPreferredAirline": "Charter / ACMI",
                "airTransitTimeReq": "< 36h cut-to-delivery",
                "airAwbType": "master",
                "readyDate": NOW,
                "pickupDate": NOW,
                "expectedDeliveryDate": (date.today() + timedelta(days=2)).isoformat(),
                "deadlineSla": (date.today() + timedelta(days=1)).isoformat(),
                "targetBudget": 95000,
                "currency": "USD",
                "paymentTerms": "Immediate wire",
                "paymentCollectMode": "prepaid",
                "enquiryRemarks": "Client requests 24h response SLA.",
                "internalNotes": "Demo seed — escalate to duty manager",
                "followUpDate": NOW,
                "enquiryReceivedAt": f"{NOW}T06:00",
                "assignedSalesUserId": "u_admin",
                "customerCompanyName": "Wayne Enterprises Inc",
                "contactPerson": "Lucius Fox",
                "contactEmail": "lfox@wayneenterprises.example",
                "contactPhone": "+1-212-555-0180",
                "customerType": "shipper",
                "clientId": "sample_cli_wayne",
                "lineItems": [
                    {"id": "li_crit_1", "description": "Charter capacity DFW→GRU", "quantity": 1, "assignedPricingUserIds": ["u_pricing1"]}
                ],
                "assignedPricingUserIds": ["u_pricing1"],
                "cargoLines": [
                    {
                        "id": "cargo_crit_1",
                        "description": "Medical cold chain — validated shipper",
                        "packagingType": "cartons",
                        "quantity": 6,
                        "grossWeightKg": 890,
                        "volumeCbm": 4.1,
                        "dimensionsCm": "4× EUR-pallet footprint",
                    }
                ],
                "additionalServiceTags": ["Cargo Insurance", "Customs Clearance (Origin)"],
                "routePolText": "DFW / Dallas",
                "routePodText": "GRU / São Paulo",
                "enquiryValidUntil": (date.today() + timedelta(days=3)).isoformat(),
                "declaredValueUsd": 250000,
                "insuranceRequired": "yes",
                "customsClearanceOrigin": "yes",
                "customsClearanceDestination": "no",
                "createdAt": NOW,
            },
        ),
    ]


def _quotations():
    return [
        QuotationRow(
            id="sample_q_draft",
            data={
                "quoteId": "Q-DRAFT-001",
                "clientId": "sample_cli_acme",
                "enquiryId": "sample_enq_new_air",
                "status": "Draft",
                "currency": "USD",
                "discount": 0,
                "items": [{"name": "Air freight (draft)", "quantity": 1, "price": 5000, "taxPercent": 0}],
                "subtotal": 5000,
                "taxTotal": 0,
                "total": 5000,
                "finalAmount": 5000,
                "clientResponseToken": "draft-no-public-link",
                "createdAt": NOW,
            },
        ),
        QuotationRow(
            id="sample_q_sent",
            data={
                "quoteId": "Q-SENT-002",
                "clientId": "sample_cli_acme",
                "enquiryId": "sample_enq_new_air",
                "status": "Sent",
                "currency": "USD",
                "discount": 250,
                "items": [
                    {"name": "Air freight ORD→FRA", "quantity": 1, "price": 7200, "taxPercent": 0},
                    {"name": "Fuel surcharge", "quantity": 1, "price": 400, "taxPercent": 0},
                ],
                "subtotal": 7600,
                "taxTotal": 0,
                "total": 7600,
                "finalAmount": 7350,
                "clientResponseToken": "demo-respond-token-accept",
                "createdAt": YESTERDAY,
            },
        ),
        QuotationRow(
            id="sample_q_accepted",
            data={
                "quoteId": "Q-ACC-003",
                "clientId": "sample_cli_globex",
                "enquiryId": "sample_enq_sea_progress",
                "status": "Accepted",
                "currency": "EUR",
                "discount": 0,
                "items": [{"name": "Ocean FCL + handling", "quantity": 1, "price": 12000, "taxPercent": 0}],
                "subtotal": 12000,
                "taxTotal": 0,
                "total": 12000,
                "finalAmount": 12000,
                "clientResponseToken": "used-token-xyz",
                "clientRespondedAt": YESTERDAY + "T12:00:00Z",
                "clientResponseAction": "Accepted",
                "createdAt": LAST_WEEK,
            },
        ),
        QuotationRow(
            id="sample_q_rejected",
            data={
                "quoteId": "Q-REJ-004",
                "clientId": "sample_cli_initech",
                "enquiryId": "sample_enq_road_quoted",
                "status": "Rejected",
                "currency": "EUR",
                "discount": 0,
                "items": [{"name": "FTL Munich–Berlin", "quantity": 1, "price": 2800, "taxPercent": 19}],
                "subtotal": 2800,
                "taxTotal": 532,
                "total": 3332,
                "finalAmount": 3332,
                "clientResponseToken": "used-token-reject",
                "clientRespondedAt": LAST_WEEK + "T09:00:00Z",
                "clientResponseAction": "Rejected",
                "createdAt": LAST_WEEK,
            },
        ),
        QuotationRow(
            id="sample_q_no_token",
            data={
                "quoteId": "Q-NOTOKEN-005",
                "clientId": "sample_cli_wayne",
                "enquiryId": "sample_enq_closed",
                "status": "Sent",
                "currency": "USD",
                "discount": 0,
                "items": [{"name": "Consulting — routing study", "quantity": 1, "price": 1500, "taxPercent": 0}],
                "subtotal": 1500,
                "taxTotal": 0,
                "total": 1500,
                "finalAmount": 1500,
                "createdAt": NOW,
            },
        ),
        QuotationRow(
            id="sample_q_multiline",
            data={
                "quoteId": "Q-MULTI-006",
                "clientId": "sample_cli_globex",
                "enquiryId": "sample_enq_sea_progress",
                "status": "Sent",
                "currency": "EUR",
                "discount": 500,
                "items": [
                    {"name": "Ocean base rate", "quantity": 1, "price": 9000, "taxPercent": 0},
                    {"name": "Documentation", "quantity": 1, "price": 150, "taxPercent": 0},
                    {"name": "Customs brokerage", "quantity": 1, "price": 600, "taxPercent": 21},
                ],
                "subtotal": 9750,
                "taxTotal": 126,
                "total": 9876,
                "finalAmount": 9376,
                "clientResponseToken": "demo-respond-token-second",
                "createdAt": NOW,
            },
        ),
    ]


def _invoices():
    return [
        InvoiceRow(
            id="sample_inv_pending",
            data={
                "invoiceId": "INV-PEND-101",
                "clientId": "sample_cli_acme",
                "quoteId": "Q-SENT-002",
                "billingAddress": "Acme Freight Ltd, 100 Harbor Way, San Francisco, CA, US",
                "items": [{"name": "Freight charges", "quantity": 1, "price": 7350, "taxPercent": 0}],
                "totalAmount": 7350,
                "paidAmount": 0,
                "dueAmount": 7350,
                "paymentStatus": "Pending",
                "paymentMethod": "Bank transfer",
                "dueDate": NEXT_WEEK,
                "createdAt": NOW,
            },
        ),
        InvoiceRow(
            id="sample_inv_paid",
            data={
                "invoiceId": "INV-PAID-102",
                "clientId": "sample_cli_globex",
                "quoteId": "Q-ACC-003",
                "billingAddress": "Globex Corporation BV, Amsterdam, NL",
                "items": [{"name": "Ocean shipment closed", "quantity": 1, "price": 12000, "taxPercent": 0}],
                "totalAmount": 12000,
                "paidAmount": 12000,
                "dueAmount": 0,
                "paymentStatus": "Paid",
                "paymentMethod": "SEPA",
                "dueDate": YESTERDAY,
                "createdAt": LAST_WEEK,
            },
        ),
        InvoiceRow(
            id="sample_inv_overdue",
            data={
                "invoiceId": "INV-OVD-103",
                "clientId": "sample_cli_initech",
                "quoteId": "Q-REJ-004",
                "billingAddress": "Initech GmbH, Munich, DE",
                "items": [{"name": "Cancelled job — admin fee", "quantity": 1, "price": 350, "taxPercent": 19}],
                "totalAmount": 416.5,
                "paidAmount": 0,
                "dueAmount": 416.5,
                "paymentStatus": "Overdue",
                "paymentMethod": "Bank transfer",
                "dueDate": OVERDUE,
                "createdAt": OVERDUE,
            },
        ),
        InvoiceRow(
            id="sample_inv_partial",
            data={
                "invoiceId": "INV-PART-104",
                "clientId": "sample_cli_wayne",
                "quoteId": "Q-MULTI-006",
                "billingAddress": "Wayne Enterprises, Gotham, NY, US",
                "items": [
                    {"name": "Multimodal bundle", "quantity": 1, "price": 8000, "taxPercent": 0},
                    {"name": "Insurance", "quantity": 1, "price": 200, "taxPercent": 0},
                ],
                "totalAmount": 8200,
                "paidAmount": 4000,
                "dueAmount": 4200,
                "paymentStatus": "Pending",
                "paymentMethod": "Wire",
                "dueDate": NEXT_WEEK,
                "createdAt": YESTERDAY,
            },
        ),
    ]


_CITY_POOL = [
    ("Chicago", "US"),
    ("Frankfurt", "DE"),
    ("Shanghai", "CN"),
    ("Rotterdam", "NL"),
    ("Dubai", "AE"),
    ("Singapore", "SG"),
    ("São Paulo", "BR"),
    ("Mumbai", "IN"),
    ("Tokyo", "JP"),
    ("Sydney", "AU"),
    ("Los Angeles", "US"),
    ("Hamburg", "DE"),
    ("Antwerp", "BE"),
    ("Busan", "KR"),
    ("Felixstowe", "GB"),
]

_INDUSTRIES = (
    "Retail / e-commerce",
    "Manufacturing",
    "Pharma",
    "Automotive",
    "Food & beverage",
    "Electronics",
    "Chemicals",
    "Machinery",
    "Textiles",
    "Energy",
)


def _all_demo_client_ids() -> list[str]:
    return [*SAMPLE_CLIENT_IDS, *[f"{BULK_CLI_PREFIX}{i:03d}" for i in range(1, BULK_COUNT + 1)]]


def _bulk_clients() -> list[ClientRow]:
    rows: list[ClientRow] = []
    for i in range(1, BULK_COUNT + 1):
        cid = f"{BULK_CLI_PREFIX}{i:03d}"
        city, country = _CITY_POOL[(i * 3) % len(_CITY_POOL)]
        name = f"Bulk Demo Client {i:03d}"
        company = f"{name} — {city}"
        created = (date.today() - timedelta(days=i % 400)).isoformat()
        rows.append(
            ClientRow(
                id=cid,
                data={
                    "clientName": name,
                    "companyName": company,
                    "email": f"bulk-client-{i:03d}@demo-logistics.example",
                    "phone": f"+1-555-{(i % 800) + 100:03d}-{(i * 7919) % 10000:04d}",
                    "address": f"{100 + (i % 900)} Demo Street",
                    "city": city,
                    "state": "",
                    "country": country,
                    "industry": _INDUSTRIES[i % len(_INDUSTRIES)],
                    "contactPersonName": f"Contact {i}",
                    "contactPersonRole": "Logistics",
                    "contactPersonEmail": f"contact{i:03d}@demo-logistics.example",
                    "notes": f"Auto-generated bulk demo record #{i}.",
                    "status": "Inactive" if i % 7 == 0 else "Active",
                    "createdAt": created,
                    "logoUrl": dicebear_company_logo(company),
                    "logoAlt": f"{company} logo",
                },
            )
        )
    return rows


def _bulk_enquiries() -> list[EnquiryRow]:
    cids = _all_demo_client_ids()
    services = ("air", "sea", "road", "multimodal")
    statuses = ("New", "In Progress", "Quoted", "Closed")
    priorities = ("Low", "Normal", "High", "Critical")
    modes = ("Express", "FCL", "FTL", "LCL")
    rows: list[EnquiryRow] = []
    for i in range(1, BULK_COUNT + 1):
        cid = cids[(i - 1) % len(cids)]
        o_city, o_ct = _CITY_POOL[i % len(_CITY_POOL)]
        d_city, d_ct = _CITY_POOL[(i + 5) % len(_CITY_POOL)]
        if o_city == d_city:
            d_city, d_ct = _CITY_POOL[(i + 7) % len(_CITY_POOL)]
        svc = services[i % len(services)]
        budget = float(2000 + (i * 137) % 80000)
        created = (date.today() - timedelta(days=(i * 2) % 200)).isoformat()
        follow = (date.today() + timedelta(days=(i % 30) - 5)).isoformat()
        w_kg = float(100 + (i * 17) % 20000)
        vol = round(0.5 + (i % 50) * 0.8, 2)
        tags_pool = (
            [],
            ["Cargo Insurance"],
            ["Inland Transport Origin"],
            ["Customs Clearance (Dest.)", "Warehousing"],
        )
        extra_tags = tags_pool[i % len(tags_pool)]
        rows.append(
            EnquiryRow(
                id=f"{BULK_ENQ_PREFIX}{i:03d}",
                data={
                    "enquiryId": f"ENQ-BULK-{i:04d}",
                    "inquiryDate": created,
                    "enquiryTemplate": ("sea_import", "air_export", "others", "sea_import")[i % 4],
                    "salesChannel": ("direct", "partner", "")[i % 3],
                    "status": statuses[i % len(statuses)],
                    "serviceType": svc,
                    "modeType": modes[i % len(modes)],
                    "shipmentType": ("export", "import", "domestic")[i % 3],
                    "incoterms": ("FOB", "CIF", "EXW", "DAP")[i % 4],
                    "priority": priorities[i % len(priorities)],
                    "originCity": o_city,
                    "originCountry": o_ct,
                    "originState": f"Region-{i % 12}" if o_ct in ("US", "DE", "CN") else "",
                    "originPortCode": f"P{i % 9000:04d}",
                    "destCity": d_city,
                    "destCountry": d_ct,
                    "destState": f"Area-{(i + 3) % 15}" if d_ct in ("US", "DE", "NL") else "",
                    "destPortCode": f"D{(i * 7) % 9000:04d}",
                    "pickupType": "door" if i % 2 == 0 else "port",
                    "deliveryType": "port" if i % 3 == 0 else "door",
                    "pickupAddress": f"{100 + i} Demo Pickup St, {o_city}",
                    "deliveryAddress": f"{200 + i} Demo Delivery Ave, {d_city}",
                    "commodityDescription": f"General cargo — bulk seed {i} ({svc})",
                    "description": f"{svc} move #{i}",
                    "hsCode": f"8471.{(i % 89) + 10}",
                    "cargoCategory": ("general", "fragile", "perishable", "dangerous")[i % 4],
                    "packagingType": ("cartons", "pallets", "drums", "loose")[i % 4],
                    "numPackages": 1 + (i % 120),
                    "dimLengthCm": 80 + (i % 200),
                    "dimWidthCm": 60 + (i % 150),
                    "dimHeightCm": 70 + (i % 180),
                    "dimensionsDescription": f"Bulk demo dims vary — row {i}",
                    "grossWeightKg": w_kg,
                    "netWeightKg": round(w_kg * 0.92, 2),
                    "volumeCbm": vol,
                    "grossWeightTons": round(w_kg / 1000, 3),
                    "cargoReadiness": (date.today() + timedelta(days=(i % 20))).isoformat(),
                    "enquiryRemarks": f"Auto bulk remark #{i}: please quote all-in.",
                    "requiredSchedule": "Standard demo SLA — no live booking",
                    "dangerousGoods": "yes" if i % 17 == 0 else "no",
                    "unNumber": "UN1263" if i % 17 == 0 else "",
                    "imoClass": "3" if i % 17 == 0 else "",
                    "tempControlRequired": "yes" if i % 11 == 0 else "no",
                    "tempRange": "+2°C to +8°C" if i % 11 == 0 else "",
                    "insuranceRequired": "yes" if i % 9 == 0 else "no",
                    "customsClearanceOrigin": "yes" if i % 13 == 0 else "no",
                    "customsClearanceDestination": "yes" if i % 10 == 0 else "no",
                    "specialHandling": "Demo only — stack height 1.6m max" if i % 7 == 0 else "",
                    "airChargeableWeightKg": round(w_kg * 1.15, 1) if svc == "air" else "",
                    "airIataCode": "DEMO" if svc == "air" else "",
                    "airPreferredAirline": "Any IATA carrier" if svc == "air" else "",
                    "airTransitTimeReq": "72h" if svc == "air" else "",
                    "airAwbType": "house",
                    "seaContainerType": ("40HC", "20GP", "40GP")[i % 3] if svc in ("sea", "multimodal") else "40HC",
                    "seaContainerCount": (i % 3) if svc in ("sea", "multimodal") else 0,
                    "seaLoadType": ("FCL", "LCL")[i % 2] if svc in ("sea", "multimodal") else "FCL",
                    "seaShippingLinePreference": "No preference (demo)",
                    "seaFreeDaysRequired": "14" if svc in ("sea", "multimodal") else "",
                    "seaPortCutoffDate": (date.today() + timedelta(days=(i % 14) + 3)).isoformat()
                    if svc in ("sea", "multimodal")
                    else "",
                    "roadVehicleType": "Standard truck" if svc == "road" else "",
                    "roadLoadType": ("full", "half")[i % 2] if svc == "road" else "full",
                    "roadRoutePreference": f"Highway corridor {i % 5}" if svc == "road" else "",
                    "roadTransitDays": 1 + (i % 5) if svc == "road" else "",
                    "roadTollPermitNotes": "EU vignette OK" if svc == "road" and d_ct == "DE" else "",
                    "targetBudget": budget,
                    "expectedValue": budget,
                    "currency": ("USD", "EUR", "USD")[i % 3],
                    "paymentTerms": ("Net 30", "Net 14", "Prepaid")[i % 3],
                    "paymentCollectMode": ("prepaid", "collect")[i % 2],
                    "attachHasInvoice": i % 4 == 0,
                    "attachHasPackingList": i % 3 != 0,
                    "attachHasMsds": i % 17 == 0,
                    "attachOtherNotes": f"Bulk row {i} attachments placeholder",
                    "readyDate": (date.today() + timedelta(days=(i % 45))).isoformat(),
                    "pickupDate": (date.today() + timedelta(days=(i % 30))).isoformat(),
                    "expectedDeliveryDate": (date.today() + timedelta(days=40 + (i % 20))).isoformat(),
                    "deadlineSla": (date.today() + timedelta(days=(i % 10))).isoformat(),
                    "followUpDate": follow,
                    "enquiryReceivedAt": f"{created}T{(8 + (i % 8)):02d}:00",
                    "quoteSentAt": f"{created}T{(14 + (i % 6)):02d}:00" if i % 2 == 0 else "",
                    "branchLocation": f"Demo branch {(i % 6) + 1}",
                    "internalNotes": f"Bulk autogen #{i} — not a real move",
                    "source": ("website", "call", "email", "referral")[i % 4],
                    "clientId": cid,
                    "customerCompanyName": f"Bulk Demo Co {i:04d}",
                    "contactPerson": f"Shipper {i}",
                    "contactEmail": f"shipper{i:03d}@example.com",
                    "contactPhone": f"+1-555-01{(i % 90):02d}",
                    "gstTaxId": f"DEMO-TAX-{i:05d}",
                    "customerType": ("shipper", "consignee", "agent")[i % 3],
                    "lineItems": [
                        {
                            "id": f"li_bulk_{i}",
                            "description": f"{svc.title()} line — bulk #{i}",
                            "quantity": 1,
                            "assignedPricingUserIds": [],
                        }
                    ],
                    "assignedPricingUserIds": [],
                    "pricingByUser": {},
                    "cargoLines": [
                        {
                            "id": f"cargo_bulk_{i}_a",
                            "description": f"Primary lot — {o_city} to {d_city}",
                            "packagingType": "pallets",
                            "quantity": 1 + (i % 8),
                            "grossWeightKg": round(w_kg * 0.55, 2),
                            "volumeCbm": round(vol * 0.5, 2),
                            "dimensionsCm": f"{100 + (i % 40)}×80×{(i % 60) + 100}",
                        },
                        {
                            "id": f"cargo_bulk_{i}_b",
                            "description": f"Secondary lot — overflow cartons #{i}",
                            "packagingType": "cartons",
                            "quantity": 4 + (i % 20),
                            "grossWeightKg": round(w_kg * 0.45, 2),
                            "volumeCbm": round(vol * 0.5, 2),
                            "dimensionsCm": "60×40×40",
                        },
                    ],
                    "additionalServiceTags": extra_tags,
                    "routePolText": f"{o_city} ({o_ct})",
                    "routePodText": f"{d_city} ({d_ct})",
                    "enquiryValidUntil": (date.today() + timedelta(days=25 + (i % 20))).isoformat(),
                    "declaredValueUsd": round(budget * 1.25, 2),
                    "createdAt": created,
                },
            )
        )
    return rows


def _bulk_quotations() -> list[QuotationRow]:
    cids = _all_demo_client_ids()
    statuses = ("Draft", "Sent", "Accepted", "Rejected")
    rows: list[QuotationRow] = []
    for i in range(1, BULK_COUNT + 1):
        cid = cids[(i - 1) % len(cids)]
        eid = f"{BULK_ENQ_PREFIX}{i:03d}"
        st = statuses[i % len(statuses)]
        currency = ("USD", "EUR", "GBP")[i % 3]
        n_items = 1 + (i % 3)
        items: list[dict] = []
        subtotal = 0.0
        tax_total = 0.0
        for j in range(n_items):
            qty = 1 + (j + i) % 4
            price = float(500 + ((i + j) * 211) % 12000)
            tax_pct = (0, 0, 10, 19, 21)[(i + j) % 5]
            line_base = qty * price
            line_tax = line_base * (tax_pct / 100.0)
            subtotal += line_base
            tax_total += line_tax
            items.append(
                {
                    "name": f"Bulk line {j + 1} — quote {i}",
                    "quantity": qty,
                    "price": price,
                    "taxPercent": tax_pct,
                }
            )
        discount = float((i * 17) % 500) if st == "Sent" else 0.0
        total = subtotal + tax_total
        final_amt = max(0.0, total - discount)
        created = (date.today() - timedelta(days=(i * 3) % 180)).isoformat()
        data: dict = {
            "quoteId": f"Q-BULK-{i:04d}",
            "clientId": cid,
            "enquiryId": eid,
            "status": st,
            "currency": currency,
            "discount": discount,
            "items": items,
            "subtotal": round(subtotal, 2),
            "taxTotal": round(tax_total, 2),
            "total": round(total, 2),
            "finalAmount": round(final_amt, 2),
            "createdAt": created,
        }
        if st == "Sent":
            data["clientResponseToken"] = f"bulk-token-{i:04d}"
        if st == "Accepted":
            data["clientResponseToken"] = f"bulk-used-{i:04d}"
            data["clientRespondedAt"] = YESTERDAY + "T10:00:00Z"
            data["clientResponseAction"] = "Accepted"
        if st == "Rejected":
            data["clientResponseToken"] = f"bulk-rej-{i:04d}"
            data["clientRespondedAt"] = LAST_WEEK + "T15:00:00Z"
            data["clientResponseAction"] = "Rejected"
        rows.append(QuotationRow(id=f"{BULK_Q_PREFIX}{i:03d}", data=data))
    return rows


def _bulk_invoices() -> list[InvoiceRow]:
    cids = _all_demo_client_ids()
    rows: list[InvoiceRow] = []
    for i in range(1, BULK_COUNT + 1):
        cid = cids[(i - 1) % len(cids)]
        q_display = f"Q-BULK-{i:04d}"
        total = float(800 + (i * 293) % 95000)
        pay_roll = ("Paid", "Pending", "Overdue", "Pending")
        pay = pay_roll[i % len(pay_roll)]
        if pay == "Paid":
            paid, due_amt = total, 0.0
        elif pay == "Overdue":
            paid, due_amt = 0.0, total
        else:
            paid = round(total * ((i % 5) * 0.15), 2)
            due_amt = round(max(0.0, total - paid), 2)
        due_day = date.today() + timedelta(days=(i % 60) - 30)
        rows.append(
            InvoiceRow(
                id=f"{BULK_INV_PREFIX}{i:03d}",
                data={
                    "invoiceId": f"INV-BULK-{i:04d}",
                    "clientId": cid,
                    "quoteId": q_display,
                    "billingAddress": f"Bulk billing address {i}, Demo City",
                    "currency": ("USD", "EUR")[i % 2],
                    "items": [
                        {
                            "name": f"Bulk invoice charges #{i}",
                            "quantity": 1,
                            "price": total,
                            "taxPercent": 0,
                        }
                    ],
                    "totalAmount": round(total, 2),
                    "paidAmount": paid,
                    "dueAmount": due_amt,
                    "paymentStatus": pay,
                    "paymentMethod": ("Bank transfer", "SEPA", "Wire")[i % 3],
                    "dueDate": due_day.isoformat(),
                    "createdAt": (date.today() - timedelta(days=(i * 2) % 120)).isoformat(),
                },
            )
        )
    return rows


def _templates():
    return [
        EmailTemplateRow(
            id="sample_tpl_client_note",
            data={
                "category": "client_email",
                "name": "Sample — Client update",
                "subjectTemplate": "Update for {{clientCompanyName}}",
                "bodyHtmlTemplate": "<p>Hello {{recipientName}},</p><p>{{body}}</p><p>— {{senderName}}</p>",
                "isDefault": False,
                "branding": {
                    "companyName": "Demo Logistics Co",
                    "accentColor": "#2563eb",
                    "logoUrl": dicebear_company_logo("Demo Logistics Co"),
                    "logoAlt": "Demo Logistics Co logo",
                    "logoMaxWidthPx": 160,
                    "headerTagline": "We move what matters",
                    "footerNote": "This is sample data from the demo seed.",
                },
            },
        ),
        EmailTemplateRow(
            id="sample_tpl_quote_client",
            data={
                "category": "quotation",
                "name": "Sample — Client quotation",
                "subjectTemplate": "Quotation {{quoteId}} — {{clientCompanyName}}",
                "bodyHtmlTemplate": "<p>Dear {{clientContactName}},</p>{{clientDetailsBlock}}{{quotationLineItemsBlock}}{{quotationTotalsBlock}}{{quotationClientActions}}",
                "isDefault": False,
                "branding": {
                    "companyName": "Demo Logistics Co",
                    "accentColor": "#059669",
                    "logoUrl": dicebear_company_logo("Demo Logistics quotations"),
                    "logoAlt": "Demo Logistics Co logo",
                    "logoMaxWidthPx": 160,
                    "headerTagline": "",
                    "footerNote": "",
                },
            },
        ),
    ]


def _settings_brevo_ui():
    return [
        AppSettingsRow(
            key="brevo",
            data={
                "senderEmail": "noreply@demo-logistics.local",
                "senderName": "Demo Logistics",
                "replyToEmail": "support@demo-logistics.local",
                "organizationName": "Demo Logistics Co",
                "apiKey": "",
            },
        ),
        AppSettingsRow(
            key="ui",
            data={"sidebarCollapsed": False, "dashboardShowKpis": True},
        ),
    ]


