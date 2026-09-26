import {
  evaluateItem,
  evaluateQuiz,
  fuzzifyCorrectness,
  fuzzifyResponseTime,
  fuzzifyDifficulty,
  defuzzifyCentroid,
  mapScoreToLevel,
  RULES,
  LINGUISTIC_LEVELS,
  DIFFICULTY_LEVELS,
  TIME_CATEGORIES,
} from './services/fuzzyService.js';

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failedTests++;
  } else {
    console.log(`✅ PASS: ${message}`);
    passedTests++;
  }
}

console.log('Running Fuzzy Autograding Service Tests...\n');

// 1. Correctness Fuzzification
{
  const resTrue = fuzzifyCorrectness(true);
  assert(resTrue.Benar === 1.0 && resTrue.Salah === 0.0, 'Boolean true -> Benar: 1, Salah: 0');

  const resFalse = fuzzifyCorrectness(false);
  assert(resFalse.Benar === 0.0 && resFalse.Salah === 1.0, 'Boolean false -> Benar: 0, Salah: 1');

  const resNum1 = fuzzifyCorrectness(1);
  assert(resNum1.Benar === 1.0 && resNum1.Salah === 0.0, 'Number 1 -> Benar: 1, Salah: 0');

  const resNum0 = fuzzifyCorrectness(0);
  assert(resNum0.Benar === 0.0 && resNum0.Salah === 1.0, 'Number 0 -> Benar: 0, Salah: 1');

  const resStrTrue = fuzzifyCorrectness('true');
  assert(resStrTrue.Benar === 1.0 && resStrTrue.Salah === 0.0, 'String "true" -> Benar: 1, Salah: 0');

  const resStrBenar = fuzzifyCorrectness('benar');
  assert(resStrBenar.Benar === 1.0 && resStrBenar.Salah === 0.0, 'String "benar" -> Benar: 1, Salah: 0');
}

// 2. Response Time Fuzzification (target: 60s)
{
  const t5 = fuzzifyResponseTime(5, 60);
  assert(t5.Cepat === 1.0 && t5.Sedang === 0.0 && t5.Lama === 0.0, '5s (<=18s) -> Cepat: 1.0');

  const t18 = fuzzifyResponseTime(18, 60);
  assert(t18.Cepat === 1.0, '18s (0.3*60) -> Cepat: 1.0');

  const t39 = fuzzifyResponseTime(39, 60);
  assert(t39.Sedang === 1.0 && t39.Cepat === 0.0 && t39.Lama === 0.0, '39s (0.65*60) -> Sedang: 1.0');

  const t75 = fuzzifyResponseTime(75, 60);
  assert(t75.Lama === 1.0 && t75.Cepat === 0.0 && t75.Sedang === 0.0, '75s (>=66s) -> Lama: 1.0');

  const t0 = fuzzifyResponseTime(0, 60);
  assert(t0.Cepat === 1.0, '0s -> Cepat: 1.0');

  const tNeg = fuzzifyResponseTime(-10, 60);
  assert(tNeg.Cepat === 1.0, 'Negative time clamped to 0 -> Cepat: 1.0');

  const tInf = fuzzifyResponseTime(9999, 60);
  assert(tInf.Lama === 1.0, 'Very large time -> Lama: 1.0');
}

// 3. Difficulty Fuzzification
{
  const dMudah = fuzzifyDifficulty('Mudah');
  assert(dMudah.Mudah === 1.0 && dMudah.Sedang === 0.0 && dMudah.Sulit === 0.0, 'Difficulty "Mudah" mapped');

  const dSedang = fuzzifyDifficulty('sedang');
  assert(dSedang.Sedang === 1.0 && dSedang.Mudah === 0.0, 'Difficulty "sedang" mapped');

  const dSulit = fuzzifyDifficulty('SULIT');
  assert(dSulit.Sulit === 1.0 && dSulit.Mudah === 0.0, 'Difficulty "SULIT" (uppercase) mapped');

  const dUnknown = fuzzifyDifficulty('xyz');
  assert(dUnknown.Sedang === 1.0, 'Unknown difficulty gracefully defaults to "Sedang"');
}

// 4. Exact 18 Mamdani Rules
{
  assert(RULES.length === 18, 'Rule base contains exactly 18 rules');

  const testCases = [
    { rule: 'R1', isCorrect: true, time: 10, diff: 'Mudah', expectedLevel: LINGUISTIC_LEVELS.TINGGI },
    { rule: 'R2', isCorrect: true, time: 10, diff: 'Sedang', expectedLevel: LINGUISTIC_LEVELS.TINGGI },
    { rule: 'R3', isCorrect: true, time: 10, diff: 'Sulit', expectedLevel: LINGUISTIC_LEVELS.TINGGI },
    { rule: 'R4', isCorrect: true, time: 39, diff: 'Mudah', expectedLevel: LINGUISTIC_LEVELS.SEDANG },
    { rule: 'R5', isCorrect: true, time: 39, diff: 'Sedang', expectedLevel: LINGUISTIC_LEVELS.TINGGI },
    { rule: 'R6', isCorrect: true, time: 39, diff: 'Sulit', expectedLevel: LINGUISTIC_LEVELS.TINGGI },
    { rule: 'R7', isCorrect: true, time: 75, diff: 'Mudah', expectedLevel: LINGUISTIC_LEVELS.RENDAH },
    { rule: 'R8', isCorrect: true, time: 75, diff: 'Sedang', expectedLevel: LINGUISTIC_LEVELS.SEDANG },
    { rule: 'R9', isCorrect: true, time: 75, diff: 'Sulit', expectedLevel: LINGUISTIC_LEVELS.TINGGI },
    { rule: 'R10', isCorrect: false, time: 10, diff: 'Mudah', expectedLevel: LINGUISTIC_LEVELS.SANGAT_RENDAH },
    { rule: 'R11', isCorrect: false, time: 10, diff: 'Sedang', expectedLevel: LINGUISTIC_LEVELS.SANGAT_RENDAH },
    { rule: 'R12', isCorrect: false, time: 10, diff: 'Sulit', expectedLevel: LINGUISTIC_LEVELS.SANGAT_RENDAH },
    { rule: 'R13', isCorrect: false, time: 39, diff: 'Mudah', expectedLevel: LINGUISTIC_LEVELS.SANGAT_RENDAH },
    { rule: 'R14', isCorrect: false, time: 39, diff: 'Sedang', expectedLevel: LINGUISTIC_LEVELS.RENDAH },
    { rule: 'R15', isCorrect: false, time: 39, diff: 'Sulit', expectedLevel: LINGUISTIC_LEVELS.RENDAH },
    { rule: 'R16', isCorrect: false, time: 75, diff: 'Mudah', expectedLevel: LINGUISTIC_LEVELS.SANGAT_RENDAH },
    { rule: 'R17', isCorrect: false, time: 75, diff: 'Sedang', expectedLevel: LINGUISTIC_LEVELS.RENDAH },
    { rule: 'R18', isCorrect: false, time: 75, diff: 'Sulit', expectedLevel: LINGUISTIC_LEVELS.RENDAH },
  ];

  for (const tc of testCases) {
    const res = evaluateItem({
      isCorrect: tc.isCorrect,
      responseTime: tc.time,
      difficulty: tc.diff,
      targetTime: 60,
    });
    const firingWeightForExpected = res.firingWeights[tc.expectedLevel];
    assert(
      firingWeightForExpected === 1.0 && res.linguisticLevel === tc.expectedLevel,
      `Rule ${tc.rule} (${tc.isCorrect ? 'Benar' : 'Salah'}, ${tc.diff}, ${tc.time}s) -> Fired 1.0 with Level: ${res.linguisticLevel} (Score: ${res.crispScore})`
    );
  }
}

// 5. Score to Linguistic Level Mapping
{
  assert(mapScoreToLevel(15) === LINGUISTIC_LEVELS.SANGAT_RENDAH, 'Score 15 -> Sangat Rendah');
  assert(mapScoreToLevel(34.9) === LINGUISTIC_LEVELS.SANGAT_RENDAH, 'Score 34.9 -> Sangat Rendah');
  assert(mapScoreToLevel(35.0) === LINGUISTIC_LEVELS.RENDAH, 'Score 35.0 -> Rendah');
  assert(mapScoreToLevel(54.9) === LINGUISTIC_LEVELS.RENDAH, 'Score 54.9 -> Rendah');
  assert(mapScoreToLevel(55.0) === LINGUISTIC_LEVELS.SEDANG, 'Score 55.0 -> Sedang');
  assert(mapScoreToLevel(74.9) === LINGUISTIC_LEVELS.SEDANG, 'Score 74.9 -> Sedang');
  assert(mapScoreToLevel(75.0) === LINGUISTIC_LEVELS.TINGGI, 'Score 75.0 -> Tinggi');
  assert(mapScoreToLevel(95) === LINGUISTIC_LEVELS.TINGGI, 'Score 95.0 -> Tinggi');
}

// 6. Determinism Test
{
  const itemParams = { isCorrect: true, responseTime: 25, difficulty: 'Sedang', targetTime: 60 };
  const res1 = evaluateItem(itemParams);
  const res2 = evaluateItem(itemParams);
  assert(
    res1.crispScore === res2.crispScore && res1.linguisticLevel === res2.linguisticLevel,
    `Deterministic execution verified: Score 1 = ${res1.crispScore}, Score 2 = ${res2.crispScore}`
  );
}

// 7. Full Quiz Evaluation
{
  const answers = [
    { isCorrect: true, responseTime: 12, difficulty: 'Mudah' },
    { isCorrect: true, responseTime: 35, difficulty: 'Sedang' },
    { isCorrect: true, responseTime: 70, difficulty: 'Sulit' },
    { isCorrect: false, responseTime: 40, difficulty: 'Sedang' },
    { isCorrect: false, responseTime: 15, difficulty: 'Mudah' },
  ];

  const quizResult = evaluateQuiz(answers, 180);

  assert(quizResult.totalSoal === 5, 'Total soal = 5');
  assert(quizResult.totalBenar === 3, 'Total benar = 3');
  assert(quizResult.totalSalah === 2, 'Total salah = 2');
  assert(quizResult.akurasi === 60.0, 'Akurasi = 60.0%');
  assert(quizResult.skorFuzzy > 55 && quizResult.skorFuzzy < 75, `Skor kuis valid (${quizResult.skorFuzzy})`);
  assert(quizResult.kategoriFuzzy === LINGUISTIC_LEVELS.SEDANG, `Kategori kuis: ${quizResult.kategoriFuzzy}`);
  assert(quizResult.detailItems.length === 5, 'Detail items length = 5');
  assert(typeof quizResult.rekomendasi === 'string' && quizResult.rekomendasi.length > 20, 'Rekomendasi diagnostik terbuat');
  assert(quizResult.distribusiKesulitan.Mudah.total === 2, 'Distribusi kesulitan Mudah count = 2');
}

// 8. Quiz Evaluation Edge Cases
{
  const emptyRes = evaluateQuiz([]);
  assert(emptyRes.totalSoal === 0 && emptyRes.skorFuzzy === 0, 'Empty answers array handled gracefully');

  const nullRes = evaluateQuiz(null);
  assert(nullRes.totalSoal === 0, 'Null answers parameter handled gracefully');
}

console.log(`\nSummary: ${passedTests} passed, ${failedTests} failed`);

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
