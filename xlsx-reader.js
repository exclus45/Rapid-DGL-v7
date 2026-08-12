(function (root) {
  "use strict";

  function uint8(source) {
    if (source instanceof Uint8Array) return Promise.resolve(source);
    if (source instanceof ArrayBuffer) return Promise.resolve(new Uint8Array(source));
    if (source && typeof source.arrayBuffer === "function") {
      return source.arrayBuffer().then((buffer) => new Uint8Array(buffer));
    }
    return Promise.reject(new Error("Не удалось прочитать выбранный файл"));
  }

  function findEndOfCentralDirectory(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const lowerBound = Math.max(0, bytes.length - 65557);
    for (let offset = bytes.length - 22; offset >= lowerBound; offset--) {
      if (view.getUint32(offset, true) === 0x06054b50) return offset;
    }
    throw new Error("Файл не является поддерживаемым XLSX-архивом");
  }

  function decodeUtf8(bytes) {
    return new TextDecoder("utf-8").decode(bytes);
  }

  function normalizePath(path) {
    const result = [];
    String(path || "").replace(/\\/g, "/").split("/").forEach((part) => {
      if (!part || part === ".") return;
      if (part === "..") result.pop();
      else result.push(part);
    });
    return result.join("/");
  }

  function resolvePath(baseFile, target) {
    if (String(target || "").startsWith("/")) return normalizePath(target);
    const baseParts = normalizePath(baseFile).split("/");
    baseParts.pop();
    return normalizePath(`${baseParts.join("/")}/${target}`);
  }

  function readZipDirectory(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const endOffset = findEndOfCentralDirectory(bytes);
    const entryCount = view.getUint16(endOffset + 10, true);
    let offset = view.getUint32(endOffset + 16, true);
    const entries = new Map();

    for (let index = 0; index < entryCount; index++) {
      if (view.getUint32(offset, true) !== 0x02014b50) {
        throw new Error("Повреждена структура XLSX-архива");
      }
      const method = view.getUint16(offset + 10, true);
      const compressedSize = view.getUint32(offset + 20, true);
      const nameLength = view.getUint16(offset + 28, true);
      const extraLength = view.getUint16(offset + 30, true);
      const commentLength = view.getUint16(offset + 32, true);
      const localOffset = view.getUint32(offset + 42, true);
      const name = normalizePath(decodeUtf8(bytes.subarray(offset + 46, offset + 46 + nameLength)));
      entries.set(name.toLowerCase(), { name, method, compressedSize, localOffset });
      offset += 46 + nameLength + extraLength + commentLength;
    }
    return entries;
  }

  async function inflateRaw(bytes) {
    if (typeof DecompressionStream !== "function") {
      throw new Error("В этом браузере недоступна распаковка XLSX");
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function readZipEntry(bytes, entries, path) {
    const entry = entries.get(normalizePath(path).toLowerCase());
    if (!entry) return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (view.getUint32(entry.localOffset, true) !== 0x04034b50) {
      throw new Error("Повреждён файл внутри XLSX-архива");
    }
    const nameLength = view.getUint16(entry.localOffset + 26, true);
    const extraLength = view.getUint16(entry.localOffset + 28, true);
    const start = entry.localOffset + 30 + nameLength + extraLength;
    const compressed = bytes.subarray(start, start + entry.compressedSize);
    if (entry.method === 0) return compressed;
    if (entry.method === 8) return inflateRaw(compressed);
    throw new Error(`Метод сжатия XLSX не поддерживается: ${entry.method}`);
  }

  function decodeXml(value) {
    return String(value || "")
      .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
      .replace(/&#([0-9]+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)))
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, "&");
  }

  function attribute(tag, name) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = String(tag || "").match(new RegExp(`(?:^|\\s)${escaped}=(?:"([^"]*)"|'([^']*)')`, "i"));
    return decodeXml(match ? (match[1] ?? match[2] ?? "") : "");
  }

  function textRuns(xml) {
    let result = "";
    const pattern = /<t\b[^>]*>([\s\S]*?)<\/t>/gi;
    let match;
    while ((match = pattern.exec(xml))) result += decodeXml(match[1]);
    return result;
  }

  function parseSharedStrings(xml) {
    if (!xml) return [];
    const values = [];
    const pattern = /<si\b[^>]*>([\s\S]*?)<\/si>/gi;
    let match;
    while ((match = pattern.exec(xml))) values.push(textRuns(match[1]));
    return values;
  }

  function columnIndex(reference) {
    const letters = String(reference || "").match(/^[A-Z]+/i)?.[0]?.toUpperCase() || "";
    let result = 0;
    for (const letter of letters) result = result * 26 + letter.charCodeAt(0) - 64;
    return Math.max(0, result - 1);
  }

  function parseCellValue(attributes, body, sharedStrings) {
    const type = attribute(attributes, "t");
    if (type === "inlineStr") return textRuns(body);
    const raw = decodeXml(body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/i)?.[1] || "");
    if (type === "s") return sharedStrings[Number(raw)] ?? "";
    if (type === "str" || type === "e") return raw;
    if (type === "b") return raw === "1";
    if (raw === "") return "";
    const numeric = Number(raw);
    return Number.isFinite(numeric) ? numeric : raw;
  }

  function parseWorksheet(xml, sharedStrings) {
    const rows = [];
    const rowPattern = /<row\b([^>]*)>([\s\S]*?)<\/row>/gi;
    let rowMatch;
    let fallbackRow = 1;
    while ((rowMatch = rowPattern.exec(xml))) {
      const rowNumber = Number(attribute(rowMatch[1], "r")) || fallbackRow;
      fallbackRow = rowNumber + 1;
      const values = [];
      const cellPattern = /<c\b([^>]*?)(?:\/\s*>|>([\s\S]*?)<\/c>)/gi;
      let cellMatch;
      let fallbackColumn = 0;
      while ((cellMatch = cellPattern.exec(rowMatch[2]))) {
        const reference = attribute(cellMatch[1], "r");
        const index = reference ? columnIndex(reference) : fallbackColumn;
        values[index] = parseCellValue(cellMatch[1], cellMatch[2] || "", sharedStrings);
        fallbackColumn = index + 1;
      }
      rows.push({ rowNumber, values });
    }
    return rows;
  }

  async function readTextEntry(bytes, entries, path) {
    const content = await readZipEntry(bytes, entries, path);
    return content ? decodeUtf8(content) : "";
  }

  function workbookSheets(workbookXml) {
    const result = [];
    const pattern = /<sheet\b([^>]*)\/?\s*>/gi;
    let match;
    while ((match = pattern.exec(workbookXml))) {
      result.push({
        name: attribute(match[1], "name"),
        relationId: attribute(match[1], "r:id"),
        state: attribute(match[1], "state")
      });
    }
    return result;
  }

  function workbookRelationships(xml) {
    const result = new Map();
    const pattern = /<Relationship\b([^>]*)\/?\s*>/gi;
    let match;
    while ((match = pattern.exec(xml))) {
      result.set(attribute(match[1], "Id"), attribute(match[1], "Target"));
    }
    return result;
  }

  async function readFirstWorksheet(source) {
    const bytes = await uint8(source);
    const entries = readZipDirectory(bytes);
    const workbookPath = "xl/workbook.xml";
    const workbookXml = await readTextEntry(bytes, entries, workbookPath);
    const relationshipsXml = await readTextEntry(bytes, entries, "xl/_rels/workbook.xml.rels");
    if (!workbookXml || !relationshipsXml) throw new Error("В XLSX не найдена структура книги");

    const sharedStrings = parseSharedStrings(await readTextEntry(bytes, entries, "xl/sharedStrings.xml"));
    const relationships = workbookRelationships(relationshipsXml);
    const sheets = workbookSheets(workbookXml);
    for (const sheet of sheets) {
      const target = relationships.get(sheet.relationId);
      if (!target) continue;
      const sheetPath = resolvePath(workbookPath, target);
      const sheetXml = await readTextEntry(bytes, entries, sheetPath);
      if (!sheetXml) continue;
      const rows = parseWorksheet(sheetXml, sharedStrings);
      if (rows.some((row) => row.values.some((value) => value !== "" && value != null))) {
        return { sheetName: sheet.name, rows };
      }
    }
    throw new Error("В книге нет заполненных рабочих листов");
  }

  root.XlsxReader = { readFirstWorksheet };
})(typeof window !== "undefined" ? window : globalThis);
