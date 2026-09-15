import { MODULE_ID } from "../const.mjs";
import * as D from "../data.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class TreeEditorApp extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor({ wantedId, ...options } = {}) {
    super(options);
    this.wantedId = wantedId;
  }

  static DEFAULT_OPTIONS = {
    id: "listy-goncze-tree-editor",
    tag: "div",
    window: { title: "Edytor drzewa tropów", icon: "fas fa-sitemap", resizable: true },
    position: { width: 620, height: 600 },
    actions: {
      addNode: TreeEditorApp.#addNode,
      deleteNode: TreeEditorApp.#deleteNode,
      saveNode: TreeEditorApp.#saveNode
    }
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/tree-editor.hbs` }
  };

  async _prepareContext() {
    const wanted = D.findWanted(this.wantedId);
    const allWanted = [];
    for (const region of D.listRegions()) {
      for (const w of D.listWantedInRegion(region.id)) allWanted.push(w);
    }
    const nodes = D.nodesByDepth(wanted).map(({ node, depth }) => ({
      ...node,
      depth,
      parentKeys: node.parents.map((p) => `${p.wantedId ?? wanted.id}::${p.nodeId}`)
    }));
    // wszystkie węzły (z innych poszukiwanych też) jako możliwi rodzice
    const parentOptions = [];
    for (const w of allWanted) {
      for (const n of Object.values(w.nodes)) {
        parentOptions.push({ key: `${w.id}::${n.id}`, label: `${w.name} — ${n.name}` });
      }
    }
    return { wanted, nodes, parentOptions };
  }

  static async #addNode(_event, _target) {
    await D.addNode(this.wantedId, { name: "Nowy trop", dc: 12, weight: 10 });
    this.render();
  }

  static async #deleteNode(_event, target) {
    const nodeId = target.closest("[data-node-id]")?.dataset.nodeId;
    await D.deleteNode(this.wantedId, nodeId);
    this.render();
  }

  static async #saveNode(_event, target) {
    const row = target.closest("[data-node-id]");
    const nodeId = row.dataset.nodeId;
    const name = row.querySelector("[data-field=name]").value.trim();
    const dc = Number(row.querySelector("[data-field=dc]").value);
    const weight = Number(row.querySelector("[data-field=weight]").value);
    const parentLogic = row.querySelector("[data-field=parentLogic]").value;
    const selected = Array.from(row.querySelector("[data-field=parents]").selectedOptions).map((o) => o.value);
    const parents = selected.map((key) => {
      const [wantedId, pNodeId] = key.split("::");
      return wantedId === this.wantedId ? { nodeId: pNodeId } : { nodeId: pNodeId, wantedId };
    });
    await D.updateNode(this.wantedId, nodeId, { name, dc, weight, parentLogic, parents });
    this.render();
    ui.notifications?.info("Trop zapisany.");
  }
}
