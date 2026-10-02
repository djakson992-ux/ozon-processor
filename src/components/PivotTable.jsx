import { useState, useMemo } from 'react';
import { 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  ChevronLeft, 
  ChevronRight, 
  Layers, 
  X, 
  Filter
} from 'lucide-react';
import { formatNumber } from '../utils/ozonProcessor';

export default function PivotTable({
  zoneA = [],
  zoneB = [],
  zoneC = [],
  columns = [],
  additionalRows = [],
  onRemoveRow,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'zoneA', 'zoneB', 'zoneC', 'additional'
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState('sumOnRS'); // 'sumOnRS', 'quantity', 'rrcTotal', 'percentOnRS', 'id', 'article'
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc', 'desc'

  if (!columns || columns.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm text-slate-500 dark:text-slate-400">
        Нет данных для отображения. Загрузите файлы начислений и нажмите «Обработать».
      </div>
    );
  }

  // Handle Sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  // Group columns by Service Group
  const groupedColumns = useMemo(() => {
    const groups = [];
    let currentGroup = null;

    for (const col of columns) {
      if (col.group !== currentGroup) {
        currentGroup = col.group;
        groups.push({ group: col.group, cols: [col] });
      } else {
        groups[groups.length - 1].cols.push(col);
      }
    }
    return groups;
  }, [columns]);

  // Combined and filtered rows for Zone A & Zone B
  const filteredAndSortedRows = useMemo(() => {
    let list = [];

    if (activeTab === 'all' || activeTab === 'zoneA') {
      list = list.concat(zoneA.map(r => ({ ...r, _zone: 'A' })));
    }
    if (activeTab === 'all' || activeTab === 'zoneB') {
      list = list.concat(zoneB.map(r => ({ ...r, _zone: 'B' })));
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(r => 
        (r.id && String(r.id).toLowerCase().includes(q)) ||
        (r.article && String(r.article).toLowerCase().includes(q))
      );
    }

    // Sort
    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (valA === null || valA === undefined) valA = sortDirection === 'asc' ? Infinity : -Infinity;
      if (valB === null || valB === undefined) valB = sortDirection === 'asc' ? Infinity : -Infinity;

      if (typeof valA === 'string') {
        return sortDirection === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }

      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });

    return list;
  }, [zoneA, zoneB, activeTab, searchTerm, sortField, sortDirection]);

  // Pagination calculation
  const totalItems = filteredAndSortedRows.length;
  const totalPages = pageSize === 'all' ? 1 : Math.ceil(totalItems / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    if (pageSize === 'all') return filteredAndSortedRows;
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedRows.slice(start, start + pageSize);
  }, [filteredAndSortedRows, currentPage, pageSize]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/90 dark:border-slate-800 overflow-hidden">
      
      {/* Table Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Zone Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs font-semibold">
          <button
            onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200/80 dark:border-slate-700'
            }`}
          >
            Все строки ({zoneA.length + zoneB.length})
          </button>

          <button
            onClick={() => { setActiveTab('zoneA'); setCurrentPage(1); }}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'zoneA'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200/80 dark:border-slate-700'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Зона A: с выручкой ({zoneA.length})
          </button>

          <button
            onClick={() => { setActiveTab('zoneB'); setCurrentPage(1); }}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'zoneB'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200/80 dark:border-slate-700'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            Зона B: без выручки ({zoneB.length})
          </button>

          {zoneC.length > 0 && (
            <button
              onClick={() => { setActiveTab('zoneC'); }}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'zoneC'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200/80 dark:border-slate-700'
              }`}
            >
              Зона C: без ID ({zoneC.length})
            </button>
          )}

          {additionalRows.length > 0 && (
            <button
              onClick={() => { setActiveTab('additional'); }}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'additional'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200/80 dark:border-slate-700'
              }`}
            >
              Доп. расходы ({additionalRows.length})
            </button>
          )}
        </div>

        {/* Search & Page Size */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Поиск по артикулу или ID..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-8 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>По:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value="all">Все</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table for Zone A & Zone B */}
      {(activeTab === 'all' || activeTab === 'zoneA' || activeTab === 'zoneB') && (
        <>
          <div className="overflow-x-auto max-h-[700px] scrollbar-thin">
            <table className="min-w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50/95 dark:bg-slate-900/95 sticky top-0 z-20 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.4)]">
                {/* Row 1: Group Headers */}
                <tr>
                  <th
                    rowSpan={2}
                    onClick={() => handleSort('id')}
                    className="px-3.5 py-3 font-semibold text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 sticky left-0 z-30 bg-slate-50 dark:bg-slate-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      ID начисления
                      {sortField === 'id' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                  <th
                    rowSpan={2}
                    onClick={() => handleSort('article')}
                    className="px-3.5 py-3 font-semibold text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 sticky left-[110px] z-30 bg-slate-50 dark:bg-slate-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Артикул
                      {sortField === 'article' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>

                  {/* Dynamic Group Headers */}
                  {groupedColumns.map(({ group, cols }) => (
                    <th
                      key={group}
                      colSpan={cols.length}
                      className="px-3 py-2 text-center font-bold text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-850 border-b border-slate-200/80 dark:border-slate-800"
                    >
                      {group || 'Без группы'}
                    </th>
                  ))}

                  {/* Fixed Calculation Columns */}
                  <th
                    rowSpan={2}
                    onClick={() => handleSort('quantity')}
                    className="px-3 py-3 text-right font-semibold text-slate-700 dark:text-slate-200 border-l-2 border-slate-300 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Кол-во
                      {sortField === 'quantity' && (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </div>
                  </th>

                  <th
                    rowSpan={2}
                    onClick={() => handleSort('sumOnRS')}
                    className="px-3 py-3 text-right font-bold text-indigo-900 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/40 border-r border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-indigo-100/60 dark:hover:bg-indigo-900/50"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Сумма на РС
                      {sortField === 'sumOnRS' && (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </div>
                  </th>

                  <th rowSpan={2} className="px-3 py-3 text-right font-semibold text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800">
                    root_price
                  </th>

                  <th rowSpan={2} className="px-3 py-3 text-right font-semibold text-indigo-600 dark:text-indigo-400 border-r border-slate-200 dark:border-slate-800">
                    РРЦ
                  </th>

                  <th
                    rowSpan={2}
                    onClick={() => handleSort('rrcTotal')}
                    className="px-3 py-3 text-right font-semibold text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <div className="flex items-center justify-end gap-1">
                      РРЦ × Кол-во
                      {sortField === 'rrcTotal' && (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </div>
                  </th>

                  <th
                    rowSpan={2}
                    onClick={() => handleSort('percentOnRS')}
                    className="px-3 py-3 text-right font-semibold text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <div className="flex items-center justify-end gap-1">
                      % на РС
                      {sortField === 'percentOnRS' && (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </div>
                  </th>

                  <th rowSpan={2} className="px-3 py-3 text-right font-semibold text-slate-700 dark:text-slate-200">
                    % затрат
                  </th>
                </tr>

                {/* Row 2: Sub-column Type Headers */}
                <tr>
                  {groupedColumns.flatMap(({ cols }) =>
                    cols.map((col) => (
                      <th
                        key={`${col.group}|${col.type}`}
                        className="px-2.5 py-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800 text-right whitespace-nowrap bg-slate-50 dark:bg-slate-900"
                      >
                        {col.type}
                      </th>
                    ))
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={2 + columns.length + 7} className="text-center py-12 text-slate-400 dark:text-slate-500">
                      По вашему запросу ничего не найдено
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row, idx) => {
                    const isZoneB = row._zone === 'B';
                    return (
                      <tr
                        key={`${row._zone}-${row.id}-${row.article}-${idx}`}
                        className={`transition-colors ${
                          isZoneB 
                            ? 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-100/50 dark:hover:bg-amber-900/30' 
                            : 'bg-white dark:bg-slate-900 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20'
                        }`}
                      >
                        {/* Sticky ID */}
                        <td className={`px-3 py-2 border-r border-slate-200 dark:border-slate-800 sticky left-0 z-10 font-mono text-[11px] text-slate-700 dark:text-slate-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] ${
                          isZoneB ? 'bg-amber-50/90 dark:bg-[#1a1612]' : 'bg-white dark:bg-slate-900'
                        }`}>
                          {row.id}
                        </td>

                        {/* Sticky Article */}
                        <td className={`px-3 py-2 border-r border-slate-200 dark:border-slate-800 sticky left-[110px] z-10 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] truncate max-w-[140px] ${
                          isZoneB ? 'bg-amber-50/90 dark:bg-[#1a1612]' : 'bg-white dark:bg-slate-900'
                        }`} title={row.article}>
                          {row.article || <span className="text-slate-300 dark:text-slate-600 font-normal">—</span>}
                        </td>

                        {/* Dynamic Column Values */}
                        {columns.map((col) => {
                          const colKey = `${col.group}|${col.type}`;
                          const val = row.values[colKey];
                          const hasVal = val !== undefined;
                          const isNegative = hasVal && val < 0;

                          return (
                            <td
                              key={colKey}
                              className={`px-2.5 py-2 text-right tabular-nums border-r border-slate-100 dark:border-slate-800/60 text-[11px] ${
                                isNegative ? 'text-rose-600 dark:text-rose-400 font-medium' : hasVal ? 'text-slate-700 dark:text-slate-200' : 'text-slate-200 dark:text-slate-700'
                              }`}
                            >
                              {hasVal ? formatNumber(val) : ''}
                            </td>
                          );
                        })}

                        {/* Fixed Calculation Values */}
                        <td className="px-3 py-2 text-right tabular-nums border-l-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                          {row.quantity || ''}
                        </td>

                        <td className={`px-3 py-2 text-right tabular-nums font-bold border-r border-slate-200 dark:border-slate-800 ${
                          row.sumOnRS < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-900 dark:text-indigo-300 bg-indigo-50/30 dark:bg-indigo-950/20'
                        }`}>
                          {formatNumber(row.sumOnRS)} ₽
                        </td>

                        <td className="px-3 py-2 text-right tabular-nums text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800/60">
                          {row.rootPrice !== null ? formatNumber(row.rootPrice) : '—'}
                        </td>

                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-indigo-600 dark:text-indigo-400 border-r border-slate-100 dark:border-slate-800/60">
                          {row.rrc !== null ? formatNumber(row.rrc) : '—'}
                        </td>

                        <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800/60">
                          {row.rrcTotal !== null ? formatNumber(row.rrcTotal) : '—'}
                        </td>

                        <td className={`px-3 py-2 text-right tabular-nums font-semibold border-r border-slate-100 dark:border-slate-800/60 ${
                          row.percentOnRS !== null && row.percentOnRS >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {formatNumber(row.percentOnRS, { isPercent: true }) || '—'}
                        </td>

                        <td className={`px-3 py-2 text-right tabular-nums font-medium ${
                          row.percentCosts !== null && row.percentCosts >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {formatNumber(row.percentCosts, { isPercent: true }) || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {pageSize !== 'all' && totalPages > 1 && (
            <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <div>
                Показано <strong className="text-slate-900 dark:text-white">{paginatedRows.length}</strong> из{' '}
                <strong className="text-slate-900 dark:text-white">{totalItems}</strong> записей
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-700 dark:text-slate-200"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span>
                  Страница <strong className="text-slate-900 dark:text-white">{currentPage}</strong> из{' '}
                  <strong className="text-slate-900 dark:text-white">{totalPages}</strong>
                </span>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-700 dark:text-slate-200"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Tab: Zone C (Начисления без ID) */}
      {activeTab === 'zoneC' && (
        <div className="p-6">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Зона C: Начисления без ID и артикула</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Общие начисления Ozon, не привязанные к конкретным отправлениям
            </p>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-w-2xl">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Тип начисления</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200">Сумма</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {zoneC.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-2.5 text-slate-800 dark:text-slate-200 font-medium">{item.type}</td>
                    <td className={`px-4 py-2.5 text-right font-bold tabular-nums ${item.sum < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                      {formatNumber(item.sum)} ₽
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Additional rows */}
      {activeTab === 'additional' && (
        <div className="p-6">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Дополнительные затраты без артикулов</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Позиции, добавленные вручную
            </p>
          </div>

          {additionalRows.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">Нет добавленных позиций</div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-w-2xl">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">ID / Описание</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200">Сумма на РС</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-200">Действие</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {additionalRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-2.5 text-slate-800 dark:text-slate-200 font-medium">{row.id}</td>
                      <td className={`px-4 py-2.5 text-right font-bold tabular-nums ${row.sum < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                        {formatNumber(row.sum)} ₽
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={() => onRemoveRow && onRemoveRow(idx)}
                          className="text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 font-medium"
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
