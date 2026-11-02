import type { BusinessRecord } from './platform-config';
export type BusinessFile = {
  id: string;
  recordId: string;
  name: string;
  mime: string;
  size: number;
};
export type AiStep = {
  id: string;
  runId: string;
  step: number;
  roleId: string;
  content: string;
  provider: string;
  status: string;
  sources: string;
  inputTokens: number;
  outputTokens: number;
};
export type InboxItem = {
  id: string;
  title: string;
  content: string;
  status: string;
  response: string;
  version: string;
};
export type FinanceSummary = {
  filings?:{id:string;taxType:string;periodStart:string;periodEnd:string;status:string}[];
  bills: {
    id: string;
    kind: string;
    title: string;
    dueDate: string;
    amountCents: number;
    paidCents: number;
    status: string;
  }[];
  accounts: { id: string; name: string; openingCents: number }[];
  entries: {
    id: string;
    direction: string;
    status: string;
    amountCents: number;
    accountId: string | null;
    date: string;
  }[];
};
export type PlatformData = {
  records: BusinessRecord[];
  files: BusinessFile[];
  steps: AiStep[];
  inbox: InboxItem[];
  links: { sourceId: string; action: string; targetId: string }[];
  aiConfigured: boolean;
  finance: FinanceSummary | null;
  role: string;
};
export const emptyPlatform: PlatformData = {
  records: [],
  files: [],
  steps: [],
  inbox: [],
  links: [],
  aiConfigured: false,
  finance: null,
  role: 'viewer',
};
export async function callApi<T = any>(
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const r = await fetch(
    path,
    body
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : { cache: 'no-store' },
  );
  const d = (await r.json()) as T & { error?: string };
  if (!r.ok) throw new Error(d.error || `操作失败（${r.status}）`);
  return d;
}
export function saveBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
export const cash = (n: number) =>
  new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(
    n / 100,
  );
export const localToday = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export function csvCell(value: unknown) {
  let v = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
  return `"${v.replaceAll('"', '""')}"`;
}
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (quoted) throw new Error('CSV 引号未闭合');
  row.push(cell);
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
export async function uploadBusinessFile(
  companyId: string,
  recordId: string,
  file: File,
) {
  if (file.size > 8 * 1024 * 1024) throw new Error('单个附件不能超过 8 MB');
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
  return callApi('/api/platform/files', {
    companyId,
    recordId,
    name: file.name,
    mime: file.type || 'text/plain',
    data,
  });
}
