export const DEFAULT_BATTLE_STAKE = 60;
export const BATTLE_STAKE_OPTIONS = [20, 40, 60, 100, 200];

export function sanitizeBattleStake(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_BATTLE_STAKE;

  const rounded = Math.round(numeric);
  if (rounded <= 0) return DEFAULT_BATTLE_STAKE;
  return Math.min(1000, rounded);
}
