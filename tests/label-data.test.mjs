import fs from "node:fs";
import vm from "node:vm";

globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync("profiles.js", "utf8"), { filename: "profiles.js" });
vm.runInThisContext(fs.readFileSync("label-data.js", "utf8"), { filename: "label-data.js" });

const { LabelData } = globalThis;

function assert(name, condition, details = "") {
  if (!condition) {
    throw new Error(`${name}${details ? `: ${details}` : ""}`);
  }
  console.log(`OK ${name}`);
}

function part(orderId, productId, profile, lengthMm, quantity, orient = "Вер") {
  const catalogProfile = ProfileCatalog.findProfile(profile);
  return {
    orderId,
    productId,
    name: profile,
    profileCode: catalogProfile?.articleBase || "S358.01",
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
    contour: detail.contour || "",
    profile: detail.profile,
    profileId: detail.profileId || "",
    optimizationProfileId: detail.optimizationProfileId || "",
    profileCode: detail.profileCode || "",
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
assert("duplicate CSV groups remain ambiguous", ambiguous.ok === false && ambiguous.ambiguous === true);
assert("aggregate quantity mismatch identifies quantity", ambiguous.issues.some((issue) => issue.fieldDiffs.includes("\u043a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e")));

const aggregatedCut = LabelData.buildCutPositions([
  part("7100", "1", profile, 1000, 4)
], "aggregated.csv")[0];
const aggregatedPdf = pdfPosition("7100", "1", [
  { contour: "\u041a3", profile, lengthMm: 1000, quantity: 2 },
  { contour: "\u041a5", profile, lengthMm: 1000, quantity: 2 }
]);
const aggregatedMatch = LabelData.compareCutToPdf(aggregatedCut, aggregatedPdf);
assert("PDF contour rows are summed before comparison", aggregatedMatch.ok === true && aggregatedMatch.issues.length === 0);

function profileCompatibilityCut(rows, profileCode = "XS358.01") {
  const profileRecord = ProfileCatalog.findProfile(profileCode);
  return LabelData.buildCutPositions(rows.map((row) => ({
    orderId: "4972",
    productId: "1",
    name: profileRecord?.name || profileCode,
    profileId: profileRecord?.profileId || "",
    optimizationProfileId: profileRecord?.optimizationProfileId || "",
    profileCode: profileRecord?.articleBase || profileCode,
    partKind: row.partKind || "Рама",
    lengthMm: row.lengthMm,
    quantity: row.quantity,
    orient: row.orient,
    angles: "45 - 45"
  })), "4972.csv")[0];
}

function profileCompatibilityPdf(rows) {
  return pdfPosition("4972", "1", rows.map((row) => ({
    profile: row.profile || "Рама окон-дверн 63 мм (ProWin)",
    profileCode: row.profileCode || "",
    partKind: row.partKind || "Рама",
    lengthMm: row.lengthMm,
    quantity: row.quantity,
    orient: row.orient
  })), "4972.pdf");
}

const compatibleProfileMatch = LabelData.compareCutToPdf(
  profileCompatibilityCut([{ lengthMm: 1906, quantity: 2, orient: "Вертикаль" }]),
  profileCompatibilityPdf([{ profileCode: "XS358.01 D", lengthMm: 1906, quantity: 2, orient: "Вертикаль" }])
);
assert(
  "XS358.01 CSV matches XS358.01 D PDF through optimizationProfileId",
  compatibleProfileMatch.ok === true,
  JSON.stringify(compatibleProfileMatch)
);

const incompatibleProfileMatch = LabelData.compareCutToPdf(
  profileCompatibilityCut([{ lengthMm: 1906, quantity: 2, orient: "Вертикаль" }]),
  profileCompatibilityPdf([{
    profile: "Створка оконная 77 мм (ProWin)",
    profileCode: "XS358.02",
    partKind: "Рама",
    lengthMm: 1906,
    quantity: 2,
    orient: "Вертикаль"
  }])
);
assert("XS358.01 and XS358.02 remain incompatible", incompatibleProfileMatch.ok === false);

const compatibleProfileWrongSize = LabelData.compareCutToPdf(
  profileCompatibilityCut([{ lengthMm: 1906, quantity: 2, orient: "Вертикаль" }]),
  profileCompatibilityPdf([{ profileCode: "XS358.01 D", lengthMm: 1907, quantity: 2, orient: "Вертикаль" }])
);
assert("different length remains a conflict for compatible profiles", compatibleProfileWrongSize.ok === false);

const compatibleProfileWrongQuantity = LabelData.compareCutToPdf(
  profileCompatibilityCut([{ lengthMm: 1906, quantity: 2, orient: "Вертикаль" }]),
  profileCompatibilityPdf([{ profileCode: "XS358.01 D", lengthMm: 1906, quantity: 1, orient: "Вертикаль" }])
);
assert("different quantity remains a conflict for compatible profiles", compatibleProfileWrongQuantity.ok === false);

const compatibleProfileWrongOrient = LabelData.compareCutToPdf(
  profileCompatibilityCut([{ lengthMm: 1906, quantity: 2, orient: "Вертикаль" }]),
  profileCompatibilityPdf([{ profileCode: "XS358.01 D", lengthMm: 1906, quantity: 2, orient: "Горизонталь" }])
);
assert("different orientation remains a conflict for compatible profiles", compatibleProfileWrongOrient.ok === false);

const order4972Cut = profileCompatibilityCut([
  { lengthMm: 1906, quantity: 2, orient: "Вертикаль" },
  { lengthMm: 816, quantity: 2, orient: "Горизонталь" }
]);
const order4972Pdf = profileCompatibilityPdf([
  { lengthMm: 1906, quantity: 2, orient: "Вертикаль" },
  { lengthMm: 816, quantity: 2, orient: "Горизонталь" }
]);
const order4972Match = LabelData.compareCutToPdf(order4972Cut, order4972Pdf);
assert("order 4972/1 passes without a false data conflict", order4972Match.ok === true, JSON.stringify(order4972Match));
const order4972Review = LabelData.buildLabelKitReview(
  new Map([[order4972Cut.key, order4972Cut]]),
  new Map([[order4972Pdf.key, order4972Pdf]]),
  [],
  [],
  new Set(),
  new Map()
);
assert("order 4972/1 review status is ready", order4972Review.rows[0]?.status === LabelData.LABEL_STATUS.READY);

const frameProfile = "\u0420\u0430\u043c\u0430 \u043e\u043a\u043e\u043d\u043d\u0430\u044f 63 \u043c\u043c (ProWin)";
const impostProfile = "\u0418\u043c\u043f\u043e\u0441\u0442 82 \u043c\u043c (ProWin)";
const thresholdProfile = "\u041f\u043e\u0440\u043e\u0433 \u0434\u0432\u0435\u0440\u0438 \u0430\u043b\u044e\u043c\u0438\u043d\u0438\u0435\u0432\u044b\u0439";
assert("frame details are in label scope", LabelData.isLabelScopeDetail({ profile: frameProfile, partKind: "\u0420\u0430\u043c\u0430" }));
assert("impost details are in label scope", LabelData.isLabelScopeDetail({ profile: impostProfile, partKind: "\u0418\u043c\u043f\u043e\u0441\u0442" }));
assert("catalog frame kind remains in label scope", LabelData.isLabelScopeDetail({ profile: frameProfile, partKind: "frame" }));
assert("catalog mullion kind is in label scope", LabelData.isLabelScopeDetail({ profile: impostProfile, partKind: "mullion" }));
assert("threshold profile is outside label scope even with frame part kind", !LabelData.isLabelScopeDetail({ profile: thresholdProfile, partKind: "\u0420\u0430\u043c\u0430" }));

const catalogFrameCut = LabelData.buildCutPositions([{
  ...part("7999", "1", frameProfile, 1000),
  profileCode: "XS358.01",
  partKind: "frame"
}], "catalog-frame.csv")[0];
assert("catalog frame kind is normalized for legacy label comparison", catalogFrameCut.details[0]?.partKind === "\u0420\u0430\u043c\u0430");

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

const aggregatedContourCut = [
  labelDetail({ contour: "", orient: "\u0413\u043e\u0440", lengthMm: 1006, quantity: 2, source: "cut" }),
  labelDetail({ contour: "", orient: "\u0413\u043e\u0440", lengthMm: 506, quantity: 2, source: "cut" }),
  labelDetail({ contour: "", orient: "\u0412\u0435\u0440", lengthMm: 1406, quantity: 4, source: "cut" })
];
const aggregatedContourPdf = [
  labelDetail({ contour: "\u041a1", orient: "\u0413\u043e\u0440", lengthMm: 1006, quantity: 2, source: "pdf" }),
  labelDetail({ contour: "\u041a1", orient: "\u0412\u0435\u0440", lengthMm: 1406, quantity: 2, source: "pdf" }),
  labelDetail({ contour: "\u041a2", orient: "\u0413\u043e\u0440", lengthMm: 506, quantity: 2, source: "pdf" }),
  labelDetail({ contour: "\u041a2", orient: "\u0412\u0435\u0440", lengthMm: 1406, quantity: 2, source: "pdf" })
];
const aggregatedContourLabels = buildLabels(positionFromDetails("9000", "8", aggregatedContourCut, aggregatedContourPdf));
assert("aggregated CSV quantity is distributed across PDF contours", aggregatedContourLabels.labels.length === 8 && aggregatedContourLabels.errors.length === 0);
assert("distributed labels preserve PDF contours", new Set(aggregatedContourLabels.labels.map((label) => label.contour)).size === 2);
const aggregatedVerticalLabels = aggregatedContourLabels.labels.filter((label) => LabelData.normalizeLabelOrient(label.orientation) === "vertical");
assert("split PDF rows keep global CSV source unit numbers", new Set(aggregatedVerticalLabels.map((label) => label.sourceUnitNo)).size === 4);

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
assert("single cycle has one label", queue.auto[1].bars[0].cycles[0].labelIds.length === 1);
assert("double cycle has two different labels", queue.auto[0].bars[0].cycles[0].labelIds.length === 2 && new Set(queue.auto[0].bars[0].cycles[0].labelIds).size === 2);
assert("queue order follows sash then frame", queue.auto[0].bars[0].cycles[0].labelIds.join(",") === "l2,l3" && queue.auto[1].bars[0].cycles[0].labelIds[0] === "l1");
assert("manual details are only in manual queue", queue.manual.length === 1 && queue.manual[0].labelId === "l4");
assert("each labelId is used exactly once", queue.validation.ready === true && queue.validation.duplicateLabelIds.length === 0 && queue.validation.lostLabelIds.length === 0);

const queuePrintSequence = LabelData.buildJobPrintSequence(queue);
assert("print sequence follows JOB labelIds without regrouping", queuePrintSequence.slice(0, 3).map((entry) => entry.labelId).join(",") === "l2,l3,l1");
assert("manual labels print after all automatic labels", queuePrintSequence.map((entry) => entry.labelId).join(",") === "l2,l3,l1,l4");
assert("automatic cycles reserve rows before the manual queue", queuePrintSequence.map((entry) => entry.gridCellIndex).join(",") === "0,1,2,4");

const denseManualPrintSequence = LabelData.buildJobPrintSequence({
  auto: queue.auto,
  manual: [
    queue.manual[0],
    { no: 2, profile: "Ручной", lengthMm: 600, labelId: "l5", label: fakeLabel("l5", "100", "1", 600) }
  ]
});
assert("manual print cells are filled left to right", denseManualPrintSequence.slice(-2).map((entry) => entry.gridCellIndex).join(",") === "4,5");

const expectedOrderLabels = [
  { ...fakeLabel("job-1", "4526", "1", 3321), side: "\u0412\u0415\u0420\u0425" },
  { ...fakeLabel("job-2", "4526", "1", 3321), side: "\u041d\u0418\u0417" },
  { ...fakeLabel("job-3", "4526", "1", 2491), side: "\u0412\u0415\u0420\u0425" },
  { ...fakeLabel("job-4", "4526", "1", 2491), side: "\u041d\u0418\u0417" }
];
const expectedOrderQueue = {
  auto: [{
    profile: "\u0420\u0430\u043c\u0430",
    bars: [{
      barNo: 1,
      cycles: [
        { cycleNo: 1, mode: "double", lengthMm: 3321, labelIds: ["job-1", "job-2"], labels: expectedOrderLabels.slice(0, 2) },
        { cycleNo: 2, mode: "double", lengthMm: 2491, labelIds: ["job-3", "job-4"], labels: expectedOrderLabels.slice(2, 4) }
      ]
    }]
  }]
};
const expectedPrintSequence = LabelData.buildJobPrintSequence(expectedOrderQueue);
assert("double print order is A then B for each JOB cycle", expectedPrintSequence.map((entry) => `${entry.slot}:${entry.lengthMm}`).join(",") === "A:3321,B:3321,A:2491,B:2491");

const duplicateQueue = LabelData.buildLabelQueuesFromOptimizeState({
  physicalLabels: [fakeLabel("dup"), fakeLabel("other")],
  groups: [{ title: "\u0420\u0430\u043c\u0430", mode: "double" }],
  lastExportResults: new Map([["\u0420\u0430\u043c\u0430", { bins: [{ parts: [{ length: 1000, meta: [{ labelId: "dup" }, { labelId: "dup" }] }] }] }]])
});
assert("duplicate labelId blocks queue readiness", duplicateQueue.validation.ready === false && duplicateQueue.validation.duplicateLabelIds.includes("dup"));
assert("duplicate labelId is excluded from a double cycle", duplicateQueue.auto[0].bars[0].cycles[0].labelIds.length === 1);

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

const pairedMullionQueue = LabelData.buildLabelQueuesFromOptimizeState({
  physicalLabels: [fakeLabel("m1"), fakeLabel("m2")],
  groups: [{ title: "Импост 82 мм (ProWin)", profileCode: "XS358.03", partKind: "mullion", mode: "double" }],
  lastExportResults: new Map([["Импост 82 мм (ProWin)", {
    bins: [{ parts: [
      { length: 1265, meta: [{ labelId: "m1" }, { labelId: "m2" }] }
    ] }],
    unfit: []
  }]])
});
assert("mullion double pair keeps a two-label cycle", pairedMullionQueue.auto[0].bars[0].cycles[0].mode === "double");
assert("paired mullion double queue remains ready", pairedMullionQueue.validation.ready === true);

function pageCountForPhysicalLabels(count) {
  const entries = Array.from({ length: count }, (_, index) => ({
    label: fakeLabel(`page-${index + 1}`),
    gridCellIndex: index * 3
  }));
  return LabelData.paginatePhysicalLabelEntries(entries, 16).length;
}

assert("1 physical label creates 1 page", pageCountForPhysicalLabels(1) === 1);
assert("13 physical labels create 1 page", pageCountForPhysicalLabels(13) === 1);
assert("16 physical labels create 1 page", pageCountForPhysicalLabels(16) === 1);
assert("17 physical labels create 2 pages", pageCountForPhysicalLabels(17) === 2);
assert("32 physical labels create 2 pages without an empty final page", pageCountForPhysicalLabels(32) === 2);
assert("33 physical labels create 3 pages", pageCountForPhysicalLabels(33) === 3);
assert("no physical labels create no pages", LabelData.paginatePhysicalLabelEntries([], 16).length === 0);

const printStyles = fs.readFileSync("styles.css", "utf8");
const appSource = fs.readFileSync("app.js", "utf8");
assert(
  "label border checkbox and its state logic are removed",
  !appSource.includes("labelPrintBorders") &&
    !appSource.includes("Границы ячеек") &&
    !appSource.includes("showBorders") &&
    !appSource.includes("label-test-sheet--no-borders")
);
assert(
  "label cell borders are always transparent",
  (printStyles.match(/border:\s*0\.15mm solid transparent;/g) || []).length === 2 &&
    !printStyles.includes("label-test-sheet--no-borders")
);
assert(
  "label print removes hidden application panels from layout",
  /body\.label-test-print #app > \*\s*\{\s*display:\s*none !important;/m.test(printStyles)
);
assert(
  "only non-final label pages force a page break",
  /\.label-test-page:not\(:last-child\)\s*\{[^}]*break-after:\s*page;[^}]*page-break-after:\s*always;/s.test(printStyles)
);
