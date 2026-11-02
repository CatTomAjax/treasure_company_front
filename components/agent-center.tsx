'use client';
import { AppButton, AppSelect } from '@/components/ui/app-controls';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import {
  Activity,
  Bot,
  CheckCheck,
  Download,
  GitBranch,
  Pause,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  Square,
  Users,
} from 'lucide-react';
import { callApi, localToday, saveBlob } from '@/lib/platform-client';
import {
  capabilities as allCapabilities,
  scenes as allScenes,
  recommendScene,
  runStatus,
  type AgentEvent,
  type AgentPolicy,
  type AgentRun,
  type AgentSpec,
  type AgentTask,
  type Scene,
} from '@/lib/agent-catalog';
import type { BusinessRecord } from '@/lib/platform-config';
import {
  enterpriseRoles,
  roleDepartments,
  permittedRoleCapabilities,
  type EnterpriseRole,
} from '@/lib/enterprise-roles';
import KnowledgeImport from './knowledge-import';
import './agent-center.css';
type Catalog = {
  activeModel: import('@/lib/model-settings').ModelTarget & {
    configured: boolean;
  };
  worker: { enabled: boolean; healthy: boolean; heartbeatAt: string };
  runs: AgentRun[];
  role: string;
  aiConfigured: boolean;
  scenes: Scene[];
  capabilities: (typeof allCapabilities)[number][];
  projects: { id: string; title: string }[];
  roles: BusinessRecord[];
  knowledge: BusinessRecord[];
  tenantPolicy: { config: AgentPolicy; version: number };
  projectPolicy: { config: AgentPolicy; version: number };
};
type Detail = {
  modelTarget: import('@/lib/model-settings').ModelTarget & {
    configured: boolean;
  };
  job: {
    id: string;
    status: string;
    attempts: number;
    availableAt: string;
    lastError: string;
  } | null;
  run: AgentRun;
  tasks: AgentTask[];
  events: AgentEvent[];
  nextCursor: number;
  hasMore: boolean;
};
const status = (s: string) =>
  ({
    pending: '待执行',
    running: '执行中',
    completed: '已完成',
    failed: '失败',
  })[s] ||
  runStatus[s] ||
  s;
const displayTime = (s: string) =>
  new Date(s).toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour12: false,
  });
function transcriptMessages(events: AgentEvent[]) {
  const result: AgentEvent[] = [],
    blocks = new Map<string, AgentEvent>();
  for (const event of events) {
    const key = `${event.generation}/${event.taskId || event.actor}`;
    if (['started', 'checking', 'failed', 'completed'].includes(event.type))
      blocks.delete(key);
    if (event.type === 'delta') {
      const current = blocks.get(key);
      if (current) {
        current.content += event.content;
        continue;
      }
      const block = { ...event };
      blocks.set(key, block);
      result.push(block);
    } else result.push(event);
  }
  return result;
}
export default function AgentCenter({ companyId }: { companyId: string }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [selected, setSelected] = useState(() => {
      try {
        return localStorage.getItem('agent-center-selected:' + companyId) || '';
      } catch {
        return '';
      }
    }),
    [detail, setDetail] = useState<Detail | null>(null),
    [events, setEvents] = useState<AgentEvent[]>([]),
    [tab, setTab] = useState('执行现场'),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [projectId, setProjectId] = useState(''),
    [filterActor, setFilterActor] = useState('全部岗位'),
    [generation, setGeneration] = useState('全部版本'),
    [follow, setFollow] = useState(true),
    [decision, setDecision] = useState(''),
    [summary, setSummary] = useState(''),
    [checked, setChecked] = useState(false),
    [consent, setConsent] = useState(false),
    [editTask, setEditTask] = useState(''),
    [taskText, setTaskText] = useState('');
  const selectedRef = useRef(selected),
    cursor = useRef(0),
    bottom = useRef<HTMLDivElement>(null),
    refreshing = useRef(false),
    detailRef = useRef(detail),
    catalogEpoch = useRef(0),
    summaryVersion = useRef('');
  selectedRef.current = selected;
  detailRef.current = detail;
  const manager = !!catalog && ['admin', 'manager'].includes(catalog.role),
    writer = !!catalog && catalog.role !== 'viewer';
  const loadCatalog = useCallback(async () => {
    const epoch = ++catalogEpoch.current;
    const data = await callApi<Catalog>(
      `/api/platform/agents?companyId=${encodeURIComponent(companyId)}&projectId=${encodeURIComponent(projectId)}`,
    );
    if (epoch === catalogEpoch.current) setCatalog(data);
  }, [companyId, projectId]);
  const addEvents = useCallback((incoming: AgentEvent[]) => {
    if (!incoming.length) return;
    setEvents((old) => {
      const map = new Map(old.map((e) => [e.seq, e]));
      incoming.forEach((e) => map.set(e.seq, e));
      return [...map.values()].sort((a, b) => a.seq - b.seq);
    });
  }, []);
  const loadDetail = useCallback(
    async (id: string) => {
      if (!id || refreshing.current) return;
      refreshing.current = true;
      try {
        let more = true;
        while (more && selectedRef.current === id) {
          const data = await callApi<Detail>(
            `/api/platform/agents?companyId=${encodeURIComponent(companyId)}&id=${encodeURIComponent(id)}&after=${cursor.current}`,
          );
          if (selectedRef.current !== id) return;
          setDetail(data);
          addEvents(data.events);
          cursor.current = data.nextCursor;
          more = data.hasMore;
          const key = `${data.run.id}/${data.run.generation}/${data.run.status === 'awaiting_review' || data.run.status === 'approved' ? data.run.status : 'working'}`;
          if (summaryVersion.current !== key) {
            summaryVersion.current = key;
            setSummary(data.run.summary);
            setChecked(false);
          }
        }
      } finally {
        refreshing.current = false;
      }
    },
    [companyId, addEvents],
  );
  useEffect(() => {
    void loadCatalog().catch((e) => setError(e.message));
    const timer = setInterval(
      () => void loadCatalog().catch((e) => setError(e.message)),
      7000,
    );
    return () => {
      clearInterval(timer);
      catalogEpoch.current++;
    };
  }, [loadCatalog]);
  useEffect(() => {
    setDetail(null);
    setEvents([]);
    cursor.current = 0;
    setConsent(false);
    setFilterActor('全部岗位');
    setGeneration('全部版本');
    setEditTask('');
    setError('');
    void loadDetail(selected).catch((e) => setError(e.message));
    const timer = setInterval(
      () => void loadDetail(selected).catch((e) => setError(e.message)),
      900,
    );
    return () => clearInterval(timer);
  }, [selected, loadDetail]);
  useEffect(() => {
    try {
      localStorage.setItem('agent-center-company',companyId);
      if (selected)
        localStorage.setItem('agent-center-selected:' + companyId, selected);
    } catch {}
  }, [companyId, selected]);
  useEffect(() => {
    if (catalog?.runs.length && !selected)
      setSelected(catalog.runs[0].id);
  }, [catalog, selected]);
  useEffect(() => {
    if (follow && tab === '执行现场')
      bottom.current?.scrollIntoView({ block: 'nearest' });
  }, [events, follow, tab]);
  async function act(action: string, extra: Record<string, unknown> = {}) {
    const r = detailRef.current?.run;
    if (!r) return;
    setBusy(true);
    setError('');
    try {
      const data = await callApi<{ run: AgentRun }>('/api/platform/agents', {
        companyId,
        action,
        id: r.id,
        version: r.version,
        ...extra,
      });
      setDetail((old) => (old ? { ...old, run: data.run } : old));
      detailRef.current = detailRef.current
        ? { ...detailRef.current, run: data.run }
        : null;
      await loadDetail(r.id);
      void loadCatalog();
      setNotice('已保存');
      return data.run;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function execute() {
    let r = detailRef.current?.run;
    if (!r) return;
    setError('');
    try {
      if (!consent) throw new Error('请先勾选并核对本次数据发送范围');
      const scopes = [
        '任务目标和业务资料',
        '选中知识快照',
        '能力允许的业务记录',
        '人工决策',
        ...(r.snapshot.finance ? ['财务数据'] : []),
      ];
      const granted = await act('consent.grant', {
        destination: detailRef.current!.modelTarget.destination,
        model: detailRef.current!.modelTarget.model,
        confirmed: true,
        generation: r.generation,
        scopes,
      });
      if (!granted) return;
      r = granted;
      const id = r.id;
      setBusy(true);
      try {
        const data = await callApi<{ run: AgentRun; job: Detail['job'] }>(
          '/api/platform/agents',
          { companyId, action: 'execute', id, version: r.version },
        );
        setDetail((old) =>
          old ? { ...old, run: data.run, job: data.job } : old,
        );
        setConsent(false);
        setNotice(
          '已提交后台执行，关闭页面后任务仍继续，重新打开可查看进度与记录。',
        );
      } finally {
        setBusy(false);
        if (selectedRef.current === id) await loadDetail(id);
        await loadCatalog();
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message);
    }
  }
  const r = detail?.run,
    active = r && ['running', 'checking'].includes(r.status),
    recoverable =
      active && r?.leaseUntil && r.leaseUntil < new Date().toISOString(),
    canExecute =
      r &&
      writer &&
      !['queued', 'retry_wait', 'running'].includes(
        detail?.job?.status || '',
      ) &&
      (!active || recoverable) &&
      !['approved', 'cancelled', 'awaiting_review'].includes(r.status);
  const visible = transcriptMessages(events).filter(
    (e) =>
      (filterActor === '全部岗位' || e.actor === filterActor) &&
      (generation === '全部版本' || String(e.generation) === generation),
  );
  function download() {
    if (!detail) return;
    saveBlob(
      `${detail.run.title}-执行记录.json`,
      new Blob(
        [
          JSON.stringify(
            { run: detail.run, tasks: detail.tasks, events },
            null,
            2,
          ),
        ],
        { type: 'application/json' },
      ),
    );
  }
  return (
    <section className="ag-center">
      <header className="ag-heading">
        <div>
          <span className="ag-eyebrow">
            <GitBranch size={16} /> MULTI-AGENT WORKSPACE
          </span>
          <h1>Agent 执行中心</h1>
          <p>场景适配岗位 · 并行执行 · 汇总核对 · 人工确认</p>
          <small>
            后台任务独立执行，关闭页面后继续；重新打开可恢复进度与完整记录。
          </small>
        </div>
        <AppButton
          className="ag-primary"
          disabled={!writer}
          onClick={() => setTab('新建任务')}
        >
          <Plus size={16} />
          新建并行任务
        </AppButton>
      </header>
      <div className="ag-metrics">
        <div>
          <Activity />
          <span>
            执行中
            <strong>
              {catalog?.runs.filter((x) =>
                ['running', 'checking'].includes(x.status),
              ).length || 0}
            </strong>
          </span>
        </div>
        <div>
          <Users />
          <span>
            场景模板
            <strong>
              12 <small>类 / 5 类优先</small>
            </strong>
          </span>
        </div>
        <div>
          <ShieldCheck />
          <span>
            模型连接
            <strong>{catalog?.aiConfigured ? '已配置' : '待配置'}</strong>
          </span>
        </div>
        <div>
          <CheckCheck />
          <span>
            待人工确认
            <strong>
              {catalog?.runs.filter((x) => x.status === 'awaiting_review')
                .length || 0}
            </strong>
          </span>
        </div>
      </div>
      <nav className="ag-tabs">
        {[
          '执行现场',
          '新建任务',
          '岗位能力目录',
          '知识与能力边界',
          '共用知识库',
        ].map((t) => (
          <AppButton
            key={t}
            className={tab === t ? 'active' : ''}
            onClick={() => {
              setTab(t);
              setNotice('');
            }}
          >
            {t}
          </AppButton>
        ))}
      </nav>
      {error && (
        <div className="ag-alert error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="ag-alert" role="status">
          {notice}
        </div>
      )}
      {catalog && !catalog.worker.healthy && (
        <div className="ag-alert">
          后台消费者暂未就绪；已提交的任务保留在队列，服务恢复后继续。请保持中控台后台服务运行。
        </div>
      )}
      {!catalog ? (
        <div className="ag-empty">正在加载执行中心…</div>
      ) : tab === '岗位能力目录' ? (
        <div className="ag-form">
          <RoleCatalog
            catalog={catalog}
            companyId={companyId}
            projectId={projectId}
            setProjectId={setProjectId}
            manager={manager}
            onChanged={loadCatalog}
            onError={setError}
          />
          <div className="ag-cap-grid">
            {catalog.capabilities.map((c) => (
              <article className="ag-panel" key={c.id}>
                <Bot />
                <h3>{c.name}</h3>
                <code>{c.id}</code>
                <p>{c.description}</p>
                <small>执行边界：读取授权资料，输出待审核草稿</small>
              </article>
            ))}
          </div>
        </div>
      ) : tab === '知识与能力边界' ? (
        <PolicyEditor
          catalog={catalog}
          companyId={companyId}
          projectId={projectId}
          setProjectId={setProjectId}
          manager={manager}
          onChanged={loadCatalog}
          onError={setError}
        />
      ) : tab === '共用知识库' ? (
        <KnowledgeEditor
          catalog={catalog}
          companyId={companyId}
          projectId={projectId}
          setProjectId={setProjectId}
          manager={manager}
          onChanged={loadCatalog}
          onError={setError}
        />
      ) : tab === '新建任务' ? (
        <NewRun
          catalog={catalog}
          companyId={companyId}
          projectId={projectId}
          setProjectId={setProjectId}
          onCreated={(id) => {
            setSelected(id);
            setTab('执行现场');
            void loadCatalog();
          }}
          onChanged={loadCatalog}
          onError={setError}
        />
      ) : (
        <div className="ag-workspace">
          <aside className="ag-panel ag-run-list">
            <div className="ag-row">
              <h2>任务记录</h2>
              <AppButton
                aria-label="刷新任务"
                onClick={() =>
                  void loadCatalog().catch((e) => setError(e.message))
                }
              >
                <RefreshCw size={15} />
              </AppButton>
            </div>
            <p>切换任务可查看各自实时进度</p>
            {catalog.runs.map((item) => (
              <AppButton
                key={item.id}
                className={selected === item.id ? 'selected' : ''}
                onClick={() => setSelected(item.id)}
              >
                <span className={`ag-status ${item.status}`}>
                  {item.status === 'queued' && item.jobStatus === 'queued'
                    ? '后台排队中'
                    : item.jobStatus === 'retry_wait'
                      ? '等待后台重试'
                      : runStatus[item.status]}
                </span>
                <strong>{item.title}</strong>
                <small>
                  {allScenes.find((s) => s.id === item.sceneId)?.name} ·{' '}
                  {displayTime(item.createdAt)}
                </small>
              </AppButton>
            ))}
            {!catalog.runs.length && (
              <div className="ag-empty">
                暂无执行记录
                <br />
                从一个经营目标开始
              </div>
            )}
          </aside>
          {!detail ? (
            <div className="ag-panel ag-empty">
              <GitBranch size={40} />
              <h2>让多个岗位一起工作</h2>
              <p>选择一条记录，或创建一个并行任务。</p>
            </div>
          ) : (
            <div className="ag-detail">
              <section className="ag-panel">
                <div className="ag-row">
                  <div>
                    <span className={`ag-status ${r!.status}`}>
                      {runStatus[r!.status]}
                    </span>
                    <h2>{r!.title}</h2>
                    <small>
                      执行版本 {r!.generation} ·{' '}
                      {r!.projectId
                        ? catalog.projects.find((p) => p.id === r!.projectId)
                            ?.title || '项目任务'
                        : '企业通用任务'}{' '}
                      · 创建人 {r!.createdBy}
                    </small>
                  </div>
                  <AppButton onClick={download}>
                    <Download size={15} />
                    导出记录
                  </AppButton>
                </div>
                <p>{r!.goal}</p>
                {detail.job && (
                  <p>
                    后台任务：
                    {detail.job.status === 'queued'
                      ? '排队中'
                      : detail.job.status === 'retry_wait'
                        ? '等待自动重试'
                        : detail.job.status === 'running'
                          ? '执行中'
                          : detail.job.status === 'done'
                            ? '已完成'
                            : status(detail.job.status)}{' '}
                    · 已领取 {detail.job.attempts} 次
                    {detail.job.lastError ? ' · ' + detail.job.lastError : ''}
                  </p>
                )}
                <div className="ag-actions">
                  {canExecute && (
                    <AppButton
                      className="ag-primary"
                      disabled={
                        busy || !detail.modelTarget.configured || !consent
                      }
                      onClick={() => void execute()}
                    >
                      <Play size={15} />
                      {r!.status === 'queued' ? '开始并行执行' : '恢复执行'}
                    </AppButton>
                  )}
                  {writer &&
                    ![
                      'approved',
                      'cancelled',
                      'paused',
                      'awaiting_review',
                    ].includes(r!.status) && (
                      <AppButton disabled={busy} onClick={() => void act('pause')}>
                        <Pause size={15} />
                        暂停 / 人工接管
                      </AppButton>
                    )}
                  {writer && !['approved', 'cancelled'].includes(r!.status) && (
                    <AppButton disabled={busy} onClick={() => void act('cancel')}>
                      <Square size={14} />
                      取消任务
                    </AppButton>
                  )}
                  <AppButton
                    onClick={() =>
                      void loadDetail(r!.id).catch((e) => setError(e.message))
                    }
                  >
                    <RefreshCw size={14} />
                    刷新
                  </AppButton>
                </div>
                {canExecute && (
                  <label className="ag-consent">
                    <input
                      type="checkbox"
                      checked={consent}
                      disabled={!manager}
                      onChange={(e) => setConsent(e.target.checked)}
                    />
                    <span>
                      确认本执行版本向{' '}
                      {detail.modelTarget.provider === 'openai'
                        ? 'OpenAI / Codex'
                        : 'DeepSeek'}{' '}
                      官方 API（{detail.modelTarget.model}
                      ）发送：任务目标及输入、
                      {r!.snapshot.sources.length} 条候选知识快照、
                      {r!.snapshot.records.length}{' '}
                      条能力范围内的业务记录、人工决策
                      {r!.snapshot.finance ? '、财务数据' : ''}。
                      <small>
                        各岗位只收到自身能力允许的部分。授权会单独保存；需管理员或经理确认。
                      </small>
                    </span>
                  </label>
                )}
                {!detail.modelTarget.configured && (
                  <p className="ag-warning">
                    请在“模型配置与切换”中保存密钥、测试并选择默认模型后执行。当前任务与配置均可先保存。
                    <a href="#ppt/models">前往模型配置</a>
                  </p>
                )}
                <details>
                  <summary>查看本次资料与知识快照</summary>
                  <pre>{r!.input || '未提供额外资料'}</pre>
                  {r!.snapshot.sources.map((s) => (
                    <details key={s.id}>
                      <summary>
                        {s.title} · {s.layer} · {s.id}@{s.version}
                      </summary>
                      <pre>{s.content}</pre>
                    </details>
                  ))}
                  <p>
                    业务来源：
                    {r!.snapshot.records
                      .map((x) => `${x.title}（${x.id}@${x.version}）`)
                      .join('；') || '无'}
                  </p>
                </details>
              </section>
              <div className="ag-agents">
                {detail.tasks.map((t) => (
                  <article
                    className={`ag-panel ag-agent ${t.status}`}
                    key={t.id}
                  >
                    <div className="ag-row">
                      <Bot size={20} />
                      <span className={`ag-status ${t.status}`}>
                        {status(t.status)}
                      </span>
                    </div>
                    <h3>{t.spec.name}</h3>
                    <p>
                      {t.spec.capabilities
                        .map(
                          (c) =>
                            allCapabilities.find((a) => a.id === c)?.name || c,
                        )
                        .join(' / ')}
                    </p>
                    <small>
                      尝试 {t.attempt} · 已报告 tokens{' '}
                      {t.inputTokens + t.outputTokens}
                    </small>
                    {t.error && <p className="ag-warning">{t.error}</p>}
                    <details>
                      <summary>查看职责与成果</summary>
                      <p>{t.spec.instructions}</p>
                      <pre>{t.content || '等待岗位输出…'}</pre>
                      <small>
                        {t.sources
                          .map((s) => s.title + '@' + s.version)
                          .join('；')}
                      </small>
                    </details>
                    {manager && r!.status === 'paused' && (
                      <AppButton
                        onClick={() => {
                          setEditTask(t.id);
                          setTaskText(t.content);
                        }}
                      >
                        人工编辑此岗位成果
                      </AppButton>
                    )}
                  </article>
                ))}
              </div>
              {editTask && (
                <section className="ag-panel">
                  <h3>人工修订岗位成果</h3>
                  <textarea
                    aria-label="人工修订岗位成果"
                    rows={8}
                    value={taskText}
                    onChange={(e) => setTaskText(e.target.value)}
                  />
                  <div className="ag-actions">
                    <AppButton
                      disabled={busy || !taskText.trim()}
                      onClick={async () => {
                        if (
                          await act('task.edit', {
                            taskId: editTask,
                            content: taskText,
                          })
                        )
                          setEditTask('');
                      }}
                    >
                      保存人工成果
                    </AppButton>
                    <AppButton onClick={() => setEditTask('')}>关闭</AppButton>
                  </div>
                </section>
              )}
              <section className="ag-panel">
                <div className="ag-row">
                  <h2>
                    <Activity size={18} /> 实时协作记录
                  </h2>
                  <label className="ag-inline">
                    <input
                      type="checkbox"
                      checked={follow}
                      onChange={(e) => setFollow(e.target.checked)}
                    />
                    跟随新消息
                  </label>
                </div>
                <div className="ag-actions">
                  <AppSelect
                    aria-label="筛选岗位"
                    value={filterActor}
                    onChange={(e) => setFilterActor(e.target.value)}
                  >
                    {['全部岗位', ...new Set(events.map((e) => e.actor))].map(
                      (a) => (
                        <option key={a}>{a}</option>
                      ),
                    )}
                  </AppSelect>
                  <AppSelect
                    aria-label="筛选执行版本"
                    value={generation}
                    onChange={(e) => setGeneration(e.target.value)}
                  >
                    <option>全部版本</option>
                    {[...new Set(events.map((e) => e.generation))].map((g) => (
                      <option key={g} value={g}>
                        执行版本 {g}
                      </option>
                    ))}
                  </AppSelect>
                  <small>文字先落库，再显示；重新打开可回放</small>
                </div>
                <div className="ag-transcript" role="log" aria-live="polite">
                  {visible.map((e, i) => {
                    const previous = visible[i - 1],
                      joined =
                        e.type === 'delta' &&
                        previous?.type === 'delta' &&
                        previous.actor === e.actor &&
                        previous.generation === e.generation;
                    return (
                      <div
                        key={e.seq}
                        className={`ag-message ${e.type} ${joined ? 'continued' : ''}`}
                      >
                        {!joined && (
                          <header>
                            <strong>{e.actor}</strong>
                            <time>
                              {displayTime(e.createdAt)} · v{e.generation}
                            </time>
                          </header>
                        )}
                        <div>{e.content}</div>
                      </div>
                    );
                  })}
                  <div ref={bottom} />
                </div>
              </section>
              {manager && !['approved', 'cancelled'].includes(r!.status) && (
                <section className="ag-panel">
                  <h2>人工决策</h2>
                  <p>
                    补充或修改目标、优先级和取舍。保存后暂停旧执行、保留历史，并为所有岗位生成新的执行版本。
                  </p>
                  <textarea
                    aria-label="人工决策"
                    rows={3}
                    maxLength={6000}
                    value={decision}
                    onChange={(e) => setDecision(e.target.value)}
                    placeholder="例如：优先服务园区科技企业，取消对外收入承诺；请重新检查所有文案。"
                  />
                  <AppButton
                    disabled={busy || !decision.trim()}
                    onClick={async () => {
                      if (await act('decision', { text: decision })) {
                        setDecision('');
                        setConsent(false);
                      }
                    }}
                  >
                    保存决策并暂停
                  </AppButton>
                </section>
              )}
              <section className="ag-panel">
                <div className="ag-row">
                  <h2>
                    <CheckCheck size={18} /> 统一汇总与核对
                  </h2>
                  {r!.approvedBy && <span>确认人：{r!.approvedBy}</span>}
                </div>
                {r!.checks && <CheckSummary checks={r!.checks} />}
                <textarea
                  aria-label="统一汇总成果"
                  rows={12}
                  value={
                    ['awaiting_review', 'approved'].includes(r!.status)
                      ? summary
                      : r!.summary
                  }
                  readOnly={!manager || r!.status !== 'awaiting_review'}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="全部岗位完成后，汇总核对员将在这里输出统一成果、交叉核对和待确认事项。"
                />
                {r!.status === 'awaiting_review' && manager && (
                  <>
                    <label className="ag-consent">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => setChecked(e.target.checked)}
                      />
                      已核对来源与版本、事实数字、分歧、缺失和对外承诺；确认此成果作为最终版本。
                    </label>
                    <AppButton
                      className="ag-primary"
                      disabled={busy || !checked || !summary.trim()}
                      onClick={() =>
                        void act('approve', {
                          summary,
                          checksConfirmed: checked,
                        })
                      }
                    >
                      <CheckCheck size={16} />
                      人工确认最终成果
                    </AppButton>
                  </>
                )}
              </section>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
function CheckSummary({ checks }: { checks: string }) {
  try {
    const c = JSON.parse(checks);
    return (
      <div className="ag-checks">
        <p>
          岗位完成 {c.completed}/{c.expected} · 引用来源 {c.sources.length} 条 ·
          汇总模型 {c.reviewProvider}
        </p>
        {c.warnings.map((w: string) => (
          <p key={w} className="ag-warning">
            {w}
          </p>
        ))}
      </div>
    );
  } catch {
    return null;
  }
}
function RoleCatalog({
  catalog,
  companyId,
  projectId,
  setProjectId,
  manager,
  onChanged,
  onError,
}: {
  catalog: Catalog;
  companyId: string;
  projectId: string;
  setProjectId: (s: string) => void;
  manager: boolean;
  onChanged: () => Promise<void>;
  onError: (s: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [saving, setSaving] = useState(false),
    [department, setDepartment] = useState('全部'),
    [templateId, setTemplateId] = useState(''),
    [title, setTitle] = useState(''),
    [instructions, setInstructions] = useState(''),
    [criteria, setCriteria] = useState(
      '可编辑中文成果；标注来源、缺失和待确认事项',
    ),
    [selectedCaps, setCaps] = useState<string[]>(['knowledge']),
    [layer, setLayer] = useState('全部已确认知识');
  const editorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open)
      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [open, templateId]);
  const allowedCaps: string[] = catalog.capabilities
    .map((c) => c.id)
    .filter(
      (id) =>
        catalog.tenantPolicy.config.capabilities.includes(id) &&
        catalog.projectPolicy.config.capabilities.includes(id),
    );
  const effectiveCaps = selectedCaps.filter((id) => allowedCaps.includes(id));
  function applyTemplate(role?: EnterpriseRole) {
    setTemplateId(role?.id || '');
    setTitle(role?.name || '');
    setInstructions(role?.instructions || '');
    setCriteria(role?.criteria || '可编辑中文成果；标注来源、缺失和待确认事项');
    setCaps(
      role
        ? permittedRoleCapabilities(role, allowedCaps)
        : allowedCaps.includes('knowledge')
          ? ['knowledge']
          : [],
    );
    setLayer('全部已确认知识');
    setOpen(true);
  }
  return (
    <section className="ag-panel ag-form">
      <div className="ag-row">
        <div>
          <h2>可复用 AI 岗位</h2>
          <p>
            按企业常见岗位配置职责与能力。选择岗位自动分配，也可调整后保存为企业或项目岗位。
          </p>
        </div>
        {manager && (
          <AppButton onClick={() => applyTemplate()} disabled={saving}>
            <Plus size={16} />
            自定义岗位
          </AppButton>
        )}
      </div>
      <ProjectSelect
        catalog={catalog}
        value={projectId}
        onChange={setProjectId}
      />
      <div className="ag-role-filters" aria-label="岗位分类">
        {['全部', ...roleDepartments].map((group) => (
          <AppButton
            key={group}
            type="button"
            aria-pressed={department === group}
            className={department === group ? 'active' : ''}
            onClick={() => setDepartment(group)}
          >
            {group}
          </AppButton>
        ))}
      </div>
      <div className="ag-role-grid">
        {enterpriseRoles
          .filter(
            (role) => department === '全部' || role.department === department,
          )
          .map((role) => {
            const assigned = permittedRoleCapabilities(role, allowedCaps);
            return (
              <article key={role.id} className="ag-role-card">
                <small>{role.department}</small>
                <h3>
                  <Bot size={17} />
                  {role.name}
                </h3>
                <p>{role.instructions}</p>
                <div
                  className="ag-role-capabilities"
                  aria-label={`${role.name}的岗位能力`}
                >
                  {role.capabilities.map((id) => (
                    <span
                      key={id}
                      className={assigned.includes(id) ? '' : 'restricted'}
                    >
                      {allCapabilities.find((c) => c.id === id)?.name}
                      {!assigned.includes(id) && '（未授权）'}
                    </span>
                  ))}
                </div>
                {manager && (
                  <AppButton
                    type="button"
                    disabled={saving || !assigned.length}
                    onClick={() => applyTemplate(role)}
                  >
                    配置{role.name}
                  </AppButton>
                )}
              </article>
            );
          })}
      </div>
      <p>
        已预配 {enterpriseRoles.length}{' '}
        类岗位。创建任务时按场景自动安排；保存后可复用自己的岗位配置。
      </p>
      {open && (
        <div className="ag-form ag-role-editor" ref={editorRef}>
          <div className="ag-row">
            <h3>{templateId ? '岗位能力配置' : '自定义岗位配置'}</h3>
            <AppButton
              type="button"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              收起配置
            </AppButton>
          </div>
          <label>
            选择常见岗位（自动填入职责与能力）
            <AppSelect
              value={templateId}
              disabled={saving}
              onChange={(e) =>
                applyTemplate(
                  enterpriseRoles.find((r) => r.id === e.target.value),
                )
              }
            >
              <option value="">自定义岗位</option>
              {roleDepartments.map((group) => (
                <optgroup label={group} key={group}>
                  {enterpriseRoles
                    .filter((r) => r.department === group)
                    .map((r) => (
                      <option value={r.id} key={r.id}>
                        {r.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </AppSelect>
          </label>
          <p role="status">
            已自动分配 {effectiveCaps.length}{' '}
            项能力，可继续调整。能力受当前企业和项目授权范围限制。
          </p>
          <div className="ag-form-grid">
            <label>
              岗位名称
              <input
                value={title}
                maxLength={160}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label>
              允许读取的知识层级
              <AppSelect value={layer} onChange={(e) => setLayer(e.target.value)}>
                {['全部已确认知识', '原始资料', '业务知识', '岗位经验'].map(
                  (x) => (
                    <option key={x}>{x}</option>
                  ),
                )}
              </AppSelect>
            </label>
            <label className="ag-wide">
              岗位职责
              <textarea
                value={instructions}
                maxLength={6000}
                rows={3}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </label>
            <label className="ag-wide">
              交付标准
              <textarea
                value={criteria}
                maxLength={2000}
                rows={2}
                onChange={(e) => setCriteria(e.target.value)}
              />
            </label>
          </div>
          <fieldset>
            <legend>能力清单</legend>
            <div className="ag-check-grid">
              {catalog.capabilities.map((c) => (
                <label className="ag-inline" key={c.id}>
                  <input
                    type="checkbox"
                    disabled={!allowedCaps.includes(c.id) || saving}
                    checked={effectiveCaps.includes(c.id)}
                    onChange={(e) =>
                      setCaps(
                        e.target.checked
                          ? [...selectedCaps, c.id]
                          : selectedCaps.filter((id) => id !== c.id),
                      )
                    }
                  />
                  {c.name}
                  {!allowedCaps.includes(c.id) && '（未授权）'}
                </label>
              ))}
            </div>
          </fieldset>
          <AppButton
            className="ag-primary"
            disabled={
              saving ||
              !title.trim() ||
              !instructions.trim() ||
              !criteria.trim() ||
              !effectiveCaps.length
            }
            onClick={async () => {
              setSaving(true);
              onError('');
              try {
                await callApi('/api/platform', {
                  companyId,
                  action: 'record.create',
                  kind: 'aiRole',
                  title,
                  owner: '岗位负责人',
                  dueDate: '',
                  data: {
                    role:
                      enterpriseRoles.find((r) => r.id === templateId)?.name ||
                      '自定义',
                    instructions,
                    criteria,
                    knowledgeLayer: layer,
                    tool: '生成草稿',
                    tokenBudget: String(
                      catalog.projectPolicy.config.tokenBudget,
                    ),
                    projectId,
                    capabilities: effectiveCaps.join(','),
                  },
                });
                setOpen(false);
                setTitle('');
                setInstructions('');
                setTemplateId('');
                setCriteria('可编辑中文成果；标注来源、缺失和待确认事项');
                setCaps(['knowledge']);
                setLayer('全部已确认知识');
                await onChanged();
              } catch (e) {
                onError((e as Error).message);
              } finally {
                setSaving(false);
              }
            }}
          >
            保存岗位草稿
          </AppButton>
        </div>
      )}
      <h3>已保存岗位</h3>
      {catalog.roles.map((role) => (
        <details key={role.id}>
          <summary>
            {role.title} · {role.status} ·{' '}
            {role.data.projectId ? '项目独立' : '企业通用'}
          </summary>
          <p>{role.data.instructions}</p>
          <p>
            能力：
            {(role.data.capabilities || '')
              .split(',')
              .map((id) => allCapabilities.find((c) => c.id === id)?.name || id)
              .join('、') || '按场景授予'}
          </p>
          <p>知识：{role.data.knowledgeLayer}</p>
          <small>
            {role.id}@{role.version}
          </small>
          {manager && ['草稿', '待审核'].includes(role.status) && (
            <AppButton
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  let record = role;
                  if (record.status === '草稿')
                    record = (
                      await callApi('/api/platform', {
                        companyId,
                        action: 'record.transition',
                        id: record.id,
                        version: record.version,
                        status: '待审核',
                      })
                    ).record;
                  await callApi('/api/platform', {
                    companyId,
                    action: 'record.transition',
                    id: record.id,
                    version: record.version,
                    status: '已确认',
                  });
                  await onChanged();
                } catch (e) {
                  onError((e as Error).message);
                } finally {
                  setSaving(false);
                }
              }}
            >
              核实并确认岗位能力
            </AppButton>
          )}
        </details>
      ))}
      {!catalog.roles.length && (
        <p>
          尚无已保存岗位。可直接使用上方常见岗位，或在创建任务时使用自动安排的岗位。
        </p>
      )}
    </section>
  );
}
function ProjectSelect({
  catalog,
  value,
  onChange,
}: {
  catalog: Catalog;
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <label>
      关联项目
      <AppSelect value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">企业通用 / 不关联项目</option>
        {catalog.projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </AppSelect>
    </label>
  );
}
function NewRun({
  catalog,
  companyId,
  projectId,
  setProjectId,
  onCreated,
  onChanged,
  onError,
}: {
  catalog: Catalog;
  companyId: string;
  projectId: string;
  setProjectId: (s: string) => void;
  onCreated: (s: string) => void;
  onChanged: () => Promise<void>;
  onError: (s: string) => void;
}) {
  const [goal, setGoal] = useState(''),
    [input, setInput] = useState(''),
    [sceneId, setSceneId] = useState('auto'),
    [agents, setAgents] = useState<AgentSpec[]>([]),
    [saving, setSaving] = useState(false),
    [newProject, setNewProject] = useState(false);
  const selected =
    (sceneId === 'auto'
      ? recommendScene(goal + ' ' + input)
      : allScenes.find((s) => s.id === sceneId)) || allScenes[0];
  const capabilityScope = catalog.capabilities
    .filter(
      (c) =>
        catalog.tenantPolicy.config.capabilities.includes(c.id) &&
        catalog.projectPolicy.config.capabilities.includes(c.id),
    )
    .map((c) => c.id)
    .join(',');
  useEffect(
    () =>
      setAgents(
        selected.agents.map((a) => ({
          ...a,
          capabilities: a.capabilities.filter((id) =>
            capabilityScope.split(',').includes(id),
          ),
          knowledgeIds: [],
        })),
      ),
    [selected.id, projectId, capabilityScope],
  );
  const allowedScene = catalog.scenes.some((s) => s.id === selected.id),
    tenantCaps = catalog.tenantPolicy.config.capabilities,
    projectCaps = catalog.projectPolicy.config.capabilities;
  function update(id: string, change: Partial<AgentSpec>) {
    setAgents((old) => old.map((a) => (a.id === id ? { ...a, ...change } : a)));
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    onError('');
    try {
      const data = await callApi<{ run: AgentRun }>('/api/platform/agents', {
        companyId,
        action: 'create',
        goal,
        input,
        sceneId: selected.id,
        projectId,
        agents,
      });
      onCreated(data.run.id);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <form className="ag-form" onSubmit={submit}>
      <section className="ag-panel">
        <h2>从经营目标创建并行任务</h2>
        <div className="ag-form-grid">
          <label className="ag-wide">
            任务目标
            <textarea
              required
              rows={3}
              maxLength={12000}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="例如：根据已确认的品牌资料，为开放日准备公众号、小红书、海报和视频脚本。"
            />
          </label>
          <label>
            业务场景
            <AppSelect
              value={sceneId}
              onChange={(e) => setSceneId(e.target.value)}
            >
              <option value="auto">自动推荐场景（可手动调整）</option>
              {catalog.scenes.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.priority ? '优先 · ' : ''}
                  {s.name}
                </option>
              ))}
            </AppSelect>
          </label>
          <ProjectSelect
            catalog={catalog}
            value={projectId}
            onChange={setProjectId}
          />
          <label className="ag-wide">
            本次业务资料
            <textarea
              rows={5}
              maxLength={24000}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="填写事实、要求、受众、日期和已确认限制；缺失资料将列为待确认。"
            />
          </label>
        </div>
        <p>
          当前适配：<strong>{selected.name}</strong> · {selected.agents.length}
          个独立岗位 + 统一汇总核对员
        </p>
        <AppButton type="button" onClick={() => setNewProject(!newProject)}>
          新建关联项目
        </AppButton>
        {newProject && (
          <NewProject
            companyId={companyId}
            onError={onError}
            onCreated={async (id) => {
              await onChanged();
              setProjectId(id);
              setNewProject(false);
            }}
          />
        )}
      </section>
      <div className="ag-cap-grid">
        {agents.map((a) => (
          <section className="ag-panel" key={a.id}>
            <h3>
              <Bot size={18} /> {a.name}
            </h3>
            <label>
              选择岗位（自动分配能力）
              <AppSelect
                value={
                  a.roleId
                    ? `saved:${a.roleId}`
                    : a.templateId
                      ? `template:${a.templateId}`
                      : ''
                }
                onChange={(e) => {
                  const base = selected.agents.find((s) => s.id === a.id)!;
                  const allowed = capabilityScope.split(',');
                  const value = e.target.value;
                  if (value.startsWith('saved:')) {
                    const role = catalog.roles.find(
                      (r) => r.id === value.slice(6),
                    )!;
                    const configured = (role.data.capabilities || '')
                      .split(/[\s,，]+/)
                      .filter(Boolean);
                    update(a.id, {
                      roleId: role.id,
                      templateId: undefined,
                      name: role.title,
                      instructions: base.instructions,
                      criteria: base.criteria,
                      capabilities: configured.length
                        ? allCapabilities
                            .filter(
                              (c) =>
                                configured.includes(c.id) &&
                                allowed.includes(c.id),
                            )
                            .map((c) => c.id)
                        : base.capabilities.filter((id) =>
                            allowed.includes(id),
                          ),
                    });
                  } else if (value.startsWith('template:')) {
                    const role = enterpriseRoles.find(
                      (r) => r.id === value.slice(9),
                    )!;
                    update(a.id, {
                      roleId: '',
                      templateId: role.id,
                      name: role.name,
                      instructions: `${role.instructions}\n本场景职责：${base.instructions.split('\n本场景职责：').at(-1)}`,
                      criteria: role.criteria,
                      capabilities: permittedRoleCapabilities(role, allowed),
                    });
                  } else
                    update(a.id, {
                      ...base,
                      roleId: '',
                      capabilities: base.capabilities.filter((id) =>
                        allowed.includes(id),
                      ),
                    });
                }}
              >
                <option value="">恢复场景默认岗位</option>
                {roleDepartments.map((group) => (
                  <optgroup label={group} key={group}>
                    {enterpriseRoles
                      .filter(
                        (role) =>
                          role.department === group &&
                          permittedRoleCapabilities(
                            role,
                            capabilityScope.split(','),
                          ).length,
                      )
                      .map((role) => (
                        <option value={`template:${role.id}`} key={role.id}>
                          {role.name}
                        </option>
                      ))}
                  </optgroup>
                ))}
                <optgroup label="已确认的企业 / 项目岗位">
                  {catalog.roles
                    .filter((r) => r.status === '已确认')
                    .map((r) => (
                      <option value={`saved:${r.id}`} key={r.id}>
                        {r.title}
                      </option>
                    ))}
                </optgroup>
              </AppSelect>
            </label>
            <label>
              岗位名称
              <input
                value={a.name}
                maxLength={80}
                onChange={(e) => update(a.id, { name: e.target.value })}
              />
            </label>
            <label>
              本场景职责
              <textarea
                rows={3}
                maxLength={6000}
                value={a.instructions}
                onChange={(e) => update(a.id, { instructions: e.target.value })}
              />
            </label>
            <label>
              交付标准
              <textarea
                rows={2}
                maxLength={2000}
                value={a.criteria}
                onChange={(e) => update(a.id, { criteria: e.target.value })}
              />
            </label>
            <fieldset>
              <legend>允许能力</legend>
              {catalog.capabilities.map((c) => {
                const permitted =
                  tenantCaps.includes(c.id) && projectCaps.includes(c.id);
                return (
                  <label className="ag-inline" key={c.id}>
                    <input
                      type="checkbox"
                      disabled={!permitted}
                      checked={a.capabilities.includes(c.id)}
                      onChange={(e) =>
                        update(a.id, {
                          capabilities: e.target.checked
                            ? [...a.capabilities, c.id]
                            : a.capabilities.filter((x) => x !== c.id),
                        })
                      }
                    />
                    {c.name}
                    {!permitted ? '（范围外）' : ''}
                  </label>
                );
              })}
            </fieldset>
            <details>
              <summary>单独限定此岗位的知识</summary>
              <p>不勾选时使用项目与租户允许的知识；勾选后仅使用所选条目。</p>
              {catalog.knowledge
                .filter((k) => k.status === '已确认')
                .map((k) => (
                  <label className="ag-inline" key={k.id}>
                    <input
                      type="checkbox"
                      checked={a.knowledgeIds?.includes(k.id) || false}
                      onChange={(e) =>
                        update(a.id, {
                          knowledgeIds: e.target.checked
                            ? [...(a.knowledgeIds || []), k.id]
                            : (a.knowledgeIds || []).filter((x) => x !== k.id),
                        })
                      }
                    />
                    {k.title}
                  </label>
                ))}
            </details>
          </section>
        ))}
      </div>
      <section className="ag-panel">
        <p>
          任务创建后会冻结资料与知识版本。所有岗位完成后才能汇总，最终成果由管理员或经理确认。
        </p>
        {!allowedScene && (
          <p className="ag-warning">
            推荐场景包含敏感数据能力，需要管理员或经理创建，或选择其他场景。
          </p>
        )}
        <AppButton
          className="ag-primary"
          disabled={
            saving ||
            !allowedScene ||
            catalog.role === 'viewer' ||
            agents.some((a) => !a.capabilities.length)
          }
        >
          {saving ? '正在保存…' : '创建任务与岗位计划'}
        </AppButton>
      </section>
    </form>
  );
}
function NewProject({
  companyId,
  onCreated,
  onError,
}: {
  companyId: string;
  onCreated: (s: string) => Promise<void>;
  onError: (s: string) => void;
}) {
  const [values, setValues] = useState({
      title: '',
      scope: '',
      amount: '0',
      acceptanceCriteria: '',
    }),
    [saving, setSaving] = useState(false);
  return (
    <div className="ag-project-create">
      <h3>新建业务项目</h3>
      {Object.entries({
        title: '项目名称',
        scope: '执行范围',
        amount: '合同金额（元，尚未确定可填0）',
        acceptanceCriteria: '验收标准',
      }).map(([key, label]) => (
        <label key={key}>
          {label}
          <input
            value={values[key as keyof typeof values]}
            onChange={(e) => setValues({ ...values, [key]: e.target.value })}
          />
        </label>
      ))}
      <AppButton
        type="button"
        disabled={
          saving || !values.title || !values.scope || !values.acceptanceCriteria
        }
        onClick={async () => {
          setSaving(true);
          try {
            const { record } = await callApi('/api/platform', {
              companyId,
              action: 'record.create',
              kind: 'project',
              title: values.title,
              owner: '项目负责人',
              dueDate: '',
              data: {
                scope: values.scope,
                amount: values.amount,
                startDate: localToday(),
                acceptanceCriteria: values.acceptanceCriteria,
              },
            });
            await onCreated(record.id);
          } catch (e) {
            onError((e as Error).message);
          } finally {
            setSaving(false);
          }
        }}
      >
        保存项目
      </AppButton>
    </div>
  );
}
function PolicyEditor({
  catalog,
  companyId,
  projectId,
  setProjectId,
  manager,
  onChanged,
  onError,
}: {
  catalog: Catalog;
  companyId: string;
  projectId: string;
  setProjectId: (s: string) => void;
  manager: boolean;
  onChanged: () => Promise<void>;
  onError: (s: string) => void;
}) {
  const [scope, setScope] = useState('tenant'),
    [config, setConfig] = useState<AgentPolicy>(catalog.tenantPolicy.config),
    [saving, setSaving] = useState(false);
  const selected =
    scope === 'tenant' ? catalog.tenantPolicy : catalog.projectPolicy;
  useEffect(
    () => setConfig(selected.config),
    [selected.version, projectId, scope],
  );
  return (
    <section className="ag-panel ag-form">
      <h2>租户与项目的知识、能力边界</h2>
      <p>
        共用一套三层知识库。项目配置在企业授权范围内进一步收窄；其他项目知识不会进入本项目。保存仅影响新建任务，已有任务使用其冻结快照。
      </p>
      <div className="ag-form-grid">
        <label>
          配置层级
          <AppSelect value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="tenant">企业默认边界</option>
            <option value="project">项目独立边界</option>
          </AppSelect>
        </label>
        <ProjectSelect
          catalog={catalog}
          value={projectId}
          onChange={setProjectId}
        />
      </div>
      <fieldset disabled={!manager}>
        <legend>允许的岗位能力</legend>
        <div className="ag-check-grid">
          {catalog.capabilities.map((c) => (
            <label className="ag-inline" key={c.id}>
              <input
                type="checkbox"
                checked={config.capabilities.includes(c.id)}
                disabled={c.id === 'review'}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    capabilities: e.target.checked
                      ? [...config.capabilities, c.id]
                      : config.capabilities.filter((x) => x !== c.id),
                  })
                }
              />
              {c.name}
            </label>
          ))}
        </div>
        <label>
          知识选择
          <AppSelect
            value={config.knowledgeMode}
            onChange={(e) =>
              setConfig({
                ...config,
                knowledgeMode: e.target.value as 'all' | 'selected',
              })
            }
          >
            <option value="all">范围内全部已确认知识</option>
            <option value="selected">只允许指定知识（不选择即无知识）</option>
          </AppSelect>
        </label>
        <label className="ag-inline">
          <input
            type="checkbox"
            checked={config.includeShared}
            onChange={(e) =>
              setConfig({ ...config, includeShared: e.target.checked })
            }
          />
          允许读取企业通用知识
        </label>
        {config.knowledgeMode === 'selected' &&
          catalog.knowledge
            .filter((k) => k.status === '已确认')
            .map((k) => (
              <label className="ag-inline" key={k.id}>
                <input
                  type="checkbox"
                  checked={config.knowledgeIds.includes(k.id)}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      knowledgeIds: e.target.checked
                        ? [...config.knowledgeIds, k.id]
                        : config.knowledgeIds.filter((id) => id !== k.id),
                    })
                  }
                />
                {k.title} · {k.data.layer}
              </label>
            ))}
        <div className="ag-form-grid">
          <label>
            本任务最大并行岗位数
            <input
              type="number"
              min={1}
              max={4}
              value={config.concurrency}
              onChange={(e) =>
                setConfig({ ...config, concurrency: Number(e.target.value) })
              }
            />
          </label>
          <label>
            每岗位最大输出 tokens
            <input
              type="number"
              min={512}
              max={4000}
              value={config.tokenBudget}
              onChange={(e) =>
                setConfig({ ...config, tokenBudget: Number(e.target.value) })
              }
            />
          </label>
        </div>
      </fieldset>
      <p>
        多任务共享企业4个、全局8个模型名额；失败只重试未完成岗位，每个执行版本最多3次。
      </p>
      <AppButton
        className="ag-primary"
        disabled={!manager || saving || (scope === 'project' && !projectId)}
        onClick={async () => {
          setSaving(true);
          onError('');
          try {
            await callApi('/api/platform/agents', {
              companyId,
              action: 'policy.save',
              projectId: scope === 'tenant' ? '' : projectId,
              config,
              version: selected.version,
            });
            await onChanged();
          } catch (e) {
            onError((e as Error).message);
          } finally {
            setSaving(false);
          }
        }}
      >
        {saving ? '保存中…' : '保存边界配置'}
      </AppButton>
    </section>
  );
}
function KnowledgeEditor({
  catalog,
  companyId,
  projectId,
  setProjectId,
  manager,
  onChanged,
  onError,
}: {
  catalog: Catalog;
  companyId: string;
  projectId: string;
  setProjectId: (s: string) => void;
  manager: boolean;
  onChanged: () => Promise<void>;
  onError: (s: string) => void;
}) {
  const [values, setValues] = useState({
      title: '',
      layer: '业务知识',
      category: '企业知识',
      content: '',
      source: '',
    }),
    [saving, setSaving] = useState(false);
  return (
    <div className="ag-form">
      <section className="ag-panel">
        <h2>Agent 共用三层知识库</h2>
        <KnowledgeImport
          companyId={companyId}
          projectId={projectId}
          disabled={!manager}
          onImported={onChanged}
        />
        <p>
          与企业业务知识库共用记录、审核和版本。原始资料、业务知识、岗位经验统一检索；页面演示样例不会自动作为事实输入。
        </p>
        <ProjectSelect
          catalog={catalog}
          value={projectId}
          onChange={setProjectId}
        />
        <div className="ag-knowledge-list">
          {catalog.knowledge.map((k) => (
            <details key={k.id}>
              <summary>
                {k.title} <span className="ag-status">{k.status}</span> ·{' '}
                {k.data.projectId ? '项目知识' : '企业通用'} · {k.data.layer}
              </summary>
              <pre>{k.data.content}</pre>
              <small>
                {k.id}@{k.version} · 来源：{k.data.source}
              </small>
              {manager && ['草稿', '待审核'].includes(k.status) && (
                <AppButton
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true);
                    try {
                      let record = k;
                      if (record.status === '草稿')
                        record = (
                          await callApi('/api/platform', {
                            companyId,
                            action: 'record.transition',
                            id: record.id,
                            version: record.version,
                            status: '待审核',
                          })
                        ).record;
                      await callApi('/api/platform', {
                        companyId,
                        action: 'record.transition',
                        id: record.id,
                        version: record.version,
                        status: '已确认',
                      });
                      await onChanged();
                    } catch (e) {
                      onError((e as Error).message);
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  核实并确认此知识
                </AppButton>
              )}
            </details>
          ))}
        </div>
        {!catalog.knowledge.length && (
          <div className="ag-empty">
            当前范围暂无知识。可先保存资料草稿，再核实确认。
          </div>
        )}
      </section>
      {manager && (
        <section className="ag-panel">
          <h2>新增{projectId ? '项目独立' : '企业通用'}知识草稿</h2>
          <div className="ag-form-grid">
            <label>
              标题
              <input
                value={values.title}
                onChange={(e) =>
                  setValues({ ...values, title: e.target.value })
                }
              />
            </label>
            <label>
              层级
              <AppSelect
                value={values.layer}
                onChange={(e) =>
                  setValues({ ...values, layer: e.target.value })
                }
              >
                {['原始资料', '业务知识', '岗位经验'].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </AppSelect>
            </label>
            <label>
              分类
              <input
                value={values.category}
                onChange={(e) =>
                  setValues({ ...values, category: e.target.value })
                }
              />
            </label>
            <label>
              来源及原文版本
              <input
                value={values.source}
                onChange={(e) =>
                  setValues({ ...values, source: e.target.value })
                }
              />
            </label>
            <label className="ag-wide">
              知识正文
              <textarea
                rows={8}
                maxLength={30000}
                value={values.content}
                onChange={(e) =>
                  setValues({ ...values, content: e.target.value })
                }
              />
            </label>
          </div>
          <AppButton
            className="ag-primary"
            disabled={
              saving || !values.title || !values.content || !values.source
            }
            onClick={async () => {
              setSaving(true);
              try {
                await callApi('/api/platform', {
                  companyId,
                  action: 'record.create',
                  kind: 'knowledge',
                  title: values.title,
                  owner: '知识负责人',
                  dueDate: '',
                  data: {
                    layer: values.layer,
                    category: values.category,
                    content: values.content,
                    source: values.source,
                    projectId,
                  },
                });
                setValues({ ...values, title: '', content: '', source: '' });
                await onChanged();
              } catch (e) {
                onError((e as Error).message);
              } finally {
                setSaving(false);
              }
            }}
          >
            保存知识草稿
          </AppButton>
        </section>
      )}
    </div>
  );
}
