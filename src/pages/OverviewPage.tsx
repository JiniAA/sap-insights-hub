import { useMemo } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Users, Shield, Terminal, AlertTriangle } from "lucide-react";
import StatCard from "@/components/StatCard";
import ChartCard from "@/components/ChartCard";
import Spinner from "@/components/Spinner";
import { useExcelData } from "@/hooks/useExcelData";
import { computeUtilization, STATUS_COLORS, CHART_COLORS } from "@/data/excelData";

export default function OverviewPage() {
  const { data, loading, error } = useExcelData();

  const users = data?.users || [];
  const roles = data?.roles || [];
  const tCodes = data?.tCodes || [];

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach(u => { counts[u.status] = (counts[u.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [users]);

  // Role utilization distribution - all roles
  const roleUtilData = useMemo(() =>
    roles.map(r => ({ name: r.roleName, utilization: computeUtilization(r) }))
      .sort((a, b) => b.utilization - a.utilization),
    [roles]
  );

  // TCode executions by group (team)
  const execByTeam = useMemo(() => {
    if (!data) return [];
    const userGroupMap: Record<string, string> = {};
    users.forEach(u => { userGroupMap[u.userId] = u.group; });

    const roleUsersMap: Record<string, string[]> = {};
    data.raw.userRoles.forEach(ur => {
      const role = String(ur.Role || '').trim();
      const user = String(ur['User Name'] || ur['User name'] || '').trim();
      if (role) {
        if (!roleUsersMap[role]) roleUsersMap[role] = [];
        roleUsersMap[role].push(user);
      }
    });

    const teamExecs: Record<string, number> = {};
    tCodes.forEach(tc => {
      const rolesForTCode = roles.filter(r => {
        return data.raw.roleTCodes.some(rt =>
          String(rt.Role || '').trim() === r.roleName &&
          String(rt['Authorization value'] || rt['Authorization Value'] || '').trim() === tc.tCode
        );
      });

      rolesForTCode.forEach(role => {
        const usersInRole = roleUsersMap[role.roleName] || [];
        usersInRole.forEach(user => {
          const group = userGroupMap[user] || 'Unknown';
          teamExecs[group] = (teamExecs[group] || 0) + tc.executions;
        });
      });
    });

    if (Object.keys(teamExecs).length === 0) {
      const groups = [...new Set(users.map(u => u.group).filter(Boolean))];
      const perGroup = Math.round(tCodes.reduce((s, t) => s + t.executions, 0) / Math.max(groups.length, 1));
      groups.forEach(g => { teamExecs[g] = perGroup; });
    }

    return Object.entries(teamExecs)
      .map(([name, executions]) => ({ name, executions }))
      .sort((a, b) => b.executions - a.executions);
  }, [data, users, roles, tCodes]);

  const critData = useMemo(() => {
    const counts: Record<string, number> = {};
    roles.forEach(r => { counts[r.tags] = (counts[r.tags] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [roles]);

  const activeUsers = users.filter(u => u.status === 'Active').length;
  const avgUtil = roles.length ? Math.round(roles.reduce((s, r) => s + computeUtilization(r), 0) / roles.length) : 0;

  if (loading) return <Spinner text="Loading data from Excel..." />;
  if (error) return <div className="text-destructive p-4">Error loading data: {error}</div>;

  return (
    <>
      <div>
        <h1 className="page-header">Dashboard Overview</h1>
        <p className="page-subheader">SAP system analytics at a glance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} title="Total Users" value={users.length} subtitle={`${activeUsers} active`} />
        <StatCard icon={Shield} title="Roles" value={roles.length} subtitle={`${avgUtil}% avg utilization`} />
        <StatCard icon={Terminal} title="TCodes" value={tCodes.length} subtitle={`${tCodes.filter(t => t.executions > 0).length} executed`} />
        <StatCard icon={AlertTriangle} title="Dormant Users" value={users.filter(u => u.status === 'Dormant').length} subtitle="Require review" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1️⃣ Users by Status - Vertical Bar Chart (scrollable) */}
        <ChartCard title="Users by Status" subtitle="Distribution of user account states">
          <div className="overflow-x-auto">
            <div style={{ minWidth: Math.max(statusData.length * 120, 300) }}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,89%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || CHART_COLORS[0]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </ChartCard>

        {/* 2️⃣ Role Utilization - Horizontal Bar Chart (scrollable) */}
        <ChartCard title="Role Utilization Distribution" subtitle="Utilization % per role (scrollable)">
          <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
            <div style={{ minHeight: Math.max(roleUtilData.length * 28, 300) }}>
              <ResponsiveContainer width="100%" height={Math.max(roleUtilData.length * 28, 300)}>
                <BarChart data={roleUtilData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,89%)" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 9 }} interval={0} />
                  <Tooltip />
                  <Bar dataKey="utilization" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </ChartCard>

        {/* 3️⃣ TCode Executions by Team - Vertical Bar Chart */}
        <ChartCard title="TCode Executions by Team" subtitle="Aggregated execution counts by group">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={execByTeam}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,89%)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} height={60} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="executions" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]}>
                {execByTeam.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 4️⃣ Criticality Breakdown - Pie Chart */}
        <ChartCard title="Role Tags Breakdown" subtitle="Distribution of role classifications">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={critData} cx="50%" cy="50%" outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {critData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
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
