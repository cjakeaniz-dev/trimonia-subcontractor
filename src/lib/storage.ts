import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { expenseScope, type Actor } from "./access";
import { db, transact } from "./db";
import { audit, verifyActor } from "./mutations";
import { id, requireRule } from "./rules";

export const maxReceiptSize = 5 * 1024 * 1024;

export function receiptType(bytes: Buffer, declared: string) {
  requireRule(bytes.length > 0 && bytes.length <= maxReceiptSize, "Receipts must be between 1 byte and 5 MB.");
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    && bytes.subarray(12, 16).toString() === "IHDR"
    && bytes.subarray(-12).equals(Buffer.from([0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]));
  const jpg = bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255])) && bytes.subarray(-2).equals(Buffer.from([255, 217]));
  const pdf = /^%PDF-\d\.\d/.test(bytes.subarray(0, 8).toString()) && /%%EOF\s*$/.test(bytes.subarray(-1024).toString());
  requireRule((png && declared === "image/png") || (jpg && declared === "image/jpeg") || (pdf && declared === "application/pdf"),
    "Upload a valid JPG, PNG, or PDF.");
  return declared;
}

function storage() {
  const bucket = process.env.S3_BUCKET;
  requireRule(bucket, "Receipt storage is unavailable.");
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  return {
    bucket,
    client: new S3Client({
      region: process.env.S3_REGION || "us-east-1",
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
    }),
  };
}

function editable(actor: Actor, expenseId: string) {
  return { AND: [expenseScope(actor), {
    id: expenseId, submittedById: actor.id, status: "DRAFT" as const,
    assignment: { status: "ACTIVE" as const, project: { status: "ACTIVE" as const }, subcontractor: { isActive: true } },
  }] };
}

export async function uploadReceipt(actor: Actor, expenseId: string, file: File) {
  id.parse(expenseId);
  requireRule(file.size <= maxReceiptSize, "Receipts must be 5 MB or smaller.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = receiptType(bytes, file.type);
  requireRule(await db.expense.count({ where: editable(actor, expenseId) }), "Only your own drafts accept receipts.");
  const { client, bucket } = storage();
  const storageKey = "receipts/" + randomUUID();
  let stored = false;
  try {
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: storageKey, Body: bytes, ContentType: mimeType }));
    stored = true;
    await transact(async tx => {
      await verifyActor(tx, actor);
      requireRule(await tx.expense.count({ where: editable(actor, expenseId) }), "Only your own drafts accept receipts.");
      requireRule(await tx.expenseAttachment.count({ where: { expenseId } }) < 10, "Each expense supports up to 10 receipts.");
      // Touch the draft so submission and attachment creation serialize on its row.
      await tx.expense.update({ where: { id: expenseId }, data: { updatedAt: new Date() } });
      const attachment = await tx.expenseAttachment.create({ data: {
        expenseId, storageKey, originalFilename: file.name.replace(/[\x00-\x1f\x7f]/g, "").slice(0, 180) || "Receipt",
        mimeType, fileSize: bytes.length, uploadedById: actor.id,
      } });
      await audit(tx, actor, "ATTACH_RECEIPT", "Expense", expenseId, null, { attachmentId: attachment.id });
    });
  } catch (error) {
    if (stored) await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: storageKey })).catch(() => {
      console.error("Receipt cleanup failed after transaction failure");
    });
    throw error;
  } finally {
    client.destroy();
  }
}

export async function receiptLink(actor: Actor, attachmentId: string, preview = false) {
  if (!id.safeParse(attachmentId).success) return null;
  const result = await db.expenseAttachment.findFirst({ where: { id: attachmentId, expense: expenseScope(actor) } });
  if (!result) return null;
  const { client, bucket } = storage();
  try {
    return await getSignedUrl(client, new GetObjectCommand({
      Bucket: bucket, Key: result.storageKey, ResponseContentDisposition: preview ? "inline" : "attachment",
    }), { expiresIn: 60 });
  } finally { client.destroy(); }
}
