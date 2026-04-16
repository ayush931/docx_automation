import { describe, it, expect } from 'vitest';
import { checkSpelling } from '../lib/spellChecker';

describe('spellChecker', () => {
  const usUkPairs = [
    { us: 'color', uk: 'colour' },
    { us: 'realize', uk: 'realise' },
    { us: 'center', uk: 'centre' },
    { us: 'organize', uk: 'organise' },
    { us: 'traveling', uk: 'travelling' },
  ];

  it('should identify UK words as consistency errors in US dialect', async () => {
    for (const pair of usUkPairs) {
      const errors = await checkSpelling(pair.uk, 'us');
      expect(errors).toHaveLength(1);
      expect(errors[0].word).toBe(pair.uk);
      expect(errors[0].type).toBe('consistency');
      expect(errors[0].message).toContain('UK spelling');
    }
  });

  it('should identify US words as consistency errors in UK dialect', async () => {
    for (const pair of usUkPairs) {
      const errors = await checkSpelling(pair.us, 'uk');
      expect(errors).toHaveLength(1);
      expect(errors[0].word).toBe(pair.us);
      expect(errors[0].type).toBe('consistency');
      expect(errors[0].message).toContain('US spelling');
    }
  });

  it('should detect punctuation errors', async () => {
    const text = 'Double  space. Space before .Missing space after.';
    const errors = await checkSpelling(text, 'us');
    
    const doubleSpace = errors.find(e => e.type === 'punctuation' && e.message === 'Double space detected.');
    const spaceBefore = errors.find(e => e.type === 'punctuation' && e.message === "Unnecessary space before punctuation '.'.");
    const missingSpace = errors.find(e => e.type === 'punctuation' && e.message === "Missing space after punctuation '.'.");
    
    expect(doubleSpace).toBeDefined();
    expect(spaceBefore).toBeDefined();
    expect(missingSpace).toBeDefined();
  });

  it('should detect style errors in dates', async () => {
    const usText = 'The date is 31/12/2023.'; // Invalid for US MM/DD/YYYY
    const ukText = 'The date is 12/31/2023.'; // Invalid for UK DD/MM/YYYY
    
    const usErrors = await checkSpelling(usText, 'us');
    const ukErrors = await checkSpelling(ukText, 'uk');
    
    expect(usErrors.find(e => e.type === 'style')).toBeDefined();
    expect(ukErrors.find(e => e.type === 'style')).toBeDefined();
  });

  it('should detect word consistency errors', async () => {
    const text = 'The advisor and the adviser met today. The advisor was happy.';
    const errors = await checkSpelling(text, 'us');
    
    const consistencyError = errors.find(e => e.type === 'consistency' && e.word === 'adviser');
    expect(consistencyError).toBeDefined();
    expect(consistencyError?.suggestions).toContain('advisor');
  });

  it('should find no errors for correct words in their respective dialects', async () => {
    for (const pair of usUkPairs) {
      const usErrors = await checkSpelling(pair.us, 'us');
      expect(usErrors).toHaveLength(0);

      const ukErrors = await checkSpelling(pair.uk, 'uk');
      expect(ukErrors).toHaveLength(0);
    }
  });

  it('should return errors for both dialects when "both" is selected', async () => {
    const text = 'The colour is nice. The center is nice.';
    const errors = await checkSpelling(text, 'both');
    
    // 'colour' is a US error, 'center' is a UK error
    const usErrors = errors.filter(e => e.dialect === 'us');
    const ukErrors = errors.filter(e => e.dialect === 'uk');
    
    expect(usErrors.some(e => e.word === 'colour')).toBe(true);
    expect(ukErrors.some(e => e.word === 'center')).toBe(true);
  });
});
