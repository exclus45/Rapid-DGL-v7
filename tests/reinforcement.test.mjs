import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync("profiles.js", "utf8"), { filename: "profiles.js" });
vm.runInThisContext(fs.readFileSync("production-order.js", "utf8"), { filename: "production-order.js" });
vm.runInThisContext(fs.readFileSync("label-data.js", "utf8"), { filename: "label-data.js" });
vm.runInThisContext(fs.readFileSync("reinforcement.js", "utf8"), { filename: "reinforcement.js" });

const { LabelData, ReinforcementOptimization, ProfileCatalog } = globalThis;
const appSource = fs.readFileSync("app.js", "utf8");
const stylesSource = fs.readFileSync("styles.css", "utf8");

function pdfPosition({ orderId, productId, profileCode, partKind, quantity, reinforcementArticle, reinforcementSizeMm }) {
  const profile = ProfileCatalog.findProfile(profileCode);
  const shared = {
    orderId,
    productId,
    contour: "К1",
    profile: profile?.name || profileCode,
    profileId: profile?.profileId || "",
    optimizationProfileId: profile?.optimizationProfileId || "",
    profileCode: profile?.articleBase || profileCode,
    partKind,
    orient: partKind === "mullion" ? "" : "Горизонталь",
    lengthMm: 1300,
    quantity,
    angles: partKind === "mullion" ? "90-90" : "45-45"
  };
  const pdfDetail = {
    ...shared,
    sourcePartId: `${orderId}-${productId}-${profileCode}`,
    reinforcementArticle,
    reinforcementSizeMm
  };
  const key = LabelData.labelPositionKey(orderId, productId);
  return {
    key,
    orderId,
    productId,
    details: [pdfDetail],
    allDetails: [pdfDetail]
  };
}

const positions = [
  pdfPosition({ orderId: "3475", productId: "1", profileCode: "XS358.01", partKind: "frame", quantity: 2, reinforcementArticle: "KBE 207 (1,4)", reinforcementSizeMm: 1886 }),
  pdfPosition({ orderId: "4972", productId: "1", profileCode: "XS358.02", partKind: "sash", quantity: 1, reinforcementArticle: "KBE 207 (1,4)", reinforcementSizeMm: 1185 }),
  pdfPosition({ orderId: "5107", productId: "2", profileCode: "XS358.03", partKind: "mullion", quantity: 1, reinforcementArticle: "KBE 207 (1,4)", reinforcementSizeMm: 1245 }),
  pdfPosition({ orderId: "5500", productId: "1", profileCode: "FUTURE.01", partKind: "connector", quantity: 1, reinforcementArticle: "KBE 207 (1,4)", reinforcementSizeMm: 777 }),
  pdfPosition({ orderId: "6000", productId: "1", profileCode: "S358.01", partKind: "frame", quantity: 1, reinforcementArticle: "KBE 737 (1,4)", reinforcementSizeMm: 1280 }),
  pdfPosition({ orderId: "7000", productId: "1", profileCode: "S358.02", partKind: "sash", quantity: 3, reinforcementArticle: "", reinforcementSizeMm: 900 })
];

const items = ReinforcementOptimization.collectReinforcementItems(positions);
assert.equal(items.length, 6, "детали без артикула армирования не должны попадать в блок");
assert(items.some((item) => item.orderId === "3475" && item.productId === "1" && item.partKind === "frame"));
assert(items.some((item) => item.orderId === "4972" && item.partKind === "sash"));
assert(items.some((item) => item.orderId === "5107" && item.partKind === "mullion" && item.reinforcementSizeMm === 1245));

const groups = ReinforcementOptimization.groupReinforcementItems(items);
assert.equal(groups.length, 2, "разные артикулы должны создавать разные группы");
const kbe207 = groups.find((group) => group.reinforcementArticle === "KBE 207 (1,4)");
assert(kbe207);
assert.equal(kbe207.quantity, 5, "количество группы должно быть числом физических деталей");
assert.deepEqual(new Set(kbe207.items.map((item) => item.partKind)), new Set(["frame", "sash", "mullion", "connector"]));
assert.deepEqual(new Set(kbe207.items.map((item) => item.partKindLabel)), new Set(["РАМА", "СТВОРКА", "ИМПОСТ", "CONNECTOR"]));
assert.deepEqual(kbe207.items.filter((item) => item.orderId === "3475").map((item) => item.reinforcementSizeMm), [1886, 1886]);

assert.equal(ReinforcementOptimization.STOCK_LENGTH_MM, 6000);
assert.equal(ReinforcementOptimization.KERF_MM, 10);
assert.equal(ReinforcementOptimization.buildReinforcementGroups(positions).length, 2);
console.log("OK армирование: физические детали, группировка по артикулу, источники, типы и параметры 6000/10");

function reinforcementItem(id, size, article = "KBE TEST", partKind = "frame") {
  return {
    reinforcementArticle: article,
    reinforcementSizeMm: size,
    orderId: id,
    productId: "1",
    partKind,
    partKindLabel: partKind === "frame" ? "РАМА" : partKind === "sash" ? "СТВОРКА" : "ИМПОСТ"
  };
}

function reinforcementGroup(article, sourceItems) {
  return { key: article.toLowerCase(), reinforcementArticle: article, quantity: sourceItems.length, items: sourceItems };
}

const singleOne = ReinforcementOptimization.optimizeReinforcementGroup(
  reinforcementGroup("KBE TEST", [reinforcementItem("A", 1245)]),
  "single"
);
assert.equal(singleOne.mode, "single");
assert.equal(singleOne.bins.length, 1);
assert.equal(singleOne.bins[0].usedMm, 1255);
assert.equal(singleOne.bins[0].leftoverMm, 4745);
assert.equal(singleOne.bins[0].cuts[0].items[0].orderId, "A");
assert.equal(singleOne.physicalBins.length, 1);
assert.equal(singleOne.physicalBins[0].items[0].orderId, "A");

const singleSeveral = ReinforcementOptimization.optimizeReinforcementGroup(
  reinforcementGroup("KBE TEST", [
    reinforcementItem("3475", 1245, "KBE TEST", "mullion"),
    reinforcementItem("4972", 1886, "KBE TEST", "frame"),
    reinforcementItem("5107", 1185, "KBE TEST", "sash")
  ]),
  "single"
);
assert.equal(singleSeveral.bins.length, 1);
assert.equal(singleSeveral.bins[0].usedMm, 1245 + 1886 + 1185 + 30);
assert.deepEqual(new Set(singleSeveral.bins[0].cuts.flatMap((cut) => cut.items).map((item) => item.partKind)), new Set(["frame", "sash", "mullion"]));

const singleOverflow = ReinforcementOptimization.optimizeReinforcementGroup(
  reinforcementGroup("KBE TEST", [reinforcementItem("A", 3000), reinforcementItem("B", 2990)]),
  "single"
);
assert.equal(singleOverflow.bins.length, 2, "6010 мм расхода должны перейти на второй хлыст");
console.log("OK single: расход каждой детали включает 10 мм и превышение открывает новый хлыст");

const doubleTwo = ReinforcementOptimization.optimizeReinforcementGroup(
  reinforcementGroup("KBE TEST", [reinforcementItem("A", 1245), reinforcementItem("B", 1245)]),
  "double"
);
assert.equal(doubleTwo.bins.length, 1);
assert.equal(doubleTwo.bins[0].cuts.length, 1);
assert.equal(doubleTwo.bins[0].cuts[0].items.length, 2);
assert.equal(doubleTwo.bins[0].usedMm, 1255);
assert.equal(doubleTwo.physicalStockCount, 2);
assert.deepEqual(doubleTwo.bins[0].cuts[0].items.map((item) => item.orderId), ["A", "B"]);
assert.equal(doubleTwo.physicalBins.length, 2);
assert.deepEqual(doubleTwo.physicalBins.map((bin) => bin.items[0].orderId), ["A", "B"]);
assert.deepEqual(doubleTwo.physicalBins.map((bin) => bin.items[0].reinforcementSizeMm), [1245, 1245]);
assert.equal(doubleTwo.physicalBins[0].leftoverMm, doubleTwo.physicalBins[1].leftoverMm);

const sashPriorityItems = [
  reinforcementItem("SASH-1", 1305, "KBE PRIORITY", "sash"),
  reinforcementItem("MULLION-1", 1305, "KBE PRIORITY", "mullion"),
  reinforcementItem("SASH-2", 1305, "KBE PRIORITY", "sash")
];
const sashPriorityPairing = ReinforcementOptimization.pairReinforcementItems(sashPriorityItems);
assert.deepEqual(sashPriorityPairing.pairs[0].items.map((item) => item.orderId), ["SASH-1", "SASH-2"]);
assert.deepEqual(sashPriorityPairing.pairs[0].items.map((item) => item.partKind), ["sash", "sash"]);
assert.deepEqual(sashPriorityPairing.leftovers.map((item) => item.orderId), ["MULLION-1"]);

const twoKindPriorityPairing = ReinforcementOptimization.pairReinforcementItems([
  reinforcementItem("MULLION-1", 1255, "KBE PRIORITY", "mullion"),
  reinforcementItem("SASH-2", 1255, "KBE PRIORITY", "sash"),
  reinforcementItem("FRAME-2", 1255, "KBE PRIORITY", "frame"),
  reinforcementItem("SASH-1", 1255, "KBE PRIORITY", "sash"),
  reinforcementItem("FRAME-1", 1255, "KBE PRIORITY", "frame")
]);
assert.deepEqual(twoKindPriorityPairing.pairs.map((pair) => pair.items.map((item) => item.partKind)), [
  ["frame", "frame"],
  ["sash", "sash"]
]);
assert.deepEqual(twoKindPriorityPairing.leftovers.map((item) => item.orderId), ["MULLION-1"]);

const allowedMixedPair = ReinforcementOptimization.pairReinforcementItems([
  { ...reinforcementItem("FRAME-MIX", 1255, "KBE PRIORITY", "frame"), productId: "10" },
  { ...reinforcementItem("MULLION-MIX", 1255, "KBE PRIORITY", "mullion"), productId: "20" }
]);
assert.deepEqual(allowedMixedPair.pairs[0].items.map((item) => item.partKind), ["frame", "mullion"]);
assert.deepEqual(allowedMixedPair.pairs[0].items.map((item) => [item.orderId, item.productId]), [
  ["FRAME-MIX", "10"],
  ["MULLION-MIX", "20"]
]);
assert.equal(allowedMixedPair.leftovers.length, 0);

const incompatibleLengths = ReinforcementOptimization.pairReinforcementItems([
  reinforcementItem("LENGTH-1", 1255, "KBE PRIORITY", "frame"),
  reinforcementItem("LENGTH-2", 1305, "KBE PRIORITY", "frame")
]);
assert.equal(incompatibleLengths.pairs.length, 0);
assert.equal(incompatibleLengths.leftovers.length, 2);

const incompatibleArticles = ReinforcementOptimization.pairReinforcementItems([
  reinforcementItem("ARTICLE-1", 1255, "KBE A", "frame"),
  reinforcementItem("ARTICLE-2", 1255, "KBE B", "frame")
]);
assert.equal(incompatibleArticles.pairs.length, 0);
assert.equal(incompatibleArticles.leftovers.length, 2);

const deterministicItems = [
  reinforcementItem("SASH-2", 1305, "KBE PRIORITY", "sash"),
  reinforcementItem("MULLION-1", 1305, "KBE PRIORITY", "mullion"),
  reinforcementItem("FRAME-2", 1305, "KBE PRIORITY", "frame"),
  reinforcementItem("SASH-1", 1305, "KBE PRIORITY", "sash"),
  reinforcementItem("FRAME-1", 1305, "KBE PRIORITY", "frame")
];
const pairingSignature = (pairing) => ({
  pairs: pairing.pairs.map((pair) => pair.items.map((item) => `${item.orderId}/${item.productId}/${item.partKind}`)),
  leftovers: pairing.leftovers.map((item) => `${item.orderId}/${item.productId}/${item.partKind}`)
});
assert.deepEqual(
  pairingSignature(ReinforcementOptimization.pairReinforcementItems(deterministicItems)),
  pairingSignature(ReinforcementOptimization.pairReinforcementItems([...deterministicItems].reverse()))
);
console.log("OK double сначала формирует однотипные пары, затем смешанные; выбор детерминирован и сохраняет order/item");

const doubleDifferentOrders = ReinforcementOptimization.optimizeReinforcementGroup(
  reinforcementGroup("KBE TEST", [
    reinforcementItem("3475", 1255), reinforcementItem("4972", 1255),
    reinforcementItem("5107", 1155), reinforcementItem("5208", 1155),
    reinforcementItem("5244", 477), reinforcementItem("5077", 477)
  ]),
  "double"
);
assert.equal(doubleDifferentOrders.physicalBins.length, 2);
assert.deepEqual(doubleDifferentOrders.physicalBins[0].items.map((item) => item.orderId), ["3475", "5107", "5077"]);
assert.deepEqual(doubleDifferentOrders.physicalBins[1].items.map((item) => item.orderId), ["4972", "5208", "5244"]);
assert.deepEqual(
  doubleDifferentOrders.physicalBins[0].items.map((item) => item.reinforcementSizeMm),
  doubleDifferentOrders.physicalBins[1].items.map((item) => item.reinforcementSizeMm)
);
assert.equal(doubleDifferentOrders.physicalBins[0].leftoverMm, doubleDifferentOrders.physicalBins[1].leftoverMm);
console.log("OK double: разные заказы пары сохраняются на двух физических хлыстах с одинаковой картой");

const doubleFour = ReinforcementOptimization.optimizeReinforcementGroup(
  reinforcementGroup("KBE TEST", ["A", "B", "C", "D"].map((id) => reinforcementItem(id, 1245))),
  "double"
);
assert.equal(doubleFour.bins.flatMap((bin) => bin.cuts).length, 2);
assert.equal(doubleFour.automaticQuantity, 4);
assert.equal(doubleFour.manualItems.length, 0);

const doubleFourStocks = ReinforcementOptimization.optimizeReinforcementGroup(
  reinforcementGroup("KBE TEST", ["A", "B", "C", "D"].map((id) => reinforcementItem(id, 3000))),
  "double"
);
assert.equal(doubleFourStocks.bins.length, 2);
assert.equal(doubleFourStocks.physicalBins.length, 4);
assert.deepEqual(doubleFourStocks.physicalBins.map((bin) => bin.binNo), [1, 2, 3, 4]);

const doubleThree = ReinforcementOptimization.optimizeReinforcementGroup(
  reinforcementGroup("KBE TEST", ["A", "B", "C"].map((id) => reinforcementItem(id, 1245))),
  "double"
);
assert.equal(doubleThree.automaticQuantity, 2);
assert.equal(doubleThree.manualItems.length, 1);
assert.equal(doubleThree.manualItems[0].orderId, "C");
assert.equal(doubleThree.bins.flatMap((bin) => bin.cuts).some((cut) => cut.items.some((item) => item.orderId === "C")), false);
assert.equal(doubleThree.manualOptimization.physicalBins.length, 1);
assert.equal(doubleThree.manualOptimization.physicalBins[0].leftoverMm, 4745);
assert.equal(doubleThree.manualOptimization.physicalBins[0].items[0].orderId, "C");

const manualTogether = ReinforcementOptimization.optimizeReinforcementGroup(
  reinforcementGroup("KBE TEST", [1245, 1185, 925, 715, 657, 567].map((size, index) => (
    reinforcementItem(`M${index + 1}`, size, "KBE TEST", index === 0 ? "mullion" : "frame")
  ))),
  "double"
);
assert.equal(manualTogether.manualItems.length, 6);
assert.equal(manualTogether.manualOptimization.physicalBins.length, 1);
assert.equal(manualTogether.manualOptimization.physicalBins[0].usedMm, 1245 + 1185 + 925 + 715 + 657 + 567 + 60);
assert.equal(manualTogether.manualOptimization.physicalBins[0].leftoverMm, 646);
assert.deepEqual(
  new Set(manualTogether.manualOptimization.physicalBins[0].items.map((item) => item.orderId)),
  new Set(["M1", "M2", "M3", "M4", "M5", "M6"])
);
assert(manualTogether.manualOptimization.physicalBins[0].items.some((item) => item.partKind === "mullion"));

const manualTwoStocks = ReinforcementOptimization.optimizeReinforcementGroup(
  reinforcementGroup("KBE TEST", [reinforcementItem("LONG-A", 3000), reinforcementItem("LONG-B", 2990)]),
  "double"
);
assert.equal(manualTwoStocks.manualItems.length, 2);
assert.equal(manualTwoStocks.manualOptimization.physicalBins.length, 2);
console.log("OK manualItems совместно проходят single packing с kerf 10 и при необходимости открывают второй хлыст");

const doubleDifferent = ReinforcementOptimization.optimizeReinforcementGroup(
  reinforcementGroup("KBE TEST", [reinforcementItem("A", 1245), reinforcementItem("B", 1185)]),
  "double"
);
assert.equal(doubleDifferent.bins.length, 0);
assert.equal(doubleDifferent.manualItems.length, 2);
console.log("OK double: только одинаковые длины образуют пары, непарные детали уходят в ручной раскрой");

const separateArticles = ReinforcementOptimization.optimizeReinforcementGroups([
  reinforcementGroup("KBE A", [reinforcementItem("A", 1000, "KBE A")]),
  reinforcementGroup("KBE B", [reinforcementItem("B", 1000, "KBE B")])
], new Map());
assert.equal(separateArticles.length, 2);
assert(separateArticles.every((result) => result.mode === "double"));
assert.deepEqual(separateArticles.map((result) => result.manualItems.length), [1, 1]);
assert.deepEqual(separateArticles.map((result) => result.reinforcementArticle), ["KBE A", "KBE B"]);

const separateManualArticles = ReinforcementOptimization.optimizeReinforcementGroups([
  reinforcementGroup("KBE A", [reinforcementItem("A", 1000, "KBE A")]),
  reinforcementGroup("KBE B", [reinforcementItem("B", 1000, "KBE B")])
], new Map([["kbe a", "double"], ["kbe b", "double"]]));
assert.deepEqual(separateManualArticles.map((result) => result.manualItems.length), [1, 1]);
assert.deepEqual(separateManualArticles.map((result) => result.manualOptimization.physicalBins.length), [1, 1]);
assert.deepEqual(separateManualArticles[0].manualOptimization.physicalBins[0].items.map((item) => item.reinforcementArticle), ["KBE A"]);
assert.deepEqual(separateManualArticles[1].manualOptimization.physicalBins[0].items.map((item) => item.reinforcementArticle), ["KBE B"]);
console.log("OK режим по умолчанию double, явный single доступен, разные артикулы оптимизируются независимо");

const reinforcementRenderStart = appSource.indexOf("function renderReinforcementOptimization(");
const reinforcementRenderEnd = appSource.indexOf("function renderLabelKitCheck(", reinforcementRenderStart);
const reinforcementRenderSource = appSource.slice(reinforcementRenderStart, reinforcementRenderEnd);
assert(reinforcementRenderSource.includes('<option value="single"'));
assert(reinforcementRenderSource.includes('<option value="double"'));
assert(reinforcementRenderSource.includes("reinforcementModes.set"));
assert(!reinforcementRenderSource.includes("optimizeCache"));
assert(!appSource.includes("EXPORT_PAIR_MODE = 2"));
console.log("OK UI хранит отдельный режим армирования и не использует optimizeCache/RAPID pair mode");

assert(appSource.includes('let activeOptimizationView = "profiles"'));
assert(appSource.includes('id="optimizationProfilesView"'));
assert(appSource.includes('id="optimizationReinforcementView"'));
const optimizationViewStart = appSource.indexOf("function setActiveOptimizationView(");
const optimizationViewEnd = appSource.indexOf("\n}\n\noptimizationViewTabs.forEach", optimizationViewStart) + 2;
const optimizationViewSource = appSource.slice(optimizationViewStart, optimizationViewEnd);
assert(optimizationViewSource.includes("classList.toggle"));
assert(!optimizationViewSource.includes("renderReinforcementOptimization"));
assert(!optimizationViewSource.includes("optimizeCut"));
console.log("OK вкладки Профили/Армирование переключают только UI, по умолчанию открыты Профили");

assert(reinforcementRenderSource.includes("item.reinforcementSizeMm"));
assert(!reinforcementRenderSource.includes("item.reinforcementSizeMm +"));
assert(reinforcementRenderSource.includes("bin.leftoverMm / result.stockLengthMm"));
assert(reinforcementRenderSource.includes("result.physicalBins.length"));
assert(reinforcementRenderSource.includes("result.physicalBins.map"));
assert(reinforcementRenderSource.includes("<strong>Хлыст ${bin.binNo}:</strong>"));
assert(!reinforcementRenderSource.includes("Пара хлыстов"));
assert(reinforcementRenderSource.includes("ВНИМАНИЕ - РУЧНОЙ РАСКРОЙ АРМИРОВАНИЯ"));
console.log("OK плашки показывают фактическую длину, остаток с процентом и явный double/ручной режим");

assert(reinforcementRenderSource.includes('class="opt-result reinforcement-group"'));
assert(reinforcementRenderSource.includes('class="cut-chip reinforcement-cut-chip"'));
assert(reinforcementRenderSource.includes('class="cut-chip-meta"'));
assert(reinforcementRenderSource.includes('class="cut-chip-length"'));
assert(reinforcementRenderSource.includes('class="opt-bin reinforcement-opt-bin'));
assert(reinforcementRenderSource.includes('class="opt-left"'));
assert(reinforcementRenderSource.includes('class="opt-manual-notice reinforcement-manual-title"'));
assert(!reinforcementRenderSource.includes('class="reinforcement-bar'));
console.log("OK армирование использует общий дизайн-код результата профилей и не содержит отдельной сетки хлыстов");

assert(appSource.includes('id="reinforcementOptimizationSettings"'));
assert(reinforcementRenderSource.includes('class="opt-settings"'));
assert(reinforcementRenderSource.includes('class="opt-summary reinforcement-opt-summary"'));
assert(reinforcementRenderSource.includes('class="opt-line reinforcement-opt-line"'));
assert(reinforcementRenderSource.includes('class="opt-line opt-line-skew reinforcement-manual-summary"'));
assert(reinforcementRenderSource.includes("${group.quantity} шт."));
assert(reinforcementRenderSource.includes("${manualCount} шт."));
assert.equal((reinforcementRenderSource.match(/<select class="opt-mode reinforcement-mode">/g) || []).length, 1);
assert(reinforcementRenderSource.includes('reinforcementOptimizationSettings.querySelectorAll(".reinforcement-mode")'));
assert(reinforcementRenderSource.includes('renderReinforcementOptimization(key)'));
assert(reinforcementRenderSource.includes('class="opt-mode-label">${result.mode'));
assert(reinforcementRenderSource.includes("result.manualOptimization.physicalBins"));
assert(reinforcementRenderSource.includes("result.manualOptimization.stockLengthMm"));
assert(!reinforcementRenderSource.includes("result.manualItems.map(reinforcementChip)"));
console.log("OK режим армирования выбирается только в верхнем списке, результат показывает статическую подпись и ручной итог");

assert.equal(ReinforcementOptimization.DEFAULT_MODE, "double");
assert(reinforcementRenderSource.includes('api.DEFAULT_MODE || "double"'));
assert(appSource.includes('id="printReinforcementBtn"'));
assert(appSource.includes('id="reinforcementPrintArea"'));
assert(appSource.includes('id="reinforcementPrintResults"'));
assert(reinforcementRenderSource.includes("reinforcementPrintResults.innerHTML"));
assert(reinforcementRenderSource.includes("reinforcementAutomaticGroupHtml(result)"));
assert(reinforcementRenderSource.includes(".map(reinforcementManualGroupHtml).join"));
assert(reinforcementRenderSource.includes("const printAutomaticHtml = reinforcementOptimizationCache.map"));
assert(reinforcementRenderSource.includes("reinforcementPrintResults.innerHTML = printAutomaticHtml + manualHtml"));
const printAutomaticStart = reinforcementRenderSource.indexOf("const printAutomaticHtml = reinforcementOptimizationCache.map");
const printAutomaticEnd = reinforcementRenderSource.indexOf("reinforcementPrintResults.innerHTML = printAutomaticHtml + manualHtml", printAutomaticStart);
const printAutomaticSource = reinforcementRenderSource.slice(printAutomaticStart, printAutomaticEnd);
assert(!printAutomaticSource.includes("reinforcementManualGroupHtml"));
assert(!printAutomaticSource.includes("manualItems"));
assert.equal((reinforcementRenderSource.match(/ВНИМАНИЕ - РУЧНОЙ РАСКРОЙ АРМИРОВАНИЯ/g) || []).length, 1);
const reinforcementPrintMarkupStart = appSource.indexOf('<div id="reinforcementPrintArea"');
const reinforcementPrintMarkupEnd = appSource.indexOf('<div class="tab-panel" id="tab-optimize">', reinforcementPrintMarkupStart);
const reinforcementPrintMarkup = appSource.slice(reinforcementPrintMarkupStart, reinforcementPrintMarkupEnd);
assert(!reinforcementPrintMarkup.includes("<button"));
assert(!reinforcementPrintMarkup.includes("<select"));
assert(!reinforcementPrintMarkup.includes("reinforcementOptimizationSettings"));
assert(appSource.includes('document.body.classList.add("print-reinforcement")'));
assert(stylesSource.includes("body.print-reinforcement #app > .reinforcement-print-area"));
assert(stylesSource.includes(".reinforcement-print-group + .reinforcement-print-group"));
assert(/\.reinforcement-print-group \+ \.reinforcement-print-group\s*\{[^}]*break-before:\s*page;/s.test(stylesSource));
assert(/\.reinforcement-print-group:last-child\s*\{[^}]*break-after:\s*auto;/s.test(stylesSource));
assert(!/\.reinforcement-print-group:last-child\s*\{[^}]*break-after:\s*page;/s.test(stylesSource));
console.log("OK отдельная печать армирования содержит результат без настроек, dropdown и кнопок");

assert(appSource.includes('id="reinforcementCutDate"'));
assert(appSource.includes('id="reinforcementPrintDate"'));
assert(appSource.includes('let sharedCutDateValue = ""'));
assert(appSource.includes("function setSharedCutDateValue(value)"));
const sharedDateStart = appSource.indexOf("function setSharedCutDateValue(value)");
const sharedDateEnd = appSource.indexOf("\n}\n\n[cutDateInput", sharedDateStart) + 2;
const sharedDateSource = appSource.slice(sharedDateStart, sharedDateEnd);
assert(sharedDateSource.includes("cutDateInput.value = sharedCutDateValue"));
assert(sharedDateSource.includes("reinforcementCutDateInput.value = sharedCutDateValue"));
assert(sharedDateSource.includes("reinforcementPrintDate.value = sharedCutDateValue"));
assert(appSource.includes("[cutDateInput, reinforcementCutDateInput]"));
assert(reinforcementPrintMarkup.includes('class="opt-result-header reinforcement-print-header"'));
assert(reinforcementPrintMarkup.includes("<h2>Результат раскроя</h2>"));
assert(reinforcementPrintMarkup.includes('class="opt-date"'));
assert(reinforcementPrintMarkup.includes('<input id="reinforcementPrintDate" type="date" readonly'));
assert(!reinforcementPrintMarkup.includes("ОПТИМИЗАЦИЯ АРМИРОВАНИЯ"));
assert(!stylesSource.includes(".reinforcement-print-date"));
assert(!stylesSource.includes(".reinforcement-print-area > h1"));
console.log("OK дата синхронизируется через одно состояние, а печатная шапка армирования использует общий шаблон профилей");
