const isLocalLiveServer = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const API_URL =
  window.MOVIE_API_URL ||
  (isLocalLiveServer
    ? `${window.location.protocol}//${window.location.hostname}:8000/movies`
    : "/movies");
const API_BASE_URL = API_URL.replace(/\/movies$/, "");
const TOKEN_KEY = "movie_store_access_token";
const PAGE_SIZE = 20;

const state = { skip: 0, movies: [], loading: false };
const elements = {
  form: document.querySelector("[data-filter-form]"),
  grid: document.querySelector("[data-movie-grid]"),
  status: document.querySelector("[data-status]"),
  count: document.querySelector("[data-movie-count]"),
  loadMore: document.querySelector("[data-load-more]"),
  extraFilters: document.querySelector("[data-extra-filters]"),
  ratingRange: document.querySelector("[data-rating-range]"),
  ratingOutput: document.querySelector("[data-rating-output]"),
  accountPanel: document.querySelector("[data-account-panel]"),
  accountStatus: document.querySelector("[data-account-status]"),
  authForms: document.querySelector("[data-auth-forms]"),
  profileForm: document.querySelector("[data-profile-form]"),
  profileTab: document.querySelector("[data-account-tab=profile]"),
  contentTab: document.querySelector("[data-account-tab=content]"),
  loginTab: document.querySelector("[data-account-tab=login]"),
  registerTab: document.querySelector("[data-account-tab=register]"),
  contentPanel: document.querySelector("[data-content-panel]"),
  rentList: document.querySelector("[data-rent-list]"),
  purchaseList: document.querySelector("[data-purchase-list]"),
  moviePanel: document.querySelector("[data-movie-panel]"),
  movieTitle: document.querySelector("[data-movie-panel] [id=movie-panel-title]"),
  moviePoster: document.querySelector("[data-movie-poster]"),
  movieForm: document.querySelector("[data-movie-form]"),
  movieStatus: document.querySelector("[data-movie-status]"),
  rentOptions: document.querySelector("[data-rent-options]"),
  purchaseSummary: document.querySelector("[data-purchase-summary]"),
  movieSubmit: document.querySelector("[data-movie-submit]"),
  duration: document.querySelector("[name=duration]"),
  durationValue: document.querySelector("[data-duration-value]"),
  rentPrice: document.querySelector("[data-rent-price]"),
};
let selectedMovie = null;
let movieAction = "rent";
const RENT_PRICE_PER_DAY = 20;
const PURCHASE_PRICE = 200;

function authHeaders(json = false) {
  const headers = json ? { "Content-Type": "application/json" } : {};
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function setAccountStatus(message, error = false) {
  elements.accountStatus.textContent = message;
  elements.accountStatus.classList.toggle("error", error);
}

function setMovieStatus(message, error = false) {
  elements.movieStatus.textContent = message;
  elements.movieStatus.classList.toggle("error", error);
}

function selectMovieTab(action) {
  movieAction = action;
  document.querySelectorAll("[data-movie-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.movieTab === action);
  });
  elements.rentOptions.toggleAttribute("hidden", action !== "rent");
  elements.purchaseSummary.toggleAttribute("hidden", action !== "purchase");
  elements.movieSubmit.textContent = action === "rent" ? "Confirmar renta" : "Confirmar compra";
}

function openMoviePanel(movie) {
  selectedMovie = movie;
  elements.movieTitle.textContent = movie.title;
  elements.moviePoster.src = movie.poster_url || "";
  elements.moviePoster.alt = `Portada de ${movie.title}`;
  elements.moviePoster.hidden = !movie.poster_url;
  elements.moviePanel.hidden = false;
  elements.movieForm.reset();
  elements.duration.disabled = false;
  elements.movieSubmit.disabled = false;
  setMovieStatus("");
  selectMovieTab("rent");
}

function updateRentalPrice() {
  const days = Number(elements.duration.value);
  elements.durationValue.textContent = `${days} ${days === 1 ? "día" : "días"}`;
  elements.rentPrice.textContent = `$${days * RENT_PRICE_PER_DAY} MXN`;
}

async function apiError(response) {
  try {
    const body = await response.json();
    return body.detail || "No se pudo completar la operación.";
  } catch {
    return `Error del servidor (${response.status}).`;
  }
}

function showProfile(user) {
  elements.authForms.hidden = true;
  elements.profileForm.hidden = false;
  elements.profileTab.hidden = false;
  elements.contentTab.hidden = false;
  elements.loginTab.hidden = true;
  elements.registerTab.hidden = true;
  selectAccountTab("profile");
  elements.profileForm.elements.full_name.value = user.full_name;
  elements.profileForm.elements.email.value = user.email;
  document.querySelector("[data-account-toggle]").textContent = user.full_name;
}

function selectAccountTab(tab) {
  document.querySelectorAll("[data-account-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.accountTab === tab);
  });
  elements.profileForm.hidden = tab !== "profile";
  elements.contentPanel.hidden = tab !== "content";
  elements.authForms.hidden = tab === "profile" || tab === "content";
  document.querySelector("[data-register-form]").hidden = tab !== "register";
  document.querySelector("[data-login-form]").hidden = tab !== "login";
}

function formatDate(value) {
  return new Date(value).toLocaleDateString("es-MX", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function contentItem(title, details, posterUrl) {
  const poster = posterUrl
    ? `<img src="${escapeHtml(posterUrl)}" alt="Portada de ${escapeHtml(title)}" loading="lazy">`
    : '<span class="content-poster-placeholder"></span>';
  return `<div class="content-item">${poster}<div><strong>${escapeHtml(title)}</strong><span>${details}</span></div></div>`;
}

async function loadContent() {
  const [rentsResponse, purchasesResponse] = await Promise.all([
    fetch(`${API_BASE_URL}/rents/me`, { headers: authHeaders() }),
    fetch(`${API_BASE_URL}/purchases/me`, { headers: authHeaders() }),
  ]);
  if (!rentsResponse.ok) throw new Error(await apiError(rentsResponse));
  if (!purchasesResponse.ok) throw new Error(await apiError(purchasesResponse));
  const rents = await rentsResponse.json();
  const purchases = await purchasesResponse.json();
  elements.rentList.innerHTML = rents.length
    ? rents.map((rent) => contentItem(
      rent.movie_title,
      `Renta hasta ${formatDate(rent.due_at)} · $${rent.price} MXN${rent.returned_at ? " · Devuelta" : ""}`,
      rent.poster_url,
    )).join("")
    : '<p class="empty-content">No tienes películas rentadas.</p>';
  elements.purchaseList.innerHTML = purchases.length
    ? purchases.map((purchase) => contentItem(
      purchase.movie_title,
      `Comprada el ${formatDate(purchase.bought_at)} · $${purchase.price} MXN`,
      purchase.poster_url,
    )).join("")
    : '<p class="empty-content">No tienes películas compradas.</p>';
}

async function loadProfile() {
  const response = await fetch(`${API_BASE_URL}/users/me`, { headers: authHeaders() });
  if (!response.ok) {
    localStorage.removeItem(TOKEN_KEY);
    throw new Error(await apiError(response));
  }
  showProfile(await response.json());
}

function getFilters() {
  const formData = new FormData(elements.form);
  const params = new URLSearchParams({ limit: PAGE_SIZE, skip: state.skip });
  const query = formData.get("q")?.trim();
  const genre = formData.get("genre");
  const year = document.querySelector("[name=release_year]").value;
  const rating = Number(elements.ratingRange.value);
  const sort = formData.get("sort");
  if (query) params.set("q", query);
  if (genre) params.set("genre", genre);
  if (year) params.set("release_year", year);
  if (rating > 0) params.set("min_rating", rating);
  params.set("sort_by", sort === "rating" ? "average_rating" : sort === "newest" ? "release_year" : "title");
  params.set("descending", String(sort !== "title"));
  return params;
}

function posterStyle(movie) {
  const colors = ["#34445c, #a95f54", "#232b2e, #bb7655", "#5f475c, #d19b68", "#273d3b, #a95543"];
  return `linear-gradient(145deg, ${colors[(movie.id || 0) % colors.length]})`;
}

function movieCard(movie) {
  const year = movie.release_year || "—";
  const rating = movie.average_rating ? `★ ${Number(movie.average_rating).toFixed(1)}` : "Not rated";
  const poster = movie.poster_url
    ? `<img class="poster-image" src="${escapeHtml(movie.poster_url)}" alt="Portada de ${escapeHtml(movie.title)}" loading="lazy" onerror="this.hidden=true">`
    : "";
  return `<article class="movie-card">
    <div class="poster" data-movie-id="${movie.id}" style="background: ${posterStyle(movie)}">${poster}<span class="poster-title">${escapeHtml(movie.title)}</span></div>
    <div class="movie-info"><h3 class="movie-title" title="${escapeHtml(movie.title)}">${escapeHtml(movie.title)}</h3>
    <span class="movie-meta">${year} · ${movie.runtime_minutes ? `${movie.runtime_minutes} min` : "Feature film"}</span><span class="rating">${rating}</span></div>
  </article>`;
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
}

async function loadMovies({ reset = false } = {}) {
  if (state.loading) return;
  if (reset) { state.skip = 0; state.movies = []; elements.grid.innerHTML = ""; }
  state.loading = true;
  elements.status.textContent = "Loading movies...";
  elements.status.classList.remove("error");
  try {
    const response = await fetch(`${API_URL}?${getFilters()}`);
    if (!response.ok) throw new Error(`Movie API returned ${response.status}`);
    const movies = await response.json();
    state.movies.push(...movies);
    elements.grid.insertAdjacentHTML("beforeend", movies.map(movieCard).join(""));
    state.skip += movies.length;
    elements.count.textContent = `${state.movies.length} movie${state.movies.length === 1 ? "" : "s"}`;
    elements.loadMore.hidden = movies.length < PAGE_SIZE;
    elements.status.textContent = movies.length || state.movies.length ? "" : "No movies match those filters.";
  } catch (error) {
    elements.status.textContent = "We couldn't load the catalog. Check that the movie API is running and try again.";
    elements.status.classList.add("error");
    elements.loadMore.hidden = true;
    console.error(error);
  } finally {
    state.loading = false;
  }
}

elements.form.addEventListener("submit", (event) => { event.preventDefault(); loadMovies({ reset: true }); });
elements.form.querySelectorAll("select").forEach((input) => input.addEventListener("change", () => loadMovies({ reset: true })));
elements.form.querySelector("input[type=search]").addEventListener("input", debounce(() => loadMovies({ reset: true }), 350));
elements.loadMore.addEventListener("click", () => loadMovies());
document.querySelector("[data-filter-toggle]").addEventListener("click", () => {
  elements.extraFilters.hidden = !elements.extraFilters.hidden;
});
elements.ratingRange.addEventListener("input", () => {
  elements.ratingOutput.textContent = `${elements.ratingRange.value}+ rating`;
});
elements.ratingRange.addEventListener("change", () => loadMovies({ reset: true }));
document.querySelector("[name=release_year]").addEventListener("change", () => loadMovies({ reset: true }));
document.querySelectorAll("[data-genre]").forEach((button) => button.addEventListener("click", () => {
  elements.form.querySelector("[name=genre]").value = button.dataset.genre;
  document.querySelector("#discover").scrollIntoView();
  loadMovies({ reset: true });
}));
document.querySelector("[data-focus-search]").addEventListener("click", () => {
  document.querySelector("[name=q]").focus();
  document.querySelector("#discover").scrollIntoView();
});

document.querySelector("[data-account-toggle]").addEventListener("click", async () => {
  elements.accountPanel.hidden = !elements.accountPanel.hidden;
  if (elements.accountPanel.hidden || !localStorage.getItem(TOKEN_KEY)) return;
  try {
    await loadProfile();
  } catch (error) {
    setAccountStatus(error.message, true);
  }
});
document.querySelector("[data-account-close]").addEventListener("click", () => {
  elements.accountPanel.hidden = true;
});
document.querySelector("[data-movie-close]").addEventListener("click", () => {
  elements.moviePanel.hidden = true;
});
document.querySelectorAll("[data-movie-tab]").forEach((button) => {
  button.addEventListener("click", () => selectMovieTab(button.dataset.movieTab));
});
elements.duration.addEventListener("input", updateRentalPrice);
elements.grid.addEventListener("click", (event) => {
  const poster = event.target.closest("[data-movie-id]");
  if (!poster) return;
  const movie = state.movies.find((item) => String(item.id) === poster.dataset.movieId);
  if (movie) openMoviePanel(movie);
});
elements.movieForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!localStorage.getItem(TOKEN_KEY)) {
    setMovieStatus("Inicia sesión antes de rentar o comprar.", true);
    return;
  }
  const form = event.currentTarget;
  const duration = Number(form.elements.duration.value);
  const price = movieAction === "purchase"
    ? PURCHASE_PRICE
    : duration * RENT_PRICE_PER_DAY;
  const payload = movieAction === "purchase"
    ? { movie_id: selectedMovie.id, price }
    : {
      movie_id: selectedMovie.id,
      price,
      due_at: new Date(Date.now() + duration * 86400000).toISOString(),
    };
  try {
    const response = await fetch(`${API_BASE_URL}/${movieAction === "purchase" ? "purchases" : "rents"}`, {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(await apiError(response));
    setMovieStatus(movieAction === "purchase" ? "Película comprada correctamente." : "Película rentada correctamente.");
    form.querySelector("[name=duration]").disabled = true;
    elements.movieSubmit.disabled = true;
  } catch (error) {
    setMovieStatus(error.message, true);
  }
});
document.querySelectorAll("[data-account-tab]").forEach((button) => {
  button.addEventListener("click", async () => {
    if (button.dataset.accountTab === "profile" && !localStorage.getItem(TOKEN_KEY)) return;
    selectAccountTab(button.dataset.accountTab);
    if (button.dataset.accountTab === "profile") {
      try {
        await loadProfile();
      } catch (error) {
        setAccountStatus(error.message, true);
      }
    }
    if (button.dataset.accountTab === "content") {
      try {
        await loadContent();
      } catch (error) {
        setAccountStatus(error.message, true);
      }
    }
  });
});
document.querySelector("[data-register-form]").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  try {
    const response = await fetch(`${API_BASE_URL}/users/register`, {
      method: "POST", headers: authHeaders(true), body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(await apiError(response));
    setAccountStatus("Cuenta creada. Ahora inicia sesión.");
    form.reset();
  } catch (error) {
    setAccountStatus(error.message, true);
  }
});
document.querySelector("[data-login-form]").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const data = new URLSearchParams({
    username: formData.get("email"),
    password: formData.get("password"),
  });
  try {
    const response = await fetch(`${API_BASE_URL}/users/login`, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: data,
    });
    if (!response.ok) throw new Error(await apiError(response));
    localStorage.setItem(TOKEN_KEY, (await response.json()).access_token);
    await loadProfile();
    setAccountStatus("Sesión iniciada.");
    form.reset();
  } catch (error) {
    setAccountStatus(error.message, true);
  }
});
elements.profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  if (!data.password) delete data.password;
  try {
    const response = await fetch(`${API_BASE_URL}/users/me`, {
      method: "PATCH", headers: authHeaders(true), body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(await apiError(response));
    showProfile(await response.json());
    setAccountStatus("Perfil actualizado.");
    form.elements.password.value = "";
  } catch (error) {
    setAccountStatus(error.message, true);
  }
});
document.querySelector("[data-logout]").addEventListener("click", () => {
  localStorage.removeItem(TOKEN_KEY);
  elements.profileForm.hidden = true;
  elements.authForms.hidden = false;
  elements.profileTab.hidden = true;
  elements.contentTab.hidden = true;
  elements.loginTab.hidden = false;
  elements.registerTab.hidden = false;
  selectAccountTab("login");
  document.querySelector("[data-account-toggle]").textContent = "Cuenta";
  setAccountStatus("Sesión cerrada.");
});

function debounce(callback, delay) {
  let timeout;
  return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => callback(...args), delay); };
}

loadMovies({ reset: true });
