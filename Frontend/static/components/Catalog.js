const PAGE_SIZE = 20;

window.Catalog = {
  components: { MovieCard: window.MovieCard },
  emits: ["select-movie"],
  data: () => ({
    movies: [], skip: 0, loading: false, hasMore: true, error: "", query: "", genre: "", sort: "rating",
    minRating: 0, releaseYear: "", showExtraFilters: false,
  }),
  computed: {
    ratingLabel() { return this.minRating ? `${this.minRating}+ rating` : "Cualquier rating"; },
  },
  methods: {
    filters() {
      const params = new URLSearchParams({ limit: PAGE_SIZE, skip: this.skip });
      if (this.query.trim()) params.set("q", this.query.trim());
      if (this.genre) params.set("genre", this.genre);
      if (this.releaseYear) params.set("release_year", this.releaseYear);
      if (this.minRating > 0) params.set("min_rating", this.minRating);
      params.set("sort_by", this.sort === "rating" ? "average_rating" : this.sort === "newest" ? "release_year" : "title");
      params.set("descending", String(this.sort !== "title"));
      return params;
    },
    async load(reset = false) {
      if (this.loading) return;
      if (reset) { this.skip = 0; this.movies = []; this.hasMore = true; }
      this.loading = true; this.error = "";
      try {
        const page = await request(`${API_URL}?${this.filters()}`);
        page.forEach((movie) => this.movies.push(movie));
        this.skip += page.length; this.hasMore = page.length === PAGE_SIZE;
      } catch (error) {
        this.error = "No se pudo cargar el catálogo. Verifica que la API esté activa.";
        console.error(error);
      } finally { this.loading = false; }
    },
    debounceLoad() {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => this.load(true), 350);
    },
  },
  mounted() { this.load(true); },
  template: `
    <section class="catalog-section" id="discover" aria-labelledby="discover-title">
      <div class="section-heading"><div><p class="eyebrow">Catálogo</p><h1 id="discover-title">Encuentra una película</h1></div>
        <span class="movie-count">{{ movies.length }} película{{ movies.length === 1 ? "" : "s" }}</span></div>
      <form class="filter-bar" @submit.prevent="load(true)">
        <label class="search-field"><input v-model="query" type="search" placeholder="Buscar película" autocomplete="off" @input="debounceLoad"></label>
        <label class="select-field"><span class="sr-only">Género</span><select v-model="genre" @change="load(true)">
          <option value="">Todos los géneros</option><option>Acción</option><option>Aventura</option><option>Animación</option><option>Comedia</option><option>Crimen</option><option>Drama</option><option>Fantasía</option><option>Horror</option><option>Romance</option><option>Sci-Fi</option><option>Thriller</option>
        </select></label>
        <label class="select-field sort-field"><span class="sr-only">Ordenar</span><select v-model="sort" @change="load(true)">
          <option value="rating">Mejor valoradas</option><option value="newest">Más nuevas</option><option value="title">Título A-Z</option>
        </select></label>
        <button class="filter-toggle" type="button" @click="showExtraFilters = !showExtraFilters">Más filtros <span>＋</span></button>
      </form>
      <div v-if="showExtraFilters" class="extra-filters">
        <label>Rating mínima <input v-model.number="minRating" type="range" min="0" max="10" step="0.5" @change="load(true)"></label>
        <output>{{ ratingLabel }}</output>
        <label class="year-field">Año <input v-model="releaseYear" type="number" min="1888" max="2100" placeholder="e.g. 1999" @change="load(true)"></label>
      </div>
      <p class="status-message" :class="{ error }" role="status">{{ error || (loading && !movies.length ? "Cargando películas..." : "") }}</p>
      <div class="movie-grid" aria-live="polite"><MovieCard v-for="movie in movies" :key="movie.id" :movie="movie" @select="$emit('select-movie', $event)" /></div>
      <button v-if="hasMore && movies.length" class="button button-outline load-more" type="button" @click="load()">Cargar más</button>
    </section>
  `,
};
