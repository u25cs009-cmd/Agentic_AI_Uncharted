export const MEMORY_HALF_LIVES = {
  semantic: 180,
  episodic: 30,
  procedural: 90,
  preference: 120,
  ephemeral: 7,
  constraint: 0, // no decay (factor = 1.0)
};

export type HalfLifeType = keyof typeof MEMORY_HALF_LIVES;
