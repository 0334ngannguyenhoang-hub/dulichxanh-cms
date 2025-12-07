document.addEventListener("DOMContentLoaded", () => {
  const current = location.pathname.split("/").pop().replace(".html", "");

  document.querySelectorAll('.nav-links a').forEach(a => {
    if (a.dataset.page === current) {
      a.classList.add("active");
    }
  });
});
