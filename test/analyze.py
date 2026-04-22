"""
Parliament Game Balance Analyser
Run from project root: python test/analyze.py
Writes 5 CSVs to test/output/
"""

import csv
import math
import random
import statistics
from pathlib import Path

# ── configuration ─────────────────────────────────────────────────────────────

OUT        = Path(__file__).parent / "output"
BILL_LIMIT = 10
N_SIMS     = 10_000

OUT.mkdir(parents=True, exist_ok=True)

# ── data (mirrors js/data.js) ─────────────────────────────────────────────────

PARTIES = [
    dict(name="People's Alliance",  seats=35,  economic=-9, social=-7),
    dict(name="Socialist Party",     seats=133, economic=-4, social=-4),
    dict(name="Renewal",             seats=83,  economic=2,  social=-5),
    dict(name="Christian Democrats", seats=145, economic=4,  social=5),
    dict(name="National Front",      seats=70,  economic=1,  social=9),
]
PARTY = {p["name"]: p for p in PARTIES}

COALITIONS = [
    dict(id="left",  parties=["People's Alliance",  "Socialist Party",    "Renewal"]),
    dict(id="grand", parties=["Socialist Party",     "Christian Democrats"]),
    dict(id="right", parties=["Renewal",             "Christian Democrats", "National Front"]),
]

PARTY_COALITIONS = {
    "People's Alliance":  ["left"],
    "Socialist Party":    ["grand", "left"],
    "Renewal":            ["left", "right"],
    "Christian Democrats":["grand", "right"],
    "National Front":     ["right"],
}

BILLS = [
    dict(title="Fund public transit expansion",  type="economic", score=-3),
    dict(title="Raise the minimum wage",          type="economic", score=-5),
    dict(title="Cut corporate tax rate",          type="economic", score=+6),
    dict(title="Ratify climate accord",           type="social",   score=-4),
    dict(title="Expand healthcare coverage",      type="economic", score=-5),
    dict(title="Tighten border controls",         type="social",   score=+7),
    dict(title="Invest in renewable energy",      type="economic", score=-3),
    dict(title="Deregulate financial markets",    type="economic", score=+7),
    dict(title="Fund public education",           type="economic", score=-4),
    dict(title="Increase defense spending",       type="social",   score=+4),
    dict(title="Legalize cannabis nationwide",    type="social",   score=-6),
    dict(title="Reform the tax code",             type="economic", score=+2),
    dict(title="Ban single-use plastics",         type="social",   score=-3),
    dict(title="Expand rural broadband",          type="economic", score=-1),
    dict(title="Privatize postal service",        type="economic", score=+8),
]

TOTAL_SEATS = sum(p["seats"] for p in PARTIES)
MAJORITY    = TOTAL_SEATS // 2 + 1

# ── pure helpers ──────────────────────────────────────────────────────────────

def vuf(bill, partner, loyalty_pct):
    """Fraction of partner's seats that vote Aye."""
    L = loyalty_pct / 100
    k = abs(bill["score"] - partner[bill["type"]])
    c = max(0.0, 1 - k / 10)
    return L + (1 - L) * c

def loyalty_delta(bill, partner):
    d = abs(bill["score"] - partner[bill["type"]])
    return max(-20.0, min(5.0, 5 - d * 1.5))

def expected_ayes(bill, loyalty, player, partners):
    ayes = player["seats"]
    for p in partners:
        ayes += int(vuf(bill, p, loyalty[p["name"]]) * p["seats"])
    return ayes

def would_pass(bill, loyalty, player, partners):
    return expected_ayes(bill, loyalty, player, partners) >= MAJORITY

# ── simulation strategies ─────────────────────────────────────────────────────
#
# random       — pick uniformly at random
# pass-focused — pick bill that gets the most coalition ayes (best chance of passing)
# loyal        — pick bill that minimises total loyalty damage to partners

def choose_bill(strategy, hand, player, partners, loyalty):
    if strategy == "random":
        return random.choice(hand)
    if strategy == "pass-focused":
        return max(hand, key=lambda b: expected_ayes(b, loyalty, player, partners))
    # loyal
    return max(hand, key=lambda b: sum(loyalty_delta(b, p) for p in partners))

# ── CSV helper ────────────────────────────────────────────────────────────────

def write_csv(name, rows):
    path = OUT / name
    with open(path, "w", newline="", encoding="utf-8") as f:
        csv.writer(f).writerows(rows)
    print(f"  ok  {name}  ({len(rows)-1} data rows)")

# ── all (party, coalition, partners) combos ───────────────────────────────────

COMBOS = []
for party in PARTIES:
    for coal_id in PARTY_COALITIONS[party["name"]]:
        coal     = next(c for c in COALITIONS if c["id"] == coal_id)
        partners = [PARTY[n] for n in coal["parties"] if n != party["name"]]
        COMBOS.append(dict(party=party, coal=coal, partners=partners))

# ── 1. matrix.csv ─────────────────────────────────────────────────────────────
# For each bill: VUF at key loyalty levels and loyalty_delta, per party.

print("\n1. Compatibility matrix")
write_csv("matrix.csv", [
    ["Bill", "Score", "Type",
     *[f"{p['name']}_vuf_L100" for p in PARTIES],
     *[f"{p['name']}_vuf_L50"  for p in PARTIES],
     *[f"{p['name']}_vuf_L0"   for p in PARTIES],
     *[f"{p['name']}_loyalty_delta" for p in PARTIES]],
    *[[b["title"], b["score"], b["type"],
       *[f"{vuf(b,p,100):.2f}" for p in PARTIES],
       *[f"{vuf(b,p,50):.2f}"  for p in PARTIES],
       *[f"{vuf(b,p,0):.2f}"   for p in PARTIES],
       *[f"{loyalty_delta(b,p):.2f}" for p in PARTIES]]
      for b in BILLS],
])

# ── 2. coalition_context.csv ──────────────────────────────────────────────────

print("2. Coalition context")
rows = [["Party", "Coalition", "Bill", "Score", "Type",
         "Passes_at_full_loyalty", "Expected_ayes_full_loyalty",
         "Partner_loyalty_sum", "Partner_loyalty_min", "Partner_details"]]
for combo in COMBOS:
    party, coal, partners = combo["party"], combo["coal"], combo["partners"]
    full = {p["name"]: 100 for p in partners}
    for b in BILLS:
        deltas  = [loyalty_delta(b, p) for p in partners]
        lsum    = sum(deltas)
        lmin    = min(deltas) if deltas else "N/A"
        details = " | ".join(f"{p['name']}:{d:.1f}" for p, d in zip(partners, deltas))
        rows.append([
            party["name"], coal["id"], b["title"], b["score"], b["type"],
            "yes" if would_pass(b, full, party, partners) else "no",
            expected_ayes(b, full, party, partners),
            f"{lsum:.2f}",
            f"{lmin:.2f}" if isinstance(lmin, float) else lmin,
            details,
        ])
write_csv("coalition_context.csv", rows)

# ── 3. fragility.csv ─────────────────────────────────────────────────────────

print("3. Fragility analysis")
rows = [["Party", "Coalition", "Total_seats", "Majority", "Margin_at_100pct",
         "P1_name", "P1_seats", "P1_loyalty_floor_pct",
         "P2_name", "P2_seats", "P2_loyalty_floor_pct"]]
for combo in COMBOS:
    party, coal, partners = combo["party"], combo["coal"], combo["partners"]
    total  = party["seats"] + sum(p["seats"] for p in partners)
    margin = total - MAJORITY
    floors = []
    for i, p in enumerate(partners):
        other_ayes = sum(q["seats"] for j, q in enumerate(partners) if j != i)
        needed     = MAJORITY - party["seats"] - other_ayes
        if needed <= 0:
            floors.append(0)
        else:
            floors.append(max(0, min(100, math.ceil(needed / p["seats"] * 100))))
    rows.append([
        party["name"], coal["id"], total, MAJORITY, margin,
        partners[0]["name"]  if len(partners) > 0 else "",
        partners[0]["seats"] if len(partners) > 0 else "",
        floors[0]            if len(partners) > 0 else "",
        partners[1]["name"]  if len(partners) > 1 else "",
        partners[1]["seats"] if len(partners) > 1 else "",
        floors[1]            if len(partners) > 1 else "",
    ])
write_csv("fragility.csv", rows)

# ── 4. simulation_summary.csv + simulation_trajectory.csv ────────────────────

print("4. Simulation\n")

strategies      = ["random", "pass-focused", "loyal"]
summary_rows    = [["Party", "Coalition", "Strategy", "N",
                    "Mean_bills_passed", "Std_bills_passed", "Min_bills_passed", "Max_bills_passed",
                    "P1_name", "P1_mean_final_loyalty",
                    "P2_name", "P2_mean_final_loyalty"]]
trajectory_rows = [["Party", "Coalition", "Strategy", "Turn",
                    "Mean_cumulative_passes",
                    "P1_name", "P1_mean_loyalty",
                    "P2_name", "P2_mean_loyalty"]]

for combo in COMBOS:
    party, coal, partners = combo["party"], combo["coal"], combo["partners"]
    for strategy in strategies:
        label = f"{party['name'][:22]:<22}  {coal['id']:<6}  {strategy:<13}"
        print(f"  {label}", end="  ", flush=True)

        bills_passed_list = []
        final_loyalties   = [[] for _ in partners]
        turn_passed       = [[] for _ in range(BILL_LIMIT)]
        turn_loyalties    = [[[] for _ in range(BILL_LIMIT)] for _ in partners]

        for _ in range(N_SIMS):
            loyalty      = {p["name"]: 100.0 for p in partners}
            cumul_passed = 0

            for t in range(BILL_LIMIT):
                hand   = random.sample(BILLS, 3)
                bill   = choose_bill(strategy, hand, party, partners, loyalty)
                ayes   = expected_ayes(bill, loyalty, party, partners)
                passed = ayes >= MAJORITY

                if passed:
                    for p in partners:
                        delta = loyalty_delta(bill, p)
                        loyalty[p["name"]] = max(0.0, min(100.0, loyalty[p["name"]] + delta))
                    cumul_passed += 1

                turn_passed[t].append(cumul_passed)
                for i, p in enumerate(partners):
                    turn_loyalties[i][t].append(loyalty[p["name"]])

            bills_passed_list.append(cumul_passed)
            for i, p in enumerate(partners):
                final_loyalties[i].append(loyalty[p["name"]])

        mu  = statistics.mean(bills_passed_list)
        sig = statistics.stdev(bills_passed_list) if len(bills_passed_list) > 1 else 0

        summary_rows.append([
            party["name"], coal["id"], strategy, N_SIMS,
            f"{mu:.2f}", f"{sig:.2f}",
            min(bills_passed_list), max(bills_passed_list),
            partners[0]["name"]                               if len(partners) > 0 else "",
            f"{statistics.mean(final_loyalties[0]):.1f}"     if len(partners) > 0 else "",
            partners[1]["name"]                               if len(partners) > 1 else "",
            f"{statistics.mean(final_loyalties[1]):.1f}"     if len(partners) > 1 else "",
        ])

        for t in range(BILL_LIMIT):
            trajectory_rows.append([
                party["name"], coal["id"], strategy, t + 1,
                f"{statistics.mean(turn_passed[t]):.2f}",
                partners[0]["name"]                              if len(partners) > 0 else "",
                f"{statistics.mean(turn_loyalties[0][t]):.1f}" if len(partners) > 0 else "",
                partners[1]["name"]                              if len(partners) > 1 else "",
                f"{statistics.mean(turn_loyalties[1][t]):.1f}" if len(partners) > 1 else "",
            ])

        print(f"mean bills passed {mu:.1f}  P1 final loyalty {statistics.mean(final_loyalties[0]):.1f}%" if partners else f"mean bills passed {mu:.1f}")
    print()

write_csv("simulation_summary.csv", summary_rows)
write_csv("simulation_trajectory.csv", trajectory_rows)
print("\nDone. Open test/output/ to inspect results.")
