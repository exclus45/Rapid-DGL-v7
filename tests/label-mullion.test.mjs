import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync("profiles.js", "utf8"), { filename: "profiles.js" });
vm.runInThisContext(fs.readFileSync("label-data.js", "utf8"), { filename: "label-data.js" });
vm.runInThisContext(fs.readFileSync("label-pdf.js", "utf8"), { filename: "label-pdf.js" });

const { LabelData, LabelPdf, ProfileCatalog } = globalThis;

function detail({
  kind,
  profile,
  orient,
  lengthMm,
  quantity,
  source,
  reinforcementArticle = "KBE 207 (1,4)",
  reinforcementSizeMm = 1200
}) {
  return {
    orderId: "3475",
    productId: "1",
    contour: "К1",
    partKind: kind,
    profile,
    profileCode: profile,
    orient,
    lengthMm,
    quantity,
    angles: kind === "Импост" ? "90 - 90" : "45 - 45",
    sourceFile: source === "pdf" ? "3475.pdf" : "3475.csv",
    sourceRowIndex: 1,
    sourceRow: `${kind};${profile};${orient};${lengthMm};${quantity}`,
    pageNumber: source === "pdf" ? 1 : "",
    reinforcementArticle: source === "pdf" ? reinforcementArticle : "",
    reinforcementSizeMm: source === "pdf" ? reinforcementSizeMm : 0
  };
}

const frameName = ProfileCatalog.findProfile("XS358.01").name;
const sashName = ProfileCatalog.findProfile("XS358.02").name;
const mullionName = ProfileCatalog.findProfile("XS358.03").name;

const cutDetails = [
  detail({ kind: "Створка", profile: sashName, orient: "Горизонталь", lengthMm: 1000, quantity: 4, source: "cut" }),
  detail({ kind: "Створка", profile: sashName, orient: "Вертикаль", lengthMm: 1400, quantity: 4, source: "cut" }),
  detail({ kind: "Рама", profile: frameName, orient: "Горизонталь", lengthMm: 1100, quantity: 2, source: "cut" }),
  detail({ kind: "Рама", profile: frameName, orient: "Вертикаль", lengthMm: 1500, quantity: 2, source: "cut" }),
  detail({ kind: "Импост", profile: mullionName, orient: "", lengthMm: 1265, quantity: 1, source: "cut" })
];
const pdfDetails = cutDetails.map((item) => detail({
  kind: item.partKind,
  profile: item.profile,
  orient: item.partKind === "Импост" ? "Горизонталь" : item.orient,
  lengthMm: item.lengthMm,
  quantity: item.quantity,
  source: "pdf",
  reinforcementArticle: "KBE 207 (1,4)",
  reinforcementSizeMm: item.partKind === "Импост" ? 1245 : item.lengthMm - 20
}));

const cutPosition = {
  key: LabelData.labelPositionKey("3475", "1"),
  orderId: "3475",
  productId: "1",
  sourceFiles: ["3475.csv"],
  details: cutDetails,
  signature: LabelData.detailSignature(cutDetails)
};
const pdfPosition = {
  key: cutPosition.key,
  orderId: "3475",
  productId: "1",
  pdfFiles: ["3475.pdf"],
  allDetails: pdfDetails,
  details: pdfDetails,
  sketch: null,
  signature: LabelData.detailSignature(pdfDetails)
};
const physical = LabelData.buildPhysicalLabelsForReviewRows([{
  key: cutPosition.key,
  status: LabelData.LABEL_STATUS.READY,
  cut: cutPosition,
  pdf: pdfPosition,
  warnings: []
}]);

assert.equal(physical.errors.length, 0);
assert.equal(physical.labels.length, 13, "заказ 3475 должен создавать 13 физических этикеток");
const labelsByKind = Map.groupBy(physical.labels, (label) => LabelData.canonicalPartKindForDetail(label));
assert.equal(labelsByKind.get("sash").length, 8);
assert.equal(labelsByKind.get("frame").length, 4);
assert.equal(labelsByKind.get("mullion").length, 1);

const mullionLabel = labelsByKind.get("mullion")[0];
assert.equal(mullionLabel.orientation, "");
assert.equal(mullionLabel.side, "");
assert.equal(mullionLabel.dimension, null);
assert.equal(mullionLabel.lengthMm, 1265);
assert.equal(mullionLabel.reinforcementArticle, "KBE 207 (1,4)");
assert.equal(mullionLabel.reinforcementSizeMm, 1245);
assert.equal(mullionLabel.reinforcementText, "АРМ. KBE 207 (1,4) — 1245 мм");

const mullionDisplay = LabelPdf.buildLabelDisplayModel(mullionLabel);
assert.equal(mullionDisplay.template, "mullion");
assert.equal(mullionDisplay.mainText, "ИМПОСТ · 1265 ММ");
assert.deepEqual(mullionDisplay.subLines, ["АРМ. KBE 207 (1,4) — 1245 мм"]);
assert.equal(mullionDisplay.orientation, "");
assert.equal(mullionDisplay.dimension, null);

for (const profile of ProfileCatalog.PROFILE_CATALOG.filter((item) => item.kind === "mullion")) {
  assert.equal(
    LabelData.isLabelScopeDetail({ profile: profile.name, profileCode: profile.articleBase, partKind: profile.kind }),
    true,
    `${profile.articleBase} должен входить в область этикеток`
  );
}
assert.equal(LabelData.isLabelScopeDetail({ partKind: "other", profile: "Неизвестная деталь" }), false);

for (const kind of ["frame", "sash"]) {
  const sample = labelsByKind.get(kind)[0];
  const display = LabelPdf.buildLabelDisplayModel(sample);
  assert.equal(display.template, "frame-sash");
  assert.match(display.mainText, /ВЕРХ|НИЗ|ЛЕВО|ПРАВО/);
  assert.match(display.subLines[1], /^ГАБАРИТ:/);
  assert.notEqual(display.dimension, null);
}

function cycleParts(labels, mode) {
  if (mode === "single") {
    return labels.map((label) => ({ length: label.lengthMm, meta: { labelId: label.id, physicalLabel: label } }));
  }
  const parts = [];
  for (let index = 0; index < labels.length; index += 2) {
    parts.push({
      length: labels[index].lengthMm,
      meta: labels.slice(index, index + 2).map((label) => ({ labelId: label.id, physicalLabel: label }))
    });
  }
  return parts;
}

const groups = [
  { title: frameName, profileCode: "XS358.01", partKind: "frame", mode: "double" },
  { title: mullionName, profileCode: "XS358.03", partKind: "mullion", mode: "single" },
  { title: sashName, profileCode: "XS358.02", partKind: "sash", mode: "double" }
];
const results = new Map([
  [frameName, { bins: [{ parts: cycleParts(labelsByKind.get("frame"), "double") }] }],
  [mullionName, { bins: [{ parts: cycleParts(labelsByKind.get("mullion"), "single") }] }],
  [sashName, { bins: [{ parts: cycleParts(labelsByKind.get("sash"), "double") }] }]
]);
const queue = LabelData.buildLabelQueuesFromOptimizeState({
  physicalLabels: physical.labels,
  groups,
  lastExportResults: results
});

assert.deepEqual(queue.auto.map((group) => group.profileCode), ["XS358.02", "XS358.01", "XS358.03"]);
assert.equal(queue.validation.ready, true);
assert.equal(queue.validation.autoLabelCount, 13);
const printKinds = LabelData.buildJobPrintSequence(queue)
  .map((entry) => LabelData.canonicalPartKindForDetail(entry.label));
assert.deepEqual(printKinds, [
  ...Array(8).fill("sash"),
  ...Array(4).fill("frame"),
  "mullion"
]);

console.log("OK mullion labels: scope, content, 3475 count and sash → frame → mullion queue");
