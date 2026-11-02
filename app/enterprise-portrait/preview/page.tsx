import EnterprisePortrait from '@/components/enterprise-portrait';
import { Boxes } from 'lucide-react';

export default function EnterprisePortraitPreview() {
  return (
    <main className="ep-preview">
      <div className="ep-preview-bar">
        <a href="/#ppt/portrait">
          <Boxes size={23} />
          创客中心 <span> / </span>智慧生态平台
        </a>
        <span>
          AI 企业脸谱 · 交互演示
          <br />
          所有企业与业务数据均为虚构
        </span>
      </div>
      <EnterprisePortrait companyId="portrait-demo" initialDemo />
    </main>
  );
}
