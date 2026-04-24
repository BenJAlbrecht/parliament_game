<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { PARTIES, COALITIONS, econLabel, socialLabel, logoSrc } from '$lib/data.js';
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

  const seatWidth = tweened(0,  { duration: 500, easing: cubicOut });
  const econPos   = tweened(50, { duration: 600, easing: cubicOut });
  const socialPos = tweened(50, { duration: 600, easing: cubicOut });

  $: if (selected) {
    seatWidth.set(seatPct(selected));
    econPos.set(posBarPct(selected.economic));
    socialPos.set(posBarPct(selected.social));
  }

  function seatPct(party) {
    return Math.round(party.seats / totalSeats * 100);
  }

  function posBarPct(value) {
    return ((value + 10) / 20) * 100;
  }

  function coalitionOptions(party) {
    return COALITIONS
      .filter(c => c.parties.includes(party.name))
      .map(c => ({
        coalition: c,
        partners: c.parties
          .filter(n => n !== party.name)
          .map(n => PARTIES.find(p => p.name === n)),
      }));
  }

  function confirmParty() {
    playerParty.set(selected);
    headerFlag.set(FLAG_MAP[selected.name]);
    goto('/coalition');
  }
</script>

<div class="select-page">

  <aside class="select-lede">
    <svg class="mini-arc" viewBox="55 25 570 292" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {#each arcSeats as seat}
        {@const p = PARTIES[seat.partyIndex]}
        <circle
          cx={seat.x} cy={seat.y} r="5"
          fill={p.color}
          opacity={selected ? (p === selected ? 1 : 0.12) : 0.8}
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

    {#if !selected}
      <!-- ── Party grid ── -->
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

    {:else}
      <!-- ── Party detail ── -->
      <div in:fly={{ y: 22, duration: 300, delay: 100 }}>
        <button class="back-btn" on:click={() => selected = null}>&#8592; Back</button>

        <div class="detail-layout">
          <div class="detail-col-stats">
            <div class="detail-top-row">
              <img class="detail-logo" src={logoSrc(selected.name)} alt="">
              <div>
                <div class="detail-party-heading" style="color:{selected.color};">{selected.name}</div>
                <div class="detail-ideology-tag">{selected.ideology}</div>
              </div>
            </div>

            <div class="detail-stat-block">
              <div class="detail-stat-label">Seats</div>
              <div class="detail-seat-row">
                <div class="detail-seat-track">
                  <div class="detail-seat-fill" style="width:{$seatWidth}%; background:{selected.color};"></div>
                </div>
                <span class="detail-seat-count" style="color:{selected.color};">
                  {selected.seats} <span class="detail-seat-pct">({seatPct(selected)}%)</span>
                </span>
              </div>
            </div>

            <div class="detail-stat-block">
              <div class="detail-stat-label">Economic</div>
              <div class="detail-pos-label">{econLabel(selected.economic)}</div>
              <div class="detail-pos-track">
                <div class="detail-pos-fill" style="left:{$econPos}%; background:{selected.color};"></div>
              </div>
            </div>

            <div class="detail-stat-block">
              <div class="detail-stat-label">Social</div>
              <div class="detail-pos-label">{socialLabel(selected.social)}</div>
              <div class="detail-pos-track">
                <div class="detail-pos-fill" style="left:{$socialPos}%; background:{selected.color};"></div>
              </div>
            </div>

            <div class="detail-stat-block">
              <div class="detail-stat-label">Coalitions</div>
              {#each coalitionOptions(selected) as { coalition, partners }}
                <div class="detail-coalition-row">
                  <span class="detail-coalition-name">{coalition.name}</span>
                  {#each partners as p}
                    <span class="detail-partner-swatch" style="background:{p.color};" title="{p.name}"></span>
                  {/each}
                  {#each partners as p, i}
                    {#if i > 0}<span class="detail-partner-sep">&middot;</span>{/if}
                    <span class="detail-partner-name">{p.name}</span>
                  {/each}
                </div>
              {:else}
                <div class="detail-no-coalition">None available</div>
              {/each}
            </div>

            <button
              class="primary confirm-btn"
              style="margin-top:1.25rem; border-color:{selected.color}; color:{selected.color};"
              on:click={confirmParty}
            >
              Lead this party &#8594;
            </button>
          </div>

          <div class="detail-col-narrative">
            <p class="detail-summary-text">{selected.bio.summary}</p>
            <p class="detail-history-text">{selected.bio.history}</p>

            {#if selected.caucuses?.length}
              <div class="caucus-list">
                <div class="caucus-list-label">Internal Caucuses</div>
                {#each selected.caucuses as caucus}
                  <div class="caucus-item">
                    <div class="caucus-item-header">
                      <span class="caucus-name">{caucus.name}</span>
                    </div>
                    <div class="caucus-share-bar">
                      <div class="caucus-share-fill" style="width:{caucus.share}%; background:{selected.color};"></div>
                    </div>
                    <p class="caucus-desc">{caucus.desc}</p>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}

  </div>

</div>

<style>
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

  .party-card {
    transition: transform 0.12s, background 0.12s, box-shadow 0.12s;
  }

  .party-card:hover {
    background: #1a2840;
    transform: translateX(4px);
    box-shadow: -4px 0 0 var(--party-color),
                0 0 28px color-mix(in srgb, var(--party-color) 28%, transparent);
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
