import assert from "node:assert/strict";
import fs from "node:fs";

globalThis.window = {};
await import("../optimizer.js");

const {
  PVC_OPTIMIZATION_MODE,
  applyPvcOptimizationLayoutMode,
  comparePvcOptimizationModes,
  evaluateProductGroupedCandidate,
  groupingScoreForBins,
  optimizeHardByProduct,
  optimizationMetrics,
  productClusteringMetrics,
  reorderOptimizationByProduct
} = window;

const stock = 6500;

function meta(orderId, productId, id) {
  return { orderId, productId, id };
}

function bin(id, metas, used = 1000) {
  return {
    id,
    used,
    leftover: stock - used,
    parts: metas.map((itemMeta, index) => ({ length: 100 + index, meta: itemMeta }))
  };
}

function binComposition(result) {
  return result.bins
    .map((item) => `${item.id}:${item.parts.map((part) => part.meta.id).join(",")}`)
    .sort();
}

{
  const result = { bins: [bin("a", [meta("1", "1", "a")])], unfit: [] };
  const applied = applyPvcOptimizationLayoutMode(result, stock, "single");
  assert.equal(applied.diagnostics.mode, PVC_OPTIMIZATION_MODE.MAX_SAVINGS);
  assert.equal(applied.result, result);
  assert.equal(applied.diagnostics.strategy, "baseline_best_fit");
  console.log("OK режим максимальной экономии является default и возвращает исходный раскрой без изменений");
}

{
  const result = {
    bins: [
      bin("a1", [meta("3475", "1", "a1")]),
      bin("b", [meta("4972", "1", "b")]),
      bin("a2", [meta("3475", "1", "a2")])
    ],
    unfit: [{ length: 7000, meta: meta("x", "x", "manual") }]
  };
  const baselineComposition = binComposition(result);
  const before = groupingScoreForBins(result.bins, "single");
  const grouped = reorderOptimizationByProduct(result, stock, "single");
  const after = groupingScoreForBins(grouped.result.bins, "single");

  assert.equal(before, 1);
  assert.equal(after, 0);
  assert.deepEqual(grouped.result.bins.map((item) => item.id), ["a1", "a2", "b"]);
  assert.deepEqual(binComposition(grouped.result), baselineComposition);
  assert.equal(grouped.result.bins.length, result.bins.length);
  assert.equal(grouped.result.unfit, result.unfit);
  assert.equal(grouped.diagnostics.baseline.totalLeftover, grouped.diagnostics.grouped.totalLeftover);
  assert.equal(grouped.diagnostics.materialDegradation, 0);
  console.log("OK режим по изделиям сближает хлысты одного изделия только перестановкой готовых хлыстов");
}

{
  const result = {
    bins: [
      bin("p1-a", [meta("5000", "1", "p1-a")]),
      bin("p2", [meta("5000", "2", "p2")]),
      bin("p1-b", [meta("5000", "1", "p1-b")])
    ],
    unfit: []
  };
  const grouped = reorderOptimizationByProduct(result, stock, "single");
  assert.deepEqual(grouped.result.bins.map((item) => item.id), ["p1-a", "p1-b", "p2"]);
  console.log("OK productId входит в ключ: разные изделия не объединяются в один идентификатор");
}

{
  const baseline = { stockCount: 2, utilization: 0.8 };
  const overLimit = { stockCount: 2, utilization: 0.75 };
  const moreStocks = { stockCount: 3, utilization: 0.9 };
  assert.equal(evaluateProductGroupedCandidate(baseline, overLimit).accepted, false);
  assert.equal(evaluateProductGroupedCandidate(baseline, overLimit).reason, "material_degradation");
  assert.equal(evaluateProductGroupedCandidate(baseline, moreStocks).accepted, false);
  assert.equal(evaluateProductGroupedCandidate(baseline, moreStocks).reason, "stock_count_increased");
  console.log("OK кандидат с деградацией более 3% или большим числом хлыстов отклоняется");
}

{
  const pairBin = (id, first, second) => ({
    id,
    used: 1000,
    leftover: 5500,
    parts: [{ length: 995, meta: [first, second] }]
  });
  const result = {
    bins: [
      pairBin("a1", meta("1", "1", "a1-left"), meta("1", "1", "a1-right")),
      pairBin("b", meta("2", "1", "b-left"), meta("2", "1", "b-right")),
      pairBin("a2", meta("1", "1", "a2-left"), meta("1", "1", "a2-right"))
    ],
    unfit: []
  };
  const originalPairs = new Map(result.bins.map((item) => [item.id, item.parts[0].meta]));
  const grouped = reorderOptimizationByProduct(result, stock, "double");
  assert.equal(grouped.result.bins.length, 3);
  grouped.result.bins.forEach((item) => assert.equal(item.parts[0].meta, originalPairs.get(item.id)));
  assert.equal(optimizationMetrics(grouped.result, stock, "double").stockCount, 6);
  console.log("OK double-карта переносится атомарно и обе физические стороны пары сохраняются");
}

{
  const result = {
    bins: [
      bin("a1", [meta("1", "1", "a1")]),
      bin("b", [meta("2", "1", "b")]),
      bin("a2", [meta("1", "1", "a2")])
    ],
    unfit: []
  };
  const first = reorderOptimizationByProduct(result, stock, "single");
  const second = reorderOptimizationByProduct(result, stock, "single");
  assert.deepEqual(first.result.bins.map((item) => item.id), second.result.bins.map((item) => item.id));
  console.log("OK результат режима по изделиям детерминирован");
}

{
  const result = {
    bins: [
      bin("a1", [meta("1", "1", "a1")]),
      bin("b", [meta("2", "1", "b")]),
      bin("a2", [meta("1", "1", "a2")])
    ],
    unfit: []
  };
  const oldSoft = reorderOptimizationByProduct(result, stock, "single");
  const renamedSoft = applyPvcOptimizationLayoutMode(
    result,
    stock,
    "single",
    PVC_OPTIMIZATION_MODE.SOFT_BY_PRODUCT
  );
  const legacySoft = applyPvcOptimizationLayoutMode(result, stock, "single", "by_product");
  assert.deepEqual(renamedSoft.result.bins.map((item) => item.id), oldSoft.result.bins.map((item) => item.id));
  assert.deepEqual(legacySoft.result.bins.map((item) => item.id), oldSoft.result.bins.map((item) => item.id));
  console.log("OK переименованный мягкий режим и legacy-код сохраняют прежний результат");
}

{
  const result = {
    bins: [
      bin("a1", [meta("4993", "1", "a1")]),
      bin("x1", [meta("7000", "1", "x1")]),
      bin("x2", [meta("7001", "1", "x2")]),
      bin("x3", [meta("7002", "1", "x3")]),
      bin("a2", [meta("4993", "1", "a2")])
    ],
    unfit: [{ length: 7000, meta: meta("manual", "1", "manual") }]
  };
  const before = productClusteringMetrics(result.bins, "single");
  const hard = optimizeHardByProduct(result, stock, "single");
  const after = productClusteringMetrics(hard.result.bins, "single");
  assert.equal(hard.result.bins.length, result.bins.length);
  assert(after.totalClusterCount < before.totalClusterCount);
  assert(after.totalGaps < before.totalGaps);
  assert.equal(hard.result.unfit, result.unfit);
  console.log("OK жёсткий reorder уменьшает clusterCount и большие gaps без роста хлыстов и потери manual");
}

{
  const equalPart = (orderId, id) => ({ length: 995, size: 1000, meta: meta(orderId, "1", id) });
  const mixedBin = (id, first, second) => ({
    id,
    used: 2000,
    leftover: 4500,
    parts: [first, second]
  });
  const result = {
    bins: [
      mixedBin("ac", equalPart("A", "a1"), equalPart("C", "c1")),
      mixedBin("bc", equalPart("B", "b1"), equalPart("C", "c2")),
      mixedBin("ab", equalPart("A", "a2"), equalPart("B", "b2"))
    ],
    unfit: []
  };
  const originalIds = result.bins.flatMap((item) => item.parts.map((part) => part.meta.id)).sort();
  const before = productClusteringMetrics(result.bins, "single");
  const hard = optimizeHardByProduct(result, stock, "single", {
    rules: { scrapMax: 70, minUsefulLeftover: 650 }
  });
  const after = productClusteringMetrics(hard.result.bins, "single");
  const finalIds = hard.result.bins.flatMap((item) => item.parts.map((part) => part.meta.id)).sort();
  assert(after.totalClusterCount < before.totalClusterCount);
  assert(hard.diagnostics.compositionOperations.length > 0);
  assert.deepEqual(finalIds, originalIds);
  assert(hard.result.bins.every((item) => item.used <= stock));
  console.log("OK этап B меняет состав валидными атомарными swap/move и сохраняет каждую физическую деталь ровно один раз");
}

{
  const pairedPart = (id, orderId) => ({
    length: 995,
    size: 1000,
    meta: [meta(orderId, "1", `${id}-left`), meta(orderId, "1", `${id}-right`)]
  });
  const result = {
    bins: [
      { id: "a1", used: 1000, leftover: 5500, parts: [pairedPart("a1", "A")] },
      { id: "b", used: 1000, leftover: 5500, parts: [pairedPart("b", "B")] },
      { id: "a2", used: 1000, leftover: 5500, parts: [pairedPart("a2", "A")] }
    ],
    unfit: []
  };
  const pairRefs = result.bins.flatMap((item) => item.parts.map((part) => part.meta));
  const hard = optimizeHardByProduct(result, stock, "double");
  const finalPairRefs = hard.result.bins.flatMap((item) => item.parts.map((part) => part.meta));
  assert.equal(hard.result.bins.length, result.bins.length);
  pairRefs.forEach((pair) => assert(finalPairRefs.includes(pair)));
  assert(finalPairRefs.every((pair) => Array.isArray(pair) && pair.length === 2));
  console.log("OK жёсткий double перемещает связанную пару только единым атомом");
}

{
  const groupOne = { bins: [bin("p1", [meta("1", "1", "p1")])], unfit: [] };
  const groupTwo = { bins: [bin("p2", [meta("2", "1", "p2")])], unfit: [] };
  const hardOne = optimizeHardByProduct(groupOne, stock, "single");
  const hardTwo = optimizeHardByProduct(groupTwo, stock, "single");
  assert.deepEqual(hardOne.result.bins.flatMap((item) => item.parts.map((part) => part.meta.id)), ["p1"]);
  assert.deepEqual(hardTwo.result.bins.flatMap((item) => item.parts.map((part) => part.meta.id)), ["p2"]);
  console.log("OK разные профильные группы обрабатываются независимо и не смешиваются");
}

{
  const result = {
    bins: [
      bin("a1", [meta("1", "1", "a1")]),
      bin("b", [meta("2", "1", "b")]),
      bin("a2", [meta("1", "1", "a2")])
    ],
    unfit: []
  };
  const first = optimizeHardByProduct(result, stock, "single");
  const second = optimizeHardByProduct(result, stock, "single");
  assert.deepEqual(first.result.bins.map((item) => item.id), second.result.bins.map((item) => item.id));
  const comparison = comparePvcOptimizationModes(result, stock, "single");
  assert.equal(comparison.modes.maxSavings.stockCount, comparison.modes.softByProduct.stockCount);
  assert.equal(comparison.modes.maxSavings.stockCount, comparison.modes.hardByProduct.stockCount);
  assert(comparison.worstProducts.length > 0);
  console.log("OK жёсткий режим детерминирован, а диагностика сравнивает все три режима");
}

{
  const appSource = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  assert(appSource.includes("Режим оптимизации"));
  assert(appSource.includes("Максимальная экономия"));
  assert(appSource.includes("Мягкий по изделиям"));
  assert(appSource.includes("Жёсткий по изделиям"));
  assert(appSource.includes("optimizeBtn?.click()"));
  assert(appSource.includes("optimizeCache.groupingDiagnostics"));
  console.log("OK UI содержит глобальный режим, пересчёт при смене и диагностические метрики");
}
