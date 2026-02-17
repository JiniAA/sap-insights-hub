import { useState, useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import ChartCard from "@/components/ChartCard";
import DataTable from "@/components/DataTable";
import Spinner from "@/components/Spinner";
import DateRangeFilter from "@/components/DateRangeFilter";
import RoleDetailDialog from "@/components/RoleDetailDialog";
import UnusedRolesDialog from "@/components/UnusedRolesDialog";
import { Button } from "@/components/ui/button";
import { useExcelData } from "@/hooks/useExcelData";
import { computeUtilization, type SAPRole } from "@/data/excelData";

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

  // Sort by utilization % (highest to lowest)
  const sortedRoles = useMemo(() => {
    let result = [...allRoles].sort((a, b) => computeUtilization(b) - computeUtilization(a));
    if (topN) result = result.slice(0, topN);
    return result;
  }, [allRoles, topN]);

  const unusedRoles = useMemo(() => allRoles.filter(r => computeUtilization(r) === 0), [allRoles]);

  type RoleWithUtil = SAPRole & { utilPct: string };
  const tableData = useMemo(() =>
    sortedRoles.map(r => ({ ...r, utilPct: `${computeUtilization(r)}%` })),
    [sortedRoles]
  );

  const extendedColumns: { key: keyof RoleWithUtil; label: string; render?: (v: unknown, row: unknown) => React.ReactNode }[] = [
    { key: 'roleName', label: 'Role Name' },
    { key: 'usersAssigned', label: 'Users' },
    { key: 'tCodes', label: 'TCodes', render: (v: unknown) => (v as number).toLocaleString() },
    { key: 'utilPct', label: 'Util %' },
    {
      key: 'unused', label: 'Unused', render: (v: unknown, row: unknown) => {
        const num = v as number;
        const r = row as RoleWithUtil;
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

        <DateRangeFilter
          onChange={(s, e) => setDateRange({ start: s, end: e })}
          presets={['all', 'this-month', 'last-3-months', 'this-year', 'custom']}
          label="Date"
        />

        <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowUnused(true)}>
          <AlertTriangle className="h-3 w-3 mr-1" /> Unused Roles ({unusedRoles.length})
        </Button>
      </div>

      {/* Table */}
      <div className="chart-card">
        <h3 className="text-sm font-semibold text-foreground mb-4">Role Details</h3>
        <DataTable
          data={tableData}
          columns={extendedColumns as any}
          searchKeys={['roleName', 'tags'] as any}
          onRowClick={(row) => setSelectedRole(row as unknown as SAPRole)}
        />
      </div>

      {/* Dialogs */}
      {showUnused && <UnusedRolesDialog roles={unusedRoles} onClose={() => setShowUnused(false)} />}
      {selectedRole && data && (
        <RoleDetailDialog role={selectedRole} data={data} onClose={() => setSelectedRole(null)} />
      )}
    </>
  );
}
