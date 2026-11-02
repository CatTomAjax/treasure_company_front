'use client';

import { AppButton } from '@/components/ui/app-controls';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { Focus, Minus, Pause, Play, Plus, Sun, Moon } from 'lucide-react';
import type { ForceGraphMethods } from 'react-force-graph-2d';
import {
  relationLabels,
  type PortraitGraph,
  type PortraitNode,
  type PortraitLink,
} from '@/lib/enterprise-portrait';

type GraphNode = PortraitNode & { x?: number; y?: number };
type GraphEdge = Omit<PortraitLink, 'source' | 'target'> & {
  source: string | GraphNode;
  target: string | GraphNode;
};
const colors = [
  '#7edbc0',
  '#8ebdff',
  '#c0a0ed',
  '#f3c47c',
  '#73c9d5',
  '#e9a8b5',
];
export const industryColor = (industry: string) =>
  colors[
    [...industry].reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length
  ];
export const edgeColor: Record<PortraitLink['type'], string> = {
  transaction: '#75d9bb',
  collaboration: '#8ebdff',
  demand: '#e7bd7c',
  similarity: '#aa97d1',
  ai: '#df9fd7',
};
const endpointId = (value: string | GraphNode) =>
  typeof value === 'string' ? value : value.id;
const escapeLabel = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]!,
  );

export default function EnterpriseGraph({
  graph,
  selected,
  highlighted,
  onSelect,
  onLink,
}: {
  graph: PortraitGraph;
  selected: string;
  highlighted: string[];
  onSelect: (id: string) => void;
  onLink: (id: string) => void;
}) {
  const [Component, setComponent] = useState<
    typeof import('react-force-graph-2d').default | null
  >(null);
  const [error, setError] = useState('');
  const [size, setSize] = useState({ width: 700, height: 550 });
  const [dark, setDark] = useState(true),
    [paused, setPaused] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const instance = useRef<ForceGraphMethods<GraphNode, GraphEdge> | undefined>(
    undefined,
  );
  const fitted = useRef(false);
  const reduced = useRef(false);
  useEffect(() => {
    let active = true;
    import('react-force-graph-2d')
      .then((loaded) => {
        if (active) setComponent(() => loaded.default);
      })
      .catch(() => {
        if (active)
          setError('关系图组件加载失败，请刷新页面；企业列表仍可使用。');
      });
    reduced.current = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ width: Math.floor(width), height: Math.floor(height) });
    });
    if (container.current) observer.observe(container.current);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, []);
  const data = useMemo(
    () => ({
      nodes: graph.nodes.map((n, i) => ({
        ...n,
        x: n.own ? 0 : Math.cos(i * 2.399) * (85 + i * 4),
        y: n.own ? 0 : Math.sin(i * 2.399) * (85 + i * 4),
      })),
      links: graph.links.map((l) => ({ ...l })) as GraphEdge[],
    }),
    [graph.nodes, graph.links],
  );
  useEffect(() => {
    fitted.current = false;
  }, [data]);
  useEffect(() => {
    if (Component) instance.current?.zoomToFit(300, 60);
  }, [Component, size.width, size.height]);
  useEffect(() => {
    const graph = instance.current;
    if (!Component || !graph) return;
    graph.d3Force('charge')?.strength(-650);
    graph.d3Force('link')?.distance(150).strength(0.18);
    graph.d3ReheatSimulation();
  }, [Component, data]);
  useEffect(() => {
    if (paused) instance.current?.pauseAnimation();
    else instance.current?.resumeAnimation();
  }, [paused]);
  const connected = useMemo(
    () =>
      new Set(
        graph.links
          .filter((l) => l.source === selected || l.target === selected)
          .flatMap((l) => [l.source, l.target]),
      ),
    [graph.links, selected],
  );
  const isBright = (id: string) =>
    !selected || id === selected || connected.has(id);
  function draw(node: GraphNode, ctx: CanvasRenderingContext2D, scale: number) {
    const x = node.x || 0,
      y = node.y || 0;
    const active = node.id === selected;
    const bright =
      isBright(node.id) &&
      (!highlighted.length || highlighted.includes(node.id));
    const color = node.own ? '#83e1c1' : industryColor(node.industry);
    const radius = node.own ? 34 : active ? 29 : 24;
    ctx.save();
    ctx.globalAlpha = bright ? 1 : 0.24;
    if (active || node.own) {
      const glow = ctx.createRadialGradient(x, y, radius, x, y, radius + 24);
      glow.addColorStop(0, color + '30');
      glow.addColorStop(1, color + '00');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, radius + 24, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
    ctx.strokeStyle = active ? color + 'bb' : color + '22';
    ctx.lineWidth = active ? 1.1 : 0.7;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = dark ? '#192c32' : '#ffffff';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = active ? 2.4 : 1.3;
    ctx.stroke();
    ctx.font = `600 ${node.own ? 14 : 12}px "Microsoft YaHei",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = dark ? color : '#254a46';
    ctx.fillText(node.name.slice(0, 2), x, y);
    const font = (active || node.own ? 12 : 11) / scale;
    ctx.font = `${active || node.own ? 600 : 400} ${font}px "Microsoft YaHei",sans-serif`;
    ctx.fillStyle = dark ? '#dbe8e7' : '#314b4b';
    ctx.fillText(
      node.name.length > 15 ? node.name.slice(0, 14) + '…' : node.name,
      x,
      y + radius + 15 / scale,
    );
    if (node.own) {
      ctx.font = `${8 / scale}px sans-serif`;
      ctx.fillStyle = '#86a9a3';
      ctx.fillText('当前企业', x, y + radius + 29 / scale);
    }
    ctx.restore();
  }
  return (
    <div
      className={`ep-graph ${dark ? 'is-dark' : 'is-light'}`}
      ref={container}
      style={
        {
          '--ui-surface': dark ? '#11242a' : '#f5f8f5',
          '--ui-muted': dark ? '#a3bdb5' : '#587065',
          '--ui-text': dark ? '#e0ece7' : '#314b4b',
          '--ui-primary-soft': dark ? '#25453d' : '#e3eee6',
          backgroundImage:
            'radial-gradient(rgba(120,165,150,.12) .65px, transparent .65px)',
          backgroundSize: '18px 18px',
        } as CSSProperties
      }
      aria-label="企业关系网络，可使用企业列表键盘选择节点"
    >
      <div className="ep-graph-caption">
        <span className="ep-live-dot" />
        LIVE NETWORK <span>企业生态关系图谱</span>
      </div>
      {error ? (
        <p className="ep-graph-message">{error}</p>
      ) : Component && size.width > 0 ? (
        <Component
          ref={instance}
          width={size.width}
          height={size.height}
          graphData={data}
          backgroundColor="rgba(0,0,0,0)"
          nodeLabel={(node) => escapeLabel(node.name)}
          nodeRelSize={18}
          nodeCanvasObject={draw}
          nodePointerAreaPaint={(node, color, ctx) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(
              node.x || 0,
              node.y || 0,
              node.own ? 39 : 33,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }}
          linkColor={(edge) =>
            edgeColor[edge.type] +
            (selected &&
            ![endpointId(edge.source), endpointId(edge.target)].includes(
              selected,
            )
              ? '25'
              : dark
                ? '90'
                : 'b0')
          }
          linkWidth={(edge) =>
            selected &&
            [endpointId(edge.source), endpointId(edge.target)].includes(
              selected,
            )
              ? 1.7
              : 0.8
          }
          linkLineDash={(edge) => (edge.status === 'suggested' ? [3, 4] : [])}
          linkCurvature={0.12}
          linkDirectionalParticles={(edge) =>
            !reduced.current && !paused && edge.status === 'fact' ? 2 : 0
          }
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleSpeed={0.004}
          linkLabel={(edge) =>
            escapeLabel(`${relationLabels[edge.type]} · ${edge.title}`)
          }
          onNodeClick={(node) => onSelect(node.id)}
          onLinkClick={(link) => onLink(link.id)}
          onBackgroundClick={() => onSelect('')}
          enableNodeDrag
          enablePanInteraction
          enableZoomInteraction
          d3AlphaDecay={0.035}
          d3VelocityDecay={0.4}
          cooldownTicks={140}
          warmupTicks={55}
          minZoom={0.3}
          maxZoom={4}
          onEngineStop={() => {
            if (!fitted.current) {
              instance.current?.zoomToFit(500, 75);
              fitted.current = true;
            }
          }}
        />
      ) : (
        <p className="ep-graph-message">正在构建关系网络…</p>
      )}
      {!graph.nodes.length && (
        <p className="ep-graph-message">暂无可展示的企业</p>
      )}
      <div className="ep-graph-legend">
        {(
          [
            'transaction',
            'collaboration',
            'demand',
            'similarity',
            'ai',
          ] as const
        )
          .filter((type) => graph.links.some((l) => l.type === type))
          .map((type) => (
            <span key={type}>
              <i style={{ background: edgeColor[type] }} />
              {relationLabels[type]}
            </span>
          ))}
        <small>实线：已有业务 · 虚线：待核对</small>
      </div>
      <div className="ep-graph-tools">
        <AppButton
          aria-label="放大网络"
          title="放大"
          onClick={() =>
            instance.current?.zoom((instance.current?.zoom() || 1) * 1.25, 200)
          }
        >
          <Plus size={17} />
        </AppButton>
        <AppButton
          aria-label="缩小网络"
          title="缩小"
          onClick={() =>
            instance.current?.zoom((instance.current?.zoom() || 1) / 1.25, 200)
          }
        >
          <Minus size={17} />
        </AppButton>
        <AppButton
          aria-label="适应全部节点"
          title="适应画布"
          onClick={() => instance.current?.zoomToFit(400, 65)}
        >
          <Focus size={17} />
        </AppButton>
        <AppButton
          aria-label={paused ? '继续动画' : '暂停动画'}
          title={paused ? '继续动画' : '暂停动画'}
          onClick={() => setPaused(!paused)}
        >
          {paused ? <Play size={15} /> : <Pause size={15} />}
        </AppButton>
        <AppButton
          aria-label={dark ? '切换浅色画布' : '切换深色画布'}
          onClick={() => setDark(!dark)}
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </AppButton>
      </div>
      <span className="ep-graph-hint">滚轮缩放 · 拖拽节点 · 点击查看关系</span>
    </div>
  );
}
