'use client';
import { AppButton, AppSelect } from '@/components/ui/app-controls';
import IntegrationCenter from './integration-center';
import AgentCenter from './agent-center';
import ModelSettings from './model-settings';
import './integration-center.css';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import {
  ArrowRight,
  Bell,
  BookOpen,
  Boxes,
  BriefcaseBusiness,
  Building2,
  ChartNoAxesCombined,
  ChevronDown,
  FileCheck2,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  modules,
  groups,
  type BusinessRecord,
  type PlatformUser,
  type Tenant,
} from '@/lib/platform-config';
import {
  callApi,
  emptyPlatform,
  localToday,
  type PlatformData,
} from '@/lib/platform-client';
import {
  rememberFinanceCompany,
  selectedFinanceCompany,
} from '@/lib/finance-business';
import FinanceManager from './finance-manager';
import TaxPanel from './tax-panel';
import {
  BusinessAnalytics,
  CashForecast,
  PlatformOverview,
} from './platform-analytics';
import {
  InboxPanel,
  IndustryGraph,
  NetworkPanel,
  TeamPanel,
} from './platform-advanced';
import { RecordEditor, RecordsPanel } from './platform-records';
import { useWorkspace } from '@/lib/use-workspace';
import {
  CreationPanel,
  KnowledgePanel,
  TaskBoard,
  TaskEditor,
  FlowPanel,
} from './workspace-panels';
import type { Task, Flow } from '@/lib/workbench-data';
import './platform.css';
import './park.css';
import PptConsole from './ppt-console';
export default function Platform() {
  const [businessMode,setBusinessMode]=useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [auth, setAuth] = useState<{
      initialized: boolean;
      user: PlatformUser | null;
      tenants: Tenant[];
    } | null>(null),
    [error, setError] = useState('');
  const refreshAuth = useCallback(async () => {
    try {
      setAuth(await callApi('/api/platform/auth'));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);
  async function leaveAccount(switching: boolean) {
    await callApi('/api/platform/auth', { action: 'logout' });
    setSwitchingAccount(switching);
    setBusinessMode(false);
    setAuth((previous) => previous ? { ...previous, user: null, tenants: [] } : previous);
  }
  if (!auth)
    return (
      <div className="pf-auth-page">
        <section className="pf-auth-card">
          <Boxes size={35} />
          <h1>创客中心</h1>
          <p>{error || '正在连接企业工作空间…'}</p>
          {error && (
            <AppButton onClick={() => void refreshAuth()}>重新连接</AppButton>
          )}
        </section>
      </div>
    );
  if (!auth.user)
    return <Login initialized={auth.initialized} switchingAccount={switchingAccount} onReady={async () => { setSwitchingAccount(false); await refreshAuth(); }} />;
  if(!businessMode)return <PptConsole user={auth.user} tenants={auth.tenants} onBackend={()=>setBusinessMode(true)} onLogout={() => leaveAccount(false)} onSwitchAccount={() => leaveAccount(true)}/>;
  return (
    <><AppButton className="pp-return" onClick={()=>setBusinessMode(false)}>← 返回 PPT 页面</AppButton>
    <PlatformShell
      user={auth.user}
      tenants={auth.tenants}
      refreshAuth={refreshAuth}
    /></>
  );
}
function Login({
  initialized,
  onReady,
  switchingAccount = false,
}: {
  initialized: boolean;
  onReady: () => Promise<void>;
  switchingAccount?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      await callApi('/api/platform/auth', {
        ...Object.fromEntries(new FormData(e.currentTarget)),
        action: initialized ? 'login' : 'setup',
      });
      await onReady();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="pf-auth-page">
      <div className="pf-auth-intro">
        <span className="pf-eyebrow">QIANHAI MAKER CENTER</span>
        <h1>
          企业经营，
          <br />
          从这里协同。
        </h1>
        <p>
          让业务、AI 与伙伴一起工作。
          <br />
          从真实需求，到可追溯的交付与回款。
        </p>
        <div className="pf-auth-trust">
          <span>
            <Building2 size={19} />
            企业空间
          </span>
          <span>
            <FileCheck2 size={19} />
            审核追溯
          </span>
          <span>
            <GitBranch size={19} />
            合作生态
          </span>
        </div>
      </div>
      <section className="pf-auth-card">
        <div className="pf-auth-brand">
          <Boxes size={30} />
          <strong>
            创客中心<small>AI 智慧生态平台</small>
          </strong>
        </div>
        <h2>{initialized ? switchingAccount ? '登录其他账号' : '登录企业工作台' : '设置首位管理员'}</h2>
        <p>
          {initialized
            ? switchingAccount ? '当前账号已退出，请使用其他已获授权的账号登录。' : '使用已获授权的企业账号登录。'
            : '首次启用，请设置平台管理员账号。已有业务数据会保留。'}
        </p>
        <form className="pf-form" onSubmit={submit}>
          {!initialized && (
            <label>
              姓名
              <input name="name" required maxLength={80} autoComplete="name" />
            </label>
          )}
          <label>
            邮箱
            <input name="email" type="email" required autoComplete="username" />
          </label>
          <label>
            密码
            <input
              name="password"
              type="password"
              minLength={12}
              maxLength={128}
              required
              autoComplete={initialized ? 'current-password' : 'new-password'}
            />
          </label>
          {!initialized && (
            <small>至少 12 个字符。后续可创建企业并为团队分配权限。</small>
          )}
          {error && (
            <div className="feedback error" role="alert">
              {error}
            </div>
          )}
          <AppButton className="primary-button" disabled={busy}>
            {busy
              ? '正在验证…'
              : initialized
                ? '登录工作台'
                : '创建管理员并启用'}
            <ArrowRight size={17} />
          </AppButton>
        </form>
      </section>
    </main>
  );
}
function PlatformShell({
  user,
  tenants,
  refreshAuth,
}: {
  user: PlatformUser;
  tenants: Tenant[];
  refreshAuth: () => Promise<void>;
}) {
  const [companyId, setCompanyId] = useState(() => {
      const old = selectedFinanceCompany();
      return tenants.some((t) => t.id === old) ? old : tenants[0]?.id || 'park';
    }),
    [view, setView] = useState('overview'),
    [group, setGroup] = useState('客户与交付'),
    [data, setData] = useState<PlatformData>(emptyPlatform),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [search, setSearch] = useState(''),
    [mobile, setMobile] = useState(false),
    [edit, setEdit] = useState<BusinessRecord | null>(null);
  const company = tenants.find((t) => t.id === companyId) || tenants[0],
    requestId = useRef(0);
  const manager = company && ['admin', 'manager'].includes(company.role);
  const refresh = useCallback(async () => {
    const seq = ++requestId.current;
    try {
      const d = await callApi(
        `/api/platform?companyId=${encodeURIComponent(companyId)}`,
      );
      if (seq === requestId.current) {
        setData(d);
        setError('');
        return d as PlatformData;
      }
    } catch (e) {
      if (seq === requestId.current) {
        setError((e as Error).message);
        if ((e as Error).message === '请先登录') {
          setData(emptyPlatform);
          setEdit(null);
          await refreshAuth();
        }
      }
    } finally {
      if (seq === requestId.current) setLoading(false);
    }
  }, [companyId, refreshAuth]);
  useEffect(() => {
    setData(emptyPlatform);
    setLoading(true);
    setEdit(null);
    rememberFinanceCompany(companyId);
    void refresh();
    const timer = setInterval(() => void refresh(), 30000);
    return () => {
      clearInterval(timer);
      requestId.current++;
    };
  }, [companyId, refresh]);
  function navigate(id: string) {
    setView(id);
    setSearch('');
    setNotice('');
    setMobile(false);
    if (modules[id]) setGroup(modules[id].group);
  }
  function create(kind: string, initial: Record<string, string> = {}) {
    const spec = modules[kind],
      fields: Record<string, string> = {};
    spec.fields.forEach(
      (f) => (fields[f.key] = f.type === 'select' ? f.options?.[0] || '' : ''),
    );
    if (kind === 'aiRole') fields.tokenBudget = '2000';
    if (kind === 'video') {
      fields.seconds = '4';
      fields.ratio = '16:9';
    }
    setEdit({
      id: '',
      companyId,
      kind,
      title: '',
      owner: user.name,
      dueDate: '',
      status: spec.states[0],
      data: { ...fields, ...initial },
      version: '',
      createdAt: '',
      updatedAt: '',
    });
  }
  async function save(record: BusinessRecord) {
    const result = await callApi('/api/platform', {
      action: record.id ? 'record.save' : 'record.create',
      companyId,
      id: record.id,
      version: record.version,
      kind: record.kind,
      title: record.title,
      owner: record.owner,
      dueDate: record.dueDate,
      data: record.data,
    });
    await refresh();
    setEdit(result.record);
    setNotice('业务记录已保存');
  }
  async function action(
    body: Record<string, unknown>,
    endpoint = '/api/platform',
  ) {
    const d = await callApi(endpoint, { ...body, companyId });
    const next = await refresh();
    if (d.record) setEdit(d.record);
    else if (edit && next)
      setEdit(next.records.find((r) => r.id === edit.id) || edit);
    setNotice(
      d.replayed
        ? '该动作之前已经完成，已返回关联记录'
        : d.id
          ? `已生成关联记录：${d.id}`
          : '操作已完成',
    );
  }
  const current =
    modules[view]?.label ||
    (
      {
        overview: '经营总览',
        network: '供需撮合',
        industry: '产业图谱',
        todo: '我的待办',
        cash: '现金预测',
        analytics: '经营分析',
        integrations: '接入与生产队列',
        finance: '财务管理',
        tax: '税务管理',
        team: '企业与团队',
        inbox: '企业通知',
        legacy: '内容审核与导出',
        settings: '连接与使用说明',
      } as Record<string, string>
    )[view];
  const today = localToday(),
    todos = data.records.filter(
      (r) =>
        ![
          '已归档',
          '已完成',
          '已关闭',
          '已终止',
          '已停用',
          '已离职',
          '已取消',
        ].includes(r.status) &&
        r.dueDate &&
        r.dueDate <= today,
    );
  const selected = edit?.id
    ? data.records.find((r) => r.id === edit.id) || edit
    : edit;
  const unread = data.inbox.filter((n) => n.status === '未读').length;
  const available = (kind: string) =>
    manager ||
    ![
      'employee',
      'recruitment',
      'admin',
      'cost',
      'purchase',
      'supplierQuote',
      'invoiceRequest',
      'taxHandoff',
    ].includes(kind);
  return (
    <div className="pf-app">
      <AppButton
        className="pf-mobile-toggle"
        onClick={() => setMobile(!mobile)}
        aria-label="打开导航"
      >
        <Menu size={21} />
      </AppButton>
      {mobile && (
        <AppButton
          className="pf-mobile-backdrop"
          aria-label="关闭导航"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`pf-sidebar ${mobile ? 'open' : ''}`}>
        <div className="pf-brand">
          <div>
            <Boxes size={26} />
          </div>
          <strong>
            创客中心<small>AI 智慧生态平台</small>
          </strong>
          <AppButton
            className="pf-mobile-close"
            aria-label="关闭导航"
            onClick={() => setMobile(false)}
          >
            <X size={18} />
          </AppButton>
        </div>
        <label className="pf-tenant-picker">
          <Building2 size={18} />
          <AppSelect
            aria-label="当前企业工作空间"
            value={companyId}
            onChange={(e) => {
              setCompanyId(e.target.value);
              setView('overview');
            }}
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </AppSelect>
        </label>
        <nav className="pf-navigation">
          <AppButton
            className={view === 'overview' ? 'active' : ''}
            onClick={() => navigate('overview')}
          >
            <LayoutDashboard size={18} />
            经营总览
          </AppButton>
          <AppButton
            className={view === 'todo' ? 'active' : ''}
            onClick={() => navigate('todo')}
          >
            <BriefcaseBusiness size={18} />
            责任待办<span>{todos.length}</span>
          </AppButton>
          <AppButton
            className={view === 'network' ? 'active' : ''}
            onClick={() => navigate('network')}
          >
            <GitBranch size={18} />
            供需撮合
          </AppButton>
          <div className="pf-nav-label">企业业务</div>
          <AppButton className={view==='models'?'active':''} onClick={()=>navigate('models')}><Settings2 size={18}/>模型配置与切换</AppButton>
          <AppButton className={view === 'agents' ? 'active' : ''} onClick={() => navigate('agents')}><GitBranch size={18} />Agent 执行中心</AppButton>
          {groups
            .filter((g) => g !== '经营分析')
            .map((g) => (
              <div key={g}>
                <AppButton
                  className={`pf-group ${group === g ? 'expanded' : ''}`}
                  onClick={() => setGroup(group === g ? '' : g)}
                >
                  {g === '客户与交付' ? (
                    <BriefcaseBusiness size={18} />
                  ) : g === '知识与AI' ? (
                    <Sparkles size={18} />
                  ) : g === '合作生态' ? (
                    <Users size={18} />
                  ) : g === '园区运营' ? (
                    <Building2 size={18} />
                  ) : (
                    <BookOpen size={18} />
                  )}
                  <span>{g}</span>
                  <ChevronDown size={14} />
                </AppButton>
                {group === g && (
                  <div className="pf-subnav">
                    {Object.entries(modules)
                      .filter(([k, s]) => !s.internal && s.group === g && available(k))
                      .map(([k, s]) => (
                        <AppButton
                          key={k}
                          className={view === k ? 'active' : ''}
                          onClick={() => navigate(k)}
                        >
                          {s.label}
                        </AppButton>
                      ))}
                    {g === '合作生态' && (
                      <AppButton
                        className={view === 'industry' ? 'active' : ''}
                        onClick={() => navigate('industry')}
                      >
                        产业图谱
                      </AppButton>
                    )}
                  </div>
                )}
              </div>
            ))}
          {manager && (
            <>
              <div className="pf-nav-label">财务与经营</div>
              <AppButton
                className={view === 'integrations' ? 'active' : ''}
                onClick={() => navigate('integrations')}
              >
                <Settings2 size={18} />
                接入与生产队列
              </AppButton>
              <AppButton
                className={view === 'finance' ? 'active' : ''}
                onClick={() => navigate('finance')}
              >
                <Wallet size={18} />
                财务管理
              </AppButton>
              <AppButton
                className={view === 'tax' ? 'active' : ''}
                onClick={() => navigate('tax')}
              >
                <FileCheck2 size={18} />
                税务管理
              </AppButton>
              <AppButton
                className={view === 'cash' ? 'active' : ''}
                onClick={() => navigate('cash')}
              >
                <ChartNoAxesCombined size={18} />
                现金预测
              </AppButton>
            </>
          )}
          <AppButton
            className={view === 'analytics' ? 'active' : ''}
            onClick={() => navigate('analytics')}
          >
            <ChartNoAxesCombined size={18} />
            经营分析
          </AppButton>
          <AppButton
            className={view === 'validation' ? 'active' : ''}
            onClick={() => navigate('validation')}
          >
            <FileCheck2 size={18} />
            价值验证
          </AppButton>
          {user.isAdmin && companyId === 'park' && (
            <AppButton
              className={view === 'legacy' ? 'active' : ''}
              onClick={() => navigate('legacy')}
            >
              <BookOpen size={18} />
              内容审核与导出
            </AppButton>
          )}
        </nav>
        <div className="pf-sidebar-bottom">
          <AppButton onClick={() => navigate('settings')}>
            <Settings2 size={17} />
            连接与使用说明
          </AppButton>
          {manager && (
            <AppButton onClick={() => navigate('team')}>
              <Users size={17} />
              企业与团队
            </AppButton>
          )}
          <div className="pf-user">
            <span>{user.name.slice(0, 1)}</span>
            <div>
              <strong>{user.name}</strong>
              <small>
                {
                  (
                    {
                      admin: '管理员',
                      manager: '经理',
                      member: '业务成员',
                      viewer: '只读成员',
                    } as Record<string, string>
                  )[company?.role || 'viewer']
                }
              </small>
            </div>
            <AppButton
              aria-label="退出登录"
              onClick={async () => {
                await callApi('/api/platform/auth', { action: 'logout' });
                await refreshAuth();
              }}
            >
              <LogOut size={17} />
            </AppButton>
          </div>
        </div>
      </aside>
      <div className="pf-shell">
        <header className="pf-topbar">
          <div className="pf-breadcrumb">
            <span>{company?.name}</span>
            <ArrowRight size={13} />
            <strong>{current}</strong>
          </div>
          <div className="pf-topbar-actions">
            <span className="pf-live">
              <i />
              企业工作空间
            </span>
            <AppButton
              aria-label="刷新当前企业数据"
              disabled={loading}
              onClick={() => void refresh()}
            >
              <RefreshCw size={17} />
            </AppButton>
            <AppButton aria-label="查看企业通知" onClick={() => navigate('inbox')}>
              <Bell size={18} />
              {unread > 0 && <b>{unread}</b>}
            </AppButton>
          </div>
        </header>
        <main className="pf-main">
          {error && (
            <div role="alert" className="feedback error">
              {error}
              <AppButton onClick={() => void refresh()}>重试</AppButton>
            </div>
          )}
          {notice && (
            <div role="status" className="pf-notice">
              {notice}
              <AppButton aria-label="关闭消息" onClick={() => setNotice('')}>
                <X size={15} />
              </AppButton>
            </div>
          )}
          {loading ? (
            <div className="pf-empty">正在加载企业业务…</div>
          ) : modules[view] ? (
            <RecordsPanel
              key={`${companyId}/${view}`}
              companyId={companyId}
              kind={view}
              data={data}
              search={search}
              setSearch={setSearch}
              onOpen={setEdit}
              onCreate={() => create(view)}
              onImported={async () => {
                await refresh();
              }}
            />
          ) : view === 'overview' ? (
            <PlatformOverview
              data={data}
              onNavigate={navigate}
              onOpen={setEdit}
            />
          ) : view === 'models' ? (
            <ModelSettings key={companyId} companyId={companyId}/>
          ) : view === 'agents' ? (
            <AgentCenter key={companyId} companyId={companyId} />
          ) : view === 'integrations' ? (
            <IntegrationCenter
              companyId={companyId}
              records={data.records}
              files={data.files}
              role={data.role}
              onChanged={async () => {
                await refresh();
              }}
              onOpen={setEdit}
            />
          ) : view === 'finance' ? (
            <FinanceManager key={companyId} fixedCompanyId={companyId} />
          ) : view === 'tax' ? (
            <TaxPanel key={companyId} fixedCompanyId={companyId} />
          ) : view === 'cash' ? (
            <CashForecast data={data} />
          ) : view === 'analytics' ? (
            <BusinessAnalytics
              companyId={companyId}
              data={data}
              onOpen={setEdit}
            />
          ) : view === 'network' ? (
            <NetworkPanel companyId={companyId} onCreate={create} />
          ) : view === 'industry' ? (
            <IndustryGraph records={data.records} onOpen={setEdit} />
          ) : view === 'inbox' ? (
            <InboxPanel
              companyId={companyId}
              data={data}
              onChanged={async () => {
                await refresh();
              }}
            />
          ) : view === 'team' ? (
            <TeamPanel
              companyId={companyId}
              user={user}
              tenant={company}
              onChanged={refreshAuth}
            />
          ) : view === 'todo' ? (
            <>
              <div className="pf-page-title">
                <div>
                  <span className="pf-eyebrow">RESPONSIBILITY & FOLLOW-UP</span>
                  <h1>到期责任待办</h1>
                  <p>明确负责人、下一步与完成条件，业务完成后自动移出待办。</p>
                </div>
              </div>
              <section className="pf-panel">
                {todos.map((r) => (
                  <AppButton
                    className="pf-list-row"
                    key={r.id}
                    onClick={() => setEdit(r)}
                  >
                    <span className="pf-status">{modules[r.kind].label}</span>
                    <strong>{r.title}</strong>
                    <span>{r.owner}</span>
                    <span className="pf-danger">{r.dueDate}</span>
                    <ArrowRight size={16} />
                  </AppButton>
                ))}
                {!todos.length && (
                  <div className="pf-empty">当前没有到期事项</div>
                )}
              </section>
            </>
          ) : view === 'legacy' ? (
            <LegacyContent />
          ) : (
            <PlatformSettings onNavigate={navigate} />
          )}
          <footer className="pf-footer">
            <span>前海创客中心 · 企业 AI 经营与合作平台</span>
            <span>业务有据，协作有序</span>
          </footer>
        </main>
      </div>
      {selected && (
        <RecordEditor
          key={`${selected.id || selected.kind}/${selected.version}`}
          record={selected}
          companyId={companyId}
          data={data}
          onClose={() => setEdit(null)}
          onSave={save}
          onAction={action}
          onRefresh={async () => {
            await refresh();
          }}
        />
      )}
    </div>
  );
}
function PlatformSettings({
  onNavigate,
}: {
  onNavigate: (view: string) => void;
}) {
  return (
    <>
      <div className="pf-page-title">
        <div>
          <span className="pf-eyebrow">CONNECTIONS</span>
          <h1>连接与使用说明</h1>
          <p>按现有接口能力配置系统，所有记录保存到当前企业。</p>
        </div>
      </div>
      <section className="pf-panel pf-settings">
        <div className="pf-actions">
          <AppButton
            className="primary-button"
            onClick={() => onNavigate('integrations')}
          >
            前往接入与生产队列
          </AppButton>
        </div>
        <h2>开始使用</h2>
        <p>
          企业与团队 → 建立企业和成员 → 登记客户与需求 → 审核需求 → 报价确认 →
          一键创建项目 → 任务、版本与验收 → 生成财务单据 → 审核、实际收付 →
          复盘回库。
        </p>
        <h2>当前连接</h2>
        <dl>
          <dt>本地数据库</dt>
          <dd>
            Cloudflare D1 / SQLite，业务记录、版本、附件、审核和财税同步持久化。
          </dd>
          <dt>AI 生成</dt>
          <dd>
            本地规则模板可立即使用。已获授权接入 DeepSeek 官方接口。服务端配置
            DEEPSEEK_API_KEY 后启用真实模型；默认 deepseek-flash，可用
            DEEPSEEK_MODEL 指定。密钥不会进入浏览器、数据库或导出。
          </dd>
          <dt>图文与文档</dt>
          <dd>
            支持 Markdown、可编辑
            DOCX、PPTX、SVG品牌海报；所有成果须经负责人核实。
          </dd>
          <dt>视频</dt>
          <dd>
            支持镜头编辑、字幕、图片/视频素材、模板预览、WebM成片和 SRT/JSON
            导出；素材单文件不超过 8 MB，单条最长 300
            秒。支持素材起始时间、镜头排序、配乐和成片入库；外部生成式视频可通过接入中心准备请求和登记回执。
          </dd>
          <dt>水电与设备</dt>
          <dd>
            可录入计量点和抄表记录，自动算费、识别超阈值用量、生成应收；现场 IoT
            协议、设备地址和凭据需要真实设备接入。
          </dd>
          <dt>政企发文</dt>
          <dd>
            已实现内部企业通知与回执。公众号、视频号、小红书已分别提供配置、审核交接包和回执流程；实际发布仍需要对应官方授权或受信网关。
          </dd>
          <dt>支付与税务</dt>
          <dd>实际收付款由人工登记；银行、电子发票和税务申报平台尚未连接。</dd>
        </dl>
        <h2>资料与治理</h2>
        <p>
          知识按原始资料、业务知识和岗位经验分层。资料有来源，已确认版本锁定；修改退回后重新审核。只有经授权且已确认的企业能力和需求进入供需展示，个人联系人不进入跨企业展示。
        </p>
        <h2>研发参考</h2>
        <p>
          {[
            ['ERPNext', 'https://github.com/frappe/erpnext'],
            ['Frappe CRM', 'https://github.com/frappe/crm'],
            ['Plane', 'https://github.com/makeplane/plane'],
            ['Dify', 'https://github.com/langgenius/dify'],
            ['Frappe HR', 'https://github.com/frappe/hrms'],
            [
              'OpenCut Classic',
              'https://github.com/OpenCut-app/opencut-classic',
            ],
          ].map(([name, url]) => (
            <a href={url} target="_blank" rel="noreferrer" key={name}>
              {name}　
            </a>
          ))}
        </p>
        <p>参考业务流程后在当前框架独立实现，未引入上述系统完整源码。</p>
      </section>
    </>
  );
}
function LegacyContent() {
  const w = useWorkspace(),
    [tab, setTab] = useState('创作'),
    [task, setTask] = useState<Task | null>(null),
    [flow, setFlow] = useState<Flow | undefined>(),
    [creationKey, setCreationKey] = useState(0);
  return (
    <>
      <div className="pf-page-title">
        <div>
          <h1>内容审核与导出</h1>
          <p>保留原有运营内容、自动化工作流、知识和发布归档。</p>
        </div>
      </div>
      <div className="pf-tabs">
        {['创作', '团队审核', '自动工作流', '原有知识', '发布归档'].map((s) => (
          <AppButton
            key={s}
            className={tab === s ? 'active' : ''}
            onClick={() => setTab(s)}
          >
            {s}
          </AppButton>
        ))}
      </div>
      {w.error && (
        <p role="alert" className="feedback error">
          {w.error}
        </p>
      )}
      {tab === '创作' ? (
        <CreationPanel
          key={creationKey}
          initialType={flow?.type || '招商文案'}
          flow={flow}
          aiMode={w.aiMode}
          knowledge={w.knowledge}
          mutate={w.mutate}
          disabled={w.loading || !!w.error}
          onCreated={(t) => {
            setTask(t);
            setTab('团队审核');
          }}
        />
      ) : tab === '自动工作流' ? (
        <FlowPanel
          flows={w.flows}
          mutate={w.mutate}
          onRun={(f) => {
            setFlow(f);
            setCreationKey((k) => k + 1);
            setTab('创作');
          }}
          disabled={w.loading || !!w.error}
        />
      ) : tab === '原有知识' ? (
        <KnowledgePanel
          knowledge={w.knowledge}
          search=""
          mutate={w.mutate}
          disabled={w.loading || !!w.error}
        />
      ) : (
        <TaskBoard
          tasks={w.tasks}
          onOpen={setTask}
          search=""
          publish={tab === '发布归档'}
        />
      )}{' '}
      {task && (
        <TaskEditor
          key={task.id}
          task={task}
          mutate={w.mutate}
          onClose={() => setTask(null)}
          onUpdate={setTask}
        />
      )}
    </>
  );
}
