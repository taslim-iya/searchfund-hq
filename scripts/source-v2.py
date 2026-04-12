#!/usr/bin/env python3
import json, time, urllib.request, base64, sys

CH_KEY = "6d4778d5-6ac2-4de8-9209-e71bbfb00e8c"
AUTH = base64.b64encode(f"{CH_KEY}:".encode()).decode()
BASE = "https://api.company-information.service.gov.uk/advanced-search/companies"
OUT = "src/data/mass-companies.json"

SICS = {
    "62020":"IT Consultancy","62090":"Other IT Services","62012":"Business & IT Software",
    "62011":"Software Development","95110":"Computer Repair",
    "86230":"Dental Practice","86210":"General Medical Practice","86900":"Other Health",
    "87100":"Residential Nursing","87300":"Residential Care","87900":"Other Residential Care",
    "88100":"Social Work","88990":"Other Social Work",
    "81100":"Facilities Management","81210":"General Cleaning","81220":"Industrial Cleaning",
    "81291":"Pest Control","81299":"Other Cleaning","80100":"Private Security","80200":"Security Systems",
    "69201":"Accounting & Auditing","69202":"Tax Consultancy","69203":"Bookkeeping",
    "70229":"Management Consultancy","78200":"Temp Employment Agency","78100":"Employment Placement",
    "85100":"Pre-primary Education","85590":"Other Education",
    "43210":"Electrical Installation","43220":"Plumbing/Heating/AC","43290":"Other Installation",
    "43320":"Joinery","43341":"Painting","43390":"Building Completion","43999":"Specialist Construction",
    "75000":"Veterinary","56101":"Licensed Restaurant","56210":"Event Catering",
    "45200":"Car Repair","68310":"Real Estate Agency","68201":"Letting Property",
    "49410":"Freight Transport","52100":"Warehousing",
    "38110":"Waste Collection","81300":"Landscape Services",
    "25620":"Machining","25990":"Fabricated Metal","22290":"Plastic Products",
    "10890":"Other Food Products","10710":"Bread & Pastry",
    "71111":"Architecture","71121":"Engineering Design","71129":"Other Engineering",
    "71200":"Technical Testing","73110":"Advertising Agency","73120":"Media Representation",
    "74100":"Specialised Design","74201":"Photography","74209":"Other Photography",
    "77110":"Car Rental","77210":"Leisure Goods Rental","77310":"Agriculture Machinery Rental",
    "79110":"Travel Agency","79120":"Tour Operator","79900":"Other Travel",
    "82110":"Admin Services","82190":"Photocopying/Office Support","82200":"Call Centre",
    "82300":"Conference Organiser","82990":"Other Business Support",
    "96010":"Laundry","96020":"Hairdressing/Beauty","96040":"Physical Wellbeing",
    "93110":"Sports Facilities","93130":"Fitness Facilities","93290":"Other Amusement",
}

def search(sic, start=0, size=100):
    url = f"{BASE}?company_status=active&incorporated_from=1995-01-01&incorporated_to=2020-12-31&sic_codes={sic}&size={size}&start_index={start}"
    req = urllib.request.Request(url, headers={"Authorization": f"Basic {AUTH}"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())
    except Exception as e:
        print(f"  ERR: {e}", file=sys.stderr)
        return {"items": []}

companies = {}
reqs = 0

for sic, sector in SICS.items():
    print(f"[{sic}] {sector}", file=sys.stderr, flush=True)
    for start in range(0, 300, 100):
        data = search(sic, start, 100)
        reqs += 1
        items = data.get("items", [])
        for item in items:
            num = item.get("company_number", "")
            if num in companies: continue
            addr = item.get("registered_office_address", {})
            companies[num] = {
                "n": item.get("company_name", ""),
                "num": num,
                "sic": sic,
                "sec": sector,
                "cr": item.get("date_of_creation", ""),
                "loc": addr.get("locality", ""),
                "reg": addr.get("region", ""),
                "pc": addr.get("postal_code", ""),
                "addr": ", ".join(filter(None, [addr.get("address_line_1",""),addr.get("locality",""),addr.get("region",""),addr.get("postal_code","")])),
                "type": item.get("company_type", ""),
            }
        if len(items) < 100: break
        time.sleep(0.5)
    
    print(f"  → {len(companies)} companies ({reqs} reqs)", file=sys.stderr, flush=True)
    if len(companies) >= 10000: break
    time.sleep(0.3)

# Write output file directly
with open(OUT, "w") as f:
    json.dump(list(companies.values()), f)

print(f"\nDONE: {len(companies)} companies, {reqs} requests", file=sys.stderr, flush=True)
