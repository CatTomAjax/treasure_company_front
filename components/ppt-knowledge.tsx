'use client';
import { AppButton, AppSelect } from '@/components/ui/app-controls';
import { useState, useRef, useEffect } from 'react';
import { localPptDate, type PptItem } from '@/lib/ppt-model';
import { extractDocument } from '@/lib/document-import';
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
  DataTable,
  Assistant,
  MiniCard,
  Steps,
  exportText,
} from './ppt-console';
export const quietly = (p: Promise<unknown>) => {
  void p.catch(() => {});
};

export function KnowledgeScreen() {
  const { state, act, save, edit, nav, notify, companyId } = usePpt(),
    [selected, setSelected] = useState('know-1'),
    [source, setSource] = useState('src-1'),
    [filter, setFilter] = useState('全部'),
    [tab, setTab] = useState('正文'),
    [question, setQuestion] = useState('如何开通企业空间？'),
    [answer, setAnswer] = useState(''),
    [answerSources, setAnswerSources] = useState<string[]>([
      'src-1',
      'src-2',
      'src-3',
    ]),
    [view, setView] = useState('知识蒸馏'),
    file = useRef<HTMLInputElement>(null);
  const sources = state.collections.sources,
    articles = state.collections.knowledge,
    article = articles.find((x) => x.id === selected) || articles[0];
  async function upload(f: File) {
    try {
      notify('正在提取资料正文…');
      const result = await extractDocument(f);
      const original = await uploadPptFile(companyId, f);
      await save('sources', {
        id: '',
        title: f.name,
        type: f.name.split('.').at(-1)?.toUpperCase() || '文档',
        category: '产品资料',
        tag: '新资料',
        size: `${(f.size / 1024 / 1024).toFixed(2)} MB`,
        status: '待审核',
        date: localPptDate(),
        content:
          typeof result === 'string'
            ? result
            : String((result as any).text || ''),
        url: original.url,
      });
    } catch (e) {
      notify((e as Error).message);
    }
  }
  return (
    <>
      <div className="pp-knowledge-top">
        <span />
        <Tabs
          items={['知识蒸馏', '知识地图', '知识资料']}
          value={view}
          onChange={setView}
        />
        <Button
          icon="Plus"
          onClick={() =>
            edit('knowledge', {
              id: '',
              title: '',
              content: '',
              category: '业务知识',
              roles: '',
              sources: source,
              status: '草稿',
            })
          }
        >
          新增知识
        </Button>
      </div>
      {view === '知识地图' ? (
        <Panel title="企业知识关系图">
          <div className="pp-large-graph">
            {sources.map((s) => (
              <AppButton key={s.id} onClick={() => edit('sources', s)}>
                <FileIcon type={s.type} />
                {s.title}
              </AppButton>
            ))}
            <I name="ArrowRight" size={42} />
            <div>
              {articles.map((a) => (
                <AppButton
                  className="pp-graph-core"
                  key={a.id}
                  onClick={() => {
                    setSelected(a.id);
                    setView('知识蒸馏');
                  }}
                >
                  {a.title}
                  <small>{a.category}</small>
                </AppButton>
              ))}
            </div>
            <I name="ArrowRight" size={42} />
            <div>
              {state.collections.roles.slice(0, 4).map((r) => (
                <AppButton key={r.id} onClick={() => nav('roles')}>
                  <I name={r.icon} />
                  {r.title}
                </AppButton>
              ))}
            </div>
          </div>
        </Panel>
      ) : view === '知识资料' ? (
        <>
          <Heading
            title="AI 工作台 · 知识资料"
            sub="沉淀企业产品、项目与岗位经验，让每次工作有所依据"
          />
          <Tabs
            items={['全部', '产品资料', '客户内容', '项目资料']}
            value={filter}
            onChange={setFilter}
          />
          <div className="pp-three">
            {sources
              .filter((s) => filter === '全部' || s.category === filter)
              .map((s) => (
                <Panel
                  key={s.id}
                  title={
                    <>
                      <FileIcon type={s.type} />
                      {s.title}
                    </>
                  }
                  action={
                    <Button icon="Pencil" onClick={() => edit('sources', s)} />
                  }
                >
                  <Tag>{s.tag}</Tag>
                  <p className="pp-article-preview">{s.content}</p>
                  <small>
                    {s.date}　{s.size}
                  </small>
                </Panel>
              ))}
          </div>
        </>
      ) : (
        <>
          <Panel title="知识蒸馏流程" className="pp-distill">
            <div className="pp-distill-steps">
              {[
                [
                  '原始资料',
                  '沉淀企业内外部真实资料',
                  '进行清洗、分类与结构化',
                  'FileText',
                ],
                [
                  '业务知识',
                  '提炼可复用的业务知识',
                  '建立关联与知识地图',
                  'Network',
                ],
                [
                  '岗位经验',
                  '沉淀岗位方法与实战经验',
                  '形成可传承的组织能力',
                  'UserRoundCog',
                ],
              ].map((a, i) => (
                <div key={a[0]}>
                  <b>{i + 1}</b>
                  <section>
                    <strong>{a[0]}</strong>
                    <p>
                      {a[1]}
                      <br />
                      {a[2]}
                    </p>
                  </section>
                  <img
                    className="pp-flow-original-icon"
                    src={asset(
                      [
                        'flow-document.jpg',
                        'flow-knowledge.jpg',
                        'flow-experience.jpg',
                      ][i],
                    )}
                    alt=""
                  />
                  {i < 2 && (
                    <I className="pp-flow-arrow" name="MoveRight" size={40} />
                  )}
                </div>
              ))}
            </div>
          </Panel>
          <div className="pp-knowledge-columns">
            <Panel
              title={
                <>
                  原始资料 <small>（{sources.length}）</small>
                </>
              }
              action={
                <Button
                  primary
                  icon="Plus"
                  onClick={() => file.current?.click()}
                >
                  上传资料
                </Button>
              }
            >
              <input
                ref={file}
                hidden
                type="file"
                accept=".pdf,.docx,.pptx,.xlsx,.txt,.md,.csv"
                onChange={(e) =>
                  e.target.files?.[0] && void upload(e.target.files[0])
                }
              />
              <Tabs
                items={['全部', '产品资料', '客户内容', '项目资料']}
                value={filter}
                onChange={setFilter}
              />
              <div className="pp-source-list">
                {sources
                  .filter((s) => filter === '全部' || s.category === filter)
                  .map((s) => (
                    <AppButton
                      key={s.id}
                      className={`pp-source-card ${source === s.id ? 'selected' : ''}`}
                      onClick={() => {
                        setSource(s.id);
                        const a = articles.find((a) =>
                          a.sources?.split(',').includes(s.id),
                        );
                        if (a) setSelected(a.id);
                      }}
                      onDoubleClick={() => edit('sources', s)}
                    >
                      <FileIcon type={s.type} />
                      <div>
                        <strong>{s.title}</strong>
                        <p>
                          <Tag tone="slate">{s.tag}</Tag> <Tag>{s.status}</Tag>
                        </p>
                        <small>
                          {s.date}　{s.size}
                        </small>
                      </div>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          edit('sources', s);
                        }}
                        aria-label={`编辑${s.title}`}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) =>
                          e.key === 'Enter' && edit('sources', s)
                        }
                      >
                        <I name="EllipsisVertical" size={16} />
                      </span>
                    </AppButton>
                  ))}
              </div>
              <Button
                icon="Sparkles"
                onClick={() => {
                  const s = sources.find((x) => x.id === source)!;
                  edit('knowledge', {
                    id: '',
                    title: s.title.replace(/\.[^.]+$/, ''),
                    content: s.content,
                    category: '业务知识',
                    roles: '运营专员',
                    sources: s.id,
                    status: '草稿',
                  });
                }}
              >
                蒸馏为业务知识
              </Button>
            </Panel>
            <Panel
              title="业务知识（知识文章）"
              action={
                <Button icon="Network" onClick={() => setView('知识地图')}>
                  查看知识地图
                </Button>
              }
            >
              <div className="pp-article-header">
                <FileIcon />
                <div>
                  <AppSelect
                    aria-label="选择知识文章"
                    value={article.id}
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    {articles.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title}
                      </option>
                    ))}
                  </AppSelect>
                  <Tag>{article.status}</Tag>{' '}
                  <Tag tone="slate">{article.version || 'v1.0'}</Tag>
                  <small>
                    所属类目：{article.category}　适用岗位：{article.roles}
                  </small>
                </div>
              </div>
              <Tabs
                items={['正文', '关键要点', '关联资料', '关联知识']}
                value={tab}
                onChange={setTab}
              />
              <div className="pp-article-body">
                {tab === '正文' ? (
                  <>
                    <div className="pp-rich-lines">
                      {article.content.split('\n').map((line, i) => (
                        <p
                          className={
                            /^[一二三四五六七八九]|^说明/.test(line)
                              ? 'strong'
                              : /^\d/.test(line)
                                ? 'step'
                                : ''
                          }
                          key={i}
                        >
                          {/^\d/.test(line) && <i>{line.charAt(0)}</i>}
                          {line.replace(/^\d\.\s*/, '')}
                        </p>
                      ))}
                    </div>
                    <Button
                      icon="Pencil"
                      onClick={() => edit('knowledge', article)}
                    >
                      编辑文章
                    </Button>
                  </>
                ) : tab === '关键要点' ? (
                  <div className="pp-info-box">
                    <I name="Info" />
                    使用经审核资料；完成企业信息、权限与成员配置；开通后按岗位安排业务。
                  </div>
                ) : tab === '关联资料' ? (
                  sources
                    .filter((s) => article.sources?.includes(s.id))
                    .map((s) => (
                      <MiniCard
                        key={s.id}
                        title={s.title}
                        content={s.category}
                        onClick={() => edit('sources', s)}
                      />
                    ))
                ) : (
                  articles
                    .filter((a) => a.id !== article.id)
                    .map((a) => (
                      <MiniCard
                        key={a.id}
                        title={a.title}
                        content={a.category}
                        onClick={() => setSelected(a.id)}
                      />
                    ))
                )}
              </div>
            </Panel>
            <Panel
              title={
                <>
                  <span className="pp-bot">
                    <I name="Bot" />
                  </span>{' '}
                  AI 助手 <small>· 基于企业知识库</small>
                </>
              }
            >
              <div className="pp-question-bubble">{question}</div>
              <div className="pp-ai-answer">
                <p>
                  {answer ||
                    '根据企业知识库中的资料，为您整理如下：\n\n开通企业空间需要登录创客云平台，在【企业空间】模块中点击【立即开通】，填写企业基本信息并选择合适的版本。提交后系统将自动完成空间创建，管理员会收到开通成功通知。详细步骤和注意事项可参考以下资料：'}
                </p>
                <div className="pp-citation-list">
                  {sources
                    .filter((s) => answerSources.includes(s.id))
                    .map((s, i) => (
                      <AppButton key={s.id} onClick={() => edit('sources', s)}>
                        <i>{i + 1}</i>
                        <FileIcon type={s.type} />
                        <span>
                          <b>{s.title}</b>
                          <small>
                            第 {i + 1} 节 · {s.tag}
                          </small>
                        </span>
                        <Tag tone="slate">{s.category}</Tag>
                        <I name="ExternalLink" size={13} />
                      </AppButton>
                    ))}
                </div>
              </div>
              <div className="pp-assistant-input">
                <input
                  aria-label="知识库提问"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' &&
                    quietly(
                      act('knowledge.ask', { question }).then((d) => {
                        setAnswer(d.answer);
                        setAnswerSources(d.sources);
                      }),
                    )
                  }
                />
                <Button
                  primary
                  icon="Send"
                  onClick={() =>
                    quietly(
                      act('knowledge.ask', { question }).then((d) => {
                        setAnswer(d.answer);
                        setAnswerSources(d.sources);
                      }),
                    )
                  }
                />
              </div>
              <div className="pp-review-note">
                <Button
                  primary
                  icon="UserRoundCheck"
                  onClick={() => nav('review')}
                >
                  人工审核
                </Button>
                <small>该答案将进入审核流程，确认后可纳入知识库。</small>
              </div>
            </Panel>
          </div>
          <div className="pp-knowledge-bottom">
            <Panel
              title="版本历史"
              action={
                <Button onClick={() => edit('knowledge', article)}>
                  查看全部 ›
                </Button>
              }
            >
              <DataTable
                headers={['版本', '更新时间', '更新人', '更新说明', '状态']}
                rows={['v1.2', 'v1.1', 'v1.0'].map((v, i) => [
                  v,
                  ['2024-06-12', '2024-05-20', '2024-04-15'][i],
                  ['李明', '王芳', '张强'][i],
                  ['补充常见问题与注意事项', '更新操作步骤截图', '初始版本'][i],
                  <Tag key={v}>已发布</Tag>,
                ])}
              />
            </Panel>
            <Panel
              title="知识关系"
              action={
                <Button onClick={() => setView('知识地图')}>
                  在知识地图中查看 ›
                </Button>
              }
            >
              <div className="pp-small-graph">
                <div>
                  {sources.slice(0, 3).map((s) => (
                    <span key={s.id}>
                      <I name="FileText" size={13} />
                      {s.title.split('.')[0].slice(0, 11)}
                    </span>
                  ))}
                </div>
                <i>⇄</i>
                <AppButton onClick={() => edit('knowledge', article)}>
                  {article.title}
                  <small>产品使用 · 操作指南</small>
                </AppButton>
                <i>⇄</i>
                <div>
                  {articles.slice(0, 3).map((a) => (
                    <span key={a.id}>{a.title}</span>
                  ))}
                </div>
              </div>
            </Panel>
            <Panel
              title="Schema 规则"
              action={
                <Button
                  onClick={() =>
                    notify(
                      '必填字段：标题、类目、适用岗位。发布前须人工确认来源。',
                    )
                  }
                >
                  查看规则配置 ›
                </Button>
              }
            >
              <DataTable
                headers={['字段名称', '类型', '是否必填', '说明']}
                rows={[
                  ['标题', '字符串', '是', '知识文章标题'],
                  ['类目', '枚举', '是', '所属知识类目'],
                  ['适用岗位', '多选', '是', '适用的岗位角色'],
                  ['关联资料', '关联', '否', '来源的原始资料'],
                  ['业务标签', '多选', '否', '业务场景标签'],
                  ['生效范围', '枚举', '否', '适用的组织范围'],
                ]}
              />
            </Panel>
          </div>
        </>
      )}
    </>
  );
}

export function RolesScreen() {
  const { state, save, act, edit, nav } = usePpt(),
    [selected, setSelected] = useState('role-1'),
    [tab, setTab] = useState('岗位概览'),
    [rightTab, setRightTab] = useState('岗位配置');
  const roles = state.collections.roles,
    role = roles.find((x) => x.id === selected) || roles[0];
  return (
    <>
      <div className="pp-role-layout">
        <div>
          <Heading
            title="AI岗位中心"
            sub="基于岗位场景的专业智能体，助力团队高效协作"
          />
          <Button icon="GitBranch" onClick={()=>nav('agents')}>真实执行岗位、能力与运行记录</Button>
          <Tabs
            items={['岗位概览', '任务视图', '运行记录', '知识配置', '权限管理']}
            value={tab}
            onChange={setTab}
          />
          {tab === '岗位概览' ? (
            <div className="pp-role-grid">
              {roles.map((r) => (
                <AppButton
                  className={`pp-role-card ${r.id === role.id ? 'selected' : ''}`}
                  key={r.id}
                  onClick={() => {
                    setSelected(r.id);
                    setRightTab('岗位配置');
                  }}
                >
                  <img
                    className="pp-role-original-icon"
                    src={asset(
                      [
                        'role-operations.jpg',
                        'role-sales.jpg',
                        'role-project.jpg',
                        'role-finance.jpg',
                        'role-policy.jpg',
                        'role-service.jpg',
                      ][roles.indexOf(r) % 6],
                    )}
                    alt=""
                  />
                  {r.id === role.id && <Tag tone="green">● 当前使用</Tag>}
                  <h2>{r.title}</h2>
                  <small>{r.subtitle}</small>
                  <p>{r.content}</p>
                  <footer>
                    {r.goals.split('\n').map((s, i) => (
                      <span key={i}>
                        <I
                          name={['FileText', 'Link', 'Users'][i % 3]}
                          size={13}
                        />
                        {s.length > 8
                          ? ['内容创作', '活动策划', '数据分析'][i % 3]
                          : s}
                      </span>
                    ))}
                  </footer>
                </AppButton>
              ))}
            </div>
          ) : tab === '任务视图' ? (
            <div className="pp-three">
              {state.collections.contents.map((c) => (
                <Panel key={c.id} title={c.title}>
                  <Tag>{c.status}</Tag>
                  <p>{c.content.slice(0, 80)}</p>
                  <Button onClick={() => nav('content')}>打开任务</Button>
                </Panel>
              ))}
            </div>
          ) : tab === '运行记录' ? (
            <DataTable
              headers={['时间', '岗位', '操作内容', '状态']}
              rows={state.events
                .slice()
                .reverse()
                .map((e) => [e.time, role.title, e.title, '已记录'])}
            />
          ) : tab === '知识配置' ? (
            <Panel title="绑定岗位知识">
              {state.collections.knowledge.map((k) => (
                <label className="pp-check-line" key={k.id}>
                  <input
                    type="checkbox"
                    checked={role.knowledge?.split(',').includes(k.id) || false}
                    onChange={(e) => {
                      const ids = new Set(
                        role.knowledge?.split(',').filter(Boolean),
                      );
                      e.target.checked ? ids.add(k.id) : ids.delete(k.id);
                      quietly(
                        save('roles', {
                          ...role,
                          knowledge: [...ids].join(','),
                        }),
                      );
                    }}
                  />
                  {k.title}
                  <Tag>{k.status}</Tag>
                </label>
              ))}
            </Panel>
          ) : (
            <Panel title="岗位工具与审核权限">
              <MiniCard
                title="外发与发布"
                content={`需 ${role.review} 审核确认`}
              />
              <MiniCard title="工具授权" content={role.tools} />
              <Button
                primary
                onClick={() =>
                  edit('roles', role, ['title', 'tools', 'review', 'prompt'])
                }
              >
                编辑岗位权限
              </Button>
            </Panel>
          )}
        </div>
        <Panel className="pp-role-detail">
          <div className="pp-role-detail-head">
            <img
              className="pp-role-original-icon"
              src={asset(
                [
                  'role-operations.jpg',
                  'role-sales.jpg',
                  'role-project.jpg',
                  'role-finance.jpg',
                  'role-policy.jpg',
                  'role-service.jpg',
                ][roles.indexOf(role) % 6],
              )}
              alt=""
            />
            <div>
              <h2>{role.title}</h2>
              <small>{role.subtitle}</small>
              <p>{role.content}</p>
            </div>
            <AppButton
              onClick={() =>
                quietly(
                  save('roles', {
                    ...role,
                    status: role.status === '已启用' ? '已停用' : '已启用',
                  }),
                )
              }
            >
              <Tag>{role.status}</Tag>
            </AppButton>
          </div>
          <Tabs
            items={['岗位配置', '提示词设置', '知识库', '工具权限', '运行记录']}
            value={rightTab}
            onChange={setRightTab}
          />
          {rightTab === '岗位配置' ? (
            <div className="pp-role-sections">
              {[
                ['工作目标', 'Target', 'goals'],
                ['知识范围', 'BookOpen', 'scope'],
                ['可用工具', 'Wrench', 'tools'],
                ['审核节点', 'Users', 'review'],
              ].map(([label, icon, key], i) => (
                <section key={key}>
                  <header>
                    <b>
                      <i>{i + 1}</i>
                      {label}
                    </b>
                    <Button onClick={() => edit('roles', role, [key])}>
                      编辑
                    </Button>
                  </header>
                  <div className="pp-role-section-body">
                    <I name={icon} size={35} />
                    {key === 'review' ? (
                      <div className="pp-approval-flow">
                        <span>
                          <I name="FileText" />
                          AI生成初稿
                        </span>
                        <i>→</i>
                        <span>
                          <I name="User" />
                          {role.review}审核
                        </span>
                        <i>→</i>
                        <span>
                          <I name="Send" />
                          发布执行
                        </span>
                      </div>
                    ) : key === 'tools' ? (
                      <div className="pp-tools-tags">
                        {role.tools.split(',').map((t) => (
                          <Tag tone="slate" key={t}>
                            {t}
                          </Tag>
                        ))}
                      </div>
                    ) : (
                      <ul>
                        {role[key].split('\n').map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
              ))}
            </div>
          ) : rightTab === '提示词设置' ? (
            <div className="pp-detail-pad">
              <h3>岗位系统提示词</h3>
              <p className="pp-preserve">{role.prompt}</p>
              <Button primary onClick={() => edit('roles', role, ['prompt'])}>
                编辑提示词
              </Button>
            </div>
          ) : rightTab === '知识库' ? (
            <div className="pp-detail-pad">
              {state.collections.knowledge.map((k) => (
                <label className="pp-check-line" key={k.id}>
                  <input
                    type="checkbox"
                    checked={role.knowledge?.split(',').includes(k.id) || false}
                    onChange={(e) => {
                      const ids = new Set(
                        role.knowledge?.split(',').filter(Boolean),
                      );
                      e.target.checked ? ids.add(k.id) : ids.delete(k.id);
                      quietly(
                        save('roles', {
                          ...role,
                          knowledge: [...ids].join(','),
                        }),
                      );
                    }}
                  />
                  {k.title}
                </label>
              ))}
            </div>
          ) : rightTab === '工具权限' ? (
            <div className="pp-detail-pad">
              <p>{role.tools}</p>
              <p>审核人：{role.review}</p>
              <Button onClick={() => edit('roles', role, ['tools', 'review'])}>
                配置工具权限
              </Button>
            </div>
          ) : (
            <DataTable
              headers={['时间', '运行记录']}
              rows={state.events
                .slice(-10)
                .reverse()
                .map((e) => [e.time, e.title])}
            />
          )}
        </Panel>
      </div>
      <Panel className="pp-role-result">
        <b>任务执行结果</b>
        <FileIcon />
        <div>
          <strong>内容初稿已完成，待人工审核</strong>
          <p>已生成活动策划方案及推广内容，共3个文档、5张配图</p>
        </div>
        <small>生成时间：2024-06-12 14:28</small>
        <Button onClick={() => nav('workflow')}>查看详情</Button>
        <Steps labels={['内容生成', '人工审核', '发布执行']} current={1} />
      </Panel>
    </>
  );
}

export function WorkflowScreen() {
  const { state, act, save, nav, edit, busy } = usePpt(),
    [stageFilter, setStageFilter] = useState('全部阶段'),
    [typeFilter, setTypeFilter] = useState('全部操作类型');
  const run =
      state.collections.runs.find((r) => r.id === state.settings.activeRun) ||
      state.collections.runs[0],
    stage = Number(run.stage || state.settings.workflowStage),
    labels = ['需求整理', '内容生成', '人工审核', '成果归档'],
    roleNames = ['需求分析师', 'AI内容创作师', '项目审核专员', '知识管理员'];
  return (
    <>
      <div className="pp-workflow-heading">
        <Heading
          title="AI协同工作流"
          sub="让专业的AI角色，与人一起，把想法变成可落地的成果"
        >
          <Button icon="GitBranch" onClick={()=>nav('agents')}>进入 Agent 并行执行中心</Button>
          <AppSelect
            aria-label="选择协同任务"
            value={run.id}
            onChange={(e) =>
              quietly(
                act('settings.save', {
                  settings: { activeRun: e.target.value },
                }),
              )
            }
          >
            {state.collections.runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </AppSelect>
          <Button
            icon="Plus"
            onClick={() =>
              edit(
                'runs',
                {
                  id: '',
                  title: '新协同任务',
                  stage: '0',
                  status: '待执行',
                  content: '',
                  owner: '张三',
                },
                ['title', 'content', 'owner'],
              )
            }
          >
            新建任务
          </Button>
        </Heading>
        <Panel
          title={
            <>
              项目进度：企业服务方案 <small>{Math.min(stage + 1, 4)} / 4</small>
            </>
          }
        >
          <Steps labels={labels} current={stage} />
          <b className="pp-percent">{Math.min(100, (stage + 1) * 25)}%</b>
        </Panel>
      </div>
      <div className="pp-workflow-grid">
        <div>
          <Panel title="工作流程">
            <div className="pp-relay">
              {labels.map((s, i) => (
                <div
                  key={s}
                  className={`pp-relay-card ${stage === i ? 'selected' : ''} ${i < stage ? 'done' : ''}`}
                >
                  <header>
                    <span>{String(i + 1).padStart(2, '0')}</span>
                    <b>{s}</b>
                    <I name={i < stage ? 'CircleCheck' : 'Circle'} size={19} />
                  </header>
                  <div>
                    <img
                      src={asset(
                        [
                          'avatar-analyst.jpg',
                          'avatar-robot.jpg',
                          'avatar-reviewer.jpg',
                          'avatar-librarian.jpg',
                        ][i],
                      )}
                      alt={roleNames[i]}
                    />
                    <section>
                      <b>{roleNames[i]}</b>
                      <p>
                        {
                          [
                            '根据背景、目标与关键需求形成任务说明书',
                            '基于知识库与行业经验生成多形式内容稿件',
                            '从专业性、合规性、品牌调性等维度进行审核优化',
                            '整理最终文件，归档至项目及知识库，便于后续复用',
                          ][i]
                        }
                      </p>
                    </section>
                  </div>
                  {i < 3 && <I name="ArrowRight" className="pp-relay-arrow" />}
                </div>
              ))}
            </div>
          </Panel>
          <Panel className="pp-current-task">
            <header>
              <FileIcon />
              <div>
                <h3>当前任务　{run.title}</h3>
                <p>{run.content}</p>
              </div>
              <small>创建时间：2024-12-10 14:20　负责人：张三</small>
              <Tag>{run.status}</Tag>
            </header>
            <section>
              <h4>生成成果（3个文件）</h4>
              <div className="pp-three">
                {[
                  ['文案初稿.docx', 'Word', '企业服务方案文案初稿'],
                  ['宣传海报.png', '图片', '企业服务方案宣传海报'],
                  ['项目计划.xlsx', 'Excel', '企业服务方案项目计划表'],
                ].map(([name, type, sub], i) => (
                  <AppButton
                    className="pp-result-file"
                    key={name}
                    onClick={() => nav(['documents', 'brand', 'projects'][i])}
                  >
                    <FileIcon type={type} />
                    <div>
                      <b>{name}</b>
                      <p>{sub}</p>
                      <small>
                        {[2.4, 1.8, 1.1][i]} MB | 2024-12-10 15:{28 + i * 3}
                      </small>
                    </div>
                    <Tag>{stage > 2 ? '已确认' : '待审核'}</Tag>
                  </AppButton>
                ))}
              </div>
            </section>
          </Panel>
        </div>
        <Panel
          title="AI工作记录"
          action={
            <Button icon="RefreshCw" onClick={() => nav('workflow')}>
              刷新
            </Button>
          }
        >
          <div className="pp-event-timeline">
            {state.events.slice(-5).map((e, i) => (
              <div key={e.id}>
                <span className={i === 2 ? 'gold' : 'teal'}>
                  <I
                    name={
                      e.type === 'knowledge'
                        ? 'BookOpen'
                        : e.type === 'review'
                          ? 'Clock3'
                          : 'FileText'
                    }
                    size={23}
                  />
                </span>
                <section>
                  <b>
                    {e.title} <small>{e.time}</small>
                  </b>
                  <p>{e.content}</p>
                  <AppButton
                    onClick={() =>
                      nav(
                        e.type === 'knowledge'
                          ? 'knowledge'
                          : e.type === 'review'
                            ? 'review'
                            : 'documents',
                      )
                    }
                  >
                    查看相关资料 ›
                  </AppButton>
                </section>
              </div>
            ))}
          </div>
          <Button
            primary
            icon="Hand"
            onClick={() =>
              quietly(
                act('settings.save', {
                  settings: {
                    workflowTakeover:
                      state.settings.workflowTakeover === '1' ? '0' : '1',
                  },
                }),
              )
            }
          >
            {state.settings.workflowTakeover === '1'
              ? '已进入人工接管 · 恢复AI'
              : '人工接管'}
          </Button>
          {state.settings.workflowTakeover === '1' && (
            <Button
              onClick={() => edit('runs', run, ['title', 'content', 'owner'])}
            >
              编辑当前任务
            </Button>
          )}
          <div className="pp-workflow-actions">
            {stage === 2 ? (
              <>
                <Button onClick={() => nav('review')}>查看审核依据</Button>
                <Button
                  primary
                  disabled={busy}
                  icon="Check"
                  onClick={() =>
                    quietly(act('workflow.advance', { approved: true }))
                  }
                >
                  人工审核通过
                </Button>
              </>
            ) : stage < 4 ? (
              <Button
                primary
                disabled={busy}
                onClick={() => quietly(act('workflow.advance'))}
              >
                {stage === 3 ? '归档成果并沉淀知识' : '执行下一岗位'}
              </Button>
            ) : (
              <Tag tone="green">成果已归档 · 经验已回库</Tag>
            )}
          </div>
        </Panel>
      </div>
      <Panel
        title="任务执行日志"
        action={
          <div className="pp-inline">
            <AppSelect
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
            >
              {['全部阶段', ...labels].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </AppSelect>
            <AppSelect
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              {['全部操作类型', '知识引用', '文件生成', '状态更新'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </AppSelect>
            <input
              aria-label="日志日期"
              type="date"
              defaultValue="2024-12-10"
            />
          </div>
        }
      >
        <DataTable
          headers={[
            '时间',
            '阶段',
            '操作类型',
            '操作内容',
            '相关文件 / 来源',
            '执行人',
          ]}
          rows={state.events
            .slice()
            .reverse()
            .filter(
              (e) =>
                stageFilter === '全部阶段' ||
                (e.type === 'review' ? '人工审核' : '内容生成') === stageFilter,
            )
            .filter(
              (e) =>
                typeFilter === '全部操作类型' ||
                (e.type === 'knowledge'
                  ? '知识引用'
                  : e.type === 'review'
                    ? '状态更新'
                    : '文件生成') === typeFilter,
            )
            .map((e) => [
              `2024-12-10 ${e.time}`,
              e.type === 'review' ? '人工审核' : '内容生成',
              e.type === 'knowledge'
                ? '知识引用'
                : e.type === 'review'
                  ? '状态更新'
                  : '文件生成',
              e.title,
              '企业服务方案',
              e.type === 'review' ? '系统' : 'AI内容创作师',
            ])}
        />
      </Panel>
    </>
  );
}

function ContentEditor({
  item,
  onClose,
}: {
  item: PptItem;
  onClose: () => void;
}) {
  const { save, busy, notify } = usePpt(),
    [draft, setDraft] = useState({ ...item }),
    [error, setError] = useState('');
  async function persist(status = draft.status) {
    setError('');
    try {
      if (status === '已发布' && draft.checks !== '111')
        throw new Error('请完成三项审核检查后发布');
      await save('contents', { ...draft, status });
      setDraft({ ...draft, status });
      notify(
        status === '已发布'
          ? '内容已在演示空间发布，外部渠道请从接入中心配置'
          : '内容已保存',
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="pp-modal-shade pp-content-shade">
      <section
        className="pp-modal pp-content-editor"
        role="dialog"
        aria-modal="true"
        aria-label="内容工作台"
      >
        <header>
          <div>
            <h2>
              内容工作台 <Tag>{draft.status}</Tag>
            </h2>
            <p>
              {draft.type} · {draft.channel} · 演示内容
            </p>
          </div>
          <Button icon="X" onClick={onClose} title="关闭内容工作台" />
        </header>
        <div className="pp-content-editor-grid">
          <div>
            <label>
              内容标题
              <input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </label>
            <label className="pp-body-label">
              正文 <small>{draft.content.length} 字符</small>
              <textarea
                aria-label="内容正文"
                value={draft.content}
                onChange={(e) =>
                  setDraft({ ...draft, content: e.target.value })
                }
              />
            </label>
          </div>
          <aside>
            <label>
              负责人
              <input
                value={draft.owner}
                onChange={(e) => setDraft({ ...draft, owner: e.target.value })}
              />
            </label>
            <label>
              计划日期
              <input
                type="date"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              />
            </label>
            <label>
              审核意见 / 协作备注
              <textarea
                rows={6}
                value={draft.comment || ''}
                onChange={(e) =>
                  setDraft({ ...draft, comment: e.target.value })
                }
              />
            </label>
            <label>审核检查</label>
            {[
              '品牌名称与事实准确',
              '数据、日期与来源已核实',
              '发布文案与渠道要求一致',
            ].map((s, i) => (
              <label className="pp-check-line" key={s}>
                <input
                  type="checkbox"
                  checked={draft.checks?.[i] === '1'}
                  onChange={(e) => {
                    const bits = (draft.checks || '000').split('');
                    bits[i] = e.target.checked ? '1' : '0';
                    setDraft({ ...draft, checks: bits.join('') });
                  }}
                />
                {s}
              </label>
            ))}
            <Button
              icon="Download"
              onClick={() => exportText(draft.title, draft.content)}
            >
              下载 Markdown 文稿
            </Button>
            <Button onClick={() => void persist('待审核')}>提交人工审核</Button>
            <Button primary onClick={() => void persist('已发布')}>
              审核通过并发布
            </Button>
          </aside>
        </div>
        {error && (
          <p className="pp-error" role="alert">
            {error}
          </p>
        )}
        <footer>
          <small>示例数据保存于本地数据库；外部发布需配置渠道接口。</small>
          <Button
            primary
            disabled={busy}
            icon="Save"
            onClick={() => void persist()}
          >
            保存内容
          </Button>
        </footer>
      </section>
    </div>
  );
}
export function ContentScreen() {
  const { state, act, busy, edit } = usePpt(),
    [selected, setSelected] = useState<PptItem | null>(null),
    [tab, setTab] = useState('团队协作'),
    [filter, setFilter] = useState('全部'),
    [brief, setBrief] = useState('让好创意，发生在前海'),
    [type, setType] = useState('招商文案'),
    [creationBrief, setCreationBrief] = useState(
      '面向创新企业团队，介绍前海创客中心的空间与企业服务。语气简洁、专业，避免未经核实的承诺。',
    );
  const content = state.collections.contents;
  return (
    <>
      <Heading
        title="AI 工作台"
        sub="连接知识、岗位与业务，让每一次创作都有依据"
      />
      <Tabs
        items={['知识资料', '内容创作', '团队协作', 'AI岗位', '执行记录']}
        value={tab}
        onChange={setTab}
      />
      {tab === '内容创作' ? (
        <div className="pp-content-create">
          <Panel title="创建企业专属内容">
            <div className="pp-tools-tags">
              {['招商文案', '活动策划', '品牌内容', '运营汇报', '视频脚本'].map(
                (t) => (
                  <Button
                    key={t}
                    primary={type === t}
                    onClick={() => setType(t)}
                  >
                    {t}
                  </Button>
                ),
              )}
            </div>
            <label>
              内容标题
              <input value={brief} onChange={(e) => setBrief(e.target.value)} />
            </label>
            <label>
              创作需求
              <textarea
                rows={9}
                value={creationBrief}
                onChange={(e) => setCreationBrief(e.target.value)}
              />
            </label>
            <Button
              primary
              icon="Sparkles"
              disabled={busy}
              onClick={() =>
                quietly(
                  act('content.generate', {
                    title: brief,
                    type,
                    brief: creationBrief,
                  }).then((d) => {
                    setSelected(d.state.collections.contents[0]);
                    setTab('团队协作');
                  }),
                )
              }
            >
              生成初稿
            </Button>
          </Panel>
          <Assistant>
            <h3>让内容创作有据可循</h3>
            <p>从企业产品资料、项目经验与品牌规范开始。</p>
            {state.collections.knowledge.map((k) => (
              <MiniCard
                key={k.id}
                title={k.title}
                content={k.category}
                onClick={() => edit('knowledge', k)}
              />
            ))}
            <Tag tone="gold">当前：本地规则生成</Tag>
          </Assistant>
        </div>
      ) : tab === '执行记录' ? (
        <DataTable
          headers={['时间', '操作内容', '来源']}
          rows={state.events
            .slice()
            .reverse()
            .map((e) => [e.time, e.title, e.content])}
        />
      ) : tab === '知识资料' ? (
        <div className="pp-three">
          {state.collections.knowledge.map((k) => (
            <Panel key={k.id} title={k.title}>
              <p>{k.content.slice(0, 120)}</p>
              <Button onClick={() => edit('knowledge', k)}>查看资料</Button>
            </Panel>
          ))}
        </div>
      ) : tab === 'AI岗位' ? (
        <div className="pp-three">
          {state.collections.roles.map((r) => (
            <Panel title={r.title} key={r.id}>
              <p>{r.content}</p>
              <Button onClick={() => edit('roles', r)}>配置岗位</Button>
            </Panel>
          ))}
        </div>
      ) : (
        <>
          <div className="pp-toolbar">
            <Tabs
              items={['全部', '草稿', '待审核', '已发布']}
              value={filter}
              onChange={setFilter}
            />
            <Button primary icon="Plus" onClick={() => setTab('内容创作')}>
              创建内容
            </Button>
          </div>
          <div className="pp-content-board">
            {['草稿', '进行中', '待审核', '已发布'].map((s, i) => (
              <div className={`pp-kanban-column tone-${i}`} key={s}>
                <header>
                  <b>{s}</b>
                  <Tag tone="slate">
                    {content.filter((c) => c.status === s).length}
                  </Tag>
                </header>
                {content
                  .filter(
                    (c) =>
                      c.status === s &&
                      (filter === '全部' || c.status === filter),
                  )
                  .map((c) => (
                    <AppButton
                      className="pp-content-card"
                      key={c.id}
                      onClick={() => setSelected(c)}
                    >
                      <Tag tone="slate">{c.type}</Tag>
                      <h3>{c.title}</h3>
                      <p>{c.content.slice(0, 100)}</p>
                      <footer>
                        <span>{c.channel}</span>
                        <span>{c.owner}</span>
                      </footer>
                      <small>{c.date}</small>
                    </AppButton>
                  ))}
              </div>
            ))}
          </div>
        </>
      )}
      {selected && (
        <ContentEditor
          key={selected.id}
          item={content.find((c) => c.id === selected.id) || selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

export function ReviewScreen() {
  const { state, save, act, edit, nav } = usePpt();
  const quotation =
    state.collections.quotations.find(
      (q) => q.id === state.settings.activeQuotation,
    ) || state.collections.quotations[0];
  const [checks, setChecks] = useState([false, false]),
    [text, setText] = useState(quotation.content || '');
  useEffect(
    () => setText(quotation.content || ''),
    [quotation.id, quotation.content],
  );
  return (
    <>
      <Heading
        title="AI 成果核对工作台"
        sub="逐项核对依据、范围与待确认事项，再进入业务执行"
      />
      <div className="pp-review-grid">
        <Panel
          title={
            <>
              方案报价初稿 <Tag tone="gold">待人工核对</Tag>
            </>
          }
          action={
            <Button icon="Pencil" onClick={() => edit('quotations', quotation)}>
              报价版本
            </Button>
          }
        >
          <div className="pp-review-document">
            <h2>{quotation.title}</h2>
            <small>AI草稿 · 本地规则模式 · v1.2</small>
            <textarea
              aria-label="报价初稿"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="pp-info-box">
              <I name="Info" />
              本报价为演示草稿，金额、范围、周期须由负责人确认。
            </div>
          </div>
        </Panel>
        <div>
          <Panel title="引用依据与原文">
            <div className="pp-source-list">
              {state.collections.sources.map((s, i) => (
                <AppButton
                  className="pp-source-card"
                  key={s.id}
                  onClick={() => edit('sources', s)}
                >
                  <FileIcon type={s.type} />
                  <div>
                    <strong>
                      {i + 1}. {s.title}
                    </strong>
                    <p>{s.content.slice(0, 90)}…</p>
                    <small>查看原文 ›</small>
                  </div>
                </AppButton>
              ))}
            </div>
          </Panel>
          <Panel title="待人工确认事项">
            <div className="pp-warning">
              修改轮次与追加费用尚未取得客户书面确认。
            </div>
            {['确认报价范围与修改轮次', '确认超出范围的费用及工期影响'].map(
              (t, i) => (
                <label key={t} className="pp-check-line">
                  <input
                    type="checkbox"
                    checked={checks[i]}
                    onChange={(e) =>
                      setChecks(
                        checks.map((v, j) => (j === i ? e.target.checked : v)),
                      )
                    }
                  />
                  {t}
                </label>
              ),
            )}
          </Panel>
          <div className="pp-toolbar">
            <Button
              onClick={() =>
                quietly(
                  save('quotations', {
                    ...quotation,
                    content: text,
                    status: '草稿',
                  }),
                )
              }
            >
              保存修订版本
            </Button>
            <Button
              primary
              disabled={!checks.every(Boolean)}
              onClick={() =>
                quietly(
                  act('quotation.confirm', {
                    id: (
                      state.collections.quotations.find(
                        (q) => q.id === state.settings.activeQuotation,
                      ) || quotation
                    ).id,
                    content: text,
                    checks,
                  }).then(() => nav('projects')),
                )
              }
            >
              确认后进入项目
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export function ImportScreen() {
  const { state, save, act, edit, notify, companyId, busy } = usePpt(),
    [selected, setSelected] = useState(state.collections.imports[0].id),
    [fields, setFields] = useState({
      客户名称: '创客产业园',
      合同编号: 'QH-2026-001',
      合同金额: '50000',
      付款节点: '验收及开票后30日',
      负责人: '李思远',
    }),
    [targets, setTargets] = useState(['客户档案', '项目管理', '合同订单']),
    file = useRef<HTMLInputElement>(null);
  const source =
    state.collections.imports.find((s) => s.id === selected) ||
    state.collections.imports[0];
  useEffect(() => {
    try {
      setFields(
        source.mapping
          ? JSON.parse(source.mapping)
          : {
              客户名称: '',
              合同编号: '',
              合同金额: '0',
              付款节点: '',
              负责人: '',
            },
      );
      setTargets(
        source.targets
          ? JSON.parse(source.targets)
          : ['客户档案', '项目管理', '合同订单'],
      );
    } catch {
      notify('字段配置读取失败，请重新校正');
    }
  }, [source.id]);
  return (
    <>
      <Heading
        title="资料与人一次录入"
        sub="保留原文、校正字段，按授权复用到多个业务对象"
      />
      <div className="pp-three pp-import-banners">
        <MiniCard
          icon="FileText"
          title="原文完整保留"
          content="资料摘要与识别来源可追溯"
        />
        <MiniCard
          icon="ListChecks"
          title="字段可人工校正"
          content="确认后再生成业务记录"
        />
        <MiniCard
          icon="TriangleAlert"
          tone="gold"
          title="重复记录待确认"
          content="先核对企业、编号与金额"
        />
      </div>
      <div className="pp-import-grid">
        <Panel
          title="1 上传资料"
          action={
            <Button icon="Upload" onClick={() => file.current?.click()}>
              上传
            </Button>
          }
        >
          <input
            hidden
            ref={file}
            type="file"
            accept=".pdf,.docx,.xlsx,.txt,.csv"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const text = await extractDocument(f);
                const stored = await uploadPptFile(companyId, f);
                await save('imports', {
                  id: '',
                  title: f.name,
                  type: f.name.split('.').at(-1) || '文档',
                  status: '待确认',
                  count: '0',
                  content:
                    typeof text === 'string'
                      ? text
                      : String((text as any).text),
                  url: stored.url,
                  mapping: JSON.stringify({
                    客户名称: '',
                    合同编号: '',
                    合同金额: '0',
                    付款节点: '',
                    负责人: '',
                  }),
                });
              } catch (e) {
                notify((e as Error).message);
              }
            }}
          />
          {state.collections.imports.map((s) => (
            <AppButton
              className={`pp-source-card ${selected === s.id ? 'selected' : ''}`}
              key={s.id}
              onClick={() => setSelected(s.id)}
            >
              <FileIcon type={s.type} />
              <div>
                <b>{s.title}</b>
                <p>{s.content.slice(0, 65)}</p>
                <Tag>{s.status}</Tag>
              </div>
            </AppButton>
          ))}
        </Panel>
        <Panel title="2 字段识别与人工确认">
          <p className="pp-muted">
            当前来源：
            {state.collections.imports.find((s) => s.id === selected)?.title}
          </p>
          {Object.entries(fields).map(([k, v]) => (
            <label className="pp-mapping-row" key={k}>
              <b>{k}</b>
              <span>→</span>
              <input
                aria-label={k}
                value={v}
                onChange={(e) => setFields({ ...fields, [k]: e.target.value })}
              />
              <I name="CircleCheck" size={16} />
            </label>
          ))}
          <Button
            onClick={() =>
              edit(
                'imports',
                state.collections.imports.find((s) => s.id === selected)!,
              )
            }
          >
            查看原文与识别内容
          </Button>
        </Panel>
        <Panel title="3 复用到业务对象">
          {['客户档案', '项目管理', '合同订单', '回款计划', '企业知识'].map(
            (t) => (
              <label className="pp-reuse-target" key={t}>
                <I
                  name={t === '企业知识' ? 'BookOpen' : 'BriefcaseBusiness'}
                  size={28}
                />
                <span>
                  <b>{t}</b>
                  <small>使用已确认字段创建演示记录</small>
                </span>
                <input
                  type="checkbox"
                  checked={targets.includes(t)}
                  onChange={(e) =>
                    setTargets(
                      e.target.checked
                        ? [...targets, t]
                        : targets.filter((x) => x !== t),
                    )
                  }
                />
              </label>
            ),
          )}
          <Button
            primary
            icon="Check"
            disabled={busy}
            onClick={async () => {
              try {
                await act('import.confirm', { id: source.id, fields, targets });
              } catch {}
            }}
          >
            确认字段并复用
          </Button>
        </Panel>
      </div>
      <Panel title="导入审核记录">
        <DataTable
          headers={['时间', '来源', '类型', '字段数', '操作者', '状态', '操作']}
          rows={state.collections.imports.map((s) => [
            s.date || '2026-10-27',
            s.title,
            s.type,
            s.count || 5,
            '管理员',
            <Tag key={s.id}>{s.status}</Tag>,
            <Button key={s.id} onClick={() => edit('imports', s)}>
              查看详情
            </Button>,
          ])}
        />
      </Panel>
    </>
  );
}
