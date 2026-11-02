'use client';
import { AppButton, AppSelect } from '@/components/ui/app-controls';
import { useEffect, useRef, useState } from 'react';
import { localPptDate, type PptItem } from '@/lib/ppt-model';
import { saveBlob } from '@/lib/platform-client';
import {
  usePpt,
  asset,
  I,
  Tag,
  Button,
  Tabs,
  Panel,
  Heading,
  FileIcon,
  Assistant,
  MiniCard,
  exportText,
} from './ppt-console';
import { quietly } from './ppt-knowledge';
import { uploadPptFile } from '@/lib/ppt-client';
const src = (item: PptItem) =>
  item.image?.startsWith('/') || item.image?.startsWith('data:')
    ? item.image
    : asset(item.image || 'material-wave.jpg');
const clock = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export function BrandScreen() {
  const { state, act, save, edit, notify, nav, companyId } = usePpt(),
    [topic, setTopic] = useState(state.settings.brandTopic),
    [selected, setSelected] = useState('design-1'),
    [sourceTab, setSourceTab] = useState('平台素材'),
    [preview, setPreview] = useState<PptItem | null>(null),
    [generating, setGenerating] = useState(false);
  const materialInput = useRef<HTMLInputElement>(null);
  const settings = state.settings,
    designs = state.collections.designs;
  const materials = [
    'material-city.jpg',
    'material-building.jpg',
    'material-wave.jpg',
    'material-office.jpg',
    'material-abstract.jpg',
    'material-hall.jpg',
  ];
  async function variant() {
    setGenerating(true);
    try {
      await act('settings.save', { settings: { brandTopic: topic } });
      const generated = await save('designs', {
        id: '',
        title: `${topic} · 变体 ${designs.length - 5}`,
        ratio: settings.brandRatio,
        image: materials[(designs.length - 6) % materials.length],
        headline: topic,
        subtitle: '连接创意 共建未来',
        custom: '1',
        status: '草稿',
      });
      setSelected(generated.state.collections.designs.at(-1).id);
      notify(
        '已生成可编辑的本地品牌模板，下载或继续调整；AI生图可在接入中心配置。',
      );
    } finally {
      setGenerating(false);
    }
  }
  async function download(d: PptItem) {
    const ratio = d.ratio.split(':').map(Number),
      w = ratio[0] >= ratio[1] ? 1600 : 900,
      h = Math.round((w * ratio[1]) / ratio[0]),
      canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!,
      img = new Image();
    img.src = src(d);
    try {
      await img.decode();
      const scale = Math.max(w / img.width, h / img.height);
      ctx.drawImage(
        img,
        (w - img.width * scale) / 2,
        (h - img.height * scale) / 2,
        img.width * scale,
        img.height * scale,
      );
      if (d.custom === '1') {
        ctx.fillStyle = '#031a33bb';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = settings.brandColor;
        ctx.font = `bold ${w * 0.08}px ${settings.brandFont === '宋体' ? 'SimSun' : settings.brandFont === 'Arial' ? 'Arial' : 'Microsoft YaHei'}`;
        ctx.fillText(d.headline, w * 0.08, h * 0.32, w * 0.85);
        ctx.fillStyle = '#fff';
        ctx.font = `${w * 0.035}px Microsoft YaHei`;
        ctx.fillText(d.subtitle, w * 0.08, h * 0.44, w * 0.84);
        ctx.font = `${w * 0.02}px Microsoft YaHei`;
        ctx.fillText('创客中心 · 智慧生态平台', w * 0.08, h * 0.9);
      }
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('图片编码失败'))),
          'image/png',
        ),
      );
      const stored = await uploadPptFile(
        companyId,
        new File([blob], `${d.headline}.png`, { type: 'image/png' }),
      );
      await save('designs', { ...d, exportUrl: stored.url });
      saveBlob(`${d.headline}.png`, blob);
      notify('PNG已导出，文件副本已保存到本地数据库');
    } catch (e) {
      notify('画面导出失败，请重试');
    }
  }
  return (
    <div className="pp-brand-layout">
      <div>
        <Heading
          title="AI品牌设计 ✦"
          sub="输入主题，快速生成多场景品牌视觉内容"
        >
          <div className="pp-topic-input">
            <I name="Sparkles" />
            <input
              aria-label="品牌设计主题"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
            <Button
              primary
              onClick={() => quietly(variant())}
              disabled={generating}
            >
              立即创作 <I name="ArrowRight" size={16} />
            </Button>
          </div>
        </Heading>
        <div className="pp-design-grid">
          {designs.map((d) => (
            <article
              className={`pp-design-card ${selected === d.id ? 'selected' : ''}`}
              key={d.id}
            >
              <header>
                <span>
                  {d.title} <small>{d.ratio}</small>
                </span>
                <div>
                  <AppButton
                    aria-label={`编辑${d.title}`}
                    onClick={() =>
                      edit('designs', { ...d, custom: '1' }, [
                        'title',
                        'headline',
                        'subtitle',
                        'ratio',
                      ])
                    }
                  >
                    <I name="Pencil" size={16} />
                  </AppButton>
                  <AppButton
                    aria-label={`预览${d.title}`}
                    onClick={() => setPreview(d)}
                  >
                    <I name="EllipsisVertical" size={17} />
                  </AppButton>
                </div>
              </header>
              <AppButton
                className="pp-design-art"
                aria-label={`选择并预览${d.title}`}
                onClick={() => {
                  setSelected(d.id);
                  setPreview(d);
                }}
              >
                <img src={src(d)} alt={d.headline} />
                {d.custom === '1' && (
                  <div className="pp-design-overlay">
                    <b style={{ color: settings.brandColor }}>{d.headline}</b>
                    <span>{d.subtitle}</span>
                    <small>创客中心 · 智慧生态平台</small>
                  </div>
                )}
              </AppButton>
            </article>
          ))}
        </div>
      </div>
      <Panel
        className="pp-design-settings"
        title="设计设置"
        action={
          <Button
            icon="RotateCcw"
            onClick={() =>
              quietly(
                act('settings.save', {
                  settings: {
                    brandColor: '#23dbea',
                    brandFont: '思源黑体',
                    brandRatio: '16:9',
                  },
                }),
              )
            }
          >
            重置
          </Button>
        }
      >
        <h4>品牌色</h4>
        <div className="pp-colors">
          {['#23dbea', '#318bff', '#172650', '#e5edf4'].map((c) => (
            <AppButton
              aria-label={`品牌色${c}`}
              style={{ background: c }}
              className={settings.brandColor === c ? 'active' : ''}
              key={c}
              onClick={() =>
                quietly(act('settings.save', { settings: { brandColor: c } }))
              }
            />
          ))}
          <label title="自定义品牌色">
            <I name="Plus" size={16} />
            <input
              type="color"
              value={settings.brandColor}
              onChange={(e) =>
                quietly(
                  act('settings.save', {
                    settings: { brandColor: e.target.value },
                  }),
                )
              }
            />
          </label>
        </div>
        <h4>字体</h4>
        <AppSelect
          aria-label="设计字体"
          value={settings.brandFont}
          onChange={(e) =>
            quietly(
              act('settings.save', { settings: { brandFont: e.target.value } }),
            )
          }
        >
          {['思源黑体', '微软雅黑', '宋体', 'Arial'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </AppSelect>
        <h4>尺寸</h4>
        <div className="pp-sizes">
          {[
            ['16:9', '横版', 'RectangleHorizontal'],
            ['1:1', '方形', 'Square'],
            ['9:16', '竖版', 'RectangleVertical'],
          ].map(([r, l, i]) => (
            <AppButton
              key={r}
              className={settings.brandRatio === r ? 'active' : ''}
              onClick={() =>
                quietly(act('settings.save', { settings: { brandRatio: r } }))
              }
            >
              <I name={i} size={25} />
              <span>{l}</span>
              <small>{r}</small>
            </AppButton>
          ))}
        </div>
        <h4>素材来源</h4>
        <Tabs
          items={['平台素材', 'AI生成', '我的素材']}
          value={sourceTab}
          onChange={setSourceTab}
        />
        {sourceTab === 'AI生成' ? (
          <div className="pp-info-box">
            当前使用本地品牌模板。配置图像模型后可提交真实生图任务。
            <Button onClick={() => nav('integrations')}>查看接入流程</Button>
          </div>
        ) : sourceTab === '我的素材' ? (
          <>
            <Button
              icon="Upload"
              onClick={() => materialInput.current?.click()}
            >
              上传品牌素材
            </Button>
            <div className="pp-material-thumbs">
              {state.collections.materials
                .filter((m) => m.image)
                .map((m) => (
                  <AppButton
                    key={m.id}
                    title={m.title}
                    onClick={() =>
                      quietly(
                        save('designs', {
                          ...designs.find((d) => d.id === selected)!,
                          image: m.image,
                          custom: '1',
                        }),
                      )
                    }
                  >
                    <img src={src(m)} alt={m.title} />
                  </AppButton>
                ))}
            </div>
          </>
        ) : (
          <div className="pp-material-thumbs">
            {materials.map((m) => (
              <AppButton
                key={m}
                aria-label={`使用品牌素材${materials.indexOf(m) + 1}`}
                onClick={() => {
                  const d = designs.find((x) => x.id === selected)!;
                  quietly(save('designs', { ...d, image: m, custom: '1' }));
                }}
              >
                <img src={asset(m)} alt="品牌素材" />
              </AppButton>
            ))}
          </div>
        )}
        <Button
          primary
          icon="Sparkles"
          disabled={generating}
          onClick={() => quietly(variant())}
        >
          生成变体
        </Button>
        <div className="pp-variant-thumbs">
          {materials.slice(0, 4).map((m) => (
            <img src={asset(m)} alt="变体参考" key={m} />
          ))}
        </div>
        <input
          ref={materialInput}
          hidden
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const result = await uploadPptFile(companyId, file);
              await save('materials', {
                id: '',
                title: file.name,
                image: result.url,
                type: file.type,
                status: '已入库',
                date: localPptDate(),
              });
            } catch (e) {
              notify((e as Error).message);
            }
          }}
        />
      </Panel>
      {preview && (
        <div className="pp-modal-shade">
          <section className="pp-modal pp-art-preview">
            <header>
              <h2>
                {preview.title} · {preview.ratio}
              </h2>
              <Button icon="X" onClick={() => setPreview(null)} />
            </header>
            <div className="pp-design-art">
              <img src={src(preview)} alt={preview.headline} />
              {preview.custom === '1' && (
                <div className="pp-design-overlay">
                  <b>{preview.headline}</b>
                  <span>{preview.subtitle}</span>
                </div>
              )}
            </div>
            <footer>
              <Button
                onClick={() => {
                  edit('designs', { ...preview, custom: '1' }, [
                    'title',
                    'headline',
                    'subtitle',
                    'ratio',
                  ]);
                  setPreview(null);
                }}
                icon="Pencil"
              >
                编辑内容
              </Button>
              <Button
                primary
                icon="Download"
                onClick={() => void download(preview)}
              >
                导出 PNG
              </Button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

export function VideoScreen() {
  const { state, save, act, edit, notify, busy, companyId } = usePpt(),
    scenes = state.collections.scenes,
    [index, setIndex] = useState(1),
    [play, setPlay] = useState(false),
    [time, setTime] = useState(18),
    [filter, setFilter] = useState('全部'),
    [zoom, setZoom] = useState(1),
    [hide, setHide] = useState<string[]>([]),
    [history, setHistory] = useState<PptItem[][]>([]),
    [future, setFuture] = useState<PptItem[][]>([]),
    [exporting, setExporting] = useState(false),
    [renderPercent, setRenderPercent] = useState(0),
    [audio, setAudio] = useState<File | null>(null),
    [drag, setDrag] = useState('');
  const [editing, setEditing] = useState(false);
  async function runEdit(job: () => Promise<void>) {
    setEditing(true);
    try {
      await job();
    } finally {
      setEditing(false);
    }
  }
  const canvas = useRef<HTMLCanvasElement>(null),
    importFile = useRef<HTMLInputElement>(null),
    audioFile = useRef<HTMLInputElement>(null),
    preview = useRef<HTMLDivElement>(null),
    total = scenes.reduce((s, x) => s + Number(x.seconds || 8), 0),
    speed = Number(state.settings.videoSpeed) || 1,
    scene = scenes[index] || scenes[0];
  useEffect(() => {
    if (!play) return;
    const id = setInterval(
      () =>
        setTime((t) => {
          if (t + 0.1 * speed >= total) {
            setPlay(false);
            return 0;
          }
          return t + 0.1 * speed;
        }),
      100,
    );
    return () => clearInterval(id);
  }, [play, total, speed]);
  useEffect(() => {
    let accumulated = 0;
    for (let i = 0; i < scenes.length; i++) {
      accumulated += Number(scenes[i].seconds);
      if (time < accumulated) {
        setIndex(i);
        break;
      }
    }
  }, [time, scenes]);
  useEffect(() => {
    if (time >= total) setTime(Math.max(0, total - 0.01));
  }, [total, time]);
  function snapshot() {
    setHistory((h) => [...h.slice(-15), structuredClone(scenes)]);
    setFuture([]);
  }
  async function restore(items: PptItem[]) {
    for (const s of scenes.filter((s) => !items.some((i) => i.id === s.id)))
      await act('item.delete', { collection: 'scenes', id: s.id });
    for (const s of items) await save('scenes', s);
    await act('scenes.reorder', { ids: items.map((x) => x.id) });
  }
  async function split() {
    if (!scene) return;
    const before = scenes
        .slice(0, index)
        .reduce((s, x) => s + Number(x.seconds), 0),
      offset = Math.round((time - before) * 10) / 10,
      duration = Number(scene.seconds);
    if (offset < 0.5 || offset > duration - 0.5) {
      notify('将播放头移至片段中间再分割');
      return;
    }
    snapshot();
    await save('scenes', { ...scene, seconds: String(offset) });
    const id = crypto.randomUUID();
    await save('scenes', {
      ...scene,
      id,
      title: `${scene.title} · 分割`,
      seconds: String(duration - offset),
      start: String(Number(scene.start || 0) + offset),
    });
    const ids = scenes.flatMap((s) =>
      s.id === scene.id ? [s.id, id] : [s.id],
    );
    await act('scenes.reorder', { ids });
  }
  async function remove() {
    if (scenes.length <= 1) {
      notify('请至少保留一个片段');
      return;
    }
    snapshot();
    await act('item.delete', { collection: 'scenes', id: scene.id });
    setIndex(0);
    setTime(0);
  }
  async function render() {
    if (!canvas.current || !window.MediaRecorder) {
      notify('当前浏览器不支持本地视频导出');
      return;
    }
    setPlay(false);
    setExporting(true);
    let stream: MediaStream | undefined,
      recorder: MediaRecorder | undefined,
      sound: AudioContext | undefined,
      source: AudioBufferSourceNode | undefined;
    try {
      const c = canvas.current,
        [w, h] =
          state.settings.videoRatio === '9:16'
            ? [720, 1280]
            : state.settings.videoRatio === '1:1'
              ? [900, 900]
              : [1280, 720];
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d')!,
        loaded = await Promise.all(
          scenes.map(async (s) => {
            if (s.assetType === 'video') {
              const v = document.createElement('video');
              v.muted = true;
              v.playsInline = true;
              v.src = src(s);
              await new Promise<void>((r, j) => {
                v.onloadeddata = () => r();
                v.onerror = () => j(new Error('视频素材加载失败'));
              });
              return v;
            }
            const image = new Image();
            image.src = src(s);
            await image.decode();
            return image;
          }),
        );
      stream = c.captureStream(24);
      if (audio || state.settings.audioUrl) {
        sound = new AudioContext();
        await sound.resume();
        source = sound.createBufferSource();
        source.buffer = await sound.decodeAudioData(
          audio
            ? await audio.arrayBuffer()
            : await (await fetch(state.settings.audioUrl)).arrayBuffer(),
        );
        source.loop = true;
        const target = sound.createMediaStreamDestination();
        source.connect(target);
        target.stream.getAudioTracks().forEach((t) => stream!.addTrack(t));
        source.start();
      }
      const mime = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ].find((t) => MediaRecorder.isTypeSupported(t))!;
      if (!mime) throw new Error('当前浏览器不支持WebM编码');
      recorder = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: Math.min(
          1400000,
          Math.max(
            100000,
            Math.floor((3.5 * 1024 * 1024 * 8) / (total / speed)) - 64000,
          ),
        ),
        audioBitsPerSecond: 64000,
      });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.start(500);
      let elapsed = 0;
      for (let i = 0; i < scenes.length; i++) {
        const s = scenes[i],
          media = loaded[i],
          duration = Number(s.seconds) / speed;
        if (media instanceof HTMLVideoElement) {
          media.currentTime = Number(s.start || 0);
          media.playbackRate = speed;
          await media.play();
        }
        const start = performance.now();
        await new Promise<void>((resolve) => {
          function tick() {
            const delta = (performance.now() - start) / 1000;
            ctx.fillStyle = '#061522';
            ctx.fillRect(0, 0, w, h);
            const mw =
                media instanceof HTMLVideoElement
                  ? media.videoWidth
                  : media.naturalWidth,
              mh =
                media instanceof HTMLVideoElement
                  ? media.videoHeight
                  : media.naturalHeight,
              scale = Math.max(w / mw, h / mh);
            ctx.filter =
              state.settings.videoFilter === '黑白'
                ? 'grayscale(1)'
                : state.settings.videoFilter === '暖色'
                  ? 'sepia(.25)'
                  : 'none';
            ctx.drawImage(
              media,
              (w - mw * scale) / 2,
              (h - mh * scale) / 2,
              mw * scale,
              mh * scale,
            );
            ctx.filter = 'none';
            if (s.transition === '淡入淡出' && delta < 0.4) {
              ctx.fillStyle = `rgba(0,12,22,${1 - delta / 0.4})`;
              ctx.fillRect(0, 0, w, h);
            }
            if (!hide.includes('字幕')) {
              ctx.fillStyle = '#001428b3';
              ctx.fillRect(0, h * 0.83, w, h * 0.17);
              ctx.fillStyle = '#fff';
              ctx.textAlign = 'center';
              ctx.font = `${Math.round(w * 0.032)}px Microsoft YaHei`;
              ctx.fillText(s.caption || '', w / 2, h * 0.92, w * 0.9);
            }
            setRenderPercent(
              Math.min(
                100,
                Math.round(((elapsed + delta) / (total / speed)) * 100),
              ),
            );
            if (delta >= duration) resolve();
            else requestAnimationFrame(tick);
          }
          tick();
        });
        elapsed += duration;
        if (media instanceof HTMLVideoElement) media.pause();
      }
      await new Promise<void>((r) => {
        recorder!.onstop = () => r();
        recorder!.stop();
      });
      const rendered = new Blob(chunks, { type: 'video/webm' });
      saveBlob('创客中心宣传片.webm', rendered);
      const resultUrl =
        rendered.size <= 4 * 1024 * 1024
          ? await storeMedia(
              new File([rendered], '创客中心宣传片.webm', {
                type: 'video/webm',
              }),
            )
          : '';
      await act('settings.save', {
        settings: {
          videoExportedAt: new Date().toISOString(),
          videoResultUrl: resultUrl,
        },
      });
      notify('视频已在本地生成并下载，项目时间轴已保存。');
    } catch (e) {
      notify((e as Error).message);
    } finally {
      if (recorder?.state === 'recording') recorder.stop();
      stream?.getTracks().forEach((t) => t.stop());
      try {
        source?.stop();
      } catch {}
      if (sound) await sound.close();
      setExporting(false);
    }
  }
  async function storeMedia(file: File) {
    if (file.size > 4 * 1024 * 1024) throw new Error('本地素材单文件上限4MB');
    const data = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1]);
      r.onerror = () => reject(new Error('文件读取失败'));
      r.readAsDataURL(file);
    });
    const response = await fetch('/api/platform/ppt/files', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        companyId,
        name: file.name,
        mime: file.type,
        data,
      }),
    });
    const result = (await response.json()) as { url: string; error?: string };
    if (!response.ok) throw new Error(result.error);
    return result.url;
  }
  async function importMedia(file: File) {
    if (file.size > 4 * 1024 * 1024) {
      notify('本地演示素材单文件上限4MB');
      return;
    }
    try {
      const base64 = await new Promise<string>((r) => {
        const reader = new FileReader();
        reader.onload = () => r(String(reader.result).split(',')[1]);
        reader.readAsDataURL(file);
      });
      const response = await fetch('/api/platform/ppt/files', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          companyId,
          name: file.name,
          mime: file.type,
          data: base64,
        }),
      });
      const d = (await response.json()) as { error?: string; url: string };
      if (!response.ok) throw new Error(d.error);
      await save('scenes', {
        id: '',
        title: file.name,
        seconds: '8',
        caption: '在这里，连接更多可能',
        image: d.url,
        assetType: file.type.startsWith('video/') ? 'video' : 'image',
        transition: '淡入淡出',
      });
    } catch (e) {
      notify((e as Error).message);
    }
  }
  return (
    <>
      <div className="pp-video-top">
        <Panel
          title={
            <>
              项目素材 <small>（{scenes.length}）</small>
            </>
          }
          action={
            <Button icon="Plus" onClick={() => importFile.current?.click()}>
              导入素材
            </Button>
          }
        >
          <input
            hidden
            ref={importFile}
            type="file"
            accept="image/*,video/*"
            onChange={(e) =>
              e.target.files?.[0] && void importMedia(e.target.files[0])
            }
          />
          <Tabs
            items={['全部', '视频', '图片', '音频', '收藏']}
            value={filter}
            onChange={setFilter}
          />
          <div className="pp-video-library">
            {scenes
              .filter(
                (s) =>
                  filter === '全部' ||
                  (filter === '收藏' && s.favorite === '1') ||
                  (filter === '视频'
                    ? s.assetType === 'video'
                    : filter === '图片'
                      ? s.assetType !== 'video'
                      : false),
              )
              .slice(0, 9)
              .map((s, i) => (
                <AppButton
                  key={s.id}
                  onClick={() => {
                    setIndex(scenes.findIndex((x) => x.id === s.id));
                    setTime(
                      scenes
                        .slice(
                          0,
                          scenes.findIndex((x) => x.id === s.id),
                        )
                        .reduce((n, x) => n + Number(x.seconds), 0),
                    );
                  }}
                >
                  {s.assetType === 'video' ? (
                    <video src={src(s)} />
                  ) : (
                    <img src={src(s)} alt={s.title} />
                  )}
                  <small>{clock(Number(s.seconds))}</small>
                  <span>
                    <I
                      name={s.assetType === 'video' ? 'Film' : 'Image'}
                      size={13}
                    />{' '}
                    {String(i + 1).padStart(2, '0')}_{s.title}.mp4
                  </span>
                </AppButton>
              ))}
          </div>
          {filter === '音频' && (
            <div className="pp-audio-select">
              <I name="Music" size={35} />
              <p>{audio?.name || state.settings.audioName}</p>
              <Button onClick={() => audioFile.current?.click()}>
                导入配乐
              </Button>
            </div>
          )}
        </Panel>
        <Panel title="视频预览">
          <div
            className="pp-video-preview"
            ref={preview}
            style={{
              aspectRatio: state.settings.videoRatio.replace(':', '/'),
              filter:
                state.settings.videoFilter === '黑白'
                  ? 'grayscale(1)'
                  : state.settings.videoFilter === '暖色'
                    ? 'sepia(.25)'
                    : 'none',
            }}
          >
            {scene?.assetType === 'video' ? (
              <video src={src(scene)} controls />
            ) : (
              <img
                src={
                  scene
                    ? index === 1
                      ? asset('video-preview.jpg')
                      : src(scene)
                    : ''
                }
                alt={scene?.title}
              />
            )}
            <span className="pp-preview-caption">{scene?.caption}</span>
          </div>
          <div className="pp-player">
            <AppButton
              aria-label={play ? '暂停' : '播放'}
              onClick={() => setPlay(!play)}
            >
              <I name={play ? 'Pause' : 'Play'} size={23} />
            </AppButton>
            <span>
              {clock(time)} / {clock(total)}
            </span>
            <input
              aria-label="视频播放进度"
              type="range"
              min={0}
              max={total}
              step={0.1}
              value={time}
              onChange={(e) => setTime(Number(e.target.value))}
            />
            <I name="Volume2" size={20} />
            <AppSelect
              aria-label="画面比例"
              value={state.settings.videoRatio}
              onChange={(e) =>
                quietly(
                  act('settings.save', {
                    settings: { videoRatio: e.target.value },
                  }),
                )
              }
            >
              {['16:9', '9:16', '1:1'].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </AppSelect>
            <AppButton
              aria-label="全屏预览"
              onClick={() => void preview.current?.requestFullscreen()}
            >
              <I name="Maximize" size={17} />
            </AppButton>
          </div>
        </Panel>
        <Panel
          title={
            <>
              <I name="Sparkles" /> AI剪辑助手
            </>
          }
        >
          <div className="pp-video-ai">
            {[
              [
                '脚本',
                '基于主题生成视频脚本',
                'FileText',
                '生成脚本',
                'purple',
              ],
              [
                '分镜',
                '智能拆分镜头与场景',
                'PanelsTopLeft',
                '智能分镜',
                'blue',
              ],
              ['字幕', '依据镜头文案补齐字幕', 'Type', '生成字幕', 'green'],
              ['包装', '智能匹配片头片尾与模板', 'Box', '应用模板', 'gold'],
            ].map(([t, s, i, b, c], n) => (
              <div className={`pp-video-ai-card ${c}`} key={t}>
                <span>
                  <I name={i} size={30} />
                </span>
                <section>
                  <h3>{t}</h3>
                  <small>{s}</small>
                </section>
                <Button
                  onClick={() =>
                    quietly(
                      act(
                        [
                          'video.script',
                          'video.storyboard',
                          'video.captions',
                          'video.template',
                        ][n],
                      ),
                    )
                  }
                >
                  {b}
                </Button>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      {state.settings.videoScript && (
        <Panel title="视频脚本 · 本地规则草稿">
          <textarea
            aria-label="视频脚本"
            style={{ width: '100%', minHeight: 110 }}
            key={state.settings.videoScript}
            defaultValue={state.settings.videoScript}
            onBlur={(e) =>
              quietly(
                act('settings.save', {
                  settings: { videoScript: e.target.value },
                }),
              )
            }
          />
        </Panel>
      )}
      <Panel className="pp-timeline">
        <div className="pp-timeline-toolbar">
          <h3>
            时间轴 <small>｜ 创客中心宣传片</small>
          </h3>
          <span className="pp-muted">{busy ? '保存中…' : '已自动保存'}</span>
          <div className="pp-timeline-tools">
            <Button
              icon="Undo2"
              disabled={!history.length || editing || busy || exporting}
              onClick={() => {
                const old = history.at(-1)!;
                setFuture((f) => [...f, structuredClone(scenes)]);
                setHistory((h) => h.slice(0, -1));
                quietly(runEdit(() => restore(old)));
              }}
            />
            <Button
              icon="Redo2"
              disabled={!future.length || editing || busy || exporting}
              onClick={() => {
                const next = future.at(-1)!;
                setHistory((h) => [...h, structuredClone(scenes)]);
                setFuture((f) => f.slice(0, -1));
                quietly(runEdit(() => restore(next)));
              }}
            />
            <Button
              icon="Scissors"
              disabled={editing || busy || exporting}
              onClick={() => quietly(runEdit(split))}
            >
              分割
            </Button>
            <Button
              icon="Trash2"
              disabled={editing || busy || exporting}
              onClick={() => quietly(runEdit(remove))}
            >
              删除
            </Button>
            <Button
              icon="Crop"
              onClick={() =>
                edit('scenes', scene, ['title', 'seconds', 'caption'])
              }
            >
              裁剪
            </Button>
            <AppSelect
              aria-label="变速"
              value={state.settings.videoSpeed}
              onChange={(e) =>
                quietly(
                  act('settings.save', {
                    settings: { videoSpeed: e.target.value },
                  }),
                )
              }
            >
              {['0.5', '1', '1.5', '2'].map((s) => (
                <option value={s} key={s}>
                  {s}x 变速
                </option>
              ))}
            </AppSelect>
            <Button
              icon="BetweenHorizontalStart"
              onClick={() => edit('scenes', scene, ['transition'])}
            >
              转场
            </Button>
            <Button
              icon="Type"
              onClick={() => edit('scenes', scene, ['caption'])}
            >
              文字
            </Button>
            <AppSelect
              aria-label="滤镜调色"
              value={state.settings.videoFilter}
              onChange={(e) =>
                quietly(
                  act('settings.save', {
                    settings: { videoFilter: e.target.value },
                  }),
                )
              }
            >
              {['原色', '黑白', '暖色'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </AppSelect>
          </div>
          <Button
            primary
            icon="FileOutput"
            disabled={exporting || editing || busy}
            onClick={() => void render()}
          >
            {exporting ? `导出中 ${renderPercent}%` : '导出视频'}
          </Button>
        </div>
        <div className="pp-timeline-scroll">
          <div
            className="pp-time-track"
            style={{ minWidth: Math.max(900, 900 * zoom) }}
          >
            <div className="pp-time-ruler">
              <span />
              <div>
                {Array.from({ length: 9 }, (_, i) => (
                  <AppButton key={i} onClick={() => setTime((total * i) / 8)}>
                    {clock((total * i) / 8)}
                  </AppButton>
                ))}
              </div>
            </div>
            <div
              className="pp-playhead"
              style={{
                left: `calc(102px + (100% - 112px) * ${time / (total || 1)})`,
              }}
            >
              <i />
            </div>
            {['画面', '字幕', '配音'].map((track, t) => (
              <div className={`pp-track-row track-${t}`} key={track}>
                <header>
                  <I name={['Film', 'Type', 'Mic'][t]} />
                  <span>{track}</span>
                  <AppButton
                    aria-label={`切换${track}轨道可见性`}
                    onClick={() =>
                      setHide((h) =>
                        h.includes(track)
                          ? h.filter((x) => x !== track)
                          : [...h, track],
                      )
                    }
                  >
                    <I
                      name={hide.includes(track) ? 'EyeOff' : 'Eye'}
                      size={15}
                    />
                  </AppButton>
                </header>
                <div
                  className={`pp-track-clips ${hide.includes(track) ? 'muted' : ''}`}
                >
                  {t < 2 ? (
                    scenes.map((s, i) => (
                      <AppButton
                        key={s.id}
                        draggable
                        onDragStart={() => setDrag(s.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (drag === s.id) return;
                          const ids = scenes
                            .filter((x) => x.id !== drag)
                            .map((x) => x.id);
                          ids.splice(ids.indexOf(s.id), 0, drag);
                          snapshot();
                          quietly(act('scenes.reorder', { ids }));
                        }}
                        className={`pp-clip ${index === i ? 'selected' : ''}`}
                        style={{ flex: Number(s.seconds) }}
                        onClick={() => {
                          setIndex(i);
                          setTime(
                            scenes
                              .slice(0, i)
                              .reduce((n, x) => n + Number(x.seconds), 0),
                          );
                        }}
                        onDoubleClick={() =>
                          edit(
                            'scenes',
                            s,
                            t === 0
                              ? ['title', 'seconds', 'transition']
                              : ['caption'],
                          )
                        }
                      >
                        {t === 0 ? (
                          <>
                            {s.assetType === 'video' ? (
                              <video src={src(s)} />
                            ) : (
                              <img src={src(s)} alt={s.title} />
                            )}
                            <span>
                              {String(i + 1).padStart(2, '0')}_{s.title}.mp4
                            </span>
                            <small>{clock(Number(s.seconds))}</small>
                          </>
                        ) : (
                          <>
                            <I name="Type" size={18} />
                            {s.caption}
                          </>
                        )}
                      </AppButton>
                    ))
                  ) : (
                    <AppButton
                      className="pp-waveform"
                      onClick={() => audioFile.current?.click()}
                    >
                      <I name="Music" />
                      <span>{audio?.name || state.settings.audioName}</span>
                      <svg
                        viewBox="0 0 900 40"
                        preserveAspectRatio="none"
                        aria-label="示意音频波形"
                      >
                        {Array.from({ length: 225 }, (_, i) => (
                          <path
                            key={i}
                            d={`M${i * 4} ${20 - (Math.abs(Math.sin(i * 2.13) * Math.cos(i * 0.24)) * 17 + 2)}v${(Math.abs(Math.sin(i * 2.13) * Math.cos(i * 0.24)) * 17 + 2) * 2}`}
                            stroke="#49ddbd"
                          />
                        ))}
                      </svg>
                    </AppButton>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <footer className="pp-timeline-footer">
          <small>
            双击轨道编辑 · 拖动片段排序 · {scene?.title}：{scene?.seconds}s ·{' '}
            {scene?.transition}
          </small>
          <div className="pp-inline">
            <Button
              icon="FileText"
              onClick={() => {
                let cursor = 0;
                const stamp = (n: number) =>
                  new Date(n * 1000)
                    .toISOString()
                    .slice(11, 23)
                    .replace('.', ',');
                saveBlob(
                  '创客中心宣传片字幕.srt',
                  new Blob(
                    [
                      scenes
                        .map((s, i) => {
                          const start = cursor;
                          cursor += Number(s.seconds);
                          return `${i + 1}\n${stamp(start)} --> ${stamp(cursor)}\n${s.caption}\n`;
                        })
                        .join('\n'),
                    ],
                    { type: 'text/plain;charset=utf-8' },
                  ),
                );
              }}
            >
              导出字幕
            </Button>
            <I name="ZoomOut" size={15} />
            <input
              aria-label="时间轴缩放"
              type="range"
              min={1}
              max={3}
              step={0.25}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
            <I name="ZoomIn" size={15} />
          </div>
        </footer>
      </Panel>
      <input
        hidden
        type="file"
        accept="audio/*"
        ref={audioFile}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            try {
              const audioUrl = await storeMedia(file);
              setAudio(file);
              await act('settings.save', {
                settings: { audioName: file.name, audioUrl },
              });
            } catch (e) {
              notify((e as Error).message);
            }
          }
        }}
      />
      <canvas
        ref={canvas}
        className={exporting ? 'pp-render-canvas' : 'pp-hidden-canvas'}
      />
      {exporting && (
        <div className="pp-render-progress">
          正在本地生成成片，请保持页面打开。{renderPercent}%
        </div>
      )}
    </>
  );
}

export function DocumentScreen() {
  const { state, save, act, edit, notify, companyId, busy } = usePpt(),
    [selected, setSelected] = useState(
      state.settings.activeDocument || state.collections.documents[0].id,
    ),
    [tab, setTab] = useState('文档大纲'),
    [aiTab, setAiTab] = useState('生成'),
    [section, setSection] = useState(1),
    [present, setPresent] = useState(false),
    [query, setQuery] = useState(''),
    [format, setFormat] = useState({
      bold: false,
      italic: false,
      align: 'left',
      font: '思源黑体',
      size: '16',
      style: '正文',
    });
  const doc =
      state.collections.documents.find((d) => d.id === selected) ||
      state.collections.documents[0],
    [draft, setDraft] = useState(doc.content);
  const [assistantAnswer, setAssistantAnswer] = useState('');
  const imageInput = useRef<HTMLInputElement>(null);
  useEffect(() => setDraft(doc.content), [doc.id, doc.content]);
  useEffect(() => {
    try {
      setFormat({
        ...{
          bold: false,
          italic: false,
          align: 'left',
          font: '思源黑体',
          size: '16',
          style: '正文',
        },
        ...JSON.parse(doc.format || '{}'),
      });
    } catch {
      setFormat({
        bold: false,
        italic: false,
        align: 'left',
        font: '思源黑体',
        size: '16',
        style: '正文',
      });
    }
  }, [doc.id, doc.format]);
  function changeFormat(next: typeof format) {
    setFormat(next);
    quietly(
      save('documents', {
        ...doc,
        content: draft,
        format: JSON.stringify(next),
      }),
    );
  }
  async function assistantRequest() {
    if (!query.trim()) {
      notify('请输入文档需求或问题');
      return;
    }
    try {
      if (aiTab === '问答') {
        const result = await act('knowledge.ask', { question: query });
        setAssistantAnswer(result.answer);
      } else {
        await save('documents', {
          ...doc,
          content: draft,
          format: JSON.stringify(format),
        });
        await act('document.generate', {
          id: doc.id,
          instruction: query,
          mode: aiTab,
        });
      }
      setQuery('');
    } catch {}
  }
  async function exportDoc(type: 'Word' | 'PPT') {
    try {
      await save('documents', {
        ...doc,
        content: draft,
        format: JSON.stringify(format),
      });
      if (type === 'PPT') {
        const { default: PptxGenJS } = await import('pptxgenjs'),
          ppt = new PptxGenJS();
        ppt.layout = 'LAYOUT_WIDE';
        ppt.author = '创客中心';
        ppt.subject = 'PPT演示空间 · 可编辑文档';
        const sections = (
          doc.outline || '企业服务方案\n总体方案架构\n实施计划'
        ).split('\n');
        for (const [tIndex, title] of sections.entries()) {
          const slide = ppt.addSlide();
          slide.background = { color: tIndex ? 'F3F8FC' : '041C35' };
          slide.addText(title, {
            x: 0.65,
            y: 0.5,
            w: 11.8,
            h: 0.8,
            fontSize: 30,
            bold: true,
            color: tIndex ? '123450' : '36DCE8',
            fontFace: 'Microsoft YaHei',
          });
          slide.addText(tIndex ? draft : doc.title, {
            x: 0.7,
            y: 1.7,
            w: 11.5,
            h: 4.3,
            fontSize: tIndex ? 17 : 33,
            bold: format.bold,
            italic: format.italic,
            align: format.align === 'center' ? 'center' : 'left',
            color: tIndex ? '253D50' : 'FFFFFF',
            breakLine: false,
            fontFace:
              format.font === '思源黑体' ? 'Microsoft YaHei' : format.font,
            fit: 'shrink',
          });
          slide.addText('创客中心 · 智慧生态平台', {
            x: 0.7,
            y: 6.8,
            w: 7,
            h: 0.3,
            fontSize: 10,
            color: '628397',
          });
        }
        const blob = (await ppt.write({ outputType: 'blob' })) as Blob;
        const stored = await uploadPptFile(
          companyId,
          new File([blob], `${doc.title}.pptx`, {
            type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          }),
        );
        await save('documents', {
          ...doc,
          content: draft,
          format: JSON.stringify(format),
          exportUrl: stored.url,
          exportType: type,
          pptUrl: stored.url,
        });
        saveBlob(`${doc.title}.pptx`, blob);
      } else {
        const { default: JSZip } = await import('jszip'),
          zip = new JSZip(),
          escape = (s: string) =>
            s
              .replaceAll('&', '&amp;')
              .replaceAll('<', '&lt;')
              .replaceAll('>', '&gt;');
        zip.file(
          '[Content_Types].xml',
          '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
        );
        zip.file(
          '_rels/.rels',
          '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
        );
        zip.file(
          'word/document.xml',
          `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${[doc.title, ...draft.split('\n')].map((t) => `<w:p><w:pPr><w:jc w:val="${format.align === 'center' ? 'center' : 'left'}"/></w:pPr><w:r><w:rPr>${format.bold ? '<w:b/>' : ''}${format.italic ? '<w:i/>' : ''}<w:sz w:val="${Number(format.size) * 2}"/><w:rFonts w:ascii="${escape(format.font)}" w:eastAsia="${escape(format.font)}"/></w:rPr><w:t xml:space="preserve">${escape(t)}</w:t></w:r></w:p>`).join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`,
        );
        const blob = await zip.generateAsync({
          type: 'blob',
          mimeType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
        const stored = await uploadPptFile(
          companyId,
          new File([blob], `${doc.title}.docx`, {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          }),
        );
        await save('documents', {
          ...doc,
          content: draft,
          format: JSON.stringify(format),
          exportUrl: stored.url,
          exportType: type,
          wordUrl: stored.url,
        });
        saveBlob(`${doc.title}.docx`, blob);
      }
      notify(`已导出可编辑${type}文件`);
    } catch (e) {
      notify((e as Error).message);
    }
  }
  return (
    <>
      <Heading title="AI文档与PPT　›　企业服务方案">
        <small>
          {busy
            ? '正在保存…'
            : draft === doc.content
              ? '☁ 内容已保存'
              : '有未保存内容'}
        </small>
        <Button primary icon="Play" onClick={() => setPresent(true)}>
          演示模式
        </Button>
        <Button
          icon="Save"
          onClick={() => quietly(save('documents', { ...doc, content: draft }))}
        >
          保存
        </Button>
        {doc.wordUrl && (
          <a className="pp-btn" href={doc.wordUrl} download>
            下载Word文件
          </a>
        )}
        {doc.pptUrl && (
          <a className="pp-btn" href={doc.pptUrl} download>
            下载PPT文件
          </a>
        )}
        {doc.exportUrl && !doc.wordUrl && !doc.pptUrl && (
          <a className="pp-btn" href={doc.exportUrl} download>
            下载最近导出文件
          </a>
        )}
      </Heading>
      <div className="pp-doc-filetab">
        <I name="FileText" size={16} />
        {doc.title}
        <Button
          icon="Plus"
          onClick={() =>
            edit('documents', {
              id: '',
              title: '新建企业方案',
              type: 'PPT',
              content: '项目背景与需求\n\n企业服务方案\n\n实施计划与验收',
              outline:
                '项目背景与需求\n企业服务方案\n项目目标\n实施保障\n总结与展望',
              pages: '5',
              status: '草稿',
            })
          }
        />
      </div>
      <div className="pp-doc-layout">
        <Panel className="pp-doc-outline">
          <Tabs
            items={['文档大纲', '幻灯片预览']}
            value={tab}
            onChange={setTab}
          />
          {(
            doc.outline ||
            '项目背景与需求\n企业服务方案\n项目目标\n实施保障\n总结与展望'
          )
            .split('\n')
            .map((s, i) => (
              <AppButton
                className={section === i ? 'selected' : ''}
                key={i}
                onClick={() => setSection(i)}
              >
                {tab === '幻灯片预览' ? (
                  <div className="pp-slide-mini">
                    <b>{String(i + 1).padStart(2, '0')}</b>
                    {s}
                  </div>
                ) : (
                  <>
                    <b>
                      {['一', '二', '三', '四', '五', '六'][i % 6]}、{s}
                    </b>
                    <small>
                      {i + 1}.1　
                      {
                        [
                          '行业趋势分析',
                          '总体方案架构',
                          '业务目标',
                          '组织保障',
                          '方案价值',
                        ][i % 5]
                      }
                      <br />
                      {i + 1}.2　核心功能模块
                      <br />
                      {i + 1}.3　实施路径与计划
                    </small>
                  </>
                )}
              </AppButton>
            ))}
          <Button
            icon="ListPlus"
            onClick={() => edit('documents', doc, ['outline'])}
          >
            编辑大纲
          </Button>
        </Panel>
        <Panel className="pp-doc-canvas">
          <div className="pp-format-toolbar">
            <Button icon="Undo2" onClick={() => setDraft(doc.content)} />
            <AppSelect
              aria-label="文本格式"
              value={format.style}
              onChange={(e) =>
                changeFormat({
                  ...format,
                  style: e.target.value,
                  size: e.target.value === '标题' ? '24' : '16',
                  bold: e.target.value === '标题',
                })
              }
            >
              <option>正文</option>
              <option>标题</option>
            </AppSelect>
            <AppSelect
              aria-label="文档字体"
              value={format.font}
              onChange={(e) =>
                changeFormat({ ...format, font: e.target.value })
              }
            >
              <option>思源黑体</option>
              <option>微软雅黑</option>
            </AppSelect>
            <AppSelect
              aria-label="文档字号"
              value={format.size}
              onChange={(e) =>
                changeFormat({ ...format, size: e.target.value })
              }
            >
              <option>16</option>
              <option>18</option>
              <option>24</option>
            </AppSelect>
            <Button
              icon="Bold"
              primary={format.bold}
              onClick={() => changeFormat({ ...format, bold: !format.bold })}
            />
            <Button
              icon="Italic"
              primary={format.italic}
              onClick={() =>
                changeFormat({ ...format, italic: !format.italic })
              }
            />
            <Button
              icon="AlignLeft"
              onClick={() => changeFormat({ ...format, align: 'left' })}
            />
            <Button
              icon="AlignCenter"
              onClick={() => changeFormat({ ...format, align: 'center' })}
            />
            <Button icon="Image" onClick={() => imageInput.current?.click()} />
          </div>
          <div className="pp-doc-pages">
            <div className="pp-doc-cover">
              <header>
                创客中心
                <br />
                智慧生态平台
              </header>
              <h1>{doc.title}</h1>
              <h3>以数字化与AI能力，助力企业高质量发展</h3>
              <i />
              <div>
                <span>
                  <I name="Building2" />
                  数字化升级
                </span>
                <span>
                  <I name="Network" />
                  生态协同
                </span>
                <span>
                  <I name="ChartNoAxesCombined" />
                  智能决策
                </span>
              </div>
              <img src={asset('document-city.jpg')} alt="智慧城市" />
              <small>开放 · 协同 · 创新 · 共赢</small>
            </div>
            <div className="pp-doc-paper">
              <h2>
                <em>{String(section + 1).padStart(2, '0')}</em>{' '}
                {(doc.outline || '企业服务方案').split('\n')[section] ||
                  '企业服务方案'}
              </h2>
              <small>
                基于企业真实业务场景，提供可落地、可持续的数字化解决方案
              </small>
              <h3>2.1　总体方案架构</h3>
              <p>
                围绕“数据 + 业务 + AI +
                生态”的总体思路，构建覆盖企业全生命周期的智慧服务体系。
              </p>
              <div className="pp-doc-diagram">
                <span>
                  业务应用
                  <small>
                    流程数字化
                    <br />
                    场景化解决方案
                  </small>
                </span>
                <span>
                  AI 能力
                  <small>
                    智能文档与PPT
                    <br />
                    知识问答与分析
                  </small>
                </span>
                <b>
                  智慧生态平台
                  <br />
                  企业服务方案
                </b>
                <span>
                  数据中台
                  <small>
                    数据治理
                    <br />
                    统一数据资产
                  </small>
                </span>
                <span>
                  生态资源
                  <small>
                    产业链合作
                    <br />
                    供需资源对接
                  </small>
                </span>
              </div>
              {doc.image && (
                <img
                  style={{
                    width: '100%',
                    maxHeight: 130,
                    objectFit: 'contain',
                  }}
                  src={doc.image}
                  alt="方案附图"
                />
              )}
              <input
                ref={imageInput}
                hidden
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    const result = await uploadPptFile(companyId, f);
                    await save('documents', {
                      ...doc,
                      content: draft,
                      image: result.url,
                    });
                  } catch (e) {
                    notify((e as Error).message);
                  }
                }}
              />
              <h3>2.2　方案内容（可编辑）</h3>
              <textarea
                aria-label="方案文档正文"
                style={{
                  fontWeight: format.bold ? 'bold' : 'normal',
                  fontStyle: format.italic ? 'italic' : 'normal',
                  textAlign: format.align as any,
                  fontFamily:
                    format.font === '思源黑体'
                      ? 'sans-serif'
                      : 'Microsoft YaHei',
                  fontSize: Number(format.size) * 0.7,
                }}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() =>
                  draft !== doc.content &&
                  quietly(save('documents', { ...doc, content: draft }))
                }
              />
            </div>
          </div>
        </Panel>
        <Assistant title="AI 助手">
          <Tabs
            items={['生成', '优化', '问答']}
            value={aiTab}
            onChange={setAiTab}
          />
          {assistantAnswer && (
            <div className="pp-ai-answer">{assistantAnswer}</div>
          )}
          <h3>你好，我是你的 AI 助手</h3>
          <p>基于企业知识库，帮助你快速生成专业的文档与演示材料。</p>
          {[
            ['引用企业知识', '基于企业已有资料生成内容', 'BookOpen'],
            ['生成提案', '一键形成完整方案文档', 'FilePlus2'],
            ['调整结构', '优化内容结构与逻辑', 'ListTree'],
            ['导出Word', '生成可编辑的Word文档', 'FileText'],
            ['导出PPT', '生成可编辑演示文稿', 'Presentation'],
          ].map(([t, s, i], n) => (
            <AppButton
              className="pp-doc-ai-action"
              key={t}
              onClick={() =>
                n === 3
                  ? void exportDoc('Word')
                  : n === 4
                    ? void exportDoc('PPT')
                    : n === 2
                      ? edit('documents', doc, ['outline'])
                      : n === 0
                        ? setDraft(
                            draft +
                              '\n\n引用企业知识：\n' +
                              state.collections.knowledge[0].content,
                          )
                        : quietly(
                            act('document.generate', {
                              id: doc.id,
                              instruction:
                                query ||
                                '生成企业服务提案，包含业务依据、方案内容、执行计划和待确认事项。',
                            }),
                          )
              }
            >
              <I name={i} size={29} />
              <span>
                <b>{t}</b>
                <small>{s}</small>
              </span>
            </AppButton>
          ))}
          <div className="pp-assistant-input">
            <textarea
              aria-label="文档助手需求"
              placeholder="描述你的需求，例如：基于产品介绍生成客户提案…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button
              primary
              icon="Send"
              disabled={busy}
              onClick={() => void assistantRequest()}
            />
          </div>
        </Assistant>
      </div>
      <Panel
        title="最近生成的文档与演示"
        className="pp-recent-docs"
        action={<small>基于企业知识库生成 · 可编辑 · 可导出</small>}
      >
        <div>
          {state.collections.documents.map((d) => (
            <AppButton
              className={d.id === doc.id ? 'selected' : ''}
              key={d.id}
              onClick={() => setSelected(d.id)}
            >
              <span
                className={`pp-doc-thumb ${d.type === 'Word' ? 'white' : ''}`}
              >
                <I
                  name={d.type === 'Word' ? 'FileText' : 'Presentation'}
                  size={24}
                />
              </span>
              <section>
                <b>{d.title}</b>
                <small>
                  <Tag tone={d.type === 'PPT' ? 'red' : 'blue'}>{d.type}</Tag>{' '}
                  {d.pages}页　{d.date || '2024-06-24'}
                </small>
              </section>
            </AppButton>
          ))}
        </div>
      </Panel>
      {present && (
        <div className="pp-presentation">
          <header>
            <h3>{doc.title}</h3>
            <Button icon="X" onClick={() => setPresent(false)}>
              退出演示
            </Button>
          </header>
          <div className="pp-present-slide">
            <small>创客中心 · 智慧生态平台</small>
            <h1>
              {(doc.outline || '企业服务方案').split('\n')[section] ||
                doc.title}
            </h1>
            <p>{draft}</p>
            <img src={asset('document-city.jpg')} alt="城市" />
          </div>
          <footer>
            <Button onClick={() => setSection((s) => Math.max(0, s - 1))}>
              上一页
            </Button>
            <span>
              {section + 1} /{' '}
              {(doc.outline || '企业服务方案').split('\n').length}
            </span>
            <Button
              primary
              onClick={() =>
                setSection((s) =>
                  Math.min((doc.outline || '').split('\n').length - 1, s + 1),
                )
              }
            >
              下一页
            </Button>
          </footer>
        </div>
      )}
    </>
  );
}
