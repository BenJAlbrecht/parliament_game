"""
Parliament Game Balance Analyser  —  rebuilt for 41-bill, 8-dimension system
Run from project root: python test/analyze.py
Writes CSVs to test/output/
"""

import csv
import math
import random
import statistics
from pathlib import Path

# ── configuration ──────────────────────────────────────────────────────────────

OUT        = Path(__file__).parent / "output"
BILL_LIMIT = 10
N_SIMS     = 10_000

OUT.mkdir(parents=True, exist_ok=True)

# ── data (mirrors src/lib/data.js) ─────────────────────────────────────────────

STARTING_POLICY = {
    'wages_unions':      2,
    'market_regulation': 2,
    'public_services':   3,
    'fiscal_policy':     2,
    'border_policy':     3,
    'social_policy':     3,
    'foreign_policy':    2,
    'civic_integrity':   3,
}

PARTIES = [
    dict(name="People's Alliance",   seats=35,  economic=-9, social=-7),
    dict(name='Socialist Party',      seats=133, economic=-4, social=-4),
    dict(name='Renewal',              seats=83,  economic=2,  social=-5),
    dict(name='Christian Democrats',  seats=145, economic=4,  social=5),
    dict(name='National Front',       seats=70,  economic=1,  social=9),
]
PARTY = {p['name']: p for p in PARTIES}

TOTAL_SEATS = sum(p['seats'] for p in PARTIES)
MAJORITY    = TOTAL_SEATS // 2 + 1

COALITIONS = [
    dict(id='left',  name='Left Bloc',        parties=["People's Alliance", 'Socialist Party', 'Renewal']),
    dict(id='grand', name='Grand Coalition',  parties=['Socialist Party', 'Christian Democrats']),
    dict(id='right', name='Right Bloc',       parties=['Renewal', 'Christian Democrats', 'National Front']),
]

BILLS = [
    # wages_unions
    dict(title='Raise the minimum wage',                       type='economic', score=-5, dimension='wages_unions',      delta=+1),
    dict(title='Expand collective bargaining rights',          type='economic', score=-4, dimension='wages_unions',      delta=+1),
    dict(title='Introduce productivity-linked pay floors',     type='economic', score=+2, dimension='wages_unions',      delta=+1),
    dict(title='Restrict strike action in essential services', type='social',   score=+6, dimension='wages_unions',      delta=-1),
    dict(title='Repeal union recognition law',                 type='economic', score=+8, dimension='wages_unions',      delta=-1),
    # market_regulation
    dict(title='Nationalise the energy sector',                type='economic', score=-7, dimension='market_regulation', delta=+1),
    dict(title='Expand antitrust enforcement',                 type='economic', score=-3, dimension='market_regulation', delta=+1),
    dict(title='Introduce consumer protection standards',      type='economic', score=-1, dimension='market_regulation', delta=+1),
    dict(title='Deregulate financial markets',                 type='economic', score=+7, dimension='market_regulation', delta=-1),
    dict(title='Privatize postal service',                     type='economic', score=+8, dimension='market_regulation', delta=-1),
    # public_services
    dict(title='Expand healthcare coverage',                   type='economic', score=-5, dimension='public_services',   delta=+1),
    dict(title='Fund public education',                        type='economic', score=-4, dimension='public_services',   delta=+1),
    dict(title='Expand rural broadband',                       type='economic', score=-1, dimension='public_services',   delta=+1),
    dict(title='Means-test welfare benefits',                  type='economic', score=+4, dimension='public_services',   delta=-1),
    dict(title='Introduce school voucher programme',           type='economic', score=+6, dimension='public_services',   delta=-1),
    # fiscal_policy
    dict(title='Introduce a wealth tax',                       type='economic', score=-7, dimension='fiscal_policy',     delta=+1),
    dict(title='Raise income tax on high earners',             type='economic', score=-4, dimension='fiscal_policy',     delta=+1),
    dict(title='Expand working family tax credits',            type='economic', score=-1, dimension='fiscal_policy',     delta=+1),
    dict(title='Cut corporate tax rate',                       type='economic', score=+6, dimension='fiscal_policy',     delta=-1),
    dict(title='Abolish inheritance tax',                      type='economic', score=+6, dimension='fiscal_policy',     delta=-1),
    # border_policy
    dict(title='Expand legal migration pathways',              type='social',   score=-5, dimension='border_policy',     delta=-1),
    dict(title='Abolish visa restrictions with treaty nations',type='social',   score=-3, dimension='border_policy',     delta=-1),
    dict(title='Introduce points-based immigration system',    type='social',   score=+2, dimension='border_policy',     delta=+1),
    dict(title='Tighten border controls',                      type='social',   score=+7, dimension='border_policy',     delta=+1),
    dict(title='Establish a national deportation scheme',      type='social',   score=+9, dimension='border_policy',     delta=+1),
    # social_policy
    dict(title='Legalize cannabis nationwide',                 type='social',   score=-6, dimension='social_policy',     delta=-1),
    dict(title='Decriminalise drug possession',                type='social',   score=-4, dimension='social_policy',     delta=-1),
    dict(title='Strengthen civil liberties protections',       type='social',   score=-2, dimension='social_policy',     delta=-1),
    dict(title='Restrict abortion access',                     type='social',   score=+7, dimension='social_policy',     delta=+1),
    dict(title='Introduce religious exemptions in civil law',  type='social',   score=+6, dimension='social_policy',     delta=+1),
    # foreign_policy
    dict(title='Deepen European integration',                  type='social',   score=-6, dimension='foreign_policy',    delta=-1),
    dict(title='Join international climate framework',         type='social',   score=-4, dimension='foreign_policy',    delta=-1),
    dict(title='Ratify international human rights protocols',  type='social',   score=-2, dimension='foreign_policy',    delta=-1),
    dict(title='Increase defense spending',                    type='social',   score=+5, dimension='foreign_policy',    delta=+1),
    dict(title='Impose import tariffs on foreign goods',       type='economic', score=+3, dimension='foreign_policy',    delta=+1),
    dict(title='Withdraw from international court jurisdiction',type='social',  score=+7, dimension='foreign_policy',    delta=+1),
    # civic_integrity
    dict(title='Anti-Corruption Commission Act',               type='social',   score=-4, dimension='civic_integrity',   delta=+1),
    dict(title='Electoral Reform and Proportional Vote',       type='social',   score=-3, dimension='civic_integrity',   delta=+1),
    dict(title='Lobbying transparency register',               type='social',   score=-2, dimension='civic_integrity',   delta=+1),
    dict(title='Emergency Executive Powers Act',               type='social',   score=+6, dimension='civic_integrity',   delta=-1),
    dict(title='Repeal judicial review powers',                type='social',   score=+7, dimension='civic_integrity',   delta=-1),
]

# Mandate check functions — mirror data.js
# check(policy_state, stats) -> bool
# stats keys: billsPassed, leftBillsPassed, domainsPassedCount, turnsAbstained, allPartnersLoyalAbove50
MANDATES = {
    "People's Alliance": [
        dict(id='seize_the_means', title='Seize the Means',
             check=lambda ps, st: ps['market_regulation'] >= 3 and ps['wages_unions'] >= 3),
        dict(id='no_surrender',    title='No Surrender',
             check=lambda ps, st: st['turnsAbstained'] == 0),
    ],
    'Socialist Party': [
        dict(id='build_welfare',  title='Build the Welfare State',
             check=lambda ps, st: ps['public_services'] >= 4 and st['billsPassed'] >= 5),
        dict(id='steady_hand',    title='Steady Hand',
             check=lambda ps, st: st['allPartnersLoyalAbove50'] and st['billsPassed'] >= 7),
    ],
    'Renewal': [
        dict(id='reform_agenda',  title='The Reform Agenda',
             check=lambda ps, st: st['domainsPassedCount'] >= 5),
        dict(id='competent_govt', title='Competent Government',
             check=lambda ps, st: st['billsPassed'] >= 8),
    ],
    'Christian Democrats': [
        dict(id='sound_finances',  title='Sound Finances',
             check=lambda ps, st: ps['fiscal_policy'] <= 2 and ps['market_regulation'] <= 2),
        dict(id='governing_party', title='Governing Party',
             check=lambda ps, st: st['billsPassed'] >= 8 and st['turnsAbstained'] == 0),
    ],
    'National Front': [
        dict(id='national_programme', title='The National Programme',
             check=lambda ps, st: ps['border_policy'] >= 4 and ps['foreign_policy'] >= 3),
        dict(id='prove_we_govern',    title='Prove We Can Govern',
             check=lambda ps, st: st['billsPassed'] >= 10),
    ],
}

GOALS = {
    "People's Alliance": [
        dict(id='workers_first',    title='Workers First',
             check=lambda ps, st: ps['wages_unions'] >= 3),
        dict(id='public_ownership', title='Public Ownership',
             check=lambda ps, st: st['leftBillsPassed'] >= 4),
        dict(id='no_austerity',     title='No Austerity',
             check=lambda ps, st: ps['fiscal_policy'] >= STARTING_POLICY['fiscal_policy']),
    ],
    'Socialist Party': [
        dict(id='welfare_state',    title='Welfare State',
             check=lambda ps, st: ps['public_services'] >= 4),
        dict(id='full_programme',   title='Full Programme',
             check=lambda ps, st: st['billsPassed'] >= 8),
        dict(id='stable_coalition', title='Stable Coalition',
             check=lambda ps, st: st['allPartnersLoyalAbove50']),
    ],
    'Renewal': [
        dict(id='fiscal_responsibility', title='Fiscal Responsibility',
             check=lambda ps, st: abs(ps['fiscal_policy'] - STARTING_POLICY['fiscal_policy']) <= 1),
        dict(id='broad_mandate',         title='Broad Mandate',
             check=lambda ps, st: st['domainsPassedCount'] >= 6),
        dict(id='active_legislature',    title='Active Legislature',
             check=lambda ps, st: st['billsPassed'] >= 8),
    ],
    'Christian Democrats': [
        dict(id='fiscal_discipline',  title='Fiscal Discipline',
             check=lambda ps, st: ps['fiscal_policy'] <= 2),
        dict(id='social_stability',   title='Social Stability',
             check=lambda ps, st: ps['social_policy'] >= STARTING_POLICY['social_policy']),
        dict(id='governing_majority', title='Governing Majority',
             check=lambda ps, st: st['billsPassed'] >= 8 and st['turnsAbstained'] == 0),
    ],
    'National Front': [
        dict(id='secure_border',     title='Secure the Border',
             check=lambda ps, st: ps['border_policy'] >= 4),
        dict(id='national_interest', title='National Interest',
             check=lambda ps, st: ps['foreign_policy'] >= 3),
        dict(id='free_market',       title='Free Market',
             check=lambda ps, st: ps['market_regulation'] <= STARTING_POLICY['market_regulation']),
    ],
}

# ── helpers ────────────────────────────────────────────────────────────────────

def vuf(bill, partner, loyalty_pct):
    L = loyalty_pct / 100
    k = abs(bill['score'] - partner[bill['type']])
    c = max(0.0, 1 - k / 10)
    return L + (1 - L) * c

def loyalty_delta(bill, partner):
    d = abs(bill['score'] - partner[bill['type']])
    return max(-20.0, min(5.0, 5 - d * 1.5))

def expected_ayes(bill, loyalty, player, partners):
    ayes = player['seats']
    for p in partners:
        ayes += int(vuf(bill, p, loyalty[p['name']]) * p['seats'])
    return ayes

def would_pass(bill, loyalty, player, partners):
    return expected_ayes(bill, loyalty, player, partners) >= MAJORITY

# ── mandate-aware bill scoring ─────────────────────────────────────────────────
#
# Returns a float priority score for a bill given a mandate and current policy.
# Higher = more useful toward mandate.

MANDATE_PRIORITIES = {
    'seize_the_means':    {'wages_unions': +1, 'market_regulation': +1},
    'no_surrender':       {},   # just avoid abstaining — pass anything
    'build_welfare':      {'public_services': +1},
    'steady_hand':        {},   # preserve loyalty — handled by loyal strategy
    'reform_agenda':      {},   # prefer bills in new domains — special logic
    'competent_govt':     {},   # pass as many as possible — handled by pass-focused
    'sound_finances':     {'fiscal_policy': -1, 'market_regulation': -1},
    'governing_party':    {},   # pass anything, don't abstain
    'national_programme': {'border_policy': +1, 'foreign_policy': +1},
    'prove_we_govern':    {},   # pass anything
}

def mandate_score(bill, mandate_id, policy, domains_passed):
    priorities = MANDATE_PRIORITIES.get(mandate_id, {})
    if mandate_id == 'reform_agenda':
        # Prefer bills in domains not yet covered
        return 2.0 if bill['dimension'] not in domains_passed else 0.5
    if mandate_id in ('steady_hand',):
        # Prefer low loyalty damage
        return 0.0  # handled separately
    dim = bill['dimension']
    direction = priorities.get(dim, 0)
    if direction == 0:
        return 0.5   # neutral
    current = policy.get(dim, 3)
    if direction == +1 and bill['delta'] == +1 and current < 5:
        return 2.0
    if direction == -1 and bill['delta'] == -1 and current > 1:
        return 2.0
    return 0.1  # wrong direction

# ── strategy ───────────────────────────────────────────────────────────────────

def choose_bill(strategy, agenda, player, partners, loyalty, mandate_id, policy, domains_passed):
    passable = [b for b in agenda if would_pass(b, loyalty, player, partners)]
    pool = passable if passable else agenda   # fall back to full agenda if all blocked

    if strategy == 'random':
        return random.choice(pool)

    if strategy == 'pass-focused':
        return max(pool, key=lambda b: expected_ayes(b, loyalty, player, partners))

    if strategy == 'loyal':
        return max(pool, key=lambda b: sum(loyalty_delta(b, p) for p in partners))

    if strategy == 'mandate-focused':
        if mandate_id == 'steady_hand':
            return max(pool, key=lambda b: sum(loyalty_delta(b, p) for p in partners))
        return max(pool, key=lambda b: (
            mandate_score(b, mandate_id, policy, domains_passed),
            expected_ayes(b, loyalty, player, partners)
        ))

    return random.choice(pool)

# ── single simulation run ──────────────────────────────────────────────────────

def run_once(party, partners, mandate_id, strategy):
    policy  = dict(STARTING_POLICY)
    loyalty = {p['name']: 100.0 for p in partners}

    bills_passed     = 0
    left_bills_passed = 0
    domains_passed   = set()
    turns_abstained  = 0
    collapsed        = False

    eligible = [b for b in BILLS
                if not (b['delta'] > 0 and policy[b['dimension']] >= 5)
                and not (b['delta'] < 0 and policy[b['dimension']] <= 1)]
    agenda = random.sample(eligible, min(BILL_LIMIT, len(eligible)))

    for _ in range(BILL_LIMIT):
        if collapsed or not agenda:
            if not agenda:
                turns_abstained += (BILL_LIMIT - _ - (1 if not agenda else 0))
            break

        passable = [b for b in agenda if would_pass(b, loyalty, party, partners)]
        if not passable:
            turns_abstained += 1
            continue

        bill = choose_bill(strategy, agenda, party, partners, loyalty,
                           mandate_id, policy, domains_passed)
        agenda.remove(bill)

        ayes   = expected_ayes(bill, loyalty, party, partners)
        passed = ayes >= MAJORITY

        if passed:
            bills_passed += 1
            if bill['score'] <= -2:
                left_bills_passed += 1
            domains_passed.add(bill['dimension'])

            for p in partners:
                d    = loyalty_delta(bill, p)
                lnew = max(0.0, min(100.0, loyalty[p['name']] + d))
                loyalty[p['name']] = lnew
                if lnew <= 0:
                    collapsed = True

            policy[bill['dimension']] = max(1, min(5,
                policy[bill['dimension']] + bill['delta']))

    all_loyal = all(loyalty[p['name']] > 50 for p in partners)
    stats = {
        'billsPassed':          bills_passed,
        'leftBillsPassed':      left_bills_passed,
        'domainsPassedCount':   len(domains_passed),
        'turnsAbstained':       turns_abstained,
        'allPartnersLoyalAbove50': all_loyal,
    }

    mandate = next(m for m in MANDATES[party['name']] if m['id'] == mandate_id)
    mandate_met = mandate['check'](policy, stats)

    if collapsed:
        tier = 'collapse'
    elif mandate_met:
        tier = 'high'
    elif bills_passed >= 5:
        tier = 'mid'
    else:
        tier = 'low'

    return dict(
        tier           = tier,
        mandate_met    = mandate_met,
        collapsed      = collapsed,
        bills_passed   = bills_passed,
        left_bills_passed = left_bills_passed,
        domains_passed = len(domains_passed),
        turns_abstained = turns_abstained,
        all_loyal      = all_loyal,
        final_loyalty  = {p['name']: loyalty[p['name']] for p in partners},
        policy         = policy,
        stats          = stats,
    )

# ── CSV helper ─────────────────────────────────────────────────────────────────

def write_csv(name, rows):
    path = OUT / name
    with open(path, 'w', newline='', encoding='utf-8') as f:
        csv.writer(f).writerows(rows)
    print(f'  ok  {name}  ({len(rows)-1} data rows)')

# ── all combos ─────────────────────────────────────────────────────────────────

COMBOS = []
for coal in COALITIONS:
    for pname in coal['parties']:
        party    = PARTY[pname]
        partners = [PARTY[n] for n in coal['parties'] if n != pname]
        for mandate in MANDATES[pname]:
            COMBOS.append(dict(party=party, coal=coal, partners=partners, mandate=mandate))

STRATEGIES = ['random', 'pass-focused', 'loyal', 'mandate-focused']

# ── 1. matrix.csv ──────────────────────────────────────────────────────────────

print('\n1. Compatibility matrix')
write_csv('matrix.csv', [
    ['Bill', 'Dimension', 'Delta', 'Score', 'Type',
     *[f"{p['name']}_vuf_L100" for p in PARTIES],
     *[f"{p['name']}_vuf_L50"  for p in PARTIES],
     *[f"{p['name']}_loyalty_delta" for p in PARTIES]],
    *[[b['title'], b['dimension'], b['delta'], b['score'], b['type'],
       *[f"{vuf(b,p,100):.2f}" for p in PARTIES],
       *[f"{vuf(b,p,50):.2f}"  for p in PARTIES],
       *[f"{loyalty_delta(b,p):.2f}" for p in PARTIES]]
      for b in BILLS],
])

# ── 2. fragility.csv ───────────────────────────────────────────────────────────

print('2. Fragility analysis')
rows = [['Party', 'Coalition', 'Total_seats', 'Margin', 'Majority_pct',
         'P1_name', 'P1_seats', 'P1_loyalty_floor_pct',
         'P2_name', 'P2_seats', 'P2_loyalty_floor_pct']]
seen = set()
for combo in COMBOS:
    key = (combo['party']['name'], combo['coal']['id'])
    if key in seen:
        continue
    seen.add(key)
    party, coal, partners = combo['party'], combo['coal'], combo['partners']
    total  = party['seats'] + sum(p['seats'] for p in partners)
    margin = total - MAJORITY
    pct    = round(total / TOTAL_SEATS * 100, 1)
    floors = []
    for i, p in enumerate(partners):
        other_ayes = sum(q['seats'] for j, q in enumerate(partners) if j != i)
        needed     = MAJORITY - party['seats'] - other_ayes
        floors.append(0 if needed <= 0 else max(0, min(100, math.ceil(needed / p['seats'] * 100))))
    rows.append([
        party['name'], coal['id'], total, margin, f'{pct}%',
        partners[0]['name']  if partners else '', partners[0]['seats'] if partners else '', floors[0] if floors else '',
        partners[1]['name']  if len(partners) > 1 else '', partners[1]['seats'] if len(partners) > 1 else '', floors[1] if len(floors) > 1 else '',
    ])
write_csv('fragility.csv', rows)

# ── 3 & 4. Simulations ─────────────────────────────────────────────────────────

print('3. Simulations\n')

summary_rows = [['Party', 'Coalition', 'Mandate', 'Strategy', 'N',
                 'High_%', 'Mid_%', 'Low_%', 'Collapse_%',
                 'Mandate_rate_%', 'Mean_bills_passed', 'Std_bills_passed',
                 'Mean_domains', 'Mean_abstains',
                 *[f'P{i+1}_mean_loyalty' for i in range(2)]]]

ending_rows  = [['Party', 'Coalition', 'Mandate', 'Strategy',
                 'High_%', 'Mid_%', 'Low_%', 'Collapse_%']]

goal_rows    = [['Party', 'Coalition', 'Mandate', 'Strategy',
                 *[g['title'] for g in GOALS['Socialist Party']]]]  # placeholder header

goal_header_written = False
goal_data = []

traj_rows = [['Party', 'Coalition', 'Mandate', 'Strategy', 'Turn',
              'Mean_bills_passed_cumul',
              'P1_name', 'P1_mean_loyalty',
              'P2_name', 'P2_mean_loyalty']]

for combo in COMBOS:
    party    = combo['party']
    coal     = combo['coal']
    partners = combo['partners']
    mandate  = combo['mandate']

    for strategy in STRATEGIES:
        label = f"{party['name'][:20]:<20}  {coal['id']:<6}  {mandate['id'][:18]:<18}  {strategy:<16}"
        print(f'  {label}', end='  ', flush=True)

        results          = []
        turn_bills       = [[] for _ in range(BILL_LIMIT)]
        turn_loyalties   = [[[] for _ in range(BILL_LIMIT)] for _ in range(len(partners))]
        cumul_tracker    = [[] for _ in range(BILL_LIMIT)]

        for _ in range(N_SIMS):
            r = run_once(party, partners, mandate['id'], strategy)
            results.append(r)

        tiers     = [r['tier'] for r in results]
        high_pct  = round(tiers.count('high')     / N_SIMS * 100, 1)
        mid_pct   = round(tiers.count('mid')      / N_SIMS * 100, 1)
        low_pct   = round(tiers.count('low')      / N_SIMS * 100, 1)
        coll_pct  = round(tiers.count('collapse') / N_SIMS * 100, 1)
        mand_rate = round(sum(r['mandate_met'] for r in results) / N_SIMS * 100, 1)

        bp_list   = [r['bills_passed'] for r in results]
        dom_list  = [r['domains_passed'] for r in results]
        abs_list  = [r['turns_abstained'] for r in results]
        mu        = statistics.mean(bp_list)
        sig       = statistics.stdev(bp_list) if len(bp_list) > 1 else 0

        p_loyalties = []
        for pi, p in enumerate(partners):
            loys = [r['final_loyalty'].get(p['name'], 100) for r in results]
            p_loyalties.append(f'{statistics.mean(loys):.1f}')

        summary_rows.append([
            party['name'], coal['id'], mandate['id'], strategy, N_SIMS,
            high_pct, mid_pct, low_pct, coll_pct,
            mand_rate, f'{mu:.2f}', f'{sig:.2f}',
            f'{statistics.mean(dom_list):.2f}',
            f'{statistics.mean(abs_list):.2f}',
            *p_loyalties,
            *([''] * (2 - len(p_loyalties))),
        ])

        ending_rows.append([party['name'], coal['id'], mandate['id'], strategy,
                            high_pct, mid_pct, low_pct, coll_pct])

        # Goal achievement rates
        party_goals = GOALS[party['name']]
        goal_rates  = []
        for g in party_goals:
            rate = sum(g['check'](r['policy'], r['stats']) for r in results) / N_SIMS * 100
            goal_rates.append(f'{rate:.1f}')
        goal_data.append([party['name'], coal['id'], mandate['id'], strategy, *goal_rates,
                          *[g['title'] for g in party_goals]])

        print(f'high {high_pct:5.1f}%  collapse {coll_pct:4.1f}%  mean_bills {mu:.1f}')

    print()

write_csv('simulation_summary.csv', summary_rows)
write_csv('ending_distribution.csv', ending_rows)

# Build goal CSV with consistent headers
all_goal_titles = []
for pname in ['People\'s Alliance', 'Socialist Party', 'Renewal', 'Christian Democrats', 'National Front']:
    for g in GOALS[pname]:
        col = f'{pname}:{g["title"]}'
        if col not in all_goal_titles:
            all_goal_titles.append(col)

goal_rows = [['Party', 'Coalition', 'Mandate', 'Strategy',
              'Goal1_title', 'Goal1_%', 'Goal2_title', 'Goal2_%', 'Goal3_title', 'Goal3_%']]
for row in goal_data:
    party_name = row[0]
    goals_for  = GOALS[party_name]
    rates      = row[4:4+len(goals_for)]
    flat = []
    for g, r in zip(goals_for, rates):
        flat += [g['title'], r]
    goal_rows.append(row[:4] + flat)

write_csv('goal_analysis.csv', goal_rows)

print('\nDone — open test/output/ to inspect results.')
print(f'  Simulations: {N_SIMS:,} per combo  |  Total runs: {N_SIMS * len(COMBOS) * len(STRATEGIES):,}')
