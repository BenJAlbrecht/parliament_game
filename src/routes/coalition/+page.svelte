<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import { PARTIES, COALITIONS, logoSrc } from '$lib/data.js';
  import { playerParty, selectedCoalition, coalitionPartners, headerAccent } from '$lib/stores.js';
  import { calculateSeats } from '$lib/layout.js';

  const arcSeats  = calculateSeats(PARTIES);
  const totalSeats = PARTIES.reduce((s, p) => s + p.seats, 0);
  const majority   = Math.floor(totalSeats / 2) + 1;

  let party   = null;
  let options = [];
  let detailCoalition  = null;
  let hoveredCoalition = null;

  onMount(() => {
    party = $playerParty;
    if (!party) { goto('/select'); return; }
    options = party.coalitions.map(id => COALITIONS.find(c => c.id === id));
    headerAccent.set(party.color);
  });

  function seatPct(p) {
    return Math.round(p.seats / totalSeats * 100);
  }

  function allCoalitionParties(coalition) {
    return coalition.parties.map(n => PARTIES.find(p => p.name === n));
  }

  function selectCoalition(coalition) {
    hoveredCoalition = null;
    detailCoalition  = coalition;
  }

  function backToChoice() {
    detailCoalition = null;
  }

  function formCoalition() {
    const partners = detailCoalition.parties
      .filter(n => n !== party.name)
      .map(n => PARTIES.find(p => p.name === n));
    selectedCoalition.set(detailCoalition);
    coalitionPartners.set(partners);
    goto('/programme');
  }

  $: arcCoalition = detailCoalition ?? hoveredCoalition;
</script>

{#if party}

  {#if !detailCoalition}
    <!-- ── Coalition choice: arc left, cards right ── -->
    <div class="coalition-page" in:fly={{ y: 20, duration: 280 }}>
      <aside class="coalition-arc-col">
        <svg class="coalition-arc-svg" viewBox="55 25 570 292" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          {#each arcSeats as seat}
            {@const p = PARTIES[seat.partyIndex]}
            <circle
              cx={seat.x} cy={seat.y} r="5"
              fill={p.color}
              opacity={arcCoalition
                ? (arcCoalition.parties.includes(p.name) ? 1 : 0.07)
                : (p.name === party.name ? 1 : 0.15)}
              style="transition: opacity 0.2s"
            />
          {/each}
        </svg>
        <div class="coalition-arc-caption">
          <span style="color:{party.color}">{party.seats} seats</span>
          &nbsp;·&nbsp; {seatPct(party)}% of chamber
        </div>
        <div class="coalition-you-label" style="color:{party.color};">{party.name}</div>
      </aside>

      <div class="coalition-cards-col">
        <button class="back-btn" on:click={() => goto('/select')}>&#8592; Back</button>
        <div class="coalition-section-label" style="margin-top:0.5rem;">Choose your coalition</div>

        {#each options as c}
          {@const members   = allCoalitionParties(c)}
          {@const coalSeats = members.reduce((s, p) => s + p.seats, 0)}
          {@const coalPct   = Math.round(coalSeats / totalSeats * 100)}
          {@const hasMaj    = coalSeats >= majority}
          <div
            class="coalition-choice-card"
            role="button"
            tabindex="0"
            on:click={() => selectCoalition(c)}
            on:keydown={e => e.key === 'Enter' && selectCoalition(c)}
            on:mouseenter={() => hoveredCoalition = c}
            on:mouseleave={() => hoveredCoalition = null}
          >
            <div class="coalition-choice-name">{c.name}</div>
            {#each members as p}
              <div class="detail-coalition-member">
                <span class="swatch" style="background:{p.color}"></span>
                <span class="detail-coalition-member-name" style="color:{p.color}">{p.name}</span>
                {#if p.name === party.name}<span class="you-tag">YOU</span>{/if}
                <span class="detail-coalition-member-seats">{p.seats} · {seatPct(p)}%</span>
              </div>
            {/each}
            <div class="detail-coalition-total" class:detail-coalition-total--maj={hasMaj}>
              <span>Total</span>
              <span>{coalSeats} seats · {coalPct}%{hasMaj ? ' ✓' : ''}</span>
            </div>
          </div>
        {/each}
      </div>
    </div>

  {:else}
    <!-- ── Coalition detail: arc left, scenario right ── -->
    {@const members   = allCoalitionParties(detailCoalition)}
    {@const coalSeats = members.reduce((s, p) => s + p.seats, 0)}
    {@const coalPct   = Math.round(coalSeats / totalSeats * 100)}
    {@const hasMaj    = coalSeats >= majority}

    <div class="coalition-page" in:fly={{ y: 20, duration: 280 }}>
      <aside class="coalition-arc-col">
        <svg class="coalition-arc-svg" viewBox="55 25 570 292" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          {#each arcSeats as seat}
            {@const p = PARTIES[seat.partyIndex]}
            <circle
              cx={seat.x} cy={seat.y} r="5"
              fill={p.color}
              opacity={detailCoalition.parties.includes(p.name) ? 1 : 0.07}
              style="transition: opacity 0.2s"
            />
          {/each}
        </svg>
        <div class="coalition-arc-caption">
          <span class:majority-ok={hasMaj} class:majority-fail={!hasMaj}>
            {coalSeats} seats · {coalPct}%{hasMaj ? ' ✓' : ''}
          </span>
        </div>
        <!-- member breakdown in arc col -->
        <div class="coalition-arc-members">
          {#each members as p}
            <div class="detail-coalition-member">
              <span class="swatch" style="background:{p.color}"></span>
              <span class="detail-coalition-member-name" style="color:{p.color}">{p.name}</span>
              {#if p.name === party.name}<span class="you-tag">YOU</span>{/if}
              <span class="detail-coalition-member-seats">{p.seats} · {seatPct(p)}%</span>
            </div>
          {/each}
        </div>
      </aside>

      <div class="coalition-scenario-col">
        <button class="back-btn" on:click={backToChoice}>&#8592; Back</button>
        <div class="coalition-scenario-title" style="color:{party.color};">
          {detailCoalition.titles[party.name]}
        </div>
        <p class="coalition-scenario">{detailCoalition.scenarios[party.name]}</p>
        <button
          class="primary confirm-btn"
          style="margin-top:1.5rem; border-color:{party.color}; color:{party.color};"
          on:click={formCoalition}
        >
          Form Coalition &#8594;
        </button>
      </div>
    </div>
  {/if}

{/if}

<style>
  .coalition-page {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 2rem;
    align-items: start;
  }

  .coalition-arc-col {
    position: sticky;
    top: 1rem;
  }

  .coalition-arc-svg {
    display: block;
    width: 100%;
    background: transparent;
    margin-bottom: 0.4rem;
  }

  .coalition-arc-caption {
    text-align: center;
    font-family: 'Inconsolata', monospace;
    font-size: 11px;
    color: #64748b;
    margin-bottom: 0.75rem;
    letter-spacing: 0.04em;
  }

  .coalition-you-label {
    text-align: center;
    font-family: 'Oswald', sans-serif;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-top: 0.25rem;
  }

  .coalition-arc-members {
    margin-top: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .coalition-cards-col {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .coalition-choice-card {
    background: #14121e;
    border: 1px solid #2d2b42;
    padding: 14px 16px;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s;
  }

  .coalition-choice-card:hover {
    background: #1a1830;
    border-color: #475569;
  }

  .coalition-choice-name {
    font-family: 'Oswald', sans-serif;
    font-size: 13px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #cbd5e1;
    margin-bottom: 10px;
  }

  .coalition-scenario-col {
    min-width: 0;
  }
</style>
