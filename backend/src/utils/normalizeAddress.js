function normalizeAddress(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ');
}

module.exports = { normalizeAddress };
