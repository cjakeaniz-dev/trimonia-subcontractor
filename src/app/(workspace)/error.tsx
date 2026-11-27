"use client";
import { Button } from "@/components/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section className="panel grid gap-3"><h1>Unable to load this page</h1><div><Button type="button" onClick={reset}>Try again</Button></div></section>;
}
