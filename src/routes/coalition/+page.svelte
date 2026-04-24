<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { PARTIES, COALITIONS, econLabel, socialLabel, logoSrc } from '$lib/data.js';
  import { playerParty, selectedCoalition, coalitionPartners, headerAccent, headerCrumb } from '$lib/stores.js';

  let party = null;
  let options = [];
  let detailCoalition = null;  // null = show choice list

  const totalAll = PARTIES.reduce((sum, p) => sum + p.seats, 0);
  const majority = Math.floor(totalAll / 2) + 1;

  onMount(() => {
    party = $playerParty;
    if (!party) { goto('/select'); return; }
    options = party.coalitions.map(id => COALITIONS.find(c => c.id === id));
    headerAccent.set(party.color);
    headerCrumb.set(['Select Party', 'Form Coalition']);
  });

  function coalitionSeats(coalition) {
    return coalition.parties.reduce((sum, name) => sum + PARTIES.find(p => p.name === name).seats, 0);
  }

  function partnerObjs(coalition) {
    return coalition.parties
      .filter(n => n !== party.name)
      .map(n => PARTIES.find(p => p.name === n));
  }

  function selectCoalition(coalition) {
    detailCoalition = coalition;
  }

  function backToChoice() {
    detailCoalition = null;
  }

  function backToSelect() {
    goto('/select');
  }

  function formCoalition() {
    const partners = partnerObjs(detailCoalition);
    selectedCoalition.set(detailCoalition);
    coalitionPartners.set(partners);
    goto('/programme');
  }
</script>

{#if party}

  {#if !detailCoalition}
    <!-- ── Coalition choice ── -->
    <button class="back-btn" on:click={backToSelect}>&#8592; Back</button>
    <div class="coalition-section-label">Choose your coalition</div>

    <div id="coalition-options">
      {#each options as c}
        {@const seats = coalitionSeats(c)}
        {@const pct   = Math.round(seats / totalAll * 100)}
        {@const over  = seats >= majority}
        <div
          class="coalition-option-card"
          on:click={() => selectCoalition(c)}
          role="button"
          tabindex="0"
          on:keydown={e => e.key === 'Enter' && selectCoalition(c)}
        >
          <div class="coalition-option-name">{c.name}</div>
          <div class="coalition-option-logos">
            {#each partnerObjs(c) as p}
              <div class="coalition-option-party-col">
                <img class="coalition-option-logo" src={logoSrc(p.name)} alt="">
                <span class="coalition-option-party-label" style="color:{p.color};">{p.name}</span>
              </div>
            {/each}
          </div>
          <div class="coalition-option-seat-track">
            <div class="coalition-option-seat-fill" style="width:{pct}%;"></div>
          </div>
          <div class="coalition-option-footer">
            <span class="{over ? 'majority-ok' : 'majority-fail'}">{seats} seats &middot; {pct}%</span>
            <span class="{over ? 'majority-ok' : 'majority-fail'}">{over ? 'Majority ✓' : 'No majority ✗'}</span>
          </div>
        </div>
      {/each}
    </div>

  {:else}
    <!-- ── Coalition detail ── -->
    <button class="back-btn" on:click={backToChoice}>&#8592; Back</button>

    {@const seats = coalitionSeats(detailCoalition)}
    {@const pct   = Math.round(seats / totalAll * 100)}
    {@const over  = seats >= majority}

    <div class="coalition-detail-layout">
      <div class="coalition-detail-main">
        <div class="coalition-scenario-title" style="color:{party.color};">
          {detailCoalition.titles[party.name]}
        </div>
        <div class="coalition-scenario">
          {detailCoalition.scenarios[party.name]}
        </div>
        <div class="coalition-summary">
          <span class="{over ? 'majority-ok' : 'majority-fail'}">{seats} seats</span>
          <span class="coalition-seats-meta">
            &nbsp;of {totalAll} &nbsp;&middot;&nbsp; {pct}% &nbsp;&middot;&nbsp;
            {over ? 'majority' : 'no majority'}
          </span>
        </div>
        <button
          class="primary confirm-btn"
          style="margin-top:1.5rem; border-color:{party.color}; color:{party.color};"
          on:click={formCoalition}
        >
          Form Coalition &#8594;
        </button>
      </div>

      <div class="coalition-detail-sidebar">
        <div class="coalition-section-label" style="margin-top:0;">Coalition Partners</div>
        {#each partnerObjs(detailCoalition) as p}
          <div class="coalition-card" style="border-color:{p.color}; box-shadow: 4px 4px 0 {p.color}40;">
            <div class="coalition-card-header">
              <img class="coalition-card-logo" src={logoSrc(p.name)} alt="">
              <span class="coalition-card-name">{p.name}</span>
            </div>
            <div class="coalition-card-tag">{p.ideology}</div>
            <div class="coalition-card-stats">
              {p.seats} seats &nbsp;&middot;&nbsp; {econLabel(p.economic)} &nbsp;&middot;&nbsp; {socialLabel(p.social)}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

{/if}
