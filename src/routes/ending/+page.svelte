<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { PARTIES, ENDINGS } from '$lib/data.js';
  import { playerParty, selectedCoalition, committedGoals, endingData, resetGame } from '$lib/stores.js';

  let party      = null;
  let coalition  = null;
  let goals      = {};
  let ending     = null;

  onMount(() => {
    party     = $playerParty;
    coalition = $selectedCoalition;
    goals     = $committedGoals;
    ending    = $endingData;
    if (!party || !coalition || !ending?.stats) { goto('/select'); return; }
  });

  $: tier = ending?.collapsed
    ? 'collapse'
    : (ending?.flagshipsPassed ?? 0) >= 3 ? 'high'
    : (ending?.flagshipsPassed ?? 0) >= 1 ? 'mid'
    : 'low';

  $: endingText  = coalition && party ? (ENDINGS[coalition.id]?.[party.name]?.[tier] ?? '') : '';
  $: titleText   = coalition && party ? (coalition.titles?.[party.name] ?? '') : '';

  $: partners = coalition && party
    ? coalition.parties
        .filter(n => n !== party.name)
        .map(n => PARTIES.find(p => p.name === n))
    : [];

  $: mandateCls = (ending?.flagshipsPassed ?? 0) >= 3
    ? 'loyalty-up'
    : (ending?.flagshipsPassed ?? 0) >= 1 ? 'loyalty-neutral' : 'loyalty-down';

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
  <div class="ending-coalition-title">{titleText}</div>

  <div class="ending-stats">
    {#if ending.collapsed}
      <div class="ending-stat-row ending-stat-collapse">Coalition collapsed mid-session</div>
    {/if}

    <div class="ending-stat-row">
      Mandate bills passed: <strong class={mandateCls}>{ending.flagshipsPassed} / 3</strong>
    </div>
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
