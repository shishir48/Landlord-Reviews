const { levenshtein } = require('../src/utils/levenshtein');
const { normalizeAddress } = require('../src/utils/normalizeAddress');

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('john', 'john')).toBe(0);
  });

  it('returns correct distance', () => {
    expect(levenshtein('john davidson', 'john davdison')).toBe(2);
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
  });

  it('is case-insensitive', () => {
    expect(levenshtein('John', 'john')).toBe(0);
  });
});

describe('normalizeAddress', () => {
  it('lowercases and trims', () => {
    expect(normalizeAddress('  42 Maple St  ')).toBe('42 maple st');
  });

  it('strips punctuation', () => {
    expect(normalizeAddress('42 Maple St., Austin, TX 78701')).toBe('42 maple st austin tx 78701');
  });
});
