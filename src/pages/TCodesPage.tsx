import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, Legend, LabelList } from "recharts";
import { cn } from "@/lib/utils";
import ChartCard from "@/components/ChartCard";
import DataTable from "@/components/DataTable";
import Spinner from "@/components/Spinner";
import DateRangeFilter from "@/components/DateRangeFilter";
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

  const [topN, setTopN] = useState<number>(10);
  const [tableDateRange, setTableDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });

  const totalExec = useMemo(() => tCodes.reduce((s, t) => s + t.executions, 0), [tCodes]);

  // Charts always use full dataset, with topN slice
  const execData = useMemo(() => {
    const sorted = [...tCodes].sort((a, b) => b.executions - a.executions);
    return sorted.slice(0, topN).map(t => ({
      ...t,
      pct: totalExec > 0 ? `${((t.executions / totalExec) * 100).toFixed(1)}%` : '0%',
    }));
  }, [tCodes, topN, totalExec]);

  const heatmapData = useMemo(() => {
    if (!data) return [];
    const groups = [...new Set(users.map(u => u.group).filter(Boolean))];
    const tcodeGroupExecs: Record<string, Record<string, number>> = {};
    groups.forEach(g => { tcodeGroupExecs[g] = { High: 0, Medium: 0, Low: 0, None: 0 }; });

    tCodes.forEach(tc => {
      const bucket = tc.executions > 100 ? 'High' : tc.executions > 10 ? 'Medium' : tc.executions > 0 ? 'Low' : 'None';
      const tcodeRoles = data.raw.roleTCodes
        .filter(rt => String(rt['Authorization value'] || rt['Authorization Value'] || '').trim() === tc.tCode)
        .map(rt => String(rt.Role || '').trim());
      const tcodeUsers = data.raw.userRoles
        .filter(ur => tcodeRoles.includes(String(ur.Role || '').trim()))
        .map(ur => String(ur['User Name'] || ur['User name'] || '').trim());
      const relatedGroups = [...new Set(users.filter(u => tcodeUsers.includes(u.userId)).map(u => u.group))];
      if (relatedGroups.length === 0 && groups.length > 0) {
        if (tcodeGroupExecs[groups[0]]) tcodeGroupExecs[groups[0]][bucket]++;
      } else {
        relatedGroups.forEach(g => { if (tcodeGroupExecs[g]) tcodeGroupExecs[g][bucket]++; });
      }
    });

    return groups.map(g => ({ group: g, ...tcodeGroupExecs[g] }));
  }, [data, tCodes, users]);

  // Filter table data by date range
  const filteredTableData = useMemo(() => {
    if (!tableDateRange.start && !tableDateRange.end) return tCodes;
    if (!data) return tCodes;

    // Build execution counts from filtered transaction logs
    const filteredCounts: Record<string, number> = {};
    data.raw.transactionLogs.forEach(log => {
      const dateVal = log['Date'] || log['date'] || log['Stat. Date'] || log['Start Date'];
      if (dateVal) {
        const d = typeof dateVal === 'number'
          ? new Date(1899, 11, 30 + dateVal)
          : new Date(String(dateVal));
        if (!isNaN(d.getTime())) {
          if (tableDateRange.start && d < tableDateRange.start) return;
          if (tableDateRange.end && d > tableDateRange.end) return;
        }
      }
      const val = String(log['Variable Data'] || log['variable data'] || log['Variable data'] || '').trim();
      if (val) filteredCounts[val] = (filteredCounts[val] || 0) + 1;
    });

    // Return tcodes with filtered execution counts
    return tCodes.map(tc => ({
      ...tc,
      executions: filteredCounts[tc.tCode] || 0,
    })).filter(tc => tc.executions > 0);
  }, [tCodes, tableDateRange, data]);

  if (loading) return <Spinner text="Loading transaction code data..." />;
  if (error) return <div className="text-destructive p-4">Error: {error}</div>;

  return (
    <>
      <div>
        <h1 className="page-header">Transaction Code Analytics</h1>
        <p className="page-subheader">{tCodes.length} transaction codes • {tCodes.filter(t => t.executions > 0).length} executed</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Execution Details" subtitle="Top TCodes by execution count">
          <div className="flex gap-1 mb-3">
            {[10, 20, 50].map(n => (
              <button
                key={n}
                onClick={() => setTopN(n)}
                className={cn(
                  "px-2 py-1 text-xs rounded border transition-colors",
                  topN === n
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:bg-muted"
                )}
              >
                Top {n}
              </button>
            ))}
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 350 }}>
            <div style={{ minHeight: Math.max(execData.length * 28, 300) }}>
              <ResponsiveContainer width="100%" height={Math.max(execData.length * 28, 300)}>
                <BarChart data={execData} layout="vertical" margin={{ left: 10, right: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,89%)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="tCode" width={100} tick={{ fontSize: 9 }} interval={0} />
                  <Tooltip />
                  <Bar dataKey="executions" radius={[0, 4, 4, 0]}>
                    {execData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                    <LabelList dataKey="pct" position="right" style={{ fontSize: 9, fill: 'hsl(220,10%,46%)' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Group vs Execution Criticality" subtitle="TCode execution volume by team">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={heatmapData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,89%)" />
              <XAxis dataKey="group" tick={{ fontSize: 10 }} height={60} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="High" stackId="a" fill="#d94040" name="High (>100 executions)" />
              <Bar dataKey="Medium" stackId="a" fill="#f59e0b" name="Medium (11-100)" />
              <Bar dataKey="Low" stackId="a" fill="#0ea5e9" name="Low (1-10)" />
              <Bar dataKey="None" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} name="None (0 executions)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="chart-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">TCode Details</h3>
          <DateRangeFilter
            onChange={(s, e) => setTableDateRange({ start: s, end: e })}
            presets={['all', 'this-month', 'last-month', 'custom']}
            label="Date"
          />
        </div>
        {filteredTableData.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">No data for this filter criteria</div>
        ) : (
          <DataTable data={filteredTableData} columns={columns} searchKeys={['tCode', 'description']} />
        )}
      </div>
    </>
  );
}
