// dashboard.js  (dùng as module)
import { api } from "../shared/api.js";

const API_BASE = "https://dulichxanh-backend.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
  initDashboard();
});

let allPosts = [];

/* =========================
      INIT DASHBOARD
   ========================= */
async function initDashboard() {
  const bulkBtn = document.getElementById("bulkUnpublish");
  bulkBtn.replaceWith(bulkBtn.cloneNode(true));
  document.getElementById("bulkUnpublish").onclick = bulkUnpublish;

  document.getElementById("bulkDelete").onclick = bulkDelete;

  const token = localStorage.getItem("token");
  if (!token) {
    console.warn("Không tìm thấy token — hãy đăng nhập trước.");
  }

  const closeBtn = document.querySelector("#viewPopup .popup-actions button");
  if (closeBtn) closeBtn.addEventListener("click", closeView);

  await loadAndRender();

  document.getElementById("filter-author").oninput = applyFilters;
  document.getElementById("filter-tag").oninput = applyFilters;
  document.getElementById("filter-category").onchange = applyFilters;

  document.getElementById("clearFilters").onclick = () => {
    document.getElementById("filter-author").value = "";
    document.getElementById("filter-tag").value = "";
    document.getElementById("filter-category").value = "";
    applyFilters();
  };
}

/* =========================
   LOAD POSTS FROM BACKEND
   ========================= */
async function loadAndRender() {
  try {
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: "Bearer " + token } : {};

    const res = await fetch(`${API_BASE}/posts`, { headers });
    if (!res.ok) throw new Error("Lỗi khi tải bài từ server: " + res.status);

    allPosts = await res.json();
    renderStats(allPosts);
    applyFilters();

  } catch (err) {
    console.error(err);
    alert("❌ Lỗi tải dữ liệu dashboard. Kiểm tra server / token.");
  }
}

/* =========================
   RENDER STATS
   ========================= */
function renderStats(posts = []) {
  const total = posts.length;
  const drafts = posts.filter(p => p.status === "draft").length;
  const published = posts.filter(p => p.status === "published").length;

  document.getElementById("totalPosts").innerText = total;
  document.getElementById("draftPosts").innerText = drafts;
  document.getElementById("publishedPosts").innerText = published;
}

/* =========================
   RENDER TABLE
   ========================= */
function renderTable(posts = []) {
  const tbody = document.getElementById("postList");
  tbody.innerHTML = "";

  posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  posts.forEach(post => {
    const tr = document.createElement("tr");
    const categories = Array.isArray(post.category) ? post.category.join(", ") : "";

    tr.innerHTML = `
      <td><input type="checkbox" class="row-checkbox" data-id="${post._id}"></td>
      <td>${escapeHtml(post.title || "")}</td>
      <td>${escapeHtml(post.author || "")}</td>
      <td>${escapeHtml(categories)}</td>
      <td><span class="status-${post.status}">
        ${post.status === "draft" ? "Chờ duyệt" : "Đã đăng"}</span></td>
      <td>${new Date(post.createdAt).toLocaleString()}</td>
      <td>
        <button class="btn-view" data-id="${post._id}">Xem</button>
        ${
          post.status === "published"
            ? `<button class="btn-undo" data-id="${post._id}">Gỡ bài</button>`
            : `<button class="btn-publish" data-id="${post._id}">Duyệt</button>`
        }
        <button class="btn-delete" data-id="${post._id}">Xoá</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  attachRowEvents();
}

/* =========================
   ATTACH BUTTON EVENTS
   ========================= */
function attachRowEvents() {
  document.querySelectorAll(".btn-view").forEach(btn =>
    btn.addEventListener("click", () => viewPost(btn.dataset.id))
  );

  document.querySelectorAll("#postList .btn-delete").forEach(btn =>
    btn.onclick = () => deletePost(btn.dataset.id)
  );

  document.querySelectorAll(".btn-publish").forEach(btn =>
    btn.addEventListener("click", () => publishPost(btn.dataset.id))
  );

  document.querySelectorAll(".btn-undo").forEach(btn =>
    btn.onclick = () => unpublishPost(btn.dataset.id)
  );
}

document.getElementById("selectAll").onclick = e => {
  const checked = e.target.checked;
  document.querySelectorAll(".row-checkbox").forEach(cb => {
    cb.checked = checked;
  });
};

/* =========================
   VIEW POST (popup)
   ========================= */
async function viewPost(id) {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_BASE}/posts/${id}`, {
      headers: token ? { Authorization: "Bearer " + token } : {}
    });

    if (!res.ok) throw new Error("Không thể lấy bài: " + res.status);

    const post = await res.json();
    document.getElementById("view-title").innerText = post.title || "";
    document.getElementById("view-author").innerText = post.author || "";

    const contentBox = document.getElementById("article-content");

    if (post.type === "emagazine" && post.emagPage) {
      contentBox.innerHTML = `
        <iframe 
          src="${post.emagPage}"
          style="width:100%; height:80vh; border:none; border-radius:12px;"
          allowfullscreen>
        </iframe>`;
    } else {
      contentBox.innerHTML = post.content || "";
    }

    document.getElementById("viewPopup").classList.remove("hidden");

  } catch (err) {
    console.error(err);
    alert("❌ Lỗi khi tải bài chi tiết.");
  }
}

/* =========================
   CLOSE POPUP
   ========================= */
function closeView() {
  document.getElementById("viewPopup").classList.add("hidden");
  document.getElementById("article-content").innerHTML = "";
}

/* =========================
   DELETE / PUBLISH / UNPUBLISH
   ========================= */
async function deletePost(id) {
  if (!confirm("Bạn chắc chắn muốn xoá bài này?")) return;
  try {
    const token = localStorage.getItem("token");

    const res = await fetch(`${API_BASE}/posts/${id}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + token }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.status }));
      throw new Error(err.error || res.status);
    }

    alert("✔ Đã xoá!");
    await loadAndRender();
  } catch (err) {
    console.error(err);
    alert("❌ Xoá thất bại: " + (err.message || err));
  }
}

async function publishPost(id) {
  if (!confirm("Duyệt và xuất bản bài này?")) return;

  try {
    const token = localStorage.getItem("token");

    const res = await fetch(`${API_BASE}/posts/${id}/publish`, {
      method: "PATCH",
      headers: { Authorization: "Bearer " + token }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.status }));
      throw new Error(err.error || res.status);
    }

    alert("✔ Bài đã được duyệt!");
    await loadAndRender();

  } catch (err) {
    console.error(err);
    alert("❌ Duyệt thất bại: " + (err.message || err));
  }
}

async function unpublishPost(id) {
  if (!confirm("Gỡ bài về nháp?")) return;

  try {
    const token = localStorage.getItem("token");

    const res = await fetch(`${API_BASE}/posts/${id}/unpublish`, {
      method: "PATCH",
      headers: { Authorization: "Bearer " + token }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.status }));
      throw new Error(err.error || res.status);
    }

    alert("✔ Bài đã được gỡ về nháp!");
    await loadAndRender();

  } catch (err) {
    console.error(err);
    alert("❌ Gỡ bài thất bại: " + (err.message || err));
  }
}

/* =========================
   HELPERS
   ========================= */
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getSelectedIds() {
  return Array.from(document.querySelectorAll(".row-checkbox:checked"))
    .map(cb => cb.dataset.id)
    .filter(id => id && id !== "undefined");
}

async function bulkDelete() {
  const ids = getSelectedIds();
  if (ids.length === 0) return alert("⚠️ Chưa chọn bài nào!");

  if (!confirm(`Xoá ${ids.length} bài?`)) return;

  for (const id of ids) {
    await fetch(`${API_BASE}/posts/${id}`, {
      method: "DELETE",
      headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    });
  }

  alert("🗑 Đã xoá hàng loạt!");
  await loadAndRender();
}

async function bulkUnpublish() {
  const ids = getSelectedIds();
  if (ids.length === 0) return alert("⚠️ Chưa chọn bài nào!");

  if (!confirm(`Gỡ ${ids.length} bài về nháp?`)) return;

  for (const id of ids) {
    await fetch(`${API_BASE}/posts/${id}/unpublish`, {
      method: "PATCH",
      headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    });
  }

  alert("↩ Đã gỡ hàng loạt!");
  await loadAndRender();
}

/* Expose global nếu cần */
window.viewPost = viewPost;
window.closeView = closeView;
window.deletePost = deletePost;
window.publishPost = publishPost;
window.unpublishPost = unpublishPost;

/* =========================
   FILTER
   ========================= */
function applyFilters() {
  let filtered = [...allPosts];

  const author = document.getElementById("filter-author").value.trim().toLowerCase();
  const tag = document.getElementById("filter-tag").value.trim().toLowerCase();
  const cat = document.getElementById("filter-category").value;

  if (author)
    filtered = filtered.filter(p =>
      (p.author || "").toLowerCase().includes(author)
    );

  if (tag)
    filtered = filtered.filter(p =>
      (p.tags || "").toLowerCase().includes(tag)
    );

  if (cat)
    filtered = filtered.filter(p =>
      Array.isArray(p.category) && p.category.includes(cat)
    );

  renderTable(filtered);
}
