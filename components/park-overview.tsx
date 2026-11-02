'use client';

import { AppButton, AppSelect } from '@/components/ui/app-controls';
import { useState } from 'react';
import { localPptDate } from '@/lib/ppt-model';
import { parkOverview, spaceRelations, spaceTone } from '@/lib/park-overview';
import { I, usePpt } from './ppt-console';

const amount = (value: number | string) =>
  Number(value || 0).toLocaleString('zh-CN');
const statusFilters = ['全部空间', '可租', '已出租', '已预约'];

export default function ParkOverview() {
  const { state, nav, edit } = usePpt();
  const [filter, setFilter] = useState('全部空间');
  const [type, setType] = useState('全部类型');
  const [selectedId, setSelectedId] = useState('');
  const today = localPptDate();
  const data = parkOverview(state, today);
  const types = [
    ...new Set(data.spaces.map((room) => room.type).filter(Boolean)),
  ];
  const visible = data.spaces.filter(
    (room) =>
      (filter === '全部空间' || room.status === filter) &&
      (type === '全部类型' || room.type === type),
  );
  const selected = visible.find((room) => room.id === selectedId) || visible[0];
  const related = selected ? spaceRelations(state, selected) : null;
  const pendingTotal =
    data.services.length + data.abnormal.length + data.leaseAttention;
  const dateLabel = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date(`${today}T12:00:00+08:00`));
  const metrics = [
    {
      title: '空间出租率',
      value: data.occupancy,
      unit: '%',
      note: `${data.occupied.length} 间已出租 / 共 ${data.spaces.length} 间`,
      icon: 'Building2',
      page: 'spaces',
      tone: 'accent',
    },
    {
      title: '可租空间',
      value: data.available.length,
      unit: '间',
      note: `${amount(data.area)} ㎡ 空间总面积`,
      icon: 'DoorOpen',
      page: 'spaces',
      tone: 'plain',
    },
    {
      title: '本月已收收入',
      value: `¥${amount(data.revenue)}`,
      unit: '',
      note: `${data.income.length} 笔已确认收入记录`,
      icon: 'Wallet',
      page: 'finance',
      tone: 'plain',
    },
    {
      title: '服务待办',
      value: data.services.length,
      unit: '项',
      note: `${data.waiting} 待受理 · ${data.processing} 处理中`,
      icon: 'ClipboardList',
      page: 'services',
      tone: 'amber',
    },
  ];
  return (
    <div className="po-dashboard">
      <header className="po-heading">
        <div>
          <h1>园区经营总览</h1>
          <p>查看空间状态、关联企业与服务进展。</p>
        </div>
        <div className="po-heading-actions">
          <span className="po-date">
            <I name="CalendarDays" size={15} />
            {dateLabel}
          </span>
          <AppButton className="po-button" onClick={() => nav('analytics')}>
            <I name="ChartNoAxesCombined" size={16} />
            经营分析
            <I name="ArrowUpRight" size={14} />
          </AppButton>
        </div>
      </header>

      <div className="po-metrics">
        {metrics.map((metric) => (
          <AppButton
            key={metric.title}
            className={`po-metric ${metric.tone}`}
            onClick={() => nav(metric.page)}
          >
            <div className="po-metric-top">
              <span>{metric.title}</span>
              <I name={metric.icon} size={18} />
            </div>
            <div className="po-metric-value">
              {metric.value}
              <small>{metric.unit}</small>
            </div>
            <div className="po-metric-note">
              {metric.note}
              <I name="ArrowUpRight" size={15} />
            </div>
          </AppButton>
        ))}
      </div>

      <div className="po-main-grid">
        <section
          className="po-panel po-spaces"
          aria-labelledby="po-spaces-title"
        >
          <header className="po-section-head">
            <div>
              <div className="po-section-kicker">SPACE PORTFOLIO</div>
              <h2 id="po-spaces-title">
                空间资产视图<span>{data.spaces.length}</span>
              </h2>
            </div>
            <AppButton className="po-text-button" onClick={() => nav('spaces')}>
              管理空间
              <I name="ArrowUpRight" size={15} />
            </AppButton>
          </header>
          <div className="po-space-toolbar">
            <div className="po-filters" role="group" aria-label="筛选空间状态">
              {statusFilters.map((status) => (
                <AppButton
                  key={status}
                  aria-pressed={filter === status}
                  className={filter === status ? 'active' : ''}
                  onClick={() => setFilter(status)}
                >
                  {status}
                </AppButton>
              ))}
            </div>
            <AppSelect
              aria-label="筛选空间类型"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option>全部类型</option>
              {types.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </AppSelect>
          </div>
          <div className="po-space-canvas">
            <div className="po-canvas-label">
              <span>
                <I name="LayoutGrid" size={13} />
                房号分布
              </span>
              <span>选择空间，查看关联业务</span>
            </div>
            <div className="po-room-grid" aria-label="空间列表">
              {visible.map((room) => {
                const tone = spaceTone(room.status);
                const relations = spaceRelations(state, room);
                return (
                  <AppButton
                    key={room.id}
                    className={`po-room ${tone} ${selected?.id === room.id ? 'selected' : ''}`}
                    aria-pressed={selected?.id === room.id}
                    aria-label={`${room.title}，${room.status}，查看关联业务`}
                    onClick={() => setSelectedId(room.id)}
                  >
                    <div className="po-room-top">
                      <I
                        name={tone === 'occupied' ? 'Building2' : 'DoorOpen'}
                        size={16}
                      />
                      <span className={`po-status ${tone}`}>
                        <i />
                        {room.status || '待登记'}
                      </span>
                    </div>
                    <strong>{room.title}</strong>
                    <p>{room.type || '未登记类型'}</p>
                    <div className="po-room-spec">
                      {room.area ? `${amount(room.area)} ㎡` : '面积待登记'}
                      <span />
                      {room.seats ? `${room.seats} 工位` : '工位待登记'}
                    </div>
                    <footer>
                      <span>
                        {relations.tenant ||
                          (room.status === '可租'
                            ? '可预约参观'
                            : '租用方待登记')}
                      </span>
                      <I name="ArrowUpRight" size={13} />
                    </footer>
                  </AppButton>
                );
              })}
            </div>
            {!visible.length && (
              <div className="po-empty">
                <I name="LayoutGrid" size={26} />
                <b>暂无符合条件的空间</b>
                <p>切换状态或类型，查看其他房源。</p>
                <AppButton
                  className="po-text-button"
                  onClick={() => {
                    setFilter('全部空间');
                    setType('全部类型');
                  }}
                >
                  清除筛选
                  <I name="ArrowRight" size={14} />
                </AppButton>
              </div>
            )}
            <div
              className="po-occupancy-bar"
              aria-label={`已出租 ${data.occupied.length} 间，可租 ${data.available.length} 间，已预约 ${data.reserved.length} 间，其他 ${data.otherSpaces.length} 间`}
            >
              {data.spaces.length > 0 && (
                <>
                  <span
                    className="occupied"
                    style={{
                      width: `${(data.occupied.length / data.spaces.length) * 100}%`,
                    }}
                  />
                  <span
                    className="available"
                    style={{
                      width: `${(data.available.length / data.spaces.length) * 100}%`,
                    }}
                  />
                  <span
                    className="reserved"
                    style={{
                      width: `${(data.reserved.length / data.spaces.length) * 100}%`,
                    }}
                  />
                  {data.otherSpaces.length > 0 && (
                    <span
                      className="other"
                      style={{
                        width: `${(data.otherSpaces.length / data.spaces.length) * 100}%`,
                      }}
                    />
                  )}
                </>
              )}
            </div>
            <div className="po-space-legend">
              <span>
                <i className="occupied" />
                已出租 {data.occupied.length}
              </span>
              <span>
                <i className="available" />
                可租 {data.available.length}
              </span>
              <span>
                <i className="reserved" />
                已预约 {data.reserved.length}
              </span>
              {data.otherSpaces.length > 0 && (
                <span>
                  <i className="other" />
                  其他 {data.otherSpaces.length}
                </span>
              )}
              <small>当前显示 {visible.length} 间</small>
            </div>
          </div>
          {selected && related && (
            <div className="po-relationship" aria-live="polite">
              <header>
                <span>
                  <I name="Workflow" size={15} />
                  {selected.title} 的业务关联
                </span>
                <AppButton
                  className="po-text-button"
                  onClick={() => edit('spaces', selected)}
                >
                  查看档案
                  <I name="ArrowUpRight" size={14} />
                </AppButton>
              </header>
              <div className="po-relation-chain">
                <div className="po-relation-node">
                  <small>01 / 空间</small>
                  <b>
                    {selected.title}
                    <span className={`po-status ${spaceTone(selected.status)}`}>
                      {selected.status}
                    </span>
                  </b>
                  <p>
                    {selected.price
                      ? `挂牌月租 ¥${amount(selected.price)}`
                      : '月租待登记'}
                  </p>
                </div>
                <I name="ArrowRight" size={15} />
                <AppButton
                  className="po-relation-node"
                  onClick={() =>
                    related.enterprise
                      ? edit('enterprises', related.enterprise)
                      : edit('spaces', selected)
                  }
                >
                  <small>02 / 租用方</small>
                  <b>
                    {related.tenant ||
                      (selected.status === '可租'
                        ? '等待企业入驻'
                        : '待登记租用方')}
                  </b>
                  <p>
                    {related.enterprise
                      ? '已关联企业档案 ↗'
                      : related.tenant
                        ? '企业档案待关联 ↗'
                        : '空间信息中登记 ↗'}
                  </p>
                </AppButton>
                <I name="ArrowRight" size={15} />
                <AppButton
                  className="po-relation-node"
                  onClick={() =>
                    related.leases[0]
                      ? edit('leases', related.leases[0])
                      : edit('spaces', selected)
                  }
                >
                  <small>03 / 租约安排</small>
                  <b>
                    {related.leases.length
                      ? `${related.leases.length} 项租约安排`
                      : related.bookings.length
                        ? `${related.bookings.length} 项参观预约`
                        : '暂无安排'}
                  </b>
                  <p>
                    {related.leases[0]?.date ||
                      related.bookings[0]?.date ||
                      '查看空间档案'}{' '}
                    ↗
                  </p>
                </AppButton>
                <I name="ArrowRight" size={15} />
                <AppButton
                  className="po-relation-node"
                  onClick={() =>
                    related.services[0]
                      ? edit('services', related.services[0])
                      : nav('services')
                  }
                >
                  <small>04 / 物业服务</small>
                  <b>
                    {related.services.length
                      ? `${related.services.length} 项待处理`
                      : '暂无待处理工单'}
                  </b>
                  <p>
                    {related.services[0]?.title ||
                      `${related.meters.length} 个关联水电表`}{' '}
                    ↗
                  </p>
                </AppButton>
              </div>
            </div>
          )}
        </section>

        <aside className="po-right-column">
          <section
            className="po-panel po-inbox"
            aria-labelledby="po-inbox-title"
          >
            <header className="po-section-head">
              <div>
                <div className="po-section-kicker">NEEDS ATTENTION</div>
                <h2 id="po-inbox-title">
                  运营待办<span>{pendingTotal}</span>
                </h2>
              </div>
              <span className="po-inbox-dot" />
            </header>
            <p className="po-section-sub">从待办直达业务，及时推进下一步。</p>
            <div className="po-attention-list">
              <AppButton
                className={`po-attention ${data.abnormal.length ? 'alert' : ''}`}
                onClick={() => nav('energy')}
              >
                <span className="po-attention-icon">
                  <I name="Zap" size={18} />
                </span>
                <div>
                  <b>
                    设备状态待核查<span>{data.abnormal.length}</span>
                  </b>
                  <p>
                    {data.abnormal.length
                      ? data.abnormal
                          .map((row) => row.title)
                          .slice(0, 2)
                          .join('、')
                      : '当前没有异常设备记录'}
                  </p>
                </div>
                <I name="ChevronRight" size={16} />
              </AppButton>
              <AppButton className="po-attention" onClick={() => nav('services')}>
                <span className="po-attention-icon">
                  <I name="Headphones" size={18} />
                </span>
                <div>
                  <b>
                    企业与物业服务<span>{data.services.length}</span>
                  </b>
                  <p>
                    {data.waiting} 项等待受理，{data.processing} 项处理中
                  </p>
                </div>
                <I name="ChevronRight" size={16} />
              </AppButton>
              <AppButton className="po-attention" onClick={() => nav('spaces')}>
                <span className="po-attention-icon">
                  <I name="FileClock" size={18} />
                </span>
                <div>
                  <b>
                    续租与到期跟进<span>{data.leaseAttention}</span>
                  </b>
                  <p>
                    {data.renewals.length} 项续租待确认 · {data.expiring.length}{' '}
                    份30日内到期
                  </p>
                </div>
                <I name="ChevronRight" size={16} />
              </AppButton>
            </div>
            <div className="po-inbox-foot">
              <I name="CircleCheck" size={14} />
              <span>已完成 {data.completed} 项服务工单</span>
              <AppButton onClick={() => nav('services')}>
                查看记录
                <I name="ArrowRight" size={13} />
              </AppButton>
            </div>
          </section>

          <section
            className="po-panel po-energy"
            aria-labelledby="po-energy-title"
          >
            <header>
              <h2 id="po-energy-title">今日水电</h2>
              <AppButton
                className="po-text-button"
                aria-label="查看智慧水电"
                onClick={() => nav('energy')}
              >
                <I name="ArrowUpRight" size={16} />
              </AppButton>
            </header>
            <div className="po-energy-values">
              {[
                {
                  title: '用电',
                  type: '电',
                  unit: 'kWh',
                  value: data.energy,
                  icon: 'Zap',
                },
                {
                  title: '用水',
                  type: '水',
                  unit: 'm³',
                  value: data.water,
                  icon: 'Droplets',
                },
              ].map((item) => (
                <div key={item.type}>
                  <small>
                    <I name={item.icon} size={13} />
                    {item.title}
                  </small>
                  <b>
                    {data.readings.some((row) => row.type === item.type)
                      ? amount(item.value)
                      : '—'}
                    <span>{item.unit}</span>
                  </b>
                </div>
              ))}
            </div>
            <p>
              <span className="po-reading-dot" />
              {data.readings.length
                ? `今日已登记 ${data.readings.length} 条抄表记录`
                : '今日暂无抄表记录，等待更新'}
            </p>
          </section>
          <AppButton className="po-quick-link" onClick={() => nav('policy')}>
            <span>
              <I name="Newspaper" size={18} />
              政策与园区通知
            </span>
            <I name="ArrowUpRight" size={18} />
          </AppButton>
        </aside>
      </div>

      <div className="po-bottom-grid">
        <section
          className="po-panel po-services"
          aria-labelledby="po-services-title"
        >
          <header className="po-section-head">
            <div>
              <div className="po-section-kicker">SERVICE ACTIVITY</div>
              <h2 id="po-services-title">服务跟进</h2>
            </div>
            <AppButton className="po-text-button" onClick={() => nav('services')}>
              全部工单
              <I name="ArrowUpRight" size={15} />
            </AppButton>
          </header>
          <div className="po-service-table">
            <table>
              <thead>
                <tr>
                  <th>服务事项</th>
                  <th>关联空间</th>
                  <th>负责人</th>
                  <th>状态</th>
                  <th>
                    <span className="po-sr-only">查看</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.services.slice(0, 4).map((row) => (
                  <tr key={row.id}>
                    <td>
                      <AppButton onClick={() => edit('services', row)}>
                        <span className="po-table-icon">
                          <I
                            name={row.type === '维修' ? 'Wrench' : 'Headphones'}
                            size={15}
                          />
                        </span>
                        {row.title}
                      </AppButton>
                    </td>
                    <td>
                      <AppButton
                        className="po-space-link"
                        onClick={() => {
                          const room = data.spaces.find((space) =>
                            row.spaceId
                              ? space.id === row.spaceId
                              : space.title === row.space,
                          );
                          if (room) {
                            setFilter('全部空间');
                            setType('全部类型');
                            setSelectedId(room.id);
                          } else {
                            nav('services');
                          }
                        }}
                      >
                        {data.spaces.find((space) => space.id === row.spaceId)
                          ?.title ||
                          row.space ||
                          '待关联'}
                        <I name="ArrowUpRight" size={12} />
                      </AppButton>
                    </td>
                    <td>{row.owner || '待分配'}</td>
                    <td>
                      <span
                        className={`po-service-status ${row.status === '待受理' ? 'waiting' : ''}`}
                      >
                        <i />
                        {row.status}
                      </span>
                    </td>
                    <td>
                      <AppButton
                        className="po-row-action"
                        aria-label={`查看${row.title}`}
                        onClick={() => edit('services', row)}
                      >
                        <I name="ArrowRight" size={15} />
                      </AppButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.services.length && (
              <div className="po-empty">
                <I name="CircleCheck" size={24} />
                <b>当前服务已处理完毕</b>
              </div>
            )}
          </div>
        </section>

        <section
          className="po-panel po-enterprises"
          aria-labelledby="po-enterprises-title"
        >
          <header className="po-section-head">
            <div>
              <div className="po-section-kicker">COMMUNITY</div>
              <h2 id="po-enterprises-title">
                企业档案<span>{data.enterpriseCount}</span>
              </h2>
            </div>
            <AppButton
              className="po-text-button"
              aria-label="管理企业档案"
              onClick={() => nav('enterprises')}
            >
              <I name="ArrowUpRight" size={17} />
            </AppButton>
          </header>
          <div className="po-company-list">
            {(state.collections.enterprises || []).slice(0, 3).map((row, i) => (
              <AppButton key={row.id} onClick={() => edit('enterprises', row)}>
                <span className={`po-company-avatar tone-${i}`}>
                  {row.title.slice(0, 1)}
                </span>
                <div>
                  <b>{row.title}</b>
                  <p>
                    {row.industry || '行业待登记'}
                    <span>·</span>
                    {row.scale || '规模待登记'}
                  </p>
                </div>
                <I name="ChevronRight" size={15} />
              </AppButton>
            ))}
          </div>
          {!data.enterpriseCount && (
            <div className="po-empty">
              <b>从第一份企业档案开始</b>
              <AppButton
                className="po-text-button"
                onClick={() => nav('enterprises')}
              >
                前往登记
                <I name="ArrowRight" size={14} />
              </AppButton>
            </div>
          )}
        </section>
      </div>
      <footer className="po-page-footer">
        <span>
          <i />
          当前工作空间记录 · 示例资料可编辑
        </span>
        <span>前海创客中心 / WORKSPACE OPERATIONS</span>
      </footer>
    </div>
  );
}
