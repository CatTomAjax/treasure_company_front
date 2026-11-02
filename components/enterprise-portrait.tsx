'use client';

import { AppButton, AppSelect } from '@/components/ui/app-controls';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Building2,
  Check,
  ChevronRight,
  CircleHelp,
  FileCheck2,
  Fingerprint,
  Globe2,
  Layers3,
  Link2,
  ListFilter,
  LoaderCircle,
  MapPin,
  Network,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Waypoints,
  X,
} from 'lucide-react';
import { callApi, saveBlob, localToday } from '@/lib/platform-client';
import {
  relationLabels,
  type PortraitGraph,
  type PortraitNode,
  type PortraitLink,
  type RelationType,
} from '@/lib/enterprise-portrait';
import { demoPortraitGraph } from '@/lib/enterprise-portrait-demo';
import type { ModelTarget } from '@/lib/model-settings';
import type { BusinessRecord } from '@/lib/platform-config';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import EnterpriseGraph, { edgeColor, industryColor } from './enterprise-graph';
import './enterprise-portrait.css';

type Snapshot = {
  graph: PortraitGraph;
  fingerprint: string;
  model?: ModelTarget;
  modelReady?: boolean;
  canWrite: boolean;
  canReview?: boolean;
  analysis?: { provider: string; at: string } | null;
};
const emptyGraph: PortraitGraph = {
  nodes: [],
  links: [],
  sources: [],
  mode: 'business',
  generatedAt: '',
  truncated: false,
};
const labelDate = (s: string) =>
  s
    ? new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(s))
    : '尚未更新';
const count = (graph: PortraitGraph, id: string) =>
  graph.links.filter((l) => l.source === id || l.target === id).length;

export default function EnterprisePortrait({
  companyId,
  initialDemo = false,
}: {
  companyId: string;
  initialDemo?: boolean;
}) {
  const [demo, setDemo] = useState(initialDemo);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(
    initialDemo
      ? { graph: demoPortraitGraph(), fingerprint: 'demo', canWrite: false }
      : null,
  );
  const [loading, setLoading] = useState(false),
    [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [query, setQuery] = useState(''),
    [industry, setIndustry] = useState('全部行业');
  const [relation, setRelation] = useState<RelationType | 'all'>('all');
  const [view, setView] = useState<'network' | 'directory' | 'opportunities'>(
    'network',
  );
  const [selectedId, setSelectedId] = useState(''),
    [selectedLink, setSelectedLink] = useState('');
  const [panelTab, setPanelTab] = useState<'profile' | 'relations' | 'sources'>(
    'profile',
  );
  const [confirmAI, setConfirmAI] = useState(false),
    [help, setHelp] = useState(false);
  const [editor, setEditor] = useState<BusinessRecord | 'new' | null>(null);
  const [following, setFollowing] = useState('');
  const epoch = useRef(0);
  const analyzingRef = useRef(false);
  analyzingRef.current = analyzing;
  const graph = snapshot?.graph || emptyGraph;
  const refresh = useCallback(
    async (quiet = false) => {
      const request = ++epoch.current;
      if (demo) {
        setSnapshot({
          graph: demoPortraitGraph(),
          fingerprint: 'demo',
          canWrite: false,
        });
        setLoading(false);
        setError('');
        return;
      }
      if (!quiet) setLoading(true);
      try {
        const next = await callApi<Snapshot>(
          `/api/platform/portrait?companyId=${encodeURIComponent(companyId)}`,
        );
        if (request === epoch.current) {
          setSnapshot(next);
          setError('');
        }
      } catch (e) {
        if (request === epoch.current && !quiet) setError((e as Error).message);
      } finally {
        if (request === epoch.current) setLoading(false);
      }
    },
    [companyId, demo],
  );
  useEffect(() => {
    setSnapshot(null);
    setSelectedId('');
    setSelectedLink('');
    setNotice('');
    setError('');
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible' && !analyzingRef.current)
        void refresh(true);
    }, 45000);
    return () => {
      clearInterval(timer);
      epoch.current++;
    };
  }, [refresh]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 7000);
    return () => clearTimeout(timer);
  }, [notice]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const found = graph.nodes.filter(
      (n) =>
        (industry === '全部行业' || n.industry === industry) &&
        (!q ||
          [
            n.name,
            n.industry,
            n.summary,
            ...n.capabilities,
            ...n.needs,
            ...n.cases,
          ]
            .join(' ')
            .toLowerCase()
            .includes(q)),
    );
    const ids = new Set(found.map((n) => n.id));
    const links = graph.links.filter(
      (l) =>
        ids.has(l.source) &&
        ids.has(l.target) &&
        (relation === 'all' || l.type === relation),
    );
    return { ...graph, nodes: found, links };
  }, [graph, query, industry, relation]);
  const selected =
    filtered.nodes.find((n) => n.id === selectedId) ||
    filtered.nodes.find((n) => n.own) ||
    filtered.nodes[0];
  const selectedRelations = selected
    ? filtered.links.filter(
        (l) => l.source === selected.id || l.target === selected.id,
      )
    : [];
  const activeLink = filtered.links.find((l) => l.id === selectedLink);
  const opportunities = filtered.links.filter(
    (l) => l.status === 'suggested' && l.type !== 'similarity',
  );
  const select = (id: string) => {
    setSelectedId(id);
    setSelectedLink('');
    setPanelTab('profile');
  };
  const inspect = (id: string) => {
    const l = graph.links.find((l) => l.id === id);
    setSelectedLink(id);
    if (l) setSelectedId(l.target);
    setPanelTab('relations');
  };
  async function editProfile() {
    if (!selected?.recordId || demo) return;
    try {
      const data = await callApi<{ records: BusinessRecord[] }>(
        `/api/platform?companyId=${encodeURIComponent(companyId)}`,
      );
      const row = data.records.find((r) => r.id === selected.recordId);
      if (row?.status === '已归档')
        setError('该档案已归档，请新增企业档案保留新的业务版本');
      else if (row) setEditor(row);
      else setError('该档案不属于当前企业，无法修改');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function analyze() {
    if (!snapshot || !snapshot.model) return;
    setConfirmAI(false);
    setAnalyzing(true);
    setError('');
    try {
      const next = await callApi<Snapshot & { rejected: number }>(
        '/api/platform/portrait',
        {
          action: 'analyze',
          companyId,
          fingerprint: snapshot.fingerprint,
          modelTarget: snapshot.model,
        },
      );
      setSnapshot((old) => ({ ...old!, ...next }));
      setNotice(
        `分析已完成，发现 ${next.graph.links.filter((l) => l.type === 'ai').length} 条有来源的合作建议${next.rejected ? `，已过滤 ${next.rejected} 条无效结果` : ''}`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }
  async function follow(link: PortraitLink) {
    if (demo) {
      setNotice('当前为演示网络。切换业务数据后可保存真实跟进记录。');
      return;
    }
    setFollowing(link.id);
    try {
      await callApi('/api/platform/portrait', {
        action: 'followup',
        companyId,
        fingerprint: snapshot!.fingerprint,
        linkId: link.id,
        note: '',
      });
      setNotice(
        '已保存到当前企业的「沟通与催收」记录，可在高级数据管理中继续办理。',
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setFollowing('');
    }
  }
  function exportGraph() {
    const evidence = new Set([
      ...filtered.nodes.flatMap((n) => n.sourceIds),
      ...filtered.links.flatMap((l) => l.evidence),
    ]);
    const doc = {
      ...filtered,
      sources: filtered.sources.filter((s) => evidence.has(s.id)),
      dataNotice: demo
        ? '全部为虚构演示数据'
        : '仅限当前账号有权查看的业务及授权展示资料',
      scoreNotice: '匹配分是规则分数，不代表成交概率；AI 建议未经人工核实。',
    };
    saveBlob(
      `企业脸谱_${demo ? '演示' : '业务'}_${localToday()}.json`,
      new Blob([JSON.stringify(doc, null, 2)], {
        type: 'application/json;charset=utf-8',
      }),
    );
  }
  return (
    <section className="ep-page" aria-label="AI 企业脸谱">
      <div className="ep-page-eyebrow">
        <span>
          <Fingerprint size={14} /> ENTERPRISE INTELLIGENCE
        </span>
        <AppButton onClick={() => setHelp(true)}>
          <CircleHelp size={14} />
          了解关系分析
        </AppButton>
      </div>
      <header className="ep-header">
        <div>
          <h1>
            AI 企业脸谱<span>连接能力，发现合作</span>
          </h1>
          <p>从企业资料到业务关联，让生态中的每一种可能清晰可见。</p>
        </div>
        <div className="ep-header-actions">
          <AppButton
            className="ep-button"
            onClick={exportGraph}
            disabled={!graph.nodes.length}
          >
            <ArrowDownToLine size={15} />
            导出网络
          </AppButton>
          <AppButton
            className="ep-button ep-primary"
            disabled={
              demo || !snapshot?.canWrite || analyzing || graph.nodes.length < 2
            }
            onClick={() => setConfirmAI(true)}
          >
            {analyzing ? (
              <LoaderCircle className="ep-spin" size={16} />
            ) : (
              <Sparkles size={16} />
            )}
            {analyzing ? '正在分析…' : 'AI 发现关联'}
          </AppButton>
        </div>
      </header>
      <div className="ep-data-line">
        <div className="ep-source-switch" aria-label="数据来源">
          <AppButton
            aria-pressed={!demo}
            disabled={initialDemo || analyzing}
            className={!demo ? 'active' : ''}
            onClick={() => setDemo(false)}
          >
            业务数据
          </AppButton>
          <AppButton
            aria-pressed={demo}
            disabled={analyzing}
            className={demo ? 'active' : ''}
            onClick={() => setDemo(true)}
          >
            演示网络
          </AppButton>
        </div>
        <span>
          <ShieldCheck size={13} />
          {demo
            ? '虚构演示资料 · 不写入业务数据库'
            : '当前企业资料 + 已确认授权展示资料'}
        </span>
        <AppButton disabled={loading || analyzing} onClick={() => void refresh()}>
          <RefreshCw className={loading ? 'ep-spin' : ''} size={13} />
          {loading ? '刷新中' : '刷新资料'}
        </AppButton>
      </div>
      {error && (
        <div className="ep-alert" role="alert">
          {error}
          <AppButton aria-label="关闭错误" onClick={() => setError('')}>
            <X size={15} />
          </AppButton>
        </div>
      )}
      {notice && (
        <div className="ep-toast" role="status">
          <Check size={15} />
          {notice}
        </div>
      )}
      {graph.truncated && (
        <div className="ep-alert">
          当前资料较多，网络展示最近 1,800 条业务来源、最多 180
          份企业档案；未展示部分不计入当前统计。
        </div>
      )}
      <div className="ep-metrics">
        {[
          {
            label: '网络中的企业',
            value: graph.nodes.length,
            detail: '每一家企业，都有独特价值',
            icon: Building2,
            tone: 'mint',
          },
          {
            label: '已识别关联',
            value: graph.links.length,
            detail: `${graph.links.filter((l) => l.status === 'fact').length} 条业务依据 · ${graph.links.filter((l) => l.status === 'suggested').length} 条待核对`,
            icon: Waypoints,
            tone: 'blue',
          },
          {
            label: '潜在合作机会',
            value: graph.links.filter(
              (l) => l.status === 'suggested' && l.type !== 'similarity',
            ).length,
            detail: '从需求与能力交集中发现',
            icon: Sparkles,
            tone: 'gold',
          },
          {
            label: '可追溯资料',
            value: graph.sources.length,
            detail: snapshot?.analysis
              ? `AI 分析于 ${labelDate(snapshot.analysis.at)}`
              : '企业档案、案例与业务记录',
            icon: FileCheck2,
            tone: 'purple',
          },
        ].map((metric) => (
          <div className="ep-metric" key={metric.label}>
            <div>
              <span>{metric.label}</span>
              <strong>
                {loading && !snapshot
                  ? '—'
                  : String(metric.value).padStart(2, '0')}
              </strong>
              <small>{metric.detail}</small>
            </div>
            <span className={`ep-metric-icon ${metric.tone}`}>
              <metric.icon size={21} strokeWidth={1.5} />
            </span>
          </div>
        ))}
      </div>
      <div className="ep-workbench">
        <div className="ep-network-column">
          <div className="ep-network-top">
            <div className="ep-view-tabs" role="tablist" aria-label="查看方式">
              {(
                [
                  { id: 'network', title: '关系网络', icon: Network },
                  { id: 'directory', title: '企业列表', icon: Building2 },
                  { id: 'opportunities', title: '合作机会', icon: Sparkles },
                ] as const
              ).map((tab) => (
                <AppButton
                  role="tab"
                  aria-selected={view === tab.id}
                  key={tab.id}
                  className={view === tab.id ? 'active' : ''}
                  onClick={() => setView(tab.id)}
                >
                  <tab.icon size={15} />
                  {tab.title}
                  {tab.id === 'opportunities' && (
                    <small>{opportunities.length}</small>
                  )}
                </AppButton>
              ))}
            </div>
            <span className="ep-updated">
              {labelDate(graph.generatedAt)} 更新
            </span>
          </div>
          <div className="ep-toolbar">
            <label className="ep-search">
              <Search size={16} />
              <input
                aria-label="搜索企业、能力或需求"
                placeholder="搜索企业、能力、合作需求…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <AppButton aria-label="清空搜索" onClick={() => setQuery('')}>
                  <X size={13} />
                </AppButton>
              )}
            </label>
            <label className="ep-filter">
              <ListFilter size={14} />
              <AppSelect
                aria-label="筛选行业"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              >
                {[
                  '全部行业',
                  ...new Set(graph.nodes.map((n) => n.industry)),
                ].map((i) => (
                  <option key={i}>{i}</option>
                ))}
              </AppSelect>
            </label>
            <AppSelect
              className="ep-relation-select"
              aria-label="筛选关联类型"
              value={relation}
              onChange={(e) =>
                setRelation(e.target.value as RelationType | 'all')
              }
            >
              <option value="all">全部关联</option>
              {Object.entries(relationLabels).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </AppSelect>
          </div>
          <div className="ep-canvas-body">
            {loading && !snapshot ? (
              <div className="ep-empty">
                <LoaderCircle className="ep-spin" />
                <h3>正在读取企业生态资料</h3>
                <p>构建有来源的企业关联网络</p>
              </div>
            ) : graph.nodes.length <= 1 && !graph.sources.length ? (
              <div className="ep-empty">
                <div className="ep-empty-orbit">
                  <Network size={36} />
                </div>
                <h3>从第一份企业档案开始</h3>
                <p>
                  录入企业能力、产品案例与合作需求，
                  <br />
                  逐步连接你的企业生态。
                </p>
                <div>
                  <AppButton
                    className="ep-button ep-primary"
                    disabled={!snapshot?.canWrite}
                    onClick={() => setEditor('new')}
                  >
                    <Plus size={15} />
                    添加企业档案
                  </AppButton>
                  <AppButton className="ep-button" onClick={() => setDemo(true)}>
                    体验演示网络
                    <ArrowRight size={14} />
                  </AppButton>
                </div>
              </div>
            ) : !filtered.nodes.length ? (
              <div className="ep-empty">
                <Search size={30} />
                <h3>没有找到相关企业</h3>
                <p>试试其他关键词，或调整行业筛选。</p>
                <AppButton
                  className="ep-button"
                  onClick={() => {
                    setQuery('');
                    setIndustry('全部行业');
                  }}
                >
                  清空筛选
                </AppButton>
              </div>
            ) : view === 'network' ? (
              <EnterpriseGraph
                graph={filtered}
                selected={selectedId}
                highlighted={[]}
                onSelect={select}
                onLink={inspect}
              />
            ) : view === 'directory' ? (
              <div className="ep-directory">
                {filtered.nodes.map((node) => (
                  <AppButton
                    key={node.id}
                    onClick={() => select(node.id)}
                    className={selected?.id === node.id ? 'active' : ''}
                  >
                    <span
                      className="ep-company-avatar"
                      style={
                        {
                          '--ep-company-color': industryColor(node.industry),
                        } as React.CSSProperties
                      }
                    >
                      {node.name.slice(0, 2)}
                    </span>
                    <span>
                      <strong>
                        {node.name}
                        {node.own && <em>当前企业</em>}
                      </strong>
                      <small>
                        {node.industry} ·{' '}
                        {node.capabilities.slice(0, 3).join(' / ') ||
                          '待补充能力资料'}
                      </small>
                    </span>
                    <span className="ep-directory-count">
                      {count(graph, node.id)}
                      <small>项关联</small>
                    </span>
                    <ChevronRight size={15} />
                  </AppButton>
                ))}
              </div>
            ) : (
              <div className="ep-opportunity-list">
                {opportunities.length ? (
                  opportunities.map((l) => (
                    <RelationCard
                      key={l.id}
                      link={l}
                      graph={graph}
                      onInspect={() => {
                        inspect(l.id);
                        setPanelTab('sources');
                      }}
                      onFollow={() => void follow(l)}
                      following={following === l.id}
                      canFollow={demo || !!snapshot?.canWrite}
                    />
                  ))
                ) : (
                  <div className="ep-empty">
                    <Sparkles size={30} />
                    <h3>暂未发现合作机会</h3>
                    <p>补充企业能力与已确认需求后刷新网络。</p>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="ep-network-footer">
            <span>
              <span className="ep-small-dot" />
              {filtered.nodes.length} 家企业 · {filtered.links.length} 项关联
            </span>
            <span>
              <ShieldCheck size={12} />
              关联均可查看资料依据
            </span>
          </div>
        </div>
        <aside className="ep-profile-panel" aria-label="企业画像与关联依据">
          <div className="ep-panel-heading">
            <span>
              <Fingerprint size={15} />
              企业画像
            </span>
            <span className="ep-tag">
              {demo ? '演示' : selected?.recordStatus || '动态档案'}
            </span>
          </div>
          {selected ? (
            <>
              <div className="ep-profile-intro">
                <span
                  className="ep-profile-avatar"
                  style={
                    {
                      '--ep-company-color': industryColor(selected.industry),
                    } as React.CSSProperties
                  }
                >
                  {selected.name.slice(0, 2)}
                  <i title="企业资料">
                    <BookOpen size={9} />
                  </i>
                </span>
                <h2>{selected.name}</h2>
                <p>
                  {selected.industry}
                  {selected.own && <span>当前企业</span>}
                </p>
                <small>
                  <MapPin size={12} />
                  {selected.location || '所在地待补充'}
                  <span>·</span>
                  {selected.shared ? '授权展示资料' : '本企业可见'}
                </small>
              </div>
              <div
                className="ep-panel-tabs"
                role="tablist"
                aria-label="画像内容"
              >
                {(
                  [
                    { id: 'profile', title: '企业画像' },
                    { id: 'relations', title: '关联洞察' },
                    { id: 'sources', title: '资料依据' },
                  ] as const
                ).map((tab) => (
                  <AppButton
                    role="tab"
                    aria-selected={panelTab === tab.id}
                    className={panelTab === tab.id ? 'active' : ''}
                    key={tab.id}
                    onClick={() => setPanelTab(tab.id)}
                  >
                    {tab.title}
                  </AppButton>
                ))}
              </div>
              <div className="ep-panel-scroll">
                {panelTab === 'profile' ? (
                  <>
                    <section className="ep-profile-section">
                      <h3>
                        <BookOpen size={13} />
                        关于企业
                      </h3>
                      <p>
                        {selected.summary ||
                          '企业简介尚未补充。完善档案后，可以获得更准确的关联建议。'}
                      </p>
                    </section>
                    <section className="ep-profile-section">
                      <h3>
                        <Layers3 size={13} />
                        核心业务与能力
                      </h3>
                      <div className="ep-tags">
                        {selected.capabilities.length ? (
                          selected.capabilities.map((t) => (
                            <span key={t}>{t}</span>
                          ))
                        ) : (
                          <small>等待补充业务与能力标签</small>
                        )}
                      </div>
                    </section>
                    <section className="ep-profile-section">
                      <h3>
                        <Sparkles size={13} />
                        正在寻找的合作
                      </h3>
                      {selected.needs.length ? (
                        selected.needs.slice(0, 4).map((t) => (
                          <p className="ep-need" key={t}>
                            <i />
                            {t}
                          </p>
                        ))
                      ) : (
                        <p>暂未维护合作需求</p>
                      )}
                    </section>
                    <section className="ep-profile-section">
                      <h3>
                        <FileCheck2 size={13} />
                        案例与交付经验
                      </h3>
                      {selected.cases.length ? (
                        selected.cases.slice(0, 4).map((t) => (
                          <p className="ep-case" key={t}>
                            <span />
                            <span>{t}</span>
                            <ArrowUpRight size={12} />
                          </p>
                        ))
                      ) : (
                        <p>暂无已录入的案例资料</p>
                      )}
                    </section>
                    <div className="ep-profile-completeness">
                      <span>
                        档案完整度<strong>{selected.completeness}%</strong>
                      </span>
                      <div>
                        <i style={{ width: `${selected.completeness}%` }} />
                      </div>
                      <small>完善资料，让合适的伙伴更容易找到你</small>
                    </div>
                  </>
                ) : panelTab === 'relations' ? (
                  <>
                    <div className="ep-insight-note">
                      <Sparkles size={15} />
                      <p>
                        关联解释连接的原因。建议仍需双方核对业务范围与交付条件。
                      </p>
                    </div>
                    {(activeLink ? [activeLink] : selectedRelations).map(
                      (l) => (
                        <RelationCard
                          key={l.id}
                          link={l}
                          graph={graph}
                          compact
                          onInspect={() => {
                            setSelectedLink(l.id);
                            setPanelTab('sources');
                          }}
                          onFollow={() => void follow(l)}
                          following={following === l.id}
                          canFollow={demo || !!snapshot?.canWrite}
                        />
                      ),
                    )}
                    {!activeLink && !selectedRelations.length && (
                      <p className="ep-muted">
                        当前筛选下暂无可追溯的关联，补充需求或案例后刷新。
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="ep-source-note">
                      <ShieldCheck size={15} />
                      <p>
                        {activeLink
                          ? '以下资料共同支持所选关联。'
                          : '以下资料用于构建当前企业画像。'}
                        来源保留记录 ID 和版本。
                      </p>
                    </div>
                    {graph.sources
                      .filter((s) =>
                        (activeLink?.evidence || selected.sourceIds).includes(
                          s.id,
                        ),
                      )
                      .map((s) => (
                        <article className="ep-source-card" key={s.id}>
                          <span>
                            {s.visibility === 'shared' ? (
                              <Globe2 size={13} />
                            ) : (
                              <ShieldCheck size={13} />
                            )}
                            {s.visibility === 'shared'
                              ? '授权展示'
                              : '当前企业资料'}
                          </span>
                          <h4>{s.title}</h4>
                          <p>
                            {s.summary || '由业务记录的明确引用关系建立关联。'}
                          </p>
                          <code>{s.id}</code>
                          <small>{labelDate(s.updatedAt)}</small>
                        </article>
                      ))}
                    {!(activeLink?.evidence || selected.sourceIds).length && (
                      <p className="ep-muted">暂无来源，请完善企业档案。</p>
                    )}
                  </>
                )}
              </div>
              <div className="ep-panel-bottom">
                {!demo &&
                selected.recordId &&
                selected.companyId === companyId &&
                snapshot?.canWrite ? (
                  <AppButton
                    className="ep-button"
                    onClick={() => void editProfile()}
                  >
                    维护企业档案
                    <ArrowUpRight size={14} />
                  </AppButton>
                ) : (
                  <AppButton
                    className="ep-button"
                    onClick={() =>
                      setPanelTab(
                        panelTab === 'relations' ? 'sources' : 'relations',
                      )
                    }
                  >
                    {panelTab === 'relations' ? '查看资料依据' : '探索关联洞察'}
                    <ArrowRight size={14} />
                  </AppButton>
                )}
              </div>
            </>
          ) : (
            <div className="ep-empty">
              <Fingerprint size={30} />
              <p>选择企业，查看画像和关联依据</p>
            </div>
          )}
        </aside>
      </div>
      <section className="ep-discover">
        <div className="ep-discover-heading">
          <div>
            <span className="ep-sparkle-icon">
              <Sparkles size={17} />
            </span>
            <h2>
              值得探索的合作<span>每一条建议，都从已有资料出发</span>
            </h2>
          </div>
          <AppButton onClick={() => setView('opportunities')}>
            查看全部 {opportunities.length} 项<ArrowRight size={14} />
          </AppButton>
        </div>
        <div className="ep-discover-grid">
          {opportunities.slice(0, 3).map((l) => (
            <RelationCard
              key={l.id}
              link={l}
              graph={graph}
              onInspect={() => {
                inspect(l.id);
                setPanelTab('sources');
                setView('network');
              }}
              onFollow={() => void follow(l)}
              following={following === l.id}
              canFollow={demo || !!snapshot?.canWrite}
            />
          ))}
          {!opportunities.length && (
            <p className="ep-muted">
              已确认的需求与企业能力将成为下一次合作的起点。
            </p>
          )}
        </div>
      </section>
      <footer className="ep-page-footer">
        <span>
          <ShieldCheck size={12} />
          {demo
            ? '演示网络中的企业、业务与案例均为虚构。'
            : '业务记录建立事实关联；关键词和 AI 生成待核对的合作建议。'}
        </span>
        {!demo && (
          <AppButton
            disabled={!snapshot?.canWrite}
            onClick={() => setEditor('new')}
          >
            <Plus size={13} />
            添加企业
          </AppButton>
        )}
      </footer>
      <Dialog open={confirmAI} onOpenChange={setConfirmAI}>
        <DialogContent className="ep-dialog">
          <DialogTitle>
            <Sparkles size={20} />
            发现企业之间的下一种可能
          </DialogTitle>
          <DialogDescription>
            基于当前可见资料，分析互补能力、供需接口和联合交付机会。
          </DialogDescription>
          <div className="ep-ai-brief">
            <span>
              分析范围
              <strong>
                {graph.nodes.length} 家企业 / {graph.sources.length} 条来源
              </strong>
            </span>
            <span>
              使用模型<strong>{snapshot?.model?.model || '尚未配置'}</strong>
            </span>
            <span>
              模型服务
              <strong>{snapshot?.model?.destination || '尚未配置'}</strong>
            </span>
          </div>
          <p className="ep-muted">
            仅将当前网络中的企业介绍、业务能力、案例摘要与来源发送至上述已配置模型。结果保存为待核对建议。
          </p>
          {!snapshot?.modelReady && (
            <p className="ep-alert">
              请先在「系统管理 → 模型配置与切换」中配置并测试模型。
            </p>
          )}
          <AppButton
            className="ep-button ep-primary"
            disabled={!snapshot?.modelReady}
            onClick={() => void analyze()}
          >
            <Sparkles size={16} />
            开始分析
          </AppButton>
        </DialogContent>
      </Dialog>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="ep-dialog">
          <DialogTitle>
            <Network size={20} />
            一张有依据的企业关系网络
          </DialogTitle>
          <DialogDescription>
            资料更新后每 45 秒自动刷新；也可以手动刷新。
          </DialogDescription>
          <p>
            实线来自订单、项目或合作记录的明确引用链。虚线表示关键词匹配或 AI
            建议，匹配分不是成交概率。
          </p>
          <p>
            企业可维护自己的介绍、产品、能力、需求与案例。跨企业只使用已确认且授权展示的企业档案与需求，内部订单与知识保留在当前企业权限范围内。
          </p>
          <p>
            参考开源实现：
            <a
              href="https://github.com/vasturiano/react-force-graph"
              target="_blank"
              rel="noreferrer"
            >
              react-force-graph
            </a>{' '}
            的动态力导向网络，以及{' '}
            <a
              href="https://github.com/microsoft/graphrag"
              target="_blank"
              rel="noreferrer"
            >
              GraphRAG
            </a>{' '}
            的来源追溯思路。技术选型同时比较了{' '}
            <a
              href="https://github.com/antvis/G6"
              target="_blank"
              rel="noreferrer"
            >
              AntV G6
            </a>
            。
          </p>
        </DialogContent>
      </Dialog>
      {editor && (
        <ProfileEditor
          companyId={companyId}
          canReview={!!snapshot?.canReview}
          record={editor === 'new' ? undefined : editor}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            setNotice('企业档案已保存，关系网络已重新计算。');
            void refresh();
          }}
        />
      )}
    </section>
  );
}

function RelationCard({
  link,
  graph,
  compact = false,
  onInspect,
  onFollow,
  following,
  canFollow,
}: {
  link: PortraitLink;
  graph: PortraitGraph;
  compact?: boolean;
  onInspect: () => void;
  onFollow: () => void;
  following: boolean;
  canFollow: boolean;
}) {
  const names = [link.source, link.target].map(
    (id) => graph.nodes.find((n) => n.id === id)?.name || '企业',
  );
  return (
    <article className={`ep-relation-card ${compact ? 'is-compact' : ''}`}>
      <div className="ep-relation-meta">
        <span style={{ color: edgeColor[link.type] }}>
          <Link2 size={12} />
          {relationLabels[link.type]}
        </span>
        <small>
          {link.status === 'fact'
            ? '有业务依据'
            : link.type === 'ai'
              ? 'AI 建议 · 待核对'
              : `匹配分 ${link.score}`}
        </small>
      </div>
      <h3>
        {names[0]}
        <span>×</span>
        {names[1]}
      </h3>
      <p>{link.reason}</p>
      {compact && <p className="ep-next-action">下一步：{link.nextAction}</p>}
      <div className="ep-relation-evidence">
        <FileCheck2 size={12} />
        {link.evidence.length} 条可追溯来源
        <span>{link.status === 'suggested' ? '待核对' : '业务关联'}</span>
      </div>
      <div className="ep-relation-actions">
        <AppButton onClick={onInspect}>
          查看依据
          <ArrowUpRight size={13} />
        </AppButton>
        <AppButton disabled={!canFollow || following} onClick={onFollow}>
          {following ? (
            <LoaderCircle size={12} className="ep-spin" />
          ) : (
            <Plus size={12} />
          )}
          加入跟进
        </AppButton>
      </div>
    </article>
  );
}

function ProfileEditor({
  companyId,
  record,
  canReview,
  onClose,
  onSaved,
}: {
  companyId: string;
  record?: BusinessRecord;
  canReview: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const revision = useRef(record);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(e.currentTarget);
    const intent =
      ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)
        ?.value || 'save';
    const data = { ...record?.data };
    for (const key of [
      'industry',
      'contact',
      'profileType',
      'summary',
      'capabilities',
      'products',
      'needs',
      'cases',
      'location',
      'sharing',
    ])
      data[key] = String(form.get(key) || '');
    try {
      let current = revision.current;
      if (current && ['已确认', '待审核'].includes(current.status)) {
        current = (
          await callApi<{ record: BusinessRecord }>('/api/platform', {
            action: 'record.transition',
            companyId,
            id: current.id,
            version: current.version,
            status: '草稿',
          })
        ).record;
        revision.current = current;
      }
      current = (
        await callApi<{ record: BusinessRecord }>('/api/platform', {
          action: current ? 'record.save' : 'record.create',
          companyId,
          kind: 'enterprise',
          id: current?.id,
          version: current?.version,
          title: form.get('title'),
          owner: form.get('owner'),
          dueDate: current?.dueDate || '',
          data,
        })
      ).record;
      revision.current = current;
      if (intent === 'review' || intent === 'confirm') {
        current = (
          await callApi<{ record: BusinessRecord }>('/api/platform', {
            action: 'record.transition',
            companyId,
            id: current.id,
            version: current.version,
            status: '待审核',
          })
        ).record;
        revision.current = current;
      }
      if (intent === 'confirm') {
        current = (
          await callApi<{ record: BusinessRecord }>('/api/platform', {
            action: 'record.transition',
            companyId,
            id: current.id,
            version: current.version,
            status: '已确认',
          })
        ).record;
        revision.current = current;
      }
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="ep-dialog ep-profile-dialog">
        <DialogTitle>
          <Building2 size={20} />
          {record ? '维护企业档案' : '添加企业档案'}
        </DialogTitle>
        <DialogDescription>
          企业资料用于构建画像和关联分析。新档案保存为草稿，审核确认后才能对外展示。
        </DialogDescription>
        {record?.status === '已确认' && (
          <p className="ep-alert">
            修改将退回草稿并暂停该版本的生态展示，重新确认后恢复。
          </p>
        )}
        <form onSubmit={submit}>
          <div className="ep-form-grid">
            <label>
              企业名称
              <input
                name="title"
                required
                maxLength={160}
                defaultValue={record?.title}
              />
            </label>
            <label>
              所属行业
              <input
                name="industry"
                required
                maxLength={100}
                defaultValue={record?.data.industry}
                placeholder="例如：数字科技"
              />
            </label>
            <label>
              档案身份
              <AppSelect
                name="profileType"
                defaultValue={record?.data.profileType || '合作伙伴'}
              >
                <option>合作伙伴</option>
                <option>本企业</option>
              </AppSelect>
            </label>
            <label>
              所在地
              <input
                name="location"
                maxLength={100}
                defaultValue={record?.data.location}
                placeholder="城市 · 园区"
              />
            </label>
            <label>
              维护负责人
              <input
                name="owner"
                required
                maxLength={100}
                defaultValue={record?.owner}
              />
            </label>
            <label>
              业务联系人
              <input
                name="contact"
                required
                maxLength={100}
                defaultValue={record?.data.contact}
              />
            </label>
          </div>
          {[
            { key: 'summary', name: '企业简介', required: false },
            {
              key: 'capabilities',
              name: '业务能力与关键词（用顿号或逗号分隔）',
              required: true,
            },
            { key: 'products', name: '产品与业务', required: false },
            { key: 'needs', name: '合作需求', required: false },
            { key: 'cases', name: '案例与资质', required: false },
          ].map((f) => (
            <label key={f.key}>
              {f.name}
              <textarea
                name={f.key}
                required={f.required}
                maxLength={10000}
                rows={2}
                defaultValue={record?.data[f.key]}
              />
            </label>
          ))}
          <label>
            生态展示
            <AppSelect
              name="sharing"
              defaultValue={record?.data.sharing || '仅本企业'}
            >
              <option>仅本企业</option>
              <option>授权展示</option>
            </AppSelect>
          </label>
          {error && (
            <p className="ep-alert" role="alert">
              {error}
            </p>
          )}
          <div className="ep-form-actions">
            <AppButton
              type="button"
              className="ep-button"
              disabled={busy}
              onClick={onClose}
            >
              取消
            </AppButton>
            <AppButton
              className="ep-button"
              value="save"
              disabled={busy || (record?.status === '已确认' && !canReview)}
            >
              {busy ? (
                <LoaderCircle className="ep-spin" size={15} />
              ) : (
                <Check size={15} />
              )}
              保存草稿
            </AppButton>
            <AppButton
              className="ep-button"
              value="review"
              disabled={busy || (record?.status === '已确认' && !canReview)}
            >
              提交审核
            </AppButton>
            {canReview && (
              <AppButton
                className="ep-button ep-primary"
                value="confirm"
                disabled={busy}
              >
                <ShieldCheck size={15} />
                确认资料
              </AppButton>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
