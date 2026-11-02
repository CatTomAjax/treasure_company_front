import { callApi } from './platform-client';
export async function uploadPptFile(companyId: string, file: File) {
  if (file.size > 4 * 1024 * 1024) throw new Error('单个文件上限4MB');
  const data = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = () => reject(new Error('文件读取失败'));
    r.readAsDataURL(file);
  });
  const ext = file.name.split('.').at(-1)?.toLowerCase() || '';
  const types: Record<string, string> = {
    txt: 'text/plain',
    md: 'text/markdown',
    csv: 'text/csv',
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    wav: 'audio/wav',
  };
  return callApi<{ id: string; url: string }>('/api/platform/ppt/files', {
    companyId,
    name: file.name,
    mime: types[ext] || file.type || 'application/octet-stream',
    data,
  });
}
