import { useState, useMemo } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, LineChart, Line,
} from "recharts";
import { Users, Shield, Terminal, AlertTriangle, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { format, subMonths, subWeeks, eachWeekOfInterval, eachMonthOfInterval, addWeeks, addMonths, isAfter, isBefore, startOfMonth, startOfYear, startOfWeek } from "date-fns";
import StatCard from "@/components/StatCard";
import ChartCard from "@/components/ChartCard";
import Spinner from "@/components/Spinner";
import DateRangeFilter from "@/components/DateRangeFilter";
import { useExcelData } from "@/hooks/useExcelData";
import { computeUtilization, STATUS_COLORS, CHART_COLORS } from "@/data/excelData";

export default function OverviewPage() {
  const { data, loading, error } = useExcelData();
  const [userTrendMode, setUserTrendMode] = useState<'weekly' | 'monthly'>('weekly');
  const [userTrendRange, setUserTrendRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [roleDateRange, setRoleDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [tcodeDateRange, setTcodeDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });

  const users = data?.users || [];
  const roles = data?.roles || [];
  const tCodes = data?.tCodes || [];

  // ── Users by Status (ensure all statuses present) ──
  const statusData = useMemo(() => {
    const allStatuses = ['Active', 'Dormant', 'Inactive', 'Locked but Valid', 'Expired not Locked'];
    const counts: Record<string, number> = {};
    allStatuses.forEach(s => { counts[s] = 0; });
    users.forEach(u => { counts[u.status] = (counts[u.status] || 0) + 1; });
    return allStatuses.map(name => ({ name, value: counts[name] }));
  }, [users]);

  // ── User Activity Trend (with date range support) ──
  const userTrend = useMemo(() => {
    if (!users.length) return [];
    const now = new Date();
    const start = userTrendRange.start || subMonths(now, 6);
    const end = userTrendRange.end || now;
    if (userTrendMode === 'weekly') {
      const weeks = eachWeekOfInterval({ start, end });
      return weeks.map(ws => {
        const we = addWeeks(ws, 1);
        const active = users.filter(u => u.lastLogonDate && isAfter(u.lastLogonDate, ws) && isBefore(u.lastLogonDate, we)).length;
        return { period: format(ws, 'MMM dd'), active, inactive: users.length - active };
      });
    } else {
      const months = eachMonthOfInterval({ start, end });
      return months.map(ms => {
        const me = addMonths(ms, 1);
        const active = users.filter(u => u.lastLogonDate && isAfter(u.lastLogonDate, ms) && isBefore(u.lastLogonDate, me)).length;
        return { period: format(ms, 'MMM yyyy'), active, inactive: users.length - active };
      });
    }
  }, [users, userTrendMode, userTrendRange]);

  // ── Role Stats ──
  const roleStats = useMemo(() => {
    if (!data) return { active: 0, inactive: 0, avgUtil: 0 };
    const roleUsersMap: Record<string, string[]> = {};
    data.raw.userRoles.forEach(ur => {
      const role = String(ur.Role || '').trim();
      const user = String(ur['User Name'] || ur['User name'] || '').trim();
      if (role) { if (!roleUsersMap[role]) roleUsersMap[role] = []; roleUsersMap[role].push(user); }
    });
    let activeCount = 0;
    roles.forEach(r => {
      const usersInRole = roleUsersMap[r.roleName] || [];
      if (users.some(u => usersInRole.includes(u.userId) && u.status === 'Active')) activeCount++;
    });
    const avgUtil = roles.length ? Math.round(roles.reduce((s, r) => s + computeUtilization(r), 0) / roles.length) : 0;
    return { active: activeCount, inactive: roles.length - activeCount, avgUtil };
  }, [data, roles, users]);

  // ── Active vs Inactive Roles Time Series ──
  const roleTimeSeries = useMemo(() => {
    if (!data || !users.length) return [];
    const now = new Date();
    const start = roleDateRange.start || subMonths(now, 6);
    const end = roleDateRange.end || now;
    const roleUsersMap: Record<string, string[]> = {};
    data.raw.userRoles.forEach(ur => {
      const role = String(ur.Role || '').trim();
      const user = String(ur['User Name'] || ur['User name'] || '').trim();
      if (role) { if (!roleUsersMap[role]) roleUsersMap[role] = []; roleUsersMap[role].push(user); }
    });
    const weeks = eachWeekOfInterval({ start, end });
    return weeks.map(ws => {
      const we = addWeeks(ws, 1);
      let active = 0;
      roles.forEach(r => {
        const usersInRole = roleUsersMap[r.roleName] || [];
        if (users.some(u => usersInRole.includes(u.userId) && u.lastLogonDate && isAfter(u.lastLogonDate, ws) && isBefore(u.lastLogonDate, we))) active++;
      });
      return { period: format(ws, 'MMM dd'), active, inactive: roles.length - active };
    });
  }, [data, roles, users, roleDateRange]);

  // ── Unique TCodes by Team (filtered by date) ──
  const uniqueTCodesByTeam = useMemo(() => {
    if (!data) return [];
    const userGroupMap: Record<string, string> = {};
    users.forEach(u => { userGroupMap[u.userId] = u.group; });
    const roleUsersMap: Record<string, string[]> = {};
    data.raw.userRoles.forEach(ur => {
      const role = String(ur.Role || '').trim();
      const user = String(ur['User Name'] || ur['User name'] || '').trim();
      if (role) { if (!roleUsersMap[role]) roleUsersMap[role] = []; roleUsersMap[role].push(user); }
    });

    // Filter transaction logs by date range if set
    const filteredLogs = data.raw.transactionLogs.filter(log => {
      if (!tcodeDateRange.start && !tcodeDateRange.end) return true;
      // Try to parse date from log if available
      const dateVal = log['Date'] || log['date'] || log['Stat. Date'] || log['Start Date'];
      if (!dateVal) return true;
      const d = typeof dateVal === 'number'
        ? new Date(1899, 11, 30 + dateVal)
        : new Date(String(dateVal));
      if (isNaN(d.getTime())) return true;
      if (tcodeDateRange.start && d < tcodeDateRange.start) return false;
      if (tcodeDateRange.end && d > tcodeDateRange.end) return false;
      return true;
    });

    // Build set of executed tcodes from filtered logs
    const filteredTCodeSet = new Set<string>();
    filteredLogs.forEach(log => {
      const val = String(log['Variable Data'] || log['variable data'] || log['Variable data'] || '').trim();
      if (val) filteredTCodeSet.add(val);
    });

    const teamTCodes: Record<string, Set<string>> = {};
    tCodes.forEach(tc => {
      if (!filteredTCodeSet.has(tc.tCode)) return;
      const rolesForTC = roles.filter(r =>
        data.raw.roleTCodes.some(rt =>
          String(rt.Role || '').trim() === r.roleName &&
          String(rt['Authorization value'] || rt['Authorization Value'] || '').trim() === tc.tCode
        )
      );
      rolesForTC.forEach(role => {
        (roleUsersMap[role.roleName] || []).forEach(user => {
          const group = userGroupMap[user] || 'Unknown';
          if (!teamTCodes[group]) teamTCodes[group] = new Set();
          teamTCodes[group].add(tc.tCode);
        });
      });
    });
    return Object.entries(teamTCodes)
      .map(([name, tcodes]) => ({ name, uniqueTCodes: tcodes.size }))
      .sort((a, b) => b.uniqueTCodes - a.uniqueTCodes);
  }, [data, users, roles, tCodes, tcodeDateRange]);

  // ── Criticality ──
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

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} title="Total Users" value={users.length} subtitle={`${activeUsers} active`} />
        <StatCard icon={Shield} title="Roles" value={roles.length} subtitle={`${avgUtil}% avg utilization`} />
        <StatCard icon={Terminal} title="TCodes" value={tCodes.length} subtitle={`${tCodes.filter(t => t.executions > 0).length} executed`} />
        <StatCard icon={AlertTriangle} title="Dormant Users" value={users.filter(u => u.status === 'Dormant').length} subtitle="Require review" />
      </div>

      {/* Users Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Users by Status" subtitle="Distribution including locked & expired states">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,89%)" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {statusData.map(entry => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || CHART_COLORS[0]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="User Activity Trend" subtitle="Active users over time">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className="flex gap-1">
              {(['weekly', 'monthly'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setUserTrendMode(mode)}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${userTrendMode === mode ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:bg-muted'}`}
                >
                  {mode === 'weekly' ? 'Weekly' : 'Monthly'}
                </button>
              ))}
            </div>
            <DateRangeFilter
              onChange={(s, e) => setUserTrendRange({ start: s, end: e })}
              presets={['all', 'this-month', 'this-year', 'custom']}
              label="Range"
            />
          </div>
          {userTrend.length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">No data for this filter criteria</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={userTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,89%)" />
                <XAxis dataKey="period" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="active" name="Active" stroke="#2d8a56" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="inactive" name="Inactive" stroke="#d94040" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Role Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatCard icon={TrendingUp} title="Active Roles" value={roleStats.active} subtitle="With active users" />
        <StatCard icon={TrendingDown} title="Inactive Roles" value={roleStats.inactive} subtitle="No active users" />
        <StatCard icon={Activity} title="Avg Utilization" value={`${roleStats.avgUtil}%`} subtitle="Across all roles" />
      </div>

      <ChartCard title="Active vs Inactive Roles Trend" subtitle="Weekly multi-line time series">
        <div className="mb-3">
          <DateRangeFilter onChange={(s, e) => setRoleDateRange({ start: s, end: e })} />
        </div>
        {roleTimeSeries.length === 0 ? (
          <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">No data for this filter criteria</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={roleTimeSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,89%)" />
              <XAxis dataKey="period" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="active" name="Active Roles" stroke="#2d8a56" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="inactive" name="Inactive Roles" stroke="#d94040" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* TCode & Criticality */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Unique TCodes Executed by Team" subtitle="Distinct TCodes per group (no duplicates)">
          <div className="mb-3">
            <DateRangeFilter
              onChange={(s, e) => setTcodeDateRange({ start: s, end: e })}
              presets={['all', 'this-month', 'last-month', 'custom']}
              label="Filter"
            />
          </div>
          {uniqueTCodesByTeam.length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">No data for this filter criteria</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={uniqueTCodesByTeam}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,89%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="uniqueTCodes" name="Unique TCodes" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]}>
                  {uniqueTCodesByTeam.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Role Tags Breakdown" subtitle="Distribution of role classifications">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={critData} cx="50%" cy="50%" outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {critData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </>
  );
}
