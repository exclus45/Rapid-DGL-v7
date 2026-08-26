import assert from "node:assert/strict";

globalThis.window = {};
await import("../profiles.js");
await import("../remnant-import.js");

const { parseRows } = globalThis.window.RemnantImport;
const choices = [
  { profileCode: "XS358.01", title: "Рама оконная 63 мм (ProWin)" },
  { profileCode: "XS358.02", title: "Створка оконная 77 мм (ProWin)" },
  {
    profileId: "XS358.03",
    profileCode: "XS358.03",
    rapidCode: "00XS358.03",
    name: "Импост 82 мм (ProWin)",
    title: "Импост 82 мм (ProWin)",
    partKind: "mullion"
  }
];
const headers = ["Название / номер", "Профиль", "Длина, мм", "Количество", "Примечание"];

function parse(dataRows, customHeaders = headers) {
  return parseRows([
    { rowNumber: 1, values: customHeaders },
    ...dataRows.map((values, index) => ({ rowNumber: index + 2, values }))
  ], choices);
}

{
  const result = parse([["R-1", choices[0].title, 840, 1, "полка"]]);
  assert.equal(result.validRows.length, 1);
  assert.equal(result.errors.length, 0);
  assert.equal(result.validRows[0].profileCode, "XS358.01");
  console.log("OK 1: одна корректная строка");
}

{
  const result = parse([
    ["", choices[0].title, 840, 1, ""],
    ["", choices[1].title, 870, 1, ""]
  ]);
  assert.deepEqual(result.validRows.map((row) => row.profileCode), ["XS358.01", "XS358.02"]);
  console.log("OK 2: несколько профилей");
}

{
  const result = parse([["", choices[0].title, 1350, 1, ""]]);
  assert.equal(result.validRows[0].label, "Остаток 1350 мм");
  console.log("OK 3: автоматическое название");
}

{
  const result = parse([["", choices[0].title, 840, "", ""]]);
  assert.equal(result.validRows[0].quantity, 1);
  console.log("OK 4: пустое количество равно 1");
}

{
  const result = parse([["", choices[0].title, 870, 3, ""]]);
  assert.equal(result.physicalCount, 3);
  assert.equal(result.validRows[0].quantity, 3);
  console.log("OK 5: количество 3 сохраняется для физического разворачивания");
}

{
  const result = parse([["", "Неизвестный профиль", 840, 1, ""]]);
  assert.equal(result.validRows.length, 0);
  assert.match(result.errors[0].reason, /не найден/i);
  console.log("OK 6: неизвестный профиль отклоняется");
}

{
  const result = parse([["", choices[0].title, "", 1, ""]]);
  assert.match(result.errors[0].reason, /не указана длина/i);
  console.log("OK 7: пустая длина отклоняется");
}

{
  for (const length of [0, -10]) {
    const result = parse([["", choices[0].title, length, 1, ""]]);
    assert.equal(result.validRows.length, 0);
    assert.match(result.errors[0].reason, /некорректная длина/i);
  }
  console.log("OK 8: нулевая и отрицательная длина отклоняются");
}

{
  for (const quantity of [0, -2, 1.5]) {
    const result = parse([["", choices[0].title, 840, quantity, ""]]);
    assert.equal(result.validRows.length, 0);
    assert.match(result.errors[0].reason, /целым положительным/i);
  }
  console.log("OK 9: некорректное количество отклоняется");
}

{
  const result = parse([["", choices[0].title, 840, 1, ""]]);
  assert.equal(result.validRows[0].note, "");
  console.log("OK 10: пустое примечание допустимо");
}

{
  const movedHeaders = [" ПРИМЕЧАНИЕ ", "  длина,   мм ", " название / номер ", " КОЛИЧЕСТВО ", " ПРОФИЛЬ "];
  const result = parse([["", 840, "R-2", 1, "  рама   оконная 63 ММ (prowin)  "]], movedHeaders);
  assert.equal(result.validRows.length, 1);
  assert.equal(result.validRows[0].profileCode, "XS358.01");
  console.log("OK 11: столбцы, регистр и повторные пробелы нормализуются");
}

{
  const result = parse([
    ["", "", "", "", ""],
    ["", choices[0].title, 840, 1, ""],
    []
  ]);
  assert.equal(result.totalRows, 1);
  assert.equal(result.validRows.length, 1);
  console.log("OK 12: пустые строки игнорируются");
}

{
  const result = parse([
    ["", choices[0].title, 840, 1, ""],
    ["", "Чужой профиль", 900, 1, ""],
    ["", choices[1].title, 870, 2, ""]
  ]);
  assert.equal(result.totalRows, 3);
  assert.equal(result.validRows.length, 2);
  assert.equal(result.errors.length, 1);
  assert.equal(result.physicalCount, 3);
  console.log("OK 13: корректные строки отделяются от ошибочных");
}

{
  const result = parseRows([
    { rowNumber: 4, values: ["Профиль", "Количество"] },
    { rowNumber: 5, values: [choices[0].title, 1] }
  ], choices);
  assert.match(result.fatalError, /обязательные столбцы/i);
  console.log("OK 14: отсутствие обязательных заголовков останавливает импорт");
}

{
  for (const profileValue of ["XS358.03", "00XS358.03", "Импост 82 мм (ProWin)"]) {
    const result = parse([["И-1", profileValue, 1270, 1, "импост"]]);
    assert.equal(result.errors.length, 0, profileValue);
    assert.deepEqual(
      {
        profileId: result.validRows[0].profileId,
        profileCode: result.validRows[0].profileCode,
        name: result.validRows[0].name,
        partKind: result.validRows[0].partKind
      },
      {
        profileId: "XS358.03",
        profileCode: "XS358.03",
        name: "Импост 82 мм (ProWin)",
        partKind: "mullion"
      }
    );
  }
  console.log("OK 15: остаток импоста импортируется по base, RAPID-коду и названию");
}

{
  const result = parse([["R-alias", "Рама ок/дверн 63 мм (ProWin)", 1500, 1, ""]]);
  assert.equal(result.errors.length, 0);
  assert.equal(result.validRows[0].profileCode, "XS358.01");
  assert.equal(result.validRows[0].partKind, "frame");
  console.log("OK 16: известный алиас профиля распознаётся через каталог");
}
