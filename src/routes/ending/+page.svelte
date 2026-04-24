<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { PARTIES, ENDINGS } from '$lib/data.js';
  import { playerParty, selectedCoalition, committedGoals, playerMandate, endingData, resetGame, headerAccent, headerCrumb } from '$lib/stores.js';

  let party     = null;
  let coalition = null;
  let goals     = {};
  let mandate   = null;
  let ending    = null;

  onMount(() => {
    party     = $playerParty;
    coalition = $selectedCoalition;
    goals     = $committedGoals;
    mandate   = $playerMandate;
    ending    = $endingData;
    if (!party || !coalition || !ending?.stats) { goto('/select'); return; }
  });

  $: mandateMet = mandate && ending?.stats
    ? mandate.check(ending.stats.policyState ?? {}, ending.stats)
    : false;

  $: tier = ending?.collapsed     ? 'collapse'
    : mandateMet                  ? 'high'
    : (ending?.stats?.billsPassed ?? 0) >= 5 ? 'mid'
    : 'low';

  $: verdictColor = tier === 'high' ? '#22c55e' : tier === 'mid' ? '#d97706' : '#f87171';
  $: verdictLabel = tier === 'collapse' ? 'Coalition Collapsed'
    : tier === 'high'     ? 'Mandate Achieved'
    : tier === 'mid'      ? 'Partial Mandate'
    : 'Mandate Failed';

  $: if (tier) { headerAccent.set(verdictColor); headerCrumb.set(['Select', 'Coalition', 'Programme', 'Session', 'Results']); }

  $: endingText = coalition && party ? (ENDINGS[coalition.id]?.[party.name]?.[tier] ?? '') : '';
  $: titleText  = coalition && party ? (coalition.titles?.[party.name] ?? '') : '';

  $: partners = coalition && party
    ? coalition.parties
        .filter(n => n !== party.name)
        .map(n => PARTIES.find(p => p.name === n))
    : [];

  $: goalEntries = (goals && ending?.stats)
    ? Object.entries(goals).map(([partnerName, goal]) => ({
        partnerName,
        goal,
        partner: PARTIES.find(p => p.name === partnerName),
        met: goal.check(ending.stats.policyState ?? {}, ending.stats),
      }))
    : [];

  function loyaltyCls(loy) {
    return loy >= 60 ? 'loyalty-up' : loy >= 30 ? 'loyalty-neutral' : 'loyalty-down';
  }

  function playAgain() {
    resetGame();
    goto('/select');
  }
</script>

{#if party && coalition && ending}
  <div class="ending-verdict-stamp" style="color:{verdictColor}; border-color:{verdictColor}40;">
    {verdictLabel}
  </div>
  <h2 class="ending-headline">{titleText}</h2>

  <div class="ending-stats">
    {#if ending.collapsed}
      <div class="ending-stat-row ending-stat-collapse">Coalition collapsed mid-session</div>
    {/if}

    <!-- Mandate result -->
    {#if mandate}
      <div class="ending-stat-row ending-mandate-row">
        <span class="swatch" style="background:{party.color}"></span>
        <span style="color:{party.color}">{party.name}</span>
        mandate — {mandate.title}:
        <strong class="{mandateMet ? 'loyalty-up' : 'loyalty-down'}">{mandateMet ? '✓ Achieved' : '✗ Failed'}</strong>
      </div>
    {/if}

    <div class="ending-stat-row">
      Bills proposed: <strong>{ending.billsProposed}</strong>
    </div>

    {#each partners as p}
      {@const loy = ending.finalLoyalty[p.name] ?? 100}
      {@const cls = loyaltyCls(loy)}
      <div class="ending-stat-row">
        <span class="swatch" style="background:{p.color}"></span>
        {p.name} final loyalty: <strong class={cls}>{loy.toFixed(1)}%</strong>
      </div>
    {/each}

    {#if goalEntries.length > 0}
      <div class="ending-stat-divider"></div>
      <div class="ending-stat-section-label">Programme for Government</div>
      {#each goalEntries as { partnerName, goal, partner, met }}
        <div class="ending-stat-row">
          <span class="swatch" style="background:{partner?.color ?? '#94a3b8'}"></span>
          <span style="color:{partner?.color ?? '#94a3b8'}">{partnerName}</span>
          &mdash; {goal.title}:
          <strong class="{met ? 'loyalty-up' : 'loyalty-down'}">{met ? '✓ Met' : '✗ Missed'}</strong>
        </div>
      {/each}
    {/if}
  </div>

  <div class="ending-text">{endingText}</div>

  <button class="primary ending-replay-btn" on:click={playAgain}>Play Again ↺</button>
{/if}
