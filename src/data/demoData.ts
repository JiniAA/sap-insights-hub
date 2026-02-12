// Demo SAP Analytics datasets

const firstNames = ['James','Maria','Robert','Sarah','Michael','Emma','David','Lisa','John','Anna','Thomas','Jennifer','Daniel','Laura','Mark','Julia','Peter','Sandra','Andreas','Christine','Klaus','Monika','Stefan','Claudia','Martin','Petra','Ravi','Priya','Ahmed','Fatima','Wei','Lin','Yuki','Kenji','Carlos','Sofia','Diego','Elena','Hans','Brigitte','Oliver','Katharina','Lukas','Nina','Felix','Mia','Leon','Lena','Ben','Eva'];
const lastNames = ['Mueller','Schmidt','Johnson','Williams','Garcia','Brown','Lee','Kim','Tanaka','Singh','Patel','Chen','Wang','Ali','Khan','Rossi','Becker','Fischer','Weber','Meyer','Wagner','Schulz','Hoffmann','Koch','Richter','Klein','Wolf','Schroeder','Neumann','Schwarz','Braun','Krüger','Hartmann','Lange','Werner','Lehmann','Kaiser','Fuchs','Peters','Lang'];
const groups = ['HR_USERS','BASIS','MM_USERS','FI_USERS'];
const tags = ['Power User','Standard','Service Account','Privileged','Read Only'];

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]): T { return arr[rand(0, arr.length - 1)]; }
function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}
function fmt(d: Date) { return d.toISOString().split('T')[0]; }

export interface SAPUser {
  userId: string; name: string; group: string; validTo: string; status: 'Active' | 'Dormant' | 'Expired';
  lastLogon: string; executions: number; tags: string;
}

export interface SAPRole {
  roleId: string; roleName: string; users: number; tCodes: number; unused: number;
  tags: string; utilization: number;
}

export interface SAPTCode {
  tCode: string; description: string; module: string;
  criticality: 'Critical' | 'High' | 'Medium' | 'Low';
  executions: number; users: number; roles: number;
}

function generateUsers(n = 50): SAPUser[] {
  const result: SAPUser[] = [];
  for (let i = 0; i < n; i++) {
    const r = Math.random();
    const status: SAPUser['status'] = r < 0.2 ? 'Dormant' : r < 0.3 ? 'Expired' : 'Active';
    result.push({
      userId: `USR${String(i + 1).padStart(4, '0')}`,
      name: `${pick(firstNames)} ${pick(lastNames)}`,
      group: pick(groups),
      validTo: fmt(randomDate(new Date('2024-01-01'), new Date('2027-12-31'))),
      status,
      lastLogon: status === 'Expired' ? 'N/A' : fmt(randomDate(new Date('2024-06-01'), new Date('2026-02-12'))),
      executions: status === 'Dormant' ? rand(0, 50) : rand(100, 5000),
      tags: pick(tags),
    });
  }
  return result;
}

const roleNames = [
  'SAP_ALL','SAP_NEW','Z_FI_POSTING','Z_MM_PURCHASE','Z_HR_ADMIN','Z_SD_SALES','Z_BASIS_ADMIN',
  'Z_FI_DISPLAY','Z_MM_DISPLAY','Z_HR_DISPLAY','Z_SD_DISPLAY','Z_AUDIT_READ','Z_SECURITY_ADMIN',
  'Z_FI_MANAGER','Z_MM_MANAGER','Z_HR_MANAGER','Z_SD_MANAGER','Z_REPORT_USER','Z_POWER_USER',
  'Z_SERVICE_ACCT','Z_BATCH_JOB','Z_RFC_USER','Z_DEVELOPER','Z_TRANSPORT','Z_CUSTOM_ROLE'
];

function generateRoles(n = 25): SAPRole[] {
  return roleNames.slice(0, n).map((name, i) => {
    const tCodes = rand(50, 5000);
    const unusedPct = rand(0, 80);
    const unused = Math.round(tCodes * unusedPct / 100);
    const tagOptions = ['Critical Access', 'Optimization Candidate', 'Standard', 'Composite', 'Derived'];
    return {
      roleId: `ROLE${String(i + 1).padStart(3, '0')}`,
      roleName: name,
      users: rand(1, 120),
      tCodes,
      unused,
      tags: pick(tagOptions),
      utilization: Math.round((1 - unusedPct / 100) * 100),
    };
  });
}

const tCodeData = [
  { code: 'SU01', desc: 'User Maintenance', mod: 'BASIS', crit: 'Critical' as const },
  { code: 'SU10', desc: 'Mass User Changes', mod: 'BASIS', crit: 'Critical' as const },
  { code: 'SE16', desc: 'Data Browser', mod: 'BASIS', crit: 'High' as const },
  { code: 'SM37', desc: 'Job Overview', mod: 'BASIS', crit: 'Medium' as const },
  { code: 'SM21', desc: 'System Log', mod: 'BASIS', crit: 'Medium' as const },
  { code: 'ST22', desc: 'ABAP Dump Analysis', mod: 'BASIS', crit: 'Medium' as const },
  { code: 'SE38', desc: 'ABAP Editor', mod: 'BASIS', crit: 'High' as const },
  { code: 'SE80', desc: 'Object Navigator', mod: 'BASIS', crit: 'High' as const },
  { code: 'FB01', desc: 'Post Document', mod: 'FI', crit: 'Critical' as const },
  { code: 'FB03', desc: 'Display Document', mod: 'FI', crit: 'Low' as const },
  { code: 'FS10N', desc: 'Balance Display', mod: 'FI', crit: 'Low' as const },
  { code: 'F110', desc: 'Payment Run', mod: 'FI', crit: 'Critical' as const },
  { code: 'FBL1N', desc: 'Vendor Line Items', mod: 'FI', crit: 'Low' as const },
  { code: 'FBL3N', desc: 'G/L Line Items', mod: 'FI', crit: 'Low' as const },
  { code: 'FBL5N', desc: 'Customer Line Items', mod: 'FI', crit: 'Low' as const },
  { code: 'FK01', desc: 'Create Vendor', mod: 'FI', crit: 'High' as const },
  { code: 'ME21N', desc: 'Create PO', mod: 'MM', crit: 'High' as const },
  { code: 'ME23N', desc: 'Display PO', mod: 'MM', crit: 'Low' as const },
  { code: 'MIGO', desc: 'Goods Movement', mod: 'MM', crit: 'High' as const },
  { code: 'MIRO', desc: 'Invoice Verification', mod: 'MM', crit: 'High' as const },
  { code: 'MM01', desc: 'Create Material', mod: 'MM', crit: 'Medium' as const },
  { code: 'MM03', desc: 'Display Material', mod: 'MM', crit: 'Low' as const },
  { code: 'MB52', desc: 'Warehouse Stocks', mod: 'MM', crit: 'Low' as const },
  { code: 'ME51N', desc: 'Create PR', mod: 'MM', crit: 'Medium' as const },
  { code: 'VA01', desc: 'Create Sales Order', mod: 'SD', crit: 'High' as const },
  { code: 'VA03', desc: 'Display Sales Order', mod: 'SD', crit: 'Low' as const },
  { code: 'VF01', desc: 'Create Billing Doc', mod: 'SD', crit: 'High' as const },
  { code: 'VL01N', desc: 'Create Delivery', mod: 'SD', crit: 'High' as const },
  { code: 'VL03N', desc: 'Display Delivery', mod: 'SD', crit: 'Low' as const },
  { code: 'XD01', desc: 'Create Customer', mod: 'SD', crit: 'High' as const },
  { code: 'XD03', desc: 'Display Customer', mod: 'SD', crit: 'Low' as const },
  { code: 'VT01N', desc: 'Create Shipment', mod: 'SD', crit: 'Medium' as const },
  { code: 'PA20', desc: 'Display HR Master', mod: 'HR', crit: 'Medium' as const },
  { code: 'PA30', desc: 'Maintain HR Master', mod: 'HR', crit: 'Critical' as const },
  { code: 'PA40', desc: 'Personnel Actions', mod: 'HR', crit: 'Critical' as const },
  { code: 'PT01', desc: 'Create Work Schedule', mod: 'HR', crit: 'Medium' as const },
  { code: 'PT60', desc: 'Time Evaluation', mod: 'HR', crit: 'Medium' as const },
  { code: 'PC00_M99_CEDT', desc: 'Payroll Results', mod: 'HR', crit: 'High' as const },
  { code: 'PU03', desc: 'Change Payroll Status', mod: 'HR', crit: 'Critical' as const },
  { code: 'PP01', desc: 'Maintain Org Objects', mod: 'HR', crit: 'High' as const },
];

function generateTCodes(n = 40): SAPTCode[] {
  return tCodeData.slice(0, n).map(t => ({
    tCode: t.code,
    description: t.desc,
    module: t.mod,
    criticality: t.crit,
    executions: rand(50, 15000),
    users: rand(3, 80),
    roles: rand(1, 20),
  }));
}

// Singleton demo data
let _users: SAPUser[] | null = null;
let _roles: SAPRole[] | null = null;
let _tCodes: SAPTCode[] | null = null;

export function getUsers(): SAPUser[] {
  if (!_users) _users = generateUsers();
  return _users;
}
export function getRoles(): SAPRole[] {
  if (!_roles) _roles = generateRoles();
  return _roles;
}
export function getTCodes(): SAPTCode[] {
  if (!_tCodes) _tCodes = generateTCodes();
  return _tCodes;
}

// Chart helpers
export const CHART_COLORS = ['#1a3a5c', '#e8772e', '#2d8a56', '#d94040', '#7c3aed', '#0ea5e9', '#f59e0b', '#6366f1'];
export const MODULE_COLORS: Record<string, string> = { FI: '#1a3a5c', MM: '#e8772e', SD: '#2d8a56', HR: '#d94040', BASIS: '#7c3aed' };
export const CRITICALITY_COLORS: Record<string, string> = { Critical: '#d94040', High: '#e8772e', Medium: '#f59e0b', Low: '#0ea5e9' };
export const STATUS_COLORS: Record<string, string> = { Active: '#2d8a56', Dormant: '#f59e0b', Expired: '#d94040' };
