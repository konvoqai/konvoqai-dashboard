'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api/axios-instance';
import { useLogout, useUser } from '@/lib/auth/auth-hooks';
import {
  Activity,
  BarChart3,
  BookOpenText,
  Bot,
  Check,
  Copy,
  ExternalLink,
  FileText,
  Globe2,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  MessagesSquare,
  PanelRight,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

type DashboardSection =
  | 'overview'
  | 'sources'
  | 'widget'
  | 'embed'
  | 'chat'
  | 'feedback'
  | 'intent';

interface SourceItem {
  id?: string;
  url: string;
}

interface DocumentItem {
  id: string;
  fileName?: string;
  name?: string;
  createdAt?: string;
}

interface WidgetConfig {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  botName: string;
  welcomeMessage: string;
  logoUrl: string;
  position: string;
  borderRadius: number;
  fontSize: number;
}

interface WidgetRecord {
  widgetKey?: string;
  name?: string;
  isConfigured?: boolean;
  settings?: Partial<WidgetConfig>;
}

interface UsageRecord {
  planType?: string;
  conversationsUsed?: number;
  conversationsLimit?: number | null;
  conversationsRemaining?: number | null;
  resetDate?: string;
  isAtLimit?: boolean;
}

interface AnalyticsRecord {
  chatSessions?: number;
  leads?: number;
  sources?: number;
  widgetViews?: number;
  widgetMessages?: number;
  totalRatings?: number;
}

interface StatsRecord {
  sources?: number;
  scrapedPages?: number;
  documents?: number;
  pendingJobs?: number;
}

interface WidgetAnalyticsItem {
  eventType?: string;
  eventData?: Record<string, unknown>;
  createdAt?: string;
}

interface ChatSessionSummary {
  id: string;
  status?: string;
  messageCount?: number;
  lastMessagePreview?: string;
  lastMessageAt?: string;
  createdAt?: string;
}

interface ChatMessage {
  role: string;
  content: string;
  createdAt?: string;
}

interface FeedbackItem {
  id: string;
  type?: string;
  title?: string | null;
  message: string;
  pagePath?: string | null;
  createdAt?: string;
}

const defaultWidgetConfig: WidgetConfig = {
  primaryColor: '#5b8cff',
  backgroundColor: '#0f1013',
  textColor: '#ffffff',
  botName: 'Konvoq AI',
  welcomeMessage: 'Welcome to your live support assistant.',
  logoUrl: '',
  position: 'bottom-right',
  borderRadius: 24,
  fontSize: 14,
};

const sections: Array<{
  id: DashboardSection;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'widget', label: 'Craft Console', icon: Settings2 },
  { id: 'sources', label: 'Data Sources', icon: BookOpenText },
  { id: 'chat', label: 'Chat History', icon: MessagesSquare },
  { id: 'intent', label: 'Customer Intent', icon: BarChart3 },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  { id: 'embed', label: 'Embed Code', icon: PanelRight },
];

function ActivityChart({ data }: { data: { label: string; value: number }[] }) {
  const maxVal = Math.max(...data.map((d) => d.value), 8);
  const W = 800, H = 180, pL = 36, pR = 16, pT = 16, pB = 36;
  const iW = W - pL - pR, iH = H - pT - pB;
  const pts = data.map((d, i) => ({
    x: pL + (i / Math.max(data.length - 1, 1)) * iW,
    y: pT + (1 - d.value / maxVal) * iH,
  }));
  const linePath = pts.reduce((p, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = pts[i - 1];
    const cx = (prev.x + pt.x) / 2;
    return `${p} C ${cx} ${prev.y}, ${cx} ${pt.y}, ${pt.x} ${pt.y}`;
  }, '');
  const areaPath = pts.length
    ? `${linePath} L ${pts[pts.length - 1].x} ${pT + iH} L ${pL} ${pT + iH} Z`
    : '';
  const gridVals = [0, Math.round(maxVal * 0.5), maxVal];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="ds-chart-svg" preserveAspectRatio="none">
      <defs>
        <linearGradient id="dsChartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent-strong)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--accent-strong)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {gridVals.map((v, gi) => {
        const gy = pT + (1 - v / maxVal) * iH;
        return (
          <g key={gi}>
            <line x1={pL} x2={W - pR} y1={gy} y2={gy} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <text x={pL - 5} y={gy + 4} textAnchor="end" fill="rgba(255,255,255,0.28)" fontSize="9">{v}</text>
          </g>
        );
      })}
      {areaPath && <path d={areaPath} fill="url(#dsChartGrad)" />}
      {linePath && <path d={linePath} fill="none" stroke="var(--accent-strong)" strokeWidth="2" strokeOpacity="0.85" strokeLinejoin="round" strokeLinecap="round" />}
      {pts.map((pt, i) => (
        <g key={i}>
          <circle cx={pt.x} cy={pt.y} r="3.5" fill="var(--accent-strong)" opacity="0.9" />
          <text x={pt.x} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9">{data[i].label}</text>
        </g>
      ))}
    </svg>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  const maybe = error as {
    response?: {
      data?: {
        message?: string;
      };
      status?: number;
    };
  };

  return maybe?.response?.data?.message || fallback;
}

function formatNumber(value?: number | null) {
  if (value === null || value === undefined) return '0';
  return new Intl.NumberFormat('en-US').format(value);
}

function formatDate(value?: string | null) {
  if (!value) return 'Just now';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Just now';

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Recently';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Recently';

  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getDocumentName(document: DocumentItem) {
  return document.fileName || document.name || 'Document';
}

export function DashboardApp() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const { logout } = useLogout();

  const [activeSection, setActiveSection] = useState<DashboardSection>('overview');
  const [isBooting, setIsBooting] = useState(true);
  const [, setIsRefreshing] = useState(false);

  const [usage, setUsage] = useState<UsageRecord>({});
  const [analytics, setAnalytics] = useState<AnalyticsRecord>({});
  const [stats, setStats] = useState<StatsRecord>({});
  const [widgetAnalytics, setWidgetAnalytics] = useState<WidgetAnalyticsItem[]>([]);

  const [sources, setSources] = useState<SourceItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [url, setUrl] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [isSavingSource, setIsSavingSource] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [deletingSourceUrl, setDeletingSourceUrl] = useState<string | null>(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);

  const [widgetName, setWidgetName] = useState('My Chat Widget');
  const [widget, setWidget] = useState<WidgetRecord | null>(null);
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig>(defaultWidgetConfig);
  const [widgetSaved, setWidgetSaved] = useState(false);
  const [isSavingWidget, setIsSavingWidget] = useState(false);

  const [embedCode, setEmbedCode] = useState('');
  const [installSteps, setInstallSteps] = useState<string[]>([]);

  const [chatSessions, setChatSessions] = useState<ChatSessionSummary[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loadingChatId, setLoadingChatId] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);

  const hydrateWidget = (widgetRecord: WidgetRecord | null | undefined) => {
    const settings = widgetRecord?.settings || {};

    setWidget(widgetRecord || null);
    setWidgetName(widgetRecord?.name || 'My Chat Widget');
    setWidgetConfig({
      ...defaultWidgetConfig,
      ...settings,
      borderRadius:
        typeof settings.borderRadius === 'number'
          ? settings.borderRadius
          : defaultWidgetConfig.borderRadius,
      fontSize:
        typeof settings.fontSize === 'number' ? settings.fontSize : defaultWidgetConfig.fontSize,
      logoUrl:
        typeof settings.logoUrl === 'string' ? settings.logoUrl : defaultWidgetConfig.logoUrl,
    });
    setWidgetSaved(Boolean(widgetRecord?.isConfigured));
  };

  const loadChatSession = useCallback(async (sessionId: string) => {
    setLoadingChatId(sessionId);
    try {
      const response = await apiClient.get(`/dashboard/chat-sessions/${sessionId}`);
      setSelectedChatId(sessionId);
      setChatMessages(response.data?.session?.messages || []);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to load conversation'));
    } finally {
      setLoadingChatId(null);
    }
  }, []);

  const loadDashboardData = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') {
        setIsRefreshing(true);
      }

      try {
        const onboardingRes = await apiClient.get('/onboarding/status');
        if (onboardingRes.data?.shouldOnboard) {
          router.replace('/dashboard/setup');
          return;
        }

        const [
          usageRes,
          overviewRes,
          sourcesRes,
          documentsRes,
          widgetRes,
          chatRes,
          feedbackRes,
        ] = await Promise.all([
          apiClient.get('/dashboard/usage'),
          apiClient.get('/dashboard/overview'),
          apiClient.get('/dashboard/sources'),
          apiClient.get('/dashboard/documents'),
          apiClient.get('/dashboard/widget').catch(() => ({ data: { widget: null } })),
          apiClient.get('/dashboard/chat-sessions'),
          apiClient.get('/dashboard/feedback'),
        ]);

        const embedRes = await apiClient
          .get('/dashboard/embed')
          .catch(() => ({ data: { script: '', installSteps: [] } }));

        setUsage(usageRes.data?.usage || {});
        setAnalytics(overviewRes.data?.analytics || {});
        setStats(overviewRes.data?.stats || usageRes.data?.stats || {});
        setWidgetAnalytics(overviewRes.data?.widgetAnalytics || []);

        setSources(sourcesRes.data?.sources || []);
        setDocuments(documentsRes.data?.documents || []);

        const widgetRecord = widgetRes.data?.widget || null;
        hydrateWidget(widgetRecord);

        setEmbedCode(embedRes.data?.script || '');
        setInstallSteps(embedRes.data?.installSteps || []);

        const sessions = chatRes.data?.sessions || [];
        setChatSessions(sessions);
        setFeedback(feedbackRes.data?.feedback || []);
      } catch (error: unknown) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 401) {
          router.replace('/login');
          return;
        }
        toast.error(getErrorMessage(error, 'Failed to load dashboard'));
      } finally {
        setIsBooting(false);
        setIsRefreshing(false);
      }
    },
    [router],
  );

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    void loadDashboardData();
  }, [isLoading, user, router, loadDashboardData]);

  useEffect(() => {
    if (chatSessions.length === 0) {
      setSelectedChatId(null);
      setChatMessages([]);
      return;
    }

    if (selectedChatId && chatSessions.some((session) => session.id === selectedChatId)) {
      return;
    }

    void loadChatSession(chatSessions[0].id);
  }, [chatSessions, selectedChatId, loadChatSession]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Logout failed'));
    }
  };

  const handleAddSource = async (event: FormEvent) => {
    event.preventDefault();

    if (!url.trim()) {
      toast.error('Enter a URL first');
      return;
    }

    setIsSavingSource(true);
    try {
      await apiClient.post('/dashboard/sources', { url: url.trim() });
      setUrl('');
      toast.success('Source added');
      await loadDashboardData('refresh');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to add source'));
    } finally {
      setIsSavingSource(false);
    }
  };

  const handleDeleteSource = async (sourceUrl: string) => {
    setDeletingSourceUrl(sourceUrl);
    try {
      await apiClient.delete('/dashboard/sources', { params: { url: sourceUrl } });
      toast.success('Source removed');
      await loadDashboardData('refresh');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to remove source'));
    } finally {
      setDeletingSourceUrl(null);
    }
  };

  const handleUploadDocument = async (event: FormEvent) => {
    event.preventDefault();

    if (!documentFile) {
      toast.error('Select a document first');
      return;
    }

    setIsUploadingDocument(true);
    try {
      const formData = new FormData();
      formData.append('document', documentFile);
      await apiClient.post('/dashboard/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDocumentFile(null);
      toast.success('Document uploaded');
      await loadDashboardData('refresh');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Document upload failed'));
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    setDeletingDocumentId(documentId);
    try {
      await apiClient.delete(`/dashboard/documents/${documentId}`);
      toast.success('Document removed');
      await loadDashboardData('refresh');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to remove document'));
    } finally {
      setDeletingDocumentId(null);
    }
  };

  const updateWidgetConfig = (updates: Partial<WidgetConfig>) => {
    setWidgetSaved(false);
    setWidgetConfig((current) => ({ ...current, ...updates }));
  };

  const handleSaveWidget = async () => {
    setIsSavingWidget(true);
    try {
      await apiClient.put('/dashboard/widget', {
        name: widgetName,
        settings: widgetConfig,
      });

      const [widgetRes, embedRes] = await Promise.all([
        apiClient.get('/dashboard/widget'),
        apiClient.get('/dashboard/embed').catch(() => ({ data: { script: '', installSteps: [] } })),
      ]);

      hydrateWidget(widgetRes.data?.widget || null);
      setEmbedCode(embedRes.data?.script || '');
      setInstallSteps(embedRes.data?.installSteps || []);
      toast.success('Widget saved');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to save widget'));
    } finally {
      setIsSavingWidget(false);
    }
  };

  const readinessItems = [
    {
      label: 'Knowledge sources connected',
      complete: sources.length > 0 || (stats.scrapedPages ?? 0) > 0,
      detail:
        sources.length > 0
          ? `${sources.length} source${sources.length === 1 ? '' : 's'} connected`
          : 'Add at least one website source',
    },
    {
      label: 'Documents uploaded',
      complete: documents.length > 0,
      detail:
        documents.length > 0
          ? `${documents.length} file${documents.length === 1 ? '' : 's'} uploaded`
          : 'Optional, but useful for internal context',
    },
    {
      label: 'Widget configured',
      complete: widgetSaved,
      detail: widgetSaved ? 'Branding is ready for install' : 'Save widget settings to continue',
    },
    {
      label: 'Install script generated',
      complete: Boolean(embedCode),
      detail: embedCode ? 'Script is ready to paste on your site' : 'Install code will appear after widget setup',
    },
  ];

  const usageLimit = usage.conversationsLimit;
  const usageRemaining = usage.conversationsRemaining;
  const usagePercent =
    usageLimit && usageLimit > 0
      ? Math.min(100, Math.round(((usage.conversationsUsed ?? 0) / usageLimit) * 100))
      : 0;
  const conversationHealthScore = usageLimit && usageLimit > 0 ? Math.max(0, 100 - usagePercent) : 100;
  const conversationHealthValue = usageLimit && usageLimit > 0 ? `${conversationHealthScore}%` : '100%';
  const conversationHealthDetail =
    usageRemaining === null || usageRemaining === undefined
      ? 'Unlimited conversation capacity'
      : `${formatNumber(usageRemaining)} conversations remaining`;

  // Chart data — last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const eventsByDay = widgetAnalytics.reduce((acc, item) => {
    const day = item.createdAt?.slice(0, 10);
    if (day && last7Days.includes(day)) acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const chartData = last7Days.map((day) => ({
    label: new Date(day + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: eventsByDay[day] || 0,
  }));
  const activeDays7d = Object.keys(eventsByDay).length;
  const planType = (usage.planType || user?.plan_type || 'free').toString();
  const workspaceName = user?.fullName || user?.email?.split('@')[0] || 'Workspace';
  const userInitial = (user?.fullName || user?.email || 'U')[0].toUpperCase();

  if (isLoading || isBooting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="section-surface flex items-center gap-3 px-5 py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent-strong)] border-t-transparent" />
          <span className="text-sm text-[var(--text-2)]">Loading your workspace</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="ds-root">

      {/* ── Top navbar ── */}
      <header className="ds-topbar">
        <div className="ds-topbar-left">
          <div className="ds-brand">
            <Sparkles className="h-4 w-4" />
            <span>Konvoq</span>
          </div>
          <span className="ds-topbar-sep">/</span>
          <span className="ds-workspace-name">{workspaceName}&apos;s Workspace</span>
          <span className="ds-plan-tag">{planType.charAt(0).toUpperCase() + planType.slice(1)}</span>
        </div>
        <div className="ds-topbar-right">
          <button type="button" className="ds-user-avatar" title={user.email}>
            {userInitial}
          </button>
        </div>
      </header>

      {/* ── Body: sidebar + main ── */}
      <div className="ds-body">

        {/* Sidebar */}
        <aside className="ds-sidebar">
          <nav className="ds-nav">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  type="button"
                  className="ds-nav-item"
                  data-active={activeSection === section.id}
                  onClick={() => setActiveSection(section.id)}
                >
                  <Icon className="h-4 w-4" />
                  <span>{section.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="ds-sidebar-footer">
            <div className="ds-usage-meter">
              <div className="ds-usage-header">
                <span className="ds-usage-title">Conversations Left</span>
                <button type="button" className="ds-upgrade-btn">Upgrade</button>
              </div>
              <div className="ds-usage-count">
                {formatNumber(usage.conversationsUsed ?? 0)} / {usageLimit === null || usageLimit === undefined ? '∞' : formatNumber(usageLimit)}
              </div>
              {usage.resetDate && (
                <div className="ds-usage-reset">Reset: {formatDate(usage.resetDate)}</div>
              )}
            </div>
            <button type="button" className="ds-logout-btn" onClick={handleLogout}>
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="ds-main">

          {/* ── Overview ── */}
          {activeSection === 'overview' ? (
            <div className="ds-section-wrap">

              <div className="ds-page-header">
                <div className="ds-page-header-simple">
                  <h1 className="ds-page-title">Dashboard Overview</h1>
                  <p className="ds-page-subtitle">
                    Live performance metrics, conversations, and activity trends.
                  </p>
                </div>
                <div className="ds-chatbot-pill">
                  <span className="ds-active-label">● Active</span>
                </div>
              </div>

              <div className="ds-metric-grid">
                {[
                  {
                    label: 'Knowledge Pages',
                    value: formatNumber(stats.scrapedPages),
                    desc: 'Total pages available for assistant responses',
                    icon: BookOpenText,
                  },
                  {
                    label: 'Messages',
                    value: formatNumber(analytics.widgetMessages),
                    desc: 'Total assistant and visitor messages',
                    icon: MessageSquare,
                  },
                  {
                    label: 'Unique Visitors',
                    value: formatNumber(analytics.leads),
                    desc: 'Distinct visitor interactions recorded',
                    icon: Globe2,
                  },
                  {
                    label: 'Total Sessions',
                    value: formatNumber(analytics.chatSessions),
                    desc: 'Total chatbot sessions across your workspace',
                    icon: MessagesSquare,
                  },
                ].map((card) => (
                  <div key={card.label} className="ds-metric-card">
                    <div className="ds-metric-card-head">
                      <span className="ds-metric-label">{card.label}</span>
                      <div className="ds-metric-icon">
                        <card.icon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="ds-metric-value">{card.value}</div>
                    <div className="ds-metric-desc">{card.desc}</div>
                  </div>
                ))}
              </div>

              <div className="ds-embed-strip">
                <span className="ds-embed-strip-label">Embed Script</span>
                <div className="ds-embed-strip-code">
                  {embedCode || '<script src="https://your-domain.com/api/v1/embed/your-key.js"></script>'}
                </div>
                <button
                  type="button"
                  className="ds-embed-strip-copy"
                  disabled={!embedCode}
                  onClick={async () => {
                    if (!embedCode) return;
                    await navigator.clipboard.writeText(embedCode);
                    toast.success('Embed code copied');
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy Code
                </button>
              </div>

              <div className="ds-analytics-grid">
                {[
                  {
                    label: 'Avg Session Duration',
                    value: '0 Min',
                    desc: 'Average session lifetime',
                    icon: Activity,
                  },
                  {
                    label: 'Bounce Rate',
                    value: '0%',
                    desc: 'Share of sessions with no chat activity',
                    icon: BarChart3,
                  },
                  {
                    label: 'Active Days (7d)',
                    value: formatNumber(activeDays7d),
                    desc: 'Days with at least one tracked event',
                    icon: MessagesSquare,
                  },
                  {
                    label: 'Conversation Health',
                    value: conversationHealthValue,
                    desc: conversationHealthDetail,
                    icon: Bot,
                  },
                ].map((card) => (
                  <div key={card.label} className="ds-metric-card">
                    <div className="ds-metric-card-head">
                      <span className="ds-metric-label">{card.label}</span>
                      <div className="ds-metric-icon">
                        <card.icon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="ds-metric-value">{card.value}</div>
                    <div className="ds-metric-desc">{card.desc}</div>
                  </div>
                ))}
              </div>

              <div className="ds-chart-card">
                <div className="ds-chart-header">
                  <Activity className="h-4 w-4 text-[var(--accent-strong)]" />
                  <h2 className="ds-chart-title">Last 7 Days Activity</h2>
                </div>
                <ActivityChart data={chartData} />
              </div>

            </div>
          ) : null}

              {false ? (
                <div className="space-y-6">
                  <div className="dashboard-grid-four">
                    {[
                      {
                        label: 'Conversations left',
                        value:
                          usageRemaining === null || usageRemaining === undefined
                            ? 'Unlimited'
                            : formatNumber(usageRemaining),
                        meta:
                          usageLimit === null || usageLimit === undefined
                            ? 'No cap on current plan'
                            : `${formatNumber(usage.conversationsUsed)} of ${formatNumber(usageLimit)} used`,
                        icon: Activity,
                      },
                      {
                        label: 'Widget messages',
                        value: formatNumber(analytics.widgetMessages),
                        meta: `${formatNumber(analytics.widgetViews)} views across the live widget`,
                        icon: Bot,
                      },
                      {
                        label: 'Leads captured',
                        value: formatNumber(analytics.leads),
                        meta: 'Tracked from live conversations',
                        icon: Sparkles,
                      },
                      {
                        label: 'Customer ratings',
                        value: formatNumber(analytics.totalRatings),
                        meta: `${formatNumber(chatSessions.length)} recent sessions recorded`,
                        icon: MessageSquare,
                      },
                    ].map((item) => (
                      <div key={item.label} className="section-surface p-5">
                        <div className="mb-6 flex items-start justify-between gap-4">
                          <div className="text-sm font-medium text-[var(--text-2)]">
                            {item.label}
                          </div>
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-[color:var(--surface)]">
                            <item.icon className="h-4 w-4 text-[var(--accent-strong)]" />
                          </div>
                        </div>
                        <div className="mb-2 text-3xl font-bold tracking-[-0.05em] text-[var(--text-1)]">
                          {item.value}
                        </div>
                        <p className="m-0 text-sm leading-6 text-[var(--text-3)]">{item.meta}</p>
                      </div>
                    ))}
                  </div>

                  <div className="dashboard-grid-two">
                    <div className="section-surface p-6">
                      <div className="mb-6 flex items-center justify-between gap-4">
                        <div>
                          <h2 className="mb-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">
                            Launch readiness
                          </h2>
                          <p className="m-0 text-sm leading-6 text-[var(--text-2)]">
                            Move through the same flow you used in setup, now summarized in one view.
                          </p>
                        </div>
                        <Link
                          href="/dashboard/setup"
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[color:var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--text-1)] no-underline shadow-[var(--shadow-card)]"
                        >
                          Open setup
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </div>

                      <div className="space-y-3">
                        {readinessItems.map((item) => (
                          <div key={item.label} className="section-surface flex items-center gap-4 p-4">
                            <div
                              className="flex h-10 w-10 items-center justify-center rounded-full"
                              style={{
                                background: item.complete
                                  ? 'var(--accent-muted)'
                                  : 'rgba(255,255,255,0.06)',
                                color: item.complete ? 'var(--accent-strong)' : 'var(--text-3)',
                              }}
                            >
                              <Check className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-[var(--text-1)]">
                                {item.label}
                              </div>
                              <div className="text-sm text-[var(--text-3)]">{item.detail}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="section-surface p-6">
                      <div className="mb-6">
                        <h2 className="mb-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">
                          Usage runway
                        </h2>
                        <p className="m-0 text-sm leading-6 text-[var(--text-2)]">
                          Keep an eye on plan usage before rollout scales up.
                        </p>
                      </div>

                      <div className="section-surface p-5">
                        <div className="mb-3 flex items-center justify-between gap-4 text-sm">
                          <span className="text-[var(--text-2)]">Conversation quota</span>
                          <span className="text-[var(--text-1)]">
                            {usageLimit === null || usageLimit === undefined
                              ? 'Unlimited'
                              : `${formatNumber(usage.conversationsUsed)} / ${formatNumber(usageLimit)}`}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/6">
                          <div
                            className="h-full rounded-full bg-[var(--grad-btn)] transition-all"
                            style={{ width: `${usagePercent}%` }}
                          />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--text-3)]">
                          <span className="dashboard-chip">Resets {formatDate(usage.resetDate)}</span>
                          <span className="dashboard-chip">
                            {usage.isAtLimit ? 'At limit' : 'Active and available'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3">
                        <div className="section-surface flex items-center justify-between p-4">
                          <span className="text-sm text-[var(--text-2)]">Sources</span>
                          <span className="text-sm font-semibold text-[var(--text-1)]">
                            {formatNumber(stats.sources ?? analytics.sources)}
                          </span>
                        </div>
                        <div className="section-surface flex items-center justify-between p-4">
                          <span className="text-sm text-[var(--text-2)]">Documents</span>
                          <span className="text-sm font-semibold text-[var(--text-1)]">
                            {formatNumber(stats.documents ?? documents.length)}
                          </span>
                        </div>
                        <div className="section-surface flex items-center justify-between p-4">
                          <span className="text-sm text-[var(--text-2)]">Pending jobs</span>
                          <span className="text-sm font-semibold text-[var(--text-1)]">
                            {formatNumber(stats.pendingJobs)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-grid-two">
                    <div className="section-surface p-6">
                      <div className="mb-6">
                        <h2 className="mb-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">
                          Recent activity
                        </h2>
                        <p className="m-0 text-sm leading-6 text-[var(--text-2)]">
                          Latest widget signals flowing into the product.
                        </p>
                      </div>

                      {widgetAnalytics.length === 0 ? (
                        <div className="dashboard-empty">
                          Live widget analytics will appear here after your widget is installed.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {widgetAnalytics.slice(0, 5).map((item, index) => (
                            <div
                              key={`${item.eventType}-${item.createdAt}-${index}`}
                              className="section-surface p-4"
                            >
                              <div className="mb-1 flex items-center justify-between gap-4">
                                <div className="text-sm font-semibold capitalize text-[var(--text-1)]">
                                  {(item.eventType || 'event').replace(/_/g, ' ')}
                                </div>
                                <div className="text-xs text-[var(--text-3)]">
                                  {formatDateTime(item.createdAt)}
                                </div>
                              </div>
                              <div className="text-sm text-[var(--text-2)]">
                                {(item.eventData?.pagePath as string) ||
                                  (item.eventData?.page as string) ||
                                  'Tracked from your live widget.'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="section-surface p-6">
                      <div className="mb-6">
                        <h2 className="mb-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">
                          Connected content
                        </h2>
                        <p className="m-0 text-sm leading-6 text-[var(--text-2)]">
                          Quick view of what currently powers the assistant.
                        </p>
                      </div>

                      <div className="space-y-3">
                        {sources.slice(0, 2).map((source) => (
                          <div key={source.url} className="section-surface p-4">
                            <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-3)]">
                              Website source
                            </div>
                            <div className="truncate text-sm text-[var(--text-1)]">{source.url}</div>
                          </div>
                        ))}
                        {documents.slice(0, 2).map((document) => (
                          <div key={document.id} className="section-surface p-4">
                            <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-3)]">
                              Uploaded document
                            </div>
                            <div className="truncate text-sm text-[var(--text-1)]">
                              {getDocumentName(document)}
                            </div>
                          </div>
                        ))}
                        {sources.length === 0 && documents.length === 0 ? (
                          <div className="dashboard-empty">
                            No content connected yet. Start in the Sources section.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

          {/* ── Data Sources ── */}
          {activeSection === 'sources' ? (
            <div className="ds-section-wrap">
              <div className="ds-page-header-simple">
                <h1 className="ds-page-title">Data Sources</h1>
                <p className="ds-page-subtitle">Manage website pages and uploaded docs so the assistant stays grounded in the right context.</p>
              </div>
              <div className="ds-two-col">
                  <div className="section-surface p-6">
                    <div className="mb-6 flex items-start justify-between gap-4">
                      <div>
                        <h2 className="mb-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">
                          Website knowledge
                        </h2>
                        <p className="m-0 text-sm leading-6 text-[var(--text-2)]">
                          Connect product pages, help docs, and public URLs for grounded answers.
                        </p>
                      </div>
                      <div className="dashboard-chip">
                        {formatNumber(stats.scrapedPages ?? sources.length)} pages indexed
                      </div>
                    </div>

                    <form onSubmit={handleAddSource} className="space-y-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="dashboard-source-url"
                          className="text-sm font-semibold text-[var(--text-2)]"
                        >
                          Add a public URL
                        </Label>
                        <Input
                          id="dashboard-source-url"
                          type="url"
                          placeholder="https://example.com/help"
                          value={url}
                          onChange={(event) => setUrl(event.target.value)}
                        />
                      </div>
                      <Button type="submit" disabled={isSavingSource}>
                        <Plus className="h-4 w-4" />
                        {isSavingSource ? 'Adding source...' : 'Add source'}
                      </Button>
                    </form>

                    <div className="mt-6 space-y-3">
                      {sources.length === 0 ? (
                        <div className="dashboard-empty">
                          Add your first source here to build the retrieval layer behind Konvoq.
                        </div>
                      ) : (
                        sources.map((source) => (
                          <div key={source.url} className="section-surface flex items-center gap-4 p-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-[color:var(--surface)]">
                              <Globe2 className="h-4 w-4 text-[var(--accent-strong)]" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold text-[var(--text-1)]">
                                {source.url}
                              </div>
                              <div className="text-xs text-[var(--text-3)]">Live source</div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              type="button"
                              disabled={deletingSourceUrl === source.url}
                              onClick={() => void handleDeleteSource(source.url)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="section-surface p-6">
                    <div className="mb-6 flex items-start justify-between gap-4">
                      <div>
                        <h2 className="mb-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">
                          Supporting documents
                        </h2>
                        <p className="m-0 text-sm leading-6 text-[var(--text-2)]">
                          Upload TXT or CSV files for extra product context, notes, or structured exports.
                        </p>
                      </div>
                      <div className="dashboard-chip">{formatNumber(documents.length)} uploaded</div>
                    </div>

                    <form onSubmit={handleUploadDocument} className="space-y-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="dashboard-document-upload"
                          className="text-sm font-semibold text-[var(--text-2)]"
                        >
                          Upload TXT or CSV
                        </Label>
                        <Input
                          id="dashboard-document-upload"
                          type="file"
                          accept=".txt,.csv,text/plain,text/csv"
                          onChange={(event) => setDocumentFile(event.target.files?.[0] || null)}
                        />
                      </div>
                      <Button type="submit" variant="outline" disabled={isUploadingDocument}>
                        <Upload className="h-4 w-4" />
                        {isUploadingDocument ? 'Uploading...' : 'Upload document'}
                      </Button>
                    </form>

                    <div className="mt-6 space-y-3">
                      {documents.length === 0 ? (
                        <div className="dashboard-empty">
                          Optional, but useful for internal notes, onboarding sheets, or product references.
                        </div>
                      ) : (
                        documents.map((document) => (
                          <div key={document.id} className="section-surface flex items-center gap-4 p-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-[color:var(--surface)]">
                              <FileText className="h-4 w-4 text-[var(--accent-strong)]" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold text-[var(--text-1)]">
                                {getDocumentName(document)}
                              </div>
                              <div className="text-xs text-[var(--text-3)]">
                                Added {formatDate(document.createdAt)}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              type="button"
                              disabled={deletingDocumentId === document.id}
                              onClick={() => void handleDeleteDocument(document.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
            </div>
          ) : null}

          {/* ── Craft Console (Widget) ── */}
          {activeSection === 'widget' ? (
            <div className="ds-section-wrap">
              <div className="ds-page-header-simple">
                <h1 className="ds-page-title">Craft Console</h1>
                <p className="ds-page-subtitle">Tune the assistant until it feels on-brand and on-product.</p>
              </div>
              <div className="ds-two-col">
                  <div className="section-surface p-6">
                    <div className="mb-6 flex items-start justify-between gap-4">
                      <div>
                        <h2 className="mb-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">
                          Widget settings
                        </h2>
                        <p className="m-0 text-sm leading-6 text-[var(--text-2)]">
                          Match the chat surface to the rest of your product before you install it.
                        </p>
                      </div>
                      <div className="dashboard-chip">{widgetSaved ? 'Saved' : 'Draft changes'}</div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[var(--text-2)]">
                          Widget name
                        </Label>
                        <Input
                          value={widgetName}
                          onChange={(event) => {
                            setWidgetSaved(false);
                            setWidgetName(event.target.value);
                          }}
                        />
                      </div>

                      <div className="dashboard-grid-two">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-[var(--text-2)]">
                            Primary color
                          </Label>
                          <Input
                            type="color"
                            value={widgetConfig.primaryColor}
                            onChange={(event) =>
                              updateWidgetConfig({ primaryColor: event.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-[var(--text-2)]">
                            Background color
                          </Label>
                          <Input
                            type="color"
                            value={widgetConfig.backgroundColor}
                            onChange={(event) =>
                              updateWidgetConfig({ backgroundColor: event.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div className="dashboard-grid-two">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-[var(--text-2)]">
                            Text color
                          </Label>
                          <Input
                            type="color"
                            value={widgetConfig.textColor}
                            onChange={(event) => updateWidgetConfig({ textColor: event.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-[var(--text-2)]">
                            Logo URL
                          </Label>
                          <Input
                            value={widgetConfig.logoUrl}
                            placeholder="https://cdn.example.com/logo.png"
                            onChange={(event) => updateWidgetConfig({ logoUrl: event.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[var(--text-2)]">Bot name</Label>
                        <Input
                          value={widgetConfig.botName}
                          onChange={(event) => updateWidgetConfig({ botName: event.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[var(--text-2)]">
                          Welcome message
                        </Label>
                        <Input
                          value={widgetConfig.welcomeMessage}
                          onChange={(event) =>
                            updateWidgetConfig({ welcomeMessage: event.target.value })
                          }
                        />
                      </div>

                      <div className="dashboard-grid-two">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-[var(--text-2)]">Position</Label>
                          <select
                            className="h-11 w-full rounded-xl border border-white/10 bg-[color:var(--surface)] px-3.5 text-sm text-[var(--text-1)] shadow-[var(--shadow-card)] outline-none"
                            value={widgetConfig.position}
                            onChange={(event) => updateWidgetConfig({ position: event.target.value })}
                          >
                            <option value="bottom-right">Bottom right</option>
                            <option value="bottom-left">Bottom left</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-[var(--text-2)]">
                            Border radius
                          </Label>
                          <Input
                            type="number"
                            value={widgetConfig.borderRadius}
                            onChange={(event) =>
                              updateWidgetConfig({
                                borderRadius:
                                  Number(event.target.value) || defaultWidgetConfig.borderRadius,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[var(--text-2)]">Font size</Label>
                        <Input
                          type="number"
                          value={widgetConfig.fontSize}
                          onChange={(event) =>
                            updateWidgetConfig({
                              fontSize: Number(event.target.value) || defaultWidgetConfig.fontSize,
                            })
                          }
                        />
                      </div>

                      <Button className="w-full" onClick={handleSaveWidget} disabled={isSavingWidget}>
                        {isSavingWidget ? 'Saving widget...' : 'Save widget settings'}
                      </Button>
                    </div>
                  </div>

                  <div className="section-surface p-6">
                    <div className="mb-6">
                      <h2 className="mb-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">
                        Live look and feel
                      </h2>
                      <p className="m-0 text-sm leading-6 text-[var(--text-2)]">
                        Preview the visual system directly inside the dashboard without leaving the flow.
                      </p>
                    </div>

                    <div
                      className="relative overflow-hidden rounded-[28px] border border-white/10 p-5 shadow-[var(--shadow-card)]"
                      style={{
                        background: `radial-gradient(circle at top, ${widgetConfig.primaryColor}22, transparent 40%), ${widgetConfig.backgroundColor}`,
                      }}
                    >
                      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/8 to-transparent" />
                      <div className="relative space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-11 w-11 items-center justify-center rounded-2xl"
                              style={{
                                background: widgetConfig.primaryColor,
                                color: widgetConfig.textColor,
                              }}
                            >
                              {widgetConfig.logoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={widgetConfig.logoUrl}
                                  alt=""
                                  className="h-6 w-6 rounded-full object-cover"
                                />
                              ) : (
                                <Bot className="h-5 w-5" />
                              )}
                            </div>
                            <div>
                              <div
                                className="text-sm font-semibold"
                                style={{ color: widgetConfig.textColor }}
                              >
                                {widgetConfig.botName}
                              </div>
                              <div className="text-xs text-white/50">Live support assistant</div>
                            </div>
                          </div>
                          <div className="dashboard-chip">Preview</div>
                        </div>

                        <div className="space-y-3">
                          <div
                            className="max-w-[86%] rounded-[24px] px-4 py-3 shadow-[var(--shadow-card)]"
                            style={{
                              background: 'rgba(255,255,255,0.08)',
                              color: widgetConfig.textColor,
                              fontSize: widgetConfig.fontSize,
                              borderRadius: widgetConfig.borderRadius,
                            }}
                          >
                            {widgetConfig.welcomeMessage}
                          </div>
                          <div
                            className="ml-auto max-w-[72%] rounded-[24px] px-4 py-3"
                            style={{
                              background: widgetConfig.primaryColor,
                              color: widgetConfig.textColor,
                              fontSize: widgetConfig.fontSize,
                              borderRadius: widgetConfig.borderRadius,
                            }}
                          >
                            Can you help me with pricing and setup?
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      <div className="section-surface flex items-center justify-between p-4">
                        <span className="text-sm text-[var(--text-2)]">Widget key</span>
                        <span className="text-sm font-semibold text-[var(--text-1)]">
                          {widget?.widgetKey || 'Will appear after save'}
                        </span>
                      </div>
                      <div className="section-surface flex items-center justify-between p-4">
                        <span className="text-sm text-[var(--text-2)]">Install status</span>
                        <span className="text-sm font-semibold text-[var(--text-1)]">
                          {embedCode ? 'Ready to install' : 'Needs saved config'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          ) : null}

          {/* ── Embed Code ── */}
          {activeSection === 'embed' ? (
            <div className="ds-section-wrap">
              <div className="ds-page-header-simple">
                <h1 className="ds-page-title">Embed Code</h1>
                <p className="ds-page-subtitle">Install the production script and go live with confidence.</p>
              </div>
              <div className="ds-two-col">
                  <div className="section-surface p-6">
                    <div className="mb-6">
                      <h2 className="mb-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">
                        Production script
                      </h2>
                      <p className="m-0 text-sm leading-6 text-[var(--text-2)]">
                        Install this once on your website to ship the live widget.
                      </p>
                    </div>

                    <pre className="dashboard-code-block">
                      {embedCode ||
                        'Save your widget configuration first to generate the install script.'}
                    </pre>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        disabled={!embedCode}
                        onClick={async () => {
                          if (!embedCode) return;
                          await navigator.clipboard.writeText(embedCode);
                          toast.success('Embed code copied');
                        }}
                      >
                        <Copy className="h-4 w-4" />
                        Copy script
                      </Button>
                      <Button variant="ghost" onClick={() => setActiveSection('widget')}>
                        Go to widget settings
                      </Button>
                    </div>
                  </div>

                  <div className="section-surface p-6">
                    <div className="mb-6">
                      <h2 className="mb-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">
                        Install notes
                      </h2>
                      <p className="m-0 text-sm leading-6 text-[var(--text-2)]">
                        Keep the launch path simple and aligned with the onboarding flow.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {(installSteps.length > 0
                        ? installSteps
                        : [
                            'Save the widget configuration so the script is generated.',
                            'Paste the script before the closing body tag on your website.',
                            'Publish the site and test the floating widget in production.',
                          ]
                      ).map((step) => (
                        <div key={step} className="section-surface flex items-start gap-3 p-4">
                          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-muted)] text-[var(--accent-strong)]">
                            <Check className="h-4 w-4" />
                          </div>
                          <div className="text-sm leading-6 text-[var(--text-1)]">{step}</div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 section-surface p-4">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-3)]">
                        Current status
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="dashboard-chip">
                          {widgetSaved ? 'Widget configured' : 'Widget not saved'}
                        </span>
                        <span className="dashboard-chip">
                          {embedCode ? 'Script available' : 'Script unavailable'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          ) : null}

          {/* ── Chat History ── */}
          {activeSection === 'chat' ? (
            <div className="ds-section-wrap">
              <div className="ds-page-header-simple">
                <h1 className="ds-page-title">Chat History</h1>
                <p className="ds-page-subtitle">Review conversations between the assistant and your visitors.</p>
              </div>
              <div className="ds-two-col">
                <div className="section-surface p-6">
                  <div className="mb-6">
                    <h2 className="mb-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">
                      Recent sessions
                    </h2>
                    <p className="m-0 text-sm leading-6 text-[var(--text-2)]">
                      Open any conversation to inspect how the assistant performed.
                    </p>
                  </div>

                    {chatSessions.length === 0 ? (
                      <div className="dashboard-empty">
                        Conversations will appear here once users start engaging with the widget.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {chatSessions.map((session) => (
                          <button
                            key={session.id}
                            type="button"
                            className="section-surface w-full p-4 text-left"
                            style={{
                              background:
                                selectedChatId === session.id
                                  ? 'linear-gradient(160deg, color-mix(in srgb, var(--accent-muted) 82%, var(--surface-2) 18%) 0%, color-mix(in srgb, var(--surface) 92%, transparent) 100%)'
                                  : undefined,
                            }}
                            onClick={() => void loadChatSession(session.id)}
                          >
                            <div className="mb-2 flex items-center justify-between gap-4">
                              <div className="text-sm font-semibold text-[var(--text-1)]">
                                {session.lastMessagePreview || 'Conversation'}
                              </div>
                              <div className="text-xs text-[var(--text-3)]">
                                {formatDateTime(session.lastMessageAt)}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs text-[var(--text-3)]">
                              <span className="dashboard-chip">
                                {formatNumber(session.messageCount)} messages
                              </span>
                              <span className="dashboard-chip">
                                {(session.status || 'active').toUpperCase()}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="section-surface p-6">
                    <div className="mb-6 flex items-start justify-between gap-4">
                      <div>
                        <h2 className="mb-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">
                          Conversation detail
                        </h2>
                        <p className="m-0 text-sm leading-6 text-[var(--text-2)]">
                          Full transcript for the selected session.
                        </p>
                      </div>
                      {loadingChatId ? <div className="dashboard-chip">Loading...</div> : null}
                    </div>

                    {selectedChatId && chatMessages.length > 0 ? (
                      <div className="space-y-3">
                        {chatMessages.map((message, index) => {
                          const assistant = message.role === 'assistant';
                          return (
                            <div
                              key={`${message.createdAt}-${index}`}
                              className="flex"
                              style={{ justifyContent: assistant ? 'flex-start' : 'flex-end' }}
                            >
                              <div
                                className="max-w-[88%] rounded-[24px] px-4 py-3"
                                style={{
                                  background: assistant
                                    ? 'rgba(255,255,255,0.06)'
                                    : 'var(--accent-muted)',
                                  color: 'var(--text-1)',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                }}
                              >
                                <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-3)]">
                                  {assistant ? 'Assistant' : 'User'}
                                </div>
                                <div className="text-sm leading-6">{message.content}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="dashboard-empty">
                        Select a session to inspect the full conversation transcript.
                      </div>
                    )}
                  </div>
                </div>
            </div>
          ) : null}

          {/* ── Feedback ── */}
          {activeSection === 'feedback' ? (
            <div className="ds-section-wrap">
              <div className="ds-page-header-simple">
                <h1 className="ds-page-title">Feedback</h1>
                <p className="ds-page-subtitle">Customer suggestions and notes collected from the widget.</p>
              </div>
              <div className="space-y-6">
                  <div className="dashboard-grid-three">
                    <div className="section-surface p-5">
                      <div className="mb-2 text-sm text-[var(--text-2)]">Total entries</div>
                      <div className="text-3xl font-bold tracking-[-0.05em] text-[var(--text-1)]">
                        {formatNumber(feedback.length)}
                      </div>
                    </div>
                    <div className="section-surface p-5">
                      <div className="mb-2 text-sm text-[var(--text-2)]">Suggestions</div>
                      <div className="text-3xl font-bold tracking-[-0.05em] text-[var(--text-1)]">
                        {formatNumber(
                          feedback.filter((item) => item.type === 'suggestion').length,
                        )}
                      </div>
                    </div>
                    <div className="section-surface p-5">
                      <div className="mb-2 text-sm text-[var(--text-2)]">Feedback notes</div>
                      <div className="text-3xl font-bold tracking-[-0.05em] text-[var(--text-1)]">
                        {formatNumber(
                          feedback.filter((item) => item.type !== 'suggestion').length,
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {feedback.length === 0 ? (
                      <div className="dashboard-empty">
                        Customer suggestions and feedback notes will appear here once the widget is in use.
                      </div>
                    ) : (
                      feedback.map((item) => (
                        <div key={item.id} className="section-surface p-5">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap gap-2">
                              <span className="dashboard-chip">
                                {(item.type || 'feedback').toUpperCase()}
                              </span>
                              {item.pagePath ? (
                                <span className="dashboard-chip">{item.pagePath}</span>
                              ) : null}
                            </div>
                            <span className="text-xs text-[var(--text-3)]">
                              {formatDateTime(item.createdAt)}
                            </span>
                          </div>
                          {item.title ? (
                            <h2 className="mb-2 text-lg font-bold tracking-[-0.03em] text-[var(--text-1)]">
                              {item.title}
                            </h2>
                          ) : null}
                          <p className="m-0 text-sm leading-7 text-[var(--text-2)]">
                            {item.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
          ) : null}

          {/* ── Customer Intent ── */}
          {activeSection === 'intent' ? (
            <div className="ds-section-wrap">
              <div className="ds-page-header-simple">
                <h1 className="ds-page-title">Customer Intent</h1>
                <p className="ds-page-subtitle">Trends and analytics from widget interactions and visitor behavior.</p>
              </div>
              <div className="ds-metric-grid">
                {[
                  { label: 'Total Events', value: formatNumber(widgetAnalytics.length), desc: 'Tracked widget interactions', icon: Activity },
                  { label: 'Sessions', value: formatNumber(analytics.chatSessions), desc: 'Distinct conversation sessions', icon: MessagesSquare },
                  { label: 'Messages', value: formatNumber(analytics.widgetMessages), desc: 'Total messages exchanged', icon: MessageSquare },
                  { label: 'Unique Visitors', value: formatNumber(analytics.leads), desc: 'Distinct visitor IPs', icon: BookOpenText },
                ].map((card) => (
                  <div key={card.label} className="ds-metric-card">
                    <div className="ds-metric-card-head">
                      <span className="ds-metric-label">{card.label}</span>
                      <div className="ds-metric-icon"><card.icon className="h-4 w-4" /></div>
                    </div>
                    <div className="ds-metric-value">{card.value}</div>
                    <div className="ds-metric-desc">{card.desc}</div>
                  </div>
                ))}
              </div>
              <div className="ds-chart-card">
                <div className="ds-chart-header">
                  <Activity className="h-4 w-4 text-[var(--accent-strong)]" />
                  <h2 className="ds-chart-title">Activity Trend (Last 7 Days)</h2>
                </div>
                <ActivityChart data={chartData} />
              </div>
            </div>
          ) : null}

        </main>
      </div>
    </div>
  );
}
