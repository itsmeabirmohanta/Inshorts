const Announcement = require('../models/Announcement');

describe('Announcement model', () => {
  test('category enum contains Benefits', () => {
    const enumValues = Announcement.schema.path('category').enumValues;
    expect(enumValues).toContain('Benefits');
  });
});
