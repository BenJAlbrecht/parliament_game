<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { PARTIES, POLICY_SCALES, STARTING_POLICY, econLabel, socialLabel, leanLabel, leanCls, logoSrc } from '$lib/data.js';
  import { calculateSeats } from '$lib/layout.js';
  import { init, initAgenda, proposeBill, getPolicyState, getSessionStats } from '$lib/vote.js';
  import { playerParty, selectedCoalition, coalitionPartners, committedGoals, endingData } from '$lib/stores.js';

  // ── Constants ────────────────────────────────────────────────────────────────
  const BILL_LIMIT = 10;
  const total      = PARTIES.reduce((s, p) => s + p.seats, 0);
  const majority   = Math.floor(total / 2) + 1;
  const DOMAIN_ORDER = Object.keys(POLICY_SCALES);

  // ── Store reads ──────────────────────────────────────────────────────────────
  let party      = null;
  let partners   = [];
  let coalition  = null;
  let goals      = {};

  // ── Session state ────────────────────────────────────────────────────────────
  let seats         = [];
  let votes         = [];         // 'aye' | 'nay' | null per seat index
  let loyalty       = {};
  let policyState   = { ...STARTING_POLICY };

  let turnCount       = 0;
  let billsProposed   = 0;
  let flagshipsPassed = 0;
  let turnsAbstained  = 0;
  let agenda          = [];

  // ── Phase management ─────────────────────────────────────────────────────────
  // 'policy' | 'agenda' | 'bill-detail' | 'result'
  let phase        = 'policy';
  let selectedBill = null;
  let voteResult   = null;
  let abstained    = false;
  let collapsed    = false;

  // ── Derived: government seat set ─────────────────────────────────────────────
  $: govIndices = (() => {
    if (!party) return new Set();
    const names = new Set([party.name, ...partners.map(p => p.name)]);
    return new Set(PARTIES.map((p, i) => names.has(p.name) ? i : -1).filter(i => i >= 0));
  })();

  // ── Stats builder ────────────────────────────────────────────────────────────
  function buildStats() {
    return {
      ...getSessionStats(),
      flagshipsPassed,
      turnsAbstained,
      allPartnersLoyalAbove50: partners.every(p => (loyalty[p.name] ?? 0) > 50),
      policyState: { ...policyState },
    };
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  onMount(() => {
    party     = $playerParty;
    partners  = $coalitionPartners;
    coalition = $selectedCoalition;
    goals     = $committedGoals;
    if (!party || !coalition) { goto('/select'); return; }

    seats       = calculateSeats(PARTIES);
    votes       = new Array(seats.length).fill(null);
    const flagships = [...(coalition.flagships?.[party.name] ?? [])];
    agenda      = initAgenda(flagships);
    init(seats, party, partners);
    loyalty     = Object.fromEntries(partners.map(p => [p.name, 100]));
    policyState = { ...STARTING_POLICY };
    nextTurn();
  });

  // ── Turn flow ────────────────────────────────────────────────────────────────
  function nextTurn() {
    turnCount++;
    votes      = new Array(seats.length).fill(null);
    phase      = 'policy';
    abstained  = false;
    voteResult = null;
    selectedBill = null;
  }

  function openAgenda() { phase = 'agenda'; }

  function openBillDetail(bill) {
    selectedBill = bill;
    phase = 'bill-detail';
  }

  function backToPolicy() { phase = 'policy'; }
  function backToAgenda() { phase = 'agenda'; }

  function handleAbstain() {
    turnsAbstained++;
    abstained = true;
    phase = 'result';
  }

  function handlePropose() {
    billsProposed++;
    agenda = agenda.filter(b => b.title !== selectedBill.title);
    const result = proposeBill(selectedBill);
    if (selectedBill.flagship && result.passed) flagshipsPassed++;
    votes      = result.votes;
    loyalty    = { ...result.newLoyalty };
    if (result.passed) policyState = getPolicyState();
    voteResult = result;
    collapsed  = partners.some(p => (result.newLoyalty[p.name] ?? 100) <= 0);
    phase      = 'result';
  }

  function handleNext() {
    if (collapsed || turnCount >= BILL_LIMIT) {
      endingData.set({
        finalLoyalty:   { ...loyalty },
        billsProposed,
        flagshipsPassed,
        collapsed,
        stats:          buildStats(),
      });
      goto('/ending');
    } else {
      nextTurn();
    }
  }

  // ── Agenda computed ───────────────────────────────────────────────────────────
  $: agendaData = agenda.map((bill, i) => {
    let ayes = party ? party.seats : 0;
    for (const p of partners) {
      const L = loyalty[p.name] / 100;
      const k = Math.abs(bill.score - p[bill.type]);
      const c = Math.max(0, 1 - k / 10);
      ayes   += Math.floor((L + (1 - L) * c) * p.seats);
    }
    return { bill, passable: ayes >= majority, idx: i };
  });

  $: allBlocked = agendaData.length > 0 && agendaData.every(d => !d.passable);

  $: agendaGroups = (() => {
    const map = new Map();
    agendaData.forEach(d => {
      const dim = d.bill.dimension ?? 'other';
      if (!map.has(dim)) map.set(dim, []);
      map.get(dim).push(d);
    });
    return [...map.entries()].sort(([a], [b]) =>
      (DOMAIN_ORDER.indexOf(a) + 1 || 99) - (DOMAIN_ORDER.indexOf(b) + 1 || 99)
    );
  })();

  // ── Bill detail computed ──────────────────────────────────────────────────────
  $: billBreakdown = selectedBill ? computeBreakdown(selectedBill) : [];
  $: billAyes = billBreakdown.reduce((s, b) => s + b.ayes, 0);
  $: billNays = total - billAyes;
  $: billPassable = billAyes >= majority;
  $: billGovRows  = billBreakdown.filter(b => b.role !== 'opposition');
  $: billOppRows  = billBreakdown.filter(b => b.role === 'opposition');

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
  function mapY(s) { return CP + ((s + 10) / 20) * CS; }
  function partyAbbr(p) {
    const w = p.name.split(/\s+/);
    return w.length > 1 ? w.map(x => x[0]).join('') : p.name.slice(0, 2).toUpperCase();
  }

  // ── Programme goals live status ───────────────────────────────────────────────
  function goalMet(goal) {
    return goal.check(policyState, buildStats());
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
      <img class="party-header-logo" src={logoSrc(party.name)} alt="">
      <span class="party-header-name" style="color:{party.color}">{party.name}</span>
      <span class="party-header-role">Leader of the {coalition.name}</span>
    </div>

    <!-- Turn counter -->
    <div class="turn-counter">Turn {turnCount} / {BILL_LIMIT}</div>

    <!-- ── Phase: Policy Home ── -->
    {#if phase === 'policy'}
      <div class="panel-section-label">Policy State</div>
      <div class="policy-dim-list">
        {#each Object.entries(POLICY_SCALES) as [key, scale]}
          {@const val  = policyState[key] ?? 1}
          {@const desc = scale.steps[val - 1] ?? ''}
          {@const [lp, rp] = scale.poles}
          <div class="policy-dimension">
            <div class="policy-dim-name">{scale.label}</div>
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

      <!-- Programme goals live tracker -->
      {#if goals && Object.keys(goals).length > 0}
        <div class="panel-section-label" style="margin-top:1.5rem;">Programme for Government</div>
        <div class="programme-goal-list">
          {#each Object.entries(goals) as [partnerName, goal]}
            {@const partner = PARTIES.find(p => p.name === partnerName)}
            {@const met = goalMet(goal)}
            <div class="programme-goal-item" class:programme-goal--met={met} class:programme-goal--unmet={!met}>
              <span class="programme-goal-icon">{met ? '✓' : '·'}</span>
              <div class="programme-goal-body">
                <div class="programme-goal-partner" style="color:{partner?.color ?? '#94a3b8'}">{partnerName}</div>
                <div class="programme-goal-title">{goal.title}</div>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <div class="panel-section-label" style="margin-top:1.5rem;">Actions</div>
      <button class="primary" style="margin-top:0.75rem;" on:click={openAgenda}>
        Legislative Agenda &#8594;
      </button>
    {/if}

    <!-- ── Phase: Legislative Agenda ── -->
    {#if phase === 'agenda'}
      <button class="back-btn" on:click={backToPolicy}>&#8592; Back</button>
      <div class="phase-label">Legislative Agenda</div>

      {#each agendaGroups as [dim, items]}
        {@const groupLabel = POLICY_SCALES[dim]?.label ?? 'Other'}
        <div class="agenda-group">
          <div class="agenda-group-label">{groupLabel}</div>
          {#each items as { bill, passable }}
            <div
              class="agenda-item"
              class:agenda-item--passable={passable}
              class:agenda-item--blocked={!passable}
              on:click={() => openBillDetail(bill)}
              role="button"
              tabindex="0"
              on:keydown={e => e.key === 'Enter' && openBillDetail(bill)}
            >
              <div class="agenda-item-body">
                <div class="agenda-item-title">{bill.title}</div>
                <div class="agenda-item-meta">
                  <span class="bill-lean-tag {leanCls(bill.score)}">{leanLabel(bill.score)}</span>
                  {#if bill.flagship}<span class="bill-mandate-tag">Mandate</span>{/if}
                </div>
              </div>
              <span class="bill-pass-status {passable ? 'pass' : 'block'}">
                {passable ? 'Passable ✓' : 'Blocked ✗'}
              </span>
            </div>
          {/each}
        </div>
      {/each}

      {#if allBlocked}
        <div class="blocked-banner">All remaining bills are blocked — coalition support too low.</div>
        <button class="primary" on:click={handleAbstain}>Abstain (skip turn) &#8594;</button>
      {/if}
    {/if}

    <!-- ── Phase: Bill Detail ── -->
    {#if phase === 'bill-detail' && selectedBill}
      {@const bill = selectedBill}
      {@const accentColor = billPassable ? '#4ade80' : '#f87171'}
      {@const posLabel = bill.type === 'economic' ? econLabel(bill.score) : socialLabel(bill.score)}

      <div class="phase-bill-detail">
        <button class="back-btn" on:click={backToAgenda}>&#8592; Back to Agenda</button>

        <!-- Bill header card -->
        <div class="bill-header-card" style="border-top-color:{accentColor};">
          <div class="bill-header-body">
            <div class="bill-header-title">{bill.title}</div>
            <div class="bill-header-meta">
              <span class="bill-card-type">{bill.type}</span>
              {#if bill.flagship}<span class="bill-mandate-tag">Mandate</span>{/if}
              <span class="bill-position-tag">{posLabel}</span>
            </div>
          </div>
          <div class="bill-verdict bill-verdict--{billPassable ? 'pass' : 'block'}">
            {billPassable ? 'PASSES ✓' : 'BLOCKED ✗'}
          </div>
        </div>

        <!-- Vote breakdown -->
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

        <!-- Coalition loyalty preview -->
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

        <!-- Policy effect -->
        {#if bill.dimension && bill.delta}
          {@const scale    = POLICY_SCALES[bill.dimension]}
          {@const curVal   = policyState[bill.dimension] ?? 1}
          {@const newVal   = Math.max(1, Math.min(5, curVal + bill.delta))}
          {@const signCls  = bill.delta > 0 ? 'policy-step--up' : 'policy-step--down'}
          {@const [lp, rp] = scale.poles}
          {@const dSign    = bill.delta > 0 ? '+' : ''}
          {@const dColor   = bill.delta > 0 ? 'loyalty-up' : 'loyalty-down'}
          <div class="bill-section">
            <div class="bill-section-header">
              <span class="bill-section-label">Policy Effect</span>
              <span class="bill-section-note">if passed &nbsp;<span class={dColor}>{dSign}{bill.delta}</span></span>
            </div>
            <div class="bill-policy-dim-name">{scale.label}</div>
            <div class="policy-spectrum policy-spectrum--compact">
              <span class="policy-pole policy-pole--left">{lp}</span>
              <div class="policy-track">
                {#each [1,2,3,4,5] as step}
                  <div class="policy-step"
                    class:policy-step--up  ={step === newVal && bill.delta > 0}
                    class:policy-step--down={step === newVal && bill.delta < 0}
                    class:policy-step--dim ={step === curVal && step !== newVal}
                  ></div>
                {/each}
              </div>
              <span class="policy-pole policy-pole--right">{rp}</span>
            </div>
            <div class="bill-policy-transition">
              <span class="bill-policy-from">{scale.steps[curVal - 1]}</span>
              <span class="bill-policy-arrow {dColor}">&#8594;</span>
              <span class="bill-policy-to {dColor}">{scale.steps[newVal - 1]}</span>
            </div>
          </div>
        {/if}

        <!-- Propose / blocked -->
        {#if billPassable}
          <button class="primary bill-propose-btn" on:click={handlePropose}>Propose Bill &#8594;</button>
        {:else}
          <div class="bill-blocked-msg">Coalition support too low — cannot bring this bill to the floor.</div>
        {/if}
      </div>
    {/if}

    <!-- ── Phase: Vote Result ── -->
    {#if phase === 'result'}
      <div class="phase-result">
        {#if abstained}
          <div class="vote-result-bill">Turn skipped</div>
          <div class="vote-verdict-abstained">ABSTAINED</div>
          <div class="vote-result-note">No bills could pass — coalition support too low.</div>
        {:else if voteResult}
          <div class="vote-result-bill">{selectedBill?.title}</div>
          <div class="{voteResult.passed ? 'vote-verdict-passed' : 'vote-verdict-failed'}">
            {voteResult.passed ? 'PASSED' : 'FAILED'}
          </div>
        {/if}

        <button class="primary" style="margin-top:1.25rem;" on:click={handleNext}>
          {#if collapsed}Coalition Collapsed &#8594;
          {:else if turnCount >= BILL_LIMIT}End Session &#8594;
          {:else}Next &#8594;{/if}
        </button>
      </div>
    {/if}

  </div><!-- /.action-panel -->


  <!-- ════════════════════════════════════════════════════════════
       RIGHT: Context sidebar
  ════════════════════════════════════════════════════════════ -->
  <div class="context-sidebar">

    <!-- Chamber SVG -->
    <div class="chamber">
      <div class="sidebar-box-title">Chamber</div>
      <svg viewBox="0 0 680 380" xmlns="http://www.w3.org/2000/svg">
        {#each seats as seat, i}
          {@const p     = PARTIES[seat.partyIndex]}
          {@const inGov = govIndices.has(seat.partyIndex)}
          {@const vote  = votes[i]}
          <circle
            cx={seat.x}
            cy={seat.y}
            r="5"
            fill={vote === 'nay' ? 'none' : p.color}
            stroke={vote === 'nay' ? p.color : 'none'}
            stroke-width={vote === 'nay' ? '1.5' : undefined}
            opacity={vote === 'aye' ? 1 : vote === 'nay' ? 0.55 : inGov ? 1 : 0.3}
          >
            <title>{p.name}{vote ? ` — ${vote.toUpperCase()}` : ''}</title>
          </circle>
        {/each}
      </svg>
    </div>

    <!-- Political compass SVG -->
    <div class="compass">
      <div class="sidebar-box-title">Political Ideology</div>
      <svg viewBox="0 0 280 280" xmlns="http://www.w3.org/2000/svg">
        <!-- Plot background -->
        <rect x={CP} y={CP} width={CS} height={CS} fill="#162032" />
        <rect x={CP} y={CP} width={CS} height={CS} fill="none" stroke="#1e293b" stroke-width="1" />
        <!-- Crosshairs -->
        <line x1={CP} y1={cy0} x2={CP+CS} y2={cy0} stroke="#1e293b" stroke-width="1" />
        <line x1={cx0} y1={CP} x2={cx0} y2={CP+CS} stroke="#1e293b" stroke-width="1" />
        <!-- Axis labels -->
        <text x={cx0} y={CP - 6}   fill="#64748b" font-size="8" font-family="Inconsolata, monospace" text-anchor="middle">PROGRESSIVE</text>
        <text x={cx0} y={CP+CS+14} fill="#64748b" font-size="8" font-family="Inconsolata, monospace" text-anchor="middle">TRADITIONAL</text>
        <text x={CP - 4} y={cy0 + 4} fill="#64748b" font-size="8" font-family="Inconsolata, monospace" text-anchor="end">LEFT</text>
        <text x={CP+CS+4} y={cy0 + 4} fill="#64748b" font-size="8" font-family="Inconsolata, monospace" text-anchor="start">RIGHT</text>
        <!-- Party dots -->
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
            fill={p.color}
            font-size="8" font-family="Inconsolata, monospace"
            text-anchor={onLeft ? 'start' : 'end'}
          >{abbr}</text>
        {/each}
      </svg>
    </div>

    <!-- Legend -->
    <div class="legend">
      <div class="legend-group-label">
        <span>Government</span>
        <span class="legend-group-stats">{govSeats} / {total} seats &nbsp;&middot;&nbsp; {pct(govSeats)}%</span>
      </div>
      <div class="legend-group">
        {#each govParties as p}
          {@const isPlayer = p === party}
          {@const loy      = !isPlayer ? (loyalty[p.name] ?? 100) : null}
          {@const loyCls   = loy !== null ? loyaltyCls(loy) : ''}
          <div class="legend-item">
            <div class="legend-item-row1">
              <div class="legend-item-namerow">
                <span class="swatch" style="background:{p.color}"></span>
                <span>{p.name}</span>
                {#if isPlayer}<span class="you-tag">YOU</span>{/if}
              </div>
              <span class="legend-item-seats">Seats: {p.seats}</span>
            </div>
            <div class="legend-item-row2">
              <span class="legend-item-ideology">{econLabel(p.economic)} &middot; {socialLabel(p.social)}</span>
              {#if loy !== null}
                <span class="legend-item-loyalty {loyCls}">Coalition Loyalty: {loy.toFixed(1)}%</span>
              {/if}
            </div>
          </div>
        {/each}
      </div>

      <div class="legend-group-label">
        <span>Opposition</span>
        <span class="legend-group-stats">{oppSeats} / {total} seats &nbsp;&middot;&nbsp; {pct(oppSeats)}%</span>
      </div>
      <div class="legend-group legend-group--opp">
        {#each oppParties as p}
          <div class="legend-item legend-item--opp">
            <div class="legend-item-row1">
              <div class="legend-item-namerow">
                <span class="swatch" style="background:{p.color}"></span>
                <span>{p.name}</span>
              </div>
              <span class="legend-item-seats">Seats: {p.seats}</span>
            </div>
            <div class="legend-item-row2">
              <span class="legend-item-ideology">{econLabel(p.economic)} &middot; {socialLabel(p.social)}</span>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Vote tally sidebar (shown after a vote) -->
    {#if phase === 'result' && !abstained && voteResult}
      <div class="vote-sidebar-section">
        <div class="vote-sidebar-label">Vote tally</div>
        <div class="vote-sidebar-tally">
          Ayes: {voteResult.ayes} &nbsp;&middot;&nbsp; Nays: {voteResult.nays} &nbsp;&middot;&nbsp; Majority: {majority}
        </div>
      </div>
      {#if voteResult.passed && Object.keys(voteResult.loyaltyChanges).length}
        <div>
          {#each Object.entries(voteResult.loyaltyChanges) as [name, c]}
            {@const sign = c.delta >= 0 ? '+' : ''}
            {@const cls  = c.delta > 0 ? 'loyalty-up' : c.delta < 0 ? 'loyalty-down' : 'loyalty-neutral'}
            <div class="vote-loyalty-change {cls}">
              {name}: {c.prev.toFixed(1)}% &rarr; {c.next.toFixed(1)}% ({sign}{c.delta.toFixed(1)}%)
            </div>
          {/each}
        </div>
      {/if}
    {/if}

  </div><!-- /.context-sidebar -->

</div><!-- /.parliament-layout -->
{/if}

<style>
  /* compass constants passed via JS, keep SVG attrs unscoped */
</style>
