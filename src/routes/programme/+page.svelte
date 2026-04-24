<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { fly, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { PARTIES, logoSrc } from '$lib/data.js';
  import { playerParty, coalitionPartners, committedGoals, playerMandate, headerAccent, headerCrumb } from '$lib/stores.js';

  let party    = null;
  let partners = [];
  let selected = {};        // { [partnerName]: goalObj }
  let mandate  = null;      // chosen mandate option

  onMount(() => {
    party    = $playerParty;
    partners = $coalitionPartners;
    if (!party || !partners.length) { goto('/select'); return; }
    headerAccent.set(party.color);
    headerCrumb.set(['Select Party', 'Coalition', 'Programme']);
  });

  $: allDone = mandate !== null &&
    partners.length > 0 &&
    partners.every(p => p.name in selected);

  $: committedCount = Object.keys(selected).length;

  function pickGoal(partner, goal) {
    selected = { ...selected, [partner.name]: goal };
  }

  function isSelected(partner, goal) {
    return selected[partner.name] === goal;
  }

  function confirmProgramme() {
    committedGoals.set({ ...selected });
    playerMandate.set(mandate);
    goto('/parliament');
  }
</script>

<button class="back-btn" on:click={() => goto('/coalition')}>&#8592; Back</button>

<div class="compact-screen-title">Programme for Government</div>
<div class="compact-screen-subtitle">
  Set your party's mandate for the session, then commit to one goal per coalition partner.
</div>

<!-- ── Party Mandate ── -->
{#if party}
  <div
    class="compact-partner-section mandate-section"
    style="--partner-color:{party.color}; border-color:{party.color};"
    in:fly={{ y: 24, duration: 300 }}
  >
    <div class="compact-partner-header">
      <img class="compact-partner-logo" src={logoSrc(party.name)} alt="">
      <div class="partner-header-text">
        <div class="compact-partner-name" style="color:{party.color}">{party.name}</div>
        <div class="compact-partner-prompt">
          {#if mandate}
            <span class="partner-committed" style="color:{party.color}" in:fly={{ x: -8, duration: 200 }}>
              ✓ {mandate.title}
            </span>
          {:else}
            Choose your party mandate — this is your primary objective
          {/if}
        </div>
      </div>
      <span class="mandate-badge">Mandate</span>
    </div>
    <div class="compact-goal-grid">
      {#each party.mandates as m}
        <div
          class="compact-goal-card"
          class:compact-goal-card--selected={mandate === m}
          on:click={() => mandate = m}
          role="button"
          tabindex="0"
          on:keydown={e => e.key === 'Enter' && (mandate = m)}
        >
          {#if mandate === m}
            <span class="goal-check" in:scale={{ duration: 200, easing: cubicOut }}>✓</span>
          {/if}
          <div class="mandate-type-tag">{m.legislative ? 'Legislative' : 'Non-legislative'}</div>
          <div class="compact-goal-title">{m.title}</div>
          <div class="compact-goal-desc">{m.desc}</div>
        </div>
      {/each}
    </div>
  </div>
{/if}

<!-- ── Coalition Goals ── -->
<div class="programme-progress">
  {#each partners as partner}
    <div
      class="progress-pip"
      class:progress-pip--done={partner.name in selected}
      style="--partner-color:{partner.color};"
    ></div>
  {/each}
  <span class="progress-label">{committedCount} / {partners.length} coalition goals committed</span>
</div>

{#each partners as partner, i}
  <div
    class="compact-partner-section"
    style="--partner-color:{partner.color};"
    in:fly={{ y: 24, duration: 300, delay: 120 + i * 110 }}
  >
    <div class="compact-partner-header">
      <img class="compact-partner-logo" src={logoSrc(partner.name)} alt="">
      <div class="partner-header-text">
        <div class="compact-partner-name" style="color:{partner.color}">{partner.name}</div>
        <div class="compact-partner-prompt">
          {#if selected[partner.name]}
            <span class="partner-committed" style="color:{partner.color}" in:fly={{ x: -8, duration: 200 }}>
              ✓ {selected[partner.name].title}
            </span>
          {:else}
            Commit to one session goal
          {/if}
        </div>
      </div>
    </div>
    <div class="compact-goal-grid">
      {#each partner.goals as goal}
        <div
          class="compact-goal-card"
          class:compact-goal-card--selected={isSelected(partner, goal)}
          on:click={() => pickGoal(partner, goal)}
          role="button"
          tabindex="0"
          on:keydown={e => e.key === 'Enter' && pickGoal(partner, goal)}
        >
          {#if isSelected(partner, goal)}
            <span class="goal-check" in:scale={{ duration: 200, easing: cubicOut }}>✓</span>
          {/if}
          <div class="compact-goal-title">{goal.title}</div>
          <div class="compact-goal-desc">{goal.desc}</div>
        </div>
      {/each}
    </div>
  </div>
{/each}

{#if allDone}
  <button
    class="primary compact-confirm-btn"
    in:fly={{ y: 12, duration: 260, easing: cubicOut }}
    on:click={confirmProgramme}
  >
    Confirm Programme &#8594;
  </button>
{:else}
  <button class="primary compact-confirm-btn" disabled>
    Confirm Programme &#8594;
  </button>
{/if}
