<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { PARTIES, logoSrc } from '$lib/data.js';
  import { playerParty, coalitionPartners, committedGoals } from '$lib/stores.js';

  let party    = null;
  let partners = [];
  let selected = {};   // { [partnerName]: goalObj }

  onMount(() => {
    party    = $playerParty;
    partners = $coalitionPartners;
    if (!party || !partners.length) { goto('/select'); return; }
  });

  $: allDone = partners.length > 0 && partners.every(p => p.name in selected);

  function pickGoal(partner, goal) {
    selected = { ...selected, [partner.name]: goal };
  }

  function isSelected(partner, goal) {
    return selected[partner.name] === goal;
  }

  function confirmProgramme() {
    committedGoals.set({ ...selected });
    goto('/parliament');
  }
</script>

<button class="back-btn" on:click={() => goto('/coalition')}>&#8592; Back</button>

<div class="compact-screen-title">Programme for Government</div>
<div class="compact-screen-subtitle">
  Before the session begins, commit to one goal per coalition partner.
  These goals will be tracked throughout the term.
</div>

{#each partners as partner}
  <div class="compact-partner-section">
    <div class="compact-partner-header">
      <img class="compact-partner-logo" src={logoSrc(partner.name)} alt="">
      <div>
        <div class="compact-partner-name" style="color:{partner.color}">{partner.name}</div>
        <div class="compact-partner-prompt">Commit to one session goal</div>
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
          <div class="compact-goal-title">{goal.title}</div>
          <div class="compact-goal-desc">{goal.desc}</div>
        </div>
      {/each}
    </div>
  </div>
{/each}

<button
  class="primary compact-confirm-btn"
  disabled={!allDone}
  on:click={confirmProgramme}
>
  Confirm Programme &#8594;
</button>
