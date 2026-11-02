'use client';
import { AppButton, AppSelect } from '@/components/ui/app-controls';
import { useState } from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
  Clock,
  FileCheck2,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import type { BusinessRecord } from '@/lib/platform-config';
import {
  callApi,
  cash,
  localToday,
  type PlatformData,
} from '@/lib/platform-client';
export function PlatformOverview({
  data,
  onNavigate,
  onOpen,
}: {
  data: PlatformData;
  onNavigate: (s: string) => void;
  onOpen: (r: BusinessRecord) => void;
}) {
  const today = localToday(),
    r = data.records,
    active = r.filter(
      (x) =>
        !['已归档', '已完成', '已关闭', '已终止', '已停用'].includes(x.status),
    ),
    due = active.filter((x) => x.dueDate && x.dueDate <= today),
    projects = r.filter((x) => x.kind === 'project'),
    bills = data.finance?.bills.filter((b) => b.status === 'approved') || [];
  const receivable = bills
    .filter((b) => b.kind === 'receivable')
    .reduce((s, b) => s + b.amountCents - b.paidCents, 0);
  return (
    <>
      <section className="pf-hero">
        <div>
          <span className="pf-eyebrow">ENTERPRISE OPERATING SYSTEM</span>
          <h1>
            把每一笔业务，
            <br />
            推进到有结果。
          </h1>
          <p>客户、项目、伙伴和资金，在同一份业务记录中协同。</p>
          <AppButton
            className="primary-button"
            onClick={() => onNavigate('opportunity')}
          >
            开始跟进商机 <ArrowRight size={16} />
          </AppButton>
        </div>
        <div className="pf-hero-flow">
          {['需求确认', '方案报价', '项目交付', '验收回款', '经验回流'].map(
            (s, i) => (
              <AppButton
                key={s}
                onClick={() =>
                  onNavigate(
                    [
                      'requirement',
                      'quotation',
                      'project',
                      'acceptance',
                      'retrospective',
                    ][i],
                  )
                }
              >
                <b>0{i + 1}</b>
                <span>{s}</span>
                <ArrowRight size={16} />
              </AppButton>
            ),
          )}
        </div>
      </section>
      <div className="pf-metrics">
        {[
          {
            label: '有效商机',
            value: r.filter(
              (x) =>
                x.kind === 'opportunity' &&
                ['已验证', '方案沟通'].includes(x.status),
            ).length,
            icon: TrendingUp,
            target: 'opportunity',
          },
          {
            label: '正在交付',
            value: projects.filter((x) =>
              ['待启动', '执行中', '待验收'].includes(x.status),
            ).length,
            icon: BriefcaseBusiness,
            target: 'project',
          },
          {
            label: '今日与逾期待办',
            value: due.length,
            icon: Clock,
            target: 'todo',
          },
          {
            label: '待收款金额',
            value: cash(receivable),
            icon: Wallet,
            target: 'finance',
          },
        ].map((m) => (
          <AppButton key={m.label} onClick={() => onNavigate(m.target)}>
            <span>
              {m.label}
              <m.icon size={19} />
            </span>
            <strong>{m.value}</strong>
            <small>来自当前企业业务记录</small>
          </AppButton>
        ))}
      </div>
      <div className="pf-dashboard-grid">
        <section className="pf-panel">
          <div className="pf-section-title">
            <h2>优先处理</h2>
            <AppButton onClick={() => onNavigate('todo')}>
              全部待办 <ArrowRight size={14} />
            </AppButton>
          </div>
          {due.slice(0, 8).map((x) => (
            <AppButton
              className="pf-list-row"
              key={x.id}
              onClick={() => onOpen(x)}
            >
              <span className="pf-dot" />
              <div>
                <strong>{x.title}</strong>
                <small>
                  {x.owner} · {x.dueDate}
                </small>
              </div>
              <span className="pf-status">{x.status}</span>
            </AppButton>
          ))}
          {!due.length && (
            <div className="pf-empty">
              当前没有到期事项。新建任务后会自动出现在这里。
            </div>
          )}
        </section>
        <section className="pf-panel">
          <div className="pf-section-title">
            <h2>交付进度</h2>
            <FileCheck2 size={18} />
          </div>
          {projects.slice(0, 5).map((p) => {
            const ts = r.filter(
                (x) => x.kind === 'task' && x.data.projectId === p.id,
              ),
              n = ts.filter((x) => x.status === '已完成').length;
            return (
              <AppButton
                className="pf-project-progress"
                key={p.id}
                onClick={() => onOpen(p)}
              >
                <div>
                  <strong>{p.title}</strong>
                  <span>{p.status}</span>
                </div>
                <p>
                  {p.owner} · {n}/{ts.length} 个任务完成
                </p>
                <progress max={Math.max(ts.length, 1)} value={n} />
              </AppButton>
            );
          })}
          {!projects.length && (
            <div className="pf-empty">确认报价后，一键创建交付项目。</div>
          )}
        </section>
      </div>
      <section className="pf-panel pf-quick-start">
        <h2>从一个真实场景开始</h2>
        <div>
          {[
            {
              title: '建立企业档案',
              body: '把能力、案例和需求讲清楚',
              target: 'enterprise',
            },
            {
              title: '配置 AI 岗位',
              body: '职责、知识、工具和交付标准',
              target: 'aiRole',
            },
            {
              title: '沉淀业务知识',
              body: '资料有来源，结论有审核',
              target: 'knowledge',
            },
            {
              title: '连接合作伙伴',
              body: '从授权供需中寻找机会',
              target: 'network',
            },
          ].map((x) => (
            <AppButton key={x.target} onClick={() => onNavigate(x.target)}>
              <strong>
                {x.title}
                <ArrowRight size={16} />
              </strong>
              <small>{x.body}</small>
            </AppButton>
          ))}
        </div>
      </section>
    </>
  );
}
export function CashForecast({ data }: { data: PlatformData }) {
  const [scenario, setScenario] = useState('full'),
    f = data.finance;
  if (!f)
    return <div className="pf-empty">现金预测需要企业管理员或经理权限。</div>;
  const balance =
      f.accounts.reduce((s, a) => s + a.openingCents, 0) +
      f.entries
        .filter((e) => e.accountId)
        .reduce(
          (s, e) =>
            s + (e.direction === 'income' ? e.amountCents : -e.amountCents),
          0,
        ),
    today = localToday();
  let running = balance;
  const rows = Array.from({ length: 4 }, (_, i) => {
    const start = new Date(`${today}T00:00:00+08:00`);
    start.setUTCDate(start.getUTCDate() + i * 7);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    const begin = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Shanghai',
      }).format(start),
      finish = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Shanghai',
      }).format(end);
    const bills = f.bills.filter(
      (b) =>
        b.status === 'approved' &&
        b.amountCents > b.paidCents &&
        b.dueDate <= finish &&
        (i === 0 || b.dueDate >= begin),
    );
    const incoming = bills
        .filter((b) => b.kind === 'receivable')
        .reduce((s, b) => s + b.amountCents - b.paidCents, 0),
      out = bills
        .filter((b) => b.kind !== 'receivable')
        .reduce((s, b) => s + b.amountCents - b.paidCents, 0);
    running += Math.round(incoming * (scenario === 'full' ? 1 : 0.5)) - out;
    return { begin, finish, incoming, out, balance: running };
  });
  return (
    <>
      <div className="pf-page-title">
        <div>
          <span className="pf-eyebrow">CASH PLANNING</span>
          <h1>未来四周现金安排</h1>
          <p>期初现金来自资金账户；预计收付来自已审核应收应付。</p>
        </div>
        <AppSelect
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          aria-label="预测情景"
        >
          <option value="full">按约定全额收回</option>
          <option value="half">压力情景：仅收回 50%</option>
        </AppSelect>
      </div>
      <div className="pf-metrics">
        <section>
          <span>当前已记录账户余额</span>
          <strong>{cash(balance)}</strong>
          <small>含账户期初余额与已确认账户流水</small>
        </section>
        <section>
          <span>未来最低预计余额</span>
          <strong
            className={
              Math.min(...rows.map((r) => r.balance)) < 0 ? 'pf-danger' : ''
            }
          >
            {cash(Math.min(...rows.map((r) => r.balance)))}
          </strong>
          <small>预计回款不等于当前可用现金</small>
        </section>
      </div>
      <section className="pf-panel pf-table-wrap">
        <table>
          <thead>
            <tr>
              <th>预测周期</th>
              <th>约定应收</th>
              <th>约定应付</th>
              <th>期末预计余额</th>
              <th>提示</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.begin}>
                <td>
                  {r.begin} — {r.finish}
                </td>
                <td>{cash(r.incoming)}</td>
                <td>{cash(r.out)}</td>
                <td>{cash(r.balance)}</td>
                <td className={r.balance < 0 ? 'pf-danger' : ''}>
                  {r.balance < 0 ? '预计资金缺口' : '按所选情景测算'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
export function BusinessAnalytics({
  companyId,
  data,
  onOpen,
}: {
  companyId: string;
  data: PlatformData;
  onOpen: (r: BusinessRecord) => void;
}) {
  const [query, setQuery] = useState(''),
    [report, setReport] = useState(''),
    [busy, setBusy] = useState(false),
    [question, setQuestion] = useState('项目利润'),
    r = data.records,
    projects = r.filter((x) => x.kind === 'project'),
    questions = ['项目利润', '商机推进', '交付效率', '知识复用', '价值验证'];
  return (
    <>
      <div className="pf-page-title">
        <div>
          <span className="pf-eyebrow">BUSINESS INTELLIGENCE</span>
          <h1>经营分析</h1>
          <p>按明确口径查询业务数据。实际、估算与未知分别展示。</p>
        </div>
      </div>
      <form
        className="pf-network-search"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const d = await callApi('/api/platform/analyze', {
              companyId,
              question: query,
            });
            setReport(
              d.mode +
                '\n' +
                d.answer +
                '\n\n依据记录：' +
                d.sources.join('、'),
            );
          } catch (err) {
            setReport((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <input
          required
          maxLength={500}
          aria-label="询问经营数据"
          placeholder="询问：当前应收余额多少？哪些项目还在交付？"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <AppButton className="primary-button" disabled={busy}>
          查询实际数据
        </AppButton>
      </form>
      {report && (
        <section className="pf-panel">
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
              fontFamily: 'inherit',
              fontSize: 12,
            }}
          >
            {report}
          </pre>
        </section>
      )}
      <div className="pf-tabs">
        {questions.map((q) => (
          <AppButton
            className={question === q ? 'active' : ''}
            key={q}
            onClick={() => setQuestion(q)}
          >
            {q}
          </AppButton>
        ))}
      </div>
      {question === '项目利润' ? (
        <section className="pf-panel pf-table-wrap">
          <table>
            <thead>
              <tr>
                {[
                  '项目',
                  '合同及确认增项',
                  '已记录实际成本',
                  '估算成本',
                  '未知成本项',
                  '按已记录实际成本的毛差',
                ].map((s) => (
                  <th key={s}>{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const costs = r.filter(
                    (c) =>
                      c.kind === 'cost' &&
                      c.data.projectId === p.id &&
                      c.status === '已确认',
                  ),
                  actual = costs
                    .filter((c) => c.data.basis === '实际')
                    .reduce(
                      (s, c) =>
                        s + Math.round(Number(c.data.amount || 0) * 100),
                      0,
                    ),
                  estimated = costs
                    .filter((c) => c.data.basis === '估算')
                    .reduce(
                      (s, c) =>
                        s + Math.round(Number(c.data.amount || 0) * 100),
                      0,
                    ),
                  unknown = costs.filter((c) => c.data.basis === '未知').length,
                  contract =
                    Math.round(Number(p.data.amount) * 100) +
                    r
                      .filter(
                        (c) =>
                          c.kind === 'change' &&
                          c.data.projectId === p.id &&
                          c.status === '已确认',
                      )
                      .reduce(
                        (s, c) => s + Math.round(Number(c.data.amount) * 100),
                        0,
                      );
                return (
                  <tr key={p.id}>
                    <td>
                      <AppButton onClick={() => onOpen(p)}>{p.title}</AppButton>
                    </td>
                    <td>{cash(contract)}</td>
                    <td>{cash(actual)}</td>
                    <td>{cash(estimated)}</td>
                    <td>{unknown} 项</td>
                    <td>
                      {cash(contract - actual)}
                      <small>未扣估算、未知成本及未归集费用</small>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!projects.length && <div className="pf-empty">尚无项目数据</div>}
        </section>
      ) : question === '商机推进' ? (
        <section className="pf-panel">
          <h2>商机阶段分布</h2>
          <div className="pf-metrics">
            {['新线索', '已验证', '方案沟通', '已成交', '未成交'].map((s) => (
              <section key={s}>
                <span>{s}</span>
                <strong>
                  {
                    r.filter((x) => x.kind === 'opportunity' && x.status === s)
                      .length
                  }
                </strong>
              </section>
            ))}
          </div>
          <p className="pf-muted">
            有效商机以人工核实需求、预算、决策联系人与时间为准；阶段推进历史可在记录中追溯。
          </p>
        </section>
      ) : question === '知识复用' ? (
        <section className="pf-panel">
          <h2>知识引用与模型使用</h2>
          <div className="pf-metrics">
            <section>
              <span>已确认知识</span>
              <strong>
                {
                  r.filter(
                    (x) => x.kind === 'knowledge' && x.status === '已确认',
                  ).length
                }
              </strong>
            </section>
            <section>
              <span>步骤知识引用次数</span>
              <strong>
                {data.steps.reduce((s, x) => {
                  try {
                    return s + JSON.parse(x.sources).length;
                  } catch {
                    return s;
                  }
                }, 0)}
              </strong>
            </section>
            <section>
              <span>模型输入 / 输出 token</span>
              <strong>
                {data.steps.reduce((s, x) => s + x.inputTokens, 0)} /{' '}
                {data.steps.reduce((s, x) => s + x.outputTokens, 0)}
              </strong>
              <small>成本须结合账户实际单价核对</small>
            </section>
          </div>
        </section>
      ) : question === '价值验证' ? (
        <section className="pf-panel pf-table-wrap">
          <table>
            <thead>
              <tr>
                <th>验证事项</th>
                <th>指标</th>
                <th>基线</th>
                <th>实际</th>
                <th>差额</th>
                <th>证据</th>
              </tr>
            </thead>
            <tbody>
              {r
                .filter((x) => x.kind === 'validation' && x.status === '已确认')
                .map((x) => (
                  <tr key={x.id}>
                    <td>
                      <AppButton onClick={() => onOpen(x)}>{x.title}</AppButton>
                    </td>
                    <td>{x.data.metric}</td>
                    <td>
                      {x.data.baseline} {x.data.unit}
                    </td>
                    <td>
                      {x.data.actual} {x.data.unit}
                    </td>
                    <td>
                      {Number(x.data.baseline) - Number(x.data.actual)}{' '}
                      {x.data.unit}
                    </td>
                    <td>{x.data.evidence}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      ) : (
        <section className="pf-panel">
          <h2>任务交付</h2>
          <div className="pf-metrics">
            {['待处理', '处理中', '待确认', '已完成'].map((s) => (
              <section key={s}>
                <span>{s}</span>
                <strong>
                  {r.filter((x) => x.kind === 'task' && x.status === s).length}
                </strong>
              </section>
            ))}
          </div>
          <p className="pf-muted">
            按期交付数：
            {
              r.filter(
                (x) =>
                  x.kind === 'delivery' &&
                  x.status === '已确认' &&
                  x.dueDate &&
                  x.updatedAt.slice(0, 10) <= x.dueDate,
              ).length
            }
            。验收、沟通工时及变更以实际记录为依据。
          </p>
        </section>
      )}
    </>
  );
}
