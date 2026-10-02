import { useState, useCallback, useEffect } from 'react';
import FileUploader from './components/FileUploader';
import Dashboard from './components/Dashboard';
import PivotTable from './components/PivotTable';
import AdditionalRowsModal from './components/AdditionalRowsModal';
import { exportToXlsx } from './utils/exportXlsx';
import {
  loadPriceRef,
  savePriceRef,
  parsePriceRefFile,
  parseNacisleniyaFile,
  buildReference,
  buildColumns,
  buildPivot,
  calcTotals,
} from './utils/ozonProcessor';
import { 
  Sparkles, 
  Download, 
  PlusCircle, 
  ShieldCheck, 
  AlertCircle, 
  Play, 
  RotateCw, 
  FileSpreadsheet,
  Sun,
  Moon
} from 'lucide-react';

function App() {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ozon_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  const [priceRef, setPriceRef] = useState(null);
  const [nacisleniyaFile, setNacisleniyaFile] = useState(null);
  const [nacisleniyaFileName, setNacisleniyaFileName] = useState('');
  const [processingResult, setProcessingResult] = useState(null);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [additionalRows, setAdditionalRows] = useState([]);

  // Синхронизация класса dark на <html>
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Слушатель системной темы, если пользователь ещё не переключал вручную
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (!localStorage.getItem('ozon_theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('ozon_theme', next);
      return next;
    });
  }, []);

  // Загружаем справочник цен при старте из localStorage
  useEffect(() => {
    const stored = loadPriceRef();
    if (stored) {
      setPriceRef(stored);
    }
  }, []);

  // Обработка загрузки файла начислений
  const handleNacisleniyaLoad = useCallback((file) => {
    setNacisleniyaFile(file);
    setNacisleniyaFileName(file.name);
    setError(null);
    setProcessingResult(null);
  }, []);

  // Очистка файла начислений
  const handleClearNacisleniya = useCallback(() => {
    setNacisleniyaFile(null);
    setNacisleniyaFileName('');
    setProcessingResult(null);
  }, []);

  // Обработка загрузки справочника цен
  const handlePriceRefLoad = useCallback(async (file) => {
    setError(null);
    try {
      const priceMap = await parsePriceRefFile(file);
      const saved = savePriceRef(priceMap);
      setPriceRef(saved);
    } catch (err) {
      setError(`Ошибка загрузки справочника цен: ${err.message}`);
    }
  }, []);

  // Очистка справочника цен
  const handleClearPriceRef = useCallback(() => {
    localStorage.removeItem('ozon_price_ref');
    setPriceRef(null);
  }, []);

  // Добавление дополнительной строки
  const handleAddRow = useCallback((newRow) => {
    setAdditionalRows(prev => [...prev, newRow]);
  }, []);

  // Удаление дополнительной строки
  const handleRemoveRow = useCallback((index) => {
    setAdditionalRows(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Обработка файлов
  const processFiles = useCallback(async () => {
    if (!nacisleniyaFile) {
      setError('Пожалуйста, загрузите файл начислений Ozon');
      return;
    }

    setIsProcessing(true);
    setError(null);
  }, [nacisleniyaFile, priceRef]);

  // Handle file processing body
  const doProcessFiles = useCallback(async () => {
    if (!nacisleniyaFile) {
      setError('Пожалуйста, загрузите файл начислений Ozon');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // 1. Парсим начисления
      const rows = await parseNacisleniyaFile(nacisleniyaFile);

      // 2. Строим справочник ID -> Артикул
      const pairs = buildReference(rows);

      // 3. Строим структуру колонок (Группа + Тип)
      const columns = buildColumns(rows);

      // 4. Строим сводную таблицу (Зоны A, B, C)
      const { zoneA, zoneB, zoneC } = buildPivot(pairs, columns, rows);

      // 5. Считаем итоги
      const baseTotals = calcTotals(zoneA, zoneB, zoneC, columns, priceRef);

      setProcessingResult({
        zoneA,
        zoneB,
        zoneC,
        columns,
        baseTotals,
        pairsCount: pairs.length,
      });
    } catch (err) {
      console.error('Ошибка обработки:', err);
      setError(`Ошибка обработки: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [nacisleniyaFile, priceRef]);

  // Пересчёт итогов с учётом дополнительных строк
  const totalsWithAdditional = processingResult && processingResult.baseTotals ? (() => {
    const additionalTotal = additionalRows.reduce((acc, row) => acc + row.sum, 0);
    return {
      ...processingResult.baseTotals,
      totalToList: processingResult.baseTotals.totalToList + additionalTotal,
      totalWithoutB: processingResult.baseTotals.totalWithoutB + additionalTotal,
      additionalTotal,
      additionalRows,
    };
  })() : null;

  // Экспорт в XLSX
  const handleExport = useCallback(() => {
    if (!processingResult || !totalsWithAdditional) return;

    const { zoneA, zoneB, zoneC, columns } = processingResult;
    exportToXlsx(zoneA, zoneB, zoneC, columns, totalsWithAdditional, priceRef, additionalRows);
  }, [processingResult, totalsWithAdditional, priceRef, additionalRows]);

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 pb-16 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-sm shadow-indigo-200 dark:shadow-indigo-950">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 dark:text-white tracking-tight text-base sm:text-lg">
                  Ozon Analytics
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/60">
                  v2.0 PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Сведение и финансовый анализ отчетов Ozon
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 text-xs">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-medium border border-transparent dark:border-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>100% Client-Side</span>
            </div>

            {priceRef && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Прайс: {priceRef.count} поз.
              </span>
            )}

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-900 hover:bg-slate-200/80 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 transition-all flex items-center gap-2 shadow-sm"
              title={theme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
              aria-label="Переключить тему оформления"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline font-medium text-xs">Светлая</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span className="hidden sm:inline font-medium text-xs">Тёмная</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Upload Panels Section */}
        <section className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* File 1: Начисления Ozon */}
            <FileUploader
              title="Отчёт по начислениям"
              subtitle="Лист «Начисления» (.xlsx) из личного кабинета Ozon"
              badgeText="Обязательно"
              file={nacisleniyaFile}
              fileName={nacisleniyaFileName}
              onFileLoaded={handleNacisleniyaLoad}
              onClear={handleClearNacisleniya}
            />

            {/* File 2: Справочник цен */}
            <FileUploader
              title="Справочник цен"
              subtitle="Артикулы и root_price для автоматического расчета РРЦ"
              badgeText="Сохраняется в памяти"
              file={priceRef}
              fileName={priceRef ? 'Справочник цен активен' : ''}
              extraInfo={priceRef ? `${priceRef.count} позиций` : ''}
              onFileLoaded={handlePriceRefLoad}
              onClear={handleClearPriceRef}
            />

          </div>

          {/* Action Button & Status */}
          <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
              <span>
                {nacisleniyaFile 
                  ? 'Файл готов к обработке. Нажмите кнопку для построения сводки.'
                  : 'Загрузите файл начислений Ozon, чтобы начать анализ.'}
              </span>
            </div>

            <button
              onClick={doProcessFiles}
              disabled={!nacisleniyaFile || isProcessing}
              className="py-2.5 px-6 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 disabled:cursor-not-allowed shadow-sm shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-2 active:scale-95 shrink-0"
            >
              {isProcessing ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  Обработка отчета...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  Свести отчёт Ozon
                </>
              )}
            </button>
          </div>
        </section>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-4 flex items-start gap-3 text-rose-800 dark:text-rose-200 text-sm animate-fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* Results Section */}
        {processingResult && totalsWithAdditional && (
          <div className="space-y-6">
            
            {/* Bento Grid Dashboard */}
            <Dashboard totals={totalsWithAdditional} />

            {/* Quick Actions Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Обработано позиций:</span>
                <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold border border-transparent dark:border-slate-700">
                  {processingResult.pairsCount}
                </span>
                {additionalRows.length > 0 && (
                  <span className="text-slate-400 dark:text-slate-500">
                    (+{additionalRows.length} доп. затрат)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-750 border border-transparent dark:border-slate-700 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Доп. расходы {additionalRows.length > 0 ? `(${additionalRows.length})` : ''}
                </button>

                <button
                  onClick={handleExport}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-xl shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  Скачать Excel (.xlsx)
                </button>
              </div>
            </div>

            {/* Smart Interactive Pivot Table */}
            <PivotTable
              zoneA={processingResult.zoneA}
              zoneB={processingResult.zoneB}
              zoneC={processingResult.zoneC}
              columns={processingResult.columns}
              additionalRows={additionalRows}
              onRemoveRow={handleRemoveRow}
            />

          </div>
        )}

      </main>

      {/* Additional Expenses Modal */}
      <AdditionalRowsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        additionalRows={additionalRows}
        onAddRow={handleAddRow}
        onRemoveRow={handleRemoveRow}
      />

    </div>
  );
}

export default App;
