// api.js
const API_BASE = "https://dulichxanh-backend.onrender.com";

export function getToken() {
  return localStorage.getItem("token");
}

function authHeaders() {
  const token = getToken();
  return token ? { "Authorization": `Bearer ${token}` } : {};
}

async function request(path, opts = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...opts.headers
  };

  // merge auth header
  Object.assign(headers, authHeaders());

  const res = await fetch(API_BASE + path, {
    ...opts,
    headers,
  });

  // if unauthorized, optionally redirect to login
  if (res.status === 401) {
    // optional: window.location = '/login.html';
  }

  const txt = await res.text();
  try {
    const json = txt ? JSON.parse(txt) : null;
    if (!res.ok) throw { status: res.status, body: json };
    return json;
  } catch (err) {
    // if parse failed, rethrow
    if (err && err.status) throw err;
    throw { status: res.status, body: txt };
  }
}

export const api = {
  // auth
  login: (username, password) => request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  }),

  register: (username, password, role) => request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password, role })
  }),

  // posts
  getPosts: (status) => request(`/posts${status ? '?status='+encodeURIComponent(status):''}`),
  getPost: (id) => request(`/posts/${id}`),
  createPost: (postData) => request("/posts", {
    method: "POST",
    body: JSON.stringify(postData)
  }),
  updatePost: (id, postData) => request(`/posts/${id}`, {
    method: "PUT",
    body: JSON.stringify(postData)
  }),
  deletePost: (id) => request(`/posts/${id}`, { method: "DELETE" }),
  publishPost: (id) => request(`/posts/${id}/publish`, { method: "PATCH" }),
  unpublishPost: (id) => request(`/posts/${id}/unpublish`, { method: "PATCH" }),
};
