import { useState, useMemo, useCallback } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell, ZAxis } from "recharts";
import ChartCard from "@/components/ChartCard";
import DataTable from "@/components/DataTable";
import { getRoles, CHART_COLORS, type SAPRole } from "@/data/demoData";

const tagBadge = (tag: string) => {
  const cls = tag === 'Critical Access' ? 'badge-critical' : tag === 'Optimization Candidate' ? 'badge-dormant' : 'badge-low';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>{tag}</span>;
};

const columns = [
  { key: 'roleId' as const, label: 'Role ID' },
  { key: 'roleName' as const, label: 'Role Name' },
  { key: 'users' as const, label: 'Users' },
  { key: 'tCodes' as const, label: 'TCodes', render: (v: unknown) => (v as number).toLocaleString() },
  { key: 'utilization' as const, label: 'Util %', render: (v: unknown) => `${v}%` },
  { key: 'unused' as const, label: 'Unused', render: (v: unknown) => (v as number).toLocaleString() },
  { key: 'tags' as const, label: 'Tags', render: (v: unknown) => tagBadge(v as string) },
];

export default function RolesPage() {
  const roles = getRoles();
  const [filtered, setFiltered] = useState<SAPRole[]>(roles);
  const handleFilter = useCallback((f: SAPRole[]) => setFiltered(f), []);

  const scatterData = useMemo(() =>
    filtered.map(r => ({ name: r.roleName, users: r.users, utilization: r.utilization, tCodes: r.tCodes })),
    [filtered]
  );

  const unusedData = useMemo(() =>
    filtered.map(r => ({ name: r.roleName.replace('Z_', ''), unused: Math.round((r.unused / r.tCodes) * 100) }))
      .sort((a, b) => b.unused - a.unused).slice(0, 15),
    [filtered]
  );

  return (
    <>
      <div>
        <h1 className="page-header">Role Analytics</h1>
        <p className="page-subheader">{roles.length} roles configured</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Utilization Scatter Plot" subtitle="Users vs Utilization % (bubble = TCodes)">
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,89%)" />
              <XAxis type="number" dataKey="users" name="Users" tick={{ fontSize: 11 }} label={{ value: 'Users', position: 'bottom', fontSize: 11 }} />
              <YAxis type="number" dataKey="utilization" name="Util %" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <ZAxis type="number" dataKey="tCodes" range={[40, 400]} name="TCodes" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ payload }) => {
                if (!payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-card border rounded-md p-2 text-xs shadow-lg">
                    <p className="font-semibold text-foreground">{d.name}</p>
                    <p className="text-muted-foreground">Users: {d.users} | Util: {d.utilization}% | TCodes: {d.tCodes}</p>
                  </div>
                );
              }} />
              <Scatter data={scatterData} fill={CHART_COLORS[1]} fillOpacity={0.7} />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Unused Ratio" subtitle="Top 15 roles by % unused TCodes">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={unusedData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,89%)" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="unused" radius={[0, 4, 4, 0]}>
                {unusedData.map((entry, i) => (
                  <Cell key={i} fill={entry.unused > 50 ? '#d94040' : entry.unused > 30 ? '#f59e0b' : '#2d8a56'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="chart-card">
        <h3 className="text-sm font-semibold text-foreground mb-4">Role Details</h3>
        <DataTable data={roles} columns={columns} searchKeys={['roleId', 'roleName', 'tags']} onFilter={handleFilter} />
      </div>
    </>
  );
}
