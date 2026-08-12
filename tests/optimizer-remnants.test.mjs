import assert from "node:assert/strict";

globalThis.window = {};
await import("../optimizer.js");

const { optimizeCut, optimizeCutWithRemnants } = globalThis.window;
const stock = 6500;
const kerf = 5;
const rules = { scrapMax: 70, minUsefulLeftover: 650 };

function item(lengthMm, id) {
  return { lengthMm, qty: 1, meta: { id, profileCode: "XS358.01" } };
}

function remnant(id, lengthMm) {
  return { id, label: id, profileCode: "XS358.01", lengthMm };
}

{
  const result = optimizeCutWithRemnants(
    [item(6445, "fixed")],
    stock,
    kerf,
    rules,
    [remnant("available", 6500)]
  );
  assert.equal(result.fixedBins.length, 1);
  assert.equal(result.fixedBins[0].leftover, 50);
  assert.equal(result.remnantBins.length, 0);
  assert.equal(result.automaticResult.bins[0].parts[0].meta.id, "fixed");
  console.log("OK fixed full-stock bin is not changed");
}

{
  const result = optimizeCutWithRemnants(
    [item(6445, "manual-single")],
    stock,
    kerf,
    rules,
    [remnant("physical-single", 6500)],
    { preserveSuccessfulBins: false }
  );
  assert.equal(result.fixedBins.length, 0);
  assert.equal(result.remnantBins.length, 1);
  assert.equal(result.remnantBins[0].parts[0].meta.id, "manual-single");
  console.log("OK pair fallback can force parts into physical single remnants");
}

{
  const result = optimizeCutWithRemnants(
    [item(3190, "to-remnant"), item(3000, "to-stock")],
    stock,
    kerf,
    rules,
    [remnant("manual", 3200)]
  );
  assert.equal(result.remnantBins.length, 1);
  assert.equal(result.remnantBins[0].parts[0].meta.id, "to-remnant");
  assert.equal(result.remnantBins[0].leftover, 5);
  assert.equal(result.automaticResult.bins.length, 1);
  assert.equal(result.automaticResult.bins[0].parts[0].meta.id, "to-stock");
  console.log("OK unfixed parts are split between remnants and new stock");
}

{
  const result = optimizeCutWithRemnants(
    [{ lengthMm: 640, qty: 2, meta: { profileCode: "XS358.01" } }],
    stock,
    kerf,
    rules,
    [remnant("example", 1350)]
  );
  assert.equal(result.remnantBins.length, 1);
  assert.equal(result.remnantBins[0].parts.length, 2);
  assert.equal(result.remnantBins[0].kerfTotal, 10);
  assert.equal(result.remnantBins[0].used, 1290);
  assert.equal(result.remnantBins[0].leftover, 60);
  assert.equal(result.automaticResult.bins.length, 0);
  console.log("OK 1350 mm remnant fits two 640 mm parts with kerf");
}

{
  const result = optimizeCutWithRemnants(
    [item(640, "too-long")],
    stock,
    kerf,
    rules,
    [remnant("short", 600)]
  );
  assert.equal(result.remnantBins.length, 0);
  assert.equal(result.unusedRemnants.length, 1);
  assert.equal(result.automaticResult.bins.length, 1);
  console.log("OK short remnant stays unused without an error");
}

{
  const wrongProfile = { ...remnant("wrong-profile", 1350), profileCode: "XS358.02" };
  const result = optimizeCutWithRemnants(
    [{ lengthMm: 640, qty: 2, meta: { profileCode: "XS358.01" } }],
    stock,
    kerf,
    rules,
    [wrongProfile]
  );
  assert.equal(result.remnantBins.length, 0);
  assert.equal(result.automaticResult.bins.length, 1);
  console.log("OK a remnant from another profile is not used");
}

{
  const items = [item(2100, "a"), item(1800, "b"), item(900, "c")];
  const original = optimizeCut(items, stock, kerf, rules);
  const staged = optimizeCutWithRemnants(items, stock, kerf, rules, []);
  assert.deepEqual(staged.automaticResult, original);
  assert.equal(staged.remnantBins.length, 0);
  console.log("OK no-remnant result is backward compatible");
}
