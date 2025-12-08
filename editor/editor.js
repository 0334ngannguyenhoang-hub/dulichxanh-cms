import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Blockquote from "@tiptap/extension-blockquote";
import Youtube from "@tiptap/extension-youtube";
import Underline from "https://esm.sh/@tiptap/extension-underline@2.3.2";

import { api } from "../shared/api.js";

const API_BASE = "https://dulichxanh-backend.onrender.com";

document.addEventListener("DOMContentLoaded", () => {

  /* ============================================================
      CATEGORY DROPDOWN
  ============================================================ */
  const catHeader = document.querySelector(".cat-header");
  const catBox = document.getElementById("catBox");
  if (catHeader && catBox) {
    catHeader.addEventListener("click", () => {
      catBox.classList.toggle("open");
    });
  }

  /* ============================================================
      INIT TIPTAP
  ============================================================ */
  const editor = new Editor({
    element: document.querySelector("#editor"),
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: true }),
      Image,
      Youtube.configure({ width: 640, height: 360 }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Blockquote
    ],
    content: `<p>Nhập nội dung bài viết tại đây...</p>`
  });

  /* ============================================================
      WRAP IMAGES & VIDEOS
  ============================================================ */
  function wrapImages(root) {
    root.querySelectorAll("img").forEach(img => {
      if (!img.closest("figure")) {
        const fig = document.createElement("figure");
        fig.className = "img-figure";
        const cap = document.createElement("figcaption");
        img.parentNode.insertBefore(fig, img);
        fig.appendChild(img);
        fig.appendChild(cap);
      }
    });
  }

  function wrapVideos(root) {
    root.querySelectorAll("iframe").forEach(iframe => {
      if (!iframe.closest("figure")) {
        const fig = document.createElement("figure");
        fig.className = "video-figure";
        const cap = document.createElement("figcaption");
        iframe.parentNode.insertBefore(fig, iframe);
        fig.appendChild(iframe);
        fig.appendChild(cap);
      }
    });
  }

  function youtubeToEmbed(url) {
    if (!url) return url;
    try {
      const u = new URL(url);
      if (u.hostname.includes("youtu.be")) {
        return `https://www.youtube.com/embed${u.pathname}`;
      }
      if (u.searchParams.get("v")) {
        return "https://www.youtube.com/embed/" + u.searchParams.get("v");
      }
      return url;
    } catch {
      return url;
    }
  }

  /* ============================================================
      TOOLBAR ACTIONS
  ============================================================ */
  document.querySelectorAll(".toolbar button").forEach(btn => {
    btn.addEventListener("click", () => {
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

        case "image":
          document.getElementById("imageInput").click();
          break;

        case "blockquote":
          chain.toggleBlockquote().run();
          break;

        case "youtube": {
          let link = prompt("Nhập link YouTube:");
          if (link) {
            link = youtubeToEmbed(link);
            chain.setYoutubeVideo({
              src: link,
              width: 640,
              height: 360
            }).run();
            setTimeout(updatePreview, 30);
          }
          break;
        }
      }
    });
  });

  /* ============================================================
      IMAGE UPLOAD (FIXED FOR RENDER)
  ============================================================ */
  const imageInput = document.getElementById("imageInput");
  if (imageInput) {
    imageInput.addEventListener("change", e => {
      const f = e.target.files[0];
      if (!f) return;

      const form = new FormData();
      form.append("image", f);

      fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: form
      })
        .then(res => res.json())
        .then(data => {
          editor.commands.setImage({ src: data.url });
          setTimeout(updatePreview, 50);
        });

      e.target.value = "";
    });
  }

  /* ============================================================
      PREVIEW UPDATE
  ============================================================ */
  function updatePreview() {

    document.getElementById("preview-title").innerText =
      document.getElementById("title").value;

    document.getElementById("preview-sapo").innerText =
      document.getElementById("sapo").value;

    document.getElementById("preview-author").innerHTML =
      `<i>${document.getElementById("author").value}</i>`;

    const thumb = document.getElementById("thumbnail").value;
    const thumbPreview = document.getElementById("preview-thumbnail");
    thumbPreview.style.display = thumb ? "block" : "none";
    thumbPreview.src = thumb || "";

    const isEmag = Array.from(document.querySelectorAll(".cat-list input:checked"))
      .map(c => c.value)
      .includes("emagazine");

    // Show/Hide emagazine input
    if (isEmag) {
      document.getElementById("emagazineBox").style.display = "block";
    } else {
      document.getElementById("emagazineBox").style.display = "none";
    }

    if (isEmag) {
      document.getElementById("editor").style.display = "none";
      document.querySelector(".toolbar").style.display = "none";

      const page = document.getElementById("emagPage").value.trim();
      if (page) {
        document.getElementById("preview-content").innerHTML =
          `<div style="padding:20px; text-align:center; color:#0b8457;">
            <b>📄 Bài E-magazine</b>
            <p style="font-size:13px; color:#666; margin-top:8px;">${page}</p>
          </div>`;
      } else {
        document.getElementById("preview-content").innerHTML =
          `<i style="color:#999;">(Chưa nhập link Canva Website)</i>`;
      }
      return;
    } else {
      document.getElementById("editor").style.display = "block";
      document.querySelector(".toolbar").style.display = "flex";
    }

    const temp = document.createElement("div");
    temp.innerHTML = editor.getHTML();
    wrapImages(temp);
    wrapVideos(temp);

    document.getElementById("preview-content").innerHTML = temp.innerHTML;
  }

  /* ============================================================
      STATUS BAR
  ============================================================ */
  function updateStatusBar() {
    const text = editor.getText();
    const html = editor.getHTML();

    const wordCount = (text.trim().length === 0) ? 0 : text.trim().split(/\s+/).length;
    const charCount = text.length;
    const imgCount = (html.match(/<img /g) || []).length;
    const videoCount = (html.match(/<iframe/g) || []).length;

    const now = new Date();
    const timeString = now.toLocaleTimeString("vi-VN", {
      hour: "2-digit", minute: "2-digit"
    });

    document.getElementById("statusBar").innerText =
      `${wordCount} chữ • ${charCount} ký tự • ${imgCount} ảnh • ${videoCount} video • Lưu lúc ${timeString}`;
  }

  editor.on("update", () => {
    updatePreview();
    updateStatusBar();
  });

  ["title", "sapo", "author", "thumbnail", "emagPage"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", updatePreview);
  });

  document.querySelectorAll(".cat-list input").forEach(chk =>
    chk.addEventListener("change", updatePreview)
  );

  /* ============================================================
      THUMBNAIL UPLOAD
  ============================================================ */
  const thumbInput = document.getElementById("thumbInput");
  if (thumbInput) {
    thumbInput.addEventListener("change", e => {
      const f = e.target.files[0];
      if (!f) return;

      const form = new FormData();
      form.append("image", f);

      fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: form
      })
        .then(res => res.json())
        .then(data => {
          document.getElementById("thumbnail").value = data.url;
          alert("✔ Thumbnail đã upload!");
          updatePreview();
        });

      e.target.value = "";
    });
  }

  /* ============================================================
      SAVE POST – FIX URL FOR RENDER
  ============================================================ */
  document.getElementById("saveBtn").addEventListener("click", async () => {

    const title = document.getElementById("title").value.trim();
    const sapo = document.getElementById("sapo").value.trim();
    const author = document.getElementById("author").value.trim();
    const thumbnail = document.getElementById("thumbnail").value.trim();
    const tags = document.getElementById("tags").value.trim();
    const categories = Array.from(document.querySelectorAll(".cat-list input:checked"));

    const plainTextContent = editor.getText().trim();
    let missing = [];

    const isEmag = categories.map(c => c.value).includes("emagazine");
    const emagPage = document.getElementById("emagPage").value.trim();

    if (isEmag) {
      if (!emagPage) missing.push("Link Canva Website (emagPage)");
    } else {
      if (!plainTextContent || plainTextContent === "(Trống)")
        missing.push("Nội dung bài viết");
    }

    if (!title) missing.push("Tiêu đề");
    if (!sapo) missing.push("Sapo");
    if (categories.length === 0) missing.push("Chuyên mục");
    if (!thumbnail) missing.push("Ảnh thumbnail");
    if (!tags) missing.push("Hashtags");

    if (missing.length > 0) {
      alert("⚠️ Xin hãy điền nội dung vào phần:\n\n- " + missing.join("\n- "));
      return;
    }

    const post = {
      title,
      sapo,
      author,
      category: categories.map(c => c.value),
      tags,
      thumbnail,
      type: isEmag ? "emagazine" : "normal",
      emagPage: isEmag ? emagPage : "",
      content: isEmag ? "" : editor.getHTML(),
      createdAt: new Date().toISOString(),
      status: "draft"
    };

    try {
      const res = await fetch(`${API_BASE}/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify(post)
      });

      const data = await res.json();

      if (!res.ok) {
        alert("❌ Lỗi khi lưu bài: " + (data.error || "Không rõ lỗi"));
        return;
      }

      alert("✔ Đã lưu bài lên máy chủ!");
      window.location.href = "../draft/draft.html";

    } catch (err) {
      console.error("SAVE POST ERROR:", err);
      alert("❌ Không thể kết nối server!");
    }
  });

});
