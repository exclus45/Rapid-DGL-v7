import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const appSource = await readFile(new URL("../app.js", import.meta.url), "utf8");
const profilesSource = await readFile(new URL("../profiles.js", import.meta.url), "utf8");
const optimizerSource = await readFile(new URL("../optimizer.js", import.meta.url), "utf8");

function functionSource(name, nextName) {
  const start = appSource.indexOf(`function ${name}(`);
  const end = appSource.indexOf(`function ${nextName}(`, start + 1);
  assert(start >= 0 && end > start, `Не удалось извлечь ${name} из app.js`);
  return appSource.slice(start, end);
}

function functionSourceUntil(name, marker) {
  const start = appSource.indexOf(`function ${name}(`);
  const end = appSource.indexOf(marker, start + 1);
  assert(start >= 0 && end > start, `Не удалось извлечь ${name} из app.js`);
  return appSource.slice(start, end);
}

const sources = [
  functionSource("normalizeProfileRuleKey", "resolveAppCatalogProfile"),
  functionSource("resolveAppCatalogProfile", "profileDisplayNameForCode"),
  functionSource("profileDisplayNameForCode", "getOptimizeRulesForProfile"),
  functionSource("getOptimizeRulesForProfile", "getOptimizeRulesForPieces"),
  functionSource("applyCatalogProfileToRemnant", "validateProfileRemnant"),
  functionSource("getProfileRemnantChoices", "profileRemnantImportReportHtml"),
  functionSource("expandPhysicalProfileRemnants", "sortParts"),
  functionSource("sortParts", "normalizeGroupText"),
  functionSource("normalizeGroupText", "normalizeGroupKey"),
  functionSource("normalizeGroupKey", "canonicalGroupName"),
  functionSource("canonicalGroupName", "groupByNomenclature"),
  functionSource("groupByNomenclature", "normalizeAngles"),
  functionSource("normalizeAngles", "sanitizeDigits"),
  functionSource("extractProfileBase", "parseAnglePair"),
  functionSource("isMullionPart", "isSkewPart"),
  functionSource("isSkewPart", "renderGroupTable"),
  functionSource("normalizeOrientKind", "fallbackDesignationForKind"),
  functionSource("fallbackDesignationForKind", "sideDesignationsForKind"),
  functionSource("sideDesignationsForKind", "physicalLabelPositionKey"),
  functionSource("createPhysicalPiece", "makeLabelWarning"),
  functionSource("makeLabelWarning", "expandPartsToPieces"),
  functionSource("expandPartsToPieces", "buildPhysicalLabelPool"),
  functionSource("buildOptimizeData", "buildLeftoverSkewItems"),
  functionSource("buildLeftoverSkewItems", "renderOptimize"),
  functionSource("doublePairKey", "buildExportGroups"),
  functionSourceUntil("splitPairedBins", "optimizeBtn.addEventListener")
];

const context = vm.createContext({
  console,
  DEFAULT_MODE: "double",
  PART_KIND_ORDER: Object.freeze({ sash: 1, frame: 2, mullion: 3 }),
  optimizeCache: { groups: [], skewGroups: [] },
  profileRemnants: []
});
context.window = context;
vm.runInContext(profilesSource, context, { filename: "profiles.js" });
vm.runInContext(`
  const PROFILE_BAD_LEFTOVER_RULES = {
    S35801: { scrapMax: 70, minUsefulLeftover: 650 },
    XS35801: { scrapMax: 70, minUsefulLeftover: 650 },
    S35816: { scrapMax: 70, minUsefulLeftover: 650 },
    S57111: { scrapMax: 70, minUsefulLeftover: 650 },
    S67011: { scrapMax: 70, minUsefulLeftover: 650 },
    S35802: { scrapMax: 70, minUsefulLeftover: 550 },
    S57122: { scrapMax: 70, minUsefulLeftover: 550 },
    S67002: { scrapMax: 70, minUsefulLeftover: 550 },
    XS35802: { scrapMax: 70, minUsefulLeftover: 550 }
  };
  ${sources.join("\n")}
`, context, { filename: "app-routing-functions.js" });
vm.runInContext(optimizerSource, context, { filename: "optimizer.js" });

function part({ id, name, profileCode, partKind, quantity, angles, orient }) {
  return {
    id,
    orderId: "3475",
    productId: "1",
    name,
    profileCode,
    partKind,
    quantity,
    lengthMm: partKind === "mullion" ? 1265 : 1000,
    angles,
    orient,
    contour: "К1"
  };
}

const frame = part({
  id: "frame",
  name: "Рама оконная 63 мм (ProWin)",
  profileCode: "XS358.01",
  partKind: "frame",
  quantity: 4,
  angles: "45-45",
  orient: "Горизонталь"
});
const sash = part({
  id: "sash",
  name: "Створка оконная 77 мм (ProWin)",
  profileCode: "XS358.02",
  partKind: "sash",
  quantity: 8,
  angles: "45-45",
  orient: "Вертикаль"
});
const mullion = part({
  id: "mullion",
  name: "Импост 82 мм (ProWin)",
  profileCode: "XS358.03",
  partKind: "mullion",
  quantity: 1,
  angles: "90-90",
  orient: ""
});

const profileOrderPermutations = [
  [frame, sash, mullion],
  [frame, mullion, sash],
  [sash, frame, mullion],
  [sash, mullion, frame],
  [mullion, frame, sash],
  [mullion, sash, frame]
];
for (const inputParts of profileOrderPermutations) {
  assert.deepEqual(
    Array.from(context.groupByNomenclature(inputParts), (group) => group.partKind),
    ["sash", "frame", "mullion"]
  );
  assert.deepEqual(
    Array.from(context.buildOptimizeData(inputParts).groups, (group) => group.partKind),
    ["sash", "frame", "mullion"]
  );
}
const legacyPart = {
  ...frame,
  id: "legacy-order",
  profileId: "",
  profileCode: "LEGACY.01",
  name: "Legacy профиль",
  partKind: ""
};
assert.deepEqual(
  Array.from(context.groupByNomenclature([legacyPart, mullion, frame, sash]), (group) => group.partKind),
  ["sash", "frame", "mullion", ""]
);
console.log("OK единый порядок групп всегда sash → frame → mullion → legacy независимо от входных строк");

const frameRepresentations = [
  { ...frame, id: "frame-base", profileId: "", profileCode: "XS358.01", name: "legacy text" },
  { ...frame, id: "frame-rapid", profileId: "", profileCode: "00XS358.01", name: "legacy text" },
  { ...frame, id: "frame-name", profileId: "", profileCode: "", name: "Рама оконная 63 мм (ProWin)" },
  { ...frame, id: "frame-alias", profileId: "", profileCode: "", name: "Рама ок/дверн 63 мм (ProWin)" }
];
const catalogGroup = context.groupByNomenclature(frameRepresentations)[0];
assert.equal(context.groupByNomenclature(frameRepresentations).length, 1);
assert.equal(catalogGroup.profileId, "XS358.01");
assert.equal(catalogGroup.profileCode, "XS358.01");
assert.equal(catalogGroup.name, "Рама оконная 63 мм (ProWin)");
assert.equal(catalogGroup.partKind, "frame");
const reversedCatalogGroup = context.groupByNomenclature([...frameRepresentations].reverse())[0];
assert.equal(reversedCatalogGroup.profileCode, catalogGroup.profileCode);
assert.equal(reversedCatalogGroup.name, catalogGroup.name);
console.log("OK base, RAPID-код, название и алиас образуют одну независимую от порядка каталоговую группу");

const sharedStockParts = [
  { ...frame, id: "base-1356", profileId: "XS358.01", optimizationProfileId: "XS358.01", profileCode: "XS358.01", lengthMm: 1356, quantity: 1 },
  { ...frame, id: "base-1306", profileId: "XS358.01", optimizationProfileId: "XS358.01", profileCode: "XS358.01", lengthMm: 1306, quantity: 1 },
  { ...frame, id: "door-2006", orderId: "5220", profileId: "XS358.01 D", optimizationProfileId: "XS358.01", profileCode: "XS358.01 D", lengthMm: 2006, quantity: 1 },
  { ...frame, id: "door-906", orderId: "5220", profileId: "XS358.01 D", optimizationProfileId: "XS358.01", profileCode: "XS358.01 D", lengthMm: 906, quantity: 1 }
];
assert.equal(context.groupByNomenclature(sharedStockParts).length, 2);
assert.deepEqual(
  Array.from(sharedStockParts, (item) => item.profileCode),
  ["XS358.01", "XS358.01", "XS358.01 D", "XS358.01 D"]
);
const sharedStockData = context.buildOptimizeData(sharedStockParts);
assert.equal(sharedStockData.groups.length, 1);
assert.equal(sharedStockData.groups[0].profileId, "XS358.01");
assert.equal(sharedStockData.groups[0].profileCode, "XS358.01");
assert.equal(sharedStockData.groups[0].total, 4);
assert.deepEqual(
  Array.from(new Set(sharedStockData.groups[0].pieces.map((piece) => piece.profileCode))).sort(),
  ["XS358.01", "XS358.01 D"]
);
const sharedStockRules = context.getOptimizeRulesForProfile("XS358.01 D");
assert.deepEqual(
  { scrapMax: sharedStockRules.scrapMax, minUsefulLeftover: sharedStockRules.minUsefulLeftover },
  { scrapMax: 70, minUsefulLeftover: 650 }
);
const sharedStockResult = context.optimizeCut(
  sharedStockData.groups[0].pieces.map((piece) => ({ lengthMm: piece.lengthMm, qty: 1, meta: piece })),
  6500,
  5,
  sharedStockRules
);
assert.equal(sharedStockResult.bins.length, 1);
assert.deepEqual(
  Array.from(new Set(sharedStockResult.bins[0].parts.map((item) => item.meta.profileCode))).sort(),
  ["XS358.01", "XS358.01 D"]
);
console.log("OK XS358.01 и XS358.01 D сохраняются отдельно, но используют одну группу и общий хлыст");

for (const profile of Array.from(context.PROFILE_CATALOG)) {
  const optimization = profile.optimization;
  const expectedRule = optimization.scrapMax === null || optimization.minUsefulLeftover === null
    ? null
    : `${optimization.scrapMax}/${optimization.minUsefulLeftover}`;
  for (const value of [profile.articleBase, profile.rapidCode, profile.name, ...profile.aliases]) {
    const rule = context.getOptimizeRulesForProfile(value);
    const actualRule = rule ? `${rule.scrapMax}/${rule.minUsefulLeftover}` : null;
    assert.equal(actualRule, expectedRule, `Неверное правило для ${value}`);
  }
}
assert.equal(context.getOptimizeRulesForProfile("XS358.01").minUsefulLeftover, 650);
assert.equal(context.getOptimizeRulesForProfile("XS358.02").minUsefulLeftover, 550);
assert.equal(context.getOptimizeRulesForProfile("S358.10").scrapMax, 100);
assert.equal(context.getOptimizeRulesForProfile("XS358.03").scrapMax, 50);
assert.equal(context.getOptimizeRulesForProfile("XS358.03").minUsefulLeftover, 400);
console.log("OK все известные правила четырёх категорий берутся из каталога");

const catalogApi = context.ProfileCatalog;
context.ProfileCatalog = null;
assert.equal(context.getOptimizeRulesForProfile("XS358.01").minUsefulLeftover, 650);
assert.equal(
  context.canonicalGroupName({ name: "Створка дверная Т 106 мм", profileCode: "legacy" }),
  "Створка дверная Т 106 мм (Experta T)"
);
context.ProfileCatalog = catalogApi;
console.log("OK старые таблица правил и canonicalGroupName сохранены как compatibility fallback");

assert.equal(context.isSkewPart(mullion), false);
assert.equal(context.groupByNomenclature([mullion])[0].name, "Импост 82 мм (ProWin)");
console.log("OK mullion 90/90 отображается как каталоговый профиль, а не косой элемент");

const expandedMullion = context.expandPartsToPieces([mullion], mullion.name);
assert.equal(expandedMullion.pieces.length, 1);
assert.equal(expandedMullion.warnings.length, 0);
assert.equal(expandedMullion.pieces[0].labelDesignation, "ИМПОСТ");
assert.notEqual(expandedMullion.pieces[0].doublePairBlocked, true);
console.log("OK одиночный mullion не требует стороны и не создаёт предупреждение нечётной пары");

const order3475 = context.buildOptimizeData([frame, sash, mullion]);
assert.equal(order3475.groups.length, 3);
assert.equal(order3475.groups.reduce((sum, group) => sum + group.total, 0), 13);
assert(order3475.groups.filter((group) => group.partKind !== "mullion").every((group) => group.mode === "double"));
assert.equal(order3475.skewGroups.length, 0);
assert.equal("deferredGroups" in order3475, false);
const mullionGroup = order3475.groups.find((group) => group.profileCode === "XS358.03");
assert(mullionGroup);
assert.equal(mullionGroup.profileId, "XS358.03");
assert.equal(mullionGroup.partKind, "mullion");
assert.equal(mullionGroup.total, 1);
assert.equal(mullionGroup.mode, "single");
assert.equal("modeLocked" in mullionGroup, false);
assert.equal(mullionGroup.pieces[0].angles, "90-90");
assert.deepEqual(Array.from(context.buildLeftoverSkewItems([mullionGroup])), []);
assert.equal(context.getOptimizeRulesForProfile(mullionGroup.profileCode).scrapMax, 50);
assert.equal(context.getOptimizeRulesForProfile(mullionGroup.profileCode).minUsefulLeftover, 400);
assert.equal(order3475.labelWarnings.length, 0);
console.log("OK структура 3475 сохраняет frame 4 и sash 8, а mullion 1 включает в automatic single с 50/400");

const renderOptimizeSource = functionSource("renderOptimize", "buildManualQueueGroups");
assert(renderOptimizeSource.includes('<option value="single"'));
assert(renderOptimizeSource.includes('<option value="double"'));
assert(!renderOptimizeSource.includes("modeLocked"));
assert(!appSource.includes("buildMullionDoubleResult("));
console.log("OK UI mullion использует общий select single/double, а double использует общий парный контур");

function mullionGroupForQuantity(quantity) {
  const source = { ...mullion, id: `mullion-${quantity}`, quantity };
  return context.buildOptimizeData([source]).groups[0];
}

for (const quantity of [2, 4]) {
  const group = mullionGroupForQuantity(quantity);
  group.mode = "double";
  const result = context.buildDoublePairs(group.pieces);
  assert.equal(result.paired.length, quantity / 2);
  assert.equal(result.leftovers.length, 0);
  assert.equal(context.buildLeftoverSkewItems([group]).length, 0);
}
console.log("OK 2 и 4 импоста полностью обрабатываются парами в double");

const oddMullionGroup = mullionGroupForQuantity(3);
oddMullionGroup.mode = "double";
const oddMullionResult = context.buildDoublePairs(oddMullionGroup.pieces);
assert.equal(oddMullionResult.paired.length, 1);
assert.equal(oddMullionResult.leftovers.length, 1);
assert.equal(oddMullionResult.paired.flatMap((pair) => pair.meta).length, 2);
const oddManualItems = context.buildLeftoverSkewItems([oddMullionGroup]);
assert.equal(oddManualItems.length, 1);
assert.equal(oddManualItems[0].manualReason, "не сформирована пара двойного режима");
assert.equal(context.expandPartsToPieces([{ ...mullion, quantity: 3 }], mullion.name).warnings.length, 0);
assert(oddMullionGroup.pieces.every((piece) => piece.labelDesignation === "ИМПОСТ"));
console.log("OK 3 импоста дают одну double-пару и одну ручную деталь без сторон и предупреждений");

const incompatibleMullionGroup = mullionGroupForQuantity(4);
incompatibleMullionGroup.mode = "double";
incompatibleMullionGroup.pieces[2].lengthMm = 1000;
const incompatiblePairing = context.buildDoublePairs(incompatibleMullionGroup.pieces);
assert.equal(incompatiblePairing.paired.length, 1);
assert.equal(incompatiblePairing.leftovers.length, 2);
assert.equal(context.buildLeftoverSkewItems([incompatibleMullionGroup]).length, 2);
assert.equal(incompatiblePairing.paired.flatMap((pair) => pair.meta).length, 2);
console.log("OK несовместимые mullion не попадают на автоматические хлысты и уходят в ручной режим");

const samePiecesSingleGroup = { ...incompatibleMullionGroup, mode: "single" };
assert.equal(context.buildLeftoverSkewItems([samePiecesSingleGroup]).length, 0);
assert.equal(samePiecesSingleGroup.pieces.length, 4);
console.log("OK в single те же mullion остаются автоматическими без требования пары");

context.optimizeCache = { groups: order3475.groups, skewGroups: [] };
const mullionChoice = Array.from(context.getProfileRemnantChoices()).find(
  (choice) => choice.profileCode === "XS358.03"
);
assert(mullionChoice);
assert.deepEqual(
  {
    profileId: mullionChoice.profileId,
    profileCode: mullionChoice.profileCode,
    name: mullionChoice.name,
    partKind: mullionChoice.partKind
  },
  {
    profileId: "XS358.03",
    profileCode: "XS358.03",
    name: "Импост 82 мм (ProWin)",
    partKind: "mullion"
  }
);
context.profileRemnants = [{
  id: "manual-mullion",
  label: "И-1",
  profileCode: "00XS358.03",
  lengthMm: 1270,
  quantity: 1,
  note: ""
}];
const physicalMullionRemnant = context.expandPhysicalProfileRemnants()[0];
assert.equal(physicalMullionRemnant.profileId, "XS358.03");
assert.equal(physicalMullionRemnant.profileCode, "XS358.03");
assert.equal(physicalMullionRemnant.name, "Импост 82 мм (ProWin)");
assert.equal(physicalMullionRemnant.partKind, "mullion");
console.log("OK ручной остаток mullion канонизируется для двухэтапной оптимизации");

const expandedFrame = context.expandPartsToPieces([frame], frame.name);
assert.equal(expandedFrame.pieces.length, 4);
assert.deepEqual(
  Array.from(expandedFrame.pieces, (piece) => piece.labelDesignation),
  ["ВЕРХ", "НИЗ", "ВЕРХ", "НИЗ"]
);
assert.equal(expandedFrame.warnings.length, 0);

const oddFrame = { ...frame, id: "odd-frame", quantity: 1 };
assert(context.expandPartsToPieces([oddFrame], oddFrame.name).warnings.some(
  (warning) => warning.includes("нечетное количество")
));
assert.equal(context.isSkewPart({
  ...mullion,
  id: "legacy",
  profileId: "",
  profileCode: "LEGACY.90",
  name: "Неизвестный профиль",
  partKind: ""
}), true);
console.log("OK прежняя парная логика frame/sash и fallback неизвестных косых элементов сохранены");
