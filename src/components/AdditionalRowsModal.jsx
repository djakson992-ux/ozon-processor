import { useState } from 'react';
import { X, Plus, Trash2, ReceiptText, AlertCircle } from 'lucide-react';
import { formatNumber } from '../utils/ozonProcessor';

export default function AdditionalRowsModal({
  isOpen,
  onClose,
  additionalRows,
  onAddRow,
  onRemoveRow,
}) {
  const [newRowId, setNewRowId] = useState('');
  const [newRowSum, setNewRowSum] = useState('');
  const [inputError, setInputError] = useState('');

  if (!isOpen) return null;

  const handleAdd = () => {
    setInputError('');
    if (!newRowId.trim()) {
      setInputError('Введите ID начисления или описание');
      return;
    }
    if (!newRowSum.trim()) {
      setInputError('Введите сумму');
      return;
    }

    const cleanSum = newRowSum.replace(/\s/g, '').replace(',', '.');
    const parsed = parseFloat(cleanSum);
    if (isNaN(parsed)) {
      setInputError('Некорректная сумма');
      return;
    }

    onAddRow({ id: newRowId.trim(), sum: parsed });
    setNewRowId('');
    setNewRowSum('');
  };

  const totalAdditional = additionalRows.reduce((acc, r) => acc + r.sum, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ReceiptText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Расходы без Артикулов и ID
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Корректировки и общие затраты аккаунта
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Form */}
        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Добавить начисление
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="text"
                placeholder="ID или описание"
                value={newRowId}
                onChange={(e) => {
                  setNewRowId(e.target.value);
                  setInputError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <input
                type="text"
                placeholder="Сумма (например, -1500.50)"
                value={newRowSum}
                onChange={(e) => {
                  setNewRowSum(e.target.value);
                  setInputError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all tabular-nums placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            {inputError && (
              <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                {inputError}
              </div>
            )}

            <button
              onClick={handleAdd}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-medium text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Добавить в расчет
            </button>
          </div>

          {/* List */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 px-1">
              <span>Список позиций ({additionalRows.length})</span>
              <span>
                Итого: <strong className={totalAdditional < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}>{formatNumber(totalAdditional)} ₽</strong>
              </span>
            </div>

            {additionalRows.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                Дополнительных затрат не добавлено
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
                {additionalRows.map((row, idx) => (
                  <div key={idx} className="p-3 bg-white dark:bg-slate-900 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                    <div className="truncate pr-3">
                      <div className="text-xs font-medium text-slate-900 dark:text-slate-200 truncate">{row.id}</div>
                      <div className={`text-xs font-semibold tabular-nums mt-0.5 ${row.sum < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {row.sum.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
                      </div>
                    </div>

                    <button
                      onClick={() => onRemoveRow(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                      title="Удалить строку"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
