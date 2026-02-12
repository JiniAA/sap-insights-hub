import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from "lucide-react";

interface Column<T> {
  key: keyof T;
  label: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchKeys?: (keyof T)[];
  onFilter?: (filtered: T[]) => void;
}

export default function DataTable<T extends object>({
  data, columns, searchKeys, onFilter
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    let result = data;
    if (search && searchKeys) {
      const q = search.toLowerCase();
      result = result.filter(row => searchKeys.some(k => String(row[k]).toLowerCase().includes(q)));
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey];
        const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [data, search, searchKeys, sortKey, sortDir]);

  useMemo(() => { onFilter?.(filtered); }, [filtered, onFilter]);

  const toggleSort = (key: keyof T) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  return (
    <div className="space-y-3">
      {searchKeys && (
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="data-table-header">
                {columns.map(col => (
                  <th
                    key={String(col.key)}
                    className={cn("px-4 py-3 text-left", col.sortable !== false && "cursor-pointer select-none hover:text-foreground")}
                    onClick={() => col.sortable !== false && toggleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.sortable !== false && (
                        sortKey === col.key
                          ? sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                          : <ArrowUpDown size={12} className="opacity-30" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={i} className="border-t hover:bg-muted/30 transition-colors">
                  {columns.map(col => (
                    <td key={String(col.key)} className="px-4 py-2.5 text-foreground">
                      {col.render ? col.render(row[col.key], row) : String(row[col.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} of {data.length} records</p>
    </div>
  );
}
