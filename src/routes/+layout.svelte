<script>
  import '../app.css';
  import { headerFlag, headerAccent, headerCrumb } from '$lib/stores.js';
</script>

<div class="container">
  <header class="masthead">
    <div class="masthead-rule" style="background: {$headerAccent ?? '#334155'}"></div>
    <div class="masthead-inner">
      <img class="header-flag" src="/images/party_flags/{$headerFlag}.svg" alt="">
      <h1>Parliament</h1>
      <img class="header-flag" src="/images/party_flags/{$headerFlag}.svg" alt="">
    </div>
    <p class="masthead-tagline">Parliamentary Session Simulator</p>
    <div class="masthead-rule masthead-rule--thin"></div>
    {#if $headerCrumb.length > 0}
      <nav class="masthead-crumb">
        {#each $headerCrumb as step, i}
          {#if i > 0}<span class="crumb-sep">›</span>{/if}
          <span class="crumb-step" class:crumb-step--active={i === $headerCrumb.length - 1}>{step}</span>
        {/each}
      </nav>
    {/if}
  </header>
  <slot />
</div>
