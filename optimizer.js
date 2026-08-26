/**
 * Simple cutting optimizer (best-fit decreasing).
 * items: [{ lengthMm, qty }]
 * rules: { scrapMax, minUsefulLeftover } optional
 */
function optimizeCut(items, stock, kerf, rules) {
  const parts = [];
  const hasRules =
    rules &&
    Number.isFinite(Number(rules.scrapMax)) &&
    Number.isFinite(Number(rules.minUsefulLeftover));
  const scrapMax = hasRules ? Number(rules.scrapMax) : 0;
  const minUsefulLeftover = hasRules ? Number(rules.minUsefulLeftover) : 0;

  function isBadLeftover(leftover) {
    if (!hasRules) return false;
    return leftover > scrapMax && leftover < minUsefulLeftover;
  }

  for (const it of items || []) {
    const length = Number(it.lengthMm || it.length || 0);
    const qty = Math.floor(Number(it.qty || it.quantity || 0));
    const meta = it.meta;
    if (!Number.isFinite(length) || length <= 0) continue;
    if (!Number.isFinite(qty) || qty <= 0) continue;
    for (let i = 0; i < qty; i++) {
      parts.push({ length, size: length + kerf, meta });
    }
  }

  parts.sort((a, b) => b.size - a.size);

  const bins = [];
  const unfit = [];

  for (const part of parts) {
    if (part.size > stock) {
      unfit.push(part);
      continue;
    }

    let bestIdx = -1;
    let bestLeftover = Infinity;
    let bestIsBad = true;

    for (let i = 0; i < bins.length; i++) {
      const remain = stock - bins[i].used;
      if (part.size > remain) continue;

      const leftover = remain - part.size;
      const bad = isBadLeftover(leftover);

      if (bestIdx === -1) {
        bestIdx = i;
        bestLeftover = leftover;
        bestIsBad = bad;
        continue;
      }

      if (bestIsBad && !bad) {
        bestIdx = i;
        bestLeftover = leftover;
        bestIsBad = false;
        continue;
      }

      if (bestIsBad === bad && leftover < bestLeftover) {
        bestIdx = i;
        bestLeftover = leftover;
      }
    }

    if (bestIdx === -1) {
      bins.push({ used: part.size, parts: [part] });
      continue;
    }

    const newBinLeftover = stock - part.size;
    const newBinIsBad = isBadLeftover(newBinLeftover);
    if (hasRules && bestIsBad && !newBinIsBad) {
      bins.push({ used: part.size, parts: [part] });
      continue;
    }

    bins[bestIdx].used += part.size;
    bins[bestIdx].parts.push(part);
  }

  const binsWithLeft = bins.map((bin) => ({
    ...bin,
    leftover: stock - bin.used
  }));

  return { bins: binsWithLeft, unfit };
}

/**
 * Preserve successful full-stock bins, then try the remaining parts in manually
 * entered physical remnants before opening new full-stock bins.
 */
function optimizeCutWithRemnants(items, stock, kerf, rules, remnants, options = {}) {
  const baseResult = optimizeCut(items, stock, kerf, rules);
  const normalizeProfileKey = (value) => {
    const match = String(value || "").match(/[A-Za-z0-9.]+/);
    return String(match ? match[0] : value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  };
  const firstItem = (items || []).find((item) => item?.meta?.profileCode || item?.profileCode);
  const profileKey = normalizeProfileKey(firstItem?.meta?.profileCode || firstItem?.profileCode || "");
  const availableRemnants = (remnants || [])
    .map((remnant) => ({ ...remnant, lengthMm: Number(remnant.lengthMm || 0) }))
    .filter((remnant) => remnant.id && Number.isFinite(remnant.lengthMm) && remnant.lengthMm > 0)
    .filter((remnant) => !profileKey || normalizeProfileKey(remnant.profileCode) === profileKey)
    .sort((a, b) => a.lengthMm - b.lengthMm);

  if (!availableRemnants.length) {
    return {
      automaticResult: baseResult,
      fixedBins: baseResult.bins,
      remnantBins: [],
      unusedRemnants: [],
      baseResult
    };
  }

  const scrapMax = Number.isFinite(Number(rules?.scrapMax)) ? Number(rules.scrapMax) : 0;
  const minUsefulLeftover = Number.isFinite(Number(rules?.minUsefulLeftover))
    ? Number(rules.minUsefulLeftover)
    : 0;
  const isAcceptableLeftover = (leftover) =>
    leftover <= scrapMax || minUsefulLeftover <= 0 || leftover >= minUsefulLeftover;

  const preserveSuccessfulBins = options.preserveSuccessfulBins !== false;
  const fixedBins = preserveSuccessfulBins
    ? baseResult.bins.filter((bin) => bin.leftover <= scrapMax)
    : [];
  let remainingParts = baseResult.bins
    .filter((bin) => !preserveSuccessfulBins || bin.leftover > scrapMax)
    .flatMap((bin) => bin.parts)
    .concat(baseResult.unfit)
    .sort((a, b) => b.size - a.size);
  const remnantBins = [];
  const unusedRemnants = [];

  availableRemnants.forEach((remnant) => {
    let used = 0;
    const selected = [];
    let bestSelection = [];
    let bestUsed = 0;

    remainingParts.forEach((part) => {
      if (used + part.size > remnant.lengthMm) return;
      selected.push(part);
      used += part.size;
      const leftover = remnant.lengthMm - used;
      if (isAcceptableLeftover(leftover) && used > bestUsed) {
        bestSelection = [...selected];
        bestUsed = used;
      }
    });

    if (!bestSelection.length) {
      unusedRemnants.push(remnant);
      return;
    }

    const selectedSet = new Set(bestSelection);
    remainingParts = remainingParts.filter((part) => !selectedSet.has(part));
    const leftover = remnant.lengthMm - bestUsed;
    remnantBins.push({
      remnant,
      used: bestUsed,
      kerfTotal: bestSelection.length * kerf,
      parts: bestSelection,
      leftover,
      status: leftover <= scrapMax ? "used" : "partial"
    });
  });

  const remainingItems = remainingParts.map((part) => ({
    lengthMm: part.length,
    qty: 1,
    meta: part.meta
  }));
  const regularResult = optimizeCut(remainingItems, stock, kerf, rules);

  return {
    automaticResult: {
      bins: [...fixedBins, ...regularResult.bins],
      unfit: regularResult.unfit
    },
    fixedBins,
    remnantBins,
    unusedRemnants,
    regularResult,
    baseResult
  };
}

const PVC_OPTIMIZATION_MODE = Object.freeze({
  MAX_SAVINGS: "max_savings",
  SOFT_BY_PRODUCT: "soft_by_product",
  HARD_BY_PRODUCT: "hard_by_product",
  BY_PRODUCT: "soft_by_product",
  LEGACY_BY_PRODUCT: "by_product"
});
const MAX_GROUPING_MATERIAL_DEGRADATION = 0.03;

function productKeyFromMeta(meta) {
  const orderId = String(meta?.orderId || "").trim();
  const productId = String(meta?.productId || "").trim();
  return orderId && productId ? `${orderId}||${productId}` : "";
}

function physicalProductRowsForBin(bin, cutMode) {
  const rowCount = cutMode === "double" ? 2 : 1;
  const rows = Array.from({ length: rowCount }, () => new Set());
  (bin?.parts || []).forEach((part) => {
    if (cutMode === "double") {
      const pair = Array.isArray(part.meta) ? part.meta : [part.meta, part.meta];
      rows[0].add(productKeyFromMeta(pair[0]));
      rows[1].add(productKeyFromMeta(pair[1] || pair[0]));
      return;
    }
    rows[0].add(productKeyFromMeta(Array.isArray(part.meta) ? part.meta[0] : part.meta));
  });
  rows.forEach((row) => row.delete(""));
  return rows;
}

function groupingScoreForBins(bins, cutMode = "single") {
  const positionsByProduct = new Map();
  let physicalIndex = 0;
  (bins || []).forEach((bin) => {
    physicalProductRowsForBin(bin, cutMode).forEach((products) => {
      products.forEach((productKey) => {
        if (!positionsByProduct.has(productKey)) positionsByProduct.set(productKey, []);
        positionsByProduct.get(productKey).push(physicalIndex);
      });
      physicalIndex += 1;
    });
  });

  let score = 0;
  positionsByProduct.forEach((positions) => {
    if (positions.length < 2) return;
    score += positions[positions.length - 1] - positions[0] + 1 - positions.length;
  });
  return score;
}

function productClusteringMetrics(bins, cutMode = "single") {
  const positionsByProduct = new Map();
  let physicalIndex = 0;
  (bins || []).forEach((bin) => {
    physicalProductRowsForBin(bin, cutMode).forEach((products) => {
      products.forEach((productKey) => {
        if (!positionsByProduct.has(productKey)) positionsByProduct.set(productKey, []);
        positionsByProduct.get(productKey).push(physicalIndex + 1);
      });
      physicalIndex += 1;
    });
  });

  let totalClusterCount = 0;
  let totalGaps = 0;
  let totalSpan = 0;
  let maxSpan = 0;
  let stockCountForProducts = 0;
  const products = {};
  Array.from(positionsByProduct.keys()).sort().forEach((productKey) => {
    const stockIndexes = Array.from(new Set(positionsByProduct.get(productKey))).sort((a, b) => a - b);
    let clusterCount = stockIndexes.length ? 1 : 0;
    let gaps = 0;
    for (let index = 1; index < stockIndexes.length; index += 1) {
      const gap = Math.max(0, stockIndexes[index] - stockIndexes[index - 1] - 1);
      gaps += gap;
      if (gap > 0) clusterCount += 1;
    }
    const span = stockIndexes.length > 1
      ? stockIndexes[stockIndexes.length - 1] - stockIndexes[0]
      : 0;
    totalClusterCount += clusterCount;
    totalGaps += gaps;
    totalSpan += span;
    maxSpan = Math.max(maxSpan, span);
    stockCountForProducts += stockIndexes.length;
    products[productKey] = { stockIndexes, clusterCount, gaps, span, stockCountForProduct: stockIndexes.length };
  });

  const productCount = positionsByProduct.size;
  const scoreBase = Math.max(2, physicalIndex * Math.max(1, productCount) + 1);
  const groupingScore = (((totalClusterCount * scoreBase + totalGaps) * scoreBase + totalSpan)
    * scoreBase) + stockCountForProducts;
  return {
    groupingScore,
    totalClusterCount,
    totalGaps,
    totalSpan,
    averageSpan: productCount ? totalSpan / productCount : 0,
    maxSpan,
    stockCountForProducts,
    productCount,
    products
  };
}

function compareHardGroupingMetrics(left, right) {
  const fields = ["totalClusterCount", "totalGaps", "totalSpan", "stockCountForProducts", "totalLeftover"];
  for (const field of fields) {
    const difference = Number(left?.[field] || 0) - Number(right?.[field] || 0);
    if (difference !== 0) return difference < 0 ? -1 : 1;
  }
  return 0;
}

function optimizationMetrics(result, stock, cutMode = "single") {
  const multiplicity = cutMode === "double" ? 2 : 1;
  const bins = result?.bins || [];
  const stockCount = bins.length * multiplicity;
  const totalStockLength = stockCount * Number(stock || 0);
  const totalUsed = bins.reduce((sum, bin) => sum + Number(bin.used || 0) * multiplicity, 0);
  const totalLeftover = bins.reduce(
    (sum, bin) => sum + Number(bin.leftover || 0) * multiplicity,
    0
  );
  const clustering = productClusteringMetrics(bins, cutMode);
  return {
    stockCount,
    totalStockLength,
    totalUsed,
    totalLeftover,
    utilization: totalStockLength > 0 ? totalUsed / totalStockLength : 0,
    groupingScore: groupingScoreForBins(bins, cutMode),
    hardGroupingScore: clustering.groupingScore,
    totalClusterCount: clustering.totalClusterCount,
    totalGaps: clustering.totalGaps,
    averageSpan: clustering.averageSpan,
    maxSpan: clustering.maxSpan,
    totalSpan: clustering.totalSpan,
    stockCountForProducts: clustering.stockCountForProducts,
    productStocks: clustering.products
  };
}

function calculateProfileOptimizationStats(result, stock, kerf, rules = null, cutMode = "single") {
  const physicalMultiplier = cutMode === "double" ? 2 : 1;
  const bins = result?.bins || [];
  const stockLength = Number(stock || 0);
  const fallbackKerf = Number(kerf || 0);
  const scrapMax = Number(rules?.scrapMax);
  const minUsefulLeftover = Number(rules?.minUsefulLeftover);
  let partsLengthMm = 0;
  let kerfMm = 0;
  let usefulLeftoverMm = 0;
  let wasteMm = 0;
  let undesirableLeftoverMm = 0;

  bins.forEach((bin) => {
    (bin.parts || []).forEach((part) => {
      const length = Number(part?.length || 0);
      if (!Number.isFinite(length) || length <= 0) return;
      const explicitConsumption = Number(part?.size);
      const consumption = Number.isFinite(explicitConsumption) && explicitConsumption >= length
        ? explicitConsumption
        : length + fallbackKerf;
      partsLengthMm += length * physicalMultiplier;
      kerfMm += Math.max(0, consumption - length) * physicalMultiplier;
    });

    const leftover = Math.max(0, Number(bin?.leftover || 0));
    const physicalLeftover = leftover * physicalMultiplier;
    if (Number.isFinite(minUsefulLeftover) && minUsefulLeftover > 0 && leftover >= minUsefulLeftover) {
      usefulLeftoverMm += physicalLeftover;
    } else {
      wasteMm += physicalLeftover;
      if (
        Number.isFinite(scrapMax)
        && Number.isFinite(minUsefulLeftover)
        && leftover > scrapMax
        && leftover < minUsefulLeftover
      ) {
        undesirableLeftoverMm += physicalLeftover;
      }
    }
  });

  const physicalStockCount = bins.length * physicalMultiplier;
  const totalMaterialMm = physicalStockCount * stockLength;
  const usedPercent = totalMaterialMm > 0
    ? ((partsLengthMm + kerfMm) / totalMaterialMm) * 100
    : 0;
  const balanceMm = partsLengthMm + kerfMm + usefulLeftoverMm + wasteMm;
  return {
    physicalStockCount,
    totalMaterialMm,
    partsLengthMm,
    kerfMm,
    usefulLeftoverMm,
    wasteMm,
    undesirableLeftoverMm,
    usedPercent,
    balanceMm,
    balanceDifferenceMm: totalMaterialMm - balanceMm
  };
}

function evaluateProductGroupedCandidate(baseline, candidate, maxDegradation = MAX_GROUPING_MATERIAL_DEGRADATION) {
  if (candidate.stockCount > baseline.stockCount) {
    return { accepted: false, reason: "stock_count_increased", degradation: Infinity };
  }
  const utilizationDegradation = baseline.utilization > 0
    ? Math.max(0, (baseline.utilization - candidate.utilization) / baseline.utilization)
    : 0;
  if (utilizationDegradation > maxDegradation) {
    return { accepted: false, reason: "material_degradation", degradation: utilizationDegradation };
  }
  return { accepted: true, reason: "accepted", degradation: utilizationDegradation };
}

function productSetForBin(bin, cutMode) {
  const products = new Set();
  physicalProductRowsForBin(bin, cutMode).forEach((row) => row.forEach((key) => products.add(key)));
  return products;
}

function greedyProductOrder(bins, cutMode, startIndex) {
  const productSets = bins.map((bin) => productSetForBin(bin, cutMode));
  const remaining = new Set(bins.map((_, index) => index));
  const order = [];
  let current = startIndex;
  while (remaining.size) {
    order.push(current);
    remaining.delete(current);
    if (!remaining.size) break;
    const currentProducts = productSets[current];
    let bestIndex = -1;
    let bestOverlap = -1;
    Array.from(remaining).sort((a, b) => a - b).forEach((candidateIndex) => {
      let overlap = 0;
      productSets[candidateIndex].forEach((key) => {
        if (currentProducts.has(key)) overlap += 1;
      });
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestIndex = candidateIndex;
      }
    });
    current = bestIndex;
  }
  return order.map((index) => bins[index]);
}

/**
 * Experimental product grouping. This intentionally reorders only completed
 * logical bins. It never moves cuts between bins, and a double bin remains an
 * indivisible pair of physical stocks.
 */
function reorderOptimizationByProduct(result, stock, cutMode = "single", options = {}) {
  const baselineResult = result || { bins: [], unfit: [] };
  const baseline = optimizationMetrics(baselineResult, stock, cutMode);
  const bins = baselineResult.bins || [];
  let bestBins = bins;
  let bestScore = baseline.groupingScore;
  const starts = bins.length <= 64 ? bins.map((_, index) => index) : bins.slice(0, 64).map((_, index) => index);

  starts.forEach((startIndex) => {
    const candidateBins = greedyProductOrder(bins, cutMode, startIndex);
    const score = groupingScoreForBins(candidateBins, cutMode);
    if (score < bestScore) {
      bestBins = candidateBins;
      bestScore = score;
    }
  });

  const candidateResult = { ...baselineResult, bins: [...bestBins] };
  const candidate = optimizationMetrics(candidateResult, stock, cutMode);
  const decision = evaluateProductGroupedCandidate(
    baseline,
    candidate,
    Number.isFinite(Number(options.maxMaterialDegradation))
      ? Number(options.maxMaterialDegradation)
      : MAX_GROUPING_MATERIAL_DEGRADATION
  );
  const improvesGrouping = candidate.groupingScore < baseline.groupingScore;
  const accepted = decision.accepted && improvesGrouping;

  return {
    result: accepted ? candidateResult : baselineResult,
    diagnostics: {
      mode: PVC_OPTIMIZATION_MODE.SOFT_BY_PRODUCT,
      strategy: "reorder_completed_bins",
      accepted,
      reason: accepted ? "grouping_improved" : (decision.accepted ? "no_grouping_improvement" : decision.reason),
      materialDegradation: decision.degradation,
      baseline,
      grouped: accepted ? candidate : baseline
    }
  };
}

function moveArrayItem(items, fromIndex, toIndex) {
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function swapArrayItems(items, firstIndex, secondIndex) {
  const next = [...items];
  [next[firstIndex], next[secondIndex]] = [next[secondIndex], next[firstIndex]];
  return next;
}

function stablePartTieKey(part, fallbackIndex = 0) {
  const metas = Array.isArray(part?.meta) ? part.meta : [part?.meta];
  const metaKey = metas.map((meta) => [
    String(meta?.orderId || "").trim(),
    String(meta?.productId || "").trim(),
    String(Number(part?.length || 0)).padStart(10, "0"),
    String(meta?.optimizationInputIndex ?? meta?._seq ?? meta?.sourceRowIndex ?? fallbackIndex).padStart(10, "0")
  ].join("|")).join("+");
  return metaKey;
}

function hardLayoutTieKey(bins) {
  return (bins || []).map((bin, binIndex) => (bin.parts || [])
    .map((part, partIndex) => stablePartTieKey(part, binIndex * 1000 + partIndex))
    .join(","))
    .join(";");
}

function improveHardBinOrder(initialBins, stock, cutMode, options = {}) {
  const maxAcceptedOperations = Number.isFinite(Number(options.maxReorderOperations))
    ? Math.max(0, Math.floor(Number(options.maxReorderOperations)))
    : 16;
  const maxCandidatesPerPass = Number.isFinite(Number(options.maxReorderCandidatesPerPass))
    ? Math.max(1, Math.floor(Number(options.maxReorderCandidatesPerPass)))
    : 12000;
  let bins = [...(initialBins || [])];
  let metrics = optimizationMetrics({ bins }, stock, cutMode);
  const operations = [];

  for (let pass = 0; pass < maxAcceptedOperations; pass += 1) {
    let bestBins = null;
    let bestMetrics = metrics;
    let bestOperation = null;
    let evaluated = 0;
    const consider = (candidateBins, operation) => {
      if (evaluated >= maxCandidatesPerPass) return;
      evaluated += 1;
      const candidateMetrics = optimizationMetrics({ bins: candidateBins }, stock, cutMode);
      const metricComparison = compareHardGroupingMetrics(candidateMetrics, bestMetrics);
      if (
        metricComparison < 0
        || (metricComparison === 0
          && compareHardGroupingMetrics(candidateMetrics, metrics) < 0
          && hardLayoutTieKey(candidateBins) < hardLayoutTieKey(bestBins || bins))
      ) {
        bestBins = candidateBins;
        bestMetrics = candidateMetrics;
        bestOperation = operation;
      }
    };

    for (let from = 0; from < bins.length && evaluated < maxCandidatesPerPass; from += 1) {
      for (let to = 0; to < bins.length && evaluated < maxCandidatesPerPass; to += 1) {
        if (from === to) continue;
        consider(moveArrayItem(bins, from, to), { type: "move_bin", from, to });
      }
    }
    for (let first = 0; first < bins.length && evaluated < maxCandidatesPerPass; first += 1) {
      for (let second = first + 1; second < bins.length && evaluated < maxCandidatesPerPass; second += 1) {
        consider(swapArrayItems(bins, first, second), { type: "swap_bins", first, second });
      }
    }

    if (!bestBins || compareHardGroupingMetrics(bestMetrics, metrics) >= 0) break;
    bins = bestBins;
    metrics = bestMetrics;
    operations.push(bestOperation);
  }
  return { bins, metrics, operations };
}

function partConsumption(part) {
  const explicitSize = Number(part?.size);
  if (Number.isFinite(explicitSize) && explicitSize > 0) return explicitSize;
  const length = Number(part?.length || 0);
  return Number.isFinite(length) && length > 0 ? length : 0;
}

function isValidHardBin(bin, stock, rules) {
  const used = (bin?.parts || []).reduce((sum, part) => sum + partConsumption(part), 0);
  const leftover = Number(stock) - used;
  if (!Number.isFinite(used) || used <= 0 || leftover < 0) return false;
  const scrapMax = Number(rules?.scrapMax);
  const minUsefulLeftover = Number(rules?.minUsefulLeftover);
  if (Number.isFinite(scrapMax) && Number.isFinite(minUsefulLeftover)) {
    if (leftover > scrapMax && leftover < minUsefulLeftover) return false;
  }
  return true;
}

function recalculateHardBin(bin, stock) {
  const used = (bin.parts || []).reduce((sum, part) => sum + partConsumption(part), 0);
  return { ...bin, used, leftover: Number(stock) - used, parts: [...bin.parts] };
}

function smallPartIndexSets(parts, allowEmpty = false) {
  const indexes = parts.map((_, index) => index);
  const sets = indexes.map((index) => [index]);
  const pairLimit = Math.min(indexes.length, 8);
  for (let first = 0; first < pairLimit; first += 1) {
    for (let second = first + 1; second < pairLimit; second += 1) {
      sets.push([first, second]);
    }
  }
  if (allowEmpty) sets.unshift([]);
  return sets;
}

function exchangePartSets(firstParts, secondParts, firstIndexes, secondIndexes) {
  const firstSelected = new Set(firstIndexes);
  const secondSelected = new Set(secondIndexes);
  const movedToSecond = firstParts.filter((_, index) => firstSelected.has(index));
  const movedToFirst = secondParts.filter((_, index) => secondSelected.has(index));
  return {
    first: firstParts.filter((_, index) => !firstSelected.has(index)).concat(movedToFirst),
    second: secondParts.filter((_, index) => !secondSelected.has(index)).concat(movedToSecond)
  };
}

function improveHardBinComposition(initialBins, stock, cutMode, rules, options = {}) {
  const maxAcceptedOperations = Number.isFinite(Number(options.maxCompositionOperations))
    ? Math.max(0, Math.floor(Number(options.maxCompositionOperations)))
    : 8;
  const maxCandidatesPerPass = Number.isFinite(Number(options.maxCompositionCandidatesPerPass))
    ? Math.max(1, Math.floor(Number(options.maxCompositionCandidatesPerPass)))
    : 6000;
  let bins = initialBins.map((bin) => ({ ...bin, parts: [...(bin.parts || [])] }));
  let metrics = optimizationMetrics({ bins }, stock, cutMode);
  const operations = [];

  for (let pass = 0; pass < maxAcceptedOperations; pass += 1) {
    let bestBins = null;
    let bestMetrics = metrics;
    let bestOperation = null;
    let evaluated = 0;
    for (let firstBin = 0; firstBin < bins.length && evaluated < maxCandidatesPerPass; firstBin += 1) {
      for (let secondBin = firstBin + 1; secondBin < bins.length && evaluated < maxCandidatesPerPass; secondBin += 1) {
        const firstSets = smallPartIndexSets(bins[firstBin].parts, true);
        const secondSets = smallPartIndexSets(bins[secondBin].parts, true);
        for (const firstIndexes of firstSets) {
          for (const secondIndexes of secondSets) {
            if (evaluated >= maxCandidatesPerPass) break;
            if (!firstIndexes.length && !secondIndexes.length) continue;
            if (firstIndexes.length === bins[firstBin].parts.length && !secondIndexes.length) continue;
            if (secondIndexes.length === bins[secondBin].parts.length && !firstIndexes.length) continue;
            evaluated += 1;
            const exchanged = exchangePartSets(
              bins[firstBin].parts,
              bins[secondBin].parts,
              firstIndexes,
              secondIndexes
            );
            const firstCandidate = recalculateHardBin({ ...bins[firstBin], parts: exchanged.first }, stock);
            const secondCandidate = recalculateHardBin({ ...bins[secondBin], parts: exchanged.second }, stock);
            if (!isValidHardBin(firstCandidate, stock, rules) || !isValidHardBin(secondCandidate, stock, rules)) {
              continue;
            }
            const candidateBins = [...bins];
            candidateBins[firstBin] = firstCandidate;
            candidateBins[secondBin] = secondCandidate;
            const candidateMetrics = optimizationMetrics({ bins: candidateBins }, stock, cutMode);
            const metricComparison = compareHardGroupingMetrics(candidateMetrics, bestMetrics);
            if (
              metricComparison < 0
              || (metricComparison === 0
                && compareHardGroupingMetrics(candidateMetrics, metrics) < 0
                && hardLayoutTieKey(candidateBins) < hardLayoutTieKey(bestBins || bins))
            ) {
              bestBins = candidateBins;
              bestMetrics = candidateMetrics;
              bestOperation = {
                type: firstIndexes.length && secondIndexes.length ? "swap_part_sets" : "move_part_set",
                firstBin,
                secondBin,
                firstCount: firstIndexes.length,
                secondCount: secondIndexes.length
              };
            }
          }
        }
      }
    }
    if (!bestBins || compareHardGroupingMetrics(bestMetrics, metrics) >= 0) break;
    bins = bestBins;
    metrics = bestMetrics;
    operations.push(bestOperation);
  }
  return { bins, metrics, operations };
}

function optimizeHardByProduct(result, stock, cutMode = "single", options = {}) {
  const baselineResult = result || { bins: [], unfit: [] };
  const baseline = optimizationMetrics(baselineResult, stock, cutMode);
  const stageA = improveHardBinOrder(baselineResult.bins || [], stock, cutMode, options);
  const stageB = improveHardBinComposition(
    stageA.bins,
    stock,
    cutMode,
    options.rules || null,
    options
  );
  const finalOrder = improveHardBinOrder(stageB.bins, stock, cutMode, options);
  const candidateResult = { ...baselineResult, bins: finalOrder.bins };
  const candidate = optimizationMetrics(candidateResult, stock, cutMode);
  const accepted = candidate.stockCount <= baseline.stockCount
    && compareHardGroupingMetrics(candidate, baseline) < 0;
  return {
    result: accepted ? candidateResult : baselineResult,
    diagnostics: {
      mode: PVC_OPTIMIZATION_MODE.HARD_BY_PRODUCT,
      strategy: "local_search_reorder_then_atomic_composition",
      accepted,
      reason: accepted ? "hard_grouping_improved" : "no_hard_grouping_improvement",
      baseline,
      grouped: accepted ? candidate : baseline,
      reorderOperations: [...stageA.operations, ...finalOrder.operations],
      compositionOperations: stageB.operations,
      maxReorderOperations: Number(options.maxReorderOperations) || 16,
      maxCompositionOperations: Number(options.maxCompositionOperations) || 8
    }
  };
}

function applyPvcOptimizationLayoutMode(
  result,
  stock,
  cutMode = "single",
  mode = PVC_OPTIMIZATION_MODE.MAX_SAVINGS,
  options = {}
) {
  if (mode === PVC_OPTIMIZATION_MODE.HARD_BY_PRODUCT) {
    return optimizeHardByProduct(result, stock, cutMode, options);
  }
  if (
    mode === PVC_OPTIMIZATION_MODE.SOFT_BY_PRODUCT
    || mode === PVC_OPTIMIZATION_MODE.LEGACY_BY_PRODUCT
  ) {
    return reorderOptimizationByProduct(result, stock, cutMode, options);
  }
  const baseline = optimizationMetrics(result, stock, cutMode);
  return {
    result,
    diagnostics: {
      mode: PVC_OPTIMIZATION_MODE.MAX_SAVINGS,
      strategy: "baseline_best_fit",
      accepted: true,
      reason: "baseline_mode",
      materialDegradation: 0,
      baseline,
      grouped: baseline
    }
  };
}

function comparePvcOptimizationModes(result, stock, cutMode = "single", options = {}) {
  const maximum = applyPvcOptimizationLayoutMode(
    result,
    stock,
    cutMode,
    PVC_OPTIMIZATION_MODE.MAX_SAVINGS,
    options
  );
  const soft = applyPvcOptimizationLayoutMode(
    result,
    stock,
    cutMode,
    PVC_OPTIMIZATION_MODE.SOFT_BY_PRODUCT,
    options
  );
  const hard = applyPvcOptimizationLayoutMode(
    result,
    stock,
    cutMode,
    PVC_OPTIMIZATION_MODE.HARD_BY_PRODUCT,
    options
  );
  const modes = {
    maxSavings: maximum.diagnostics.grouped,
    softByProduct: soft.diagnostics.grouped,
    hardByProduct: hard.diagnostics.grouped
  };
  const productKeys = new Set([
    ...Object.keys(modes.maxSavings.productStocks || {}),
    ...Object.keys(modes.softByProduct.productStocks || {}),
    ...Object.keys(modes.hardByProduct.productStocks || {})
  ]);
  const emptyProduct = { stockIndexes: [], clusterCount: 0, gaps: 0, span: 0, stockCountForProduct: 0 };
  const worstProducts = Array.from(productKeys).map((productKey) => ({
    productKey,
    maxSavings: modes.maxSavings.productStocks?.[productKey] || emptyProduct,
    softByProduct: modes.softByProduct.productStocks?.[productKey] || emptyProduct,
    hardByProduct: modes.hardByProduct.productStocks?.[productKey] || emptyProduct
  })).sort((left, right) => {
    const fields = ["clusterCount", "gaps", "span"];
    for (const field of fields) {
      const difference = right.maxSavings[field] - left.maxSavings[field];
      if (difference !== 0) return difference;
    }
    return left.productKey.localeCompare(right.productKey);
  }).slice(0, 5);
  return { maximum, soft, hard, modes, worstProducts };
}

window.optimizeCut = optimizeCut;
window.optimizeCutWithRemnants = optimizeCutWithRemnants;
window.PVC_OPTIMIZATION_MODE = PVC_OPTIMIZATION_MODE;
window.MAX_GROUPING_MATERIAL_DEGRADATION = MAX_GROUPING_MATERIAL_DEGRADATION;
window.groupingScoreForBins = groupingScoreForBins;
window.productClusteringMetrics = productClusteringMetrics;
window.compareHardGroupingMetrics = compareHardGroupingMetrics;
window.optimizationMetrics = optimizationMetrics;
window.calculateProfileOptimizationStats = calculateProfileOptimizationStats;
window.evaluateProductGroupedCandidate = evaluateProductGroupedCandidate;
window.reorderOptimizationByProduct = reorderOptimizationByProduct;
window.optimizeHardByProduct = optimizeHardByProduct;
window.applyPvcOptimizationLayoutMode = applyPvcOptimizationLayoutMode;
window.comparePvcOptimizationModes = comparePvcOptimizationModes;
