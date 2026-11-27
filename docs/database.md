# Database Design

Use UUID primary keys, createdAt/updatedAt timestamps, foreign keys, indexes, and soft archival where appropriate.

| Model | Key fields |
|---|---|
| User | id, name, email(unique), passwordHash, role, isActive |
| Project | id, code(unique), name, description, location, startDate, targetDate, budget numeric(18,2), status |
| ProjectManagerMembership | id, projectId, userId (unique pair) |
| Subcontractor | id, companyName, contactName, email, phone, isActive |
| SubcontractorUserMembership | id, subcontractorId, userId (unique pair) |
| ProjectSubcontractor | id, projectId, subcontractorId, scopeOfWork, initialBudget numeric(18,2), status |
| BudgetAdjustment | id, assignmentId, delta numeric(18,2), reason, createdById, createdAt |
| ExpenseCategory | id, name, isActive |
| Expense | id, assignmentId, categoryId, supplier, transactionDate, description, status, submittedById, submittedAt, reviewedById, reviewedAt, reviewRemarks, total numeric(18,2) |
| ExpenseItem | id, expenseId, materialName, quantity numeric(18,3), unit, unitPrice numeric(18,2), lineTotal numeric(18,2) |
| ExpenseAttachment | id, expenseId, storageKey, originalFilename, mimeType, fileSize, uploadedById |
| AuditLog | id, actorId, action, entityType, entityId, beforeJson, afterJson, createdAt |

Recommended indexes: expenses(assignmentId,status,transactionDate), project assignments(projectId,subcontractorId), membership lookup keys, audit logs(entityType,entityId,createdAt). Define referential deletion policy to preserve financial history. Never cascade-delete approved expenses.

Totals are recomputed/validated server-side from expense items, not accepted from client. Explicitly define allowed statuses and transitions in schema/service layer.

`MasterData` stores admin-managed units, shared supplier suggestions, and project location suggestions. Names are unique within a kind using a normalized key. The migration installs common units, imports prior project locations, and records other historical units as inactive. The existing `ExpenseCategory` table remains the category lookup.
