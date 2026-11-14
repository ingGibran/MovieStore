window.MovieModal = {
  props: { movie: Object },
  emits: ["close"],
  data: () => ({ action: "rent", duration: 1, status: "", error: "", completed: false }),
  computed: { price() { return this.action === "purchase" ? 200 : this.duration * 20; } },
  methods: {
    async submit() {
      if (!localStorage.getItem(TOKEN_KEY)) { this.status = "Inicia sesión antes de rentar o comprar."; this.error = true; return; }
      const payload = this.action === "purchase" ? { movie_id: this.movie.id, price: this.price } : { movie_id: this.movie.id, price: this.price, due_at: new Date(Date.now() + this.duration * 86400000).toISOString() };
      try { await request(`${API_BASE_URL}/${this.action === "purchase" ? "purchases" : "rents"}`, { method: "POST", headers: authHeaders(true), body: JSON.stringify(payload) }); this.status = this.action === "purchase" ? "Película comprada correctamente." : "Película rentada correctamente."; this.error = false; this.completed = true; }
      catch (error) { this.status = error.message; this.error = true; }
    },
  },
  template: `
    <section v-if="movie" class="movie-panel" @click.self="$emit('close')"><div class="movie-dialog" role="dialog" aria-modal="true">
      <div class="account-dialog-header"><div><p class="eyebrow">Opciones de película</p><h2>{{ movie.title }}</h2></div><button class="close-button" type="button" aria-label="Cerrar" @click="$emit('close')">×</button></div>
      <img v-if="movie.poster_url" class="movie-dialog-poster" :src="movie.poster_url" :alt="'Portada de ' + movie.title">
      <nav class="account-tabs" aria-label="Tipo de operación"><button :class="{ active: action === 'rent' }" type="button" @click="action = 'rent'">Rentar</button><button :class="{ active: action === 'purchase' }" type="button" @click="action = 'purchase'">Comprar</button></nav>
      <form class="account-form" @submit.prevent="submit"><div v-if="action === 'rent'"><label for="rental-duration">Duración de la renta</label><input id="rental-duration" v-model.number="duration" type="range" min="1" max="30"><span><strong>{{ duration }} {{ duration === 1 ? 'día' : 'días' }}</strong> · <strong>\${{ price }} MXN</strong></span></div><div v-else class="purchase-summary">Compra permanente · <strong>\${{ price }} MXN</strong></div><button class="button button-primary" type="submit" :disabled="completed">Confirmar {{ action === 'rent' ? 'renta' : 'compra' }}</button></form>
      <p class="account-status status-message" :class="{ error }" role="status">{{ status }}</p>
    </div></section>
  `,
};
