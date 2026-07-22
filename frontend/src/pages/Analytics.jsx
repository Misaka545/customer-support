import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { TrendingUp, MessageSquare, Clock, Bot, Users, UserCheck, Cpu, Activity } from 'lucide-react';
import api from '../services/api';
import agentSocket from '../services/socket';
import CustomSelect from '../components/CustomSelect';
import './Analytics.css';

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }
  })
};

// Skeleton Component for clean loading state
function AnalyticsSkeleton() {
  return (
    <div className="analytics-page fit-screen">
      <div className="page-header">
        <div className="page-header-left">
          <div className="skeleton skeleton-title"></div>
        </div>
        <div className="page-header-right">
          <div className="skeleton skeleton-select"></div>
        </div>
      </div>

      <div className="summary-cards">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="stat-card skeleton-card">
            <div className="skeleton skeleton-text-sm"></div>
            <div className="skeleton skeleton-val"></div>
            <div className="skeleton skeleton-sub"></div>
          </div>
        ))}
      </div>

      <div className="analytics-main-grid">
        <div className="analytics-charts-column">
          <div className="chart-container skeleton-card" style={{ height: '220px' }}></div>
          <div className="chart-container skeleton-card" style={{ height: '220px' }}></div>
        </div>
        <div className="analytics-side-column">
          <div className="chart-container skeleton-card" style={{ height: '100%' }}></div>
        </div>
      </div>
    </div>
  );
}

export default function Analytics() {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7 ngày qua');

  const fetchAnalytics = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await api.get('/sessions/analytics/overview');
      setData(res.data.data);
    } catch (err) {
      console.error('Fetch analytics error:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  // Initial load + Real-time socket & polling setup
  useEffect(() => {
    fetchAnalytics(false);

    if (!agentSocket.connected) {
      agentSocket.connect();
    }

    const handleRealtimeUpdate = () => {
      fetchAnalytics(true);
    };

    agentSocket.on('session_updated', handleRealtimeUpdate);
    agentSocket.on('agent_status_updated', handleRealtimeUpdate);

    const interval = setInterval(() => {
      fetchAnalytics(true);
    }, 10000);

    return () => {
      agentSocket.off('session_updated', handleRealtimeUpdate);
      agentSocket.off('agent_status_updated', handleRealtimeUpdate);
      clearInterval(interval);
    };
  }, [fetchAnalytics]);

  if (loading && !data) {
    return <AnalyticsSkeleton />;
  }

  if (!data) {
    return (
      <div className="analytics-page fit-screen">
        <div className="analytics-error">Không thể tải dữ liệu báo cáo số liệu.</div>
      </div>
    );
  }

  const { metrics, last7DaysData } = data;

  const chartData = (last7DaysData && last7DaysData.length > 0)
    ? last7DaysData.map(d => ({
        name: d.date ? d.date.split('-').slice(1).join('/') : '',
        total: d.total || 0,
        closed: d.closed || 0,
        botHandled: d.botHandled || 0,
      }))
    : [
        { name: 'T2', total: 0, closed: 0, botHandled: 0 },
        { name: 'T3', total: 0, closed: 0, botHandled: 0 },
        { name: 'T4', total: 0, closed: 0, botHandled: 0 },
        { name: 'T5', total: 0, closed: 0, botHandled: 0 },
        { name: 'T6', total: 0, closed: 0, botHandled: 0 },
        { name: 'T7', total: 0, closed: 0, botHandled: 0 },
        { name: 'CN', total: 0, closed: 0, botHandled: 0 },
      ];

  const botPercentage = metrics.totalSessions > 0
    ? Math.round((metrics.botHandling / metrics.totalSessions) * 100)
    : 100;

  const statCards = [
    {
      id: 'total',
      title: 'TỔNG PHIÊN CHAT',
      value: metrics.totalSessions,
      subtitle: 'Tất cả phiên trong hệ thống',
      icon: MessageSquare,
      accent: '#7C5CFC',
      badge: 'Real-time',
    },
    {
      id: 'pending',
      title: 'ĐANG CHỜ HỖ TRỢ',
      value: metrics.pendingSessions,
      subtitle: 'Thời gian chờ trung bình: 0p',
      icon: Clock,
      accent: '#F59E0B',
      badge: metrics.totalInQueue > 0 ? `${metrics.totalInQueue} chờ` : 'Tối ưu',
    },
    {
      id: 'in_progress',
      title: 'CHAT ĐANG XỬ LÝ',
      value: metrics.inProgressSessions,
      subtitle: `Bot đang tự động xử lý: ${metrics.botHandling}`,
      icon: Bot,
      accent: '#10B981',
      badge: 'Đang hoạt động',
    },
    {
      id: 'online',
      title: 'NHÂN VIÊN TRỰC TUYẾN',
      value: `${metrics.onlineAgents} / ${metrics.totalAgents}`,
      subtitle: `Nhân viên đang sẵn sàng: ${metrics.availableAgents}`,
      icon: Users,
      accent: '#3B82F6',
      badge: `${metrics.onlineAgents} Online`,
    },
  ];

  return (
    <div className="analytics-page fit-screen">
      {/* Header - Vietnamese Title */}
      <motion.header
        className="page-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="page-header-left">
          <h1 className="page-title">
            <TrendingUp size={22} className="header-icon" /> Báo cáo số liệu
          </h1>
        </div>
        <div className="page-header-right">
          <CustomSelect
            pill
            options={['7 ngày qua', '30 ngày qua', 'Tháng này']}
            value={timeRange}
            onChange={setTimeRange}
          />
        </div>
      </motion.header>

      {/* 4 Executive KPI Stat Cards */}
      <div className="summary-cards">
        {statCards.map((card, i) => {
          const IconComponent = card.icon;
          return (
            <motion.div
              key={card.id}
              className={`stat-card stat-card-${card.id}`}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover={{ y: -2 }}
            >
              <div className="stat-card-top">
                <span className="stat-card-title">{card.title}</span>
                <div className="stat-card-icon" style={{ background: `${card.accent}14`, color: card.accent }}>
                  <IconComponent size={17} strokeWidth={1.75} />
                </div>
              </div>
              <div className="stat-card-main">
                <span className="stat-card-value">{card.value}</span>
                <span className="stat-card-badge" style={{ color: card.accent, background: `${card.accent}12` }}>
                  {card.badge}
                </span>
              </div>
              <div className="stat-card-subtitle">{card.subtitle}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Main Dashboard Layout: 2 Columns Grid */}
      <div className="analytics-main-grid">
        {/* Left Column: Stacked Compact Charts */}
        <div className="analytics-charts-column">
          {/* Bar Chart */}
          <motion.div
            className="chart-container chart-box"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.35 }}
          >
            <div className="chart-header">
              <h3>Hoạt động Chat (7 ngày)</h3>
              <div className="chart-legend-custom">
                <span className="legend-item"><span className="legend-dot green"></span> Tổng số</span>
                <span className="legend-item"><span className="legend-dot purple"></span> Đã đóng</span>
              </div>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} dy={6} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} allowDecimals={false} />
                  <RechartsTooltip cursor={{ fill: 'rgba(124, 92, 252, 0.04)' }} contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-light)', boxShadow: 'none', background: 'var(--bg-primary)' }} />
                  <Bar dataKey="total" fill="#10B981" radius={[4, 4, 0, 0]} barSize={12} name="Tổng chat" />
                  <Bar dataKey="closed" fill="#7C5CFC" radius={[4, 4, 0, 0]} barSize={12} name="Đã hoàn thành" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Area Chart */}
          <motion.div
            className="chart-container chart-box"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.35 }}
          >
            <div className="chart-header">
              <h3>Xu hướng xử lý (Bot vs Nhân viên)</h3>
              <div className="chart-legend-custom">
                <span className="legend-item"><span className="legend-dot green"></span> Tổng phiên</span>
                <span className="legend-item"><span className="legend-dot purple"></span> Bot xử lý</span>
              </div>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorBot" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C5CFC" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#7C5CFC" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} dy={6} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} allowDecimals={false} />
                  <RechartsTooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-light)', boxShadow: 'none', background: 'var(--bg-primary)' }} />
                  <Area type="monotone" dataKey="total" name="Tổng phiên" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                  <Area type="monotone" dataKey="botHandled" name="Bot xử lý" stroke="#7C5CFC" strokeWidth={2} fillOpacity={1} fill="url(#colorBot)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Right Column: High-Density Unified System Panel */}
        <motion.div
          className="analytics-side-column"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.35 }}
        >
          <div className="chart-container side-card-full">
            <div className="chart-header">
              <h3>Tổng quan hệ thống</h3>
              <Activity size={16} className="text-purple" />
            </div>

            <div className="system-overview-list">
              <div className="overview-item">
                <div className="overview-label-group">
                  <Bot size={16} strokeWidth={1.75} className="overview-icon text-purple" />
                  <span className="overview-label">Chat Bot xử lý</span>
                </div>
                <span className="overview-value">{metrics.botHandling}</span>
              </div>
              <div className="overview-item">
                <div className="overview-label-group">
                  <Clock size={16} strokeWidth={1.75} className="overview-icon text-amber" />
                  <span className="overview-label">Khách chờ trong hàng</span>
                </div>
                <span className="overview-value warning">{metrics.totalInQueue}</span>
              </div>
              <div className="overview-item">
                <div className="overview-label-group">
                  <Users size={16} strokeWidth={1.75} className="overview-icon text-blue" />
                  <span className="overview-label">Tổng nhân viên</span>
                </div>
                <span className="overview-value">{metrics.totalAgents}</span>
              </div>
              <div className="overview-item">
                <div className="overview-label-group">
                  <UserCheck size={16} strokeWidth={1.75} className="overview-icon text-green" />
                  <span className="overview-label">Nhân viên Online</span>
                </div>
                <span className="overview-value success">{metrics.onlineAgents}</span>
              </div>
            </div>

            <div className="side-card-divider"></div>

            {/* AI Automation Section - 100% SVG Icons, 0 Emojis */}
            <div className="ai-automation-section">
              <div className="chart-header" style={{ marginBottom: 8 }}>
                <div className="overview-label-group">
                  <Cpu size={16} className="text-purple" />
                  <h3>Tự động hóa AI</h3>
                </div>
                <span className="ratio-val">{botPercentage}%</span>
              </div>

              <div className="ratio-bar-container">
                <div className="ratio-bar-fill" style={{ width: `${botPercentage}%` }}></div>
              </div>

              <div className="ratio-legend">
                <span className="ratio-legend-item">
                  <Bot size={13} className="text-purple" /> Bot: <strong>{metrics.botHandling}</strong>
                </span>
                <span className="ratio-legend-item">
                  <Users size={13} className="text-blue" /> Nhân viên: <strong>{metrics.inProgressSessions}</strong>
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
