import Link from "next/link";

export default function NotFound() {
  return <section className="panel mx-auto my-8 max-w-xl"><h1>Page unavailable</h1><p className="muted my-4">The page could not be found or you do not have access.</p><Link className="button" href="/dashboard">Go to dashboard</Link></section>;
}
