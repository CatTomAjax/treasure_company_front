'use client';
import { AppButton } from '@/components/ui/app-controls';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as Icons from 'lucide-react';
import { callApi, saveBlob } from '@/lib/platform-client';
import type { PlatformUser, Tenant } from '@/lib/platform-config';
import { pptPages, type PptItem, type PptState } from '@/lib/ppt-model';
import {
  KnowledgeScreen,
  RolesScreen,
  WorkflowScreen,
  ContentScreen,
  ReviewScreen,
  ImportScreen,
} from './ppt-knowledge';
import { BrandScreen, VideoScreen, DocumentScreen } from './ppt-studios';
import { BusinessScreen } from './ppt-business';
import IntegrationCenter from './integration-center';
import AgentCenter from './agent-center';
import ModelSettings from './model-settings';
import { emptyPlatform, type PlatformData } from '@/lib/platform-client';
import './integration-center.css';
import './ppt-console.css';
import './park-overview.css';
import './ppt-workflow.css';
import { BUILD_INFO } from '@/lib/build-info';
import WorkspaceShell from './workspace-shell';
import EnterprisePortrait from './enterprise-portrait';

import {
  rememberFinanceCompany,
  selectedFinanceCompany,
} from '@/lib/finance-business';

type EditRequest = { collection: string; item: PptItem; fields?: string[] };
type PptContextValue = {
  state: PptState;
  companyId: string;
  busy: boolean;
  act: (action: string, body?: Record<string, unknown>) => Promise<any>;
  save: (collection: string, item: PptItem) => Promise<any>;
  edit: (collection: string, item: PptItem, fields?: string[]) => void;
  nav: (id: string) => void;
  notify: (s: string) => void;
};
const PptContext = createContext<PptContextValue>(null!);
export const usePpt = () => useContext(PptContext);
export const asset = (name: string) => `/ppt-assets/${name}`;
export function I({
  name = 'FileText',
  size = 18,
  ...rest
}: {
  name?: string;
  size?: number;
  [key: string]: any;
}) {
  const Icon =
    (Icons as unknown as Record<string, React.ComponentType<any>>)[name] ||
    Icons.FileText;
  return <Icon size={size} strokeWidth={1.7} {...rest} />;
}
export function Tag({
  children,
  tone = 'blue',
}: {
  children: ReactNode;
  tone?: string;
}) {
  const text = String(children);
  return (
    <span
      className={`pp-tag ${tone === 'blue' && /完成|已发布|已确认|已启用|齐全|已验证|正常|已收款/.test(text) ? 'green' : tone === 'blue' && /待|异常|预估/.test(text) ? 'gold' : tone}`}
    >
      {children}
    </span>
  );
}
export function Button({
  children,
  onClick,
  primary = false,
  icon,
  disabled = false,
  title,
  className = '',
}: {
  children?: ReactNode;
  onClick?: () => void;
  primary?: boolean;
  icon?: string;
  disabled?: boolean;
  title?: string;
  className?: string;
}) {
  return (
    <AppButton
      type="button"
      title={title}
      aria-label={title || (!children ? icon : undefined)}
      disabled={disabled}
      onClick={onClick}
      className={`pp-btn ${primary ? 'primary' : ''} ${className}`}
    >
      {icon && <I name={icon} size={15} />} {children}
    </AppButton>
  );
}
export function Tabs({
  items,
  value,
  onChange,
}: {
  items: string[];
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <div className="pp-tabs" role="tablist">
      {items.map((s) => (
        <AppButton
          role="tab"
          aria-selected={s === value}
          className={s === value ? 'active' : ''}
          key={s}
          onClick={() => onChange(s)}
        >
          {s}
        </AppButton>
      ))}
    </div>
  );
}
export function Panel({
  title,
  children,
  action,
  className = '',
}: {
  title?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`pp-panel ${className}`}>
      {title && (
        <header className="pp-panel-title">
          <h3>{title}</h3>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
export function Heading({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children?: ReactNode;
}) {
  return (
    <div className="pp-heading">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="pp-heading-actions">{children}</div>}
    </div>
  );
}
export function Progress({ value }: { value: number }) {
  return (
    <div className="pp-progress">
      <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
export function FileIcon({ type = 'Word' }: { type?: string }) {
  return (
    <span
      className={`pp-file-icon ${/pdf/i.test(type) ? 'red' : /excel|xlsx/i.test(type) ? 'green' : /ppt/i.test(type) ? 'orange' : /png|jpg|图/.test(type) ? 'blue' : 'blue'}`}
    >
      <I
        name={
          /图|png|jpg/.test(type)
            ? 'Image'
            : /excel|xlsx/i.test(type)
              ? 'Sheet'
              : 'FileText'
        }
        size={26}
      />
    </span>
  );
}
export function Metric({
  title,
  value,
  icon = 'ChartNoAxesCombined',
  color = 'blue',
  sub,
}: {
  title: string;
  value: ReactNode;
  icon?: string;
  color?: string;
  sub?: string;
}) {
  return (
    <div className={`pp-metric ${color}`}>
      <span className="pp-metric-icon">
        <I name={icon} size={25} />
      </span>
      <div>
        <small>{title}</small>
        <strong>{value}</strong>
        {sub && <small>{sub}</small>}
      </div>
    </div>
  );
}
export function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="pp-table-wrap">
      <table className="pp-table">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((r, i) => (
              <tr key={i}>
                {r.map((v, j) => (
                  <td key={j}>{v}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={headers.length}>暂无符合条件的记录</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
export function Assistant({
  title = 'AI 工作助手',
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <Panel
      className="pp-assistant"
      title={
        <>
          <span className="pp-bot">
            <I name="Bot" size={25} />
          </span>{' '}
          {title} <Tag tone="green">在线</Tag>
        </>
      }
    >
      {children}
    </Panel>
  );
}
export function MiniCard({
  title,
  content,
  icon = 'FileCheck2',
  tone = 'blue',
  onClick,
  action,
}: {
  title: string;
  content?: string;
  icon?: string;
  tone?: string;
  onClick?: () => void;
  action?: ReactNode;
}) {
  return (
    <div className={`pp-mini ${tone}`}>
      <I name={icon} size={20} />
      <div>
        <b>{title}</b>
        {content && <p>{content}</p>}
      </div>
      {onClick && <Button onClick={onClick}>查看 ›</Button>}
      {action}
    </div>
  );
}
export function Steps({
  labels,
  current,
  onClick,
}: {
  labels: string[];
  current: number;
  onClick?: (i: number) => void;
}) {
  return (
    <div className="pp-steps">
      {labels.map((s, i) => (
        <AppButton
          key={s}
          className={`${i < current ? 'done' : ''} ${i === current ? 'current' : ''}`}
          onClick={() => onClick?.(i)}
          disabled={!onClick}
        >
          <span>{i < current ? <I name="Check" size={16} /> : i + 1}</span>
          <b>{s}</b>
        </AppButton>
      ))}
    </div>
  );
}
export function exportText(title: string, text: string) {
  saveBlob(
    `${title}.md`,
    new Blob([text], { type: 'text/markdown;charset=utf-8' }),
  );
}

const labelMap: Record<string, string> = {
  title: '名称 / 标题',
  content: '内容说明',
  status: '状态',
  owner: '负责人',
  date: '计划日期',
  amount: '金额（元）',
  customer: '客户 / 企业',
  goals: '工作目标',
  scope: '知识范围 / 服务范围',
  tools: '可用工具',
  review: '审核负责人',
  prompt: '岗位提示词',
  knowledge: '绑定知识ID（逗号分隔）',
  subtitle: '岗位职责',
  category: '类别',
  roles: '适用岗位',
  headline: '主标题',
  ratio: '画面比例',
  caption: '字幕',
  seconds: '时长（秒）',
  transition: '转场',
  contact: '联系人',
  industry: '行业',
  next: '下一步跟进',
  priority: '优先级',
  progress: '进度（%）',
  type: '类型',
  reading: '抄表读数',
  price: '月租（元）',
  area: '面积（㎡）',
  seats: '工位数',
  comment: '审核意见 / 协作备注',
  excluded: '不包含范围',
  checks: '检查清单',
  before: '原流程用时',
  after: 'AI辅助用时',
  evidence: '凭证与来源',
  budget: '预算',
  role: '岗位',
  department: '部门',
  deadline: '截止日期',
  tags: '匹配标签',
  agency: '发布机构',
  level: '政策级别',
  unit: '单位',
  space: '空间',
  scale: '人员规模',
  skills: '服务能力',
  location: '办公地点',
  version: '版本',
  pages: '页数',
  outline: '文档大纲',
  channel: '发布渠道',
  direction: '资料方向',
  contract: '合同编号',
  projectId: '关联项目',
};
function ItemEditor({
  request,
  onClose,
}: {
  request: EditRequest;
  onClose: () => void;
}) {
  const { save, busy } = usePpt(),
    [draft, setDraft] = useState({ ...request.item }),
    [error, setError] = useState('');
  const keys =
    request.fields ||
    Object.keys(draft).filter(
      (k) =>
        k !== 'id' &&
        ![
          'icon',
          'color',
          'image',
          'assetType',
          'project',
          'sources',
          'format',
          'mapping',
          'generated',
          'targets',
          'sourceId',
          'receivableId',
          'orderId',
          'runId',
          'quotationId',
          'requirementId',
        ].includes(k),
    );
  return (
    <div
      className="pp-modal-shade"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="pp-modal pp-editor"
        role="dialog"
        aria-modal="true"
        aria-label="编辑记录"
      >
        <header>
          <div>
            <h2>
              {draft.id ? '编辑' : '新建'} · {draft.title || '业务记录'}
            </h2>
            <small>PPT演示空间 · 修改会保存至当前企业的独立演示数据库</small>
          </div>
          <Button icon="X" onClick={onClose} title="关闭编辑" />
        </header>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await save(request.collection, draft);
              onClose();
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <div className="pp-form-grid">
            {keys.map((k) => (
              <label
                key={k}
                className={
                  [
                    'content',
                    'goals',
                    'scope',
                    'prompt',
                    'outline',
                    'comment',
                  ].includes(k)
                    ? 'wide'
                    : ''
                }
              >
                {labelMap[k] || k}
                {[
                  'content',
                  'goals',
                  'scope',
                  'prompt',
                  'outline',
                  'comment',
                ].includes(k) ? (
                  <textarea
                    value={draft[k] || ''}
                    onChange={(e) =>
                      setDraft({ ...draft, [k]: e.target.value })
                    }
                    rows={k === 'content' ? 8 : 4}
                  />
                ) : (
                  <input
                    required={k === 'title'}
                    value={draft[k] || ''}
                    type={
                      k === 'date' && draft[k]?.length === 10 ? 'date' : 'text'
                    }
                    onChange={(e) =>
                      setDraft({ ...draft, [k]: e.target.value })
                    }
                  />
                )}
              </label>
            ))}
          </div>
          {error && (
            <p role="alert" className="pp-error">
              {error}
            </p>
          )}
          <footer>
            {draft.url && (
              <a className="pp-btn" href={draft.url} download={draft.title}>
                下载原文件
              </a>
            )}
            <Button
              onClick={() =>
                exportText(
                  draft.title,
                  draft.content || JSON.stringify(draft, null, 2),
                )
              }
              icon="Download"
            >
              下载内容
            </Button>
            <AppButton className="pp-btn primary" disabled={busy}>
              保存修改
            </AppButton>
          </footer>
        </form>
      </section>
    </div>
  );
}

function PptIntegrations({
  companyId,
  onBackend,
}: {
  companyId: string;
  onBackend: () => void;
}) {
  const {nav}=usePpt();
  const [data, setData] = useState<PlatformData>(emptyPlatform);
  const refresh = useCallback(async () => {
    setData(
      await callApi(`/api/platform?companyId=${encodeURIComponent(companyId)}`),
    );
  }, [companyId]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return (
    <div className="pp-integrations">
      <Heading
        title="接口与模型配置"
        sub="密钥保存在服务端；本地规则与编辑流程可独立使用。"
      />
      <Button primary icon="Bot" onClick={()=>nav('models')}>模型配置、真实测试与切换</Button>
      <IntegrationCenter
        companyId={companyId}
        records={data.records}
        files={data.files}
        role={data.role}
        onChanged={refresh}
        onOpen={() => onBackend()}
      />
    </div>
  );
}
export default function PptConsole({
  user,
  tenants,
  onBackend,
  onLogout,
  onSwitchAccount,
}: {
  user: PlatformUser;
  tenants: Tenant[];
  onBackend: () => void;
  onLogout: () => void | Promise<void>;
  onSwitchAccount: () => void | Promise<void>;
}) {
  const [page, setPage] = useState(() => {
      const id =
        typeof window === 'undefined'
          ? ''
          : window.location.hash.replace('#ppt/', '');
      return pptPages.some((p) => p.id === id) ? id : 'overview';
    }),
    [companyId, setCompanyId] = useState(() => {
      try{if(typeof window!=='undefined'&&window.location.hash.startsWith('#ppt/agents')){const saved=localStorage.getItem('agent-center-company');if(saved&&tenants.some(t=>t.id===saved))return saved;}}catch{}
      const selected = selectedFinanceCompany();
      return tenants.some((t) => t.id === selected)
        ? selected
        : tenants[0]?.id || 'park';
    }),
    [data, setData] = useState<{ state: PptState; version: string } | null>(
      null,
    ),
    [notice, setNotice] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [editRequest, setEdit] = useState<EditRequest | null>(null),
    [catalog, setCatalog] = useState(false);
  const latest = useRef(data),
    queue = useRef(Promise.resolve()),
    epoch = useRef(0);
  latest.current = data;
  const nav = useCallback((id: string) => {
    if (pptPages.some((p) => p.id === id)) {
      setPage(id);
      location.hash = `ppt/${id}`;
      setCatalog(false);
    }
  }, []);
  useEffect(() => {
    const changed = () => {
      const id = location.hash.replace('#ppt/', '');
      if (pptPages.some((item) => item.id === id)) setPage(id);
    };
    changed();
    window.addEventListener('hashchange', changed);
    return () => window.removeEventListener('hashchange', changed);
  }, []);
  const refresh = useCallback(async () => {
    const request = ++epoch.current;
    setData(null);
    try {
      const next = await callApi(`/api/platform/ppt?companyId=${encodeURIComponent(companyId)}`);
      if (request === epoch.current) {
        setData(next);
        setError('');
      }
    } catch (failure) {
      if (request === epoch.current) setError((failure as Error).message);
    }
  }, [companyId]);
  useEffect(() => {
    rememberFinanceCompany(companyId);
    void refresh();
    setEdit(null);
    return () => {
      epoch.current++;
    };
  }, [refresh]);
  async function act(action: string, body: Record<string, unknown> = {}) {
    const seq = epoch.current;
    let resolve!: (v: any) => void, reject!: (e: any) => void;
    const result = new Promise<any>((r, j) => {
      resolve = r;
      reject = j;
    });
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        if (seq !== epoch.current) {
          reject(new Error('企业已切换，请重新操作'));
          return;
        }
        setBusy(true);
        try {
          const d = await callApi('/api/platform/ppt', {
            ...body,
            action,
            companyId,
            version: latest.current?.version,
          });
          if (seq === epoch.current) {
            latest.current = d;
            setData(d);
            if (d.message) setNotice(d.message);
            window.dispatchEvent(new Event('platform:saved'));
          }
          resolve(d);
        } catch (e) {
          setNotice((e as Error).message);
          reject(e);
        } finally {
          setBusy(false);
        }
      });
    return result;
  }
  const save = (collection: string, item: PptItem) =>
    act('item.save', { collection, item });
  const current = pptPages.find((x) => x.id === page)!;
  return (
    <WorkspaceShell
      page={page}
      user={user}
      tenants={tenants}
      companyId={companyId}
      onCompanyChange={setCompanyId}
      onNavigate={nav}
      onBackend={onBackend}
      onLogout={onLogout}
      onSwitchAccount={onSwitchAccount}
      onCatalog={() => setCatalog(true)}
      onNotification={() => setNotice(data?.state.events.at(-1)?.title || '暂无新通知')}
    >
    <div className={`pp-app ${page === 'overview' ? 'po-app' : ''}`} aria-busy={busy}>
      <main className={`pp-main page-${page}`}>
        <div className="pp-mode-line">
          <span>
            <i /> 企业工作台 · 示例资料可编辑 · 数据已持久化
          </span>
          <span>
            <span title={BUILD_INFO.builtAt}>
              本地版本 {BUILD_INFO.version.slice(0, 8)}
            </span>
            　{current.source}　{busy ? '正在保存…' : '已连接本地数据库'}
          </span>
        </div>
        {error ? (
          <Panel title="连接失败">
            <p className="pp-error">{error}</p>
            <Button onClick={() => void refresh()}>重试</Button>
          </Panel>
        ) : !data ? (
          <div className="pp-loading">
            <I name="LoaderCircle" size={30} /> 正在载入页面…
          </div>
        ) : (
          <PptContext.Provider
            value={{
              state: data.state,
              companyId,
              busy,
              act,
              save,
              edit: (collection, item, fields) =>
                setEdit({ collection, item, fields }),
              nav,
              notify: setNotice,
            }}
          >
            {page === 'portrait' ? (
              <EnterprisePortrait key={companyId} companyId={companyId} />
            ) : page === 'models' ? (
              <ModelSettings key={companyId} companyId={companyId}/>
            ) : page === 'agents' ? (
              <AgentCenter key={companyId} companyId={companyId} />
            ) : page === 'knowledge' ? (
              <KnowledgeScreen />
            ) : page === 'roles' ? (
              <RolesScreen />
            ) : page === 'workflow' ? (
              <WorkflowScreen />
            ) : page === 'content' ? (
              <ContentScreen />
            ) : page === 'brand' ? (
              <BrandScreen />
            ) : page === 'video' ? (
              <VideoScreen />
            ) : page === 'documents' ? (
              <DocumentScreen />
            ) : page === 'review' ? (
              <ReviewScreen />
            ) : page === 'imports' ? (
              <ImportScreen />
            ) : page === 'integrations' ? (
              <PptIntegrations companyId={companyId} onBackend={onBackend} />
            ) : (
              <BusinessScreen page={page} />
            )}
            {editRequest && (
              <ItemEditor
                key={editRequest.item.id || editRequest.collection}
                request={editRequest}
                onClose={() => setEdit(null)}
              />
            )}
          </PptContext.Provider>
        )}
      </main>
      {notice && (
        <div className="pp-toast" role="status">
          <I name="Info" size={18} />
          {notice}
          <AppButton onClick={() => setNotice('')} aria-label="关闭提示">
            <I name="X" size={15} />
          </AppButton>
        </div>
      )}
      {catalog && (
        <div className="pp-modal-shade">
          <section
            className="pp-modal pp-catalog"
            role="dialog"
            aria-modal="true"
            aria-label="全部应用"
          >
            <header>
              <div>
                <h2>全部应用</h2>
                <p>选择一个应用，开始今天的工作。</p>
              </div>
              <Button
                icon="X"
                onClick={() => setCatalog(false)}
                title="关闭页面目录"
              />
            </header>
            <div className="pp-catalog-grid">
              {pptPages.map((p) => (
                <AppButton key={p.id} onClick={() => nav(p.id)}>
                  <I name={p.icon} size={23} />
                  <b>{p.title}</b>
                  <small>{p.source}</small>
                </AppButton>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
    </WorkspaceShell>
  );
}
