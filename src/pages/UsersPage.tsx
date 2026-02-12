import { useState, useMemo, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import ChartCard from "@/components/ChartCard";
import DataTable from "@/components/DataTable";
import { getUsers, STATUS_COLORS, CHART_COLORS, type SAPUser } from "@/data/demoData";

const statusBadge = (status: string) => {
  const cls = status === 'Active' ? 'badge-active' : status === 'Dormant' ? 'badge-dormant' : 'badge-expired';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>{status}</span>;
};

const columns = [
  { key: 'userId' as const, label: 'User ID' },
  { key: 'name' as const, label: 'Name' },
  { key: 'group' as const, label: 'Group' },
  { key: 'status' as const, label: 'Status', render: (v: unknown) => statusBadge(v as string) },
  { key: 'executions' as const, label: 'Executions', render: (v: unknown) => (v as number).toLocaleString() },
  { key: 'lastLogon' as const, label: 'Last Logon' },
  { key: 'tags' as const, label: 'Tags' },
];

export default function UsersPage() {
  const users = getUsers();
  const [filtered, setFiltered] = useState<SAPUser[]>(users);
  const handleFilter = useCallback((f: SAPUser[]) => setFiltered(f), []);

  const execBuckets = useMemo(() => {
    const buckets = [
      { range: '0-100', min: 0, max: 100 },
      { range: '101-500', min: 101, max: 500 },
      { range: '501-1000', min: 501, max: 1000 },
      { range: '1001-2500', min: 1001, max: 2500 },
      { range: '2500+', min: 2501, max: Infinity },
    ];
    return buckets.map(b => ({
      range: b.range,
      count: filtered.filter(u => u.executions >= b.min && u.executions <= b.max).length,
    }));
  }, [filtered]);

  const groupData = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach(u => { counts[u.group] = (counts[u.group] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  return (
    <>
      <div>
        <h1 className="page-header">User Analytics</h1>
        <p className="page-subheader">{users.length} users across {new Set(users.map(u => u.group)).size} groups</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Executions Distribution" subtitle="User execution count histogram">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={execBuckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,89%)" />
              <XAxis dataKey="range" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Group Membership" subtitle="User distribution by group">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={groupData} cx="50%" cy="50%" outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {groupData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="chart-card">
        <h3 className="text-sm font-semibold text-foreground mb-4">User Details</h3>
        <DataTable data={users} columns={columns} searchKeys={['userId', 'name', 'group', 'tags']} onFilter={handleFilter} />
      </div>
    </>
  );
}
