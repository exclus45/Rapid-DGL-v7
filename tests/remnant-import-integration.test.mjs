import assert from "node:assert/strict";

globalThis.window = {};
await import("../profiles.js");
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

const mullion = window.ProfileCatalog.findProfileByArticleBase("XS358.03");
const parsedMullion = window.RemnantImport.parseRows([
  { rowNumber: 1, values: ["Название / номер", "Профиль", "Длина, мм", "Количество", "Примечание"] },
  { rowNumber: 2, values: ["И-1", "00XS358.03", 1270, 1, "остаток импоста"] }
], [{
  profileId: mullion.profileId,
  profileCode: mullion.articleBase,
  rapidCode: mullion.rapidCode,
  name: mullion.name,
  title: mullion.name,
  partKind: mullion.kind,
  aliases: [...mullion.aliases]
}]);

assert.equal(parsedMullion.errors.length, 0);
const importedMullion = parsedMullion.validRows[0];
assert.equal(importedMullion.profileId, "XS358.03");
assert.equal(importedMullion.profileCode, "XS358.03");
assert.equal(importedMullion.name, "Импост 82 мм (ProWin)");
assert.equal(importedMullion.partKind, "mullion");

const mullionResult = window.optimizeCutWithRemnants(
  [{
    lengthMm: 1265,
    qty: 3,
    meta: {
      profileId: importedMullion.profileId,
      profileCode: importedMullion.profileCode,
      partKind: importedMullion.partKind,
      angles: "90-90"
    }
  }],
  6500,
  5,
  mullion.optimization,
  [{
    id: "imported-mullion__1",
    label: importedMullion.label,
    profileId: importedMullion.profileId,
    profileCode: importedMullion.profileCode,
    name: importedMullion.name,
    partKind: importedMullion.partKind,
    lengthMm: importedMullion.lengthMm,
    note: importedMullion.note
  }]
);

assert.equal(mullionResult.remnantBins.length, 1);
assert.equal(mullionResult.remnantBins[0].parts.length, 1);
assert.equal(mullionResult.remnantBins[0].leftover, 0);
assert.equal(mullionResult.automaticResult.bins.length, 1);
assert.equal(mullionResult.automaticResult.bins[0].parts.length, 2);
assert.equal(mullionResult.automaticResult.bins[0].parts[0].meta.partKind, "mullion");
console.log("OK Excel-остаток импоста использует одну из трёх одиночных деталей без парной логики");
