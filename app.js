const appEl = document.getElementById("app");

appEl.innerHTML = `
  <div class="tabs">
    <button class="tab-btn active" data-tab="import">Импорт</button>
    <button class="tab-btn" data-tab="check">Проверка комплекта</button>
    <button class="tab-btn" data-tab="optimize">Оптимизация</button>
    <button class="tab-btn" data-tab="export">Экспорт на пилу</button>
    <button class="tab-btn" data-tab="murat">Экспорт на станок</button>
    <button class="tab-btn" data-tab="labels">Этикетки</button>
  </div>

  <div class="tab-panel active" id="tab-import">
    <div class="card">
      <div class="row center-row">
        <input id="csvInput" type="file" accept=".csv,.txt" multiple />
        <input id="pdfInput" type="file" accept=".pdf" multiple />
        <label class="import-btn" for="csvInput">Импорт</label>
        <label class="btn-secondary" for="pdfInput">PDF для этикеток</label>
        <button id="clearBtn" type="button" class="btn-secondary">Очистить</button>
        <button id="printImportBtn" type="button" class="btn-secondary">Печать</button>
      </div>
      <div id="dropZone">Перетащите CSV/TXT, PDF или папку с файлами сюда<br /><small>или выберите через кнопки выше</small></div>
      <div class="file-list-title">Файлы раскроя</div>
      <div id="fileList"></div>
      <div class="file-list-title">PDF для этикеток</div>
      <div id="pdfFileList"></div>
    </div>

    <div class="card">
      <h2 class="center-heading">Всего элементов: <span id="totalCount">0</span></h2>
      <div id="tableWrap" class="import-print-area"></div>
    </div>
  </div>

  <div class="tab-panel" id="tab-check">
    <div class="card">
      <h2 class="center-heading">Проверка комплекта задания</h2>
      <div id="labelSummary" class="label-summary"></div>
      <div id="fillThicknessResolution"></div>
      <details class="fill-dictionary-panel">
        <summary>Справочник заполнений</summary>
        <div id="fillThicknessDictionary"></div>
      </details>
      <div id="labelReview"></div>
    </div>
  </div>

  <div class="tab-panel" id="tab-labels">
    <div class="card">
      <h2 class="center-heading">Этикетки</h2>
      <div class="label-print-controls">
        <button id="testPrintLabelsBtn" class="btn-secondary" type="button" disabled>Пробная печать A4</button>
        <span id="labelPrintBlockReason" class="label-print-block-reason"></span>
      </div>
      <div id="labelsSummary" class="label-summary"></div>
      <div id="labelsPreview"></div>
    </div>
  </div>

  <div id="labelTestPrintSheet" class="label-test-sheet" aria-hidden="true"></div>
  <div id="reinforcementPrintArea" class="reinforcement-print-area" aria-hidden="true">
    <div class="opt-result-header reinforcement-print-header">
      <h2>Результат раскроя</h2>
      <div class="opt-date">
        <label for="reinforcementPrintDate">Дата:</label>
        <input id="reinforcementPrintDate" type="date" readonly tabindex="-1" />
      </div>
    </div>
    <div id="reinforcementPrintResults"></div>
  </div>

  <div class="tab-panel" id="tab-optimize">
    <div class="optimization-view-header">
      <h2>Оптимизация</h2>
      <div class="optimization-view-tabs" role="tablist" aria-label="Раздел оптимизации">
        <button class="optimization-view-tab active" type="button" data-optimization-view="profiles" role="tab" aria-selected="true">Профили</button>
        <button class="optimization-view-tab" type="button" data-optimization-view="reinforcement" role="tab" aria-selected="false">Армирование</button>
      </div>
    </div>

    <div id="optimizationProfilesView" class="optimization-view-panel active" data-optimization-panel="profiles" role="tabpanel">
      <div class="card">
        <div class="opt-controls">
          <button id="optimizeBtn" class="import-btn" type="button">Рассчитать</button>
          <button id="printBtn" class="btn-secondary" type="button">Печать</button>
          <button id="saveBtn" class="btn-secondary" type="button">Сохранить</button>
        </div>
        <div id="optBlocks"></div>
      </div>
      <div class="card print-area">
        <div class="opt-result-header">
          <h2>Результат раскроя</h2>
          <div class="opt-date">
            <label for="cutDate">Дата:</label>
            <input id="cutDate" type="date" />
          </div>
        </div>
        <div id="optResults"><small>Нет расчетов</small></div>
      </div>
    </div>

    <div id="optimizationReinforcementView" class="optimization-view-panel" data-optimization-panel="reinforcement" role="tabpanel">
      <div class="card">
        <div class="opt-controls reinforcement-print-controls">
          <button id="printReinforcementBtn" class="btn-secondary" type="button">Печать</button>
        </div>
        <div id="reinforcementOptimizationSettings"><small>Нет данных армирования</small></div>
      </div>
      <div class="card reinforcement-optimization-card">
        <div class="opt-result-header">
          <h2>Результат раскроя</h2>
          <div class="opt-date">
            <label for="reinforcementCutDate">Дата:</label>
            <input id="reinforcementCutDate" type="date" />
          </div>
        </div>
        <div id="reinforcementOptimizationResults"><small>Нет данных армирования</small></div>
      </div>
    </div>
  </div>

  <div class="tab-panel" id="tab-export">
    <div class="card">
      <h2 id="exportTitle">Всего в автоматическом режиме: 0</h2>
      <div id="exportBlocks"><small>Нет данных</small></div>
    </div>
  </div>

  <div class="tab-panel" id="tab-murat">
    <div class="card">
      <h2>Экспорт на станок MURAT KD-658</h2>
      <p>Здесь отображаются свариваемые контуры для станка MURAT KD-658.</p>
      <div class="opt-controls">
        <button id="refreshMuratBtn" class="btn-secondary" type="button">Обновить список</button>
      </div>
      <div id="muratTableWrap"><small>Сначала выполните проверку комплекта.</small></div>
    </div>
  </div>
`;

const tableWrap = document.getElementById("tableWrap");
const input = document.getElementById("csvInput");
const pdfInput = document.getElementById("pdfInput");
const clearBtn = document.getElementById("clearBtn");
const dropZone = document.getElementById("dropZone");
const dropZoneIdleHtml = dropZone?.innerHTML || "";
const fileList = document.getElementById("fileList");
const pdfFileList = document.getElementById("pdfFileList");
const totalCountEl = document.getElementById("totalCount");
const optBlocks = document.getElementById("optBlocks");
const optResults = document.getElementById("optResults");
const reinforcementOptimizationSettings = document.getElementById("reinforcementOptimizationSettings");
const reinforcementOptimizationResults = document.getElementById("reinforcementOptimizationResults");
const reinforcementPrintArea = document.getElementById("reinforcementPrintArea");
const reinforcementPrintResults = document.getElementById("reinforcementPrintResults");
const optimizationViewTabs = document.querySelectorAll(".optimization-view-tab");
const optimizationViewPanels = document.querySelectorAll(".optimization-view-panel");
const optimizeBtn = document.getElementById("optimizeBtn");
const printBtn = document.getElementById("printBtn");
const printReinforcementBtn = document.getElementById("printReinforcementBtn");
const printImportBtn = document.getElementById("printImportBtn");
const saveBtn = document.getElementById("saveBtn");
const cutDateInput = document.getElementById("cutDate");
const reinforcementCutDateInput = document.getElementById("reinforcementCutDate");
const reinforcementPrintDate = document.getElementById("reinforcementPrintDate");
const exportBlocks = document.getElementById("exportBlocks");
const exportTitle = document.getElementById("exportTitle");
const labelSummary = document.getElementById("labelSummary");
const labelReview = document.getElementById("labelReview");
const fillThicknessResolution = document.getElementById("fillThicknessResolution");
const fillThicknessDictionaryEl = document.getElementById("fillThicknessDictionary");
const labelsSummary = document.getElementById("labelsSummary");
const labelsPreview = document.getElementById("labelsPreview");
const testPrintLabelsBtn = document.getElementById("testPrintLabelsBtn");
const labelPrintBlockReason = document.getElementById("labelPrintBlockReason");
const labelTestPrintSheet = document.getElementById("labelTestPrintSheet");
const refreshMuratBtn = document.getElementById("refreshMuratBtn");
const muratTableWrap = document.getElementById("muratTableWrap");

const DEFAULT_STOCK = 6500;
const DEFAULT_KERF = 5;
const DEFAULT_MODE = "double";
const DEFAULT_SCRAP_MAX = 70;
const APP_PVC_OPTIMIZATION_MODE = Object.freeze({
  MAX_SAVINGS: "max_savings",
  SOFT_BY_PRODUCT: "soft_by_product",
  HARD_BY_PRODUCT: "hard_by_product"
});
const DEFAULT_PVC_OPTIMIZATION_MODE = APP_PVC_OPTIMIZATION_MODE.MAX_SAVINGS;
const SHOW_LABEL_BARCODE = false;
const PROFILE_BAD_LEFTOVER_RULES = {
  S35801: { scrapMax: DEFAULT_SCRAP_MAX, minUsefulLeftover: 650 },
  XS35801: { scrapMax: DEFAULT_SCRAP_MAX, minUsefulLeftover: 650 },
  S35816: { scrapMax: DEFAULT_SCRAP_MAX, minUsefulLeftover: 650 },
  S57111: { scrapMax: DEFAULT_SCRAP_MAX, minUsefulLeftover: 650 },
  S67011: { scrapMax: DEFAULT_SCRAP_MAX, minUsefulLeftover: 650 },
  S35802: { scrapMax: DEFAULT_SCRAP_MAX, minUsefulLeftover: 550 },
  S57122: { scrapMax: DEFAULT_SCRAP_MAX, minUsefulLeftover: 550 },
  S67002: { scrapMax: DEFAULT_SCRAP_MAX, minUsefulLeftover: 550 },
  XS35802: { scrapMax: DEFAULT_SCRAP_MAX, minUsefulLeftover: 550 }
};
const EXPORT_ORDER_NO = 1;
const EXPORT_CUT_NO = 1;
const EXPORT_COLOR = 0;
const EXPORT_PAIR_MODE = 0;

let allParts = [];
const selectedProductionGroups = new Map();
const collapsedImportGroups = new Set();
const reinforcementModes = new Map();
let reinforcementOptimizationMode = "max_savings";
let reinforcementOptimizationCache = [];
let activeOptimizationView = "profiles";
let sharedCutDateValue = "";
let pvcOptimizationMode = DEFAULT_PVC_OPTIMIZATION_MODE;
let optimizeCache = { groups: [], skewGroups: [], baseSkewCount: 0 };
let deletedParts = [];
const filesMap = new Map();
const pdfFilesMap = new Map();
const contentHashes = new Set();
let labelDuplicateEvents = [];
let labelConflictEvents = [];
const excludedLabelPositions = new Set();
const labelDecisions = new Map();
let lastLabelReview = { rows: [], summary: {} };
let lastPhysicalLabels = { labels: [], errors: [], byPosition: new Map(), summary: { total: 0, positions: 0 } };
let lastMuratRecords = [];
let lastLabelQueues = null;
let labelPreviewMode = "logical";
let exportCache = [];
let exportReady = false;
let profileRemnants = [];
let profileRemnantSequence = 1;
let profileRemnantImportReport = null;

function getAppLocalStorage() {
  try {
    return window.localStorage;
  } catch (error) {
    return null;
  }
}

let fillThicknessDictionary = LabelData.readFillThicknessDictionary(getAppLocalStorage());

function normalizeProfileRuleKey(profileCode) {
  const base = extractProfileBase(profileCode || "");
  return String(base)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function resolveAppCatalogProfile(...values) {
  const catalog = typeof window !== "undefined" ? window.ProfileCatalog : null;
  if (!catalog?.findProfile) return null;
  for (const value of values) {
    const profile = catalog.findProfile(value);
    if (profile) return profile;
  }
  return null;
}

function profileDisplayNameForCode(profileCode) {
  const profileKey = normalizeProfileRuleKey(profileCode);
  const groups = [
    ...(optimizeCache.groups || []),
    ...(optimizeCache.skewGroups || [])
  ];
  const matchedGroup = groups.find(
    (group) => normalizeProfileRuleKey(group.profileCode) === profileKey
  );
  return String(matchedGroup?.title || profileCode || "").trim();
}

function getOptimizeRulesForProfile(profileCode) {
  const catalogProfile = resolveAppCatalogProfile(profileCode);
  if (catalogProfile) {
    const optimizationProfile = window.ProfileCatalog?.findOptimizationProfile?.(catalogProfile) || catalogProfile;
    const optimization = optimizationProfile.optimization || {};
    if (optimization.scrapMax === null || optimization.scrapMax === undefined ||
        optimization.minUsefulLeftover === null || optimization.minUsefulLeftover === undefined) {
      return null;
    }
    return optimization;
  }
  const key = normalizeProfileRuleKey(profileCode);
  return PROFILE_BAD_LEFTOVER_RULES[key] || null;
}

function getOptimizeRulesForPieces(pieces) {
  let selected = null;
  for (const piece of pieces || []) {
    const rule = getOptimizeRulesForProfile(piece?.profileCode || "");
    if (!rule) continue;
    if (!selected || Number(rule.minUsefulLeftover) > Number(selected.minUsefulLeftover)) {
      selected = rule;
    }
  }
  return selected;
}

function applyCatalogProfileToRemnant(remnant, ...values) {
  const catalogProfile = resolveAppCatalogProfile(...values);
  if (!catalogProfile) return remnant;
  remnant.profileId = catalogProfile.profileId;
  remnant.profileCode = catalogProfile.articleBase;
  remnant.name = catalogProfile.name;
  remnant.partKind = catalogProfile.kind;
  return remnant;
}

function validateProfileRemnant(remnant) {
  const errors = [];
  if (!String(remnant.profileCode || "").trim()) errors.push("Укажите профиль");
  if (!Number.isFinite(Number(remnant.lengthMm)) || Number(remnant.lengthMm) <= 0) {
    errors.push("Длина должна быть больше 0");
  }
  const quantity = Number(remnant.quantity);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    errors.push("Количество должно быть целым положительным числом");
  }
  return errors;
}

function getProfileRemnantChoices() {
  return Array.from((optimizeCache.groups || []).reduce((map, group) => {
    const catalogProfile = resolveAppCatalogProfile(group.profileId, group.profileCode, group.title);
    const profileCode = String(catalogProfile?.articleBase || group.profileCode || "").trim();
    const key = normalizeProfileRuleKey(profileCode);
    if (profileCode && key && !map.has(key)) {
      map.set(key, {
        profileId: catalogProfile?.profileId || group.profileId || "",
        profileCode,
        rapidCode: catalogProfile?.rapidCode || "",
        name: catalogProfile?.name || String(group.title || profileCode).trim(),
        title: catalogProfile?.name || String(group.title || profileCode).trim(),
        partKind: catalogProfile?.kind || group.partKind || "",
        aliases: catalogProfile ? [...catalogProfile.aliases] : []
      });
    }
    return map;
  }, new Map()).values());
}

function profileRemnantImportReportHtml() {
  const report = profileRemnantImportReport;
  if (!report) return "";
  if (report.fatalError) {
    return `
      <div class="remnant-import-report remnant-import-report--error">
        <strong>Импорт не выполнен: ${escapeHtml(report.fileName || "Excel")}</strong>
        <div>${escapeHtml(report.fatalError)}</div>
      </div>
    `;
  }
  const errors = (report.errors || []).map((error) => `
    <li><strong>Строка ${escapeHtml(error.rowNumber)}</strong>: ${escapeHtml(error.reason)}${error.rawValue ? ` <span class="remnant-import-raw">(${escapeHtml(error.rawValue)})</span>` : ""}</li>
  `).join("");
  return `
    <div class="remnant-import-report ${report.errors?.length ? "remnant-import-report--warning" : "remnant-import-report--success"}">
      <strong>Импорт Excel: ${escapeHtml(report.fileName || "файл")}</strong>
      <div>Лист: ${escapeHtml(report.sheetName || "—")} · строк данных: ${report.totalRows || 0} · добавлено строк: ${report.validRows?.length || 0} · физических остатков: ${report.physicalCount || 0} · ошибок: ${report.errors?.length || 0}</div>
      ${errors ? `<details><summary>Показать ошибки импорта</summary><ul>${errors}</ul></details>` : ""}
    </div>
  `;
}

function profileRemnantsEditorHtml() {
  const profileChoices = getProfileRemnantChoices();
  const rows = profileRemnants.length
    ? profileRemnants.map((remnant) => {
      const errors = validateProfileRemnant(remnant);
      const selectedKey = normalizeProfileRuleKey(remnant.profileCode);
      const hasSelectedChoice = profileChoices.some(
        (choice) => normalizeProfileRuleKey(choice.profileCode) === selectedKey
      );
      const options = profileChoices.map((choice) => {
        const selected = normalizeProfileRuleKey(choice.profileCode) === selectedKey ? "selected" : "";
        return `<option value="${escapeHtml(choice.profileCode)}" ${selected}>${escapeHtml(choice.title)}</option>`;
      }).join("");
      return `
        <div class="remnant-input-row" data-remnant-id="${escapeHtml(remnant.id)}">
          <input data-field="label" value="${escapeHtml(remnant.label || "")}" placeholder="Название / номер" />
          <select data-field="profileCode">
            <option value="">Профиль *</option>
            ${!hasSelectedChoice && remnant.profileCode ? `<option value="${escapeHtml(remnant.profileCode)}" selected>${escapeHtml(remnant.profileCode)}</option>` : ""}
            ${options}
          </select>
          <input data-field="lengthMm" type="number" min="0" step="1" value="${escapeHtml(remnant.lengthMm ?? "")}" placeholder="Длина, мм *" />
          <input data-field="quantity" type="number" min="1" step="1" value="${escapeHtml(remnant.quantity ?? 1)}" placeholder="Кол-во *" />
          <input data-field="note" value="${escapeHtml(remnant.note || "")}" placeholder="Примечание" />
          <button class="btn-secondary remnant-remove" type="button">Удалить</button>
          <div class="remnant-input-errors">${errors.map((error) => `<span>${escapeHtml(error)}</span>`).join("")}</div>
        </div>
      `;
    }).join("")
    : "<small>Остатки не добавлены. Оптимизация работает в обычном режиме.</small>";
  return `
    <div class="remnant-input-list">${rows}</div>
    <div class="remnant-input-actions">
      <button id="addProfileRemnantBtn" class="btn-secondary" type="button">Добавить остаток</button>
      <button id="importProfileRemnantsBtn" class="btn-secondary" type="button">Импорт Excel</button>
      <input id="profileRemnantsExcelInput" type="file" accept=".xlsx" hidden />
      <button id="clearProfileRemnantsBtn" class="btn-secondary" type="button" ${profileRemnants.length ? "" : "disabled"}>Очистить все</button>
    </div>
    ${profileRemnantImportReportHtml()}
    <div class="remnant-pair-warning">В двойном режиме подходящая деталь переносится на остаток как одинарный ручной рез. Остальные детали заново формируют пары; экземпляры без пары выводятся в ручной одинарный режим.</div>
  `;
}

function invalidateOptimizationAfterRemnantChange() {
  exportReady = false;
  lastLabelQueues = null;
  renderExport();
}

function refreshProfileRemnantsEditor() {
  const editor = document.getElementById("profileRemnantsEditor");
  if (!editor) return;
  editor.innerHTML = profileRemnantsEditorHtml();

  editor.querySelector("#addProfileRemnantBtn")?.addEventListener("click", () => {
    profileRemnants.push({
      id: `remnant_${Date.now().toString(36)}_${profileRemnantSequence++}`,
      label: "",
      profileId: "",
      profileCode: "",
      name: "",
      partKind: "",
      lengthMm: "",
      quantity: 1,
      note: ""
    });
    invalidateOptimizationAfterRemnantChange();
    refreshProfileRemnantsEditor();
  });

  const excelInput = editor.querySelector("#profileRemnantsExcelInput");
  const importButton = editor.querySelector("#importProfileRemnantsBtn");
  importButton?.addEventListener("click", () => excelInput?.click());
  excelInput?.addEventListener("change", async () => {
    const file = excelInput.files?.[0];
    if (!file) return;
    importButton.disabled = true;
    importButton.textContent = "Чтение Excel...";
    try {
      if (!window.XlsxReader?.readFirstWorksheet || !window.RemnantImport?.parseRows) {
        throw new Error("Модуль импорта Excel не подключен");
      }
      const worksheet = await window.XlsxReader.readFirstWorksheet(file);
      const parsed = window.RemnantImport.parseRows(worksheet.rows, getProfileRemnantChoices());
      profileRemnantImportReport = {
        ...parsed,
        fileName: file.name,
        sheetName: worksheet.sheetName
      };
      if (!parsed.fatalError && parsed.validRows.length) {
        const stamp = Date.now().toString(36);
        parsed.validRows.forEach((row) => {
          profileRemnants.push({
            id: `remnant_${stamp}_${profileRemnantSequence++}`,
            ...row
          });
        });
        invalidateOptimizationAfterRemnantChange();
      }
    } catch (error) {
      profileRemnantImportReport = {
        fileName: file.name,
        fatalError: error instanceof Error ? error.message : "Не удалось импортировать XLSX"
      };
    }
    refreshProfileRemnantsEditor();
  });

  editor.querySelector("#clearProfileRemnantsBtn")?.addEventListener("click", () => {
    if (!profileRemnants.length || !window.confirm("Очистить все введённые остатки профиля?")) return;
    profileRemnants = [];
    profileRemnantImportReport = null;
    invalidateOptimizationAfterRemnantChange();
    refreshProfileRemnantsEditor();
  });

  editor.querySelectorAll(".remnant-input-row").forEach((row) => {
    const id = row.getAttribute("data-remnant-id");
    const remnant = profileRemnants.find((item) => item.id === id);
    if (!remnant) return;
    row.querySelectorAll("[data-field]").forEach((field) => {
      field.addEventListener(field.tagName === "SELECT" ? "change" : "input", () => {
        const fieldName = field.getAttribute("data-field");
        remnant[fieldName] = field.value;
        if (fieldName === "profileCode") {
          remnant.profileId = "";
          remnant.name = "";
          remnant.partKind = "";
          applyCatalogProfileToRemnant(remnant, field.value);
        }
        const errors = validateProfileRemnant(remnant);
        const errorsEl = row.querySelector(".remnant-input-errors");
        if (errorsEl) errorsEl.innerHTML = errors.map((error) => `<span>${escapeHtml(error)}</span>`).join("");
        invalidateOptimizationAfterRemnantChange();
      });
    });
    row.querySelector(".remnant-remove")?.addEventListener("click", () => {
      profileRemnants = profileRemnants.filter((item) => item.id !== id);
      invalidateOptimizationAfterRemnantChange();
      refreshProfileRemnantsEditor();
    });
  });
}

function expandPhysicalProfileRemnants() {
  const physical = [];
  profileRemnants.forEach((remnant, sourceIndex) => {
    applyCatalogProfileToRemnant(remnant, remnant.profileId, remnant.profileCode, remnant.name);
    const quantity = Number(remnant.quantity);
    for (let index = 0; index < quantity; index++) {
      physical.push({
        id: `${remnant.id}__${index + 1}`,
        sourceId: remnant.id,
        label: String(remnant.label || "").trim() || `Остаток №${sourceIndex + 1}`,
        profileId: String(remnant.profileId || "").trim(),
        profileCode: String(remnant.profileCode || "").trim(),
        profileName: String(remnant.name || profileDisplayNameForCode(remnant.profileCode)).trim(),
        name: String(remnant.name || "").trim(),
        partKind: String(remnant.partKind || "").trim(),
        lengthMm: Number(remnant.lengthMm),
        note: String(remnant.note || "").trim(),
        physicalNo: index + 1,
        physicalTotal: quantity
      });
    }
  });
  return physical;
}

function sortParts(parts) {
  return [...parts].sort((a, b) => {
    const keyA = `${a.profileCode} ${a.name}`.toLowerCase();
    const keyB = `${b.profileCode} ${b.name}`.toLowerCase();
    const cmp = keyA.localeCompare(keyB, "ru", { sensitivity: "base" });
    if (cmp !== 0) return cmp;
    const ordA = `${a.orderId}`;
    const ordB = `${b.orderId}`;
    const oc = ordA.localeCompare(ordB, "ru", { sensitivity: "base" });
    if (oc !== 0) return oc;
    return `${a.productId}`.localeCompare(`${b.productId}`, "ru", { sensitivity: "base" });
  });
}

function normalizeGroupText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeGroupKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9а-яё]/g, "");
}

function canonicalGroupName(part) {
  const catalogProfile = resolveAppCatalogProfile(part?.profileId, part?.profileCode, part?.name);
  if (catalogProfile) return catalogProfile.name;
  const nameRaw = String(part.name || "").trim();
  const nameKey = normalizeGroupKey(nameRaw);
  const codeKey = normalizeGroupKey(part.profileCode || "");
  const isXs35801 = codeKey.startsWith("xs35801");
  const isProwinDoor =
    nameKey.includes("рамаокондверн63ммprowin") ||
    nameKey.includes("рамаокондвер63ммprowin");
  if (isXs35801 && isProwinDoor) {
    return "Рама оконная 63 мм (ProWin)";
  }
  if (nameKey.includes("створкадвернаят106мм")) {
    return "Створка дверная Т 106 мм (Experta T)";
  }
  if (nameKey.includes("створкадвернаят107мм") || nameKey.includes("створкадвернаяt107мм")) {
    return "Створка дверная T 107 мм (Practica T)";
  }
  if (nameKey.includes("створкадвернаяz106мм")) {
    return "Створка дверная Z 106 мм (Experta Z)";
  }
  if (nameKey.includes("створкадвернаяzобразная98мм")) {
    return "Створка дверная Z образная 98 мм (Practica Z)";
  }
  return nameRaw;
}

function sourceProductionGroupIdentity(part) {
  const catalogProfile = resolveAppCatalogProfile(
    part?.profileId,
    part?.profileCode,
    part?.name,
    part?.profile
  );
  const name = catalogProfile?.name || canonicalGroupName({
    ...part,
    name: part?.name || part?.profile || ""
  });
  const profileId = catalogProfile?.profileId || "";
  const profileCode = catalogProfile?.articleBase || String(part?.profileCode || "").trim();
  const partKind = catalogProfile?.kind || String(part?.partKind || "").trim();
  const key = catalogProfile
    ? `profile:${profileId || profileCode}`
    : normalizeGroupText(name);
  return { key, profileId, profileCode, name, partKind };
}

function syncProductionGroupSelection(parts, reset = false) {
  const currentKeys = new Set((parts || []).map((part) => sourceProductionGroupIdentity(part).key));
  if (reset) {
    selectedProductionGroups.clear();
    collapsedImportGroups.clear();
  }
  Array.from(selectedProductionGroups.keys()).forEach((key) => {
    if (!currentKeys.has(key)) selectedProductionGroups.delete(key);
  });
  Array.from(collapsedImportGroups).forEach((key) => {
    if (key !== "import-skew-groups" && !currentKeys.has(key)) collapsedImportGroups.delete(key);
  });
  if (!currentKeys.size) collapsedImportGroups.clear();
  currentKeys.forEach((key) => {
    if (!selectedProductionGroups.has(key)) selectedProductionGroups.set(key, true);
  });
  return selectedProductionGroups;
}

function isProductionGroupSelected(part) {
  const key = sourceProductionGroupIdentity(part).key;
  return selectedProductionGroups.get(key) !== false;
}

function getSelectedProductionParts(parts = allParts) {
  return (parts || []).filter(isProductionGroupSelected);
}

function currentProductionGroupKeys(parts = allParts) {
  return new Set((parts || []).map((part) => sourceProductionGroupIdentity(part).key));
}

function setAllProductionGroupsSelected(parts, selected) {
  syncProductionGroupSelection(parts);
  let changed = false;
  currentProductionGroupKeys(parts).forEach((key) => {
    const nextValue = Boolean(selected);
    if (selectedProductionGroups.get(key) !== nextValue) changed = true;
    selectedProductionGroups.set(key, nextValue);
  });
  return changed;
}

function setAllImportGroupsCollapsed(parts, collapsed) {
  const keys = currentProductionGroupKeys(parts);
  keys.forEach((key) => {
    if (collapsed) collapsedImportGroups.add(key);
    else collapsedImportGroups.delete(key);
  });
  if ((parts || []).some(isSkewPart)) {
    if (collapsed) collapsedImportGroups.add("import-skew-groups");
    else collapsedImportGroups.delete("import-skew-groups");
  }
}

function getSelectedProductionPdfPositions(positions) {
  return (positions || []).map((position) => {
    const details = (position.details || []).filter(isProductionGroupSelected);
    return {
      ...position,
      details,
      signature: window.LabelPdf?.pdfPositionSignature
        ? window.LabelPdf.pdfPositionSignature(details, position.drainageType)
        : LabelData.detailSignature(details)
    };
  }).filter((position) => position.details.length > 0);
}

function groupByNomenclature(parts) {
  const groups = new Map();
  for (const p of parts) {
    const { key, profileId, profileCode, name, partKind } = sourceProductionGroupIdentity(p);
    if (!groups.has(key)) {
      groups.set(key, { key, profileId, profileCode, name, partKind, items: [] });
    }
    groups.get(key).items.push(p);
  }
  return window.ProductionOrder.sortProductionProfileGroups(Array.from(groups.values()));
}

function groupByOptimizationProfile(parts) {
  const groups = new Map();
  for (const p of parts) {
    const sourceProfile = resolveAppCatalogProfile(p?.profileId, p?.profileCode, p?.name);
    const optimizationProfile = window.ProfileCatalog?.findOptimizationProfile?.(
      sourceProfile || p?.optimizationProfileId
    ) || sourceProfile;
    if (!optimizationProfile) {
      const fallbackGroup = groupByNomenclature([p])[0];
      const fallbackKey = fallbackGroup?.key || normalizeGroupText(p?.name || p?.profileCode);
      if (!groups.has(fallbackKey)) groups.set(fallbackKey, { ...fallbackGroup, items: [] });
      groups.get(fallbackKey).items.push(p);
      continue;
    }

    const key = `optimization-profile:${optimizationProfile.profileId}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        profileId: optimizationProfile.profileId,
        profileCode: optimizationProfile.articleBase,
        name: optimizationProfile.name,
        partKind: optimizationProfile.kind,
        items: []
      });
    }
    groups.get(key).items.push(p);
  }
  return window.ProductionOrder.sortProductionProfileGroups(Array.from(groups.values()));
}

function normalizeAngles(value) {
  return String(value || "")
    .replace(/\s+/g, "")
    .replace(",", ".")
    .toLowerCase();
}

function sanitizeDigits(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits || "0";
}

function extractProfileBase(value) {
  const match = String(value || "").match(/[A-Za-z0-9.]+/);
  return match ? match[0] : String(value || "").trim();
}

function parseAnglePair(angles) {
  const matches = String(angles || "").match(/(\d+(?:[.,]\d+)?)/g);
  const leftRaw = matches && matches[0] ? matches[0] : "90";
  const rightRaw = matches && matches[1] ? matches[1] : leftRaw;
  const left = Number(String(leftRaw).replace(",", "."));
  const right = Number(String(rightRaw).replace(",", "."));
  return {
    left: Number.isFinite(left) ? left : 90,
    right: Number.isFinite(right) ? right : 90
  };
}

function encodeWin1251(str) {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);

    if (code <= 0x7f) {
      bytes[i] = code;
      continue;
    }
    if (code >= 0x0410 && code <= 0x042f) {
      bytes[i] = code - 0x0410 + 0xc0;
      continue;
    }
    if (code >= 0x0430 && code <= 0x044f) {
      bytes[i] = code - 0x0430 + 0xe0;
      continue;
    }

    switch (code) {
      case 0x0401: bytes[i] = 0xa8; break;
      case 0x0451: bytes[i] = 0xb8; break;
      case 0x2116: bytes[i] = 0xb9; break;
      case 0x00b0: bytes[i] = 0xb0; break;
      case 0x00ab: bytes[i] = 0xab; break;
      case 0x00bb: bytes[i] = 0xbb; break;
      case 0x2013: bytes[i] = 0x96; break;
      case 0x2014: bytes[i] = 0x97; break;
      case 0x2018: bytes[i] = 0x91; break;
      case 0x2019: bytes[i] = 0x92; break;
      case 0x201c: bytes[i] = 0x93; break;
      case 0x201d: bytes[i] = 0x94; break;
      case 0x2022: bytes[i] = 0x95; break;
      case 0x2026: bytes[i] = 0x85; break;
      default: bytes[i] = 0x3f;
    }
  }
  return bytes;
}

function padLeft(value, length) {
  return String(value).padStart(length, "0");
}

function angleToSCode(angleLeft, angleRight) {
  const map = { 45: "1", 90: "2", 135: "3" };
  const left = map[Math.round(angleLeft)] || "2";
  const right = map[Math.round(angleRight)] || "2";
  return left + right;
}

function angleToW(angle) {
  const val = Math.round(Number(angle) * 10);
  return padLeft(val, 4);
}

function isMullionPart(part) {
  const catalogProfile = resolveAppCatalogProfile(part?.profileId, part?.profileCode, part?.name);
  const partKind = catalogProfile?.kind || part?.partKind;
  return String(partKind || "").trim().toLowerCase() === "mullion";
}

function isSkewPart(part) {
  if (isMullionPart(part)) return false;
  if (!part.angles) return false;
  const norm = normalizeAngles(part.angles);
  return !["45-45", "45-90", "90-45"].includes(norm);
}

function renderGroupTable(items) {
  const sorted = [...items].sort((a, b) => {
    const aLen = Number(a.lengthMm) || 0;
    const bLen = Number(b.lengthMm) || 0;
    return bLen - aLen;
  });
  const rows = sorted.map((p) => `
    <tr>
      <td>${p.profileCode}</td>
      <td>${p.name}</td>
      <td>
        <span class="size-cell">${p.lengthMm}</span>
        <button class="row-remove" type="button" data-id="${p.id}" title="Удалить">×</button>
      </td>
      <td>${p.angles || ""}</td>
      <td>${(p.orient || "").replace("Вертикальн.", "Вертикаль").replace("Горизонтальн.", "Горизонт")}</td>
      <td>${p.quantity}</td>
      <td>${p.orderId}${p.productId ? " / " + p.productId : ""}</td>
    </tr>
  `).join("");

  return `
    <table>
      <thead>
        <tr>
          <th>Артикул</th>
          <th>Название</th>
          <th>Размер</th>
          <th>Углы</th>
          <th>Ориентир</th>
          <th>Количество</th>
          <th>Заказ / изделие</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderProductionGroup(group, extraClass = "") {
  const count = group.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const selected = selectedProductionGroups.get(group.key) !== false;
  const collapsed = collapsedImportGroups.has(group.key);
  return `
    <div class="group ${extraClass} ${selected ? "" : "is-production-disabled"}" data-group="${escapeHtml(group.key)}" data-production-group="${escapeHtml(group.key)}" data-collapse-key="${escapeHtml(group.key)}">
      <div class="group-header">
        <button class="group-toggle" type="button" aria-expanded="${collapsed ? "false" : "true"}">${collapsed ? "+" : "−"}</button>
        <label class="group-production-select">
          <input class="production-group-checkbox" type="checkbox" ${selected ? "checked" : ""} />
          <span class="group-title">${escapeHtml(group.name)}</span>
        </label>
        <div class="group-meta">${count} шт.</div>
      </div>
      <div class="group-body" style="display:${collapsed ? "none" : "block"}">
        ${renderGroupTable(group.items)}
      </div>
    </div>
  `;
}

function invalidateProductionRun() {
  exportReady = false;
  exportCache = [];
  lastLabelQueues = null;
  lastMuratRecords = [];
  labelPreviewMode = "logical";
  if (optResults) optResults.innerHTML = "<small>Нет расчетов</small>";
}

function restoreImportScroll(scrollY) {
  window.scrollTo(0, scrollY);
  window.requestAnimationFrame(() => window.scrollTo(0, scrollY));
}

function applyImportGroupCollapseState() {
  tableWrap.querySelectorAll("[data-collapse-key]").forEach((group) => {
    const collapseKey = group.getAttribute("data-collapse-key");
    const collapsed = collapsedImportGroups.has(collapseKey);
    const toggle = group.querySelector(".group-toggle");
    const body = group.querySelector(".group-body");
    if (toggle) {
      toggle.setAttribute("aria-expanded", String(!collapsed));
      toggle.textContent = collapsed ? "+" : "−";
    }
    if (body) body.style.display = collapsed ? "none" : "block";
  });
}

function renderTable(parts) {
  syncProductionGroupSelection(parts);
  const productionParts = getSelectedProductionParts(parts);
  if (!parts.length) {
    tableWrap.innerHTML = "<small>Нет данных</small>";
    totalCountEl.textContent = "0";
    renderOptimize(productionParts);
    return;
  }

  const sorted = sortParts(parts);
  const normalParts = sorted.filter((p) => !isSkewPart(p));
  const skewParts = sorted.filter((p) => isSkewPart(p));
  const groups = groupByNomenclature(normalParts);
  const skewGroups = groupByNomenclature(skewParts);
  const totalCount = productionParts.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
  totalCountEl.textContent = String(totalCount);

  const html = groups.map((group) => renderProductionGroup(group)).join("");

  const skewHtml = skewGroups.length
    ? `
      <div class="group skew-group" data-collapse-key="import-skew-groups">
        <div class="group-header">
          <button class="group-toggle" type="button" aria-expanded="${collapsedImportGroups.has("import-skew-groups") ? "false" : "true"}">${collapsedImportGroups.has("import-skew-groups") ? "+" : "−"}</button>
          <div class="group-title">Косые элементы</div>
          <div class="group-meta">${skewParts.reduce((s, it) => s + (Number(it.quantity) || 0), 0)} шт.</div>
        </div>
        <div class="group-body skew-profile-groups" style="display:${collapsedImportGroups.has("import-skew-groups") ? "none" : "block"}">
          ${skewGroups.map((group) => renderProductionGroup(group, "skew-profile-group")).join("")}
        </div>
      </div>
    `
    : "";

  const groupActions = `
    <div class="import-group-actions">
      <div class="import-group-action-pair">
        <button class="import-group-action" type="button" data-action="select-all">Выбрать все</button>
        <button class="import-group-action" type="button" data-action="select-none">Снять все</button>
      </div>
      <div class="import-group-action-pair">
        <button class="import-group-action" type="button" data-action="expand-all">Развернуть все</button>
        <button class="import-group-action" type="button" data-action="collapse-all">Свернуть все</button>
      </div>
    </div>
  `;

  tableWrap.innerHTML = groupActions + html + skewHtml;

  tableWrap.querySelectorAll(".import-group-action").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.getAttribute("data-action");
      const scrollY = window.scrollY;
      if (action === "select-all" || action === "select-none") {
        const changed = setAllProductionGroupsSelected(allParts, action === "select-all");
        if (changed) {
          invalidateProductionRun();
          renderTable(allParts);
          renderLabelKitCheck();
        }
      } else if (action === "expand-all" || action === "collapse-all") {
        setAllImportGroupsCollapsed(allParts, action === "collapse-all");
        applyImportGroupCollapseState();
      }
      restoreImportScroll(scrollY);
    });
  });

  tableWrap.querySelectorAll(".group-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const group = btn.closest(".group");
      const body = group.querySelector(".group-body");
      const expanded = btn.getAttribute("aria-expanded") === "true";
      const collapseKey = group.getAttribute("data-collapse-key");
      if (collapseKey) {
        if (expanded) collapsedImportGroups.add(collapseKey);
        else collapsedImportGroups.delete(collapseKey);
      }
      btn.setAttribute("aria-expanded", String(!expanded));
      btn.textContent = expanded ? "+" : "−";
      body.style.display = expanded ? "none" : "block";
    });
  });

  tableWrap.querySelectorAll(".row-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      if (!id) return;
      removePartById(id);
    });
  });

  tableWrap.querySelectorAll(".production-group-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    checkbox.addEventListener("change", (event) => {
      event.stopPropagation();
      const group = checkbox.closest("[data-production-group]");
      const key = group?.getAttribute("data-production-group");
      if (!key) return;
      const scrollY = window.scrollY;
      selectedProductionGroups.set(key, checkbox.checked);
      invalidateProductionRun();
      renderTable(allParts);
      renderLabelKitCheck();
      restoreImportScroll(scrollY);
    });
  });

  renderOptimize(productionParts);
}

function removePartById(id) {
  const removed = allParts.filter((p) => p.id === id);
  if (removed.length) {
    deletedParts = deletedParts.concat(removed);
  }
  allParts = allParts.filter((p) => p.id !== id);
  filesMap.forEach((fileInfo) => {
    fileInfo.parts = fileInfo.parts.filter((p) => p.id !== id);
  });
  exportReady = false;
  renderTable(allParts);
}

function renderFileList() {
  if (!filesMap.size) {
    fileList.innerHTML = "";
    return;
  }
  const rows = Array.from(filesMap.values())
    .sort((a, b) => a.name.localeCompare(b.name, "ru", { sensitivity: "base" }))
    .map((f) => `
    <div class="file-item" data-key="${f.key}">
      <span class="file-name">${f.name}</span>
      <button class="file-remove" type="button" title="Удалить">×</button>
    </div>
  `).join("");
  fileList.innerHTML = rows;

  fileList.querySelectorAll(".file-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      const parent = btn.closest(".file-item");
      const key = parent?.getAttribute("data-key");
      if (!key) return;
      const fileInfo = filesMap.get(key);
      if (fileInfo?.hash) contentHashes.delete(fileInfo.hash);
      filesMap.delete(key);
      exportReady = false;
      rebuildAllParts();
      renderFileList();
      renderTable(allParts);
      renderLabelKitCheck();
    });
  });
}

function renderPdfFileList() {
  if (!pdfFileList) return;
  if (!pdfFilesMap.size) {
    pdfFileList.innerHTML = "";
    return;
  }
  const rows = Array.from(pdfFilesMap.values())
    .sort((a, b) => a.name.localeCompare(b.name, "ru", { sensitivity: "base" }))
    .map((f) => `
    <div class="file-item" data-key="${f.key}">
      <span class="file-name">${f.name}</span>
      <span class="file-count">${f.positions.length} поз.</span>
      <button class="file-remove" type="button" title="Удалить">×</button>
    </div>
  `).join("");
  pdfFileList.innerHTML = rows;

  pdfFileList.querySelectorAll(".file-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      const parent = btn.closest(".file-item");
      const key = parent?.getAttribute("data-key");
      if (!key) return;
      const fileInfo = pdfFilesMap.get(key);
      if (fileInfo?.hash) contentHashes.delete(fileInfo.hash);
      pdfFilesMap.delete(key);
      renderPdfFileList();
      renderLabelKitCheck();
    });
  });
}

function rebuildAllParts() {
  allParts = [];
  for (const f of filesMap.values()) {
    allParts = allParts.concat(f.parts);
  }
}

function currentCutStore() {
  return LabelData.collectStoresFromCutFiles(Array.from(filesMap.values())).store;
}

function currentPdfStore() {
  return LabelData.collectStoresFromPdfFiles(Array.from(pdfFilesMap.values())).store;
}

function selectedCutFilesForProduction() {
  return Array.from(filesMap.values())
    .map((fileInfo) => ({
      ...fileInfo,
      parts: fileInfo.parts.filter(isProductionGroupSelected)
    }))
    .filter((fileInfo) => fileInfo.parts.length > 0);
}

function selectedPdfFilesForProduction() {
  return Array.from(pdfFilesMap.values()).map((fileInfo) => {
    const positions = getSelectedProductionPdfPositions(fileInfo.positions);
    return { ...fileInfo, positions };
  }).filter((fileInfo) => fileInfo.positions.length > 0);
}

function selectedReinforcementPdfPositionsForProduction() {
  const selectedKeys = new Set(
    getSelectedProductionParts(allParts).map((part) => sourceProductionGroupIdentity(part).key)
  );
  return Array.from(pdfFilesMap.values()).flatMap((fileInfo) => {
    return (fileInfo.positions || []).map((position) => {
      const allDetails = (position.allDetails || position.details || []).filter((detail) => {
        return selectedKeys.has(sourceProductionGroupIdentity(detail).key);
      });
      return { ...position, allDetails, details: allDetails };
    }).filter((position) => position.allDetails.length > 0);
  });
}

function vetPositionsForLoad(positions, store, sourceKind, fileName) {
  const acceptedKeys = new Set();
  const duplicates = [];
  const conflicts = [];
  (positions || []).forEach((position) => {
    const existing = store.get(position.key);
    if (!existing) {
      acceptedKeys.add(position.key);
      return;
    }
    if (existing.signature === position.signature) {
      duplicates.push({
        key: position.key,
        sourceKind,
        status: LabelData.LABEL_STATUS.DUPLICATE,
        fileName,
        message: "Полностью совпадает с уже загруженной версией."
      });
      return;
    }
    conflicts.push({
      key: position.key,
      sourceKind,
      status: LabelData.LABEL_STATUS.CONFLICT,
      fileName,
      oldVersion: existing,
      newVersion: position,
      message: "Заказ/позиция совпадает, но данные отличаются."
    });
  });
  return { acceptedKeys, duplicates, conflicts };
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatLabelDifferenceText(row) {
  const lines = [
    `Позиция ${row.key}`,
    `Состояние: ${row.status}`
  ];
  const issues = row.comparison?.issues || [];
  if (!issues.length && row.warnings?.length) {
    lines.push("", ...row.warnings);
    return lines.join("\n");
  }
  issues.forEach((issue, index) => {
    lines.push("");
    lines.push(`${index + 1}. ${issue.source === "pdf" ? "Строка PDF" : "Строка CSV"}`);
    lines.push(`Исходная строка: ${issue.detail.raw}`);
    lines.push(`Заказ: ${issue.detail.orderId}`);
    lines.push(`Позиция: ${issue.detail.productId}`);
    lines.push(`Часть: ${issue.detail.partKind} (${issue.detail.partKindNormalized})`);
    lines.push(`Профиль: ${issue.detail.profile} (${issue.detail.profileNormalized})`);
    lines.push(`Ориентация: ${issue.detail.orient} (${issue.detail.orientNormalized})`);
    lines.push(`Длина: ${issue.detail.lengthMm}`);
    lines.push(`Количество: ${issue.detail.quantity}`);
    lines.push(`Сигнатура: ${issue.detail.signature}`);
    if (issue.closest) {
      lines.push(`Ближайшая строка другой стороны: ${issue.closest.raw}`);
      lines.push(`Различающиеся поля: ${issue.fieldDiffs?.length ? issue.fieldDiffs.join(", ") : "нет"}`);
    }
  });
  return lines.join("\n");
}

function renderLabelsPreview() {
  if (!labelsSummary || !labelsPreview) return;
  const result = lastPhysicalLabels || { labels: [], errors: [], byPosition: new Map(), summary: { total: 0, positions: 0 } };
  const queue = lastLabelQueues;
  updateTestPrintButton();
  labelsSummary.innerHTML = `
    <div class="label-summary-grid">
      <div><strong>${result.summary?.positions || 0}</strong><span>позиций</span></div>
      <div><strong>${result.summary?.total || 0}</strong><span>этикеток</span></div>
      <div><strong>${result.errors?.length || 0}</strong><span>ошибок формирования</span></div>
      ${queue ? `
        <div><strong>${queue.validation.autoLabelCount}</strong><span>по порядку пилы</span></div>
        <div><strong>${queue.validation.manualLabelCount}</strong><span>ручной распил</span></div>
        <div><strong>${queue.validation.ready ? "Да" : "Нет"}</strong><span>очередь готова</span></div>
      ` : ""}
    </div>
  `;

  if (result.errors?.length) {
    labelsPreview.innerHTML = `
      <div class="label-build-errors">
        <div class="label-build-errors-title">Ошибки формирования этикеток</div>
        ${result.errors.map((error) => `<div>${escapeHtml(error)}</div>`).join("")}
      </div>
    `;
    return;
  }

  if (!result.labels?.length) {
    labelsPreview.innerHTML = "<small>Нет готовых этикеток. Сначала загрузите раскрой и PDF, затем проверьте комплект.</small>";
    return;
  }

  if (queue) {
    renderLabelQueuePreview(queue);
    return;
  }

  const groups = Array.from(result.byPosition.entries())
    .sort((a, b) => a[0].localeCompare(b[0], "ru", { numeric: true }));
  labelsPreview.innerHTML = groups.map(([positionKey, labels]) => `
    <section class="label-preview-group">
      <div class="label-preview-group-header">
        <div>${escapeHtml(positionKey)}</div>
        <span>${labels.length} этикеток</span>
      </div>
      <div class="label-preview-grid">
        ${labels.map(renderLabelCard).join("")}
      </div>
    </section>
  `).join("");
}

function getJobPrintEntries(limit = Infinity) {
  const entries = LabelData.buildJobPrintSequence(lastLabelQueues);
  if (!Number.isFinite(limit)) return entries;
  return entries.slice(0, Math.max(0, limit));
}

function updateTestPrintButton() {
  if (!testPrintLabelsBtn) return;
  const unresolved = currentUnresolvedFillingGroups();
  const queueAvailable = Boolean(lastLabelQueues?.validation?.ready && getJobPrintEntries(1).length > 0);
  const available = queueAvailable && unresolved.length === 0;
  testPrintLabelsBtn.disabled = !available;
  const reason = unresolved.length
    ? `Печать заблокирована: не определена толщина ${unresolved.length} формул заполнений.`
    : queueAvailable
      ? ""
      : "Сначала сформируйте готовую очередь после оптимизации";
  testPrintLabelsBtn.title = reason;
  if (labelPrintBlockReason) labelPrintBlockReason.textContent = reason;
}

function renderTestPrintSheet(entries) {
  if (!labelTestPrintSheet) return;
  const entryPages = LabelData.paginatePhysicalLabelEntries(entries, 16);
  const pages = entryPages.map((pageEntries) => {
    const cells = [];
    for (let cellIndex = 0; cellIndex < 16; cellIndex++) {
      const entry = pageEntries[cellIndex];
      cells.push(`
        <div class="label-test-cell">
          ${entry?.label ? renderLabelCard(entry.label) : ""}
        </div>
      `);
    }
    return `<div class="label-test-page">${cells.join("")}</div>`;
  });
  labelTestPrintSheet.innerHTML = pages.join("");
}

function logPrintQueueDiagnostics(entries) {
  console.table((entries || []).map((entry) => ({
    printIndex: entry.printIndex,
    sheetIndex: entry.sheetIndex,
    cycleIndex: entry.cycleIndex,
    slot: entry.slot,
    labelId: entry.labelId,
    side: entry.side,
    length: entry.lengthMm
  })));
}

async function waitForTestPrintImages(timeoutMs = 15000) {
  const images = Array.from(labelTestPrintSheet?.querySelectorAll(".label-card-sketch-img") || []);
  const waitForImage = async (image) => {
    if (!image.complete) {
      await new Promise((resolve) => {
        const finish = () => {
          clearTimeout(timer);
          resolve();
        };
        const timer = setTimeout(finish, timeoutMs);
        image.addEventListener("load", finish, { once: true });
        image.addEventListener("error", finish, { once: true });
      });
    }
    if (typeof image.decode === "function" && image.naturalWidth > 0) {
      try {
        await image.decode();
      } catch (_) {
        // A failed decode is reported below and must not block the print dialog.
      }
    }
    return image.complete && image.naturalWidth > 0;
  };

  const results = await Promise.all(images.map(waitForImage));
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const ready = results.filter(Boolean).length;
  console.info(`Эскизы перед печатью: ${ready}/${images.length} готовы.`);
  if (ready !== images.length) {
    console.warn(`Не удалось подготовить эскизы: ${images.length - ready}.`);
  }
  return { total: images.length, ready, failed: images.length - ready };
}

function clearTestPrintTextFit() {
  labelTestPrintSheet
    ?.querySelectorAll(".label-card-order, .label-card-main, .label-card-sub")
    .forEach((element) => element.style.removeProperty("font-size"));
}

function fitTestPrintText() {
  if (!document.body.classList.contains("label-test-print")) return;
  clearTestPrintTextFit();
  labelTestPrintSheet
    ?.querySelectorAll(".label-card-order, .label-card-main, .label-card-sub")
    .forEach((element) => {
      const availableWidth = element.clientWidth;
      const requiredWidth = element.scrollWidth;
      if (availableWidth <= 0 || requiredWidth <= availableWidth) return;

      const currentSize = Number.parseFloat(window.getComputedStyle(element).fontSize);
      if (!Number.isFinite(currentSize)) return;
      element.style.fontSize = `${currentSize * availableWidth / requiredWidth * 0.98}px`;
    });
}

async function printTestLabelsA4() {
  if (currentUnresolvedFillingGroups().length) {
    window.alert("Печать этикеток заблокирована: сначала укажите толщину неизвестных формул заполнений в разделе «Проверка комплекта».");
    return;
  }
  const entries = getJobPrintEntries();
  if (!entries.length) return;
  const message = "Выберите принтер и нажмите “Печать”. Макет уже подготовлен под лист A4";
  if (!window.confirm(message)) return;
  logPrintQueueDiagnostics(entries);
  renderTestPrintSheet(entries);
  await waitForTestPrintImages();
  clearTestPrintTextFit();
  document.body.classList.add("label-test-print");
  window.print();
  setTimeout(() => {
    document.body.classList.remove("label-test-print");
    clearTestPrintTextFit();
  }, 250);
}

window.addEventListener("beforeprint", fitTestPrintText);
window.addEventListener("afterprint", clearTestPrintTextFit);

function renderLabelQueuePreview(queue) {
  const validation = queue.validation || {};
  const controls = `
    <div class="label-mode-switch">
      <button type="button" class="${labelPreviewMode === "saw" ? "active" : ""}" data-label-preview-mode="saw">По порядку пилы</button>
      <button type="button" class="${labelPreviewMode === "manual" ? "active" : ""}" data-label-preview-mode="manual">Ручной распил</button>
    </div>
  `;
  const validationHtml = `
    <div class="label-queue-check ${validation.ready ? "is-ready" : "is-error"}">
      <div><strong>Итоговая проверка:</strong> ${validation.totalPhysicalLabels} = ${validation.autoLabelCount} + ${validation.manualLabelCount} + ${validation.excludedLabelCount}</div>
      <div>Потерянные labelId: ${validation.lostLabelIds?.length || 0}</div>
      <div>Повторно использованные labelId: ${validation.duplicateLabelIds?.length || 0}</div>
      <div>Циклы без этикеток: ${validation.cyclesWithoutLabels?.length || 0}</div>
      <div>Этикетки без цикла: ${validation.labelsWithoutCycle?.length || 0}</div>
      <div>Ошибки single/double: ${validation.cyclesModeMismatch?.length || 0}</div>
      ${validation.errors?.length ? `<div class="label-queue-errors">${validation.errors.map((error) => `<div>${escapeHtml(error)}</div>`).join("")}</div>` : ""}
    </div>
  `;
  labelsPreview.innerHTML = controls + validationHtml + (labelPreviewMode === "manual"
    ? renderManualLabelQueue(queue.manual || [])
    : renderSawLabelQueue(queue.auto || []));

  labelsPreview.querySelectorAll("[data-label-preview-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      labelPreviewMode = btn.getAttribute("data-label-preview-mode") === "manual" ? "manual" : "saw";
      renderLabelsPreview();
    });
  });
}

function renderSawLabelQueue(autoQueue) {
  if (!autoQueue.length) return "<small>Очередь по порядку пилы пока не сформирована.</small>";
  return autoQueue.map((profile) => `
    <section class="label-saw-profile">
      <div class="label-saw-profile-title">${escapeHtml(profile.profile)}</div>
      ${profile.bars.map((bar) => `
        <div class="label-saw-bar">
          <div class="label-saw-bar-title">${formatLabelQueueBarTitle(bar)}</div>
          ${bar.cycles.map((cycle) => `
            <div class="label-saw-cycle">
              <div class="label-saw-cycle-meta">
                <strong>Цикл ${cycle.cycleNo}</strong>
                <span>${cycle.lengthMm} мм</span>
                <span>${cycle.mode}</span>
              </div>
              <div class="label-cycle-cards">
                ${cycle.labels.map((label, idx) => `
                  <div class="label-cycle-card">
                    <div class="label-cycle-slot">${cycle.mode === "double" ? (idx === 0 ? "A" : "B") : "single"}</div>
                    ${renderLabelCard(label)}
                  </div>
                `).join("") || "<div class=\"label-cycle-empty\">Нет этикетки</div>"}
              </div>
            </div>
          `).join("")}
        </div>
      `).join("")}
    </section>
  `).join("");
}

function formatLabelQueueBarTitle(bar) {
  const isDouble = bar?.cycles?.some((cycle) => cycle.mode === "double");
  if (!isDouble) return `Хлыст ${bar.barNo}`;

  const firstBarNo = (bar.barNo - 1) * 2 + 1;
  return `Хлысты ${firstBarNo}–${firstBarNo + 1}`;
}

function renderManualLabelQueue(manualQueue) {
  if (!manualQueue.length) return "<small>Ручной распил пуст.</small>";
  return `
    <section class="label-manual-queue">
      <div class="label-saw-profile-title">РУЧНОЙ РАСПИЛ</div>
      ${manualQueue.map((item) => `
        <div class="label-manual-item">
          <div class="label-manual-meta">
            <strong>${item.no}</strong>
            <span>${escapeHtml(item.profile)}</span>
            <span>${item.lengthMm} мм</span>
            ${item.reason ? `<span>${escapeHtml(item.reason)}</span>` : ""}
          </div>
          ${item.label ? renderLabelCard(item.label) : "<div class=\"label-cycle-empty\">Нет этикетки</div>"}
        </div>
      `).join("")}
    </section>
  `;
}

function displayPartKind(value) {
  const key = LabelData.normalizeLabelKey(value);
  if (key.includes("створ")) return "СТВОРКА";
  if (key.includes("рам")) return "РАМА";
  return String(value || "").toUpperCase();
}

function normalizeMuratContour(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/^K/, "К")
    .replace(/^E/, "Э");
}

function muratRecordMatchKey(orderId, productId, contour) {
  return `${String(orderId || "").trim()}|${String(productId || "").trim()}|${normalizeMuratContour(contour)}`;
}

function muratRecordForLabel(label) {
  const key = muratRecordMatchKey(label.orderId, label.productId, label.contour);
  return lastMuratRecords.find((record) => record.matchKey === key) || null;
}

function renderMuratBarcodeSvg(value) {
  if (!window.JsBarcode) return "";

  const text = String(value);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  window.JsBarcode(svg, text, {
    format: "CODE128",
    displayValue: true,
    margin: 6,
    height: 45,
    width: 2,
    background: "#ffffff",
    lineColor: "#000000"
  });

  const width = Number.parseFloat(svg.getAttribute("width"));
  const height = Number.parseFloat(svg.getAttribute("height"));
  if (Number.isFinite(width) && Number.isFinite(height)) {
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `Code 128: ${text}`);
  return svg.outerHTML;
}

function renderLabelCard(label) {
  const sketchUrl = label.sketch?.croppedDataUrl || label.sketch?.dataUrl || "";
  const sketch = sketchUrl
    ? `<img class="label-card-sketch-img" src="${sketchUrl}" alt="">`
    : `<div class="label-card-sketch-empty"></div>`;
  const displayModel = LabelPdf.buildLabelDisplayModel(label);
  const muratRecord = muratRecordForLabel(label);
  const muratBarcode = muratRecord ? renderMuratBarcodeSvg(String(muratRecord.dataRec)) : "";
  const muratBlock = SHOW_LABEL_BARCODE && muratBarcode
    ? `
      <div class="label-murat-block">
        <div class="label-murat-barcode">${muratBarcode}</div>
      </div>
    `
    : "";
  const textClasses = [
    "label-card-text",
    displayModel.template === "mullion" ? "label-card-text--mullion" : "",
    displayModel.fillingText ? "label-card-text--with-filling" : "",
    muratRecord ? "label-card-text--murat" : "",
    muratRecord && !SHOW_LABEL_BARCODE ? "label-card-text--murat-no-barcode" : ""
  ].filter(Boolean).join(" ");
  const showDrainage = LabelData.isOutsideDrainageLabel(label);
  const mainHtml = displayModel.template === "frame-sash"
    ? `${escapeHtml(displayModel.typeText)} • <span class="label-card-side">${escapeHtml(displayModel.sideText)}${showDrainage ? '<span class="label-drainage-badge">ДРЕНАЖ</span>' : ""}</span> • ${displayModel.lengthMm} мм`
    : escapeHtml(displayModel.mainText);
  return `
    <article class="label-card" data-label-id="${escapeHtml(label.id)}">
      <div class="${textClasses}">
        <div class="label-card-order">${escapeHtml(label.orderId)}/${escapeHtml(label.productId)}</div>
        <div class="label-card-main${showDrainage ? " label-card-main--drainage" : ""}">${mainHtml}</div>
        ${displayModel.subLines.map((line) => `<div class="label-card-sub${line === displayModel.fillingText ? " label-card-filling" : ""}">${escapeHtml(line)}</div>`).join("")}
        ${muratBlock}
      </div>
      <div class="label-card-divider"></div>
      <div class="label-card-sketch">${sketch}</div>
    </article>
  `;
}

function formatReinforcementOptimizationStats(stats) {
  if (!stats) return "";
  const percent = Number(stats.usedPercent || 0).toLocaleString("ru-RU", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
  return `
    <div class="opt-material-stats reinforcement-material-stats">
      ${stats.physicalStockCount} хлыстов
      <span>·</span> ${formatOptimizationMeters(stats.totalMaterialMm)} м материала
      <span>·</span> ${formatOptimizationMeters(stats.partsLengthMm)} м деталей
      <span>·</span> ${formatOptimizationMeters(stats.kerfMm)} м пропил
      <span>·</span> ${formatOptimizationMeters(stats.leftoverMm)} м остаток
      <span>·</span> ${percent}% использование
    </div>
  `;
}

function renderReinforcementOptimization(changedGroupKey = "") {
  if (!reinforcementOptimizationSettings || !reinforcementOptimizationResults || !reinforcementPrintResults) return;
  const api = window.ReinforcementOptimization;
  if (!api?.buildReinforcementGroups) {
    reinforcementOptimizationSettings.innerHTML = "<small>Модуль армирования не подключен</small>";
    reinforcementOptimizationResults.innerHTML = "<small>Модуль армирования не подключен</small>";
    reinforcementPrintResults.innerHTML = "<small>Модуль армирования не подключен</small>";
    return;
  }
  const groups = api.buildReinforcementGroups(selectedReinforcementPdfPositionsForProduction());
  const currentKeys = new Set(groups.map((group) => group.key));
  Array.from(reinforcementModes.keys()).forEach((key) => {
    if (!currentKeys.has(key)) reinforcementModes.delete(key);
  });
  groups.forEach((group) => {
    if (!reinforcementModes.has(group.key)) reinforcementModes.set(group.key, api.DEFAULT_MODE || "double");
  });
  if (changedGroupKey && api.optimizeReinforcementGroup) {
    const previousByKey = new Map(reinforcementOptimizationCache.map((result) => [result.groupKey, result]));
    reinforcementOptimizationCache = groups.map((group) => {
      if (group.key === changedGroupKey || !previousByKey.has(group.key)) {
        return api.optimizeReinforcementGroup(
          group,
          reinforcementModes.get(group.key),
          reinforcementOptimizationMode
        );
      }
      return previousByKey.get(group.key);
    });
  } else {
    reinforcementOptimizationCache = api.optimizeReinforcementGroups(
      groups,
      reinforcementModes,
      reinforcementOptimizationMode
    );
  }
  if (!groups.length) {
    reinforcementOptimizationCache = [];
    reinforcementOptimizationSettings.innerHTML = `
      <div class="opt-settings">
        <label>Режим оптимизации
          <select class="opt-mode reinforcement-global-mode">
            <option value="max_savings" ${reinforcementOptimizationMode === "max_savings" ? "selected" : ""}>Максимальная экономия</option>
            <option value="hard_by_product" ${reinforcementOptimizationMode === "hard_by_product" ? "selected" : ""}>Жёсткий по изделиям</option>
          </select>
        </label>
        <label>Длина хлыста, мм <input type="number" value="${api.STOCK_LENGTH_MM}" disabled /></label>
        <label>Пропил, мм <input type="number" value="${api.KERF_MM}" disabled /></label>
      </div>
      <small>У выбранных деталей нет данных армирования.</small>
    `;
    reinforcementOptimizationResults.innerHTML = "<small>У выбранных деталей нет данных армирования.</small>";
    reinforcementPrintResults.innerHTML = "<small>У выбранных деталей нет данных армирования.</small>";
    return;
  }

  const manualCount = reinforcementOptimizationCache.reduce((sum, result) => sum + result.manualItems.length, 0);
  reinforcementOptimizationSettings.innerHTML = `
    <div class="opt-settings">
      <label>Режим оптимизации
        <select class="opt-mode reinforcement-global-mode">
          <option value="max_savings" ${reinforcementOptimizationMode === "max_savings" ? "selected" : ""}>Максимальная экономия</option>
          <option value="hard_by_product" ${reinforcementOptimizationMode === "hard_by_product" ? "selected" : ""}>Жёсткий по изделиям</option>
        </select>
      </label>
      <label>Длина хлыста, мм <input type="number" value="${api.STOCK_LENGTH_MM}" disabled /></label>
      <label>Пропил, мм <input type="number" value="${api.KERF_MM}" disabled /></label>
    </div>
    <div class="opt-summary reinforcement-opt-summary">
      ${groups.map((group) => `
        <div class="opt-line reinforcement-opt-line" data-reinforcement-key="${escapeHtml(group.key)}">
          <div class="opt-line-title">${escapeHtml(group.reinforcementArticle)}</div>
          <div class="opt-line-count">${group.quantity} шт.</div>
          <div class="opt-line-controls">
            <select class="opt-mode reinforcement-mode">
              <option value="single" ${reinforcementModes.get(group.key) === "single" ? "selected" : ""}>Одинарный</option>
              <option value="double" ${reinforcementModes.get(group.key) === "double" ? "selected" : ""}>Двойной</option>
            </select>
          </div>
        </div>
      `).join("")}
      <div class="opt-line opt-line-skew reinforcement-manual-summary">
        <div class="opt-line-title">Ручной режим</div>
        <div class="opt-line-count">${manualCount} шт.</div>
      </div>
    </div>
  `;

  const reinforcementChip = (item) => `
    <span class="cut-chip reinforcement-cut-chip" title="${escapeHtml(item.manualReason || "")}">
      <span class="cut-chip-meta">
        ${escapeHtml(item.orderId)}${item.productId ? ` / ${escapeHtml(item.productId)}` : ""} · ${escapeHtml(item.partKindLabel)}
      </span>
      <span class="cut-chip-length">${item.reinforcementSizeMm}</span>
    </span>
  `;

  const reinforcementAutomaticGroupHtml = (result) => `
    <section class="opt-result reinforcement-group">
      <div class="opt-result-title reinforcement-result-title">
        <span>${escapeHtml(result.reinforcementArticle)}</span>
        <span class="opt-mode-label">${result.mode === "double" ? "Двойной" : "Одинарный"}</span>
      </div>
      ${formatReinforcementOptimizationStats(result.stats)}
      <div class="opt-result-sub">Длина хлыста: ${result.stockLengthMm} мм, пропил: ${result.kerfMm} мм</div>
      <div class="opt-result-count">Хлыстов: ${result.physicalBins.length}</div>
      ${result.physicalBins.map((bin) => `
        <div class="opt-bin reinforcement-opt-bin">
          <strong>Хлыст ${bin.binNo}:</strong>
          ${bin.items.map(reinforcementChip).join("")}
          <span class="opt-left">Остаток: ${bin.leftoverMm} мм</span>
          <span class="opt-left opt-left-percent percent-useful">(${((bin.leftoverMm / result.stockLengthMm) * 100).toFixed(1)}%)</span>
        </div>
      `).join("") || `<div class="opt-result-sub">Нет автоматических парных позиций.</div>`}
    </section>
  `;
  const reinforcementManualGroupHtml = (result) => `
    <div class="opt-result reinforcement-manual-group">
      <div class="opt-result-title">${escapeHtml(result.reinforcementArticle)} <span class="opt-mode-label">Одинарный</span></div>
      <div class="opt-result-sub">Длина хлыста: ${result.manualOptimization.stockLengthMm} мм, пропил: ${result.manualOptimization.kerfMm} мм</div>
      <div class="opt-result-count">Хлыстов: ${result.manualOptimization.physicalBins.length}</div>
      ${result.manualOptimization.physicalBins.map((bin) => `
        <div class="opt-bin reinforcement-manual-bin">
          <strong>Хлыст ${bin.binNo}:</strong>
          ${bin.items.map(reinforcementChip).join("")}
          <span class="opt-left">Остаток: ${bin.leftoverMm} мм</span>
          <span class="opt-left opt-left-percent percent-useful">(${((bin.leftoverMm / result.manualOptimization.stockLengthMm) * 100).toFixed(1)}%)</span>
        </div>
      `).join("")}
      ${result.manualOptimization.unfitItems.length
        ? `<div class="opt-error">Не помещаются: ${result.manualOptimization.unfitItems.map((item) => item.reinforcementSizeMm).join(", ")}</div>`
        : ""}
    </div>
  `;
  const automaticHtml = reinforcementOptimizationCache.map(reinforcementAutomaticGroupHtml).join("");
  const manualHtml = manualCount ? `
    <section class="reinforcement-manual">
      <div class="opt-manual-notice reinforcement-manual-title">ВНИМАНИЕ - РУЧНОЙ РАСКРОЙ АРМИРОВАНИЯ — ${manualCount} шт.</div>
      ${reinforcementOptimizationCache.filter((result) => result.manualItems.length).map(reinforcementManualGroupHtml).join("")}
    </section>
  ` : "";
  reinforcementOptimizationResults.innerHTML = automaticHtml + manualHtml;
  const printAutomaticHtml = reinforcementOptimizationCache.map((result) => `
    <section class="reinforcement-print-group">
      ${reinforcementAutomaticGroupHtml(result)}
    </section>
  `).join("");
  reinforcementPrintResults.innerHTML = printAutomaticHtml + manualHtml;
  reinforcementOptimizationSettings.querySelectorAll(".reinforcement-mode").forEach((select) => {
    select.addEventListener("change", () => {
      const key = select.closest(".reinforcement-opt-line")?.getAttribute("data-reinforcement-key");
      if (!key) return;
      const scrollY = window.scrollY;
      reinforcementModes.set(key, select.value === "double" ? "double" : "single");
      renderReinforcementOptimization(key);
      window.scrollTo(0, scrollY);
      window.requestAnimationFrame(() => window.scrollTo(0, scrollY));
    });
  });
  reinforcementOptimizationSettings.querySelector(".reinforcement-global-mode")?.addEventListener("change", (event) => {
    const scrollY = window.scrollY;
    reinforcementOptimizationMode = event.target.value === "hard_by_product"
      ? "hard_by_product"
      : "max_savings";
    renderReinforcementOptimization();
    window.scrollTo(0, scrollY);
    window.requestAnimationFrame(() => window.scrollTo(0, scrollY));
  });
}

function applyFillDictionaryToPosition(position, manualKeys = new Set()) {
  if (!position) return position;
  position.fillings = LabelData.resolveFillingGroups(position.fillings || [], fillThicknessDictionary, manualKeys);
  position.fillThicknesses = LabelData.uniqueFillingThicknesses(position.fillings);
  position.unresolvedFillings = position.fillings.filter((filling) => filling.status === "unresolved");
  return position;
}

function applyFillDictionaryToParsedPdf(parsed, manualKeys = new Set()) {
  (parsed?.positions || []).forEach((position) => applyFillDictionaryToPosition(position, manualKeys));
  (parsed?.pages || []).forEach((page) => applyFillDictionaryToPosition(page, manualKeys));
  return parsed;
}

function currentUnresolvedFillingGroups(review = lastLabelReview) {
  const groups = new Map();
  (review?.rows || []).forEach((row) => {
    (row.pdf?.fillings || []).filter((filling) => filling.status === "unresolved" || filling.status === "conflict").forEach((filling) => {
      const unresolvedComponents = filling.status === "conflict"
        ? (filling.components || []).filter((component) => component.status !== "ignored")
        : (filling.unresolvedComponents || []);
      const components = unresolvedComponents.length ? unresolvedComponents : [{
        rawFormula: filling.rawFormula || `Заполнение ${filling.code}: отсутствует основная строка`,
        normalizedFormula: `@${row.key}:${filling.code}`
      }];
      components.forEach((component) => {
        const key = component.normalizedFormula || LabelData.normalizeFillingFormula(component.rawFormula);
        if (!groups.has(key)) groups.set(key, { key, rawFormula: component.rawFormula, occurrences: [] });
        groups.get(key).occurrences.push({ orderId: row.orderId, productId: row.productId, code: filling.code });
      });
    });
  });
  return Array.from(groups.values());
}

function updateLabelFillingsFromPositions() {
  const byPosition = new Map();
  pdfFilesMap.forEach((fileInfo) => {
    (fileInfo.positions || []).forEach((position) => byPosition.set(position.key, position));
  });
  const updateLabel = (label) => {
    const position = byPosition.get(label?.positionKey);
    if (!position || !label) return;
    label.fillings = (position.fillings || []).map((filling) => ({
      ...filling,
      components: (filling.components || []).map((component) => ({ ...component })),
      sourceRows: [...(filling.sourceRows || [])],
      unresolvedComponents: (filling.unresolvedComponents || []).map((component) => ({ ...component }))
    }));
    label.fillThicknesses = [...(position.fillThicknesses || [])];
  };
  (lastPhysicalLabels?.labels || []).forEach(updateLabel);
  (lastLabelQueues?.auto || []).forEach((profile) => (profile.bars || []).forEach((bar) => (bar.cycles || []).forEach((cycle) => (cycle.labels || []).forEach(updateLabel))));
  (lastLabelQueues?.manual || []).forEach((item) => updateLabel(item.label));
}

function refreshFillThicknessData(manualKeys = new Set()) {
  pdfFilesMap.forEach((fileInfo) => applyFillDictionaryToParsedPdf(fileInfo, manualKeys));
  renderLabelKitCheck();
  updateLabelFillingsFromPositions();
  renderLabelsPreview();
}

function parsePositiveThicknessInput(value) {
  const parsed = Number(String(value || "").trim().replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function saveFillDictionaryEntry(normalizedFormula, rawFormula, thicknessMm) {
  fillThicknessDictionary[normalizedFormula] = {
    type: "thickness",
    displayFormula: normalizeLabelText(rawFormula) || normalizedFormula,
    thicknessMm,
    updatedAt: new Date().toISOString()
  };
  return LabelData.writeFillThicknessDictionary(getAppLocalStorage(), fillThicknessDictionary);
}

function saveIgnoredMosquitoFillEntry(normalizedFormula, rawFormula) {
  fillThicknessDictionary[normalizedFormula] = {
    type: "ignored",
    reason: "mosquito",
    displayFormula: normalizeLabelText(rawFormula) || normalizedFormula,
    updatedAt: new Date().toISOString()
  };
  return LabelData.writeFillThicknessDictionary(getAppLocalStorage(), fillThicknessDictionary);
}

function renderFillThicknessTools(review) {
  const unresolvedGroups = currentUnresolvedFillingGroups(review);
  if (fillThicknessResolution) {
    fillThicknessResolution.innerHTML = unresolvedGroups.map((group) => {
      const first = group.occurrences[0] || {};
      const occurrences = group.occurrences.map((item) => `${item.orderId}/${item.productId} ${item.code}`).join(", ");
      return `
        <section class="fill-resolution-card">
          <div class="fill-resolution-title">Не удалось определить толщину заполнения</div>
          <div>Заказ: <strong>${escapeHtml(first.orderId)}</strong></div>
          <div>Изделие: <strong>${escapeHtml(first.productId)}</strong></div>
          <div>Заполнение: <strong>${escapeHtml(first.code)}</strong></div>
          <div>Формула: <strong>«${escapeHtml(group.rawFormula)}»</strong></div>
          ${group.occurrences.length > 1 ? `<div class="fill-resolution-occurrences">Все вхождения: ${escapeHtml(occurrences)}</div>` : ""}
          <div class="fill-resolution-input-row">
            <label>Толщина: <input type="text" inputmode="decimal" data-fill-input="${escapeHtml(group.key)}" /> мм</label>
            <button type="button" data-fill-save="${escapeHtml(group.key)}" data-fill-raw="${escapeHtml(group.rawFormula)}">Сохранить и применить</button>
          </div>
          <div class="fill-resolution-input-row">
            <button type="button" data-fill-ignore-mosquito="${escapeHtml(group.key)}" data-fill-raw="${escapeHtml(group.rawFormula)}">Москитная сетка — не учитывать</button>
          </div>
        </section>
      `;
    }).join("");
  }

  const dictionaryEntries = Object.entries(fillThicknessDictionary)
    .filter(([, entry]) =>
      parsePositiveThicknessInput(entry?.thicknessMm ?? entry) !== null || LabelData.isIgnoredFillingDictionaryEntry(entry)
    )
    .sort(([left], [right]) => left.localeCompare(right, "ru", { numeric: true }));
  if (fillThicknessDictionaryEl) {
    fillThicknessDictionaryEl.innerHTML = dictionaryEntries.length ? `
      <table class="fill-dictionary-table">
        <thead><tr><th>Формула</th><th>Нормализованный ключ</th><th>Значение</th><th>Действия</th></tr></thead>
        <tbody>${dictionaryEntries.map(([key, entry]) => `
          <tr>
            <td>${escapeHtml(entry.displayFormula || key)}</td>
            <td><code>${escapeHtml(key)}</code></td>
            <td>${LabelData.isIgnoredFillingDictionaryEntry(entry)
              ? "Не учитывать — москитная сетка"
              : `${escapeHtml(LabelData.formatFillingThickness(entry?.thicknessMm ?? entry))} мм`}</td>
            <td>
              <button type="button" data-fill-edit="${escapeHtml(key)}">Изменить</button>
              <button type="button" data-fill-delete="${escapeHtml(key)}">Удалить</button>
            </td>
          </tr>
        `).join("")}</tbody>
      </table>
    ` : "<small>Справочник пока пуст.</small>";
  }

  fillThicknessResolution?.querySelectorAll("[data-fill-save]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.getAttribute("data-fill-save") || "";
      const input = Array.from(fillThicknessResolution.querySelectorAll("[data-fill-input]"))
        .find((element) => element.getAttribute("data-fill-input") === key);
      const thickness = parsePositiveThicknessInput(input?.value);
      if (thickness === null) {
        window.alert("Введите положительное число. Допустимы точка или запятая.");
        return;
      }
      if (!saveFillDictionaryEntry(key, button.getAttribute("data-fill-raw") || key, thickness)) {
        window.alert("Не удалось сохранить справочник в localStorage.");
        return;
      }
      refreshFillThicknessData(new Set([key]));
    });
  });

  fillThicknessResolution?.querySelectorAll("[data-fill-ignore-mosquito]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.getAttribute("data-fill-ignore-mosquito") || "";
      if (!saveIgnoredMosquitoFillEntry(key, button.getAttribute("data-fill-raw") || key)) {
        window.alert("Не удалось сохранить справочник в localStorage.");
        return;
      }
      refreshFillThicknessData(new Set([key]));
    });
  });

  fillThicknessDictionaryEl?.querySelectorAll("[data-fill-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.getAttribute("data-fill-edit") || "";
      const current = fillThicknessDictionary[key];
      const currentThickness = LabelData.isIgnoredFillingDictionaryEntry(current) ? "" : LabelData.formatFillingThickness(current?.thicknessMm ?? current);
      const value = window.prompt(`Толщина для ${current?.displayFormula || key}, мм:`, currentThickness);
      if (value === null) return;
      const thickness = parsePositiveThicknessInput(value);
      if (thickness === null) {
        window.alert("Введите положительное число. Допустимы точка или запятая.");
        return;
      }
      saveFillDictionaryEntry(key, current?.displayFormula || key, thickness);
      refreshFillThicknessData(new Set([key]));
    });
  });

  fillThicknessDictionaryEl?.querySelectorAll("[data-fill-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.getAttribute("data-fill-delete") || "";
      if (!window.confirm(`Удалить значение для формулы ${fillThicknessDictionary[key]?.displayFormula || key}?`)) return;
      delete fillThicknessDictionary[key];
      LabelData.writeFillThicknessDictionary(getAppLocalStorage(), fillThicknessDictionary);
      refreshFillThicknessData();
    });
  });
}

function renderLabelKitCheck() {
  if (!labelSummary || !labelReview) return;
  const cutFiles = selectedCutFilesForProduction();
  const pdfFiles = selectedPdfFilesForProduction();
  const cutCollected = LabelData.collectStoresFromCutFiles(cutFiles);
  const pdfCollected = LabelData.collectStoresFromPdfFiles(pdfFiles);
  const conflicts = [
    ...cutCollected.conflicts,
    ...pdfCollected.conflicts,
    ...labelConflictEvents
  ];
  const duplicates = [
    ...cutCollected.duplicates,
    ...pdfCollected.duplicates,
    ...labelDuplicateEvents
  ];
  const review = LabelData.buildLabelKitReview(
    cutCollected.store,
    pdfCollected.store,
    conflicts,
    duplicates,
    excludedLabelPositions,
    labelDecisions
  );
  lastLabelReview = review;
  lastPhysicalLabels = LabelData.buildPhysicalLabelsForReviewRows(review.rows);
  renderFillThicknessTools(review);
  renderReinforcementOptimization();
  renderMuratPositions();
  renderLabelsPreview();

  labelSummary.innerHTML = `
    <div class="label-summary-grid">
      <div><strong>${cutFiles.length}</strong><span>файлов раскроя</span></div>
      <div><strong>${pdfFiles.length}</strong><span>PDF</span></div>
      <div><strong>${review.summary.positions}</strong><span>позиций</span></div>
      <div><strong>${review.summary.ready}</strong><span>готово</span></div>
      <div><strong>${review.summary.noPdf}</strong><span>нет PDF</span></div>
      <div><strong>${review.summary.noCut}</strong><span>нет раскроя</span></div>
      <div><strong>${review.summary.conflicts}</strong><span>конфликтов</span></div>
      <div><strong>${review.summary.ambiguous}</strong><span>неоднозначных</span></div>
      <div><strong>${review.summary.duplicates}</strong><span>дублей пропущено</span></div>
      <div><strong>${review.summary.matchedRows}</strong><span>строк сопоставлено</span></div>
      <div><strong>${review.summary.physicalDetails}</strong><span>физических деталей</span></div>
    </div>
  `;

  if (!review.rows.length && !duplicates.length) {
    labelReview.innerHTML = "<small>Нет данных для проверки.</small>";
    return;
  }

  const duplicateHtml = duplicates.length
    ? `
      <div class="label-duplicate-list">
        <div class="label-duplicate-title">Дубликаты пропущены</div>
        ${duplicates.map((item) => `<div>${escapeHtml(item.key)}${item.fileName ? " - " + escapeHtml(item.fileName) : ""}</div>`).join("")}
      </div>
    `
    : "";

  const rowsHtml = review.rows.map((row) => {
    const cutFilesText = row.cut?.sourceFiles?.join(", ") || "";
    const pdfFilesText = row.pdf?.pdfFiles?.join(", ") || "";
    const warnings = row.warnings.length
      ? `<div class="label-warning-lines">${row.warnings.map((warning) => `<div>${escapeHtml(warning)}</div>`).join("")}</div>`
      : "";
    const actions = renderLabelActions(row);
    return `
      <tr data-key="${row.key}">
        <td>${escapeHtml(row.key)}</td>
        <td>${cutFilesText ? escapeHtml(cutFilesText) : "—"}</td>
        <td>${pdfFilesText ? escapeHtml(pdfFilesText) : "—"}</td>
        <td><span class="label-status">${escapeHtml(row.status)}</span></td>
        <td>${row.detailCount}</td>
        <td>${row.physicalCount}</td>
        <td>${warnings || "—"}${actions}</td>
      </tr>
    `;
  }).join("");

  labelReview.innerHTML = `
    ${duplicateHtml}
    <table class="label-check-table">
      <thead>
        <tr>
          <th>Заказ / позиция</th>
          <th>Файл раскроя</th>
          <th>PDF</th>
          <th>Состояние</th>
          <th>Строк сопоставлено</th>
          <th>Физических деталей</th>
          <th>Предупреждения / действия</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;

  labelReview.querySelectorAll("[data-label-action]").forEach((btn) => {
    btn.addEventListener("click", () => handleLabelAction(btn));
  });
}

function renderLabelActions(row) {
  const status = row.status;
  const keyAttr = escapeHtml(row.key);
  if (status === LabelData.LABEL_STATUS.NO_PDF) {
    return `
      <div class="label-actions">
        <button type="button" data-label-action="load-pdf" data-key="${keyAttr}">Загрузить PDF</button>
        <button type="button" data-label-action="without-labels" data-key="${keyAttr}">Продолжить без этикеток</button>
        <button type="button" data-label-action="exclude" data-key="${keyAttr}">Исключить позицию</button>
        <button type="button" data-label-action="cancel-prep" data-key="${keyAttr}">Отменить подготовку</button>
      </div>
    `;
  }
  if (status === LabelData.LABEL_STATUS.NO_CUT) {
    return `
      <div class="label-actions">
        <button type="button" data-label-action="load-cut" data-key="${keyAttr}">Загрузить файл раскроя</button>
        <button type="button" data-label-action="keep-pdf" data-key="${keyAttr}">Оставить PDF</button>
        <button type="button" data-label-action="exclude" data-key="${keyAttr}">Исключить из задания</button>
        <button type="button" data-label-action="delete-pdf-position" data-key="${keyAttr}">Удалить загрузку</button>
      </div>
    `;
  }
  if (status === LabelData.LABEL_STATUS.CONFLICT) {
    if (row.conflictKind === "version") {
      return `
        <div class="label-actions">
          <button type="button" data-label-action="keep-old" data-key="${keyAttr}">Оставить старую версию</button>
          <button type="button" data-label-action="use-new" data-key="${keyAttr}">Использовать новую</button>
          <button type="button" data-label-action="exclude" data-key="${keyAttr}">Исключить позицию</button>
          <button type="button" data-label-action="back-load" data-key="${keyAttr}">Вернуться к загрузке</button>
        </div>
      `;
    }
    return `
      <div class="label-actions">
        <button type="button" data-label-action="show-differences" data-key="${keyAttr}">Показать различия</button>
        <button type="button" data-label-action="replace-file" data-key="${keyAttr}">Заменить файл</button>
        <button type="button" data-label-action="exclude" data-key="${keyAttr}">Исключить позицию</button>
        <button type="button" data-label-action="without-labels" data-key="${keyAttr}">Продолжить без этикеток</button>
      </div>
    `;
  }
  return "";
}

function removePdfPosition(key) {
  pdfFilesMap.forEach((fileInfo, fileKeyValue) => {
    fileInfo.positions = (fileInfo.positions || []).filter((position) => position.key !== key);
    fileInfo.pages = (fileInfo.pages || []).filter((page) => LabelData.labelPositionKey(page.orderId, page.productId) !== key);
    if (!fileInfo.positions.length) {
      if (fileInfo.hash) contentHashes.delete(fileInfo.hash);
      pdfFilesMap.delete(fileKeyValue);
    }
  });
}

function handleLabelAction(btn) {
  const action = btn.getAttribute("data-label-action");
  const key = btn.getAttribute("data-key");
  if (!action || !key) return;

  if (action === "load-pdf") {
    pdfInput?.click();
    return;
  }
  if (action === "load-cut") {
    input?.click();
    return;
  }
  if (action === "without-labels") {
    if (!window.confirm(`Продолжить позицию ${key} без этикеток?`)) return;
    labelDecisions.set(key, "without-labels");
  } else if (action === "exclude") {
    if (!window.confirm(`Исключить позицию ${key} из проверки комплекта?`)) return;
    excludedLabelPositions.add(key);
  } else if (action === "delete-pdf-position") {
    if (!window.confirm(`Удалить PDF-данные по позиции ${key}?`)) return;
    removePdfPosition(key);
    renderPdfFileList();
  } else if (action === "keep-pdf") {
    labelDecisions.set(key, "keep-pdf");
  } else if (action === "show-differences") {
    const row = lastLabelReview.rows.find((item) => item.key === key);
    window.alert(row ? formatLabelDifferenceText(row) : `Нет диагностических данных для позиции ${key}.`);
    return;
  } else if (action === "replace-file") {
    document.querySelector('.tab-btn[data-tab="import"]')?.click();
    return;
  } else if (action === "keep-old") {
    labelDecisions.set(key, "keep-old");
  } else if (action === "use-new") {
    if (!window.confirm(`Использовать новую версию данных для позиции ${key}?`)) return;
    labelDecisions.set(key, "use-new");
  } else if (action === "cancel-prep") {
    if (!window.confirm("Отменить подготовку этикеток и очистить PDF/решения?")) return;
    pdfFilesMap.clear();
    labelDuplicateEvents = [];
    labelConflictEvents = [];
    excludedLabelPositions.clear();
    labelDecisions.clear();
    renderPdfFileList();
  } else if (action === "back-load") {
    document.querySelector('.tab-btn[data-tab="import"]')?.click();
    return;
  }

  renderLabelKitCheck();
}

function decodeSmart(buffer) {
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  const replCount = (utf8.match(/\uFFFD/g) || []).length;
  if (replCount > 0) {
    return new TextDecoder("windows-1251", { fatal: false }).decode(buffer);
  }
  return utf8;
}

async function readFileToParts(file) {
  const buffer = await file.arrayBuffer();
  const text = decodeSmart(buffer);
  return { parts: parsePartsFromCsv(text), buffer };
}

async function hashBuffer(buffer) {
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fileKey(file) {
  return `${file.name}|${file.size}|${file.lastModified}`;
}

async function addFiles(files) {
  for (const file of files) {
    const key = fileKey(file);
    if (filesMap.has(key)) continue;

    const { parts, buffer } = await readFileToParts(file);
    const contentHash = await hashBuffer(buffer);
    if (contentHashes.has(contentHash)) {
      labelDuplicateEvents.push({
        key: file.name,
        sourceKind: "cut",
        status: LabelData.LABEL_STATUS.DUPLICATE,
        fileName: file.name,
        message: "Файл с таким содержимым уже загружен."
      });
      continue;
    }

    const positions = LabelData.buildCutPositions(parts, file.name);
    const vetted = vetPositionsForLoad(positions, currentCutStore(), "cut", file.name);
    labelDuplicateEvents = labelDuplicateEvents.concat(vetted.duplicates);
    labelConflictEvents = labelConflictEvents.concat(vetted.conflicts);
    const acceptedParts = parts.filter((part) => {
      const positionKey = LabelData.labelPositionKey(part.orderId, part.productId);
      return vetted.acceptedKeys.has(positionKey);
    });
    if (!acceptedParts.length) continue;

    contentHashes.add(contentHash);
    filesMap.set(key, { key, name: file.name, parts: acceptedParts, hash: contentHash });
  }
  rebuildAllParts();
  exportReady = false;
  lastLabelQueues = null;
  renderFileList();
  renderTable(allParts);
  renderLabelKitCheck();
}

async function addPdfFiles(files) {
  for (const file of files) {
    const key = fileKey(file);
    if (pdfFilesMap.has(key)) continue;
    const buffer = await file.arrayBuffer();
    const contentHash = await hashBuffer(buffer);
    if (contentHashes.has(contentHash)) {
      labelDuplicateEvents.push({
        key: file.name,
        sourceKind: "pdf",
        status: LabelData.LABEL_STATUS.DUPLICATE,
        fileName: file.name,
        message: "PDF с таким содержимым уже загружен."
      });
      continue;
    }

    let parsed;
    try {
      parsed = await LabelPdf.parseSuperOknaPdfArrayBuffer(buffer, file.name);
      applyFillDictionaryToParsedPdf(parsed);
    } catch (error) {
      labelConflictEvents.push({
        key: file.name,
        sourceKind: "pdf",
        status: LabelData.LABEL_STATUS.CONFLICT,
        fileName: file.name,
        message: `PDF не удалось разобрать: ${error?.message || error}`
      });
      continue;
    }

    const vetted = vetPositionsForLoad(parsed.positions, currentPdfStore(), "pdf", file.name);
    labelDuplicateEvents = labelDuplicateEvents.concat(vetted.duplicates);
    labelConflictEvents = labelConflictEvents.concat(vetted.conflicts);
    const acceptedPositions = parsed.positions.filter((position) => vetted.acceptedKeys.has(position.key));
    if (!acceptedPositions.length) continue;

    const acceptedKeys = new Set(acceptedPositions.map((position) => position.key));
    contentHashes.add(contentHash);
    pdfFilesMap.set(key, {
      key,
      name: file.name,
      hash: contentHash,
      pageCount: parsed.pageCount,
      imageCount: parsed.imageCount,
      pages: parsed.pages.filter((page) => acceptedKeys.has(LabelData.labelPositionKey(page.orderId, page.productId))),
      positions: acceptedPositions
    });
  }
  renderPdfFileList();
  lastLabelQueues = null;
  renderLabelKitCheck();
}

input.addEventListener("change", async () => {
  const files = Array.from(input.files || []);
  if (!files.length) return;
  await addFiles(files);
  input.value = "";
});

pdfInput.addEventListener("change", async () => {
  const files = Array.from(pdfInput.files || []);
  if (!files.length) return;
  await addPdfFiles(files);
  pdfInput.value = "";
});

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("is-dragover");
});
dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("is-dragover");
});
dropZone.addEventListener("drop", async (e) => {
  e.preventDefault();
  dropZone.classList.remove("is-dragover");
  dropZone.textContent = "Обработка папки...";
  const warnings = [];
  try {
    const collected = await window.DropFileCollector.collectSupportedFiles(e.dataTransfer);
    warnings.push(...collected.warnings);
    if (!collected.files.length) {
      const diagnostics = collected.diagnostics || {};
      const entryNames = (diagnostics.entries || []).map((entry) =>
        `${entry.name || "?"} [file=${entry.isFile}, dir=${entry.isDirectory}]`
      );
      const directoryReads = (diagnostics.directories || []).map((entry) =>
        `${entry.name || "?"}: ${entry.entryCount || 0} (${(entry.batchSizes || []).join("+")})`
      );
      const handleNames = (diagnostics.handles || []).map((handle) => `${handle.name || "?"} [${handle.kind || "?"}]`);
      window.alert([
        "В перетаскиваемых файлах и папках не найдено поддерживаемых файлов CSV, TXT или PDF.",
        "",
        `Диагностика: DataTransferItem — ${diagnostics.itemCount || 0}.`,
        `Entry: ${entryNames.join(", ") || "нет"}.`,
        `Папки/readEntries: ${directoryReads.join(", ") || "нет"}.`,
        `FileSystemHandle: ${handleNames.join(", ") || "нет"}.`,
        `Ошибки FileSystemHandle: ${(diagnostics.handleErrors || []).join("; ") || "нет"}.`,
        `Полученные файлы: ${(diagnostics.foundFileNames || []).join(", ") || "нет"}.`,
        warnings.length ? `Ошибки: ${warnings.join("; ")}` : ""
      ].filter(Boolean).join("\n"));
      return;
    }

    const cutFiles = collected.files.filter((file) => /\.(csv|txt)$/i.test(file.name));
    const pdfFiles = collected.files.filter((file) => /\.pdf$/i.test(file.name));
    for (const file of cutFiles) {
      try {
        await addFiles([file]);
      } catch (error) {
        warnings.push(`Не удалось импортировать «${file.name}»: ${error?.message || error}`);
      }
    }
    for (const file of pdfFiles) {
      try {
        await addPdfFiles([file]);
      } catch (error) {
        warnings.push(`Не удалось импортировать «${file.name}»: ${error?.message || error}`);
      }
    }
    if (warnings.length) {
      window.alert(`Часть файлов не удалось обработать:\n${warnings.join("\n")}`);
    }
  } finally {
    dropZone.innerHTML = dropZoneIdleHtml;
  }
});

clearBtn.addEventListener("click", () => {
  allParts = [];
  selectedProductionGroups.clear();
  collapsedImportGroups.clear();
  deletedParts = [];
  filesMap.clear();
  pdfFilesMap.clear();
  contentHashes.clear();
  labelDuplicateEvents = [];
  labelConflictEvents = [];
  excludedLabelPositions.clear();
  labelDecisions.clear();
  lastLabelQueues = null;
  exportReady = false;
  renderFileList();
  renderPdfFileList();
  renderTable(allParts);
  renderLabelKitCheck();
});

function formatMuratDecimal(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return number.toFixed(7).replace(".", ",");
}

function buildReceteCsv(records) {
  const dataHeaders = records.map((_, index) => `Data_${index + 1}`);
  const rows = [
    "List separator=;Decimal symbol=,;;",
    "Recete Recete Recete Recete Recete ;;;",
    ["LANGID_41f", ...dataHeaders].join(";"),
    ["LANGID_409", ...dataHeaders].join(";"),
    ["LANGID_407", ...dataHeaders].join(";"),
    ["LANGID_419", ...dataHeaders].join(";"),
    ["LANGID_c0a", ...dataHeaders].join(";"),
    ["1", ...records.map((record) => record.dataRec)].join(";"),
    ["Customer", ...records.map((record) => record.customer)].join(";"),
    ["BoxNo", ...records.map((record) => record.boxNo)].join(";"),
    ["ProfilNo", ...records.map((record) => record.profilNo)].join(";"),
    ["Color Code", ...records.map((record) => record.colorCode)].join(";"),
    ["X_size", ...records.map((record) => formatMuratDecimal(record.xSize))].join(";"),
    ["Y_size", ...records.map((record) => formatMuratDecimal(record.ySize))].join(";"),
    ["Transom", ...records.map((record) => record.transom)].join(";"),
    ["Quanti", ...records.map((record) => record.quanti)].join(";")
  ];
  return rows.join("\r\n") + "\r\n";
}

function renderMuratPositions() {
  if (!muratTableWrap) return;
  const groupsByKey = new Map();

  for (const row of lastLabelReview.rows || []) {
    const orderId = String(row.orderId || "").trim();
    const productId = String(row.productId || "").trim();
    if (!orderId || !productId || row.status !== LabelData.LABEL_STATUS.READY) continue;

    const labels = lastPhysicalLabels.byPosition?.get(row.key) || [];
    for (const label of labels) {
      const contour = normalizeMuratContour(label.contour);
      if (!contour.startsWith("К")) continue;

      const uniqueKey = `${orderId}|${productId}|${contour}`;
      if (groupsByKey.has(uniqueKey)) continue;
      groupsByKey.set(uniqueKey, {
        orderId,
        productId,
        contour,
        partKind: String(label.partKind || "").trim() || "—",
        dimension: label.dimension || null,
        quantity: Number(row.pdf?.productQuantity),
        hasThreshold: (row.pdf?.allDetails || []).some((detail) => (
          String(detail.orderId || "").trim() === orderId &&
          String(detail.productId || "").trim() === productId &&
          normalizeMuratContour(detail.contour || detail.position) === contour &&
          LabelData.isThresholdDetail(detail)
        ))
      });
    }
  }

  const typePriority = (value) => {
    const type = String(value || "").trim().toLowerCase();
    if (type === "рама") return 0;
    if (type === "створка") return 1;
    return 2;
  };

  const groups = Array.from(groupsByKey.values()).sort((a, b) => {
    const typeCompare = typePriority(a.partKind) - typePriority(b.partKind);
    if (typeCompare !== 0) return typeCompare;
    const orderCompare = a.orderId.localeCompare(b.orderId, "ru", { numeric: true });
    if (orderCompare !== 0) return orderCompare;
    const productCompare = a.productId.localeCompare(b.productId, "ru", { numeric: true });
    if (productCompare !== 0) return productCompare;
    return a.contour.localeCompare(b.contour, "ru", { numeric: true });
  });

  const emptyMessage = groups.length
    ? ""
    : "<small>Сначала выполните проверку комплекта.</small>";

  const weldGroups = groups.filter((group) => !(group.hasThreshold && typePriority(group.partKind) === 0));
  const excludedGroups = groups.filter((group) => group.hasThreshold && typePriority(group.partKind) === 0);

  const muratRecords = weldGroups.map((group, index) => ({
    matchKey: muratRecordMatchKey(group.orderId, group.productId, group.contour),
    orderPosition: `${group.orderId}/${group.productId}`,
    contour: group.contour,
    partKind: group.partKind,
    dataRec: index + 1,
    customer: group.orderId,
    boxNo: group.productId,
    profilNo: "test58",
    colorCode: "01",
    xSize: group.dimension?.widthMm ?? "—",
    ySize: group.dimension?.heightMm ?? "—",
    transom: "4294967295",
    quanti: Number.isFinite(group.quantity) && group.quantity > 0 ? group.quantity : "—"
  }));
  lastMuratRecords = muratRecords;

  const contourRows = muratRecords.map((record) => `
    <tr>
      <td>${record.dataRec}</td>
      <td>${escapeHtml(record.orderPosition)}</td>
      <td>${escapeHtml(record.contour)}</td>
      <td>${escapeHtml(record.partKind)}</td>
      <td>${escapeHtml(`${record.xSize} × ${record.ySize}`)}</td>
      <td>${record.quanti}</td>
    </tr>
  `).join("");

  const recordRows = muratRecords.map((record) => `
    <tr>
      <td>${escapeHtml(record.orderPosition)}</td>
      <td>${escapeHtml(record.contour)}</td>
      <td>${escapeHtml(record.partKind)}</td>
      <td>${record.dataRec}</td>
      <td>${escapeHtml(record.customer)}</td>
      <td>${escapeHtml(record.boxNo)}</td>
      <td>${escapeHtml(record.profilNo)}</td>
      <td>${escapeHtml(record.colorCode)}</td>
      <td>${record.xSize}</td>
      <td>${record.ySize}</td>
      <td>${escapeHtml(record.transom)}</td>
      <td>${record.quanti}</td>
    </tr>
  `).join("");

  const excludedRows = excludedGroups.map((group, index) => {
    const sizeText = group.dimension
      ? `${group.dimension.widthMm} × ${group.dimension.heightMm}`
      : "—";
    const quantityText = Number.isFinite(group.quantity) && group.quantity > 0 ? group.quantity : "—";
    return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(`${group.orderId}/${group.productId}`)}</td>
        <td>${escapeHtml(group.contour)}</td>
        <td>${escapeHtml(group.partKind)}</td>
        <td>${escapeHtml(sizeText)}</td>
        <td>${quantityText}</td>
        <td>Конструкция с порогом</td>
      </tr>
    `;
  }).join("");

  muratTableWrap.innerHTML = `
    ${emptyMessage}
    <section class="murat-section">
      <h3>Свариваемые контуры</h3>
      <table class="murat-table murat-table--contours">
        <thead>
          <tr>
            <th>№</th>
            <th>Заказ/позиция</th>
            <th>Группа</th>
            <th>Что свариваем</th>
            <th>Размер</th>
            <th>Количество</th>
          </tr>
        </thead>
        <tbody>${contourRows}</tbody>
      </table>
    </section>
    <section class="murat-section">
      <h3>Не экспортируются на станок</h3>
      <table class="murat-table murat-table--exceptions">
        <thead>
          <tr>
            <th>№</th>
            <th>Заказ/позиция</th>
            <th>Группа</th>
            <th>Что свариваем</th>
            <th>Размер</th>
            <th>Количество</th>
            <th>Причина</th>
          </tr>
        </thead>
        <tbody>${excludedRows}</tbody>
      </table>
    </section>
    <section class="murat-section">
      <div class="murat-section-header">
        <h3>Данные для Recete.csv</h3>
        <button id="downloadReceteBtn" class="btn-secondary" type="button" ${muratRecords.length ? "" : "disabled"}>Скачать Recete.csv</button>
      </div>
      <table class="murat-table">
        <thead>
          <tr>
            <th>Заказ/позиция</th>
            <th>Группа</th>
            <th>Что свариваем</th>
            <th>Data Rec</th>
            <th>Customer</th>
            <th>BoxNo</th>
            <th>ProfilNo</th>
            <th>Color Code</th>
            <th>X_size</th>
            <th>Y_size</th>
            <th>Transom</th>
            <th>Quanti</th>
          </tr>
        </thead>
        <tbody>${recordRows}</tbody>
      </table>
    </section>
  `;

  const downloadReceteBtn = document.getElementById("downloadReceteBtn");
  if (downloadReceteBtn) {
    downloadReceteBtn.addEventListener("click", () => {
      if (!muratRecords.length) return;
      if (muratRecords.length > 500) {
        window.alert("Количество записей превышает допустимый предел MURAT: 500.");
        return;
      }

      const csvText = buildReceteCsv(muratRecords);
      const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "Recete.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    });
  }
}

if (refreshMuratBtn) {
  refreshMuratBtn.addEventListener("click", renderMuratPositions);
}

const tabButtons = document.querySelectorAll(".tab-btn");
const panels = {
  import: document.getElementById("tab-import"),
  check: document.getElementById("tab-check"),
  labels: document.getElementById("tab-labels"),
  optimize: document.getElementById("tab-optimize"),
  export: document.getElementById("tab-export"),
  murat: document.getElementById("tab-murat")
};

function setActiveOptimizationView(view) {
  activeOptimizationView = view === "reinforcement" ? "reinforcement" : "profiles";
  optimizationViewTabs.forEach((button) => {
    const isActive = button.getAttribute("data-optimization-view") === activeOptimizationView;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
  optimizationViewPanels.forEach((panel) => {
    const isActive = panel.getAttribute("data-optimization-panel") === activeOptimizationView;
    panel.classList.toggle("active", isActive);
  });
}

optimizationViewTabs.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveOptimizationView(button.getAttribute("data-optimization-view"));
  });
});

setActiveOptimizationView(activeOptimizationView);

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const tab = btn.getAttribute("data-tab");
    Object.values(panels).forEach((p) => p.classList.remove("active"));
    panels[tab].classList.add("active");
    if (tab === "murat") renderMuratPositions();
  });
});

function normalizeOrientKind(value) {
  const key = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-zа-яё]/g, "");
  if (key.startsWith("гор") || key === "г") return "horizontal";
  if (key.startsWith("вер") || key === "в") return "vertical";
  return "";
}

function fallbackDesignationForKind(kind, orient) {
  if (kind === "horizontal") return "ГОРИЗОНТАЛЬ";
  if (kind === "vertical") return "ВЕРТИКАЛЬ";
  const raw = String(orient || "").trim();
  return raw ? raw.toUpperCase() : "НЕ ОПРЕДЕЛЕНО";
}

function sideDesignationsForKind(kind) {
  if (kind === "horizontal") return ["ВЕРХ", "НИЗ"];
  if (kind === "vertical") return ["ЛЕВО", "ПРАВО"];
  return [];
}

function physicalLabelPositionKey(part) {
  return [
    String(part.orderId || "").trim(),
    String(part.productId || "").trim(),
    String(part.profileCode || "").trim()
  ].join("||");
}

function createPhysicalPiece(part, groupTitle, instanceNo, instanceTotal, designation, pairKey, pairSlot) {
  const len = Number(part.lengthMm);
  const label = {
    orderId: String(part.orderId || "").trim(),
    productId: String(part.productId || "").trim(),
    instanceNo,
    instanceTotal,
    lengthMm: len,
    profile: String(groupTitle || part.name || part.profileCode || "").trim(),
    designation
  };
  return {
    lengthMm: len,
    angles: String(part.angles || "").trim(),
    orderId: label.orderId,
    productId: label.productId,
    contour: String(part.contour || part.position || "").trim(),
    partKind: String(part.partKind || "").trim(),
    title: String(part.name || "").trim(),
    orient: String(part.orient || "").trim(),
    profileCode: String(part.profileCode || "").trim(),
    sourcePartId: String(part.id || ""),
    sourceUnitNo: null,
    instanceNo,
    instanceTotal,
    labelDesignation: designation,
    label,
    labelPairKey: pairKey || "",
    labelPairSlot: Number.isFinite(pairSlot) ? pairSlot : null
  };
}

function makeLabelWarning(part, groupTitle, message) {
  const orderText = `${part.orderId || "без заказа"}${part.productId ? " / " + part.productId : ""}`;
  return `${orderText}, ${groupTitle || part.name || part.profileCode || "профиль"}: ${message}`;
}

function expandPartsToPieces(parts, groupTitle = "") {
  const pieces = [];
  const warnings = [];

  for (const p of parts) {
    const requiresPairedSides = !isMullionPart(p);
    const len = Number(p.lengthMm);
    const qtyRaw = Number(p.quantity) || 0;
    const qty = Math.floor(qtyRaw);
    const kind = requiresPairedSides ? normalizeOrientKind(p.orient) : "";
    const designations = sideDesignationsForKind(kind);
    const fallbackDesignation = requiresPairedSides
      ? fallbackDesignationForKind(kind, p.orient)
      : "ИМПОСТ";
    const sourceId = String(p.id || `${p.orderId}_${p.productId}_${p.profileCode}_${p.lengthMm}_${p.orient}`);

    if (!Number.isFinite(len) || len <= 0) continue;
    if (!Number.isFinite(qty) || qty <= 0) continue;

    if (requiresPairedSides && !kind) {
      warnings.push(makeLabelWarning(p, groupTitle, "непонятный ориентир, сторона для наклейки не назначена точно."));
    }
    if (requiresPairedSides && !Number.isInteger(qtyRaw)) {
      warnings.push(makeLabelWarning(p, groupTitle, "количество не целое, сторона для наклейки не назначена точно."));
    }
    if (requiresPairedSides && kind && Number.isInteger(qtyRaw) && qty % 2 === 1) {
      warnings.push(makeLabelWarning(p, groupTitle, "нечетное количество в строке, последняя деталь оставлена без точной стороны."));
    }

    const canAssignPairs = requiresPairedSides && kind && Number.isInteger(qtyRaw);
    const pairTotal = Math.ceil(qty / 2);

    for (let index = 0; index < qty; index++) {
      const sourceUnitNo = index + 1;
      const pairNo = Math.floor(index / 2) + 1;
      const pairSlot = index % 2;
      const isOddLeftover = canAssignPairs && qty % 2 === 1 && index === qty - 1;
      const designation = canAssignPairs && !isOddLeftover
        ? designations[pairSlot]
        : fallbackDesignation;
      const pairKey = canAssignPairs && !isOddLeftover
        ? [
            String(p.orderId || "").trim(),
            String(p.productId || "").trim(),
            String(p.profileCode || "").trim(),
            sourceId,
            kind,
            pairNo
          ].join("||")
        : "";
      const piece = createPhysicalPiece(p, groupTitle, pairNo, pairTotal, designation, pairKey, pairSlot);
      piece.sourceUnitNo = sourceUnitNo;
      piece.optimizationInputIndex = pieces.length;
      if (requiresPairedSides && !pairKey) piece.doublePairBlocked = true;
      pieces.push(piece);
    }
  }

  return { pieces, warnings };
}

function buildPhysicalLabelPool() {
  const map = new Map();
  (lastPhysicalLabels.labels || []).forEach((label) => {
    const key = [
      String(label.sourcePartId || label.csvSource?.detail?.sourcePartId || "").trim(),
      String(label.sourceUnitNo || "").trim()
    ].join("||");
    if (!key.trim() || key === "||") return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(label);
  });
  map.forEach((labels) => {
    labels.sort((a, b) => {
      const sideA = String(a.side || "");
      const sideB = String(b.side || "");
      const sideCmp = sideA.localeCompare(sideB, "ru", { sensitivity: "base" });
      if (sideCmp !== 0) return sideCmp;
      return String(a.id).localeCompare(String(b.id));
    });
  });
  return map;
}

function attachPhysicalLabelsToPieces() {
  const pool = buildPhysicalLabelPool();
  const attach = (piece) => {
    const key = [
      String(piece.sourcePartId || "").trim(),
      String(piece.sourceUnitNo || "").trim()
    ].join("||");
    const bucket = pool.get(key) || [];
    const label = bucket.shift() || null;
    piece.labelId = label?.id || "";
    piece.physicalLabel = label;
    return piece;
  };
  optimizeCache.groups.forEach((group) => group.pieces.forEach(attach));
  optimizeCache.skewGroups.forEach((group) => group.pieces.forEach(attach));
}

function buildOptimizeData(parts) {
  const sorted = sortParts(parts);
  const normalParts = sorted.filter((p) => !isSkewPart(p));
  const skewParts = sorted.filter((p) => isSkewPart(p));
  const labelWarnings = [];
  const groups = groupByOptimizationProfile(normalParts).map((g) => {
    const expanded = expandPartsToPieces(g.items, g.name);
    labelWarnings.push(...expanded.warnings);
    return {
      title: g.name,
      profileId: g.profileId,
      profileCode: g.profileCode,
      partKind: g.partKind,
      pieces: expanded.pieces,
      total: expanded.pieces.length,
      mode: g.partKind === "mullion" ? "single" : DEFAULT_MODE
    };
  });
  const skewGroups = groupByOptimizationProfile(skewParts).map((g) => {
    const expanded = expandPartsToPieces(g.items, g.name);
    labelWarnings.push(...expanded.warnings);
    return {
      title: g.name,
      profileId: g.profileId,
      profileCode: g.profileCode,
      partKind: g.partKind,
      pieces: expanded.pieces,
      total: expanded.pieces.length
    };
  });
  const baseSkewCount = skewParts.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
  return { groups, skewGroups, baseSkewCount, labelWarnings };
}

function buildLeftoverSkewItems(groups) {
  const leftovers = [];
  groups.forEach((g) => {
    if (g.mode !== "double") return;
    const { leftovers: groupLeftovers } = buildDoublePairs(g.pieces);
    groupLeftovers.forEach((piece) => {
      leftovers.push({ ...piece, title: g.title, manualReason: "не сформирована пара двойного режима" });
    });
  });
  return leftovers;
}

function renderOptimize(parts) {
  if (!optBlocks) return;
  if (!parts.length) {
    optBlocks.innerHTML = "<small>Нет данных</small>";
    optResults.innerHTML = "<small>Нет расчетов</small>";
    optimizeCache = { groups: [], skewGroups: [], baseSkewCount: 0 };
    lastLabelQueues = null;
    exportReady = false;
    renderExport();
    return;
  }

  optimizeCache = buildOptimizeData(parts);

  if (!optimizeCache.groups.length && !optimizeCache.baseSkewCount) {
    optBlocks.innerHTML = "<small>Нет данных</small>";
    optResults.innerHTML = "<small>Нет расчетов</small>";
    exportReady = false;
    lastLabelQueues = null;
    renderExport();
    return;
  }

  const lines = optimizeCache.groups.map((g, index) => {
    const selectedDouble = g.mode === "double" ? "selected" : "";
    const selectedSingle = g.mode === "single" ? "selected" : "";
    const leftovers = g.mode === "double"
      ? buildDoublePairs(g.pieces).leftovers.length
      : 0;
    const shown = Math.max(0, g.total - leftovers);
    const modeControl = `
      <select class="opt-mode">
        <option value="single" ${selectedSingle}>Одинарный</option>
        <option value="double" ${selectedDouble}>Двойной</option>
      </select>
    `;
    return `
      <div class="opt-line" data-index="${index}">
        <div class="opt-line-title">${g.title}</div>
        <div class="opt-line-count">${shown} шт.</div>
        <div class="opt-line-controls">
          ${modeControl}
        </div>
      </div>
    `;
  }).join("");

  const buildSkewSummary = () => {
    const leftoverItems = buildLeftoverSkewItems(optimizeCache.groups);
    const leftoverCount = leftoverItems.length;
    const total = optimizeCache.baseSkewCount + leftoverCount;
    const skewByTitle = new Map();
    optimizeCache.skewGroups.forEach((g) => {
      const count = g.pieces.length;
      if (!skewByTitle.has(g.title)) skewByTitle.set(g.title, 0);
      skewByTitle.set(g.title, skewByTitle.get(g.title) + count);
    });
    leftoverItems.forEach((it) => {
      const title = it.title || "Косые элементы";
      if (!skewByTitle.has(title)) skewByTitle.set(title, 0);
      skewByTitle.set(title, skewByTitle.get(title) + 1);
    });
    const listHtml = Array.from(skewByTitle.entries())
      .map(([title, count]) => `<div class="opt-skew-item">${title} — ${count} шт.</div>`)
      .join("");
    return { total, listHtml };
  };

  const { total: totalSkew, listHtml: skewList } = buildSkewSummary();
  const skewLine = `
      <div class="opt-line opt-line-skew" id="manualModeSummary" ${totalSkew ? "" : "hidden"}>
        <div class="opt-line-title">Ручной режим</div>
        <div class="opt-line-count"><span id="skewCount">${totalSkew}</span> шт.</div>
      </div>
      <div class="opt-skew-list" id="skewList" ${totalSkew ? "" : "hidden"}>
        ${skewList}
      </div>
    `;
  const deletedCount = deletedParts.reduce((s, p) => s + (Number(p.quantity) || 1), 0);
  const deletedLine = deletedCount
    ? `
      <div class="opt-line opt-line-deleted">
        <div class="opt-line-title">Запасы</div>
        <div class="opt-line-count">${deletedCount} шт.</div>
      </div>
    `
    : "";

  optBlocks.innerHTML = `
    <div class="profile-remnants-panel">
      <h3>Остатки профиля</h3>
      <div id="profileRemnantsEditor"></div>
    </div>
    <div class="opt-settings">
      <label>Режим оптимизации
        <select class="pvc-optimization-mode">
          <option value="max_savings" ${pvcOptimizationMode === APP_PVC_OPTIMIZATION_MODE.MAX_SAVINGS ? "selected" : ""}>Максимальная экономия</option>
          <option value="soft_by_product" ${pvcOptimizationMode === APP_PVC_OPTIMIZATION_MODE.SOFT_BY_PRODUCT ? "selected" : ""}>Мягкий по изделиям</option>
          <option value="hard_by_product" ${pvcOptimizationMode === APP_PVC_OPTIMIZATION_MODE.HARD_BY_PRODUCT ? "selected" : ""}>Жёсткий по изделиям</option>
        </select>
      </label>
      <label>Длина хлыста, мм
        <input class="opt-stock" type="number" value="${DEFAULT_STOCK}" disabled />
      </label>
      <label>Пропил, мм
        <input class="opt-kerf" type="number" value="${DEFAULT_KERF}" disabled />
      </label>
    </div>
    <div class="opt-summary">
      ${lines}
      ${skewLine}
      ${deletedLine}
    </div>
  `;

  refreshProfileRemnantsEditor();

  optBlocks.querySelectorAll(".opt-mode").forEach((select) => {
    select.addEventListener("change", () => {
      const line = select.closest(".opt-line");
      const idx = Number(line?.getAttribute("data-index"));
      if (!Number.isFinite(idx) || !optimizeCache.groups[idx]) return;
      optimizeCache.groups[idx].mode = select.value === "single" ? "single" : "double";
      const manualModeSummaryEl = document.getElementById("manualModeSummary");
      const skewCountEl = document.getElementById("skewCount");
      const skewListEl = document.getElementById("skewList");
      if (manualModeSummaryEl || skewCountEl || skewListEl) {
        const summary = buildSkewSummary();
        if (manualModeSummaryEl) manualModeSummaryEl.hidden = summary.total === 0;
        if (skewCountEl) skewCountEl.textContent = String(summary.total);
        if (skewListEl) {
          skewListEl.hidden = summary.total === 0;
          skewListEl.innerHTML = summary.listHtml;
        }
      }
      const total = optimizeCache.groups[idx].total;
      const leftover = optimizeCache.groups[idx].mode === "double"
        ? buildDoublePairs(optimizeCache.groups[idx].pieces).leftovers.length
        : 0;
        const shown = Math.max(0, total - leftover);
        const countEl = line.querySelector(".opt-line-count");
        if (countEl) countEl.textContent = `${shown} шт.`;
        exportReady = false;
        lastLabelQueues = null;
        renderExport();
      });
    });

  const pvcModeSelect = optBlocks.querySelector(".pvc-optimization-mode");
  pvcModeSelect?.addEventListener("change", () => {
    if (pvcModeSelect.value === APP_PVC_OPTIMIZATION_MODE.HARD_BY_PRODUCT) {
      pvcOptimizationMode = APP_PVC_OPTIMIZATION_MODE.HARD_BY_PRODUCT;
    } else if (pvcModeSelect.value === APP_PVC_OPTIMIZATION_MODE.SOFT_BY_PRODUCT) {
      pvcOptimizationMode = APP_PVC_OPTIMIZATION_MODE.SOFT_BY_PRODUCT;
    } else {
      pvcOptimizationMode = APP_PVC_OPTIMIZATION_MODE.MAX_SAVINGS;
    }
    exportReady = false;
    lastLabelQueues = null;
    renderExport();
    optimizeBtn?.click();
  });

  renderExport();
  renderLabelWarnings(optBlocks);
}

function buildManualQueueGroups(manualMap) {
  return Array.from(manualMap.entries()).map(([title, pieces]) => ({
    title,
    reason: pieces.some((piece) => piece.manualReason === "не сформирована пара двойного режима")
      ? "не сформирована пара двойного режима"
      : "ручной режим",
    pieces
  }));
}

function excludedLabelCountForQueues() {
  return (lastLabelReview.rows || []).reduce((sum, row) => {
    const decision = labelDecisions.get(row.key);
    if (decision === "without-labels" || excludedLabelPositions.has(row.key)) {
      return sum + (Number(row.physicalCount) || 0);
    }
    return sum;
  }, 0);
}

function rebuildLabelQueues(manualGroups) {
  lastLabelQueues = LabelData.buildLabelQueuesFromOptimizeState({
    physicalLabels: lastPhysicalLabels.labels || [],
    groups: optimizeCache.groups || [],
    lastExportResults: optimizeCache.lastExportResults || new Map(),
    manualGroups,
    excludedLabelCount: excludedLabelCountForQueues()
  });
  labelPreviewMode = "saw";
  renderLabelsPreview();
}

function renderLabelWarnings(target) {
  const warnings = Array.from(new Set(optimizeCache.labelWarnings || []));
  if (!warnings.length || !target) return;
  const box = document.createElement("div");
  box.className = "label-warning";
  box.innerHTML = `
    <div class="label-warning-title">Предупреждения по наклейкам</div>
    ${warnings.map((warning) => `<div class="label-warning-item">${warning}</div>`).join("")}
  `;
  target.appendChild(box);
}

function appendDeletedResults() {
  if (!deletedParts.length) return;
  const total = deletedParts.reduce((s, p) => s + (Number(p.quantity) || 1), 0);
  const notice = document.createElement("div");
  notice.className = "opt-deleted-notice";
  notice.textContent = `ЗАПАСЫ — ${total} шт.`;
  optResults.appendChild(notice);

  const list = document.createElement("div");
  list.className = "opt-deleted";
  const grouped = new Map();
  deletedParts.forEach((p) => {
    const name = canonicalGroupName(p) || p.name || "";
    if (!grouped.has(name)) grouped.set(name, []);
    grouped.get(name).push({ ...p, _displayName: name });
  });
  const sortedRows = [];
  Array.from(grouped.keys())
    .sort((a, b) => String(a).localeCompare(String(b), "ru", { sensitivity: "base" }))
    .forEach((name) => {
      const items = grouped.get(name) || [];
      items.sort((a, b) => (Number(b.lengthMm) || 0) - (Number(a.lengthMm) || 0));
      items.forEach((p) => sortedRows.push(p));
    });

  const rows = sortedRows.map((p) => {
    const orderText = p.orderId && p.productId ? `${p.orderId} / ${p.productId}` : "";
    const orient = p.orient || "";
    const qty = Number(p.quantity) || 1;
    return `
      <tr>
        <td>${p._displayName || p.name}</td>
        <td>${p.lengthMm}</td>
        <td>${qty}</td>
        <td>${orient}</td>
        <td>${orderText}</td>
      </tr>
    `;
  }).join("");
  list.innerHTML = `
    <table class="opt-deleted-table">
      <colgroup>
        <col style="width:35%">
        <col style="width:15%">
        <col style="width:10%">
        <col style="width:20%">
        <col style="width:20%">
      </colgroup>
      <thead>
        <tr>
          <th>Наименование</th>
          <th>Размер</th>
          <th>Кол-во</th>
          <th>Ориентир</th>
          <th>Заказ / изделие</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
  optResults.appendChild(list);
}

function formatOptimizeResult(result, stock, kerf, rules = null, labels = {}) {
  if (!result.bins.length && !result.unfit.length) {
    return "<div class=\"opt-result-sub\">Нет данных для раскроя.</div>";
  }

  const lines = [];
  const stockLabel = labels.stock || "хлыста";
  const countLabel = labels.count || "Хлыстов";
  const binLabel = labels.bin || "Хлыст";
  lines.push(`<div class="opt-result-sub">Длина ${stockLabel}: ${stock} мм, пропил: ${kerf} мм</div>`);
  lines.push(`<div class="opt-result-count">${countLabel}: ${result.bins.length}</div>`);

  result.bins.forEach((bin, idx) => {
    const parts = bin.parts
      .map((p) => {
        const meta = p.meta || {};
        let orientLetter = "";
        const orientRaw = String(meta.orient || "").trim().toLowerCase();
        const orientKey = orientRaw.replace(/[^a-zа-яё]/g, "");
        if (orientKey.startsWith("вер") || orientKey === "в") orientLetter = "Вер";
        else if (orientKey.startsWith("гор") || orientKey === "г") orientLetter = "Гор";
        else if (orientKey.startsWith("нак") || orientKey === "н") orientLetter = "Нак";
        const baseText = meta.orderId && meta.productId ? `${meta.orderId} / ${meta.productId}` : "";
        const designation = meta.labelDesignation || meta.label?.designation || orientLetter;
        const details = [baseText, designation].filter(Boolean);
        const metaText = details.length ? details.join(" · ") : "";
        const angleNorm = normalizeAngles(meta.angles || "");
        const chipClass = angleNorm && angleNorm !== "45-45" ? "cut-chip cut-chip--skew" : "cut-chip";
        return `
          <span class="${chipClass}">
            <span class="cut-chip-meta">${metaText}</span>
            <span class="cut-chip-length">${p.length}</span>
          </span>
        `;
      })
      .join("");
    const percent = stock > 0 ? (bin.leftover / stock) * 100 : 0;
    const percentText = `(${percent.toFixed(1)}%)`;
    const scrapMax = Number.isFinite(Number(rules?.scrapMax))
      ? Number(rules.scrapMax)
      : DEFAULT_SCRAP_MAX;
    const percentClass = bin.leftover <= scrapMax ? "percent-scrap" : "percent-useful";
    lines.push(`
      <div class="opt-bin">
        <strong>${binLabel} ${idx + 1}:</strong> ${parts}
        <span class="opt-left">Остаток: ${bin.leftover} мм</span>
        <span class="opt-left opt-left-percent ${percentClass}">${percentText}</span>
      </div>
    `);
  });

  if (result.unfit.length) {
    const list = result.unfit.map((p) => `${p.length}`).join(", ");
    lines.push(`<div class="opt-error">Не помещаются: ${list}</div>`);
  }

  return lines.join("");
}

function formatOptimizationMeters(valueMm) {
  return (Number(valueMm || 0) / 1000).toLocaleString("ru-RU", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2
  });
}

function formatProfileOptimizationStats(stats) {
  if (!stats) return "";
  const percent = Number(stats.usedPercent || 0).toLocaleString("ru-RU", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
  return `
    <div class="opt-material-stats">
      ${stats.physicalStockCount} хлыстов
      <span>·</span> ${formatOptimizationMeters(stats.totalMaterialMm)} м материала
      <span>·</span> ${formatOptimizationMeters(stats.partsLengthMm)} м деталей
      <span>·</span> ${formatOptimizationMeters(stats.kerfMm)} м пропил
      <span>·</span> ${formatOptimizationMeters(stats.usefulLeftoverMm)} м полезный остаток
      <span>·</span> ${formatOptimizationMeters(stats.wasteMm)} м отход
      <span>·</span> ${percent}% использование
    </div>
  `;
}

function appendOptimizeResult(title, result, stock, kerf, modeLabel = "", rules = null, stats = null) {
  const modeHtml = modeLabel ? ` <span class="opt-mode-label">${modeLabel}</span>` : "";
  const section = document.createElement("div");
  section.className = "opt-result";
  section.innerHTML = `
    <div class="opt-result-title">${title}${modeHtml}</div>
    ${formatProfileOptimizationStats(stats)}
    ${formatOptimizeResult(result, stock, kerf, rules)}
  `;
  optResults.appendChild(section);
}

function appendOptimizeError(title, message, modeLabel = "") {
  const modeHtml = modeLabel ? ` <span class="opt-mode-label">${modeLabel}</span>` : "";
  const section = document.createElement("div");
  section.className = "opt-result";
  section.innerHTML = `
    <div class="opt-result-title">${title}${modeHtml}</div>
    <div class="opt-error">${message}</div>
  `;
  optResults.appendChild(section);
}

function appendManualRemnantResults(remnantBins, unusedRemnants) {
  if (!remnantBins.length && !unusedRemnants.length) return;
  const section = document.createElement("div");
  section.className = "manual-remnant-results";
  const usedHtml = remnantBins.map((bin) => {
    const remnant = bin.remnant || {};
    const profileName = remnant.profileName || profileDisplayNameForCode(remnant.profileCode);
    const displayLabel = remnant.physicalTotal > 1
      ? `${remnant.label} (${remnant.physicalNo}/${remnant.physicalTotal})`
      : remnant.label;
    const status = bin.status === "used" ? "использован" : "частично использован";
    const rules = getOptimizeRulesForProfile(remnant.profileCode);
    const formattedResult = formatOptimizeResult(
      { bins: [{ used: bin.used, leftover: bin.leftover, parts: bin.parts }], unfit: [] },
      remnant.lengthMm,
      DEFAULT_KERF,
      rules,
      { stock: "остатка", count: "Остатков", bin: "Остаток" }
    );
    return `
      <article class="opt-result">
        <div class="opt-result-title">${escapeHtml(displayLabel || "Остаток")} <span class="opt-mode-label">Одинарный</span></div>
        <div class="opt-result-sub">Профиль: ${escapeHtml(profileName || "")}${remnant.note ? ` · ${escapeHtml(remnant.note)}` : ""}</div>
        ${formattedResult}
        <div class="manual-remnant-status">Статус: ${status}</div>
      </article>
    `;
  }).join("");
  const unusedHtml = unusedRemnants.map((remnant) => {
    const profileName = remnant.profileName || profileDisplayNameForCode(remnant.profileCode);
    const displayLabel = remnant.physicalTotal > 1
      ? `${remnant.label} (${remnant.physicalNo}/${remnant.physicalTotal})`
      : remnant.label;
    return `
      <article class="opt-result manual-remnant-card--unused">
        <div class="manual-remnant-unused-title">
          <strong>${escapeHtml(displayLabel || "Остаток")}</strong>
          <span class="opt-mode-label">Одинарный</span>
        </div>
        <div class="manual-remnant-unused-details">
          <div><span>Профиль</span><strong>${escapeHtml(profileName || "—")}</strong></div>
          <div><span>Длина</span><strong>${remnant.lengthMm} мм</strong></div>
        </div>
        ${remnant.note ? `<div class="manual-remnant-unused-note">${escapeHtml(remnant.note)}</div>` : ""}
        <div class="manual-remnant-status manual-remnant-status--unused">Не использован</div>
      </article>
    `;
  }).join("");
  section.innerHTML = `
    <div class="opt-manual-notice">РУЧНОЙ РАСКРОЙ ОСТАТКОВ — ${remnantBins.reduce((sum, bin) => sum + bin.parts.length, 0)} шт.</div>
    ${usedHtml}
    ${unusedHtml ? `
      <section class="manual-remnant-unused-section">
        <div class="manual-remnant-unused-heading">
          <strong>Неиспользованные остатки</strong>
          <span>${unusedRemnants.length} шт.</span>
        </div>
        <div class="manual-remnant-unused-list">${unusedHtml}</div>
      </section>
    ` : ""}
  `;
  optResults.appendChild(section);
}

function doublePairKey(piece) {
  if (piece.doublePairBlocked) return "";
  if (isMullionPart(piece)) {
    return [
      "mullion",
      String(piece.profileCode || "").trim(),
      Number(piece.lengthMm || 0),
      normalizeAngles(piece.angles || "")
    ].join("||");
  }
  if (piece.labelPairKey) return `exact||${piece.labelPairKey}`;
  return [
    "fallback",
    String(piece.orderId || "").trim(),
    String(piece.productId || "").trim(),
    String(piece.profileCode || "").trim(),
    String(piece.title || "").trim(),
    String(piece.orient || "").trim().toLowerCase(),
    String(piece.labelDesignation || piece.label?.designation || "").trim(),
    Number(piece.lengthMm || 0),
    normalizeAngles(piece.angles || "")
  ].join("||");
}

function buildDoublePairs(pieces) {
  const byKey = new Map();
  const leftovers = [];
  pieces.forEach((p) => {
    const key = doublePairKey(p);
    if (!key) {
      leftovers.push(p);
      return;
    }
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(p);
  });
  const paired = [];
  byKey.forEach((list) => {
    const sorted = [...list].sort((a, b) => {
      const slotA = Number.isFinite(a.labelPairSlot) ? a.labelPairSlot : 99;
      const slotB = Number.isFinite(b.labelPairSlot) ? b.labelPairSlot : 99;
      if (slotA !== slotB) return slotA - slotB;
      const sourceA = String(a.sourcePartId || "");
      const sourceB = String(b.sourcePartId || "");
      const sourceCmp = sourceA.localeCompare(sourceB, "ru", { sensitivity: "base" });
      if (sourceCmp !== 0) return sourceCmp;
      return (Number(a.instanceNo) || 0) - (Number(b.instanceNo) || 0);
    });
    for (let i = 0; i + 1 < sorted.length; i += 2) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (
        Number(a.lengthMm) === Number(b.lengthMm) &&
        normalizeAngles(a.angles || "") === normalizeAngles(b.angles || "")
      ) {
        paired.push({ lengthMm: a.lengthMm, angles: a.angles, meta: [a, b] });
      } else {
        leftovers.push(a, b);
      }
    }
    if (sorted.length % 2 === 1) {
      leftovers.push(sorted[sorted.length - 1]);
    }
  });
  return { paired, leftovers };
}

function buildExportGroups() {
  if (!optimizeCache.groups.length) return [];
  const groups = [];

  window.ProductionOrder.sortProductionProfileGroups(optimizeCache.groups).forEach((group) => {
    const mode = group.mode;
    let selectedPieces = [];
    if (group.mode === "double") {
      const { paired } = buildDoublePairs(group.pieces);
      paired.forEach((pair) => {
        const metaArr = Array.isArray(pair.meta) ? pair.meta : [pair.meta, pair.meta];
        metaArr.forEach((piece) => {
          if (piece) selectedPieces.push(piece);
        });
      });
    } else {
      selectedPieces = group.pieces;
    }

    if (!selectedPieces.length) return;

    const items = [];
    if (optimizeCache.lastExportResults && optimizeCache.lastExportResults.has(group.title)) {
      const result = optimizeCache.lastExportResults.get(group.title);
      result.bins.forEach((bin) => {
        bin.parts.forEach((part) => {
          const metaArr = Array.isArray(part.meta) ? part.meta : [part.meta];
          const meta = metaArr[0] || {};
          const lengthMm = Number(part.length || meta.lengthMm || 0);
          if (!Number.isFinite(lengthMm) || lengthMm <= 0) return;
          items.push({
            orderId: sanitizeDigits(meta.orderId),
            productId: sanitizeDigits(meta.productId),
            lengthMm,
            angles: String(meta.angles || "").trim(),
            quantity: 1,
            widthMm: meta.widthMm || "",
            heightMm: meta.heightMm || "",
            labelDesignation: meta.labelDesignation || "",
            label: meta.label || null,
            instanceNo: meta.instanceNo || "",
            instanceTotal: meta.instanceTotal || "",
            physicalQuantity: metaArr.filter(Boolean).length
          });
        });
      });
    } else {
      selectedPieces.forEach((piece) => {
        const lengthMm = Number(piece.lengthMm || piece.length || 0);
        if (!Number.isFinite(lengthMm) || lengthMm <= 0) return;
        items.push({
          orderId: sanitizeDigits(piece.orderId),
          productId: sanitizeDigits(piece.productId),
          lengthMm,
          angles: String(piece.angles || "").trim(),
          quantity: 1,
          widthMm: piece.widthMm || "",
          heightMm: piece.heightMm || "",
          labelDesignation: piece.labelDesignation || "",
          label: piece.label || null,
          instanceNo: piece.instanceNo || "",
          instanceTotal: piece.instanceTotal || "",
          physicalQuantity: 1
        });
      });
    }
    if (!items.length) return;

    const catalogProfile = resolveAppCatalogProfile(group.profileId, group.profileCode, group.title);
    const profileBase = catalogProfile?.articleBase || extractProfileBase(group.profileCode);
    const hasCalculatedResult = optimizeCache.lastExportResults?.has(group.title);
    const totalQty = hasCalculatedResult
      ? items.reduce((sum, item) => sum + (Number(item.physicalQuantity) || 1), 0)
      : selectedPieces.length;

    groups.push({
      title: group.title,
      partKind: group.partKind,
      profileBase,
      totalQty,
      items,
      mode
    });
  });

  return groups;
}

function makeHeader(orderNo, cutNo, profileCode, color, pairMode, totalQty) {
  const order = padLeft(orderNo, 6);
  const cut = padLeft(cutNo, 4);
  const prof = padLeft(profileCode, 10);
  const colorStr = String(color);
  const pairStr = String(pairMode);
  const qty = "001";
  return "P" + order + cut + prof + colorStr + pairStr + qty;
}

function dateToOrderNo(dateValue) {
  const raw = String(dateValue || "").trim();
  if (!raw) return "000000";
  const parts = raw.split("-");
  if (parts.length !== 3) return "000000";
  const yyyy = parts[0];
  const mm = parts[1];
  const dd = parts[2];
  return `${dd}${mm}${yyyy.slice(-2)}`;
}

function makeNLines(items) {
  const lines = [];
  let index = 1;

  for (const item of items) {
    const orderPart = sanitizeDigits(item.orderId);
    const positionPart = sanitizeDigits(item.productId);
    const widthPart = item.widthMm ? `W${item.widthMm}` : "";
    const heightPart = item.heightMm ? `H${item.heightMm}` : "";
    const codeRaw = "Z" + orderPart + "P" + positionPart + widthPart + heightPart;
    const codeField = (codeRaw + " ".repeat(20)).slice(0, 20);

    const qty = padLeft(item.quantity, 3);
    const length010 = padLeft(Math.round(Number(item.lengthMm) * 10), 5);

    const { left, right } = parseAnglePair(item.angles);
    const sCode = angleToSCode(left, right);
    const wLeft = angleToW(left);
    const wRight = angleToW(right);

    const nNo = padLeft(index, 3);

    const line =
      "N" + nNo +
      "C" + codeField +
      "Z" + qty +
      "L" + length010 +
      "S" + sCode +
      "F001" +
      "H0" +
      "W" + wLeft +
      "W" + wRight +
      "W0000W0000";

    lines.push(line);
    index++;
  }
  return lines;
}

function makeProgramBlock(orderNo, cutNo, profileCode, colorCode, pairMode, items) {
  if (!items || !items.length) return "";
  const totalQty = items.reduce((s, it) => s + Number(it.quantity || 0), 0);
  const header = makeHeader(orderNo, cutNo, profileCode, colorCode, pairMode, totalQty);
  const nLines = makeNLines(items);
  return [header, ...nLines].join("\r\n") + "\r\n";
}

function buildJobTextForGroup(group, cutNoOverride) {
  if (!group || !group.items || !group.items.length) return "";
  const orderNo = dateToOrderNo(cutDateInput?.value);
  const items = group.items;
  return makeProgramBlock(
    orderNo,
    cutNoOverride ?? EXPORT_CUT_NO,
    group.profileBase,
    EXPORT_COLOR,
    EXPORT_PAIR_MODE,
    items
  );
}

function safeFileName(value) {
  const base = String(value || "program")
    .replace(/[^\wа-яё\-]+/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  return base || "program";
}

function extractBracketName(title) {
  const match = String(title || "").match(/\(([^)]+)\)/);
  return match ? match[1].trim() : "";
}

function renderExport() {
  if (!exportBlocks) return;
  exportCache = buildExportGroups();
  if (exportTitle) {
    const totalAuto = exportCache.reduce((sum, g) => sum + (Number(g.totalQty) || 0), 0);
    exportTitle.textContent = `Всего в автоматическом режиме: ${totalAuto} шт.`;
  }
  if (!exportCache.length) {
    exportBlocks.innerHTML = "<small>Нет данных</small>";
    return;
  }

  exportBlocks.innerHTML = exportCache
    .map((g, idx) => {
      const modeLabel = g.mode === "double" ? "Двойной" : "Одинарный";
      const sample = g.items && g.items.length ? g.items[0] : null;
      const sampleOrder = sample ? sanitizeDigits(sample.orderId) : "0";
      const sampleProduct = sample ? sanitizeDigits(sample.productId) : "0";
      const sampleCode = `CZ${sampleOrder}P${sampleProduct}`;
      const orderNo = dateToOrderNo(cutDateInput?.value);
      const cutNo = padLeft(idx + 1, 4);
      const cutCount = g.items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
      const programCode = `P${orderNo}${cutNo}${padLeft(g.profileBase, 10)}${EXPORT_COLOR}${EXPORT_PAIR_MODE}${padLeft(cutCount, 3)}`;
      const disabledAttr = exportReady ? "" : "disabled";
      return `
        <div class="export-block" data-index="${idx}">
          <div class="export-header">
            <div class="export-title">${g.title}</div>
            <div class="export-count">${g.totalQty} шт.</div>
            <div class="export-lines">Резов: ${cutCount}</div>
            <div class="export-mode">${modeLabel}</div>
          </div>
          <div class="export-sub">Профиль: ${padLeft(g.profileBase, 10)}</div>
          <div class="export-hint-title">Подсказка по формату</div>
          <div class="export-hint">Пример заголовка программы: <code>${programCode}</code></div>
          <div class="export-hint export-hint-line">P + заказ(ДДММГГ) + отрез(0001) + профиль(10) + цвет(0) + режим(0) + кол-во(3)</div>
          <div class="export-hint">Пример C‑поля: <strong>${sampleCode}</strong> = заказ ${sampleOrder}, изделие ${sampleProduct}</div>
          <div class="export-hint export-hint-line">Пример N‑строки: <code>N001${sampleCode} ...</code></div>
          ${exportReady ? "" : "<div class=\"export-lock\">Сначала нажмите «Рассчитать» во вкладке Оптимизация.</div>"}
          <div class="export-actions">
            <button class="import-btn export-generate" type="button" data-index="${idx}" ${disabledAttr}>Сгенерировать JOB</button>
            <button class="btn-secondary export-download" type="button" data-index="${idx}" ${disabledAttr}>Скачать JOB</button>
          </div>
          <textarea class="export-text" id="exportText-${idx}" spellcheck="false"></textarea>
        </div>
      `;
    })
    .join("");

  exportBlocks.querySelectorAll(".export-generate").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!exportReady) return;
      const idx = Number(btn.getAttribute("data-index"));
      const group = exportCache[idx];
      if (!group) return;
      const output = buildJobTextForGroup(group, idx + 1);
      const area = document.getElementById(`exportText-${idx}`);
      if (area) area.value = output;
    });
  });

  exportBlocks.querySelectorAll(".export-download").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!exportReady) return;
      const idx = Number(btn.getAttribute("data-index"));
      const group = exportCache[idx];
      if (!group) return;
      const area = document.getElementById(`exportText-${idx}`);
      let jobText = (area && area.value) || buildJobTextForGroup(group, idx + 1);
      if (!jobText) return;

      jobText = jobText.replace(/\r?\n/g, "\r\n");
      if (!jobText.endsWith("\r\n")) jobText += "\r\n";
      const bytes = encodeWin1251(jobText);
      const blob = new Blob([bytes], { type: "application/octet-stream" });

      const datePart = dateToOrderNo(cutDateInput?.value);
      const bracketName = extractBracketName(group.title);
      const baseName = bracketName
        ? safeFileName(`${bracketName}_${group.profileBase}`)
        : safeFileName(group.title);
      const suggestedName = `${datePart}_${baseName}.job`;
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName,
          types: [{ description: "JOB", accept: { "application/octet-stream": [".job"] } }]
        });
        let name = handle.name || suggestedName;
        if (!name.toLowerCase().endsWith(".job")) {
          name = name + ".job";
        }
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = suggestedName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  });
}

function splitPairedBins(result) {
  const bins = [];
  result.bins.forEach((bin) => {
    const binA = { used: bin.used, leftover: bin.leftover, parts: [] };
    const binB = { used: bin.used, leftover: bin.leftover, parts: [] };
    bin.parts.forEach((part) => {
      const metaArr = Array.isArray(part.meta) ? part.meta : [part.meta, part.meta];
      binA.parts.push({ length: part.length, meta: metaArr[0] || null });
      binB.parts.push({ length: part.length, meta: metaArr[1] || null });
    });
    bins.push(binA, binB);
  });

  const unfit = [];
  result.unfit.forEach((part) => {
    const metaArr = Array.isArray(part.meta) ? part.meta : [part.meta, part.meta];
    unfit.push({ length: part.length, meta: metaArr[0] || null });
    unfit.push({ length: part.length, meta: metaArr[1] || null });
  });
  return { bins, unfit };
}

function applyPvcOptimizationMode(result, group, rules = null) {
  const cutMode = group?.mode === "double" ? "double" : "single";
  if (typeof window.applyPvcOptimizationLayoutMode !== "function") {
    return { result, diagnostics: null };
  }
  return window.applyPvcOptimizationLayoutMode(
    result,
    DEFAULT_STOCK,
    cutMode,
    pvcOptimizationMode,
    { maxMaterialDegradation: 0.03, rules }
  );
}

optimizeBtn.addEventListener("click", () => {
  optResults.innerHTML = "";

  const invalidRemnants = profileRemnants
    .map((remnant, index) => ({ index, errors: validateProfileRemnant(remnant) }))
    .filter((item) => item.errors.length);
  if (invalidRemnants.length) {
    refreshProfileRemnantsEditor();
    optResults.innerHTML = `<div class="opt-error">Исправьте ошибки в блоке «Остатки профиля» перед расчётом.</div>`;
    return;
  }

  if (!optimizeCache.groups.length && !optimizeCache.skewGroups.length) {
    optResults.innerHTML = "<small>Нет данных</small>";
    return;
  }

  if (typeof window.optimizeCut !== "function") {
    optResults.innerHTML = "<small>Оптимайзер не подключен</small>";
    return;
  }
  if (profileRemnants.length && typeof window.optimizeCutWithRemnants !== "function") {
    optResults.innerHTML = "<small>Двухэтапный оптимайзер не подключен</small>";
    return;
  }

  attachPhysicalLabelsToPieces();
  renderLabelWarnings(optResults);

  let autoCount = 0;
  let autoNotice = null;
  if (optimizeCache.groups.length) {
    autoCount = optimizeCache.groups.reduce((sum, g) => {
      if (g.mode === "double") {
        const leftovers = buildDoublePairs(g.pieces).leftovers.length;
        return sum + Math.max(0, g.total - leftovers);
      }
      return sum + g.total;
    }, 0);
    autoNotice = document.createElement("div");
    autoNotice.className = "opt-auto-notice";
    autoNotice.textContent = `АВТОМАТИЧЕСКИЙ РЕЖИМ — ${autoCount} шт.`;
    optResults.appendChild(autoNotice);
  }

  const leftoverSkewItems = buildLeftoverSkewItems(optimizeCache.groups);

  optimizeCache.lastResults = new Map();
  optimizeCache.lastExportResults = new Map();
  optimizeCache.groupingDiagnostics = new Map();
  optimizeCache.profileOptimizationStats = new Map();
  let remainingPhysicalRemnants = expandPhysicalProfileRemnants();
  const remnantBins = [];
  const remnantManualPieces = [];
  const recalculatedPairTitles = new Set();
  const recalculatedPairLeftovers = [];
  let additionalPairLeftoverCount = 0;

  optimizeCache.groups.forEach((group) => {
    const modeLabel = group.mode === "double" ? "Двойной" : "Одинарный";
    const optimizeRules = getOptimizeRulesForProfile(group.profileCode);
    const groupProfileKey = normalizeProfileRuleKey(group.profileCode);
    const matchingRemnants = remainingPhysicalRemnants.filter(
      (remnant) => normalizeProfileRuleKey(remnant.profileCode) === groupProfileKey
    );
    if (!group.pieces.length) {
      appendOptimizeError(group.title, "Нет данных для расчета.", modeLabel);
      return;
    }

    if (group.mode === "double") {
      const { paired, leftovers: originalPairLeftovers } = buildDoublePairs(group.pieces);
      if (!paired.length) {
        appendOptimizeError(group.title, "Нет парных элементов для расчета.", modeLabel);
        return;
      }
      const pairItems = paired.map((p) => ({ lengthMm: p.lengthMm, qty: 1, meta: p.meta }));
      const baseResult = window.optimizeCut(pairItems, DEFAULT_STOCK, DEFAULT_KERF, optimizeRules);
      let automaticBaseResult = baseResult;

      if (matchingRemnants.length) {
        const effectiveRules = optimizeRules || { scrapMax: DEFAULT_SCRAP_MAX, minUsefulLeftover: 0 };
        const fixedBins = baseResult.bins.filter((bin) => bin.leftover <= effectiveRules.scrapMax);
        const flexiblePairParts = baseResult.bins
          .filter((bin) => bin.leftover > effectiveRules.scrapMax)
          .flatMap((bin) => bin.parts)
          .concat(baseResult.unfit);
        let allocationSequence = 1;
        const flexibleSingles = [];
        const allocationPieceMap = new Map();
        flexiblePairParts.forEach((pairPart) => {
          const metaItems = Array.isArray(pairPart.meta) ? pairPart.meta : [pairPart.meta, pairPart.meta];
          metaItems.forEach((piece) => {
            if (!piece) return;
            const allocationId = `pair_piece_${allocationSequence++}`;
            allocationPieceMap.set(allocationId, piece);
            flexibleSingles.push({
              lengthMm: pairPart.length,
              qty: 1,
              meta: {
                ...piece,
                _manualAllocationId: allocationId
              }
            });
          });
        });

        const staged = window.optimizeCutWithRemnants(
          flexibleSingles,
          DEFAULT_STOCK,
          DEFAULT_KERF,
          effectiveRules,
          matchingRemnants,
          { preserveSuccessfulBins: false }
        );
        const assignedIds = new Set();
        staged.remnantBins.forEach((bin) => {
          remnantBins.push(bin);
          bin.parts.forEach((part) => {
            assignedIds.add(part.meta?._manualAllocationId);
          });
        });

        if (assignedIds.size) {
          const assignedPieces = new Set(Array.from(assignedIds).map((id) => allocationPieceMap.get(id)).filter(Boolean));
          assignedIds.forEach((id) => {
            const piece = allocationPieceMap.get(id);
            if (!piece) return;
            remnantManualPieces.push({
              title: group.title,
              piece: {
                ...piece,
                manualReason: "раскрой из ручного остатка"
              }
            });
          });
          const remainingFlexiblePieces = Array.from(allocationPieceMap.values()).filter(
            (piece) => !assignedPieces.has(piece)
          );
          const repaired = buildDoublePairs(remainingFlexiblePieces);
          const repairedItems = repaired.paired.map((pair) => ({
            lengthMm: pair.lengthMm,
            qty: 1,
            meta: pair.meta
          }));
          const repairedResult = window.optimizeCut(
            repairedItems,
            DEFAULT_STOCK,
            DEFAULT_KERF,
            optimizeRules
          );
          automaticBaseResult = {
            bins: [...fixedBins, ...repairedResult.bins],
            unfit: repairedResult.unfit
          };
          recalculatedPairTitles.add(group.title);
          originalPairLeftovers.concat(repaired.leftovers).forEach((piece) => {
            recalculatedPairLeftovers.push({
              ...piece,
              title: group.title,
              manualReason: "не сформирована пара двойного режима"
            });
          });
          additionalPairLeftoverCount += repaired.leftovers.length;
          const usedRemnantIds = new Set(staged.remnantBins.map((bin) => bin.remnant.id));
          remainingPhysicalRemnants = remainingPhysicalRemnants.filter(
            (remnant) => !usedRemnantIds.has(remnant.id)
          );
        }
      }

      const groupedLayout = applyPvcOptimizationMode(automaticBaseResult, group, optimizeRules);
      automaticBaseResult = groupedLayout.result;
      optimizeCache.groupingDiagnostics.set(group.title, groupedLayout.diagnostics);
      const stats = typeof window.calculateProfileOptimizationStats === "function"
        ? window.calculateProfileOptimizationStats(
            automaticBaseResult,
            DEFAULT_STOCK,
            DEFAULT_KERF,
            optimizeRules,
            "double"
          )
        : null;
      optimizeCache.profileOptimizationStats.set(group.title, stats);
      const result = splitPairedBins(automaticBaseResult);
      optimizeCache.lastResults.set(group.title, result);
      optimizeCache.lastExportResults.set(group.title, automaticBaseResult);
      appendOptimizeResult(group.title, result, DEFAULT_STOCK, DEFAULT_KERF, modeLabel, optimizeRules, stats);
      return;
    }

    const singleItems = group.pieces.map((p) => ({ lengthMm: p.lengthMm, qty: 1, meta: p }));
    let result;
    if (matchingRemnants.length) {
      const effectiveRules = optimizeRules || { scrapMax: DEFAULT_SCRAP_MAX, minUsefulLeftover: 0 };
      const staged = window.optimizeCutWithRemnants(
        singleItems,
        DEFAULT_STOCK,
        DEFAULT_KERF,
        effectiveRules,
        matchingRemnants
      );
      result = staged.automaticResult;
      const usedIds = new Set(staged.remnantBins.map((bin) => bin.remnant.id));
      remainingPhysicalRemnants = remainingPhysicalRemnants.filter((remnant) => !usedIds.has(remnant.id));
      staged.remnantBins.forEach((bin) => {
        remnantBins.push(bin);
        bin.parts.forEach((part) => {
          if (!part.meta) return;
          remnantManualPieces.push({
            title: group.title,
            piece: { ...part.meta, manualReason: "раскрой из ручного остатка", remnantId: bin.remnant.id }
          });
        });
      });
    } else {
      result = window.optimizeCut(singleItems, DEFAULT_STOCK, DEFAULT_KERF, optimizeRules);
    }
    const groupedLayout = applyPvcOptimizationMode(result, group, optimizeRules);
    result = groupedLayout.result;
    optimizeCache.groupingDiagnostics.set(group.title, groupedLayout.diagnostics);
    const stats = typeof window.calculateProfileOptimizationStats === "function"
      ? window.calculateProfileOptimizationStats(
          result,
          DEFAULT_STOCK,
          DEFAULT_KERF,
          optimizeRules,
          "single"
        )
      : null;
    optimizeCache.profileOptimizationStats.set(group.title, stats);
    optimizeCache.lastResults.set(group.title, result);
    optimizeCache.lastExportResults.set(group.title, result);
    appendOptimizeResult(group.title, result, DEFAULT_STOCK, DEFAULT_KERF, modeLabel, optimizeRules, stats);
  });

  if (autoNotice && (remnantManualPieces.length || additionalPairLeftoverCount)) {
    const adjustedAutoCount = Math.max(
      0,
      autoCount - remnantManualPieces.length - additionalPairLeftoverCount
    );
    autoNotice.textContent = `АВТОМАТИЧЕСКИЙ РЕЖИМ — ${adjustedAutoCount} шт.`;
  }

  const byTitleMap = new Map();
  const addPieceToTitle = (title, piece) => {
    if (!byTitleMap.has(title)) byTitleMap.set(title, []);
    byTitleMap.get(title).push(piece);
  };

  optimizeCache.skewGroups.forEach((group) => {
    group.pieces.forEach((piece) => addPieceToTitle(group.title, { ...piece, manualReason: "косой элемент" }));
  });
  leftoverSkewItems.forEach((piece) => {
    if (!recalculatedPairTitles.has(piece.title)) {
      addPieceToTitle(piece.title || "Косые элементы", piece);
    }
  });
  recalculatedPairLeftovers.forEach((piece) => addPieceToTitle(piece.title || "Косые элементы", piece));
  remnantManualPieces.forEach(({ title, piece }) => addPieceToTitle(title, piece));
  const manualQueueGroups = buildManualQueueGroups(byTitleMap);

  if (byTitleMap.size) {
    const manualCount = Array.from(byTitleMap.values()).reduce((sum, pieces) => {
      return sum + pieces.filter((piece) => piece.manualReason !== "раскрой из ручного остатка").length;
    }, 0);
    if (manualCount) {
      const notice = document.createElement("div");
      notice.className = "opt-manual-notice";
      notice.textContent = `ВНИМАНИЕ - РУЧНОЙ РЕЖИМ! — ${manualCount} шт.`;
      optResults.appendChild(notice);
    }
  }

  byTitleMap.forEach((pieces, title) => {
    const displayPieces = pieces.filter((piece) => piece.manualReason !== "раскрой из ручного остатка");
    if (!displayPieces.length) return;
    const items = displayPieces.map((p) => ({ lengthMm: p.lengthMm, qty: 1, meta: p }));
    const optimizeRules = getOptimizeRulesForPieces(displayPieces);
    const result = window.optimizeCut(items, DEFAULT_STOCK, DEFAULT_KERF, optimizeRules);
    appendOptimizeResult(`${title}`, result, DEFAULT_STOCK, DEFAULT_KERF, "Одинарный", optimizeRules);
  });

  appendManualRemnantResults(remnantBins, remainingPhysicalRemnants);

  appendDeletedResults();
  exportReady = true;
  rebuildLabelQueues(manualQueueGroups);
  renderExport();
});

renderTable([]);
renderPdfFileList();
renderLabelKitCheck();

function setSharedCutDateValue(value) {
  sharedCutDateValue = String(value || "");
  if (cutDateInput && cutDateInput.value !== sharedCutDateValue) {
    cutDateInput.value = sharedCutDateValue;
  }
  if (reinforcementCutDateInput && reinforcementCutDateInput.value !== sharedCutDateValue) {
    reinforcementCutDateInput.value = sharedCutDateValue;
  }
  if (reinforcementPrintDate) {
    reinforcementPrintDate.value = sharedCutDateValue;
  }
}

[cutDateInput, reinforcementCutDateInput].filter(Boolean).forEach((dateInput) => {
  dateInput.addEventListener("input", () => setSharedCutDateValue(dateInput.value));
  dateInput.addEventListener("change", () => setSharedCutDateValue(dateInput.value));
});

if (cutDateInput || reinforcementCutDateInput) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  setSharedCutDateValue(`${yyyy}-${mm}-${dd}`);
}

if (printBtn) {
  printBtn.addEventListener("click", () => {
    window.print();
  });
}

if (printReinforcementBtn) {
  printReinforcementBtn.addEventListener("click", () => {
    document.body.classList.add("print-reinforcement");
    window.print();
    setTimeout(() => {
      document.body.classList.remove("print-reinforcement");
    }, 100);
  });
}

if (testPrintLabelsBtn) {
  testPrintLabelsBtn.addEventListener("click", printTestLabelsA4);
}

if (printImportBtn) {
  printImportBtn.addEventListener("click", () => {
    document.body.classList.add("print-import");
    window.print();
    setTimeout(() => {
      document.body.classList.remove("print-import");
    }, 100);
  });
}

if (saveBtn) {
  saveBtn.addEventListener("click", () => {
    const dateValue = cutDateInput?.value || "";
    const safeDate = dateValue || new Date().toISOString().slice(0, 10);
    const title = "Результат раскроя";
    const content = optResults?.innerHTML || "";

    const html = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>${title} — ${safeDate}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
    h1 { margin: 0 0 6px 0; }
    .date { color: #475569; margin-bottom: 16px; }
    .opt-result { border: 1px solid #d6dee8; border-radius: 10px; padding: 10px 12px; margin: 12px 0; background: #fff; }
    .opt-result-title { font-weight: 600; margin-bottom: 6px; }
    .opt-mode-label { margin-left: 8px; font-weight: 600; font-size: 13px; color: #475569; }
    .opt-result-sub, .opt-result-count { margin-bottom: 6px; }
    .opt-bin { padding: 4px 0; border-bottom: 1px dashed #e1e8f0; }
    .opt-bin:last-child { border-bottom: none; }
    .opt-left { margin-left: 8px; color: #475569; }
    .opt-left-percent { font-weight: 700; }
    .percent-scrap { color: #1d4ed8; }
    .percent-useful { color: #15803d; }
    .cut-chip { display: inline-flex; flex-direction: column; align-items: center; justify-content: center; width: 140px; min-width: 140px; box-sizing: border-box; padding: 4px 6px; margin-right: 6px; border: 1px solid #cbd5e1; border-radius: 8px; background: #f8fafc; font-weight: 400; text-align: center; }
    .cut-chip--skew { background: #111; border-color: #111; color: #fff; }
    .cut-chip-length { display: block; font-size: 16px; font-weight: 600; color: #64748b; }
    .cut-chip-meta { display: block; margin-bottom: 2px; padding-bottom: 2px; border-bottom: 1px solid #cbd5e1; font-weight: 600; font-size: 13px; color: #111827; white-space: nowrap; }
    .cut-chip--skew .cut-chip-meta { border-bottom-color: #333; color: #e2e8f0; }
    .opt-auto-notice { margin: 12px 0; padding: 10px 12px; border: 2px solid #1d4ed8; background: #eff6ff; color: #1d4ed8; font-weight: 700; text-align: center; border-radius: 10px; }
    .opt-manual-notice { margin: 12px 0; padding: 10px 12px; border: 2px solid #b42318; background: #fff2f2; color: #b42318; font-weight: 700; text-align: center; border-radius: 10px; }
    .label-warning { margin: 12px 0; padding: 10px 12px; border: 2px solid #b7791f; background: #fff8e5; color: #7a4a00; border-radius: 10px; font-size: 14px; }
    .label-warning-title { font-weight: 700; margin-bottom: 6px; }
    .label-warning-item { margin-top: 4px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="date">Дата: ${safeDate}</div>
  <div class="results">
    ${content || "<div>Нет данных</div>"}
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cut-result-${safeDate}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

