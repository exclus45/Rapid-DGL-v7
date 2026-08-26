import assert from "node:assert/strict";

globalThis.window = {};
await import("../profiles.js");
await import("../optimizer.js");

const { optimizeCut, optimizeCutWithRemnants } = window;
const mullionProfile = window.ProfileCatalog.findProfileByArticleBase("XS358.03");
const rules = mullionProfile.optimization;
const stock = 6500;
const kerf = 5;

function mullionItem(lengthMm, quantity = 1, id = "mullion") {
  return {
    lengthMm,
    qty: quantity,
    meta: {
      id,
      profileId: mullionProfile.profileId,
      profileCode: mullionProfile.articleBase,
      partKind: "mullion",
      angles: "90-90"
    }
  };
}

assert.deepEqual(
  { scrapMax: rules.scrapMax, minUsefulLeftover: rules.minUsefulLeftover },
  { scrapMax: 50, minUsefulLeftover: 400 }
);

{
  const result = optimizeCut([mullionItem(1265)], stock, kerf, rules);
  assert.equal(result.bins.length, 1);
  assert.equal(result.bins[0].parts.length, 1);
  assert.equal(result.bins[0].used, 1270);
  assert.equal(result.bins[0].leftover, 5230);
  assert.equal(result.bins[0].parts[0].meta.angles, "90-90");
  console.log("OK один импост автоматически оптимизируется без удвоения и сохраняет 90/90");
}

{
  const result = optimizeCut([mullionItem(1265, 4)], stock, kerf, rules);
  assert.equal(result.bins.length, 1);
  assert.equal(result.bins[0].parts.length, 4);
  assert.equal(result.bins[0].used, 5080);
  console.log("OK несколько импостов одного профиля оптимизируются как отдельные одиночные детали");
}

{
  const result = optimizeCut([mullionItem(1265, 3)], stock, kerf, rules);
  assert.equal(result.bins.length, 1);
  assert.equal(result.bins[0].parts.length, 3);
  assert.equal(result.bins[0].used, 3810);
  assert.equal(result.unfit.length, 0);
  console.log("OK нечётное количество импостов является нормальным");
}

{
  const result = optimizeCut([
    mullionItem(6345, 1, "long"),
    mullionItem(95, 1, "short")
  ], stock, kerf, rules);
  assert.equal(result.bins.length, 1);
  assert.equal(result.bins[0].leftover, 50);
  console.log("OK остаток <= 50 мм считается допустимым отходом");
}

{
  const at51 = optimizeCut([
    mullionItem(6344, 1, "long-51"),
    mullionItem(95, 1, "short-51")
  ], stock, kerf, rules);
  assert.equal(at51.bins.length, 2);
  assert(!at51.bins.some((bin) => bin.leftover === 51));

  const at399 = optimizeCut([
    mullionItem(5995, 1, "long-399"),
    mullionItem(96, 1, "short-399")
  ], stock, kerf, rules);
  assert.equal(at399.bins.length, 2);
  assert(!at399.bins.some((bin) => bin.leftover === 399));
  console.log("OK нежелательный диапазон 51–399 мм избегается при доступной альтернативе");
}

{
  const result = optimizeCut([
    mullionItem(5995, 1, "long-400"),
    mullionItem(95, 1, "short-400")
  ], stock, kerf, rules);
  assert.equal(result.bins.length, 1);
  assert.equal(result.bins[0].leftover, 400);
  console.log("OK остаток >= 400 мм считается полезным");
}

{
  const fixed = optimizeCutWithRemnants(
    [mullionItem(6445, 1, "fixed-50")],
    stock,
    kerf,
    rules,
    [{ id: "available", profileCode: "XS358.03", lengthMm: 2000 }]
  );
  assert.equal(fixed.fixedBins.length, 1);
  assert.equal(fixed.fixedBins[0].leftover, 50);
  assert.equal(fixed.remnantBins.length, 0);

  const fromRemnant = optimizeCutWithRemnants(
    [mullionItem(1265, 1, "from-remnant")],
    stock,
    kerf,
    rules,
    [{ id: "mullion-remnant", profileCode: "XS358.03", lengthMm: 1270 }]
  );
  assert.equal(fromRemnant.remnantBins.length, 1);
  assert.equal(fromRemnant.remnantBins[0].leftover, 0);
  assert.equal(fromRemnant.automaticResult.bins.length, 0);
  console.log("OK фиксация <= 50 мм и двухэтапная работа с ручными остатками применяются к импосту");
}

{
  const tooShort = optimizeCutWithRemnants(
    [mullionItem(1265, 1, "too-long-for-remnant")],
    stock,
    kerf,
    rules,
    [{ id: "short-mullion-remnant", profileCode: "XS358.03", lengthMm: 1200 }]
  );
  assert.equal(tooShort.remnantBins.length, 0);
  assert.equal(tooShort.unusedRemnants.length, 1);
  assert.equal(tooShort.unusedRemnants[0].id, "short-mullion-remnant");
  assert.equal(tooShort.automaticResult.bins.length, 1);
  assert.equal(tooShort.automaticResult.bins[0].parts.length, 1);
  console.log("OK слишком короткий остаток импоста сохраняется неиспользованным");
}
