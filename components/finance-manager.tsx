'use client';
import { AppButton, AppSelect } from '@/components/ui/app-controls';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  Check,
  ChevronRight,
  Download,
  FileCheck2,
  History,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Upload,
  Wallet,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from './ui/dialog';
import FinancePanel from './finance-panel';
import {
  financeCategories,
  financeCsv,
  type FinanceEntry,
} from '@/lib/finance';
import {
  billKinds,
  billState,
  billsCsv,
  chinaToday,
  downloadCsv,
  outstanding,
  overdue,
  parkCompany,
  selectedFinanceCompany,
  rememberFinanceCompany,
  yuan,
  type FinanceBill,
  type FinanceBusiness,
} from '@/lib/finance-business';
import './finance.css';

const empty: FinanceBusiness = {
  companies: [],
  accounts: [],
  bills: [],
  payments: [],
  audits: [],
};
async function api(companyId: string, body?: Record<string, unknown>) {
  const r = await fetch(
    `/api/finance/business?companyId=${encodeURIComponent(companyId)}`,
    body
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, companyId }),
        }
      : { cache: 'no-store' },
  );
  const d = (await r.json()) as FinanceBusiness & {
    error?: string;
    id: string;
  };
  if (!r.ok) throw new Error(d.error || '操作失败');
  return d;
}
const formValues = (e: FormEvent<HTMLFormElement>) =>
  Object.fromEntries(new FormData(e.currentTarget).entries());
function Field({
  label,
  name,
  value = '',
  type = 'text',
  required = true,
  maxLength = 120,
  min,
  step,
}: {
  label: string;
  name: string;
  value?: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  min?: string;
  step?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        name={name}
        defaultValue={value}
        type={type}
        required={required}
        maxLength={maxLength}
        min={min}
        step={step}
      />
    </label>
  );
}
export default function FinanceManager({fixedCompanyId}:{fixedCompanyId?:string}={}) {
  const [companyId, setCompanyId] = useState(()=>fixedCompanyId||selectedFinanceCompany()),
    [data, setData] = useState(empty),
    [ledger, setLedger] = useState<FinanceEntry[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('bills'),
    [search, setSearch] = useState(''),
    [filter, setFilter] = useState('all'),
    [kind, setKind] = useState('all'),
    [from, setFrom] = useState(''),
    [to, setTo] = useState('');
  const [modal, setModal] = useState(''),
    [selectedId, setSelectedId] = useState(''),
    [editBill, setEditBill] = useState<FinanceBill | null>(null),
    [detailAction, setDetailAction] = useState(''),
    [reverseId, setReverseId] = useState(''),
    [accountFilter, setAccountFilter] = useState('all');
  const requestId = useRef(0),
    companyRef = useRef(companyId);
  companyRef.current = companyId;
  async function refresh(id = companyRef.current) {
    const token = ++requestId.current;
    setLoading(true);
    try {
      const [d, r] = await Promise.all([
        api(id),
        fetch(`/api/finance?companyId=${encodeURIComponent(id)}`, {
          cache: 'no-store',
        }),
      ]);
      const l = (await r.json()) as { entries: FinanceEntry[]; error: string };
      if (!r.ok) throw new Error(l.error);
      if (token !== requestId.current) return;
      setData(d);
      setLedger(l.entries);
      setError('');
    } catch (e) {
      if (token === requestId.current) setError((e as Error).message);
    } finally {
      if (token === requestId.current) setLoading(false);
    }
  }
  useEffect(() => {
    setData(empty);
    setLedger([]);
    setSelectedId('');
    setModal('');
    setNotice('');
    setError('');
    setAccountFilter('all');
    rememberFinanceCompany(companyId);
    void refresh(companyId);
    return () => {
      requestId.current++;
    };
  }, [companyId]);
  async function mutate(
    body: Record<string, unknown>,
    message: string,
    close = true,
  ) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await api(companyId, body);
      if (close) {
        setModal('');
        setEditBill(null);
      }
      setDetailAction('');
      await refresh();
      setNotice(message);
      return result;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  const selected = data.bills.find((b) => b.id === selectedId),
    company = data.companies.find((c) => c.id === companyId);
  const receivable = data.bills
      .filter((b) => b.kind === 'receivable')
      .reduce((n, b) => n + outstanding(b), 0),
    payable = data.bills
      .filter((b) => b.kind !== 'receivable')
      .reduce((n, b) => n + outstanding(b), 0),
    late = data.bills.filter(overdue),
    pending = data.bills.filter(
      (b) => b.kind === 'reimbursement' && b.status === 'pending',
    );
  const filtered = data.bills.filter(
    (b) =>
      (tab === 'reimbursements'
        ? b.kind === 'reimbursement'
        : b.kind !== 'reimbursement') &&
      (kind === 'all' || tab === 'reimbursements' || b.kind === kind) &&
      (!from || b.date >= from) &&
      (!to || b.date <= to) &&
      `${b.title} ${b.counterparty} ${b.category} ${b.invoiceNo}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === 'all' ||
        (filter === 'open' && outstanding(b) > 0) ||
        (filter === 'overdue' && overdue(b)) ||
        (filter === 'settled' &&
          b.status === 'approved' &&
          b.paidCents === b.amountCents) ||
        filter === b.status),
  );
  function switchTab(v: string) {
    setTab(v);
    setSearch('');
    setFilter('all');
    setKind('all');
    setFrom('');
    setTo('');
    setError('');
    setNotice('');
  }
  function newBill() {
    setEditBill(null);
    setModal('bill');
    setError('');
  }
  async function upload(file: File) {
    if (!selected) return;
    if (file.size > 819200) {
      setError('凭证请使用小于 800KB 的 PDF、PNG 或 JPG');
      return;
    }
    setBusy(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsDataURL(file);
      });
      await mutate(
        {
          action: 'attachment.save',
          id: selected.id,
          version: selected.version,
          name: file.name,
          mime: file.type,
          data: base64,
        },
        '原始凭证已保存',
        false,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function detailBody(action: string, extra: Record<string, unknown> = {}) {
    return { action, id: selected?.id, version: selected?.version, ...extra };
  }
  const accountEntries = ledger.filter(
    (e) => accountFilter === 'all' || e.accountId === accountFilter,
  );
  const ready = !loading && !error;
  return (
    <div className="finance-manager">
      <div className="finance-heading">
        <div>
          <div className="finance-eyebrow">
            <ReceiptText size={14} /> BUSINESS FINANCE
          </div>
          <h1>
            财务管理<span>企业经营账本</span>
          </h1>
          <p>应收应付、报销与资金，一处处理，每笔有据。</p>
        </div>
        <div className="finance-heading-actions">
          <label className="finance-book-label">
            <Building2 size={15} />
            账套
            <AppSelect
              aria-label="选择财务账套"
              value={companyId}
              disabled={busy || loading || !!fixedCompanyId}
              onChange={(e) => setCompanyId(e.target.value)}
            >
              {data.companies.length ? (
                data.companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              ) : (
                <option value={companyId}>加载账套…</option>
              )}
            </AppSelect>
          </label>
          <AppButton
            className="secondary-button"
            disabled={busy || loading}
            onClick={() => {
              setError('');
              setModal('company');
            }}
          >
            <Plus size={15} />
            新建账套
          </AppButton>
        </div>
      </div>
      {error && (
        <div role="alert" className="feedback error">
          {error}
          <AppButton disabled={busy} onClick={() => void refresh()}>
            重新加载
          </AppButton>
        </div>
      )}
      {notice && (
        <div role="status" className="feedback">
          {notice}
        </div>
      )}
      <div className="finance-metrics">
        {[
          {
            label: '账户资金余额',
            value: data.accounts.reduce((n, a) => n + a.balanceCents, 0),
            icon: Wallet,
            color: 'green',
            hint: `${data.accounts.length} 个资金账户 · 含期初余额`,
          },
          {
            label: '待收款',
            value: receivable,
            icon: ArrowDownLeft,
            color: 'blue',
            hint: '已审核应收单的未收款金额',
          },
          {
            label: '待付款',
            value: payable,
            icon: ArrowUpRight,
            color: 'violet',
            hint: '已审核应付及报销的未付款金额',
          },
        ].map((m) => (
          <section key={m.label} className={m.color}>
            <span>
              {m.label}
              <m.icon size={19} />
            </span>
            <strong>{loading ? '—' : yuan(m.value)}</strong>
            <p>{m.hint}</p>
          </section>
        ))}
        <section className="amber">
          <span>
            待审核报销
            <FileCheck2 size={19} />
          </span>
          <strong>
            {loading ? '—' : pending.length}
            <small> 笔</small>
          </strong>
          <p>{late.length} 笔已逾期收付，及时跟进</p>
        </section>
      </div>
      <div
        className="finance-business-tabs"
        role="tablist"
        aria-label="财务业务"
      >
        {[
          { id: 'bills', label: '应收应付' },
          { id: 'reimbursements', label: '报销审批' },
          { id: 'ledger', label: '收支账本与分析' },
          { id: 'accounts', label: '资金账户' },
        ].map((t) => (
          <AppButton
            role="tab"
            aria-selected={tab === t.id}
            aria-controls="finance-content"
            key={t.id}
            onClick={() => switchTab(t.id)}
          >
            {t.label}
            {t.id === 'reimbursements' && pending.length > 0 && (
              <b>{pending.length}</b>
            )}
          </AppButton>
        ))}
        <AppButton
          className="finance-tab-refresh"
          aria-label="刷新财务数据"
          disabled={loading || busy}
          onClick={() => void refresh()}
        >
          <RefreshCw size={16} />
        </AppButton>
      </div>
      <div id="finance-content" role="tabpanel">
        {(tab === 'bills' || tab === 'reimbursements') && (
          <section className="finance-main">
            <div className="finance-toolbar">
              <div>
                <h2>{tab === 'bills' ? '企业应收应付' : '费用报销审批'}</h2>
                <p>
                  {tab === 'bills'
                    ? '先建单、再审核，按实际收付款逐笔登记。'
                    : '提交费用 → 财务审核 → 登记付款 → 归档凭证'}
                </p>
              </div>
              <div className="finance-inline-actions">
                <AppButton
                  className="secondary-button"
                  disabled={!filtered.length || loading}
                  onClick={() =>
                    downloadCsv(
                      billsCsv(filtered),
                      `${company?.name}-${tab === 'bills' ? '应收应付' : '报销'}.csv`,
                    )
                  }
                >
                  <Download size={15} />
                  导出明细
                </AppButton>
                <AppButton
                  className="primary-button"
                  disabled={!ready || busy}
                  onClick={newBill}
                >
                  <Plus size={16} />
                  {tab === 'bills' ? '新建单据' : '提交报销'}
                </AppButton>
              </div>
            </div>
            <div className="finance-filters">
              <label>
                <Search size={15} />
                <input
                  aria-label="搜索财务单据"
                  placeholder="搜索单据、单位、申请人或票据编号"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              {tab === 'bills' && (
                <AppSelect
                  aria-label="筛选单据类型"
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                >
                  <option value="all">应收与应付</option>
                  <option value="receivable">应收</option>
                  <option value="payable">应付</option>
                </AppSelect>
              )}
              <AppSelect
                aria-label="筛选单据状态"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                {[
                  ['all', '全部状态'],
                  ['pending', '待审核'],
                  ['open', '未结清'],
                  ['overdue', '已逾期'],
                  ['settled', '已结清'],
                  ['rejected', '已退回'],
                  ['void', '已作废'],
                ].map(([v, l]) => (
                  <option value={v} key={v}>
                    {l}
                  </option>
                ))}
              </AppSelect>
            </div>
            <div className="finance-date-filters">
              <label>
                业务日期从
                <input
                  type="date"
                  aria-label="起始业务日期"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </label>
              <label>
                至
                <input
                  type="date"
                  aria-label="结束业务日期"
                  value={to}
                  min={from}
                  onChange={(e) => setTo(e.target.value)}
                />
              </label>
              {(from || to || filter !== 'all' || kind !== 'all' || search) && (
                <AppButton
                  onClick={() => {
                    setFrom('');
                    setTo('');
                    setFilter('all');
                    setKind('all');
                    setSearch('');
                  }}
                >
                  清除筛选
                </AppButton>
              )}
            </div>
            <div className="finance-table-wrap">
              <table className="finance-table">
                <thead>
                  <tr>
                    {[
                      '单据 / 日期',
                      tab === 'reimbursements'
                        ? '申请人 / 类别'
                        : '往来单位 / 类别',
                      '单据金额',
                      '未收付',
                      '到期 / 状态',
                      '操作',
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <strong>{b.title}</strong>
                        <small>
                          {billKinds[b.kind]} · {b.date}
                        </small>
                      </td>
                      <td>
                        {b.counterparty}
                        <small>
                          {b.category}
                          {b.attachmentName ? ' · 有凭证' : ''}
                        </small>
                      </td>
                      <td>
                        {yuan(b.amountCents)}
                        <small>已收付 {yuan(b.paidCents)}</small>
                      </td>
                      <td
                        className={
                          b.kind === 'receivable'
                            ? 'finance-income'
                            : 'finance-expense'
                        }
                      >
                        {b.status === 'void'
                          ? '—'
                          : yuan(b.amountCents - b.paidCents)}
                      </td>
                      <td>
                        <span
                          className={`finance-status ${b.status === 'approved' ? 'confirmed' : b.status === 'void' ? 'void' : 'pending'}`}
                        >
                          {billState(b)}
                        </span>
                        <small className={overdue(b) ? 'finance-late' : ''}>
                          {b.dueDate}
                          {overdue(b) ? ' · 已逾期' : ''}
                        </small>
                      </td>
                      <td>
                        <AppButton
                          onClick={() => {
                            setSelectedId(b.id);
                            setDetailAction('');
                            setModal('detail');
                            setError('');
                          }}
                          aria-label={`查看单据${b.title}`}
                        >
                          处理
                          <ChevronRight size={15} />
                        </AppButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && (
                <div className="finance-empty">
                  <ReceiptText size={34} />
                  <h3>
                    {loading
                      ? '正在加载财务数据…'
                      : search || filter !== 'all' || from || to
                        ? '没有匹配的单据'
                        : tab === 'bills'
                          ? '建立第一笔企业业务'
                          : '暂时没有报销申请'}
                  </h3>
                  <p>
                    数据按账套独立保存。可以从租金、服务费、采购或员工报销开始。
                  </p>
                  <AppButton
                    className="primary-button"
                    disabled={!ready || busy}
                    onClick={newBill}
                  >
                    <Plus size={15} />
                    {tab === 'bills' ? '新建单据' : '提交报销'}
                  </AppButton>
                </div>
              )}
            </div>
            <div className="finance-footnote">
              共 {filtered.length} 笔 ·
              待审核单据不计入待收付款汇总；应收应付不直接计入账户余额。
            </div>
          </section>
        )}
        {tab === 'ledger' && (
          <FinancePanel
            key={companyId}
            companyId={companyId}
            accounts={data.accounts}
            onChanged={() => void refresh()}
          />
        )}
        {tab === 'accounts' && (
          <>
            <div className="finance-toolbar finance-account-toolbar">
              <div>
                <h2>资金账户</h2>
                <p>余额 = 期初余额 + 已确认收入 − 已确认支出</p>
              </div>
              <AppButton
                className="primary-button"
                disabled={!ready || busy}
                onClick={() => {
                  setError('');
                  setModal('account');
                }}
              >
                <Plus size={15} />
                新增账户
              </AppButton>
            </div>
            <div className="finance-account-grid">
              {data.accounts.map((a) => (
                <AppButton
                  className={`finance-account-card ${accountFilter === a.id ? 'active' : ''}`}
                  key={a.id}
                  onClick={() => setAccountFilter(a.id)}
                >
                  <span>
                    <Wallet size={18} />
                    {a.type}
                  </span>
                  <h3>{a.name}</h3>
                  <strong>{yuan(a.balanceCents)}</strong>
                  <small>期初余额 {yuan(a.openingCents)}</small>
                </AppButton>
              ))}
            </div>
            {!data.accounts.length && (
              <div className="finance-empty finance-main">
                <Wallet size={34} />
                <h3>{loading ? '正在加载…' : '先建立一个资金账户'}</h3>
                <p>
                  填写银行、现金或微信支付宝账户的名称与期初余额，便于后续核对收付。
                </p>
                <AppButton
                  disabled={!ready || busy}
                  className="primary-button"
                  onClick={() => setModal('account')}
                >
                  新增账户
                </AppButton>
              </div>
            )}
            <section className="finance-main">
              <div className="finance-toolbar">
                <h2>账户流水</h2>
                <div className="finance-inline-actions">
                  <AppSelect
                    aria-label="筛选资金账户"
                    value={accountFilter}
                    onChange={(e) => setAccountFilter(e.target.value)}
                  >
                    <option value="all">全部账户（含未分配流水）</option>
                    {data.accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </AppSelect>
                  <AppButton
                    className="secondary-button"
                    disabled={!accountEntries.length || loading}
                    onClick={() =>
                      downloadCsv(
                        financeCsv(accountEntries, data.accounts),
                        `${company?.name}-账户流水.csv`,
                      )
                    }
                  >
                    <Download size={15} />
                    导出流水
                  </AppButton>
                </div>
              </div>
              <div className="finance-table-wrap">
                <table className="finance-table">
                  <thead>
                    <tr>
                      {['日期', '账户 / 往来单位', '类别', '金额', '状态'].map(
                        (h) => (
                          <th key={h}>{h}</th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {accountEntries.map((e) => (
                      <tr key={e.id}>
                        <td>{e.date}</td>
                        <td>
                          {data.accounts.find((a) => a.id === e.accountId)
                            ?.name || '未分配账户'}
                          <small>{e.counterparty}</small>
                        </td>
                        <td>
                          {e.category}
                          <small>
                            {e.paymentId ? '单据收付款' : '手工登记'}
                          </small>
                        </td>
                        <td
                          className={
                            e.direction === 'income'
                              ? 'finance-income'
                              : 'finance-expense'
                          }
                        >
                          {e.direction === 'income' ? '+' : '−'}
                          {yuan(e.amountCents)}
                        </td>
                        <td>
                          <span className={`finance-status ${e.status}`}>
                            {
                              {
                                pending: '待确认',
                                confirmed: '已确认',
                                void: '已作废',
                              }[e.status]
                            }
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!accountEntries.length && (
                  <div className="finance-empty">
                    <p>暂无账户流水，登记收付款后自动生成。</p>
                  </div>
                )}
              </div>
            </section>
            <section className="finance-audit">
              <h3>
                <History size={16} />
                最近操作
              </h3>
              {data.audits.slice(0, 12).map((a) => (
                <p key={a.id}>
                  <time>
                    {new Date(a.createdAt).toLocaleString('zh-CN', {
                      timeZone: 'Asia/Shanghai',
                    })}
                  </time>
                  {a.message}
                </p>
              ))}
              {!data.audits.length && <p>暂无操作记录。</p>}
            </section>
          </>
        )}
      </div>
      <p className="finance-business-note">
        当前账套由本工作空间管理。收付款为人工登记，填写实际到账或付款信息；账户余额用于经营核对。
      </p>
      <div className="finance-provenance">
        流程参考{' '}
        <a
          href="https://github.com/frappe/erpnext/blob/develop/erpnext/accounts/README.md"
          target="_blank"
          rel="noreferrer"
        >
          ERPNext
        </a>
        <span>·</span>
        <a
          href="https://github.com/frappe/books"
          target="_blank"
          rel="noreferrer"
        >
          Frappe Books
        </a>
        <small>按现有中控台独立实现</small>
      </div>
      {modal && (
        <Dialog
          open
          onOpenChange={(v) => {
            if (!v && !busy) {
              setModal('');
              setError('');
              setEditBill(null);
            }
          }}
        >
          <DialogContent
            className={`park-ticket-dialog finance-dialog ${modal === 'detail' ? 'finance-bill-dialog' : ''}`}
          >
            <DialogTitle>
              {modal === 'company'
                ? '新建企业账套'
                : modal === 'account'
                  ? '新增资金账户'
                  : modal === 'bill'
                    ? editBill
                      ? '修改并重新提交'
                      : tab === 'reimbursements'
                        ? '提交费用报销'
                        : '新建应收应付单据'
                    : '财务单据详情'}
            </DialogTitle>
            <DialogDescription>
              {modal === 'company'
                ? '每个账套独立保存单据、账户和流水，名称可用企业全称。'
                : modal === 'account'
                  ? '期初余额请按实际账面金额填写；账户建立后保持期初不变。'
                  : modal === 'bill'
                    ? '填写业务与票据信息，保存后由本工作空间管理人员审核。'
                    : '核对单据与原始凭证，审核通过后按实际收付款登记。'}
            </DialogDescription>
            {error && (
              <div role="alert" className="feedback error">
                {error}
              </div>
            )}
            {modal === 'company' && (
              <form
                className="ticket-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const r = await mutate(
                    { action: 'company.create', ...formValues(e) },
                    '账套已建立',
                  );
                  if (r) setCompanyId(r.id);
                }}
              >
                <Field label="企业 / 账套名称" name="name" />
                <AppButton className="primary-button full" disabled={busy}>
                  {busy ? '保存中…' : '建立账套'}
                </AppButton>
              </form>
            )}
            {modal === 'account' && (
              <form
                className="ticket-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void mutate(
                    { action: 'account.create', ...formValues(e) },
                    '资金账户已建立',
                  );
                }}
              >
                <Field label="账户名称" name="name" maxLength={80} />
                <label className="field">
                  <span>账户类型</span>
                  <AppSelect name="type">
                    {['银行账户', '现金', '微信 / 支付宝', '其他'].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </AppSelect>
                </label>
                <Field
                  label="期初余额（元，可为负数）"
                  name="opening"
                  type="number"
                  step="0.01"
                  value="0"
                />
                <AppButton className="primary-button full" disabled={busy}>
                  {busy ? '保存中…' : '保存账户'}
                </AppButton>
              </form>
            )}
            {modal === 'bill' && (
              <form
                className="ticket-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void mutate(
                    {
                      action: editBill ? 'bill.edit' : 'bill.create',
                      ...formValues(e),
                      ...(editBill
                        ? { id: editBill.id, version: editBill.version }
                        : {}),
                    },
                    editBill ? '已修改并重新提交审核' : '单据已提交，等待审核',
                  );
                }}
              >
                <div className="form-row">
                  <label className="field">
                    <span>单据类型</span>
                    <AppSelect
                      name="kind"
                      defaultValue={
                        editBill?.kind ||
                        (tab === 'reimbursements'
                          ? 'reimbursement'
                          : 'receivable')
                      }
                    >
                      {Object.entries(billKinds).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </AppSelect>
                  </label>
                  <Field
                    label="单据名称"
                    name="title"
                    value={editBill?.title}
                  />
                </div>
                <Field
                  label="往来单位 / 报销申请人"
                  name="counterparty"
                  value={editBill?.counterparty}
                />
                <div className="form-row">
                  <Field
                    label="业务日期"
                    name="date"
                    type="date"
                    value={editBill?.date || chinaToday()}
                  />
                  <Field
                    label="收付到期日期"
                    name="dueDate"
                    type="date"
                    value={editBill?.dueDate || chinaToday()}
                  />
                </div>
                <div className="form-row">
                  <Field
                    label="含税金额（元）"
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={
                      editBill ? (editBill.amountCents / 100).toFixed(2) : ''
                    }
                  />
                  <Field
                    label="票面税率（%，按凭证填写）"
                    name="taxRate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editBill ? String(editBill.taxBps / 100) : '0'}
                  />
                </div>
                <label className="field">
                  <span>业务类别</span>
                  <AppSelect
                    name="category"
                    defaultValue={
                      editBill?.category ||
                      (tab === 'reimbursements' ? '办公费用' : '空间租赁')
                    }
                  >
                    {financeCategories.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </AppSelect>
                </label>
                <Field
                  label="票据编号（可选，避免重复录入）"
                  name="invoiceNo"
                  required={false}
                  maxLength={80}
                  value={editBill?.invoiceNo}
                />
                <label className="field">
                  <span>业务说明 / 报销事由</span>
                  <textarea
                    name="note"
                    rows={2}
                    maxLength={2000}
                    defaultValue={editBill?.note}
                  />
                </label>
                <p className="finance-footnote">
                  保存后可在单据详情上传原始凭证。报销审核是本账套内部流程。
                </p>
                <AppButton disabled={busy} className="primary-button full">
                  {busy ? '保存中…' : editBill ? '保存并重新送审' : '提交审核'}
                </AppButton>
              </form>
            )}
            {modal === 'detail' && selected && (
              <>
                <div className="finance-bill-title">
                  <span
                    className={`finance-status ${selected.status === 'approved' ? 'confirmed' : selected.status === 'void' ? 'void' : 'pending'}`}
                  >
                    {billKinds[selected.kind]} · {billState(selected)}
                  </span>
                  <h2>{selected.title}</h2>
                  <p>{selected.counterparty}</p>
                  <strong className="finance-detail-amount">
                    {yuan(selected.amountCents)}
                  </strong>
                </div>
                <div className="ticket-detail-meta">
                  {[
                    ['业务日期', selected.date],
                    ['到期日期', selected.dueDate],
                    ['已收付', yuan(selected.paidCents)],
                    ['未收付', yuan(selected.amountCents - selected.paidCents)],
                    ['票据编号', selected.invoiceNo || '待补充'],
                    ['票面税率', `${selected.taxBps / 100}%`],
                  ].map(([l, v]) => (
                    <span key={l}>
                      {l}
                      <strong>{v}</strong>
                    </span>
                  ))}
                </div>
                <p className="ticket-description">
                  {selected.note || '暂无业务说明'}
                </p>
                {selected.reviewNote && (
                  <p className="finance-review-note">
                    审核 / 作废备注：{selected.reviewNote}
                  </p>
                )}
                <div className="finance-attachment">
                  {selected.attachmentName ? (
                    <a
                      href={`/api/finance/business/attachment?companyId=${encodeURIComponent(companyId)}&billId=${selected.id}`}
                      download
                    >
                      <Download size={15} />
                      {selected.attachmentName}
                    </a>
                  ) : (
                    <span>尚未上传原始凭证</span>
                  )}
                  {selected.status !== 'void' && (
                    <label className="secondary-button">
                      <Upload size={14} />
                      {busy
                        ? '处理中…'
                        : selected.attachmentName
                          ? '替换凭证'
                          : '上传凭证'}
                      <input
                        type="file"
                        accept="application/pdf,image/png,image/jpeg"
                        disabled={busy}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void upload(f);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                  <small>PDF / PNG / JPG，800KB 以内</small>
                </div>
                {!detailAction && (
                  <div className="ticket-actions finance-detail-actions">
                    {['pending', 'rejected'].includes(selected.status) && (
                      <AppButton
                        className="secondary-button"
                        disabled={busy}
                        onClick={() => {
                          setEditBill(selected);
                          setModal('bill');
                        }}
                      >
                        修改资料
                      </AppButton>
                    )}
                    {selected.status === 'pending' && (
                      <>
                        <AppButton
                          className="secondary-button"
                          disabled={busy}
                          onClick={() => setDetailAction('rejected')}
                        >
                          退回修改
                        </AppButton>
                        <AppButton
                          className="primary-button"
                          disabled={busy}
                          onClick={() =>
                            void mutate(
                              detailBody('bill.review', {
                                status: 'approved',
                                reason: '',
                              }),
                              '单据审核通过',
                              false,
                            )
                          }
                        >
                          <Check size={15} />
                          审核通过
                        </AppButton>
                      </>
                    )}
                    {selected.status === 'approved' &&
                      selected.paidCents < selected.amountCents && (
                        <AppButton
                          className="primary-button"
                          disabled={busy}
                          onClick={() => setDetailAction('pay')}
                        >
                          {selected.kind === 'receivable'
                            ? '登记收款'
                            : '登记付款'}
                        </AppButton>
                      )}
                    {selected.status !== 'void' && (
                      <AppButton
                        className="secondary-button"
                        disabled={busy}
                        onClick={() => setDetailAction('voucher')}
                      >
                        补充票据
                      </AppButton>
                    )}
                    {selected.status !== 'void' && selected.paidCents === 0 && (
                      <AppButton
                        className="secondary-button"
                        disabled={busy}
                        onClick={() => setDetailAction('void')}
                      >
                        作废单据
                      </AppButton>
                    )}
                  </div>
                )}
                {detailAction === 'voucher' && (
                  <form
                    className="ticket-form finance-action-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void mutate(
                        detailBody('bill.voucher', formValues(e)),
                        '凭证资料已补齐，关联流水已同步',
                        false,
                      );
                    }}
                  >
                    <Field
                      label="票据编号"
                      name="invoiceNo"
                      value={selected.invoiceNo}
                      required={false}
                      maxLength={80}
                    />
                    <label className="field">
                      <span>业务说明</span>
                      <textarea
                        name="note"
                        maxLength={2000}
                        defaultValue={selected.note}
                        rows={2}
                      />
                    </label>
                    <div className="finance-inline-actions">
                      <AppButton
                        type="button"
                        className="secondary-button"
                        disabled={busy}
                        onClick={() => setDetailAction('')}
                      >
                        取消
                      </AppButton>
                      <AppButton className="primary-button" disabled={busy}>
                        保存凭证资料
                      </AppButton>
                    </div>
                  </form>
                )}
                {detailAction === 'pay' && (
                  <form
                    className="ticket-form finance-action-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void mutate(
                        detailBody('payment.create', formValues(e)),
                        '实际收付款已登记，账户和账本已同步',
                        false,
                      );
                    }}
                  >
                    <p>
                      请按实际已完成的
                      {selected.kind === 'receivable' ? '收款' : '付款'}登记。
                    </p>
                    <label className="field">
                      <span>资金账户</span>
                      <AppSelect name="accountId" required defaultValue="">
                        <option value="" disabled>
                          请选择账户
                        </option>
                        {data.accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} · {yuan(a.balanceCents)}
                          </option>
                        ))}
                      </AppSelect>
                    </label>
                    {!data.accounts.length && (
                      <p className="finance-late">请先到“资金账户”新增账户。</p>
                    )}
                    <div className="form-row">
                      <Field
                        label="本次金额（元，可分次）"
                        name="amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={(
                          (selected.amountCents - selected.paidCents) /
                          100
                        ).toFixed(2)}
                      />
                      <Field
                        label="实际收付款日期"
                        name="date"
                        type="date"
                        value={chinaToday()}
                        min={selected.date}
                      />
                    </div>
                    <Field
                      label="银行流水 / 收付款参考号（可选）"
                      name="reference"
                      required={false}
                    />
                    <Field
                      label="备注（可选）"
                      name="note"
                      required={false}
                      maxLength={2000}
                    />
                    <div className="finance-inline-actions">
                      <AppButton
                        type="button"
                        className="secondary-button"
                        disabled={busy}
                        onClick={() => setDetailAction('')}
                      >
                        取消
                      </AppButton>
                      <AppButton
                        className="primary-button"
                        disabled={busy || !data.accounts.length}
                      >
                        {busy ? '保存中…' : '保存实际收付款'}
                      </AppButton>
                    </div>
                  </form>
                )}
                {['rejected', 'void', 'reverse'].includes(detailAction) && (
                  <form
                    className="ticket-form finance-action-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void mutate(
                        detailAction === 'reverse'
                          ? detailBody('payment.reverse', {
                              ...formValues(e),
                              paymentId: reverseId,
                            })
                          : detailBody('bill.review', {
                              ...formValues(e),
                              status: detailAction,
                            }),
                        detailAction === 'reverse'
                          ? '已冲销，余额与未收付金额已更新'
                          : '单据状态已更新',
                        false,
                      );
                    }}
                  >
                    <p>
                      {detailAction === 'reverse'
                        ? '冲销会撤销该笔已登记收付款，保留原记录及原因。'
                        : detailAction === 'void'
                          ? '作废后保留单据与操作记录。'
                          : '退回后可修改资料并重新提交。'}
                    </p>
                    <Field
                      label={
                        detailAction === 'reverse'
                          ? '冲销原因'
                          : detailAction === 'void'
                            ? '作废原因'
                            : '退回原因'
                      }
                      name="reason"
                      maxLength={500}
                    />
                    <div className="finance-inline-actions">
                      <AppButton
                        type="button"
                        className="secondary-button"
                        disabled={busy}
                        onClick={() => setDetailAction('')}
                      >
                        取消
                      </AppButton>
                      <AppButton disabled={busy} className="primary-button">
                        {busy ? '处理中…' : '确认处理'}
                      </AppButton>
                    </div>
                  </form>
                )}
                <section className="finance-payment-history">
                  <h3>收付款记录</h3>
                  {data.payments
                    .filter((p) => p.billId === selected.id)
                    .map((p) => (
                      <div key={p.id}>
                        <span>
                          {p.date} ·{' '}
                          {
                            data.accounts.find((a) => a.id === p.accountId)
                              ?.name
                          }
                          <small>
                            {p.reference || '未填写参考号'} ·{' '}
                            {p.status === 'reversed' ? '已冲销' : '已入账'}
                          </small>
                        </span>
                        <strong>{yuan(p.amountCents)}</strong>
                        {p.status === 'posted' && (
                          <AppButton
                            className="secondary-button"
                            disabled={busy || !!detailAction}
                            onClick={() => {
                              setReverseId(p.id);
                              setDetailAction('reverse');
                            }}
                          >
                            冲销
                          </AppButton>
                        )}
                      </div>
                    ))}
                  {!data.payments.some((p) => p.billId === selected.id) && (
                    <p>尚未登记实际收付款。</p>
                  )}
                </section>
                <section className="finance-audit">
                  <h3>
                    <History size={15} />
                    单据追溯
                  </h3>
                  {data.audits
                    .filter((a) => a.billId === selected.id)
                    .map((a) => (
                      <p key={a.id}>
                        <time>
                          {new Date(a.createdAt).toLocaleString('zh-CN', {
                            timeZone: 'Asia/Shanghai',
                          })}
                        </time>
                        {a.message}
                      </p>
                    ))}
                </section>
              </>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
