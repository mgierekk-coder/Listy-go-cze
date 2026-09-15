import { MODULE_ID, goldForDC } from "../const.mjs";
import * as D from "../data.mjs";
import { request } from "../socket.mjs";
import { TreeEditorApp } from "./tree-editor.mjs";
import { RewardWindowApp } from "./reward-window.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class WantedCardApp extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor({ wantedId, ...options } = {}) {
    super(options);
    this.wantedId = wantedId;
    this.activeTab = "info";
  }

  static DEFAULT_OPTIONS = {
    id: "listy-goncze-wanted-card",
    tag: "div",
    window: { title: "Poszukiwany", icon: "fas fa-scroll", resizable: true },
    position: { width: 480, height: "auto" },
    actions: {
      switchTab: WantedCardApp.#switchTab,
      rollNode: WantedCardApp.#rollNode,
      openTreeEditor: WantedCardApp.#openTreeEditor,
      openReward: WantedCardApp.#openReward,
      markCaptured: WantedCardApp.#markCaptured,
      editInfo: WantedCardApp.#editInfo
    }
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/wanted-card.hbs` }
  };

  async _prepareContext() {
    const wanted = D.findWanted(this.wantedId);
    this.options.window.title = wanted?.name ?? "Poszukiwany";
    const nodes = D.nodesByDepth(wanted).map(({ node, depth }) => ({
      ...node,
      depth,
      unlocked: D.isNodeUnlocked(wanted, node),
      gold: goldForDC(node.dc),
      parentSummary: node.parents.length
        ? `Wymaga: ${node.parents.length} rodziców (${node.parentLogic})`
        : "korzeń"
    }));
    return {
      wanted,
      nodes,
      progress: D.computeProgress(wanted),
      gold: D.computeGold(wanted),
      activeTab: this.activeTab,
      isGM: game.user.isGM,
      hasCharacter: !!game.user.character
    };
  }

  static #switchTab(_event, target) {
    this.activeTab = target.dataset.tab;
    this.render();
  }

  static async #rollNode(_event, target) {
    const nodeId = target.closest("[data-node-id]")?.dataset.nodeId;
    const wanted = D.findWanted(this.wantedId);
    const node = wanted?.nodes?.[nodeId];
    if (!node || node.completed || !D.isNodeUnlocked(wanted, node)) return;

    const actor = game.user.character;
    if (!actor) {
      ui.notifications?.warn("Nie masz przypisanej postaci — poproś GM o rzut.");
      return;
    }
    const roll = await actor.rollSkill?.("inv", { chatMessage: true }) ?? await actor.rollSkill?.({ skill: "inv" }, { chatMessage: true });
    const total = Array.isArray(roll) ? roll[0]?.total : roll?.total;
    if (total === undefined) {
      ui.notifications?.error("Nie udało się wykonać rzutu na Investigation.");
      return;
    }
    if (total >= node.dc) {
      await request("completeNode", { wantedId: this.wantedId, nodeId, actorId: actor.id });
      ui.notifications?.info(`Sukces! ${total} vs DC ${node.dc}.`);
    } else {
      ui.notifications?.warn(`Porażka. ${total} vs DC ${node.dc}.`);
    }
    this.render();
  }

  static #openTreeEditor(_event, _target) {
    new TreeEditorApp({ wantedId: this.wantedId }).render(true);
  }

  static #openReward(_event, _target) {
    new RewardWindowApp({ wantedId: this.wantedId }).render(true);
  }

  static async #markCaptured(_event, _target) {
    await D.setWantedStatus(this.wantedId, "captured");
    this.render();
  }

  static async #editInfo(_event, _target) {
    const wanted = D.findWanted(this.wantedId);
    await foundry.applications.api.DialogV2.prompt({
      window: { title: "Edytuj informacje" },
      content: `
        <label>Imię</label><input type="text" name="name" value="${wanted.name}" />
        <label>Znaki szczególne</label><input type="text" name="traits" value="${wanted.traits ?? ""}" />
        <label>Przestępstwa (jedna linia = jedno)</label><textarea name="crimes">${wanted.crimes ?? ""}</textarea>
        <label>Wyznaczona przez</label><input type="text" name="issuer" value="${wanted.issuer ?? ""}" />
      `,
      ok: {
        label: "Zapisz",
        callback: async (_ev, button) => {
          const f = button.form.elements;
          await D.updateWanted(this.wantedId, {
            name: f.name.value.trim(),
            traits: f.traits.value.trim(),
            crimes: f.crimes.value.trim(),
            issuer: f.issuer.value.trim()
          });
        }
      }
    });
    this.render();
  }
}
