'use client';
import { useState, type FormEvent } from 'react';
import { AppButton, AppSelect } from '@/components/ui/app-controls';
import {
  ArrowRight,
  Check,
  CircleHelp,
  Download,
  Plus,
  Save,
  Settings2,
} from 'lucide-react';

/** Read-only component examples: no business APIs or real records are written. */
export default function ControlsPreview() {
  const [workspace, setWorkspace] = useState('park');
  const [category, setCategory] = useState('all');
  const [changes, setChanges] = useState(0);
  const [result, setResult] = useState('尚未提交');
  const [choice, setChoice] = useState('');
  const [asyncOptions, setAsyncOptions] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement;
    setResult(
      JSON.stringify({
        values: Object.fromEntries(data),
        action: submitter?.value,
        categoryCount: data.getAll('category').length,
      }),
    );
  }
  return (
    <main className="controls-preview">
      <header>
        <p>创客中心 / 统一交互组件</p>
        <h1>清晰的选择，一致的操作。</h1>
        <span>
          基于 shadcn/ui 与 Base UI 的下拉选项和按钮，支持工作台主题与键盘操作。
        </span>
      </header>
      <div className="controls-preview-grid">
        <section>
          <h2>工作空间与长选项</h2>
          <p>选项完整显示；触发器较窄时，当前企业名称仍能换行。</p>
          <div className="ws-company controls-company-example">
            <span>
              <Settings2 size={18} />
            </span>
            <span>
              <small>当前工作空间</small>
              <AppSelect
                aria-label="演示工作空间"
                value={workspace}
                onChange={(e) => {
                  setWorkspace(e.target.value);
                  setChanges((n) => n + 1);
                }}
              >
                <option value="park">前海创客中心 · 运营账套</option>
                <option value="tech">
                  深圳市前海人工智能与数字化产业创新发展有限公司
                </option>
                <option value="brand">
                  创意纪元（深圳）品牌策划与视觉设计工作室
                </option>
                <option value="disabled" disabled>
                  暂未授权的企业空间
                </option>
              </AppSelect>
            </span>
          </div>
          <output aria-label="工作空间选择结果">
            {workspace} · changes:{changes}
          </output>
          <label>
            分组选项
            <AppSelect aria-label="分组选项" defaultValue="design">
              <optgroup label="技术与数字化">
                <option value="ai">人工智能应用</option>
                <option value="software">企业系统开发与集成</option>
              </optgroup>
              <optgroup label="品牌与内容">
                <option value="design">品牌与视觉设计</option>
                <option value="video">视频与内容运营</option>
              </optgroup>
            </AppSelect>
          </label>
          <label>
            空选项
            <AppSelect aria-label="暂无资料选项" disabled>
              <option value="">暂无可用资料</option>
            </AppSelect>
          </label>
        </section>
        <section>
          <h2>真实的表单行为</h2>
          <p>保留必填校验、表单值、默认值、提交按钮与重置。</p>
          <form onSubmit={submit}>
            <label>
              需求类型（必选）
              <AppSelect
                name="category"
                aria-label="需求类型必选"
                required
                value={choice}
                onChange={(e) => setChoice(e.target.value)}
              >
                <option value="">请选择需求类型</option>
                <option value="software">系统开发</option>
                <option value="design">品牌设计</option>
                <option value="video" disabled>
                  视频制作（暂停接单）
                </option>
              </AppSelect>
            </label>
            <label>
              资料范围
              <AppSelect
                name="scope"
                aria-label="资料范围"
                defaultValue="shared"
              >
                <option value="private">仅本企业</option>
                <option value="shared">授权展示资料</option>
              </AppSelect>
            </label>
            <label>
              多选服务
              <AppSelect
                name="services"
                aria-label="多选服务"
                multiple
                defaultValue={['ai']}
              >
                <option value="ai">AI 应用</option>
                <option value="design">视觉设计</option>
                <option value="video">视频制作</option>
              </AppSelect>
            </label>
            <div className="controls-preview-actions">
              <AppButton
                className="secondary-button"
                type="reset"
                onClick={() => setChoice('')}
              >
                重置表单
              </AppButton>
              <AppButton className="primary-button" name="intent" value="save">
                <Save size={15} />
                保存示例
              </AppButton>
            </div>
          </form>
          <output aria-label="表单提交结果">{result}</output>
        </section>
        <section>
          <h2>筛选与动态资料</h2>
          <p>选项异步更新后保持正确显示，和已有事件处理兼容。</p>
          <label>
            行业筛选
            <AppSelect
              aria-label="示例行业筛选"
              value={category}
              onChange={(e) => setCategory(e.currentTarget.value)}
            >
              <option value="all">全部行业</option>
              <option value="technology">数字科技</option>
              <option value="creative">品牌创意</option>
            </AppSelect>
          </label>
          <output aria-label="行业筛选结果">{category}</output>
          <label>
            异步加载选项
            <AppSelect aria-label="异步加载选项" name="async-option">
              {asyncOptions && (
                <>
                  <option value="first">第一份已加载资料</option>
                  <option value="second">第二份已加载资料</option>
                </>
              )}
            </AppSelect>
          </label>
          <AppButton
            type="button"
            className="secondary-button"
            onClick={() => setAsyncOptions(true)}
          >
            <Plus size={15} />
            加载示例资料
          </AppButton>
        </section>
        <section>
          <h2>统一按钮状态</h2>
          <p>清晰区分主操作、次操作、危险动作与禁用状态。</p>
          <div className="controls-preview-actions">
            <AppButton className="primary-button" type="button">
              <Plus size={15} />
              新建项目
            </AppButton>
            <AppButton className="secondary-button" type="button">
              <Download size={15} />
              导出资料
            </AppButton>
            <AppButton className="ep-button" type="button">
              <Check size={15} />
              确认选择
            </AppButton>
            <AppButton className="danger" type="button">
              删除示例
            </AppButton>
            <AppButton className="primary-button" type="button" disabled>
              正在处理…
            </AppButton>
            <AppButton
              className="secondary-button"
              type="button"
              aria-label="查看帮助"
            >
              <CircleHelp size={16} />
            </AppButton>
          </div>
          <a href="/#ppt/portrait">
            打开 AI 企业脸谱
            <ArrowRight size={15} />
          </a>
        </section>
      </div>
      <footer>本页使用虚构示例，仅演示控件；表单不会写入业务数据。</footer>
    </main>
  );
}
