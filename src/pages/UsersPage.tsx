import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie } from "recharts";
import ChartCard from "@/components/ChartCard";
import DataTable from "@/components/DataTable";
import Spinner from "@/components/Spinner";
import { useExcelData } from "@/hooks/useExcelData";
import { STATUS_COLORS, CHART_COLORS, type SAPUser } from "@/data/excelData";

const statusBadge = (status: string) => {
  const cls = status === 'Active' ? 'badge-active' : status === 'Dormant' ? 'badge-dormant' : 'badge-expired';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>{status}</span>;
};

const columns = [
  { key: 'userId' as const, label: 'User ID' },
  { key: 'group' as const, label: 'Group' },
  { key: 'validTo' as const, label: 'Valid To' },
  { key: 'status' as const, label: 'Status', render: (v: unknown) => statusBadge(v as string) },
  { key: 'lastLogon' as const, label: 'Last Logon' },
];

export default function UsersPage() {
  const { data, loading, error } = useExcelData();
  const users = data?.users || [];

  // Charts always use full dataset
  const statusHist = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach(u => { counts[u.status] = (counts[u.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [users]);

  const groupData = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach(u => { if (u.group) counts[u.group] = (counts[u.group] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [users]);

  if (loading) return <Spinner text="Loading user data..." />;
  if (error) return <div className="text-destructive p-4">Error: {error}</div>;

  return (
    <>
      <div>
        <h1 className="page-header">User Analytics</h1>
        <p className="page-subheader">{users.length} users across {new Set(users.map(u => u.group)).size} groups</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="User Status Histogram" subtitle="Count of users by status">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={statusHist}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,89%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {statusHist.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || CHART_COLORS[0]} />
                ))}
              </Bar>
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
        <DataTable data={users} columns={columns} searchKeys={['userId', 'group', 'status']} />
      </div>
    </>
  );
}
