import assert from "node:assert/strict";

globalThis.window = {};
await import("../profiles.js");

const {
  PROFILE_CATALOG,
  PROFILE_SOURCE_VARIANTS,
  normalizeProfileArticle,
  findProfileByArticleBase,
  findProfileByRapidCode,
  findProfileByName,
  findProfileByAlias,
  findProfile,
  findOptimizationProfile,
  toRapidProfileCode
} = window.ProfileCatalog;

const expected = [
  ["S358.01", "000S358.01", "Рама оконная 63 мм (Practica)", "frame", 70, 650],
  ["S358.02", "000S358.02", "Створка оконная 77 мм (Practica)", "sash", 70, 550],
  ["S358.03", "000S358.03", "Импост 82 мм (Practica)", "mullion", 50, 400],
  ["S358.10", "000S358.10", "Створка дверная Т 107 мм (58 серия)", "sash", 100, 550],
  ["S358.16", "000S358.16", "Рама дверная 72 мм (58 серия)", "frame", 70, 650],
  ["S358.26", "000S358.26", "Створка дверная Z образная 98мм (58 серия)", "sash", 100, 550],
  ["S571.11", "000S571.11", "Рама оконная 63 мм (Profecta)", "frame", 70, 650],
  ["S571.13", "000S571.13", "Импост 82 мм (Profecta)", "mullion", 50, 400],
  ["S571.22", "000S571.22", "Створка оконная 77 мм (Profecta)", "sash", 70, 550],
  ["S670.02", "000S670.02", "Створка оконная 77 мм (Experta)", "sash", 70, 550],
  ["S670.03", "000S670.03", "Импост 82 мм (Experta)", "mullion", 50, 400],
  ["S670.10", "000S670.10", "Створка дверная Т 106 мм (70 серия)", "sash", 100, 550],
  ["S670.11", "000S670.11", "Рама оконная 63 мм (Experta) NEW", "frame", 70, 650],
  ["S670.26", "000S670.26", "Створка дверная Z 106 мм (70 серия)", "sash", 100, 550],
  ["XS358.01", "00XS358.01", "Рама оконная 63 мм (ProWin)", "frame", 70, 650],
  ["XS358.02", "00XS358.02", "Створка оконная 77 мм (ProWin)", "sash", 70, 550],
  ["XS358.03", "00XS358.03", "Импост 82 мм (ProWin)", "mullion", 50, 400]
];

assert.equal(PROFILE_CATALOG.length, 17);
assert.deepEqual(
  PROFILE_CATALOG.map((profile) => [
    profile.articleBase,
    profile.rapidCode,
    profile.name,
    profile.kind,
    profile.optimization.scrapMax,
    profile.optimization.minUsefulLeftover
  ]),
  expected
);
console.log("OK каталог содержит все 17 подтверждённых профилей");

for (const field of ["articleBase", "rapidCode", "name"]) {
  const values = PROFILE_CATALOG.map((profile) => profile[field]);
  assert.equal(new Set(values).size, PROFILE_CATALOG.length, `${field} должен быть уникальным`);
}
console.log("OK articleBase, rapidCode и name уникальны");

for (const profile of PROFILE_CATALOG) {
  assert.equal(profile.profileId, profile.articleBase);
  assert.equal(profile.optimizationProfileId, profile.profileId);
  assert.equal(normalizeProfileArticle(profile.rapidCode), profile.articleBase);
  assert.equal(normalizeProfileArticle(profile.articleBase), profile.articleBase);
  assert.equal(toRapidProfileCode(profile.articleBase), profile.rapidCode);
  assert.equal(toRapidProfileCode(profile.rapidCode), profile.rapidCode);
  assert.equal(profile.rapidCode.length, 10);
  assert.equal(findProfileByArticleBase(profile.articleBase), profile);
  assert.equal(findProfileByArticleBase(profile.rapidCode), profile);
  assert.equal(findProfileByRapidCode(profile.rapidCode.toLowerCase()), profile);
  assert.equal(findProfileByName(profile.name.replace(/ /g, "\u00a0")), profile);
  assert.equal(findProfile(profile.articleBase.toLowerCase()), profile);
  assert.equal(findProfile(profile.rapidCode), profile);
  assert.equal(findProfile(profile.name), profile);
}
console.log("OK base ↔ RAPID и все основные варианты поиска работают");

assert.equal(normalizeProfileArticle("000S358.01"), "S358.01");
assert.equal(normalizeProfileArticle("00XS358.01"), "XS358.01");
assert.equal(normalizeProfileArticle("000123"), "000123");
assert.equal(normalizeProfileArticle("000ABC.01"), "000ABC.01");
assert.equal(findProfileByArticleBase("S999.99"), null);
assert.equal(findProfileByRapidCode("S358.01"), null);
console.log("OK нули снимаются только перед подтверждёнными префиксами S/XS");

const aliases = [
  ["Створка дверная T 107 мм (Practica T)", "S358.10"],
  ["Створка дверная Z образная 98 мм (Practica Z)", "S358.26"],
  ["Створка дверная Т 106 мм (Experta T)", "S670.10"],
  ["Створка дверная Z 106 мм (Experta Z)", "S670.26"],
  ["Рама ок/дверн 63 мм (ProWin)", "XS358.01"],
  ["Рама ок/двер 63 мм (ProWin)", "XS358.01"]
];
for (const [alias, articleBase] of aliases) {
  assert.equal(findProfileByAlias(`  ${alias.toLowerCase()}  `)?.articleBase, articleBase);
  assert.equal(findProfile(alias)?.articleBase, articleBase);
}
console.log("OK все известные алиасы находятся без учёта регистра и крайних пробелов");

assert.equal(PROFILE_SOURCE_VARIANTS.length, 1);
const proWinDoorVariant = PROFILE_SOURCE_VARIANTS[0];
assert.equal(proWinDoorVariant.profileId, "XS358.01 D");
assert.equal(proWinDoorVariant.articleBase, "XS358.01 D");
assert.equal(proWinDoorVariant.optimizationProfileId, "XS358.01");
assert.equal(findProfileByArticleBase("XS358.01 D"), proWinDoorVariant);
assert.equal(findProfile("XS358.01 DБелый"), proWinDoorVariant);
assert.equal(findProfile("Рама окон-дверн 63 мм (ProWin)"), proWinDoorVariant);
assert.equal(findOptimizationProfile(proWinDoorVariant)?.profileId, "XS358.01");
assert.equal(toRapidProfileCode("XS358.01 D"), "00XS358.01");
assert.equal(PROFILE_CATALOG.find((profile) => profile.profileId === "XS358.01").sourceVariants[0], proWinDoorVariant);
console.log("OK XS358.01 D — отдельный исходный вариант с общим optimizationProfileId XS358.01");

const optimizationGroups = [
  {
    label: "обычные рамы",
    articles: ["S358.01", "S358.16", "S571.11", "S670.11", "XS358.01"],
    scrapMax: 70,
    minUsefulLeftover: 650
  },
  {
    label: "обычные створки",
    articles: ["S358.02", "S571.22", "S670.02", "XS358.02"],
    scrapMax: 70,
    minUsefulLeftover: 550
  },
  {
    label: "дверные створки",
    articles: ["S358.10", "S358.26", "S670.10", "S670.26"],
    scrapMax: 100,
    minUsefulLeftover: 550
  },
  {
    label: "импосты",
    articles: ["S358.03", "S571.13", "S670.03", "XS358.03"],
    scrapMax: 50,
    minUsefulLeftover: 400
  }
];

for (const group of optimizationGroups) {
  for (const article of group.articles) {
    const profile = findProfileByArticleBase(article);
    assert(profile, `Профиль ${article} должен существовать`);
    assert.equal(profile.optimization.scrapMax, group.scrapMax, `${group.label}: scrapMax ${article}`);
    assert.equal(
      profile.optimization.minUsefulLeftover,
      group.minUsefulLeftover,
      `${group.label}: minUsefulLeftover ${article}`
    );
  }
}
assert.equal(optimizationGroups.reduce((sum, group) => sum + group.articles.length, 0), 17);
assert(PROFILE_CATALOG.every((profile) => (
  profile.optimization.scrapMax !== null &&
  profile.optimization.minUsefulLeftover !== null
)));
console.log("OK правила всех четырёх категорий заданы явно, null отсутствуют у всех 17 профилей");
