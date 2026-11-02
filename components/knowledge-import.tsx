'use client';
import { AppButton } from '@/components/ui/app-controls';
import { useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from './ui/dialog';
import { extractDocument } from '@/lib/document-import';
import { callApi } from '@/lib/platform-client';
export default function KnowledgeImport({
  companyId,
  projectId = '',
  disabled,
  onImported,
}: {
  companyId: string;
  projectId?: string;
  disabled: boolean;
  onImported: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false),
    [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState(''),
    [segments, setSegments] = useState<string[]>([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  async function choose(file: File) {
    setFile(file);
    setError('');
    setPreview('');
    setSegments([]);
    setBusy(true);
    try {
      const d = await extractDocument(file);
      setPreview(d.text);
      setSegments(d.segments);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!file || !segments.length) return;
    setBusy(true);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsDataURL(file);
      });
      const result = await callApi('/api/platform/knowledge-import', {
        companyId,
        projectId,
        name: file.name,
        mime: file.type || 'application/octet-stream',
        data,
        segments,
      });
      await onImported();
      setMessage(
        result.replayed
          ? '相同原文件已经导入，已返回原记录'
          : `已保存${result.count}段原始资料及原文件，等待人工审核`,
      );
      setOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <AppButton
        disabled={disabled}
        onClick={() => {
          setOpen(true);
          setMessage('');
        }}
      >
        <Upload size={15} />
        文档入库
      </AppButton>
      {message && (
        <span role="status" className="pf-muted">
          {message}
        </span>
      )}
      {open && (
        <Dialog open onOpenChange={(v) => !v && !busy && setOpen(false)}>
          <DialogContent className="pf-record-dialog">
            <DialogTitle>资料提取与知识入库</DialogTitle>
            <DialogDescription>
              文件解析在本地浏览器完成。预览通过后，将原文和原文件一起保存到当前企业，默认草稿，审核后才进入岗位知识范围。
            </DialogDescription>
            <input
              type="file"
              disabled={busy}
              accept=".pdf,.docx,.pptx,.xlsx,.txt,.md,.csv,.json"
              onChange={(e) => {
                if (e.target.files?.[0]) void choose(e.target.files[0]);
              }}
            />
            {busy && <p className="pf-muted">正在本地处理…</p>}
            {error && (
              <div role="alert" className="feedback error">
                {error}
              </div>
            )}
            {preview && (
              <>
                <p className="pf-muted">
                  {preview.length}字符 · {segments.length}段 · 原文件
                  {file?.name}
                </p>
                <pre className="ic-code">{preview.slice(0, 14000)}</pre>
                <AppButton
                  disabled={busy}
                  className="primary-button"
                  onClick={() => void save()}
                >
                  <FileText size={16} />
                  确认导入原文与原文件
                </AppButton>
              </>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
