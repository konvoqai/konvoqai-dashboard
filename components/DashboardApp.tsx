'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api/axios-instance';
import { useLogout, useUser } from '@/lib/auth/auth-hooks';
import {
  Activity,
  AlertCircle,
  BarChart3,
  BookOpenText,
  Bot,
  Check,
  CheckSquare,
  Copy,
  Crown,
  FileText,
  GitBranch,
  Globe2,
  GripVertical,
  Inbox,
  LayoutDashboard,
  Lock,
  LogOut,
  MessageSquare,
  MessagesSquare,
  Monitor,
  Navigation2,
  Palette,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings2,
  Sparkles,
  Star,
  Trash2,
  Upload,
  User,
  Users,
  Webhook,
  X,
  Zap
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

// ─── Section types ──────────────────────────────────────────────────────────

type DashboardSection =
  | 'anl-conversations'
  | 'anl-quality'
  | 'anl-funnel'
  | 'anl-peak'
  | 'anl-questions'
  | 'anl-visitors'
  | 'anl-leads'
  | 'anl-knowledge'
  | 'anl-integration'
  | 'sources'
  | 'widget'
  | 'live'
  | 'escalations'
  | 'chat'
  | 'feedback'
  | 'leads'
  | 'settings'
  | 'persona'
  | 'branding'
  | 'navigation'
  | 'crm'
  | 'inbox'
  | 'flows'
  | 'plan';

// ─── Data interfaces ─────────────────────────────────────────────────────────

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
  homeTitle: string;
  agentLabel: string;
  showHomeScreen: boolean;
  quickLinks: Array<{ label: string; url: string }>;
}

interface WidgetRecord {
  widgetKey?: string;
  name?: string;
  isConfigured?: boolean;
  settings?: Partial<WidgetConfig>;
  allowedDomains?: string[];
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

interface LeadItem {
  id: string;
  email?: string;
  name?: string;
  phone?: string;
  status?: string;
  source?: string;
  createdAt?: string;
  message?: string;
  pipelineStage?: string;
  crmNotes?: string;
  tags?: string[];
}

interface WebhookConfig {
  id?: string;
  url?: string;
  secret?: string;
  events?: string[];
  isActive?: boolean;
  createdAt?: string;
}

interface SessionItem {
  id: string;
  createdAt?: string;
  userAgent?: string;
  current?: boolean;
  lastUsedAt?: string;
}

interface ProfileData {
  fullName?: string;
  company?: string;
  phone?: string;
  country?: string;
  jobTitle?: string;
  industry?: string;
  website?: string;
}

interface PlanLimits {
  scrapedPages?: number;
  documents?: number;
  documentsMB?: number;
  conversations?: number;
  chatHistory?: number;
  leads?: number;
  hideBranding?: boolean;
  hasCRM?: boolean;
  hasFollowUp?: boolean;
  hasHybrid?: boolean;
  hasFlows?: boolean;
  hasPersona?: boolean;
  hasNavigation?: boolean;
  roles?: string[];
}

interface PersonaSettings {
  role?: string;
  botName?: string;
  tone?: string;
  instructions?: string;
  availableRoles?: string[];
}

interface NavItem {
  id?: string;
  label: string;
  url: string;
  icon?: string;
  order?: number;
}

interface BrandingSettings {
  hideBranding?: boolean;
  dashboardLogo?: string;
  dashboardName?: string;
}

interface FollowUpConfig {
  isActive?: boolean;
  delayHours?: number;
  triggerEvent?: string;
  templateSubject?: string;
  templateBody?: string;
}

interface HandoffItem {
  id: string;
  sessionId?: string;
  status?: string;
  claimedBy?: string;
  visitorName?: string;
  visitorEmail?: string;
  triggerReason?: string;
  createdAt?: string;
}

interface HandoffMessage {
  id?: string;
  senderType?: string;
  senderEmail?: string;
  content: string;
  createdAt?: string;
}

interface FlowNode {
  id: string;
  type: 'message' | 'condition' | 'collect' | 'handoff' | 'action';
  content?: string;
}

interface FlowItem {
  id: string;
  name: string;
  isActive?: boolean;
  flowData?: { nodes: FlowNode[]; edges?: unknown[] };
  createdAt?: string;
  updatedAt?: string;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

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
  homeTitle: 'Start a conversation',
  agentLabel: 'AI assistant',
  showHomeScreen: true,
  quickLinks: [],
};

// ─── Section registry ─────────────────────────────────────────────────────────

const sections: Array<{
  id: DashboardSection;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
    { id: 'anl-conversations', label: 'Activity', icon: Activity },
    { id: 'anl-quality', label: 'Response Quality', icon: BarChart3 },
    { id: 'anl-funnel', label: 'Funnel', icon: Zap },
    { id: 'anl-peak', label: 'Peak Hours', icon: Activity },
    { id: 'anl-questions', label: 'Top Questions', icon: Search },
    { id: 'anl-visitors', label: 'Visitors', icon: User },
    { id: 'anl-leads', label: 'Leads & Feedback', icon: Users },
    { id: 'anl-knowledge', label: 'Knowledge & Plan', icon: BookOpenText },
    { id: 'anl-integration', label: 'Integration', icon: Globe2 },
    { id: 'live', label: 'Live Sessions', icon: Monitor },
    { id: 'escalations', label: 'Escalation Log', icon: AlertCircle },
    { id: 'widget', label: 'Craft Console', icon: Settings2 },
    { id: 'persona', label: 'Persona', icon: Bot },
    { id: 'navigation', label: 'Navigation', icon: Navigation2 },
    { id: 'flows', label: 'Flows', icon: GitBranch },
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'sources', label: 'Data Sources', icon: BookOpenText },
    { id: 'chat', label: 'Chat History', icon: MessagesSquare },
    { id: 'leads', label: 'Leads', icon: Users },
    { id: 'crm', label: 'CRM Pipeline', icon: BarChart3 },
    { id: 'inbox', label: 'Inbox', icon: Inbox },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: User },
    { id: 'plan', label: 'Plan & Billing', icon: Crown },
  ];

type AppGroup = 'overview' | 'conversations' | 'knowledge' | 'aiconfig';

const appGroups: Array<{
  id: AppGroup;
  icon: typeof LayoutDashboard;
  label: string;
  sections: DashboardSection[];
}> = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview', sections: ['anl-conversations', 'anl-quality', 'anl-funnel', 'anl-peak', 'anl-questions', 'anl-visitors', 'anl-leads', 'anl-knowledge', 'anl-integration'] },
    { id: 'conversations', icon: MessagesSquare, label: 'Conversations', sections: ['live', 'escalations', 'chat', 'feedback', 'leads', 'crm', 'inbox'] },
    { id: 'knowledge', icon: BookOpenText, label: 'Knowledge', sections: ['sources'] },
    { id: 'aiconfig', icon: Bot, label: 'AI Config', sections: ['widget', 'persona', 'navigation', 'flows', 'branding'] },
  ];

// ─── ActivityChart ────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getErrorMessage(error: unknown, fallback: string) {
  const maybe = error as { response?: { data?: { message?: string }; status?: number } };
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
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Recently';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Recently';
  return parsed.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function getDocumentName(document: DocumentItem) {
  return document.fileName || document.name || 'Document';
}

const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'];

// ─── Main component ───────────────────────────────────────────────────────────

const VALID_SECTIONS: DashboardSection[] = [
  'anl-conversations','anl-quality','anl-funnel','anl-peak','anl-questions','anl-visitors',
  'anl-leads','anl-knowledge','anl-integration',
  'sources','widget','live','escalations','chat','feedback','leads','settings','persona','branding','navigation','crm','inbox','flows','plan'
];

export function DashboardApp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useUser();
  const { logout } = useLogout();

  // Navigation — persist section in URL ?section=xxx
  const initialSection = (() => {
    const s = searchParams.get('section') as DashboardSection | null;
    return s && VALID_SECTIONS.includes(s) ? s : 'anl-conversations';
  })();
  const [activeSection, setActiveSection] = useState<DashboardSection>(initialSection);

  const navigateTo = useCallback((section: DashboardSection) => {
    setActiveSection(section);
    const params = new URLSearchParams(window.location.search);
    params.set('section', section);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router]);

  const [isBooting, setIsBooting] = useState(true);
  const [, setIsRefreshing] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Overview data
  const [usage, setUsage] = useState<UsageRecord>({});
  const [analytics, setAnalytics] = useState<AnalyticsRecord>({});
  const [stats, setStats] = useState<StatsRecord>({});
  const [widgetAnalytics, setWidgetAnalytics] = useState<WidgetAnalyticsItem[]>([]);

  // Sources & Documents
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [url, setUrl] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [isSavingSource, setIsSavingSource] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [deletingSourceUrl, setDeletingSourceUrl] = useState<string | null>(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);

  // Widget
  const [widgetName, setWidgetName] = useState('My Chat Widget');
  const [widget, setWidget] = useState<WidgetRecord | null>(null);
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig>(defaultWidgetConfig);
  const [widgetSaved, setWidgetSaved] = useState(false);
  const [isSavingWidget, setIsSavingWidget] = useState(false);
  const [allowedDomains, setAllowedDomains] = useState('');
  const [isRegeneratingKey, setIsRegeneratingKey] = useState(false);
  const [embedCode, setEmbedCode] = useState('');
  const [brandUrl, setBrandUrl] = useState('');
  const [isFetchingBrand, setIsFetchingBrand] = useState(false);
  const [widgetPreviewReady, setWidgetPreviewReady] = useState(false);
  const widgetPreviewIframeRef = useRef<HTMLIFrameElement | null>(null);

  // Chat
  const [chatSessions, setChatSessions] = useState<ChatSessionSummary[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loadingChatId, setLoadingChatId] = useState<string | null>(null);
  const [chatSearch, setChatSearch] = useState('');
  const [chatStatusFilter, setChatStatusFilter] = useState('all');
  const [chatDateFrom, setChatDateFrom] = useState('');
  const [chatDateTo, setChatDateTo] = useState('');

  // Feedback
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [feedbackTypeFilter, setFeedbackTypeFilter] = useState('all');

  // Leads
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);
  const [webhook, setWebhook] = useState<WebhookConfig | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [leadsTab, setLeadsTab] = useState<'list' | 'webhook' | 'followup' | 'scoring'>('list');
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkContacting, setIsBulkContacting] = useState(false);

  // Settings
  const [profile, setProfile] = useState<ProfileData>({});
  const [profileForm, setProfileForm] = useState<ProfileData>({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [activeSessions, setActiveSessions] = useState<SessionItem[]>([]);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);

  // Plan limits
  const [planLimits, setPlanLimits] = useState<PlanLimits>({});

  // Persona
  const [persona, setPersona] = useState<PersonaSettings>({});
  const [personaForm, setPersonaForm] = useState<PersonaSettings>({});
  const [isSavingPersona, setIsSavingPersona] = useState(false);

  // Navigation
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [navForm, setNavForm] = useState<NavItem>({ label: '', url: '', icon: '' });
  const [isSavingNav, setIsSavingNav] = useState(false);

  // Branding
  const [branding, setBranding] = useState<BrandingSettings>({});
  const [brandingForm, setBrandingForm] = useState<BrandingSettings>({});
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  // CRM
  const [activeCrmLead, setActiveCrmLead] = useState<LeadItem | null>(null);

  // Follow-up
  const [followUp, setFollowUp] = useState<FollowUpConfig>({});
  const [followUpForm, setFollowUpForm] = useState<FollowUpConfig>({});
  const [isSavingFollowUp, setIsSavingFollowUp] = useState(false);

  // Inbox
  const [handoffs, setHandoffs] = useState<HandoffItem[]>([]);
  const [activeHandoff, setActiveHandoff] = useState<HandoffItem | null>(null);
  const [handoffMessages, setHandoffMessages] = useState<HandoffMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [inboxStatusFilter, setInboxStatusFilter] = useState('pending');

  // Flows
  const [flows, setFlows] = useState<FlowItem[]>([]);
  const [activeFlow, setActiveFlow] = useState<FlowItem | null>(null);
  const [isCreatingFlow, setIsCreatingFlow] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');

  // ─── Widget hydration ──────────────────────────────────────────────────────

  const hydrateWidget = (widgetRecord: WidgetRecord | null | undefined) => {
    const settings = widgetRecord?.settings || {};
    setWidget(widgetRecord || null);
    setWidgetName(widgetRecord?.name || 'My Chat Widget');
    setWidgetConfig({
      ...defaultWidgetConfig,
      ...settings,
      borderRadius: typeof settings.borderRadius === 'number' ? settings.borderRadius : defaultWidgetConfig.borderRadius,
      fontSize: typeof settings.fontSize === 'number' ? settings.fontSize : defaultWidgetConfig.fontSize,
      logoUrl: typeof settings.logoUrl === 'string' ? settings.logoUrl : defaultWidgetConfig.logoUrl,
    });
    setAllowedDomains((widgetRecord?.allowedDomains || []).join('\n'));
    setWidgetSaved(Boolean(widgetRecord?.isConfigured));
  };

  // ─── Load chat session ─────────────────────────────────────────────────────

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

  // ─── Load dashboard data ───────────────────────────────────────────────────

  const loadDashboardData = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') setIsRefreshing(true);
      try {
        const onboardingRes = await apiClient.get('/onboarding/status');
        if (onboardingRes.data?.shouldOnboard) {
          router.replace('/dashboard/setup');
          return;
        }

        const [usageRes, overviewRes, sourcesRes, documentsRes, widgetRes, chatRes, feedbackRes, leadsRes, embedRes] =
          await Promise.all([
            apiClient.get('/dashboard/usage'),
            apiClient.get('/dashboard/overview'),
            apiClient.get('/dashboard/sources'),
            apiClient.get('/dashboard/documents'),
            apiClient.get('/dashboard/widget').catch(() => ({ data: { widget: null } })),
            apiClient.get('/dashboard/chat-sessions'),
            apiClient.get('/dashboard/feedback'),
            apiClient.get('/dashboard/leads').catch(() => ({ data: { leads: [] } })),
            apiClient.get('/dashboard/embed').catch(() => ({ data: { script: '' } })),
          ]);

        setUsage(usageRes.data?.usage || {});
        setPlanLimits(usageRes.data?.planLimits || {});
        setAnalytics(overviewRes.data?.analytics || {});
        setStats(overviewRes.data?.stats || usageRes.data?.stats || {});
        setWidgetAnalytics(overviewRes.data?.widgetAnalytics || []);
        setSources(sourcesRes.data?.sources || []);
        setDocuments(documentsRes.data?.documents || []);
        hydrateWidget(widgetRes.data?.widget || null);
        setEmbedCode(embedRes.data?.script || '');
        setChatSessions(chatRes.data?.sessions || []);
        setFeedback(feedbackRes.data?.feedback || []);
        setLeads(leadsRes.data?.leads || []);
      } catch (error: unknown) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 401) { router.replace('/login'); return; }
        toast.error(getErrorMessage(error, 'Failed to load dashboard'));
      } finally {
        setIsBooting(false);
        setIsRefreshing(false);
      }
    },
    [router],
  );

  // ─── Load settings data ────────────────────────────────────────────────────

  const loadSettingsData = useCallback(async () => {
    try {
      const [profileRes, sessionsRes] = await Promise.all([
        apiClient.get('/dashboard/profile').catch(() => ({ data: {} })),
        apiClient.get('/dashboard/sessions').catch(() => ({ data: { sessions: [] } })),
      ]);
      const p = profileRes.data?.profile || profileRes.data?.user || {};
      const profileData: ProfileData = {
        fullName: p.fullName || p.full_name || '',
        company: p.company || '',
        phone: p.phone || '',
        country: p.country || '',
        jobTitle: p.jobTitle || p.job_title || '',
        industry: p.industry || '',
        website: p.website || '',
      };
      setProfile(profileData);
      setProfileForm(profileData);
      setActiveSessions(sessionsRes.data?.sessions || []);
    } catch {
      // silent
    }
  }, []);

  // ─── Load webhook ──────────────────────────────────────────────────────────

  const loadWebhook = useCallback(async () => {
    try {
      const res = await apiClient.get('/dashboard/leads/webhook');
      const wh = res.data?.webhook || null;
      setWebhook(wh);
      setWebhookUrl(wh?.url || '');
    } catch {
      // silent
    }
  }, []);

  // ─── Load persona ─────────────────────────────────────────────────────────

  const loadPersona = useCallback(async () => {
    try {
      const res = await apiClient.get('/dashboard/persona');
      const p = res.data?.persona || res.data || {};
      setPersona(p);
      setPersonaForm(p);
    } catch { /* silent */ }
  }, []);

  // ─── Load navigation ──────────────────────────────────────────────────────

  const loadNavigation = useCallback(async () => {
    try {
      const res = await apiClient.get('/dashboard/navigation');
      setNavItems(res.data?.items || res.data?.navigation || []);
    } catch { /* silent */ }
  }, []);

  // ─── Load branding ────────────────────────────────────────────────────────

  const loadBranding = useCallback(async () => {
    try {
      const res = await apiClient.get('/dashboard/branding');
      const b = res.data?.branding || res.data || {};
      setBranding(b);
      setBrandingForm(b);
    } catch { /* silent */ }
  }, []);

  // ─── Load follow-up ───────────────────────────────────────────────────────

  const loadFollowUp = useCallback(async () => {
    try {
      const res = await apiClient.get('/dashboard/leads/follow-up');
      const c = res.data?.config || res.data || {};
      setFollowUp(c);
      setFollowUpForm(c);
    } catch { /* silent */ }
  }, []);

  // ─── Load inbox ───────────────────────────────────────────────────────────

  const loadInbox = useCallback(async (status?: string) => {
    try {
      const params = status && status !== 'all' ? { status } : {};
      const res = await apiClient.get('/dashboard/inbox', { params });
      setHandoffs(res.data?.handoffs || res.data?.items || []);
    } catch { /* silent */ }
  }, []);

  // ─── Load handoff messages ────────────────────────────────────────────────

  const loadHandoffMessages = useCallback(async (id: string) => {
    try {
      const res = await apiClient.get(`/dashboard/inbox/${id}/messages`);
      setHandoffMessages(res.data?.messages || []);
    } catch { /* silent */ }
  }, []);

  // ─── Load flows ───────────────────────────────────────────────────────────

  const loadFlows = useCallback(async () => {
    try {
      const res = await apiClient.get('/dashboard/flows');
      setFlows(res.data?.flows || []);
    } catch { /* silent */ }
  }, []);

  // ─── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    void loadDashboardData();
  }, [isLoading, user, router, loadDashboardData]);

  useEffect(() => {
    if (chatSessions.length === 0) { setSelectedChatId(null); setChatMessages([]); return; }
    if (selectedChatId && chatSessions.some((s) => s.id === selectedChatId)) return;
    void loadChatSession(chatSessions[0].id);
  }, [chatSessions, selectedChatId, loadChatSession]);

  useEffect(() => {
    if (activeSection === 'settings') void loadSettingsData();
    if (activeSection === 'leads') void loadWebhook();
    if (activeSection === 'persona') void loadPersona();
    if (activeSection === 'navigation') void loadNavigation();
    if (activeSection === 'branding') void loadBranding();
    if (activeSection === 'inbox' || activeSection === 'escalations') void loadInbox('all');
    if (activeSection === 'flows') void loadFlows();
    if (activeSection === 'leads') void loadFollowUp();
  }, [activeSection, loadSettingsData, loadWebhook, loadPersona, loadNavigation, loadBranding, loadInbox, inboxStatusFilter, loadFlows, loadFollowUp]);

  // ─── Live sessions auto-refresh ────────────────────────────────────────────

  useEffect(() => {
    if (activeSection !== 'live') return;
    const interval = setInterval(() => {
      void apiClient.get('/dashboard/chat-sessions').then((res) => {
        setChatSessions(res.data?.sessions || []);
      }).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [activeSection]);

  // ─── Handlers: auth ────────────────────────────────────────────────────────

  const handleLogout = async () => {
    try { await logout(); router.push('/login'); }
    catch (error: unknown) { toast.error(getErrorMessage(error, 'Logout failed')); }
  };

  // ─── Handlers: sources ────────────────────────────────────────────────────

  const handleAddSource = async (event: FormEvent) => {
    event.preventDefault();
    if (!url.trim()) { toast.error('Enter a URL first'); return; }
    setIsSavingSource(true);
    try {
      await apiClient.post('/dashboard/sources', { url: url.trim() });
      setUrl('');
      toast.success('Source added');
      await loadDashboardData('refresh');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to add source'));
    } finally { setIsSavingSource(false); }
  };

  const handleDeleteSource = async (sourceUrl: string) => {
    setDeletingSourceUrl(sourceUrl);
    try {
      await apiClient.delete('/dashboard/sources', { params: { url: sourceUrl } });
      toast.success('Source removed');
      await loadDashboardData('refresh');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to remove source'));
    } finally { setDeletingSourceUrl(null); }
  };

  // ─── Handlers: documents ──────────────────────────────────────────────────

  const handleUploadDocument = async (event: FormEvent) => {
    event.preventDefault();
    if (!documentFile) { toast.error('Select a document first'); return; }
    setIsUploadingDocument(true);
    try {
      const formData = new FormData();
      formData.append('document', documentFile);
      await apiClient.post('/dashboard/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setDocumentFile(null);
      toast.success('Document uploaded');
      await loadDashboardData('refresh');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Document upload failed'));
    } finally { setIsUploadingDocument(false); }
  };

  const handleDeleteDocument = async (documentId: string) => {
    setDeletingDocumentId(documentId);
    try {
      await apiClient.delete(`/dashboard/documents/${documentId}`);
      toast.success('Document removed');
      await loadDashboardData('refresh');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to remove document'));
    } finally { setDeletingDocumentId(null); }
  };

  // ─── Handlers: widget ─────────────────────────────────────────────────────

  const updateWidgetConfig = (updates: Partial<WidgetConfig>) => {
    setWidgetSaved(false);
    setWidgetConfig((current) => ({ ...current, ...updates }));
  };

  const postWidgetConfig = useCallback((config = widgetConfig) => {
    const target = widgetPreviewIframeRef.current?.contentWindow;
    if (!target) return;
    target.postMessage({ type: 'konvoq:widget-config', config }, '*');
  }, [widgetConfig]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'konvoq:preview-ready') {
        setWidgetPreviewReady(true);
        postWidgetConfig();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [postWidgetConfig]);

  useEffect(() => {
    if (!widgetPreviewReady) return;
    postWidgetConfig();
  }, [widgetConfig, widgetPreviewReady, postWidgetConfig]);

  const handleSaveWidget = async () => {
    setIsSavingWidget(true);
    try {
      const domains = allowedDomains.split('\n').map(d => d.trim()).filter(Boolean);
      await apiClient.put('/dashboard/widget', { name: widgetName, settings: widgetConfig, allowedDomains: domains });
      const [widgetRes, embedRes] = await Promise.all([
        apiClient.get('/dashboard/widget'),
        apiClient.get('/dashboard/embed').catch(() => ({ data: { script: '' } })),
      ]);
      hydrateWidget(widgetRes.data?.widget || null);
      setEmbedCode(embedRes.data?.script || '');
      toast.success('Widget saved');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to save widget'));
    } finally { setIsSavingWidget(false); }
  };

  const handleRegenerateKey = async () => {
    if (!confirm('Regenerate the widget key? Your existing embed scripts will stop working until you update them.')) return;
    setIsRegeneratingKey(true);
    try {
      await apiClient.post('/dashboard/widget/regenerate');
      const [widgetRes, embedRes] = await Promise.all([
        apiClient.get('/dashboard/widget'),
        apiClient.get('/dashboard/embed').catch(() => ({ data: { script: '' } })),
      ]);
      hydrateWidget(widgetRes.data?.widget || null);
      setEmbedCode(embedRes.data?.script || '');
      toast.success('Widget key regenerated — update your embed scripts');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to regenerate key'));
    } finally { setIsRegeneratingKey(false); }
  };

  const handleBrandAutoFill = async () => {
    if (!brandUrl.trim()) { toast.error('Enter your website URL first'); return; }
    setIsFetchingBrand(true);
    try {
      const res = await apiClient.get(`/dashboard/brand-extract?url=${encodeURIComponent(brandUrl.trim())}`);
      const brand = res.data?.brand;
      if (brand) {
        const updates: Partial<WidgetConfig> = {};
        if (brand.primaryColor) updates.primaryColor = brand.primaryColor;
        if (brand.backgroundColor) updates.backgroundColor = brand.backgroundColor;
        if (brand.textColor) updates.textColor = brand.textColor;
        if (brand.name) updates.botName = brand.name + ' Assistant';
        updateWidgetConfig(updates);
        toast.success('Brand colors applied — review and save');
      } else {
        toast.error('Could not extract brand info from that URL');
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Brand extraction failed'));
    } finally { setIsFetchingBrand(false); }
  };

  // ─── Handlers: leads ──────────────────────────────────────────────────────

  const handleUpdateLeadStatus = async (id: string, status: string) => {
    setUpdatingLeadId(id);
    try {
      await apiClient.patch(`/dashboard/leads/${id}`, { status });
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
      toast.success('Lead status updated');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to update lead'));
    } finally { setUpdatingLeadId(null); }
  };

  const handleDeleteLead = async (id: string) => {
    setDeletingLeadId(id);
    try {
      await apiClient.delete(`/dashboard/leads/${id}`);
      setLeads((prev) => prev.filter((l) => l.id !== id));
      toast.success('Lead deleted');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to delete lead'));
    } finally { setDeletingLeadId(null); }
  };

  const handleExportCSV = () => {
    const selected = leads.filter((l) => selectedLeadIds.has(l.id));
    if (selected.length === 0) { toast.error('Select at least one lead'); return; }
    const rows = [['Name', 'Email', 'Phone', 'Status', 'Source', 'Message', 'Created']];
    selected.forEach((l) => rows.push([l.name || '', l.email || '', l.phone || '', l.status || 'new', l.source || '', l.message || '', formatDateTime(l.createdAt)]));
    const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${selected.length} lead(s)`);
  };

  const handleBulkMarkContacted = async () => {
    if (selectedLeadIds.size === 0) return;
    setIsBulkContacting(true);
    const count = selectedLeadIds.size;
    try {
      await Promise.all(Array.from(selectedLeadIds).map((id) => apiClient.patch(`/dashboard/leads/${id}`, { status: 'contacted' })));
      setLeads((prev) => prev.map((l) => selectedLeadIds.has(l.id) ? { ...l, status: 'contacted' } : l));
      setSelectedLeadIds(new Set());
      toast.success(`${count} lead(s) marked as contacted`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Bulk update failed'));
    } finally { setIsBulkContacting(false); }
  };

  const handleBulkDelete = async () => {
    if (selectedLeadIds.size === 0) return;
    if (!confirm(`Delete ${selectedLeadIds.size} lead(s)? This cannot be undone.`)) return;
    setIsBulkDeleting(true);
    const count = selectedLeadIds.size;
    try {
      await Promise.all(Array.from(selectedLeadIds).map((id) => apiClient.delete(`/dashboard/leads/${id}`)));
      setLeads((prev) => prev.filter((l) => !selectedLeadIds.has(l.id)));
      setSelectedLeadIds(new Set());
      toast.success(`${count} lead(s) deleted`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Bulk delete failed'));
    } finally { setIsBulkDeleting(false); }
  };

  const handleSaveWebhook = async () => {
    if (!webhookUrl.trim()) { toast.error('Enter a webhook URL'); return; }
    setIsSavingWebhook(true);
    try {
      const res = await apiClient.post('/dashboard/leads/webhook', { url: webhookUrl.trim(), events: ['lead.created'] });
      setWebhook(res.data?.webhook || { url: webhookUrl });
      toast.success('Webhook saved');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to save webhook'));
    } finally { setIsSavingWebhook(false); }
  };

  const handleTestWebhook = async () => {
    if (!webhook?.url) { toast.error('Save a webhook URL first'); return; }
    setIsTestingWebhook(true);
    try {
      await apiClient.post('/dashboard/leads/webhook/test');
      toast.success('Test event sent');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to send test'));
    } finally { setIsTestingWebhook(false); }
  };

  // ─── Handlers: settings ───────────────────────────────────────────────────

  const handleSaveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setIsSavingProfile(true);
    try {
      await apiClient.post('/dashboard/profile', {
        full_name: profileForm.fullName,
        company: profileForm.company,
        phone: profileForm.phone,
        country: profileForm.country,
        job_title: profileForm.jobTitle,
        industry: profileForm.industry,
        website: profileForm.website,
      });
      setProfile(profileForm);
      toast.success('Profile saved');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to save profile'));
    } finally { setIsSavingProfile(false); }
  };

  const handleRevokeSession = async (id: string) => {
    setRevokingSessionId(id);
    try {
      await apiClient.delete(`/dashboard/sessions/${id}`);
      setActiveSessions((prev) => prev.filter((s) => s.id !== id));
      toast.success('Session revoked');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to revoke session'));
    } finally { setRevokingSessionId(null); }
  };

  // ─── Handlers: persona ────────────────────────────────────────────────────

  const handleSavePersona = async () => {
    setIsSavingPersona(true);
    try {
      await apiClient.put('/dashboard/persona', personaForm);
      setPersona(personaForm);
      toast.success('Persona saved');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to save persona'));
    } finally { setIsSavingPersona(false); }
  };

  // ─── Handlers: navigation ─────────────────────────────────────────────────

  const handleAddNavItem = async () => {
    if (!navForm.label.trim() || !navForm.url.trim()) { toast.error('Label and URL are required'); return; }
    setIsSavingNav(true);
    try {
      const updated = [...navItems, { ...navForm, id: Date.now().toString(), order: navItems.length }];
      await apiClient.put('/dashboard/navigation', { items: updated });
      setNavItems(updated);
      setNavForm({ label: '', url: '', icon: '' });
      toast.success('Navigation item added');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to save navigation'));
    } finally { setIsSavingNav(false); }
  };

  const handleRemoveNavItem = async (index: number) => {
    const updated = navItems.filter((_, i) => i !== index);
    try {
      await apiClient.put('/dashboard/navigation', { items: updated });
      setNavItems(updated);
      toast.success('Item removed');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to remove item'));
    }
  };

  // ─── Handlers: branding ───────────────────────────────────────────────────

  const handleSaveBranding = async () => {
    setIsSavingBranding(true);
    try {
      await apiClient.put('/dashboard/branding', brandingForm);
      setBranding(brandingForm);
      toast.success('Branding saved');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to save branding'));
    } finally { setIsSavingBranding(false); }
  };

  // ─── Handlers: follow-up ──────────────────────────────────────────────────

  const handleSaveFollowUp = async () => {
    setIsSavingFollowUp(true);
    try {
      await apiClient.put('/dashboard/leads/follow-up', followUpForm);
      setFollowUp(followUpForm);
      toast.success('Follow-up config saved');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to save follow-up config'));
    } finally { setIsSavingFollowUp(false); }
  };

  // ─── Handlers: inbox ──────────────────────────────────────────────────────

  const handleClaimHandoff = async (id: string) => {
    try {
      await apiClient.post(`/dashboard/inbox/${id}/claim`);
      setHandoffs((prev) => prev.map((h) => h.id === id ? { ...h, status: 'claimed' } : h));
      toast.success('Handoff claimed');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to claim handoff'));
    }
  };

  const handleResolveHandoff = async (id: string) => {
    try {
      await apiClient.post(`/dashboard/inbox/${id}/resolve`);
      setHandoffs((prev) => prev.map((h) => h.id === id ? { ...h, status: 'resolved' } : h));
      if (activeHandoff?.id === id) setActiveHandoff(null);
      toast.success('Resolved');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to resolve'));
    }
  };

  const handleSendReply = async () => {
    if (!activeHandoff || !replyText.trim()) return;
    setIsSendingReply(true);
    try {
      await apiClient.post(`/dashboard/inbox/${activeHandoff.id}/messages`, { content: replyText.trim() });
      setHandoffMessages((prev) => [...prev, { senderType: 'agent', content: replyText.trim(), createdAt: new Date().toISOString() }]);
      setReplyText('');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to send reply'));
    } finally { setIsSendingReply(false); }
  };

  // ─── Handlers: flows ──────────────────────────────────────────────────────

  const handleCreateFlow = async () => {
    if (!newFlowName.trim()) { toast.error('Enter a flow name'); return; }
    setIsCreatingFlow(true);
    try {
      const res = await apiClient.post('/dashboard/flows', { name: newFlowName.trim(), flowData: { nodes: [], edges: [] } });
      const newFlow: FlowItem = res.data?.flow || { id: Date.now().toString(), name: newFlowName.trim(), isActive: false, flowData: { nodes: [] } };
      setFlows((prev) => [...prev, newFlow]);
      setActiveFlow(newFlow);
      setNewFlowName('');
      toast.success('Flow created');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to create flow'));
    } finally { setIsCreatingFlow(false); }
  };

  const handleDeleteFlow = async (id: string) => {
    try {
      await apiClient.delete(`/dashboard/flows/${id}`);
      setFlows((prev) => prev.filter((f) => f.id !== id));
      if (activeFlow?.id === id) setActiveFlow(null);
      toast.success('Flow deleted');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to delete flow'));
    }
  };

  const handleToggleFlowActive = async (flow: FlowItem) => {
    try {
      const updated = { ...flow, isActive: !flow.isActive };
      await apiClient.put(`/dashboard/flows/${flow.id}`, updated);
      setFlows((prev) => prev.map((f) => f.id === flow.id ? updated : f));
      if (activeFlow?.id === flow.id) setActiveFlow(updated);
      toast.success(flow.isActive ? 'Flow deactivated' : 'Flow activated');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to update flow'));
    }
  };

  const handleAddFlowNode = async (type: FlowNode['type']) => {
    if (!activeFlow) return;
    const newNode: FlowNode = { id: Date.now().toString(), type, content: '' };
    const updatedFlow = { ...activeFlow, flowData: { ...activeFlow.flowData, nodes: [...(activeFlow.flowData?.nodes || []), newNode] } };
    setActiveFlow(updatedFlow);
    setFlows((prev) => prev.map((f) => f.id === activeFlow.id ? updatedFlow : f));
  };

  const handleUpdateFlowNodeContent = (nodeId: string, content: string) => {
    if (!activeFlow) return;
    const updatedFlow = { ...activeFlow, flowData: { ...activeFlow.flowData, nodes: (activeFlow.flowData?.nodes || []).map((n) => n.id === nodeId ? { ...n, content } : n) } };
    setActiveFlow(updatedFlow);
    setFlows((prev) => prev.map((f) => f.id === activeFlow.id ? updatedFlow : f));
  };

  const handleRemoveFlowNode = (nodeId: string) => {
    if (!activeFlow) return;
    const updatedFlow = { ...activeFlow, flowData: { ...activeFlow.flowData, nodes: (activeFlow.flowData?.nodes || []).filter((n) => n.id !== nodeId) } };
    setActiveFlow(updatedFlow);
    setFlows((prev) => prev.map((f) => f.id === activeFlow.id ? updatedFlow : f));
  };

  const handleSaveFlow = async () => {
    if (!activeFlow) return;
    try {
      await apiClient.put(`/dashboard/flows/${activeFlow.id}`, activeFlow);
      toast.success('Flow saved');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to save flow'));
    }
  };

  // ─── Derived values ────────────────────────────────────────────────────────

  const usageLimit = usage.conversationsLimit;
  const usageRemaining = usage.conversationsRemaining;
  const usagePercent =
    usageLimit && usageLimit > 0
      ? Math.min(100, Math.round(((usage.conversationsUsed ?? 0) / usageLimit) * 100))
      : 0;
  const usageBarColor =
    usagePercent >= 90 ? '#ef4444' : usagePercent >= 70 ? '#f59e0b' : 'var(--accent-strong)';

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

  // ── Conversation quality metrics ─────────────────────────────────────────
  const totalSessionsCount = chatSessions.length;
  const completedSessionsCount = chatSessions.filter((s) => s.status === 'completed').length;
  const resolutionRate = totalSessionsCount > 0 ? Math.round((completedSessionsCount / totalSessionsCount) * 100) : 0;
  const totalMsgs = chatSessions.reduce((a, s) => a + (s.messageCount || 0), 0);
  const avgMsgsPerSession = totalSessionsCount > 0 ? Math.round(totalMsgs / totalSessionsCount) : 0;
  const unansweredCount = chatSessions.filter((s) => (s.messageCount || 0) <= 1).length;
  const unansweredRate = totalSessionsCount > 0 ? Math.round((unansweredCount / totalSessionsCount) * 100) : 0;

  // ── Conversation funnel ───────────────────────────────────────────────────
  const funnelStarted = analytics.chatSessions ?? totalSessionsCount;
  const funnelCompleted = completedSessionsCount;
  const funnelLeads = leads.length || analytics.leads || 0;
  const funnelMaxVal = Math.max(1, funnelStarted);

  // ── Peak hours heatmap ────────────────────────────────────────────────────
  const eventsByHour = widgetAnalytics.reduce((acc, item) => {
    if (item.createdAt) {
      const h = new Date(item.createdAt).getHours();
      acc[h] = (acc[h] || 0) + 1;
    }
    return acc;
  }, {} as Record<number, number>);
  const maxHourCount = Math.max(1, ...Array.from({ length: 24 }, (_, i) => eventsByHour[i] || 0));
  const peakHour = Array.from({ length: 24 }, (_, i) => i).reduce(
    (max, h) => (eventsByHour[h] || 0) > (eventsByHour[max] || 0) ? h : max, 0
  );
  const fmtHour = (h: number) => {
    if (h === 0) return '12a';
    if (h < 12) return `${h}a`;
    if (h === 12) return '12p';
    return `${h - 12}p`;
  };

  // ── Top questions ─────────────────────────────────────────────────────────
  const topQuestions = Array.from(
    new Map(
      chatSessions
        .filter((s) => s.lastMessagePreview && s.lastMessagePreview.trim().length > 4)
        .map((s) => [s.lastMessagePreview!.trim().toLowerCase().slice(0, 60), s.lastMessagePreview!.trim()])
    ).values()
  ).slice(0, 6);

  // ── New vs returning visitors ─────────────────────────────────────────────
  const returningVisitors = chatSessions.filter((s) => (s.messageCount || 0) > 4).length;
  const newVisitors = Math.max(0, totalSessionsCount - returningVisitors);
  const newPct = totalSessionsCount > 0 ? Math.round((newVisitors / totalSessionsCount) * 100) : 0;
  const returningPct = totalSessionsCount > 0 ? Math.round((returningVisitors / totalSessionsCount) * 100) : 0;

  const planType = (usage.planType || user?.plan_type || 'free').toString();
  const workspaceName = user?.fullName || user?.email?.split('@')[0] || 'Workspace';
  const userInitial = (user?.fullName || user?.email || 'U')[0].toUpperCase();
  const activeGroup = appGroups.find((g) => g.sections.includes(activeSection))?.id ?? 'overview';

  // Filtered chat sessions
  const filteredChatSessions = chatSessions.filter((s) => {
    const matchSearch = !chatSearch || (s.lastMessagePreview || '').toLowerCase().includes(chatSearch.toLowerCase());
    const matchStatus = chatStatusFilter === 'all' || (s.status || 'active') === chatStatusFilter;
    const matchFrom = !chatDateFrom || (s.createdAt && s.createdAt >= chatDateFrom);
    const matchTo = !chatDateTo || (s.createdAt && s.createdAt <= chatDateTo + 'T23:59:59');
    return matchSearch && matchStatus && matchFrom && matchTo;
  });

  // Active / live sessions
  const activeSessions2 = chatSessions.filter((s) => (s.status || 'active') === 'active');

  // Lead scoring
  const scoredLeads = leads.map((lead) => {
    let score = 20;
    if (lead.email) score += 20;
    if (lead.name) score += 10;
    if (lead.phone) score += 15;
    const st = lead.status || 'new';
    if (st === 'qualified') score += 20;
    else if (st === 'converted') score += 25;
    else if (st === 'contacted') score += 10;
    if (lead.message && lead.message.length > 20) score += 10;
    if (lead.createdAt) {
      const daysSince = (Date.now() - new Date(lead.createdAt).getTime()) / 86400000;
      if (daysSince < 1) score += 15;
      else if (daysSince < 7) score += 8;
      else if (daysSince < 30) score += 3;
    }
    return { ...lead, score: Math.min(100, score) };
  }).sort((a, b) => b.score - a.score);

  // Filtered feedback
  const filteredFeedback = feedback.filter((f) =>
    feedbackTypeFilter === 'all' || f.type === feedbackTypeFilter,
  );

  // ─── Loading state ─────────────────────────────────────────────────────────

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

  if (!user) return null;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="ds-root">

      {/* ── Topbar ── */}
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
        <div className="ds-topbar-center">
          <div className="ds-search">
            <Search className="h-3.5 w-3.5" />
            <input type="text" placeholder="Search" className="ds-search-input" readOnly />
            <kbd className="ds-search-kbd">⌘K</kbd>
          </div>
        </div>
        <div className="ds-topbar-right" style={{ position: 'relative' }}>
          <button
            type="button"
            className="ds-user-avatar"
            title={user.email}
            onClick={() => setShowUserMenu((v) => !v)}
          >
            {userInitial}
          </button>
          {showUserMenu && (
            <>
              <div className="ds-user-menu-backdrop" onClick={() => setShowUserMenu(false)} />
              <div className="ds-user-menu">
                <div className="ds-user-menu-info">
                  <span className="ds-user-menu-email">{user.email}</span>
                </div>
                <button type="button" className="ds-user-menu-item" onClick={() => { navigateTo('settings'); setShowUserMenu(false); }}>
                  <User className="h-3.5 w-3.5" />
                  Profile &amp; Settings
                </button>
                <button type="button" className="ds-user-menu-logout" onClick={handleLogout}>
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="ds-body">

        {/* Icon rail */}
        <nav className="ds-icon-rail">
          <div className="ds-rail-items">
            {appGroups.map((group) => {
              const Icon = group.icon;
              return (
                <button
                  key={group.id}
                  type="button"
                  className="ds-rail-item"
                  data-active={activeGroup === group.id && activeSection !== 'settings'}
                  title={group.label}
                  onClick={() => {
                    if (activeGroup !== group.id || activeSection === 'settings') navigateTo(group.sections[0]);
                  }}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </button>
              );
            })}
          </div>
          <div className="ds-rail-bottom">
            <button
              type="button"
              className="ds-rail-item"
              data-active={activeSection === 'plan'}
              title="Plan & Billing"
              onClick={() => navigateTo('plan')}
            >
              <Crown className="h-[18px] w-[18px]" />
            </button>
            <button
              type="button"
              className="ds-rail-item"
              data-active={activeSection === 'settings'}
              title="Settings"
              onClick={() => navigateTo('settings')}
            >
              <Settings2 className="h-[18px] w-[18px]" />
            </button>
          </div>
        </nav>

        {/* Nav sidebar */}
        <aside className="ds-nav-sidebar">
          <div className="ds-nav-sidebar-header">
            {activeSection === 'settings'
              ? 'Settings'
              : appGroups.find((g) => g.id === activeGroup)?.label}
          </div>
          <nav className="ds-nav-sidebar-nav">
            {activeSection === 'settings' ? (
              <button type="button" className="ds-nav-sidebar-item" data-active="true">
                <User className="h-3.5 w-3.5" />
                <span>Profile &amp; Sessions</span>
              </button>
            ) : (
              appGroups.find((g) => g.id === activeGroup)?.sections.map((sectionId) => {
                const section = sections.find((s) => s.id === sectionId)!;
                const Icon = section.icon;
                const count =
                  sectionId === 'chat' ? chatSessions.length
                    : sectionId === 'feedback' ? feedback.length
                      : sectionId === 'leads' ? leads.length
                        : sectionId === 'sources' ? sources.length
                          : sectionId === 'crm' ? leads.length || null
                            : sectionId === 'inbox' ? (handoffs.filter(h => h.status === 'pending').length || null)
                              : sectionId === 'flows' ? (flows.length || null)
                                : null;
                return (
                  <button
                    key={sectionId}
                    type="button"
                    className="ds-nav-sidebar-item"
                    data-active={activeSection === sectionId}
                    onClick={() => navigateTo(sectionId)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{section.label}</span>
                    {count !== null && <span className="ds-nav-count">{count}</span>}
                  </button>
                );
              })
            )}
          </nav>

          {/* Usage meter */}
          <div className="ds-sidebar-footer">
            <div className="ds-usage-meter">
              <div className="ds-usage-header">
                <span className="ds-usage-title">Conversations</span>
                <button type="button" className="ds-upgrade-btn">Upgrade</button>
              </div>
              <div className="ds-usage-count">
                {formatNumber(usage.conversationsUsed ?? 0)} /{' '}
                {usageLimit === null || usageLimit === undefined ? '∞' : formatNumber(usageLimit)}
              </div>
              {usageLimit && usageLimit > 0 ? (
                <div className="ds-usage-bar-track">
                  <div
                    className="ds-usage-bar-fill"
                    style={{ width: `${usagePercent}%`, background: usageBarColor }}
                  />
                </div>
              ) : null}
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

          {/* ── Activity Overview ── */}
          {activeSection === 'anl-conversations' ? (
            <div className="ds-section-wrap">
              <div className="ds-page-header-simple">
                <h1 className="ds-page-title">Activity</h1>
                <p className="ds-page-subtitle">Messaging volume and engagement over time.</p>
              </div>
              <div className="ds-metric-grid">
                {[
                  { label: 'Total Messages', value: formatNumber(analytics.widgetMessages), desc: 'Messages exchanged via widget', icon: MessageSquare },
                  { label: 'Chat Sessions', value: formatNumber(analytics.chatSessions), desc: 'Unique conversation sessions', icon: MessagesSquare },
                  { label: 'Widget Views', value: formatNumber(analytics.widgetViews), desc: 'Widget load events', icon: Monitor },
                  { label: 'Active Days (7d)', value: formatNumber(activeDays7d), desc: 'Days with activity this week', icon: Activity },
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
                  <h2 className="ds-chart-title">7-Day Activity</h2>
                </div>
                <ActivityChart data={chartData} />
              </div>
            </div>
          ) : null}

          {/* ── Response Quality ── */}
          {activeSection === 'anl-quality' ? (
            <div className="ds-section-wrap">
              <div className="ds-page-header-simple">
                <h1 className="ds-page-title">Response Quality</h1>
                <p className="ds-page-subtitle">How well your AI resolves visitor queries.</p>
              </div>
              <div className="ds-anl-quality-grid">
                {[
                  {
                    label: 'Resolution Rate',
                    value: `${resolutionRate}%`,
                    desc: 'Sessions marked as completed',
                    pct: resolutionRate,
                    color: resolutionRate >= 70 ? '#34d399' : resolutionRate >= 40 ? '#f59e0b' : '#ef4444',
                    insight: resolutionRate >= 70 ? 'Great — most visitors find answers' : resolutionRate >= 40 ? 'Moderate — room to improve responses' : 'Low — review unanswered topics',
                  },
                  {
                    label: 'Avg Messages / Session',
                    value: String(avgMsgsPerSession),
                    desc: 'Average back-and-forth per conversation',
                    pct: Math.min(100, avgMsgsPerSession * 10),
                    color: 'var(--accent-strong)',
                    insight: avgMsgsPerSession <= 2 ? 'Short sessions — add more depth' : avgMsgsPerSession <= 6 ? 'Healthy engagement depth' : 'Long sessions — may indicate confusion',
                  },
                  {
                    label: 'Unanswered Rate',
                    value: `${unansweredRate}%`,
                    desc: 'Sessions with 1 or fewer messages',
                    pct: unansweredRate,
                    color: unansweredRate > 30 ? '#ef4444' : unansweredRate > 15 ? '#f59e0b' : '#34d399',
                    insight: unansweredRate > 30 ? 'High drop-off — check widget placement' : unansweredRate > 15 ? 'Some drop-off — tune the welcome prompt' : 'Low drop-off — visitors are engaging',
                  },
                ].map((item) => (
                  <div key={item.label} className="ds-anl-quality-card">
                    <div className="ds-anl-quality-top">
                      <span className="ds-anl-quality-label">{item.label}</span>
                      <span className="ds-anl-quality-val" style={{ color: item.color }}>{item.value}</span>
                    </div>
                    <div className="ds-anl-quality-track">
                      <div className="ds-anl-quality-fill" style={{ width: `${item.pct}%`, background: item.color }} />
                    </div>
                    <div className="ds-anl-quality-desc">{item.desc}</div>
                    <div className="ds-anl-quality-insight">{item.insight}</div>
                  </div>
                ))}
              </div>
              {totalSessionsCount === 0 && (
                <div className="ds-anl-empty">No session data yet. Stats will appear once visitors chat.</div>
              )}
            </div>
          ) : null}

          {/* ── Conversation Funnel ── */}
          {activeSection === 'anl-funnel' ? (
            <div className="ds-section-wrap">
              <div className="ds-page-header-simple">
                <h1 className="ds-page-title">Conversation Funnel</h1>
                <p className="ds-page-subtitle">Track how visitors move from chat to lead.</p>
              </div>
              <div className="ds-anl-funnel-page">
                {[
                  { label: 'Started', value: funnelStarted, color: 'var(--accent-strong)', desc: 'Visitors who opened a chat session' },
                  { label: 'Completed', value: funnelCompleted, color: '#a78bfa', desc: 'Sessions that reached a resolution' },
                  { label: 'Lead Captured', value: funnelLeads, color: '#34d399', desc: 'Visitors who left contact info' },
                ].map((step, i, arr) => {
                  const pct = i === 0 ? 100 : Math.round((step.value / Math.max(1, arr[0].value)) * 100);
                  const dropPct = i > 0 ? Math.round(((arr[i - 1].value - step.value) / Math.max(1, arr[i - 1].value)) * 100) : 0;
                  return (
                    <div key={step.label} className="ds-anl-funnel-page-step">
                      <div className="ds-anl-funnel-page-bar-wrap">
                        <div
                          className="ds-anl-funnel-page-bar"
                          style={{ width: `${pct}%`, background: step.color }}
                        />
                      </div>
                      <div className="ds-anl-funnel-page-meta">
                        <div className="ds-anl-funnel-page-left">
                          <span className="ds-anl-funnel-page-label">{step.label}</span>
                          <span className="ds-anl-funnel-page-desc">{step.desc}</span>
                        </div>
                        <div className="ds-anl-funnel-page-right">
                          <span className="ds-anl-funnel-page-count" style={{ color: step.color }}>{formatNumber(step.value)}</span>
                          <span className="ds-anl-funnel-page-pct">{pct}%</span>
                          {i > 0 && dropPct > 0 && (
                            <span className="ds-anl-funnel-page-drop">−{dropPct}% drop</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {funnelStarted > 0 && (
                  <div className="ds-anl-funnel-summary">
                    Overall conversion: <strong style={{ color: '#34d399' }}>{Math.round((funnelLeads / funnelStarted) * 100)}%</strong> of sessions became leads
                  </div>
                )}
              </div>
              {funnelStarted === 0 && (
                <div className="ds-anl-empty">No sessions yet. Funnel will populate once visitors chat.</div>
              )}
            </div>
          ) : null}

          {/* ── Peak Hours ── */}
          {activeSection === 'anl-peak' ? (
            <div className="ds-section-wrap">
              <div className="ds-page-header-simple">
                <h1 className="ds-page-title">Peak Hours</h1>
                <p className="ds-page-subtitle">When your visitors are most active.</p>
              </div>
              <div className="ds-anl-surface" style={{ padding: '24px 24px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                  <div className="ds-anl-surface-title" style={{ margin: 0 }}>
                    <Activity className="h-3.5 w-3.5 text-[var(--accent-strong)]" />
                    Hourly Traffic Distribution
                  </div>
                  {widgetAnalytics.length > 0 && (
                    <span className="ds-anl-peak-badge">Peak: {fmtHour(peakHour)}</span>
                  )}
                </div>
                <div className="ds-anl-heatmap-lg">
                  {Array.from({ length: 24 }, (_, h) => {
                    const cnt = eventsByHour[h] || 0;
                    const pct = Math.round((cnt / maxHourCount) * 100);
                    const isPeak = h === peakHour && cnt > 0;
                    return (
                      <div key={h} className="ds-anl-heatmap-lg-col" title={`${fmtHour(h)}: ${cnt} events`}>
                        <div className="ds-anl-heatmap-lg-count">{cnt > 0 ? cnt : ''}</div>
                        <div className="ds-anl-heatmap-lg-bar-wrap">
                          <div
                            className="ds-anl-heatmap-lg-bar"
                            style={{
                              height: `${Math.max(3, pct)}%`,
                              background: isPeak ? 'var(--accent-strong)' : cnt > 0 ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.05)',
                              boxShadow: isPeak ? '0 0 12px rgba(139,92,246,0.4)' : 'none',
                            }}
                          />
                        </div>
                        <div className="ds-anl-heatmap-lg-tick">{fmtHour(h)}</div>
                      </div>
                    );
                  })}
                </div>
                {widgetAnalytics.length === 0 && (
                  <div className="ds-anl-empty" style={{ marginTop: 0 }}>No activity data yet. Traffic will appear once visitors use your widget.</div>
                )}
              </div>
            </div>
          ) : null}

          {/* ── Top Questions ── */}
          {activeSection === 'anl-questions' ? (
            <div className="ds-section-wrap">
              <div className="ds-page-header-simple">
                <h1 className="ds-page-title">Top Questions</h1>
                <p className="ds-page-subtitle">Most recent unique questions visitors asked.</p>
              </div>
              {topQuestions.length === 0 ? (
                <div className="ds-anl-empty">No questions yet. Data populates from chat sessions.</div>
              ) : (
                <div className="ds-anl-questions-page">
                  {topQuestions.map((q, i) => (
                    <div key={i} className="ds-anl-question-page-item">
                      <div className="ds-anl-question-page-rank">
                        <span>{i + 1}</span>
                      </div>
                      <div className="ds-anl-question-page-body">
                        <div className="ds-anl-question-page-text">{q}</div>
                        <div className="ds-anl-question-page-bar">
                          <div
                            className="ds-anl-question-page-fill"
                            style={{ width: `${Math.max(10, 100 - i * 14)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* ── New vs Returning Visitors ── */}
          {activeSection === 'anl-visitors' ? (
            <div className="ds-section-wrap">
              <div className="ds-page-header-simple">
                <h1 className="ds-page-title">Visitors</h1>
                <p className="ds-page-subtitle">New vs returning visitor breakdown.</p>
              </div>
              <div className="ds-anl-visitors-grid">
                <div className="ds-anl-visitor-card ds-anl-visitor-card--new">
                  <div className="ds-anl-visitor-icon">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="ds-anl-visitor-val">{formatNumber(newVisitors)}</div>
                  <div className="ds-anl-visitor-label">New Visitors</div>
                  <div className="ds-anl-visitor-pct">{newPct}% of sessions</div>
                </div>
                <div className="ds-anl-visitor-card ds-anl-visitor-card--ret">
                  <div className="ds-anl-visitor-icon" style={{ color: '#a78bfa' }}>
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="ds-anl-visitor-val" style={{ color: '#a78bfa' }}>{formatNumber(returningVisitors)}</div>
                  <div className="ds-anl-visitor-label">Returning</div>
                  <div className="ds-anl-visitor-pct">{returningPct}% of sessions</div>
                </div>
              </div>
              {totalSessionsCount > 0 && (
                <div className="ds-anl-surface" style={{ padding: '20px 24px' }}>
                  <div className="ds-anl-surface-title" style={{ marginBottom: 14 }}>
                    <BarChart3 className="h-3.5 w-3.5 text-[var(--accent-strong)]" />
                    Session Breakdown
                  </div>
                  <div className="ds-anl-visitors-bar">
                    <div className="ds-anl-visitors-bar-new" style={{ width: `${newPct}%` }} title={`New: ${newPct}%`} />
                    <div className="ds-anl-visitors-bar-ret" style={{ width: `${returningPct}%` }} title={`Returning: ${returningPct}%`} />
                  </div>
                  <div className="ds-anl-visitors-legend">
                    <span><span className="ds-anl-visitors-dot ds-anl-visitors-dot--new" />New — {newPct}%</span>
                    <span><span className="ds-anl-visitors-dot ds-anl-visitors-dot--ret" />Returning — {returningPct}%</span>
                  </div>
                </div>
              )}
              {totalSessionsCount === 0 && (
                <div className="ds-anl-empty">No session data yet. Visitor stats appear once people use your widget.</div>
              )}
            </div>
          ) : null}

          {/* ── Leads & Feedback Analytics ── */}
          {activeSection === 'anl-leads' ? (
            <div className="ds-section-wrap">
              <div className="ds-page-header-simple">
                <h1 className="ds-page-title">Leads &amp; Feedback</h1>
                <p className="ds-page-subtitle">Contact captures and visitor satisfaction data.</p>
              </div>
              <div className="ds-anl-grid-3">
                <div className="ds-anl-mini-card">
                  <div className="ds-anl-mini-head">
                    <span className="ds-anl-mini-label">Leads Captured</span>
                    <div className="ds-anl-mini-icon"><Users className="h-3.5 w-3.5" /></div>
                  </div>
                  <div className="ds-anl-mini-value">{formatNumber(leads.length || analytics.leads)}</div>
                  <div className="ds-anl-mini-desc">Visitors who left contact info</div>
                </div>
                <div className="ds-anl-mini-card">
                  <div className="ds-anl-mini-head">
                    <span className="ds-anl-mini-label">Ratings</span>
                    <div className="ds-anl-mini-icon"><Zap className="h-3.5 w-3.5" /></div>
                  </div>
                  <div className="ds-anl-mini-value">{formatNumber(analytics.totalRatings)}</div>
                  <div className="ds-anl-mini-desc">Visitor satisfaction ratings</div>
                </div>
                <div className="ds-anl-mini-card">
                  <div className="ds-anl-mini-head">
                    <span className="ds-anl-mini-label">Feedback Items</span>
                    <div className="ds-anl-mini-icon"><Send className="h-3.5 w-3.5" /></div>
                  </div>
                  <div className="ds-anl-mini-value">{formatNumber(feedback.length)}</div>
                  <div className="ds-anl-mini-desc">Total feedback submissions</div>
                </div>
              </div>
            </div>
          ) : null}

          {/* ── Knowledge & Plan Analytics ── */}
          {activeSection === 'anl-knowledge' ? (
            <div className="ds-section-wrap">
              <div className="ds-page-header-simple">
                <h1 className="ds-page-title">Knowledge &amp; Plan</h1>
                <p className="ds-page-subtitle">Knowledge base stats and plan usage.</p>
              </div>
              <div className="ds-two-col">
                <div className="ds-anl-surface">
                  <div className="ds-anl-surface-title">
                    <BookOpenText className="h-3.5 w-3.5 text-[var(--accent-strong)]" />
                    Knowledge Base
                  </div>
                  <div className="ds-anl-surface-row">
                    <span>Pages Indexed</span>
                    <span className="ds-anl-surface-val">{formatNumber(stats.scrapedPages)}</span>
                  </div>
                  <div className="ds-anl-surface-row">
                    <span>Documents Uploaded</span>
                    <span className="ds-anl-surface-val">{formatNumber(documents.length)}</span>
                  </div>
                  <div className="ds-anl-surface-row">
                    <span>Data Sources</span>
                    <span className="ds-anl-surface-val">{formatNumber(sources.length)}</span>
                  </div>
                </div>
                <div className="ds-anl-surface">
                  <div className="ds-anl-surface-title">
                    <BarChart3 className="h-3.5 w-3.5 text-[var(--accent-strong)]" />
                    Plan &amp; Usage
                  </div>
                  <div className="ds-anl-surface-row">
                    <span>Conversations Used</span>
                    <span className="ds-anl-surface-val">
                      {formatNumber(usage.conversationsUsed ?? 0)}
                      {usageLimit ? ` / ${formatNumber(usageLimit)}` : ' / ∞'}
                    </span>
                  </div>
                  {usageLimit && usageLimit > 0 ? (
                    <div className="ds-anl-usage-bar">
                      <div className="ds-anl-usage-bar-fill" style={{ width: `${usagePercent}%`, background: usageBarColor }} />
                    </div>
                  ) : null}
                  <div className="ds-anl-surface-row">
                    <span>Remaining</span>
                    <span className="ds-anl-surface-val">
                      {usageRemaining === null || usageRemaining === undefined ? '∞' : formatNumber(usageRemaining)}
                    </span>
                  </div>
                  {usage.resetDate && (
                    <div className="ds-anl-surface-row">
                      <span>Resets on</span>
                      <span className="ds-anl-surface-val">{formatDate(usage.resetDate)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* ── Integration ── */}
          {activeSection === 'anl-integration' ? (
            <div className="ds-section-wrap">
              <div className="ds-page-header-simple">
                <h1 className="ds-page-title">Integration</h1>
                <p className="ds-page-subtitle">Embed your widget on any website.</p>
              </div>
              {embedCode ? (
                <div className="ds-embed-strip">
                  <span className="ds-embed-strip-label">Embed Script</span>
                  <div className="ds-embed-strip-code">{embedCode}</div>
                  <button
                    type="button"
                    className="ds-embed-strip-copy"
                    onClick={async () => { await navigator.clipboard.writeText(embedCode); toast.success('Copied'); }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </button>
                </div>
              ) : (
                <div className="ds-anl-surface" style={{ color: 'var(--text-3)', fontSize: 13 }}>
                  No embed code available yet.
                </div>
              )}
            </div>
          ) : null}

          {/* ── Data Sources ── */}
          {activeSection === 'sources' ? (
            <div className="ds-section-wrap">
              <div className="ds-page-header-simple">
                <h1 className="ds-page-title">Data Sources</h1>
                <p className="ds-page-subtitle">Connect websites and documents to power the assistant&apos;s knowledge.</p>
              </div>
              <div className="ds-two-col">
                <div className="section-surface p-6">
                  <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="mb-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">Website sources</h2>
                      <p className="m-0 text-sm leading-6 text-[var(--text-2)]">Connect pages, help docs, and public URLs for grounded answers.</p>
                    </div>
                    <div className="dashboard-chip">{formatNumber(stats.scrapedPages ?? sources.length)} pages</div>
                  </div>

                  <form onSubmit={handleAddSource} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="dashboard-source-url" className="text-sm font-semibold text-[var(--text-2)]">Add a public URL</Label>
                      <Input id="dashboard-source-url" type="url" placeholder="https://example.com/help" value={url} onChange={(e) => setUrl(e.target.value)} />
                    </div>
                    <Button type="submit" disabled={isSavingSource}>
                      <Plus className="h-4 w-4" />
                      {isSavingSource ? 'Adding...' : 'Add source'}
                    </Button>
                  </form>

                  <div className="mt-6 space-y-3">
                    {sources.length === 0 ? (
                      <div className="dashboard-empty">Add your first source to build the retrieval layer.</div>
                    ) : (
                      sources.map((source) => (
                        <div key={source.url} className="section-surface flex items-center gap-4 p-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-[color:var(--surface)]">
                            <Globe2 className="h-4 w-4 text-[var(--accent-strong)]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-[var(--text-1)]">{source.url}</div>
                            <div className="text-xs text-[var(--text-3)]">Live source</div>
                          </div>
                          <Button variant="ghost" size="icon-sm" type="button" disabled={deletingSourceUrl === source.url} onClick={() => void handleDeleteSource(source.url)}>
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
                      <h2 className="mb-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">Documents</h2>
                      <p className="m-0 text-sm leading-6 text-[var(--text-2)]">Upload TXT or CSV files for extra product context.</p>
                    </div>
                    <div className="dashboard-chip">{formatNumber(documents.length)} files</div>
                  </div>

                  <form onSubmit={handleUploadDocument} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="dashboard-document-upload" className="text-sm font-semibold text-[var(--text-2)]">Upload TXT or CSV</Label>
                      <Input id="dashboard-document-upload" type="file" accept=".txt,.csv,text/plain,text/csv" onChange={(e) => setDocumentFile(e.target.files?.[0] || null)} />
                    </div>
                    <Button type="submit" variant="outline" disabled={isUploadingDocument}>
                      <Upload className="h-4 w-4" />
                      {isUploadingDocument ? 'Uploading...' : 'Upload document'}
                    </Button>
                  </form>

                  <div className="mt-6 space-y-3">
                    {documents.length === 0 ? (
                      <div className="dashboard-empty">Optional, but useful for internal notes and product references.</div>
                    ) : (
                      documents.map((doc) => (
                        <div key={doc.id} className="section-surface flex items-center gap-4 p-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-[color:var(--surface)]">
                            <FileText className="h-4 w-4 text-[var(--accent-strong)]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-[var(--text-1)]">{getDocumentName(doc)}</div>
                            <div className="text-xs text-[var(--text-3)]">Added {formatDate(doc.createdAt)}</div>
                          </div>
                          <Button variant="ghost" size="icon-sm" type="button" disabled={deletingDocumentId === doc.id} onClick={() => void handleDeleteDocument(doc.id)}>
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

          {/* ── Craft Console ── */}
          {activeSection === 'widget' ? (
            <div style={{ display: 'flex', height: 'calc(100vh - 52px)', overflow: 'hidden' }}>
              <style>{`.ds-craft-left::-webkit-scrollbar{width:4px}.ds-craft-left::-webkit-scrollbar-track{background:transparent}.ds-craft-left::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:10px}.ds-craft-left::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.22)}.ds-craft-left{scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.12) transparent}`}</style>
              {/* Left: scrollable settings panel */}
              <div className="ds-craft-left" style={{ flex: '0 0 50%', overflowY: 'auto', padding: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>

                <div className="section-surface p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">Widget settings</h2>
                    <div className="dashboard-chip">{widgetSaved ? 'Saved' : 'Draft changes'}</div>
                  </div>

                  {/* Brand auto-fill */}
                  <div className="mb-5 rounded-2xl border border-white/8 bg-[var(--surface)] p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Zap className="h-3.5 w-3.5 text-[var(--accent-strong)]" />
                      <span className="text-sm font-semibold text-[var(--text-1)]">Brand Auto-Fill</span>
                    </div>
                    <p className="mb-3 text-xs text-[var(--text-3)]">Enter your website URL to auto-detect brand colors.</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://yourwebsite.com"
                        value={brandUrl}
                        onChange={(e) => setBrandUrl(e.target.value)}
                        className="flex-1"
                      />
                      <Button variant="outline" onClick={handleBrandAutoFill} disabled={isFetchingBrand}>
                        {isFetchingBrand ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-[var(--text-2)]">Widget name</Label>
                      <Input value={widgetName} onChange={(e) => { setWidgetSaved(false); setWidgetName(e.target.value); }} />
                    </div>

                    <div className="dashboard-grid-two">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[var(--text-2)]">Primary color</Label>
                        <Input type="color" value={widgetConfig.primaryColor} onChange={(e) => updateWidgetConfig({ primaryColor: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[var(--text-2)]">Background color</Label>
                        <Input type="color" value={widgetConfig.backgroundColor} onChange={(e) => updateWidgetConfig({ backgroundColor: e.target.value })} />
                      </div>
                    </div>

                    <div className="dashboard-grid-two">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[var(--text-2)]">Text color</Label>
                        <Input type="color" value={widgetConfig.textColor} onChange={(e) => updateWidgetConfig({ textColor: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[var(--text-2)]">Logo URL</Label>
                        <Input value={widgetConfig.logoUrl} placeholder="https://cdn.example.com/logo.png" onChange={(e) => updateWidgetConfig({ logoUrl: e.target.value })} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-[var(--text-2)]">Bot name</Label>
                      <Input value={widgetConfig.botName} onChange={(e) => updateWidgetConfig({ botName: e.target.value })} />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-[var(--text-2)]">Welcome message</Label>
                      <Input value={widgetConfig.welcomeMessage} onChange={(e) => updateWidgetConfig({ welcomeMessage: e.target.value })} />
                    </div>

                    <div className="dashboard-grid-two">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[var(--text-2)]">Position</Label>
                        <select className="h-11 w-full rounded-xl border border-white/10 bg-[color:var(--surface)] px-3.5 text-sm text-[var(--text-1)] shadow-[var(--shadow-card)] outline-none" value={widgetConfig.position} onChange={(e) => updateWidgetConfig({ position: e.target.value })}>
                          <option value="bottom-right">Bottom right</option>
                          <option value="bottom-left">Bottom left</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[var(--text-2)]">Border radius</Label>
                        <Input type="number" value={widgetConfig.borderRadius} onChange={(e) => updateWidgetConfig({ borderRadius: Number(e.target.value) || defaultWidgetConfig.borderRadius })} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-[var(--text-2)]">Font size</Label>
                      <Input type="number" value={widgetConfig.fontSize} onChange={(e) => updateWidgetConfig({ fontSize: Number(e.target.value) || defaultWidgetConfig.fontSize })} />
                    </div>

                    {/* Home screen settings */}
                    <div className="rounded-2xl border border-white/8 bg-[var(--surface)] p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-[var(--text-1)]">Home screen</span>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={widgetConfig.showHomeScreen}
                            onChange={(e) => updateWidgetConfig({ showHomeScreen: e.target.checked })}
                            className="h-4 w-4 accent-[var(--accent-strong)]"
                          />
                          <span className="text-xs text-[var(--text-3)]">Show on open</span>
                        </label>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[var(--text-2)]">Home title</Label>
                        <Input value={widgetConfig.homeTitle} placeholder="Start a conversation" onChange={(e) => updateWidgetConfig({ homeTitle: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[var(--text-2)]">Agent label</Label>
                        <Input value={widgetConfig.agentLabel} placeholder="AI assistant" onChange={(e) => updateWidgetConfig({ agentLabel: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[var(--text-2)]">Quick links</Label>
                        <p className="text-xs text-[var(--text-3)]">Add up to 4 links shown on the home screen.</p>
                        <div className="space-y-2">
                          {widgetConfig.quickLinks.map((ql, i) => (
                            <div key={i} className="flex gap-2 items-center">
                              <Input
                                value={ql.label}
                                placeholder="Label"
                                className="flex-1"
                                onChange={(e) => {
                                  const next = [...widgetConfig.quickLinks];
                                  next[i] = { ...next[i], label: e.target.value };
                                  updateWidgetConfig({ quickLinks: next });
                                }}
                              />
                              <Input
                                value={ql.url}
                                placeholder="https://..."
                                className="flex-1"
                                onChange={(e) => {
                                  const next = [...widgetConfig.quickLinks];
                                  next[i] = { ...next[i], url: e.target.value };
                                  updateWidgetConfig({ quickLinks: next });
                                }}
                              />
                              <button
                                type="button"
                                className="shrink-0 text-[var(--text-3)] hover:text-red-400 transition-colors"
                                onClick={() => updateWidgetConfig({ quickLinks: widgetConfig.quickLinks.filter((_, j) => j !== i) })}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                          {widgetConfig.quickLinks.length < 4 && (
                            <button
                              type="button"
                              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 py-2 text-sm text-[var(--text-3)] hover:border-white/30 hover:text-[var(--text-2)] transition-colors"
                              onClick={() => updateWidgetConfig({ quickLinks: [...widgetConfig.quickLinks, { label: '', url: '' }] })}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add link
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Allowed domains */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-[var(--text-2)]">Allowed domains</Label>
                      <p className="text-xs text-[var(--text-3)]">One domain per line. Leave empty to allow all domains.</p>
                      <textarea
                        className="w-full rounded-xl border border-white/10 bg-[color:var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text-1)] shadow-[var(--shadow-card)] outline-none resize-none"
                        rows={3}
                        placeholder={"example.com\napp.example.com"}
                        value={allowedDomains}
                        onChange={(e) => { setWidgetSaved(false); setAllowedDomains(e.target.value); }}
                      />
                    </div>

                    <Button className="w-full" onClick={handleSaveWidget} disabled={isSavingWidget}>
                      {isSavingWidget ? 'Saving...' : 'Save widget settings'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right: full height iframe */}
              <div style={{ flex: '0 0 50%', height: '100%' }}>
                <iframe
                  ref={widgetPreviewIframeRef}
                  src="/widget-preview"
                  title="Widget preview"
                  style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                  onLoad={() => {
                    setWidgetPreviewReady(true);
                    postWidgetConfig(widgetConfig);
                  }}
                />
              </div>
            </div>
          ) : null}

          {/* ── Live Sessions ── */}
          {activeSection === 'live' ? (
            <div className="ds-section-wrap">
              <div className="ds-page-header-simple">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h1 className="ds-page-title">Live Sessions</h1>
                    <p className="ds-page-subtitle">Active conversations happening right now. Auto-refreshes every 30s.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="ds-live-badge">
                      <span className="ds-live-dot" />
                      {activeSessions2.length} active
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => void apiClient.get('/dashboard/chat-sessions').then((res) => setChatSessions(res.data?.sessions || [])).catch(() => {})}>
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* KPI row */}
              <div className="ds-metric-grid mb-6">
                {[
                  { label: 'Active now', value: activeSessions2.length, color: '#22c55e' },
                  { label: 'Total sessions', value: totalSessionsCount },
                  { label: 'Completed', value: completedSessionsCount },
                  { label: 'Avg messages', value: avgMsgsPerSession },
                ].map((m) => (
                  <div key={m.label} className="ds-metric-card">
                    <div className="ds-metric-card-head"><span className="ds-metric-label">{m.label}</span></div>
                    <div className="ds-metric-value" style={m.color ? { color: m.color } : {}}>{m.value}</div>
                  </div>
                ))}
              </div>

              {activeSessions2.length === 0 ? (
                <div className="section-surface p-12 text-center">
                  <Monitor className="h-8 w-8 mx-auto mb-3 text-[var(--text-3)]" />
                  <p className="text-sm text-[var(--text-3)]">No active sessions right now.</p>
                  <p className="text-xs text-[var(--text-3)] mt-1">Sessions appear here in real time when visitors start chatting.</p>
                </div>
              ) : (
                <div className="ds-live-grid">
                  {activeSessions2.map((session) => (
                    <div key={session.id} className="ds-live-card">
                      <div className="ds-live-card-header">
                        <div className="ds-live-indicator" />
                        <div className="ds-live-card-title truncate">{session.lastMessagePreview || 'Active visitor'}</div>
                        <span className="ds-live-card-time">{formatDateTime(session.lastMessageAt || session.createdAt)}</span>
                      </div>
                      <div className="ds-live-card-meta">
                        <span className="dashboard-chip">{session.messageCount || 0} msgs</span>
                        <span className="dashboard-chip ds-status-chip" data-status="active">ACTIVE</span>
                      </div>
                      <button
                        type="button"
                        className="ds-live-view-btn"
                        onClick={() => { navigateTo('chat'); void loadChatSession(session.id); }}
                      >
                        View transcript
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* ── Escalation Log ── */}
          {activeSection === 'escalations' ? (
            <div className="ds-section-wrap">
              <div className="ds-page-header-simple">
                <h1 className="ds-page-title">Escalation Log</h1>
                <p className="ds-page-subtitle">History of sessions escalated to a human agent.</p>
              </div>

              {/* Summary KPIs */}
              <div className="ds-metric-grid mb-6">
                {[
                  { label: 'Total escalations', value: handoffs.length },
                  { label: 'Pending', value: handoffs.filter((h) => h.status === 'pending').length },
                  { label: 'Claimed', value: handoffs.filter((h) => h.status === 'claimed').length },
                  { label: 'Resolved', value: handoffs.filter((h) => h.status === 'resolved').length },
                ].map((m) => (
                  <div key={m.label} className="ds-metric-card">
                    <div className="ds-metric-card-head"><span className="ds-metric-label">{m.label}</span></div>
                    <div className="ds-metric-value">{m.value}</div>
                  </div>
                ))}
              </div>

              {handoffs.length === 0 ? (
                <div className="section-surface p-12 text-center">
                  <AlertCircle className="h-8 w-8 mx-auto mb-3 text-[var(--text-3)]" />
                  <p className="text-sm text-[var(--text-3)]">No escalations recorded yet.</p>
                  <p className="text-xs text-[var(--text-3)] mt-1">Escalations appear here when visitors request a human agent.</p>
                </div>
              ) : (
                <div className="section-surface overflow-hidden">
                  <div className="ds-esc-table-header">
                    <div>Visitor</div>
                    <div>Trigger</div>
                    <div>Status</div>
                    <div>Agent</div>
                    <div>Date</div>
                  </div>
                  {handoffs.map((h) => (
                    <div key={h.id} className="ds-esc-row">
                      <div className="font-medium text-[var(--text-1)] text-sm truncate">{h.visitorName || h.visitorEmail || 'Visitor'}</div>
                      <div className="text-xs text-[var(--text-2)] truncate">{h.triggerReason || '—'}</div>
                      <div>
                        <span className={`ds-esc-status ${h.status === 'pending' ? 'ds-esc-status--pending' : h.status === 'claimed' ? 'ds-esc-status--claimed' : 'ds-esc-status--resolved'}`}>
                          {h.status || 'pending'}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--text-2)] truncate">{h.claimedBy || '—'}</div>
                      <div className="text-xs text-[var(--text-3)]">{formatDateTime(h.createdAt)}</div>
                    </div>
                  ))}
                </div>
              )}
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
                  <div className="mb-4 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-3)]" />
                        <input
                          type="text"
                          placeholder="Search conversations..."
                          className="w-full rounded-xl border border-white/10 bg-[var(--surface)] py-2 pl-8 pr-3 text-sm text-[var(--text-1)] outline-none"
                          value={chatSearch}
                          onChange={(e) => setChatSearch(e.target.value)}
                        />
                      </div>
                      <select
                        className="rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-1)] outline-none"
                        value={chatStatusFilter}
                        onChange={(e) => setChatStatusFilter(e.target.value)}
                      >
                        <option value="all">All</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--text-3)] shrink-0">Date:</span>
                      <input
                        type="date"
                        className="flex-1 rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text-1)] outline-none"
                        value={chatDateFrom}
                        onChange={(e) => setChatDateFrom(e.target.value)}
                      />
                      <span className="text-xs text-[var(--text-3)]">–</span>
                      <input
                        type="date"
                        className="flex-1 rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text-1)] outline-none"
                        value={chatDateTo}
                        onChange={(e) => setChatDateTo(e.target.value)}
                      />
                      {(chatDateFrom || chatDateTo) && (
                        <button type="button" className="text-[var(--text-3)] hover:text-[var(--text-1)]" onClick={() => { setChatDateFrom(''); setChatDateTo(''); }}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {filteredChatSessions.length === 0 ? (
                    <div className="dashboard-empty">
                      {chatSessions.length === 0
                        ? 'Conversations will appear here once users engage with the widget.'
                        : 'No sessions match your filters.'}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredChatSessions.map((session) => (
                        <button
                          key={session.id}
                          type="button"
                          className="section-surface w-full p-4 text-left"
                          style={{
                            background: selectedChatId === session.id
                              ? 'linear-gradient(160deg, color-mix(in srgb, var(--accent-muted) 82%, var(--surface-2) 18%) 0%, color-mix(in srgb, var(--surface) 92%, transparent) 100%)'
                              : undefined,
                          }}
                          onClick={() => void loadChatSession(session.id)}
                        >
                          <div className="mb-2 flex items-center justify-between gap-4">
                            <div className="truncate text-sm font-semibold text-[var(--text-1)]">
                              {session.lastMessagePreview || 'Conversation'}
                            </div>
                            <div className="shrink-0 text-xs text-[var(--text-3)]">{formatDateTime(session.lastMessageAt)}</div>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-[var(--text-3)]">
                            <span className="dashboard-chip">{formatNumber(session.messageCount)} msgs</span>
                            <span className="dashboard-chip ds-status-chip" data-status={session.status || 'active'}>
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
                      <h2 className="mb-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">Conversation detail</h2>
                      <p className="m-0 text-sm leading-6 text-[var(--text-2)]">Full transcript for the selected session.</p>
                    </div>
                    {loadingChatId ? <div className="dashboard-chip">Loading...</div> : null}
                  </div>

                  {selectedChatId && chatMessages.length > 0 ? (
                    <div className="space-y-3">
                      {chatMessages.map((message, index) => {
                        const assistant = message.role === 'assistant';
                        return (
                          <div key={`${message.createdAt}-${index}`} className="flex" style={{ justifyContent: assistant ? 'flex-start' : 'flex-end' }}>
                            <div
                              className="max-w-[88%] rounded-[24px] px-4 py-3"
                              style={{
                                background: assistant ? 'rgba(255,255,255,0.06)' : 'var(--accent-muted)',
                                color: 'var(--text-1)',
                                border: '1px solid rgba(255,255,255,0.08)',
                              }}
                            >
                              <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-3)]">{assistant ? 'Assistant' : 'User'}</div>
                              <div className="text-sm leading-6">{message.content}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="dashboard-empty">Select a session to view the transcript.</div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* ── Leads ── */}
          {activeSection === 'leads' ? (
            <div className="ds-section-wrap">
              <div className="ds-page-header-simple">
                <h1 className="ds-page-title">Leads</h1>
                <p className="ds-page-subtitle">Contacts captured by the widget. Update status and configure webhook notifications.</p>
              </div>

              {/* Tabs */}
              <div className="ds-tab-bar">
                <button type="button" className="ds-tab" data-active={leadsTab === 'list'} onClick={() => setLeadsTab('list')}>
                  <Users className="h-3.5 w-3.5" />
                  Lead List
                  {leads.length > 0 && <span className="ds-nav-count">{leads.length}</span>}
                </button>
                <button type="button" className="ds-tab" data-active={leadsTab === 'scoring'} onClick={() => setLeadsTab('scoring')}>
                  <Star className="h-3.5 w-3.5" />
                  Lead Scoring
                </button>
                <button type="button" className="ds-tab" data-active={leadsTab === 'webhook'} onClick={() => setLeadsTab('webhook')}>
                  <Webhook className="h-3.5 w-3.5" />
                  Webhook
                  {webhook?.url && <span className="ds-nav-count ds-nav-count--green">●</span>}
                </button>
                <button type="button" className="ds-tab" data-active={leadsTab === 'followup'} onClick={() => setLeadsTab('followup')}>
                  <Send className="h-3.5 w-3.5" />
                  Auto Follow-Up
                  {planLimits.hasFollowUp && followUp.isActive && <span className="ds-nav-count ds-nav-count--green">●</span>}
                </button>
              </div>

              {leadsTab === 'list' ? (
                <div>
                  {/* Summary cards */}
                  <div className="ds-metric-grid mb-6">
                    {LEAD_STATUSES.map((s) => (
                      <div key={s} className="ds-metric-card">
                        <div className="ds-metric-card-head">
                          <span className="ds-metric-label capitalize">{s}</span>
                        </div>
                        <div className="ds-metric-value">{leads.filter((l) => (l.status || 'new') === s).length}</div>
                      </div>
                    ))}
                  </div>

                  {/* Bulk action bar */}
                  {selectedLeadIds.size > 0 && (
                    <div className="ds-bulk-bar mb-4">
                      <div className="flex items-center gap-3">
                        <CheckSquare className="h-4 w-4 text-[var(--accent-strong)]" />
                        <span className="text-sm font-semibold text-[var(--text-1)]">{selectedLeadIds.size} selected</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" className="ds-bulk-btn" onClick={handleExportCSV}>Export CSV</button>
                        <button type="button" className="ds-bulk-btn" disabled={isBulkContacting} onClick={() => void handleBulkMarkContacted()}>
                          {isBulkContacting ? 'Updating...' : 'Mark contacted'}
                        </button>
                        <button type="button" className="ds-bulk-btn ds-bulk-btn--danger" disabled={isBulkDeleting} onClick={() => void handleBulkDelete()}>
                          {isBulkDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                        <button type="button" className="text-[var(--text-3)] hover:text-[var(--text-1)]" onClick={() => setSelectedLeadIds(new Set())}>
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {leads.length === 0 ? (
                    <div className="dashboard-empty">Leads captured from the widget will appear here.</div>
                  ) : (
                    <div className="space-y-3">
                      {leads.map((lead) => (
                        <div key={lead.id} className={`section-surface p-5 transition-colors ${selectedLeadIds.has(lead.id) ? 'ring-1 ring-[var(--accent-strong)]/40' : ''}`}>
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <input
                                type="checkbox"
                                className="ds-lead-checkbox"
                                checked={selectedLeadIds.has(lead.id)}
                                onChange={(e) => {
                                  setSelectedLeadIds((prev) => {
                                    const next = new Set(prev);
                                    if (e.target.checked) next.add(lead.id); else next.delete(lead.id);
                                    return next;
                                  });
                                }}
                              />
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-muted)] text-[var(--accent-strong)] text-sm font-bold">
                                {(lead.name || lead.email || 'L')[0].toUpperCase()}
                              </div>
                              <div>
                                {lead.name && <div className="text-sm font-semibold text-[var(--text-1)]">{lead.name}</div>}
                                {lead.email && <div className="text-xs text-[var(--text-2)]">{lead.email}</div>}
                                {lead.phone && <div className="text-xs text-[var(--text-3)]">{lead.phone}</div>}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <select
                                className="rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text-1)] outline-none"
                                value={lead.status || 'new'}
                                disabled={updatingLeadId === lead.id}
                                onChange={(e) => void handleUpdateLeadStatus(lead.id, e.target.value)}
                              >
                                {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                              </select>
                              <button
                                type="button"
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/8 text-[var(--text-3)] hover:text-red-400 transition-colors"
                                disabled={deletingLeadId === lead.id}
                                onClick={() => void handleDeleteLead(lead.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          {lead.message && <p className="mt-3 text-sm text-[var(--text-2)] border-t border-white/6 pt-3">{lead.message}</p>}
                          <div className="mt-2 text-xs text-[var(--text-3)]">{formatDateTime(lead.createdAt)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : leadsTab === 'scoring' ? (
                <div>
                  <div className="section-surface p-5 mb-6">
                    <h2 className="text-sm font-semibold text-[var(--text-1)] mb-1">How scoring works</h2>
                    <p className="text-xs text-[var(--text-2)] leading-relaxed">Leads are auto-scored 0–100 based on contact completeness (email +20, name +10, phone +15), engagement (message +10), status qualification (+10–25), and recency (newer = higher). Use scores to prioritize outreach.</p>
                  </div>
                  {scoredLeads.length === 0 ? (
                    <div className="dashboard-empty">No leads to score yet.</div>
                  ) : (
                    <div className="space-y-3">
                      {scoredLeads.map((lead) => {
                        const scoreColor = lead.score >= 70 ? '#22c55e' : lead.score >= 40 ? '#f59e0b' : '#ef4444';
                        const tierLabel = lead.score >= 70 ? 'Hot' : lead.score >= 40 ? 'Warm' : 'Cold';
                        return (
                          <div key={lead.id} className="ds-score-row section-surface">
                            <div className="ds-score-avatar">{(lead.name || lead.email || 'L')[0].toUpperCase()}</div>
                            <div className="ds-score-info">
                              <div className="text-sm font-semibold text-[var(--text-1)]">{lead.name || lead.email || 'Unknown'}</div>
                              {lead.email && lead.name && <div className="text-xs text-[var(--text-3)]">{lead.email}</div>}
                              <div className="text-xs text-[var(--text-3)] capitalize">{lead.status || 'new'} · {formatDate(lead.createdAt)}</div>
                            </div>
                            <div className="ds-score-bar-wrap">
                              <div className="ds-score-bar">
                                <div className="ds-score-bar-fill" style={{ width: `${lead.score}%`, background: scoreColor }} />
                              </div>
                            </div>
                            <div className="ds-score-val" style={{ color: scoreColor }}>
                              <span className="ds-score-num">{lead.score}</span>
                              <span className="ds-score-tier" style={{ background: `${scoreColor}20`, color: scoreColor }}>{tierLabel}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : leadsTab === 'webhook' ? (
                <div className="ds-two-col">
                  <div className="section-surface p-6">
                    <div className="mb-5">
                      <h2 className="mb-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">Webhook configuration</h2>
                      <p className="m-0 text-sm leading-6 text-[var(--text-2)]">Get notified in real time when new leads are captured.</p>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[var(--text-2)]">Webhook URL</Label>
                        <Input placeholder="https://hooks.slack.com/..." value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
                      </div>
                      <div className="flex gap-2">
                        <Button className="flex-1" onClick={handleSaveWebhook} disabled={isSavingWebhook}>
                          <Webhook className="h-4 w-4" />
                          {isSavingWebhook ? 'Saving...' : 'Save webhook'}
                        </Button>
                        <Button variant="outline" onClick={handleTestWebhook} disabled={isTestingWebhook || !webhook?.url}>
                          {isTestingWebhook ? 'Sending...' : 'Test'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="section-surface p-6">
                    <div className="mb-5">
                      <h2 className="mb-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">Status</h2>
                    </div>
                    <div className="space-y-3">
                      <div className="section-surface flex items-center justify-between p-4">
                        <span className="text-sm text-[var(--text-2)]">Webhook URL</span>
                        <span className="truncate max-w-[200px] text-xs text-[var(--text-1)]">{webhook?.url || '—'}</span>
                      </div>
                      <div className="section-surface flex items-center justify-between p-4">
                        <span className="text-sm text-[var(--text-2)]">Status</span>
                        <span className={`text-xs font-semibold ${webhook?.isActive ? 'text-green-400' : 'text-[var(--text-3)]'}`}>
                          {webhook?.url ? (webhook.isActive !== false ? 'Active' : 'Inactive') : 'Not configured'}
                        </span>
                      </div>
                      {webhook?.createdAt && (
                        <div className="section-surface flex items-center justify-between p-4">
                          <span className="text-sm text-[var(--text-2)]">Created</span>
                          <span className="text-xs text-[var(--text-1)]">{formatDate(webhook.createdAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Follow-up tab */
                <div className="ds-two-col">
                  <div className="section-surface p-6">
                    <div className="mb-5">
                      <h2 className="mb-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">Auto Follow-Up</h2>
                      <p className="m-0 text-sm leading-6 text-[var(--text-2)]">Automatically email leads after they are captured.</p>
                    </div>
                    {!planLimits.hasFollowUp ? (
                      <div className="ds-plan-gate-inline">
                        <Lock className="h-4 w-4 text-[var(--text-3)]" />
                        <span className="text-sm text-[var(--text-3)]">Auto Follow-Up is available on PRO and above</span>
                        <button type="button" className="ds-upgrade-cta-sm" onClick={() => navigateTo('plan')}>Upgrade</button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[var(--surface)] p-4">
                          <div>
                            <div className="text-sm font-semibold text-[var(--text-1)]">Enable auto follow-up</div>
                            <div className="text-xs text-[var(--text-3)] mt-0.5">Send automated emails to new leads</div>
                          </div>
                          <button
                            type="button"
                            className={`relative h-6 w-11 rounded-full transition-colors ${followUpForm.isActive ? 'bg-[var(--accent-strong)]' : 'bg-white/15'}`}
                            onClick={() => setFollowUpForm((f) => ({ ...f, isActive: !f.isActive }))}
                          >
                            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${followUpForm.isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
                          </button>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-[var(--text-2)]">Delay (hours after lead captured)</Label>
                          <input
                            type="number"
                            className="h-11 w-full rounded-xl border border-white/10 bg-[color:var(--surface)] px-3.5 text-sm text-[var(--text-1)] outline-none"
                            value={followUpForm.delayHours ?? 24}
                            onChange={(e) => setFollowUpForm((f) => ({ ...f, delayHours: Number(e.target.value) }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-[var(--text-2)]">Email subject</Label>
                          <input
                            className="h-11 w-full rounded-xl border border-white/10 bg-[color:var(--surface)] px-3.5 text-sm text-[var(--text-1)] outline-none"
                            placeholder="Following up from {{company}}"
                            value={followUpForm.templateSubject || ''}
                            onChange={(e) => setFollowUpForm((f) => ({ ...f, templateSubject: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-[var(--text-2)]">Email body</Label>
                          <p className="text-xs text-[var(--text-3)]">Use {'{{name}}'} and {'{{company}}'} as variables.</p>
                          <textarea
                            className="w-full rounded-xl border border-white/10 bg-[color:var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text-1)] outline-none resize-none"
                            rows={5}
                            placeholder={"Hi {{name}},\n\nThanks for reaching out..."}
                            value={followUpForm.templateBody || ''}
                            onChange={(e) => setFollowUpForm((f) => ({ ...f, templateBody: e.target.value }))}
                          />
                        </div>
                        <Button className="w-full" onClick={handleSaveFollowUp} disabled={isSavingFollowUp}>
                          {isSavingFollowUp ? 'Saving...' : 'Save follow-up config'}
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="section-surface p-6">
                    <div className="mb-5">
                      <h2 className="mb-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">Current config</h2>
                    </div>
                    <div className="space-y-3">
                      {[
                        { label: 'Status', value: followUp.isActive ? 'Active' : 'Inactive' },
                        { label: 'Delay', value: followUp.delayHours ? `${followUp.delayHours}h` : '—' },
                        { label: 'Subject', value: followUp.templateSubject || '—' },
                      ].map((row) => (
                        <div key={row.label} className="section-surface flex items-center justify-between p-4">
                          <span className="text-sm text-[var(--text-2)]">{row.label}</span>
                          <span className="text-sm font-semibold text-[var(--text-1)] truncate max-w-[200px]">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* ── Feedback ── */}
          {activeSection === 'feedback' ? (
            <div className="ds-section-wrap">
              <div className="ds-page-header-simple">
                <h1 className="ds-page-title">Feedback</h1>
                <p className="ds-page-subtitle">Customer suggestions and notes collected from the widget.</p>
              </div>

              <div className="mb-5 flex items-center gap-3">
                <div className="dashboard-chip">{feedback.length} total</div>
                <select
                  className="rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text-1)] outline-none"
                  value={feedbackTypeFilter}
                  onChange={(e) => setFeedbackTypeFilter(e.target.value)}
                >
                  <option value="all">All types</option>
                  <option value="feedback">Feedback</option>
                  <option value="suggestion">Suggestions</option>
                </select>
              </div>

              <div className="ds-metric-grid mb-6">
                {[
                  { label: 'Total', value: formatNumber(feedback.length) },
                  { label: 'Suggestions', value: formatNumber(feedback.filter((f) => f.type === 'suggestion').length) },
                  { label: 'Feedback notes', value: formatNumber(feedback.filter((f) => f.type !== 'suggestion').length) },
                ].map((c) => (
                  <div key={c.label} className="ds-metric-card">
                    <div className="ds-metric-card-head"><span className="ds-metric-label">{c.label}</span></div>
                    <div className="ds-metric-value">{c.value}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {filteredFeedback.length === 0 ? (
                  <div className="dashboard-empty">
                    {feedback.length === 0 ? 'Feedback will appear once the widget is in use.' : 'No items match the filter.'}
                  </div>
                ) : (
                  filteredFeedback.map((item) => (
                    <div key={item.id} className="section-surface p-5">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                          <span className="dashboard-chip">{(item.type || 'feedback').toUpperCase()}</span>
                          {item.pagePath && <span className="dashboard-chip">{item.pagePath}</span>}
                        </div>
                        <span className="text-xs text-[var(--text-3)]">{formatDateTime(item.createdAt)}</span>
                      </div>
                      {item.title && <h2 className="mb-2 text-lg font-bold tracking-[-0.03em] text-[var(--text-1)]">{item.title}</h2>}
                      <p className="m-0 text-sm leading-7 text-[var(--text-2)]">{item.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}

          {/* ── Settings ── */}
          {activeSection === 'settings' ? (
            <div className="ds-section-wrap">
              <div className="ds-page-header-simple">
                <h1 className="ds-page-title">Settings</h1>
                <p className="ds-page-subtitle">Manage your profile and active sessions.</p>
              </div>

              <div className="ds-two-col">
                {/* Profile form */}
                <div className="section-surface p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-muted)] text-[var(--accent-strong)] text-lg font-bold">
                      {userInitial}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[var(--text-1)]">{user.email}</div>
                      <div className="text-xs text-[var(--text-3)] capitalize">{planType} plan</div>
                    </div>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="dashboard-grid-two">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[var(--text-2)]">Full name</Label>
                        <Input value={profileForm.fullName || ''} onChange={(e) => setProfileForm((p) => ({ ...p, fullName: e.target.value }))} placeholder="Jane Smith" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[var(--text-2)]">Company</Label>
                        <Input value={profileForm.company || ''} onChange={(e) => setProfileForm((p) => ({ ...p, company: e.target.value }))} placeholder="Acme Inc." />
                      </div>
                    </div>
                    <div className="dashboard-grid-two">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[var(--text-2)]">Phone</Label>
                        <Input value={profileForm.phone || ''} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+1 555 000 0000" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[var(--text-2)]">Country</Label>
                        <Input value={profileForm.country || ''} onChange={(e) => setProfileForm((p) => ({ ...p, country: e.target.value }))} placeholder="United States" />
                      </div>
                    </div>
                    <div className="dashboard-grid-two">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[var(--text-2)]">Job title</Label>
                        <Input value={profileForm.jobTitle || ''} onChange={(e) => setProfileForm((p) => ({ ...p, jobTitle: e.target.value }))} placeholder="Product Manager" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[var(--text-2)]">Industry</Label>
                        <Input value={profileForm.industry || ''} onChange={(e) => setProfileForm((p) => ({ ...p, industry: e.target.value }))} placeholder="SaaS" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-[var(--text-2)]">Website</Label>
                      <Input value={profileForm.website || ''} onChange={(e) => setProfileForm((p) => ({ ...p, website: e.target.value }))} placeholder="https://yoursite.com" />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1" disabled={isSavingProfile}>
                        {isSavingProfile ? 'Saving...' : 'Save profile'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setProfileForm(profile)}>Reset</Button>
                    </div>
                  </form>
                </div>

                {/* Active sessions */}
                <div className="section-surface p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h2 className="mb-1 text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">Active sessions</h2>
                      <p className="m-0 text-sm text-[var(--text-2)]">Manage where you&apos;re currently signed in.</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={loadSettingsData}>
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {activeSessions.length === 0 ? (
                    <div className="dashboard-empty">No session data available.</div>
                  ) : (
                    <div className="space-y-3">
                      {activeSessions.map((session) => (
                        <div key={session.id} className="section-surface flex items-center gap-4 p-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-[var(--surface)]">
                            <Monitor className="h-4 w-4 text-[var(--accent-strong)]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-[var(--text-1)]">
                              {session.current ? 'Current session' : 'Browser session'}
                              {session.current && <span className="ml-2 text-xs text-green-400">● This device</span>}
                            </div>
                            <div className="text-xs text-[var(--text-3)]">
                              {session.userAgent ? session.userAgent.split('/')[0] : 'Unknown browser'} · {formatDateTime(session.lastUsedAt || session.createdAt)}
                            </div>
                          </div>
                          {!session.current && (
                            <button
                              type="button"
                              className="text-xs text-[var(--text-3)] hover:text-red-400 transition-colors"
                              disabled={revokingSessionId === session.id}
                              onClick={() => void handleRevokeSession(session.id)}
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 border-t border-white/8 pt-4">
                    <Button variant="ghost" className="w-full text-red-400 hover:text-red-300" onClick={handleLogout}>
                      <LogOut className="h-4 w-4" />
                      Sign out of all sessions
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* ── Plan & Billing ── */}
          {activeSection === 'plan' ? (
            <div className="ds-section-wrap">
              <div className="ds-page-header-simple">
                <h1 className="ds-page-title">Plan &amp; Billing</h1>
                <p className="ds-page-subtitle">Your current subscription and feature access.</p>
              </div>

              {/* Current plan badge */}
              <div className="section-surface p-6 mb-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-muted)]">
                      <Crown className="h-6 w-6 text-[var(--accent-strong)]" />
                    </div>
                    <div>
                      <div className="text-xs text-[var(--text-3)] uppercase tracking-widest mb-1">Current Plan</div>
                      <div className="text-2xl font-bold tracking-tight text-[var(--text-1)] capitalize">{planType}</div>
                    </div>
                  </div>
                  {planType !== 'enterprise' && (
                    <a href="mailto:sales@konvoqai.com" className="ds-upgrade-cta">Upgrade Plan</a>
                  )}
                </div>
              </div>

              {/* Usage bars */}
              <div className="ds-metric-grid mb-6">
                {[
                  { label: 'Messages', used: usage.conversationsUsed ?? 0, limit: planLimits.conversations ?? 0 },
                  { label: 'URL Scrapes', used: stats.scrapedPages ?? 0, limit: planLimits.scrapedPages ?? 0 },
                  { label: 'Documents', used: documents.length, limit: planLimits.documents ?? 0 },
                  { label: 'Leads', used: leads.length, limit: planLimits.leads ?? 0 },
                ].map((item) => {
                  const pct = item.limit > 0 ? Math.min(100, Math.round((item.used / item.limit) * 100)) : 0;
                  const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : 'var(--accent-strong)';
                  return (
                    <div key={item.label} className="ds-metric-card">
                      <div className="ds-metric-card-head"><span className="ds-metric-label">{item.label}</span></div>
                      <div className="ds-metric-value">{item.used} / {item.limit === 0 ? '∞' : item.limit}</div>
                      {item.limit > 0 && (
                        <div className="ds-usage-bar-track mt-2">
                          <div className="ds-usage-bar-fill" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Feature comparison */}
              <div className="section-surface p-6">
                <h2 className="mb-5 text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">Feature Access</h2>
                <div className="space-y-3">
                  {[
                    { label: 'Persona Builder', enabled: planLimits.hasPersona, minPlan: 'PRO' },
                    { label: 'Navigation Builder', enabled: planLimits.hasNavigation, minPlan: 'PRO' },
                    { label: 'Hide Branding', enabled: planLimits.hideBranding, minPlan: 'PRO' },
                    { label: 'CRM Pipeline', enabled: planLimits.hasCRM, minPlan: 'PRO' },
                    { label: 'Auto Follow-Up', enabled: planLimits.hasFollowUp, minPlan: 'PRO' },
                    { label: 'Hybrid AI+Human Inbox', enabled: planLimits.hasHybrid, minPlan: 'PRO' },
                    { label: 'Conversation Flows', enabled: planLimits.hasFlows, minPlan: 'PRO' },
                  ].map((feat) => (
                    <div key={feat.label} className="section-surface flex items-center justify-between p-4">
                      <span className="text-sm text-[var(--text-1)]">{feat.label}</span>
                      <div className="flex items-center gap-3">
                        {!feat.enabled && <span className="text-xs text-[var(--text-3)]">{feat.minPlan}+</span>}
                        <div className={`flex h-6 w-6 items-center justify-center rounded-full ${feat.enabled ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-[var(--text-3)]'}`}>
                          {feat.enabled ? <Check className="h-3.5 w-3.5" /> : <X className="h-3 w-3" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {/* ── Persona ── */}
          {activeSection === 'persona' ? (
            <div className="ds-section-wrap">
              <div className="ds-page-header-simple">
                <h1 className="ds-page-title">Persona</h1>
                <p className="ds-page-subtitle">Customize how your AI assistant thinks, speaks, and behaves.</p>
              </div>

              {!planLimits.hasPersona ? (
                <div className="ds-plan-gate">
                  <Lock className="h-8 w-8 text-[var(--text-3)]" />
                  <p className="text-sm font-semibold text-[var(--text-2)]">Persona Builder is available on PRO and above</p>
                  <button type="button" className="ds-upgrade-cta" onClick={() => navigateTo('plan')}>View Plans</button>
                </div>
              ) : (
                <div className="ds-two-col">
                  <div className="section-surface p-6">
                    <h2 className="mb-5 text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">Persona settings</h2>
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[var(--text-2)]">Bot name</Label>
                        <input
                          className="h-11 w-full rounded-xl border border-white/10 bg-[color:var(--surface)] px-3.5 text-sm text-[var(--text-1)] outline-none"
                          value={personaForm.botName || ''}
                          placeholder="e.g. Aria"
                          onChange={(e) => setPersonaForm((p) => ({ ...p, botName: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[var(--text-2)]">Tone</Label>
                        <select
                          className="h-11 w-full rounded-xl border border-white/10 bg-[color:var(--surface)] px-3.5 text-sm text-[var(--text-1)] outline-none"
                          value={personaForm.tone || 'friendly'}
                          onChange={(e) => setPersonaForm((p) => ({ ...p, tone: e.target.value }))}
                        >
                          <option value="formal">Formal</option>
                          <option value="friendly">Friendly</option>
                          <option value="enthusiastic">Enthusiastic</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[var(--text-2)]">Role</Label>
                        <div className="ds-persona-role-grid">
                          {(persona.availableRoles || planLimits.roles || ['professional', 'casual']).map((role) => (
                            <button
                              key={role}
                              type="button"
                              className="ds-persona-role-btn"
                              data-active={personaForm.role === role}
                              onClick={() => setPersonaForm((p) => ({ ...p, role }))}
                            >
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[var(--text-2)]">Custom instructions</Label>
                        <p className="text-xs text-[var(--text-3)]">Tell the AI how to behave, what to avoid, or additional context.</p>
                        <textarea
                          className="w-full rounded-xl border border-white/10 bg-[color:var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text-1)] outline-none resize-none"
                          rows={5}
                          placeholder="e.g. Always greet users by name. Never discuss competitor products."
                          value={personaForm.instructions || ''}
                          onChange={(e) => setPersonaForm((p) => ({ ...p, instructions: e.target.value }))}
                        />
                        <div className="text-right text-xs text-[var(--text-3)]">{(personaForm.instructions || '').length} / 1000</div>
                      </div>

                      <Button className="w-full" onClick={handleSavePersona} disabled={isSavingPersona}>
                        {isSavingPersona ? 'Saving...' : 'Save persona'}
                      </Button>
                    </div>
                  </div>

                  <div className="section-surface p-6">
                    <h2 className="mb-5 text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">Current persona</h2>
                    <div className="space-y-3">
                      {[
                        { label: 'Name', value: persona.botName || '—' },
                        { label: 'Role', value: persona.role || '—' },
                        { label: 'Tone', value: persona.tone || '—' },
                      ].map((row) => (
                        <div key={row.label} className="section-surface flex items-center justify-between p-4">
                          <span className="text-sm text-[var(--text-2)]">{row.label}</span>
                          <span className="text-sm font-semibold text-[var(--text-1)] capitalize">{row.value}</span>
                        </div>
                      ))}
                      {persona.instructions && (
                        <div className="section-surface p-4">
                          <div className="text-xs text-[var(--text-3)] mb-2">Custom instructions</div>
                          <p className="text-sm text-[var(--text-2)] leading-6">{persona.instructions}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* ── Navigation Builder ── */}
          {activeSection === 'navigation' ? (
            <div className="ds-section-wrap">
              <div className="ds-page-header-simple">
                <h1 className="ds-page-title">Navigation Builder</h1>
                <p className="ds-page-subtitle">Add quick-link buttons to your chat widget navigation bar.</p>
              </div>

              {!planLimits.hasNavigation ? (
                <div className="ds-plan-gate">
                  <Lock className="h-8 w-8 text-[var(--text-3)]" />
                  <p className="text-sm font-semibold text-[var(--text-2)]">Navigation Builder is available on PRO and above</p>
                  <button type="button" className="ds-upgrade-cta" onClick={() => navigateTo('plan')}>View Plans</button>
                </div>
              ) : (
                <div className="ds-two-col">
                  <div className="section-surface p-6">
                    <h2 className="mb-5 text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">Add navigation item</h2>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[var(--text-2)]">Label</Label>
                        <input
                          className="h-11 w-full rounded-xl border border-white/10 bg-[color:var(--surface)] px-3.5 text-sm text-[var(--text-1)] outline-none"
                          placeholder="e.g. Pricing"
                          value={navForm.label}
                          onChange={(e) => setNavForm((f) => ({ ...f, label: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[var(--text-2)]">URL</Label>
                        <input
                          className="h-11 w-full rounded-xl border border-white/10 bg-[color:var(--surface)] px-3.5 text-sm text-[var(--text-1)] outline-none"
                          placeholder="https://example.com/pricing"
                          value={navForm.url}
                          onChange={(e) => setNavForm((f) => ({ ...f, url: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[var(--text-2)]">Icon (emoji or text)</Label>
                        <input
                          className="h-11 w-full rounded-xl border border-white/10 bg-[color:var(--surface)] px-3.5 text-sm text-[var(--text-1)] outline-none"
                          placeholder="💰"
                          value={navForm.icon || ''}
                          onChange={(e) => setNavForm((f) => ({ ...f, icon: e.target.value }))}
                        />
                      </div>
                      <Button className="w-full" onClick={handleAddNavItem} disabled={isSavingNav}>
                        <Plus className="h-4 w-4" />
                        {isSavingNav ? 'Adding...' : 'Add item'}
                      </Button>
                    </div>
                  </div>

                  <div className="section-surface p-6">
                    <div className="mb-5 flex items-center justify-between">
                      <h2 className="text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">Navigation items</h2>
                      <span className="dashboard-chip">{navItems.length} / 10</span>
                    </div>
                    {navItems.length === 0 ? (
                      <div className="dashboard-empty">No items yet. Add links to show in your widget navigation.</div>
                    ) : (
                      <div className="ds-nav-builder">
                        {navItems.map((item, index) => (
                          <div key={item.id || index} className="ds-nav-builder-item">
                            <GripVertical className="h-4 w-4 text-[var(--text-3)] shrink-0" />
                            <span className="text-lg leading-none">{item.icon || '🔗'}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-[var(--text-1)] truncate">{item.label}</div>
                              <div className="text-xs text-[var(--text-3)] truncate">{item.url}</div>
                            </div>
                            <button
                              type="button"
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--text-3)] hover:text-red-400 transition-colors"
                              onClick={() => void handleRemoveNavItem(index)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* ── Branding ── */}
          {activeSection === 'branding' ? (
            <div className="ds-section-wrap">
              <div className="ds-page-header-simple">
                <h1 className="ds-page-title">Branding</h1>
                <p className="ds-page-subtitle">White-label the widget and dashboard with your brand.</p>
              </div>

              <div className="ds-two-col">
                <div className="section-surface p-6">
                  <h2 className="mb-5 text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">Widget branding</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[var(--surface)] p-4">
                      <div>
                        <div className="text-sm font-semibold text-[var(--text-1)]">Hide &ldquo;Powered by KonvoqAI&rdquo;</div>
                        <div className="text-xs text-[var(--text-3)] mt-0.5">Remove the footer branding from your widget</div>
                      </div>
                      {!planLimits.hideBranding ? (
                        <div className="flex items-center gap-2 text-xs text-[var(--text-3)]">
                          <Lock className="h-3.5 w-3.5" />
                          PRO+
                        </div>
                      ) : (
                        <button
                          type="button"
                          className={`relative h-6 w-11 rounded-full transition-colors ${brandingForm.hideBranding ? 'bg-[var(--accent-strong)]' : 'bg-white/15'}`}
                          onClick={() => setBrandingForm((b) => ({ ...b, hideBranding: !b.hideBranding }))}
                        >
                          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${brandingForm.hideBranding ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 border-t border-white/8 pt-6">
                    <h2 className="mb-5 text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">Dashboard branding</h2>
                    {!planLimits.hideBranding ? (
                      <div className="ds-plan-gate-inline">
                        <Lock className="h-4 w-4 text-[var(--text-3)]" />
                        <span className="text-sm text-[var(--text-3)]">Available on PRO and above</span>
                        <button type="button" className="ds-upgrade-cta-sm" onClick={() => navigateTo('plan')}>Upgrade</button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-[var(--text-2)]">Dashboard name</Label>
                          <input
                            className="h-11 w-full rounded-xl border border-white/10 bg-[color:var(--surface)] px-3.5 text-sm text-[var(--text-1)] outline-none"
                            placeholder="Acme Support"
                            value={brandingForm.dashboardName || ''}
                            onChange={(e) => setBrandingForm((b) => ({ ...b, dashboardName: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-[var(--text-2)]">Logo URL</Label>
                          <input
                            className="h-11 w-full rounded-xl border border-white/10 bg-[color:var(--surface)] px-3.5 text-sm text-[var(--text-1)] outline-none"
                            placeholder="https://cdn.example.com/logo.png"
                            value={brandingForm.dashboardLogo || ''}
                            onChange={(e) => setBrandingForm((b) => ({ ...b, dashboardLogo: e.target.value }))}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <Button className="mt-6 w-full" onClick={handleSaveBranding} disabled={isSavingBranding || !planLimits.hideBranding}>
                    {isSavingBranding ? 'Saving...' : 'Save branding'}
                  </Button>
                </div>

                <div className="section-surface p-6">
                  <h2 className="mb-5 text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">Current settings</h2>
                  <div className="space-y-3">
                    {[
                      { label: 'Hide branding', value: branding.hideBranding ? 'Yes' : 'No' },
                      { label: 'Dashboard name', value: branding.dashboardName || '—' },
                      { label: 'Logo URL', value: branding.dashboardLogo ? 'Configured' : '—' },
                    ].map((row) => (
                      <div key={row.label} className="section-surface flex items-center justify-between p-4">
                        <span className="text-sm text-[var(--text-2)]">{row.label}</span>
                        <span className="text-sm font-semibold text-[var(--text-1)]">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* ── CRM Pipeline ── */}
          {activeSection === 'crm' ? (
            <div className="ds-section-wrap">
              <div className="ds-page-header-simple">
                <h1 className="ds-page-title">CRM Pipeline</h1>
                <p className="ds-page-subtitle">Manage your leads through the sales pipeline.</p>
              </div>

              {!planLimits.hasCRM ? (
                <div className="ds-plan-gate">
                  <Lock className="h-8 w-8 text-[var(--text-3)]" />
                  <p className="text-sm font-semibold text-[var(--text-2)]">CRM Pipeline is available on PRO and above</p>
                  <button type="button" className="ds-upgrade-cta" onClick={() => navigateTo('plan')}>View Plans</button>
                </div>
              ) : (
                <div>
                  {activeCrmLead ? (
                    <div className="section-surface p-6 mb-6">
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-muted)] text-[var(--accent-strong)] text-sm font-bold">
                            {(activeCrmLead.name || activeCrmLead.email || 'L')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-[var(--text-1)]">{activeCrmLead.name || activeCrmLead.email || 'Lead'}</div>
                            <div className="text-xs text-[var(--text-3)]">{activeCrmLead.email}</div>
                          </div>
                        </div>
                        <button type="button" className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-[var(--text-3)] hover:text-[var(--text-1)]" onClick={() => setActiveCrmLead(null)}>
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-[var(--text-2)]">Pipeline stage</Label>
                          <select
                            className="h-11 w-full rounded-xl border border-white/10 bg-[color:var(--surface)] px-3.5 text-sm text-[var(--text-1)] outline-none"
                            value={activeCrmLead.pipelineStage || 'new'}
                            onChange={(e) => {
                              const updated = { ...activeCrmLead, pipelineStage: e.target.value };
                              setActiveCrmLead(updated);
                              setLeads((prev) => prev.map((l) => l.id === activeCrmLead.id ? updated : l));
                              void apiClient.put(`/dashboard/leads/${activeCrmLead.id}/pipeline`, { pipelineStage: e.target.value }).catch(() => { });
                            }}
                          >
                            {['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'].map((s) => (
                              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-[var(--text-2)]">Notes</Label>
                          <textarea
                            className="w-full rounded-xl border border-white/10 bg-[color:var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text-1)] outline-none resize-none"
                            rows={4}
                            placeholder="Add notes about this lead..."
                            value={activeCrmLead.crmNotes || ''}
                            onChange={(e) => setActiveCrmLead((l) => l ? { ...l, crmNotes: e.target.value } : l)}
                            onBlur={() => {
                              if (!activeCrmLead) return;
                              void apiClient.put(`/dashboard/leads/${activeCrmLead.id}/pipeline`, { crmNotes: activeCrmLead.crmNotes }).catch(() => { });
                              setLeads((prev) => prev.map((l) => l.id === activeCrmLead.id ? activeCrmLead : l));
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="ds-kanban">
                    {['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'].map((stage) => {
                      const stageLeads = leads.filter((l) => (l.pipelineStage || 'new') === stage);
                      const stageColors: Record<string, string> = { new: '#6b7280', contacted: '#3b82f6', qualified: '#8b5cf6', proposal: '#f59e0b', won: '#22c55e', lost: '#ef4444' };
                      return (
                        <div key={stage} className="ds-kanban-col">
                          <div className="ds-kanban-col-header">
                            <span className="ds-kanban-col-dot" style={{ background: stageColors[stage] }} />
                            <span className="text-xs font-semibold text-[var(--text-2)] capitalize">{stage}</span>
                            <span className="ds-nav-count">{stageLeads.length}</span>
                          </div>
                          <div className="ds-kanban-cards">
                            {stageLeads.length === 0 ? (
                              <div className="text-xs text-[var(--text-3)] px-2 py-3 text-center">Empty</div>
                            ) : (
                              stageLeads.map((lead) => (
                                <button
                                  key={lead.id}
                                  type="button"
                                  className="ds-kanban-card"
                                  data-active={activeCrmLead?.id === lead.id}
                                  onClick={() => setActiveCrmLead(lead)}
                                >
                                  <div className="text-sm font-semibold text-[var(--text-1)] truncate">{lead.name || lead.email || 'Lead'}</div>
                                  {lead.email && <div className="text-xs text-[var(--text-3)] truncate mt-0.5">{lead.email}</div>}
                                  <div className="mt-2 text-xs text-[var(--text-3)]">{formatDate(lead.createdAt)}</div>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* ── Inbox ── */}
          {activeSection === 'inbox' ? (
            <div className="ds-section-wrap">
              <div className="ds-page-header-simple">
                <h1 className="ds-page-title">Inbox</h1>
                <p className="ds-page-subtitle">Handle live visitor handoffs when they request a human agent.</p>
              </div>

              {!planLimits.hasHybrid ? (
                <div className="ds-plan-gate">
                  <Lock className="h-8 w-8 text-[var(--text-3)]" />
                  <p className="text-sm font-semibold text-[var(--text-2)]">Hybrid AI+Human Inbox is available on PRO and above</p>
                  <button type="button" className="ds-upgrade-cta" onClick={() => navigateTo('plan')}>View Plans</button>
                </div>
              ) : (
                <div className="ds-two-col">
                  <div className="section-surface p-6">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="dashboard-chip">{handoffs.filter(h => h.status === 'pending').length} pending</div>
                      <select
                        className="rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text-1)] outline-none"
                        value={inboxStatusFilter}
                        onChange={(e) => { setInboxStatusFilter(e.target.value); void loadInbox(e.target.value); }}
                      >
                        <option value="all">All</option>
                        <option value="pending">Pending</option>
                        <option value="claimed">Claimed</option>
                        <option value="resolved">Resolved</option>
                      </select>
                      <Button variant="ghost" size="sm" onClick={() => void loadInbox(inboxStatusFilter)}>
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {handoffs.length === 0 ? (
                      <div className="dashboard-empty">No handoff requests yet. They appear here when visitors click &ldquo;Talk to a human&rdquo;.</div>
                    ) : (
                      <div className="space-y-3">
                        {handoffs.map((h) => (
                          <button
                            key={h.id}
                            type="button"
                            className="ds-inbox-item"
                            data-active={activeHandoff?.id === h.id}
                            onClick={() => { setActiveHandoff(h); void loadHandoffMessages(h.id); }}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="text-sm font-semibold text-[var(--text-1)]">{h.visitorName || h.visitorEmail || 'Visitor'}</div>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${h.status === 'pending' ? 'bg-amber-500/15 text-amber-400' : h.status === 'claimed' ? 'bg-blue-500/15 text-blue-400' : 'bg-white/8 text-[var(--text-3)]'}`}>
                                {h.status}
                              </span>
                            </div>
                            {h.triggerReason && <p className="text-xs text-[var(--text-3)] text-left">{h.triggerReason}</p>}
                            <div className="text-xs text-[var(--text-3)] mt-1">{formatDateTime(h.createdAt)}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="section-surface p-6 flex flex-col">
                    {activeHandoff ? (
                      <>
                        <div className="mb-4 flex items-center justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold text-[var(--text-1)]">{activeHandoff.visitorName || activeHandoff.visitorEmail || 'Visitor'}</div>
                            <div className="text-xs text-[var(--text-3)] capitalize">{activeHandoff.status}</div>
                          </div>
                          <div className="flex gap-2">
                            {activeHandoff.status === 'pending' && (
                              <Button size="sm" onClick={() => void handleClaimHandoff(activeHandoff.id)}>Claim</Button>
                            )}
                            {activeHandoff.status !== 'resolved' && (
                              <Button size="sm" variant="outline" onClick={() => void handleResolveHandoff(activeHandoff.id)}>Resolve</Button>
                            )}
                          </div>
                        </div>

                        <div className="ds-thread flex-1 mb-4">
                          {handoffMessages.length === 0 ? (
                            <div className="text-xs text-[var(--text-3)] text-center py-4">No messages yet</div>
                          ) : (
                            handoffMessages.map((msg, i) => (
                              <div key={msg.id || i} className={`ds-thread-msg ${msg.senderType === 'agent' ? 'ds-thread-msg--agent' : ''}`}>
                                <div className="ds-thread-msg-label">{msg.senderType === 'agent' ? 'You' : 'Visitor'}</div>
                                <div className="ds-thread-msg-content">{msg.content}</div>
                              </div>
                            ))
                          )}
                        </div>

                        {activeHandoff.status !== 'resolved' && (
                          <div className="flex gap-2">
                            <input
                              className="flex-1 h-10 rounded-xl border border-white/10 bg-[color:var(--surface)] px-3.5 text-sm text-[var(--text-1)] outline-none"
                              placeholder="Type a reply..."
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSendReply(); } }}
                            />
                            <Button size="sm" onClick={handleSendReply} disabled={isSendingReply || !replyText.trim()}>
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="dashboard-empty flex-1">Select a handoff request to view the conversation.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* ── Flows ── */}
          {activeSection === 'flows' ? (
            <div className="ds-section-wrap">
              <div className="ds-page-header-simple">
                <h1 className="ds-page-title">Conversation Flows</h1>
                <p className="ds-page-subtitle">Build step-by-step conversation scripts for your chatbot.</p>
              </div>

              {!planLimits.hasFlows ? (
                <div className="ds-plan-gate">
                  <Lock className="h-8 w-8 text-[var(--text-3)]" />
                  <p className="text-sm font-semibold text-[var(--text-2)]">Conversation Flows are available on PRO and above</p>
                  <button type="button" className="ds-upgrade-cta" onClick={() => navigateTo('plan')}>View Plans</button>
                </div>
              ) : (
                <div className="ds-two-col">
                  <div className="section-surface p-6">
                    <div className="mb-5 flex items-center justify-between gap-4">
                      <h2 className="text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">Flows</h2>
                      <span className="dashboard-chip">{flows.length}</span>
                    </div>

                    <div className="mb-4 flex gap-2">
                      <input
                        className="flex-1 h-10 rounded-xl border border-white/10 bg-[color:var(--surface)] px-3.5 text-sm text-[var(--text-1)] outline-none"
                        placeholder="Flow name..."
                        value={newFlowName}
                        onChange={(e) => setNewFlowName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') void handleCreateFlow(); }}
                      />
                      <Button size="sm" onClick={handleCreateFlow} disabled={isCreatingFlow}>
                        <Plus className="h-3.5 w-3.5" />
                        {isCreatingFlow ? '...' : 'New'}
                      </Button>
                    </div>

                    {flows.length === 0 ? (
                      <div className="dashboard-empty">Create your first conversation flow.</div>
                    ) : (
                      <div className="space-y-3">
                        {flows.map((flow) => (
                          <button
                            key={flow.id}
                            type="button"
                            className="section-surface w-full p-4 text-left"
                            style={{ background: activeFlow?.id === flow.id ? 'linear-gradient(160deg, color-mix(in srgb, var(--accent-muted) 82%, var(--surface-2) 18%) 0%, color-mix(in srgb, var(--surface) 92%, transparent) 100%)' : undefined }}
                            onClick={() => setActiveFlow(flow)}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <GitBranch className="h-3.5 w-3.5 shrink-0 text-[var(--accent-strong)]" />
                                <span className="text-sm font-semibold text-[var(--text-1)] truncate">{flow.name}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${flow.isActive ? 'bg-green-500/15 text-green-400' : 'bg-white/8 text-[var(--text-3)]'}`}
                                  onClick={(e) => { e.stopPropagation(); void handleToggleFlowActive(flow); }}
                                >
                                  {flow.isActive ? 'Active' : 'Inactive'}
                                </button>
                                <button
                                  type="button"
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-3)] hover:text-red-400 transition-colors"
                                  onClick={(e) => { e.stopPropagation(); void handleDeleteFlow(flow.id); }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            <div className="mt-1 text-xs text-[var(--text-3)]">{(flow.flowData?.nodes || []).length} nodes · {formatDate(flow.updatedAt || flow.createdAt)}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="section-surface p-6">
                    {activeFlow ? (
                      <>
                        <div className="mb-5 flex items-center justify-between gap-4">
                          <div>
                            <h2 className="text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">{activeFlow.name}</h2>
                            <p className="text-xs text-[var(--text-3)] mt-0.5">{(activeFlow.flowData?.nodes || []).length} nodes</p>
                          </div>
                          <Button size="sm" onClick={handleSaveFlow}>Save</Button>
                        </div>

                        <div className="space-y-3 mb-5">
                          {(activeFlow.flowData?.nodes || []).length === 0 ? (
                            <div className="dashboard-empty">Add nodes to build your flow.</div>
                          ) : (
                            (activeFlow.flowData?.nodes || []).map((node, idx) => (
                              <div key={node.id} className="ds-flow-node">
                                <div className="ds-flow-node-header">
                                  <span className="ds-flow-node-index">{idx + 1}</span>
                                  <span className="ds-flow-node-type">{node.type.toUpperCase()}</span>
                                  <button
                                    type="button"
                                    className="ml-auto flex h-6 w-6 items-center justify-center rounded text-[var(--text-3)] hover:text-red-400 transition-colors"
                                    onClick={() => handleRemoveFlowNode(node.id)}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                                <textarea
                                  className="w-full rounded-xl border border-white/10 bg-[color:var(--surface)] px-3 py-2 text-sm text-[var(--text-1)] outline-none resize-none"
                                  rows={2}
                                  placeholder={
                                    node.type === 'message' ? 'Bot says...'
                                      : node.type === 'condition' ? 'If input contains...'
                                        : node.type === 'collect' ? 'Collect field (e.g. email)'
                                          : node.type === 'handoff' ? 'Handoff reason...'
                                            : 'Webhook URL'
                                  }
                                  value={node.content || ''}
                                  onChange={(e) => handleUpdateFlowNodeContent(node.id, e.target.value)}
                                />
                              </div>
                            ))
                          )}
                        </div>

                        <div className="border-t border-white/8 pt-4">
                          <p className="text-xs text-[var(--text-3)] mb-3">Add node</p>
                          <div className="flex flex-wrap gap-2">
                            {(['message', 'condition', 'collect', 'handoff', 'action'] as FlowNode['type'][]).map((type) => (
                              <button
                                key={type}
                                type="button"
                                className="text-xs px-3 py-1.5 rounded-lg border border-white/10 bg-[var(--surface)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:border-white/20 transition-colors capitalize"
                                onClick={() => void handleAddFlowNode(type)}
                              >
                                + {type}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="dashboard-empty">Select a flow to edit its nodes.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}

        </main>
      </div>
    </div>
  );
}
