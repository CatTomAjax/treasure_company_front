import type {Task} from './workbench-data';
import {statusLabels} from './workbench-data';
function saveBlob(data:BlobPart,name:string,mime:string){const url=URL.createObjectURL(new Blob([data],{type:mime}));const a=document.createElement('a');a.href=url;a.download=name.replace(/[<>:"/\\|?*]/g,'_');a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export async function exportTasksWorkbook(tasks:Task[]){
 const ExcelJS=(await import('exceljs')).default;const book=new ExcelJS.Workbook();book.creator='前海创客中心';const sheet=book.addWorksheet('内容任务');
 sheet.columns=[{header:'内容标题',key:'title',width:42},{header:'类型',key:'type',width:16},{header:'负责人',key:'owner',width:16},{header:'状态',key:'status',width:14},{header:'使用渠道',key:'channel',width:20},{header:'计划日期',key:'dueDate',width:17},{header:'生成来源',key:'source',width:30}];
 tasks.forEach(t=>sheet.addRow({...t,status:statusLabels[t.status]}));sheet.views=[{state:'frozen',ySplit:1}];sheet.autoFilter='A1:G1';sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF153B67'}};sheet.getRow(1).height=28;sheet.eachRow((row,n)=>{row.alignment={vertical:'middle',wrapText:true};if(n>1)row.height=30;});
 saveBlob(await book.xlsx.writeBuffer() as BlobPart,'内容工作台.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
export async function exportOperationsWorkbook(rows:{month:string;occupancy:number;revenue:number;energy:number}[]){
 const ExcelJS=(await import('exceljs')).default;const book=new ExcelJS.Workbook();const sheet=book.addWorksheet('园区经营样例');sheet.columns=[{header:'月份',key:'month',width:18},{header:'出租率（%）',key:'occupancy',width:22},{header:'营收（万元）',key:'revenue',width:22},{header:'能耗（kWh）',key:'energy',width:22}];rows.forEach(r=>sheet.addRow(r));sheet.addRow({month:'说明：样例数据，仅用于演示'});sheet.mergeCells(`A${rows.length+2}:D${rows.length+2}`);sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF153B67'}};sheet.views=[{state:'frozen',ySplit:1}];sheet.eachRow(r=>{r.height=28;r.alignment={vertical:'middle'}});saveBlob(await book.xlsx.writeBuffer() as BlobPart,'园区经营样例.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
export async function exportPresentation(task:Task){
 const PptxGenJS=(await import('pptxgenjs')).default;const deck=new PptxGenJS();deck.layout='LAYOUT_WIDE';deck.author='前海创客中心';deck.subject=task.type;deck.title=task.title;deck.theme={headFontFace:'Microsoft YaHei',bodyFontFace:'Microsoft YaHei'};
 function slide(title:string,body:string,index:number){const s=deck.addSlide();s.background={color:'0C1420'};s.addText('前海创客中心  /  AI 内容工作台',{x:.55,y:.35,w:11,h:.3,fontSize:11,color:'8FA8CD'});s.addText(title,{x:.65,y:1,w:12,h:1,fontSize:index===0?28:24,color:'ECF3FF',bold:true,breakLine:false,fit:'shrink'});s.addShape(deck.ShapeType.line,{x:.65,y:2.13,w:.65,h:0,line:{color:'558FDE',width:3}});s.addText(body,{x:.65,y:2.45,w:11.8,h:3.9,fontSize:19,color:'BDCDE3',breakLine:false,paraSpaceAfter:12,fit:'shrink',valign:'top'});s.addText(`${task.source} · ${statusLabels[task.status]} · 内容需核实后对外使用`,{x:.65,y:6.95,w:11,h:.25,fontSize:10,color:'8FA8CD'});s.addText(String(index+1).padStart(2,'0'),{x:12.1,y:6.9,w:.5,h:.3,fontSize:11,color:'8FA8CD'});}
 slide(task.title,`${task.type}\n负责人：${task.owner}\n目标读者：${task.audience}\n使用渠道：${task.channel}`,0);
 // Bounded text chunks preserve every character and prevent long paragraphs overflowing slides.
 const chunks:string[]=[];let buffer='';for(const paragraph of task.content.split('\n\n')){const segments=paragraph.match(/[\s\S]{1,280}/g)||[''];for(const seg of segments){if(buffer.length+seg.length>320){chunks.push(buffer);buffer=''}buffer+=(buffer?'\n\n':'')+seg;}}if(buffer)chunks.push(buffer);
 chunks.forEach((body,i)=>slide(`${task.type} · ${i+1}`,body,i+1));await deck.writeFile({fileName:`${task.title.replace(/[<>:"/\\|?*]/g,'_')}.pptx`});
}
