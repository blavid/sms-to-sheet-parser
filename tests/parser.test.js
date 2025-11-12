import { parse } from 'node-html-parser';
import parser from '../src/index.js';

// Mock Pipedream runtime
const createTestContext = (smsText) => ({
  steps: {
    trigger: {
      event: {
        body: { text: smsText }
      }
    }
  },
  $: {
    export: (key, value) => {
      createTestContext.lastExport = value;
    }
  }
});

createTestContext.lastExport = null;

describe('SMS Transaction Parser', () => {
  beforeEach(() => {
    createTestContext.lastExport = null;
  });

  test('Capital One payment scheduled → ignored', async () => {
    const ctx = createTestContext(`Capital One Alert: Your payment of $28.54 is scheduled for November 10, 2025.`);
    await parser.run(ctx);
    expect(createTestContext.lastExport).toBeNull();
  });

  test('Capital One payment confirmation → ignored', async () => {
    const ctx = createTestContext(`Capital One Alert: You paid $28.54 to your Savor Credit Card…(8385) on November 10, 2025.`);
    await parser.run(ctx);
    expect(createTestContext.lastExport).toBeNull();
  });

  test('Chase pending credit → negative amount', async () => {
    const ctx = createTestContext(`Prime Visa: You have a $24.97 pending credit from COSTCO WHSE #0692.`);
    await parser.run(ctx);
    const rows = createTestContext.lastExport;
    expect(rows[0][1]).toBe('COSTCO WHSE #0692');
    expect(rows[0][4]).toBe('-24.97');
    expect(rows[0][5]).toBe('Chase Card');
  });

  test('Citi online with dots and double period', async () => {
    const ctx = createTestContext(`Citi Alert: Card ending in 0569 was not present for a $101.55 international transaction at WWW.PUREVPN.. View details at citi.com/citimobileapp`);
    await parser.run(ctx);
    const rows = createTestContext.lastExport;
    expect(rows[0][1]).toBe('WWW.PUREVPN');
    expect(rows[0][4]).toBe('101.55');
  });

  test('First Tech duplicate → only one recorded', async () => {
    const text = `Transaction Alert from First Tech Federal Credit Union.
***5267 had a transaction of ($90.00). Description: POS Transaction ZIPLY FIBER INTERNET 135 Lake Street South SKIRKLAND WAU. Date: Nov 09, 2025 `;
    const ctx = createTestContext(text);
    await parser.run(ctx);
    const rows = createTestContext.lastExport;
    expect(rows.length).toBe(1);
    expect(rows[0][1]).toBe('POS Transaction ZIPLY FIBER INTERNET 135 Lake Street South SKIRKLAND WAU');
  });
});
