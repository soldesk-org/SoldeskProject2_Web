window.refreshSidebarActive = function () {
  var current = window.location.pathname.split("/").pop() + window.location.search;
  document.querySelectorAll("[data-nav]").forEach(function (a) {
    var href = a.getAttribute("data-nav");
    a.classList.remove("bg-[#fea255]", "text-[#25374b]", "hover:bg-[rgba(254,162,85,0.1)]");
    if (href === current) {
      a.classList.add("bg-[#fea255]", "text-[#25374b]");
    } else {
      a.classList.add("text-[#25374b]", "hover:bg-[rgba(254,162,85,0.1)]");
    }
  });
};
window.refreshSidebarActive();
window.addEventListener("popstate", window.refreshSidebarActive);
