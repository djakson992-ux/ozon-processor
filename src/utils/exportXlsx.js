import * as XLSX from 'xlsx';

/**
 * Санитизация значения для защиты от CSV / Excel Formula Injection (CWE-1236)
 */
export function sanitizeCellValue(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  if (/^[-=+@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Экспорт результата в XLSX
 */
export function exportToXlsx(zoneA, zoneB, zoneC, columns, totals, priceRef, additionalRows = []) {
  const wb = XLSX.utils.book_new();

  // Создаём данные для основного листа
  const data = [];

  // Заголовок строки 1: группы услуг (объединённые ячейки)
  const headerRow1 = ['ID начисления', 'Артикул'];
  const groupSpans = [];
  let currentGroup = null;
  let spanStart = 2;

  for (const col of columns) {
    if (col.group !== currentGroup) {
      if (currentGroup !== null) {
        groupSpans.push({ group: currentGroup, start: spanStart, end: headerRow1.length - 1 });
      }
      currentGroup = col.group;
      spanStart = headerRow1.length;
    }
    headerRow1.push(col.type);
  }
  if (currentGroup !== null) {
    groupSpans.push({ group: currentGroup, start: spanStart, end: headerRow1.length - 1 });
  }

  // Фиксированные столбцы
  const fixedCols = ['Количество (#)', 'Сумма на РС', 'root_price', 'РРЦ', 'РРЦ × Кол-во', '% на РС от РРЦ', '% затрат от РРЦ'];
  const fullHeaderRow = headerRow1.concat(fixedCols);
  data.push(fullHeaderRow);

  const totalColsCount = fullHeaderRow.length;
  const sumOnRsColIndex = 2 + columns.length + 1; // Индекс колонки 'Сумма на РС'

  // Заголовок строки 2: типы начислений
  const headerRow2 = ['', ''];
  for (const col of columns) {
    headerRow2.push(col.type);
  }
  while (headerRow2.length < totalColsCount) {
    headerRow2.push('');
  }
  data.push(headerRow2);

  // Зона A
  for (const row of zoneA) {
    const dataRow = buildDataRow(row, columns);
    data.push(dataRow);
  }

  // Зона B
  for (const row of zoneB) {
    const dataRow = buildDataRow(row, columns);
    data.push(dataRow);
  }

  // Дополнительные строки
  if (additionalRows && additionalRows.length > 0) {
    const sectionHeader = new Array(totalColsCount).fill('');
    sectionHeader[0] = 'ДОПОЛНИТЕЛЬНЫЕ ЗАТРАТЫ';
    data.push(sectionHeader);

    for (const addRow of additionalRows) {
      const addRowCells = new Array(totalColsCount).fill('');
      addRowCells[0] = sanitizeCellValue(addRow.id);
      addRowCells[sumOnRsColIndex] = addRow.sum;
      data.push(addRowCells);
    }
  }

  // Пустая строка перед зоной C
  data.push(new Array(totalColsCount).fill(''));

  // Зона C - итоги по типам без ID и артикула
  if (zoneC && zoneC.length > 0) {
    const sectionHeaderC = new Array(totalColsCount).fill('');
    sectionHeaderC[0] = 'НАЧИСЛЕНИЯ БЕЗ ID И АРТИКУЛА';
    data.push(sectionHeaderC);

    for (const item of zoneC) {
      const zoneCCells = new Array(totalColsCount).fill('');
      zoneCCells[0] = sanitizeCellValue(item.type);
      zoneCCells[sumOnRsColIndex] = item.sum;
      data.push(zoneCCells);
    }
  }

  // Итоговая строка
  const totalRow = new Array(totalColsCount).fill('');
  totalRow[0] = 'ИТОГО';
  totalRow[sumOnRsColIndex] = totals.totalToList;
  data.push(totalRow);

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Применяем слияния для заголовков
  ws['!merges'] = [];
  for (const span of groupSpans) {
    if (span.end > span.start) {
      ws['!merges'].push({
        s: { r: 0, c: span.start },
        e: { r: 0, c: span.end },
      });
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Обработанные данные');

  // Лист с итогами
  const summaryData = [
    ['Показатель', 'Значение'],
    ['К перечислению на РС', totals.totalToList],
    ['По РРЦ ценам', totals.totalByRRC],
    ['% к перечислению от РРЦ', totals.percentOnRS],
    ['% затрат', totals.percentCosts],
    ['К перечислению без товаров без выручки', totals.totalWithoutB],
    ['% к перечислению (без бесвыручечных)', totals.percentWithoutB],
    ['', ''],
    ['В том числе:', ''],
    ['Зона A (с выручкой)', totals.totalToListA],
    ['Зона B (без выручки)', totals.totalToListB],
    ['Зона C (без ID и артикула)', totals.totalToListC],
    ['Дополнительные затраты', totals.additionalTotal || 0],
    ['', ''],
    ['ИТОГО к перечислению', totals.totalToList],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Итоги');

  // Генерируем файл
  XLSX.writeFile(wb, 'Ozon_Обработка.xlsx');
}

function buildDataRow(row, columns) {
  const dataRow = [sanitizeCellValue(row.id), sanitizeCellValue(row.article)];

  for (const col of columns) {
    const colKey = `${col.group}|${col.type}`;
    dataRow.push(row.values[colKey] !== undefined ? row.values[colKey] : '');
  }

  dataRow.push(
    row.quantity,
    row.sumOnRS,
    row.rootPrice !== null ? row.rootPrice : '',
    row.rrc !== null ? row.rrc : '',
    row.rrcTotal !== null ? row.rrcTotal : '',
    row.percentOnRS !== null ? row.percentOnRS : '',
    row.percentCosts !== null ? row.percentCosts : ''
  );

  return dataRow;
}
