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
    stopAtErrors: false
  }).promise;

  const images = await cropSketchImages(extractJpegImagesFromPdf(arrayBuffer));
  const positions = [];
  const pages = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const rows = groupPdfTextRows(content.items);
    const header = parsePdfOrderHeader(rows);
    const allDetails = parseSuperOknaRows(rows, header, fileName, pageNumber);
    const details = allDetails.filter((detail) => LabelData.isLabelScopeDetail(detail));
    const sketch = images[pageNumber - 1] || null;
    const pageRecord = {
      pageNumber,
      orderId: header.orderId,
      productId: header.productId,
      productQuantity: header.productQuantity,
      rows,
      text: rows.map((row) => row.text).join("\n"),
      allDetails,
      details,
      sketch
    };
    pages.push(pageRecord);

    if (header.orderId && header.productId) {
      const key = LabelData.labelPositionKey(header.orderId, header.productId);
      positions.push({
        key,
        orderId: header.orderId,
        productId: header.productId,
        productQuantity: header.productQuantity,
        pageNumber,
        pdfFiles: [fileName],
        allDetails,
        details,
        sketch,
        text: pageRecord.text,
        signature: detailSignature(details)
      });
    }
  }

  return {
    fileName,
    pageCount: doc.numPages,
    pages,
    positions,
    imageCount: images.length
  };
}

window.LabelPdf = {
  loadLabelPdfJs,
  setLabelPdfJsForTests,
  groupPdfTextRows,
  parsePdfOrderHeader,
  parsePdfAngles,
  parsePdfCutLength,
  parseReinforcement,
  parseSuperOknaRows,
  extractJpegImagesFromPdf,
  cropSketchWhitespace,
  parseSuperOknaPdfArrayBuffer
};
