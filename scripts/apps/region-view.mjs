import { MODULE_ID } from "../const.mjs";
import * as D from "../data.mjs";
import { WantedCardApp } from "./wanted-card.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class RegionViewApp extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor({ regionId, ...options } = {}) {
    super(options);
    this.regionId = regionId;
    this.activeTab = "active";
  }

  static DEFAULT_OPTIONS = {
    id: "listy-goncze-region-view",
    tag: "div",
    window: { title: "Region", icon: "fas fa-map-marker-alt", resizable: true },
    position: { width: 520, height: "auto" },
    actions: {
      switchTab: RegionViewApp.#switchTab,
      openWanted: RegionViewApp.#openWanted,
      createWanted: RegionViewApp.#createWanted
    }
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/region-view.hbs` }
  };

  async _prepareContext() {
    const region = D.getRegion(this.regionId);
    this.options.window.title = `Region: ${region?.name ?? ""}`;
    const active = D.listWantedInRegion(this.regionId, "active").map((w) => this.#toRow(w));
    const caught = D.listWantedInRegion(this.regionId, "captured").map((w) => this.#toRow(w));
    return { region, active, caught, activeTab: this.activeTab, isGM: game.user.isGM };
  }

  #toRow(wanted) {
    return {
      id: wanted.id,
      name: wanted.name,
      img: wanted.img,
      mainCrime: (wanted.crimes ?? "").split("\n")[0] ?? "",
      progress: D.computeProgress(wanted),
      gold: D.computeGold(wanted)
    };
  }

  static #switchTab(_event, target) {
    this.activeTab = target.dataset.tab;
    this.render();
  }

  static #openWanted(_event, target) {
    const wantedId = target.closest("[data-wanted-id]")?.dataset.wantedId;
    if (!wantedId) return;
    new WantedCardApp({ wantedId }).render(true);
  }

  static async #createWanted(_event, _target) {
    const name = await foundry.applications.api.DialogV2.prompt({
      window: { title: "Nowy poszukiwany" },
      content: `<label>Imię</label><input type="text" name="name" autofocus />`,
      ok: {
        label: "Utwórz",
        callback: (_ev, button) => button.form.elements.name.value.trim()
      }
    });
    if (!name) return;
    await D.createWanted(this.regionId, { name });
    this.render();
  }
}
