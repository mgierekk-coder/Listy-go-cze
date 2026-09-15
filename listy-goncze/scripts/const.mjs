export const MODULE_ID = "listy-goncze";
export const SETTING_DATA = "data";
export const SOCKET = `module.${MODULE_ID}`;

/** Punkty złota za węzeł wg formuły: 5 * DC - 25 (baza 50zł przy DC15, +-5zł za 1 różnicy DC) */
export function goldForDC(dc) {
  return Math.max(0, 5 * Number(dc || 0) - 25);
}
