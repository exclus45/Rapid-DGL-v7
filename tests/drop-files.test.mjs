import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync("drop-files.js", "utf8"), { filename: "drop-files.js" });

const { DropFileCollector } = globalThis;

function mockFile(name, size = 100, lastModified = 123) {
  return { name, size, lastModified };
}

function fileEntry(path, file, error = null) {
  const name = path.split("/").pop();
  return {
    name,
    fullPath: `/${path}`,
    isFile: true,
    isDirectory: false,
    file(resolve, reject) {
      if (error) reject(error);
      else resolve(file);
    }
  };
}

function directoryEntry(path, batches) {
  const name = path.split("/").pop();
  return {
    name,
    fullPath: `/${path}`,
    isFile: false,
    isDirectory: true,
    createReader() {
      let index = 0;
      return {
        readEntries(resolve) {
          resolve(batches[index++] || []);
        }
      };
    }
  };
}

function transferItem(entry, file = null) {
  return {
    kind: "file",
    webkitGetAsEntry: entry === undefined ? undefined : () => entry,
    getAsFile: () => file
  };
}

const csv = mockFile("order.csv", 10, 1);
const pdf = mockFile("drawing.PDF", 20, 2);
const txt = mockFile("legacy.txt", 30, 3);
const ignored = mockFile("notes.docx", 40, 4);
const nested = directoryEntry("orders/nested", [
  [fileEntry("orders/nested/legacy.txt", txt)],
  []
]);
const rootFolder = directoryEntry("orders", [
  [fileEntry("orders/order.csv", csv), fileEntry("orders/notes.docx", ignored)],
  [fileEntry("orders/drawing.PDF", pdf), nested],
  []
]);

const recursive = await DropFileCollector.collectSupportedFiles({ items: [transferItem(rootFolder)] });
assert.deepEqual(recursive.files.map((file) => file.name), ["order.csv", "drawing.PDF", "legacy.txt"]);
assert.equal(recursive.warnings.length, 0);
assert.equal(recursive.diagnostics.itemCount, 1);
assert.deepEqual(recursive.diagnostics.directories.map((entry) => entry.batchSizes), [[2, 2, 0], [1, 0]]);
assert.deepEqual(recursive.diagnostics.foundFileNames, ["order.csv", "notes.docx", "drawing.PDF", "legacy.txt"]);
assert.deepEqual(recursive.diagnostics.supportedFileNames, ["order.csv", "drawing.PDF", "legacy.txt"]);
console.log("OK папка и вложенная подпапка читаются рекурсивно, readEntries дочитывается до пустой порции");

const mixed = await DropFileCollector.collectSupportedFiles({
  items: [transferItem(rootFolder), transferItem(fileEntry("single.pdf", mockFile("single.pdf", 50, 5)))]
});
assert.deepEqual(mixed.files.map((file) => file.name), ["order.csv", "drawing.PDF", "legacy.txt", "single.pdf"]);
console.log("OK смесь папки и отдельного файла собирается одним путём");

const secondFolder = directoryEntry("other", [
  [fileEntry("other/second.csv", mockFile("second.csv", 55, 7))],
  []
]);
const multipleFolders = await DropFileCollector.collectSupportedFiles({
  items: [transferItem(rootFolder), transferItem(secondFolder)]
});
assert.deepEqual(multipleFolders.files.map((file) => file.name), ["order.csv", "drawing.PDF", "legacy.txt", "second.csv"]);
console.log("OK несколько папок обрабатываются за один drop");

let dragStoreActive = true;
const closingDirectory = {
  name: "empty",
  fullPath: "/empty",
  isFile: false,
  isDirectory: true,
  createReader() {
    return {
      readEntries(resolve) {
        dragStoreActive = false;
        resolve([]);
      }
    };
  }
};
const capturedBeforeAwait = await DropFileCollector.collectSupportedFiles({
  items: [
    transferItem(closingDirectory),
    {
      kind: "file",
      webkitGetAsEntry: () => dragStoreActive ? fileEntry("late.pdf", pdf) : null,
      getAsFile: () => null
    }
  ]
});
assert.deepEqual(capturedBeforeAwait.files, [pdf]);
console.log("OK все webkitGetAsEntry вызываются синхронно до первого await");

const handleCsv = mockFile("handle.csv", 70, 8);
const handlePdf = mockFile("handle.pdf", 80, 9);
const modernHandle = {
  kind: "directory",
  name: "modern",
  async *values() {
    yield { kind: "file", name: "handle.csv", getFile: async () => handleCsv };
    yield {
      kind: "directory",
      name: "nested",
      async *values() {
        yield { kind: "file", name: "handle.pdf", getFile: async () => handlePdf };
      }
    };
  }
};
let handleCalls = 0;
const modern = await DropFileCollector.collectSupportedFiles({
  items: [{
    kind: "file",
    getAsFileSystemHandle: () => {
      handleCalls += 1;
      return Promise.resolve(modernHandle);
    },
    getAsFile: () => null
  }]
});
assert.equal(handleCalls, 1);
assert.deepEqual(modern.files, [handleCsv, handlePdf]);
assert.deepEqual(modern.diagnostics.handleDirectories.map((entry) => entry.entryCount), [2, 1]);
console.log("OK современный getAsFileSystemHandle рекурсивно читает папки как fallback");

const malformedUriEntry = {
  name: "12-08 70",
  fullPath: "/12-08 70",
  isFile: false,
  isDirectory: true,
  createReader() {
    return {
      readEntries(resolve, reject) {
        reject(new Error("A URI supplied to the API was malformed"));
      }
    };
  }
};
let malformedFallbackCalls = 0;
const malformedFallback = await DropFileCollector.collectSupportedFiles({
  items: [{
    kind: "file",
    webkitGetAsEntry: () => malformedUriEntry,
    getAsFileSystemHandle: () => {
      malformedFallbackCalls += 1;
      return Promise.resolve(modernHandle);
    },
    getAsFile: () => null
  }]
});
assert.equal(malformedFallbackCalls, 1);
assert.deepEqual(malformedFallback.files, [handleCsv, handlePdf]);
assert.equal(malformedFallback.warnings.length, 0);
console.log("OK ошибка URI в legacy readEntries автоматически переключается на FileSystemHandle");

const duplicateEntry = fileEntry("orders/order.csv", csv);
const deduplicated = await DropFileCollector.collectSupportedFiles({
  items: [transferItem(duplicateEntry), transferItem(duplicateEntry)]
});
assert.equal(deduplicated.files.length, 1);
console.log("OK повтор одного файла исключается по пути, имени, размеру и lastModified");

const ordinaryCsv = mockFile("ordinary.csv", 60, 6);
let getAsFileCalls = 0;
let entryFileCalls = 0;
const ordinaryEntry = fileEntry("ordinary.csv", ordinaryCsv);
const originalEntryFile = ordinaryEntry.file;
ordinaryEntry.file = (...args) => {
  entryFileCalls += 1;
  originalEntryFile(...args);
};
const ordinary = await DropFileCollector.collectSupportedFiles({
  items: [{
    kind: "file",
    webkitGetAsEntry: () => ordinaryEntry,
    getAsFile: () => {
      getAsFileCalls += 1;
      return ordinaryCsv;
    }
  }]
});
assert.deepEqual(ordinary.files, [ordinaryCsv]);
assert.equal(entryFileCalls, 1);
assert.equal(getAsFileCalls, 1);
let fallbackGetAsFileCalls = 0;
const itemFallback = await DropFileCollector.collectSupportedFiles({
  items: [{
    kind: "file",
    getAsFile: () => {
      fallbackGetAsFileCalls += 1;
      return ordinaryCsv;
    }
  }]
});
assert.deepEqual(itemFallback.files, [ordinaryCsv]);
assert.equal(fallbackGetAsFileCalls, 1);
const fallback = await DropFileCollector.collectSupportedFiles({ items: [], files: [ordinaryCsv, ignored] });
assert.deepEqual(fallback.files, [ordinaryCsv]);
console.log("OK FileEntry читается через entry.file, а без webkitGetAsEntry работают getAsFile и dataTransfer.files");

const unreadable = fileEntry("orders/broken.csv", mockFile("broken.csv"), new Error("access denied"));
const partial = await DropFileCollector.collectSupportedFiles({
  items: [transferItem(unreadable), transferItem(fileEntry("orders/good.pdf", pdf))]
});
assert.deepEqual(partial.files, [pdf]);
assert.equal(partial.warnings.length, 1);
console.log("OK ошибка чтения одного файла не мешает собрать остальные");

const unsupportedOnly = await DropFileCollector.collectSupportedFiles({
  items: [transferItem(fileEntry("orders/notes.docx", ignored))]
});
assert.equal(unsupportedOnly.files.length, 0);

const appSource = fs.readFileSync("app.js", "utf8");
const indexSource = fs.readFileSync("index.html", "utf8");
assert(indexSource.indexOf('src="drop-files.js?v=20260817-3"') < indexSource.indexOf('src="app.js"'));
assert(appSource.includes("DropFileCollector.collectSupportedFiles(e.dataTransfer)"));
assert(appSource.includes("await addFiles([file])"));
assert(appSource.includes("await addPdfFiles([file])"));
assert(appSource.includes("не найдено поддерживаемых файлов CSV, TXT или PDF"));
assert(appSource.includes("Перетащите CSV/TXT, PDF или папку с файлами сюда"));
console.log("OK UI передаёт собранные File в существующие CSV/TXT и PDF импортёры");
