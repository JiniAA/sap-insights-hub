import { read, utils } from 'xlsx';

// ── Raw Excel row types ──
interface RawUser {
  User: string;
  Team: string;
  'Valid to': string | number;
  'Date of Last Logon': string | number;
  'Reason for User Lock': string;
  [key: string]: unknown;
}

interface RawUserRole {
  Role: string;
  'User Name': string;
  [key: string]: unknown;
}

interface RawRoleTCode {
  Role: string;
  'Authorization value': string;
  [key: string]: unknown;
}

interface RawTransactionLog {
  'Variable Data': string;
  'Transaction Text': string;
  [key: string]: unknown;
}

// ── Derived dataset types ──
export interface SAPUser {
  userId: string;
  group: string;
  validTo: string;
  status: 'Active' | 'Dormant' | 'Inactive';
  lastLogon: string;
}

export interface SAPRole {
  roleName: string;
  usersAssigned: number;
  tCodes: number;
  unused: number;
  tags: string;
}

export interface SAPTCode {
  tCode: string;
  description: string;
  executions: number;
  users: number;
  roles: number;
}

// ── Helpers ──
function excelDateToJS(v: string | number): Date | null {
  if (typeof v === 'number') {
    const epoch = new Date(1899, 11, 30);
    return new Date(epoch.getTime() + v * 86400000);
  }
  if (typeof v === 'string' && v.trim()) {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function fmt(d: Date | null): string {
  if (!d) return 'N/A';
  return d.toISOString().split('T')[0];
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86400000);
}

// ── Compute utilization dynamically ──
export function computeUtilization(role: SAPRole): number {
  const clamped = Math.min(role.unused, role.tCodes);
  const used = Math.max(role.tCodes - clamped, 0);
  return role.tCodes > 0 ? Math.round((used / role.tCodes) * 100) : 0;
}

// ── Main loader ──
export interface DashboardData {
  users: SAPUser[];
  roles: SAPRole[];
  tCodes: SAPTCode[];
  raw: {
    userRoles: RawUserRole[];
    roleTCodes: RawRoleTCode[];
    transactionLogs: RawTransactionLog[];
  };
}

export async function loadExcelData(url = '/data/Logs_for_Analysis_1.xlsx'): Promise<DashboardData> {
  const res = await fetch(url);
  const ab = await res.arrayBuffer();
  const wb = read(ab);

  // ── Parse sheets (case-insensitive match) ──
  const findSheet = (name: string) => {
    const key = wb.SheetNames.find(s => s.toLowerCase().replace(/\s+/g, '') === name.toLowerCase().replace(/\s+/g, ''));
    return key ? utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[key]) : [];
  };

  const rawUsers = findSheet('users') as RawUser[];
  const rawUserRoles = findSheet('userrole') as RawUserRole[];
  const rawRoleTCodes = findSheet('role_tcode') as RawRoleTCode[];
  const rawTxLogs = findSheet('transactionlogs') as RawTransactionLog[];

  // Fallback: try alternate names
  const userRoles = rawUserRoles.length ? rawUserRoles : findSheet('User role') as RawUserRole[];
  const roleTCodes = rawRoleTCodes.length ? rawRoleTCodes : findSheet('role_tcode') as RawRoleTCode[];
  const txLogs = rawTxLogs.length ? rawTxLogs : findSheet('Transaction logs') as RawTransactionLog[];

  const today = new Date();

  // ── USERS ──
  const users: SAPUser[] = rawUsers.map(u => {
    const validToDate = excelDateToJS(u['Valid to']);
    const lastLogonDate = excelDateToJS(u['Date of Last Logon']);
    const lockReason = String(u['Reason for User Lock'] || '').trim();

    let status: SAPUser['status'] = 'Active';
    if (lockReason.toLowerCase() === 'administrator') {
      status = 'Inactive';
    } else if (lastLogonDate && daysBetween(today, lastLogonDate) > 90) {
      status = 'Dormant';
    } else if (validToDate && validToDate < today) {
      status = 'Inactive';
    } else if (lockReason && lockReason.length > 0 && lockReason !== '0') {
      status = 'Inactive';
    }

    // N/A team → Admin
    const rawTeam = String(u.Team || '').trim();
    const group = (!rawTeam || rawTeam === 'N/A' || rawTeam === 'n/a') ? 'Admin' : rawTeam;

    return {
      userId: String(u.User || ''),
      group,
      validTo: fmt(validToDate),
      status,
      lastLogon: fmt(lastLogonDate),
    };
  });

  // ── Build lookup sets ──
  // Transaction log tcodes set & description map
  const txTCodeSet = new Set<string>();
  const txTCodeCounts: Record<string, number> = {};
  const txTCodeDescMap: Record<string, string> = {};
  txLogs.forEach(log => {
    const val = String(log['Variable Data'] || log['variable data'] || log['Variable data'] || log['VARIABLE DATA'] || '').trim();
    const desc = String(log['Transaction Text'] || log['Transaction text'] || log['transaction text'] || '').trim();
    if (val) {
      txTCodeSet.add(val);
      txTCodeCounts[val] = (txTCodeCounts[val] || 0) + 1;
      if (desc && !txTCodeDescMap[val]) {
        txTCodeDescMap[val] = desc;
      }
    }
  });

  // Role → tcodes mapping
  const roleTCodeMap: Record<string, Set<string>> = {};
  roleTCodes.forEach(rt => {
    const role = String(rt.Role || rt['Role'] || '').trim();
    const tcode = String(rt['Authorization value'] || rt['Authorization Value'] || '').trim();
    if (role && tcode) {
      if (!roleTCodeMap[role]) roleTCodeMap[role] = new Set();
      roleTCodeMap[role].add(tcode);
    }
  });

  // Role → users mapping
  const roleUsersMap: Record<string, Set<string>> = {};
  userRoles.forEach(ur => {
    const role = String(ur.Role || ur['Role'] || '').trim();
    const user = String(ur['User Name'] || ur['User name'] || '').trim();
    if (role && user) {
      if (!roleUsersMap[role]) roleUsersMap[role] = new Set();
      roleUsersMap[role].add(user);
    }
  });

  // ── ROLES ──
  const allRoles = new Set<string>();
  Object.keys(roleTCodeMap).forEach(r => allRoles.add(r));
  Object.keys(roleUsersMap).forEach(r => allRoles.add(r));

  const roles: SAPRole[] = Array.from(allRoles).map(roleName => {
    const tcodesForRole = roleTCodeMap[roleName] || new Set<string>();
    const usersForRole = roleUsersMap[roleName] || new Set<string>();
    const tCodeCount = tcodesForRole.size;

    // Unused = tcodes in role_tcode but NOT in transaction logs
    let unused = 0;
    tcodesForRole.forEach(tc => {
      if (!txTCodeSet.has(tc)) unused++;
    });
    unused = Math.min(unused, tCodeCount);

    // Determine tags
    const util = tCodeCount > 0 ? Math.round(((tCodeCount - unused) / tCodeCount) * 100) : 0;
    let tags = 'Standard';
    if (roleName.includes('SAP_ALL') || roleName.includes('SAP_NEW') || roleName.includes('ADMIN')) {
      tags = 'Critical Access';
    } else if (util < 40) {
      tags = 'Optimization Candidate';
    }

    return {
      roleName,
      usersAssigned: usersForRole.size,
      tCodes: tCodeCount,
      unused,
      tags,
    };
  });

  // ── TCODES - only from role_tcode sheet (Authorization value) ──
  const allTCodesFromExcel = new Set<string>();
  Object.values(roleTCodeMap).forEach(set => set.forEach(tc => allTCodesFromExcel.add(tc)));

  // TCode → roles
  const tcodeRoleMap: Record<string, Set<string>> = {};
  roleTCodes.forEach(rt => {
    const role = String(rt.Role || '').trim();
    const tcode = String(rt['Authorization value'] || rt['Authorization Value'] || '').trim();
    if (tcode && role) {
      if (!tcodeRoleMap[tcode]) tcodeRoleMap[tcode] = new Set();
      tcodeRoleMap[tcode].add(role);
    }
  });

  // TCode → users (through roles)
  const tcodeUserMap: Record<string, Set<string>> = {};
  Object.entries(tcodeRoleMap).forEach(([tcode, roleSet]) => {
    roleSet.forEach(role => {
      const usrs = roleUsersMap[role];
      if (usrs) {
        if (!tcodeUserMap[tcode]) tcodeUserMap[tcode] = new Set();
        usrs.forEach(u => tcodeUserMap[tcode].add(u));
      }
    });
  });

  // Only tcodes from excel (role_tcode sheet), description from Transaction Text
  const tCodes: SAPTCode[] = Array.from(allTCodesFromExcel).map(tc => ({
    tCode: tc,
    description: txTCodeDescMap[tc] || tc,
    executions: txTCodeCounts[tc] || 0,
    users: tcodeUserMap[tc]?.size || 0,
    roles: tcodeRoleMap[tc]?.size || 0,
  }));

  return {
    users,
    roles,
    tCodes,
    raw: { userRoles, roleTCodes, transactionLogs: txLogs },
  };
}

// ── Chart color constants ──
export const CHART_COLORS = ['#1a3a5c', '#e8772e', '#2d8a56', '#d94040', '#7c3aed', '#0ea5e9', '#f59e0b', '#6366f1'];
export const STATUS_COLORS: Record<string, string> = { Active: '#2d8a56', Dormant: '#f59e0b', Inactive: '#d94040' };
export const CRITICALITY_COLORS: Record<string, string> = { Critical: '#d94040', High: '#e8772e', Medium: '#f59e0b', Low: '#0ea5e9' };
