'use client';
import { AppButton } from '@/components/ui/app-controls';
import { useRef } from 'react';
import { localPptDate, type PptItem } from '@/lib/ppt-model';
import { uploadPptFile } from '@/lib/ppt-client';
import { usePpt, Panel, Button, DataTable, Tag, I } from './ppt-console';
import { quietly } from './ppt-knowledge';
export default function OrderDetail({
  order,
  tab,
}: {
  order: PptItem;
  tab: string;
}) {
  const { state, save, edit, nav, companyId, notify } = usePpt(),
    file = useRef<HTMLInputElement>(null),
    files = state.collections.deliverables.filter(
      (x) => x.orderId === order.id,
    );
  async function upload(f: File) {
    try {
      const result = await uploadPptFile(companyId, f);
      await save('deliverables', {
        id: '',
        title: f.name,
        orderId: order.id,
        type: f.name.split('.').at(-1) || '文件',
        version: 'v1.0',
        owner: order.owner,
        status: '待确认',
        date: localPptDate(),
        url: result.url,
      });
    } catch (e) {
      notify((e as Error).message);
    }
  }
  if (tab === '沟通记录')
    return (
      <Panel
        title="项目沟通记录"
        action={
          <Button
            primary
            icon="Plus"
            onClick={() =>
              edit(
                'communications',
                {
                  id: '',
                  title: '沟通记录',
                  orderId: order.id,
                  content: '',
                  owner: order.owner,
                  date: localPptDate(),
                  status: '已记录',
                },
                ['title', 'content', 'owner', 'date'],
              )
            }
          >
            新增记录
          </Button>
        }
      >
        <DataTable
          headers={['时间', '主题', '沟通内容', '经办人', '操作']}
          rows={state.collections.communications
            .filter((c) => c.orderId === order.id)
            .map((c) => [
              c.date,
              c.title,
              c.content,
              c.owner,
              <Button
                key={c.id}
                onClick={() =>
                  edit('communications', c, [
                    'title',
                    'content',
                    'owner',
                    'date',
                  ])
                }
              >
                编辑
              </Button>,
            ])}
        />
      </Panel>
    );
  if (tab === '执行计划')
    return (
      <Panel
        title="项目责任任务"
        action={<Button onClick={() => nav('projects')}>打开项目看板</Button>}
      >
        <DataTable
          headers={['任务', '负责人', '日期', '进度', '状态']}
          rows={state.collections.tasks
            .filter((t) => t.project === (order.projectId || 'project-1'))
            .map((t) => [
              t.title,
              t.owner,
              t.date,
              t.progress + '%',
              <Tag key={t.id}>{t.status}</Tag>,
            ])}
        />
      </Panel>
    );
  if (tab === '协作成员')
    return (
      <Panel
        title="联合交付成员"
        action={
          <Button
            primary
            onClick={() =>
              edit(
                'collaboration',
                {
                  id: '',
                  title: '协作团队',
                  orderId: order.id,
                  company: '',
                  content: '',
                  progress: '0',
                  owner: order.owner,
                  status: '进行中',
                },
                ['title', 'company', 'content', 'owner', 'progress'],
              )
            }
          >
            添加协作团队
          </Button>
        }
      >
        <DataTable
          headers={['团队', '企业', '负责内容', '进度', '操作']}
          rows={state.collections.collaboration
            .filter(
              (c) =>
                c.orderId === order.id ||
                (!c.orderId && order.id === 'order-1'),
            )
            .map((c) => [
              c.title,
              c.company,
              c.content,
              c.progress + '%',
              <Button key={c.id} onClick={() => edit('collaboration', c)}>
                编辑
              </Button>,
            ])}
        />
      </Panel>
    );
  if (tab === '变更记录')
    return (
      <Panel
        title="范围、费用与工期变更"
        action={
          <Button
            primary
            onClick={() =>
              edit(
                'changes',
                {
                  id: '',
                  title: '项目范围变更',
                  orderId: order.id,
                  content: '',
                  amount: '0',
                  date: localPptDate(),
                  owner: order.owner,
                  status: '待确认',
                },
                ['title', 'content', 'amount', 'date', 'owner', 'status'],
              )
            }
          >
            登记变更
          </Button>
        }
      >
        <DataTable
          headers={[
            '变更事项',
            '范围说明',
            '追加费用',
            '日期',
            '确认状态',
            '操作',
          ]}
          rows={state.collections.changes
            .filter((c) => c.orderId === order.id)
            .map((c) => [
              c.title,
              c.content,
              c.amount,
              c.date,
              <Tag key={c.id}>{c.status}</Tag>,
              <Button key={c.id} onClick={() => edit('changes', c)}>
                编辑 / 确认
              </Button>,
            ])}
        />
      </Panel>
    );
  return (
    <Panel
      title={`交付成果（${files.length}）`}
      action={
        <div className="pp-inline">
          <Button primary icon="Upload" onClick={() => file.current?.click()}>
            上传成果
          </Button>
          <Button icon="Plus" onClick={() => nav('documents')}>
            新建文档
          </Button>
        </div>
      }
    >
      <input
        ref={file}
        hidden
        type="file"
        accept=".pdf,.docx,.xlsx,.pptx,.txt,.md,.csv,.jpg,.png,.webm,.mp4"
        onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])}
      />
      <DataTable
        headers={['文件名称', '类型', '版本', '负责人', '状态', '操作']}
        rows={files.map((f) => [
          <span key={f.id}>
            <I name="FileText" size={15} /> {f.title}
          </span>,
          f.type,
          f.version,
          f.owner,
          <Tag key={f.id}>{f.status}</Tag>,
          <div className="pp-inline" key={f.id}>
            {f.url ? (
              <a className="pp-btn" href={f.url} download={f.title}>
                下载文件
              </a>
            ) : (
              <Button onClick={() => nav(f.targetPage || 'documents')}>
                打开成果
              </Button>
            )}
            <Button
              onClick={() =>
                edit('deliverables', f, ['title', 'version', 'owner', 'status'])
              }
            >
              核对
            </Button>
            {f.status !== '已确认' && (
              <Button
                onClick={() =>
                  quietly(save('deliverables', { ...f, status: '已确认' }))
                }
              >
                确认成果
              </Button>
            )}
          </div>,
        ])}
      />
      <AppButton className="pp-upload-area" onClick={() => file.current?.click()}>
        <I name="CloudUpload" size={36} />
        <h3>上传项目成果与交付文件</h3>
        <p>文件与版本保存至本地数据库，关联当前合作订单。</p>
      </AppButton>
    </Panel>
  );
}
