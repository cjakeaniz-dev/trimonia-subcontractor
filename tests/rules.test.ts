import assert from "node:assert/strict";
import { test } from "node:test";
import { expenseTotals, item, money, php, transition } from "../src/lib/rules";
import { summarize } from "../src/lib/finance";
import { csvRow } from "../src/lib/report";
import { maxReceiptSize, receiptType } from "../src/lib/storage";

test("PHP expense totals round each line before summing", () => {
  const row = (quantity: string, unitPrice: string) => item.parse({ materialName: "Material", unit: "kg", quantity, unitPrice });
  assert.equal(expenseTotals([row("10", "250"), row("5", "300")]).total.toFixed(2), "4000.00");
  assert.equal(expenseTotals([row("0.005", "1"), row("0.005", "1")]).total.toFixed(2), "0.02");
  assert.equal(php(money.parse("9999999999999999.99")), "PHP 9,999,999,999,999,999.99");
  assert.throws(() => expenseTotals([row("3", "9999999999999999.99")]), /Expense total/);
  assert.throws(() => row("0", "1"));
  assert.throws(() => row("0.0001", "1"));
  assert.throws(() => row("1", "1.001"));
});

test("pending exposure leaves the official balance unchanged, and zero utilization is undefined", () => {
  const result = summarize({ initialBudget: money.parse("600000"), adjustments: [] },
    [{ status: "PENDING", _sum: { total: money.parse("4000") } }]);
  assert.equal(php(result.remaining), "PHP 600,000.00");
  assert.equal(php(result.pending), "PHP 4,000.00");
  assert.equal(summarize({ initialBudget: money.parse("0"), adjustments: [] }, []).utilization, null);
});

test("workflow has exactly three transitions", () => {
  const statuses = ["DRAFT", "PENDING", "APPROVED", "REJECTED"];
  const allowed = statuses.flatMap(from => statuses.filter(to => transition(from, to)).map(to => from + " → " + to));
  assert.deepEqual(allowed, ["DRAFT → PENDING", "PENDING → APPROVED", "PENDING → REJECTED"]);
});

test("CSV escapes cells and neutralizes spreadsheet formulas", () => {
  assert.equal(csvRow(['a,b"c', "=5+2", "4000.00"]), "\"a,b\"\"c\",\"'=5+2\",\"4000.00\"\r\n");
});

test("receipt validation checks size, declared MIME and supported signatures", () => {
  const pdf = Buffer.from("%PDF-1.4\n%%EOF\n");
  assert.equal(receiptType(pdf, "application/pdf"), "application/pdf");
  assert.throws(() => receiptType(pdf, "image/jpeg"), /valid JPG/);
  assert.throws(() => receiptType(Buffer.from("<html>hello"), "application/pdf"), /valid JPG/);
  assert.throws(() => receiptType(Buffer.alloc(maxReceiptSize + 1), "application/pdf"), /5 MB/);
});
