'use client';
import { AppButton, AppSelect } from '@/components/ui/app-controls';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Bot, KeyRound, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import { callApi } from '@/lib/platform-client';
import type { Connection } from '@/lib/integration-config';
import './agent-center.css';
type Data = {
  connections: Connection[];
  catalogs: { connectionId: string; models: string[] }[];
  tests: {
    id: string;
    connectionId: string;
    model: string;
    kind: string;
    status: string;
    latencyMs: number;
    inputTokens: number;
    outputTokens: number;
    message: string;
    createdAt: string;
  }[];
  preferences: {
    projectId: string;
    connectionId: string;
    model: string;
    version: number;
  }[];
  projects: { id: string; title: string }[];
  role: string;
  active: {
    provider: string;
    destination: string;
    model: string;
    configured: boolean;
    connectionId: string;
  };
};
export default function ModelSettings({ companyId }: { companyId: string }) {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [project, setProject] = useState(''),
    [selected, setSelected] = useState(''),
    [creating, setCreating] = useState(false),
    [provider, setProvider] = useState('deepseek'),
    [name, setName] = useState('DeepSeek 企业连接'),
    [apiKey, setKey] = useState(''),
    [model, setModel] = useState('');
  const refresh = useCallback(async () => {
    try {
      setData(
        await callApi(
          `/api/platform/models?companyId=${encodeURIComponent(companyId)}&projectId=${encodeURIComponent(project)}`,
        ),
      );
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, [companyId, project]);
  useEffect(() => {
    setData(null);
    setSelected('');
    setKey('');
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (data && !selected && !creating && data.connections.length)
      setSelected(data.active.connectionId || data.connections[0].id);
  }, [data, selected, creating]);
  const current = creating
      ? null
      : data?.connections.find((c) => c.id === selected),
    admin = data?.role === 'admin';
  useEffect(() => {
    if (current) {
      setProvider(current.provider);
      setName(current.name);
      setModel(
        data?.preferences.find(
          (p) => p.projectId === project && p.connectionId === current.id,
        )?.model ||
          current.config.model ||
          '',
      );
      setKey('');
    }
  }, [current?.id, current?.version]);
  const models =
      data?.catalogs.find((c) => c.connectionId === current?.id)?.models || [],
    last = data?.tests.find(
      (t) =>
        t.connectionId === current?.id &&
        t.model === model &&
        t.kind === 'completion',
    );
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const d = await callApi('/api/platform/integrations', {
        companyId,
        action: 'connection.save',
        ...(current ? { id: current.id, version: current.version } : {}),
        provider,
        name,
        config: { model },
        ...(apiKey ? { secrets: { apiKey } } : {}),
      });
      setKey('');
      setCreating(false);
      setSelected(d.connection.id);
      await refresh();
      setNotice('连接与密钥已加密保存，接下来获取模型并测试真实返回。');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function act(action: string) {
    if (!current) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const d = await callApi('/api/platform/models', {
        companyId,
        action,
        connectionId: current.id,
        version: current.version,
        model,
        projectId: project,
        preferenceVersion:
          data?.preferences.find((p) => p.projectId === project)?.version || 0,
      });
      await refresh();
      if (d.status === 'error') setError(d.message);
      else
        setNotice(
          d.message ||
            '默认模型已保存；新任务将使用此选择，已授权任务保留原模型快照。',
        );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="ag-center">
      <header className="ag-heading">
        <div>
          <span className="ag-eyebrow">
            <Bot size={16} /> MODEL CONNECTIONS
          </span>
          <h1>模型配置与切换</h1>
          <p>保存连接 → 获取账户模型 → 真实连通测试 → 设置默认模型</p>
        </div>
        <AppButton onClick={() => void refresh()} disabled={busy}>
          <RefreshCw size={15} />
          刷新
        </AppButton>
      </header>
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
      {!data ? (
        <div className="ag-empty">
          {error ? '请检查登录与企业权限' : '正在加载模型连接…'}
        </div>
      ) : (
        <>
          <section className="ag-panel">
            <div className="ag-row">
              <div>
                <h2>
                  <ShieldCheck size={18} />
                  当前执行模型
                </h2>
                <p>
                  {data.active.configured
                    ? `${data.active.provider === 'openai' ? 'OpenAI / Codex' : 'DeepSeek'} · ${data.active.model}`
                    : '尚未配置可用连接'}
                </p>
                <small>
                  {data.active.destination} ·
                  密钥只在服务端解密，数据库加密保存。
                </small>
              </div>
              <label>
                作用范围
                <AppSelect
                  aria-label="默认模型作用范围"
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                >
                  <option value="">本企业默认</option>
                  {data.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </AppSelect>
              </label>
            </div>
            <p>
              OpenAI 通过 Responses API 调用账户可用的 Codex、GPT 等模型；Agent
              按此处选择执行。可用模型以密钥对应的账户列表和真实测试为准。
            </p>
          </section>
          <div className="ag-workspace" style={{ marginTop: 18 }}>
            <aside className="ag-panel ag-run-list">
              <div className="ag-row">
                <h2>已保存连接</h2>
                <AppButton
                  aria-label="新建模型连接"
                  disabled={!admin || busy}
                  onClick={() => {
                    setCreating(true);
                    setSelected('');
                    setProvider('deepseek');
                    setName('DeepSeek 企业连接');
                    setModel('');
                    setKey('');
                  }}
                >
                  <Plus size={16} />
                </AppButton>
              </div>
              {data.connections.map((c) => (
                <AppButton
                  key={c.id}
                  className={!creating && selected === c.id ? 'selected' : ''}
                  onClick={() => {
                    setCreating(false);
                    setSelected(c.id);
                  }}
                >
                  <strong>{c.name}</strong>
                  <small>
                    {c.provider === 'openai' ? 'OpenAI / Codex' : 'DeepSeek'} ·{' '}
                    {c.secrets.includes('apiKey') ? '已保存密钥' : '待填写密钥'}
                  </small>
                  <span className="ag-status">
                    {data.preferences.some((p) => p.connectionId === c.id)
                      ? '已设默认'
                      : '待测试/选择'}
                  </span>
                </AppButton>
              ))}
              {!data.connections.length && (
                <p>在右侧创建 DeepSeek 或 OpenAI 连接。</p>
              )}
            </aside>
            <div className="ag-form">
              <form className="ag-panel ag-form" onSubmit={save}>
                <h2>
                  <KeyRound size={18} />
                  {current ? '编辑模型连接' : '新增模型连接'}
                </h2>
                <div className="ag-form-grid">
                  <label>
                    供应商
                    <AppSelect
                      aria-label="模型供应商"
                      disabled={!!current || !admin}
                      value={provider}
                      onChange={(e) => {
                        setProvider(e.target.value);
                        setName(
                          e.target.value === 'openai'
                            ? 'OpenAI / Codex 企业连接'
                            : 'DeepSeek 企业连接',
                        );
                        setModel('');
                      }}
                    >
                      <option value="deepseek">DeepSeek 官方 API</option>
                      <option value="openai">OpenAI / Codex 官方 API</option>
                    </AppSelect>
                  </label>
                  <label>
                    连接名称
                    <input
                      required
                      disabled={!admin}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={120}
                    />
                  </label>
                  <label className="ag-wide">
                    API密钥
                    <input
                      aria-label="模型API密钥"
                      type="password"
                      autoComplete="new-password"
                      disabled={!admin}
                      value={apiKey}
                      placeholder={
                        current?.secrets.includes('apiKey')
                          ? '已加密保存，留空保持原密钥'
                          : '在此填写供应商API密钥'
                      }
                      onChange={(e) => setKey(e.target.value)}
                    />
                  </label>
                  <label className="ag-wide">
                    官方接口
                    <input
                      readOnly
                      value={
                        provider === 'openai'
                          ? 'https://api.openai.com/v1/responses'
                          : 'https://api.deepseek.com/chat/completions'
                      }
                    />
                  </label>
                </div>
            <a href={provider==='openai'?'https://platform.openai.com/api-keys':'https://platform.deepseek.com/api_keys'} target="_blank" rel="noopener noreferrer">前往{provider==='openai'?'OpenAI':'DeepSeek'}官方获取 API 密钥 ↗</a>
            <AppButton
              className="ag-primary"
                  disabled={!admin || busy || (!current && !apiKey.trim())}
                >
                  {busy ? '处理中…' : '1. 保存连接与密钥'}
                </AppButton>
                <small>
                  保存后不回显密钥；修改配置后需要重新测试。密钥管理要求企业管理员权限。
                </small>
              </form>
              <section className="ag-panel ag-form">
                <h2>模型选择与真实连通测试</h2>
                <AppButton
                  disabled={!current || busy}
                  onClick={() => void act('catalog.refresh')}
                >
                  2. 获取此账户的可用模型
                </AppButton>
                <div className="ag-form-grid">
                  <label>
                    账户模型列表
                    <AppSelect
                      aria-label="账户可用模型"
                      disabled={!models.length || busy}
                      value={models.includes(model) ? model : ''}
                      onChange={(e) => setModel(e.target.value)}
                    >
                      <option value="">
                        {models.length ? '请选择模型' : '获取模型后选择'}
                      </option>
                      {models.map((id) => (
                        <option value={id} key={id}>
                          {id}
                        </option>
                      ))}
                    </AppSelect>
                  </label>
                  <label>
                    模型ID
                    <input
                      aria-label="模型ID"
                      value={model}
                      maxLength={200}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="从列表选择或填写供应商可用模型ID"
                    />
                  </label>
                </div>
                <div className="ag-actions">
                  <AppButton
                    disabled={!current || !model.trim() || busy}
                    onClick={() => void act('test')}
                  >
                    3. 真实连通测试
                  </AppButton>
                  <AppButton
                    className="ag-primary"
                    disabled={
                      !current ||
                      !model.trim() ||
                      busy ||
                      last?.status !== 'success'
                    }
                    onClick={() => void act('select')}
                  >
                    4. 设为{project ? '当前项目' : '本企业'}默认模型
                  </AppButton>
                </div>
                <p>
                  测试仅向所选供应商发送固定测试口令，保存真实返回、耗时及tokens；不发送企业知识或项目资料。
                </p>
                {last && (
                  <div
                    className={`ag-alert ${last.status === 'error' ? 'error' : ''}`}
                  >
                    <strong>
                      {last.status === 'success' ? '真实推理通过' : '测试失败'}
                    </strong>
                    <p>{last.message}</p>
                    <small>
                      {last.model} · {last.latencyMs} ms · 输入{' '}
                      {last.inputTokens} / 输出 {last.outputTokens} tokens
                    </small>
                  </div>
                )}
              </section>
              <section className="ag-panel">
                <h2>测试记录</h2>
                {data.tests
                  .filter((t) => !current || t.connectionId === current.id)
                  .slice(0, 20)
                  .map((t) => (
                    <details key={t.id}>
                      <summary>
                        {t.status === 'success' ? '通过' : '失败'} ·{' '}
                        {t.kind === 'catalog' ? '获取模型' : '真实推理'} ·{' '}
                        {t.model || '账户模型列表'} · {t.latencyMs} ms
                      </summary>
                      <p>{t.message}</p>
                      <small>
                        {new Date(t.createdAt).toLocaleString('zh-CN', {
                          timeZone: 'Asia/Shanghai',
                        })}{' '}
                        · 输入 {t.inputTokens} / 输出 {t.outputTokens} tokens
                      </small>
                    </details>
                  ))}
              </section>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
