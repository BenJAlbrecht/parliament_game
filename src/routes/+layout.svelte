<script>
  import '../app.css';
  import { headerFlag, headerAccent } from '$lib/stores.js';
</script>

<div class="container">
  <header class="masthead">
    <div class="masthead-rule" style="background: {$headerAccent ?? '#334155'}"></div>
    <div class="masthead-inner">
      <img class="header-flag" src="/images/party_flags/{$headerFlag}.svg" alt="">
      <h1>Parliament</h1>
      <img class="header-flag" src="/images/party_flags/{$headerFlag}.svg" alt="">
    </div>
    <div class="masthead-rule masthead-rule--thin"></div>
  </header>
  <slot />
</div>
