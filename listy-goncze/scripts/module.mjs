import { MODULE_ID } from "./const.mjs";
import { registerSettings } from "./data.mjs";
import { initSocket } from "./socket.mjs";
import { RegionSelectorApp } from "./apps/region-selector.mjs";

Hooks.once("init", () => {
  registerSettings();
  Handlebars.registerHelper("eq", (a, b) => a === b);
  Handlebars.registerHelper("split", (text) => (text ?? "").split("\n").filter((l) => l.trim().length));
  Handlebars.registerHelper("includes", (arr, val) => Array.isArray(arr) && arr.includes(val));
});

Hooks.once("ready", () => {
  initSocket();
});

/** Otwiera (lub podnosi na wierzch) okno startowe modułu */
function openListyGoncze() {
  new RegionSelectorApp().render(true);
}

// Przycisk w katalogu Journal — spójnie z resztą waszych modułów (Ściąga MG)
Hooks.on("renderJournalDirectory", (app, html) => {
  const root = html instanceof HTMLElement ? html : html[0];
  if (root.querySelector(".listy-goncze-open")) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.classList.add("listy-goncze-open");
  btn.innerHTML = `<i class="fas fa-scroll"></i> Listy gończe`;
  btn.addEventListener("click", openListyGoncze);
  const footer = root.querySelector(".directory-footer") ?? root;
  footer.appendChild(btn);
});

game.modules?.get?.(MODULE_ID) ?? null; // no-op safety for older bundlers
Hooks.once("ready", () => {
  const mod = game.modules.get(MODULE_ID);
  if (mod) mod.api = { open: openListyGoncze };
});
