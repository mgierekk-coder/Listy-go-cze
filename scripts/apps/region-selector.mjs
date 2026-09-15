import { MODULE_ID } from "../const.mjs";
import * as D from "../data.mjs";
import { RegionViewApp } from "./region-view.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class RegionSelectorApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "listy-goncze-region-selector",
    tag: "div",
    window: { title: "Listy gończe", icon: "fas fa-scroll", resizable: true },
    position: { width: 480, height: "auto" },
    actions: {
      openRegion: RegionSelectorApp.#openRegion,
      createRegion: RegionSelectorApp.#createRegion
    }
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/region-selector.hbs` }
  };

  async _prepareContext() {
    return { regions: D.listRegions(), isGM: game.user.isGM };
  }

  static async #openRegion(_event, target) {
    const regionId = target.closest("[data-region-id]")?.dataset.regionId;
    if (!regionId) return;
    new RegionViewApp({ regionId }).render(true);
  }

  static async #createRegion(_event, _target) {
    const input = this.element.querySelector("#lg-new-region-name");
    const name = input?.value?.trim();
    if (!name) return;
    await D.createRegion(name);
    input.value = "";
    this.render();
  }
}
