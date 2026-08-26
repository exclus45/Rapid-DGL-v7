/**
 * PDF helpers for SuperOkna 7 reports.
 * Requires local pdf.js files under vendor/pdfjs/.
 */

let labelPdfJsPromise = null;

function labelPdfAssetUrl(path) {
  const base = window.location?.href || document.baseURI || "";
  return new URL(path, base).href;
}

async function loadLabelPdfJs() {
  if (window.__labelPdfJs) return window.__labelPdfJs;
  if (typeof window.loadEmbeddedPdfJs === "function") {
    window.__labelPdfJs = await window.loadEmbeddedPdfJs();
    return window.__labelPdfJs;
  }
  if (!labelPdfJsPromise) {
    labelPdfJsPromise = import(labelPdfAssetUrl("vendor/pdfjs/pdf.min.mjs")).then((pdfjsLib) => {
      if (pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = labelPdfAssetUrl("vendor/pdfjs/pdf.worker.mjs");
      }
      return pdfjsLib;
    });
  }
  return labelPdfJsPromise;
}

function setLabelPdfJsForTests(pdfjsLib) {
  window.__labelPdfJs = pdfjsLib;
}

function groupPdfTextRows(items) {
  const rows = [];
  (items || [])
    .filter((item) => normalizeLabelText(item.str))
    .forEach((item) => {
      const y = Math.round(item.transform?.[5] || 0);
      let row = rows.find((r) => Math.abs(r.y - y) <= 2);
      if (!row) {
        row = { y, items: [] };
        rows.push(row);
      }
      row.items.push({ x: item.transform?.[4] || 0, str: normalizeLabelText(item.str) });
    });

  return rows
    .sort((a, b) => b.y - a.y)
    .map((row) => ({
      y: row.y,
      cells: row.items
        .sort((a, b) => a.x - b.x)
        .map((item) => item.str)
        .filter(Boolean),
      text: row.items
        .sort((a, b) => a.x - b.x)
        .map((item) => item.str)
        .filter(Boolean)
        .join(" ")
    }));
}

function parsePdfOrderHeader(rows) {
  for (const row of rows || []) {
    const match = row.text.match(/\b(\d{3,})\s*\/\s*(\d+)\b(?:\s+Количество\s+(\d+)\s*шт\.?)?/i);
    if (match) {
      return {
        orderId: match[1],
        productId: match[2],
        productQuantity: match[3] ? Number(match[3]) : null
      };
    }
  }
  return { orderId: "", productId: "", productQuantity: null };
}

function splitPdfPositionBlocks(rows) {
  const starts = [];
  (rows || []).forEach((row, index) => {
    const header = parsePdfOrderHeader([row]);
    if (header.orderId && header.productId) starts.push({ index, header });
  });
  return starts.map((start, index) => ({
    header: start.header,
    rows: rows.slice(start.index, starts[index + 1]?.index ?? rows.length)
  }));
}

function parsePdfDrainageType(rows) {
  for (const row of rows || []) {
    const key = normalizeLabelKey(row.text || (row.cells || []).join(" "));
    if (!key.includes("пвхдренаж")) continue;
    return LabelData.normalizeDrainageType(key);
  }
  return LabelData.LABEL_DRAINAGE_TYPE.UNKNOWN;
}

function parsePdfFillings(rows) {
  const sourceRows = rows || [];
  const headerIndex = sourceRows.findIndex((row) => {
    const cells = row.cells || [];
    return normalizeLabelText(cells[0]) === "№" && normalizeLabelKey(cells[1]) === "артикул" && cells.length <= 3;
  });
  if (headerIndex < 0) return [];

  const groups = new Map();
  for (let index = headerIndex + 1; index < sourceRows.length; index++) {
    const row = sourceRows[index];
    const cells = row.cells || [];
    const rowKey = normalizeLabelKey(row.text || cells.join(" "));
    if (rowKey.includes("пвхдренаж") || (normalizeLabelText(cells[0]) === "№" && normalizeLabelKey(cells[1]) === "часть")) break;
    const code = normalizeLabelText(cells[0]).toUpperCase();
    if (!/^Э\d+$/.test(code) || cells.length < 2) continue;
    const rawFormula = normalizeLabelText(cells.slice(1).join(""));
    if (!groups.has(code)) groups.set(code, { code, components: [], sourceRows: [] });
    const component = {
      code,
      rawFormula,
      normalizedFormula: LabelData.normalizeFillingFormula(rawFormula),
      sourceRow: row.text,
      sourceRowIndex: index + 1
    };
    groups.get(code).components.push(component);
    groups.get(code).sourceRows.push(row.text);
  }
  return LabelData.resolveFillingGroups(Array.from(groups.values()));
}

function pdfPositionSignature(details, drainageType, fillings = []) {
  const fillingSignature = (fillings || [])
    .map((filling) => {
      const components = filling.components?.length ? filling.components : [filling];
      return `${normalizeLabelText(filling.code)}:${components.map((component) => LabelData.normalizeFillingFormula(component.normalizedFormula || component.rawFormula)).sort().join("+")}`;
    })
    .sort()
    .join("|");
  return `${detailSignature(details)}|drainage:${LabelData.normalizeDrainageType(drainageType)}|fillings:${fillingSignature}`;
}

function parsePdfAngles(value) {
  const match = String(value || "").match(/\((\d{1,3}(?:[,.]\d+)?)\s*°\s*;\s*(\d{1,3}(?:[,.]\d+)?)\s*°\)/);
  if (!match) return "";
  return `${match[1].replace(",", ".")} - ${match[2].replace(",", ".")}`;
}

function parsePdfCutLength(value) {
  const text = String(value || "");
  const matches = Array.from(text.matchAll(/(\d+(?:[,.]\d+)?)\s*мм\.?/gi));
  if (!matches.length) return 0;
  return normalizeLabelNumber(matches[matches.length - 1][1]);
}

function parseReinforcement(value) {
  const text = normalizeLabelText(value);
  const sizeMatch = text.match(/(\d+(?:[,.]\d+)?)\s*мм\.?/i);
  const size = sizeMatch ? normalizeLabelNumber(sizeMatch[1]) : 0;
  const article = sizeMatch ? normalizeLabelText(text.slice(sizeMatch.index + sizeMatch[0].length)) : text;
  return { reinforcementSizeMm: size, reinforcementArticle: article };
}

function buildLabelDisplayModel(label) {
  const kind = LabelData.canonicalPartKindForDetail(label || {});
  const typeText = kind === "sash"
    ? "СТВОРКА"
    : kind === "frame"
      ? "РАМА"
      : kind === "mullion"
        ? "ИМПОСТ"
        : normalizeLabelText(label?.partKind).toUpperCase();
  const lengthMm = normalizeLabelNumber(label?.lengthMm);
  const reinforcement = normalizeLabelText(label?.reinforcementText || "АРМ.");

  if (kind === "mullion") {
    return {
      template: "mullion",
      mainText: `${typeText} · ${lengthMm} ММ`,
      subLines: [reinforcement],
      orientation: "",
      dimension: null
    };
  }

  const dimensionText = label?.dimension
    ? `${label.dimension.widthMm} × ${label.dimension.heightMm} мм`
    : "—";
  const fillThicknesses = LabelData.uniqueFillingThicknesses(label?.fillings?.length ? label.fillings : (label?.fillThicknesses || []).map((thicknessMm) => ({ thicknessMm })));
  const fillingText = fillThicknesses.length
    ? `ЗАПОЛН.: ${fillThicknesses.map((value) => `${LabelData.formatFillingThickness(value)} ММ`).join(" / ")}`
    : "";
  return {
    template: "frame-sash",
    mainText: `${typeText} • ${normalizeLabelText(label?.side)} • ${lengthMm} мм`,
    typeText,
    sideText: normalizeLabelText(label?.side),
    lengthMm,
    subLines: [reinforcement, fillingText, `ГАБАРИТ: ${dimensionText}`].filter(Boolean),
    fillingText,
    orientation: normalizeLabelText(label?.orientation),
    dimension: label?.dimension || null
  };
}

function parseSuperOknaRows(rows, header, fileName, pageNumber) {
  const details = [];
  (rows || []).forEach((row, rowIndex) => {
    const cells = row.cells || [];
    if (!/^([КKЭE]\d+)/i.test(cells[0] || "")) return;
    if (cells.length < 6) return;

    const contour = cells[0];
    const partKind = cells[1] || "";
    const profile = cells[2] || "";
    const orient = cells[3] || "";
    const sizeText = cells[4] || "";
    const quantity = normalizeLabelNumber(cells[5]);
    const reinforcement = parseReinforcement(cells.slice(6).join(" "));
    const lengthMm = parsePdfCutLength(sizeText);

    if (!lengthMm || !quantity) return;
    details.push({
      orderId: header.orderId,
      productId: header.productId,
      contour,
      partKind,
      profile,
      orient: displayLabelOrient(orient),
      angles: parsePdfAngles(sizeText),
      lengthMm,
      quantity,
      reinforcementSizeMm: reinforcement.reinforcementSizeMm,
      reinforcementArticle: reinforcement.reinforcementArticle,
      sourceRow: row.text,
      sourceRowIndex: rowIndex + 1,
      sourceFile: fileName,
      pageNumber
    });
  });
  return details;
}

function bytesToBase64(bytes) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let out = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(out);
}

function latin1FromBytes(bytes) {
  let out = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return out;
}

function extractJpegImagesFromPdf(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const text = latin1FromBytes(bytes);
  const images = [];
  let cursor = 0;
  while (cursor < text.length) {
    const streamIdx = text.indexOf("stream", cursor);
    if (streamIdx === -1) break;
    const headerStart = Math.max(0, streamIdx - 1500);
    const header = text.slice(headerStart, streamIdx);
    cursor = streamIdx + 6;
    if (!/\/Subtype\s*\/Image/.test(header) || !/\/DCTDecode/.test(header)) continue;
    let start = streamIdx + 6;
    if (text[start] === "\r" && text[start + 1] === "\n") start += 2;
    else if (text[start] === "\n" || text[start] === "\r") start += 1;
    const end = text.indexOf("endstream", start);
    if (end === -1) break;
    let imageBytes = bytes.slice(start, end);
    while (imageBytes.length && (imageBytes[imageBytes.length - 1] === 10 || imageBytes[imageBytes.length - 1] === 13)) {
      imageBytes = imageBytes.slice(0, imageBytes.length - 1);
    }
    images.push({
      mimeType: "image/jpeg",
      dataUrl: `data:image/jpeg;base64,${bytesToBase64(imageBytes)}`
    });
  }
  return images;
}

function pdfImageDataToRgba(image, imageKind) {
  const width = Number(image?.width) || 0;
  const height = Number(image?.height) || 0;
  const source = image?.data;
  if (!width || !height || !source) return null;

  const rgba = new Uint8ClampedArray(width * height * 4);
  if (image.kind === imageKind?.RGBA_32BPP || source.length === width * height * 4) {
    rgba.set(source.subarray(0, rgba.length));
    return { width, height, data: rgba };
  }
  if (image.kind === imageKind?.RGB_24BPP || source.length === width * height * 3) {
    for (let sourceIndex = 0, targetIndex = 0; targetIndex < rgba.length; sourceIndex += 3, targetIndex += 4) {
      rgba[targetIndex] = source[sourceIndex];
      rgba[targetIndex + 1] = source[sourceIndex + 1];
      rgba[targetIndex + 2] = source[sourceIndex + 2];
      rgba[targetIndex + 3] = 255;
    }
    return { width, height, data: rgba };
  }
  if (image.kind === imageKind?.GRAYSCALE_1BPP) {
    const rowBytes = Math.ceil(width / 8);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const bit = (source[y * rowBytes + (x >> 3)] >> (7 - (x & 7))) & 1;
        const value = bit ? 255 : 0;
        const targetIndex = (y * width + x) * 4;
        rgba[targetIndex] = value;
        rgba[targetIndex + 1] = value;
        rgba[targetIndex + 2] = value;
        rgba[targetIndex + 3] = 255;
      }
    }
    return { width, height, data: rgba };
  }
  return null;
}

function rgbaToBmpDataUrl(rgbaImage) {
  const { width, height, data } = rgbaImage || {};
  if (!width || !height || !data) return "";
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelSize = rowSize * height;
  const bytes = new Uint8Array(54 + pixelSize);
  const view = new DataView(bytes.buffer);
  bytes[0] = 0x42;
  bytes[1] = 0x4d;
  view.setUint32(2, bytes.length, true);
  view.setUint32(10, 54, true);
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(34, pixelSize, true);
  view.setInt32(38, 2835, true);
  view.setInt32(42, 2835, true);

  for (let outputY = 0; outputY < height; outputY++) {
    const sourceY = height - outputY - 1;
    let targetIndex = 54 + outputY * rowSize;
    for (let x = 0; x < width; x++) {
      const sourceIndex = (sourceY * width + x) * 4;
      const alpha = data[sourceIndex + 3] / 255;
      bytes[targetIndex++] = Math.round(data[sourceIndex + 2] * alpha + 255 * (1 - alpha));
      bytes[targetIndex++] = Math.round(data[sourceIndex + 1] * alpha + 255 * (1 - alpha));
      bytes[targetIndex++] = Math.round(data[sourceIndex] * alpha + 255 * (1 - alpha));
    }
  }
  return `data:image/bmp;base64,${bytesToBase64(bytes)}`;
}

function pdfImageDataToDataUrl(image, imageKind) {
  const rgbaImage = pdfImageDataToRgba(image, imageKind);
  if (typeof document === "undefined") return rgbaImage ? rgbaToBmpDataUrl(rgbaImage) : "";

  const canvas = document.createElement("canvas");
  const drawable = image?.bitmap || image;
  const width = rgbaImage?.width || Number(drawable?.width) || 0;
  const height = rgbaImage?.height || Number(drawable?.height) || 0;
  if (!width || !height) return "";
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return rgbaImage ? rgbaToBmpDataUrl(rgbaImage) : "";
  try {
    if (rgbaImage) {
      const pixels = ctx.createImageData(width, height);
      pixels.data.set(rgbaImage.data);
      ctx.putImageData(pixels, 0, 0);
    } else {
      ctx.drawImage(drawable, 0, 0, width, height);
    }
    return canvas.toDataURL("image/png");
  } catch (error) {
    return rgbaImage ? rgbaToBmpDataUrl(rgbaImage) : "";
  }
}

function getPdfPageObject(page, name) {
  if (!name) return null;
  if (page.objs?.has(name)) return page.objs.get(name);
  if (page.commonObjs?.has(name)) return page.commonObjs.get(name);
  return null;
}

async function extractSketchFromPdfPage(page, pdfjsLib) {
  try {
    const operatorList = await page.getOperatorList();
    const candidates = [];
    for (let index = 0; index < operatorList.fnArray.length; index++) {
      const operation = operatorList.fnArray[index];
      if (operation !== pdfjsLib.OPS.paintImageXObject && operation !== pdfjsLib.OPS.paintInlineImageXObject) continue;
      const argument = operatorList.argsArray[index]?.[0];
      const image = typeof argument === "string" ? getPdfPageObject(page, argument) : argument;
      if (!image?.width || !image?.height) continue;
      candidates.push({ image, sourceName: typeof argument === "string" ? argument : "inline" });
    }
    candidates.sort((a, b) => (b.image.width * b.image.height) - (a.image.width * a.image.height));
    const selected = candidates[0];
    if (!selected) return null;
    const dataUrl = pdfImageDataToDataUrl(selected.image, pdfjsLib.ImageKind);
    if (!dataUrl) return null;
    return {
      mimeType: dataUrl.startsWith("data:image/png") ? "image/png" : "image/bmp",
      dataUrl,
      width: selected.image.width,
      height: selected.image.height,
      sourceName: selected.sourceName
    };
  } catch (error) {
    return null;
  }
}

function loadSketchImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
}

function isUsefulSketchPixel(data, index) {
  const r = data[index];
  const g = data[index + 1];
  const b = data[index + 2];
  const a = data[index + 3];
  if (a < 16) return false;
  return r < 245 || g < 245 || b < 245;
}

function hasUsefulNeighbor(mask, width, height, x, y) {
  let count = 0;
  for (let yy = Math.max(0, y - 1); yy <= Math.min(height - 1, y + 1); yy++) {
    for (let xx = Math.max(0, x - 1); xx <= Math.min(width - 1, x + 1); xx++) {
      if (mask[yy * width + xx]) count += 1;
      if (count >= 2) return true;
    }
  }
  return false;
}

async function cropSketchWhitespace(imageInfo, padding = 8) {
  if (!imageInfo?.dataUrl || typeof document === "undefined") return imageInfo;

  try {
    const image = await loadSketchImage(imageInfo.dataUrl);
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (!width || !height) return imageInfo;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return imageInfo;

    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, width, height);
    const rawMask = new Uint8Array(width * height);
    for (let i = 0; i < pixels.data.length; i += 4) {
      if (isUsefulSketchPixel(pixels.data, i)) rawMask[i / 4] = 1;
    }

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pos = y * width + x;
        if (!rawMask[pos] || !hasUsefulNeighbor(rawMask, width, height, x, y)) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    if (maxX < minX || maxY < minY) return imageInfo;
    const cropX = Math.max(0, minX - padding);
    const cropY = Math.max(0, minY - padding);
    const cropRight = Math.min(width - 1, maxX + padding);
    const cropBottom = Math.min(height - 1, maxY + padding);
    const cropWidth = cropRight - cropX + 1;
    const cropHeight = cropBottom - cropY + 1;
    if (cropWidth < 16 || cropHeight < 16 || cropWidth > width || cropHeight > height) return imageInfo;

    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = cropWidth;
    cropCanvas.height = cropHeight;
    const cropCtx = cropCanvas.getContext("2d");
    if (!cropCtx) return imageInfo;
    cropCtx.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

    return {
      ...imageInfo,
      originalDataUrl: imageInfo.originalDataUrl || imageInfo.dataUrl,
      croppedDataUrl: cropCanvas.toDataURL("image/png"),
      cropBox: {
        x: cropX,
        y: cropY,
        width: cropWidth,
        height: cropHeight,
        originalWidth: width,
        originalHeight: height
      }
    };
  } catch (error) {
    return imageInfo;
  }
}

async function cropSketchImages(images) {
  const cropped = [];
  for (const image of images || []) {
    cropped.push(await cropSketchWhitespace(image));
  }
  return cropped;
}

async function parseSuperOknaPdfArrayBuffer(arrayBuffer, fileName = "") {
  const pdfjsLib = await loadLabelPdfJs();
  const data = new Uint8Array(arrayBuffer.slice(0));
  const doc = await pdfjsLib.getDocument({
    data,
    disableWorker: true,
    useSystemFonts: true,
    isImageDecoderSupported: false,
    isOffscreenCanvasSupported: false,
    stopAtErrors: false
  }).promise;

  const legacyImages = await cropSketchImages(extractJpegImagesFromPdf(arrayBuffer));
  const positions = [];
  const pages = [];
  let imageCount = 0;

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const rows = groupPdfTextRows(content.items);
    const pageSketch = await extractSketchFromPdfPage(page, pdfjsLib);
    const sketch = await cropSketchWhitespace(pageSketch || legacyImages[pageNumber - 1] || null);
    if (sketch) imageCount += 1;
    const positionBlocks = splitPdfPositionBlocks(rows);
    const blocks = positionBlocks.length
      ? positionBlocks
      : [{ header: parsePdfOrderHeader(rows), rows }];

    blocks.forEach((block, blockIndex) => {
      const header = block.header;
      const drainageType = parsePdfDrainageType(block.rows);
      const fillings = parsePdfFillings(block.rows);
      const fillThicknesses = LabelData.uniqueFillingThicknesses(fillings);
      const allDetails = parseSuperOknaRows(block.rows, header, fileName, pageNumber)
        .map((detail) => ({ ...detail, drainageType }));
      const details = allDetails.filter((detail) => LabelData.isLabelScopeDetail(detail));
      const pageRecord = {
        pageNumber,
        blockIndex: blockIndex + 1,
        orderId: header.orderId,
        productId: header.productId,
        productQuantity: header.productQuantity,
        drainageType,
        fillings,
        fillThicknesses,
        rows: block.rows,
        text: block.rows.map((row) => row.text).join("\n"),
        allDetails,
        details,
        sketch
      };
      pages.push(pageRecord);

      if (!header.orderId || !header.productId) return;
      const key = LabelData.labelPositionKey(header.orderId, header.productId);
      const positionSketch = sketch ? { ...sketch, productKey: key, pageNumber } : null;
      pageRecord.sketch = positionSketch;
      positions.push({
        key,
        orderId: header.orderId,
        productId: header.productId,
        productQuantity: header.productQuantity,
        drainageType,
        fillings,
        fillThicknesses,
        pageNumber,
        pdfFiles: [fileName],
        allDetails,
        details,
        sketch: positionSketch,
        text: pageRecord.text,
        signature: pdfPositionSignature(details, drainageType, fillings)
      });
    });
  }

  return {
    fileName,
    pageCount: doc.numPages,
    pages,
    positions,
    imageCount
  };
}

window.LabelPdf = {
  loadLabelPdfJs,
  setLabelPdfJsForTests,
  groupPdfTextRows,
  parsePdfOrderHeader,
  splitPdfPositionBlocks,
  parsePdfDrainageType,
  parsePdfFillings,
  pdfPositionSignature,
  parsePdfAngles,
  parsePdfCutLength,
  parseReinforcement,
  buildLabelDisplayModel,
  parseSuperOknaRows,
  extractJpegImagesFromPdf,
  extractSketchFromPdfPage,
  cropSketchWhitespace,
  parseSuperOknaPdfArrayBuffer
};
