import { useState, useMemo, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import ChartCard from "@/components/ChartCard";
import DataTable from "@/components/DataTable";
import { getTCodes, CHART_COLORS, MODULE_COLORS, CRITICALITY_COLORS, type SAPTCode } from "@/data/demoData";

const critBadge = (c: string) => {
  const cls = c === 'Critical' ? 'badge-critical' : c === 'High' ? 'badge-high' : c === 'Medium' ? 'badge-medium' : 'badge-low';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>{c}</span>;
};

const columns = [
  { key: 'tCode' as const, label: 'TCode' },
  { key: 'description' as const, label: 'Description' },
  { key: 'module' as const, label: 'Module' },
  { key: 'criticality' as const, label: 'Criticality', render: (v: unknown) => critBadge(v as string) },
  { key: 'executions' as const, label: 'Executions', render: (v: unknown) => (v as number).toLocaleString() },
  { key: 'users' as const, label: 'Users' },
  { key: 'roles' as const, label: 'Roles' },
];

export default function TCodesPage() {
  const tCodes = getTCodes();
  const [filtered, setFiltered] = useState<SAPTCode[]>(tCodes);
  const handleFilter = useCallback((f: SAPTCode[]) => setFiltered(f), []);

  const leaderboard = useMemo(() =>
    [...filtered].sort((a, b) => b.executions - a.executions).slice(0, 15)
      .map(t => ({ name: t.tCode, executions: t.executions, module: t.module })),
    [filtered]
  );

  // Heatmap data: module vs criticality
  const heatmapData = useMemo(() => {
    const modules = ['FI', 'MM', 'SD', 'HR', 'BASIS'];
    const crits = ['Critical', 'High', 'Medium', 'Low'];
    return modules.map(mod => {
      const row: Record<string, string | number> = { module: mod };
      crits.forEach(c => {
        row[c] = filtered.filter(t => t.module === mod && t.criticality === c).length;
      });
      return row;
    });
  }, [filtered]);

  return (
    <>
      <div>
        <h1 className="page-header">Transaction Code Analytics</h1>
        <p className="page-subheader">{tCodes.length} transaction codes across {new Set(tCodes.map(t => t.module)).size} modules</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Executions Leaderboard" subtitle="Top 15 most executed TCodes">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={leaderboard} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,89%)" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="executions" radius={[0, 4, 4, 0]}>
                {leaderboard.map((entry, i) => (
                  <Cell key={i} fill={MODULE_COLORS[entry.module] || CHART_COLORS[0]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Module vs Criticality" subtitle="Stacked bar showing criticality per module">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={heatmapData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,89%)" />
              <XAxis dataKey="module" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="Critical" stackId="a" fill={CRITICALITY_COLORS.Critical} />
              <Bar dataKey="High" stackId="a" fill={CRITICALITY_COLORS.High} />
              <Bar dataKey="Medium" stackId="a" fill={CRITICALITY_COLORS.Medium} />
              <Bar dataKey="Low" stackId="a" fill={CRITICALITY_COLORS.Low} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="chart-card">
        <h3 className="text-sm font-semibold text-foreground mb-4">TCode Details</h3>
        <DataTable data={tCodes} columns={columns} searchKeys={['tCode', 'description', 'module', 'criticality']} onFilter={handleFilter} />
      </div>
    </>
  );
}
