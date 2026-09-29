import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync("production-order.js", "utf8"), { filename: "production-order.js" });
vm.runInThisContext(fs.readFileSync("label-data.js", "utf8"), { filename: "label-data.js" });
vm.runInThisContext(fs.readFileSync("reinforcement.js", "utf8"), { filename: "reinforcement.js" });

const api = globalThis.ReinforcementOptimization;
const {
  OPTIMIZATION_MODE,
  DEFAULT_OPTIMIZATION_MODE,
  applyHardReinforcementLayout,
  calculateReinforcementOptimizationStats,
  optimizeReinforcementGroup,
  reinforcementClusteringMetrics
} = api;

function item(orderId, productId, length, id, partKind = "frame") {
  return {
    reinforcementArticle: "KBE TEST",
    reinforcementSizeMm: length,
    orderId,
    productId,
    partKind,
    partKindLabel: partKind.toUpperCase(),
    sourcePartId: id,
    sourceUnitNo: 1
  };
}

function group(items, key = "kbe-test") {
  return { key, reinforcementArticle: key.toUpperCase(), items, quantity: items.length };
}

function allPhysicalIds(result) {
  return result.physicalBins.flatMap((bin) => bin.items.map((entry) => entry.sourcePartId)).sort();
}

function assertBalance(stats) {
  assert.equal(stats.totalMaterialMm, stats.partsLengthMm + stats.kerfMm + stats.leftoverMm);
  assert.equal(stats.balanceDifferenceMm, 0);
}

{
  assert.equal(DEFAULT_OPTIMIZATION_MODE, "max_savings");
  const source = group([item("1", "1", 1000, "a"), item("1", "1", 1000, "b")]);
  const implicit = optimizeReinforcementGroup(source, "single");
  const explicit = optimizeReinforcementGroup(source, "single", OPTIMIZATION_MODE.MAX_SAVINGS);
  assert.equal(implicit.optimizationMode, "max_savings");
  assert.deepEqual(implicit.bins, explicit.bins);
  console.log("OK армирование по умолчанию использует неизменённый max_savings baseline");
}

{
  const source = group([
    item("4993", "1", 5990, "a1"),
    item("7000", "1", 5990, "b"),
    item("4993", "1", 5990, "a2")
  ]);
  const maximum = optimizeReinforcementGroup(source, "single", OPTIMIZATION_MODE.MAX_SAVINGS);
  const hard = optimizeReinforcementGroup(source, "single", OPTIMIZATION_MODE.HARD_BY_PRODUCT);
  const before = reinforcementClusteringMetrics(maximum.bins, "single");
  const after = reinforcementClusteringMetrics(hard.bins, "single");
  assert.equal(hard.physicalStockCount, maximum.physicalStockCount);
  assert(after.totalClusterCount < before.totalClusterCount);
  assert(after.totalGaps < before.totalGaps);
  assert.deepEqual(allPhysicalIds(hard), allPhysicalIds(maximum));
  console.log("OK hard_by_product уменьшает clusterCount/gaps без роста физических хлыстов");
}

{
  const source = group([
    item("4993", "1", 5990, "p1-a"),
    item("4993", "2", 5990, "p2"),
    item("4993", "1", 5990, "p1-b")
  ]);
  const hard = optimizeReinforcementGroup(source, "single", OPTIMIZATION_MODE.HARD_BY_PRODUCT);
  const metrics = hard.groupingDiagnostics.grouped;
  assert(metrics.products["4993||1"]);
  assert(metrics.products["4993||2"]);
  assert.deepEqual(metrics.products["4993||1"].stockIndexes, [1, 2]);
  console.log("OK ключ комплектности использует orderId + productId");
}

{
  const source = group([
    item("A", "1", 2000, "a1", "sash"),
    item("A", "1", 2000, "a2", "sash"),
    item("B", "1", 2000, "b1", "frame"),
    item("B", "1", 2000, "b2", "frame"),
    item("C", "1", 2000, "manual", "mullion")
  ]);
  const maximum = optimizeReinforcementGroup(source, "double", OPTIMIZATION_MODE.MAX_SAVINGS);
  const hard = optimizeReinforcementGroup(source, "double", OPTIMIZATION_MODE.HARD_BY_PRODUCT);
  assert.equal(maximum.manualItems.length, 1);
  assert.equal(hard.manualItems.length, 1);
  assert.equal(hard.manualItems[0].sourcePartId, "manual");
  assert.deepEqual(allPhysicalIds(hard), allPhysicalIds(maximum));
  hard.bins.forEach((bin) => bin.cuts.forEach((cut) => {
    assert.equal(cut.items.length, 2);
    assert.equal(cut.items[0].reinforcementSizeMm, cut.items[1].reinforcementSizeMm);
  }));
  console.log("OK double-пары остаются атомарными, manualItems не возвращаются в автоматический раскрой");
}

{
  const pairedCut = (id, orderId) => ({
    kind: "double",
    sequence: 1,
    lengthMm: 1990,
    consumptionMm: 2000,
    items: [item(orderId, "1", 1990, `${id}-1`), item(orderId, "1", 1990, `${id}-2`)]
  });
  const bins = [
    { binNo: 1, stockLengthMm: 6000, cuts: [pairedCut("a1", "A")], usedMm: 2000, leftoverMm: 4000 },
    { binNo: 2, stockLengthMm: 6000, cuts: [pairedCut("b", "B")], usedMm: 2000, leftoverMm: 4000 },
    { binNo: 3, stockLengthMm: 6000, cuts: [pairedCut("a2", "A")], usedMm: 2000, leftoverMm: 4000 }
  ];
  const pairRefs = bins.flatMap((bin) => bin.cuts.map((cut) => cut.items));
  const hard = applyHardReinforcementLayout(bins, "double");
  const finalPairRefs = hard.bins.flatMap((bin) => bin.cuts.map((cut) => cut.items));
  pairRefs.forEach((pair) => assert(finalPairRefs.includes(pair)));
  console.log("OK reorder/move/swap переносит double-позицию только вместе с обеими физическими деталями");
}

{
  const single = optimizeReinforcementGroup(
    group([item("1", "1", 1245, "single")]),
    "single",
    OPTIMIZATION_MODE.MAX_SAVINGS
  );
  const singleStats = calculateReinforcementOptimizationStats(single);
  assert.equal(singleStats.physicalStockCount, 1);
  assert.equal(singleStats.partsLengthMm, 1245);
  assert.equal(singleStats.kerfMm, 10);
  assert.equal(singleStats.leftoverMm, 4745);
  assertBalance(singleStats);

  const double = optimizeReinforcementGroup(
    group([item("1", "1", 1245, "d1"), item("1", "1", 1245, "d2")]),
    "double",
    OPTIMIZATION_MODE.MAX_SAVINGS
  );
  const doubleStats = calculateReinforcementOptimizationStats(double);
  assert.equal(doubleStats.physicalStockCount, 2);
  assert.equal(doubleStats.partsLengthMm, 2490);
  assert.equal(doubleStats.kerfMm, 20);
  assert.equal(doubleStats.leftoverMm, 9490);
  assertBalance(doubleStats);
  console.log("OK статистика single/double разделяет чистую длину, kerf и общий остаток; баланс сходится");
}

{
  const source = group([
    item("1", "1", 5990, "a1"),
    item("2", "1", 5990, "b"),
    item("1", "1", 5990, "a2")
  ]);
  const first = optimizeReinforcementGroup(source, "single", OPTIMIZATION_MODE.HARD_BY_PRODUCT);
  const second = optimizeReinforcementGroup(source, "single", OPTIMIZATION_MODE.HARD_BY_PRODUCT);
  assert.deepEqual(first.bins, second.bins);
  assert.equal(first.stats.physicalStockCount, first.physicalBins.length);
  console.log("OK hard_by_product и его статистика детерминированы и относятся к фактической раскладке");
}

{
  const appSource = fs.readFileSync("app.js", "utf8");
  assert(appSource.includes("reinforcementOptimizationMode"));
  assert(appSource.includes("reinforcement-global-mode"));
  assert(appSource.includes("Жёсткий по изделиям"));
  assert(appSource.includes("formatReinforcementOptimizationStats(result.stats)"));
  console.log("OK общий dropdown и статистика присутствуют в экранном и печатном DOM армирования");
}
