(function () {
  var form = document.getElementById("fp-form");
  var submitBtn = document.getElementById("fp-submit-btn");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = document.getElementById("fp-email").value.trim();
    if (!email) return;

    submitBtn.disabled = true;
    Api.request("/api/members/password-reset/request", { method: "POST", auth: false, body: { email: email } })
      .then(function () { window.location.href = "find-password-sent"; })
      .catch(function () { window.location.href = "find-password-sent"; })
      .finally(function () { submitBtn.disabled = false; });
  });
})();
