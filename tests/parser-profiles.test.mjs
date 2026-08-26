import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const context = vm.createContext({ console });
context.window = context;
for (const file of ["profiles.js", "settings.js", "domain.js", "parser.js"]) {
  const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
  vm.runInContext(source, context, { filename: file });
}

const catalog = Array.from(context.PROFILE_CATALOG);
const parsePartsFromCsv = context.parsePartsFromCsv;

function fixedCsv(article, name) {
  return `${article};${name};1000 мм 45° 45°;1;5000 / 1`;
}

function contourCsv(profileValue, kind = "Деталь") {
  return `5000 / 1\nК1 ${kind};${profileValue};Вертикаль;1000 мм 45° 45°;1`;
}

function parseOne(csv) {
  const parts = parsePartsFromCsv(csv);
  assert.equal(parts.length, 1, `Ожидалась одна деталь для CSV: ${csv}`);
  return parts[0];
}

function identity(part) {
  return {
    profileId: part.profileId,
    optimizationProfileId: part.optimizationProfileId,
    profileCode: part.profileCode,
    name: part.name,
    partKind: part.partKind
  };
}

function expectedIdentity(profile) {
  return {
    profileId: profile.profileId,
    optimizationProfileId: profile.optimizationProfileId,
    profileCode: profile.articleBase,
    name: profile.name,
    partKind: profile.kind
  };
}

const proWinFrame = context.ProfileCatalog.findProfileByArticleBase("XS358.01");
assert.deepEqual(identity(parseOne(fixedCsv("XS358.01", proWinFrame.name))), expectedIdentity(proWinFrame));
assert.deepEqual(identity(parseOne(fixedCsv("00XS358.01", proWinFrame.name))), expectedIdentity(proWinFrame));
assert.deepEqual(identity(parseOne(contourCsv(proWinFrame.name, "Рама"))), expectedIdentity(proWinFrame));
console.log("OK ProWin frame распознаётся по base, RAPID-коду и названию");

const proWinFrameD = context.ProfileCatalog.findProfileByArticleBase("XS358.01 D");
for (const sourceArticle of ["XS358.01 D", "XS358.01 DБелый"]) {
  const parsed = parseOne(fixedCsv(sourceArticle, proWinFrame.name));
  assert.deepEqual(identity(parsed), expectedIdentity(proWinFrameD));
  assert.equal(parsed.profileCode, "XS358.01 D");
}
assert.equal(parseOne(fixedCsv("XS358.01", proWinFrame.name)).profileCode, "XS358.01");
console.log("OK XS358.01 DБелый отображается как XS358.01 D без потери отличия от XS358.01");

const proWinSash = context.ProfileCatalog.findProfileByArticleBase("XS358.02");
assert.deepEqual(identity(parseOne(fixedCsv("XS358.02", proWinSash.name))), expectedIdentity(proWinSash));
assert.deepEqual(identity(parseOne(fixedCsv("00XS358.02", proWinSash.name))), expectedIdentity(proWinSash));
assert.deepEqual(identity(parseOne(contourCsv(proWinSash.name, "Створка"))), expectedIdentity(proWinSash));
console.log("OK ProWin sash распознаётся по base, RAPID-коду и названию");

for (const article of ["S358.01", "S670.02", "S571.11"]) {
  const profile = context.ProfileCatalog.findProfileByArticleBase(article);
  assert.deepEqual(identity(parseOne(fixedCsv(profile.rapidCode, profile.name))), expectedIdentity(profile));
  assert.deepEqual(identity(parseOne(contourCsv(profile.name))), expectedIdentity(profile));
}
console.log("OK профили Practica, Experta и Profecta распознаются в обоих форматах");

const mullions = catalog.filter((profile) => profile.kind === "mullion");
assert.equal(mullions.length, 4);
for (const profile of mullions) {
  assert.deepEqual(identity(parseOne(fixedCsv(profile.rapidCode, profile.name))), expectedIdentity(profile));
  assert.deepEqual(identity(parseOne(contourCsv(profile.name, "Импост"))), expectedIdentity(profile));
}
console.log("OK каждый из четырёх импостов распознаётся по коду и названию");

for (const profile of catalog) {
  const fromFixed = parseOne(fixedCsv(profile.rapidCode, profile.name));
  const fromContour = parseOne(contourCsv(profile.name));
  assert.deepEqual(identity(fromFixed), expectedIdentity(profile));
  assert.deepEqual(identity(fromContour), expectedIdentity(profile));
  assert.deepEqual(identity(fromFixed), identity(fromContour));
}
console.log("OK оба CSV-формата дают одинаковую идентификацию всех 17 профилей");

for (const profile of catalog.filter((item) => item.aliases.length)) {
  for (const alias of profile.aliases) {
    assert.deepEqual(identity(parseOne(contourCsv(alias))), expectedIdentity(profile));
  }
}
console.log("OK известные алиасы поддерживаются контурным CSV");

const forbiddenProfileCodes = new Set(["63", "77", "Z", "106"]);
for (const profile of catalog) {
  const parsed = parseOne(contourCsv(profile.name));
  assert(!forbiddenProfileCodes.has(parsed.profileCode));
  assert.equal(parsed.profileCode, profile.articleBase);
}
console.log("OK известные профили больше не превращаются в 63, 77, Z или 106");
