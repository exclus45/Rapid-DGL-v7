import fs from "node:fs";
import vm from "node:vm";

globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync("label-data.js", "utf8"), { filename: "label-data.js" });

const { LabelData } = globalThis;

function assert(name, condition, details = "") {
  if (!condition) {
    throw new Error(`${name}${details ? `: ${details}` : ""}`);
  }
  console.log(`OK ${name}`);
}

function part(orderId, productId, profile, lengthMm, quantity, orient = "Вер") {
  return {
    orderId,
    productId,
    name: profile,
    profileCode: "S358.01",
    lengthMm,
    quantity,
    orient,
    angles: "45 - 45"
  };
}

function pdfPosition(orderId, productId, details, fileName = "label.pdf") {
  const normalizedDetails = details.map((detail) => ({
    orderId,
    productId,
    profile: detail.profile,
    partKind: detail.partKind || LabelData.inferPartKind(detail.profile),
    orient: detail.orient || "Вертикаль",
    lengthMm: detail.lengthMm,
    quantity: detail.quantity,
    sourceFile: fileName
  }));
  return {
    key: LabelData.labelPositionKey(orderId, productId),
    orderId,
    productId,
    pdfFiles: [fileName],
    details: normalizedDetails,
    signature: LabelData.detailSignature(normalizedDetails)
  };
}

const profile = "Рама оконная 63 мм (ProWin)";

const cutFiles = [
  { name: "cut-1.csv", parts: [part("4926", "1", profile, 1406, 2)] },
  { name: "cut-2.csv", parts: [part("4926", "2", profile, 2106, 2)] }
];
const cutCollected = LabelData.collectStoresFromCutFiles(cutFiles);
assert("multiple cut files are collected", cutCollected.store.size === 2);

const pdfFiles = [
  { name: "label-1.pdf", positions: [pdfPosition("4926", "1", [{ profile, lengthMm: 1406, quantity: 2 }])] },
  { name: "label-3.pdf", positions: [pdfPosition("4926", "3", [{ profile, lengthMm: 806, quantity: 2 }])] }
];
const pdfCollected = LabelData.collectStoresFromPdfFiles(pdfFiles);
const review = LabelData.buildLabelKitReview(
  cutCollected.store,
  pdfCollected.store,
  [],
  [],
  new Set(),
  new Map()
);
const byKey = new Map(review.rows.map((row) => [row.key, row]));
assert("ready position is detected", byKey.get("4926 / 1").status === LabelData.LABEL_STATUS.READY);
assert("missing PDF is detected", byKey.get("4926 / 2").status === LabelData.LABEL_STATUS.NO_PDF);
assert("missing cut file is detected", byKey.get("4926 / 3").status === LabelData.LABEL_STATUS.NO_CUT);

const duplicateStore = new Map();
const duplicateConflicts = [];
const duplicateEvents = [];
const basePosition = LabelData.buildCutPositions([part("5000", "1", profile, 1000, 2)], "base.csv")[0];
const samePosition = LabelData.buildCutPositions([part("5000", "1", profile, 1000, 2)], "same.csv")[0];
LabelData.mergePositionIntoStore(duplicateStore, basePosition, "cut", duplicateConflicts, duplicateEvents);
const duplicateResult = LabelData.mergePositionIntoStore(duplicateStore, samePosition, "cut", duplicateConflicts, duplicateEvents);
assert("same logical version is skipped as duplicate", duplicateResult === "duplicate" && duplicateEvents.length === 1);

const conflictStore = new Map();
const conflicts = [];
const conflictDuplicates = [];
const oldPosition = LabelData.buildCutPositions([part("6000", "1", profile, 1000, 2)], "old.csv")[0];
const newPosition = LabelData.buildCutPositions([part("6000", "1", profile, 1005, 2)], "new.csv")[0];
LabelData.mergePositionIntoStore(conflictStore, oldPosition, "cut", conflicts, conflictDuplicates);
const conflictResult = LabelData.mergePositionIntoStore(conflictStore, newPosition, "cut", conflicts, conflictDuplicates);
assert("different logical version creates conflict", conflictResult === "conflict" && conflicts.length === 1);

const ambiguousCut = LabelData.buildCutPositions([
  part("7000", "1", profile, 1000, 2),
  part("7000", "1", profile, 1000, 2)
], "ambiguous.csv")[0];
const ambiguousPdf = pdfPosition("7000", "1", [{ profile, lengthMm: 1000, quantity: 2 }]);
const ambiguous = LabelData.compareCutToPdf(ambiguousCut, ambiguousPdf);
assert("ambiguous repeated matches are detected", ambiguous.ambiguous === true);

const frameProfile = "\u0420\u0430\u043c\u0430 \u043e\u043a\u043e\u043d\u043d\u0430\u044f 63 \u043c\u043c (ProWin)";
const impostProfile = "\u0418\u043c\u043f\u043e\u0441\u0442 82 \u043c\u043c (ProWin)";
const thresholdProfile = "\u041f\u043e\u0440\u043e\u0433 \u0434\u0432\u0435\u0440\u0438 \u0430\u043b\u044e\u043c\u0438\u043d\u0438\u0435\u0432\u044b\u0439";
assert("frame details are in label scope", LabelData.isLabelScopeDetail({ profile: frameProfile, partKind: "\u0420\u0430\u043c\u0430" }));
assert("impost details are outside label scope", !LabelData.isLabelScopeDetail({ profile: impostProfile, partKind: "\u0418\u043c\u043f\u043e\u0441\u0442" }));
assert("threshold profile is outside label scope even with frame part kind", !LabelData.isLabelScopeDetail({ profile: thresholdProfile, partKind: "\u0420\u0430\u043c\u0430" }));

const mismatchCut = LabelData.buildCutPositions([
  {
    orderId: "8000",
    productId: "1",
    name: frameProfile,
    profileCode: "S358.01",
    partKind: "\u0420\u0430\u043c\u0430",
    lengthMm: 1000,
    quantity: 1,
    orient: "\u0412\u0435\u0440",
    angles: "45 - 45"
  }
], "mismatch.csv")[0];
const mismatchPdf = pdfPosition("8000", "1", [{
  profile: frameProfile,
  partKind: "\u0420\u0430\u043c\u0430",
  lengthMm: 1005,
  quantity: 1,
  orient: "\u0412\u0435\u0440\u0442\u0438\u043a\u0430\u043b\u044c"
}], "mismatch.pdf");
const mismatch = LabelData.compareCutToPdf(mismatchCut, mismatchPdf);
assert("mismatch diagnostics include concrete issue", mismatch.ok === false && mismatch.issues.length === 2);
assert("mismatch diagnostics include differing field", mismatch.issues[0].fieldDiffs.includes("\u0434\u043b\u0438\u043d\u0430"));

function labelDetail({
  orderId = "9000",
  productId = "1",
  contour = "\u041a1",
  partKind = "\u0420\u0430\u043c\u0430",
  profile = frameProfile,
  orient,
  lengthMm,
  quantity,
  angles = "45 - 45",
  source = "cut",
  reinforcementArticle = "KBE 207 (1,4)",
  reinforcementSizeMm = 1205
}) {
  return {
    orderId,
    productId,
    contour,
    partKind,
    profile,
    profileCode: profile,
    orient,
    lengthMm,
    quantity,
    angles,
    sourceFile: source === "cut" ? "test.csv" : "test.pdf",
    sourceRowIndex: 1,
    sourceRow: `${orderId}/${productId}; ${contour}; ${partKind}; ${profile}; ${orient}; ${lengthMm}; ${quantity}`,
    pageNumber: source === "pdf" ? 1 : "",
    reinforcementArticle: source === "pdf" ? reinforcementArticle : "",
    reinforcementSizeMm: source === "pdf" ? reinforcementSizeMm : 0
  };
}

function positionFromDetails(orderId, productId, cutDetails, pdfDetails, allPdfDetails = pdfDetails) {
  const cut = {
    key: LabelData.labelPositionKey(orderId, productId),
    orderId,
    productId,
    sourceFiles: ["test.csv"],
    details: cutDetails,
    signature: LabelData.detailSignature(cutDetails)
  };
  const pdf = {
    key: LabelData.labelPositionKey(orderId, productId),
    orderId,
    productId,
    pdfFiles: ["test.pdf"],
    allDetails: allPdfDetails,
    details: pdfDetails,
    sketch: { dataUrl: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" },
    signature: LabelData.detailSignature(pdfDetails)
  };
  return { cut, pdf };
}

function readyRows(...positions) {
  const cutStore = new Map();
  const pdfStore = new Map();
  positions.forEach(({ cut, pdf }) => {
    cutStore.set(cut.key, cut);
    pdfStore.set(pdf.key, pdf);
  });
  return LabelData.buildLabelKitReview(cutStore, pdfStore, [], [], new Set(), new Map()).rows;
}

function buildLabels(...positions) {
  return LabelData.buildPhysicalLabelsForReviewRows(readyRows(...positions));
}

const qty3Cut = [
  labelDetail({ orient: "\u0413\u043e\u0440", lengthMm: 1006, quantity: 6, source: "cut" }),
  labelDetail({ orient: "\u0412\u0435\u0440", lengthMm: 1406, quantity: 6, source: "cut" })
];
const qty3Pdf = qty3Cut.map((detail) => ({ ...detail, source: "pdf", sourceFile: "test.pdf", pageNumber: 1, reinforcementArticle: "KBE 207 (1,4)", reinforcementSizeMm: 1205 }));
const qty3Labels = buildLabels(positionFromDetails("9000", "1", qty3Cut, qty3Pdf));
assert("quantity 3 creates separate physical kits", qty3Labels.labels.length === 12 && qty3Labels.errors.length === 0);
assert("quantity 3 has three instances", new Set(qty3Labels.labels.map((label) => label.instanceNo)).size === 3);

const multiContourCut = [
  labelDetail({ contour: "\u041a1", orient: "\u0413\u043e\u0440", lengthMm: 1006, quantity: 2, source: "cut" }),
  labelDetail({ contour: "\u041a1", orient: "\u0412\u0435\u0440", lengthMm: 1406, quantity: 2, source: "cut" }),
  labelDetail({ contour: "\u041a2", orient: "\u0413\u043e\u0440", lengthMm: 506, quantity: 2, source: "cut" }),
  labelDetail({ contour: "\u041a2", orient: "\u0412\u0435\u0440", lengthMm: 606, quantity: 2, source: "cut" })
];
const multiContourPdf = multiContourCut.map((detail) => ({ ...detail, source: "pdf", sourceFile: "test.pdf", pageNumber: 1, reinforcementArticle: "KBE 207 (1,4)", reinforcementSizeMm: 1205 }));
const multiContourLabels = buildLabels(positionFromDetails("9000", "2", multiContourCut, multiContourPdf));
assert("multiple contours in one position are kept separate", multiContourLabels.labels.length === 8 && multiContourLabels.errors.length === 0);
assert("multiple contours produce separate dimensions", new Set(multiContourLabels.labels.map((label) => `${label.dimension.widthMm}x${label.dimension.heightMm}`)).size === 2);

const doorFrameProfile = "\u0420\u0430\u043c\u0430 \u0434\u0432\u0435\u0440\u043d\u0430\u044f 63 \u043c\u043c (ProWin)";
const threshold = labelDetail({
  orderId: "9000",
  productId: "3",
  contour: "\u041a1",
  partKind: "\u0420\u0430\u043c\u0430",
  profile: thresholdProfile,
  orient: "\u0413\u043e\u0440",
  lengthMm: 894,
  quantity: 1,
  source: "pdf"
});
const doorFrameCut = [
  labelDetail({ orderId: "9000", productId: "3", contour: "\u041a1", partKind: "\u0420\u0430\u043c\u0430", profile: doorFrameProfile, orient: "\u0412\u0435\u0440", lengthMm: 2000, quantity: 1, angles: "45 - 90", source: "cut" }),
  labelDetail({ orderId: "9000", productId: "3", contour: "\u041a1", partKind: "\u0420\u0430\u043c\u0430", profile: doorFrameProfile, orient: "\u0412\u0435\u0440", lengthMm: 2000, quantity: 1, angles: "90 - 45", source: "cut" }),
  labelDetail({ orderId: "9000", productId: "3", contour: "\u041a1", partKind: "\u0420\u0430\u043c\u0430", profile: doorFrameProfile, orient: "\u0413\u043e\u0440", lengthMm: 906, quantity: 1, angles: "45 - 45", source: "cut" })
];
const doorFramePdf = doorFrameCut.map((detail) => ({ ...detail, source: "pdf", sourceFile: "test.pdf", pageNumber: 1, reinforcementArticle: "KBE 207 (1,4)", reinforcementSizeMm: 1205 }));
const doorFrameLabels = buildLabels(positionFromDetails("9000", "3", doorFrameCut, doorFramePdf, [...doorFramePdf, threshold]));
assert("door frame with threshold creates no bottom label", doorFrameLabels.labels.length === 3 && !doorFrameLabels.labels.some((label) => label.side === LabelData.LABEL_SIDE.BOTTOM));
assert("door frame threshold dimension uses threshold rule", doorFrameLabels.labels[0].dimension.widthMm === 900 && doorFrameLabels.labels[0].dimension.heightMm === 2017);
assert("door frame mixed angles set left and right", new Set(doorFrameLabels.labels.map((label) => label.side)).has(LabelData.LABEL_SIDE.LEFT) && new Set(doorFrameLabels.labels.map((label) => label.side)).has(LabelData.LABEL_SIDE.RIGHT));

const sashProfile = "\u0421\u0442\u0432\u043e\u0440\u043a\u0430 \u0434\u0432\u0435\u0440\u043d\u0430\u044f 77 \u043c\u043c (ProWin)";
const sashCut = [
  labelDetail({ orderId: "9000", productId: "4", contour: "\u041a2", partKind: "\u0421\u0442\u0432\u043e\u0440\u043a\u0430", profile: sashProfile, orient: "\u0413\u043e\u0440", lengthMm: 806, quantity: 2, source: "cut" }),
  labelDetail({ orderId: "9000", productId: "4", contour: "\u041a2", partKind: "\u0421\u0442\u0432\u043e\u0440\u043a\u0430", profile: sashProfile, orient: "\u0412\u0435\u0440", lengthMm: 1906, quantity: 2, source: "cut" })
];
const sashPdf = sashCut.map((detail) => ({ ...detail, source: "pdf", sourceFile: "test.pdf", pageNumber: 1, reinforcementArticle: "KBE 207 (1,4)", reinforcementSizeMm: 1205 }));
const sashLabels = buildLabels(positionFromDetails("9000", "4", sashCut, sashPdf));
assert("door sash stays a regular welded contour", sashLabels.labels.length === 4 && sashLabels.labels[0].dimension.widthMm === 800 && sashLabels.labels[0].dimension.heightMm === 1900);

const oddCut = [
  labelDetail({ orderId: "9000", productId: "5", orient: "\u0413\u043e\u0440", lengthMm: 1006, quantity: 3, source: "cut" }),
  labelDetail({ orderId: "9000", productId: "5", orient: "\u0412\u0435\u0440", lengthMm: 1406, quantity: 2, source: "cut" })
];
const oddPdf = oddCut.map((detail) => ({ ...detail, source: "pdf", sourceFile: "test.pdf", pageNumber: 1, reinforcementArticle: "KBE 207 (1,4)", reinforcementSizeMm: 1205 }));
assert("odd quantity creates label formation error", buildLabels(positionFromDetails("9000", "5", oddCut, oddPdf)).errors.length > 0);

const missingPairCut = [
  labelDetail({ orderId: "9000", productId: "6", orient: "\u0413\u043e\u0440", lengthMm: 1006, quantity: 2, source: "cut" })
];
const missingPairPdf = missingPairCut.map((detail) => ({ ...detail, source: "pdf", sourceFile: "test.pdf", pageNumber: 1, reinforcementArticle: "KBE 207 (1,4)", reinforcementSizeMm: 1205 }));
assert("missing pair creates label formation error", buildLabels(positionFromDetails("9000", "6", missingPairCut, missingPairPdf)).errors.length > 0);

const stableA = buildLabels(positionFromDetails("9000", "2", multiContourCut, multiContourPdf)).labels.map((label) => label.id).join("|");
const stableB = buildLabels(positionFromDetails("9000", "2", multiContourCut, multiContourPdf)).labels.map((label) => label.id).join("|");
assert("physical label identifiers are stable", stableA === stableB);

function fakeLabel(id, orderId = "100", productId = "1", lengthMm = 1000) {
  return {
    id,
    orderId,
    productId,
    positionKey: LabelData.labelPositionKey(orderId, productId),
    partKind: "\u0420\u0430\u043c\u0430",
    side: "\u0412\u0415\u0420\u0425",
    lengthMm,
    reinforcementText: "\u0410\u0420\u041c. KBE 207 (1,4) \u2014 900 \u043c\u043c",
    dimension: { widthMm: 994, heightMm: 1394 }
  };
}

const qLabels = [fakeLabel("l1"), fakeLabel("l2"), fakeLabel("l3"), fakeLabel("l4")];
const qGroups = [
  { title: "\u0420\u0430\u043c\u0430", profileCode: "S358.01", mode: "single" },
  { title: "\u0421\u0442\u0432\u043e\u0440\u043a\u0430", profileCode: "S358.02", mode: "double" }
];
const qResults = new Map([
  ["\u0420\u0430\u043c\u0430", { bins: [{ parts: [{ length: 1000, meta: { labelId: "l1", physicalLabel: qLabels[0] } }] }] }],
  ["\u0421\u0442\u0432\u043e\u0440\u043a\u0430", { bins: [{ parts: [{ length: 800, meta: [{ labelId: "l2", physicalLabel: qLabels[1] }, { labelId: "l3", physicalLabel: qLabels[2] }] }] }] }]
]);
const qManual = [{ title: "\u0420\u0443\u0447\u043d\u043e\u0439", reason: "\u043a\u043e\u0441\u043e\u0439 \u044d\u043b\u0435\u043c\u0435\u043d\u0442", pieces: [{ lengthMm: 500, labelId: "l4", physicalLabel: qLabels[3] }] }];
const queue = LabelData.buildLabelQueuesFromOptimizeState({
  physicalLabels: qLabels,
  groups: qGroups,
  lastExportResults: qResults,
  manualGroups: qManual
});
assert("single cycle has one label", queue.auto[0].bars[0].cycles[0].labelIds.length === 1);
assert("double cycle has two different labels", queue.auto[1].bars[0].cycles[0].labelIds.length === 2 && new Set(queue.auto[1].bars[0].cycles[0].labelIds).size === 2);
assert("queue order follows result cycles", queue.auto[0].bars[0].cycles[0].labelIds[0] === "l1" && queue.auto[1].bars[0].cycles[0].labelIds.join(",") === "l2,l3");
assert("manual details are only in manual queue", queue.manual.length === 1 && queue.manual[0].labelId === "l4");
assert("each labelId is used exactly once", queue.validation.ready === true && queue.validation.duplicateLabelIds.length === 0 && queue.validation.lostLabelIds.length === 0);

const duplicateQueue = LabelData.buildLabelQueuesFromOptimizeState({
  physicalLabels: [fakeLabel("dup"), fakeLabel("other")],
  groups: [{ title: "\u0420\u0430\u043c\u0430", mode: "double" }],
  lastExportResults: new Map([["\u0420\u0430\u043c\u0430", { bins: [{ parts: [{ length: 1000, meta: [{ labelId: "dup" }, { labelId: "dup" }] }] }] }]])
});
assert("duplicate labelId blocks queue readiness", duplicateQueue.validation.ready === false && duplicateQueue.validation.duplicateLabelIds.includes("dup"));

const lostQueue = LabelData.buildLabelQueuesFromOptimizeState({
  physicalLabels: [fakeLabel("used"), fakeLabel("lost")],
  groups: [{ title: "\u0420\u0430\u043c\u0430", mode: "single" }],
  lastExportResults: new Map([["\u0420\u0430\u043c\u0430", { bins: [{ parts: [{ length: 1000, meta: { labelId: "used" } }] }] }]])
});
assert("lost labelId blocks queue readiness", lostQueue.validation.ready === false && lostQueue.validation.lostLabelIds.includes("lost"));

const sameSizeDifferentPositions = [
  fakeLabel("a", "100", "1", 1000),
  fakeLabel("b", "200", "1", 1000)
];
const sameSizeQueue = LabelData.buildLabelQueuesFromOptimizeState({
  physicalLabels: sameSizeDifferentPositions,
  groups: [{ title: "\u0420\u0430\u043c\u0430", mode: "double" }],
  lastExportResults: new Map([["\u0420\u0430\u043c\u0430", { bins: [{ parts: [{ length: 1000, meta: [{ labelId: "a" }, { labelId: "b" }] }] }] }]])
});
assert("same sizes from different positions keep different labelIds", sameSizeQueue.auto[0].bars[0].cycles[0].labelIds.join(",") === "a,b");
