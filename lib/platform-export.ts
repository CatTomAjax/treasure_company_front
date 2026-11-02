import type { BusinessRecord } from './platform-config';
import { modules } from './platform-config';
import { saveBlob } from './platform-client';
const xml = (s: string) =>
  s.replace(
    /[<>&"']/g,
    (c) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&apos;',
      })[c]!,
  );
export async function exportDocument(
  r: BusinessRecord,
  format: 'docx' | 'pptx' | 'svg' | 'md',
) {
  const content =
    r.data.content ||
    modules[r.kind].fields
      .map((f) => `${f.label}：${r.data[f.key] || '—'}`)
      .join('\n\n');
  if (format === 'md') {
    saveBlob(
      `${r.title}.md`,
      new Blob(
        [
          `# ${r.title}\n\n${content}\n\n记录：${r.id}\n版本：${r.version}\n审核状态：${r.status}`,
        ],
        { type: 'text/markdown;charset=utf-8' },
      ),
    );
    return;
  }
  if (format === 'docx') {
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    zip.file(
      '[Content_Types].xml',
      '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    );
    zip.file(
      '_rels/.rels',
      '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    );
    const p = (s: string, title = false) =>
      `<w:p><w:pPr><w:spacing w:after="180"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:eastAsia="Microsoft YaHei"/><w:sz w:val="${title ? 36 : 22}"/>${title ? '<w:b/>' : ''}</w:rPr><w:t xml:space="preserve">${xml(s)}</w:t></w:r></w:p>`;
    zip.file(
      'word/document.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${p(r.title, true)}${content
        .split('\n')
        .map((s) => p(s))
        .join(
          '',
        )}${p(`审核状态：${r.status}　版本：${r.version}`)}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`,
    );
    saveBlob(
      `${r.title}.docx`,
      await zip.generateAsync({
        type: 'blob',
        mimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    );
    return;
  }
  if (format === 'pptx') {
    const { default: PptxGenJS } = await import('pptxgenjs');
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.author = '前海创客中心';
    pptx.subject = `${r.id} / ${r.version}`;
    pptx.title = r.title;
    const chunks: string[] = [];
    const lines = content
      .split('\n')
      .flatMap((line) =>
        line.length > 70 ? line.match(/.{1,70}/g) || [] : [line],
      );
    for (let i = 0; i < lines.length; i += 11)
      chunks.push(lines.slice(i, i + 11).join('\n'));
    if (!chunks.length) chunks.push('');
    chunks.forEach((chunk, i) => {
      const s = pptx.addSlide();
      s.background = { color: '0A1625' };
      s.addText('前海创客中心 · 企业经营与合作平台', {
        x: 0.55,
        y: 0.3,
        w: 12,
        h: 0.3,
        fontSize: 10,
        color: '80ABC1',
      });
      s.addText(r.title, {
        x: 0.55,
        y: 0.9,
        w: 12.2,
        h: 0.75,
        fontFace: 'Microsoft YaHei',
        fontSize: 27,
        bold: true,
        color: 'FFFFFF',
        breakLine: false,
        fit: 'shrink',
      });
      s.addText(chunk, {
        x: 0.65,
        y: 1.9,
        w: 12,
        h: 4.7,
        fontFace: 'Microsoft YaHei',
        fontSize: 17,
        color: 'DEE8EF',
        breakLine: false,
        fit: 'shrink',
        paraSpaceAfter: 8,
      });
      s.addText(
        `${r.status} · ${i + 1}/${chunks.length} · 版本 ${r.version.slice(0, 8)}`,
        { x: 0.65, y: 7, w: 12, h: 0.2, fontSize: 9, color: '80ABC1' },
      );
    });
    await pptx.writeFile({ fileName: `${r.title}.pptx` });
    return;
  }
  const color = /^#[\da-f]{6}$/i.test(r.data.brandColor || '')
    ? r.data.brandColor
    : '#2EA8C7';
  const lines =
    content
      .replace(/\n+/g, ' ')
      .match(/.{1,24}/g)
      ?.slice(0, 17) || [];
  const titleLines = r.title.match(/.{1,12}/g)?.slice(0, 3) || [];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#071A2A"/><stop offset="1" stop-color="${color}"/></linearGradient></defs><rect width="1080" height="1350" fill="url(#g)"/><circle cx="1040" cy="210" r="310" fill="none" stroke="#ffffff" stroke-opacity=".12" stroke-width="90"/><text x="82" y="108" fill="#D2EEF5" font-size="29" font-family="Microsoft YaHei,sans-serif">前海创客中心</text>${titleLines.map((s, i) => `<text x="78" y="${260 + i * 95}" fill="white" font-size="72" font-weight="bold" font-family="Microsoft YaHei,sans-serif">${xml(s)}</text>`).join('')}<rect x="82" y="550" width="90" height="7" fill="#9FF4D3"/>${lines.map((s, i) => `<text x="82" y="${620 + i * 33}" fill="#EFF7FA" font-size="25" font-family="Microsoft YaHei,sans-serif">${xml(s)}</text>`).join('')}<text x="82" y="1260" fill="#D2EEF5" font-size="21" font-family="Microsoft YaHei,sans-serif">${xml(r.status)} · ${xml(r.version.slice(0, 8))}</text></svg>`;
  saveBlob(
    `${r.title}.svg`,
    new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }),
  );
}
