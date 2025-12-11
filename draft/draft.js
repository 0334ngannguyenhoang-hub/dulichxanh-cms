const API_BASE = "https://dulichxanh-backend.onrender.com";

import { api } from "../shared/api.js";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TiptapImage from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import TextAlign from "@tiptap/extension-text-align";
import Blockquote from "@tiptap/extension-blockquote";

let allDrafts = [];
let currentEditId = null;
let editor = null;

/* ============================================================
   LOAD FROM BACKEND
============================================================ */
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch(`${API_BASE}/posts?status=draft`, {
      headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    });

    allDrafts = await res.json();
    renderList();

  } catch (err) {
    console.error(err);
    alert("❌ Lỗi tải danh sách nháp!");
  }
});

/* ============================================================
   RENDER TABLE
============================================================ */
function renderList() {
  const tbody = document.getElementById("draftList");
  tbody.innerHTML = "";

  allDrafts.forEach(post => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td><input type="checkbox" class="draft-checkbox" data-id="${post._id}"></td>
      <td>${post.title}</td>
      <td>${post.author}</td>
      <td>${(Array.isArray(post.category) ? post.category : []).join(", ")}</td>
      <td>${new Date(post.createdAt).toLocaleString()}</td>
      <td>
        <button class="action-btn edit-btn" data-id="${post._id}">Sửa</button>
        <button class="action-btn publish-btn" data-id="${post._id}">Duyệt</button>
        <button class="action-btn delete-btn" data-id="${post._id}">Xoá</button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  attachRowEvents();
}

document.getElementById("selectAllDraft").onclick = (e) => {
  const checked = e.target.checked;
  document.querySelectorAll(".draft-checkbox").forEach(cb => cb.checked = checked);
};

/* ============================================================
   ATTACH EVENTS
============================================================ */
function attachRowEvents() {
  document.querySelectorAll(".edit-btn").forEach(btn =>
    btn.addEventListener("click", () => openEdit(btn.dataset.id)));

  document.querySelectorAll(".delete-btn").forEach(btn =>
    btn.addEventListener("click", () => deletePost(btn.dataset.id)));

  document.querySelectorAll(".publish-btn").forEach(btn =>
    btn.addEventListener("click", () => publishPost(btn.dataset.id)));
}

/* ============================================================
   DELETE
============================================================ */
async function deletePost(id) {
  if (!confirm("Xoá bài này?")) return;

  await fetch(`${API_BASE}/posts/${id}`, {
    method: "DELETE",
    headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
  });

  alert("Đã xoá!");
  location.reload();
}

/* ============================================================
   PUBLISH
============================================================ */
async function publishPost(id) {
  await fetch(`${API_BASE}/posts/${id}/publish`, {
    method: "PATCH",
    headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
  });

  alert("✔ Đã duyệt bài!");
  location.reload();
}

/* ============================================================
   OPEN EDIT POPUP
============================================================ */
function openEdit(id) {
  currentEditId = id;

  const post = allDrafts.find(p => p._id === id);
  if (!post) return alert("Không tìm thấy bài!");

  document.getElementById("edit-title").value = post.title || "";
  document.getElementById("edit-sapo").value = post.sapo || "";
  document.getElementById("edit-author").value = post.author || "";
  document.getElementById("edit-thumbnail").value = post.thumbnail || "";
  document.getElementById("edit-tags").value = post.tags || "";

  document.getElementById("editPopup").classList.remove("hidden");

  if (editor) editor.destroy();

  setTimeout(() => {
    editor = new Editor({
      element: document.getElementById("edit-editor"),
      content: post.content || "<p>(Trống)</p>",
      extensions: [
        StarterKit.configure({ blockquote: false }),
        Underline,
        Link.configure({ openOnClick: false }),
        TiptapImage,
        Youtube.configure({ inline: false, allowFullscreen: true }),
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Blockquote
      ]
    });

    setupDraftToolbar(editor);
  }, 100);
}

/* ============================================================
   SAVE EDIT
============================================================ */
document.getElementById("btnSaveEdit").addEventListener("click", async () => {
  const body = {
    title: document.getElementById("edit-title").value,
    sapo: document.getElementById("edit-sapo").value,
    author: document.getElementById("edit-author").value,
    thumbnail: document.getElementById("edit-thumbnail").value,
    tags: document.getElementById("edit-tags").value,
    content: editor.getHTML()
  };

  await fetch(`${API_BASE}/posts/${currentEditId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + localStorage.getItem("token")
    },
    body: JSON.stringify(body)
  });

  alert("✔ Đã lưu!");
  location.reload();
});

/* ============================================================
   CLOSE POPUP
============================================================ */
document.getElementById("btnCloseEdit").addEventListener("click", () => {
  document.getElementById("editPopup").classList.add("hidden");
});

/* ============================================================
   TOOLBAR
============================================================ */
function setupDraftToolbar(editor) {
  document.querySelectorAll("#draft-toolbar button").forEach(btn => {
    btn.onclick = () => {
      const action = btn.dataset.action;
      const chain = editor.chain().focus();

      switch (action) {
        case "bold": chain.toggleBold().run(); break;
        case "italic": chain.toggleItalic().run(); break;
        case "underline": chain.toggleUnderline().run(); break;
        case "h2": chain.toggleHeading({ level: 2 }).run(); break;
        case "h3": chain.toggleHeading({ level: 3 }).run(); break;
        case "bullet": chain.toggleBulletList().run(); break;
        case "ordered": chain.toggleOrderedList().run(); break;
        case "align-left": chain.setTextAlign("left").run(); break;
        case "align-center": chain.setTextAlign("center").run(); break;
        case "align-right": chain.setTextAlign("right").run(); break;
        case "align-justify": chain.setTextAlign("justify").run(); break;
        case "blockquote": chain.toggleBlockquote().run(); break;

        case "image":
          document.getElementById("draft-image-input").click();
          break;

        case "youtube":
          let link = prompt("Link YouTube?");
          if (link) chain.setYoutubeVideo({ src: link }).run();
          break;
      }
    };
  });

  const imgInput = document.getElementById("draft-image-input");
  imgInput.onchange = e => {
    const f = e.target.files[0];
    if (!f) return;

    const form = new FormData();
    form.append("image", f);

    fetch(`${API_BASE}/upload`, { method: "POST", body: form })
      .then(res => res.json())
      .then(data => editor.commands.setImage({ src: data.url }));
  };

  /* ============================================================
   UPLOAD THUMBNAIL (Cloudinary)
============================================================ */
const editThumbBtn = document.getElementById("edit-thumb-upload");
const editThumbInput = document.getElementById("edit-thumb-input");

if (editThumbBtn && editThumbInput) {
  editThumbBtn.onclick = () => editThumbInput.click();

  editThumbInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const form = new FormData();
    form.append("image", file);

    try {
      const res = await fetch("https://dulichxanh-backend.onrender.com/upload", {
        method: "POST",
        body: form
      });

      const data = await res.json();

      if (!data.url) {
        alert("❌ Upload thất bại!");
        return;
      }

      document.getElementById("edit-thumbnail").value = data.url;
      alert("✔ Ảnh thumbnail đã tải lên!");

    } catch (err) {
      console.error("Thumbnail upload error:", err);
      alert("❌ Không thể upload ảnh!");
    }

    editThumbInput.value = "";
  };
}

}

/* ============================================================
   BULK ACTIONS
============================================================ */
function getSelectedDraftIds() {
  return Array.from(document.querySelectorAll(".draft-checkbox:checked"))
    .map(cb => cb.dataset.id);
}

document.getElementById("bulkPublishDraft").onclick = async () => {
  const ids = getSelectedDraftIds();
  if (ids.length === 0) return alert("⚠️ Chưa chọn bài nào!");

  if (!confirm(`Duyệt ${ids.length} bài?`)) return;

  for (const id of ids) {
    await fetch(`${API_BASE}/posts/${id}/publish`, {
      method: "PATCH",
      headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    });
  }

  alert("✔ Đã duyệt hàng loạt!");
  location.reload();
};

document.getElementById("bulkDeleteDraft").onclick = async () => {
  const ids = getSelectedDraftIds();
  if (ids.length === 0) return alert("⚠️ Chưa chọn bài nào!");

  if (!confirm(`Xoá ${ids.length} bài?`)) return;

  for (const id of ids) {
    await fetch(`${API_BASE}/posts/${id}`, {
      method: "DELETE",
      headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    });
  }

  alert("🗑 Đã xoá hàng loạt!");
  location.reload();
};

/* ============================================================
   FILTER FUNCTION
============================================================ */
function applyFilters() {
  let author = document.getElementById("filter-author").value.trim().toLowerCase();
  let tag = document.getElementById("filter-tag").value.trim().toLowerCase();
  let category = document.getElementById("filter-category").value.trim();

  let filtered = allDrafts.filter(post => {
    let ok = true;

    if (author && !(post.author || "").toLowerCase().includes(author)) ok = false;
    if (tag && !(post.tags || "").toLowerCase().includes(tag)) ok = false;

    if (category && Array.isArray(post.category)) {
      if (!post.category.includes(category)) ok = false;
    }

    return ok;
  });

  renderFilteredList(filtered);
}

/* ============================================================
   RENDER FILTERED LIST
============================================================ */
function renderFilteredList(list) {
  const tbody = document.getElementById("draftList");
  tbody.innerHTML = "";

  list.forEach(post => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td><input type="checkbox" class="draft-checkbox" data-id="${post._id}"></td>
      <td>${post.title}</td>
      <td>${post.author}</td>
      <td>${(post.category || []).join(", ")}</td>
      <td>${new Date(post.createdAt).toLocaleString()}</td>
      <td>
        <button class="action-btn edit-btn" data-id="${post._id}">Sửa</button>
        <button class="action-btn publish-btn" data-id="${post._id}">Duyệt</button>
        <button class="action-btn delete-btn" data-id="${post._id}">Xoá</button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  attachRowEvents();
}

/* ============================================================
   RESET FILTERS
============================================================ */
document.getElementById("filter-author").addEventListener("input", applyFilters);
document.getElementById("filter-tag").addEventListener("input", applyFilters);
document.getElementById("filter-category").addEventListener("change", applyFilters);

document.getElementById("clearFilters").addEventListener("click", () => {
  document.getElementById("filter-author").value = "";
  document.getElementById("filter-tag").value = "";
  document.getElementById("filter-category").value = "";
  renderList();
});
