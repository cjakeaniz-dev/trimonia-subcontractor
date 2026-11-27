import Link from "next/link";
import { Fragment } from "react";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  return <nav aria-label="Breadcrumb" className="min-w-0">
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 break-words">
      {trail.map(({ label, href }, index) => <Fragment key={index}>
        <li className="min-w-0">
          {href ? <Link className="muted underline decoration-transparent underline-offset-4 hover:text-[var(--accent)] hover:decoration-current"
            href={href}>{label}</Link> : <span aria-current="page" className="font-semibold">{label}</span>}
        </li>
        {index < trail.length - 1 && <li className="muted" aria-hidden="true">/</li>}
      </Fragment>)}
    </ol>
  </nav>;
}
