'use client';
import { AppButton, AppSelect } from '@/components/ui/app-controls';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  Download,
  FileCheck2,
  History,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from './ui/dialog';
import {
  chinaToday,
  downloadCsv,
  selectedFinanceCompany,
  rememberFinanceCompany,
  yuan,
} from '@/lib/finance-business';
import {
  deductionStates,
  filingCalendar,
  filingCsv,
  filingLate,
  filingOpen,
  filingStates,
  invoiceCsv,
  invoiceStates,
  invoiceTypes,
  taxSummary,
  taxTypes,
  type TaxData,
  type TaxInvoice,
  type TaxFiling,
  type TaxSource,
} from '@/lib/tax';
import './finance.css';
import './tax.css';
const empty: TaxData = {
  companies: [],
  invoices: [],
  filings: [],
  sources: [],
  audits: [],
};
const values = (e: FormEvent<HTMLFormElement>) =>
  Object.fromEntries(new FormData(e.currentTarget));
function Field({
  label,
  name,
  value = '',
  type = 'text',
  required = true,
  max = 120,
  min,
  step,
}: {
  label: string;
  name: string;
  value?: string;
  type?: string;
  required?: boolean;
  max?: number;
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
        maxLength={max}
        min={min}
        step={step}
      />
    </label>
  );
}
async function api(companyId: string, body?: Record<string, unknown>) {
  const r = await fetch(
    `/api/tax?companyId=${encodeURIComponent(companyId)}`,
    body
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, companyId }),
        }
      : { cache: 'no-store' },
  );
  const d = (await r.json()) as TaxData & { error?: string; id: string };
  if (!r.ok) throw new Error(d.error || '操作失败');
  return d;
}
export default function TaxPanel({fixedCompanyId}:{fixedCompanyId?:string}={}) {
  const [companyId, setCompanyId] = useState(()=>fixedCompanyId||selectedFinanceCompany()),
    [data, setData] = useState(empty),
    [month, setMonth] = useState(chinaToday().slice(0, 7)),
    [tab, setTab] = useState('invoices'),
    [filter, setFilter] = useState('all'),
    [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [modal, setModal] = useState(''),
    [selectedId, setSelectedId] = useState(''),
    [action, setAction] = useState('');
  const [seed, setSeed] = useState<TaxSource | null>(null),
    [editInvoice, setEditInvoice] = useState<TaxInvoice | null>(null),
    [editFiling, setEditFiling] = useState<TaxFiling | null>(null);
  const requestId = useRef(0),
    companyRef = useRef(companyId);
  companyRef.current = companyId;
  async function refresh(id = companyRef.current) {
    const token = ++requestId.current;
    setLoading(true);
    try {
      const d = await api(id);
      if (token === requestId.current) {
        setData(d);
        setError('');
      }
    } catch (e) {
      if (token === requestId.current) setError((e as Error).message);
    } finally {
      if (token === requestId.current) setLoading(false);
    }
  }
  useEffect(() => {
    setData(empty);
    setModal('');
    setNotice('');
    setError('');
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
    try {
      const r = await api(companyId, body);
      if (close) setModal('');
      setAction('');
      await refresh();
      setNotice(message);
      return r;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  const invoice = data.invoices.find((i) => i.id === selectedId),
    filing = data.filings.find((f) => f.id === selectedId),
    summary = taxSummary(data.invoices, month),
    company = data.companies.find((c) => c.id === companyId);
  const filtered = data.invoices.filter(
    (i) =>
      i.date.startsWith(month) &&
      (tab !== 'deductions' || i.direction === 'input') &&
      `${i.invoiceNo} ${i.counterparty} ${i.note}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === 'all' ||
        filter === i.status ||
        filter === i.direction ||
        filter === i.deduction),
  );
  const due = data.filings.filter(
    (f) =>
      (f.deadline.startsWith(month) || filingLate(f)) &&
      `${f.taxType} ${f.owner} ${f.filingNo}`.includes(search) &&
      (filter === 'all' ||
        (filter === 'late' && filingLate(f)) ||
        filter === f.status),
  );
  const unassigned = data.sources.filter(
    (s) =>
      !data.invoices.some(
        (i) => i.sourceId === s.sourceId && i.status !== 'void',
      ) && `${s.title} ${s.counterparty} ${s.invoiceNo}`.includes(search),
  );
  function openInvoice(source: TaxSource | null = null) {
    setSeed(source);
    setEditInvoice(null);
    setModal('invoice');
    setError('');
  }
  function openFiling() {
    setEditFiling(null);
    setModal('filing');
    setError('');
  }
  function changeTab(v: string) {
    setTab(v);
    setSearch('');
    setFilter('all');
    setNotice('');
    setError('');
  }
  const invoiceBody = (operation: string, extra: Record<string, unknown>) => ({
    action: operation,
    id: invoice?.id,
    version: invoice?.version,
    ...extra,
  });
  const filingBody = (operation: string, extra: Record<string, unknown>) => ({
    action: operation,
    id: filing?.id,
    version: filing?.version,
    ...extra,
  });
  async function upload(file: File) {
    if (!invoice) return;
    if (file.size > 819200) {
      setError('请使用 800KB 内的 PDF、PNG 或 JPG');
      return;
    }
    setBusy(true);
    try {
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsDataURL(file);
      });
      await mutate(
        invoiceBody('attachment.save', {
          name: file.name,
          mime: file.type,
          data: content,
        }),
        '发票凭证已保存',
        false,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function calendar() {
    const url = URL.createObjectURL(
      new Blob([filingCalendar(due)], { type: 'text/calendar;charset=utf-8' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `${company?.name}-税务日历-${month}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const ready = !loading && !error;
  return (
    <div className="finance-manager tax-manager">
      <div className="finance-heading">
        <div>
          <div className="finance-eyebrow">
            <ShieldCheck size={14} /> TAX MANAGEMENT
          </div>
          <h1>
            税务管理<span>资料与申报跟进</span>
          </h1>
          <p>发票归集、进项核对、申报节点，按企业账套管理。</p>
        </div>
        <div className="finance-heading-actions">
          <label className="finance-book-label">
            <Building2 size={15} />
            账套
            <AppSelect
              aria-label="选择税务账套"
              disabled={busy || loading || !!fixedCompanyId}
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
            >
              {data.companies.length ? (
                data.companies.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name}
                  </option>
                ))
              ) : (
                <option value={companyId}>加载账套…</option>
              )}
            </AppSelect>
          </label>
          <label>
            账期
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              aria-label="税务账期"
            />
          </label>
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
            label: '销项票面税额',
            value: summary.output,
            color: 'blue',
            icon: ReceiptText,
            hint: '本期已核对 · 红字冲减',
          },
          {
            label: '进项票面税额',
            value: summary.input,
            color: 'green',
            icon: FileCheck2,
            hint: '本期已核对 · 红字冲减',
          },
          {
            label: '已纳入进项资料',
            value: summary.ready,
            color: 'violet',
            icon: ShieldCheck,
            hint: '人工确认资料口径，待申报复核',
          },
        ].map((s) => (
          <section key={s.label} className={s.color}>
            <span>
              {s.label}
              <s.icon size={18} />
            </span>
            <strong>{loading ? '—' : yuan(s.value)}</strong>
            <p>{s.hint}</p>
          </section>
        ))}
        <section className="amber">
          <span>
            待核对资料
            <FileCheck2 size={18} />
          </span>
          <strong>
            {loading ? '—' : summary.pending}
            <small> 笔</small>
          </strong>
          <p>{data.filings.filter(filingLate).length} 项申报 / 缴款已逾期</p>
        </section>
      </div>
      <div
        className="finance-business-tabs"
        role="tablist"
        aria-label="税务业务"
      >
        {[
          { id: 'invoices', label: '发票台账' },
          { id: 'deductions', label: '进项资料' },
          { id: 'filings', label: '申报日历' },
          { id: 'sources', label: '财务待归集' },
        ].map((t) => (
          <AppButton
            role="tab"
            aria-selected={tab === t.id}
            aria-controls="tax-content"
            key={t.id}
            onClick={() => changeTab(t.id)}
          >
            {t.label}
            {t.id === 'sources' && unassigned.length > 0 && (
              <b>{unassigned.length}</b>
            )}
          </AppButton>
        ))}
        <AppButton
          className="finance-tab-refresh"
          aria-label="刷新税务数据"
          disabled={loading || busy}
          onClick={() => void refresh()}
        >
          <RefreshCw size={16} />
        </AppButton>
      </div>
      <section className="finance-main" id="tax-content" role="tabpanel">
        <div className="finance-toolbar">
          <div>
            <h2>
              {
                {
                  invoices: '发票与票据台账',
                  deductions: '进项资料核对',
                  filings: '税费申报与缴款跟进',
                  sources: '已审核财务业务待归集',
                }[tab as 'invoices']
              }
            </h2>
            <p>
              {tab === 'sources'
                ? '从完整业务单据预填资料，分次收付款不会重复归集。'
                : tab === 'filings'
                  ? '按实际核定期限设置截止日期，留存申报回执及缴款记录。'
                  : tab === 'deductions'
                    ? '逐笔核对票面、用途与资料，明确待核验或纳入状态。'
                    : '登记票面金额与税额，人工核对后计入本期汇总。'}
            </p>
          </div>
          <div className="finance-inline-actions">
            {tab === 'filings' ? (
              <>
                <AppButton
                  className="secondary-button"
                  disabled={!due.some(filingOpen) || loading}
                  onClick={calendar}
                >
                  <CalendarDays size={15} />
                  导出日历
                </AppButton>
                <AppButton
                  className="secondary-button"
                  disabled={!due.length || loading}
                  onClick={() =>
                    downloadCsv(filingCsv(due), `${company?.name}-申报跟进.csv`)
                  }
                >
                  <Download size={15} />
                  导出
                </AppButton>
                <AppButton
                  className="primary-button"
                  disabled={!ready || busy}
                  onClick={openFiling}
                >
                  <Plus size={15} />
                  新增申报事项
                </AppButton>
              </>
            ) : (
              <>
                <AppButton
                  className="secondary-button"
                  disabled={tab === 'sources' || !filtered.length || loading}
                  onClick={() =>
                    downloadCsv(
                      invoiceCsv(filtered),
                      `${company?.name}-发票台账-${month}.csv`,
                    )
                  }
                >
                  <Download size={15} />
                  导出发票
                </AppButton>
                <AppButton
                  className="primary-button"
                  disabled={!ready || busy}
                  onClick={() => openInvoice()}
                >
                  <Plus size={15} />
                  登记发票
                </AppButton>
              </>
            )}
          </div>
        </div>
        <div className="finance-filters">
          <label>
            <Search size={15} />
            <input
              aria-label="搜索税务资料"
              value={search}
              placeholder="搜索号码、企业、负责人或备注"
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          {tab !== 'sources' && (
            <AppSelect
              aria-label="筛选税务状态"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              {(tab === 'filings'
                ? [
                    ['all', '全部状态'],
                    ['pending', '待准备'],
                    ['prepared', '资料齐备'],
                    ['filed', '已申报'],
                    ['paid', '已缴税'],
                    ['late', '已逾期'],
                    ['void', '已取消'],
                  ]
                : tab === 'deductions'
                  ? [
                      ['all', '全部资料'],
                      ['pending', '待核验'],
                      ['ready', '已确认纳入'],
                      ['excluded', '不纳入'],
                      ['void', '已作废'],
                    ]
                  : [
                      ['all', '全部发票'],
                      ['output', '销项'],
                      ['input', '进项'],
                      ['pending', '待核对'],
                      ['verified', '已核对'],
                      ['void', '已作废'],
                    ]
              ).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </AppSelect>
          )}
        </div>
        {(tab === 'invoices' || tab === 'deductions') && (
          <div className="finance-table-wrap">
            <table className="finance-table">
              <thead>
                <tr>
                  {[
                    '发票号码 / 日期',
                    '往来单位 / 类型',
                    '含税金额',
                    '票面税额',
                    '核对 / 资料状态',
                    '操作',
                  ].map((t) => (
                    <th key={t}>{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <strong>{i.invoiceNo}</strong>
                      <small>
                        {i.date}
                        {i.attachmentName ? ' · 有凭证' : ''}
                      </small>
                    </td>
                    <td>
                      {i.counterparty}
                      <small>
                        {i.direction === 'output' ? '销项' : '进项'} · {i.type}{' '}
                        · {i.polarity === 'red' ? '红字' : '蓝字'}
                      </small>
                    </td>
                    <td>
                      {i.polarity === 'red' ? '−' : ''}
                      {yuan(i.amountCents)}
                    </td>
                    <td
                      className={
                        i.direction === 'output'
                          ? 'finance-expense'
                          : 'finance-income'
                      }
                    >
                      {i.polarity === 'red' ? '−' : ''}
                      {yuan(i.taxCents)}
                    </td>
                    <td>
                      <span
                        className={`finance-status ${i.status === 'verified' ? 'confirmed' : i.status === 'void' ? 'void' : 'pending'}`}
                      >
                        {invoiceStates[i.status]}
                      </span>
                      {i.direction === 'input' && (
                        <small>{deductionStates[i.deduction]}</small>
                      )}
                    </td>
                    <td>
                      <AppButton
                        aria-label={`查看发票${i.invoiceNo}`}
                        onClick={() => {
                          setSelectedId(i.id);
                          setModal('invoice-detail');
                          setAction('');
                          setError('');
                        }}
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
                <ReceiptText size={32} />
                <h3>{loading ? '正在加载发票…' : '本期暂无匹配票据'}</h3>
                <p>可以直接登记，或从“财务待归集”预填业务资料。</p>
                <AppButton
                  className="primary-button"
                  disabled={!ready || busy}
                  onClick={() => openInvoice()}
                >
                  登记发票
                </AppButton>
              </div>
            )}
          </div>
        )}
        {tab === 'sources' && (
          <div className="finance-table-wrap">
            <table className="finance-table">
              <thead>
                <tr>
                  {[
                    '财务业务 / 日期',
                    '往来单位',
                    '含税金额',
                    '预填税额',
                    '财务票据编号',
                    '',
                  ].map((t, i) => (
                    <th key={i}>{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {unassigned.map((s) => (
                  <tr key={s.sourceId}>
                    <td>
                      {s.title}
                      <small>
                        {s.date} ·{' '}
                        {s.direction === 'output' ? '销项资料' : '进项资料'}
                      </small>
                    </td>
                    <td>{s.counterparty}</td>
                    <td>{yuan(s.amountCents)}</td>
                    <td>{yuan(s.taxCents)}</td>
                    <td>{s.invoiceNo || '待补充'}</td>
                    <td>
                      <AppButton
                        className="secondary-button"
                        disabled={busy || loading}
                        onClick={() => openInvoice(s)}
                      >
                        归集发票
                      </AppButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!unassigned.length && (
              <div className="finance-empty">
                <FileCheck2 size={32} />
                <h3>{loading ? '正在加载业务…' : '没有待归集的财务业务'}</h3>
                <p>已审核单据或已确认的手工收支会在此列出。</p>
              </div>
            )}
          </div>
        )}
        {tab === 'filings' && (
          <div className="finance-table-wrap">
            <table className="finance-table">
              <thead>
                <tr>
                  {[
                    '税费项目 / 所属期',
                    '截止 / 负责人',
                    '申报金额',
                    '状态 / 回执',
                    '操作',
                  ].map((t) => (
                    <th key={t}>{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {due.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <strong>{f.taxType}</strong>
                      <small>
                        {f.periodStart} 至 {f.periodEnd}
                      </small>
                    </td>
                    <td className={filingLate(f) ? 'finance-late' : ''}>
                      {f.deadline}
                      {filingLate(f) ? ' · 已逾期' : ''}
                      <small>{f.owner}</small>
                    </td>
                    <td>{yuan(f.amountCents)}</td>
                    <td>
                      <span
                        className={`finance-status ${['filed', 'paid'].includes(f.status) ? 'confirmed' : f.status === 'void' ? 'void' : 'pending'}`}
                      >
                        {filingStates[f.status]}
                      </span>
                      <small>{f.filingNo || '尚未登记回执'}</small>
                    </td>
                    <td>
                      <AppButton
                        aria-label={`查看${f.taxType}申报${f.periodStart}`}
                        onClick={() => {
                          setSelectedId(f.id);
                          setModal('filing-detail');
                          setAction('');
                          setError('');
                        }}
                      >
                        跟进
                        <ChevronRight size={15} />
                      </AppButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!due.length && (
              <div className="finance-empty">
                <CalendarDays size={32} />
                <h3>{loading ? '正在加载申报事项…' : '本月暂无申报事项'}</h3>
                <p>按企业实际纳税期限建立跟进事项，设置负责人和截止日期。</p>
                <AppButton
                  className="primary-button"
                  disabled={!ready || busy}
                  onClick={openFiling}
                >
                  新增申报事项
                </AppButton>
              </div>
            )}
          </div>
        )}
        <div className="finance-footnote">
          {tab === 'filings'
            ? '显示本月截止事项与尚未完成的历史逾期事项。'
            : tab === 'sources'
              ? '来源覆盖各账期；预填税额需按实际票面复核。'
              : '汇总仅包含已核对票据，红字冲减对应金额；进项资料状态由经办人核验登记。'}
        </div>
      </section>
      <p className="finance-business-note">
        票面税额汇总用于资料核对。申报与缴税状态按实际回执登记，截止日期按企业核定期限填写。
      </p>
      <div className="finance-provenance">
        税务资料流程参考{' '}
        <a
          href="https://docs.frappe.io/erpnext/taxes"
          target="_blank"
          rel="noreferrer"
        >
          ERPNext Taxes
        </a>
        <small>按本地企业工作流程独立实现</small>
      </div>
      {modal && (
        <Dialog
          open
          onOpenChange={(v) => {
            if (!v && !busy) {
              setModal('');
              setAction('');
              setError('');
            }
          }}
        >
          <DialogContent className="park-ticket-dialog finance-dialog tax-dialog">
            <DialogTitle>
              {modal === 'invoice'
                ? editInvoice
                  ? '修改发票并重新核对'
                  : '登记发票'
                : modal === 'filing'
                  ? editFiling
                    ? '修改申报事项'
                    : '新增申报事项'
                  : modal === 'invoice-detail'
                    ? '发票资料详情'
                    : '申报事项详情'}
            </DialogTitle>
            <DialogDescription>
              {modal.startsWith('invoice')
                ? '填写实际票面金额和税额；归集预填的数据需对照原票核验。'
                : '记录企业实际申报计划与结果，日期及金额由经办人确认。'}
            </DialogDescription>
            {error && (
              <div className="feedback error" role="alert">
                {error}
              </div>
            )}
            {modal === 'invoice' && (
              <form
                className="ticket-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void mutate(
                    {
                      action: editInvoice ? 'invoice.edit' : 'invoice.create',
                      ...values(e),
                      ...(editInvoice
                        ? { id: editInvoice.id, version: editInvoice.version }
                        : {}),
                    },
                    '发票资料已保存，待人工核对',
                  );
                }}
              >
                <div className="form-row">
                  <label className="field">
                    <span>发票方向</span>
                    <AppSelect
                      name="direction"
                      defaultValue={
                        editInvoice?.direction ||
                        seed?.direction ||
                        (tab === 'deductions' ? 'input' : 'output')
                      }
                    >
                      <option value="output">销项</option>
                      <option value="input">进项</option>
                    </AppSelect>
                  </label>
                  <label className="field">
                    <span>红蓝字</span>
                    <AppSelect
                      name="polarity"
                      defaultValue={editInvoice?.polarity || 'blue'}
                    >
                      <option value="blue">蓝字</option>
                      <option value="red">红字</option>
                    </AppSelect>
                  </label>
                </div>
                <label className="field">
                  <span>票据种类</span>
                  <AppSelect
                    name="type"
                    defaultValue={editInvoice?.type || '普通发票'}
                  >
                    {invoiceTypes.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </AppSelect>
                </label>
                <div className="form-row">
                  <Field
                    label="发票号码"
                    name="invoiceNo"
                    max={80}
                    value={editInvoice?.invoiceNo || seed?.invoiceNo}
                  />
                  <Field
                    label="开票日期"
                    name="date"
                    type="date"
                    value={editInvoice?.date || seed?.date || chinaToday()}
                  />
                </div>
                <Field
                  label="往来单位"
                  name="counterparty"
                  value={editInvoice?.counterparty || seed?.counterparty}
                />
                <div className="form-row">
                  <Field
                    label="含税金额（元）"
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={
                      editInvoice || seed
                        ? ((editInvoice || seed)!.amountCents / 100).toFixed(2)
                        : ''
                    }
                  />
                  <Field
                    label="实际票面税额（元）"
                    name="taxAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      editInvoice || seed
                        ? ((editInvoice || seed)!.taxCents / 100).toFixed(2)
                        : ''
                    }
                  />
                </div>
                <Field
                  label="原发票号码（红字必填）"
                  name="originalInvoiceNo"
                  required={false}
                  max={80}
                  value={editInvoice?.originalInvoiceNo}
                />
                <label className="field">
                  <span>关联财务业务（可选）</span>
                  <AppSelect
                    name="sourceId"
                    defaultValue={editInvoice?.sourceId || seed?.sourceId || ''}
                  >
                    <option value="">独立登记</option>
                    {data.sources.map((s) => (
                      <option value={s.sourceId} key={s.sourceId}>
                        {s.title} · {yuan(s.amountCents)}
                      </option>
                    ))}
                  </AppSelect>
                </label>
                <label className="field">
                  <span>备注 / 核对要点</span>
                  <textarea
                    name="note"
                    rows={2}
                    maxLength={2000}
                    defaultValue={editInvoice?.note}
                  />
                </label>
                {seed && (
                  <p className="finance-footnote">
                    业务金额与税额已预填，请按原始发票修订后保存。
                  </p>
                )}
                <AppButton className="primary-button full" disabled={busy}>
                  {busy ? '保存中…' : '保存为待核对'}
                </AppButton>
              </form>
            )}
            {modal === 'filing' && (
              <form
                className="ticket-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void mutate(
                    {
                      action: editFiling ? 'filing.edit' : 'filing.create',
                      ...values(e),
                      ...(editFiling
                        ? { id: editFiling.id, version: editFiling.version }
                        : {}),
                    },
                    '申报事项已保存',
                  );
                }}
              >
                <label className="field">
                  <span>税费项目</span>
                  <AppSelect
                    name="taxType"
                    defaultValue={editFiling?.taxType || taxTypes[0]}
                  >
                    {taxTypes.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </AppSelect>
                </label>
                <div className="form-row">
                  <Field
                    label="税款所属期起"
                    name="periodStart"
                    type="date"
                    value={editFiling?.periodStart || month + '-01'}
                  />
                  <Field
                    label="税款所属期止"
                    name="periodEnd"
                    type="date"
                    value={editFiling?.periodEnd}
                  />
                </div>
                <div className="form-row">
                  <Field
                    label="实际截止日期"
                    name="deadline"
                    type="date"
                    value={editFiling?.deadline}
                  />
                  <Field
                    label="负责人"
                    name="owner"
                    max={80}
                    value={editFiling?.owner}
                  />
                </div>
                <Field
                  label="拟申报金额（元，可为 0）"
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    editFiling ? (editFiling.amountCents / 100).toFixed(2) : '0'
                  }
                />
                <label className="field">
                  <span>资料清单 / 备注</span>
                  <textarea
                    name="note"
                    rows={3}
                    maxLength={2000}
                    defaultValue={editFiling?.note}
                  />
                </label>
                <AppButton className="primary-button full" disabled={busy}>
                  {busy ? '保存中…' : '保存申报事项'}
                </AppButton>
              </form>
            )}
            {modal === 'invoice-detail' && invoice && (
              <>
                <div className="finance-bill-title">
                  <span
                    className={`finance-status ${invoice.status === 'verified' ? 'confirmed' : invoice.status === 'void' ? 'void' : 'pending'}`}
                  >
                    {invoiceStates[invoice.status]}
                  </span>
                  <h2>{invoice.invoiceNo}</h2>
                  <p>
                    {invoice.counterparty} · {invoice.type} ·{' '}
                    {invoice.polarity === 'red' ? '红字' : '蓝字'}
                  </p>
                  <strong className="finance-detail-amount">
                    {invoice.polarity === 'red' ? '−' : ''}
                    {yuan(invoice.amountCents)}
                  </strong>
                </div>
                <div className="ticket-detail-meta">
                  {[
                    ['开票日期', invoice.date],
                    ['实际票面税额', yuan(invoice.taxCents)],
                    [
                      '不含税金额',
                      yuan(invoice.amountCents - invoice.taxCents),
                    ],
                    ['核对人', invoice.reviewer || '待核对'],
                    [
                      '进项资料',
                      invoice.direction === 'input'
                        ? deductionStates[invoice.deduction]
                        : '销项资料',
                    ],
                    ['原发票号码', invoice.originalInvoiceNo || '—'],
                  ].map(([l, v]) => (
                    <span key={l}>
                      {l}
                      <strong>{v}</strong>
                    </span>
                  ))}
                </div>
                <p className="ticket-description">
                  {invoice.note || '暂无备注'}
                </p>
                {invoice.sourceId &&
                  !data.sources.some(
                    (s) => s.sourceId === invoice.sourceId,
                  ) && (
                    <p className="finance-review-note">
                      原关联财务业务已变化或作废，请核验发票实际状态。
                    </p>
                  )}
                <div className="finance-attachment">
                  {invoice.attachmentName ? (
                    <a
                      download
                      href={`/api/tax/document?companyId=${companyId}&invoiceId=${invoice.id}`}
                    >
                      <Download size={15} />
                      {invoice.attachmentName}
                    </a>
                  ) : (
                    <span>尚未上传发票凭证</span>
                  )}
                  {invoice.status !== 'void' && (
                    <label className="secondary-button">
                      <Upload size={14} />
                      保存原票
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
                  <small>PDF / PNG / JPG，800KB 内</small>
                  {invoice.sourceAttachmentName && invoice.sourceId.startsWith('bill:') && (
                    <a
                      download
                      href={`/api/finance/business/attachment?companyId=${companyId}&billId=${invoice.sourceId.slice(5)}`}
                    >
                      关联财务凭证
                    </a>
                  )}
                </div>
                {!action && invoice.status !== 'void' && (
                  <div className="ticket-actions finance-detail-actions">
                    <AppButton
                      disabled={busy}
                      className="secondary-button"
                      onClick={() => {
                        setEditInvoice(invoice);
                        setSeed(null);
                        setModal('invoice');
                      }}
                    >
                      修改并重核
                    </AppButton>
                    {invoice.status === 'pending' && (
                      <AppButton
                        className="primary-button"
                        disabled={busy}
                        onClick={() => setAction('verify')}
                      >
                        <Check size={15} />
                        核对票据
                      </AppButton>
                    )}
                    <AppButton
                      className="secondary-button"
                      disabled={busy}
                      onClick={() => setAction('invoice-void')}
                    >
                      作废发票
                    </AppButton>
                  </div>
                )}
                {action === 'verify' && (
                  <form
                    className="ticket-form finance-action-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void mutate(
                        invoiceBody('invoice.review', {
                          ...values(e),
                          status: 'verified',
                          reason: '',
                        }),
                        '发票已人工核对',
                        false,
                      );
                    }}
                  >
                    <Field label="核对人" name="reviewer" max={80} />
                    {invoice.direction === 'input' && (
                      <label className="field">
                        <span>进项资料处理</span>
                        <AppSelect name="deduction" defaultValue="pending">
                          {Object.entries(deductionStates).map(([v, l]) => (
                            <option key={v} value={v}>
                              {l}
                            </option>
                          ))}
                        </AppSelect>
                      </label>
                    )}
                    <p>
                      按票面与业务用途核验资料。纳入状态用于本账套准备申报资料。
                    </p>
                    <div className="finance-inline-actions">
                      <AppButton
                        type="button"
                        className="secondary-button"
                        disabled={busy}
                        onClick={() => setAction('')}
                      >
                        取消
                      </AppButton>
                      <AppButton className="primary-button" disabled={busy}>
                        保存核对结果
                      </AppButton>
                    </div>
                  </form>
                )}
                {action === 'invoice-void' && (
                  <form
                    className="ticket-form finance-action-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void mutate(
                        invoiceBody('invoice.review', {
                          ...values(e),
                          status: 'void',
                          deduction: invoice.deduction,
                        }),
                        '发票管理记录已作废',
                        false,
                      );
                    }}
                  >
                    <Field label="作废原因" name="reason" max={500} />
                    <p>
                      仅更新本地管理记录，原票在税务系统中的处理需按实际渠道完成。
                    </p>
                    <div className="finance-inline-actions">
                      <AppButton
                        type="button"
                        className="secondary-button"
                        disabled={busy}
                        onClick={() => setAction('')}
                      >
                        取消
                      </AppButton>
                      <AppButton className="primary-button" disabled={busy}>
                        保存作废记录
                      </AppButton>
                    </div>
                  </form>
                )}
                <section className="finance-audit">
                  <h3>
                    <History size={15} />
                    发票追溯
                  </h3>
                  {data.audits
                    .filter((a) => a.billId === 'tax:' + invoice.id)
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
            {modal === 'filing-detail' && filing && (
              <>
                <div className="finance-bill-title">
                  <span
                    className={`finance-status ${['filed', 'paid'].includes(filing.status) ? 'confirmed' : filing.status === 'void' ? 'void' : 'pending'}`}
                  >
                    {filingStates[filing.status]}
                  </span>
                  <h2>{filing.taxType}</h2>
                  <p>
                    {filing.periodStart} 至 {filing.periodEnd}
                  </p>
                  <strong className="finance-detail-amount">
                    {yuan(filing.amountCents)}
                  </strong>
                </div>
                <div className="ticket-detail-meta">
                  {[
                    ['截止日期', filing.deadline],
                    ['负责人', filing.owner],
                    ['申报回执号', filing.filingNo || '待登记'],
                    ['实际申报日期', filing.filedDate || '—'],
                    ['缴款参考号', filing.paymentReference || '待登记'],
                    ['实际缴款日期', filing.paidDate || '—'],
                  ].map(([l, v]) => (
                    <span key={l}>
                      {l}
                      <strong>{v}</strong>
                    </span>
                  ))}
                </div>
                <p className="ticket-description">
                  {filing.note || '暂无资料清单'}
                </p>
                {!action && (
                  <div className="ticket-actions finance-detail-actions">
                    {['pending', 'prepared'].includes(filing.status) && (
                      <>
                        <AppButton
                          className="secondary-button"
                          disabled={busy}
                          onClick={() => {
                            setEditFiling(filing);
                            setModal('filing');
                          }}
                        >
                          修改事项
                        </AppButton>
                        <AppButton
                          className="secondary-button"
                          disabled={busy}
                          onClick={() => setAction('filing-void')}
                        >
                          取消事项
                        </AppButton>
                      </>
                    )}
                    {filing.status === 'pending' && (
                      <AppButton
                        className="primary-button"
                        disabled={busy}
                        onClick={() =>
                          void mutate(
                            filingBody('filing.status', {
                              status: 'prepared',
                              reason: '',
                            }),
                            '已记录资料齐备',
                            false,
                          )
                        }
                      >
                        资料齐备
                      </AppButton>
                    )}
                    {filing.status === 'prepared' && (
                      <AppButton
                        className="primary-button"
                        disabled={busy}
                        onClick={() => setAction('filed')}
                      >
                        登记已申报
                      </AppButton>
                    )}
                    {filing.status === 'filed' && filing.amountCents > 0 && (
                      <AppButton
                        className="primary-button"
                        disabled={busy}
                        onClick={() => setAction('paid')}
                      >
                        登记已缴税
                      </AppButton>
                    )}
                  </div>
                )}
                {(action === 'filed' ||
                  action === 'paid' ||
                  action === 'filing-void') && (
                  <form
                    className="ticket-form finance-action-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void mutate(
                        filingBody('filing.status', {
                          ...values(e),
                          status: action === 'filing-void' ? 'void' : action,
                          reason:
                            action === 'filing-void'
                              ? new FormData(e.currentTarget).get('reason')
                              : '',
                        }),
                        '实际税务结果已登记',
                        false,
                      );
                    }}
                  >
                    {action === 'filed' ? (
                      <>
                        <Field label="申报回执号" name="filingNo" />
                        <Field
                          label="实际申报日期"
                          name="filedDate"
                          type="date"
                          value={chinaToday()}
                        />
                      </>
                    ) : action === 'paid' ? (
                      <>
                        <Field label="缴款参考号" name="paymentReference" />
                        <Field
                          label="实际缴款日期"
                          name="paidDate"
                          type="date"
                          value={chinaToday()}
                        />
                        <p>按实际缴款凭证登记，资金支出在财务管理中核对。</p>
                      </>
                    ) : (
                      <Field label="取消原因" name="reason" max={500} />
                    )}
                    <div className="finance-inline-actions">
                      <AppButton
                        type="button"
                        disabled={busy}
                        className="secondary-button"
                        onClick={() => setAction('')}
                      >
                        取消
                      </AppButton>
                      <AppButton className="primary-button" disabled={busy}>
                        保存实际结果
                      </AppButton>
                    </div>
                  </form>
                )}
                <section className="finance-audit">
                  <h3>
                    <History size={15} />
                    申报事项记录
                  </h3>
                  {data.audits
                    .filter((a) => a.billId === 'tax:' + filing.id)
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
