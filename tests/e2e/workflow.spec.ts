import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("administrator allocates, subcontractor submits, manager approves and exports", async ({ page, browser }) => {
  const admin = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!admin || !adminPassword) throw new Error("Set bootstrap administrator credentials for the isolated E2E database.");
  const tag = randomUUID().slice(0, 8);
  const companyName = "Electrical " + tag;
  const projectName = "Site " + tag;
  const supplier = "Hardware " + tag;
  const manager = "manager-" + tag + "@example.test";
  const subcontractor = "sub-" + tag + "@example.test";
  const password = "browser-fixture-password";
  page.on("dialog", dialog => dialog.accept());

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await login(page, admin, adminPassword);
  await page.getByRole("link", { name: "Master data", exact: true }).click();
  await page.getByRole("link", { name: "Suppliers", exact: true }).click();
  await page.getByLabel("Supplier name").fill(supplier);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("cell", { name: supplier, exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Edit " + supplier }).click();
  const supplierDialog = page.getByRole("dialog", { name: "Edit supplier" });
  await expect(supplierDialog.getByLabel("Supplier name")).toHaveValue(supplier);
  await supplierDialog.getByRole("button", { name: "Save" }).click();
  await expect(supplierDialog).toHaveCount(0);
  await page.getByRole("link", { name: "Projects", exact: true }).click();
  await page.getByRole("link", { name: "New project" }).click();
  await page.getByLabel("Project code").fill("C-" + tag);
  await page.getByLabel("Name", { exact: true }).fill(projectName);
  await page.getByLabel("Location").fill("Manila");
  await page.getByLabel("Budget ceiling (PHP)").fill("1000000.00");
  await page.getByLabel("Start date").fill("2026-01-01");
  await page.getByLabel("Target date").fill("2026-12-31");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { name: projectName })).toBeVisible();
  const project = new URL(page.url()).pathname;
  const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(breadcrumb.getByRole("link", { name: "Projects" })).toHaveAttribute("href", "/projects");
  await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText(projectName);
  const editProject = page.getByRole("button", { name: "Edit project" });
  await editProject.click();
  const projectDialog = page.getByRole("dialog", { name: "Edit project" });
  await projectDialog.getByLabel("Location").fill("Discarded change");
  await page.keyboard.press("Escape");
  await expect(projectDialog).toHaveCount(0);
  await expect(editProject).toBeFocused();
  await editProject.click();
  await expect(projectDialog.getByLabel("Location")).toHaveValue("Manila");
  await projectDialog.getByLabel("Location").fill("Quezon City");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(/C-.+ · Quezon City/)).toBeVisible();
  await page.goto("/projects?q=" + encodeURIComponent(projectName));
  await expect(page.getByRole("link", { name: projectName })).toBeVisible();

  await page.goto("/subcontractors/new");
  await page.getByLabel("Company name").fill(companyName);
  await page.getByLabel("Contact name").fill("Site contact");
  await page.getByLabel("Email").fill("electrical@example.test");
  await page.getByLabel("Phone").fill("09123456789");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { name: companyName })).toBeVisible();
  await page.getByRole("button", { name: "Edit subcontractor" }).click();
  const companyDialog = page.getByRole("dialog", { name: "Edit subcontractor" });
  await companyDialog.getByLabel("Contact name").fill("Electrical contact");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(/Electrical contact ·/)).toBeVisible();
  await page.goto("/subcontractors?q=" + encodeURIComponent(companyName));
  await expect(page.getByRole("link", { name: companyName })).toBeVisible();

  await page.goto(project + "/assignments");
  await expect(breadcrumb.getByRole("link", { name: projectName })).toHaveAttribute("href", project);
  await breadcrumb.getByRole("link", { name: projectName }).click();
  await expect(page.getByRole("heading", { name: projectName })).toBeVisible();
  await page.getByRole("link", { name: "Manage assignments" }).click();
  await page.getByRole("combobox", { name: "Subcontractor", exact: true }).selectOption({ label: companyName });
  await page.getByLabel("Scope of work").fill("Electrical installation");
  await page.getByLabel("Initial budget (PHP)").fill("600000.00");
  await page.getByRole("button", { name: "Create assignment" }).click();
  await expect(page.getByRole("heading", { name: "Electrical installation" })).toBeVisible();
  const assignment = new URL(page.url()).pathname;
  await page.getByRole("button", { name: "Edit assignment" }).click();
  const assignmentDialog = page.getByRole("dialog", { name: "Edit assignment" });
  await assignmentDialog.getByLabel("Scope of work").fill("Electrical fit-out");
  await assignmentDialog.getByRole("button", { name: "Save" }).click();
  await expect(assignmentDialog).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Electrical fit-out" })).toBeVisible();

  for (const [email, role, membership] of [
    [manager, "MANAGER", new RegExp(projectName)],
    [subcontractor, "SUBCONTRACTOR", companyName],
  ] as const) {
    await page.goto("/users?id=new");
    await page.getByLabel("Name", { exact: true }).fill(email.split("@")[0]);
    await page.getByLabel("Email").fill(email);
    await page.getByRole("combobox", { name: "Role", exact: true }).selectOption(role);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("checkbox", { name: membership }).check();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("cell", { name: email, exact: true })).toBeVisible({ timeout: 15000 });
  }
  await page.getByRole("link", { name: "Edit " + subcontractor.split("@")[0] }).click();
  const userDialog = page.getByRole("dialog", { name: "Edit user" });
  await userDialog.getByLabel("Name", { exact: true }).fill("Electrical submitter " + tag);
  await userDialog.getByRole("button", { name: "Save" }).click();
  await expect(userDialog).toHaveCount(0);
  await page.goto("/users?q=" + encodeURIComponent(subcontractor));
  await page.getByRole("link", { name: "Edit Electrical submitter " + tag }).click();
  await expect(userDialog.getByLabel("Name", { exact: true })).toHaveValue("Electrical submitter " + tag);
  await expect(userDialog.getByRole("checkbox", { name: companyName })).toBeChecked();
  await userDialog.getByRole("button", { name: "Close" }).click();
  await expect(page).toHaveURL(/users\?q=/);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  const sub = await browser.newPage();
  sub.on("dialog", dialog => dialog.accept());
  await login(sub, subcontractor, password);
  await expect(sub.getByRole("link", { name: "Approvals", exact: true })).toHaveCount(0);
  await sub.goto(assignment);
  await sub.getByRole("link", { name: "New expense" }).click();
  await expect(sub.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Electrical fit-out" })).toHaveAttribute("href", assignment);
  await sub.getByRole("combobox", { name: "Category", exact: true }).selectOption({ label: "Materials" });
  await expect(sub.getByLabel("Supplier")).toHaveAttribute("list", "supplier-suggestions");
  expect(await sub.locator("#supplier-suggestions option").evaluateAll(options => options.map(option => option.getAttribute("value")))).toContain(supplier);
  await sub.getByLabel("Supplier").fill(supplier);
  await sub.getByLabel("Transaction date").fill("2026-11-20");
  await sub.getByRole("button", { name: "Add item" }).click();
  for (const [index, values] of [["Screws", "kg", "10", "250"], ["Cement", "bag", "5", "300"]].entries()) {
    for (const [position, label] of ["Material / service", "Unit", "Quantity", "Unit price (PHP)"].entries()) {
      const field = sub.getByLabel(label, { exact: true }).nth(index);
      if (label === "Unit") await field.selectOption(values[position]);
      else await field.fill(values[position]);
    }
  }
  await sub.getByRole("button", { name: "Save draft" }).click();
  await expect(sub.getByRole("heading", { name: supplier })).toBeVisible();
  const expense = new URL(sub.url()).pathname;
  await sub.getByRole("button", { name: "Edit draft" }).click();
  const draftDialog = sub.getByRole("dialog", { name: "Edit expense draft" });
  await draftDialog.getByLabel("Description").fill("Purchased at site");
  await sub.getByRole("button", { name: "Save draft" }).click();
  await expect(draftDialog).toHaveCount(0);
  await expect(sub.getByText("Purchased at site")).toBeVisible();
  await expect(sub.getByText("PHP 4,000.00", { exact: true })).toBeVisible();
  if (process.env.S3_BUCKET) {
    await sub.getByLabel("Receipt (JPG, PNG or PDF, up to 5 MB)").setInputFiles({
      name: "proof.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF\n"),
    });
    await sub.getByRole("button", { name: "Upload receipt" }).click();
    const receipt = sub.getByRole("link", { name: "proof.pdf", exact: true });
    await expect(receipt).toBeVisible();
    const receiptPath = (await receipt.getAttribute("href"))!;
    expect((await page.request.get(receiptPath, { maxRedirects: 0 })).status()).toBe(401);
    const signed = await sub.request.get(receiptPath, { maxRedirects: 0 });
    expect(signed.status()).toBe(302);
    expect((await sub.request.get(signed.headers().location)).status()).toBe(200);
  }
  await sub.getByRole("button", { name: "Submit for review" }).click();
  await expect(sub.getByText("Pending", { exact: true })).toBeVisible();
  await sub.goto(assignment);
  await expect(sub.getByText("PHP 600,000.00", { exact: true })).toHaveCount(2);
  await expect(sub.getByText("PHP 4,000.00", { exact: true })).toHaveCount(2);

  const review = await browser.newPage();
  review.on("dialog", dialog => dialog.accept());
  await login(review, manager, password);
  await review.getByRole("link", { name: "Approvals", exact: true }).click();
  await review.getByRole("link", { name: supplier }).click();
  await expect(review.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Approvals" })).toHaveAttribute("href", "/approvals");
  await review.getByLabel("Approval remarks (optional)").fill("Verified at site");
  await review.getByRole("button", { name: "Approve expense" }).click();
  await expect(review.getByText("Approved", { exact: true })).toBeVisible();
  await expect(review).toHaveURL(new RegExp(expense + "$"));
  await review.getByRole("link", { name: "View assignment budget" }).click();
  await expect(review.getByText("PHP 596,000.00", { exact: true })).toBeVisible();

  await review.getByRole("link", { name: "Reports", exact: true }).click();
  await review.getByRole("combobox", { name: "Status", exact: true }).selectOption("APPROVED");
  await review.getByRole("button", { name: "Apply filters" }).click();
  await expect(review.getByRole("link", { name: supplier })).toBeVisible();
  const exportPath = (await review.getByRole("link", { name: "Export CSV" }).getAttribute("href"))!;
  const csv = await review.request.get(exportPath);
  expect(csv.status()).toBe(200);
  expect(await csv.text()).toContain(`"${supplier}","2026-11-20","APPROVED","4000.00"`);
  await sub.close();
  await review.close();
});

test("seeded demo accounts can sign in and see their role-specific workspace", async ({ browser }) => {
  test.skip(process.env.CCBM_DEMO_SEED !== "1", "Requires a database populated by the demo seed.");
  const accounts = [
    { email: "admin@siteledger.test", password: process.env.DEMO_ADMIN_PASSWORD, users: true, approvals: true },
    { email: "manager@siteledger.test", password: process.env.DEMO_MANAGER_PASSWORD, users: false, approvals: true },
    { email: "subcontractor@siteledger.test", password: process.env.DEMO_SUBCONTRACTOR_PASSWORD, users: false, approvals: false },
  ];

  for (const account of accounts) {
    if (!account.password) throw new Error("Set all three demo passwords.");
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await login(page, account.email, account.password);
      await expect(page.getByRole("link", { name: "Users", exact: true })).toHaveCount(Number(account.users));
      await expect(page.getByRole("link", { name: "Approvals", exact: true })).toHaveCount(Number(account.approvals));
      await page.goto("/projects?q=DEMO-001");
      await expect(page.getByRole("link", { name: "Quezon City Office Fit-Out" })).toBeVisible();
      await page.goto("/expenses");
      await expect(page.getByText("Demo Hardware", { exact: true })).toBeVisible();
    } finally {
      await context.close();
    }
  }
});
