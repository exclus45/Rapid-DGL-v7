(function (root) {
  "use strict";

  const HEADER_NAMES = {
    label: "название / номер",
    profile: "профиль",
    length: "длина, мм",
    quantity: "количество",
    note: "примечание"
  };

  function normalizeText(value) {
    return String(value ?? "")
      .replace(/\u00a0/g, " ")
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleLowerCase("ru-RU");
  }

  function displayText(value) {
    return String(value ?? "").replace(/\u00a0/g, " ").trim();
  }

  function isBlank(value) {
    return value == null || displayText(value) === "";
  }

  function formatNumber(value) {
    return Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
  }

  function parsePositiveNumber(value) {
    if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : null;
    const normalized = displayText(value).replace(/\s+/g, "").replace(",", ".");
    if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) return null;
    const result = Number(normalized);
    return Number.isFinite(result) && result > 0 ? result : null;
  }

  function findColumns(rows) {
    for (const row of rows || []) {
      const normalized = (row.values || []).map(normalizeText);
      const profile = normalized.indexOf(HEADER_NAMES.profile);
      const length = normalized.indexOf(HEADER_NAMES.length);
      if (profile < 0 || length < 0) continue;
      const columns = {};
      Object.entries(HEADER_NAMES).forEach(([key, header]) => {
        columns[key] = normalized.indexOf(header);
      });
      return { rowNumber: row.rowNumber, columns };
    }
    return null;
  }

  function createProfileMatcher(profileChoices) {
    const catalog = root.ProfileCatalog;
    const choices = (profileChoices || []).map((choice) => {
      const catalogProfile = catalog?.findProfile?.(
        choice.profileId || choice.profileCode || choice.rapidCode || choice.name || choice.title
      );
      return {
        profileId: catalogProfile?.profileId || displayText(choice.profileId),
        profileCode: catalogProfile?.articleBase || displayText(choice.profileCode),
        rapidCode: catalogProfile?.rapidCode || displayText(choice.rapidCode),
        name: catalogProfile?.name || displayText(choice.name || choice.title || choice.profileCode),
        title: catalogProfile?.name || displayText(choice.title || choice.name || choice.profileCode),
        partKind: catalogProfile?.kind || displayText(choice.partKind),
        aliases: catalogProfile ? [...catalogProfile.aliases] : [...(choice.aliases || [])]
      };
    }).filter((choice) => choice.profileCode && choice.title);

    return function matchProfile(value) {
      const raw = displayText(value);
      const normalized = normalizeText(raw);
      const catalogProfile = catalog?.findProfile?.(raw);
      const matched = choices.filter((choice) => {
        if (catalogProfile && (
          choice.profileId === catalogProfile.profileId ||
          choice.profileCode === catalogProfile.articleBase
        )) return true;
        return [choice.profileCode, choice.rapidCode, choice.name, choice.title, ...choice.aliases]
          .some((candidate) => normalizeText(candidate) === normalized);
      });
      if (matched.length === 1) return { choice: matched[0] };
      if (matched.length > 1) return { error: `Название профиля неоднозначно: ${raw}` };
      return { error: `Профиль не найден в текущем списке: ${raw || "(пусто)"}` };
    };
  }

  function parseRows(rows, profileChoices) {
    const header = findColumns(rows);
    if (!header) {
      return {
        fatalError: "Не найдены обязательные столбцы «Профиль» и «Длина, мм»",
        totalRows: 0,
        validRows: [],
        physicalCount: 0,
        errors: []
      };
    }

    const matchProfile = createProfileMatcher(profileChoices);
    const validRows = [];
    const errors = [];
    let totalRows = 0;

    (rows || []).filter((row) => Number(row.rowNumber) > Number(header.rowNumber)).forEach((row) => {
      const values = row.values || [];
      if (values.every(isBlank)) return;
      totalRows++;
      const profileRaw = values[header.columns.profile];
      const lengthRaw = values[header.columns.length];
      const quantityRaw = header.columns.quantity >= 0 ? values[header.columns.quantity] : "";
      const rowErrors = [];

      if (isBlank(profileRaw)) rowErrors.push("не указан профиль");
      if (isBlank(lengthRaw)) rowErrors.push("не указана длина");
      const lengthMm = parsePositiveNumber(lengthRaw);
      if (!isBlank(lengthRaw) && lengthMm == null) rowErrors.push(`некорректная длина: ${displayText(lengthRaw)}`);

      let quantity = 1;
      if (!isBlank(quantityRaw)) {
        const parsedQuantity = parsePositiveNumber(quantityRaw);
        if (parsedQuantity == null || !Number.isInteger(parsedQuantity)) {
          rowErrors.push(`количество должно быть целым положительным числом: ${displayText(quantityRaw)}`);
        } else {
          quantity = parsedQuantity;
        }
      }

      let matched = null;
      if (!isBlank(profileRaw)) {
        const profileResult = matchProfile(profileRaw);
        if (profileResult.error) rowErrors.push(profileResult.error);
        else matched = profileResult.choice;
      }

      if (rowErrors.length) {
        errors.push({
          rowNumber: row.rowNumber,
          reason: rowErrors.join("; "),
          rawValue: [profileRaw, lengthRaw, quantityRaw].filter((value) => !isBlank(value)).map(displayText).join(" | ")
        });
        return;
      }

      const labelRaw = header.columns.label >= 0 ? displayText(values[header.columns.label]) : "";
      validRows.push({
        label: labelRaw || `Остаток ${formatNumber(lengthMm)} мм`,
        profileId: matched.profileId,
        profileCode: matched.profileCode,
        name: matched.name,
        partKind: matched.partKind,
        lengthMm,
        quantity,
        note: header.columns.note >= 0 ? displayText(values[header.columns.note]) : ""
      });
    });

    return {
      headerRowNumber: header.rowNumber,
      totalRows,
      validRows,
      physicalCount: validRows.reduce((sum, row) => sum + row.quantity, 0),
      errors
    };
  }

  root.RemnantImport = { normalizeText, parseRows };
})(typeof window !== "undefined" ? window : globalThis);
