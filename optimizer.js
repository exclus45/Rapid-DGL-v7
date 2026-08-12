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

window.optimizeCut = optimizeCut;
window.optimizeCutWithRemnants = optimizeCutWithRemnants;
