<script>
  import '../app.css';
  import { headerFlag } from '$lib/stores.js';
</script>

<div class="container">
  <h1>
    <img class="header-flag" src="/images/party_flags/{$headerFlag}.svg" alt="">
    <span>Parliament</span>
    <img class="header-flag" src="/images/party_flags/{$headerFlag}.svg" alt="">
  </h1>
  <slot />
</div>
