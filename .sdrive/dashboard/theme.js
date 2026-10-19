/* Set the theme before first paint, so the page never flashes the wrong one.
   Order of precedence: saved choice -> OS preference -> light.
   Kept in its own file so the dashboard can ship a strict CSP. */
(function () {
  var theme = "light";

  try {
    var saved = window.localStorage.getItem("sdrive-theme");

    if (saved === "light" || saved === "dark") {
      theme = saved;
    } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      theme = "dark";
    }
  } catch (error) {
    /* localStorage can be blocked; light is a safe default. */
  }

  document.documentElement.setAttribute("data-theme", theme);
})();
