(function () {
  if (!Api.requireRole("BUSINESS", "mypage")) return;

  var tabs = ["store", "rating", "menu"];
  var buttons = {};
  var panels = {};
  tabs.forEach(function (t) {
    buttons[t] = document.getElementById("biz-tab-btn-" + t);
    panels[t] = document.getElementById("biz-tab-panel-" + t);
  });

  function render(active) {
    tabs.forEach(function (t) {
      var isActive = t === active;
      buttons[t].className =
        "flex h-[56px] flex-1 items-center justify-center gap-2 rounded-[10px] text-[19px] font-semibold tracking-[-0.95px] transition-colors " +
        (isActive
          ? "bg-gradient-to-r from-[#fea255] to-[#fd6d4a] text-white"
          : "border border-[rgba(37,55,75,0.2)] bg-white text-[#25374b] hover:bg-[rgba(254,162,85,0.08)]");
      panels[t].style.display = isActive ? "" : "none";
    });
  }

  tabs.forEach(function (t) {
    buttons[t].addEventListener("click", function () { render(t); });
  });

  render("store");
})();
