'use client';
import { AppButton, AppSelect } from '@/components/ui/app-controls';
import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Check,
  GitBranch,
  Plus,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from './ui/dialog';
import { callApi, type PlatformData } from '@/lib/platform-client';
import type {
  BusinessRecord,
  PlatformUser,
  Tenant,
} from '@/lib/platform-config';
const formData = (e: FormEvent<HTMLFormElement>) =>
  Object.fromEntries(new FormData(e.currentTarget));
type Match = {
  id: string;
  title: string;
  kind: string;
  industry: string;
  description: string;
  cases: string;
  budget: string;
  criteria: string;
  evidence: string[];
  source: string;
};
export function NetworkPanel({
  companyId,
  onCreate,
}: {
  companyId: string;
  onCreate: (kind: string, data?: Record<string, string>) => void;
}) {
  const [query, setQuery] = useState(''),
    [matches, setMatches] = useState<Match[]>([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function search() {
    setBusy(true);
    try {
      const d = await callApi(
        `/api/platform/network?companyId=${encodeURIComponent(companyId)}&q=${encodeURIComponent(query)}`,
      );
      setMatches(d.matches);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void search();
  }, [companyId]);
  return (
    <>
      <div className="pf-page-title">
        <div>
          <span className="pf-eyebrow">ECOSYSTEM CONNECTIONS</span>
          <h1>供需撮合</h1>
          <p>只展示经企业授权并审核确认的能力与需求，逐条列出匹配依据。</p>
        </div>
        <AppButton className="primary-button" onClick={() => onCreate('demand')}>
          <Plus size={16} />
          登记需求
        </AppButton>
      </div>
      <form
        className="pf-network-search"
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <Search size={20} />
        <input
          aria-label="输入需求寻找伙伴"
          placeholder="输入需求、行业或能力关键词，例如品牌设计、软件开发…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <AppButton className="primary-button" disabled={busy}>
          匹配伙伴 <ArrowRight size={16} />
        </AppButton>
      </form>
      {error && (
        <p role="alert" className="feedback error">
          {error}
        </p>
      )}
      <div className="pf-card-grid">
        {matches.map((m) => (
          <section className="pf-network-card" key={m.id}>
            <span className="pf-status">
              {m.kind === 'enterprise' ? '企业能力' : '合作需求'} · {m.industry}
            </span>
            <h2>{m.title}</h2>
            <p>{m.description}</p>
            {m.budget && <strong>预算 ¥ {m.budget}</strong>}
            <small>
              {m.evidence.length
                ? `匹配词：${m.evidence.join('、')}`
                : '浏览授权展示资料'}
            </small>
            <small>{m.source}</small>
            <AppButton
              className="secondary-button"
              onClick={() =>
                onCreate('collaboration', {
                  partnerName: m.title,
                  responsibility: m.description,
                  terms: `来源 ${m.id}。请与合作方核实范围、费用及履约条件。`,
                })
              }
            >
              建立合作跟进 <ArrowRight size={15} />
            </AppButton>
          </section>
        ))}
      </div>
      {!matches.length && (
        <div className="pf-empty">
          没有匹配的授权资料。可先登记企业档案或需求，并选择“授权展示”后提交审核。
        </div>
      )}
    </>
  );
}
export function IndustryGraph({
  records,
  onOpen,
}: {
  records: BusinessRecord[];
  onOpen: (r: BusinessRecord) => void;
}) {
  const companies = records.filter((r) => r.kind === 'enterprise'),
    industries = [...new Set(companies.map((r) => r.data.industry))],
    angles = companies.map(
      (_, i) => (2 * Math.PI * i) / Math.max(companies.length, 1),
    );
  return (
    <>
      <div className="pf-page-title">
        <div>
          <span className="pf-eyebrow">INDUSTRY MAP</span>
          <h1>产业图谱</h1>
          <p>由当前企业档案的行业与能力资料生成，节点可打开查看。</p>
        </div>
      </div>
      <section className="pf-panel">
        <svg
          viewBox="0 0 1000 620"
          className="pf-graph"
          aria-label="企业产业关系图谱"
          role="img"
        >
          <circle cx="500" cy="310" r="80" fill="#112d45" stroke="#379bb3" />
          <text
            x="500"
            y="305"
            textAnchor="middle"
            fill="#d8f3ff"
            fontSize="23"
          >
            创客生态
          </text>
          <text
            x="500"
            y="335"
            textAnchor="middle"
            fill="#8eb6c8"
            fontSize="15"
          >
            {companies.length} 家企业 · {industries.length} 个行业
          </text>
          {companies.slice(0, 24).map((r, i) => {
            const x = 500 + 340 * Math.cos(angles[i]),
              y = 310 + 240 * Math.sin(angles[i]);
            return (
              <g key={r.id}>
                <line x1="500" y1="310" x2={x} y2={y} stroke="#274b64" />
                <g
                  role="button"
                  tabIndex={0}
                  aria-label={`查看${r.title}`}
                  onClick={() => onOpen(r)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onOpen(r);
                  }}
                >
                  <rect
                    x={x - 92}
                    y={y - 32}
                    width="184"
                    height="64"
                    rx="12"
                    fill="#10283c"
                    stroke="#4b839f"
                  />
                  <text
                    x={x}
                    y={y - 4}
                    textAnchor="middle"
                    fill="#dbeaf2"
                    fontSize="14"
                  >
                    {r.title.slice(0, 12)}
                  </text>
                  <text
                    x={x}
                    y={y + 18}
                    textAnchor="middle"
                    fill="#80c7ce"
                    fontSize="12"
                  >
                    {r.data.industry}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
        {!companies.length && (
          <div className="pf-empty">登记真实企业档案后，图谱会自动建立。</div>
        )}
      </section>
    </>
  );
}
export function InboxPanel({
  companyId,
  data,
  onChanged,
}: {
  companyId: string;
  data: PlatformData;
  onChanged: () => Promise<void>;
}) {
  const [error, setError] = useState('');
  async function respond(
    id: string,
    version: string,
    status: string,
    response: string,
  ) {
    try {
      await callApi('/api/platform', {
        action: 'inbox.receipt',
        companyId,
        id,
        version,
        status,
        response,
      });
      await onChanged();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <div className="pf-page-title">
        <div>
          <span className="pf-eyebrow">INTERNAL DELIVERY</span>
          <h1>企业通知与回执</h1>
          <p>已审核的内部发文会送达接收企业，阅读和办结状态可追踪。</p>
        </div>
      </div>
      {error && (
        <p role="alert" className="feedback error">
          {error}
        </p>
      )}
      {data.inbox.map((n) => (
        <section className="pf-panel pf-inbox-item" key={n.id}>
          <div className="pf-section-title">
            <h2>{n.title}</h2>
            <span className="pf-status">{n.status}</span>
          </div>
          <p>{n.content}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const values = formData(e);
              void respond(
                n.id,
                n.version,
                '已办结',
                String(values.response || ''),
              );
            }}
          >
            <textarea
              aria-label="通知处理反馈"
              name="response"
              defaultValue={n.response}
              placeholder="处理结果或下一步动作"
              rows={3}
            />
            <div className="pf-actions">
              {n.status === '未读' && (
                <AppButton
                  type="button"
                  onClick={() => void respond(n.id, n.version, '已读', '')}
                >
                  确认已读
                </AppButton>
              )}
              <AppButton
                disabled={data.role === 'viewer' || n.status === '已办结'}
              >
                提交办结回执
              </AppButton>
            </div>
          </form>
        </section>
      ))}
      {!data.inbox.length && <div className="pf-empty">暂无企业通知</div>}
    </>
  );
}
type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: number;
};
export function TeamPanel({
  companyId,
  user,
  tenant,
  onChanged,
}: {
  companyId: string;
  user: PlatformUser;
  tenant: Tenant;
  onChanged: () => Promise<void>;
}) {
  const [members, setMembers] = useState<Member[]>([]),
    [modal, setModal] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const admin = user.isAdmin || tenant.role === 'admin';
  async function refresh() {
    try {
      const d = await callApi(
        `/api/platform/team?companyId=${encodeURIComponent(companyId)}`,
      );
      setMembers(d.members);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void refresh();
  }, [companyId]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      await callApi('/api/platform/team', {
        ...formData(e),
        companyId,
        action: modal,
      });
      setModal('');
      setError('');
      await refresh();
      await onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="pf-page-title">
        <div>
          <span className="pf-eyebrow">ACCESS & GOVERNANCE</span>
          <h1>企业与团队</h1>
          <p>成员按企业授权；经理负责业务审核与财税管理，查看者只可阅读。</p>
        </div>
        <div className="pf-actions">
          {user.isAdmin && (
            <AppButton onClick={() => setModal('tenant.create')}>
              <Plus size={16} />
              创建企业
            </AppButton>
          )}
          {admin && (
            <AppButton
              className="primary-button"
              onClick={() => setModal('member.create')}
            >
              <Users size={16} />
              添加成员
            </AppButton>
          )}
        </div>
      </div>
      {error && (
        <div className="feedback error" role="alert">
          {error}
        </div>
      )}
      <section className="pf-panel pf-table-wrap">
        <table>
          <thead>
            <tr>
              <th>成员</th>
              <th>邮箱</th>
              <th>企业角色</th>
              <th>权限</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>{m.email}</td>
                <td>
                  <AppSelect
                    aria-label={`${m.name}的企业角色`}
                    value={m.role}
                    disabled={!admin || m.id === user.id}
                    onChange={async (e) => {
                      try {
                        await callApi('/api/platform/team', {
                          action: 'member.role',
                          companyId,
                          id: m.id,
                          role: e.target.value,
                        });
                        await refresh();
                      } catch (err) {
                        setError((err as Error).message);
                      }
                    }}
                  >
                    {['admin', 'manager', 'member', 'viewer'].map((s) => (
                      <option value={s} key={s}>
                        {
                          {
                            admin: '企业管理员',
                            manager: '经理',
                            member: '成员',
                            viewer: '查看者',
                          }[s]
                        }
                      </option>
                    ))}
                  </AppSelect>
                </td>
                <td>
                  {m.role === 'admin' || m.role === 'manager'
                    ? '业务审核、财税与敏感资料'
                    : m.role === 'member'
                      ? '业务录入与跟进'
                      : '查看非敏感业务'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="pf-panel pf-access-note">
        <ShieldCheck size={24} />
        <div>
          <h2>版本、审核和数据隔离</h2>
          <p>
            业务记录必须属于当前企业；确认版本修改后需重新审核。附件、财税接口和导出均执行服务端权限检查。企业ID：
            {companyId}
          </p>
        </div>
      </section>
      {modal && (
        <Dialog open onOpenChange={(v) => !v && !busy && setModal('')}>
          <DialogContent className="pf-dialog">
            <DialogTitle>
              {modal === 'tenant.create' ? '创建企业工作空间' : '添加企业成员'}
            </DialogTitle>
            <DialogDescription>
              企业数据独立保存。成员只能访问明确授权的企业。
            </DialogDescription>
            <form onSubmit={submit} className="pf-form">
              <label>
                名称
                <input required name="name" maxLength={120} />
              </label>
              {modal === 'member.create' && (
                <>
                  <label>
                    邮箱
                    <input required type="email" name="email" />
                  </label>
                  <label>
                    初始密码
                    <input
                      required
                      type="password"
                      name="password"
                      minLength={12}
                      maxLength={128}
                      autoComplete="new-password"
                    />
                  </label>
                  <label>
                    角色
                    <AppSelect name="role" defaultValue="member">
                      <option value="admin">企业管理员</option>
                      <option value="manager">经理</option>
                      <option value="member">成员</option>
                      <option value="viewer">查看者</option>
                    </AppSelect>
                  </label>
                  <p className="pf-muted">
                    初始密码至少 12 个字符，请通过你自己的安全渠道交给成员。
                  </p>
                </>
              )}
              {error && (
                <div role="alert" className="feedback error">
                  {error}
                </div>
              )}
              <AppButton className="primary-button" disabled={busy}>
                <Check size={16} />
                保存
              </AppButton>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
