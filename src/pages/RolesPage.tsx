import { useState, useMemo, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, RadialBarChart, RadialBar, Legend } from "recharts";
import ChartCard from "@/components/ChartCard";
import DataTable from "@/components/DataTable";
import { useExcelData } from "@/hooks/useExcelData";
import { computeUtilization, CHART_COLORS, type SAPRole } from "@/data/excelData";

const tagBadge = (tag: string) => {
  const cls = tag === 'Critical Access' ? 'badge-critical' : tag === 'Optimization Candidate' ? 'badge-dormant' : 'badge-low';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>{tag}</span>;
};

const columns = [
  { key: 'roleName' as const, label: 'Role Name' },
  { key: 'usersAssigned' as const, label: 'Users' },
  { key: 'tCodes' as const, label: 'TCodes', render: (v: unknown) => (v as number).toLocaleString() },
  { key: 'unused' as const, label: 'Unused', render: (v: unknown) => (v as number).toLocaleString() },
  { key: 'tags' as const, label: 'Tags', render: (v: unknown) => tagBadge(v as string) },
];

export default function RolesPage() {
  const { data, loading, error } = useExcelData();
  const roles = data?.roles || [];
  const [filtered, setFiltered] = useState<SAPRole[]>([]);
  const handleFilter = useCallback((f: SAPRole[]) => setFiltered(f), []);

  const displayFiltered = filtered.length > 0 ? filtered : roles;

  // Utilization radial graph - top 10
  const radialData = useMemo(() =>
    displayFiltered.map(r => ({
      name: r.roleName.length > 15 ? r.roleName.slice(0, 15) + '…' : r.roleName,
      utilization: computeUtilization(r),
      fill: CHART_COLORS[Math.floor(Math.random() * CHART_COLORS.length)],
    }))
    .sort((a, b) => b.utilization - a.utilization)
    .slice(0, 10),
    [displayFiltered]
  );

  // Unused ratio bar chart - all roles, scrollable
  const unusedData = useMemo(() =>
    displayFiltered.map(r => ({
      name: r.roleName,
      unused: r.tCodes > 0 ? Math.round((r.unused / r.tCodes) * 100) : 0,
    })).sort((a, b) => b.unused - a.unused),
    [displayFiltered]
  );

  // Add computed utilization column
  const tableData = useMemo(() =>
    roles.map(r => ({ ...r, utilPct: `${computeUtilization(r)}%` })),
    [roles]
  );

  type RoleWithUtil = SAPRole & { utilPct: string };
  const extendedColumns: { key: keyof RoleWithUtil; label: string; render?: (v: unknown) => React.ReactNode }[] = [
    { key: 'roleName', label: 'Role Name' },
    { key: 'usersAssigned', label: 'Users' },
    { key: 'tCodes', label: 'TCodes', render: (v: unknown) => (v as number).toLocaleString() },
    { key: 'utilPct', label: 'Util %' },
    { key: 'unused', label: 'Unused', render: (v: unknown) => (v as number).toLocaleString() },
    { key: 'tags', label: 'Tags', render: (v: unknown) => tagBadge(v as string) },
  ];

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;
  if (error) return <div className="text-destructive p-4">Error: {error}</div>;

  return (
    <>
      <div>
        <h1 className="page-header">Role Analytics</h1>
        <p className="page-subheader">{roles.length} roles configured</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Utilization Radial Graph" subtitle="Top 10 roles by utilization %">
          <ResponsiveContainer width="100%" height={320}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={radialData} startAngle={180} endAngle={0}>
              <RadialBar
                dataKey="utilization"
                background
                label={{ position: 'insideStart', fill: '#fff', fontSize: 10 }}
              />
              <Legend iconSize={10} layout="vertical" verticalAlign="bottom" />
              <Tooltip formatter={(value: number) => `${value}%`} />
            </RadialBarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Unused Ratio" subtitle="% unused TCodes per role (scrollable)">
          <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
            <div style={{ minHeight: Math.max(unusedData.length * 28, 300) }}>
              <ResponsiveContainer width="100%" height={Math.max(unusedData.length * 28, 300)}>
                <BarChart data={unusedData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,89%)" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 9 }} interval={0} />
                  <Tooltip />
                  <Bar dataKey="unused" radius={[0, 4, 4, 0]}>
                    {unusedData.map((entry, i) => (
                      <Cell key={i} fill={entry.unused > 50 ? '#d94040' : entry.unused > 30 ? '#f59e0b' : '#2d8a56'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </ChartCard>
      </div>

      <div className="chart-card">
        <h3 className="text-sm font-semibold text-foreground mb-4">Role Details</h3>
        <div className="overflow-y-auto" style={{ maxHeight: 500 }}>
          <DataTable data={tableData} columns={extendedColumns as any} searchKeys={['roleName', 'tags'] as any} onFilter={handleFilter as any} />
        </div>
      </div>
    </>
  );
}
