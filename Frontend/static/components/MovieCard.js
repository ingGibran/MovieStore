window.MovieCard = {
  props: { movie: { type: Object, required: true } },
  emits: ["select"],
  computed: {
    posterStyle() {
      const colors = ["#003b2a, #00845a", "#00533a, #38a169", "#0b5d46, #78b894", "#004d36, #1d8b63"];
      return `linear-gradient(145deg, ${colors[(this.movie.id || 0) % colors.length]})`;
    },
    rating() {
      return this.movie.average_rating ? `★ ${Number(this.movie.average_rating).toFixed(1)}` : "Sin rating";
    },
  },
  template: `
    <article class="movie-card">
      <div class="poster" :style="{ background: posterStyle }" @click="$emit('select', movie)">
        <img v-if="movie.poster_url" class="poster-image" :src="movie.poster_url"
          :alt="'Portada de ' + movie.title" loading="lazy">
        <span class="poster-title">{{ movie.title }}</span>
      </div>
      <div class="movie-info">
        <h3 class="movie-title" :title="movie.title">{{ movie.title }}</h3>
        <span class="movie-meta">{{ movie.release_year || "—" }} · {{ movie.runtime_minutes || "Feature film" }}{{ movie.runtime_minutes ? " min" : "" }}</span>
        <span class="rating">{{ rating }}</span>
      </div>
    </article>
  `,
};
