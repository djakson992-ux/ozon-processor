import { useCallback, useState } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle2, RefreshCw, Trash2 } from 'lucide-react';

export default function FileUploader({
  title,
  subtitle,
  file,
  fileName,
  extraInfo,
  onFileLoaded,
  onClear,
  accept = '.xlsx',
  badgeText,
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      onFileLoaded(droppedFile);
    }
  }, [onFileLoaded]);

  const handleFileInput = useCallback((e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      onFileLoaded(selectedFile);
    }
    e.target.value = '';
  }, [onFileLoaded]);

  const isLoaded = Boolean(file || fileName || extraInfo);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative group rounded-2xl border-2 transition-all duration-200 p-5 ${
        isDragging
          ? 'border-indigo-500 bg-indigo-50/60 shadow-lg scale-[1.01]'
          : isLoaded
          ? 'border-emerald-200 bg-emerald-50/40 shadow-sm hover:border-emerald-300'
          : 'border-dashed border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50/80 shadow-sm'
      }`}
    >
      <input
        type="file"
        id={`file-input-${title}`}
        accept={accept}
        onChange={handleFileInput}
        className="hidden"
      />

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              isLoaded
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100'
            }`}
          >
            {isLoaded ? (
              <FileSpreadsheet className="w-6 h-6" />
            ) : (
              <UploadCloud className="w-6 h-6" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900">{title}</h3>
              {badgeText && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                  {badgeText}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          </div>
        </div>

        {isLoaded && onClear && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            title="Очистить файл"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {isLoaded ? (
        <div className="mt-4 pt-3.5 border-t border-emerald-100/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-800 truncate">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate max-w-[200px] sm:max-w-xs">{fileName || 'Загружено из памяти'}</span>
            {extraInfo && (
              <span className="text-emerald-700/80 font-normal">({extraInfo})</span>
            )}
          </div>

          <label
            htmlFor={`file-input-${title}`}
            className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-2.5 py-1 rounded-lg hover:bg-indigo-50/80 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Заменить
          </label>
        </div>
      ) : (
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">Перетащите .xlsx файл сюда</span>
          <label
            htmlFor={`file-input-${title}`}
            className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg shadow-sm transition-all active:scale-95"
          >
            Выбрать файл
          </label>
        </div>
      )}
    </div>
  );
}
