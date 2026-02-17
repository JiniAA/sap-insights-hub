import { useState, useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { X } from "lucide-react";
import ChartCard from "@/components/ChartCard";
import DataTable from "@/components/DataTable";
import Spinner from "@/components/Spinner";
import { useExcelData } from "@/hooks/useExcelData";
import { CHART_COLORS, type SAPUser } from "@/data/excelData";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const STATUS_OPTIONS: SAPUser['status'][] = ['Active', 'Dormant', 'Inactive', 'Locked but Valid', 'Expired not Locked'];

const statusBadge = (status: string) => {
  const cls =
    status === 'Active' ? 'badge-active' :
    status === 'Dormant' ? 'badge-dormant' :
    status === 'Locked but Valid' ? 'badge-locked-valid' :
    status === 'Expired not Locked' ? 'badge-expired-not-locked' :
    'badge-expired';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>{status}</span>;
};

const columns: { key: keyof SAPUser; label: string; render?: (v: unknown) => React.ReactNode }[] = [
  { key: 'userId', label: 'User ID' },
  { key: 'group', label: 'Group' },
  { key: 'validTo', label: 'Valid To' },
  { key: 'status', label: 'Status', render: (v) => statusBadge(v as string) },
  { key: 'lastLogon', label: 'Last Logon' },
];

export default function UsersPage() {
  const { data, loading, error } = useExcelData();
  const users = data?.users || [];

  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('all');

  const teams = useMemo(() => [...new Set(users.map(u => u.group).filter(Boolean))].sort(), [users]);

  const filteredUsers = useMemo(() => {
    let result = users;
    if (selectedStatuses.length > 0) {
      result = result.filter(u => selectedStatuses.includes(u.status));
    }
    if (selectedTeam !== 'all') {
      result = result.filter(u => u.group === selectedTeam);
    }
    return result;
  }, [users, selectedStatuses, selectedTeam]);

  // Charts always use full dataset
  const groupData = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach(u => { if (u.group) counts[u.group] = (counts[u.group] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [users]);

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const clearFilters = () => {
    setSelectedStatuses([]);
    setSelectedTeam('all');
  };

  const hasFilters = selectedStatuses.length > 0 || selectedTeam !== 'all';

  if (loading) return <Spinner text="Loading user data..." />;
  if (error) return <div className="text-destructive p-4">Error: {error}</div>;

  return (
    <>
      <div>
        <h1 className="page-header">User Analytics</h1>
        <p className="page-subheader">{users.length} users across {teams.length} groups</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Group Membership" subtitle="User distribution by group">
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie data={groupData} cx="50%" cy="50%" outerRadius={130} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {groupData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Filters + Table */}
      <div className="chart-card">
        <div className="flex flex-wrap items-center gap-4 mb-4 pb-4 border-b border-border">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">Status:</span>
            {STATUS_OPTIONS.map(status => (
              <label key={status} className="flex items-center gap-1.5 text-xs cursor-pointer text-foreground">
                <Checkbox
                  checked={selectedStatuses.includes(status)}
                  onCheckedChange={() => toggleStatus(status)}
                />
                {status}
              </label>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Team:</span>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7">
              <X className="h-3 w-3 mr-1" /> Clear Filters
            </Button>
          )}
        </div>

        <h3 className="text-sm font-semibold text-foreground mb-4">
          User Details {hasFilters && <span className="text-muted-foreground font-normal">({filteredUsers.length} of {users.length})</span>}
        </h3>
        {filteredUsers.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">No data for this filter criteria</div>
        ) : (
          <DataTable data={filteredUsers} columns={columns} searchKeys={['userId', 'group', 'status']} />
        )}
      </div>
    </>
  );
}
