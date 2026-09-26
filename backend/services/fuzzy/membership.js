export const LINGUISTIC_LEVELS = Object.freeze({
  SANGAT_RENDAH: 'Sangat Rendah',
  RENDAH: 'Rendah',
  SEDANG: 'Sedang',
  TINGGI: 'Tinggi',
});

export const DIFFICULTY_LEVELS = Object.freeze({
  MUDAH: 'Mudah',
  SEDANG: 'Sedang',
  SULIT: 'Sulit',
});

export const TIME_CATEGORIES = Object.freeze({
  CEPAT: 'Cepat',
  SEDANG: 'Sedang',
  LAMA: 'Lama',
});

export const CORRECTNESS_SETS = Object.freeze({
  BENAR: 'Benar',
  SALAH: 'Salah',
});

// Output fuzzy sets on universe [0, 100]
export const OUTPUT_MEMBERSHIP_CONFIG = Object.freeze({
  [LINGUISTIC_LEVELS.SANGAT_RENDAH]: { type: 'trapezoid', params: [0, 0, 20, 35] },
  [LINGUISTIC_LEVELS.RENDAH]: { type: 'triangle', params: [25, 40, 55] },
  [LINGUISTIC_LEVELS.SEDANG]: { type: 'triangle', params: [45, 60, 75] },
  [LINGUISTIC_LEVELS.TINGGI]: { type: 'trapezoid', params: [65, 80, 100, 100] },
});

// Triangular membership function: [a, b, c]
export function triangular(x, a, b, c) {
  if (x <= a || x >= c) return 0.0;
  if (x > a && x <= b) return a === b ? 1.0 : (x - a) / (b - a);
  if (x > b && x < c) return b === c ? 1.0 : (c - x) / (c - b);
  return 0.0;
}

// Trapezoidal membership function with shoulder support: [a, b, c, d]
export function trapezoidal(x, a, b, c, d) {
  if (x <= a) return a === b ? 1.0 : 0.0;
  if (x > a && x < b) return (x - a) / (b - a);
  if (x >= b && x <= c) return 1.0;
  if (x > c && x < d) return (d - x) / (d - c);
  if (x >= d) return c === d || d === Infinity ? 1.0 : 0.0;
  return 0.0;
}

// Fuzzifies correctness boolean into Benar/Salah degrees
export function fuzzifyCorrectness(isCorrect) {
  let boolVal = false;
  if (typeof isCorrect === 'boolean') {
    boolVal = isCorrect;
  } else if (typeof isCorrect === 'number') {
    boolVal = isCorrect === 1;
  } else if (typeof isCorrect === 'string') {
    const trimmed = isCorrect.trim().toLowerCase();
    boolVal = trimmed === 'true' || trimmed === '1' || trimmed === 'benar';
  }

  return {
    [CORRECTNESS_SETS.BENAR]: boolVal ? 1.0 : 0.0,
    [CORRECTNESS_SETS.SALAH]: boolVal ? 0.0 : 1.0,
  };
}

// Adaptive response time fuzzification relative to targetTime
export function fuzzifyResponseTime(responseTimeSeconds, targetTime = 60) {
  const safeTargetTime = Number(targetTime) > 0 ? Number(targetTime) : 60;
  const rawTime = Number(responseTimeSeconds);
  const t = Number.isFinite(rawTime) ? Math.max(0, rawTime) : 0;

  const cepatParams = [0, 0, 0.3 * safeTargetTime, 0.5 * safeTargetTime];
  const sedangParams = [0.35 * safeTargetTime, 0.65 * safeTargetTime, 0.95 * safeTargetTime];
  const lamaParams = [0.8 * safeTargetTime, 1.1 * safeTargetTime, Infinity, Infinity];

  const muCepat = trapezoidal(t, cepatParams[0], cepatParams[1], cepatParams[2], cepatParams[3]);
  const muSedang = triangular(t, sedangParams[0], sedangParams[1], sedangParams[2]);
  const muLama = trapezoidal(t, lamaParams[0], lamaParams[1], lamaParams[2], lamaParams[3]);

  return {
    [TIME_CATEGORIES.CEPAT]: Number(muCepat.toFixed(4)),
    [TIME_CATEGORIES.SEDANG]: Number(muSedang.toFixed(4)),
    [TIME_CATEGORIES.LAMA]: Number(muLama.toFixed(4)),
  };
}

// Singleton mapping for question difficulty
export function fuzzifyDifficulty(difficultyStr) {
  const normalized = typeof difficultyStr === 'string' ? difficultyStr.trim().toLowerCase() : '';

  let matchedDifficulty = DIFFICULTY_LEVELS.SEDANG;

  if (normalized === 'mudah' || normalized === 'easy') {
    matchedDifficulty = DIFFICULTY_LEVELS.MUDAH;
  } else if (normalized === 'sedang' || normalized === 'medium') {
    matchedDifficulty = DIFFICULTY_LEVELS.SEDANG;
  } else if (normalized === 'sulit' || normalized === 'hard' || normalized === 'difficult') {
    matchedDifficulty = DIFFICULTY_LEVELS.SULIT;
  }

  return {
    [DIFFICULTY_LEVELS.MUDAH]: matchedDifficulty === DIFFICULTY_LEVELS.MUDAH ? 1.0 : 0.0,
    [DIFFICULTY_LEVELS.SEDANG]: matchedDifficulty === DIFFICULTY_LEVELS.SEDANG ? 1.0 : 0.0,
    [DIFFICULTY_LEVELS.SULIT]: matchedDifficulty === DIFFICULTY_LEVELS.SULIT ? 1.0 : 0.0,
    normalizedDifficulty: matchedDifficulty,
  };
}

// Calculates membership degree for output category at point x
export function getOutputMembership(x, level) {
  const config = OUTPUT_MEMBERSHIP_CONFIG[level];
  if (!config) return 0.0;
  if (config.type === 'trapezoid') {
    return trapezoidal(x, config.params[0], config.params[1], config.params[2], config.params[3]);
  }
  return triangular(x, config.params[0], config.params[1], config.params[2]);
}
