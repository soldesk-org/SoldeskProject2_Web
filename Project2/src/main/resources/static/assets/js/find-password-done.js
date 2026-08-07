(function () {
  var email = sessionStorage.getItem("fp_email");
  var emailEl = document.getElementById("doneEmail");
  if (emailEl && email) emailEl.textContent = email;

  var changedAtEl = document.getElementById("doneChangedAt");
  if (changedAtEl) {
    var now = new Date();
    var pad = function (n) { return String(n).padStart(2, "0"); };
    changedAtEl.textContent = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()) +
      " " + pad(now.getHours()) + ":" + pad(now.getMinutes());
  }

  sessionStorage.removeItem("fp_email");
})();
