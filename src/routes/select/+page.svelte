<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { PARTIES, econLabel, socialLabel, logoSrc } from '$lib/data.js';
  import { playerParty, headerFlag, headerAccent } from '$lib/stores.js';
  import { calculateSeats } from '$lib/layout.js';

  const arcSeats = calculateSeats(PARTIES);

  onMount(() => {
    headerFlag.set('flag-base');
    headerAccent.set(null);
  });

  $: headerAccent.set(selected?.color ?? null);

  const FLAG_MAP = {
    "People's Alliance": 'flag-pa',
    'Socialist Party':   'flag-sp',
    'Renewal':           'flag-r',
    'Christian Democrats': 'flag-cd',
    'National Front':    'flag-NF',
  };

  const totalSeats = PARTIES.reduce((s, p) => s + p.seats, 0);

  let selected = null;

  function seatPct(party) {
    return Math.round(party.seats / totalSeats * 100);
  }

  function compassX(economic) { return (economic + 10) / 20 * 200; }
  function compassY(social)   { return (10 - social)  / 20 * 200; }

  function confirmParty() {
    playerParty.set(selected);
    headerFlag.set(FLAG_MAP[selected.name]);
    goto('/coalition');
  }
</script>

{#if !selected}
  <!-- ── Homepage: arc + lede left, party grid right ── -->
  <div class="select-page">
    <aside class="select-lede">
      <svg class="mini-arc" viewBox="55 25 570 292" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {#each arcSeats as seat}
          {@const p = PARTIES[seat.partyIndex]}
          <circle
            cx={seat.x} cy={seat.y} r="5"
            fill={p.color}
            opacity="0.8"
            style="transition: opacity 0.25s"
          />
        {/each}
      </svg>
      <div class="lede-text">
        <p class="lede-standfirst">It is the 80th anniversary of the establishment of the Republic.</p>
        <p class="lede-body">Modern capitalism and the welfare state promise a new social contract based on economic opportunity. The recent fall of the Menshevik regime has given birth to a unipolar world, spearheaded by the European Community and its global allies. The future of the Republic seems brighter than ever before.</p>
      </div>
    </aside>

    <div class="select-right">
      <div class="select-grid-label">Select your party:</div>
      <div id="party-grid" out:fade={{ duration: 140 }}>
        {#each PARTIES as party, i}
          <div
            class="party-card"
            style="--party-color:{party.color}; border-left-color:{party.color};"
            in:fly={{ y: 28, duration: 320, delay: i * 75 }}
            on:click={() => selected = party}
            role="button"
            tabindex="0"
            on:keydown={e => e.key === 'Enter' && (selected = party)}
          >
            <div class="party-card-header">
              <span class="party-card-name" style="color:{party.color};">{party.name}</span>
              <img class="party-card-logo" src={logoSrc(party.name)} alt="">
            </div>
            <div class="party-card-tag">{party.ideology}</div>
            <div class="party-card-summary">{party.bio.summary}</div>
            <div class="party-card-seat-bar">
              <div class="party-card-seat-fill" style="width:{seatPct(party)}%; background:{party.color};"></div>
            </div>
            <div class="party-card-footer">
              <span class="party-card-seats-badge" style="border-color:{party.color}; color:{party.color};">{party.seats} seats</span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>

{:else}
  <!-- ── Party detail: same grid as homepage, back btn in right col ── -->
  <div class="select-page" in:fly={{ y: 22, duration: 300, delay: 100 }}>

    <!-- Left: arc flush with homepage position, identity below -->
    <aside class="select-lede">
      <svg class="mini-arc" viewBox="55 25 570 292" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {#each arcSeats as seat}
          {@const p = PARTIES[seat.partyIndex]}
          <circle
            cx={seat.x} cy={seat.y} r="5"
            fill={p.color}
            opacity={p === selected ? 1 : 0.1}
            style="transition: opacity 0.2s"
          />
        {/each}
      </svg>

      <div class="detail-lede-panel">
        <div class="detail-lede-top">
          <img class="detail-logo" src={logoSrc(selected.name)} alt="">
          <div>
            <div class="detail-party-heading" style="color:{selected.color};">{selected.name}</div>
            <div class="detail-ideology-tag">{selected.ideology}</div>
          </div>
        </div>
        <div class="detail-lede-seats">
          <span style="color:{selected.color}">{selected.seats} seats</span>
          &nbsp;·&nbsp; {seatPct(selected)}% of chamber
        </div>
        <button
          class="primary confirm-btn"
          style="width:100%; margin-top:1rem; border-color:{selected.color}; color:{selected.color};"
          on:click={confirmParty}
        >
          Lead this party &#8594;
        </button>
      </div>
    </aside>

    <!-- Right: back link, then compass + bio side-by-side, caucuses below -->
    <div class="select-right">
      <button class="back-btn" style="margin-bottom:1rem;" on:click={() => selected = null}>&#8592; Back</button>

      <div class="detail-right-grid">
        <!-- Compass column, fixed width matching left col -->
        <div class="detail-compass-col">
          <div class="compass-heading">Political Position</div>
          <svg class="compass-svg" viewBox="-52 -22 304 244" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="0" y="0" width="200" height="200" fill="none" stroke="#2d2b42" stroke-width="1"/>
            <line x1="0" y1="100" x2="200" y2="100" stroke="#2d2b42" stroke-width="1"/>
            <line x1="100" y1="0" x2="100" y2="200" stroke="#2d2b42" stroke-width="1"/>
            <text text-anchor="middle" x="100" y="-7"  font-size="9" fill="#475569" font-family="Inconsolata,monospace" letter-spacing="0.04em">Authoritarian</text>
            <text text-anchor="middle" x="100" y="218" font-size="9" fill="#475569" font-family="Inconsolata,monospace" letter-spacing="0.04em">Libertarian</text>
            <text text-anchor="end"    x="-6"  y="104" font-size="9" fill="#475569" font-family="Inconsolata,monospace" letter-spacing="0.04em">Left</text>
            <text text-anchor="start"  x="206" y="104" font-size="9" fill="#475569" font-family="Inconsolata,monospace" letter-spacing="0.04em">Right</text>
            {#each PARTIES as p}
              {#if p !== selected}
                <circle cx={compassX(p.economic)} cy={compassY(p.social)} r="4" fill={p.color} opacity="0.22"/>
              {/if}
            {/each}
            <circle cx={compassX(selected.economic)} cy={compassY(selected.social)} r="11" fill="none" stroke={selected.color} stroke-width="1" opacity="0.3"/>
            <circle cx={compassX(selected.economic)} cy={compassY(selected.social)} r="6"  fill={selected.color}/>
          </svg>
          <div class="compass-caption">
            {econLabel(selected.economic)} &nbsp;·&nbsp; {socialLabel(selected.social)}
          </div>
        </div>

        <!-- Bio column -->
        <div class="detail-bio-col">
          <p class="detail-summary-text">{selected.bio.summary}</p>
          <p class="detail-history-text">{selected.bio.history}</p>
        </div>
      </div>

      {#if selected.caucuses?.length}
        <div class="caucus-section">
          <div class="caucus-section-label">Internal Caucuses</div>
          <div class="caucus-grid">
            {#each selected.caucuses as caucus}
              <div class="caucus-panel" style="border-left-color:{selected.color};">
                <div class="caucus-panel-name">{caucus.name}</div>
                <p class="caucus-panel-desc">{caucus.desc}</p>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>

  </div>
{/if}

<style>
  /* ── Homepage layout ── */
  .select-page {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 2rem;
    align-items: start;
  }

  .select-lede {
    position: sticky;
    top: 1rem;
  }

  .mini-arc {
    display: block;
    width: 100%;
    background: transparent;
    margin-bottom: 0.85rem;
  }

  .lede-text {
    border-left: 2px solid #2d2b42;
    padding-left: 0.75rem;
  }

  .lede-standfirst {
    font-family: 'Oswald', sans-serif;
    font-weight: 500;
    font-size: 14px;
    color: #cbd5e1;
    line-height: 1.45;
    margin: 0 0 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .lede-body {
    font-size: 11.5px;
    color: #64748b;
    line-height: 1.8;
    margin: 0;
  }

  .select-right {
    min-width: 0;
  }

  .select-grid-label {
    font-family: 'Oswald', sans-serif;
    font-size: 13px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #94a3b8;
    margin-bottom: 0.75rem;
  }

  /* ── Detail view identity panel (below arc) ── */
  .detail-lede-panel {
    border-left: 2px solid #2d2b42;
    padding-left: 0.75rem;
  }

  .detail-lede-top {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 0.5rem;
  }

  .detail-lede-seats {
    font-family: 'Inconsolata', monospace;
    font-size: 11px;
    color: #64748b;
    letter-spacing: 0.04em;
  }

  /* ── Detail right column inner layout ── */
  .detail-right-grid {
    display: grid;
    grid-template-columns: 260px 1fr;
    gap: 1.5rem;
    align-items: start;
    margin-bottom: 1.25rem;
  }

  .detail-bio-col {
    min-width: 0;
  }

  /* ── Compass heading ── */
  .compass-heading {
    font-size: 10px;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 4px;
  }

  /* ── Party cards ── */
  .party-card {
    transition: transform 0.12s, background 0.12s, box-shadow 0.12s;
  }

  .party-card:hover {
    background: #1a2840;
    transform: translateX(4px);
    box-shadow: -4px 0 0 var(--party-color),
                0 0 28px color-mix(in srgb, var(--party-color) 28%, transparent);
  }

  /* ── Political compass ── */
  .compass-svg {
    display: block;
    width: 100%;
    margin: 6px 0 0;
  }

  .compass-caption {
    text-align: center;
    font-family: 'Inconsolata', monospace;
    font-size: 11px;
    color: #64748b;
    margin: 4px 0 0.75rem;
    letter-spacing: 0.04em;
  }

  /* ── Internal caucuses (3-column flat grid) ── */
  .caucus-section {
    border-top: 1px solid #2d2b42;
    padding-top: 1rem;
  }

  .caucus-section-label {
    font-size: 10px;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 0.75rem;
  }

  .caucus-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  .caucus-panel {
    border-left: 2px solid;
    padding-left: 0.75rem;
  }

  .caucus-panel-name {
    font-size: 12px;
    font-weight: 600;
    color: #e2e8f0;
    margin-bottom: 5px;
  }

  .caucus-panel-desc {
    font-size: 11.5px;
    color: #94a3b8;
    line-height: 1.7;
    margin: 0;
  }

  .party-card-seat-bar {
    height: 3px;
    background: #100f1c;
    margin: 10px 0 0;
  }

  .party-card-seat-fill {
    height: 100%;
    transition: width 0.4s;
  }
</style>
