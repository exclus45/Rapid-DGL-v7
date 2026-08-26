import assert from "node:assert/strict";
import fs from "node:fs";

globalThis.window = {};
await import("../optimizer.js");

const {
  PVC_OPTIMIZATION_MODE,
  applyPvcOptimizationLayoutMode,
  calculateProfileOptimizationStats
} = window;

const stock = 6500;
const kerf = 5;
const rules = { scrapMax: 70, minUsefulLeftover: 650 };

function part(length, meta = {}) {
  return { length, size: length + kerf, meta };
}

function bin(parts) {
  const used = parts.reduce((sum, item) => sum + item.size, 0);
  return { parts, used, leftover: stock - used };
}

function assertBalanced(stats) {
  assert.equal(
    stats.totalMaterialMm,
    stats.partsLengthMm + stats.kerfMm + stats.usefulLeftoverMm + stats.wasteMm
  );
  assert.equal(stats.balanceDifferenceMm, 0);
}

{
  const result = {
    bins: [
      bin([part(1000), part(4800)]),
      bin([part(6445)])
    ],
    unfit: []
  };
  const stats = calculateProfileOptimizationStats(result, stock, kerf, rules, "single");
  assert.equal(stats.physicalStockCount, 2);
  assert.equal(stats.totalMaterialMm, 13000);
  assert.equal(stats.partsLengthMm, 12245);
  assert.equal(stats.kerfMm, 15);
  assert.equal(stats.usefulLeftoverMm, 690);
  assert.equal(stats.wasteMm, 50);
  assert.equal(stats.undesirableLeftoverMm, 0);
  assertBalanced(stats);
  console.log("OK single: чистая длина, kerf, полезный остаток и короткий отход считаются отдельно");
}

{
  const logicalPairBins = Array.from({ length: 10 }, (_, index) => bin([
    part(1000, [
      { orderId: "1", productId: String(index), side: "A" },
      { orderId: "1", productId: String(index), side: "B" }
    ])
  ]));
  const stats = calculateProfileOptimizationStats(
    { bins: logicalPairBins, unfit: [] },
    stock,
    kerf,
    rules,
    "double"
  );
  assert.equal(stats.physicalStockCount, 20);
  assert.equal(stats.totalMaterialMm, 130000);
  assert.equal(stats.partsLengthMm, 20000);
  assert.equal(stats.kerfMm, 100);
  assert.equal(stats.usefulLeftoverMm, 109900);
  assert.equal(stats.wasteMm, 0);
  assertBalanced(stats);
  console.log("OK double: 10 логических пар считаются как 20 физических хлыстов и kerf удваивается физически");
}

{
  const result = {
    bins: [bin([part(5995)])],
    unfit: []
  };
  const stats = calculateProfileOptimizationStats(result, stock, kerf, rules, "single");
  assert.equal(result.bins[0].leftover, 500);
  assert.equal(stats.usefulLeftoverMm, 0);
  assert.equal(stats.wasteMm, 500);
  assert.equal(stats.undesirableLeftoverMm, 500);
  assert.equal(stats.kerfMm, 5);
  assertBalanced(stats);
  console.log("OK остаток между scrapMax и minUsefulLeftover относится к waste без повторного включения kerf");
}

{
  const meta = (orderId, id) => ({ orderId, productId: "1", id });
  const baseline = {
    bins: [
      bin([part(3000, meta("A", "a1")), part(3000, meta("C", "c1"))]),
      bin([part(2000, meta("B", "b1")), part(1000, meta("C", "c2"))]),
      bin([part(1000, meta("A", "a2")), part(2000, meta("B", "b2"))])
    ],
    unfit: []
  };
  const maximum = applyPvcOptimizationLayoutMode(
    baseline,
    stock,
    "single",
    PVC_OPTIMIZATION_MODE.MAX_SAVINGS,
    { rules }
  );
  const soft = applyPvcOptimizationLayoutMode(
    baseline,
    stock,
    "single",
    PVC_OPTIMIZATION_MODE.SOFT_BY_PRODUCT,
    { rules }
  );
  const hard = applyPvcOptimizationLayoutMode(
    baseline,
    stock,
    "single",
    PVC_OPTIMIZATION_MODE.HARD_BY_PRODUCT,
    { rules }
  );
  const maximumStats = calculateProfileOptimizationStats(maximum.result, stock, kerf, rules, "single");
  const softStats = calculateProfileOptimizationStats(soft.result, stock, kerf, rules, "single");
  const hardStats = calculateProfileOptimizationStats(hard.result, stock, kerf, rules, "single");
  assert.equal(maximumStats.wasteMm, 490);
  assert.equal(softStats.wasteMm, 490);
  assert.equal(hardStats.wasteMm, 0);
  assert.equal(hardStats.usefulLeftoverMm, 7470);
  [maximumStats, softStats, hardStats].forEach(assertBalanced);
  console.log("OK статистика каждого режима строится из его фактической раскладки, а не из baseline");
}

{
  const appSource = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const stylesSource = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  assert(appSource.includes("formatProfileOptimizationStats"));
  assert(appSource.includes("profileOptimizationStats"));
  assert(appSource.includes("window.calculateProfileOptimizationStats"));
  assert(stylesSource.includes(".opt-material-stats"));
  console.log("OK компактная статистика встроена в экранную и печатную DOM-группу профиля");
}
