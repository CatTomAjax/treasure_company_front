export async function extractDocument(file: File) {
  if (file.size > 8 * 1024 * 1024) throw new Error('资料文件上限8 MB');
  const ext = file.name.split('.').at(-1)?.toLowerCase();
  let text = '';
  if (ext === 'pdf') {
    const pdf = await import('pdfjs-dist'),
      worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdf.GlobalWorkerOptions.workerSrc = worker.default;
    const task = pdf.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
    });
    const document = await task.promise;
    if (document.numPages > 80) throw new Error('单次最多80页，请按章节拆分');
    for (let i = 1; i <= document.numPages; i++) {
      const page = await document.getPage(i),
        content = await page.getTextContent();
      text +=
        `\n第${i}页\n` +
        content.items.map((item) => ('str' in item ? item.str : '')).join(' ');
      page.cleanup();
    }
    await task.destroy();
  } else if (ext === 'docx' || ext === 'pptx') {
    const { default: JSZip } = await import('jszip'),
      zip = await JSZip.loadAsync(await file.arrayBuffer());
    const paths =
      ext === 'docx'
        ? ['word/document.xml']
        : Object.keys(zip.files)
            .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
            .sort(
              (a, b) =>
                Number(a.match(/slide(\d+)/)?.[1]) -
                Number(b.match(/slide(\d+)/)?.[1]),
            );
    for (const path of paths) {
      const xml = await zip.file(path)?.async('string');
      if (!xml) continue;
      if (xml.length > 4000000) throw new Error('资料解压后过大，请拆分文件');
      const doc = new DOMParser().parseFromString(xml, 'application/xml');
      if (doc.querySelector('parsererror')) throw new Error('资料XML无效');
      text +=
        '\n' +
        Array.from(doc.getElementsByTagNameNS('*', 'p'))
          .map((p) =>
            Array.from(p.getElementsByTagNameNS('*', 't'))
              .map((t) => t.textContent)
              .join(''),
          )
          .join('\n');
    }
  } else if (ext === 'xlsx') {
    const { default: ExcelJS } = await import('exceljs'),
      wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await file.arrayBuffer());
    for (const sheet of wb.worksheets) {
      text += `\n工作表：${sheet.name}\n`;
      sheet.eachRow((row, n) => {
        if (n > 3000) throw new Error('每张表最多3000行，请拆分');
        text +=
          Array.from(
            { length: Math.min(sheet.columnCount, 60) },
            (_, i) => row.getCell(i + 1).text,
          ).join(' | ') + '\n';
      });
    }
  } else if (['txt', 'md', 'csv', 'json'].includes(ext || ''))
    text = await file.text();
  else throw new Error('支持PDF、DOCX、PPTX、XLSX、TXT、Markdown、CSV和JSON');
  text = text.replace(/\u0000/g, '').trim();
  if (!text)
    throw new Error(
      '未提取到文本。扫描版图片PDF请先完成OCR或手工整理，再导入经核对的文本。',
    );
  if (text.length > 280000) throw new Error('提取文本超过28万字，请拆分资料');
  const segments: string[] = [];
  for (let i = 0; i < text.length; i += 28000)
    segments.push(text.slice(i, i + 28000));
  return { text, segments };
}
