"use client";

import { startTransition, useActionState, useContext, useEffect, useId, type ReactNode } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { login, submit } from "@/app/actions";
import { Button } from "./button";
import { EditDialogClose } from "./edit-dialog";

function useFormAction(action: typeof submit) {
  const dialog = useContext(EditDialogClose);
  const [state, dispatch, pending] = useActionState(action, {});
  useEffect(() => {
    if (state.saved) dialog?.();
  }, [state.saved, dialog]);
  return { state, dispatch, pending, dialog };
}

export function ActionForm({ operation, id, children, confirm, label = "Save", variant }: {
  operation: string; id?: string; children?: ReactNode; confirm?: string; label?: string; variant?: string;
}) {
  const { state, dispatch: action, pending, dialog } = useFormAction(operation === "login" ? login : submit);
  return <form action={action} onSubmit={event => {
    event.preventDefault();
    if (pending || (confirm && !window.confirm(confirm))) return;
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  }} className="grid gap-4">
    <input type="hidden" name="operation" value={operation}/>
    {id && <input type="hidden" name="id" value={id}/>}
    {dialog && <input type="hidden" name="editDialog" value="1"/>}
    {children}
    {state.error && <p role="alert" className="error">{state.error}</p>}
    <div><Button className={variant} disabled={pending}>{pending ? "Working…" : label}</Button></div>
  </form>;
}

const rowsSchema = z.object({ rows: z.array(z.object({
  materialName: z.string().trim().min(1), unit: z.string().trim().min(1),
  quantity: z.string().regex(/^\d{1,15}(\.\d{1,3})?$/).refine(value => Number(value) > 0),
  unitPrice: z.string().regex(/^\d{1,16}(\.\d{1,2})?$/).refine(value => Number(value) > 0),
})).min(1).max(100) });
type Row = z.infer<typeof rowsSchema>["rows"][number];
const blank: Row = { materialName: "", unit: "", quantity: "", unitPrice: "" };

export function ExpenseForm({ id, children, items, units }: { id?: string; children: ReactNode; items?: Row[]; units: { value: string; label: string }[] }) {
  const { state, dispatch: action, pending, dialog } = useFormAction(submit);
  const fieldId = useId();
  const form = useForm({ resolver: zodResolver(rowsSchema), defaultValues: { rows: items ?? [blank] }, mode: "onChange" });
  const { fields, append, remove } = useFieldArray({ name: "rows", control: form.control });
  const columns = [["materialName", "Material / service"], ["unit", "Unit"], ["quantity", "Quantity"], ["unitPrice", "Unit price (PHP)"]] as const;

  return <form action={action} className="grid gap-5" onSubmit={event => {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    void form.handleSubmit(() => startTransition(() => action(data)))();
  }}>
    <input type="hidden" name="operation" value="expense"/>
    {id && <input type="hidden" name="id" value={id}/>}
    {dialog && <input type="hidden" name="editDialog" value="1"/>}
    {children}
    <fieldset className="grid gap-3">
      <legend className="mb-3 text-lg font-semibold">Expense items</legend>
      {fields.map((row, index) => <div key={row.id} className="grid items-end gap-3 rounded-md border border-[var(--border)] p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        {columns.map(([key, label]) => {
          const registration = form.register(`rows.${index}.${key}`);
          const invalid = !!form.formState.errors.rows?.[index]?.[key];
          const inputId = `${fieldId}-${index}-${key}`;
          const accessibility = { id: inputId, "aria-invalid": invalid, "aria-describedby": invalid ? inputId + "-error" : undefined };
          return <div key={key} className="field">
            <label htmlFor={inputId}>{label}</label>
            {key === "unit" ? <select {...registration} {...accessibility} required>
              <option value="">Select unit</option>
              {units.map(unit => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
            </select> : <input {...registration} {...accessibility} required maxLength={180}
              inputMode={key === "quantity" || key === "unitPrice" ? "decimal" : undefined}/>}
            {invalid && <span id={inputId + "-error"} className="text-[var(--danger)]">Enter a valid {label.toLowerCase()}.</span>}
          </div>;
        })}
        <Button className="secondary" type="button" disabled={fields.length === 1} onClick={() => remove(index)} aria-label={`Remove item ${index + 1}`}>Remove</Button>
      </div>)}
      <div><Button className="secondary" type="button" disabled={fields.length >= 100} onClick={() => append(blank)}>Add item</Button></div>
    </fieldset>
    {state.error && <p className="error" role="alert">{state.error}</p>}
    <div><Button disabled={pending}>{pending ? "Saving…" : "Save draft"}</Button></div>
  </form>;
}
