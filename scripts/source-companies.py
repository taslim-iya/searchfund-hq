#!/usr/bin/env python3
"""
Mass source UK SMEs from Companies House Advanced Search API.
Target: 10,000 companies across fragmented, acquirable sectors.
Rate limit: 600 requests per 5 minutes — we'll stay well under.
"""

import json
import time
import urllib.request
import base64
import sys
import os

CH_KEY = "6d4778d5-6ac2-4de8-9209-e71bbfb00e8c"
AUTH = base64.b64encode(f"{CH_KEY}:".encode()).decode()

# SIC codes for search fund target sectors (fragmented, acquirable SMEs)
SIC_SECTORS = {
    # IT & Technology
    "62020": "IT Consultancy",
    "62090": "Other IT Services",
    "62012": "Business & IT Software",
    "62011": "Software Development",
    "95110": "Computer Repair",
    # Healthcare
    "86230": "Dental Practice",
    "86210": "General Medical Practice",
    "86900": "Other Health Activities",
    "87100": "Residential Nursing Care",
    "87300": "Residential Care (Elderly/Disabled)",
    "87900": "Other Residential Care",
    "88100": "Social Work (Elderly/Disabled)",
    # B2B Services
    "81100": "Facilities Management",
    "81210": "General Cleaning",
    "81220": "Industrial Cleaning",
    "81291": "Pest Control",
    "81299": "Other Cleaning",
    "80100": "Private Security",
    "80200": "Security Systems",
    # Professional Services
    "69201": "Accounting & Auditing",
    "69202": "Tax Consultancy",
    "69203": "Bookkeeping",
    "69101": "Legal Activities",
    "70210": "Public Relations",
    "70229": "Management Consultancy",
    "78200": "Temporary Employment Agency",
    "78100": "Employment Placement",
    # Education & Childcare
    "85100": "Pre-primary Education",
    "85200": "Primary Education",
    "85310": "General Secondary Education",
    "85590": "Other Education NEC",
    "85600": "Educational Support",
    # Trades & Construction
    "43210": "Electrical Installation",
    "43220": "Plumbing, Heating, AC",
    "43290": "Other Construction Installation",
    "43310": "Plastering",
    "43320": "Joinery Installation",
    "43341": "Painting",
    "43390": "Other Building Completion",
    "43110": "Demolition",
    "43999": "Other Specialised Construction",
    # Veterinary
    "75000": "Veterinary Activities",
    # Food & Hospitality
    "56101": "Licensed Restaurants",
    "56102": "Unlicensed Restaurants",
    "56210": "Event Catering",
    "56302": "Public Houses & Bars",
    "10890": "Other Food Products",
    "10710": "Bread & Pastry",
    # Automotive
    "45200": "Car Maintenance & Repair",
    "45111": "New Car Sales",
    "45400": "Motorcycle Sale/Maintenance",
    # Property & Estate
    "68100": "Buying & Selling Property",
    "68201": "Letting/Operating Property",
    "68310": "Real Estate Agencies",
    # Logistics & Transport
    "49410": "Freight Transport by Road",
    "52100": "Warehousing",
    "53100": "Postal Activities",
    # Waste & Environment
    "38110": "Non-Hazardous Waste Collection",
    "38120": "Hazardous Waste Collection",
    "81300": "Landscape Service Activities",
    # Manufacturing (niche)
    "25620": "Machining",
    "25990": "Other Fabricated Metal",
    "22290": "Other Plastic Products",
    "25110": "Metal Structures",
}

BASE_URL = "https://api.company-information.service.gov.uk/advanced-search/companies"

def search(sic_code, start=0, size=100):
    url = f"{BASE_URL}?company_status=active&incorporated_from=1995-01-01&incorporated_to=2020-12-31&sic_codes={sic_code}&size={size}&start_index={start}"
    req = urllib.request.Request(url, headers={"Authorization": f"Basic {AUTH}"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except Exception as e:
        print(f"  Error: {e}", file=sys.stderr)
        return {"items": []}

all_companies = {}
total_requests = 0

for sic, sector in SIC_SECTORS.items():
    print(f"[{sic}] {sector}...", file=sys.stderr)
    
    for start in range(0, 300, 100):  # Up to 300 per SIC code
        data = search(sic, start=start, size=100)
        total_requests += 1
        items = data.get("items", [])
        
        for item in items:
            num = item.get("company_number", "")
            if num in all_companies:
                continue
            
            addr = item.get("registered_office_address", {})
            all_companies[num] = {
                "n": item.get("company_name", ""),
                "num": num,
                "sic": sic,
                "sec": sector,
                "cr": item.get("date_of_creation", ""),
                "loc": addr.get("locality", ""),
                "reg": addr.get("region", ""),
                "pc": addr.get("postal_code", ""),
                "addr": ", ".join(filter(None, [
                    addr.get("address_line_1", ""),
                    addr.get("locality", ""),
                    addr.get("region", ""),
                    addr.get("postal_code", "")
                ])),
                "type": item.get("company_type", ""),
            }
        
        if len(items) < 100:
            break
        
        # Rate limiting: stay under 600/5min = 2/sec
        time.sleep(0.5)
    
    # Progress
    print(f"  → {len(all_companies)} total companies so far ({total_requests} requests)", file=sys.stderr)
    
    if len(all_companies) >= 10000:
        break
    
    time.sleep(0.3)

# Output
print(json.dumps(list(all_companies.values())))
print(f"\nDone: {len(all_companies)} companies from {total_requests} requests", file=sys.stderr)
