'use client';
import { AppButton, AppSelect } from '@/components/ui/app-controls';
import { useEffect, useRef, useState } from 'react';
import { Download, Film, Play, Plus, Save, Trash2 } from 'lucide-react';
import type { BusinessRecord } from '@/lib/platform-config';
import {
  saveBlob,
  uploadBusinessFile,
  type BusinessFile,
} from '@/lib/platform-client';
type Scene = { text: string; seconds: number; assetId: string; start?: number };
function initial(r: BusinessRecord): Scene[] {
  try {
    const a = JSON.parse(r.data.timeline || 'null');
    if (Array.isArray(a) && a.length) return a;
  } catch {
    /* Start from script. */
  }
  return r.data.script
    .split('\n')
    .filter(Boolean)
    .map((text) => ({
      text,
      seconds: Number(r.data.seconds) || 4,
      assetId: '',
    }))
    .slice(0, 30);
}
const time = (seconds: number) =>
  new Date(seconds * 1000).toISOString().slice(11, 23).replace('.', ',');
export default function PlatformVideo({
  record,
  files,
  onSave,
  onRendered,
  onBusy,
}: {
  record: BusinessRecord;
  files: BusinessFile[];
  onSave: (data: Record<string, string>) => Promise<void>;
  onRendered?: () => Promise<void>;
  onBusy?: (busy: boolean) => void;
}) {
  const [scenes, setScenes] = useState<Scene[]>(() => initial(record)),
    [index, setIndex] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [saved, setSaved] = useState(''),
    [audioId, setAudioId] = useState(record.data.audioId || ''),
    [audioVolume, setAudioVolume] = useState(
      Number(record.data.audioVolume || '0.6'),
    ),
    canvas = useRef<HTMLCanvasElement>(null),
    assets = useRef(new Map<string, HTMLImageElement | HTMLVideoElement>()),
    urls = useRef<string[]>([]);
  const dimensions =
    record.data.ratio === '9:16'
      ? [720, 1280]
      : record.data.ratio === '1:1'
        ? [900, 900]
        : [1280, 720];
  const total = scenes.reduce((s, x) => s + x.seconds, 0),
    locked = record.status !== '草稿';
  async function load(id: string) {
    if (!id) return undefined;
    if (assets.current.has(id)) return assets.current.get(id);
    const file = files.find((f) => f.id === id);
    if (!file) return undefined;
    const response = await fetch(
      `/api/platform/files?companyId=${encodeURIComponent(record.companyId)}&id=${encodeURIComponent(id)}`,
    );
    if (!response.ok) throw new Error('素材加载失败');
    const url = URL.createObjectURL(await response.blob());
    urls.current.push(url);
    let element: HTMLImageElement | HTMLVideoElement;
    if (file.mime.startsWith('video/')) {
      element = document.createElement('video');
      element.muted = true;
      element.loop = true;
      element.playsInline = true;
      element.src = url;
      await new Promise<void>((resolve, reject) => {
        element.onloadeddata = () => resolve();
        element.onerror = () => reject(new Error('视频素材解码失败'));
      });
    } else {
      element = new Image();
      element.src = url;
      await new Promise<void>((resolve, reject) => {
        element.onload = () => resolve();
        element.onerror = () => reject(new Error('图片素材解码失败'));
      });
    }
    assets.current.set(id, element);
    return element;
  }
  function draw(scene: Scene, n: number) {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const [w, h] = dimensions;
    if (c.width !== w) c.width = w;
    if (c.height !== h) c.height = h;
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#07172a');
    g.addColorStop(1, '#12667b');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const media = assets.current.get(scene.assetId);
    if (media) {
      const mw =
          media instanceof HTMLVideoElement
            ? media.videoWidth
            : media.naturalWidth,
        mh =
          media instanceof HTMLVideoElement
            ? media.videoHeight
            : media.naturalHeight;
      const scale = Math.max(w / mw, h / mh);
      ctx.drawImage(
        media,
        (w - mw * scale) / 2,
        (h - mh * scale) / 2,
        mw * scale,
        mh * scale,
      );
      ctx.fillStyle = '#04101a99';
      ctx.fillRect(0, 0, w, h);
    }
    ctx.fillStyle = '#c1efff';
    ctx.font = `${w * 0.025}px Microsoft YaHei`;
    ctx.fillText('前海创客中心', w * 0.07, h * 0.1);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${w * 0.052}px Microsoft YaHei`;
    const parts =
      scene.text
        .match(
          new RegExp(`.{1,${record.data.ratio === '9:16' ? 12 : 20}}`, 'g'),
        )
        ?.slice(0, 7) || [];
    parts.forEach((line, i) =>
      ctx.fillText(line, w * 0.07, h * 0.43 + i * w * 0.075),
    );
    ctx.fillStyle = '#a4dbe6';
    ctx.font = `${w * 0.018}px Microsoft YaHei`;
    ctx.fillText(`${n + 1} / ${scenes.length}`, w * 0.07, h * 0.92);
  }
  useEffect(() => {
    const scene = scenes[index];
    if (scene)
      void load(scene.assetId)
        .then(() => draw(scene, index))
        .catch((e) => setError((e as Error).message));
  }, [index, scenes]);
  useEffect(
    () => () => {
      urls.current.forEach((u) => URL.revokeObjectURL(u));
      assets.current.forEach((m) => {
        if (m instanceof HTMLVideoElement) m.pause();
      });
    },
    [],
  );
  function update(n: number, values: Partial<Scene>) {
    setScenes((s) => s.map((x, i) => (i === n ? { ...x, ...values } : x)));
  }
  async function render(download: boolean) {
    if (!canvas.current || !scenes.length) return;
    if (
      JSON.stringify(scenes) !== JSON.stringify(initial(record)) ||
      audioId !== (record.data.audioId || '') ||
      audioVolume !== Number(record.data.audioVolume || '0.6')
    ) {
      setError('请先保存时间线和音轨设置，再生成成片。');
      return;
    }
    if (total > 300) {
      setError('单个模板视频最长 300 秒');
      return;
    }
    setBusy(true);
    onBusy?.(true);
    setError('');
    setSaved('');
    let sound: AudioContext | undefined,
      stream: MediaStream | undefined,
      source: AudioBufferSourceNode | undefined;
    try {
      for (const s of scenes) await load(s.assetId);
      const c = canvas.current;
      draw(scenes[0], 0);
      const chunks: Blob[] = [];
      const mime =
        typeof MediaRecorder !== 'undefined' &&
        MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm';
      let recorder: MediaRecorder | undefined;
      if (download) {
        if (!window.MediaRecorder || !c.captureStream)
          throw new Error('当前浏览器不支持成片录制，可导出时间线与字幕');
        stream = c.captureStream(24);
        if (audioId) {
          sound = new AudioContext();
          await sound.resume();
          const response = await fetch(
            `/api/platform/files?companyId=${encodeURIComponent(record.companyId)}&id=${audioId}`,
          );
          if (!response.ok) throw new Error('音轨加载失败');
          source = sound.createBufferSource();
          source.buffer = await sound.decodeAudioData(
            await response.arrayBuffer(),
          );
          source.loop = true;
          const gain = sound.createGain();
          gain.gain.value = audioVolume;
          const target = sound.createMediaStreamDestination();
          source.connect(gain).connect(target);
          target.stream.getAudioTracks().forEach((t) => stream!.addTrack(t));
          source.start();
        }
        recorder = new MediaRecorder(stream, {
          mimeType: mime,
          videoBitsPerSecond: Math.min(
            1400000,
            Math.max(
              100000,
              Math.floor((6 * 1024 * 1024 * 8) / Math.max(total, 1)) - 64000,
            ),
          ),
          audioBitsPerSecond: 64000,
        });
        recorder.ondataavailable = (e) => {
          if (e.data.size) chunks.push(e.data);
        };
        recorder.start(1000);
      }
      for (let i = 0; i < scenes.length; i++) {
        setIndex(i);
        const media = assets.current.get(scenes[i].assetId);
        if (media instanceof HTMLVideoElement) {
          media.currentTime = scenes[i].start || 0;
          await media.play();
        }
        const start = performance.now();
        await new Promise<void>((resolve) => {
          const tick = () => {
            draw(scenes[i], i);
            if (performance.now() - start >= scenes[i].seconds * 1000)
              resolve();
            else requestAnimationFrame(tick);
          };
          tick();
        });
        if (media instanceof HTMLVideoElement) media.pause();
      }
      if (recorder) {
        await new Promise<void>((resolve) => {
          recorder!.onstop = () => resolve();
          recorder!.stop();
        });
        recorder.stream.getTracks().forEach((t) => t.stop());
        const result = new Blob(chunks, { type: 'video/webm' });
        if (result.size <= 8 * 1024 * 1024) {
          await uploadBusinessFile(
            record.companyId,
            record.id,
            new File([result], `${record.title}.webm`, { type: 'video/webm' }),
          );
          setSaved('成片已保存到业务附件，可在生产队列中关联该成果。');
          await onRendered?.();
        } else
          setSaved(
            '成片已生成，但超过8 MB附件上限；请从下载文件保存或缩短视频后入库。',
          );
        saveBlob(`${record.title}.webm`, result);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      try {
        source?.stop();
      } catch {
        /* Source may have ended. */
      }
      stream?.getTracks().forEach((t) => t.stop());
      if (sound) await sound.close();
      setBusy(false);
      onBusy?.(false);
    }
  }
  function subtitles() {
    let cursor = 0;
    const text = scenes
      .map((s, i) => {
        const begin = cursor;
        cursor += s.seconds;
        return `${i + 1}\n${time(begin)} --> ${time(cursor)}\n${s.text}\n`;
      })
      .join('\n');
    saveBlob(
      `${record.title}.srt`,
      new Blob([text], { type: 'text/plain;charset=utf-8' }),
    );
  }
  return (
    <section className="pf-video">
      <div className="pf-section-title">
        <h3>
          <Film size={18} /> 可编辑视频时间线
        </h3>
        <span>
          {total} 秒 · {audioId ? '已选配乐音轨' : '无配乐音轨'}
        </span>
      </div>
      <canvas ref={canvas} aria-label="视频预览" />
      <div className="pf-form pf-record-form">
        <label>
          配乐音轨
          <AppSelect
            aria-label="视频配乐"
            value={audioId}
            disabled={busy || locked}
            onChange={(e) => setAudioId(e.target.value)}
          >
            <option value="">不添加配乐</option>
            {files
              .filter((f) => f.mime.startsWith('audio/'))
              .map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
          </AppSelect>
        </label>
        <label>
          配乐音量
          <input
            aria-label="配乐音量"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={audioVolume}
            disabled={busy || locked}
            onChange={(e) => setAudioVolume(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="pf-video-scenes">
        {scenes.map((s, i) => (
          <div className={index === i ? 'active' : ''} key={i}>
            <AppButton onClick={() => setIndex(i)} aria-label={`预览镜头${i + 1}`}>
              镜头 {i + 1}
            </AppButton>
            <textarea
              aria-label={`镜头${i + 1}字幕`}
              value={s.text}
              disabled={busy || locked}
              onChange={(e) => update(i, { text: e.target.value })}
            />
            <input
              aria-label={`镜头${i + 1}秒数`}
              type="number"
              min={1}
              max={60}
              value={s.seconds}
              disabled={busy || locked}
              onChange={(e) =>
                update(i, {
                  seconds: Math.min(60, Math.max(1, Number(e.target.value))),
                })
              }
            />
            <AppSelect
              aria-label={`镜头${i + 1}素材`}
              value={s.assetId}
              disabled={busy || locked}
              onChange={(e) => update(i, { assetId: e.target.value })}
            >
              <option value="">品牌背景</option>
              {files
                .filter((f) => /^(image|video)\//.test(f.mime))
                .map((f) => (
                  <option value={f.id} key={f.id}>
                    {f.name}
                  </option>
                ))}
            </AppSelect>
            <label>
              素材起始秒
              <input
                aria-label={`镜头${i + 1}素材起始秒`}
                type="number"
                min={0}
                max={36000}
                step={0.1}
                value={s.start || 0}
                disabled={busy || locked}
                onChange={(e) =>
                  update(i, { start: Math.max(0, Number(e.target.value)) })
                }
              />
            </label>
            <div className="pf-actions">
              <AppButton
                disabled={busy || locked || i === 0}
                onClick={() => {
                  setScenes((current) => {
                    const copy = [...current];
                    [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]];
                    return copy;
                  });
                  setIndex(Math.max(0, i - 1));
                }}
              >
                前移
              </AppButton>
              <AppButton
                disabled={busy || locked || i === scenes.length - 1}
                onClick={() => {
                  setScenes((current) => {
                    const copy = [...current];
                    [copy[i + 1], copy[i]] = [copy[i], copy[i + 1]];
                    return copy;
                  });
                  setIndex(Math.min(scenes.length - 1, i + 1));
                }}
              >
                后移
              </AppButton>
            </div>
            <AppButton
              disabled={busy || locked || scenes.length === 1}
              onClick={() => {
                setScenes((x) => x.filter((_, n) => n !== i));
                setIndex(0);
              }}
              aria-label={`删除镜头${i + 1}`}
            >
              <Trash2 size={14} />
            </AppButton>
          </div>
        ))}
      </div>
      <div className="pf-actions">
        <AppButton
          disabled={busy || locked || scenes.length >= 30}
          onClick={() =>
            setScenes((x) => [
              ...x,
              { text: '新镜头', seconds: 4, assetId: '' },
            ])
          }
        >
          <Plus size={15} />
          添加镜头
        </AppButton>
        <AppButton
          disabled={busy || locked}
          onClick={() =>
            void onSave({
              ...record.data,
              timeline: JSON.stringify(scenes),
              script: scenes.map((s) => s.text).join('\n'),
              audioId,
              audioVolume: String(audioVolume),
            })
          }
        >
          <Save size={15} />
          保存时间线
        </AppButton>
        <AppButton disabled={busy} onClick={() => void render(false)}>
          <Play size={15} />
          预览
        </AppButton>
        <AppButton disabled={busy} onClick={() => void render(true)}>
          <Download size={15} />
          {busy ? '正在按时长渲染并保存…' : '生成并保存 WebM'}
        </AppButton>
        <AppButton disabled={busy} onClick={subtitles}>
          字幕 SRT
        </AppButton>
        <AppButton
          onClick={() =>
            saveBlob(
              `${record.title}.timeline.json`,
              new Blob(
                [
                  JSON.stringify(
                    {
                      version: 1,
                      title: record.title,
                      ratio: record.data.ratio,
                      scenes,
                    },
                    null,
                    2,
                  ),
                ],
                { type: 'application/json' },
              ),
            )
          }
        >
          时间线 JSON
        </AppButton>
      </div>
      {error && (
        <div role="alert" className="feedback error">
          {error}
        </div>
      )}
      {saved && (
        <p role="status" className="pf-muted">
          {saved}
        </p>
      )}
    </section>
  );
}
