'use client';
import { AppButton, AppSelect } from '@/components/ui/app-controls';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Check,
  Download,
  FileCheck2,
  KeyRound,
  Link2,
  Plus,
  RefreshCw,
  Settings2,
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
  connectionSpecs,
  jobStates,
  type Connection,
  type IntegrationJob,
} from '@/lib/integration-config';
import { modules, type BusinessRecord } from '@/lib/platform-config';
import { callApi, type BusinessFile } from '@/lib/platform-client';
type CenterData = {
  connections: Connection[];
  jobs: IntegrationJob[];
  events: {
    id: string;
    actor: string;
    message: string;
    createdAt: string;
    jobId: string;
  }[];
  usage: {
    id: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    createdAt: string;
  }[];
  vaultReady: boolean;
};
const empty: CenterData = {
  connections: [],
  jobs: [],
  events: [],
  usage: [],
  vaultReady: false,
};
export default function IntegrationCenter({
  companyId,
  records,
  files,
  role,
  onChanged,
  onOpen,
}: {
  companyId: string;
  records: BusinessRecord[];
  files: BusinessFile[];
  role: string;
  onChanged: () => Promise<void>;
  onOpen: (r: BusinessRecord) => void;
}) {
  const [data, setData] = useState(empty),
    [tab, setTab] = useState('接入配置'),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [modal, setModal] = useState(''),
    [selected, setSelected] = useState<Connection | null>(null),
    [selectedJob, setSelectedJob] = useState<IntegrationJob | null>(null);
  const refresh = useCallback(async () => {
    try {
      setData(
        await callApi(
          `/api/platform/integrations?companyId=${encodeURIComponent(companyId)}`,
        ),
      );
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, [companyId]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  async function mutate(body: Record<string, unknown>) {
    setBusy(true);
    setError('');
    try {
      const d = await callApi('/api/platform/integrations', {
        ...body,
        companyId,
      });
      setNotice('操作已保存。请按当前状态继续办理。');
      await refresh();
      await onChanged();
      if (d.connection) setSelected(d.connection);
      if (d.job) setSelectedJob(d.job);
      return d;
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setBusy(false);
    }
  }
  async function act(body: Record<string, unknown>) {
    try {
      await mutate(body);
    } catch {
      /* Error is displayed. */
    }
  }
  return (
    <>
      <div className="pf-page-title">
        <div>
          <span className="pf-eyebrow">CONNECTIONS & DELIVERY</span>
          <h1>接入与生产队列</h1>
          <p>
            先配置和核对，再审核任务；本地成果直接入库，外部办理保留真实回执。
          </p>
        </div>
        <div className="pf-actions">
          <AppButton disabled={busy} onClick={() => void refresh()}>
            <RefreshCw size={15} />
            刷新
          </AppButton>
          {role === 'admin' && (
            <AppButton
              onClick={() => {
                setSelected(null);
                setModal('connection');
              }}
            >
              <Settings2 size={15} />
              新增接入
            </AppButton>
          )}
          <AppButton
            className="primary-button"
            disabled={!data.connections.length}
            onClick={() => setModal('job')}
          >
            <Plus size={16} />
            创建任务
          </AppButton>
        </div>
      </div>
      {error && (
        <div className="feedback error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="pf-notice" role="status">
          {notice}
        </div>
      )}
      <div className="pf-tabs">
        {['接入配置', '生产与外部办理', '操作记录', '模型用量'].map((t) => (
          <AppButton
            key={t}
            className={tab === t ? 'active' : ''}
            onClick={() => setTab(t)}
          >
            {t}
          </AppButton>
        ))}
      </div>
      {tab === '接入配置' ? (
        <>
          <div className="pf-panel pf-access-note">
            <ShieldCheck size={23} />
            <div>
              <h2>配置、联通与执行分别核对</h2>
              <p className="pf-muted">
                {data.vaultReady
                  ? '服务端密钥加密已就绪。密钥保存后只显示字段状态，不返回内容。'
                  : '服务端加密主密钥尚未配置，可先保存普通参数。'}{' '}
                本地校验通过仅表示参数符合要求；真实发布、支付、开票和设备上线以官方权限与回执为准。
              </p>
            </div>
          </div>
          <div className="pf-card-grid">
            {data.connections.map((c) => {
              const spec = connectionSpecs[c.provider];
              return (
                <section className="pf-network-card" key={c.id}>
                  <span className="pf-status">
                    {spec.category} · {c.enabled ? '流程已启用' : '流程已停用'}
                  </span>
                  <h2>{c.name}</h2>
                  <p>{spec.description}</p>
                  <small>{c.testMessage || '尚未执行配置检查'}</small>
                  <small>
                    密钥字段：
                    {c.secrets.length
                      ? c.secrets
                          .map(
                            (s) =>
                              spec.fields.find((f) => f.key === s)?.label || s,
                          )
                          .join('、')
                      : '尚未保存'}
                  </small>
                  <div className="pf-actions">
                    <AppButton
                      disabled={role !== 'admin' || busy}
                      onClick={() => {
                        setSelected(c);
                        setModal('connection');
                      }}
                    >
                      配置
                    </AppButton>
                    <AppButton
                      disabled={role !== 'admin' || busy}
                      onClick={() =>
                        void act({
                          action: 'connection.check',
                          id: c.id,
                          version: c.version,
                        })
                      }
                    >
                      检查配置
                    </AppButton>
                    <AppButton
                      disabled={role !== 'admin' || busy}
                      onClick={() =>
                        void act({
                          action: 'connection.enable',
                          id: c.id,
                          version: c.version,
                          enabled: !c.enabled,
                        })
                      }
                    >
                      {c.enabled ? '停用' : '启用流程'}
                    </AppButton>
                    <AppButton
                      onClick={() => {
                        setSelected(c);
                        setModal('guide');
                      }}
                    >
                      接入步骤
                    </AppButton>
                  </div>
                </section>
              );
            })}
          </div>
          {!data.connections.length && (
            <section className="pf-empty">
              <Link2 size={32} />
              <h3>从本地内容生产开始</h3>
              <p>
                先新增“本地内容与媒体”接入，无需密钥即可生成并保存文档、PPT和海报。
              </p>
              <AppButton
                className="primary-button"
                disabled={role !== 'admin'}
                onClick={() => {
                  setSelected(null);
                  setModal('connection');
                }}
              >
                新增接入配置
              </AppButton>
            </section>
          )}
        </>
      ) : tab === '生产与外部办理' ? (
        <section className="pf-panel pf-table-wrap">
          <table>
            <thead>
              <tr>
                {[
                  '业务任务',
                  '接入',
                  '状态',
                  '执行次数',
                  '结果来源',
                  '操作',
                ].map((s) => (
                  <th key={s}>{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.jobs.map((j) => (
                <tr key={j.id}>
                  <td>
                    <strong>{j.title}</strong>
                    <small>版本 {j.recordVersion.slice(0, 8)}</small>
                  </td>
                  <td>
                    {
                      data.connections.find((c) => c.id === j.connectionId)
                        ?.name
                    }
                  </td>
                  <td>
                    <span className="pf-status">{jobStates[j.status]}</span>
                  </td>
                  <td>
                    {j.attempts}/{j.maxAttempts}
                  </td>
                  <td>
                    {j.result.source === 'model_draft'
                      ? '模型草稿'
                      : j.result.source === 'local'
                        ? '本地生成'
                        : j.result.source === 'manual_receipt'
                          ? '人工回执'
                          : j.result.source === 'signed_gateway_receipt'
                            ? '签名网关回执'
                            : '等待办理'}
                  </td>
                  <td>
                    <AppButton
                      onClick={() => {
                        setSelectedJob(j);
                        setModal('jobDetail');
                      }}
                    >
                      查看与办理
                    </AppButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.jobs.length && (
            <div className="pf-empty">尚无生产或外部办理任务</div>
          )}
        </section>
      ) : tab === '操作记录' ? (
        <section className="pf-panel">
          {data.events.map((e) => (
            <div className="pf-list-row" key={e.id}>
              <div>
                <strong>{e.message}</strong>
                <small>
                  {e.actor} ·{' '}
                  {new Date(e.createdAt).toLocaleString('zh-CN', {
                    timeZone: 'Asia/Shanghai',
                  })}
                </small>
              </div>
            </div>
          ))}
        </section>
      ) : (
        <section className="pf-panel pf-table-wrap">
          <table>
            <thead>
              <tr>
                <th>模型</th>
                <th>输入token</th>
                <th>输出token</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              {data.usage.map((u) => (
                <tr key={u.id}>
                  <td>{u.model}</td>
                  <td>{u.inputTokens}</td>
                  <td>{u.outputTokens}</td>
                  <td>{u.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="pf-muted" style={{ padding: 20 }}>
            按实际模型返回的token记录，费用以供应商账户结算为准。规则模板不计为真实模型调用。
          </p>
        </section>
      )}
      {modal === 'connection' && (
        <ConnectionForm
          key={selected?.id || 'new'}
          connection={selected}
          busy={busy}
          onClose={() => setModal('')}
          onSave={async (body) => {
            await mutate(body);
            setModal('');
          }}
        />
      )}
      {modal === 'guide' && selected && (
        <Dialog open onOpenChange={(v) => !v && setModal('')}>
          <DialogContent className="pf-record-dialog">
            <DialogTitle>{selected.name} · 接入流程</DialogTitle>
            <DialogDescription>
              先完成本地配置，再验证真实服务权限。自有网关协议与第三方官方协议分开使用。
            </DialogDescription>
            <ol className="ic-guide">
              {connectionSpecs[selected.provider].steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            {connectionSpecs[selected.provider].docs && (
              <a
                href={connectionSpecs[selected.provider].docs}
                target="_blank"
                rel="noreferrer"
              >
                查看官方资料
              </a>
            )}
            <h3>本项目网关回调</h3>
            <p className="pf-muted">
              POST {typeof location !== 'undefined' ? location.origin : ''}
              /api/platform/integrations/callback/{selected.id}
            </p>
            <pre className="ic-code">{`X-Integration-Timestamp: Unix秒级时间戳\nX-Integration-Signature: hex(HMAC-SHA256(回调密钥, 时间戳 + "." + 原始JSON))\n\n{ "eventId": "唯一事件ID", "type": "ping" }`}</pre>
            <p className="pf-muted">
              时间窗口5分钟；相同事件ID仅处理一次，内容改变会拒绝。水电事件类型为
              meter.reading；外部结果为 job.result /
              job.failed。签名回调只面向自有可信网关，不替代微信支付APIv3的官方验签及解密。
            </p>
          </DialogContent>
        </Dialog>
      )}
      {modal === 'job' && (
        <Dialog open onOpenChange={(v) => !v && !busy && setModal('')}>
          <DialogContent className="pf-dialog">
            <DialogTitle>创建生产或外部办理任务</DialogTitle>
            <DialogDescription>
              保存业务版本和任务要求，审核后再执行。外部密钥不会写入请求包。
            </DialogDescription>
            <form
              className="pf-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = Object.fromEntries(new FormData(e.currentTarget));
                try {
                  await mutate({
                    action: 'job.create',
                    connectionId: f.connectionId,
                    recordId: f.recordId,
                    options: { format: f.format, prompt: f.prompt },
                  });
                  setModal('');
                  setTab('生产与外部办理');
                } catch {
                  /* Error above. */
                }
              }}
            >
              <label>
                接入
                <AppSelect name="connectionId" required>
                  <option value="">请选择</option>
                  {data.connections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </AppSelect>
              </label>
              <label>
                业务记录
                <AppSelect name="recordId" required>
                  <option value="">请选择已确认的业务</option>
                  {records
                    .filter((r) =>
                      [
                        'material',
                        'video',
                        'notice',
                        'meter',
                        'contract',
                        'order',
                        'collaboration',
                        'acceptance',
                        'purchase',
                        'invoiceRequest',
                        'taxHandoff',
                      ].includes(r.kind),
                    )
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {modules[r.kind].label} · {r.title} · {r.status}
                      </option>
                    ))}
                </AppSelect>
              </label>
              <label>
                本地成果格式
                <AppSelect name="format">
                  <option value="svg">SVG海报</option>
                  <option value="docx">可编辑DOCX</option>
                  <option value="pptx">可编辑PPTX</option>
                  <option value="md">Markdown</option>
                </AppSelect>
              </label>
              <label>
                任务要求
                <textarea name="prompt" rows={3} maxLength={3000} />
              </label>
              <AppButton className="primary-button" disabled={busy}>
                保存待审核任务
              </AppButton>
            </form>
          </DialogContent>
        </Dialog>
      )}
      {modal === 'jobDetail' && selectedJob && (
        <JobDetail
          job={data.jobs.find((j) => j.id === selectedJob.id) || selectedJob}
          connection={data.connections.find(
            (c) => c.id === selectedJob.connectionId,
          )}
          companyId={companyId}
          files={files}
          busy={busy}
          onClose={() => setModal('')}
          onAction={act}
          onOpen={() => {
            const r = records.find((r) => r.id === selectedJob.recordId);
            if (r) {
              setModal('');
              onOpen(r);
            }
          }}
        />
      )}
    </>
  );
}
function ConnectionForm({
  connection,
  busy,
  onClose,
  onSave,
}: {
  connection: Connection | null;
  busy: boolean;
  onClose: () => void;
  onSave: (b: Record<string, unknown>) => Promise<void>;
}) {
  const [provider, setProvider] = useState(
      connection?.provider || 'local_studio',
    ),
    [error, setError] = useState('');
  const spec = connectionSpecs[provider];
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)),
      config: Record<string, string> = {},
      secrets: Record<string, string> = {};
    spec.fields.forEach((s) => {
      if (s.secret) {
        if (f[s.key]) secrets[s.key] = String(f[s.key]);
      } else config[s.key] = String(f[s.key] || '');
    });
    try {
      await onSave({
        action: 'connection.save',
        id: connection?.id,
        version: connection?.version,
        provider,
        name: f.name,
        config,
        secrets,
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Dialog open onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="pf-record-dialog">
        <DialogTitle>{connection ? '编辑接入' : '新增接入配置'}</DialogTitle>
        <DialogDescription>
          允许先保存不完整配置。保存密钥后不回显；修改配置会停用流程并要求重新检查。
        </DialogDescription>
        <form className="pf-form pf-record-form" onSubmit={submit}>
          <label className="pf-wide">
            接入类型
            <AppSelect
              value={provider}
              disabled={!!connection}
              onChange={(e) => setProvider(e.target.value)}
            >
              {Object.entries(connectionSpecs).map(([key, s]) => (
                <option value={key} key={key}>
                  {s.label}
                </option>
              ))}
            </AppSelect>
          </label>
          <label className="pf-wide">
            配置名称
            <input
              required
              name="name"
              maxLength={120}
              defaultValue={connection?.name || spec.label}
              key={provider}
            />
          </label>
          {spec.fields.map((f) => (
            <label key={`${provider}/${f.key}`}>
              {f.label}
              {f.required ? '（接入前必填）' : ''}
              {f.secret ? (
                <input
                  name={f.key}
                  type="password"
                  autoComplete="new-password"
                  placeholder={
                    connection?.secrets.includes(f.key)
                      ? '已加密保存；留空保留原密钥'
                      : '暂无密钥可先留空'
                  }
                />
              ) : (
                <input
                  name={f.key}
                  maxLength={2000}
                  defaultValue={
                    connection?.config[f.key] ||
                    (f.key === 'model' && provider === 'deepseek'
                      ? 'deepseek-flash'
                      : '')
                  }
                />
              )}
            </label>
          ))}
          <div className="pf-wide">
            <p className="pf-muted">{spec.description}</p>
            {error && (
              <div role="alert" className="feedback error">
                {error}
              </div>
            )}
          </div>
          <AppButton className="primary-button" disabled={busy}>
            <KeyRound size={15} />
            保存配置
          </AppButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function JobDetail({
  job,
  connection,
  companyId,
  files,
  busy,
  onClose,
  onAction,
  onOpen,
}: {
  job: IntegrationJob;
  connection?: Connection;
  companyId: string;
  files: BusinessFile[];
  busy: boolean;
  onClose: () => void;
  onAction: (b: Record<string, unknown>) => Promise<void>;
  onOpen: () => void;
}) {
  return (
    <Dialog open onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="pf-record-dialog">
        <DialogTitle>{job.title}</DialogTitle>
        <DialogDescription>
          {connection?.name} · {jobStates[job.status]} · 业务版本{' '}
          {job.recordVersion.slice(0, 8)}
        </DialogDescription>
        <p className="pf-muted">
          {String(job.result.message || '任务尚未执行')}
          {job.nextRetryAt ? ` 下次重试：${job.nextRetryAt}` : ''}
        </p>
        <div className="pf-actions">
          {job.status === 'draft' && (
            <AppButton
              className="primary-button"
              disabled={busy}
              onClick={() =>
                void onAction({
                  action: 'job.approve',
                  id: job.id,
                  version: job.version,
                })
              }
            >
              <Check size={15} />
              确认资料范围并审核
            </AppButton>
          )}
          {['approved', 'blocked', 'failed'].includes(job.status) && (
            <AppButton
              className="primary-button"
              disabled={busy}
              onClick={() =>
                void onAction({
                  action: job.status === 'failed' ? 'job.retry' : 'job.execute',
                  id: job.id,
                  version: job.version,
                })
              }
            >
              执行本地任务/准备外部交接
            </AppButton>
          )}
          <a
            className="secondary-button"
            href={`/api/platform/integrations?companyId=${encodeURIComponent(companyId)}&package=${job.id}`}
          >
            <Download size={15} />
            下载请求包
          </a>
          <AppButton onClick={onOpen}>
            <FileCheck2 size={15} />
            打开业务及附件
          </AppButton>
          {job.status === 'running' && (
            <AppButton
              disabled={busy}
              onClick={() =>
                void onAction({
                  action: 'job.recover',
                  id: job.id,
                  version: job.version,
                })
              }
            >
              恢复超时执行
            </AppButton>
          )}
          {!['running', 'succeeded', 'cancelled'].includes(job.status) && (
            <AppButton
              disabled={busy}
              onClick={() =>
                void onAction({
                  action: 'job.cancel',
                  id: job.id,
                  version: job.version,
                })
              }
            >
              取消本地待办
            </AppButton>
          )}
        </div>
        {typeof job.result.fileId === 'string' && job.result.fileId && (
          <a
            className="pf-list-row"
            href={`/api/platform/files?companyId=${encodeURIComponent(companyId)}&id=${job.result.fileId}`}
          >
            <Download size={17} />
            {String(job.result.name || '查看已归档成果')}
          </a>
        )}
        {['waiting_result', 'failed'].includes(job.status) && (
          <form
            className="pf-form pf-record-workflow"
            onSubmit={(e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget));
              void onAction({
                action: 'job.result',
                id: job.id,
                version: job.version,
                ...f,
              });
            }}
          >
            <h3>登记实际办理结果</h3>
            <label>
              外部任务号/票号/发布号
              <input name="remoteId" maxLength={200} />
            </label>
            <label>
              业务成果附件
              <AppSelect name="fileId">
                <option value="">请选择已上传的实际成果</option>
                {files
                  .filter((f) => f.recordId === job.recordId)
                  .map((f) => (
                    <option value={f.id} key={f.id}>
                      {f.name}
                    </option>
                  ))}
              </AppSelect>
            </label>
            <label>
              结果依据、实际链接或回执说明
              <textarea name="proof" required maxLength={2000} rows={3} />
            </label>
            <AppButton disabled={busy} className="primary-button">
              <Upload size={15} />
              登记人工回执
            </AppButton>
            <p className="pf-muted">
              银行、开票和申报回执不会自动改写财务收付或税务状态，请到相应业务核对办理。
            </p>
          </form>
        )}
        <details className="pf-record-workflow">
          <summary>查看任务快照</summary>
          <pre className="ic-code">{JSON.stringify(job.payload, null, 2)}</pre>
        </details>
      </DialogContent>
    </Dialog>
  );
}
