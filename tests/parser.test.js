// Mock Pipedream globals
global.defineComponent = (obj) => obj;
global.$ = {
  export: jest.fn()
};

import parser from '../src/index.js';

describe('Basic SMS Parser Test', () => {
  beforeEach(() => {
    global.$.export.mockClear();
  });

  test('Chase pending credit → parses correctly', async () => {
    const smsText = `Prime Visa: You have a $24.97 pending credit from COSTCO WHSE #0692.`;

    const steps = {
      trigger: { event: { body: { text: smsText } } }
    };

    await parser.run({ steps, $: global.$ });

    const exported = global.$.export.mock.calls[0][1];
    expect(exported).toBeDefined();
    expect(exported[0][1]).toBe('COSTCO WHSE #0692');  // payee
    expect(exported[0][4]).toBe('-24.97');             // amount
    expect(exported[0][5]).toBe('Chase Card');         // payment method
  });
});
