/* Mobile panels are overlays: opening tools never resizes or recenters the map. */
(function () {
  const $ = (id) => document.getElementById(id),
    query = window.matchMedia(
      "(max-width: 900px), (max-height: 500px) and (pointer: coarse)",
    );
  let panel = null;
  function showPanel(next) {
    panel = next;
    for (const [id, name] of [
      ["builder", "build"],
      ["details", "pulse"],
    ]) {
      $(id).classList.toggle("mobileOpen", query.matches && panel === name);
      if (query.matches)
        $(id).setAttribute("aria-hidden", String(panel !== name));
      else $(id).removeAttribute("aria-hidden");
    }
    $("mobileExplore").setAttribute("aria-pressed", String(!panel));
    $("mobileBuild").setAttribute("aria-expanded", String(panel === "build"));
    $("mobilePulse").setAttribute("aria-expanded", String(panel === "pulse"));
    for (const [id, name] of [
      ["mobileExplore", null],
      ["mobileBuild", "build"],
      ["mobilePulse", "pulse"],
    ])
      $(id).classList.toggle("active", panel === name);
  }
  $("mobileExplore").onclick = () => {
    $("inspectTool").click();
    showPanel(null);
  };
  $("mobileBuild").onclick = () =>
    showPanel(panel === "build" ? null : "build");
  $("mobilePulse").onclick = () =>
    showPanel(panel === "pulse" ? null : "pulse");
  $("closeBuild").onclick = () => showPanel(null);
  $("closeDetails").onclick = () => showPanel(null);
  $("mobileWorld").onclick = () => {
    showPanel(null);
    $("worldButton").click();
  };
  // After choosing a building, reveal the map immediately for placement.
  $("buildList").addEventListener("click", (event) => {
    if (query.matches && event.target.closest(".buildCard:not(:disabled)"))
      showPanel(null);
  });
  window.addEventListener("city-building-selected", () => {
    if (query.matches) showPanel("pulse");
  });
  window.addEventListener("city-map-opened", () => showPanel(null));
  window.addEventListener("city-menu-opened", () => showPanel(null));
  query.addEventListener("change", () => showPanel(null));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") showPanel(null);
  });
  showPanel(null);
})();
