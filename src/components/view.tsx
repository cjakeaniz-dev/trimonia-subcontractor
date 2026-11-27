import Link from "next/link";
import type { ReactNode } from "react";

export type Query = Record<string, string | string[] | undefined>;
export const pageSize = 20;
export const text = (query: Query, key: string) => typeof query[key] === "string" ? query[key].slice(0, 180) : "";
export const pageOf = (query: Query) => {
  const page = Number(text(query, "page"));
  return Number.isSafeInteger(page) && page > 0 ? Math.min(page, 100000) : 1;
};
export function queryString(query: Query, overrides: Record<string, string> = {}) {
  return new URLSearchParams(Object.entries({ ...query, ...overrides }).filter((pair): pair is [string, string] => typeof pair[1] === "string" && !!pair[1])).toString();
}
export const dateOnly = (value: Date) => value.toISOString().slice(0, 10);
export const dateTime = (value: Date) => new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short",
}).format(value);
export const display = (value: string) => value.charAt(0) + value.slice(1).toLowerCase();
export const link = (text: string, href: string) => ({ text, href });
export const badge = (value: string) => ({ text: display(value), badge: true, status: value.toLowerCase() });

export function Heading({ title, subtitle, children, featured }: { title: string; subtitle?: string; children?: ReactNode; featured?: boolean }) {
  return <div className={featured ? "page-heading featured-heading" : "page-heading"}><div>
    <h1>{title}</h1>{subtitle && <p className="muted mt-2">{subtitle}</p>}
  </div>{children}</div>;
}
export function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return <section className="panel grid content-start gap-4">{title && <h2>{title}</h2>}{children}</section>;
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field">{label}{children}</label>;
}
export function Input({ label, name, ...props }: React.ComponentProps<"input"> & { label: string; name: string }) {
  return <Field label={label}><input {...props} name={name}/></Field>;
}
export function SuggestedInput({ label, name, values, defaultValue }: {
  label: string; name: string; values: string[]; defaultValue?: string;
}) {
  const list = name + "-suggestions";
  return <Field label={label}>
    <input name={name} list={list} defaultValue={defaultValue} required maxLength={180}/>
    <datalist id={list}>{values.map(value => <option key={value} value={value}/>)}</datalist>
  </Field>;
}
export type Option = { value: string; label: string };
export function Select({ label, name, options, value = "", placeholder, required }: {
  label: string; name: string; options: Option[]; value?: string; placeholder?: string; required?: boolean;
}) {
  return <Field label={label}><select name={name} defaultValue={value} required={required}>
    {placeholder && <option value="">{placeholder}</option>}{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
  </select></Field>;
}
export const statuses = ["ACTIVE", "ARCHIVED"].map(value => ({ value, label: display(value) }));
export const expenseStatuses = ["DRAFT", "PENDING", "APPROVED", "REJECTED"].map(value => ({ value, label: display(value) }));
export function Filters({ children, action }: { children: ReactNode; action?: string }) {
  return <form method="get" action={action} className="flex flex-wrap items-end gap-3">
    {children}<button className="button secondary">Apply filters</button>
  </form>;
}
export function Pages({ path, query, count }: { path: string; query: Query; count: number }) {
  const page = pageOf(query);
  return <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3">
    <span className="muted">Page {page} of {Math.max(1, Math.ceil(count / pageSize))} · {count} records</span>
    <div className="flex gap-2">
      {page > 1 && <Link className="button secondary" href={path + "?" + queryString(query, { page: String(page - 1) })}>Previous</Link>}
      {page * pageSize < count && <Link className="button secondary" href={path + "?" + queryString(query, { page: String(page + 1) })}>Next</Link>}
    </div>
  </nav>;
}
const metricIcons = {
  budget: "M3 7h18v13H3zM5 7V4h14v3m-3 6h2",
  spending: "M4 19h16M6 15l4-5 4 3 5-7m-4 0h4v4",
  remaining: "M12 22a10 10 0 1 1 10-10H12zM15 2v7h7a10 10 0 0 0-7-7z",
  pending: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0zm-10-5v5l3 2",
};

export function Cards({ values }: {
  values: { label: string; value: string; detail?: string; icon?: keyof typeof metricIcons }[];
}) {
  return <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">{values.map(({ label, value, detail, icon }) =>
    <div className="panel metric-card" key={label}>
      <div className="flex items-center gap-3">
        {icon && <span className="metric-icon" data-tone={icon}>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"><path d={metricIcons[icon]}/></svg>
        </span>}
        <p className="muted font-semibold">{label}</p>
      </div>
      <p className="metric-value">{value}</p>
      {detail && <p className="muted mt-1 text-xs">{detail}</p>}
    </div>)}</div>;
}
