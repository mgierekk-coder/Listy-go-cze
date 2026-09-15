import { MODULE_ID } from "../const.mjs";
import * as D from "../data.mjs";
import { request } from "../socket.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class RewardWindowApp extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor({ wantedId, ...options } = {}) {
    super(options);
    this.wantedId = wantedId;
  }

  static DEFAULT_OPTIONS = {
    id: "listy-goncze-reward-window",
    tag: "div",
    window: { title: "Nagroda", icon: "fas fa-coins", resizable: true },
    position: { width: 380, height: "auto" },
    actions: {
      claimGold: RewardWindowApp.#claimGold,
      removeItem: RewardWindowApp.#removeItem
    }
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/reward-window.hbs` }
  };

  async _prepareContext() {
    const wanted = D.findWanted(this.wantedId);
    return { wanted, gold: D.computeGold(wanted), items: wanted.rewardItems, isGM: game.user.isGM };
  }

  async _onRender(...args) {
    await super._onRender(...args);
    const dropzone = this.element.querySelector(".lg-reward-dropzone");
    if (!dropzone) return;
    dropzone.addEventListener("dragover", (ev) => ev.preventDefault());
    dropzone.addEventListener("drop", async (ev) => {
      ev.preventDefault();
      let data;
      try {
        data = JSON.parse(ev.dataTransfer.getData("text/plain"));
      } catch {
        return;
      }
      if (data.type !== "Item") return;
      const item = await fromUuid(data.uuid);
      if (!item) return;
      await request("addRewardItem", { wantedId: this.wantedId, item: { uuid: data.uuid, name: item.name, img: item.img, qty: 1 } });
      this.render();
    });

    this.element.querySelectorAll("[data-item-uuid]").forEach((row) => {
      row.setAttribute("draggable", "true");
      row.addEventListener("dragstart", (ev) => {
        ev.dataTransfer.setData("text/plain", JSON.stringify({ type: "Item", uuid: row.dataset.itemUuid }));
      });
    });
  }

  static async #claimGold(_event, _target) {
    await request("claimGold", { wantedId: this.wantedId });
    this.render();
  }

  static async #removeItem(_event, target) {
    const index = Number(target.closest("[data-index]")?.dataset.index);
    await request("removeRewardItem", { wantedId: this.wantedId, index });
    this.render();
  }
}
