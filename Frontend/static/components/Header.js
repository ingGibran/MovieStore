window.Header = {
  emits: ["search", "account"],
  template: `
    <header class="site-header"><a class="brand" href="/" aria-label="Santos TV, inicio">
      <img class="brand-logo" src="../static/image.png" alt="Club Santos Laguna">
      <span class="brand-name"><strong>SANTOS</strong><small>TV</small></span>
      </a>
      <div class="header-actions"><button class="search-link" type="button" @click="$emit('search')">Buscar</button>
      <button class="account-button" type="button" @click="$emit('account')">Cuenta</button></div>
    </header>
  `,
};
