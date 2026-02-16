import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { utils, writeFile } from 'xlsx';
import type { SAPRole } from "@/data/excelData";

interface Props {
  roles: SAPRole[];
  onClose: () => void;
}

export default function UnusedRolesDialog({ roles, onClose }: Props) {
  const exportToXlsx = () => {
    const ws = utils.json_to_sheet(roles.map(r => ({
      'Role Name': r.roleName,
      'Users Assigned': r.usersAssigned,
      'TCodes': r.tCodes,
      'Unused TCodes': r.unused,
      'Tags': r.tags,
    })));
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Unused Roles');
    writeFile(wb, 'unused_roles.xlsx');
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[70vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">Unused Roles ({roles.length})</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end mb-2">
          <Button variant="outline" size="sm" onClick={exportToXlsx} className="text-xs">
            <Download className="h-3 w-3 mr-1" /> Export to XLSX
          </Button>
        </div>
        <div className="flex-1 overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-muted text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 text-left bg-muted">Role Name</th>
                <th className="px-3 py-2 text-right bg-muted">Users</th>
                <th className="px-3 py-2 text-right bg-muted">TCodes</th>
              </tr>
            </thead>
            <tbody>
              {roles.map(r => (
                <tr key={r.roleName} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2 text-foreground">{r.roleName}</td>
                  <td className="px-3 py-2 text-right text-foreground">{r.usersAssigned}</td>
                  <td className="px-3 py-2 text-right text-foreground">{r.tCodes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
