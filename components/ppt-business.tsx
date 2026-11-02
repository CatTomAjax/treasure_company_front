'use client';
import { AppButton, AppSelect } from '@/components/ui/app-controls';
import { useEffect, useState, useRef } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { localPptDate, type PptItem } from '@/lib/ppt-model';
import { cashProjection, workspaceStats } from '@/lib/ppt-metrics';
import OrderDetail from './ppt-order-detail';
import ParkOverview from './park-overview';
import { saveBlob } from '@/lib/platform-client';
import { uploadPptFile } from '@/lib/ppt-client';
import {
  usePpt,
  asset,
  I,
  Tag,
  Button,
  Tabs,
  Panel,
  Heading,
  Progress,
  FileIcon,
  Metric,
  DataTable,
  Assistant,
  MiniCard,
  Steps,
  exportText,
} from './ppt-console';
import { quietly } from './ppt-knowledge';
const money = (value: unknown) =>
  `¥${Number(value || 0).toLocaleString('zh-CN')}`;
const trend = [
  ['00:00', 120, 80],
  ['03:00', 150, 110],
  ['06:00', 280, 150],
  ['09:00', 360, 220],
  ['12:00', 330, 180],
  ['15:00', 410, 260],
  ['18:00', 370, 230],
  ['21:00', 210, 140],
  ['24:00', 120, 80],
].map(([name, a, b]) => ({ name, a, b }));
function Chart({
  bar = false,
  dual = false,
  height = 260,
  data = trend,
}: {
  bar?: boolean;
  dual?: boolean;
  height?: number;
  data?: { name: string | number; a: string | number; b?: string | number }[];
}) {
  return (
    <div className="pp-chart" style={{ height, minWidth: 0 }}>
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        initialDimension={{ width: 700, height }}
      >
        {bar ? (
          <BarChart
            data={data}
            margin={{ top: 20, right: 15, left: 0, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke="#1a3447" />
            <XAxis
              dataKey="name"
              stroke="#7e9daf"
              tickLine={false}
              axisLine={false}
              fontSize={10}
            />
            <YAxis
              stroke="#7e9daf"
              fontSize={10}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: '#0b2536',
                border: '1px solid #24516d',
                color: '#fff',
              }}
            />
            <Bar
              isAnimationActive={false}
              dataKey="a"
              name="内容数量"
              fill="#4dc6c8"
              radius={[3, 3, 0, 0]}
              maxBarSize={36}
            />
          </BarChart>
        ) : (
          <AreaChart
            data={data}
            margin={{ top: 15, right: 18, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="pp-chart-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#258fe7" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#258fe7" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#163142" />
            <XAxis
              dataKey="name"
              stroke="#7e9daf"
              tickLine={false}
              axisLine={false}
              fontSize={10}
            />
            <YAxis
              stroke="#7e9daf"
              fontSize={10}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: '#0b2536',
                border: '1px solid #24516d',
                color: '#fff',
              }}
            />
            <Area
              isAnimationActive={false}
              type="monotone"
              dataKey="a"
              name="本期"
              stroke="#339fee"
              fill="url(#pp-chart-fill)"
              strokeWidth={2}
            />
            {dual && (
              <Area
                isAnimationActive={false}
                type="monotone"
                dataKey="b"
                name="对比"
                stroke="#2bddc1"
                fill="transparent"
                strokeWidth={2}
              />
            )}
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
function Donut({
  value = 86,
  colors = ['#20d8df', '#123950'],
  label = '空间出租率',
}: {
  value?: number;
  colors?: string[];
  label?: string;
}) {
  return (
    <div className="pp-donut">
      <ResponsiveContainer
        width="100%"
        height={170}
        minWidth={0}
        initialDimension={{ width: 190, height: 170 }}
      >
        <PieChart>
          <Pie
            isAnimationActive={false}
            data={[{ value }, { value: 100 - value }]}
            dataKey="value"
            innerRadius={58}
            outerRadius={70}
            startAngle={90}
            endAngle={-270}
            stroke="none"
          >
            <Cell fill={colors[0]} />
            <Cell fill={colors[1]} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div>
        <strong>{value}%</strong>
        <small>{label}</small>
      </div>
    </div>
  );
}
function csv(title: string, rows: (string | number)[][]) {
  const text =
    '\ufeff' +
    rows
      .map((row) =>
        row.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(','),
      )
      .join('\r\n');
  saveBlob(
    title + '.csv',
    new Blob([text], { type: 'text/csv;charset=utf-8' }),
  );
}
function RecordAction({
  collection,
  item,
  fields,
}: {
  collection: string;
  item: PptItem;
  fields?: string[];
}) {
  const { edit } = usePpt();
  return (
    <Button onClick={() => edit(collection, item, fields)}>查看详情 ›</Button>
  );
}

function Overview() {
  return <ParkOverview />;
}

function CRM() {
  const { state, edit, save, act, nav } = usePpt(),
    [tab, setTab] = useState('客户机会'),
    [owner, setOwner] = useState('全部负责人'),
    [search, setSearch] = useState(''),
    [selected, setSelected] = useState(state.collections.customers[3].id);
  const all = state.collections.customers,
    customers = all.filter(
      (c) =>
        (owner === '全部负责人' || c.owner === owner) &&
        c.title.includes(search),
    ),
    customer = all.find((c) => c.id === selected) || all[0],
    stages = ['待跟进', '沟通中', '方案报价', '商务洽谈'];
  return (
    <>
      <Heading
        title="客户经营"
        sub="把每一次沟通，推进为明确需求、可执行方案与长期合作"
      >
        <Button
          primary
          icon="Plus"
          onClick={() =>
            edit('customers', {
              id: '',
              title: '',
              contact: '',
              owner: '张三',
              amount: '0',
              industry: '科技服务',
              status: '待跟进',
              next: '确认客户需求',
              date: '2026-10-28',
              content: '',
            })
          }
        >
          新增客户机会
        </Button>
      </Heading>
      <div className="pp-with-assistant">
        <div>
          <Tabs
            items={['客户机会', '客户列表', '跟进记录', '客户画像', '经营分析']}
            value={tab}
            onChange={setTab}
          />
          <div className="pp-toolbar">
            <div className="pp-inline">
              <AppSelect
                aria-label="客户负责人"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
              >
                {['全部负责人', ...new Set(all.map((c) => c.owner))].map(
                  (o) => (
                    <option key={o}>{o}</option>
                  ),
                )}
              </AppSelect>
              <input
                aria-label="搜索客户"
                placeholder="搜索客户名称…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <small>共 {customers.length} 个机会</small>
          </div>
          {tab === '客户机会' ? (
            <div className="pp-kanban">
              {stages.map((s, i) => (
                <div
                  className={`pp-kanban-column tone-${i}`}
                  key={s}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const c = all.find(
                      (c) => c.id === e.dataTransfer.getData('text/plain'),
                    );
                    if (c) quietly(save('customers', { ...c, status: s }));
                  }}
                >
                  <header>
                    <b>{s}</b>
                    <small>
                      {customers.filter((c) => c.status === s).length} 个
                    </small>
                  </header>
                  <div className="pp-column-total">
                    {money(
                      customers
                        .filter((c) => c.status === s)
                        .reduce((n, c) => n + Number(c.amount), 0),
                    )}
                  </div>
                  {customers
                    .filter((c) => c.status === s)
                    .map((c) => (
                      <AppButton
                        draggable
                        onDragStart={(e) =>
                          e.dataTransfer.setData('text/plain', c.id)
                        }
                        className={`pp-customer-card ${customer.id === c.id ? 'selected' : ''}`}
                        key={c.id}
                        onClick={() => setSelected(c.id)}
                        onDoubleClick={() => edit('customers', c)}
                      >
                        <div>
                          <span className="pp-company-icon">
                            <I name="Building2" size={18} />
                          </span>
                          <b>{c.title}</b>
                        </div>
                        <p>
                          {c.contact}　·　{c.industry}
                        </p>
                        <span className="pp-customer-price">
                          {money(c.amount)}
                        </span>
                        <footer>
                          <span>
                            <I name="User" size={12} />
                            {c.owner}
                          </span>
                          <small>{c.date}</small>
                        </footer>
                      </AppButton>
                    ))}
                </div>
              ))}
            </div>
          ) : tab === '客户列表' ? (
            <DataTable
              headers={['客户', '联系人', '金额', '负责人', '阶段', '操作']}
              rows={customers.map((c) => [
                c.title,
                c.contact,
                money(c.amount),
                c.owner,
                <Tag key={c.id}>{c.status}</Tag>,
                <RecordAction key={c.id} collection="customers" item={c} />,
              ])}
            />
          ) : tab === '跟进记录' ? (
            <Panel title="下一步跟进">
              {customers.map((c) => (
                <MiniCard
                  key={c.id}
                  title={c.title}
                  content={`${c.next} · ${c.owner} · ${c.date}`}
                  onClick={() =>
                    edit('customers', c, [
                      'title',
                      'next',
                      'owner',
                      'date',
                      'status',
                    ])
                  }
                />
              ))}
            </Panel>
          ) : tab === '客户画像' ? (
            <Panel title={customer.title}>
              <div className="pp-profile-metrics">
                <Metric title="预计合作金额" value={money(customer.amount)} />
                <Metric
                  title="所属行业"
                  value={customer.industry}
                  icon="Building2"
                />
              </div>
              <h3>企业需求</h3>
              <p>{customer.content}</p>
              <Button onClick={() => edit('customers', customer)}>
                完善客户画像
              </Button>
            </Panel>
          ) : (
            <>
              <div className="pp-metrics">
                <Metric
                  title="机会总额"
                  value={money(all.reduce((n, c) => n + Number(c.amount), 0))}
                />
                <Metric title="进行中的商机" value={all.length} />
              </div>
              <Chart
                bar
                data={stages.map((s) => ({
                  name: s,
                  a: all.filter((c) => c.status === s).length,
                }))}
              />
            </>
          )}
          <div className="pp-crm-bottom">
            <Panel title="方案预览">
              <img src={asset('crm-building.jpg')} alt="企业服务方案" />
              <div>
                <h3>面向创新企业的一站式服务方案</h3>
                <p>
                  空间、企业服务与项目协同，为客户提供清晰、可落地的服务组合。
                </p>
                <Button primary onClick={() => nav('documents')}>
                  查看方案
                </Button>
              </div>
            </Panel>
            <Panel title="跟进日程">
              {customers.slice(0, 3).map((c) => (
                <div className="pp-schedule" key={c.id}>
                  <i />
                  <span>
                    {c.date}
                    <b>{c.title}</b>
                  </span>
                  <Button
                    onClick={() =>
                      edit('customers', c, ['next', 'date', 'owner'])
                    }
                  >
                    安排
                  </Button>
                </div>
              ))}
            </Panel>
          </div>
        </div>
        <Assistant title="AI销售顾问">
          <h3>客户摘要</h3>
          <MiniCard title={customer.title} content={customer.content} />
          <ul className="pp-bullet-list">
            <li>需求方向：{customer.industry}</li>
            <li>预计金额：{money(customer.amount)}</li>
            <li>负责人：{customer.owner}</li>
            <li>下一步：{customer.next}</li>
          </ul>
          <h4>推荐方案</h4>
          <img
            className="pp-assistant-cover"
            src={asset('crm-building.jpg')}
            alt="推荐服务方案"
          />
          <p>以客户真实需求为起点，结合企业能力与已批准报价规则。</p>
          <Button onClick={() => nav('requirements')}>整理需求与报价</Button>
          <h4>下一步跟进</h4>
          <div className="pp-info-box">
            核实预算与决策流程，安排需求确认会议，记录客户认可的交付范围。
          </div>
          <Button
            primary
            onClick={() =>
              edit('customers', customer, ['next', 'date', 'owner', 'status'])
            }
          >
            创建跟进计划
          </Button>
        </Assistant>
      </div>
    </>
  );
}

function Project({ brand = false }: { brand?: boolean }) {
  const { state, edit, save, act, nav } = usePpt(),
    [tab, setTab] = useState('看板'),
    project =
      state.collections.projects.find(
        (p) => p.id === state.settings.activeProject,
      ) || state.collections.projects[0],
    tasks = state.collections.tasks.filter((t) => t.project === project.id),
    stages = ['待开始', '进行中', '待验收', '已完成'];
  return (
    <>
      <div
        className="pp-project-hero"
        style={{
          backgroundImage: `linear-gradient(90deg,#061b2a 0%,#061b2ad9 37%,#061b2a11 75%),url(${asset('project-hero.jpg')})`,
        }}
      >
        <small>项目管理　›　{brand ? '品牌设计服务项目' : project.title}</small>
        <AppSelect
          className="pp-project-picker"
          aria-label="选择项目"
          value={project.id}
          onChange={(e) =>
            quietly(
              act('settings.save', {
                settings: { activeProject: e.target.value },
              }),
            )
          }
        >
          {state.collections.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </AppSelect>
        <h1>
          {brand ? '品牌设计服务项目' : project.title}{' '}
          <Tag>{project.status}</Tag>
        </h1>
        <p>
          {brand
            ? '确认范围、控制变更、交付验收，及时跟进回款。'
            : project.content}
        </p>
        <div>
          <span>
            <I name="Building2" size={16} /> 创客产业园
          </span>
          <span>
            <I name="Folder" size={16} /> {brand ? '品牌设计' : '品牌宣传'}
          </span>
          <span>
            <I name="CalendarDays" size={16} /> {project.start} 至{' '}
            {project.date}
          </span>
          <span className="pp-members">
            {[
              'avatar-analyst.jpg',
              'avatar-reviewer.jpg',
              'avatar-librarian.jpg',
            ].map((m) => (
              <img key={m} src={asset(m)} alt="项目成员" />
            ))}
            +3
          </span>
        </div>
      </div>
      <div className="pp-with-assistant">
        <div>
          <Tabs
            items={['看板', '甘特', '文件', '复盘']}
            value={tab}
            onChange={setTab}
          />
          {brand && (
            <div className="pp-brand-project-steps">
              <Steps
                labels={[
                  '范围确认',
                  '设计执行',
                  '变更核对',
                  '客户验收',
                  '开票回款',
                  '复盘归档',
                ]}
                current={2}
              />
            </div>
          )}
          {tab === '看板' ? (
            <div className="pp-kanban pp-project-kanban">
              {stages.map((s, i) => (
                <div
                  className={`pp-kanban-column tone-${i}`}
                  key={s}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const task = tasks.find(
                      (t) => t.id === e.dataTransfer.getData('text/plain'),
                    );
                    if (task)
                      quietly(
                        save('tasks', {
                          ...task,
                          status: s,
                          progress: s === '已完成' ? '100' : task.progress,
                        }),
                      );
                  }}
                >
                  <header>
                    <b>
                      <i />{' '}
                      {brand
                        ? ['范围已确认', '变更待确认', '待验收', '回款跟进'][i]
                        : s}
                    </b>
                    <Tag tone="slate">
                      {tasks.filter((t) => t.status === s).length}
                    </Tag>
                  </header>
                  <Button
                    icon="Plus"
                    onClick={() =>
                      edit('tasks', {
                        id: '',
                        title: '',
                        status: s,
                        owner: '张三',
                        date: '2026-11-10',
                        content: '',
                        progress: '0',
                        priority: '中',
                        project: project.id,
                      })
                    }
                  >
                    新建任务
                  </Button>
                  {tasks
                    .filter((t) => t.status === s)
                    .map((t, j) => (
                      <article
                        draggable
                        onDragStart={(e) =>
                          e.dataTransfer.setData('text/plain', t.id)
                        }
                        className="pp-task-card"
                        key={t.id}
                      >
                        <AppButton
                          className="pp-task-title"
                          onClick={() => edit('tasks', t)}
                        >
                          <I
                            name={
                              ['FileText', 'Camera', 'Scissors', 'FileCheck2'][
                                i
                              ]
                            }
                            size={22}
                          />
                          <b>
                            {brand && i === 1 && j === 0
                              ? '新增活动海报'
                              : t.title}
                          </b>
                          <Tag tone={t.priority === '高' ? 'red' : 'gold'}>
                            {t.priority}
                          </Tag>
                        </AppButton>
                        <p>{t.content}</p>
                        <div className="pp-task-owner">
                          <span>
                            <img
                              src={asset(
                                ['avatar-analyst.jpg', 'avatar-reviewer.jpg'][
                                  j % 2
                                ],
                              )}
                              alt="负责人"
                            />
                            {t.owner}
                          </span>
                          <small>
                            <I name="CalendarDays" size={13} />
                            {t.date?.slice(5)}
                          </small>
                        </div>
                        {Number(t.progress) > 0 && (
                          <>
                            <Progress value={Number(t.progress)} />
                            <small className="pp-task-percent">
                              {t.progress}%
                            </small>
                          </>
                        )}
                        <div className="pp-task-checks">
                          {(t.checks || '确认任务需求,完成并归档')
                            .split(',')
                            .map((c, k) => (
                              <label key={k}>
                                <input
                                  type="checkbox"
                                  checked={
                                    t[`check${k}`] === '1' ||
                                    i === 3 ||
                                    (i > 0 && k < 2 && t[`check${k}`] !== '0')
                                  }
                                  onChange={(e) =>
                                    quietly(
                                      save('tasks', {
                                        ...t,
                                        [`check${k}`]: e.target.checked
                                          ? '1'
                                          : '0',
                                      }),
                                    )
                                  }
                                />
                                {c}
                              </label>
                            ))}
                        </div>
                      </article>
                    ))}
                </div>
              ))}
            </div>
          ) : tab === '甘特' ? (
            <Panel title="项目排期">
              <div className="pp-gantt">
                <header>
                  <span>任务 / 负责人</span>
                  {[
                    '11-01',
                    '11-08',
                    '11-15',
                    '11-22',
                    '11-29',
                    '12-06',
                    '12-13',
                    '12-20',
                  ].map((d) => (
                    <b key={d}>{d}</b>
                  ))}
                </header>
                {tasks.map((t, i) => (
                  <AppButton key={t.id} onClick={() => edit('tasks', t)}>
                    <span>
                      {t.title}
                      <small>{t.owner}</small>
                    </span>
                    <div>
                      <i
                        style={{
                          left: `${i * 9}%`,
                          width: `${20 + (i % 3) * 8}%`,
                          background: ['#289bfa', '#21ceb9', '#8e69ed'][i % 3],
                        }}
                      >
                        {t.title}
                      </i>
                    </div>
                  </AppButton>
                ))}
              </div>
            </Panel>
          ) : tab === '文件' ? (
            <Panel
              title="项目文档与版本"
              action={
                <Button onClick={() => nav('documents')}>新建文档</Button>
              }
            >
              <DataTable
                headers={['文件名称', '版本', '更新人', '客户确认', '操作']}
                rows={[
                  ['需求确认单', 'v1.2', '李思远', '已确认'],
                  ['品牌方案与报价', 'v1.2', '陈艾琳', '待确认'],
                  ['设计稿与交付文件', 'v2.0', '张子墨', '待验收'],
                  ['项目验收单', 'v1.0', '林悦', '待签署'],
                ].map((r) => [
                  ...r,
                  <Button key={r[0]} onClick={() => nav('documents')}>
                    打开文档
                  </Button>,
                ])}
              />
            </Panel>
          ) : (
            <Panel title="项目复盘与知识沉淀">
              <h3>做得好的事、待改进的问题与可复用的方法</h3>
              <textarea
                className="pp-full-textarea"
                rows={10}
                defaultValue={project.retrospective || ''}
                placeholder="记录本次项目的关键经验…"
                onBlur={(e) =>
                  quietly(
                    save('projects', {
                      ...project,
                      retrospective: e.target.value,
                    }),
                  )
                }
              />
              <Button
                primary
                onClick={() =>
                  quietly(
                    save('knowledge', {
                      id: '',
                      title: `${project.title}复盘`,
                      status: '草稿',
                      category: '岗位经验',
                      roles: '项目经理',
                      content: project.retrospective || '项目复盘待补充',
                      sources: 'src-3',
                    }).then(() => nav('knowledge')),
                  )
                }
              >
                沉淀至企业知识库
              </Button>
            </Panel>
          )}
          <Panel title="项目里程碑">
            <Steps
              labels={[
                '项目启动',
                '脚本确认',
                '素材拍摄',
                '初剪交付',
                '客户评审',
                '成片输出',
                '项目复盘',
              ]}
              current={3}
              onClick={(i) =>
                edit('projects', project, ['title', 'date', 'progress'])
              }
            />
          </Panel>
        </div>
        <Assistant title="AI 项目经理">
          <small>智能跟进项目进度，主动识别风险与待办。</small>
          {brand ? (
            <>
              <h4>变更待确认</h4>
              <div className="pp-warning">
                <b>新增活动海报</b>
                <p>
                  新增物料影响费用、工期与交付范围，请在执行前取得书面确认。
                </p>
                <Button
                  onClick={() =>
                    edit('requirements', state.collections.requirements[0], [
                      'title',
                      'scope',
                      'excluded',
                      'amount',
                      'date',
                    ])
                  }
                >
                  核对变更范围
                </Button>
              </div>
              <h4>合同信息</h4>
              <MiniCard
                title="品牌设计服务合同"
                content="合同金额 ¥50,000 · 验收后开票回款"
                onClick={() => nav('requirements')}
              />
            </>
          ) : (
            <>
              <h4>
                待确认事项{' '}
                <Tag tone="slate">
                  {Math.min(
                    3,
                    tasks.filter((t) => t.status !== '已完成').length,
                  )}
                </Tag>
              </h4>
              {tasks
                .filter((t) => t.status !== '已完成')
                .slice(0, 3)
                .map((task) => (
                  <MiniCard
                    key={task.id}
                    title={task.title}
                    content={`负责人：${task.owner || project.owner}　截止：${task.date?.slice(5) || project.date}`}
                    action={
                      <Button onClick={() => edit('tasks', task)}>
                        去确认
                      </Button>
                    }
                  />
                ))}
              <h4>进度提醒</h4>
              <MiniCard
                icon="Clock3"
                title="素材拍摄　进度60%"
                content="较计划延后1天，建议尽快完成剩余素材整理。"
              />
              <MiniCard
                icon="AudioLines"
                title="配音合成　进度70%"
                content="请按计划完成合成与校对。"
              />
            </>
          )}
          <h4>验收标准</h4>
          <ul className="pp-bullet-list">
            <li>时长：3–5分钟</li>
            <li>画质：4K，横版16:9</li>
            <li>内容：突出园区定位、产业生态与企业案例</li>
            <li>格式：MP4（H.264），含中文字幕</li>
            <li>需客户书面确认验收通过</li>
          </ul>
          <Button onClick={() => nav('receivables')}>查看验收与回款条件</Button>
        </Assistant>
      </div>
    </>
  );
}

function Finance() {
  const { state, edit, save, act, nav } = usePpt(),
    [tab, setTab] = useState('应收应付'),
    [filter, setFilter] = useState('全部'),
    [search, setSearch] = useState('');
  const bills = state.collections.bills,
    filtered = bills.filter(
      (b) =>
        (filter === '全部' || b.type === filter) &&
        (tab === '应收应付' ||
          b.type === (tab === '报销管理' ? '支出' : '收入')) &&
        `${b.title} ${b.customer || ''}`.includes(search),
    );
  return (
    <>
      <Heading
        title="财务管理"
        sub="清晰记录收支与往来，让回款、支付和资金安排有据可查"
      />
      <div className="pp-with-assistant">
        <div>
          <Tabs
            items={['应收应付', '报销管理', '回款管理']}
            value={tab}
            onChange={setTab}
          />
          <div className="pp-metrics four">
            <Metric
              title="本月收入"
              value={money(
                bills
                  .filter((b) => b.type === '收入')
                  .reduce((n, b) => n + Number(b.amount), 0),
              )}
              icon="Wallet"
            />
            <Metric
              title="本月支出"
              value={money(
                bills
                  .filter((b) => b.type === '支出')
                  .reduce((n, b) => n + Number(b.amount), 0),
              )}
              color="purple"
              icon="Landmark"
            />
            <Metric
              title="待收款"
              value={money(
                bills
                  .filter((b) => b.status === '待收款')
                  .reduce((n, b) => n + Number(b.amount), 0),
              )}
              color="gold"
              icon="Receipt"
            />
            <Metric
              title="待处理事项"
              value={bills.filter((b) => b.status.startsWith('待')).length}
              color="orange"
              icon="Files"
            />
          </div>
          <Panel
            title={tab === '报销管理' ? '费用与报销台账' : '发票与收付款台账'}
            action={
              <Button
                primary
                icon="Plus"
                onClick={() =>
                  edit('bills', {
                    id: '',
                    title: '',
                    type: tab === '报销管理' ? '支出' : '收入',
                    amount: '0',
                    status: tab === '报销管理' ? '待付款' : '待收款',
                    customer: '',
                    date: localPptDate(),
                    invoice: '待开票',
                  })
                }
              >
                新增记录
              </Button>
            }
          >
            <div className="pp-toolbar">
              <input
                aria-label="搜索财务台账"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索名称、往来单位…"
              />
              <div className="pp-inline">
                <AppSelect
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  aria-label="收支筛选"
                >
                  {['全部', '收入', '支出'].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </AppSelect>
                <Button
                  icon="Download"
                  onClick={() =>
                    csv('财务台账', [
                      ['名称', '类型', '金额', '状态', '往来单位'],
                      ...filtered.map((b) => [
                        b.title,
                        b.type,
                        b.amount,
                        b.status,
                        b.customer,
                      ]),
                    ])
                  }
                >
                  导出
                </Button>
              </div>
            </div>
            <DataTable
              headers={[
                '名称 / 往来单位',
                '收支',
                '金额',
                '日期',
                '发票',
                '状态',
                '操作',
              ]}
              rows={filtered.map((b) => [
                <div key={b.id}>
                  <b>{b.title}</b>
                  <small>{b.customer}</small>
                </div>,
                <Tag key={b.id}>{b.type}</Tag>,
                money(b.amount),
                b.date,
                b.invoice,
                <Tag key={b.id}>{b.status}</Tag>,
                <Button key={b.id} onClick={() => edit('bills', b)}>
                  查看
                </Button>,
              ])}
            />
          </Panel>
          <div className="pp-finance-bottom">
            <Panel title="资金流动（近6个月）">
              <div className="pp-chart-legend">
                <i /> 收入 <i /> 支出
              </div>
              <Chart
                dual
                height={215}
                data={Array.from({ length: 6 }, (_, i) => ({
                  name: `${5 + i}月`,
                  a: [34, 47, 39, 52, 68, 61][i],
                  b: [23, 31, 28, 38, 45, 36][i],
                }))}
              />
            </Panel>
            <Panel title="账款状态">
              <Donut
                value={68}
                label="已确认"
                colors={['#29c9bf', '#9875ed']}
              />
              <div className="pp-chart-legend">已确认　待收款　待付款</div>
            </Panel>
          </div>
        </div>
        <Assistant title="AI财务助理">
          <div className="pp-info-box">
            你好，我可以协助整理财务资料、识别待确认事项，财务结果需负责人复核。
          </div>
          <h4>
            票据待补齐 <Tag tone="gold">2</Tag>
          </h4>
          <MiniCard
            title="采购服务发票"
            content="待补充供应商发票与服务验收附件"
            onClick={() => edit('bills', bills[3])}
          />
          <h4>
            回款待确认 <Tag>1</Tag>
          </h4>
          <MiniCard
            title="企业咨询服务尾款"
            content="请核实验收单与付款时间"
            onClick={() => nav('receivables')}
          />
          <h4>
            审批待处理 <Tag tone="red">3</Tag>
          </h4>
          {bills.slice(0, 3).map((b) => (
            <MiniCard
              key={b.id}
              title={b.title}
              content={`${money(b.amount)} · ${b.status}`}
              action={
                <Button
                  onClick={() =>
                    quietly(
                      save('bills', {
                        ...b,
                        status: b.type === '收入' ? '已收款' : '已付款',
                      }),
                    )
                  }
                >
                  确认
                </Button>
              }
            />
          ))}
          <Button onClick={() => nav('cash')}>查看未来现金安排</Button>
        </Assistant>
      </div>
    </>
  );
}

function Tax() {
  const { state, edit, save } = usePpt(),
    [selected, setSelected] = useState(15),
    [materialTab, setMaterialTab] = useState('发票台账'),
    [period, setPeriod] = useState(() => new Date());
  const month = period.getMonth() + 1,
    year = period.getFullYear();
  const days = new Date(year, month, 0).getDate(),
    offset = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const materials = state.collections.tax.filter(
    (t) =>
      materialTab === '发票台账' ||
      (t.direction ||
        (t.id === 'tax-1'
          ? '进项资料'
          : t.id === 'tax-2'
            ? '销项资料'
            : '')) === materialTab,
  );
  return (
    <>
      <Heading
        title="税务管理"
        sub="材料与事项有序推进，让每次申报准备更清晰"
      />
      <div className="pp-tax-grid">
        <Panel title="发票材料与台账">
          <Tabs
            items={['发票台账', '进项资料', '销项资料']}
            value={materialTab}
            onChange={setMaterialTab}
          />
          <Button
            icon="Plus"
            onClick={() =>
              edit('tax', {
                id: '',
                title: '',
                status: '待补充',
                direction:
                  materialTab === '发票台账' ? '进项资料' : materialTab,
                content: '',
                date: localPptDate(),
              })
            }
          >
            新增税务资料
          </Button>
          {!materials.length && (
            <p className="pp-muted">
              暂无{materialTab}，请新增资料并选择所属方向。
            </p>
          )}
          {materials.map((t, i) => (
            <div className={`pp-tax-material tone-${i}`} key={t.id}>
              <FileIcon type={i === 2 ? 'Excel' : 'Word'} />
              <div>
                <b>{t.title}</b>
                <p>{t.content}</p>
                <small>更新：{t.date}</small>
              </div>
              <Tag>{t.status}</Tag>
              <Button onClick={() => edit('tax', t)}>查看资料 ›</Button>
            </div>
          ))}
          <div className="pp-info-box">
            <I name="Info" />
            本页为申报准备与材料协同，真实税务申报通过配置的官方流程办理。
          </div>
        </Panel>
        <Panel
          title="税务日历"
          action={
            <div className="pp-inline">
              <Button
                icon="ChevronLeft"
                title="上个月"
                onClick={() => {
                  setPeriod(new Date(year, month - 2, 1));
                  setSelected(1);
                }}
              />
              <span>
                {year}年{month}月
              </span>
              <Button
                icon="ChevronRight"
                title="下个月"
                onClick={() => {
                  setPeriod(new Date(year, month, 1));
                  setSelected(1);
                }}
              />
            </div>
          }
        >
          <div className="pp-calendar">
            <header>
              {['一', '二', '三', '四', '五', '六', '日'].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </header>
            <div>
              {Array.from({ length: offset }, (_, i) => (
                <span key={`blank-${i}`} />
              ))}
              {Array.from({ length: days }, (_, i) => i + 1).map((d) => (
                <AppButton
                  className={`${selected === d ? 'selected' : ''} ${[8, 15, 28, 31].includes(d) ? 'event' : ''}`}
                  key={d}
                  onClick={() => setSelected(d)}
                >
                  {d}
                  {[8, 15, 28, 31].includes(d) && <i />}
                </AppButton>
              ))}
            </div>
          </div>
          <h4>本月重要事项</h4>
          {[
            ['08', '资料归集', '核对本月进销项资料'],
            ['15', '申报准备', '增值税与附加税材料核查'],
            ['28', '账税核对', '完成票据与账务交叉核对'],
            ['31', '月末归档', '归集申报回执与原始附件'],
          ]
            .filter(([d]) => Number(d) <= days)
            .map(([d, t, c]) => (
              <AppButton
                className="pp-calendar-event"
                key={d}
                onClick={() => setSelected(Number(d))}
              >
                <span>
                  {d}
                  <small>日</small>
                </span>
                <div>
                  <b>{t}</b>
                  <p>{c}</p>
                </div>
                <I name="ChevronRight" size={16} />
              </AppButton>
            ))}
        </Panel>
        <Assistant title="AI税务助理">
          <div className="pp-info-box">
            根据已有材料检查完整性，辅助整理待确认事项。
          </div>
          <MiniCard
            icon="TriangleAlert"
            tone="gold"
            title="缺少材料（2）"
            content="银行对账单、采购发票尚待补充。"
          />
          <MiniCard
            icon="UserRoundCheck"
            title="人工确认（1）"
            content="请财务负责人核对业务性质与税务口径。"
          />
          <h4>相关文件材料</h4>
          <div className="pp-two">
            {state.collections.tax.map((t) => (
              <AppButton
                className="pp-compact-file"
                key={t.id}
                onClick={() => edit('tax', t)}
              >
                <FileIcon />
                <span>
                  {t.title}
                  <small>{t.status}</small>
                </span>
              </AppButton>
            ))}
          </div>
          <h4>建议</h4>
          <ul className="pp-bullet-list">
            <li>先核对凭证、合同与业务真实性。</li>
            <li>由税务负责人确认申报口径。</li>
            <li>保存确认记录与提交回执。</li>
          </ul>
          <Button
            primary
            onClick={() =>
              quietly(
                save('tax', {
                  ...state.collections.tax.find((t) => t.id === 'tax-3')!,
                  status: '已齐全',
                }),
              )
            }
          >
            确认银行流水已补齐
          </Button>
        </Assistant>
      </div>
    </>
  );
}

function Admin() {
  const { state, edit, save, act, nav, notify } = usePpt(),
    [tab, setTab] = useState('员工入职'),
    [checked, setChecked] = useState(
      (state.settings.adminChecklist || '111110')
        .split('')
        .map((v) => v === '1'),
    ),
    [serviceQuery, setServiceQuery] = useState(''),
    [serviceTab, setServiceTab] = useState('问答'),
    [reply, setReply] = useState('');
  return (
    <>
      <Heading title="企业事务" sub="人事、行政与采购，按需获得支持">
        <div className="pp-inline">
          {['员工入职', '采购比价', '专业服务', '行政事务'].map((t) => (
            <Button key={t} icon="Plus" onClick={() => setTab(t)}>
              {t}
            </Button>
          ))}
        </div>
      </Heading>
      <div className="pp-admin-grid">
        <Panel
          title={
            <>
              <I name="Users" /> 人事行政
            </>
          }
        >
          <Tabs
            items={['员工入职', '行政事务', '规章制度', '资产管理']}
            value={tab}
            onChange={setTab}
          />
          {tab !== '员工入职' && tab !== '采购比价' && tab !== '专业服务' ? (
            <>
              <h4>{tab}台账</h4>
              <Button
                icon="Plus"
                onClick={() =>
                  edit('adminRecords', {
                    id: '',
                    title: '',
                    type: tab,
                    status: '待处理',
                    owner: '',
                    content: '',
                    date: localPptDate(),
                  })
                }
              >
                新增{tab}
              </Button>
              {state.collections.adminRecords
                .filter((r) => r.type === tab)
                .map((r) => (
                  <MiniCard
                    key={r.id}
                    title={r.title}
                    content={`${r.owner} · ${r.status} · ${r.content}`}
                    onClick={() => edit('adminRecords', r)}
                  />
                ))}
              {!state.collections.adminRecords.some((r) => r.type === tab) && (
                <p className="pp-muted">暂无记录，请新增。</p>
              )}
            </>
          ) : (
            <>
              <h4>新员工入职材料清单</h4>
              <p className="pp-muted">提交前请核对信息完整性与授权范围</p>
              {[
                '劳动合同签署',
                '员工信息登记',
                '学历证明',
                '户口资料',
                '薪资账户信息',
                '社保与公积金资料',
              ].map((t, i) => (
                <label className="pp-admin-check" key={t}>
                  <input
                    type="checkbox"
                    checked={checked[i]}
                    onChange={(e) => {
                      const next = checked.map((c, j) =>
                        j === i ? e.target.checked : c,
                      );
                      setChecked(next);
                      quietly(
                        act('settings.save', {
                          settings: {
                            adminChecklist: next
                              .map((v) => (v ? '1' : '0'))
                              .join(''),
                          },
                        }),
                      );
                    }}
                  />
                  <I name="FileText" size={17} />
                  <span>{t}</span>
                  <Tag>{checked[i] ? '已齐全' : '待补充'}</Tag>
                </label>
              ))}
              <Progress value={(checked.filter(Boolean).length / 6) * 100} />
              <p>已完成 {checked.filter(Boolean).length} / 6 项</p>
              <Button
                primary
                onClick={() => {
                  if (checked.some((c) => !c)) notify('请先补齐入职材料');
                  else
                    edit('employees', {
                      id: '',
                      title: '新员工',
                      role: '运营专员',
                      department: '运营部',
                      status: '待入职',
                      content: '入职材料已齐全',
                    });
                }}
              >
                提交入职材料
              </Button>
              <h4>员工与团队</h4>
              {state.collections.employees.slice(0, 3).map((e) => (
                <MiniCard
                  key={e.id}
                  icon="UserRound"
                  title={e.title}
                  content={`${e.department} · ${e.role}`}
                  onClick={() => edit('employees', e)}
                />
              ))}
            </>
          )}
        </Panel>
        <Panel
          title={
            <>
              <I name="ShoppingCart" /> 采购比价
            </>
          }
        >
          <p>设备采购需求：笔记本电脑、显示器、会议设备</p>
          <DataTable
            headers={['商品', '供应商A', '供应商B', '供应商C']}
            rows={['笔记本电脑', '显示器', '会议摄像头'].map((t, i) => [
              t,
              ...[0, 1, 2].map((j) => (
                <AppButton
                  className={j === [1, 2, 0][i] ? 'pp-best-price' : ''}
                  key={j}
                  onClick={() =>
                    edit(
                      'purchases',
                      {
                        id: '',
                        title: `${t} · 供应商${['A', 'B', 'C'][j]}`,
                        amount: String(
                          [
                            [6800, 6200, 6500],
                            [1800, 1700, 1600],
                            [2800, 3100, 2950],
                          ][i][j],
                        ),
                        status: '待审批',
                        content: `${t}供应商${['A', 'B', 'C'][j]}报价，待核对资质、交期与售后。`,
                      },
                      ['title', 'amount', 'status', 'content'],
                    )
                  }
                >
                  {money(
                    [
                      [6800, 6200, 6500],
                      [1800, 1700, 1600],
                      [2800, 3100, 2950],
                    ][i][j],
                  )}
                </AppButton>
              )),
            ])}
          />
          <small className="pp-muted">
            绿色为同类报价中的较低价格；需结合资质、交付与售后综合判断。
          </small>
          <h4>采购申请与报价资料</h4>
          {state.collections.purchases.map((p) => (
            <MiniCard
              key={p.id}
              title={p.title}
              content={`${money(p.amount)} · ${p.content}`}
              action={<Tag>{p.status}</Tag>}
              onClick={() => edit('purchases', p)}
            />
          ))}
          <Button
            primary
            onClick={() =>
              edit('purchases', {
                id: '',
                title: '',
                amount: '0',
                status: '待审批',
                content: '',
                owner: '张三',
              })
            }
          >
            提交采购申请
          </Button>
        </Panel>
        <Assistant title="专业服务">
          <Tabs
            items={['问答', '合同要点', '待办提醒']}
            value={serviceTab}
            onChange={setServiceTab}
          />
          <MiniCard
            title="本月需要哪些企业服务？"
            content="可结合企业阶段、项目与日常经营需求，梳理财税、人事和知识产权服务。"
          />
          <div className="pp-ai-answer">
            <p>
              {serviceTab === '合同要点'
                ? '请核对合同主体、服务范围、交付标准、费用、付款条件与违约处理；结合具体合同由负责人审核。'
                : serviceTab === '待办提醒'
                  ? `当前待入职员工${state.collections.employees.filter((e) => e.status === '待入职').length}位，待审批采购${state.collections.purchases.filter((p) => p.status === '待审批').length}项。`
                  : reply ||
                    '根据企业服务资料，建议先确认服务范围、资质、交付成果及费用，再选择合适的专业服务伙伴。'}
            </p>
            <Tag tone="slate">来源：企业服务知识库</Tag>
          </div>
          <div className="pp-assistant-input">
            <input
              aria-label="企业事务咨询"
              value={serviceQuery}
              onChange={(e) => setServiceQuery(e.target.value)}
              placeholder="输入人事、行政或采购问题"
            />
            <Button
              primary
              icon="Send"
              onClick={() => {
                setReply(
                  `关于“${serviceQuery}”：请先整理相关资料，明确负责人、服务范围与交付时间；涉及合同或费用的事项由企业负责人审核。`,
                );
                setServiceQuery('');
              }}
            />
          </div>
          <h4>待办提醒</h4>
          <MiniCard
            tone="gold"
            title="劳动合同待签署"
            content="1位新员工入职资料需负责人确认"
          />
          <MiniCard
            title="供应商合同审核"
            content="核对付款条件、质保与服务范围"
          />
        </Assistant>
      </div>
    </>
  );
}

function Enterprises() {
  const { state, edit, nav } = usePpt(),
    [filter, setFilter] = useState('全部行业'),
    [search, setSearch] = useState('');
  const records = state.collections.enterprises.filter(
    (e) =>
      (filter === '全部行业' || e.industry === filter) &&
      e.title.includes(search),
  );
  return (
    <>
      <Heading
        title="企业档案"
        sub="展示企业能力，也说清真实需求，让合作从彼此了解开始"
      >
        <Button
          icon="Plus"
          primary
          onClick={() =>
            edit('enterprises', {
              id: '',
              title: '',
              industry: '科技服务',
              skills: '',
              content: '',
              location: '深圳 · 前海',
              scale: '1–5人',
              status: '待认证',
              type: '企业',
            })
          }
        >
          完善企业档案
        </Button>
      </Heading>
      <div className="pp-toolbar">
        <AppSelect
          aria-label="行业筛选"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {[
            '全部行业',
            ...new Set(state.collections.enterprises.map((e) => e.industry)),
          ].map((i) => (
            <option key={i}>{i}</option>
          ))}
        </AppSelect>
        <input
          placeholder="搜索企业名称…"
          aria-label="搜索企业"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="pp-enterprise-grid">
        {records.map((e, i) => (
          <Panel className={`pp-enterprise-card tone-${i}`} key={e.id}>
            <header>
              <span className={`pp-enterprise-logo tone-${i}`}>
                {e.title.slice(0, 2)}
              </span>
              <Tag>{e.status}</Tag>
            </header>
            <h2>{e.title}</h2>
            <small>
              {e.location}　·　{e.scale}
            </small>
            <div className="pp-tools-tags">
              {e.skills?.split(',').map((s) => (
                <Tag key={s} tone="slate">
                  {s}
                </Tag>
              ))}
            </div>
            <h4>企业能力</h4>
            <p>{e.content}</p>
            <h4>当前需求</h4>
            <p>拓展业务合作，寻找行业伙伴与联合项目。</p>
            <footer>
              <Button onClick={() => edit('enterprises', e)}>
                查看企业画像 ›
              </Button>
              <Button primary onClick={() => nav('matching')}>
                寻找合作
              </Button>
            </footer>
          </Panel>
        ))}
      </div>
    </>
  );
}

function Matching() {
  const { state, edit, save, act, nav } = usePpt(),
    [industry, setIndustry] = useState('全部'),
    [selected, setSelected] = useState('');
  return (
    <>
      <Heading
        title="供需撮合"
        sub="让合适的企业遇见彼此，从需求和能力开始连接合作"
      >
        <Button
          icon="Network"
          onClick={() => setSelected(selected ? '' : 'graph')}
        >
          查看产业图谱
        </Button>
        <Button
          primary
          icon="Plus"
          onClick={() =>
            edit('demands', {
              id: '',
              title: '',
              industry: '科技服务',
              budget: '待协商',
              customer: '',
              content: '',
              tags: '',
              match: '0',
              status: '待对接',
            })
          }
        >
          发布需求
        </Button>
      </Heading>
      <div className="pp-success-strip">
        <I name="Sparkles" size={18} />{' '}
        基于企业需求、能力标签与行业经验提供演示匹配，具体合作由双方确认。
      </div>
      <Tabs
        items={['全部', '工业设计', '品牌设计', '软件开发']}
        value={industry}
        onChange={setIndustry}
      />
      {selected === 'graph' ? (
        <Panel title="产业合作关系图">
          <div className="pp-ecosystem-graph">
            <span>企业需求</span>
            <I name="ArrowRight" size={40} />
            <div>
              {state.collections.demands.map((d) => (
                <AppButton key={d.id} onClick={() => setSelected(d.id)}>
                  {d.title}
                </AppButton>
              ))}
            </div>
            <I name="ArrowRight" size={40} />
            <div>
              {state.collections.enterprises.map((e) => (
                <AppButton key={e.id} onClick={() => edit('enterprises', e)}>
                  {e.title}
                </AppButton>
              ))}
            </div>
          </div>
        </Panel>
      ) : (
        <div className="pp-matching-grid">
          {state.collections.demands
            .filter((d) => industry === '全部' || d.industry === industry)
            .map((d, i) => (
              <Panel className="pp-match-card" key={d.id}>
                <header>
                  <small>合作机会 · {d.industry}</small>
                  <Tag tone="green">匹配度 {d.match}%</Tag>
                </header>
                <h2>{d.title}</h2>
                <p>{d.content}</p>
                <div className="pp-demand-parties">
                  <section>
                    <small>需求方</small>
                    <b>{d.customer}</b>
                  </section>
                  <I name="ArrowRight" />
                  <section>
                    <small>推荐服务方</small>
                    <b>{state.collections.enterprises[i % 3].title}</b>
                  </section>
                </div>
                <div className="pp-tools-tags">
                  {d.tags?.split(',').map((t) => (
                    <Tag key={t} tone="slate">
                      {t}
                    </Tag>
                  ))}
                  <Tag tone="gold">{d.budget}</Tag>
                </div>
                <h4>匹配理由</h4>
                <p>
                  服务方的能力标签覆盖当前需求，具有相近业务场景的交付经验，可进一步确认范围和排期。
                </p>
                {selected === d.id && (
                  <div className="pp-info-box">
                    依据：需求标签「{d.tags}」，服务方能力「
                    {state.collections.enterprises[i % 3].skills}
                    」。演示匹配不代表合作承诺。
                  </div>
                )}
                <Button
                  onClick={() => setSelected(selected === d.id ? '' : d.id)}
                >
                  查看匹配依据 ›
                </Button>
                <footer>
                  <Tag>{d.status}</Tag>
                  <Button
                    primary
                    onClick={() =>
                      quietly(
                        act('demand.connect', { id: d.id }).then(() =>
                          nav('orders'),
                        ),
                      )
                    }
                  >
                    发起合作对接
                  </Button>
                </footer>
              </Panel>
            ))}
        </div>
      )}
    </>
  );
}

function Orders() {
  const { state, edit, save, act, nav } = usePpt(),
    [tab, setTab] = useState('项目总览'),
    order =
      state.collections.orders.find(
        (o) => o.id === state.settings.activeOrder,
      ) || state.collections.orders[0],
    stage = Number(order.stage);
  return (
    <>
      <Heading
        title={order.title}
        sub={`${order.customer}　·　订单编号 QH-2026-012　·　负责人 ${order.owner}`}
      >
        <AppSelect
          aria-label="选择订单"
          value={order.id}
          onChange={(e) =>
            quietly(
              act('settings.save', {
                settings: { activeOrder: e.target.value },
              }),
            )
          }
        >
          {state.collections.orders.map((o) => (
            <option key={o.id} value={o.id}>
              {o.title}
            </option>
          ))}
        </AppSelect>
        <Tag>{order.status}</Tag>
        <Button primary onClick={() => edit('orders', order)}>
          订单操作
        </Button>
      </Heading>
      <div className="pp-with-assistant">
        <div>
          <Panel title="合作履约进度">
            <Steps
              labels={[
                '需求确认',
                '方案报价',
                '签约启动',
                '交付验收',
                '结算归档',
              ]}
              current={stage}
              onClick={(i) => {
                if (i === stage + 1)
                  quietly(act('order.advance', { id: order.id, stage: i }));
              }}
            />
          </Panel>
          <Tabs
            items={[
              '项目总览',
              '交付成果',
              '沟通记录',
              '文件资料',
              '执行计划',
              '协作成员',
              '变更记录',
            ]}
            value={tab}
            onChange={setTab}
          />
          <OrderDetail order={order} tab={tab} />
          <Panel title="合同与验收要求">
            <DataTable
              headers={['合同金额', '交付时间', '验收标准', '付款条件']}
              rows={[
                [
                  money(order.amount),
                  '2026-12-20',
                  '客户书面确认最终成果',
                  '验收与开票后30日',
                ],
              ]}
            />
          </Panel>
        </div>
        <Assistant title="AI履约助理">
          <h4>建议与风险</h4>
          <MiniCard
            tone="gold"
            title="补充验收标准"
            content="明确成果格式、分辨率、修改轮次与确认人。"
            onClick={() => nav('requirements')}
          />
          <MiniCard
            title="提醒交付时间"
            content="初剪交付与客户评审需要预留修改时间。"
            onClick={() => nav('projects')}
          />
          <MiniCard
            icon="Receipt"
            title="结算材料"
            content="交付验收单、发票及合同应齐全。"
            onClick={() => nav('receivables')}
          />
          <h4>合作伙伴</h4>
          {state.collections.collaboration.map((c) => (
            <MiniCard
              key={c.id}
              title={c.title}
              content={c.company}
              onClick={() => nav('collaboration')}
            />
          ))}
          <Button primary onClick={() => nav('collaboration')}>
            进入联合项目协作
          </Button>
        </Assistant>
      </div>
    </>
  );
}

function SharedProjectFiles({ projectId }: { projectId: string }) {
  const { state, companyId, save, edit, notify } = usePpt(),
    input = useRef<HTMLInputElement>(null),
    [folder, setFolder] = useState('全部文件');
  const folders = ['全部文件', '方案资料', '视觉素材', '项目交付', '归档文档'];
  const records = state.collections.deliverables.filter(
    (d) =>
      d.project === projectId &&
      (folder === '全部文件' || d.category === folder),
  );
  return (
    <Panel
      title="共享文件库"
      action={
        <Button primary icon="Upload" onClick={() => input.current?.click()}>
          添加文件
        </Button>
      }
    >
      <input
        ref={input}
        hidden
        type="file"
        accept=".pdf,.docx,.pptx,.xlsx,.txt,.md,.csv,.png,.jpg,.jpeg,.webp"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try {
            const stored = await uploadPptFile(companyId, f);
            await save('deliverables', {
              id: '',
              title: f.name,
              project: projectId,
              category: folder === '全部文件' ? '项目交付' : folder,
              url: stored.url,
              version: 'v1.0',
              type: f.name.split('.').at(-1) || '文件',
              owner: '项目成员',
              status: '待确认',
              date: localPptDate(),
            });
          } catch (error) {
            notify((error as Error).message);
          }
          e.target.value = '';
        }}
      />
      <div className="pp-shared-files">
        <aside>
          {folders.map((f) => (
            <AppButton
              key={f}
              className={folder === f ? 'active' : ''}
              onClick={() => setFolder(f)}
            >
              <I name="Folder" size={16} />
              {f}
            </AppButton>
          ))}
        </aside>
        <DataTable
          headers={['文件名称', '类别', '版本', '状态', '操作']}
          rows={records.map((d) => [
            d.title,
            d.category,
            d.version,
            <Tag key={d.id}>{d.status}</Tag>,
            <div key={d.id} className="pp-inline">
              {d.url && (
                <a className="pp-btn" href={d.url} download={d.title}>
                  下载文件
                </a>
              )}
              <Button
                onClick={() =>
                  edit('deliverables', d, [
                    'title',
                    'category',
                    'version',
                    'status',
                  ])
                }
              >
                核对文件
              </Button>
            </div>,
          ])}
        />
      </div>
    </Panel>
  );
}

function Collaboration() {
  const { state, edit, save, act, nav } = usePpt(),
    [tab, setTab] = useState('项目洞察');
  const project =
    state.collections.projects.find(
      (p) => p.id === state.settings.activeProject,
    ) || state.collections.projects[0];
  return (
    <>
      <div className="pp-collab-heading">
        <img src={asset('project-hero.jpg')} alt="园区项目" />
        <div>
          <small>联合项目协作</small>
          <h1>
            {project.title} <Tag>{project.status}</Tag>
          </h1>
          <p>让专业团队各尽所长，在同一个项目中共享进展与交付成果。</p>
        </div>
      </div>
      <div className="pp-with-assistant">
        <div>
          <Panel title="项目里程碑">
            <Steps
              labels={[
                '需求确认',
                '方案共创',
                '分工执行',
                '成果验收',
                '复盘归档',
              ]}
              current={2}
            />
          </Panel>
          <Panel title="团队工作与任务">
            <div className="pp-three">
              {state.collections.collaboration.map((c, i) => (
                <div key={c.id} className={`pp-collab-team tone-${i}`}>
                  <header>
                    <I name="Users" size={25} />
                    <div>
                      <b>{c.title}</b>
                      <small>{c.company}</small>
                    </div>
                    <Button
                      icon="Pencil"
                      onClick={() => edit('collaboration', c)}
                    />
                  </header>
                  <Progress value={Number(c.progress)} />
                  <p>当前进度 {c.progress}%</p>
                  {state.collections.tasks.slice(i * 2, i * 2 + 3).map((t) => (
                    <AppButton
                      className="pp-collab-task"
                      key={t.id}
                      onClick={() => edit('tasks', t)}
                    >
                      <I name="CircleCheck" size={16} />
                      <span>
                        {t.title}
                        <small>{t.owner}</small>
                      </span>
                      <Tag>{t.status}</Tag>
                    </AppButton>
                  ))}
                </div>
              ))}
            </div>
          </Panel>
          <SharedProjectFiles projectId={project.id} />
        </div>
        <Assistant title="AI协同助手">
          <Tabs
            items={['项目洞察', '人工建议', '依赖提醒', '交付汇总']}
            value={tab}
            onChange={setTab}
          />
          {['项目洞察', '人工建议'].includes(tab) &&
            state.collections.collaboration.map((c) => (
              <MiniCard
                key={c.id}
                title={c.title}
                content={`${c.content}，建议同步最新范围和当前阻塞。`}
                action={
                  <Button
                    onClick={() =>
                      quietly(
                        save('collaboration', { ...c, status: '建议已采纳' }),
                      )
                    }
                  >
                    {c.status === '建议已采纳' ? '已采纳' : '采纳'}
                  </Button>
                }
              />
            ))}
          {tab === '依赖提醒' && (
            <>
              <h4>依赖提醒</h4>
              <div className="pp-warning">
                素材拍摄依赖脚本确认；剪辑包装依赖最终拍摄素材，请先确认前置事项。
              </div>
            </>
          )}
          {tab === '交付汇总' && (
            <>
              <h4>交付汇总</h4>
              <div className="pp-three pp-tiny-metrics">
                <span>
                  <b>3</b>团队
                </span>
                <span>
                  <b>{state.collections.tasks.length}</b>任务
                </span>
                <span>
                  <b>{state.collections.documents.length}</b>文档
                </span>
              </div>
            </>
          )}
          <Button onClick={() => nav('orders')}>查看订单与履约</Button>
        </Assistant>
      </div>
    </>
  );
}

function Energy() {
  const { state, edit, save, act, nav, notify } = usePpt(),
    [type, setType] = useState('用电'),
    [range, setRange] = useState('今日');
  const meters = state.collections.meters;
  const stats = workspaceStats(state),
    days = range === '今日' ? 1 : range === '近7日' ? 7 : 30;
  const dates = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - days + i + 1);
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
    }).format(d);
  });
  const readings = state.collections.readings.filter(
    (r) => dates.includes(r.date) && r.type === (type === '用水' ? '水' : '电'),
  );
  return (
    <>
      <Heading
        title="智慧水电"
        sub="能耗透明，异常及时处理，按空间追踪水电使用情况"
      >
        <Button icon="Plug" onClick={() => nav('integrations')}>
          IoT接入
        </Button>
        <Button
          icon="Plus"
          onClick={() =>
            edit('meters', {
              id: '',
              title: '',
              type: '电',
              reading: '0',
              rate: '0.85',
              unit: 'kWh',
              status: '正常',
              space: '',
              content: '',
            })
          }
        >
          新增计量表
        </Button>
      </Heading>
      <div className="pp-metrics three">
        <Metric title="今日用电总量" value={`${stats.energy} kWh`} icon="Zap" />
        <Metric
          title="今日用水总量"
          value={`${stats.water} m³`}
          icon="Droplets"
          color="teal"
        />
        <Metric
          title="异常提醒"
          value={meters.filter((m) => m.status === '异常').length + ' 项'}
          icon="BellRing"
          color="gold"
        />
      </div>
      <Panel
        title={`${range}能耗趋势（${type === '用水' ? 'm³' : 'kWh'}）`}
        action={
          <div className="pp-inline">
            <Tabs items={['用电', '用水']} value={type} onChange={setType} />
            <AppSelect
              aria-label="能耗范围"
              value={range}
              onChange={(e) => setRange(e.target.value)}
            >
              <option>今日</option>
              <option>近7日</option>
              <option>近30日</option>
            </AppSelect>
          </div>
        }
      >
        <Chart
          height={350}
          data={dates.map((date) => ({
            name: date.slice(5),
            a: readings
              .filter((r) => r.date === date)
              .reduce((n, r) => n + Number(r.usage || 0), 0),
          }))}
        />
      </Panel>
      <Panel title="历史抄表与用量">
        <DataTable
          headers={['日期', '计量表', '上次读数', '本次读数', '用量', '金额']}
          rows={readings.map((r) => [
            r.date,
            r.title,
            r.previous,
            r.reading,
            r.usage,
            money(r.amount),
          ])}
        />
      </Panel>
      <Panel
        title="计量表与抄表记录"
        action={
          <Button
            icon="Download"
            onClick={() =>
              csv('抄表记录', [
                ['计量表', '空间', '读数', '单位', '状态'],
                ...meters.map((m) => [
                  m.title,
                  m.space,
                  m.reading,
                  m.unit,
                  m.status,
                ]),
              ])
            }
          >
            导出抄表
          </Button>
        }
      >
        <DataTable
          headers={['计量表', '空间', '类型', '最新读数', '状态', '操作']}
          rows={meters.map((m) => [
            m.title,
            m.space,
            m.type,
            `${m.reading} ${m.unit}`,
            <Tag key={m.id}>{m.status}</Tag>,
            <div className="pp-inline" key={m.id}>
              <Button
                onClick={() =>
                  edit('meters', m, [
                    'title',
                    'reading',
                    'status',
                    'space',
                    'content',
                  ])
                }
              >
                录入 / 核查
              </Button>
              {m.status === '异常' && (
                <Button
                  onClick={() =>
                    quietly(
                      save('meters', {
                        ...m,
                        status: '正常',
                        content: '已安排现场核查，异常已处理。',
                      }),
                    )
                  }
                >
                  处理异常
                </Button>
              )}
            </div>,
          ])}
        />
      </Panel>
    </>
  );
}

function Spaces() {
  const { state, edit, act, busy } = usePpt(),
    [filter, setFilter] = useState('全部'),
    [selected, setSelected] = useState<PptItem | null>(null),
    [date, setDate] = useState(() => localPptDate());
  return (
    <>
      <Heading
        title="空间租赁"
        sub="从找空间，到管好租约，让企业拥有适合生长的地方"
      >
        <Button
          primary
          icon="Plus"
          onClick={() =>
            edit('spaces', {
              id: '',
              title: '',
              type: '独立办公室',
              area: '45',
              seats: '6',
              price: '4800',
              status: '可租',
              content: '',
              owner: '',
            })
          }
        >
          新建空间
        </Button>
      </Heading>
      <div className="pp-toolbar">
        <Tabs
          items={['全部', '已出租', '可租', '已预约']}
          value={filter}
          onChange={setFilter}
        />
        <small>
          {state.collections.spaces.length} 间空间 · 租约与房源状态同步
        </small>
      </div>
      <div className="pp-spaces-grid">
        {state.collections.spaces
          .filter((s) => filter === '全部' || s.status === filter)
          .map((s, i) => (
            <AppButton
              className={`pp-space-card ${s.status === '已出租' ? 'occupied' : s.status === '已预约' ? 'reserved' : 'available'}`}
              key={s.id}
              onClick={() => setSelected(s)}
            >
              <header>
                <I name="Building2" size={21} />
                <Tag>{s.status}</Tag>
              </header>
              <h2>{s.title}</h2>
              <p>
                {s.type} · {s.area}㎡ · {s.seats}人
              </p>
              <div>{s.owner || '可预约参观'}</div>
              <footer>
                <b>
                  {money(s.price)}
                  <small> / 月</small>
                </b>
                <I name="ArrowRight" size={17} />
              </footer>
            </AppButton>
          ))}
      </div>
      {selected && (
        <div className="pp-modal-shade">
          <section
            className="pp-modal pp-space-detail"
            role="dialog"
            aria-modal="true"
            aria-label="空间与租约"
          >
            <header>
              <h2>
                {selected.title} · {selected.type}
              </h2>
              <Button icon="X" onClick={() => setSelected(null)} />
            </header>
            <img src={asset('video-preview.jpg')} alt="办公空间" />
            <form
              className="pp-space-detail-content"
              onSubmit={(e) => {
                e.preventDefault();
                const submittedDate = String(
                  new FormData(e.currentTarget).get('bookingDate') || '',
                );
                quietly(
                  act(
                    selected.status === '已出租' ? 'space.renew' : 'space.book',
                    { id: selected.id, date: submittedDate },
                  ).then(() => setSelected(null)),
                );
              }}
            >
              <Tag>{selected.status}</Tag>
              <h3>
                {money(selected.price)} / 月　{selected.area}㎡　
                {selected.seats}工位
              </h3>
              <p>{selected.content}</p>
              <label>
                预约 / 续租日期
                <input
                  type="date"
                  name="bookingDate"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <footer>
                <Button
                  onClick={() => {
                    edit('spaces', selected);
                    setSelected(null);
                  }}
                >
                  编辑房源与租约
                </Button>
                <AppButton
                  className="pp-btn primary"
                  type="submit"
                  disabled={busy}
                >
                  {selected.status === '已出租' ? '登记续租安排' : '预约参观'}
                </AppButton>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

function Policy() {
  const { state, save, act, edit, notify } = usePpt(),
    [selected, setSelected] = useState(state.collections.policies[0].id),
    [tab, setTab] = useState('政策通知'),
    [search, setSearch] = useState('');
  const visiblePolicies = state.collections.policies.filter(
    (p) => (p.category || '政策通知') === tab,
  );
  const p =
      visiblePolicies.find((p) => p.id === selected) ||
      visiblePolicies[0] ||
      state.collections.policies[0],
    stage = Number(p.stage || 0);
  const [policyTitle, setPolicyTitle] = useState(p.headline),
    [policyContent, setPolicyContent] = useState(p.content);
  useEffect(() => {
    setPolicyTitle(p.headline);
    setPolicyContent(p.content);
  }, [p.id, p.headline, p.content]);
  return (
    <>
      <div className="pp-policy-grid">
        <Panel className="pp-policy-list">
          <Tabs
            items={['政策通知', '企业服务', '活动公告']}
            value={tab}
            onChange={setTab}
          />
          <Button
            icon="Plus"
            onClick={() =>
              edit('policies', {
                id: '',
                title: '新建' + tab,
                category: tab,
                headline: '新建' + tab,
                content: '',
                tags: '',
                agency: '园区运营中心',
                deadline: '',
                status: '草稿',
                stage: '0',
                level: '园区',
                date: localPptDate(),
              })
            }
          >
            新建{tab}
          </Button>
          <input
            aria-label="搜索政策"
            placeholder="搜索政策标题、关键词"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {state.collections.policies
            .filter(
              (p) =>
                (p.category || '政策通知') === tab && p.title.includes(search),
            )
            .map((p) => (
              <AppButton
                key={p.id}
                className={selected === p.id ? 'selected' : ''}
                onClick={() => setSelected(p.id)}
              >
                <h3>
                  {p.title} <Tag>{p.level}</Tag>
                </h3>
                <p>{p.headline}</p>
                <footer>
                  <span>{p.agency}</span>
                  <small>{p.date}</small>
                </footer>
              </AppButton>
            ))}
        </Panel>
        <div style={{ display: visiblePolicies.length ? 'contents' : 'none' }}>
          <Panel
            title={
              <>
                <I name="FileText" /> 发文编辑
              </>
            }
            action={
              <div className="pp-inline">
                <Button
                  icon="Save"
                  onClick={() =>
                    quietly(
                      save('policies', {
                        ...p,
                        headline: policyTitle,
                        content: policyContent,
                      }),
                    )
                  }
                >
                  保存草稿
                </Button>
                <Button
                  icon="Eye"
                  onClick={() => exportText(policyTitle, policyContent)}
                >
                  预览 / 导出
                </Button>
              </div>
            }
          >
            <label>
              标题 <span className="pp-red">*</span>
              <input
                aria-label="发文标题"
                value={policyTitle}
                onChange={(e) => setPolicyTitle(e.target.value)}
                onBlur={() =>
                  policyTitle !== p.headline &&
                  quietly(
                    save('policies', {
                      ...p,
                      headline: policyTitle,
                      content: policyContent,
                    }),
                  )
                }
              />
            </label>
            <label>正文内容</label>
            <div className="pp-policy-toolbar">
              正文　14px　 <b>B</b>　<i>I</i>　<u>U</u>　☷　≡　{' '}
              <Button
                icon="Sparkles"
                onClick={() => {
                  setPolicyContent(
                    `${policyTitle}\n\n${policyContent.replace(new RegExp('^' + policyTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*'), '').trim()}\n\n办理提示：请核对适用对象、申报材料和截止日期，具体以原文与负责部门确认为准。`,
                  );
                  notify('已按本地规则整理草稿，请核对后保存。');
                }}
              >
                AI优化
              </Button>
            </div>
            <div className="pp-policy-paper">
              <h2>{p.headline}</h2>
              <small>
                {p.agency}　{p.date}
              </small>
              <textarea
                aria-label="政策正文"
                value={policyContent}
                onChange={(e) => setPolicyContent(e.target.value)}
                onBlur={() =>
                  policyContent !== p.content &&
                  quietly(
                    save('policies', {
                      ...p,
                      headline: policyTitle,
                      content: policyContent,
                    }),
                  )
                }
              />
            </div>
          </Panel>
          <Assistant title="AI政策助手">
            <Tag tone="purple">基于政策文件智能解析</Tag>
            <h4>
              <I name="Building2" />
              适配企业标签
            </h4>
            <div className="pp-tools-tags">
              {p.tags.split(',').map((t) => (
                <Tag tone="slate" key={t}>
                  {t}
                </Tag>
              ))}
              <Button icon="Plus" onClick={() => edit('policies', p, ['tags'])}>
                自定义标签
              </Button>
            </div>
            <h4>政策要点提炼</h4>
            <ol className="pp-numbered-list">
              {[
                '对企业研发投入增量给予财政支持',
                '支持建设高水平研发机构和重点实验室',
                '加强产学研协同创新',
                '优化创新服务保障，支持国际科技合作',
              ].map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
            <h4>申请材料清单</h4>
            {[
              '企业基本信息表',
              '近三年研发投入专项审计报告',
              '研发项目立项材料',
              '相关资质证书',
            ].map((t) => (
              <MiniCard key={t} title={t} icon="FileText" />
            ))}
            <h4>截止提醒</h4>
            <div className="pp-deadline">
              <I name="Clock3" size={28} />
              <div>
                <small>申报截止日期</small>
                <b>{p.deadline}</b>
              </div>
              <Tag tone="red">请提前准备</Tag>
            </div>
          </Assistant>
        </div>
        {!visiblePolicies.length && (
          <Panel title={tab}>
            <p>
              暂无{tab}，请点击左侧“新建{tab}”录入内容。
            </p>
          </Panel>
        )}
      </div>
      {!!visiblePolicies.length && (
        <Panel className="pp-policy-flow" title="发布流程">
          <Steps
            labels={['草稿', '审核', '定向推送', '回执跟进']}
            current={stage}
          />
          <Button
            primary
            icon="Send"
            disabled={stage >= 3}
            onClick={() => quietly(act('policy.advance', { id: p.id }))}
          >
            {
              ['提交审核', '人工审核通过并推送', '记录跟进回执', '流程已完成'][
                stage
              ]
            }
          </Button>
        </Panel>
      )}
    </>
  );
}

function Services() {
  const { state, edit, save } = usePpt(),
    [filter, setFilter] = useState('全部');
  const rows = state.collections.services.filter(
    (s) => filter === '全部' || s.status === filter,
  );
  return (
    <>
      <Heading
        title="物业服务"
        sub="日常需求与专业机会相连接，工单有响应，处理有回执"
      >
        <Button
          primary
          icon="Plus"
          onClick={() =>
            edit('services', {
              id: '',
              title: '',
              type: '维修',
              space: '',
              status: '待受理',
              owner: '物业前台',
              date: '2026-10-27',
              content: '',
            })
          }
        >
          新建工单
        </Button>
      </Heading>
      <div className="pp-metrics three">
        {['待受理', '处理中', '已完成'].map((s, i) => (
          <Metric
            key={s}
            title={s}
            value={
              state.collections.services.filter((x) => x.status === s).length +
              ' 项'
            }
            icon={['ClipboardList', 'LoaderCircle', 'CircleCheck'][i]}
            color={['gold', 'blue', 'green'][i]}
          />
        ))}
      </div>
      <Panel>
        <Tabs
          items={['全部', '待受理', '处理中', '已完成']}
          value={filter}
          onChange={setFilter}
        />
        <DataTable
          headers={[
            '工单内容',
            '位置',
            '类型',
            '负责人',
            '日期',
            '状态',
            '操作',
          ]}
          rows={rows.map((s) => [
            <b key={s.id}>{s.title}</b>,
            s.space,
            s.type,
            s.owner,
            s.date,
            <Tag key={s.id}>{s.status}</Tag>,
            <div className="pp-inline" key={s.id}>
              <Button onClick={() => edit('services', s)}>详情</Button>
              {s.status !== '已完成' && (
                <Button
                  onClick={() =>
                    quietly(
                      save('services', {
                        ...s,
                        status: s.status === '待受理' ? '处理中' : '已完成',
                      }),
                    )
                  }
                >
                  {s.status === '待受理' ? '受理' : '完成并回执'}
                </Button>
              )}
            </div>,
          ])}
        />
      </Panel>
    </>
  );
}

function Industry() {
  const { state, edit, save, act, nav, notify } = usePpt(),
    [selected, setSelected] = useState(0);
  const t = state.collections.templates[selected];
  return (
    <>
      <Heading
        title="行业方案中心"
        sub="从通用能力到专业工作，为企业配置合适的知识、岗位与流程"
      />
      <div className="pp-industry-cards">
        {state.collections.templates.map((t, i) => (
          <AppButton
            key={t.id}
            className={selected === i ? 'selected' : ''}
            onClick={() => setSelected(i)}
          >
            <img
              src={asset(
                [
                  'industry-service.jpg',
                  'industry-brand.jpg',
                  'industry-chain.jpg',
                ][i],
              )}
              alt={t.title}
            />
            <h2>{t.title}</h2>
            <p>{t.content}</p>
            <div>
              {t.roles.split('、').map((r) => (
                <span key={r}>
                  <I name="UserRound" size={17} />
                  {r}
                </span>
              ))}
            </div>
          </AppButton>
        ))}
      </div>
      <div className="pp-industry-detail">
        <Panel title={`${t.title}方案`}>
          <div className="pp-industry-workspace">
            <div>
              <h4>知识资料</h4>
              {state.collections.sources.map((s) => (
                <MiniCard
                  key={s.id}
                  title={s.title}
                  icon="FileText"
                  onClick={() => edit('sources', s)}
                />
              ))}
            </div>
            <div>
              <h4>岗位组合</h4>
              <div className="pp-three">
                {t.roles.split('、').map((r, i) => (
                  <div className="pp-industry-role" key={r}>
                    <I
                      name={['Users', 'BriefcaseBusiness', 'Wallet'][i]}
                      size={30}
                    />
                    <b>{r}</b>
                    <small>按权限协同与审核</small>
                  </div>
                ))}
              </div>
              <h4>业务流程</h4>
              <Steps
                labels={t.steps.split(',')}
                current={0}
                onClick={() => nav('workflow')}
              />
              <h4>可交付成果</h4>
              <div className="pp-three">
                <MiniCard title="客户方案" icon="FileText" />
                <MiniCard title="品牌物料" icon="Image" />
                <MiniCard title="项目记录" icon="Folder" />
              </div>
            </div>
          </div>
        </Panel>
        <Assistant title="AI方案助手">
          <p>结合企业阶段与当前工作需求，配置适合的岗位与交付流程。</p>
          <ul className="pp-bullet-list">
            <li>明确一个高频任务。</li>
            <li>补充企业资料与经验。</li>
            <li>配置岗位权限与人工节点。</li>
            <li>以实际工作记录验证成效。</li>
          </ul>
          <Button
            primary
            icon="Plus"
            onClick={() =>
              quietly(
                act('template.apply', { id: t.id }).then(() => nav('projects')),
              )
            }
          >
            配置到企业
          </Button>
          <Button onClick={() => nav('roles')}>配置AI岗位</Button>
        </Assistant>
      </div>
    </>
  );
}

function Analytics({ validation = false }: { validation?: boolean }) {
  const { state, edit, nav, save } = usePpt(),
    [query, setQuery] = useState(''),
    [answer, setAnswer] = useState('');
  const stats = workspaceStats(state);
  return (
    <>
      <Heading
        title={validation ? 'AI经营成效' : '经营驾驶舱'}
        sub={
          validation
            ? '以业务结果说明AI作用，比较前后差异，保留依据和人工确认。'
            : '用数据理解经营状态，让问题随问随看。'
        }
      >
        <Button
          icon="Download"
          onClick={() =>
            csv(validation ? '任务成效对比' : '经营数据', [
              ['指标', '本期值'],
              ['空间出租率', `${stats.occupancy}%`],
              ['本月内容', state.collections.contents.length],
              ['项目任务', state.collections.tasks.length],
            ])
          }
        >
          导出Excel数据
        </Button>
        <Button
          primary
          icon="FilePlus2"
          onClick={() =>
            quietly(
              save('documents', {
                id: '',
                title: `运营汇报 · ${localPptDate()}`,
                type: 'PPT',
                pages: '3',
                outline: '园区经营概况\n业务与内容进展\n后续行动与核对',
                content: `园区经营概况\n登记企业：${stats.enterprises}家\n空间出租率：${stats.occupancy}%\n可租空间：${stats.available}间\n本月已确认收入：${money(stats.revenue)}\n待处理工单：${stats.pending}项\n\n业务与内容进展\n项目：${state.collections.projects.length}个\n任务：${state.collections.tasks.length}项\n内容：${state.collections.contents.length}篇\n\n后续行动与核对\n请依据项目、工单及回款台账安排负责人确认。`,
                status: '草稿',
              }).then(() => nav('documents')),
            )
          }
        >
          创建运营汇报
        </Button>
      </Heading>
      {validation ? (
        <>
          <div className="pp-metrics four">
            {[
              ['耗时', 'Clock3', '时间投入对比'],
              ['质量', 'ShieldCheck', '人工核对与采用'],
              ['转化', 'ChartNoAxesCombined', '真实业务结果'],
              ['沉淀', 'Database', '可复用知识与方法'],
            ].map(([t, i, s]) => (
              <Metric title={t} key={t} icon={i} value="待采集" sub={s} />
            ))}
          </div>
          <div className="pp-with-assistant">
            <Panel
              title="核心任务前后对比"
              action={
                <Button
                  icon="Plus"
                  onClick={() =>
                    edit('validations', {
                      id: '',
                      title: '',
                      before: '0',
                      after: '0',
                      unit: '分钟',
                      status: '待复核',
                      evidence: '',
                      content: '',
                    })
                  }
                >
                  新增对比记录
                </Button>
              }
            >
              <DataTable
                headers={[
                  '工作任务',
                  '原流程',
                  'AI辅助',
                  '实际结果',
                  '说明 / 依据',
                  '操作',
                ]}
                rows={state.collections.validations.map((v) => [
                  v.title,
                  `${v.before}${v.unit}`,
                  `${v.after}${v.unit}`,
                  <Tag key={v.id}>{v.status}</Tag>,
                  v.evidence,
                  <RecordAction key={v.id} collection="validations" item={v} />,
                ])}
              />
              <div className="pp-info-box">
                演示对比仅说明记录方式，不作为已验证的效率提升或经营收益结论。
              </div>
            </Panel>
            <Assistant title="上线验证">
              <MiniCard
                title="人工复核"
                content="由负责人确认输出质量与实际采用情况。"
                icon="UserRoundCheck"
              />
              <MiniCard
                title="数据留痕"
                content="保留任务、版本、来源与执行记录。"
                icon="FileClock"
              />
              <MiniCard
                title="按周复盘"
                content="依据真实使用情况调整岗位和流程。"
                icon="RefreshCw"
              />
              <h4>验证记录</h4>
              {state.collections.validations.slice(0, 2).map((v) => (
                <MiniCard
                  key={v.id}
                  title={v.title}
                  content={v.evidence}
                  onClick={() => edit('validations', v)}
                />
              ))}
            </Assistant>
          </div>
        </>
      ) : (
        <>
          <div className="pp-analytics-layout">
            <aside>
              <Panel title="园区概况">
                <Metric
                  title="在园企业"
                  value={stats.enterprises}
                  icon="Building2"
                />
                <Metric
                  title="可租空间"
                  value={stats.available}
                  icon="MapPin"
                />
                <Metric
                  title="园区面积"
                  value={`${stats.area}㎡`}
                  icon="Building"
                />
              </Panel>
              <Panel title="AI助理">
                <I name="Bot" size={35} />
                <h4>从数据到行动建议</h4>
                <p>你可以询问项目、内容与企业服务的记录情况。</p>
              </Panel>
            </aside>
            <div className="pp-two">
              <Panel
                title="园区出租率趋势"
                action={<Tag tone="slate">近6个月 · 示例趋势</Tag>}
              >
                <Chart
                  height={340}
                  data={Array.from({ length: 6 }, (_, i) => ({
                    name: `${5 + i}月`,
                    a: 72 + i * 2.8,
                  }))}
                />
              </Panel>
              <Panel title="内容资产分布">
                <Chart
                  bar
                  height={340}
                  data={[
                    '招商文案',
                    '活动策划',
                    '品牌内容',
                    '视频脚本',
                    '运营汇报',
                  ].map((s) => ({
                    name: s,
                    a: state.collections.contents.filter((c) => c.type === s)
                      .length,
                  }))}
                />
              </Panel>
            </div>
          </div>
          <Panel title="经营问题随问随看">
            <div className="pp-assistant-input">
              <input
                aria-label="经营数据提问"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="例如：当前有哪些内容待审核？"
              />
              <Button
                primary
                icon="Send"
                onClick={() => {
                  setAnswer(
                    query.includes('审核')
                      ? `当前有${state.collections.contents.filter((c) => c.status === '待审核').length}项内容待审核：${state.collections.contents
                          .filter((c) => c.status === '待审核')
                          .map((c) => c.title)
                          .join('、')}`
                      : `演示空间共有${state.collections.projects.length}个项目、${state.collections.tasks.length}项任务、${state.collections.customers.length}个客户机会。`,
                  );
                  setQuery('');
                }}
              >
                查询
              </Button>
            </div>
            {answer && <div className="pp-ai-answer">{answer}</div>}
          </Panel>
        </>
      )}
    </>
  );
}

function Requirements() {
  const { state, edit, save, act, nav } = usePpt(),
    [confirmed, setConfirmed] = useState([false, false, false]);
  const r =
    state.collections.requirements.find(
      (r) => r.id === state.settings.activeRequirement,
    ) || state.collections.requirements[0];
  return (
    <>
      <Heading
        title="需求确认与报价范围"
        sub="资料归集 → 范围核对 → 客户确认，先说清楚再开始交付"
      >
        <AppSelect
          aria-label="选择需求"
          value={r.id}
          onChange={(e) =>
            quietly(
              act('settings.save', {
                settings: { activeRequirement: e.target.value },
              }),
            )
          }
        >
          {state.collections.requirements.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title}
            </option>
          ))}
        </AppSelect>
        <Button
          primary
          icon="Plus"
          onClick={() =>
            edit('requirements', {
              id: '',
              title: '新需求',
              content: '',
              scope: '',
              excluded: '',
              amount: '0',
              owner: '张三',
              date: localPptDate(),
              customer: '',
              status: '草稿',
            })
          }
        >
          新建需求
        </Button>
      </Heading>
      <div className="pp-three pp-requirement-summary">
        <Metric title="资料已归集" value="5 份" icon="Files" />
        <Metric
          title="待确认问题"
          value={confirmed.filter((x) => !x).length + ' 项'}
          icon="CircleHelp"
          color="gold"
        />
        <Metric
          title="报价范围"
          value={r.status}
          icon="ShieldCheck"
          color="teal"
        />
      </div>
      <div className="pp-requirement-grid">
        <Panel
          title="需求来源与资料"
          action={
            <Button icon="Plus" onClick={() => nav('imports')}>
              添加资料
            </Button>
          }
        >
          {state.collections.sources.map((s) => (
            <AppButton
              className="pp-source-card"
              key={s.id}
              onClick={() => edit('sources', s)}
            >
              <FileIcon type={s.type} />
              <div>
                <b>{s.title}</b>
                <p>{s.category}</p>
                <Tag>{s.status}</Tag>
              </div>
            </AppButton>
          ))}
          <MiniCard
            title="客户沟通纪要"
            content="预算、目标、时间与确认人"
            onClick={() => edit('requirements', r)}
          />
          <MiniCard
            title="历史方案与报价"
            content="相关版本与范围参考"
            onClick={() => nav('documents')}
          />
        </Panel>
        <Panel
          title="需求确认单"
          action={
            <Button icon="Pencil" onClick={() => edit('requirements', r)}>
              编辑确认单
            </Button>
          }
        >
          <DataTable
            headers={['确认项目', '当前范围']}
            rows={[
              ['项目名称', r.title],
              ['交付内容', r.content],
              ['包含范围', r.scope],
              ['不包含范围', r.excluded],
              ['修改轮次', '包含2轮集中反馈修改'],
              ['项目周期', '需求确认后18个工作日'],
              ['验收标准', '最终成片、可编辑文件与交付清单'],
              ['负责人', r.owner],
              ['预算金额', money(r.amount)],
            ]}
          />
          <div className="pp-info-box">
            <I name="Info" />
            范围、排除项与修改轮次是报价和验收的共同依据。
          </div>
        </Panel>
        <Panel title="待确认问题">
          <div className="pp-numbered-questions">
            {[
              '确认最终交付规格与使用渠道',
              '确认修改轮次及超出范围的追加费用',
              '确认客户验收人及书面确认方式',
            ].map((t, i) => (
              <label className="pp-check-line" key={t}>
                <input
                  type="checkbox"
                  checked={confirmed[i]}
                  onChange={(e) =>
                    setConfirmed(
                      confirmed.map((v, j) => (j === i ? e.target.checked : v)),
                    )
                  }
                />
                <b>{i + 1}</b>
                {t}
              </label>
            ))}
          </div>
          <h4>客户确认版本</h4>
          <MiniCard
            title="需求确认单 v1.2"
            content="当前状态：待客户书面确认"
          />
          <label>
            客户确认备注
            <textarea
              rows={5}
              defaultValue={r.comment || ''}
              placeholder="记录确认人、时间与凭证…"
              onBlur={(e) =>
                quietly(save('requirements', { ...r, comment: e.target.value }))
              }
            />
          </label>
          <Button
            primary
            disabled={!confirmed.every(Boolean)}
            onClick={() =>
              quietly(
                act('requirement.confirm', {
                  id: r.id,
                  checks: confirmed,
                }).then(() => nav('review')),
              )
            }
          >
            确认范围并生成报价
          </Button>
        </Panel>
      </div>
      <Panel className="pp-requirement-flow">
        <Steps
          labels={['资料归集', '内部确认', '客户确认', '进入项目']}
          current={1}
        />
        <Button
          primary
          onClick={() =>
            exportText(
              '需求确认单',
              Object.entries(r)
                .filter(([k]) => k !== 'id')
                .map(([k, v]) => `${k}：${v}`)
                .join('\n'),
            )
          }
        >
          发送 / 下载确认单
        </Button>
      </Panel>
    </>
  );
}

function Cost() {
  const { state, edit, nav, act } = usePpt(),
    project =
      state.collections.projects.find(
        (p) => p.id === state.settings.activeProject,
      ) || state.collections.projects[0],
    costs = state.collections.costs.filter(
      (c) => (c.project || 'project-1') === project.id,
    ),
    recorded = costs
      .filter((c) => c.type === '已确认')
      .reduce((n, c) => n + Number(c.amount), 0),
    estimated = costs
      .filter((c) => c.type === '预估')
      .reduce((n, c) => n + Number(c.amount), 0),
    contract = Number(
      project.amount ||
        (project.id === 'project-1'
          ? state.collections.quotations[0]?.amount
          : '0') ||
        0,
    ),
    profit = contract - recorded - estimated;
  return (
    <>
      <Heading
        title="项目成本与利润"
        sub={`项目：${project.title} · 区分已记录、估算与未知成本`}
      >
        <AppSelect
          aria-label="成本所属项目"
          value={project.id}
          onChange={(e) =>
            quietly(
              act('settings.save', {
                settings: { activeProject: e.target.value },
              }),
            )
          }
        >
          {state.collections.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </AppSelect>
        <Button onClick={() => edit('projects', project, ['title', 'amount'])}>
          维护合同金额
        </Button>
        <Button
          icon="Plus"
          primary
          onClick={() =>
            edit('costs', {
              id: '',
              title: '',
              type: '预估',
              amount: '0',
              status: '待核实',
              owner: '张三',
              project: project.id,
            })
          }
        >
          记录项目成本
        </Button>
      </Heading>
      <div className="pp-metrics four">
        <Metric title="合同金额" value={money(contract)} icon="FileText" />
        <Metric
          title="已记录成本"
          value={money(recorded)}
          icon="Wallet"
          color="teal"
        />
        <Metric
          title="估算追加"
          value={money(estimated)}
          icon="Calculator"
          color="gold"
        />
        <Metric
          title="暂估毛利"
          value={money(profit)}
          icon="ChartNoAxesCombined"
          color="green"
        />
      </div>
      <div className="pp-with-assistant">
        <Panel
          title="成本明细"
          action={
            <Button
              onClick={() =>
                csv('项目成本', [
                  ['项目', '类型', '金额', '负责人'],
                  ...costs.map((c) => [c.title, c.type, c.amount, c.owner]),
                ])
              }
            >
              导出明细
            </Button>
          }
        >
          <DataTable
            headers={['类型 / 项目', '负责人', '金额', '确认状态', '操作']}
            rows={['已确认', '预估', '未知'].flatMap((type) =>
              costs
                .filter((c) => c.type === type)
                .map((c) => [
                  <div key={c.id}>
                    <Tag
                      tone={
                        type === '已确认'
                          ? 'blue'
                          : type === '预估'
                            ? 'gold'
                            : 'red'
                      }
                    >
                      {type}
                    </Tag>{' '}
                    {c.title}
                  </div>,
                  c.owner,
                  c.type === '未知' ? '待补充' : money(c.amount),
                  <Tag key={c.id}>{c.status}</Tag>,
                  <RecordAction key={c.id} collection="costs" item={c} />,
                ]),
            )}
          />
          <h4>成本与收益结构</h4>
          <div className="pp-cost-stack">
            <span
              style={{
                width: `${contract ? Math.max(0, Math.min(100, (recorded / contract) * 100)) : 0}%`,
              }}
            >
              已记录 {contract ? Math.round((recorded / contract) * 100) : 0}%
            </span>
            <span
              style={{
                width: `${contract ? Math.max(0, Math.min(100, (estimated / contract) * 100)) : 0}%`,
              }}
            >
              估算 {contract ? Math.round((estimated / contract) * 100) : 0}%
            </span>
            <span
              style={{
                width: `${contract ? Math.max(0, Math.min(100, (profit / contract) * 100)) : 0}%`,
              }}
            >
              暂估毛利 {contract ? Math.round((profit / contract) * 100) : 0}%
            </span>
          </div>
          <div className="pp-warning">
            未知成本尚未计入，暂估毛利不能当作最终利润。请补齐外部版权、追加修改等潜在费用。
          </div>
        </Panel>
        <div>
          <Panel title="回款情况">
            <Metric title="已到账" value="¥12,000" icon="Wallet" color="teal" />
            <Metric title="待回款" value="¥8,000" icon="Clock3" />
            <p>回款与利润是不同口径，须分别核实成本、验收与到账。</p>
            <Button onClick={() => nav('receivables')}>查看回款条件</Button>
          </Panel>
          <Assistant title="经营提醒">
            <MiniCard
              tone="gold"
              title="追加成本待核实"
              content="请确认超范围修改、第三方素材与外协费用。"
            />
            <MiniCard
              title="报价需要覆盖交付风险"
              content="参考历史项目成本与修改记录，完善后续报价。"
              onClick={() => nav('requirements')}
            />
          </Assistant>
        </div>
      </div>
    </>
  );
}

function Receivables() {
  const { state, save, edit, nav } = usePpt(),
    [selected, setSelected] = useState(state.collections.receivables[0].id);
  const r = state.collections.receivables.find((r) => r.id === selected)!,
    stage = Number(r.stage || 2);
  return (
    <>
      <Heading title="回款条件与跟进" sub="业务做完，回款条件也要逐项确认">
        <AppSelect
          aria-label="回款项目"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {state.collections.receivables.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title}
            </option>
          ))}
        </AppSelect>
      </Heading>
      <div className="pp-receive-summary">
        <FileIcon />
        <div>
          <h2>
            {r.title} <Tag>{r.status}</Tag>
          </h2>
          <p>
            {r.customer}　·　负责人 {r.owner}　·　计划收款 {r.date}
          </p>
        </div>
        <strong>{money(r.amount)}</strong>
      </div>
      <div className="pp-with-assistant">
        <div>
          <Panel title="付款条件核对">
            <div className="pp-receive-conditions">
              {[
                ['合同条款', '已确认付款约定', 'FileText'],
                ['交付凭证', '成果与交付记录齐全', 'Files'],
                ['客户验收', '待客户书面确认', 'UserRoundCheck'],
                ['开票资料', '采购单号尚待补充', 'Receipt'],
                ['回款跟进', '按约定日期持续提醒', 'Bell'],
              ].map(([t, s, i], n) => (
                <AppButton
                  key={t}
                  className={n < stage ? 'done' : n === stage ? 'blocked' : ''}
                  onClick={() =>
                    edit('receivables', r, [
                      'title',
                      'content',
                      'status',
                      'date',
                      'stage',
                    ])
                  }
                >
                  <span>
                    <I name={i} size={27} />
                  </span>
                  <b>{t}</b>
                  <Tag
                    tone={n < stage ? 'green' : n === stage ? 'red' : 'gold'}
                  >
                    {n < stage ? '已完成' : '待确认'}
                  </Tag>
                  <p>{s}</p>
                </AppButton>
              ))}
            </div>
            <div className="pp-info-box">{r.content}</div>
          </Panel>
          <Panel
            title="跟进记录"
            action={
              <Button
                primary
                icon="Plus"
                onClick={() =>
                  edit('communications', {
                    id: '',
                    title: '回款跟进',
                    receivableId: r.id,
                    content: '',
                    date: localPptDate(),
                    owner: r.owner,
                    status: '已记录',
                  })
                }
              >
                新增跟进记录
              </Button>
            }
          >
            <div className="pp-followup-timeline">
              {state.collections.communications
                .filter((c) => c.receivableId === r.id)
                .map((c) => (
                  <div key={c.id}>
                    <span>{c.date}</span>
                    <i />
                    <p>{c.content}</p>
                    <Button onClick={() => edit('communications', c)}>
                      {c.title} · {c.owner}
                    </Button>
                  </div>
                ))}
              {!state.collections.communications.some(
                (c) => c.receivableId === r.id,
              ) && (
                <p className="pp-muted">
                  暂无跟进记录，请新增并保存实际沟通内容。
                </p>
              )}
            </div>
          </Panel>
        </div>
        <Assistant title="当前阻塞">
          <MiniCard
            tone="red"
            title="客户验收尚未确认"
            content="已发送验收资料，需要确认人回传验收意见。"
            onClick={() => nav('projects')}
          />
          <MiniCard
            tone="gold"
            title="采购单号待补充"
            content="开票资料未齐全，建议先联系客户财务。"
            onClick={() => edit('receivables', r, ['content', 'date'])}
          />
          <h4>下次跟进提醒</h4>
          <MiniCard
            title={r.date}
            content={`负责人：${r.owner}；核实验收与开票进度。`}
          />
          <Button
            primary
            disabled={stage >= 5}
            onClick={() =>
              quietly(
                save('receivables', {
                  ...r,
                  stage: String(Math.min(5, stage + 1)),
                  status: stage >= 4 ? '已收款' : '条件核对中',
                }),
              )
            }
          >
            {stage >= 5 ? '回款条件已全部确认' : '确认当前条件已完成'}
          </Button>
          <Button onClick={() => nav('finance')}>进入财务管理</Button>
        </Assistant>
      </div>
    </>
  );
}

function Cash() {
  const { edit, state, nav, act } = usePpt(),
    [scenario, setScenario] = useState('按期回款'),
    [opening, setOpening] = useState(state.settings.cashOpeningBalance);
  const normal = cashProjection(state),
    delayedPlan = cashProjection(state, 14),
    plan = scenario === '延迟两周' ? delayedPlan : normal,
    cashRows = [
      ['期初余额', ...plan.weeks.map((w) => w.opening)],
      ['预计回款', ...plan.incoming],
      ['待付款台账', ...plan.outgoing.map((n) => -n)],
    ];
  return (
    <>
      <Heading
        title="未来现金安排"
        sub="有收入，也要关心何时到账；比较不同回款场景下的资金变化"
      />
      <div className="pp-toolbar">
        <label>
          期初可用资金（元）
          <input
            aria-label="期初可用资金"
            type="number"
            value={opening}
            onChange={(e) => setOpening(e.target.value)}
          />
        </label>
        <Button
          onClick={() =>
            quietly(
              act('settings.save', {
                settings: { cashOpeningBalance: opening },
              }),
            )
          }
        >
          保存期初资金
        </Button>
        <small>
          依据当前回款计划与待付款台账按日期计算；逾期事项计入第1周。
        </small>
      </div>
      <div className="pp-cash-heading">
        <Tabs
          items={['按期回款', '延迟两周']}
          value={scenario}
          onChange={setScenario}
        />
        <div className="pp-metrics three">
          <Metric
            title="期初可用资金"
            value={money(plan.start)}
            icon="Wallet"
          />
          <Metric
            title="预计回款"
            value={money(plan.incoming.reduce((a, b) => a + b, 0))}
            icon="Receipt"
            color="green"
          />
          <Metric
            title="未来四周支出"
            value={money(plan.outgoing.reduce((a, b) => a + b, 0))}
            icon="ArrowUpRight"
            color="gold"
          />
        </div>
      </div>
      <div className="pp-with-assistant">
        <div>
          <Panel title={`未来四周资金安排（${scenario}）`}>
            <DataTable
              headers={['收支项目', '第1周', '第2周', '第3周', '第4周']}
              rows={cashRows.map((row) =>
                row.map((c, i) => (i ? money(c) : String(c))),
              )}
            />
            <div className="pp-cash-balance">
              {['第1周', '第2周', '第3周', '第4周'].map((s, i) => (
                <div key={s}>
                  <small>{s}预计余额</small>
                  <b className={plan.weeks[i].closing < 0 ? 'pp-red' : ''}>
                    {money(plan.weeks[i].closing)}
                  </b>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="现金余额场景对比（万元）">
            <div className="pp-chart-legend">
              <i />
              按期回款　
              <i />
              延迟两周
            </div>
            <Chart
              dual
              data={['本周', '第1周', '第2周', '第3周', '第4周'].map(
                (n, i) => ({
                  name: n,
                  a: (i ? normal.weeks[i - 1].closing : normal.start) / 10000,
                  b:
                    (i ? delayedPlan.weeks[i - 1].closing : delayedPlan.start) /
                    10000,
                }),
              )}
            />
          </Panel>
        </div>
        <Assistant title="场景比较">
          <div className="pp-two">
            <Metric
              title="按期最低余额"
              value={money(Math.min(...normal.weeks.map((w) => w.closing)))}
              color="blue"
            />
            <Metric
              title="延迟最低余额"
              value={money(
                Math.min(...delayedPlan.weeks.map((w) => w.closing)),
              )}
              color="gold"
            />
          </div>
          <div className="pp-warning">
            <I name="TriangleAlert" />
            {delayedPlan.weeks.some((w) => w.closing < 0)
              ? '延迟场景存在资金缺口，请跟进验收、开票并调整支出安排。'
              : '当前记录下未来四周余额非负；请及时补齐尚未登记的收支安排。'}
          </div>
          <h4>待办行动</h4>
          {state.collections.receivables.map((r) => (
            <MiniCard
              key={r.id}
              title={r.title}
              content={`${r.date} · ${r.status}`}
              onClick={() =>
                edit('receivables', r, ['title', 'date', 'status', 'content'])
              }
            />
          ))}
          <Button primary onClick={() => nav('receivables')}>
            核查回款计划
          </Button>
          <small>预测依据本地已登记资料，不等同于实际到账承诺。</small>
        </Assistant>
      </div>
    </>
  );
}

export function BusinessScreen({ page }: { page: string }) {
  switch (page) {
    case 'overview':
      return <Overview />;
    case 'crm':
      return <CRM />;
    case 'projects':
      return <Project />;
    case 'brandProject':
      return <Project brand />;
    case 'finance':
      return <Finance />;
    case 'tax':
      return <Tax />;
    case 'admin':
      return <Admin />;
    case 'enterprises':
      return <Enterprises />;
    case 'matching':
      return <Matching />;
    case 'orders':
      return <Orders />;
    case 'collaboration':
      return <Collaboration />;
    case 'energy':
      return <Energy />;
    case 'spaces':
      return <Spaces />;
    case 'policy':
      return <Policy />;
    case 'services':
      return <Services />;
    case 'industry':
      return <Industry />;
    case 'analytics':
      return <Analytics />;
    case 'validation':
      return <Analytics validation />;
    case 'requirements':
      return <Requirements />;
    case 'cost':
      return <Cost />;
    case 'receivables':
      return <Receivables />;
    case 'cash':
      return <Cash />;
    default:
      return null;
  }
}
