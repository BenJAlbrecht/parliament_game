<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { fly, fade, scale, slide } from 'svelte/transition';
  import { backOut, cubicOut } from 'svelte/easing';
  import {
    PARTIES, DOMAIN_SCALES, DOMAIN_ORDER, STARTING_DOMAINS, ECON_PARAMS, STARTING_ECONOMY,
    ECONOMIC_HISTORY, econLabel, socialLabel, logoSrc,
  } from '$lib/data.js';
  import { calculateSeats } from '$lib/layout.js';
  import { init, initAgenda, proposeBill, getDomainState, getSessionStats } from '$lib/vote.js';
  import {
    playerParty, selectedCoalition, coalitionPartners, committedGoals,
    playerMandate, endingData, headerAccent, sessionEconHistory,
  } from '$lib/stores.js';

  // ── Constants ────────────────────────────────────────────────────────────────
  const TURNS_PER_YEAR  = 3;
  const TOTAL_YEARS     = 3;
  const TOTAL_TURNS     = TURNS_PER_YEAR * TOTAL_YEARS;   // 9
  const total           = PARTIES.reduce((s, p) => s + p.seats, 0);
  const majority        = Math.floor(total / 2) + 1;

  // ── Store reads ──────────────────────────────────────────────────────────────
  let party     = null;
  let partners  = [];
  let coalition = null;
  let goals     = {};
  let mandate   = null;

  // ── Session state ────────────────────────────────────────────────────────────
  let seats              = [];
  let votes              = [];
  let loyalty            = {};
  let domainState        = { ...STARTING_DOMAINS };
  let currentEconParams  = { ...ECON_PARAMS };

  let turnCount      = 0;
  let billsProposed  = 0;
  let turnsAbstained = 0;
  let agenda         = [];

  // ── Economic state ───────────────────────────────────────────────────────────
  let econState         = { ...STARTING_ECONOMY };
  let yearHistory       = [];          // in-game annual snapshots
  let prevEconForReport = null;        // snapshot before computation (for deltas)
  let reportHeadline    = '';

  // ── Phase management ─────────────────────────────────────────────────────────
  // policy | finance | agenda | bill-detail | result | annual-report | confidence-vote
  let phase        = 'policy';
  let selectedBill = null;
  let voteResult   = null;
  let abstained    = false;
  let collapsed    = false;
  let openDomain   = null;

  function toggleDomain(dim) { openDomain = openDomain === dim ? null : dim; }

  // ── Derived: turn position ───────────────────────────────────────────────────
  $: year        = Math.ceil(turnCount / TURNS_PER_YEAR);          // 1–3
  $: turnInYear  = ((turnCount - 1) % TURNS_PER_YEAR) + 1;        // 1–3

  // ── Derived: government seat set ─────────────────────────────────────────────
  $: govIndices = (() => {
    if (!party) return new Set();
    const names = new Set([party.name, ...partners.map(p => p.name)]);
    return new Set(PARTIES.map((p, i) => names.has(p.name) ? i : -1).filter(i => i >= 0));
  })();

  // ── Derived: all economic data (history + in-game) ───────────────────────────
  $: allEconData = [
    ...ECONOMIC_HISTORY,
    {
      year: 0, Y: STARTING_ECONOMY.Y, Y_star: STARTING_ECONOMY.Y_star,
      u_pct: +(STARTING_ECONOMY.u * 100).toFixed(1),
      pi_pct: +(STARTING_ECONOMY.pi * 100).toFixed(1),
      deficit: STARTING_ECONOMY.deficit, debt: STARTING_ECONOMY.debt,
    },
    ...yearHistory.map((e, i) => ({
      year: i + 1,
      Y:      e.Y,
      Y_star: e.Y_star,
      u_pct:  +(e.u  * 100).toFixed(1),
      pi_pct: +(e.pi * 100).toFixed(1),
      deficit: e.deficit,
      debt:    e.debt,
    })),
  ];

  // ── Stats builder ────────────────────────────────────────────────────────────
  function buildStats() {
    return {
      ...getSessionStats(),
      turnsAbstained,
      allPartnersLoyalAbove50: partners.every(p => (loyalty[p.name] ?? 0) > 50),
      domainState:  { ...domainState },
      policyState:  { ...domainState },   // legacy key — ending screen reads this
    };
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  onMount(() => {
    party     = $playerParty;
    partners  = $coalitionPartners;
    coalition = $selectedCoalition;
    goals     = $committedGoals;
    mandate   = $playerMandate;
    if (!party || !coalition) { goto('/select'); return; }

    headerAccent.set(party.color);
    seats             = calculateSeats(PARTIES);
    votes             = new Array(seats.length).fill(null);
    init(seats, party, partners);
    agenda            = initAgenda();
    loyalty           = Object.fromEntries(partners.map(p => [p.name, 100]));
    domainState       = { ...STARTING_DOMAINS };
    currentEconParams = { ...ECON_PARAMS };
    econState         = { ...STARTING_ECONOMY };
    nextTurn();
  });

  // ── Turn flow ────────────────────────────────────────────────────────────────
  function nextTurn() {
    turnCount++;
    votes        = new Array(seats.length).fill(null);
    phase        = 'policy';
    abstained    = false;
    voteResult   = null;
    selectedBill = null;
  }

  function openAgenda()         { phase = 'agenda'; openDomain = null; }
  function openBillDetail(bill) { selectedBill = bill; phase = 'bill-detail'; }
  function backToPolicy()       { phase = 'policy'; }
  function backToAgenda()       { phase = 'agenda'; }

  function handleAbstain() {
    turnsAbstained++;
    abstained = true;
    phase = 'result';
  }

  function handlePropose() {
    billsProposed++;
    agenda = agenda.filter(b => b.title !== selectedBill.title);
    const result = proposeBill(selectedBill);
    votes      = result.votes;
    loyalty    = { ...result.newLoyalty };
    domainState = getDomainState();

    if (result.econEffect) {
      const ef = result.econEffect;
      if (ef.G        != null) econState         = { ...econState, G: econState.G + ef.G };
      if (ef.tax_rate != null) econState         = { ...econState, tax_rate: Math.max(0.05, Math.min(0.60, econState.tax_rate + ef.tax_rate)) };
      if (ef.I_0      != null) currentEconParams = { ...currentEconParams, I_0: Math.max(50, currentEconParams.I_0 + ef.I_0) };
      if (ef.Y_star_g != null) currentEconParams = { ...currentEconParams, potential_growth: Math.max(0, Math.min(0.06, currentEconParams.potential_growth + ef.Y_star_g)) };
    }

    voteResult = result;
    collapsed  = partners.some(p => (result.newLoyalty[p.name] ?? 100) <= 0);
    phase = 'result';
  }

  function handleNext() {
    if (collapsed) {
      endingData.set({ finalLoyalty: { ...loyalty }, billsProposed, collapsed, stats: buildStats() });
      goto('/ending');
      return;
    }
    if (turnCount % TURNS_PER_YEAR === 0) {
      prevEconForReport = { ...econState };
      computeEconYear();
      reportHeadline = generateHeadline();
      phase = 'annual-report';
    } else {
      nextTurn();
    }
  }

  function closeAnnualReport() {
    if (turnCount >= TOTAL_TURNS) {
      phase = 'confidence-vote';
    } else {
      nextTurn();
    }
  }

  function closeConfidenceVote() {
    endingData.set({ finalLoyalty: { ...loyalty }, billsProposed, collapsed: false, stats: buildStats() });
    goto('/ending');
  }

  // ── Economic model ───────────────────────────────────────────────────────────
  function computeEconYear() {
    const { G, tax_rate, i, Y_star, pi_expected } = econState;

    // Domain structural modifiers (applied on top of bill-modified base params)
    // Border: open (1) → lower u_star + higher growth; closed (5) → opposite
    const eff_u_star = ECON_PARAMS.u_star + (domainState.border - 3) * 0.003;
    const eff_ys_g   = currentEconParams.potential_growth + (3 - domainState.border) * 0.001;
    // Foreign: multilateral (1) → higher I_0; nationalist (5) → lower I_0
    const eff_I0     = currentEconParams.I_0 + (3 - domainState.foreign) * 4;

    const I      = eff_I0 - ECON_PARAMS.d * i;
    const newY   = (ECON_PARAMS.a + I + G) / (1 - ECON_PARAMS.mpc * (1 - tax_rate));
    const newYs  = Y_star * (1 + eff_ys_g);
    const newU   = Math.max(0, eff_u_star - ECON_PARAMS.okun * ((newY - newYs) / newYs));
    const newPi  = pi_expected + ECON_PARAMS.beta * (eff_u_star - newU);
    const T      = tax_rate * newY;
    const deficit = G - T;
    const debt   = econState.debt * (1 + i) + deficit;
    const growth = (newY - econState.Y) / econState.Y;

    const snap = {
      G, tax_rate, i,
      Y:           Math.round(newY),
      Y_star:      Math.round(newYs),
      u:           newU,
      pi:          newPi,
      pi_expected: newPi,
      T:           Math.round(T),
      deficit:     Math.round(deficit),
      debt:        Math.round(debt),
      Y_growth:    growth,
    };
    yearHistory = [...yearHistory, snap];
    econState   = snap;
    sessionEconHistory.set(yearHistory);
  }

  function generateHeadline() {
    const g = econState.Y_growth ?? 0;
    const u = econState.u;
    const pi = econState.pi;
    if (g < -0.01) return `Economy contracts ${Math.abs(g * 100).toFixed(1)}% — recession deepens`;
    if (pi > 0.06)  return `Inflation surges to ${(pi * 100).toFixed(1)}% — crisis warning signs emerge`;
    if (pi > 0.04 && g > 0.02) return `Strong growth fuels inflationary pressure`;
    if (u > 0.08)   return `Unemployment climbs to ${(u * 100).toFixed(1)}% — stagnation takes hold`;
    if (g > 0.03)   return `Economy expands ${(g * 100).toFixed(1)}% — strongest growth in years`;
    if (u < 0.04)   return `Labour market tightens as unemployment falls to ${(u * 100).toFixed(1)}%`;
    if (econState.deficit > 50) return `Deficit widens as spending outpaces revenue`;
    return `Modest ${(g * 100).toFixed(1)}% growth as the economy navigates policy transition`;
  }

  // ── Confidence vote computation ───────────────────────────────────────────────
  $: confidentVote = (() => {
    if (!party) return { passes: true, govAyes: 0, govNays: 0 };
    let ayes = party.seats;
    let nays = 0;
    for (const p of partners) {
      const loy = loyalty[p.name] ?? 100;
      const share = loy / 100;
      ayes += Math.floor(share * p.seats);
      nays += p.seats - Math.floor(share * p.seats);
    }
    // Opposition always votes against
    const oppSeatsTotal = PARTIES.filter(p => p !== party && !partners.includes(p))
      .reduce((s, p) => s + p.seats, 0);
    return { passes: ayes >= majority, govAyes: ayes, oppNays: oppSeatsTotal + nays };
  })();

  // ── SVG chart helpers ────────────────────────────────────────────────────────
  const FC_W = 400, FC_H = 120;
  const FC_LM = 40, FC_RM = 8, FC_TM = 10, FC_BM = 24;
  const FC_PW = FC_W - FC_LM - FC_RM;   // 352  plot width
  const FC_PH = FC_H - FC_TM - FC_BM;   // 86   plot height

  function cPx(i, n)      { return FC_LM + (i / Math.max(n - 1, 1)) * FC_PW; }
  function cPy(v, lo, hi) { const r = hi - lo || 1; return FC_TM + (1 - (v - lo) / r) * FC_PH; }
  function cPts(data, key, lo, hi) {
    return data.map((d, i) => `${cPx(i, data.length).toFixed(1)},${cPy(d[key], lo, hi).toFixed(1)}`).join(' ');
  }
  function cRange(data, ...keys) {
    const vals = data.flatMap(d => keys.map(k => d[k]));
    const lo = Math.min(...vals), hi = Math.max(...vals);
    const pad = (hi - lo) * 0.12 || 2;
    return [lo - pad, hi + pad];
  }
  function cYTicks(lo, hi, n = 3) {
    return Array.from({ length: n }, (_, i) => lo + (i / (n - 1)) * (hi - lo));
  }
  function cXLabels(data) {
    return data
      .map((d, i) => ({ i, year: d.year }))
      .filter(({ year }) => year % 5 === 0 || year > 0);
  }
  function fmtInt(v) { return Math.round(v).toLocaleString(); }
  function fmtPct(v) { return v.toFixed(1) + '%'; }

  // index of game-start divider in allEconData (year 0 sits right after the 20 historical entries)
  $: gameStartIdx = ECONOMIC_HISTORY.length;
  $: gameStartX   = cPx(gameStartIdx, allEconData.length);

  // ── Agenda computed ───────────────────────────────────────────────────────────
  $: agendaData = agenda.map((bill, i) => {
    let ayes = party ? party.seats : 0;
    for (const p of partners) {
      const L    = loyalty[p.name] / 100;
      const k    = Math.abs(bill.score - p[bill.type]);
      const c    = Math.max(0, 1 - k / 10);
      ayes      += Math.floor((L + (1 - L) * c) * p.seats);
    }
    return { bill, passable: ayes >= majority, idx: i };
  });

  $: allBlocked = agendaData.length > 0 && agendaData.every(d => !d.passable);

  $: agendaGroups = (() => {
    const map = new Map();
    agendaData.forEach(d => {
      const dim = d.bill.domain ?? 'other';
      if (!map.has(dim)) map.set(dim, []);
      map.get(dim).push(d);
    });
    return [...map.entries()].sort(([a], [b]) =>
      (DOMAIN_ORDER.indexOf(a) + 1 || 99) - (DOMAIN_ORDER.indexOf(b) + 1 || 99)
    );
  })();

  // ── Bill detail computed ──────────────────────────────────────────────────────
  $: billBreakdown = selectedBill ? computeBreakdown(selectedBill) : [];
  $: billAyes      = billBreakdown.reduce((s, b) => s + b.ayes, 0);
  $: billNays      = total - billAyes;
  $: billPassable  = billAyes >= majority;
  $: billGovRows   = billBreakdown.filter(b => b.role !== 'opposition');
  $: billOppRows   = billBreakdown.filter(b => b.role === 'opposition');

  function computeBreakdown(bill) {
    return PARTIES.map(p => {
      if (p === party) return { party: p, ayes: p.seats, nays: 0, role: 'player' };
      if (partners.includes(p)) {
        const L    = loyalty[p.name] / 100;
        const k    = Math.abs(bill.score - p[bill.type]);
        const c    = Math.max(0, 1 - k / 10);
        const ayes = Math.floor((L + (1 - L) * c) * p.seats);
        return { party: p, ayes, nays: p.seats - ayes, role: 'partner' };
      }
      return { party: p, ayes: 0, nays: p.seats, role: 'opposition' };
    });
  }

  // ── Legend computed ───────────────────────────────────────────────────────────
  $: govNames   = party ? new Set([party.name, ...partners.map(p => p.name)]) : new Set();
  $: govParties = PARTIES.filter(p => govNames.has(p.name));
  $: oppParties = PARTIES.filter(p => !govNames.has(p.name));
  $: govSeats   = govParties.reduce((s, p) => s + p.seats, 0);
  $: oppSeats   = oppParties.reduce((s, p) => s + p.seats, 0);
  const pct = n => Math.round(n / total * 100);

  function loyaltyCls(loy) {
    return loy >= 60 ? 'loyalty-up' : loy >= 30 ? 'loyalty-neutral' : 'loyalty-down';
  }

  // ── Compass helpers ───────────────────────────────────────────────────────────
  const CW = 280, CP = 38, CS = CW - 2 * CP;
  const cx0 = CP + (10 / 20) * CS;
  const cy0 = CP + (10 / 20) * CS;
  function mapX(e) { return CP + ((e + 10) / 20) * CS; }
  function mapY(s) { return CP + ((10 - s) / 20) * CS; }
  function partyAbbr(p) {
    const w = p.name.split(/\s+/);
    return w.length > 1 ? w.map(x => x[0]).join('') : p.name.slice(0, 2).toUpperCase();
  }

</script>

{#if party}
<div class="parliament-layout">

  <!-- ════════════════════════════════════════════════════════════
       LEFT: Action panel
  ════════════════════════════════════════════════════════════ -->
  <div class="action-panel">

    <!-- Party header -->
    <div class="party-header">
      <div class="party-header-left">
        <img class="party-header-logo" src={logoSrc(party.name)} alt="">
        <div class="party-header-identity">
          <span class="party-header-name" style="color:{party.color}">{party.name}</span>
          <span class="party-header-role">Leader of the {coalition.name}</span>
        </div>
      </div>
      <div class="year-counter">
        <div class="year-counter-label" style="color:{party.color}">Year {year}</div>
        <div class="year-pips">
          {#each [1, 2, 3] as pip}
            <div class="year-pip" class:year-pip--filled={pip <= turnInYear}></div>
          {/each}
        </div>
        <div class="year-counter-sub">Turn {turnInYear} of {TURNS_PER_YEAR}</div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════
         Phase: Policy Home
    ══════════════════════════════════════════════════════════ -->
    {#if phase === 'policy'}
      <div in:fly={{ y: 14, duration: 240, delay: 100, easing: cubicOut }} out:fade={{ duration: 110 }}>

        <!-- Policy Domain State -->
        <div class="panel-section-label" style="margin-top:1.25rem;">Policy State</div>
        <div class="policy-dim-list">
          {#each Object.entries(DOMAIN_SCALES) as [key, dim]}
            {@const val  = domainState[key] ?? 3}
            {@const desc = dim.steps[val - 1] ?? ''}
            {@const [lp, rp] = dim.poles}
            <div class="policy-dimension">
              <div class="policy-dim-name">{dim.label}</div>
              <div class="policy-spectrum">
                <span class="policy-pole policy-pole--left">{lp}</span>
                <div class="policy-track">
                  {#each [1,2,3,4,5] as step}
                    <div class="policy-step" class:policy-step--active={step === val}></div>
                  {/each}
                </div>
                <span class="policy-pole policy-pole--right">{rp}</span>
              </div>
              <div class="policy-dim-desc">{desc}</div>
            </div>
          {/each}
        </div>

        <div class="panel-section-label" style="margin-top:1.5rem;">Actions</div>
        <button class="primary primary--secondary" style="margin-top:0.75rem;" on:click={openAgenda}>
          Legislative Agenda &#8594;
        </button>
        <button class="primary primary--secondary" style="margin-top:0.5rem;" on:click={() => phase = 'finance'}>
          Finance Ministry &#8594;
        </button>
      </div>
    {/if}

    <!-- ══════════════════════════════════════════════════════════
         Phase: Legislative Agenda
    ══════════════════════════════════════════════════════════ -->
    {#if phase === 'agenda'}
      <div class="agenda-document" in:fly={{ y: 14, duration: 240, delay: 100, easing: cubicOut }} out:fade={{ duration: 110 }}>
        <div class="agenda-toolbar">
          <button class="agenda-back-btn" on:click={backToPolicy}>&#8592; Back</button>
          <span class="agenda-toolbar-title">Legislative Agenda</span>
          <span class="agenda-toolbar-meta">Turn {turnInYear} of {TURNS_PER_YEAR} · Year {year}</span>
        </div>
        <div class="agenda-section-hdr">
          <span class="agenda-section-hdr-icon">▣</span> Bills by Domain
        </div>
        <div class="agenda-doc-inner">
          {#if allBlocked}
            <div class="blocked-banner">All remaining bills are blocked — coalition support too low.</div>
            <button class="primary" on:click={handleAbstain}>Abstain (skip turn) &#8594;</button>
          {:else}
            <div class="domain-accordion">
              {#each agendaGroups as [dim, items]}
                {@const dimScale      = dim !== 'fiscal' ? DOMAIN_SCALES[dim] : null}
                {@const curVal        = dim !== 'fiscal' ? (domainState[dim] ?? 3) : 0}
                {@const passableCount = items.filter(d => d.passable).length}
                {@const isOpen        = openDomain === dim}
                {@const allDimBlocked = passableCount === 0}

                <div class="domain-row" class:domain-row--open={isOpen}>
                  <button
                    class="domain-header"
                    class:domain-header--passable={!allDimBlocked}
                    class:domain-header--blocked={allDimBlocked}
                    on:click={() => toggleDomain(dim)}
                  >
                    <div class="domain-header-left">
                      {#if dim === 'fiscal'}
                        <span class="domain-fiscal-vals">G {econState.G} · Tax {(econState.tax_rate * 100).toFixed(0)}%</span>
                        <span class="domain-name">Fiscal Policy</span>
                      {:else}
                        <div class="domain-pips">
                          {#each [1,2,3,4,5] as step}
                            <div class="domain-pip" class:domain-pip--filled={step <= curVal}></div>
                          {/each}
                        </div>
                        <span class="domain-name">{dimScale?.label ?? dim}</span>
                        <span class="domain-lv">Lv.{curVal}</span>
                      {/if}
                    </div>
                    <div class="domain-header-right">
                      <span class="domain-count" class:domain-count--zero={allDimBlocked}>
                        {passableCount}/{items.length}
                      </span>
                      <span class="domain-chevron" class:domain-chevron--open={isOpen}>&#8250;</span>
                    </div>
                  </button>

                  {#if isOpen}
                    <div class="domain-bills" transition:slide={{ duration: 180, easing: cubicOut }}>
                      {#each items as { bill, passable }}
                        {@const newVal     = Math.max(1, Math.min(5, curVal + (bill.domainDelta ?? 0)))}
                        {@const targetPole = (bill.domainDelta ?? 0) > 0 ? dimScale?.poles[1] : dimScale?.poles[0]}
                        {@const newStep    = dimScale?.steps[newVal - 1] ?? ''}
                        <div
                          class="agenda-item"
                          class:agenda-item--passable={passable}
                          class:agenda-item--blocked={!passable}
                          on:click={() => openBillDetail(bill)}
                          role="button"
                          tabindex="0"
                          on:keydown={e => e.key === 'Enter' && openBillDetail(bill)}
                        >
                          <div class="agenda-item-top">
                            <div class="agenda-item-title">{bill.title}</div>
                            <span class="agenda-item-status"
                              class:agenda-status--pass={passable}
                              class:agenda-status--block={!passable}>
                              {passable ? '✓' : '✗'}
                            </span>
                          </div>
                          {#if dimScale && bill.domainDelta}
                            <div class="agenda-item-effect">
                              <span class="effect-delta"
                                class:effect-delta--up={bill.domainDelta > 0}
                                class:effect-delta--down={bill.domainDelta < 0}>
                                {bill.domainDelta > 0 ? '▲' : '▼'}
                              </span>
                              <span class="effect-pole">{targetPole}</span>
                              <div class="effect-steps">
                                {#each [1,2,3,4,5] as step}
                                  <div class="effect-pip"
                                    class:effect-pip--cur={step === curVal && step !== newVal}
                                    class:effect-pip--new={step === newVal}
                                    class:effect-pip--filled={step < Math.min(curVal, newVal)}
                                  ></div>
                                {/each}
                              </div>
                              <span class="effect-label">{newStep}</span>
                            </div>
                          {/if}
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- ══════════════════════════════════════════════════════════
         Phase: Bill Detail
    ══════════════════════════════════════════════════════════ -->
    {#if phase === 'bill-detail' && selectedBill}
      {@const bill = selectedBill}
      {@const accentColor = billPassable ? '#22c55e' : '#f87171'}
      {@const posLabel = bill.type === 'economic' ? econLabel(bill.score) : socialLabel(bill.score)}

      <div class="agenda-document" in:fly={{ y: 14, duration: 240, delay: 100, easing: cubicOut }} out:fade={{ duration: 110 }}>
        <div class="agenda-toolbar">
          <button class="agenda-back-btn" on:click={backToAgenda}>&#8592; Back</button>
          <span class="agenda-toolbar-title">Bill Detail</span>
          <span class="agenda-toolbar-meta">Bill No. {billsProposed + 1} · First Reading</span>
        </div>
        <div class="agenda-section-hdr" style="background:#2563a8;">
          <span class="agenda-section-hdr-icon">◈</span> {bill.title}
        </div>
        <div class="agenda-doc-inner">

        <div class="bill-header-card" style="border-top-color:{accentColor};">
          <div class="bill-header-body">
            <div class="bill-header-title">{bill.title}</div>
            <div class="bill-header-meta">
              <span class="bill-card-type">{bill.domain}</span>
              <span class="bill-position-tag">{posLabel}</span>
            </div>
          </div>
          <div class="bill-verdict bill-verdict--{billPassable ? 'pass' : 'block'}">
            {billPassable ? 'PASSES ✓' : 'BLOCKED ✗'}
          </div>
        </div>

        <div class="bill-section">
          <div class="bill-section-header">
            <span class="bill-section-label">Vote Breakdown</span>
            <span class="bill-section-note">{billAyes} aye &nbsp;&middot;&nbsp; {billNays} nay &nbsp;&middot;&nbsp; need {majority}</span>
          </div>
          {#each [...billGovRows, ...billOppRows] as b}
            {@const ayePct = (b.ayes / b.party.seats) * 100}
            <div class="bill-bd-row" class:bill-bd-row--opp={b.role === 'opposition'}>
              <span class="bill-bd-dot" style="background:{b.party.color};"></span>
              <span class="bill-bd-name">
                {b.party.name}
                {#if b.role === 'player'}<span class="you-tag">YOU</span>{/if}
              </span>
              <div class="bill-bd-bar">
                <div class="bill-bd-bar-fill" style="width:{ayePct}%; background:{b.party.color};"></div>
              </div>
              <span class="bill-bd-counts">
                <span style="color:{b.party.color}">{b.ayes}</span>
                <span class="bill-bd-sep"> / </span>{b.nays}
              </span>
            </div>
          {/each}
        </div>

        <div class="bill-section">
          <div class="bill-section-header">
            <span class="bill-section-label">Coalition Loyalty</span>
            <span class="bill-section-note">if passed</span>
          </div>
          {#each partners as p}
            {@const distance  = Math.abs(bill.score - p[bill.type])}
            {@const delta     = Math.max(-20, Math.min(5, 5 - distance * 1.5))}
            {@const sign      = delta >= 0 ? '+' : ''}
            {@const cls       = delta > 0 ? 'loyalty-up' : delta < 0 ? 'loyalty-down' : 'loyalty-neutral'}
            {@const currentLoy = loyalty[p.name] ?? 100}
            <div class="bill-loy-row">
              <span class="bill-loy-dot" style="background:{p.color};"></span>
              <span class="bill-loy-name">{p.name}</span>
              <div class="bill-loy-meter">
                <div class="bill-loy-fill" style="width:{currentLoy}%; background:{p.color}40;"></div>
              </div>
              <span class="bill-loy-pct">{currentLoy.toFixed(0)}%</span>
              <span class="bill-loy-delta {cls}">{sign}{delta.toFixed(1)}</span>
            </div>
          {/each}
        </div>

        {#if bill.domainDelta && bill.domain !== 'fiscal'}
          {@const sc       = DOMAIN_SCALES[bill.domain]}
          {@const curVal   = domainState[bill.domain] ?? 3}
          {@const newVal   = Math.max(1, Math.min(5, curVal + bill.domainDelta))}
          {@const [lp, rp] = sc.poles}
          {@const dSign    = bill.domainDelta > 0 ? '+' : ''}
          {@const dColor   = bill.domainDelta > 0 ? 'loyalty-up' : 'loyalty-down'}
          <div class="bill-section">
            <div class="bill-section-header">
              <span class="bill-section-label">Policy Effect</span>
              <span class="bill-section-note">if passed &nbsp;<span class={dColor}>{dSign}{bill.domainDelta}</span></span>
            </div>
            <div class="bill-policy-dim-name">{sc.label}</div>
            <div class="policy-spectrum policy-spectrum--compact">
              <span class="policy-pole policy-pole--left">{lp}</span>
              <div class="policy-track">
                {#each [1,2,3,4,5] as step}
                  <div class="policy-step"
                    class:policy-step--up  ={step === newVal && bill.domainDelta > 0}
                    class:policy-step--down={step === newVal && bill.domainDelta < 0}
                    class:policy-step--dim ={step === curVal && step !== newVal}
                  ></div>
                {/each}
              </div>
              <span class="policy-pole policy-pole--right">{rp}</span>
            </div>
            <div class="bill-policy-transition">
              <span class="bill-policy-from">{sc.steps[curVal - 1]}</span>
              <span class="bill-policy-arrow {dColor}">&#8594;</span>
              <span class="bill-policy-to {dColor}">{sc.steps[newVal - 1]}</span>
            </div>
          </div>
        {/if}

        {#if bill.econEffect}
          <div class="bill-section">
            <div class="bill-section-header">
              <span class="bill-section-label">Economic Effect</span>
              <span class="bill-section-note">if passed · permanent</span>
            </div>
            {#if bill.econEffect.G != null}
              <div class="bill-econ-row">
                <span class="bill-econ-key">Government Spending (G)</span>
                <span class="bill-econ-val {bill.econEffect.G > 0 ? 'loyalty-up' : 'loyalty-down'}">
                  {bill.econEffect.G > 0 ? '+' : ''}{bill.econEffect.G}
                </span>
              </div>
            {/if}
            {#if bill.econEffect.tax_rate != null}
              <div class="bill-econ-row">
                <span class="bill-econ-key">Tax Rate</span>
                <span class="bill-econ-val {bill.econEffect.tax_rate > 0 ? 'loyalty-down' : 'loyalty-up'}">
                  {bill.econEffect.tax_rate > 0 ? '+' : ''}{(bill.econEffect.tax_rate * 100).toFixed(1)} pp
                </span>
              </div>
            {/if}
            {#if bill.econEffect.I_0 != null}
              <div class="bill-econ-row">
                <span class="bill-econ-key">Baseline Investment (I₀)</span>
                <span class="bill-econ-val {bill.econEffect.I_0 > 0 ? 'loyalty-up' : 'loyalty-down'}">
                  {bill.econEffect.I_0 > 0 ? '+' : ''}{bill.econEffect.I_0}
                </span>
              </div>
            {/if}
            {#if bill.econEffect.Y_star_g != null}
              <div class="bill-econ-row">
                <span class="bill-econ-key">Potential Growth</span>
                <span class="bill-econ-val {bill.econEffect.Y_star_g > 0 ? 'loyalty-up' : 'loyalty-down'}">
                  {bill.econEffect.Y_star_g > 0 ? '+' : ''}{(bill.econEffect.Y_star_g * 100).toFixed(1)}%/yr
                </span>
              </div>
            {/if}
          </div>
        {/if}

        {#if billPassable}
          <button class="primary bill-propose-btn" on:click={handlePropose}>Propose Bill &#8594;</button>
        {:else}
          <div class="bill-blocked-msg">Coalition support too low — cannot bring this bill to the floor.</div>
        {/if}
        </div><!-- .agenda-doc-inner -->
      </div><!-- .agenda-document -->
    {/if}

    <!-- ══════════════════════════════════════════════════════════
         Phase: Vote Result
    ══════════════════════════════════════════════════════════ -->
    {#if phase === 'result'}
      <div class="phase-result" in:fly={{ y: 14, duration: 240, delay: 60, easing: cubicOut }} out:fade={{ duration: 110 }}>
        {#if abstained}
          <div class="vote-result-bill">Turn skipped</div>
          <div class="vote-verdict-abstained" in:scale={{ duration: 380, start: 0.6, delay: 160, easing: backOut }}>ABSTAINED</div>
          <div class="vote-result-note">No bills could pass — coalition support too low.</div>
        {:else if voteResult}
          <div class="vote-result-bill">{selectedBill?.title}</div>
          <div class="{voteResult.passed ? 'vote-verdict-passed' : 'vote-verdict-failed'}"
               in:scale={{ duration: 380, start: 0.6, delay: 160, easing: backOut }}>
            {voteResult.passed ? 'PASSED' : 'FAILED'}
          </div>
        {/if}
        <div class="vote-result-turn-hint">
          {#if turnCount % TURNS_PER_YEAR === 0}
            Year {year} complete — Annual report follows
          {:else}
            Turn {turnInYear} of {TURNS_PER_YEAR} · Year {year}
          {/if}
        </div>
        <button class="primary" style="margin-top:1.25rem;" on:click={handleNext}>
          {#if collapsed}Coalition Collapsed &#8594;
          {:else if turnCount % TURNS_PER_YEAR === 0}Annual Report &#8594;
          {:else}Next Turn &#8594;{/if}
        </button>
      </div>
    {/if}

    <!-- ══════════════════════════════════════════════════════════
         Phase: Annual Economic Report
    ══════════════════════════════════════════════════════════ -->
    {#if phase === 'annual-report' && prevEconForReport}
      {@const prev = prevEconForReport}
      {@const curr = econState}
      <div class="phase-annual-report" in:fly={{ y: 14, duration: 260, delay: 80, easing: cubicOut }}>
        <div class="report-year-tag">Year {year} of {TOTAL_YEARS}</div>
        <div class="report-title">Annual Economic Report</div>
        <div class="report-headline">"{reportHeadline}"</div>

        <div class="report-indicators">
          <div class="report-ind">
            <div class="report-ind-label">GDP</div>
            <div class="report-ind-value">{curr.Y.toLocaleString()}</div>
            <div class="report-ind-delta {curr.Y >= prev.Y ? 'loyalty-up' : 'loyalty-down'}">
              {curr.Y >= prev.Y ? '▲' : '▼'} {Math.abs(((curr.Y - prev.Y) / prev.Y) * 100).toFixed(1)}%
            </div>
          </div>
          <div class="report-ind">
            <div class="report-ind-label">Unemployment</div>
            <div class="report-ind-value">{(curr.u * 100).toFixed(1)}%</div>
            <div class="report-ind-delta {curr.u <= prev.u ? 'loyalty-up' : 'loyalty-down'}">
              {curr.u <= prev.u ? '▼' : '▲'} {Math.abs((curr.u - prev.u) * 100).toFixed(1)}pp
            </div>
          </div>
          <div class="report-ind">
            <div class="report-ind-label">Inflation</div>
            <div class="report-ind-value">{(curr.pi * 100).toFixed(1)}%</div>
            <div class="report-ind-delta {curr.pi <= 0.025 ? 'loyalty-up' : curr.pi <= 0.04 ? 'loyalty-neutral' : 'loyalty-down'}">
              {curr.pi >= prev.pi ? '▲' : '▼'} {Math.abs((curr.pi - prev.pi) * 100).toFixed(1)}pp
            </div>
          </div>
          <div class="report-ind">
            <div class="report-ind-label">Deficit</div>
            <div class="report-ind-value">{curr.deficit > 0 ? '+' : ''}{curr.deficit}</div>
            <div class="report-ind-delta {curr.deficit <= prev.deficit ? 'loyalty-up' : 'loyalty-down'}">
              {curr.deficit <= prev.deficit ? '▼' : '▲'} vs last year
            </div>
          </div>
          <div class="report-ind">
            <div class="report-ind-label">Public Debt</div>
            <div class="report-ind-value">{curr.debt.toLocaleString()}</div>
            <div class="report-ind-delta {curr.debt <= prev.debt ? 'loyalty-up' : 'loyalty-down'}">
              {curr.debt > prev.debt ? '▲' : '▼'} +{curr.debt - prev.debt}
            </div>
          </div>
        </div>

        <button class="primary" style="margin-top:1.5rem;" on:click={closeAnnualReport}>
          {year < TOTAL_YEARS ? `Begin Year ${year + 1} &#8594;` : 'Proceed to Vote of Confidence &#8594;'}
        </button>
      </div>
    {/if}

    <!-- ══════════════════════════════════════════════════════════
         Phase: Vote of Confidence
    ══════════════════════════════════════════════════════════ -->
    {#if phase === 'confidence-vote'}
      <div class="phase-confidence" in:fly={{ y: 14, duration: 260, delay: 80, easing: cubicOut }}>
        <div class="report-year-tag">End of Session</div>
        <div class="report-title">Vote of Confidence</div>
        <p class="confidence-desc">
          The three-year parliamentary term concludes. The chamber votes on whether
          the government retains its mandate.
        </p>

        <div class="confidence-parties">
          {#each govParties as p}
            {@const isPlayer = p === party}
            {@const loy = !isPlayer ? (loyalty[p.name] ?? 100) : 100}
            {@const ayes = isPlayer ? p.seats : Math.floor(loy / 100 * p.seats)}
            <div class="confidence-party-row">
              <span class="swatch" style="background:{p.color}"></span>
              <span class="confidence-party-name" style="color:{p.color}">{p.name}</span>
              {#if isPlayer}<span class="you-tag">YOU</span>{/if}
              <div class="confidence-bar">
                <div class="confidence-bar-fill" style="width:{loy}%; background:{p.color}40;"></div>
              </div>
              <span class="confidence-ayes">{ayes} ayes</span>
            </div>
          {/each}
        </div>

        <div class="confidence-verdict {confidentVote.passes ? 'confidence-verdict--pass' : 'confidence-verdict--fail'}">
          {confidentVote.passes ? 'CONFIDENCE MAINTAINED ✓' : 'CONFIDENCE LOST ✗'}
        </div>
        <div class="confidence-total">
          {confidentVote.govAyes} ayes in favour &nbsp;·&nbsp; majority: {majority}
        </div>

        <button class="primary" style="margin-top:1.5rem;" on:click={closeConfidenceVote}>
          End Session &#8594;
        </button>
      </div>
    {/if}

    <!-- ══════════════════════════════════════════════════════════
         Phase: Finance Ministry
    ══════════════════════════════════════════════════════════ -->
    {#if phase === 'finance'}
      {@const _n   = allEconData.length}
      {@const _gsX = cPx(gameStartIdx, _n)}
      {@const _gR  = cRange(allEconData, 'Y', 'Y_star')}
      {@const _gT  = cYTicks(_gR[0], _gR[1], 3)}
      {@const _uR  = cRange(allEconData, 'u_pct')}
      {@const _uT  = cYTicks(_uR[0], _uR[1], 3)}
      {@const _piR = cRange(allEconData, 'pi_pct')}
      {@const _piT = cYTicks(_piR[0], _piR[1], 3)}
      {@const _dR  = cRange(allEconData, 'debt')}
      {@const _dT  = cYTicks(_dR[0], _dR[1], 3)}
      {@const _xL  = cXLabels(allEconData)}
      <div class="finance-document" in:fly={{ y: 14, duration: 240, delay: 100, easing: cubicOut }} out:fade={{ duration: 110 }}>

        <!-- Toolbar -->
        <div class="finance-toolbar">
          <button class="finance-back-btn" on:click={backToPolicy}>&#8592; Back</button>
          <span class="finance-toolbar-title">Economic Analysis</span>
          <span class="finance-toolbar-meta">{ECONOMIC_HISTORY.length + 1 + yearHistory.length}&nbsp;periods on record</span>
        </div>

        <!-- Indicator table -->
        <div class="finance-section-hdr finance-section-hdr--indicators">
          <span class="finance-section-hdr-icon">▣</span> Current Period Indicators
        </div>
        <div class="finance-table">
          <div class="finance-th">Indicator</div>
          <div class="finance-th finance-th--num">Value</div>
          <div class="finance-th">Status</div>
          <div class="finance-td">GDP</div>
          <div class="finance-td finance-td--num">{econState.Y.toLocaleString()}</div>
          <div class="finance-td finance-td--{econState.Y >= econState.Y_star ? 'up' : 'down'}">
            {econState.Y >= econState.Y_star ? '▲ above potential' : '▼ below potential'}
          </div>
          <div class="finance-td">Potential GDP</div>
          <div class="finance-td finance-td--num">{econState.Y_star.toLocaleString()}</div>
          <div class="finance-td">+{((currentEconParams.potential_growth + (3 - domainState.border) * 0.001) * 100).toFixed(1)}%/yr trend</div>
          <div class="finance-td">Unemployment</div>
          <div class="finance-td finance-td--num">{(econState.u * 100).toFixed(1)}%</div>
          <div class="finance-td">natural rate: {((ECON_PARAMS.u_star + (domainState.border - 3) * 0.003) * 100).toFixed(1)}%</div>
          <div class="finance-td">Inflation</div>
          <div class="finance-td finance-td--num">{(econState.pi * 100).toFixed(1)}%</div>
          <div class="finance-td finance-td--{econState.pi > 0.04 ? 'down' : econState.pi > 0.02 ? 'neutral' : 'up'}">
            {econState.pi > 0.04 ? 'above target' : econState.pi > 0.02 ? 'moderate' : 'below target'}
          </div>
          <div class="finance-td">Expected Inflation</div>
          <div class="finance-td finance-td--num">{(econState.pi_expected * 100).toFixed(1)}%</div>
          <div class="finance-td">adaptive expectations</div>
          <div class="finance-td">Interest Rate</div>
          <div class="finance-td finance-td--num">{(econState.i * 100).toFixed(1)}%</div>
          <div class="finance-td">independent central bank</div>
          <div class="finance-td">Deficit / Surplus</div>
          <div class="finance-td finance-td--num">{econState.deficit > 0 ? '+' : ''}{econState.deficit}</div>
          <div class="finance-td">{((econState.deficit / econState.Y) * 100).toFixed(1)}% of GDP</div>
          <div class="finance-td finance-td--last">Public Debt</div>
          <div class="finance-td finance-td--num finance-td--last">{econState.debt.toLocaleString()}</div>
          <div class="finance-td finance-td--last">{Math.round(econState.debt / econState.Y * 100)}% of GDP</div>
        </div>

        <!-- Time-series charts -->
        <div class="finance-section-hdr finance-section-hdr--charts">
          <span class="finance-section-hdr-icon">◈</span> Historical Time Series
          <span class="finance-section-hdr-legend">
            <span class="finance-hdr-legend-divider"></span> Gov. formation
          </span>
        </div>
        <div class="finance-charts">

          <!-- GDP + Potential -->
          <div class="finance-chart-block">
            <div class="finance-chart-label">GDP &amp; Potential GDP</div>
            <svg viewBox="0 0 {FC_W} {FC_H}" class="finance-chart-svg">
              {#each _gT as tick}
                {@const ty = cPy(tick, _gR[0], _gR[1])}
                <line x1={FC_LM} y1={ty} x2={FC_W - FC_RM} y2={ty} stroke="#dde5ec" stroke-width="1"/>
                <text x={FC_LM - 4} y={ty + 3.5} text-anchor="end" fill="#5a6e7a" font-size="9" font-family="Inconsolata,monospace">{fmtInt(tick)}</text>
              {/each}
              <line x1={FC_LM} y1={FC_TM + FC_PH} x2={FC_W - FC_RM} y2={FC_TM + FC_PH} stroke="#a8bcc8" stroke-width="0.8"/>
              {#each _xL as { i, year }}
                {@const lx = cPx(i, _n)}
                <line x1={lx} y1={FC_TM + FC_PH} x2={lx} y2={FC_TM + FC_PH + 3} stroke="#a8bcc8" stroke-width="0.8"/>
                <text x={lx} y={FC_TM + FC_PH + 14} text-anchor="middle" fill="#5a6e7a" font-size="8" font-family="Inconsolata,monospace">{year === 0 ? '0' : year > 0 ? `Y${year}` : year}</text>
              {/each}
              <line x1={_gsX} y1={FC_TM} x2={_gsX} y2={FC_TM + FC_PH} stroke="#4472c4" stroke-width="1" stroke-dasharray="3,2"/>
              <polyline points={cPts(allEconData, 'Y_star', _gR[0], _gR[1])} fill="none" stroke="#4472c4" stroke-width="1.2" stroke-dasharray="3,2"/>
              <polyline points={cPts(allEconData, 'Y', _gR[0], _gR[1])} fill="none" stroke="#217346" stroke-width="2"/>
            </svg>
            <div class="finance-chart-legend">
              <span class="finance-legend-item"><span class="finance-legend-dot" style="background:#217346"></span>GDP</span>
              <span class="finance-legend-item"><span class="finance-legend-dash"></span>Potential</span>
            </div>
          </div>

          <!-- Unemployment -->
          <div class="finance-chart-block">
            <div class="finance-chart-label">Unemployment (%)</div>
            <svg viewBox="0 0 {FC_W} {FC_H}" class="finance-chart-svg">
              {#each _uT as tick}
                {@const ty = cPy(tick, _uR[0], _uR[1])}
                <line x1={FC_LM} y1={ty} x2={FC_W - FC_RM} y2={ty} stroke="#dde5ec" stroke-width="1"/>
                <text x={FC_LM - 4} y={ty + 3.5} text-anchor="end" fill="#5a6e7a" font-size="9" font-family="Inconsolata,monospace">{fmtPct(tick)}</text>
              {/each}
              <line x1={FC_LM} y1={FC_TM + FC_PH} x2={FC_W - FC_RM} y2={FC_TM + FC_PH} stroke="#a8bcc8" stroke-width="0.8"/>
              {#each _xL as { i, year }}
                {@const lx = cPx(i, _n)}
                <line x1={lx} y1={FC_TM + FC_PH} x2={lx} y2={FC_TM + FC_PH + 3} stroke="#a8bcc8" stroke-width="0.8"/>
                <text x={lx} y={FC_TM + FC_PH + 14} text-anchor="middle" fill="#5a6e7a" font-size="8" font-family="Inconsolata,monospace">{year === 0 ? '0' : year > 0 ? `Y${year}` : year}</text>
              {/each}
              <line x1={_gsX} y1={FC_TM} x2={_gsX} y2={FC_TM + FC_PH} stroke="#4472c4" stroke-width="1" stroke-dasharray="3,2"/>
              <polyline points={cPts(allEconData, 'u_pct', _uR[0], _uR[1])} fill="none" stroke="#c2410c" stroke-width="2"/>
            </svg>
          </div>

          <!-- Inflation -->
          <div class="finance-chart-block">
            <div class="finance-chart-label">Inflation (%)</div>
            <svg viewBox="0 0 {FC_W} {FC_H}" class="finance-chart-svg">
              {#each _piT as tick}
                {@const ty = cPy(tick, _piR[0], _piR[1])}
                <line x1={FC_LM} y1={ty} x2={FC_W - FC_RM} y2={ty} stroke="#dde5ec" stroke-width="1"/>
                <text x={FC_LM - 4} y={ty + 3.5} text-anchor="end" fill="#5a6e7a" font-size="9" font-family="Inconsolata,monospace">{fmtPct(tick)}</text>
              {/each}
              <line x1={FC_LM} y1={FC_TM + FC_PH} x2={FC_W - FC_RM} y2={FC_TM + FC_PH} stroke="#a8bcc8" stroke-width="0.8"/>
              {#each _xL as { i, year }}
                {@const lx = cPx(i, _n)}
                <line x1={lx} y1={FC_TM + FC_PH} x2={lx} y2={FC_TM + FC_PH + 3} stroke="#a8bcc8" stroke-width="0.8"/>
                <text x={lx} y={FC_TM + FC_PH + 14} text-anchor="middle" fill="#5a6e7a" font-size="8" font-family="Inconsolata,monospace">{year === 0 ? '0' : year > 0 ? `Y${year}` : year}</text>
              {/each}
              <line x1={_gsX} y1={FC_TM} x2={_gsX} y2={FC_TM + FC_PH} stroke="#4472c4" stroke-width="1" stroke-dasharray="3,2"/>
              <polyline points={cPts(allEconData, 'pi_pct', _piR[0], _piR[1])} fill="none" stroke="#b91c1c" stroke-width="2"/>
            </svg>
          </div>

          <!-- Public Debt -->
          <div class="finance-chart-block">
            <div class="finance-chart-label">Public Debt</div>
            <svg viewBox="0 0 {FC_W} {FC_H}" class="finance-chart-svg">
              {#each _dT as tick}
                {@const ty = cPy(tick, _dR[0], _dR[1])}
                <line x1={FC_LM} y1={ty} x2={FC_W - FC_RM} y2={ty} stroke="#dde5ec" stroke-width="1"/>
                <text x={FC_LM - 4} y={ty + 3.5} text-anchor="end" fill="#5a6e7a" font-size="9" font-family="Inconsolata,monospace">{fmtInt(tick)}</text>
              {/each}
              <line x1={FC_LM} y1={FC_TM + FC_PH} x2={FC_W - FC_RM} y2={FC_TM + FC_PH} stroke="#a8bcc8" stroke-width="0.8"/>
              {#each _xL as { i, year }}
                {@const lx = cPx(i, _n)}
                <line x1={lx} y1={FC_TM + FC_PH} x2={lx} y2={FC_TM + FC_PH + 3} stroke="#a8bcc8" stroke-width="0.8"/>
                <text x={lx} y={FC_TM + FC_PH + 14} text-anchor="middle" fill="#5a6e7a" font-size="8" font-family="Inconsolata,monospace">{year === 0 ? '0' : year > 0 ? `Y${year}` : year}</text>
              {/each}
              <line x1={_gsX} y1={FC_TM} x2={_gsX} y2={FC_TM + FC_PH} stroke="#4472c4" stroke-width="1" stroke-dasharray="3,2"/>
              <polyline points={cPts(allEconData, 'debt', _dR[0], _dR[1])} fill="none" stroke="#7c3aed" stroke-width="2"/>
            </svg>
          </div>

        </div><!-- /.finance-charts -->

      </div>
    {/if}

  </div><!-- /.action-panel -->


  <!-- ════════════════════════════════════════════════════════════
       RIGHT: Context sidebar (unchanged)
  ════════════════════════════════════════════════════════════ -->
  <div class="context-sidebar">

    <div class="sidebar-card sidebar-card--flush">
      <div class="sidebar-card-header">Chamber</div>
      <svg viewBox="0 0 680 380" xmlns="http://www.w3.org/2000/svg">
        {#each seats as seat, i}
          {@const p     = PARTIES[seat.partyIndex]}
          {@const inGov = govIndices.has(seat.partyIndex)}
          {@const vote  = votes[i]}
          <circle
            cx={seat.x} cy={seat.y} r="5"
            fill={vote === 'nay' ? 'none' : p.color}
            stroke={vote === 'nay' ? p.color : 'none'}
            stroke-width={vote === 'nay' ? '1.5' : undefined}
            opacity={vote === 'aye' ? 1 : vote === 'nay' ? 0.55 : inGov ? 1 : 0.3}
          >
            <title>{p.name}{vote ? ` — ${vote.toUpperCase()}` : ''}</title>
          </circle>
        {/each}
      </svg>
      <div class="sidebar-caption">{total} seats &nbsp;·&nbsp; Majority: {majority}</div>
    </div>

    <div class="sidebar-card">
      <div class="sidebar-card-header">
        Government
        <span class="sidebar-card-stat">{govSeats} / {total} seats &nbsp;·&nbsp; {pct(govSeats)}%</span>
      </div>
      {#each govParties as p}
        {@const isPlayer = p === party}
        {@const loy      = !isPlayer ? (loyalty[p.name] ?? 100) : null}
        {@const loyCls   = loy !== null ? loyaltyCls(loy) : ''}
        <div class="sidebar-party-row" class:sidebar-party-row--player={isPlayer}>
          <div class="sidebar-party-row-top">
            <span class="swatch" style="background:{p.color}"></span>
            <span class="sidebar-party-name">{p.name}</span>
            {#if isPlayer}<span class="you-tag">YOU</span>{/if}
            <span class="sidebar-party-seats">{p.seats}</span>
          </div>
          {#if loy !== null}
            <div class="sidebar-loyalty-track">
              <div class="sidebar-loyalty-fill {loyCls}" style="width:{loy}%;"></div>
            </div>
            <div class="sidebar-loyalty-label {loyCls}">Loyalty: {loy.toFixed(1)}%</div>
          {/if}
          <div class="sidebar-party-ideology">{econLabel(p.economic)} &middot; {socialLabel(p.social)}</div>
        </div>
      {/each}
    </div>

    <div class="sidebar-card sidebar-card--dim">
      <div class="sidebar-card-header">
        Opposition
        <span class="sidebar-card-stat">{oppSeats} / {total} seats &nbsp;·&nbsp; {pct(oppSeats)}%</span>
      </div>
      {#each oppParties as p}
        <div class="sidebar-opp-row">
          <span class="swatch" style="background:{p.color}"></span>
          <span class="sidebar-party-name">{p.name}</span>
          <span class="sidebar-opp-ideology">{econLabel(p.economic)} &middot; {socialLabel(p.social)}</span>
          <span class="sidebar-party-seats">{p.seats}</span>
        </div>
      {/each}
    </div>

    <div class="sidebar-card sidebar-card--flush">
      <div class="sidebar-card-header">Political Ideology</div>
      <svg viewBox="0 0 280 280" xmlns="http://www.w3.org/2000/svg">
        <rect x={CP} y={CP} width={CS} height={CS} fill="#14121e" />
        <rect x={CP} y={CP} width={CS} height={CS} fill="none" stroke="#1c1a2c" stroke-width="1" />
        <line x1={CP} y1={cy0} x2={CP+CS} y2={cy0} stroke="#1c1a2c" stroke-width="1" />
        <line x1={cx0} y1={CP} x2={cx0} y2={CP+CS} stroke="#1c1a2c" stroke-width="1" />
        <text x={cx0} y={CP - 6}   fill="#64748b" font-size="9" font-family="Inconsolata, monospace" text-anchor="middle" letter-spacing="0.04em">Authoritarian</text>
        <text x={cx0} y={CP+CS+14} fill="#64748b" font-size="9" font-family="Inconsolata, monospace" text-anchor="middle" letter-spacing="0.04em">Libertarian</text>
        <text x={CP - 4} y={cy0 + 4} fill="#64748b" font-size="9" font-family="Inconsolata, monospace" text-anchor="end" letter-spacing="0.04em">Left</text>
        <text x={CP+CS+4} y={cy0 + 4} fill="#64748b" font-size="9" font-family="Inconsolata, monospace" text-anchor="start" letter-spacing="0.04em">Right</text>
        {#each PARTIES as p}
          {@const px     = mapX(p.economic)}
          {@const py     = mapY(p.social)}
          {@const isP    = p === party}
          {@const abbr   = partyAbbr(p)}
          {@const onLeft = px <= cx0}
          <circle cx={px} cy={py} r={isP ? 7 : 5} fill={p.color} opacity="1">
            <title>{p.name}</title>
          </circle>
          <text
            x={px + (onLeft ? 9 : -9)} y={py + 4}
            fill={p.color} font-size="8" font-family="Inconsolata, monospace"
            text-anchor={onLeft ? 'start' : 'end'}
          >{abbr}</text>
        {/each}
      </svg>
    </div>

    {#if party?.caucuses?.length}
      <div class="sidebar-card">
        <div class="sidebar-card-header">{party.name} — Caucuses</div>
        {#each party.caucuses as caucus, i}
          <div class="sidebar-caucus-item" class:sidebar-caucus-item--last={i === party.caucuses.length - 1}>
            <div class="sidebar-caucus-dot" style="background:{party.color}; opacity:{1 - i * 0.25};"></div>
            <div class="sidebar-caucus-body">
              <div class="sidebar-caucus-name">{caucus.name}</div>
              <div class="sidebar-caucus-desc">{caucus.desc}</div>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    {#if phase === 'result' && !abstained && voteResult}
      <div class="sidebar-card">
        <div class="sidebar-card-header">Vote Tally</div>
        <div class="vote-sidebar-tally">
          Ayes: <strong>{voteResult.ayes}</strong> &nbsp;&middot;&nbsp;
          Nays: <strong>{voteResult.nays}</strong> &nbsp;&middot;&nbsp;
          Majority: {majority}
        </div>
        {#if voteResult.passed && Object.keys(voteResult.loyaltyChanges).length}
          <div class="vote-loyalty-changes">
            {#each Object.entries(voteResult.loyaltyChanges) as [name, c]}
              {@const sign = c.delta >= 0 ? '+' : ''}
              {@const cls  = c.delta > 0 ? 'loyalty-up' : c.delta < 0 ? 'loyalty-down' : 'loyalty-neutral'}
              <div class="vote-loyalty-change {cls}">
                {name}: {c.prev.toFixed(1)}% &rarr; {c.next.toFixed(1)}%
                <span class="vote-loyalty-delta">({sign}{c.delta.toFixed(1)}%)</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

  </div><!-- /.context-sidebar -->

</div><!-- /.parliament-layout -->

{/if}

<style>
  /* ── Turn counter ── */
  .year-counter {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 3px;
  }

  .year-counter-label {
    font-family: 'Oswald', sans-serif;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .year-pips {
    display: flex;
    gap: 5px;
  }

  .year-pip {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 1.5px solid #475569;
    background: transparent;
    transition: background 0.2s, border-color 0.2s;
  }

  .year-pip--filled {
    background: #475569;
    border-color: #475569;
  }

  .year-counter-sub {
    font-family: 'Inconsolata', monospace;
    font-size: 10px;
    color: #475569;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  /* ── Economic dashboard ── */
  .econ-dashboard {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: 0.5rem;
  }

  .econ-dash-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 4px 0;
    border-bottom: 1px solid #1c1a2c;
  }

  .econ-dash-label {
    font-family: 'Inconsolata', monospace;
    font-size: 10px;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    width: 100px;
    flex-shrink: 0;
  }

  .econ-dash-value {
    font-family: 'Inconsolata', monospace;
    font-size: 13px;
    color: #cbd5e1;
    font-weight: 600;
    flex: 1;
  }

  .econ-dash-note {
    font-family: 'Inconsolata', monospace;
    font-size: 10px;
    color: #475569;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  .primary--secondary {
    background: transparent;
    border-color: #2d2b42;
    color: #64748b;
  }

  .primary--secondary:hover {
    border-color: #475569;
    color: #94a3b8;
  }

  .finance-sub {
    font-family: 'Inconsolata', monospace;
    font-size: 10px;
    color: #475569;
    letter-spacing: 0.06em;
    margin-bottom: 0.75rem;
    text-transform: uppercase;
  }

  /* ── Annual report ── */
  .phase-annual-report {
    padding-top: 0.5rem;
  }

  .report-year-tag {
    font-family: 'Inconsolata', monospace;
    font-size: 10px;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 0.3rem;
  }

  .report-title {
    font-family: 'Oswald', sans-serif;
    font-size: 20px;
    font-weight: 500;
    color: #cbd5e1;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-bottom: 0.75rem;
  }

  .report-headline {
    font-size: 13px;
    color: #94a3b8;
    font-style: italic;
    line-height: 1.6;
    border-left: 2px solid #2d2b42;
    padding-left: 0.75rem;
    margin-bottom: 1.25rem;
  }

  .report-indicators {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 0.5rem;
  }

  .report-ind {
    background: #14121e;
    border: 1px solid #2d2b42;
    padding: 10px 12px;
  }

  .report-ind-label {
    font-family: 'Inconsolata', monospace;
    font-size: 9px;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 4px;
  }

  .report-ind-value {
    font-family: 'Inconsolata', monospace;
    font-size: 15px;
    color: #e2e8f0;
    font-weight: 600;
    margin-bottom: 2px;
  }

  .report-ind-delta {
    font-family: 'Inconsolata', monospace;
    font-size: 10px;
  }

  /* ── Vote of confidence ── */
  .phase-confidence {
    padding-top: 0.5rem;
  }

  .confidence-desc {
    font-size: 12px;
    color: #64748b;
    line-height: 1.7;
    margin: 0 0 1rem;
  }

  .confidence-parties {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 1rem;
  }

  .confidence-party-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .confidence-party-name {
    font-size: 12px;
    font-weight: 500;
    flex: 1;
  }

  .confidence-bar {
    width: 80px;
    height: 4px;
    background: #1c1a2c;
    flex-shrink: 0;
  }

  .confidence-bar-fill {
    height: 100%;
  }

  .confidence-ayes {
    font-family: 'Inconsolata', monospace;
    font-size: 11px;
    color: #475569;
    width: 50px;
    text-align: right;
  }

  .confidence-verdict {
    font-family: 'Oswald', sans-serif;
    font-size: 18px;
    font-weight: 600;
    letter-spacing: 0.06em;
    padding: 10px 0;
    margin-bottom: 4px;
  }

  .confidence-verdict--pass { color: #22c55e; }
  .confidence-verdict--fail { color: #f87171; }

  .confidence-total {
    font-family: 'Inconsolata', monospace;
    font-size: 11px;
    color: #475569;
    letter-spacing: 0.04em;
  }

  /* ── Vote result turn hint ── */
  .vote-result-turn-hint {
    font-family: 'Inconsolata', monospace;
    font-size: 10px;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-top: 0.75rem;
  }

  /* ── Finance Ministry document (light / Excel theme) ── */
  .finance-document {
    background: #f8f9fa;
    border: 1px solid #c8d4dc;
    margin-top: 0.5rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.18);
  }

  .finance-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 14px;
    background: #217346;
    border-bottom: none;
  }

  .finance-back-btn {
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.35);
    color: #ffffff;
    font-family: 'Inconsolata', monospace;
    font-size: 11px;
    letter-spacing: 0.05em;
    padding: 4px 10px;
    cursor: pointer;
    text-transform: uppercase;
    transition: background 0.12s;
    white-space: nowrap;
  }

  .finance-back-btn:hover { background: rgba(255,255,255,0.22); }

  .finance-toolbar-title {
    font-family: 'Oswald', sans-serif;
    font-size: 15px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #ffffff;
    flex: 1;
  }

  .finance-toolbar-meta {
    font-family: 'Inconsolata', monospace;
    font-size: 10px;
    color: rgba(255,255,255,0.6);
    letter-spacing: 0.05em;
  }

  .finance-section-hdr {
    display: flex;
    align-items: center;
    gap: 7px;
    font-family: 'Inconsolata', monospace;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #ffffff;
    padding: 9px 14px 8px;
    border-top: none;
    border-bottom: none;
  }

  .finance-section-hdr--indicators {
    background: #2e6b9e;
  }

  .finance-section-hdr--charts {
    background: #1f5c35;
  }

  .finance-section-hdr-icon {
    opacity: 0.7;
    font-size: 12px;
    line-height: 1;
  }

  .finance-section-hdr-legend {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    font-weight: 400;
    letter-spacing: 0.05em;
    color: rgba(255,255,255,0.75);
    text-transform: none;
  }

  .finance-hdr-legend-divider {
    display: inline-block;
    width: 14px;
    height: 0;
    border-top: 2px dashed rgba(255,255,255,0.7);
    vertical-align: middle;
  }


  .finance-table {
    display: grid;
    grid-template-columns: 1fr 88px 1fr;
  }

  /* alternating data rows (every other group of 3 cells, offset by 3 header cells) */
  .finance-table > div:nth-child(6n+7),
  .finance-table > div:nth-child(6n+8),
  .finance-table > div:nth-child(6n+9) { background: #eef4f8; }

  .finance-th {
    padding: 6px 14px;
    background: #d5e0ea;
    font-family: 'Inconsolata', monospace;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #374151;
    border-bottom: 2px solid #a8bcc8;
    border-right: 1px solid #c0ccd6;
  }

  .finance-th:last-child { border-right: none; }
  .finance-th--num { text-align: right; }

  .finance-td {
    padding: 7px 14px;
    font-family: 'Inconsolata', monospace;
    font-size: 12px;
    color: #374151;
    border-bottom: 1px solid #dde5ec;
    border-right: 1px solid #dde5ec;
    background: #ffffff;
  }

  .finance-table > div:nth-child(6n+7),
  .finance-table > div:nth-child(6n+8),
  .finance-table > div:nth-child(6n+9) { background: #eef4f8; }

  .finance-td:nth-child(3n) { border-right: none; }
  .finance-td--last { border-bottom: none; }

  .finance-td--num {
    text-align: right;
    color: #111827;
    font-weight: 700;
    font-size: 13px;
  }

  .finance-td--up      { color: #166534; font-weight: 600; }
  .finance-td--down    { color: #991b1b; font-weight: 600; }
  .finance-td--neutral { color: #92400e; font-weight: 600; }

  .finance-charts {
    padding: 14px 14px 18px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    background: #f8f9fa;
  }

  .finance-chart-block {}

  .finance-chart-label {
    font-family: 'Inconsolata', monospace;
    font-size: 11px;
    font-weight: 700;
    color: #374151;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 6px;
  }

  .finance-chart-svg {
    display: block;
    width: 100%;
    background: #ffffff;
    border: 1px solid #dde5ec;
  }

  .finance-chart-legend {
    display: flex;
    gap: 14px;
    margin-top: 5px;
  }

  .finance-legend-item {
    display: flex;
    align-items: center;
    gap: 5px;
    font-family: 'Inconsolata', monospace;
    font-size: 11px;
    color: #4b5563;
  }

  .finance-legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .finance-legend-dash {
    width: 18px;
    height: 2px;
    background: repeating-linear-gradient(90deg, #4472c4 0, #4472c4 4px, transparent 4px, transparent 7px);
    flex-shrink: 0;
  }

</style>
