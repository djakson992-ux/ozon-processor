import * as XLSX from 'xlsx';

const STORAGE_KEY = 'ozon_price_ref';

// Типы начислений без привязки к артикулу
const NO_ARTICLE_TYPES = [
  // Из оригинального ТЗ
  'Обработка операционных ошибок продавца: отгрузка в нерекомендованный слот',
  'Обработка операционных ошибок продавца: отгрузка в нерекомендованный слот - отм',
  'Перечисление за доставку от покупателя',
  'Сервисный сбор за интеграцию с логистической платформой',
  'Обработка отменённых и невостребованных товаров',
  'Агентское вознаграждение Ozon Агрегатор realFBS',
  
  // Дополнительные типы из анализа файла
  'Эквайринг',
  'Доп. вознаграждение за доставку realFBS',
  'Услуги Партнёров Ozon на схеме realFBS',
  'Ozon Рассрочка',
  'Продвижение с оплатой за заказ',
  'Оплата за клик',
  'Подписка Premium Pro',
  'Подписка Premium Pro (процент)',
  'Размещение товаров на складах Ozon',
  'Вывоз товара со склада силами Ozon: Доставка до ПВЗ',
  'Подготовка товара к вывозу: Валид',
  'Обработка возвратов Ozon',
  'Обработка возвратов, отмен и невыкупов партнёрами',
  'Обратная логистика',
  'Обработка отправления Drop-off (ПВЗ)',
  'Обработка отправления Drop-off партнёрами (АПВЗ)',
  'Обработка операционных ошибок продавца: отмена',
  'Начисление по спору',
  'Доставка до места выдачи',
];

/**
 * Загрузка справочника цен из localStorage
 */
export function loadPriceRef() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Сохранение справочника цен в localStorage
 */
export function savePriceRef(data) {
  const ref = {
    loadedAt: new Date().toISOString(),
    count: Object.keys(data).length,
    data,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ref));
  return ref;
}

/**
 * Парсинг файла справочника цен
 * Столбец A (индекс 0) - id
 * Столбец B (индекс 1) - root_price
 * Столбец C (индекс 2) - root_old_price (если есть)
 */
export function parsePriceRefFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Читаем как массив массивов (по строкам)
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const priceMap = {};
        // Пропускаем заголовок (строка 0), начинаем с строки 1
        for (let i = 1; i < json.length; i++) {
          const row = json[i];
          if (!row || row.length < 2) continue;
          
          const id = row[0];
          let rootPrice = row[1];
          let rootOldPrice = row[2];
          
          // Конвертируем значения в числа (поддержка и точки, и запятой)
          rootPrice = parseNumericValue(rootPrice);
          rootOldPrice = rootOldPrice !== undefined && rootOldPrice !== null && rootOldPrice !== ''
            ? parseNumericValue(rootOldPrice)
            : null;
          
          if (id !== undefined && id !== null) {
            const idStr = String(id).trim();
            if (idStr) {
              // Если есть root_old_price > 0, используем его, иначе root_price
              const priceToUse = (rootOldPrice !== null && rootOldPrice > 0) ? rootOldPrice : rootPrice;
              
              if (priceToUse !== null && priceToUse > 0) {
                priceMap[idStr] = priceToUse;
              }
            }
          }
        }

        resolve(priceMap);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Парсинг числового значения (поддержка формата "123.45" и "123,45")
 */
function parseNumericValue(value) {
  if (value === undefined || value === null || value === '') return null;
  
  // Если уже число - возвращаем
  if (typeof value === 'number') {
    return value;
  }
  
  // Если строка - заменяем запятую на точку и парсим
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim();
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? null : parsed;
  }
  
  return null;
}

/**
 * Парсинг файла начислений
 */
export function parseNacisleniyaFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const nacisleniyaSheet = workbook.SheetNames.find(name => 
          name.toLowerCase().includes('начисления') || name.toLowerCase().includes('nacisleniya')
        ) || workbook.SheetNames[0];
        
        const worksheet = workbook.Sheets[nacisleniyaSheet];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Определяем индексы столбцов по заголовкам или используем дефолтные
        const headerRow = json[0] || [];
        const colIndex = {
          id: findColumnIndex(headerRow, ['ID начисления', 'ID', 'id']),
          group: findColumnIndex(headerRow, ['Группа услуг', 'Группа', 'group']),
          type: findColumnIndex(headerRow, ['Тип начисления', 'Тип', 'type']),
          article: findColumnIndex(headerRow, ['Артикул', 'article', 'Артикул продавца']),
          quantity: findColumnIndex(headerRow, ['Количество', 'quantity', 'Кол-во']),
          sum: findColumnIndex(headerRow, ['Сумма итого', 'Сумма', 'sum', 'Сумма итого, руб.']),
        };

        const rows = [];
        for (let i = 1; i < json.length; i++) {
          const row = json[i];
          if (!row || row.length === 0) continue;
          
          const id = row[colIndex.id];
          if (id === undefined || id === null || id === '') continue;

          rows.push({
            id: String(id).trim(),
            group: row[colIndex.group] ? String(row[colIndex.group]).trim() : '',
            type: row[colIndex.type] ? String(row[colIndex.type]).trim() : '',
            article: row[colIndex.article] ? String(row[colIndex.article]).trim() : '',
            quantity: Number(row[colIndex.quantity]) || 0,
            sum: Number(row[colIndex.sum]) || 0,
          });
        }

        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function findColumnIndex(headerRow, variants) {
  for (let i = 0; i < headerRow.length; i++) {
    const cell = String(headerRow[i] || '').trim().toLowerCase();
    for (const variant of variants) {
      if (cell === variant.toLowerCase()) return i;
    }
  }
  return -1;
}

/**
 * Шаг 1: Построение справочника ID → Артикул
 */
export function buildReference(rows) {
  const idArticlesMap = new Map();
  const emptyArticleIds = new Set();

  for (const row of rows) {
    if (row.article) {
      if (!idArticlesMap.has(row.id)) {
        idArticlesMap.set(row.id, new Set());
      }
      idArticlesMap.get(row.id).add(row.article);
    } else {
      emptyArticleIds.add(row.id);
    }
  }

  const result = [];
  const seen = new Set();

  for (const [id, articles] of idArticlesMap) {
    for (const article of articles) {
      const key = `${id}|${article}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ id, article });
      }
    }
  }

  for (const id of emptyArticleIds) {
    if (!idArticlesMap.has(id)) {
      const key = `${id}|`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ id, article: '' });
      }
    }
  }

  return result;
}

/**
 * Шаг 2: Определение структуры столбцов
 */
export function buildColumns(rows) {
  const columnsSet = new Map();

  for (const row of rows) {
    const key = `${row.group}|${row.type}`;
    if (!columnsSet.has(key)) {
      columnsSet.set(key, { group: row.group, type: row.type });
    }
  }

  const columns = Array.from(columnsSet.values());
  columns.sort((a, b) => {
    const groupCompare = a.group.localeCompare(b.group);
    if (groupCompare !== 0) return groupCompare;
    return a.type.localeCompare(b.type);
  });

  return columns;
}

/**
 * Шаг 3: Построение сводной таблицы
 */
export function buildPivot(pairs, columns, rows) {
  const rowsByIdArticleGroupType = new Map();
  const rowsByIdNoArticleGroupType = new Map();
  const rowsByGroupTypeOnly = new Map();

  for (const row of rows) {
    if (row.id && row.article) {
      const key = `${row.id}|${row.article}|${row.group}|${row.type}`;
      if (!rowsByIdArticleGroupType.has(key)) {
        rowsByIdArticleGroupType.set(key, []);
      }
      rowsByIdArticleGroupType.get(key).push(row);
    }
    
    if (row.id && !row.article) {
      const key = `${row.id}|${row.group}|${row.type}`;
      if (!rowsByIdNoArticleGroupType.has(key)) {
        rowsByIdNoArticleGroupType.set(key, []);
      }
      rowsByIdNoArticleGroupType.get(key).push(row);
    }
    
    if (!row.id && !row.article) {
      const key = `${row.group}|${row.type}`;
      if (!rowsByGroupTypeOnly.has(key)) {
        rowsByGroupTypeOnly.set(key, []);
      }
      rowsByGroupTypeOnly.get(key).push(row);
    }
  }

  const zoneA = [];
  const zoneB = [];
  const zoneC = [];

  const revenueKey = 'Продажи|Выручка';

  for (const pair of pairs) {
    const rowData = {
      id: pair.id,
      article: pair.article,
      values: {},
      quantity: 0,
      sumOnRS: 0,
      rootPrice: null,
      rrc: null,
      rrcTotal: null,
      percentOnRS: null,
      percentCosts: null,
    };

    let hasRevenue = false;

    for (const col of columns) {
      const colKey = `${col.group}|${col.type}`;
      let sum = 0;
      let found = false;

      const keyWithArticle = `${pair.id}|${pair.article}|${col.group}|${col.type}`;
      const matchingRows = rowsByIdArticleGroupType.get(keyWithArticle);
      if (matchingRows) {
        for (const r of matchingRows) {
          sum += r.sum;
          found = true;
          if (colKey === revenueKey && r.quantity) {
            rowData.quantity = r.quantity;
          }
        }
      }

      const keyNoArticle = `${pair.id}|${col.group}|${col.type}`;
      const noArticleRows = rowsByIdNoArticleGroupType.get(keyNoArticle);
      if (noArticleRows) {
        for (const r of noArticleRows) {
          sum += r.sum;
          found = true;
        }
      }

      if (found) {
        rowData.values[colKey] = sum;
        rowData.sumOnRS += sum;
        if (colKey === revenueKey && sum !== 0) {
          hasRevenue = true;
        }
      }
    }

    if (hasRevenue) {
      zoneA.push(rowData);
    } else {
      zoneB.push(rowData);
    }
  }

  for (const [key, matchingRows] of rowsByGroupTypeOnly) {
    let sum = 0;
    for (const r of matchingRows) {
      sum += r.sum;
    }
    const [group, type] = key.split('|');
    zoneC.push({ type: `${group} | ${type}`, sum });
  }

  return { zoneA, zoneB, zoneC };
}

/**
 * Расчёт РРЦ
 */
export function calculateRRC(rootPrice) {
  if (!rootPrice) return null;
  const rrc = rootPrice * 95;
  return Math.round(rrc * 10) / 10;
}

function getBaseArticle(article) {
  if (!article) return '';
  const underscoreIndex = article.indexOf('_');
  if (underscoreIndex !== -1) {
    return article.substring(0, underscoreIndex);
  }
  return article;
}

function findPriceInRef(article, priceRef) {
  if (!priceRef?.data || !article) return null;
  
  if (priceRef.data[article] !== undefined) {
    return priceRef.data[article];
  }
  
  const baseArticle = getBaseArticle(article);
  if (baseArticle && baseArticle !== article && priceRef.data[baseArticle] !== undefined) {
    return priceRef.data[baseArticle];
  }
  
  return null;
}

/**
 * Шаг 4: Расчёт итоговых показателей
 */
export function calcTotals(zoneA, zoneB, zoneC, columns, priceRef) {
  let totalToListA = 0;
  let totalToListB = 0;
  let totalToListC = 0;
  let totalByRRC = 0;

  const processRow = (row) => {
    row.sumOnRS = row.sumOnRS || 0;

    const rootPrice = findPriceInRef(row.article, priceRef);
    const rrc = calculateRRC(rootPrice);
    row.rootPrice = rootPrice;
    row.rrc = rrc;

    const rrcTotal = rrc && row.quantity ? rrc * row.quantity : null;
    row.rrcTotal = rrcTotal;

    if (rrcTotal && rrcTotal !== 0) {
      row.percentOnRS = row.sumOnRS / rrcTotal;
    } else {
      row.percentOnRS = null;
    }

    if (row.percentOnRS !== null) {
      row.percentCosts = row.percentOnRS - 1;
    } else {
      row.percentCosts = null;
    }

    return { sumOnRS: row.sumOnRS, rrcTotal };
  };

  for (const row of zoneA) {
    const { sumOnRS, rrcTotal } = processRow(row);
    totalToListA += sumOnRS;
    if (rrcTotal) totalByRRC += rrcTotal;
  }

  for (const row of zoneB) {
    const { sumOnRS } = processRow(row);
    totalToListB += sumOnRS;
  }

  for (const item of zoneC) {
    totalToListC += item.sum;
  }

  const totalToList = totalToListA + totalToListB + totalToListC;
  const percentOnRS = totalByRRC ? totalToList / totalByRRC : null;
  const percentCosts = percentOnRS ? percentOnRS - 1 : null;
  const totalWithoutB = totalToListA + totalToListC;
  const percentWithoutB = totalByRRC ? totalWithoutB / totalByRRC : null;

  return {
    totalToList,
    totalByRRC,
    percentOnRS,
    percentCosts,
    totalWithoutB,
    percentWithoutB,
    totalToListA,
    totalToListB,
    totalToListC,
  };
}

export function formatNumber(value, options = {}) {
  if (value === null || value === undefined || value === '') return '';
  if (isNaN(value)) return '';
  
  const {
    isPercent = false,
    decimals = 2,
  } = options;

  if (isPercent) {
    return (value * 100).toFixed(1) + '%';
  }

  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}
