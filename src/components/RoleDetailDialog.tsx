import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { computeUtilization, type SAPRole, type DashboardData } from "@/data/excelData";

interface Props {
  role: SAPRole;
  data: DashboardData;
  onClose: () => void;
}

export default function RoleDetailDialog({ role, data, onClose }: Props) {
  const roleTCodes = useMemo(() => {
    const tcodeNames = data.raw.roleTCodes
      .filter(rt => String(rt.Role || '').trim() === role.roleName)
      .map(rt => String(rt['Authorization value'] || rt['Authorization Value'] || '').trim())
      .filter(Boolean);
    return [...new Set(tcodeNames)].map(tc => {
      const found = data.tCodes.find(t => t.tCode === tc);
      return { tCode: tc, description: found?.description || tc, executions: found?.executions || 0, users: found?.users || 0 };
    });
  }, [role, data]);

  const assignedUsers = useMemo(() => {
    const userNames = data.raw.userRoles
      .filter(ur => String(ur.Role || '').trim() === role.roleName)
      .map(ur => String(ur['User Name'] || ur['User name'] || '').trim())
      .filter(Boolean);
    return [...new Set(userNames)].map(userId => {
      const found = data.users.find(u => u.userId === userId);
      return found || { userId, group: 'Unknown', status: 'Unknown' as const, lastLogon: 'N/A', validTo: 'N/A', lastLogonDate: null };
    });
  }, [role, data]);

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">{role.roleName}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="summary" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="tcodes">TCodes ({role.tCodes})</TabsTrigger>
            <TabsTrigger value="users">Users ({role.usersAssigned})</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted rounded-lg p-3">
                <p className="text-muted-foreground text-xs">Users Assigned</p>
                <p className="font-semibold text-lg text-foreground">{role.usersAssigned}</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-muted-foreground text-xs">TCodes</p>
                <p className="font-semibold text-lg text-foreground">{role.tCodes}</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-muted-foreground text-xs">Utilization</p>
                <p className="font-semibold text-lg text-foreground">{computeUtilization(role)}%</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-muted-foreground text-xs">Unused TCodes</p>
                <p className="font-semibold text-lg text-foreground">{role.unused}</p>
              </div>
              <div className="bg-muted rounded-lg p-3 col-span-2">
                <p className="text-muted-foreground text-xs">Tags</p>
                <p className="font-semibold text-foreground">{role.tags}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tcodes" className="flex-1 overflow-auto mt-2">
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-muted text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2 text-left bg-muted">TCode</th>
                    <th className="px-3 py-2 text-left bg-muted">Description</th>
                    <th className="px-3 py-2 text-right bg-muted">Executions</th>
                    <th className="px-3 py-2 text-right bg-muted">Users</th>
                  </tr>
                </thead>
                <tbody>
                  {roleTCodes.map(tc => (
                    <tr key={tc.tCode} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono text-foreground">{tc.tCode}</td>
                      <td className="px-3 py-2 text-foreground">{tc.description}</td>
                      <td className="px-3 py-2 text-right text-foreground">{tc.executions.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-foreground">{tc.users}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="users" className="flex-1 overflow-auto mt-2">
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-muted text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2 text-left bg-muted">User ID</th>
                    <th className="px-3 py-2 text-left bg-muted">Group</th>
                    <th className="px-3 py-2 text-left bg-muted">Status</th>
                    <th className="px-3 py-2 text-left bg-muted">Last Logon</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedUsers.map(u => (
                    <tr key={u.userId} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono text-foreground">{u.userId}</td>
                      <td className="px-3 py-2 text-foreground">{u.group}</td>
                      <td className="px-3 py-2 text-foreground">{u.status}</td>
                      <td className="px-3 py-2 text-foreground">{u.lastLogon || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
