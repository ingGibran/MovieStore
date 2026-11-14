const isLocalLiveServer = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const API_URL = window.MOVIE_API_URL ||
  (isLocalLiveServer ? `${window.location.protocol}//${window.location.hostname}:8000/movies` : "/movies");
const API_BASE_URL = API_URL.replace(/\/movies$/, "");
const TOKEN_KEY = "movie_store_access_token";

function authHeaders(json = false) {
  const headers = json ? { "Content-Type": "application/json" } : {};
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function apiError(response) {
  try {
    const body = await response.json();
    return body.detail || "No se pudo completar la operación.";
  } catch {
    return `Error del servidor (${response.status}).`;
  }
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(await apiError(response));
  return response.json();
}
