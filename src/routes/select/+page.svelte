<script>
  import { goto } from '$app/navigation';
  import { PARTIES, COALITIONS, econLabel, socialLabel, logoSrc } from '$lib/data.js';
  import { playerParty, headerFlag } from '$lib/stores.js';

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

<img class="homepage-decal" src="/images/parliament_homepage.svg" alt="">
<p class="subtitle">Choose a party to lead into the session.</p>

<div class="select-body">
  <div class="select-left">

    {#if !selected}
      <!-- ── Party grid ── -->
      <div id="party-grid">
        {#each PARTIES as party}
          <div
            class="party-card"
            style="border-left-color:{party.color};"
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
            <div class="party-card-footer">
              <span class="party-card-seats-badge" style="border-color:{party.color}; color:{party.color};">{party.seats} seats</span>
            </div>
          </div>
        {/each}
      </div>

    {:else}
      <!-- ── Party detail ── -->
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
                <div class="detail-seat-fill" style="width:{seatPct(selected)}%; background:{selected.color};"></div>
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
              <div class="detail-pos-fill" style="left:{posBarPct(selected.economic)}%; background:{selected.color};"></div>
            </div>
          </div>

          <div class="detail-stat-block">
            <div class="detail-stat-label">Social</div>
            <div class="detail-pos-label">{socialLabel(selected.social)}</div>
            <div class="detail-pos-track">
              <div class="detail-pos-fill" style="left:{posBarPct(selected.social)}%; background:{selected.color};"></div>
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
        </div>
      </div>
    {/if}

  </div>
</div>
