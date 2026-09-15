import { SOCKET } from "./const.mjs";
import * as D from "./data.mjs";

/**
 * Wywołania, które MUSZĄ wykonać się na kliencie GM (zapis do world setting).
 * Gracz woła request(); jeśli sam jest GM, wykonuje lokalnie od razu.
 * Jeśli nie jest GM, wysyła zlecenie przez socket — pierwszy aktywny GM je wykona.
 */
const HANDLERS = {
  completeNode: (p) => D.completeNode(p.wantedId, p.nodeId, p.actorId),
  addRewardItem: (p) => D.addRewardItem(p.wantedId, p.item),
  removeRewardItem: (p) => D.removeRewardItem(p.wantedId, p.index),
  claimGold: async (p) => {
    const wanted = D.findWanted(p.wantedId);
    if (!wanted) return;
    const actor = game.actors.get(wanted.lastActorId);
    if (!actor) {
      ui.notifications?.warn("Listy gończe: brak przypisanego odbiorcy złota (nikt jeszcze nie ukończył tropu).");
      return;
    }
    const gold = D.computeGold(wanted);
    const current = Number(foundry.utils.getProperty(actor, "system.currency.gp") ?? 0);
    await actor.update({ "system.currency.gp": current + gold });
    ui.notifications?.info(`${actor.name} otrzymuje ${gold} zł.`);
  }
};

export function initSocket() {
  game.socket.on(SOCKET, async ({ type, payload }) => {
    if (!game.user.isGM) return;
    // tylko jeden GM wykonuje — jeśli jest ich kilku aktywnych, pierwszy który złapie zdarzenie
    const handler = HANDLERS[type];
    if (handler) await handler(payload);
  });
}

/** Wywołaj zmianę danych — lokalnie jeśli GM, przez socket jeśli gracz */
export async function request(type, payload) {
  const handler = HANDLERS[type];
  if (!handler) throw new Error(`Nieznane zlecenie: ${type}`);
  if (game.user.isGM) {
    await handler(payload);
  } else {
    game.socket.emit(SOCKET, { type, payload });
  }
}
