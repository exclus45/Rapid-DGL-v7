(function (root) {
  "use strict";

  // Source: data/Профиля.xlsx, Лист1!B3:C19.
  const PROFILE_ROWS = [
    ["S358.01", "000S358.01", "Рама оконная 63 мм (Practica)", "frame", [], 70, 650],
    ["S358.02", "000S358.02", "Створка оконная 77 мм (Practica)", "sash", [], 70, 550],
    ["S358.03", "000S358.03", "Импост 82 мм (Practica)", "mullion", [], 50, 400],
    ["S358.10", "000S358.10", "Створка дверная Т 107 мм (58 серия)", "sash", [
      "Створка дверная T 107 мм (Practica T)"
    ], 100, 550],
    ["S358.16", "000S358.16", "Рама дверная 72 мм (58 серия)", "frame", [], 70, 650],
    ["S358.26", "000S358.26", "Створка дверная Z образная 98мм (58 серия)", "sash", [
      "Створка дверная Z образная 98 мм (Practica Z)"
    ], 100, 550],
    ["S571.11", "000S571.11", "Рама оконная 63 мм (Profecta)", "frame", [], 70, 650],
    ["S571.13", "000S571.13", "Импост 82 мм (Profecta)", "mullion", [], 50, 400],
    ["S571.22", "000S571.22", "Створка оконная 77 мм (Profecta)", "sash", [], 70, 550],
    ["S670.02", "000S670.02", "Створка оконная 77 мм (Experta)", "sash", [], 70, 550],
    ["S670.03", "000S670.03", "Импост 82 мм (Experta)", "mullion", [], 50, 400],
    ["S670.10", "000S670.10", "Створка дверная Т 106 мм (70 серия)", "sash", [
      "Створка дверная Т 106 мм (Experta T)"
    ], 100, 550],
    ["S670.11", "000S670.11", "Рама оконная 63 мм (Experta) NEW", "frame", [], 70, 650],
    ["S670.26", "000S670.26", "Створка дверная Z 106 мм (70 серия)", "sash", [
      "Створка дверная Z 106 мм (Experta Z)"
    ], 100, 550],
    ["XS358.01", "00XS358.01", "Рама оконная 63 мм (ProWin)", "frame", [
      "Рама ок/дверн 63 мм (ProWin)",
      "Рама ок/двер 63 мм (ProWin)"
    ], 70, 650],
    ["XS358.02", "00XS358.02", "Створка оконная 77 мм (ProWin)", "sash", [], 70, 550],
    ["XS358.03", "00XS358.03", "Импост 82 мм (ProWin)", "mullion", [], 50, 400]
  ];

  const PROFILE_SOURCE_VARIANT_ROWS = [
    ["XS358.01 D", "XS358.01 D", "XS358.01", [
      "XS358.01 DБелый",
      "Рама окон-дверн 63 мм (ProWin)",
      "Рама окон-дверь 63 мм (ProWin)"
    ]]
  ];

  function normalizeProfileText(value) {
    return String(value ?? "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeProfileLookupText(value) {
    return normalizeProfileText(value).toLocaleLowerCase("ru-RU");
  }

  function normalizeProfileArticle(value) {
    const normalized = normalizeProfileText(value).toUpperCase();
    return normalized.replace(/^0+(?=(?:XS|S)\d)/, "");
  }

  const baseProfileDrafts = PROFILE_ROWS.map((row) => ({
    profileId: row[0],
    articleBase: row[0],
    rapidCode: row[1],
    name: row[2],
    kind: row[3],
    aliases: Object.freeze([...row[4]]),
    optimizationProfileId: row[0],
    optimization: Object.freeze({
      scrapMax: row[5],
      minUsefulLeftover: row[6]
    })
  }));
  const baseProfileDraftsById = new Map(baseProfileDrafts.map((profile) => [profile.profileId, profile]));
  const PROFILE_SOURCE_VARIANTS = Object.freeze(PROFILE_SOURCE_VARIANT_ROWS.map((row) => {
    const optimizationProfile = baseProfileDraftsById.get(row[2]);
    if (!optimizationProfile) throw new Error(`Не найден общий профиль раскроя: ${row[2]}`);
    return Object.freeze({
      profileId: row[0],
      articleBase: row[1],
      rapidCode: null,
      name: optimizationProfile.name,
      kind: optimizationProfile.kind,
      aliases: Object.freeze([...row[3]]),
      optimizationProfileId: optimizationProfile.profileId,
      optimization: optimizationProfile.optimization
    });
  }));
  const variantsByOptimizationProfileId = new Map();
  PROFILE_SOURCE_VARIANTS.forEach((variant) => {
    if (!variantsByOptimizationProfileId.has(variant.optimizationProfileId)) {
      variantsByOptimizationProfileId.set(variant.optimizationProfileId, []);
    }
    variantsByOptimizationProfileId.get(variant.optimizationProfileId).push(variant);
  });
  const PROFILE_CATALOG = Object.freeze(baseProfileDrafts.map((profile) => Object.freeze({
    ...profile,
    sourceVariants: Object.freeze([...(variantsByOptimizationProfileId.get(profile.profileId) || [])])
  })));
  const ALL_PROFILE_IDENTITIES = Object.freeze([...PROFILE_CATALOG, ...PROFILE_SOURCE_VARIANTS]);

  function createUniqueIndex(entries, keyOf, label) {
    const index = new Map();
    entries.forEach((entry) => {
      const key = keyOf(entry);
      if (!key) throw new Error(`Пустой ключ профиля: ${label}`);
      if (index.has(key)) throw new Error(`Дублирующийся ключ профиля ${label}: ${key}`);
      index.set(key, entry);
    });
    return index;
  }

  const profilesByArticle = createUniqueIndex(
    ALL_PROFILE_IDENTITIES,
    (profile) => normalizeProfileArticle(profile.articleBase),
    "articleBase"
  );
  const profilesByRapidCode = createUniqueIndex(
    PROFILE_CATALOG.filter((profile) => profile.rapidCode),
    (profile) => normalizeProfileText(profile.rapidCode).toUpperCase(),
    "rapidCode"
  );
  const profilesByName = createUniqueIndex(
    PROFILE_CATALOG,
    (profile) => normalizeProfileText(profile.name),
    "name"
  );
  const profilesByAlias = new Map();
  ALL_PROFILE_IDENTITIES.forEach((profile) => {
    profile.aliases.forEach((alias) => {
      const key = normalizeProfileLookupText(alias);
      if (!key) return;
      if (profilesByAlias.has(key) && profilesByAlias.get(key) !== profile) {
        throw new Error(`Дублирующийся алиас профиля: ${alias}`);
      }
      profilesByAlias.set(key, profile);
    });
  });

  function findProfileByArticleBase(value) {
    return profilesByArticle.get(normalizeProfileArticle(value)) || null;
  }

  function findProfileByRapidCode(value) {
    const key = normalizeProfileText(value).toUpperCase();
    return profilesByRapidCode.get(key) || null;
  }

  function findProfileByName(value) {
    return profilesByName.get(normalizeProfileText(value)) || null;
  }

  function findProfileByAlias(value) {
    return profilesByAlias.get(normalizeProfileLookupText(value)) || null;
  }

  function findProfile(value) {
    return findProfileByRapidCode(value) ||
      findProfileByArticleBase(value) ||
      findProfileByName(value) ||
      findProfileByAlias(value);
  }

  function findOptimizationProfile(value) {
    const profile = value && typeof value === "object" ? value : findProfile(value);
    if (!profile) return null;
    return profilesByArticle.get(normalizeProfileArticle(profile.optimizationProfileId)) || null;
  }

  function toRapidProfileCode(value) {
    return findOptimizationProfile(value)?.rapidCode || "";
  }

  const api = Object.freeze({
    PROFILE_CATALOG,
    PROFILE_SOURCE_VARIANTS,
    normalizeProfileText,
    normalizeProfileArticle,
    findProfileByArticleBase,
    findProfileByRapidCode,
    findProfileByName,
    findProfileByAlias,
    findProfile,
    findOptimizationProfile,
    toRapidProfileCode
  });

  root.PROFILE_CATALOG = PROFILE_CATALOG;
  root.ProfileCatalog = api;
})(typeof window !== "undefined" ? window : globalThis);
