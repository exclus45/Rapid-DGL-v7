/**
 * Data helpers for the first labels MVP.
 * This module intentionally does not change cutting optimization or JOB export.
 */

const LABEL_STATUS = {
  READY: "Готово",
  NO_PDF: "Нет PDF для этикеток",
  NO_CUT: "Нет файла раскроя",
  CONFLICT: "Конфликт данных",
  AMBIGUOUS: "Неоднозначное сопоставление",
  DUPLICATE: "Дубликат пропущен",
  EXCLUDED: "Исключено пользователем"
};

const LABEL_RULES = {
  weldDimensionDeductionMm: 6,
  aluminumThresholdHeightMm: 17
};

const LABEL_SIDE = {
  TOP: "ВЕРХ",
  BOTTOM: "НИЗ",
  LEFT: "ЛЕВО",
  RIGHT: "ПРАВО"
};

const LABEL_DRAINAGE_TYPE = {
  NORMAL: "normal",
  OUTSIDE: "outside",
  UNKNOWN: "unknown"
};

const FILL_THICKNESS_DICTIONARY_KEY = "rapidDgl.fillThicknessDictionary.v1";
const IGNORED_FILLING_COMPONENTS = [
  "лист оцинкованный"
];

const LABEL_PART_KIND_ORDER = {
  sash: 1,
  frame: 2,
  mullion: 3
};

function normalizeLabelText(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLabelKey(value) {
  return normalizeLabelText(value)
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-z0-9а-я]/g, "");
}

function normalizeLabelNumber(value) {
  const raw = String(value || "").replace(",", ".");
  const match = raw.match(/\d+(?:\.\d+)?/);
  if (!match) return 0;
  const num = Number(match[0]);
  return Number.isFinite(num) ? Math.round(num) : 0;
}

function normalizeLabelOrient(value) {
  const key = normalizeLabelKey(value);
  if (key.startsWith("вер") || key === "в") return "vertical";
  if (key.startsWith("гор") || key === "г") return "horizontal";
  return key || "";
}

function normalizeDrainageType(value) {
  const key = normalizeLabelKey(value);
  if (key === LABEL_DRAINAGE_TYPE.OUTSIDE || key.includes("снаруж")) {
    return LABEL_DRAINAGE_TYPE.OUTSIDE;
  }
  if (key === LABEL_DRAINAGE_TYPE.NORMAL || key.includes("обыч")) {
    return LABEL_DRAINAGE_TYPE.NORMAL;
  }
  return LABEL_DRAINAGE_TYPE.UNKNOWN;
}

function normalizeFillingFormula(value) {
  return normalizeLabelText(value)
    .replace(/[［【〔]/g, "[")
    .replace(/[］】〕]/g, "]")
    .replace(/\s+/g, "")
    .replace(/,/g, ".");
}

function parseStrictFillingThickness(value) {
  const source = normalizeLabelText(value);
  const number = "(?:\\d+(?:[.,]\\d+)?)";
  const corePattern = `${number}(?:\\[${number}\\]${number})+`;
  const match = source.match(new RegExp(`^(${corePattern})(?:\\s*([a-zа-яё]+(?:\\s+[a-zа-яё]+)*))?$`, "i"));
  if (!match) return null;
  const normalizedFormula = normalizeFillingFormula(match[1]);
  const values = normalizedFormula.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
  const thicknessMm = values.reduce((sum, item) => sum + item, 0);
  return Number.isFinite(thicknessMm) && thicknessMm > 0 ? thicknessMm : null;
}

function parseExplicitFillingThickness(value) {
  const matches = Array.from(normalizeLabelText(value).matchAll(/(\d+(?:[,.]\d+)?)\s*мм/gi));
  if (matches.length !== 1) return null;
  const parsed = Number(matches[0][1].replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function isIgnoredFillingComponent(value) {
  const key = normalizeLabelText(value).toLowerCase();
  return IGNORED_FILLING_COMPONENTS.some((component) => key === normalizeLabelText(component).toLowerCase());
}

function normalizeStoredThickness(value) {
  const source = typeof value === "object" && value !== null ? value.thicknessMm : value;
  const parsed = Number(String(source ?? "").replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function resolveFillingEntries(entries, dictionary = {}, manualKeys = new Set()) {
  return (entries || []).map((entry) => {
    const rawFormula = normalizeLabelText(entry?.rawFormula);
    const normalizedFormula = normalizeFillingFormula(entry?.normalizedFormula || rawFormula);
    if (isIgnoredFillingComponent(rawFormula)) {
      return {
        ...entry,
        rawFormula,
        normalizedFormula,
        thicknessMm: null,
        status: "ignored"
      };
    }
    const storedThickness = normalizeStoredThickness(dictionary?.[normalizedFormula]);
    if (storedThickness !== null) {
      return {
        ...entry,
        rawFormula,
        normalizedFormula,
        thicknessMm: storedThickness,
        status: manualKeys.has(normalizedFormula) ? "manual" : "dictionary"
      };
    }
    const parsedThickness = parseStrictFillingThickness(rawFormula) ?? parseExplicitFillingThickness(rawFormula);
    return {
      ...entry,
      rawFormula,
      normalizedFormula,
      thicknessMm: parsedThickness,
      status: parsedThickness === null ? "unresolved" : "parsed"
    };
  });
}

function resolveFillingGroups(groups, dictionary = {}, manualKeys = new Set()) {
  return (groups || []).map((group) => {
    const components = resolveFillingEntries(group.components || [], dictionary, manualKeys);
    const activeComponents = components.filter((component) => component.status !== "ignored");
    const unresolvedComponents = activeComponents.filter((component) => component.status === "unresolved");
    const thicknesses = uniqueFillingThicknesses(activeComponents);
    const conflict = thicknesses.length > 1;
    const status = conflict
      ? "conflict"
      : (!activeComponents.length || unresolvedComponents.length || !thicknesses.length)
        ? "unresolved"
        : activeComponents.some((component) => component.status === "manual")
          ? "manual"
          : activeComponents.some((component) => component.status === "dictionary")
            ? "dictionary"
            : "parsed";
    const primary = activeComponents[0] || null;
    return {
      ...group,
      rawFormula: primary?.rawFormula || "",
      normalizedFormula: primary?.normalizedFormula || "",
      components,
      sourceRows: components.map((component) => component.sourceRow || component.rawFormula).filter(Boolean),
      unresolvedComponents,
      conflictingThicknesses: conflict ? thicknesses : [],
      thicknessMm: !conflict && thicknesses.length === 1 ? thicknesses[0] : null,
      status
    };
  });
}

function uniqueFillingThicknesses(entries) {
  return Array.from(new Set((entries || [])
    .map((entry) => normalizeStoredThickness(entry?.thicknessMm))
    .filter((value) => value !== null)))
    .sort((a, b) => a - b);
}

function formatFillingThickness(value) {
  const parsed = normalizeStoredThickness(value);
  if (parsed === null) return "";
  return String(parsed).replace(".", ",");
}

function readFillThicknessDictionary(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem(FILL_THICKNESS_DICTIONARY_KEY) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, value]) => normalizeStoredThickness(value) !== null));
  } catch (error) {
    return {};
  }
}

function writeFillThicknessDictionary(storage, dictionary) {
  try {
    storage?.setItem(FILL_THICKNESS_DICTIONARY_KEY, JSON.stringify(dictionary || {}));
    return true;
  } catch (error) {
    return false;
  }
}

function isOutsideDrainageLabel(label) {
  return normalizeDrainageType(label?.drainageType) === LABEL_DRAINAGE_TYPE.OUTSIDE &&
    canonicalPartKindForDetail(label || {}) === "frame" &&
    normalizeLabelKey(label?.side) === normalizeLabelKey(LABEL_SIDE.BOTTOM);
}

function displayLabelOrient(value) {
  const norm = normalizeLabelOrient(value);
  if (norm === "vertical") return "Вертикаль";
  if (norm === "horizontal") return "Горизонталь";
  return normalizeLabelText(value);
}

function inferPartKind(value) {
  const key = normalizeLabelKey(value);
  if (key === "frame") return "Рама";
  if (key === "sash") return "Створка";
  if (key === "mullion") return "Импост";
  if (key.includes("створ")) return "Створка";
  if (key.includes("рам")) return "Рама";
  if (key.includes("импост")) return "Импост";
  if (key.includes("порог")) return "Порог";
  return "";
}

function normalizedPartKindForDetail(item) {
  return normalizeLabelKey(item.partKind || inferPartKind(item.name || item.profile || item.profileCode));
}

function normalizedProfileForDetail(item) {
  return normalizeLabelKey(item.profile || item.name || item.profileCode);
}

function catalogProfileForDetail(item) {
  const catalog = typeof window !== "undefined" ? window.ProfileCatalog : null;
  if (!catalog?.findProfile) return null;
  const values = [item?.profileId, item?.profileCode, item?.profile, item?.name];
  for (const value of values) {
    const profile = catalog.findProfile(value);
    if (profile) return profile;
  }
  return null;
}

function normalizedComparableProfileForDetail(item) {
  const catalog = typeof window !== "undefined" ? window.ProfileCatalog : null;
  const sourceProfile = catalogProfileForDetail(item);
  if (!sourceProfile) return normalizedProfileForDetail(item);
  const optimizationProfile = catalog?.findOptimizationProfile?.(sourceProfile) || sourceProfile;
  return normalizeLabelKey(
    optimizationProfile.profileId || sourceProfile.optimizationProfileId || sourceProfile.profileId
  );
}

function canonicalPartKindForDetail(item) {
  const key = normalizedPartKindForDetail(item);
  if (key === "frame" || key.includes("рам")) return "frame";
  if (key === "sash" || key.includes("створ")) return "sash";
  if (key === "mullion" || key.includes("импост")) return "mullion";
  return "";
}

function isLabelScopeDetail(item) {
  const profileKey = normalizedProfileForDetail(item);
  if (profileKey.includes("порог")) return false;

  const kind = canonicalPartKindForDetail(item);
  return (
    kind === "frame" ||
    kind === "sash" ||
    kind === "mullion" ||
    profileKey.includes("рама") ||
    profileKey.includes("створ") ||
    profileKey.includes("импост")
  );
}

function isThresholdDetail(item) {
  const profileKey = normalizedProfileForDetail(item);
  return profileKey.includes("порог");
}

function normalizeLabelAngles(value) {
  return normalizeLabelText(value)
    .replace(/\s+/g, "")
    .replace(/,/g, ".")
    .toLowerCase();
}

function angleSideForDoorFrame(value) {
  const norm = normalizeLabelAngles(value);
  // Требует производственной проверки: временное правило для стоек дверной рамы со смешанными углами.
  if (norm === "45-90" || norm === "45°-90°") return LABEL_SIDE.LEFT;
  if (norm === "90-45" || norm === "90°-45°") return LABEL_SIDE.RIGHT;
  return "";
}

function detailContour(detail) {
  return normalizeLabelText(detail.contour || detail.position);
}

function labelPositionKey(orderId, productId) {
  return `${normalizeLabelText(orderId)} / ${normalizeLabelText(productId)}`;
}

function labelDetailKey(item) {
  return [
    normalizeLabelText(item.orderId),
    normalizeLabelText(item.productId),
    normalizedProfileForDetail(item),
    normalizedPartKindForDetail(item),
    canonicalPartKindForDetail(item) === "mullion" ? "" : normalizeLabelOrient(item.orient),
    normalizeLabelNumber(item.lengthMm),
    normalizeLabelNumber(item.quantity)
  ].join("|");
}

function labelDetailComparisonKey(item) {
  return [
    normalizeLabelText(item.orderId),
    normalizeLabelText(item.productId),
    normalizedPartKindForDetail(item),
    normalizedComparableProfileForDetail(item),
    canonicalPartKindForDetail(item) === "mullion" ? "" : normalizeLabelOrient(item.orient),
    normalizeLabelNumber(item.lengthMm)
  ].join("|");
}

function detailSignature(items) {
  return (items || [])
    .map(labelDetailKey)
    .sort()
    .join("\n");
}

function buildCutPositions(parts, fileName = "") {
  const map = new Map();
  (parts || []).forEach((part) => {
    const orderId = normalizeLabelText(part.orderId);
    const productId = normalizeLabelText(part.productId);
    if (!orderId || !productId) return;
    const key = labelPositionKey(orderId, productId);
    if (!map.has(key)) {
      map.set(key, {
        key,
        orderId,
        productId,
        sourceFiles: new Set(),
        details: []
      });
    }
    const record = map.get(key);
    if (fileName) record.sourceFiles.add(fileName);
    const detail = {
      orderId,
      productId,
      contour: normalizeLabelText(part.contour || part.position),
      profile: normalizeLabelText(part.name || part.profileCode),
      profileId: normalizeLabelText(part.profileId),
      optimizationProfileId: normalizeLabelText(part.optimizationProfileId),
      profileCode: normalizeLabelText(part.profileCode),
      partKind: normalizeLabelText(
        inferPartKind(part.partKind) || part.partKind || inferPartKind(part.name || part.profileCode)
      ),
      orient: displayLabelOrient(part.orient),
      lengthMm: normalizeLabelNumber(part.lengthMm),
      quantity: normalizeLabelNumber(part.quantity),
      angles: normalizeLabelText(part.angles),
      sourcePartId: normalizeLabelText(part.id),
      sourceRow: normalizeLabelText(part.sourceRow),
      sourceRowIndex: normalizeLabelNumber(part.sourceRowIndex),
      sourceFile: fileName
    };
    if (isLabelScopeDetail(detail)) {
      record.details.push(detail);
    }
  });

  return Array.from(map.values()).map((position) => ({
    ...position,
    sourceFiles: Array.from(position.sourceFiles),
    signature: detailSignature(position.details)
  }));
}

function mergePositionIntoStore(store, position, sourceKind, conflictSink, duplicateSink) {
  const existing = store.get(position.key);
  if (!existing) {
    store.set(position.key, {
      ...position,
      sourceKind,
      versions: [{ ...position, sourceKind }]
    });
    return "added";
  }

  if (existing.signature === position.signature) {
    duplicateSink.push({
      key: position.key,
      sourceKind,
      status: LABEL_STATUS.DUPLICATE,
      fileNames: position.sourceFiles || position.pdfFiles || [],
      message: "Полностью совпадает с уже загруженной версией."
    });
    return "duplicate";
  }

  const conflict = {
    key: position.key,
    sourceKind,
    status: LABEL_STATUS.CONFLICT,
    oldVersion: existing,
    newVersion: position,
    message: "Заказ/позиция совпадает, но данные отличаются."
  };
  conflictSink.push(conflict);
  existing.conflicts = existing.conflicts || [];
  existing.conflicts.push(conflict);
  return "conflict";
}

function collectStoresFromCutFiles(files) {
  const store = new Map();
  const conflicts = [];
  const duplicates = [];
  (files || []).forEach((fileInfo) => {
    buildCutPositions(fileInfo.parts, fileInfo.name).forEach((position) => {
      mergePositionIntoStore(store, position, "cut", conflicts, duplicates);
    });
  });
  return { store, conflicts, duplicates };
}

function collectStoresFromPdfFiles(files) {
  const store = new Map();
  const conflicts = [];
  const duplicates = [];
  (files || []).forEach((fileInfo) => {
    (fileInfo.positions || []).forEach((position) => {
      mergePositionIntoStore(store, position, "pdf", conflicts, duplicates);
    });
  });
  return { store, conflicts, duplicates };
}

function describeLabelDetail(detail) {
  const profile = detail.profile || detail.name || detail.profileCode || "";
  const partKind = detail.partKind || inferPartKind(profile);
  return {
    sourceFile: detail.sourceFile || "",
    pageNumber: detail.pageNumber || "",
    raw: `${normalizeLabelText(detail.orderId)}/${normalizeLabelText(detail.productId)}; ${normalizeLabelText(partKind)}; ${normalizeLabelText(profile)}; ${normalizeLabelText(detail.orient)}; ${normalizeLabelNumber(detail.lengthMm)}; ${normalizeLabelNumber(detail.quantity)}`,
    orderId: normalizeLabelText(detail.orderId),
    productId: normalizeLabelText(detail.productId),
    partKind: normalizeLabelText(partKind),
    partKindNormalized: normalizedPartKindForDetail(detail),
    profile: normalizeLabelText(profile),
    profileNormalized: normalizedProfileForDetail(detail),
    profileComparisonNormalized: normalizedComparableProfileForDetail(detail),
    orient: normalizeLabelText(detail.orient),
    orientNormalized: normalizeLabelOrient(detail.orient),
    lengthMm: normalizeLabelNumber(detail.lengthMm),
    quantity: normalizeLabelNumber(detail.quantity),
    signature: labelDetailKey(detail)
  };
}

function compareDetailFields(cutDetail, pdfDetail) {
  const fields = [
    ["orderId", "заказ"],
    ["productId", "позиция"],
    ["partKindNormalized", "часть"],
    ["profileComparisonNormalized", "профиль"],
    ["orientNormalized", "ориентация"],
    ["lengthMm", "длина"],
    ["quantity", "количество"]
  ];
  return fields
    .filter(([field]) => cutDetail[field] !== pdfDetail[field])
    .map(([, label]) => label);
}

function scoreDetailMatch(left, right) {
  const fields = ["orderId", "productId", "partKindNormalized", "profileComparisonNormalized", "orientNormalized", "lengthMm", "quantity"];
  return fields.reduce((score, field) => score + (left[field] === right[field] ? 1 : 0), 0);
}

function findClosestDetail(target, candidates) {
  let best = null;
  let bestScore = -1;
  (candidates || []).forEach((candidate) => {
    const score = scoreDetailMatch(target, candidate);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  });
  return bestScore > 0 ? best : null;
}

function buildMissingDetailIssue(source, detail, candidates) {
  const closest = findClosestDetail(detail, candidates);
  const fieldDiffs = closest ? compareDetailFields(source === "cut" ? detail : closest, source === "cut" ? closest : detail) : [];
  const issue = {
    source,
    detail,
    closest,
    fieldDiffs,
    signature: detail.signature
  };
  const place = detail.sourceFile ? `${detail.sourceFile}${detail.pageNumber ? `, стр. ${detail.pageNumber}` : ""}` : "";
  const sourceText = source === "cut" ? "CSV" : "PDF";
  const targetText = source === "cut" ? "PDF" : "раскрое";
  const diffText = fieldDiffs.length ? ` Различаются поля: ${fieldDiffs.join(", ")}.` : "";
  issue.message = `${sourceText}: ${detail.raw}${place ? ` (${place})` : ""} — не найдена в ${targetText}.${diffText}`;
  return issue;
}

function groupDetailsForComparison(details) {
  const map = new Map();
  (details || []).forEach((detail) => {
    const described = describeLabelDetail(detail);
    const key = labelDetailComparisonKey(detail);
    const entry = map.get(key) || { key, quantity: 0, details: [] };
    entry.quantity += described.quantity;
    entry.details.push(described);
    map.set(key, entry);
  });
  return map;
}

function buildQuantityMismatchIssue(cutEntry, pdfEntry) {
  const cutDetail = { ...cutEntry.details[0], quantity: cutEntry.quantity, signature: cutEntry.key };
  const pdfDetail = { ...pdfEntry.details[0], quantity: pdfEntry.quantity, signature: pdfEntry.key };
  const issue = {
    source: "cut",
    detail: cutDetail,
    closest: pdfDetail,
    fieldDiffs: ["количество"],
    signature: cutEntry.key
  };
  issue.message = `Количество группы не совпадает: ${cutDetail.orderId}/${cutDetail.productId}; ${cutDetail.partKind}; ${cutDetail.profile}; ${cutDetail.orient}; ${cutDetail.lengthMm} мм. CSV ${cutEntry.quantity}, PDF ${pdfEntry.quantity}.`;
  return issue;
}

function compareCutToPdf(cutPosition, pdfPosition) {
  if (!cutPosition || !pdfPosition) {
    return { ok: false, ambiguous: false, warnings: [], issues: [] };
  }

  const warnings = [];
  const issues = [];
  const cutKeys = groupDetailsForComparison(cutPosition.details);
  const pdfKeys = groupDetailsForComparison(pdfPosition.details);
  const cutDetails = Array.from(cutKeys.values()).flatMap((entry) => entry.details);
  const pdfDetails = Array.from(pdfKeys.values()).flatMap((entry) => entry.details);

  let ambiguous = false;
  cutKeys.forEach((entry, key) => {
    const pdfEntry = pdfKeys.get(key);
    if (!pdfEntry) {
      entry.details.forEach((detail) => {
        const issue = buildMissingDetailIssue("cut", detail, pdfDetails);
        issues.push(issue);
        warnings.push(issue.message);
      });
      return;
    }
    const cutQuantities = entry.details.map((detail) => detail.quantity).sort((a, b) => a - b);
    const pdfQuantities = pdfEntry.details.map((detail) => detail.quantity).sort((a, b) => a - b);
    const rowsPairExactly = cutQuantities.length === pdfQuantities.length && cutQuantities.every((quantity, index) => quantity === pdfQuantities[index]);
    if (entry.details.length > 1 && !rowsPairExactly) {
      ambiguous = true;
      warnings.push(`Несколько строк CSV имеют один ключ сопоставления: ${entry.details[0].raw}; строк ${entry.details.length}.`);
    }
    if (pdfEntry.quantity !== entry.quantity) {
      const issue = buildQuantityMismatchIssue(entry, pdfEntry);
      issues.push(issue);
      warnings.push(issue.message);
    }
  });
  pdfKeys.forEach((entry, key) => {
    const cutEntry = cutKeys.get(key);
    if (!cutEntry) {
      entry.details.forEach((detail) => {
        const issue = buildMissingDetailIssue("pdf", detail, cutDetails);
        issues.push(issue);
        warnings.push(issue.message);
      });
      return;
    }
  });

  return {
    ok: warnings.length === 0 && !ambiguous,
    ambiguous,
    warnings: Array.from(new Set(warnings)),
    issues
  };
}

function sumPhysicalQuantity(details) {
  return (details || []).reduce((sum, detail) => sum + normalizeLabelNumber(detail.quantity), 0);
}

function buildLabelKitReview(cutStore, pdfStore, conflicts, duplicates, excludedKeys, decisions) {
  const keys = new Set([
    ...Array.from(cutStore.keys()),
    ...Array.from(pdfStore.keys())
  ]);
  const conflictByKey = new Map();
  (conflicts || []).forEach((conflict) => conflictByKey.set(conflict.key, conflict));

  const rows = Array.from(keys).sort((a, b) => a.localeCompare(b, "ru", { numeric: true })).map((key) => {
    const cut = cutStore.get(key) || null;
    const pdf = pdfStore.get(key) || null;
    const warnings = [];
    let comparison = null;
    let conflictKind = "";
    let status = LABEL_STATUS.READY;

    if (excludedKeys && excludedKeys.has(key)) {
      status = LABEL_STATUS.EXCLUDED;
    } else if (conflictByKey.has(key) || cut?.conflicts?.length || pdf?.conflicts?.length) {
      status = LABEL_STATUS.CONFLICT;
      conflictKind = "version";
      warnings.push("Есть несколько версий данных для одной позиции.");
    } else if (cut && !pdf) {
      status = decisions?.get(key) === "without-labels" ? LABEL_STATUS.READY : LABEL_STATUS.NO_PDF;
      if (status === LABEL_STATUS.NO_PDF) warnings.push("Для этой позиции не загружен PDF.");
    } else if (!cut && pdf) {
      status = LABEL_STATUS.NO_CUT;
      warnings.push("Для этой позиции не загружен файл раскроя.");
    } else if (cut && pdf && decisions?.get(key) === "without-labels") {
      status = LABEL_STATUS.READY;
      warnings.push("Позиция продолжена без этикеток по явному подтверждению.");
    } else if (cut && pdf) {
      comparison = compareCutToPdf(cut, pdf);
      if (comparison.ambiguous) {
        status = LABEL_STATUS.AMBIGUOUS;
        warnings.push("Есть повторяющиеся совпадения по полному ключу детали.");
      } else if (!comparison.ok) {
        status = LABEL_STATUS.CONFLICT;
        conflictKind = "match";
      }
      warnings.push(...comparison.warnings);
    }

    const unresolvedFillings = (pdf?.fillings || []).filter((filling) => filling.status === "unresolved" || filling.status === "conflict");
    if (unresolvedFillings.length) {
      warnings.push(`Не определена толщина заполнения: ${unresolvedFillings.map((filling) => filling.status === "conflict" ? `${filling.code} (конфликт ${filling.conflictingThicknesses.join(" / ")} мм)` : `${filling.code} ${filling.rawFormula || "без основной строки"}`).join(", ")}. Печать этикеток заблокирована.`);
    }

    return {
      key,
      orderId: cut?.orderId || pdf?.orderId || "",
      productId: cut?.productId || pdf?.productId || "",
      cut,
      pdf,
      status,
      detailCount: cut?.details?.length || pdf?.details?.length || 0,
      physicalCount: sumPhysicalQuantity(cut?.details || pdf?.details || []),
      warnings: Array.from(new Set(warnings)),
      comparison,
      conflictKind
    };
  });

  const summary = {
    positions: rows.length,
    ready: rows.filter((r) => r.status === LABEL_STATUS.READY).length,
    noPdf: rows.filter((r) => r.status === LABEL_STATUS.NO_PDF).length,
    noCut: rows.filter((r) => r.status === LABEL_STATUS.NO_CUT).length,
    conflicts: rows.filter((r) => r.status === LABEL_STATUS.CONFLICT).length,
    ambiguous: rows.filter((r) => r.status === LABEL_STATUS.AMBIGUOUS).length,
    duplicates: (duplicates || []).length,
    excluded: rows.filter((r) => r.status === LABEL_STATUS.EXCLUDED).length,
    matchedRows: rows.reduce((sum, row) => sum + (Number(row.detailCount) || 0), 0),
    physicalDetails: rows.reduce((sum, row) => sum + (Number(row.physicalCount) || 0), 0)
  };

  return { rows, summary };
}

function stableLabelHash(value) {
  let hash = 2166136261;
  const text = String(value || "");
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function physicalLabelId(parts) {
  return `lbl_${stableLabelHash(parts.join("|"))}`;
}

function detailMatchKey(detail) {
  return labelDetailComparisonKey(detail);
}

function pairCutPdfDetails(cutPosition, pdfPosition) {
  const cutByKey = new Map();
  (cutPosition?.details || []).forEach((detail, index) => {
    const key = detailMatchKey(detail);
    if (!cutByKey.has(key)) cutByKey.set(key, []);
    cutByKey.get(key).push({ detail, index, remaining: normalizeLabelNumber(detail.quantity) });
  });

  const pdfByKey = new Map();
  (pdfPosition?.details || []).forEach((detail, index) => {
    const key = detailMatchKey(detail);
    if (!pdfByKey.has(key)) pdfByKey.set(key, []);
    pdfByKey.get(key).push({ detail, index, quantity: normalizeLabelNumber(detail.quantity) });
  });

  const pairs = [];
  const errors = [];
  cutByKey.forEach((cutEntries, key) => {
    const pdfEntries = pdfByKey.get(key) || [];
    if (!pdfEntries.length) {
      cutEntries.forEach((entry) => errors.push(`Не найдена PDF-строка для ${describeLabelDetail(entry.detail).raw}`));
      return;
    }

    let cutCursor = 0;
    pdfEntries.forEach((pdfEntry) => {
      let pdfRemaining = pdfEntry.quantity;
      while (pdfRemaining > 0 && cutCursor < cutEntries.length) {
        const cutEntry = cutEntries[cutCursor];
        if (cutEntry.remaining <= 0) {
          cutCursor += 1;
          continue;
        }
        const matchedQuantity = Math.min(cutEntry.remaining, pdfRemaining);
        const sourceQuantity = normalizeLabelNumber(cutEntry.detail.quantity);
        const sourceUnitStart = sourceQuantity - cutEntry.remaining + 1;
        pairs.push({
          key,
          cutDetail: cutEntry.detail,
          pdfDetail: pdfEntry.detail,
          cutIndex: cutEntry.index,
          pdfIndex: pdfEntry.index,
          matchedQuantity,
          sourceUnitStart
        });
        cutEntry.remaining -= matchedQuantity;
        pdfRemaining -= matchedQuantity;
      }
      if (pdfRemaining > 0) {
        errors.push(`Количество PDF превышает CSV для ${describeLabelDetail(pdfEntry.detail).raw}: не распределено ${pdfRemaining}.`);
      }
    });

    const cutRemaining = cutEntries.reduce((sum, entry) => sum + entry.remaining, 0);
    if (cutRemaining > 0) {
      errors.push(`Количество CSV превышает PDF для ${describeLabelDetail(cutEntries[0].detail).raw}: не распределено ${cutRemaining}.`);
    }
  });

  pdfByKey.forEach((pdfEntries, key) => {
    if (cutByKey.has(key)) return;
    pdfEntries.forEach((entry) => errors.push(`Не найдена CSV-строка для ${describeLabelDetail(entry.detail).raw}`));
  });
  return { pairs, errors };
}

function groupPhysicalRows(pairs) {
  const groups = new Map();
  (pairs || []).forEach((pair) => {
    const detail = pair.pdfDetail || pair.cutDetail;
    const key = [
      normalizeLabelText(detail.orderId),
      normalizeLabelText(detail.productId),
      detailContour(detail),
      normalizedPartKindForDetail(detail)
    ].join("|");
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        orderId: normalizeLabelText(detail.orderId),
        productId: normalizeLabelText(detail.productId),
        contour: detailContour(detail),
        partKind: normalizeLabelText(detail.partKind || inferPartKind(detail.profile || detail.name)),
        rows: []
      });
    }
    groups.get(key).rows.push(pair);
  });
  return Array.from(groups.values());
}

function repeatPhysicalUnits(rows) {
  const units = [];
  (rows || []).forEach((row, rowIndex) => {
    const quantity = normalizeLabelNumber(row.matchedQuantity ?? row.cutDetail.quantity);
    const sourceUnitStart = normalizeLabelNumber(row.sourceUnitStart) || 1;
    for (let i = 1; i <= quantity; i++) {
      units.push({ row, rowIndex, unitNo: i, sourceUnitNo: sourceUnitStart + i - 1 });
    }
  });
  return units;
}

function uniqueNumbers(values) {
  return Array.from(new Set(values.filter((value) => Number(value) > 0).map((value) => Number(value)))).sort((a, b) => a - b);
}

function groupError(group, message) {
  const title = `${group.orderId}/${group.productId}${group.contour ? ` ${group.contour}` : ""} ${group.partKind || ""}`.trim();
  return `${title}: ${message}`;
}

function groupThresholdDetails(pdfPosition, group) {
  return (pdfPosition?.allDetails || [])
    .filter((detail) => normalizeLabelText(detail.orderId) === group.orderId)
    .filter((detail) => normalizeLabelText(detail.productId) === group.productId)
    .filter((detail) => detailContour(detail) === group.contour)
    .filter(isThresholdDetail);
}

function calculateGroupDimension(group, horizontalRows, verticalRows, thresholdRows, rules) {
  const horizontalLengths = uniqueNumbers(horizontalRows.map((row) => row.cutDetail.lengthMm));
  const verticalLengths = uniqueNumbers(verticalRows.map((row) => row.cutDetail.lengthMm));
  if (!horizontalLengths.length || !verticalLengths.length) return { dimension: null, errors: [groupError(group, "не хватает горизонтальной или вертикальной пары для расчета габарита.")] };
  if (horizontalLengths.length > 1) return { dimension: null, errors: [groupError(group, `несколько горизонтальных длин в одном контуре: ${horizontalLengths.join(", ")}.`)] };
  if (verticalLengths.length > 1) return { dimension: null, errors: [groupError(group, `несколько вертикальных длин в одном контуре: ${verticalLengths.join(", ")}.`)] };

  const isDoorFrame = thresholdRows.length > 0 && normalizedPartKindForDetail(group) === "рама";
  if (isDoorFrame) {
    return {
      dimension: {
        widthMm: horizontalLengths[0] - rules.weldDimensionDeductionMm,
        heightMm: verticalLengths[0] + rules.aluminumThresholdHeightMm
      },
      errors: []
    };
  }

  return {
    dimension: {
      widthMm: horizontalLengths[0] - rules.weldDimensionDeductionMm,
      heightMm: verticalLengths[0] - rules.weldDimensionDeductionMm
    },
    errors: []
  };
}

function reinforcementText(detail) {
  const article = normalizeLabelText(detail.reinforcementArticle);
  const size = normalizeLabelNumber(detail.reinforcementSizeMm);
  const sizeText = size ? ` — ${size} мм` : "";
  return article ? `АРМ. ${article}${sizeText}` : `АРМ.${sizeText}`;
}

function createPhysicalLabel(unit, group, side, instanceNo, instanceTotal, dimension, sketch, drainageType) {
  const cutDetail = unit.row.cutDetail;
  const pdfDetail = unit.row.pdfDetail;
  const id = physicalLabelId([
    normalizeLabelText(cutDetail.orderId),
    normalizeLabelText(cutDetail.productId),
    detailContour(cutDetail),
    normalizedPartKindForDetail(cutDetail),
    normalizedProfileForDetail(cutDetail),
    normalizeLabelOrient(cutDetail.orient),
    normalizeLabelNumber(cutDetail.lengthMm),
    unit.row.cutIndex,
    unit.row.pdfIndex,
    unit.unitNo,
    side,
    instanceNo,
    instanceTotal
  ]);

  const isMullion = canonicalPartKindForDetail(pdfDetail || cutDetail) === "mullion";
  return {
    id,
    orderId: group.orderId,
    productId: group.productId,
    positionKey: labelPositionKey(group.orderId, group.productId),
    contour: group.contour,
    partKind: normalizeLabelText(pdfDetail.partKind || cutDetail.partKind),
    partKindNormalized: normalizedPartKindForDetail(pdfDetail || cutDetail),
    profile: normalizeLabelText(pdfDetail.profile || cutDetail.profile),
    orientation: isMullion ? "" : displayLabelOrient(cutDetail.orient),
    side: isMullion ? "" : side,
    drainageType: normalizeDrainageType(drainageType || pdfDetail.drainageType),
    lengthMm: normalizeLabelNumber(cutDetail.lengthMm),
    angles: normalizeLabelText(cutDetail.angles || pdfDetail.angles),
    reinforcementArticle: normalizeLabelText(pdfDetail.reinforcementArticle),
    reinforcementSizeMm: normalizeLabelNumber(pdfDetail.reinforcementSizeMm),
    reinforcementText: reinforcementText(pdfDetail),
    dimension: isMullion ? null : dimension,
    instanceNo,
    instanceTotal,
    sourcePartId: normalizeLabelText(cutDetail.sourcePartId),
    sourceUnitNo: unit.sourceUnitNo || unit.unitNo,
    sketch,
    csvSource: {
      file: cutDetail.sourceFile || "",
      rowIndex: cutDetail.sourceRowIndex || "",
      row: cutDetail.sourceRow || "",
      detail: cutDetail
    },
    pdfSource: {
      file: pdfDetail.sourceFile || "",
      pageNumber: pdfDetail.pageNumber || "",
      rowIndex: pdfDetail.sourceRowIndex || "",
      row: pdfDetail.sourceRow || "",
      detail: pdfDetail
    }
  };
}

function pushPairedUnits(labels, errors, units, group, sides, dimension, sketch, instanceTotalOverride, drainageType) {
  if (!units.length) {
    errors.push(groupError(group, `нет деталей для стороны ${sides.join("/")}.`));
    return 0;
  }
  if (units.length % 2 !== 0) {
    errors.push(groupError(group, `нечетное количество ${units.length} для сторон ${sides.join("/")}.`));
    return 0;
  }
  const pairCount = units.length / 2;
  for (let i = 0; i < units.length; i += 2) {
    const first = units[i];
    const second = units[i + 1];
    if (normalizeLabelNumber(first.row.cutDetail.lengthMm) !== normalizeLabelNumber(second.row.cutDetail.lengthMm)) {
      errors.push(groupError(group, `пара ${sides.join("/")} имеет разные длины: ${first.row.cutDetail.lengthMm} и ${second.row.cutDetail.lengthMm}.`));
      continue;
    }
    const instanceNo = i / 2 + 1;
    const instanceTotal = instanceTotalOverride || pairCount;
    labels.push(createPhysicalLabel(first, group, sides[0], instanceNo, instanceTotal, dimension, first.row.pdfDetail.sketch || sketch, drainageType));
    labels.push(createPhysicalLabel(second, group, sides[1], instanceNo, instanceTotal, dimension, second.row.pdfDetail.sketch || sketch, drainageType));
  }
  return pairCount;
}

function pushDoorFrameVerticalUnits(labels, errors, units, group, dimension, sketch, instanceTotal, drainageType) {
  const bySide = new Map([[LABEL_SIDE.LEFT, []], [LABEL_SIDE.RIGHT, []]]);
  const unknown = [];
  units.forEach((unit) => {
    const side = angleSideForDoorFrame(unit.row.cutDetail.angles || unit.row.pdfDetail.angles);
    if (side && bySide.has(side)) bySide.get(side).push(unit);
    else unknown.push(unit);
  });

  if (unknown.length) {
    return pushPairedUnits(labels, errors, units, group, [LABEL_SIDE.LEFT, LABEL_SIDE.RIGHT], dimension, sketch, instanceTotal, drainageType);
  }

  const left = bySide.get(LABEL_SIDE.LEFT);
  const right = bySide.get(LABEL_SIDE.RIGHT);
  if (left.length !== right.length) {
    errors.push(groupError(group, `количество левых и правых стоек не совпадает: ${left.length} и ${right.length}.`));
    return 0;
  }

  for (let i = 0; i < left.length; i++) {
    const instanceNo = i + 1;
    labels.push(createPhysicalLabel(left[i], group, LABEL_SIDE.LEFT, instanceNo, instanceTotal || left.length, dimension, sketch, drainageType));
    labels.push(createPhysicalLabel(right[i], group, LABEL_SIDE.RIGHT, instanceNo, instanceTotal || left.length, dimension, sketch, drainageType));
  }
  return left.length;
}

function buildPhysicalLabelsForGroup(group, pdfPosition, rules) {
  const labels = [];
  const errors = [];
  const drainageType = normalizeDrainageType(pdfPosition?.drainageType);
  if (canonicalPartKindForDetail(group) === "mullion") {
    const units = repeatPhysicalUnits(group.rows);
    units.forEach((unit, index) => {
      labels.push(createPhysicalLabel(
        unit,
        group,
        "",
        index + 1,
        units.length,
        null,
        unit.row.pdfDetail.sketch || pdfPosition?.sketch || null,
        drainageType
      ));
    });
    return { labels, errors };
  }

  const horizontalRows = group.rows.filter((row) => normalizeLabelOrient(row.cutDetail.orient) === "horizontal");
  const verticalRows = group.rows.filter((row) => normalizeLabelOrient(row.cutDetail.orient) === "vertical");
  const thresholdRows = groupThresholdDetails(pdfPosition, group);
  const isDoorFrame = thresholdRows.length > 0 && normalizedPartKindForDetail(group) === "рама";
  const dimensionResult = calculateGroupDimension(group, horizontalRows, verticalRows, thresholdRows, rules);
  errors.push(...dimensionResult.errors);
  if (!dimensionResult.dimension) return { labels, errors };

  const horizontalUnits = repeatPhysicalUnits(horizontalRows);
  const verticalUnits = repeatPhysicalUnits(verticalRows);

  if (isDoorFrame) {
    if (!horizontalUnits.length) {
      errors.push(groupError(group, "дверная рама с порогом не имеет верхней горизонтальной детали."));
    } else {
      const topTotal = horizontalUnits.length;
      horizontalUnits.forEach((unit, index) => {
        labels.push(createPhysicalLabel(unit, group, LABEL_SIDE.TOP, index + 1, topTotal, dimensionResult.dimension, pdfPosition?.sketch || null, drainageType));
      });
    }
    pushDoorFrameVerticalUnits(labels, errors, verticalUnits, group, dimensionResult.dimension, pdfPosition?.sketch || null, horizontalUnits.length || 0, drainageType);
    return { labels, errors };
  }

  const horizontalPairs = pushPairedUnits(labels, errors, horizontalUnits, group, [LABEL_SIDE.TOP, LABEL_SIDE.BOTTOM], dimensionResult.dimension, pdfPosition?.sketch || null, undefined, drainageType);
  const verticalPairs = pushPairedUnits(labels, errors, verticalUnits, group, [LABEL_SIDE.LEFT, LABEL_SIDE.RIGHT], dimensionResult.dimension, pdfPosition?.sketch || null, undefined, drainageType);
  if (horizontalPairs && verticalPairs && horizontalPairs !== verticalPairs) {
    errors.push(groupError(group, `число комплектов по горизонтали и вертикали различается: ${horizontalPairs} и ${verticalPairs}.`));
  }
  return { labels, errors };
}

function buildPhysicalLabelsForReviewRows(rows, options = {}) {
  const rules = { ...LABEL_RULES, ...(options.rules || {}) };
  const labels = [];
  const errors = [];
  const byPosition = new Map();

  (rows || []).forEach((row) => {
    if (row.status !== LABEL_STATUS.READY || !row.cut || !row.pdf || row.warnings?.some((warning) => normalizeLabelKey(warning).includes("безэтикеток"))) {
      return;
    }
    const matched = pairCutPdfDetails(row.cut, row.pdf);
    errors.push(...matched.errors.map((message) => `${row.key}: ${message}`));
    const groups = groupPhysicalRows(matched.pairs);
    groups.forEach((group) => {
      const built = buildPhysicalLabelsForGroup(group, row.pdf, rules);
      built.labels.forEach((label) => {
        label.fillings = (row.pdf.fillings || []).map((filling) => ({
          ...filling,
          components: (filling.components || []).map((component) => ({ ...component })),
          sourceRows: [...(filling.sourceRows || [])],
          unresolvedComponents: (filling.unresolvedComponents || []).map((component) => ({ ...component }))
        }));
        label.fillThicknesses = [...(row.pdf.fillThicknesses || uniqueFillingThicknesses(row.pdf.fillings))];
      });
      labels.push(...built.labels);
      errors.push(...built.errors);
    });
  });

  labels.forEach((label) => {
    if (!byPosition.has(label.positionKey)) byPosition.set(label.positionKey, []);
    byPosition.get(label.positionKey).push(label);
  });

  return {
    labels,
    errors,
    byPosition,
    summary: {
      total: labels.length,
      positions: byPosition.size
    }
  };
}

function labelIdFromPiece(piece) {
  return normalizeLabelText(piece?.labelId || piece?.physicalLabel?.id);
}

function claimQueueLabels(labelIds, labelsById, used, duplicateClaims) {
  const claimedIds = [];
  const labels = [];
  (labelIds || []).forEach((labelId) => {
    const id = normalizeLabelText(labelId);
    if (!id) return;
    if (used.has(id)) {
      duplicateClaims.add(id);
      return;
    }
    used.add(id);
    claimedIds.push(id);
    labels.push(labelsById.get(id) || { id });
  });
  return { labelIds: claimedIds, labels };
}

function buildLabelQueuesFromOptimizeState(input = {}) {
  const physicalLabels = input.physicalLabels || [];
  const groups = input.groups || [];
  const lastExportResults = input.lastExportResults || new Map();
  const manualGroups = input.manualGroups || [];
  const excludedLabelCount = Number(input.excludedLabelCount || 0);
  const labelsById = new Map(physicalLabels.map((label) => [label.id, label]));
  const used = new Set();
  const duplicateClaims = new Set();
  const auto = [];
  const manual = [];
  const cyclesWithoutLabels = [];
  const cyclesModeMismatch = [];

  const orderedGroups = groups
    .map((group, index) => ({ group, index }))
    .sort((a, b) => {
      const kindA = canonicalPartKindForDetail({
        partKind: a.group.partKind,
        name: a.group.title
      });
      const kindB = canonicalPartKindForDetail({
        partKind: b.group.partKind,
        name: b.group.title
      });
      const priorityA = LABEL_PART_KIND_ORDER[kindA] || Number.MAX_SAFE_INTEGER;
      const priorityB = LABEL_PART_KIND_ORDER[kindB] || Number.MAX_SAFE_INTEGER;
      return priorityA - priorityB || a.index - b.index;
    })
    .map((entry) => entry.group);

  orderedGroups.forEach((group) => {
    const result = lastExportResults.get(group.title);
    if (!result) return;
    const mode = group.mode === "double" ? "double" : "single";
    const profile = group.title || "";
    const profileCode = group.profileCode || "";
    const profileQueue = {
      profile,
      profileCode,
      bars: []
    };

    (result.bins || []).forEach((bin, binIndex) => {
      const bar = {
        barNo: binIndex + 1,
        cycles: []
      };
      (bin.parts || []).forEach((part, partIndex) => {
        const metaArr = Array.isArray(part.meta) ? part.meta : [part.meta];
        const candidates = metaArr.map(labelIdFromPiece).filter(Boolean);
        const claimed = claimQueueLabels(candidates, labelsById, used, duplicateClaims);
        const labelIds = claimed.labelIds;
        const labels = claimed.labels;
        const requiredLabels = mode === "double" ? 2 : 1;
        const cycle = {
          profile,
          profileCode,
          barNo: bar.barNo,
          cycleNo: partIndex + 1,
          globalCycleNo: auto.reduce((sum, item) => sum + item.bars.reduce((barSum, b) => barSum + b.cycles.length, 0), 0) + bar.cycles.length + 1,
          lengthMm: normalizeLabelNumber(part.length),
          mode,
          requiredLabels,
          labelIds,
          labels
        };
        if (!labelIds.length) cyclesWithoutLabels.push(cycle);
        if (labelIds.length !== requiredLabels || new Set(labelIds).size !== labelIds.length) {
          cyclesModeMismatch.push(cycle);
        }
        bar.cycles.push(cycle);
      });
      profileQueue.bars.push(bar);
    });
    auto.push(profileQueue);
  });

  let manualNo = 1;
  manualGroups.forEach((group) => {
    (group.pieces || []).forEach((piece) => {
      const candidate = labelIdFromPiece(piece);
      const claimed = claimQueueLabels(candidate ? [candidate] : [], labelsById, used, duplicateClaims);
      const labelId = claimed.labelIds[0] || "";
      manual.push({
        no: manualNo,
        reason: group.reason || piece.manualReason || "",
        profile: group.title || piece.title || "",
        lengthMm: normalizeLabelNumber(piece.lengthMm || piece.length),
        labelId,
        label: claimed.labels[0] || null
      });
      manualNo += 1;
    });
  });

  const duplicateLabelIds = Array.from(duplicateClaims);
  const usedIds = used;
  const lostLabelIds = physicalLabels
    .map((label) => label.id)
    .filter((id) => !usedIds.has(id));

  const autoLabelCount = auto.reduce((sum, profile) => (
    sum + profile.bars.reduce((barSum, bar) => (
      barSum + bar.cycles.reduce((cycleSum, cycle) => cycleSum + cycle.labelIds.length, 0)
    ), 0)
  ), 0);
  const manualLabelCount = manual.filter((item) => item.labelId).length;
  const totalPhysicalLabels = physicalLabels.length;
  const balanceOk = totalPhysicalLabels === autoLabelCount + manualLabelCount + excludedLabelCount;

  const errors = [];
  if (lostLabelIds.length) errors.push(`Потерянные labelId: ${lostLabelIds.length}`);
  if (duplicateLabelIds.length) errors.push(`Повторно использованные labelId: ${duplicateLabelIds.length}`);
  if (cyclesWithoutLabels.length) errors.push(`Циклы без этикеток: ${cyclesWithoutLabels.length}`);
  if (cyclesModeMismatch.length) errors.push(`Несоответствие количества этикеток режиму: ${cyclesModeMismatch.length}`);
  if (!balanceOk) errors.push("Итоговая проверка количества этикеток не сошлась.");

  return {
    auto,
    manual,
    validation: {
      ready: errors.length === 0,
      errors,
      totalPhysicalLabels,
      autoLabelCount,
      manualLabelCount,
      excludedLabelCount,
      lostLabelIds,
      duplicateLabelIds,
      cyclesWithoutLabels,
      labelsWithoutCycle: lostLabelIds,
      cyclesModeMismatch,
      balanceOk
    }
  };
}

function buildJobPrintSequence(queue) {
  const entries = [];
  let printIndex = 1;
  let printRowIndex = 0;

  (queue?.auto || []).forEach((profile, profileIndex) => {
    (profile.bars || []).forEach((bar) => {
      (bar.cycles || []).forEach((cycle) => {
        const mode = cycle.mode === "double" ? "double" : "single";
        const requiredLabels = mode === "double" ? 2 : 1;
        const labels = cycle.labels || [];
        const labelIds = cycle.labelIds || [];

        for (let slotIndex = 0; slotIndex < requiredLabels; slotIndex++) {
          const label = labels[slotIndex] || null;
          const labelId = normalizeLabelText(labelIds[slotIndex] || label?.id);
          if (!label || !labelId) continue;
          entries.push({
            printIndex,
            profileIndex: profileIndex + 1,
            profile: profile.profile || "",
            sheetIndex: bar.barNo,
            cycleIndex: cycle.cycleNo,
            slot: mode === "double" ? (slotIndex === 0 ? "A" : "B") : "single",
            labelId,
            side: normalizeLabelText(label.side),
            lengthMm: normalizeLabelNumber(label.lengthMm || cycle.lengthMm),
            label,
            gridCellIndex: printRowIndex * 2 + slotIndex
          });
          printIndex += 1;
        }
        printRowIndex += 1;
      });
    });
  });

  let manualCellIndex = printRowIndex * 2;
  (queue?.manual || []).forEach((item) => {
    const label = item.label || null;
    const labelId = normalizeLabelText(item.labelId || label?.id);
    if (!label || !labelId) return;

    entries.push({
      printIndex,
      profileIndex: 0,
      profile: item.profile || "",
      sheetIndex: "manual",
      cycleIndex: item.no,
      slot: "manual",
      labelId,
      side: normalizeLabelText(label.side),
      lengthMm: normalizeLabelNumber(label.lengthMm || item.lengthMm),
      label,
      gridCellIndex: manualCellIndex
    });
    printIndex += 1;
    manualCellIndex += 1;
  });

  return entries;
}

function paginatePhysicalLabelEntries(entries, pageSize = 16) {
  const size = Math.max(1, Math.floor(Number(pageSize) || 16));
  const physicalEntries = (entries || []).filter((entry) => entry?.label);
  const pages = [];
  for (let start = 0; start < physicalEntries.length; start += size) {
    const pageEntries = physicalEntries.slice(start, start + size);
    if (!pageEntries.length) break;
    pages.push(pageEntries);
  }
  return pages;
}

window.LabelData = {
  LABEL_STATUS,
  LABEL_RULES,
  LABEL_SIDE,
  LABEL_DRAINAGE_TYPE,
  FILL_THICKNESS_DICTIONARY_KEY,
  IGNORED_FILLING_COMPONENTS,
  LABEL_PART_KIND_ORDER,
  normalizeLabelText,
  normalizeLabelKey,
  normalizeLabelNumber,
  normalizeLabelOrient,
  normalizeDrainageType,
  normalizeFillingFormula,
  parseStrictFillingThickness,
  parseExplicitFillingThickness,
  isIgnoredFillingComponent,
  resolveFillingEntries,
  resolveFillingGroups,
  uniqueFillingThicknesses,
  formatFillingThickness,
  readFillThicknessDictionary,
  writeFillThicknessDictionary,
  isOutsideDrainageLabel,
  displayLabelOrient,
  inferPartKind,
  normalizedPartKindForDetail,
  normalizedProfileForDetail,
  normalizedComparableProfileForDetail,
  canonicalPartKindForDetail,
  isLabelScopeDetail,
  isThresholdDetail,
  normalizeLabelAngles,
  angleSideForDoorFrame,
  labelPositionKey,
  labelDetailKey,
  describeLabelDetail,
  sumPhysicalQuantity,
  detailSignature,
  buildCutPositions,
  mergePositionIntoStore,
  collectStoresFromCutFiles,
  collectStoresFromPdfFiles,
  compareCutToPdf,
  buildLabelKitReview,
  buildPhysicalLabelsForReviewRows,
  buildLabelQueuesFromOptimizeState,
  buildJobPrintSequence,
  paginatePhysicalLabelEntries
};
