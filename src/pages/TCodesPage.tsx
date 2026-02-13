import { useState, useMemo, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import ChartCard from "@/components/ChartCard";
import DataTable from "@/components/DataTable";
import Spinner from "@/components/Spinner";
import { useExcelData } from "@/hooks/useExcelData";
import { CHART_COLORS, type SAPTCode } from "@/data/excelData";

const columns = [
  { key: 'tCode' as const, label: 'TCode' },
  { key: 'description' as const, label: 'Description' },
  { key: 'executions' as const, label: 'Executions', render: (v: unknown) => (v as number).toLocaleString() },
  { key: 'users' as const, label: 'Users' },
  { key: 'roles' as const, label: 'Roles' },
];

export default function TCodesPage() {
  const { data, loading, error } = useExcelData();
  const tCodes = data?.tCodes || [];
  const users = data?.users || [];
  const [filtered, setFiltered] = useState<SAPTCode[]>([]);
  const handleFilter = useCallback((f: SAPTCode[]) => setFiltered(f), []);

  const displayFiltered = filtered.length > 0 ? filtered : tCodes;

  // Execution details bar chart - all, scrollable (only excel tcodes)
  const execData = useMemo(() =>
    [...displayFiltered].sort((a, b) => b.executions - a.executions),
    [displayFiltered]
  );

  // Group vs Criticality heatmap
  const heatmapData = useMemo(() => {
    if (!data) return [];
    const groups = [...new Set(users.map(u => u.group).filter(Boolean))];
    
    const tcodeGroupExecs: Record<string, Record<string, number>> = {};
    groups.forEach(g => {
      tcodeGroupExecs[g] = { High: 0, Medium: 0, Low: 0, None: 0 };
    });

    tCodes.forEach(tc => {
      const bucket = tc.executions > 100 ? 'High' : tc.executions > 10 ? 'Medium' : tc.executions > 0 ? 'Low' : 'None';
      
      const tcodeRoles = data.raw.roleTCodes
        .filter(rt => String(rt['Authorization value'] || rt['Authorization Value'] || '').trim() === tc.tCode)
        .map(rt => String(rt.Role || '').trim());
      
      const tcodeUsers = data.raw.userRoles
        .filter(ur => tcodeRoles.includes(String(ur.Role || '').trim()))
        .map(ur => String(ur['User Name'] || ur['User name'] || '').trim());
      
      const relatedGroups = users
        .filter(u => tcodeUsers.includes(u.userId))
        .map(u => u.group);
      
      const uniqueGroups = [...new Set(relatedGroups)];
      if (uniqueGroups.length === 0 && groups.length > 0) {
        if (tcodeGroupExecs[groups[0]]) tcodeGroupExecs[groups[0]][bucket]++;
      } else {
        uniqueGroups.forEach(g => {
          if (tcodeGroupExecs[g]) tcodeGroupExecs[g][bucket]++;
        });
      }
    });

    return groups.map(g => ({
      group: g,
      ...tcodeGroupExecs[g],
    }));
  }, [data, tCodes, users]);

  if (loading) return <Spinner text="Loading transaction code data..." />;
  if (error) return <div className="text-destructive p-4">Error: {error}</div>;

  return (
    <>
      <div>
        <h1 className="page-header">Transaction Code Analytics</h1>
        <p className="page-subheader">{tCodes.length} transaction codes • {tCodes.filter(t => t.executions > 0).length} executed</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Execution Details" subtitle="Executions per TCode (scrollable)">
          <div className="overflow-y-auto" style={{ maxHeight: 350 }}>
            <div style={{ minHeight: Math.max(execData.length * 24, 300) }}>
              <ResponsiveContainer width="100%" height={Math.max(execData.length * 24, 300)}>
                <BarChart data={execData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,89%)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="tCode" width={100} tick={{ fontSize: 9 }} interval={0} />
                  <Tooltip />
                  <Bar dataKey="executions" radius={[0, 4, 4, 0]}>
                    {execData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Group vs Execution Criticality" subtitle="Stacked bar: TCode execution volume by team">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={heatmapData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,89%)" />
              <XAxis dataKey="group" tick={{ fontSize: 10 }} height={60} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="High" stackId="a" fill="#d94040" />
              <Bar dataKey="Medium" stackId="a" fill="#f59e0b" />
              <Bar dataKey="Low" stackId="a" fill="#0ea5e9" />
              <Bar dataKey="None" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="chart-card">
        <h3 className="text-sm font-semibold text-foreground mb-4">TCode Details</h3>
        <DataTable data={tCodes} columns={columns} searchKeys={['tCode', 'description']} onFilter={handleFilter} />
      </div>
    </>
  );
}
