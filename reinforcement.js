(function (root) {
  "use strict";

  const STOCK_LENGTH_MM = 6000;
  const KERF_MM = 10;
  const DEFAULT_MODE = "double";
  const OPTIMIZATION_MODE = Object.freeze({
    MAX_SAVINGS: "max_savings",
    HARD_BY_PRODUCT: "hard_by_product"
  });
  const DEFAULT_OPTIMIZATION_MODE = OPTIMIZATION_MODE.MAX_SAVINGS;
  const PART_KIND_LABELS = Object.freeze({
    frame: "РАМА",
    sash: "СТВОРКА",
    mullion: "ИМПОСТ"
  });
  const PART_KIND_PAIR_ORDER = Object.freeze({ frame: 1, sash: 2, mullion: 3 });

  function normalizeText(value) {
    return String(value ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  }

  function normalizePositiveNumber(value) {
    const number = Number(String(value ?? "").replace(",", "."));
    return Number.isFinite(number) && number > 0 ? number : 0;
  }

  function displayPartKind(detail) {
    const canonical = root.LabelData?.canonicalPartKindForDetail?.(detail) || "";
    if (PART_KIND_LABELS[canonical]) return PART_KIND_LABELS[canonical];
    const raw = normalizeText(detail?.partKind);
    return raw ? raw.toLocaleUpperCase("ru-RU") : "ДЕТАЛЬ";
  }

  function collectReinforcementItems(pdfPositions) {
    const items = [];
    (pdfPositions || []).forEach((position) => {
      const details = position?.allDetails || position?.details || [];
      details.forEach((detail) => {
        const reinforcementArticle = normalizeText(detail.reinforcementArticle);
        const reinforcementSizeMm = normalizePositiveNumber(detail.reinforcementSizeMm);
        if (!reinforcementArticle || !reinforcementSizeMm) return;
        const quantity = Math.max(0, Math.trunc(Number(detail.quantity) || 0));
        for (let index = 0; index < quantity; index++) {
          items.push({
            reinforcementArticle,
            reinforcementSizeMm,
            orderId: normalizeText(detail.orderId || position.orderId),
            productId: normalizeText(detail.productId || position.productId),
            partKind: root.LabelData?.canonicalPartKindForDetail?.(detail) || normalizeText(detail.partKind),
            partKindLabel: displayPartKind(detail),
            sourcePartId: normalizeText(detail.sourcePartId),
            sourceUnitNo: index + 1
          });
        }
      });
    });
    return items;
  }

  function groupReinforcementItems(items) {
    const groups = new Map();
    (items || []).forEach((item) => {
      const article = normalizeText(item.reinforcementArticle);
      const size = normalizePositiveNumber(item.reinforcementSizeMm);
      if (!article || !size) return;
      const key = article.toLocaleLowerCase("ru-RU");
      if (!groups.has(key)) {
        groups.set(key, { key, reinforcementArticle: article, items: [] });
      }
      groups.get(key).items.push({ ...item, reinforcementArticle: article, reinforcementSizeMm: size });
    });
    return Array.from(groups.values())
      .map((group) => ({ ...group, quantity: group.items.length }))
      .sort((a, b) => a.reinforcementArticle.localeCompare(b.reinforcementArticle, "ru", { sensitivity: "base" }));
  }

  function buildReinforcementGroups(pdfPositions) {
    return groupReinforcementItems(collectReinforcementItems(pdfPositions));
  }

  function normalizeMode(value) {
    return value === "single" ? "single" : DEFAULT_MODE;
  }

  function packCutEntries(entries, stockLength = STOCK_LENGTH_MM, kerf = KERF_MM) {
    const bins = [];
    const unfitEntries = [];
    const sorted = [...(entries || [])].sort((a, b) => {
      const lengthDiff = Number(b.lengthMm) - Number(a.lengthMm);
      if (lengthDiff !== 0) return lengthDiff;
      return Number(a.sequence || 0) - Number(b.sequence || 0);
    });

    sorted.forEach((entry) => {
      const lengthMm = normalizePositiveNumber(entry.lengthMm);
      const consumptionMm = lengthMm + kerf;
      const prepared = { ...entry, lengthMm, consumptionMm };
      if (!lengthMm || consumptionMm > stockLength) {
        unfitEntries.push(prepared);
        return;
      }
      let bestBin = null;
      let bestLeftover = Number.POSITIVE_INFINITY;
      bins.forEach((bin) => {
        const leftoverAfter = stockLength - bin.usedMm - consumptionMm;
        if (leftoverAfter >= 0 && leftoverAfter < bestLeftover) {
          bestBin = bin;
          bestLeftover = leftoverAfter;
        }
      });
      if (!bestBin) {
        bestBin = { binNo: bins.length + 1, stockLengthMm: stockLength, cuts: [], usedMm: 0, leftoverMm: stockLength };
        bins.push(bestBin);
      }
      bestBin.cuts.push(prepared);
      bestBin.usedMm += consumptionMm;
      bestBin.leftoverMm = stockLength - bestBin.usedMm;
    });
    return { bins, unfitEntries };
  }

  function pairReinforcementItems(items) {
    const buckets = new Map();
    (items || []).forEach((item, sourceIndex) => {
      const article = normalizeText(item.reinforcementArticle);
      const articleKey = article.toLocaleLowerCase("ru-RU");
      const lengthMm = normalizePositiveNumber(item.reinforcementSizeMm);
      const key = `${articleKey}\u0000${lengthMm}`;
      if (!buckets.has(key)) buckets.set(key, { article, articleKey, lengthMm, items: [] });
      buckets.get(key).items.push({ item, sourceIndex });
    });

    const normalizedPartKind = (item) => normalizeText(item?.partKind).toLocaleLowerCase("ru-RU") || "other";
    const itemStableKey = (entry) => [
      normalizeText(entry.item?.orderId),
      normalizeText(entry.item?.productId),
      normalizeText(entry.item?.sourcePartId),
      String(entry.item?.sourceUnitNo ?? ""),
      normalizedPartKind(entry.item),
      String(entry.sourceIndex)
    ].join("\u0000");
    const compareItems = (a, b) => itemStableKey(a).localeCompare(itemStableKey(b), "ru", {
      sensitivity: "base",
      numeric: true
    });
    const compareKinds = (a, b) => {
      const orderDiff = (PART_KIND_PAIR_ORDER[a] || Number.MAX_SAFE_INTEGER)
        - (PART_KIND_PAIR_ORDER[b] || Number.MAX_SAFE_INTEGER);
      return orderDiff || a.localeCompare(b, "ru", { sensitivity: "base" });
    };

    const pairs = [];
    const leftovers = [];
    let sequence = 1;
    const sortedBuckets = Array.from(buckets.values()).sort((a, b) => {
      const articleDiff = a.article.localeCompare(b.article, "ru", { sensitivity: "base" });
      return articleDiff || b.lengthMm - a.lengthMm;
    });
    sortedBuckets.forEach((bucket) => {
      const byPartKind = new Map();
      bucket.items.forEach((entry) => {
        const partKind = normalizedPartKind(entry.item);
        if (!byPartKind.has(partKind)) byPartKind.set(partKind, []);
        byPartKind.get(partKind).push(entry);
      });

      const mixedCandidates = [];
      Array.from(byPartKind.keys()).sort(compareKinds).forEach((partKind) => {
        const sameKindItems = byPartKind.get(partKind).sort(compareItems);
        for (let index = 0; index + 1 < sameKindItems.length; index += 2) {
          pairs.push({
            kind: "double",
            sequence: sequence++,
            lengthMm: bucket.lengthMm,
            items: [sameKindItems[index].item, sameKindItems[index + 1].item]
          });
        }
        if (sameKindItems.length % 2 === 1) mixedCandidates.push(sameKindItems[sameKindItems.length - 1]);
      });

      mixedCandidates.sort((a, b) => {
        const kindDiff = compareKinds(normalizedPartKind(a.item), normalizedPartKind(b.item));
        return kindDiff || compareItems(a, b);
      });
      for (let index = 0; index + 1 < mixedCandidates.length; index += 2) {
        pairs.push({
          kind: "double",
          sequence: sequence++,
          lengthMm: bucket.lengthMm,
          items: [mixedCandidates[index].item, mixedCandidates[index + 1].item]
        });
      }
      if (mixedCandidates.length % 2 === 1) leftovers.push(mixedCandidates[mixedCandidates.length - 1].item);
    });
    return { pairs, leftovers };
  }

  function buildPhysicalBins(bins, mode) {
    if (normalizeMode(mode) !== "double") {
      return (bins || []).map((bin, index) => ({
        ...bin,
        binNo: index + 1,
        items: (bin.cuts || []).flatMap((cut) => cut.items || [])
      }));
    }
    return (bins || []).flatMap((bin, pairIndex) => {
      return [0, 1].map((parallelStockIndex) => {
        const cuts = (bin.cuts || []).map((cut) => {
          const item = cut.items?.[parallelStockIndex];
          return item ? { ...cut, items: [item] } : null;
        }).filter(Boolean);
        return {
          binNo: pairIndex * 2 + parallelStockIndex + 1,
          sourcePairBinNo: bin.binNo,
          parallelStockNo: parallelStockIndex + 1,
          stockLengthMm: bin.stockLengthMm,
          cuts,
          items: cuts.flatMap((cut) => cut.items),
          usedMm: bin.usedMm,
          leftoverMm: bin.leftoverMm
        };
      });
    });
  }

  function productKey(item) {
    const orderId = normalizeText(item?.orderId);
    const productId = normalizeText(item?.productId);
    return orderId && productId ? `${orderId}||${productId}` : "";
  }

  function productRowsForBin(bin, mode) {
    const rowCount = normalizeMode(mode) === "double" ? 2 : 1;
    const rows = Array.from({ length: rowCount }, () => new Set());
    (bin?.cuts || []).forEach((cut) => {
      if (rowCount === 2) {
        rows[0].add(productKey(cut.items?.[0]));
        rows[1].add(productKey(cut.items?.[1]));
      } else {
        rows[0].add(productKey(cut.items?.[0]));
      }
    });
    rows.forEach((row) => row.delete(""));
    return rows;
  }

  function reinforcementClusteringMetrics(bins, mode = "single") {
    const positionsByProduct = new Map();
    let physicalIndex = 0;
    (bins || []).forEach((bin) => {
      productRowsForBin(bin, mode).forEach((products) => {
        products.forEach((key) => {
          if (!positionsByProduct.has(key)) positionsByProduct.set(key, []);
          positionsByProduct.get(key).push(physicalIndex + 1);
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
    Array.from(positionsByProduct.keys()).sort().forEach((key) => {
      const stockIndexes = Array.from(new Set(positionsByProduct.get(key))).sort((a, b) => a - b);
      let clusterCount = stockIndexes.length ? 1 : 0;
      let gaps = 0;
      for (let index = 1; index < stockIndexes.length; index += 1) {
        const gap = Math.max(0, stockIndexes[index] - stockIndexes[index - 1] - 1);
        gaps += gap;
        if (gap > 0) clusterCount += 1;
      }
      const span = stockIndexes.length > 1 ? stockIndexes[stockIndexes.length - 1] - stockIndexes[0] : 0;
      totalClusterCount += clusterCount;
      totalGaps += gaps;
      totalSpan += span;
      maxSpan = Math.max(maxSpan, span);
      stockCountForProducts += stockIndexes.length;
      products[key] = { stockIndexes, clusterCount, gaps, span, stockCountForProduct: stockIndexes.length };
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

  function compareGrouping(left, right) {
    for (const field of ["totalClusterCount", "totalGaps", "totalSpan", "stockCountForProducts", "totalLeftoverMm"]) {
      const difference = Number(left?.[field] || 0) - Number(right?.[field] || 0);
      if (difference !== 0) return difference < 0 ? -1 : 1;
    }
    return 0;
  }

  function reinforcementLayoutMetrics(bins, mode) {
    const clustering = reinforcementClusteringMetrics(bins, mode);
    const physicalMultiplier = normalizeMode(mode) === "double" ? 2 : 1;
    return {
      ...clustering,
      physicalStockCount: (bins || []).length * physicalMultiplier,
      totalLeftoverMm: (bins || []).reduce(
        (sum, bin) => sum + Number(bin.leftoverMm || 0) * physicalMultiplier,
        0
      )
    };
  }

  function moveEntry(items, fromIndex, toIndex) {
    const next = [...items];
    const [entry] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, entry);
    return next;
  }

  function swapEntries(items, firstIndex, secondIndex) {
    const next = [...items];
    [next[firstIndex], next[secondIndex]] = [next[secondIndex], next[firstIndex]];
    return next;
  }

  function cutTieKey(cut, fallbackIndex) {
    return (cut?.items || []).map((item, itemIndex) => [
      normalizeText(item?.orderId),
      normalizeText(item?.productId),
      String(Number(item?.reinforcementSizeMm || cut?.lengthMm || 0)).padStart(10, "0"),
      normalizeText(item?.sourcePartId),
      String(item?.sourceUnitNo ?? fallbackIndex + itemIndex).padStart(10, "0")
    ].join("|")).join("+");
  }

  function layoutTieKey(bins) {
    return (bins || []).map((bin, binIndex) => (bin.cuts || [])
      .map((cut, cutIndex) => cutTieKey(cut, binIndex * 1000 + cutIndex))
      .join(","))
      .join(";");
  }

  function improveReinforcementBinOrder(initialBins, mode, options = {}) {
    const maxOperations = Number.isFinite(Number(options.maxReorderOperations))
      ? Math.max(0, Math.floor(Number(options.maxReorderOperations)))
      : 16;
    const maxCandidates = Number.isFinite(Number(options.maxReorderCandidatesPerPass))
      ? Math.max(1, Math.floor(Number(options.maxReorderCandidatesPerPass)))
      : 12000;
    let bins = [...(initialBins || [])];
    let metrics = reinforcementLayoutMetrics(bins, mode);
    const operations = [];
    for (let pass = 0; pass < maxOperations; pass += 1) {
      let bestBins = null;
      let bestMetrics = metrics;
      let bestOperation = null;
      let evaluated = 0;
      const consider = (candidateBins, operation) => {
        if (evaluated >= maxCandidates) return;
        evaluated += 1;
        const candidateMetrics = reinforcementLayoutMetrics(candidateBins, mode);
        const comparison = compareGrouping(candidateMetrics, bestMetrics);
        if (
          comparison < 0
          || (comparison === 0
            && compareGrouping(candidateMetrics, metrics) < 0
            && layoutTieKey(candidateBins) < layoutTieKey(bestBins || bins))
        ) {
          bestBins = candidateBins;
          bestMetrics = candidateMetrics;
          bestOperation = operation;
        }
      };
      for (let from = 0; from < bins.length && evaluated < maxCandidates; from += 1) {
        for (let to = 0; to < bins.length && evaluated < maxCandidates; to += 1) {
          if (from !== to) consider(moveEntry(bins, from, to), { type: "move_bin", from, to });
        }
      }
      for (let first = 0; first < bins.length && evaluated < maxCandidates; first += 1) {
        for (let second = first + 1; second < bins.length && evaluated < maxCandidates; second += 1) {
          consider(swapEntries(bins, first, second), { type: "swap_bins", first, second });
        }
      }
      if (!bestBins || compareGrouping(bestMetrics, metrics) >= 0) break;
      bins = bestBins;
      metrics = bestMetrics;
      operations.push(bestOperation);
    }
    return { bins, metrics, operations };
  }

  function recalculateReinforcementBin(bin) {
    const usedMm = (bin.cuts || []).reduce((sum, cut) => sum + Number(cut.consumptionMm || 0), 0);
    return { ...bin, cuts: [...bin.cuts], usedMm, leftoverMm: STOCK_LENGTH_MM - usedMm };
  }

  function smallCutIndexSets(cuts, includeEmpty = false) {
    const sets = cuts.map((_, index) => [index]);
    const limit = Math.min(cuts.length, 8);
    for (let first = 0; first < limit; first += 1) {
      for (let second = first + 1; second < limit; second += 1) sets.push([first, second]);
    }
    if (includeEmpty) sets.unshift([]);
    return sets;
  }

  function exchangeCutSets(firstCuts, secondCuts, firstIndexes, secondIndexes) {
    const firstSet = new Set(firstIndexes);
    const secondSet = new Set(secondIndexes);
    return {
      first: firstCuts.filter((_, index) => !firstSet.has(index))
        .concat(secondCuts.filter((_, index) => secondSet.has(index))),
      second: secondCuts.filter((_, index) => !secondSet.has(index))
        .concat(firstCuts.filter((_, index) => firstSet.has(index)))
    };
  }

  function improveReinforcementComposition(initialBins, mode, options = {}) {
    const maxOperations = Number.isFinite(Number(options.maxCompositionOperations))
      ? Math.max(0, Math.floor(Number(options.maxCompositionOperations)))
      : 8;
    const maxCandidates = Number.isFinite(Number(options.maxCompositionCandidatesPerPass))
      ? Math.max(1, Math.floor(Number(options.maxCompositionCandidatesPerPass)))
      : 6000;
    let bins = (initialBins || []).map((bin) => ({ ...bin, cuts: [...(bin.cuts || [])] }));
    let metrics = reinforcementLayoutMetrics(bins, mode);
    const operations = [];
    for (let pass = 0; pass < maxOperations; pass += 1) {
      let bestBins = null;
      let bestMetrics = metrics;
      let bestOperation = null;
      let evaluated = 0;
      for (let firstBin = 0; firstBin < bins.length && evaluated < maxCandidates; firstBin += 1) {
        for (let secondBin = firstBin + 1; secondBin < bins.length && evaluated < maxCandidates; secondBin += 1) {
          const firstSets = smallCutIndexSets(bins[firstBin].cuts, true);
          const secondSets = smallCutIndexSets(bins[secondBin].cuts, true);
          for (const firstIndexes of firstSets) {
            for (const secondIndexes of secondSets) {
              if (evaluated >= maxCandidates) break;
              if (!firstIndexes.length && !secondIndexes.length) continue;
              if (firstIndexes.length === bins[firstBin].cuts.length && !secondIndexes.length) continue;
              if (secondIndexes.length === bins[secondBin].cuts.length && !firstIndexes.length) continue;
              evaluated += 1;
              const exchanged = exchangeCutSets(
                bins[firstBin].cuts,
                bins[secondBin].cuts,
                firstIndexes,
                secondIndexes
              );
              const firstCandidate = recalculateReinforcementBin({ ...bins[firstBin], cuts: exchanged.first });
              const secondCandidate = recalculateReinforcementBin({ ...bins[secondBin], cuts: exchanged.second });
              if (
                !firstCandidate.cuts.length
                || !secondCandidate.cuts.length
                || firstCandidate.leftoverMm < 0
                || secondCandidate.leftoverMm < 0
              ) continue;
              const candidateBins = [...bins];
              candidateBins[firstBin] = firstCandidate;
              candidateBins[secondBin] = secondCandidate;
              const candidateMetrics = reinforcementLayoutMetrics(candidateBins, mode);
              const comparison = compareGrouping(candidateMetrics, bestMetrics);
              if (
                comparison < 0
                || (comparison === 0
                  && compareGrouping(candidateMetrics, metrics) < 0
                  && layoutTieKey(candidateBins) < layoutTieKey(bestBins || bins))
              ) {
                bestBins = candidateBins;
                bestMetrics = candidateMetrics;
                bestOperation = {
                  type: firstIndexes.length && secondIndexes.length ? "swap_cut_sets" : "move_cut_set",
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
      if (!bestBins || compareGrouping(bestMetrics, metrics) >= 0) break;
      bins = bestBins;
      metrics = bestMetrics;
      operations.push(bestOperation);
    }
    return { bins, metrics, operations };
  }

  function applyHardReinforcementLayout(baselineBins, mode, options = {}) {
    const baseline = reinforcementLayoutMetrics(baselineBins, mode);
    const stageA = improveReinforcementBinOrder(baselineBins, mode, options);
    const stageB = improveReinforcementComposition(stageA.bins, mode, options);
    const finalOrder = improveReinforcementBinOrder(stageB.bins, mode, options);
    const grouped = reinforcementLayoutMetrics(finalOrder.bins, mode);
    const accepted = grouped.physicalStockCount <= baseline.physicalStockCount
      && compareGrouping(grouped, baseline) < 0;
    const acceptedBins = accepted
      ? finalOrder.bins.map((bin, index) => ({ ...bin, binNo: index + 1 }))
      : baselineBins;
    return {
      bins: acceptedBins,
      diagnostics: {
        mode: OPTIMIZATION_MODE.HARD_BY_PRODUCT,
        accepted,
        baseline,
        grouped: accepted ? grouped : baseline,
        reorderOperations: [...stageA.operations, ...finalOrder.operations],
        compositionOperations: stageB.operations
      }
    };
  }

  function calculateReinforcementOptimizationStats(result) {
    const physicalBins = result?.physicalBins || [];
    const totalMaterialMm = physicalBins.length * Number(result?.stockLengthMm || STOCK_LENGTH_MM);
    let partsLengthMm = 0;
    let kerfMm = 0;
    physicalBins.forEach((bin) => {
      (bin.cuts || []).forEach((cut) => {
        const itemCount = (cut.items || []).length;
        const lengthMm = Number(cut.lengthMm || 0);
        partsLengthMm += lengthMm * itemCount;
        kerfMm += Math.max(0, Number(cut.consumptionMm || 0) - lengthMm) * itemCount;
      });
    });
    const leftoverMm = physicalBins.reduce((sum, bin) => sum + Number(bin.leftoverMm || 0), 0);
    const usedPercent = totalMaterialMm > 0 ? ((partsLengthMm + kerfMm) / totalMaterialMm) * 100 : 0;
    const balanceMm = partsLengthMm + kerfMm + leftoverMm;
    return {
      physicalStockCount: physicalBins.length,
      totalMaterialMm,
      partsLengthMm,
      kerfMm,
      leftoverMm,
      usedPercent,
      balanceMm,
      balanceDifferenceMm: totalMaterialMm - balanceMm
    };
  }

  function optimizeManualReinforcementItems(items) {
    const entries = (items || []).map((item, index) => ({
      kind: "single",
      sequence: index + 1,
      lengthMm: item.reinforcementSizeMm,
      items: [item]
    }));
    const packed = packCutEntries(entries, STOCK_LENGTH_MM, KERF_MM);
    return {
      mode: "single",
      stockLengthMm: STOCK_LENGTH_MM,
      kerfMm: KERF_MM,
      quantity: entries.length,
      bins: packed.bins,
      physicalBins: buildPhysicalBins(packed.bins, "single"),
      unfitItems: packed.unfitEntries.flatMap((entry) => entry.items || [])
    };
  }

  function optimizeReinforcementGroup(
    group,
    mode = DEFAULT_MODE,
    optimizationMode = DEFAULT_OPTIMIZATION_MODE
  ) {
    const normalizedMode = normalizeMode(mode);
    const normalizedOptimizationMode = optimizationMode === OPTIMIZATION_MODE.HARD_BY_PRODUCT
      ? OPTIMIZATION_MODE.HARD_BY_PRODUCT
      : OPTIMIZATION_MODE.MAX_SAVINGS;
    const sourceItems = [...(group?.items || [])];
    let entries;
    let unmatchedItems = [];
    if (normalizedMode === "double") {
      const pairing = pairReinforcementItems(sourceItems);
      entries = pairing.pairs;
      unmatchedItems = pairing.leftovers.map((item) => ({
        ...item,
        manualReason: "не найдена пара армирования той же длины"
      }));
    } else {
      entries = sourceItems.map((item, index) => ({
        kind: "single",
        sequence: index + 1,
        lengthMm: item.reinforcementSizeMm,
        items: [item]
      }));
    }

    const packed = packCutEntries(entries, STOCK_LENGTH_MM, KERF_MM);
    const unfitItems = packed.unfitEntries.flatMap((entry) => (entry.items || []).map((item) => ({
      ...item,
      manualReason: "длина с пропилом превышает длину хлыста"
    })));
    const manualItems = [...unmatchedItems, ...unfitItems];
    const manualOptimization = optimizeManualReinforcementItems(manualItems);
    const baselineMetrics = reinforcementLayoutMetrics(packed.bins, normalizedMode);
    const layout = normalizedOptimizationMode === OPTIMIZATION_MODE.HARD_BY_PRODUCT
      ? applyHardReinforcementLayout(packed.bins, normalizedMode)
      : {
          bins: packed.bins,
          diagnostics: {
            mode: OPTIMIZATION_MODE.MAX_SAVINGS,
            accepted: true,
            baseline: baselineMetrics,
            grouped: baselineMetrics,
            reorderOperations: [],
            compositionOperations: []
          }
        };
    const automaticQuantity = layout.bins.reduce((sum, bin) => {
      return sum + bin.cuts.reduce((cutSum, cut) => cutSum + (cut.items?.length || 0), 0);
    }, 0);
    const physicalBins = buildPhysicalBins(layout.bins, normalizedMode);
    const result = {
      groupKey: group?.key || normalizeText(group?.reinforcementArticle).toLocaleLowerCase("ru-RU"),
      reinforcementArticle: normalizeText(group?.reinforcementArticle),
      mode: normalizedMode,
      optimizationMode: normalizedOptimizationMode,
      stockLengthMm: STOCK_LENGTH_MM,
      kerfMm: KERF_MM,
      physicalStockCountPerBin: normalizedMode === "double" ? 2 : 1,
      physicalStockCount: physicalBins.length,
      automaticQuantity,
      bins: layout.bins,
      physicalBins,
      manualItems,
      manualOptimization,
      groupingDiagnostics: layout.diagnostics
    };
    result.stats = calculateReinforcementOptimizationStats(result);
    return result;
  }

  function optimizeReinforcementGroups(groups, modes, optimizationMode = DEFAULT_OPTIMIZATION_MODE) {
    return (groups || []).map((group) => {
      const mode = typeof modes?.get === "function" ? modes.get(group.key) : modes?.[group.key];
      return optimizeReinforcementGroup(group, mode, optimizationMode);
    });
  }

  function compareReinforcementOptimizationModes(group, mode = DEFAULT_MODE) {
    const maximum = optimizeReinforcementGroup(group, mode, OPTIMIZATION_MODE.MAX_SAVINGS);
    const hard = optimizeReinforcementGroup(group, mode, OPTIMIZATION_MODE.HARD_BY_PRODUCT);
    const maximumProducts = maximum.groupingDiagnostics.grouped.products || {};
    const hardProducts = hard.groupingDiagnostics.grouped.products || {};
    const productKeys = new Set([...Object.keys(maximumProducts), ...Object.keys(hardProducts)]);
    const empty = { stockIndexes: [], clusterCount: 0, gaps: 0, span: 0, stockCountForProduct: 0 };
    const worstProducts = Array.from(productKeys).map((key) => ({
      productKey: key,
      maxSavings: maximumProducts[key] || empty,
      hardByProduct: hardProducts[key] || empty
    })).sort((left, right) => {
      for (const field of ["clusterCount", "gaps", "span"]) {
        const difference = right.maxSavings[field] - left.maxSavings[field];
        if (difference !== 0) return difference;
      }
      return left.productKey.localeCompare(right.productKey);
    }).slice(0, 5);
    return { maximum, hard, worstProducts };
  }

  root.ReinforcementOptimization = Object.freeze({
    STOCK_LENGTH_MM,
    KERF_MM,
    DEFAULT_MODE,
    OPTIMIZATION_MODE,
    DEFAULT_OPTIMIZATION_MODE,
    PART_KIND_LABELS,
    collectReinforcementItems,
    groupReinforcementItems,
    buildReinforcementGroups,
    packCutEntries,
    pairReinforcementItems,
    buildPhysicalBins,
    reinforcementClusteringMetrics,
    reinforcementLayoutMetrics,
    applyHardReinforcementLayout,
    calculateReinforcementOptimizationStats,
    optimizeManualReinforcementItems,
    optimizeReinforcementGroup,
    optimizeReinforcementGroups,
    compareReinforcementOptimizationModes
  });
})(typeof window !== "undefined" ? window : globalThis);
