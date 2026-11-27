"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const axisMoney = new Intl.NumberFormat("en-PH", { notation: "compact", maximumFractionDigits: 1 });
const amount = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export function SpendingChart({ rows }: { rows: { code: string; approved: number; pending: number }[] }) {
  if (!rows.length) return <p className="muted py-8 text-center">No active assignments to chart.</p>;
  return <div className="h-72 w-full min-w-0">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} accessibilityLayer margin={{ left: 4, right: 10, top: 6, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4"/>
        <XAxis dataKey="code" tick={{ fill: "var(--muted)", fontSize: 11 }} tickMargin={8}/>
        <YAxis tickFormatter={value => axisMoney.format(value)} tick={{ fill: "var(--muted)", fontSize: 11 }}/>
        <Tooltip cursor={{ fill: "var(--tint)" }} itemStyle={{ color: "var(--foreground)" }} formatter={value => amount.format(Number(value))} contentStyle={{ background: "var(--surface)", borderColor: "var(--border)", borderRadius: 12, color: "var(--foreground)" }}/>
        <Legend formatter={label => <span style={{ color: "var(--muted)" }}>{label}</span>}/>
        <Bar dataKey="approved" name="Approved spending" fill="var(--chart-approved)" radius={[4, 4, 0, 0]} maxBarSize={42} isAnimationActive={false}/>
        <Bar dataKey="pending" name="Pending exposure" fill="var(--chart-pending)" radius={[4, 4, 0, 0]} maxBarSize={42} isAnimationActive={false}/>
      </BarChart>
    </ResponsiveContainer>
  </div>;
}
