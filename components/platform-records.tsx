'use client';
import { AppButton, AppSelect } from '@/components/ui/app-controls';
import KnowledgeImport from './knowledge-import';
import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Check,
  Download,
  FileText,
  History,
  Plus,
  Save,
  Search,
  Sparkles,
  Upload,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from './ui/dialog';
import {
  modules,
  type BusinessRecord,
  type FieldSpec,
} from '@/lib/platform-config';
import {
  callApi,
  csvCell,
  localToday,
  parseCsv,
  saveBlob,
  uploadBusinessFile,
  type PlatformData,
  type FinanceSummary,
} from '@/lib/platform-client';
import { exportDocument } from '@/lib/platform-export';
import PlatformVideo from './platform-video';
export function RecordsPanel({
  companyId,
  kind,
  data,
  search,
  setSearch,
  onOpen,
  onCreate,
  onImported,
}: {
  companyId: string;
  kind: string;
  data: PlatformData;
  search: string;
  setSearch: (s: string) => void;
  onOpen: (r: BusinessRecord) => void;
  onCreate: () => void;
  onImported: () => Promise<void>;
}) {
  const spec = modules[kind],
    [filter, setFilter] = useState('全部'),
    [layout, setLayout] = useState('列表'),
    [importing, setImporting] = useState(false);
  useEffect(() => {
    setFilter('全部');
    setLayout('列表');
  }, [kind]);
  const list = data.records.filter(
    (r) =>
      r.kind === kind &&
      (filter === '全部' || r.status === filter) &&
      (r.title + r.owner + Object.values(r.data).join(' '))
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const canWrite = data.role !== 'viewer';
  function csv(template = false) {
    const fields = [
      'title',
      'owner',
      'dueDate',
      ...spec.fields.map((f) => f.key),
    ];
    const rows = template
      ? [fields]
      : [
          fields,
          ...list.map((r) =>
            fields.map(
              (f) =>
                (r as unknown as Record<string, string>)[f] || r.data[f] || '',
            ),
          ),
        ];
    saveBlob(
      `${spec.label}${template ? '导入模板' : '数据'}.csv`,
      new Blob(
        ['\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n')],
        { type: 'text/csv;charset=utf-8' },
      ),
    );
  }
  return (
    <>
      <div className="pf-page-title">
        <div>
          <span className="pf-eyebrow">{spec.group}</span>
          <h1>{spec.label}</h1>
          <p>{spec.description}</p>
        </div>
        <div className="pf-actions">
          {kind === 'knowledge' && (
            <KnowledgeImport
              companyId={companyId}
              disabled={!canWrite}
              onImported={onImported}
            />
          )}
          <AppButton onClick={() => csv(true)}>导入模板</AppButton>
          <AppButton
            disabled={!['admin', 'manager'].includes(data.role)}
            onClick={() => setImporting(true)}
          >
            <Upload size={15} />
            导入
          </AppButton>
          <AppButton onClick={() => csv()} disabled={!list.length}>
            <Download size={15} />
            导出
          </AppButton>
          <AppButton
            className="primary-button"
            disabled={!canWrite}
            onClick={onCreate}
          >
            <Plus size={16} />
            新建{spec.label.replace(/与.*|管理|配置/g, '')}
          </AppButton>
        </div>
      </div>
      <div className="pf-filters">
        <label>
          <Search size={17} />
          <input
            aria-label={`搜索${spec.label}`}
            placeholder="搜索标题、负责人或资料…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <AppSelect
          aria-label="筛选状态"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option>全部</option>
          {spec.states.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </AppSelect>
        <div className="pf-tabs">
          {['列表', '看板', '日历'].map((s) => (
            <AppButton
              className={layout === s ? 'active' : ''}
              key={s}
              onClick={() => setLayout(s)}
            >
              {s}
            </AppButton>
          ))}
        </div>
        <span className="pf-muted">{list.length} 条记录</span>
      </div>
      {layout === '看板' ? (
        <div className="pf-kanban">
          {spec.states.map((s) => (
            <section key={s}>
              <h2>
                {s}
                <span>{list.filter((r) => r.status === s).length}</span>
              </h2>
              {list
                .filter((r) => r.status === s)
                .map((r) => (
                  <AppButton
                    key={r.id}
                    className="pf-record-card"
                    onClick={() => onOpen(r)}
                  >
                    <strong>{r.title}</strong>
                    <p>{Object.values(r.data).find(Boolean)?.slice(0, 90)}</p>
                    <small>
                      {r.owner}
                      {r.dueDate ? ` · ${r.dueDate}` : ''}
                    </small>
                  </AppButton>
                ))}
            </section>
          ))}
        </div>
      ) : layout === '日历' ? (
        <section className="pf-panel">
          <h2>按截止日期安排</h2>
          {[...new Set(list.map((r) => r.dueDate || '未排期'))]
            .sort()
            .map((date) => (
              <div className="pf-calendar-group" key={date}>
                <h3>{date}</h3>
                {list
                  .filter((r) => (r.dueDate || '未排期') === date)
                  .map((r) => (
                    <AppButton
                      key={r.id}
                      className="pf-list-row"
                      onClick={() => onOpen(r)}
                    >
                      <strong>{r.title}</strong>
                      <span>{r.owner}</span>
                      <span className="pf-status">{r.status}</span>
                    </AppButton>
                  ))}
              </div>
            ))}
        </section>
      ) : (
        <section className="pf-panel pf-table-wrap">
          <table>
            <thead>
              <tr>
                <th>业务事项</th>
                <th>负责人</th>
                {spec.fields.slice(0, 2).map((f) => (
                  <th key={f.key}>{f.label}</th>
                ))}
                <th>截止日期</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id}>
                  <td>
                    <AppButton className="pf-title-link" onClick={() => onOpen(r)}>
                      {r.title}
                    </AppButton>
                    <small>
                      更新于{' '}
                      {new Date(r.updatedAt).toLocaleString('zh-CN', {
                        timeZone: 'Asia/Shanghai',
                      })}
                    </small>
                  </td>
                  <td>{r.owner}</td>
                  {spec.fields.slice(0, 2).map((f) => (
                    <td key={f.key}>
                      {f.type === 'ref'
                        ? data.records.find((x) => x.id === r.data[f.key])
                            ?.title || '—'
                        : (r.data[f.key] || '—').slice(0, 70)}
                    </td>
                  ))}
                  <td
                    className={
                      r.dueDate &&
                      r.dueDate < localToday() &&
                      !['已完成', '已归档'].includes(r.status)
                        ? 'pf-danger'
                        : ''
                    }
                  >
                    {r.dueDate || '未排期'}
                  </td>
                  <td>
                    <span className="pf-status">{r.status}</span>
                  </td>
                  <td>
                    <AppButton
                      onClick={() => onOpen(r)}
                      aria-label={`查看${r.title}`}
                    >
                      <ArrowRight size={16} />
                    </AppButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!list.length && (
            <div className="pf-empty">
              <FileText size={35} />
              <h3>暂无{spec.label}记录</h3>
              <p>登记真实业务资料，开始建立可追溯的经营记录。</p>
              <AppButton
                className="primary-button"
                disabled={!canWrite}
                onClick={onCreate}
              >
                <Plus size={16} />
                新建记录
              </AppButton>
            </div>
          )}
        </section>
      )}
      {importing && (
        <ImportDialog
          companyId={companyId}
          kind={kind}
          onImported={onImported}
          onClose={() => setImporting(false)}
        />
      )}
    </>
  );
}
function DynamicField({
  field,
  value,
  onChange,
  records,
  finance,
  disabled,
}: {
  field: FieldSpec;
  finance?: FinanceSummary | null;
  value: string;
  onChange: (v: string) => void;
  records: BusinessRecord[];
  disabled: boolean;
}) {
  return (
    <label className={field.type === 'textarea' ? 'pf-wide' : ''}>
      <span>
        {field.label}
        {field.required && <b> *</b>}
      </span>
      {finance && ['billId', 'filingId'].includes(field.key) ? (
        <AppSelect
          required={field.required}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">请选择本企业业务</option>
          {field.key === 'billId'
            ? finance.bills
                .filter((b) => b.status !== 'void')
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} · {(b.amountCents / 100).toFixed(2)}元
                  </option>
                ))
            : finance.filings?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.taxType} · {f.periodStart} 至 {f.periodEnd}
                </option>
              ))}
        </AppSelect>
      ) : field.type === 'textarea' ? (
        <textarea
          rows={field.key === 'content' ? 10 : 3}
          required={field.required}
          maxLength={30000}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : field.type === 'select' || field.type === 'ref' ? (
        <AppSelect
          required={field.required}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">请选择</option>
          {field.type === 'ref'
            ? records
                .filter((r) => r.kind === field.ref)
                .map((r) => (
                  <option value={r.id} key={r.id}>
                    {r.title} · {r.status}
                  </option>
                ))
            : field.options?.map((s) => <option key={s}>{s}</option>)}
        </AppSelect>
      ) : (
        <input
          type={
            field.type === 'datetime'
              ? 'datetime-local'
              : field.type === 'money' || field.type === 'number'
                ? 'number'
                : field.type || 'text'
          }
          step={
            field.type === 'money'
              ? '.01'
              : field.type === 'number'
                ? '.0001'
                : undefined
          }
          min={field.min ?? (field.type === 'money' ? 0 : undefined)}
          max={field.max}
          required={field.required}
          maxLength={2000}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
export function RecordEditor({
  record,
  companyId,
  data,
  onClose,
  onSave,
  onAction,
  onRefresh,
}: {
  record: BusinessRecord;
  companyId: string;
  data: PlatformData;
  onClose: () => void;
  onSave: (r: BusinessRecord) => Promise<void>;
  onAction: (body: Record<string, unknown>, endpoint?: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  const [draft, setDraft] = useState(record),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [tab, setTab] = useState('资料'),
    [history, setHistory] = useState<
      {
        id: string;
        actorName: string;
        action: string;
        createdAt: string;
        snapshot: string;
      }[]
    >([]),
    [stepDraft, setStepDraft] = useState(''),
    [rentPeriod, setRentPeriod] = useState(localToday().slice(0, 7)),
    [rentAmount, setRentAmount] = useState(record.data.rent || '');
  const spec = modules[record.kind],
    isNew = !record.id,
    readonly = data.role === 'viewer',
    locked =
      !isNew &&
      (spec.review?.includes(record.status) ||
        record.status === spec.states.at(-1)),
    steps = data.steps.filter((s) => s.runId === record.id),
    current = steps.find((s) => s.status === '待确认');
  useEffect(() => setStepDraft(current?.content || ''), [current?.id]);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save(e?: FormEvent) {
    e?.preventDefault();
    await run(() => onSave(draft));
  }
  async function audit() {
    setTab('版本记录');
    await run(async () => {
      const d = await callApi(
        `/api/platform?companyId=${encodeURIComponent(companyId)}&history=${record.id}`,
      );
      setHistory(d.history);
    });
  }
  const canReview = ['admin', 'manager'].includes(data.role);
  const transitions =
    spec.transitions[record.status]?.filter(
      (s) => !spec.review?.includes(s) || canReview,
    ) || [];
  const linked = data.records.filter((r) =>
    Object.values(r.data).includes(record.id),
  );
  const billLink = data.links.find(
    (l) => l.sourceId === record.id && l.action === 'bill.fromSource',
  );
  const autoActions: { label: string; action: string }[] = [];
  if (record.status === '已确认') {
    if (record.kind === 'contract')
      autoActions.push({
        label: '建立订单',
        action: 'operations/contract.toOrder',
      });
    if (record.kind === 'order')
      autoActions.push({
        label: '建立履约项目',
        action: 'operations/order.toProject',
      });
    if (record.kind === 'collectionPlan')
      autoActions.push({
        label: '本期转财务应收',
        action: 'operations/collectionPlan.bill',
      });
    if (record.kind === 'renewal')
      autoActions.push({
        label: '建立续租合同草稿',
        action: 'operations/renewal.apply',
      });
  }
  if (record.kind === 'quotation' && record.status === '已确认')
    autoActions.push({ label: '一键创建项目', action: 'project.fromQuote' });
  if (record.kind === 'project')
    autoActions.push({ label: '套用确认模板', action: 'tasks.fromTemplate' });
  if (record.kind === 'retrospective' && record.status === '已确认')
    autoActions.push({ label: '经验回知识库', action: 'knowledge.fromReview' });
  if (
    (['acceptance', 'reading', 'change'].includes(record.kind) &&
      record.status === '已确认') ||
    (record.kind === 'supplierQuote' && record.status === '已选定')
  )
    autoActions.push({
      label: billLink ? '查看已生成单号' : '生成待审核财务单据',
      action: 'bill.fromSource',
    });
  return (
    <Dialog open onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="pf-record-dialog">
        <DialogTitle>
          {isNew ? '新建' : '查看'}
          {spec.label}
        </DialogTitle>
        <DialogDescription>
          {isNew
            ? '保存后可提交审核并关联其他业务。'
            : `${record.status} · ${record.owner} · 版本 ${record.version.slice(0, 8)}`}
        </DialogDescription>
        {!isNew && (
          <div className="pf-tabs">
            {['资料', '业务关联', '附件'].map((t) => (
              <AppButton
                key={t}
                className={tab === t ? 'active' : ''}
                onClick={() => setTab(t)}
              >
                {t}
              </AppButton>
            ))}
            <AppButton
              className={tab === '版本记录' ? 'active' : ''}
              onClick={() => void audit()}
            >
              <History size={14} />
              版本记录
            </AppButton>
          </div>
        )}
        {error && (
          <div className="feedback error" role="alert">
            {error}
          </div>
        )}
        {tab === '资料' ? (
          <>
            <form
              className="pf-form pf-record-form"
              onSubmit={(e) => void save(e)}
            >
              <label className="pf-wide">
                标题
                <input
                  required
                  maxLength={160}
                  disabled={busy || readonly || locked}
                  value={draft.title}
                  onChange={(e) =>
                    setDraft({ ...draft, title: e.target.value })
                  }
                />
              </label>
              <label>
                负责人
                <input
                  required
                  maxLength={100}
                  disabled={busy || readonly}
                  value={draft.owner}
                  onChange={(e) =>
                    setDraft({ ...draft, owner: e.target.value })
                  }
                />
              </label>
              <label>
                截止日期
                <input
                  type="date"
                  disabled={busy || readonly}
                  value={draft.dueDate}
                  onChange={(e) =>
                    setDraft({ ...draft, dueDate: e.target.value })
                  }
                />
              </label>
              {spec.fields
                .filter(
                  (f) =>
                    !['timeline', 'audioId', 'audioVolume'].includes(f.key),
                )
                .map((f) => (
                  <DynamicField
                    key={f.key}
                    field={f}
                    value={draft.data[f.key] || ''}
                    onChange={(value) =>
                      setDraft({
                        ...draft,
                        data: { ...draft.data, [f.key]: value },
                      })
                    }
                    records={data.records}
                    finance={data.finance}
                    disabled={busy || readonly || !!locked}
                  />
                ))}
              <div className="pf-actions pf-wide">
                <AppButton className="primary-button" disabled={busy || readonly}>
                  <Save size={16} />
                  {busy ? '正在保存…' : isNew ? '保存业务记录' : '保存修改'}
                </AppButton>
                {locked && (
                  <span className="pf-muted">
                    确认版本已锁定；修改正文前先退回初始状态。
                  </span>
                )}
              </div>
            </form>
            {!isNew && (
              <div className="pf-record-workflow">
                <h3>业务流程</h3>
                <AppButton
                  disabled={busy || readonly}
                  onClick={() =>
                    void run(() =>
                      onAction({
                        action: 'record.copy',
                        id: record.id,
                        version: record.version,
                      }),
                    )
                  }
                >
                  复制为新版本
                </AppButton>
                <div className="pf-steps">
                  {spec.states.map((s) => (
                    <span
                      className={s === record.status ? 'active' : ''}
                      key={s}
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <div className="pf-actions">
                  {record.kind !== 'aiRun' &&
                    transitions.map((s) => (
                      <AppButton
                        disabled={busy || readonly}
                        key={s}
                        onClick={() =>
                          void run(() =>
                            onAction({
                              action: 'record.transition',
                              id: record.id,
                              version: record.version,
                              status: s,
                            }),
                          )
                        }
                      >
                        <Check size={15} />
                        {s === spec.states[0] ? '退回' + s : '设为' + s}
                      </AppButton>
                    ))}
                  {canReview &&
                    autoActions.map((a) => (
                      <AppButton
                        className="primary-button"
                        disabled={busy}
                        key={a.action}
                        onClick={() =>
                          void run(() =>
                            onAction(
                              {
                                action: a.action.replace('operations/', ''),
                                id: record.id,
                                version: record.version,
                              },
                              a.action.startsWith('operations/')
                                ? '/api/platform/operations'
                                : '/api/platform',
                            ),
                          )
                        }
                      >
                        {a.label}
                        <ArrowRight size={15} />
                      </AppButton>
                    ))}
                </div>
                {billLink && (
                  <p className="pf-muted">
                    关联财务单号：{billLink.targetId}
                    。到财务管理核对、审核和登记收付。
                  </p>
                )}
              </div>
            )}
            {!isNew &&
              record.kind === 'lease' &&
              record.status === '已确认' && (
                <section className="pf-record-workflow">
                  <h3>按月生成租金应收</h3>
                  <div className="pf-form pf-record-form">
                    <label>
                      租金账期
                      <input
                        type="month"
                        value={rentPeriod}
                        onChange={(e) => setRentPeriod(e.target.value)}
                      />
                    </label>
                    <label>
                      当月实际约定金额（元）
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={rentAmount}
                        onChange={(e) => setRentAmount(e.target.value)}
                      />
                    </label>
                  </div>
                  <p className="pf-muted">
                    首末月、优惠和调整按双方实际约定填写。同一租约同一账期只生成一次。
                  </p>
                  <AppButton
                    disabled={busy || !canReview}
                    onClick={() =>
                      void run(() =>
                        onAction(
                          {
                            action: 'lease.monthBill',
                            id: record.id,
                            version: record.version,
                            period: rentPeriod,
                            amount: rentAmount,
                          },
                          '/api/platform/operations',
                        ),
                      )
                    }
                  >
                    生成当月待审核应收
                  </AppButton>
                </section>
              )}
            {!isNew && record.kind === 'material' && (
              <section className="pf-record-workflow">
                <h3>内容生产与交付</h3>
                <div className="pf-actions">
                  <AppButton
                    disabled={busy || readonly || record.status !== '草稿'}
                    onClick={() =>
                      void run(() =>
                        onAction(
                          {
                            action: 'material.generate',
                            id: record.id,
                            version: record.version,
                          },
                          '/api/platform/ai',
                        ),
                      )
                    }
                  >
                    <Sparkles size={15} />
                    {data.aiConfigured ? 'AI 生成草稿' : '规则模板生成'}
                  </AppButton>
                  {(['md', 'docx', 'pptx', 'svg'] as const).map((format) => (
                    <AppButton
                      key={format}
                      disabled={busy || !record.data.content}
                      onClick={() =>
                        void run(() => exportDocument(record, format))
                      }
                    >
                      <Download size={15} />
                      {format.toUpperCase()}
                    </AppButton>
                  ))}
                </div>
                <p className="pf-muted">
                  海报导出为可编辑
                  SVG；文档与演示均保留可编辑文字。未经审核的导出保留草稿状态。
                </p>
              </section>
            )}
            {!isNew && record.kind === 'knowledge' && (
              <section className="pf-record-workflow">
                <AppButton
                  disabled={busy || readonly || record.status !== '已确认'}
                  onClick={() =>
                    void run(() =>
                      onAction(
                        {
                          action: 'knowledge.distill',
                          id: record.id,
                          version: record.version,
                        },
                        '/api/platform/ai',
                      ),
                    )
                  }
                >
                  <Sparkles size={16} />
                  整理为下一层知识草稿
                </AppButton>
              </section>
            )}
            {!isNew && record.kind === 'aiRun' && (
              <section className="pf-record-workflow">
                <h3>岗位接力与人工接管</h3>
                {steps.map((s) => (
                  <details
                    className="pf-ai-step"
                    key={s.id}
                    open={s.status === '待确认'}
                  >
                    <summary>
                      步骤 {s.step} ·{' '}
                      {data.records.find((r) => r.id === s.roleId)?.title} ·{' '}
                      {s.status} · {s.provider}
                    </summary>
                    <pre>{s.content}</pre>
                    <small>
                      输入 {s.inputTokens} / 输出 {s.outputTokens} token ·
                      资料来源 {s.sources}
                    </small>
                  </details>
                ))}
                {current && (
                  <>
                    <label className="pf-form">
                      人工修订当前成果
                      <textarea
                        rows={10}
                        value={stepDraft}
                        onChange={(e) => setStepDraft(e.target.value)}
                        disabled={!canReview || busy}
                      />
                    </label>
                    <AppButton
                      className="primary-button"
                      disabled={!canReview || busy}
                      onClick={() =>
                        void run(() =>
                          onAction(
                            {
                              action: 'step.approve',
                              id: record.id,
                              version: record.version,
                              stepId: current.id,
                              content: stepDraft,
                            },
                            '/api/platform/ai',
                          ),
                        )
                      }
                    >
                      确认此步成果
                    </AppButton>
                  </>
                )}
                {record.status === '待执行' && (
                  <AppButton
                    className="primary-button"
                    disabled={busy || readonly}
                    onClick={() =>
                      void run(() =>
                        onAction(
                          {
                            action: 'run.next',
                            id: record.id,
                            version: record.version,
                          },
                          '/api/platform/ai',
                        ),
                      )
                    }
                  >
                    <Sparkles size={16} />
                    执行下一岗位
                  </AppButton>
                )}
              </section>
            )}
            {!isNew && record.kind === 'video' && (
              <PlatformVideo
                onRendered={onRefresh}
                onBusy={setBusy}
                record={record}
                files={data.files.filter((f) => f.recordId === record.id)}
                onSave={(d) => run(() => onSave({ ...record, data: d }))}
              />
            )}
          </>
        ) : tab === '附件' ? (
          <section className="pf-record-workflow">
            <h3>业务附件与素材</h3>
            <p className="pf-muted">
              支持 PDF、图片、音视频与文本，单文件最多 8 MB，最多 20 个附件。
            </p>
            <label className="secondary-button">
              <Upload size={16} />
              上传文件
              <input
                type="file"
                hidden
                disabled={busy || readonly}
                accept="application/pdf,image/png,image/jpeg,image/webp,video/mp4,video/webm,audio/mpeg,audio/wav,audio/mp4,text/plain,.md"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file)
                    void run(async () => {
                      await uploadBusinessFile(companyId, record.id, file);
                      await onRefresh();
                    });
                }}
              />
            </label>
            {data.files
              .filter((f) => f.recordId === record.id)
              .map((f) => (
                <a
                  className="pf-list-row"
                  key={f.id}
                  href={`/api/platform/files?companyId=${encodeURIComponent(companyId)}&id=${f.id}`}
                >
                  <FileText size={17} />
                  {f.name}
                  <small>{Math.ceil(f.size / 1024)} KB</small>
                  <Download size={16} />
                </a>
              ))}
          </section>
        ) : tab === '业务关联' ? (
          <section className="pf-record-workflow">
            <h3>当前版本关联</h3>
            {spec.fields
              .filter((f) => f.type === 'ref' && record.data[f.key])
              .map((f) => (
                <div className="pf-list-row" key={f.key}>
                  <span>{f.label}</span>
                  <strong>
                    {
                      data.records.find((r) => r.id === record.data[f.key])
                        ?.title
                    }
                  </strong>
                  <small>{record.data[f.key]}</small>
                </div>
              ))}
            <h3>后续业务</h3>
            {linked.map((r) => (
              <div className="pf-list-row" key={r.id}>
                <span>{modules[r.kind].label}</span>
                <strong>{r.title}</strong>
                <span className="pf-status">{r.status}</span>
              </div>
            ))}
            {!linked.length && <p className="pf-muted">暂无后续关联记录</p>}
          </section>
        ) : (
          <section className="pf-record-workflow">
            {history.map((h) => (
              <details key={h.id} className="pf-history-item">
                <summary>
                  {h.action} · {h.actorName} ·{' '}
                  {new Date(h.createdAt).toLocaleString('zh-CN', {
                    timeZone: 'Asia/Shanghai',
                  })}
                </summary>
                <pre>{JSON.stringify(JSON.parse(h.snapshot), null, 2)}</pre>
              </details>
            ))}
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}
export function ImportDialog({
  companyId,
  kind,
  onClose,
  onImported,
}: {
  companyId: string;
  kind: string;
  onClose: () => void;
  onImported?: () => Promise<void>;
}) {
  const [rows, setRows] = useState<string[][]>([]),
    [mapping, setMapping] = useState<Record<string, string>>({}),
    [result, setResult] = useState<{
      valid: number;
      issues: { row: number; message: string }[];
    } | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [batchId] = useState(() => crypto.randomUUID());
  const fields = [
    { key: 'title', label: '标题', required: true },
    { key: 'owner', label: '负责人', required: true },
    { key: 'dueDate', label: '截止日期' },
    ...modules[kind].fields,
  ];
  async function fileSelected(file: File) {
    try {
      setError('');
      setResult(null);
      if (file.size > 8 * 1024 * 1024) throw new Error('导入文件上限 8 MB');
      let parsed: string[][];
      if (/\.xlsx$/i.test(file.name)) {
        const { default: ExcelJS } = await import('exceljs');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(await file.arrayBuffer());
        const sheet = workbook.worksheets[0];
        parsed = [];
        sheet.eachRow((row) => {
          parsed.push(
            Array.from(
              { length: sheet.columnCount },
              (_, i) => row.getCell(i + 1).text,
            ),
          );
        });
      } else parsed = parseCsv((await file.text()).replace(/^\uFEFF/, ''));
      if (parsed.length < 2 || parsed.length > 101)
        throw new Error('请使用包含表头和 1 至 100 行数据的文件');
      setRows(parsed);
      const m: Record<string, string> = {};
      fields.forEach((f) => {
        const i = parsed[0].findIndex((c) => c === f.key || c === f.label);
        m[f.key] = i < 0 ? '' : String(i);
      });
      setMapping(m);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function submit(preview: boolean) {
    setBusy(true);
    try {
      if (!companyId) throw new Error('请重新选择当前企业后导入');
      const payload = rows
        .slice(1)
        .map((row) =>
          Object.fromEntries(
            fields.map((f) => [
              f.key,
              mapping[f.key] !== '' ? row[Number(mapping[f.key])] || '' : '',
            ]),
          ),
        );
      const d = await callApi('/api/platform/import', {
        companyId,
        kind,
        rows: payload,
        preview,
        batchId,
      });
      if (preview) setResult(d);
      else {
        await onImported?.();
        onClose();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="pf-record-dialog">
        <DialogTitle>导入{modules[kind].label}</DialogTitle>
        <DialogDescription>
          选择 CSV 或
          XLSX，将列映射到业务字段，预检通过后整批保存。关联字段填写本企业业务记录ID。
        </DialogDescription>
        <input
          type="file"
          accept=".csv,.xlsx"
          disabled={busy}
          onChange={(e) => {
            if (e.target.files?.[0]) void fileSelected(e.target.files[0]);
          }}
        />
        {error && (
          <p role="alert" className="feedback error">
            {error}
          </p>
        )}
        {!!rows.length && (
          <>
            <div className="pf-form pf-record-form">
              {fields.map((f) => (
                <label key={f.key}>
                  {f.label}
                  {f.required ? ' *' : ''}
                  <AppSelect
                    value={mapping[f.key] || ''}
                    onChange={(e) => {
                      setMapping({ ...mapping, [f.key]: e.target.value });
                      setResult(null);
                    }}
                  >
                    <option value="">不导入</option>
                    {rows[0].map((h, i) => (
                      <option key={i} value={i}>
                        {h}
                      </option>
                    ))}
                  </AppSelect>
                </label>
              ))}
            </div>
            <p>共 {rows.length - 1} 行数据</p>
            <AppButton disabled={busy} onClick={() => void submit(true)}>
              执行导入预检
            </AppButton>
            {result && (
              <>
                <p>
                  {result.valid} 行通过，{result.issues.length} 行待修正
                </p>
                {result.issues.map((x) => (
                  <p className="pf-danger" key={x.row}>
                    第 {x.row} 行：{x.message}
                  </p>
                ))}
                <AppButton
                  className="primary-button"
                  disabled={busy || result.issues.length > 0}
                  onClick={() => void submit(false)}
                >
                  确认整批导入
                </AppButton>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
