import assert from "node:assert/strict";

globalThis.window = {};
await import("../remnant-import.js");
await import("../optimizer.js");

const profileTitle = "Рама оконная 63 мм (ProWin)";
const parsed = window.RemnantImport.parseRows([
  { rowNumber: 1, values: ["Название / номер", "Профиль", "Длина, мм", "Количество", "Примечание"] },
  { rowNumber: 2, values: ["", profileTitle, 1350, 1, "из Excel"] }
], [{ profileCode: "XS358.01", title: profileTitle }]);

assert.equal(parsed.errors.length, 0);
const imported = parsed.validRows[0];
const result = window.optimizeCutWithRemnants(
  [{ lengthMm: 640, qty: 2, meta: { profileCode: imported.profileCode } }],
  6500,
  5,
  { scrapMax: 70, minUsefulLeftover: 650 },
  [{
    id: "imported_1__1",
    label: imported.label,
    profileCode: imported.profileCode,
    lengthMm: imported.lengthMm,
    note: imported.note
  }]
);

assert.equal(result.remnantBins.length, 1);
assert.equal(result.remnantBins[0].parts.length, 2);
assert.equal(result.remnantBins[0].leftover, 60);
assert.equal(result.automaticResult.bins.length, 0);
console.log("OK импортированный остаток участвует в существующей оптимизации как ручной");
