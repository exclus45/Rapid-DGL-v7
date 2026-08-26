import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync("profiles.js", "utf8"), { filename: "profiles.js" });
vm.runInThisContext(fs.readFileSync("label-data.js", "utf8"), { filename: "label-data.js" });
vm.runInThisContext(fs.readFileSync("label-pdf.js", "utf8"), { filename: "label-pdf.js" });

const { LabelData, LabelPdf, ProfileCatalog } = globalThis;

assert.equal(LabelData.normalizeDrainageType(" Обычный "), "normal");
assert.equal(LabelData.normalizeDrainageType("СНАРУЖИ"), "outside");
assert.equal(LabelData.normalizeDrainageType(""), "unknown");

const positionRows = [
  { text: "6243/1 Количество 1 шт.", cells: ["6243/1 Количество 1 шт."] },
  { text: "ПВХ дренаж Обычный", cells: ["ПВХ дренаж", "Обычный"] },
  { text: "К1 Рама", cells: ["К1", "Рама"] },
  { text: "6243/2 Количество 1 шт.", cells: ["6243/2 Количество 1 шт."] },
  { text: "ПВХ дренаж Снаружи", cells: ["ПВХ дренаж", "Снаружи"] },
  { text: "К1 Рама", cells: ["К1", "Рама"] }
];
const blocks = LabelPdf.splitPdfPositionBlocks(positionRows);
assert.equal(blocks.length, 2);
assert.equal(blocks[0].header.productId, "1");
assert.equal(LabelPdf.parsePdfDrainageType(blocks[0].rows), "normal");
assert.equal(blocks[1].header.productId, "2");
assert.equal(LabelPdf.parsePdfDrainageType(blocks[1].rows), "outside");
assert.equal(LabelPdf.parsePdfDrainageType([{ text: "Старый отчёт", cells: ["Старый отчёт"] }]), "unknown");
assert.notEqual(
  LabelPdf.pdfPositionSignature([], "normal"),
  LabelPdf.pdfPositionSignature([], "outside"),
  "изменение дренажа создаёт другую логическую версию PDF-позиции"
);

const commonImage = {
  width: 2,
  height: 2,
  kind: 2,
  data: new Uint8ClampedArray([
    255, 255, 255, 0, 0, 0,
    0, 180, 190, 255, 255, 255
  ])
};
const pageWithCommonSketch = {
  objs: { has: () => false, get: () => null },
  commonObjs: {
    has: (name) => name === "g_d0_img_p1_1",
    get: () => commonImage
  },
  getOperatorList: async () => ({
    fnArray: [85],
    argsArray: [["g_d0_img_p1_1", 2, 2]]
  })
};
const commonSketch = await LabelPdf.extractSketchFromPdfPage(pageWithCommonSketch, {
  OPS: { paintImageXObject: 85, paintInlineImageXObject: 86 },
  ImageKind: { GRAYSCALE_1BPP: 1, RGB_24BPP: 2, RGBA_32BPP: 3 }
});
assert(commonSketch?.dataUrl?.startsWith("data:image/bmp;base64,"));
assert.equal(commonSketch.sourceName, "g_d0_img_p1_1");

const browserCanvasCalls = [];
const originalDocument = globalThis.document;
globalThis.document = {
  createElement: () => ({
    width: 0,
    height: 0,
    getContext: () => ({
      drawImage: (...args) => browserCanvasCalls.push(args)
    }),
    toDataURL: () => "data:image/png;base64,browser-bitmap"
  })
};
const bitmap = { width: 667, height: 381 };
const browserSketch = await LabelPdf.extractSketchFromPdfPage({
  objs: { has: () => false, get: () => null },
  commonObjs: {
    has: (name) => name === "g_d0_img_p1_1",
    get: () => ({ width: 667, height: 381, bitmap })
  },
  getOperatorList: async () => ({ fnArray: [85], argsArray: [["g_d0_img_p1_1", 667, 381]] })
}, {
  OPS: { paintImageXObject: 85, paintInlineImageXObject: 86 },
  ImageKind: { GRAYSCALE_1BPP: 1, RGB_24BPP: 2, RGBA_32BPP: 3 }
});
globalThis.document = originalDocument;
assert.equal(browserSketch?.dataUrl, "data:image/png;base64,browser-bitmap");
assert.equal(browserCanvasCalls[0]?.[0], bitmap);

const frameProfile = ProfileCatalog.findProfile("XS358.01").name;

function detail({ orient, lengthMm, quantity, source }) {
  return {
    orderId: "6243",
    productId: "2",
    contour: "К1",
    partKind: "Рама",
    profile: frameProfile,
    profileCode: "XS358.01",
    orient,
    lengthMm,
    quantity,
    angles: "45 - 45",
    sourceFile: source === "pdf" ? "6243.pdf" : "6243.csv",
    sourceRowIndex: 1,
    sourceRow: `${orient};${lengthMm};${quantity}`,
    reinforcementArticle: source === "pdf" ? "KBE 207 (1,4)" : "",
    reinforcementSizeMm: source === "pdf" ? lengthMm - 100 : 0
  };
}

function buildLabels(drainageType) {
  const cutDetails = [
    detail({ orient: "Горизонталь", lengthMm: 1006, quantity: 4, source: "cut" }),
    detail({ orient: "Вертикаль", lengthMm: 1406, quantity: 4, source: "cut" })
  ];
  const pdfDetails = cutDetails.map((item) => ({ ...item, sourceFile: "6243.pdf", reinforcementArticle: "KBE 207 (1,4)", reinforcementSizeMm: item.lengthMm - 100 }));
  const key = LabelData.labelPositionKey("6243", "2");
  return LabelData.buildPhysicalLabelsForReviewRows([{
    key,
    status: LabelData.LABEL_STATUS.READY,
    warnings: [],
    cut: { key, orderId: "6243", productId: "2", details: cutDetails },
    pdf: { key, orderId: "6243", productId: "2", drainageType, allDetails: pdfDetails, details: pdfDetails, sketch: null }
  }]);
}

const outside = buildLabels("outside");
assert.equal(outside.errors.length, 0);
assert.equal(outside.labels.length, 8);
assert(outside.labels.every((label) => label.drainageType === "outside"));
assert.equal(outside.labels.filter(LabelData.isOutsideDrainageLabel).length, 2, "каждый экземпляр Рама/Низ получает отметку");
assert(outside.labels.filter(LabelData.isOutsideDrainageLabel).every((label) => label.side === "НИЗ"));

const frameTop = outside.labels.find((label) => label.side === "ВЕРХ");
const frameBottom = outside.labels.find((label) => label.side === "НИЗ");
assert.equal(LabelData.isOutsideDrainageLabel(frameTop), false);
assert.equal(LabelData.isOutsideDrainageLabel(frameBottom), true);
assert.equal(LabelData.isOutsideDrainageLabel({ ...frameBottom, partKind: "Створка", partKindNormalized: "створка" }), false);
assert.equal(LabelData.isOutsideDrainageLabel({ ...frameBottom, drainageType: "normal" }), false);
assert.equal(LabelData.isOutsideDrainageLabel({ ...frameBottom, drainageType: "unknown" }), false);

const cycleParts = [];
for (let index = 0; index < outside.labels.length; index += 2) {
  cycleParts.push({
    length: outside.labels[index].lengthMm,
    meta: outside.labels.slice(index, index + 2).map((label) => ({ labelId: label.id, physicalLabel: label }))
  });
}
const queue = LabelData.buildLabelQueuesFromOptimizeState({
  physicalLabels: outside.labels,
  groups: [{ title: frameProfile, profileCode: "XS358.01", partKind: "frame", mode: "double" }],
  lastExportResults: new Map([[frameProfile, { bins: [{ parts: cycleParts }] }]])
});
assert.equal(queue.validation.ready, true);
assert.equal(queue.auto.flatMap((profile) => profile.bars).flatMap((bar) => bar.cycles).flatMap((cycle) => cycle.labels).filter(LabelData.isOutsideDrainageLabel).length, 2);
assert.equal(LabelData.buildJobPrintSequence(queue).map((entry) => entry.label).filter(LabelData.isOutsideDrainageLabel).length, 2);

const normal = buildLabels("normal");
const unknown = buildLabels("unknown");
assert.equal(normal.labels.filter(LabelData.isOutsideDrainageLabel).length, 0);
assert.equal(unknown.labels.filter(LabelData.isOutsideDrainageLabel).length, 0);

const appSource = fs.readFileSync("app.js", "utf8");
const stylesSource = fs.readFileSync("styles.css", "utf8");
assert(appSource.includes("label-drainage-badge"));
assert(stylesSource.includes("padding: 0.75mm 1.2mm"));
assert(stylesSource.includes("font-size: 2mm"));
assert(!stylesSource.includes("width: 16mm"));
assert(!stylesSource.includes("height: 6mm"));
assert(stylesSource.includes("print-color-adjust: exact"));

console.log("OK outside drainage parsing, physical labels, queue and print marker");
