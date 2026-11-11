import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const appSource = await readFile(new URL("../app.js", import.meta.url), "utf8");
const profilesSource = await readFile(new URL("../profiles.js", import.meta.url), "utf8");
const productionOrderSource = await readFile(new URL("../production-order.js", import.meta.url), "utf8");
const optimizerSource = await readFile(new URL("../optimizer.js", import.meta.url), "utf8");

function functionSource(name, nextName) {
  const start = appSource.indexOf(`function ${name}(`);
  const end = appSource.indexOf(`function ${nextName}(`, start + 1);
  assert(start >= 0 && end > start, `Не удалось извлечь ${name} из app.js`);
  return appSource.slice(start, end);
}

const context = vm.createContext({ console, optimizeCache: { groups: [], lastExportResults: new Map() } });
context.window = context;
vm.runInContext(profilesSource, context, { filename: "profiles.js" });
vm.runInContext(productionOrderSource, context, { filename: "production-order.js" });
vm.runInContext(optimizerSource, context, { filename: "optimizer.js" });
vm.runInContext([
  functionSource("resolveAppCatalogProfile", "profileDisplayNameForCode"),
  functionSource("sanitizeDigits", "extractProfileBase"),
  functionSource("extractProfileBase", "parseAnglePair"),
  functionSource("parseAnglePair", "encodeWin1251"),
  functionSource("padLeft", "angleToSCode"),
  functionSource("angleToSCode", "angleToW"),
  functionSource("angleToW", "isMullionPart"),
  functionSource("normalizeAngles", "sanitizeDigits"),
  functionSource("isMullionPart", "isSkewPart"),
  functionSource("doublePairKey", "buildExportGroups"),
  functionSource("buildExportGroups", "makeHeader"),
  functionSource("makeHeader", "dateToOrderNo"),
  functionSource("makeNLines", "makeProgramBlock"),
  functionSource("makeProgramBlock", "buildJobTextForGroup"),
  functionSource("safeFileName", "renderExport")
].join("\n"), context, { filename: "rapid-export-functions.js" });

for (const [profileId, title, expected] of [
  ["S358.16", "Рама дверная 72 мм", "111126_S358_16.job"],
  ["XS358.01", null, "111126_ProWin_XS358_01.job"],
  ["XS358.02", null, "111126_ProWin_XS358_02.job"]
]) {
  const profile = context.ProfileCatalog.findProfileByArticleBase(profileId);
  assert.equal(context.buildJobFileName("111126", {
    title: title ?? profile.name,
    profileBase: profile.articleBase
  }), expected);
}

function piece(profile, id, lengthMm = 1265) {
  return {
    id,
    sourcePartId: id,
    orderId: "3475",
    productId: "1",
    profileId: profile.profileId,
    profileCode: profile.articleBase,
    partKind: "mullion",
    lengthMm,
    angles: "90-90"
  };
}

function exportAutomaticGroup(profile, pieces, result) {
  const title = profile.name;
  context.optimizeCache = {
    groups: [{
      title,
      profileId: profile.profileId,
      profileCode: profile.articleBase,
      partKind: "mullion",
      mode: "single",
      pieces
    }],
    lastExportResults: new Map([[title, result]])
  };
  return context.buildExportGroups()[0];
}

const proWinMullion = context.ProfileCatalog.findProfileByArticleBase("XS358.03");
const automaticPiece = piece(proWinMullion, "automatic-1265");
const automaticResult = context.optimizeCut(
  [{ lengthMm: 1265, qty: 1, meta: automaticPiece }],
  6500,
  5,
  proWinMullion.optimization
);
const proWinGroup = exportAutomaticGroup(proWinMullion, [automaticPiece], automaticResult);

assert(proWinGroup);
assert.equal(proWinGroup.profileBase, "XS358.03");
assert.equal(proWinGroup.items.length, 1);
assert.equal(proWinGroup.items[0].lengthMm, 1265);
assert.equal(proWinGroup.items[0].angles, "90-90");

const proWinJob = context.makeProgramBlock("010126", 1, proWinGroup.profileBase, 0, 0, proWinGroup.items);
const [proWinHeader, proWinNLine, trailing] = proWinJob.split("\r\n");
assert.equal(proWinHeader, "P010126000100XS358.0300001");
assert.equal(trailing, "");
assert(proWinNLine.includes("L12650S22"));
assert(proWinNLine.includes("W0900W0900W0000W0000"));
assert(!proWinNLine.includes("W0450W0450"));
console.log(`OK XS358.03 JOB: ${proWinHeader}`);
console.log(`OK XS358.03 N: ${proWinNLine}`);

const doublePieces = [
  piece(proWinMullion, "double-1"),
  piece(proWinMullion, "double-2"),
  piece(proWinMullion, "double-odd")
];
const doublePairing = context.buildDoublePairs(doublePieces);
assert.equal(doublePairing.paired.length, 1);
assert.equal(doublePairing.leftovers.length, 1);
context.optimizeCache = {
  groups: [{
    title: proWinMullion.name,
    profileId: proWinMullion.profileId,
    profileCode: proWinMullion.articleBase,
    partKind: "mullion",
    mode: "double",
    pieces: doublePieces
  }],
  lastExportResults: new Map([[
    proWinMullion.name,
    {
      bins: [{
        parts: [
          { length: 1265, meta: doublePairing.paired[0].meta }
        ]
      }],
      unfit: []
    }
  ]])
};
const doubleExportGroup = context.buildExportGroups()[0];
assert.equal(doubleExportGroup.totalQty, 2);
assert.equal(doubleExportGroup.items.length, 1);
const doubleJob = context.makeProgramBlock(
  "010126", 1, doubleExportGroup.profileBase, 0, 0, doubleExportGroup.items
);
assert.equal(doubleJob.split("\r\n")[0], "P010126000100XS358.0300001");
assert.equal(doubleJob.split("\r\n").filter((line) => line.startsWith("N")).length, 1);
console.log("OK mullion double экспортирует только пару, ручной хвост исключён, RAPID pair code 0");

const practicaMullion = context.ProfileCatalog.findProfileByArticleBase("S358.03");
const practicaPiece = piece(practicaMullion, "practica-1265");
const practicaResult = context.optimizeCut(
  [{ lengthMm: 1265, qty: 1, meta: practicaPiece }],
  6500,
  5,
  practicaMullion.optimization
);
const practicaGroup = exportAutomaticGroup(practicaMullion, [practicaPiece], practicaResult);
const practicaHeader = context.makeProgramBlock(
  "010126", 1, practicaGroup.profileBase, 0, 0, practicaGroup.items
).split("\r\n")[0];
assert.equal(practicaHeader, "P0101260001000S358.0300001");
console.log("OK S358.03 дополняется до RAPID-кода 000S358.03");

const manualPiece = piece(proWinMullion, "manual-remnant-1265", 1265);
const remainingAutomaticPiece = piece(proWinMullion, "automatic-1000", 1000);
const staged = context.optimizeCutWithRemnants(
  [
    { lengthMm: manualPiece.lengthMm, qty: 1, meta: manualPiece },
    { lengthMm: remainingAutomaticPiece.lengthMm, qty: 1, meta: remainingAutomaticPiece }
  ],
  6500,
  5,
  proWinMullion.optimization,
  [{ id: "manual-remnant", profileCode: "XS358.03", lengthMm: 1270 }]
);
assert.equal(staged.remnantBins.length, 1);
assert.equal(staged.remnantBins[0].parts[0].meta.id, "manual-remnant-1265");
const stagedGroup = exportAutomaticGroup(
  proWinMullion,
  [manualPiece, remainingAutomaticPiece],
  staged.automaticResult
);
assert.equal(stagedGroup.items.length, 1);
assert.equal(stagedGroup.items[0].lengthMm, 1000);
assert(!stagedGroup.items.some((item) => item.lengthMm === 1265));
console.log("OK импост из ручного остатка исключён, оставшийся автоматический импост входит в JOB");

const productionProfiles = [
  context.ProfileCatalog.findProfileByArticleBase("XS358.03"),
  context.ProfileCatalog.findProfileByArticleBase("XS358.02"),
  context.ProfileCatalog.findProfileByArticleBase("XS358.01")
];
const productionKinds = ["mullion", "sash", "frame"];
const productionGroups = productionProfiles.map((profile, index) => {
  const first = { ...piece(profile, `${profile.profileId}-first`, 900 + index), partKind: productionKinds[index], orderId: `${7000 + index}` };
  const second = { ...piece(profile, `${profile.profileId}-second`, 800 + index), partKind: productionKinds[index], orderId: `${8000 + index}` };
  return {
    group: {
      title: profile.name,
      profileId: profile.profileId,
      profileCode: profile.articleBase,
      partKind: productionKinds[index],
      mode: "single",
      pieces: [first, second]
    },
    result: {
      bins: [{ parts: [
        { length: second.lengthMm, meta: second },
        { length: first.lengthMm, meta: first }
      ] }],
      unfit: []
    }
  };
});
context.optimizeCache = {
  groups: productionGroups.map((entry) => entry.group),
  lastExportResults: new Map(productionGroups.map((entry) => [entry.group.title, entry.result]))
};
const orderedExportGroups = context.buildExportGroups();
assert.deepEqual(
  Array.from(orderedExportGroups, (group) => group.partKind),
  ["frame", "sash", "mullion"]
);
assert.deepEqual(
  Array.from(orderedExportGroups[0].items, (item) => item.orderId),
  ["8002", "7002"],
  "порядок деталей внутри рассчитанного хлыста рамы должен сохраниться"
);
console.log("OK экспортные программы идут frame → sash → mullion без пересортировки деталей внутри хлыста");
