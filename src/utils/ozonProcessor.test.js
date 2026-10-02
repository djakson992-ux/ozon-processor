import { describe, it, expect } from 'vitest';
import {
  calculateRRC,
  buildReference,
  buildColumns,
  buildPivot,
  calcTotals,
  formatNumber,
} from './ozonProcessor';
import { sanitizeCellValue } from './exportXlsx';

describe('Ozon Processor Core Engine', () => {
  describe('calculateRRC', () => {
    it('should correctly calculate RRC from rootPrice', () => {
      const result = calculateRRC(10);
      expect(result).toBe(950);
    });

    it('should return null for empty or zero rootPrice', () => {
      expect(calculateRRC(null)).toBeNull();
      expect(calculateRRC(undefined)).toBeNull();
      expect(calculateRRC(0)).toBeNull();
    });

    it('should round correctly for floating numbers', () => {
      expect(calculateRRC(10.55)).toBe(1002.3);
    });
  });

  describe('buildReference', () => {
    it('should create unique ID + Article pairs and deduplicate', () => {
      const rows = [
        { id: '101', article: 'ART-A', group: 'Продажи', type: 'Выручка', quantity: 1, sum: 100 },
        { id: '101', article: 'ART-A', group: 'Услуги', type: 'Эквайринг', quantity: 0, sum: -5 },
        { id: '102', article: 'ART-B', group: 'Продажи', type: 'Выручка', quantity: 2, sum: 200 },
        { id: '103', article: '', group: 'Прочие', type: 'Сбор', quantity: 0, sum: -50 },
      ];

      const reference = buildReference(rows);
      expect(reference).toHaveLength(3);
      expect(reference).toContainEqual({ id: '101', article: 'ART-A' });
      expect(reference).toContainEqual({ id: '102', article: 'ART-B' });
      expect(reference).toContainEqual({ id: '103', article: '' });
    });

    it('should not add duplicate empty article if ID already exists with article', () => {
      const rows = [
        { id: '101', article: 'ART-A', group: 'Продажи', type: 'Выручка', quantity: 1, sum: 100 },
        { id: '101', article: '', group: 'Услуги', type: 'Эквайринг', quantity: 0, sum: -5 },
      ];

      const reference = buildReference(rows);
      expect(reference).toHaveLength(1);
      expect(reference[0]).toEqual({ id: '101', article: 'ART-A' });
    });
  });

  describe('buildColumns', () => {
    it('should extract unique sorted column definitions', () => {
      const rows = [
        { id: '1', article: 'A', group: 'Услуги', type: 'Логистика', quantity: 0, sum: -10 },
        { id: '1', article: 'A', group: 'Продажи', type: 'Выручка', quantity: 1, sum: 100 },
        { id: '2', article: 'B', group: 'Продажи', type: 'Выручка', quantity: 1, sum: 200 },
      ];

      const columns = buildColumns(rows);
      expect(columns).toHaveLength(2);
      expect(columns[0]).toEqual({ group: 'Продажи', type: 'Выручка' });
      expect(columns[1]).toEqual({ group: 'Услуги', type: 'Логистика' });
    });
  });

  describe('buildPivot and calcTotals', () => {
    it('should separate into Zone A (with revenue) and Zone B (without revenue)', () => {
      const rows = [
        { id: '101', article: 'ART-1', group: 'Продажи', type: 'Выручка', quantity: 2, sum: 1000 },
        { id: '101', article: 'ART-1', group: 'Услуги', type: 'Логистика', quantity: 0, sum: -200 },
        { id: '102', article: 'ART-2', group: 'Услуги', type: 'Логистика', quantity: 0, sum: -150 },
      ];

      const pairs = buildReference(rows);
      const columns = buildColumns(rows);
      const { zoneA, zoneB, zoneC } = buildPivot(pairs, columns, rows);

      expect(zoneA).toHaveLength(1);
      expect(zoneA[0].id).toBe('101');
      expect(zoneA[0].sumOnRS).toBe(800);
      expect(zoneA[0].quantity).toBe(2);

      expect(zoneB).toHaveLength(1);
      expect(zoneB[0].id).toBe('102');
      expect(zoneB[0].sumOnRS).toBe(-150);

      expect(zoneC).toHaveLength(0);

      const priceRef = {
        data: {
          'ART-1': 10,
        },
      };

      const totals = calcTotals(zoneA, zoneB, zoneC, columns, priceRef);
      expect(totals.totalToListA).toBe(800);
      expect(totals.totalToListB).toBe(-150);
      expect(totals.totalToList).toBe(650);
      expect(totals.totalByRRC).toBe(950 * 2);
      expect(totals.percentOnRS).toBeCloseTo(650 / 1900, 4);
    });

    it('should safely handle empty price catalog without NaN', () => {
      const zoneA = [{ id: '1', article: 'A', values: {}, quantity: 1, sumOnRS: 100 }];
      const zoneB = [];
      const zoneC = [];
      const columns = [{ group: 'Продажи', type: 'Выручка' }];
      const priceRef = null;

      const totals = calcTotals(zoneA, zoneB, zoneC, columns, priceRef);
      expect(totals.totalByRRC).toBe(0);
      expect(totals.percentOnRS).toBeNull();
      expect(totals.percentCosts).toBeNull();
      expect(totals.totalToList).toBe(100);
    });
  });

  describe('Security and Sanitization (CWE-1236)', () => {
    it('should escape strings starting with formula characters', () => {
      expect(sanitizeCellValue('=cmd|/c calc')).toBe("'=cmd|/c calc");
      expect(sanitizeCellValue('+12345')).toBe("'+12345");
      expect(sanitizeCellValue('-dangerous')).toBe("'-dangerous");
      expect(sanitizeCellValue('@SUM(A1:B1)')).toBe("'@SUM(A1:B1)");
      expect(sanitizeCellValue('SafeArticle123')).toBe('SafeArticle123');
      expect(sanitizeCellValue(12345)).toBe(12345);
      expect(sanitizeCellValue(null)).toBe('');
    });
  });

  describe('formatNumber', () => {
    it('should format percentage correctly', () => {
      expect(formatNumber(0.125, { isPercent: true })).toBe('12.5%');
      expect(formatNumber(-0.052, { isPercent: true })).toBe('-5.2%');
    });

    it('should handle invalid or empty values gracefully', () => {
      expect(formatNumber(null)).toBe('');
      expect(formatNumber(undefined)).toBe('');
      expect(formatNumber(NaN)).toBe('');
    });
  });
});
