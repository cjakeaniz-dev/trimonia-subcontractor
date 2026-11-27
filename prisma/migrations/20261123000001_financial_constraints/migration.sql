ALTER TABLE "Project"
  ADD CONSTRAINT "Project_budget_nonnegative" CHECK ("budget" >= 0),
  ADD CONSTRAINT "Project_dates_in_order" CHECK ("targetDate" >= "startDate");

ALTER TABLE "ProjectSubcontractor"
  ADD CONSTRAINT "ProjectSubcontractor_initialBudget_nonnegative" CHECK ("initialBudget" >= 0);

ALTER TABLE "BudgetAdjustment"
  ADD CONSTRAINT "BudgetAdjustment_nonzero" CHECK ("delta" <> 0);

ALTER TABLE "Expense"
  ADD CONSTRAINT "Expense_total_positive" CHECK ("total" > 0),
  ADD CONSTRAINT "Expense_workflow_metadata" CHECK (
    ("status" = 'DRAFT' AND "submittedAt" IS NULL AND "reviewedAt" IS NULL AND "reviewedById" IS NULL)
    OR ("status" = 'PENDING' AND "submittedAt" IS NOT NULL AND "reviewedAt" IS NULL AND "reviewedById" IS NULL)
    OR ("status" = 'APPROVED' AND "submittedAt" IS NOT NULL AND "reviewedAt" IS NOT NULL AND "reviewedById" IS NOT NULL)
    OR ("status" = 'REJECTED' AND "submittedAt" IS NOT NULL AND "reviewedAt" IS NOT NULL AND "reviewedById" IS NOT NULL
      AND "reviewRemarks" IS NOT NULL AND length(btrim("reviewRemarks")) > 0)
  );

ALTER TABLE "ExpenseItem"
  ADD CONSTRAINT "ExpenseItem_pricing_positive" CHECK ("quantity" > 0 AND "unitPrice" > 0 AND "lineTotal" >= 0),
  ADD CONSTRAINT "ExpenseItem_rounded_total" CHECK ("lineTotal" = round("quantity" * "unitPrice", 2));

ALTER TABLE "ExpenseAttachment"
  ADD CONSTRAINT "ExpenseAttachment_allowed_type_and_size" CHECK (
    "fileSize" BETWEEN 1 AND 5242880 AND "mimeType" IN ('image/jpeg', 'image/png', 'application/pdf')
  );
