import { printThermalReceipt80mm } from '../../../src/utils/printUtils';

// Setup minimal robust browser/window mocks for Node test environment
(global as any).window = {
  alert: (msg: string) => {
    console.log(`  [Mock Window.Alert]: ${msg}`);
  },
  open: () => ({
    closed: false,
    document: {
      open: () => {},
      write: () => {},
      close: () => {},
    },
    focus: () => {},
    print: () => {},
  }),
};
(global as any).document = {
  createElement: (tag: string) => ({
    style: {},
    appendChild: () => {},
    contentWindow: {
      document: { open: () => {}, write: () => {}, close: () => {} },
      focus: () => {},
      print: () => {}
    },
    contentDocument: { open: () => {}, write: () => {}, close: () => {} }
  }),
  body: {
    appendChild: () => {},
    contains: () => true,
    removeChild: () => {},
  },
};

interface TestScenario {
  name: string;
  input: any;
  expectedResult: boolean;
  expectAlert: boolean;
}

const scenarios: TestScenario[] = [
  {
    name: '1. Valid normal document',
    input: {
      customerName: 'Ahmet Yılmaz',
      customerPhone: '05321234567',
      orderNumber: 'ORD-1001',
      totalAmount: 1250.50,
      taxAmount: 250.10,
      items: [
        { name: 'Kombi Borusu', qty: 2, unit: 'ADET', price: 500, total: 1000 },
        { name: 'Vana', qty: 5, unit: 'ADET', price: 50.1, total: 250.5 }
      ]
    },
    expectedResult: true,
    expectAlert: false,
  },
  {
    name: '2. Zero qty and zero total',
    input: {
      customerName: 'Mehmet Demir',
      orderNumber: 'ORD-1002',
      totalAmount: 0,
      taxAmount: 0,
      items: [
        { name: 'Numune Conta', qty: 0, unit: 'ADET', price: 0, total: 0 }
      ]
    },
    expectedResult: true,
    expectAlert: false,
  },
  {
    name: '3. Negative amount / return',
    input: {
      customerName: 'Ayşe Kaya',
      orderNumber: 'ORD-1003',
      totalAmount: -150,
      items: [
        { name: 'İade Vana', qty: -1, unit: 'ADET', price: -150, total: -150 }
      ]
    },
    expectedResult: true,
    expectAlert: false,
  },
  {
    name: '4. Missing required numeric field (undefined price/total)',
    input: {
      customerName: 'Ali Can',
      orderNumber: 'ORD-1004',
      items: [
        { name: 'Özel Parça', qty: 1, unit: 'ADET', price: undefined, total: undefined }
      ]
    },
    expectedResult: true,
    expectAlert: false,
  },
  {
    name: '5. NaN, Infinity, -Infinity numeric values',
    input: {
      customerName: 'Canan Şen',
      orderNumber: 'ORD-1005',
      totalAmount: NaN,
      taxAmount: Infinity,
      items: [
        { name: 'Hatalı Ürün', qty: NaN, unit: 'ADET', price: Infinity, total: -Infinity }
      ]
    },
    expectedResult: true,
    expectAlert: false,
  },
  {
    name: '6. null and undefined root object',
    input: null,
    expectedResult: false,
    expectAlert: true,
  },
  {
    name: '7. Missing, null, or non-array items',
    input: {
      customerName: 'Veli Koç',
      orderNumber: 'ORD-1007',
      items: null,
    },
    expectedResult: false,
    expectAlert: true,
  },
  {
    name: '8. items containing null or invalid item',
    input: {
      customerName: 'Zeynep Ak',
      orderNumber: 'ORD-1008',
      items: [
        null,
        { name: 'Normal Ürün', qty: 1, unit: 'ADET', price: 100, total: 100 }
      ]
    },
    expectedResult: true,
    expectAlert: false,
  },
  {
    name: '9. Valid empty items array []',
    input: {
      customerName: 'Hakan Taş',
      orderNumber: 'ORD-1009',
      items: []
    },
    expectedResult: true,
    expectAlert: false,
  },
  {
    name: '10. Price-less output supported',
    input: {
      customerName: 'Selin Arslan',
      orderNumber: 'ORD-1010',
      items: [
        { name: 'Fiyatsız Numune', qty: 3, unit: 'ADET' }
      ]
    },
    expectedResult: true,
    expectAlert: false,
  }
];

console.log('=== RUNNING PRINT THERMAL RECEIPT BEHAVIORAL TESTS ===\n');
let passedCount = 0;

scenarios.forEach((sc, idx) => {
  let alertTriggered = false;
  const originalAlert = (global as any).window.alert;
  (global as any).window.alert = (msg: string) => {
    alertTriggered = true;
    console.log(`  [Alert intercepted]: ${msg}`);
  };

  try {
    const result = printThermalReceipt80mm(sc.input);
    const resultMatch = result === sc.expectedResult;
    const alertMatch = alertTriggered === sc.expectAlert;

    if (resultMatch && alertMatch) {
      console.log(`✅ Test ${idx + 1} (${sc.name}): PASSED`);
      passedCount++;
    } else {
      console.log(`❌ Test ${idx + 1} (${sc.name}): FAILED (Result: ${result}, Expected: ${sc.expectedResult}, Alert: ${alertTriggered}, ExpectedAlert: ${sc.expectAlert})`);
    }
  } catch (err: any) {
    console.log(`❌ Test ${idx + 1} (${sc.name}): THREW UNCAUGHT ERROR: ${err.message}\n${err.stack}`);
  } finally {
    (global as any).window.alert = originalAlert;
  }
});

console.log(`\n=== TEST SUMMARY: ${passedCount} / ${scenarios.length} PASSED ===`);
if (passedCount !== scenarios.length) {
  process.exit(1);
}
