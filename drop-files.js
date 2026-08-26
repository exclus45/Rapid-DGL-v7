(function (root) {
  "use strict";

  const SUPPORTED_FILE_PATTERN = /\.(csv|txt|pdf)$/i;

  function isSupportedFile(file) {
    return Boolean(file?.name && SUPPORTED_FILE_PATTERN.test(file.name));
  }

  function normalizedPath(value) {
    return String(value || "").replace(/\\/g, "/").replace(/^\/+/, "");
  }

  function fileDeduplicationKey(file, relativePath) {
    const path = normalizedPath(relativePath || file?.webkitRelativePath || file?.name);
    return [path, file?.name || "", Number(file?.size) || 0, Number(file?.lastModified) || 0].join("|");
  }

  function readFileEntry(entry) {
    return new Promise((resolve, reject) => entry.file(resolve, reject));
  }

  function readDirectoryBatch(directoryReader) {
    return new Promise((resolve, reject) => directoryReader.readEntries(resolve, reject));
  }

  async function readAllDirectoryEntries(directoryReader, batchSizes = null) {
    const entries = [];
    while (true) {
      const batch = await readDirectoryBatch(directoryReader);
      if (batchSizes) batchSizes.push(batch?.length || 0);
      if (!batch?.length) break;
      entries.push(...batch);
    }
    return entries;
  }

  async function collectEntry(entry, parentPath, addFile, warnings, diagnostics) {
    const entryPath = normalizedPath(entry?.fullPath) || normalizedPath(`${parentPath}/${entry?.name || ""}`);
    diagnostics.entries.push({
      name: entry?.name || "",
      path: entryPath,
      isFile: Boolean(entry?.isFile),
      isDirectory: Boolean(entry?.isDirectory)
    });
    if (entry?.isFile) {
      try {
        const file = await readFileEntry(entry);
        diagnostics.foundFileNames.push(file?.name || entry?.name || "");
        addFile(file, entryPath);
      } catch (error) {
        warnings.push(`Не удалось прочитать файл «${entryPath || entry?.name || "без имени"}»: ${error?.message || error}`);
      }
      return;
    }
    if (!entry?.isDirectory) return;

    let children;
    const directoryDiagnostic = { name: entry?.name || "", path: entryPath, batchSizes: [], entryCount: 0 };
    diagnostics.directories.push(directoryDiagnostic);
    try {
      const directoryReader = entry.createReader();
      children = await readAllDirectoryEntries(directoryReader, directoryDiagnostic.batchSizes);
      directoryDiagnostic.entryCount = children.length;
    } catch (error) {
      warnings.push(`Не удалось прочитать папку «${entryPath || entry?.name || "без имени"}»: ${error?.message || error}`);
      return;
    }
    for (const child of children) {
      await collectEntry(child, entryPath, addFile, warnings, diagnostics);
    }
  }

  async function collectFileSystemHandle(handle, parentPath, addFile, warnings, diagnostics) {
    const handlePath = normalizedPath(`${parentPath}/${handle?.name || ""}`);
    diagnostics.handles.push({ name: handle?.name || "", path: handlePath, kind: handle?.kind || "" });
    if (handle?.kind === "file") {
      try {
        const file = await handle.getFile();
        diagnostics.foundFileNames.push(file?.name || handle?.name || "");
        addFile(file, handlePath);
      } catch (error) {
        warnings.push(`Не удалось прочитать файл «${handlePath || handle?.name || "без имени"}»: ${error?.message || error}`);
      }
      return;
    }
    if (handle?.kind !== "directory") return;

    const directoryDiagnostic = { name: handle?.name || "", path: handlePath, entryCount: 0 };
    diagnostics.handleDirectories.push(directoryDiagnostic);
    try {
      for await (const child of handle.values()) {
        directoryDiagnostic.entryCount += 1;
        await collectFileSystemHandle(child, handlePath, addFile, warnings, diagnostics);
      }
    } catch (error) {
      warnings.push(`Не удалось прочитать папку «${handlePath || handle?.name || "без имени"}»: ${error?.message || error}`);
    }
  }

  async function collectSupportedFiles(dataTransfer) {
    const files = [];
    const warnings = [];
    const seen = new Set();
    const diagnostics = {
      itemCount: Number(dataTransfer?.items?.length) || 0,
      entries: [],
      directories: [],
      handles: [],
      handleDirectories: [],
      handleErrors: [],
      foundFileNames: [],
      supportedFileNames: []
    };
    const addFile = (file, relativePath) => {
      if (!isSupportedFile(file)) return;
      const key = fileDeduplicationKey(file, relativePath);
      if (seen.has(key)) return;
      seen.add(key);
      files.push(file);
      diagnostics.supportedFileNames.push(file.name);
    };

    const items = Array.from(dataTransfer?.items || []).filter((item) => item?.kind === "file");
    if (items.length) {
      // The drag data store can become inaccessible after the first await.
      // Capture every entry/file synchronously while the drop event is active.
      const sources = items.map((item) => {
        let entry = null;
        let handlePromise = null;
        try {
          entry = typeof item.webkitGetAsEntry === "function" ? item.webkitGetAsEntry() : null;
        } catch (error) {
          warnings.push(`Не удалось прочитать перетаскиваемый объект: ${error?.message || error}`);
        }
        if (typeof item.getAsFileSystemHandle === "function") {
          try {
            // Start access while the drop event's data store is still available.
            handlePromise = Promise.resolve(item.getAsFileSystemHandle()).then(
              (handle) => ({ handle, error: null }),
              (error) => ({ handle: null, error })
            );
          } catch (error) {
            warnings.push(`Не удалось получить доступ к перетаскиваемому объекту: ${error?.message || error}`);
          }
        }
        const file = typeof item.getAsFile === "function" ? item.getAsFile() : null;
        return { entry, handlePromise, file };
      });

      for (const source of sources) {
        const foundBeforeEntry = diagnostics.foundFileNames.length;
        const entryWarnings = [];
        if (source.entry) {
          await collectEntry(source.entry, "", addFile, entryWarnings, diagnostics);
        }
        const entryFoundFiles = diagnostics.foundFileNames.length > foundBeforeEntry;
        let handle = null;
        let handleError = null;
        if (source.handlePromise && (!source.entry || entryWarnings.length || !entryFoundFiles)) {
          const handleResult = await source.handlePromise;
          handle = handleResult?.handle || null;
          handleError = handleResult?.error || null;
          if (handleError) {
            diagnostics.handleErrors.push(String(handleError?.message || handleError));
          }
        }
        const foundBeforeHandle = diagnostics.foundFileNames.length;
        if (handle) {
          const handleWarnings = [];
          await collectFileSystemHandle(handle, "", addFile, handleWarnings, diagnostics);
          const handleFoundFiles = diagnostics.foundFileNames.length > foundBeforeHandle;
          if (!handleFoundFiles) warnings.push(...entryWarnings, ...handleWarnings);
        } else {
          warnings.push(...entryWarnings);
          if (handleError && !source.entry) {
            warnings.push(`Не удалось получить доступ к перетаскиваемому объекту: ${handleError?.message || handleError}`);
          }
        }
        if (!source.entry && !handle && source.file) {
          diagnostics.foundFileNames.push(source.file.name || "");
          addFile(source.file, source.file.webkitRelativePath || source.file.name);
        }
      }
    }

    // Keep the legacy FileList path active even when DataTransferItem exists.
    Array.from(dataTransfer?.files || []).forEach((file) => {
      diagnostics.foundFileNames.push(file?.name || "");
      addFile(file, file.webkitRelativePath || file.name);
    });

    return { files, warnings, diagnostics };
  }

  root.DropFileCollector = Object.freeze({
    isSupportedFile,
    fileDeduplicationKey,
    readAllDirectoryEntries,
    collectSupportedFiles
  });
})(typeof window !== "undefined" ? window : globalThis);
