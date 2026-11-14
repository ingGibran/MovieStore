const { createApp } = Vue;

createApp({
  components: {
    Header: window.Header,
    Catalog: window.Catalog,
    AccountModal: window.AccountModal,
    MovieModal: window.MovieModal,
  },
  data: () => ({ accountOpen: false, selectedMovie: null }),
  template: `
    <Header @search="focusSearch" @account="accountOpen = true" />
    <main>
      <Catalog @select-movie="selectedMovie = $event" />
      <AccountModal :open="accountOpen" @close="accountOpen = false" />
      <MovieModal :movie="selectedMovie" @close="selectedMovie = null" />
    </main>
    <footer class="site-footer"><span><strong>SANTOS TV</strong> · Santos Laguna</span><span>Alejandro Gibrán & Victor Hugo</span></footer>
  `,
  methods: {
    focusSearch() {
      const searchInput = document.querySelector('input[type="search"]');
      const catalog = document.querySelector("#discover");
      if (searchInput) searchInput.focus();
      if (catalog) catalog.scrollIntoView();
    },
  },
}).mount("#app");
