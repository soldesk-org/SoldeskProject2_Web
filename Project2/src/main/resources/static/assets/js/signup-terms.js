(function () {
  var checkSvg =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var state = { service: false, privacy: false };
  var allBox = document.getElementById("check-all");
  var serviceBox = document.getElementById("check-service");
  var privacyBox = document.getElementById("check-privacy");
  var nextBtn = document.getElementById("next-btn");

  function setBox(box, checked) {
    box.className =
      "flex size-[25px] shrink-0 items-center justify-center rounded-[7px] border " +
      (checked ? "border-[#fd6d4a] bg-[#fd6d4a] text-white" : "border-[rgba(37,55,75,0.7)] bg-white");
    box.innerHTML = checked ? checkSvg : "";
  }

  function render() {
    var all = state.service && state.privacy;
    setBox(allBox, all);
    setBox(serviceBox, state.service);
    setBox(privacyBox, state.privacy);
    nextBtn.disabled = !all;
    nextBtn.className =
      "h-[52px] w-full rounded-[10px] bg-gradient-to-r from-[#fd6d4a] to-[#fea255] text-[20px] font-semibold tracking-[-1px] text-white transition-opacity hover:opacity-90" +
      (all ? "" : " opacity-50");
  }

  allBox.addEventListener("click", function () {
    var next = !(state.service && state.privacy);
    state.service = next;
    state.privacy = next;
    render();
  });
  serviceBox.addEventListener("click", function () {
    state.service = !state.service;
    render();
  });
  privacyBox.addEventListener("click", function () {
    state.privacy = !state.privacy;
    render();
  });
  nextBtn.addEventListener("click", function () {
    if (nextBtn.disabled) return;
    window.location.href = nextBtn.getAttribute("data-next");
  });

  render();
})();
