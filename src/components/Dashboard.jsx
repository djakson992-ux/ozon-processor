import { 
  Wallet, 
  TrendingUp, 
  Percent, 
  ArrowDownRight, 
  Layers, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { formatNumber } from '../utils/ozonProcessor';

export default function Dashboard({ totals }) {
  if (!totals || totals.totalToList === undefined || totals.totalToList === null) {
    return null;
  }

  const percentOnRSFormatted = totals.percentOnRS !== null && totals.percentOnRS !== undefined
    ? (totals.percentOnRS * 100).toFixed(1) + '%'
    : '—';

  const percentCostsFormatted = totals.percentCosts !== null && totals.percentCosts !== undefined
    ? (totals.percentCosts * 100).toFixed(1) + '%'
    : '—';

  const percentWithoutBFormatted = totals.percentWithoutB !== null && totals.percentWithoutB !== undefined
    ? (totals.percentWithoutB * 100).toFixed(1) + '%'
    : '—';

  const isNetPositive = (totals.totalToList || 0) >= 0;
  const isPercentPositive = (totals.percentOnRS || 0) >= 0;

  const progressPercent = Math.min(Math.max((totals.percentOnRS || 0) * 100, 0), 100);

  return (
    <div className="mb-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
            Финансовые итоги периода
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Сводные расчеты на основе выгрузки начислений Ozon и справочника РРЦ
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-sm text-xs text-slate-600">
          <span className="text-slate-400">Формула РРЦ:</span>
          <span className="font-semibold text-slate-800">root_price × 95</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-850 to-slate-900 text-white p-6 shadow-md border border-indigo-700/50 flex flex-col justify-between">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-28 h-28 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none"></div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium tracking-wide uppercase text-indigo-200/80 flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-indigo-400" />
                К перечислению на РС
              </span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                isNetPositive 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {isNetPositive ? 'К выплате' : 'К доплате'}
              </span>
            </div>

            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums text-white">
              {totals.totalToList.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-indigo-800/60 flex items-center justify-between text-xs text-indigo-200/70">
            <span>Зона A (продажи): {totals.totalToListA?.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽</span>
            <span>Затраты B+C: {((totals.totalToListB || 0) + (totals.totalToListC || 0) + (totals.additionalTotal || 0)).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽</span>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium tracking-wide uppercase text-slate-500 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-violet-500" />
                Оценка по РРЦ ценам
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-violet-50 text-violet-700 border border-violet-100">
                База расчета
              </span>
            </div>

            <div className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-slate-900">
              {totals.totalByRRC !== null && totals.totalByRRC !== undefined
                ? `${totals.totalByRRC.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`
                : '—'}
            </div>
          </div>

          <div className="mt-5 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
            Суммарная стоимость товаров по прайс-листу
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium tracking-wide uppercase text-slate-500 flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-emerald-500" />
                % к перечислению от РРЦ
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                isPercentPositive 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                  : 'bg-rose-50 text-rose-700 border border-rose-100'
              }`}>
                Доля на РС
              </span>
            </div>

            <div className={`text-2xl sm:text-3xl font-bold tracking-tight tabular-nums ${
              isPercentPositive ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {percentOnRSFormatted}
            </div>
          </div>

          <div className="mt-4">
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isPercentPositive ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1.5">
              <span>0%</span>
              <span>Эффективность продаж</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200/80 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase text-slate-500 flex items-center gap-1.5">
              <ArrowDownRight className="w-4 h-4 text-rose-500" />
              % совокупных затрат
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-rose-50 text-rose-700 border border-rose-100">
              Комиссии + услуги
            </span>
          </div>

          <div className="text-2xl font-bold tracking-tight tabular-nums text-slate-800">
            {percentCostsFormatted}
          </div>

          <p className="text-xs text-slate-500 mt-2">
            Комиссия, логистика, реклама и эквайринг относительно РРЦ
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200/80 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase text-slate-500 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-purple-500" />
              Без бесвыручечных товаров
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-purple-50 text-purple-700 border border-purple-100">
              Зона A + C
            </span>
          </div>

          <div className="text-2xl font-bold tracking-tight tabular-nums text-purple-900">
            {totals.totalWithoutB !== null && totals.totalWithoutB !== undefined
              ? `${totals.totalWithoutB.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`
              : '—'}
          </div>

          <p className="text-xs text-slate-500 mt-2">
            Сумма без учета товаров Зоны B (только затраты без продаж)
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200/80 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase text-slate-500 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-indigo-500" />
              % (без бесвыручечных)
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
              Скорректировано
            </span>
          </div>

          <div className="text-2xl font-bold tracking-tight tabular-nums text-indigo-700">
            {percentWithoutBFormatted}
          </div>

          <p className="text-xs text-slate-500 mt-2">
            Реальный процент возврата средств по активным продажам
          </p>
        </div>
      </div>
    </div>
  );
}
