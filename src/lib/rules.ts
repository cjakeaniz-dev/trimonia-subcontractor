import { Prisma } from "@prisma/client";
import { z } from "zod";

Prisma.Decimal.set({ precision: 48 });

export class RuleError extends Error {}
export function requireRule(condition: unknown, message: string): asserts condition {
  if (!condition) throw new RuleError(message);
}

export const id = z.uuid();
export const short = z.string().trim().min(1).max(180);
const decimal = (scale: number, integerDigits: number) =>
  z.string().regex(new RegExp(`^-?\\d{1,${integerDigits}}(?:\\.\\d{1,${scale}})?$`), "Enter a valid decimal amount")
    .transform(value => new Prisma.Decimal(value));

export const money = decimal(2, 16);
export const allocation = money.refine(value => value.gte(0), "Budget cannot be negative");
export const date = z.iso.date().transform(value => new Date(value + "T00:00:00Z"));
export const status = z.enum(["ACTIVE", "ARCHIVED"]);
export const note = z.string().trim().max(3000);
export const item = z.object({
  materialName: short, unit: short,
  quantity: decimal(3, 15).refine(value => value.gt(0), "Quantity must be positive"),
  unitPrice: money.refine(value => value.gt(0), "Unit price must be positive"),
});
export const expenseInput = z.object({
  assignmentId: id, categoryId: id, supplier: short, transactionDate: date,
  description: note, items: z.array(item).min(1).max(100),
});

export const zero = new Prisma.Decimal(0);
const maxMoney = new Prisma.Decimal("9999999999999999.99");

export function expenseTotals(items: z.output<typeof item>[]) {
  const lines = items.map((item, position) => ({
    ...item, position, lineTotal: item.quantity.mul(item.unitPrice).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
  }));
  const total = lines.reduce((sum, item) => sum.add(item.lineTotal), zero);
  requireRule(total.gt(0) && total.lte(maxMoney), "Expense total must be between PHP 0.01 and PHP 9,999,999,999,999,999.99");
  return { lines, total };
}

export function transition(from: string, to: string) {
  return (from === "DRAFT" && to === "PENDING") || (from === "PENDING" && (to === "APPROVED" || to === "REJECTED"));
}

export function php(value: Prisma.Decimal) {
  const [integer, cents] = value.toFixed(2).split(".");
  return "PHP " + integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + cents;
}
