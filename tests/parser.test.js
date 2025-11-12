import parser from '../src/index.js';

const mockExport = jest.fn();
beforeAll(() => {
  global.$ = { export: mockExport };
});

describe('SMS Transaction Parser', () => {
  beforeEach(() => mockExport.mockClear());

  const runParser = async (smsText) => {
    const steps = { trigger: { event: { body: { text: smsText } } } };
    await parser.run({ steps, $$ : global. $$ });
    return mockExport.mock.calls[0]?.[1];
  };

  test('ignores Capital One payments', async () => {
    expect(await runParser('Capital One Alert: Your payment of $28.54 is scheduled for November 10, 2025.')).toBeUndefined();
    expect(await runParser('Capital One Alert: You paid $28.54 to your Savor Credit Card on November 10, 2025.')).toBeUndefined();
  });

  test('Chase credit → negative', async () => {
    const rows = await runParser('Prime Visa: You have a $24.97 pending credit from COSTCO WHSE #0692.');
    expect(rows[0][1]).toBe('COSTCO WHSE #0692');
    expect(rows[0][4]).toBe('-24.97');
  });

  test('Citi dots', async () => {
    const rows = await runParser('Citi Alert: Card ending in 0569 was not present for a $101.55 international transaction at WWW.PUREVPN.. View details at citi.com/citimobileapp');
    expect(rows[0][1]).toBe('WWW.PUREVPN');
  });

  test('First Tech', async () => {
    const text = 'Transaction Alert from First Tech Federal Credit Union.\n***5267 had a transaction of ($90.00). Description: POS Transaction ZIPLY FIBER INTERNET 135 Lake Street South SKIRKLAND WAU. Date: Nov 09, 2025 ';
    const rows = await runParser(text);
    expect(rows.length).toBe(1);
  });

  test('unknown → manual review', async () => {
    const rows = await runParser('Random $42.00');
    expect(rows[0][1]).toBe('Manual Review Required');
  });
});
