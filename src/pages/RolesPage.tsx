import { useState, useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import DataTable from "@/components/DataTable";
import Spinner from "@/components/Spinner";
import DateRangeFilter from "@/components/DateRangeFilter";
import RoleDetailDialog from "@/components/RoleDetailDialog";
import UnusedRolesDialog from "@/components/UnusedRolesDialog";
import { Button } from "@/components/ui/button";
import { useExcelData } from "@/hooks/useExcelData";
import { type SAPRole } from "@/data/excelData";

const tagBadge = (tag: string) => {
  const cls = tag === 'Critical Access' ? 'badge-critical' : tag === 'Optimization Candidate' ? 'badge-dormant' : 'badge-low';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>{tag}</span>;
};

export default function RolesPage() {
  const { data, loading, error } = useExcelData();
  const allRoles = useMemo(() => (data?.roles || []).filter(r => r.roleName !== 'Z:COPY_SAP_ALL'), [data]);

  const [topN, setTopN] = useState<number | null>(null);
  const [showUnused, setShowUnused] = useState(false);
  const [selectedRole, setSelectedRole] = useState<SAPRole | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });

  // Build executed tcode set filtered by date range
  const filteredExecutedTCodes = useMemo(() => {
    if (!data) return new Set<string>();
    const logs = data.raw.transactionLogs;
    const set = new Set<string>();
    logs.forEach(log => {
      // Date filter
      if (dateRange.start || dateRange.end) {
        const dateVal = (log as Record<string, unknown>)['Date'] || (log as Record<string, unknown>)['date'] || (log as Record<string, unknown>)['Stat. Date'] || (log as Record<string, unknown>)['Start Date'];
        if (dateVal) {
          const d = typeof dateVal === 'number'
            ? new Date(1899, 11, 30 + (dateVal as number))
            : new Date(String(dateVal));
          if (!isNaN(d.getTime())) {
            if (dateRange.start && d < dateRange.start) return;
            if (dateRange.end && d > dateRange.end) return;
          }
        }
      }
      const val = String(log['Variable Data'] || (log as Record<string, unknown>)['variable data'] || (log as Record<string, unknown>)['Variable data'] || '').trim();
      if (val) set.add(val);
    });
    return set;
  }, [data, dateRange]);

  // Recalculate utilization per role based on filtered executed tcodes
  const rolesWithUtil = useMemo(() => {
    if (!data) return [];
    const roleTCodeMap: Record<string, Set<string>> = {};
    data.raw.roleTCodes.forEach(rt => {
      const role = String(rt.Role || '').trim();
      const tcode = String(rt['Authorization value'] || (rt as Record<string, unknown>)['Authorization Value'] || '').trim();
      if (role && tcode) {
        if (!roleTCodeMap[role]) roleTCodeMap[role] = new Set();
        roleTCodeMap[role].add(tcode);
      }
    });

    return allRoles.map(r => {
      const tcodesForRole = roleTCodeMap[r.roleName] || new Set<string>();
      const tCodeCount = tcodesForRole.size;
      let unused = 0;
      tcodesForRole.forEach(tc => {
        if (!filteredExecutedTCodes.has(tc)) unused++;
      });
      unused = Math.min(unused, tCodeCount);
      const utilPct = tCodeCount > 0 ? Math.round(((tCodeCount - unused) / tCodeCount) * 100) : 0;
      return { ...r, tCodes: tCodeCount, unused, utilPct };
    });
  }, [allRoles, data, filteredExecutedTCodes]);

  // Sort by utilization % (highest to lowest), then apply topN
  const sortedRoles = useMemo(() => {
    let result = [...rolesWithUtil].sort((a, b) => b.utilPct - a.utilPct);
    if (topN) result = result.slice(0, topN);
    return result;
  }, [rolesWithUtil, topN]);

  const unusedRoles = useMemo(() => rolesWithUtil.filter(r => r.utilPct === 0), [rolesWithUtil]);

  type RoleRow = typeof sortedRoles[number];
  const tableData = useMemo(() =>
    sortedRoles.map(r => ({ ...r, utilPctStr: `${r.utilPct}%` })),
    [sortedRoles]
  );

  const extendedColumns: { key: string; label: string; render?: (v: unknown, row: unknown) => React.ReactNode }[] = [
    { key: 'roleName', label: 'Role Name' },
    { key: 'usersAssigned', label: 'Users' },
    { key: 'tCodes', label: 'TCodes', render: (v: unknown) => (v as number).toLocaleString() },
    { key: 'utilPctStr', label: 'Util %' },
    {
      key: 'unused', label: 'Unused', render: (v: unknown, row: unknown) => {
        const num = v as number;
        const r = row as RoleRow;
        const pct = r.tCodes > 0 ? Math.round((num / r.tCodes) * 100) : 0;
        return (
          <span title={`${pct}% of TCodes are unused`} className="cursor-help underline decoration-dotted decoration-muted-foreground">
            {num.toLocaleString()}
          </span>
        );
      }
    },
    { key: 'tags', label: 'Tags', render: (v: unknown) => tagBadge(v as string) },
  ];

  if (loading) return <Spinner text="Loading role data..." />;
  if (error) return <div className="text-destructive p-4">Error: {error}</div>;

  return (
    <>
      <div>
        <h1 className="page-header">Role Analytics</h1>
        <p className="page-subheader">{allRoles.length} roles configured (excl. Z:COPY_SAP_ALL)</p>
      </div>

      {/* Filters */}
      <div className="chart-card flex flex-wrap items-center gap-4">
        <DateRangeFilter
          onChange={(s, e) => setDateRange({ start: s, end: e })}
          presets={['all', 'this-month', 'last-3-months', 'this-year', 'custom']}
          label="Date"
        />

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Show:</span>
          {[null, 10, 20, 50].map(n => (
            <button
              key={n ?? 'all'}
              onClick={() => setTopN(n)}
              className={cn(
                "px-2 py-1 text-xs rounded border transition-colors",
                topN === n
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:bg-muted"
              )}
            >
              {n ? `Top ${n}` : 'All'}
            </button>
          ))}
        </div>

        <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowUnused(true)}>
          <AlertTriangle className="h-3 w-3 mr-1" /> Unused Roles ({unusedRoles.length})
        </Button>
      </div>

      {/* Table */}
      <div className="chart-card">
        <h3 className="text-sm font-semibold text-foreground mb-4">Role Details</h3>
        {tableData.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">No data for this filter criteria</div>
        ) : (
          <DataTable
            data={tableData}
            columns={extendedColumns as any}
            searchKeys={['roleName', 'tags'] as any}
            onRowClick={(row) => setSelectedRole(row as unknown as SAPRole)}
          />
        )}
      </div>

      {/* Dialogs */}
      {showUnused && <UnusedRolesDialog roles={unusedRoles} onClose={() => setShowUnused(false)} />}
      {selectedRole && data && (
        <RoleDetailDialog role={selectedRole} data={data} onClose={() => setSelectedRole(null)} />
      )}
    </>
  );
}
