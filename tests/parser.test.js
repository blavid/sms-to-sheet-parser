import { parse } from 'node-html-parser';

// Mock Pipedream's defineComponent
global.defineComponent = (component) => component;

import parser from '../src/index.js';

const mockExport = jest.fn();
beforeAll(() => {
  global.$ = { export: mockExport };
});

describe('SMS Transaction Parser', () => {
  beforeEach(() => {
    mockExport.mockClear();
  });

  const runParser = async (smsText) => {
    const steps = {
      trigger: { event: { body: { text: smsText } } },
    };
    await parser.run({ steps, $$ : global. $$ });
    const calls = mockExport.mock.calls;
    if (calls.length === 0) return undefined;
    return calls[0][1]; // exported transactions
  };

  test('Capital One payment scheduled → ignored', async () => {
    const rows = await runParser(`Capital One Alert: Your payment of $28.54 is scheduled for November 10, 2025. Contact us if your payment details are incorrect. Std carrier charges apply`);
    expect(rows).toBeUndefined();
  });

  test('Capital One payment confirmation → ignored', async () => {
    const rows = await runParser(`Capital One Alert: You paid $28.54 to your Savor Credit Card…(8385) on November 10, 2025. Msg & data rates may apply.`);
    expect(rows).toBeUndefined();
  });

  test('Chase pending credit → negative amount', async () => {
    const rows = await runParser(`Prime Visa: You have a $24.97 pending credit from COSTCO WHSE #0692.`);
    expect(rows[0][1]).toBe('COSTCO WHSE #0692');
    expect(rows[0][4]).toBe('-24.97');
    expect(rows[0][5]).toBe('Chase Card');
  });

  test('Citi online with dots and double period', async () => {
    const rows = await runParser(`Citi Alert: Card ending in 0569 was not present for a $101.55 international transaction at WWW.PUREVPN.. View details at citi.com/citimobileapp`);
    expect(rows[0][1]).toBe('WWW.PUREVPN');
    expect(rows[0][4]).toBe('101.55');
  });

  test('First Tech duplicate → only one recorded', async () => {
    const text = `Transaction Alert from First Tech Federal Credit Union.
***5267 had a transaction of ($90.00). Description: POS Transaction ZIPLY FIBER INTERNET 135 Lake Street South SKIRKLAND WAU. Date: Nov 09, 2025 `;
    const rows = await runParser(text);
    expect(rows.length).toBe(1);
    expect(rows[0][1]).toBe('POS Transaction ZIPLY FIBER INTERNET 135 Lake Street South SKIRKLAND WAU');
  });

  test('Unknown message → Manual Review Required', async () => {
    const rows = await runParser(`Some random SMS with $42.00 in it`);
    expect(rows[0][1]).toBe('Manual Review Required');
    expect(rows[0][4]).toBe('42.00');
  });
});
