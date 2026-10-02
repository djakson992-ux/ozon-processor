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
  FileSpreadsheet
} from 'lucide-react';

function App() {
  const [priceRef, setPriceRef] = useState(null);
  const [nacisleniyaFile, setNacisleniyaFile] = useState(null);
  const [nacisleniyaFileName, setNacisleniyaFileName] = useState('');
  const [processingResult, setProcessingResult] = useState(null);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [additionalRows, setAdditionalRows] = useState([]);

  useEffect(() => {
    const stored = loadPriceRef();
    if (stored) {
      setPriceRef(stored);
    }
  }, []);

  const handleNacisleniyaLoad = useCallback((file) => {
    setNacisleniyaFile(file);
    setNacisleniyaFileName(file.name);
    setError(null);
    setProcessingResult(null);
  }, []);

  const handleClearNacisleniya = useCallback(() => {
    setNacisleniyaFile(null);
    setNacisleniyaFileName('');
    setProcessingResult(null);
  }, []);

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

  const handleClearPriceRef = useCallback(() => {
    localStorage.removeItem('ozon_price_ref');
    setPriceRef(null);
  }, []);

  const handleAddRow = useCallback((newRow) => {
    setAdditionalRows(prev => [...prev, newRow]);
  }, []);

  const handleRemoveRow = useCallback((index) => {
    setAdditionalRows(prev => prev.filter((_, i) => i !== index));
  }, []);

  const processFiles = useCallback(async () => {
    if (!nacisleniyaFile) {
      setError('Пожалуйста, загрузите файл начислений Ozon');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const rows = await parseNacisleniyaFile(nacisleniyaFile);
      const pairs = buildReference(rows);
      const columns = buildColumns(rows);
      const { zoneA, zoneB, zoneC } = buildPivot(pairs, columns, rows);
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

  const handleExport = useCallback(() => {
    if (!processingResult || !totalsWithAdditional) return;

    const { zoneA, zoneB, zoneC, columns } = processingResult;
    exportToXlsx(zoneA, zoneB, zoneC, columns, totalsWithAdditional, priceRef, additionalRows);
  }, [processingResult, totalsWithAdditional, priceRef, additionalRows]);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-sm shadow-indigo-200">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg">
                  Ozon Analytics
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  v2.0 PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Сведение и финансовый анализ отчетов Ozon
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>100% Client-Side (данные не покидают браузер)</span>
            </div>

            {priceRef && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Прайс: {priceRef.count} поз.
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <section className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FileUploader
              title="Отчёт по начислениям"
              subtitle="Лист «Начисления» (.xlsx) из личного кабинета Ozon"
              badgeText="Обязательно"
              file={nacisleniyaFile}
              fileName={nacisleniyaFileName}
              onFileLoaded={handleNacisleniyaLoad}
              onClear={handleClearNacisleniya}
            />

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

          <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>
                {nacisleniyaFile 
                  ? 'Файл готов к обработке. Нажмите кнопку для построения сводки.'
                  : 'Загрузите файл начислений Ozon, чтобы начать анализ.'}
              </span>
            </div>

            <button
              onClick={processFiles}
              disabled={!nacisleniyaFile || isProcessing}
              className="py-2.5 px-6 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed shadow-sm shadow-indigo-200 transition-all flex items-center justify-center gap-2 active:scale-95 shrink-0"
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

        {error && (
          <div className="mb-6 bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-rose-800 text-sm animate-fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {processingResult && totalsWithAdditional && (
          <div className="space-y-6">
            <Dashboard totals={totalsWithAdditional} />

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Обработано позиций:</span>
                <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-900 font-bold">
                  {processingResult.pairsCount}
                </span>
                {additionalRows.length > 0 && (
                  <span className="text-slate-400">
                    (+{additionalRows.length} доп. затрат)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4 text-indigo-600" />
                  Доп. расходы {additionalRows.length > 0 ? `(${additionalRows.length})` : ''}
                </button>

                <button
                  onClick={handleExport}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  Скачать Excel (.xlsx)
                </button>
              </div>
            </div>

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
