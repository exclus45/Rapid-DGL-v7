import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync("profiles.js", "utf8"), { filename: "profiles.js" });
vm.runInThisContext(fs.readFileSync("production-order.js", "utf8"), { filename: "production-order.js" });
vm.runInThisContext(fs.readFileSync("label-data.js", "utf8"), { filename: "label-data.js" });
vm.runInThisContext(fs.readFileSync("label-pdf.js", "utf8"), { filename: "label-pdf.js" });

const { LabelData, LabelPdf } = globalThis;

assert.equal(LabelData.normalizeFillingFormula(" 4 ［ 10 ］ 4 "), "4[10]4");
assert.equal(LabelData.parseStrictFillingThickness("4[10]4[10]4"), 32);
assert.equal(LabelData.parseStrictFillingThickness("4[10]4[10]4 NS"), 32);
assert.equal(LabelData.parseStrictFillingThickness("4[16]4"), 24);
assert.equal(LabelData.parseStrictFillingThickness("4,5[10]4,5"), 19);
assert.equal(LabelData.parseStrictFillingThickness("4(16)4"), null);
assert.equal(LabelData.parseStrictFillingThickness("стекло 4[16]4"), null);
assert.equal(LabelData.parseStrictFillingThickness("4[abc]4"), null);
assert.equal(LabelData.parseStrictFillingThickness("4[10]4 NS2"), null);
assert.equal(LabelData.parseExplicitFillingThickness("СНД 32ммБелый"), 32);
assert.equal(LabelData.parseExplicitFillingThickness("СНД 24 мм Белый"), 24);
assert.equal(LabelData.parseExplicitFillingThickness("СНД 24,5 мм Белый"), 24.5);
assert.equal(LabelData.parseExplicitFillingThickness("24 мм + 32 мм"), null);
assert.equal(LabelData.parseMarkedGlassThickness("4M1"), 4);
assert.equal(LabelData.parseMarkedGlassThickness("4М1"), 4);
assert.equal(LabelData.parseMarkedGlassThickness(" 4 m 1 "), 4);
assert.equal(LabelData.parseMarkedGlassThickness("4M2"), null);
assert.equal(LabelData.parseMarkedGlassThickness("4M1 extra"), null);

const fillingRows = [
  { text: "№ Артикул", cells: ["№", "Артикул"] },
  { text: "Э2 4[10]4[10]4", cells: ["Э2", "4[10]4[10]4"] },
  { text: "Э3 4[16]4", cells: ["Э3", "4[16]4"] },
  { text: "ПВХ дренаж Снаружи", cells: ["ПВХ дренаж", "Снаружи"] },
  { text: "№ Часть Название", cells: ["№", "Часть", "Название"] },
  { text: "Э1 Импост Импост 82 мм", cells: ["Э1", "Импост", "Импост 82 мм", "Вертикальн.", "915 мм", "1"] }
];
const parsed = LabelPdf.parsePdfFillings(fillingRows);
assert.deepEqual(parsed.map((entry) => [entry.code, entry.thicknessMm, entry.status]), [
  ["Э2", 32, "parsed"],
  ["Э3", 24, "parsed"]
]);
assert.equal(LabelPdf.parsePdfFillings([{ text: "Э1 Импост", cells: ["Э1", "Импост"] }]).length, 0);

const groupedRows = [
  { text: "№ Артикул", cells: ["№", "Артикул"] },
  { text: "Э3 Лист оцинкованный", cells: ["Э3", "Лист оцинкованный"] },
  { text: "Э3 СНД 32ммБелый", cells: ["Э3", "СНД 32ммБелый"] },
  { text: "Э4 СНД 24ммБелый", cells: ["Э4", "СНД 24ммБелый"] },
  { text: "Э5 4[10]4[10]4 NS", cells: ["Э5", "4[10]4[10]4 NS"] },
  { text: "ПВХ дренаж Обычный", cells: ["ПВХ дренаж", "Обычный"] }
];
const grouped = LabelPdf.parsePdfFillings(groupedRows);
assert.equal(grouped.length, 3, "повторный номер заполнения образует одну группу");
assert.deepEqual(grouped.map((group) => [group.code, group.thicknessMm, group.status]), [
  ["Э3", 32, "parsed"],
  ["Э4", 24, "parsed"],
  ["Э5", 32, "parsed"]
]);
assert.equal(grouped[0].components.length, 2);
assert.equal(grouped[0].sourceRows.length, 2);
assert.equal(grouped[0].components[0].status, "ignored");
assert.equal(grouped[0].components[1].status, "parsed");
assert.deepEqual(LabelData.uniqueFillingThicknesses(grouped), [24, 32]);

const mosquitoRows = [
  { text: "№ Артикул", cells: ["№", "Артикул"] },
  { text: "Э2 4[10]4[10]4", cells: ["Э2", "4[10]4[10]4"] },
  { text: "Э3 4M1", cells: ["Э3", "4M1"] },
  { text: "Э12 MOS", cells: ["Э12", "MOS"] },
  { text: "ПВХ дренаж Обычный", cells: ["ПВХ дренаж", "Обычный"] }
];
const mosquitoParsed = LabelPdf.parsePdfFillings(mosquitoRows);
assert.deepEqual(mosquitoParsed.map((group) => [group.code, group.thicknessMm, group.status]), [
  ["Э2", 32, "parsed"],
  ["Э3", 4, "parsed"],
  ["Э12", null, "ignored"]
]);
assert.equal(mosquitoParsed[2].fillingType, "mosquito");
assert.equal(mosquitoParsed[2].components[0].systemRule, true);
assert.deepEqual(LabelData.uniqueFillingThicknesses(mosquitoParsed), [4, 32]);
assert.equal(LabelPdf.buildLabelDisplayModel({
  partKind: "Рама",
  side: "ВЕРХ",
  lengthMm: 1006,
  fillings: mosquitoParsed
}).fillingText, "ЗАПОЛН.: 4 ММ / 32 ММ");

for (const value of ["MOS", "mos", " MOS "]) {
  const result = LabelData.resolveFillingEntries([{ rawFormula: value }])[0];
  assert.equal(result.status, "ignored");
  assert.equal(result.fillingType, "mosquito");
}
for (const value of ["MOSQUITO", "THERMOS", "MOS extra"]) {
  assert.equal(LabelData.resolveFillingEntries([{ rawFormula: value }])[0].status, "unresolved");
}

const partiallyUnknown = LabelData.resolveFillingGroups([{
  code: "Э7",
  components: [{ rawFormula: "СНД 32ммБелый" }, { rawFormula: "неизвестный компонент" }]
}]);
assert.equal(partiallyUnknown[0].status, "unresolved", "неизвестный основной компонент рядом с распознанным блокирует группу");
assert.equal(partiallyUnknown[0].unresolvedComponents.length, 1);
const conflicting = LabelData.resolveFillingGroups([{
  code: "Э8",
  components: [{ rawFormula: "СНД 24ммБелый" }, { rawFormula: "СНД 32ммБелый" }]
}]);
assert.equal(conflicting[0].status, "conflict");
assert.deepEqual(conflicting[0].conflictingThicknesses, [24, 32]);

const unresolved = LabelData.resolveFillingEntries([{ code: "Э9", rawFormula: "СП 24" }]);
assert.equal(unresolved[0].status, "unresolved");
assert.equal(unresolved[0].thicknessMm, null);

const dictionary = { "4[16]4": { displayFormula: "4[16]4", thicknessMm: 30 } };
assert.equal(Object.hasOwn(dictionary, LabelData.normalizeFillingFormula("Лист оцинкованный")), false);
const dictionaryResolved = LabelData.resolveFillingEntries([{ code: "Э3", rawFormula: "4[16]4" }], dictionary);
assert.equal(dictionaryResolved[0].status, "dictionary");
assert.equal(dictionaryResolved[0].thicknessMm, 30, "справочник имеет приоритет над автоматическим расчётом");
const manualResolved = LabelData.resolveFillingEntries([{ code: "Э3", rawFormula: "4[16]4" }], dictionary, new Set(["4[16]4"]));
assert.equal(manualResolved[0].status, "manual");

const storageValues = new Map();
const storage = {
  getItem: (key) => storageValues.get(key) || null,
  setItem: (key, value) => storageValues.set(key, value)
};
assert.equal(LabelData.writeFillThicknessDictionary(storage, dictionary), true);
assert.deepEqual(LabelData.readFillThicknessDictionary(storage), dictionary);
const loadedDictionary = LabelData.readFillThicknessDictionary(storage);
assert.equal(LabelData.resolveFillingEntries([{ rawFormula: "4[16]4" }], loadedDictionary)[0].thicknessMm, 30);
delete loadedDictionary["4[16]4"];
assert.equal(LabelData.resolveFillingEntries([{ rawFormula: "4[16]4" }], loadedDictionary)[0].thicknessMm, 24, "после удаления снова работает строгий автоматический расчёт");
assert.equal(LabelData.resolveFillingEntries([{ rawFormula: "СП 24" }], loadedDictionary)[0].status, "unresolved");

const manualMosquitoKey = LabelData.normalizeFillingFormula("Сетка нестандартная");
const extendedDictionary = {
  legacyNumber: 18,
  legacyObject: { displayFormula: "legacyObject", thicknessMm: 22 },
  [manualMosquitoKey]: { type: "ignored", reason: "mosquito", displayFormula: "Сетка нестандартная" }
};
assert.equal(LabelData.writeFillThicknessDictionary(storage, extendedDictionary), true);
const reloadedExtendedDictionary = LabelData.readFillThicknessDictionary(storage);
assert.equal(reloadedExtendedDictionary.legacyNumber, 18);
assert.equal(reloadedExtendedDictionary.legacyObject.thicknessMm, 22);
assert.equal(reloadedExtendedDictionary[manualMosquitoKey].type, "ignored");
const manuallyIgnored = LabelData.resolveFillingGroups([{
  code: "Э20",
  components: [{ rawFormula: "сетка нестандартная" }]
}], reloadedExtendedDictionary);
assert.equal(manuallyIgnored[0].status, "ignored");
assert.equal(manuallyIgnored[0].fillingType, "mosquito");
delete reloadedExtendedDictionary[manualMosquitoKey];
assert.equal(LabelData.resolveFillingEntries([{ rawFormula: "Сетка нестандартная" }], reloadedExtendedDictionary)[0].status, "unresolved");
assert.equal(LabelData.resolveFillingEntries([{ rawFormula: "MOS" }], reloadedExtendedDictionary)[0].status, "ignored", "встроенное правило MOS нельзя удалить из справочника");

assert.deepEqual(LabelData.uniqueFillingThicknesses([
  { thicknessMm: 32 }, { thicknessMm: 24 }, { thicknessMm: 32 }, { thicknessMm: null }
]), [24, 32]);
assert.equal(LabelData.formatFillingThickness(24.5), "24,5");

const frameDisplay = LabelPdf.buildLabelDisplayModel({
  partKind: "Рама",
  side: "ВЕРХ",
  lengthMm: 1006,
  reinforcementText: "АРМ. KBE 207 — 905 мм",
  dimension: { widthMm: 1000, heightMm: 1000 },
  fillings: parsed
});
assert.equal(frameDisplay.fillingText, "ЗАПОЛН.: 24 ММ / 32 ММ");
assert.deepEqual(frameDisplay.subLines, [
  "АРМ. KBE 207 — 905 мм",
  "ЗАПОЛН.: 24 ММ / 32 ММ",
  "ГАБАРИТ: 1000 × 1000 мм"
]);
const mullionDisplay = LabelPdf.buildLabelDisplayModel({
  partKind: "Импост",
  lengthMm: 915,
  reinforcementText: "АРМ. KBE 207 — 895 мм",
  fillings: parsed
});
assert.equal(mullionDisplay.fillingText, undefined);
assert.equal(mullionDisplay.subLines.some((line) => line.includes("ЗАПОЛН")), false);

const labels = [
  { id: "fill-a", orderId: "6243", productId: "1", positionKey: "6243 / 1", side: "ВЕРХ", lengthMm: 1006, fillings: parsed },
  { id: "fill-b", orderId: "6243", productId: "1", positionKey: "6243 / 1", side: "НИЗ", lengthMm: 1006, fillings: parsed }
];
const queue = LabelData.buildLabelQueuesFromOptimizeState({
  physicalLabels: labels,
  groups: [{ title: "frame", profileCode: "frame", partKind: "frame", mode: "double" }],
  lastExportResults: new Map([["frame", { bins: [{ parts: [{ length: 1006, meta: labels.map((label) => ({ labelId: label.id, physicalLabel: label })) }] }] }]])
});
assert.equal(queue.validation.ready, true);
assert.deepEqual(LabelData.buildJobPrintSequence(queue).map((entry) => entry.labelId), ["fill-a", "fill-b"]);
assert(LabelData.buildJobPrintSequence(queue).every((entry) => entry.label.fillings === parsed));

const appSource = fs.readFileSync("app.js", "utf8");
const stylesSource = fs.readFileSync("styles.css", "utf8");
assert(appSource.includes("rapidDgl.fillThicknessDictionary.v1") || fs.readFileSync("label-data.js", "utf8").includes("rapidDgl.fillThicknessDictionary.v1"));
assert(appSource.includes("Печать этикеток заблокирована"));
assert(appSource.includes("Справочник заполнений"));
assert(appSource.includes("Москитная сетка — не учитывать"));
assert(appSource.includes('type: "ignored"'));
assert(stylesSource.includes("label-card-text--with-filling"));
assert(stylesSource.includes("label-card-filling"));

console.log("OK filling parsing, dictionary, unresolved flow, label display and queue preservation");
