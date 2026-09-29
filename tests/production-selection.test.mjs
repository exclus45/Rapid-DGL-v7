import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const appSource = await readFile(new URL("../app.js", import.meta.url), "utf8");
const profilesSource = await readFile(new URL("../profiles.js", import.meta.url), "utf8");
const productionOrderSource = await readFile(new URL("../production-order.js", import.meta.url), "utf8");

function functionSource(name, nextName) {
  const start = appSource.indexOf(`function ${name}(`);
  const end = appSource.indexOf(`function ${nextName}(`, start + 1);
  assert(start >= 0 && end > start, `Не удалось извлечь ${name} из app.js`);
  return appSource.slice(start, end);
}

const selectedProductionGroups = new Map();
const collapsedImportGroups = new Set();
const context = vm.createContext({
  console,
  selectedProductionGroups,
  collapsedImportGroups,
  allParts: [],
  pdfFilesMap: new Map(),
  LabelData: {
    detailSignature(details) {
      return details.map((detail) => detail.profile || detail.profileCode || "").sort().join("|");
    }
  },
  isSkewPart: () => false
});
context.window = context;
vm.runInContext(profilesSource, context, { filename: "profiles.js" });
vm.runInContext(productionOrderSource, context, { filename: "production-order.js" });
vm.runInContext([
  functionSource("resolveAppCatalogProfile", "profileDisplayNameForCode"),
  functionSource("normalizeGroupText", "normalizeGroupKey"),
  functionSource("normalizeGroupKey", "canonicalGroupName"),
  functionSource("canonicalGroupName", "groupByNomenclature"),
  functionSource("groupByNomenclature", "groupByOptimizationProfile"),
  functionSource("groupByOptimizationProfile", "normalizeAngles"),
  functionSource("selectedReinforcementPdfPositionsForProduction", "vetPositionsForLoad")
].join("\n"), context, { filename: "production-selection-functions.js" });

function part(id, profileCode, quantity = 1) {
  const profile = context.ProfileCatalog.findProfile(profileCode);
  return {
    id,
    profileId: profile.profileId,
    optimizationProfileId: profile.optimizationProfileId,
    profileCode: profile.articleBase,
    name: profile.name,
    partKind: profile.kind,
    quantity,
    lengthMm: 1000,
    angles: "45-45"
  };
}

const baseFrame = part("base", "XS358.01", 2);
const doorFrame = part("door", "XS358.01 D", 3);
const sash = part("sash", "XS358.02", 4);
const importedParts = [baseFrame, doorFrame, sash];

context.syncProductionGroupSelection(importedParts, true);
assert.equal(selectedProductionGroups.size, 3);
assert(Array.from(selectedProductionGroups.values()).every(Boolean));
console.log("OK после нового импорта все исходные профильные группы выбраны");

const baseKey = context.sourceProductionGroupIdentity(baseFrame).key;
const doorKey = context.sourceProductionGroupIdentity(doorFrame).key;
assert.notEqual(baseKey, doorKey);
collapsedImportGroups.add(doorKey);
selectedProductionGroups.set(doorKey, false);
assert(collapsedImportGroups.has(doorKey));

const productionParts = Array.from(context.getSelectedProductionParts(importedParts));
assert.equal(importedParts.length, 3);
assert.deepEqual(productionParts.map((item) => item.id), ["base", "sash"]);
assert.equal(context.groupByNomenclature(importedParts).length, 3);
console.log("OK выключенная исходная группа остаётся в импортном наборе, но исключается из производственного");

const selectedPdfPositions = Array.from(context.getSelectedProductionPdfPositions([{
  key: "4972 / 1",
  details: [
    { profileCode: "XS358.01", profile: "Рама оконная 63 мм (ProWin)", reinforcementArticle: "KBE 207 (1,4)", reinforcementSizeMm: 1886 },
    { profileCode: "XS358.01 D", profile: "Рама окон-дверь 63 мм (ProWin)", reinforcementArticle: "KBE D", reinforcementSizeMm: 1886 },
    { profileCode: "XS358.02", profile: "Створка оконная 77 мм (ProWin)" }
  ]
}]));
assert.equal(selectedPdfPositions.length, 1);
assert.deepEqual(selectedPdfPositions[0].details.map((detail) => detail.profileCode), ["XS358.01", "XS358.02"]);
assert(!selectedPdfPositions[0].details.some((detail) => detail.reinforcementArticle === "KBE D"));
console.log("OK отключённая исходная группа отфильтровывается и из PDF-стороны очереди этикеток");

context.allParts = importedParts;
context.pdfFilesMap.set("pdf", {
  positions: [{
    key: "4972 / 1",
    allDetails: [
      { profileCode: "XS358.01", profile: "Рама оконная 63 мм (ProWin)", reinforcementArticle: "KBE 207 (1,4)", reinforcementSizeMm: 1886 },
      { profileCode: "XS358.01 D", profile: "Рама окон-дверь 63 мм (ProWin)", reinforcementArticle: "KBE D", reinforcementSizeMm: 1886 },
      { profileCode: "XS358.02", profile: "Створка оконная 77 мм (ProWin)", reinforcementArticle: "KBE 737 (1,4)", reinforcementSizeMm: 1185 }
    ]
  }]
});
const productionReinforcementPositions = Array.from(context.selectedReinforcementPdfPositionsForProduction());
assert.deepEqual(
  productionReinforcementPositions[0].allDetails.map((detail) => detail.reinforcementArticle),
  ["KBE 207 (1,4)", "KBE 737 (1,4)"]
);
console.log("OK выключенный профиль не передаёт армирование в отдельный производственный блок");

const bothFrameOptimizationGroups = context.groupByOptimizationProfile([baseFrame, doorFrame]);
assert.equal(bothFrameOptimizationGroups.length, 1);
assert.equal(bothFrameOptimizationGroups[0].items.length, 2);
const selectedFrameOptimizationGroups = context.groupByOptimizationProfile(
  productionParts.filter((item) => item.partKind === "frame")
);
assert.equal(selectedFrameOptimizationGroups.length, 1);
assert.equal(selectedFrameOptimizationGroups[0].items.length, 1);
assert.equal(selectedFrameOptimizationGroups[0].items[0].profileId, "XS358.01");
console.log("OK XS358.01 и XS358.01 D независимы при выборе и объединяются только когда обе включены");

assert(appSource.includes('class="production-group-checkbox"'));
assert(appSource.includes("renderOptimize(productionParts)"));
assert(appSource.includes("parts: fileInfo.parts.filter(isProductionGroupSelected)"));
assert(appSource.includes("(position.details || []).filter(isProductionGroupSelected)"));
assert(appSource.includes("invalidateProductionRun();"));
assert(appSource.includes("exportReady = false;"));
assert(appSource.includes("lastLabelQueues = null;"));
console.log("OK UI сохраняет выключенную строку, а оптимизация, JOB и этикетки используют единый выбранный набор");

assert(appSource.includes('const collapsedImportGroups = new Set();'));
assert(appSource.includes('event.stopPropagation();'));
assert(appSource.includes('const scrollY = window.scrollY;'));
assert(appSource.includes('window.requestAnimationFrame(() => window.scrollTo(0, scrollY));'));
assert(collapsedImportGroups.has(doorKey));
console.log("OK выбор профиля не изменяет отдельное состояние сворачивания и восстанавливает scrollY");

const collapsedBeforeSelection = Array.from(collapsedImportGroups).sort();
assert.equal(context.setAllProductionGroupsSelected(importedParts, false), true);
assert.equal(context.getSelectedProductionParts(importedParts).length, 0);
assert.deepEqual(Array.from(collapsedImportGroups).sort(), collapsedBeforeSelection);
assert.equal(context.setAllProductionGroupsSelected(importedParts, false), false);
assert.equal(context.setAllProductionGroupsSelected(importedParts, true), true);
assert.equal(context.getSelectedProductionParts(importedParts).length, importedParts.length);
assert.deepEqual(Array.from(collapsedImportGroups).sort(), collapsedBeforeSelection);
console.log("OK Выбрать все / Снять все меняют только производственный выбор и сообщают о реальном изменении");

const selectionBeforeCollapse = Array.from(selectedProductionGroups.entries());
context.setAllImportGroupsCollapsed(importedParts, true);
assert(Array.from(context.currentProductionGroupKeys(importedParts)).every((key) => collapsedImportGroups.has(key)));
assert.deepEqual(Array.from(selectedProductionGroups.entries()), selectionBeforeCollapse);
context.setAllImportGroupsCollapsed(importedParts, false);
assert(Array.from(context.currentProductionGroupKeys(importedParts)).every((key) => !collapsedImportGroups.has(key)));
assert.deepEqual(Array.from(selectedProductionGroups.entries()), selectionBeforeCollapse);
console.log("OK Развернуть все / Свернуть все меняют только отдельное состояние раскрытия");

const renderTableSource = functionSource("renderTable", "removePartById");
assert(renderTableSource.includes('data-action="select-all"'));
assert(renderTableSource.includes('data-action="select-none"'));
assert(renderTableSource.includes('data-action="expand-all"'));
assert(renderTableSource.includes('data-action="collapse-all"'));
const collapseActionBranch = renderTableSource.split('} else if (action === "expand-all" || action === "collapse-all") {')[1]
  .split("restoreImportScroll(scrollY);")[0];
assert(!collapseActionBranch.includes("invalidateProductionRun"));
console.log("OK массовое раскрытие сохраняет скролл и не инвалидирует оптимизацию");
