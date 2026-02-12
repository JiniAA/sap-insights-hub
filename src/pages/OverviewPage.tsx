import { useMemo } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Users, Shield, Terminal, AlertTriangle } from "lucide-react";
import StatCard from "@/components/StatCard";
import ChartCard from "@/components/ChartCard";
import { getUsers, getRoles, getTCodes, STATUS_COLORS, CHART_COLORS, MODULE_COLORS, CRITICALITY_COLORS } from "@/data/demoData";

export default function OverviewPage() {
  const users = getUsers();
  const roles = getRoles();
  const tCodes = getTCodes();

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach(u => { counts[u.status] = (counts[u.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [users]);

  const roleUtilData = useMemo(() =>
    roles.map(r => ({ name: r.roleName.replace('Z_', ''), utilization: r.utilization }))
      .sort((a, b) => b.utilization - a.utilization).slice(0, 15),
    [roles]
  );

  const moduleExecData = useMemo(() => {
    const agg: Record<string, number> = {};
    tCodes.forEach(t => { agg[t.module] = (agg[t.module] || 0) + t.executions; });
    return Object.entries(agg).map(([name, executions]) => ({ name, executions })).sort((a, b) => b.executions - a.executions);
  }, [tCodes]);

  const critData = useMemo(() => {
    const counts: Record<string, number> = {};
    tCodes.forEach(t => { counts[t.criticality] = (counts[t.criticality] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [tCodes]);

  const activeUsers = users.filter(u => u.status === 'Active').length;
  const criticalTCodes = tCodes.filter(t => t.criticality === 'Critical').length;
  const avgUtil = Math.round(roles.reduce((s, r) => s + r.utilization, 0) / roles.length);

  return (
    <>
      <div>
        <h1 className="page-header">Dashboard Overview</h1>
        <p className="page-subheader">SAP system analytics at a glance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} title="Total Users" value={users.length} subtitle={`${activeUsers} active`} />
        <StatCard icon={Shield} title="Roles" value={roles.length} subtitle={`${avgUtil}% avg utilization`} />
        <StatCard icon={Terminal} title="TCodes" value={tCodes.length} subtitle={`${criticalTCodes} critical`} />
        <StatCard icon={AlertTriangle} title="Dormant Users" value={users.filter(u => u.status === 'Dormant').length} subtitle="Require review" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Users by Status" subtitle="Distribution of user account states">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {statusData.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || CHART_COLORS[0]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Role Utilization Distribution" subtitle="Top 15 roles by utilization %">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={roleUtilData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,89%)" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="utilization" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="TCode Executions by Module" subtitle="Aggregated execution counts">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={moduleExecData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,89%)" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="executions" radius={[0, 4, 4, 0]}>
                {moduleExecData.map((entry) => (
                  <Cell key={entry.name} fill={MODULE_COLORS[entry.name] || CHART_COLORS[0]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Criticality Breakdown" subtitle="TCode criticality distribution">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={critData} cx="50%" cy="50%" outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {critData.map((entry) => (
                  <Cell key={entry.name} fill={CRITICALITY_COLORS[entry.name] || CHART_COLORS[0]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </>
  );
}
