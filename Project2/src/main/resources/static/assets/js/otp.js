(function () {
  var inputs = document.querySelectorAll(".otp-input");
  inputs.forEach(function (input, i) {
    input.addEventListener("input", function () {
      input.value = input.value.replace(/\D/g, "").slice(-1);
      if (input.value && inputs[i + 1]) inputs[i + 1].focus();
    });
  });
})();
