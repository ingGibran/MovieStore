window.AccountModal = {
  props: { open: Boolean },
  emits: ["close"],
  data: () => ({ tab: "login", user: null, status: "", error: "", rents: [], purchases: [] }),
  computed: { loggedIn() { return Boolean(this.user); } },
  methods: {
    async submit(path, payload, options = {}) {
      try {
        const data = await request(`${API_BASE_URL}${path}`, options.method ? options : {
          method: "POST", headers: authHeaders(true), body: JSON.stringify(payload),
        });
        return data;
      } catch (error) { this.status = error.message; this.error = true; throw error; }
    },
    async login(event) {
      const data = new FormData(event.target);
      try {
        const body = new URLSearchParams({ username: data.get("email"), password: data.get("password") });
        const result = await this.submit("/users/login", null, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
        localStorage.setItem(TOKEN_KEY, result.access_token); await this.loadProfile();
        this.status = "Sesión iniciada."; this.error = false; event.target.reset();
      } catch (_) {}
    },
    async register(event) {
      const payload = Object.fromEntries(new FormData(event.target));
      try { await this.submit("/users/register", payload); this.status = "Cuenta creada. Ahora inicia sesión."; this.error = false; this.tab = "login"; event.target.reset(); } catch (_) {}
    },
    async loadProfile() {
      try { this.user = await request(`${API_BASE_URL}/users/me`, { headers: authHeaders() }); this.tab = "profile"; }
      catch (error) { localStorage.removeItem(TOKEN_KEY); this.user = null; this.status = error.message; this.error = true; }
    },
    async loadContent() {
      try {
        [this.rents, this.purchases] = await Promise.all([
          request(`${API_BASE_URL}/rents/me`, { headers: authHeaders() }),
          request(`${API_BASE_URL}/purchases/me`, { headers: authHeaders() }),
        ]);
      } catch (error) { this.status = error.message; this.error = true; }
    },
    async updateProfile(event) {
      const payload = Object.fromEntries(new FormData(event.target));
      if (!payload.password) delete payload.password;
      try { this.user = await request(`${API_BASE_URL}/users/me`, { method: "PATCH", headers: authHeaders(true), body: JSON.stringify(payload) }); this.status = "Perfil actualizado."; this.error = false; event.target.elements.password.value = ""; }
      catch (error) { this.status = error.message; this.error = true; }
    },
    logout() { localStorage.removeItem(TOKEN_KEY); this.user = null; this.tab = "login"; this.status = "Sesión cerrada."; this.error = false; },
    formatDate(value) { return new Date(value).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" }); },
  },
  watch: {
    open(value) { if (value && localStorage.getItem(TOKEN_KEY)) this.loadProfile(); },
    tab(value) { if (value === "content") this.loadContent(); },
  },
  template: `
    <section v-if="open" class="account-panel" aria-labelledby="account-title" @click.self="$emit('close')">
      <div class="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-title">
        <div class="account-dialog-header"><div><p class="eyebrow">Mi cuenta</p><h2 id="account-title">Movie Store</h2></div>
          <button class="close-button" type="button" aria-label="Cerrar" @click="$emit('close')">×</button></div>
        <nav class="account-tabs" aria-label="Opciones de cuenta">
          <button v-if="!loggedIn" :class="{ active: tab === 'login' }" type="button" @click="tab = 'login'">Iniciar sesión</button>
          <button v-if="!loggedIn" :class="{ active: tab === 'register' }" type="button" @click="tab = 'register'">Registrarme</button>
          <button v-if="loggedIn" :class="{ active: tab === 'profile' }" type="button" @click="tab = 'profile'">Mi perfil</button>
          <button v-if="loggedIn" :class="{ active: tab === 'content' }" type="button" @click="tab = 'content'">Mi contenido</button>
        </nav>
        <form v-if="tab === 'register'" class="account-form" @submit.prevent="register"><h3>Crear cuenta</h3><input name="full_name" placeholder="Nombre completo" required><input name="email" type="email" placeholder="Correo electrónico" required><input name="password" type="password" minlength="8" placeholder="Contraseña (mínimo 8 caracteres)" required><button class="button button-primary">Registrarme</button></form>
        <form v-if="tab === 'login'" class="account-form" @submit.prevent="login"><h3>Iniciar sesión</h3><input name="email" type="email" placeholder="Correo electrónico" required><input name="password" type="password" placeholder="Contraseña" required><button class="button button-primary">Entrar</button></form>
        <form v-if="tab === 'profile' && user" class="account-form profile-form" @submit.prevent="updateProfile"><h3>Editar perfil</h3><input name="full_name" :value="user.full_name" required><input name="email" type="email" :value="user.email" required><input name="password" type="password" minlength="8" placeholder="Nueva contraseña (opcional)"><div class="profile-actions"><button class="button button-primary">Guardar cambios</button><button class="button" type="button" @click="logout">Cerrar sesión</button></div></form>
        <div v-if="tab === 'content'" class="content-panel"><h3>Películas rentadas</h3><div class="content-list"><p v-if="!rents.length" class="empty-content">No tienes películas rentadas.</p><div v-for="rent in rents" :key="rent.id" class="content-item"><img v-if="rent.poster_url" :src="rent.poster_url" :alt="'Portada de ' + rent.movie_title"><div><strong>{{ rent.movie_title }}</strong><span>Renta hasta {{ formatDate(rent.due_at) }} · \${{ rent.price }} MXN</span></div></div></div><h3>Películas compradas</h3><div class="content-list"><p v-if="!purchases.length" class="empty-content">No tienes películas compradas.</p><div v-for="purchase in purchases" :key="purchase.id" class="content-item"><img v-if="purchase.poster_url" :src="purchase.poster_url" :alt="'Portada de ' + purchase.movie_title"><div><strong>{{ purchase.movie_title }}</strong><span>Comprada el {{ formatDate(purchase.bought_at) }} · \${{ purchase.price }} MXN</span></div></div></div></div>
        <p class="account-status status-message" :class="{ error }" role="status">{{ status }}</p>
      </div>
    </section>
  `,
};
