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
  Crown,
  FileText,
  GitBranch,
  Globe2,
  GripVertical,
  Inbox,
  Key,
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
  Trash2,
  Upload,
  User,
  Users,
  Webhook,
  X,
  Zap,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

// ─── Section types ──────────────────────────────────────────────────────────

type DashboardSection =
  | 'overview'
  | 'sources'
  | 'widget'
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
};

// ─── Section registry ─────────────────────────────────────────────────────────

const sections: Array<{
  id: DashboardSection;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'overview',    label: 'Overview',       icon: LayoutDashboard },
  { id: 'widget',      label: 'Craft Console',  icon: Settings2 },
  { id: 'persona',     label: 'Persona',        icon: Bot },
  { id: 'navigation',  label: 'Navigation',     icon: Navigation2 },
  { id: 'flows',       label: 'Flows',          icon: GitBranch },
  { id: 'branding',    label: 'Branding',       icon: Palette },
  { id: 'sources',     label: 'Data Sources',   icon: BookOpenText },
  { id: 'chat',        label: 'Chat History',   icon: MessagesSquare },
  { id: 'leads',       label: 'Leads',          icon: Users },
  { id: 'crm',         label: 'CRM Pipeline',   icon: BarChart3 },
  { id: 'inbox',       label: 'Inbox',          icon: Inbox },
  { id: 'feedback',    label: 'Feedback',       icon: MessageSquare },
  { id: 'settings',    label: 'Settings',       icon: User },
  { id: 'plan',        label: 'Plan & Billing', icon: Crown },
];

type AppGroup = 'overview' | 'conversations' | 'knowledge' | 'aiconfig';

const appGroups: Array<{
  id: AppGroup;
  icon: typeof LayoutDashboard;
  label: string;
  sections: DashboardSection[];
}> = [
  { id: 'overview',      icon: LayoutDashboard, label: 'Overview',      sections: ['overview'] },
  { id: 'conversations', icon: MessagesSquare,  label: 'Conversations', sections: ['chat', 'feedback', 'leads', 'crm', 'inbox'] },
  { id: 'knowledge',     icon: BookOpenText,    label: 'Knowledge',     sections: ['sources'] },
  { id: 'aiconfig',      icon: Bot,             label: 'AI Config',     sections: ['widget', 'persona', 'navigation', 'flows', 'branding'] },
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

export function DashboardApp() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const { logout } = useLogout();

  // Navigation
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview');
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

  // Chat
  const [chatSessions, setChatSessions] = useState<ChatSessionSummary[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loadingChatId, setLoadingChatId] = useState<string | null>(null);
  const [chatSearch, setChatSearch] = useState('');
  const [chatStatusFilter, setChatStatusFilter] = useState('all');

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
  const [leadsTab, setLeadsTab] = useState<'list' | 'webhook' | 'followup'>('list');

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
    if (activeSection === 'inbox') void loadInbox(inboxStatusFilter);
    if (activeSection === 'flows') void loadFlows();
    if (activeSection === 'leads') void loadFollowUp();
  }, [activeSection, loadSettingsData, loadWebhook, loadPersona, loadNavigation, loadBranding, loadInbox, inboxStatusFilter, loadFlows, loadFollowUp]);

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

  const planType = (usage.planType || user?.plan_type || 'free').toString();
  const workspaceName = user?.fullName || user?.email?.split('@')[0] || 'Workspace';
  const userInitial = (user?.fullName || user?.email || 'U')[0].toUpperCase();
  const activeGroup = appGroups.find((g) => g.sections.includes(activeSection))?.id ?? 'overview';

  // Filtered chat sessions
  const filteredChatSessions = chatSessions.filter((s) => {
    const matchSearch = !chatSearch || (s.lastMessagePreview || '').toLowerCase().includes(chatSearch.toLowerCase());
    const matchStatus = chatStatusFilter === 'all' || (s.status || 'active') === chatStatusFilter;
    return matchSearch && matchStatus;
  });

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
                <button type="button" className="ds-user-menu-item" onClick={() => { setActiveSection('settings'); setShowUserMenu(false); }}>
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
                    if (activeGroup !== group.id || activeSection === 'settings') setActiveSection(group.sections[0]);
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
              onClick={() => setActiveSection('plan')}
            >
              <Crown className="h-[18px] w-[18px]" />
            </button>
            <button
              type="button"
              className="ds-rail-item"
              data-active={activeSection === 'settings'}
              title="Settings"
              onClick={() => setActiveSection('settings')}
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
                    onClick={() => setActiveSection(sectionId)}
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

          {/* ── Overview ── */}
          {activeSection === 'overview' ? (
            <div className="ds-section-wrap">
              <div className="ds-page-header">
                <div className="ds-page-header-simple">
                  <h1 className="ds-page-title">Dashboard Overview</h1>
                  <p className="ds-page-subtitle">Live performance metrics and activity trends.</p>
                </div>
                <div className="ds-chatbot-pill">
                  <span className="ds-active-label">● Active</span>
                </div>
              </div>

              <div className="ds-metric-grid">
                {[
                  { label: 'Knowledge Pages', value: formatNumber(stats.scrapedPages), desc: 'Total pages indexed for RAG', icon: BookOpenText },
                  { label: 'Messages', value: formatNumber(analytics.widgetMessages), desc: 'Total messages exchanged', icon: MessageSquare },
                  { label: 'Leads Captured', value: formatNumber(leads.length || analytics.leads), desc: 'Visitors who left contact info', icon: Users },
                  { label: 'Total Sessions', value: formatNumber(analytics.chatSessions), desc: 'Chatbot sessions this period', icon: MessagesSquare },
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

              <div className="ds-analytics-grid">
                {[
                  { label: 'Active Days (7d)', value: formatNumber(activeDays7d), desc: 'Days with widget events', icon: Activity },
                  { label: 'Widget Views', value: formatNumber(analytics.widgetViews), desc: 'Widget load events', icon: BarChart3 },
                  { label: 'Ratings', value: formatNumber(analytics.totalRatings), desc: 'Visitor satisfaction ratings', icon: Zap },
                  {
                    label: 'Quota Used',
                    value: usageLimit ? `${usagePercent}%` : '∞',
                    desc: usageRemaining === null || usageRemaining === undefined
                      ? 'Unlimited plan'
                      : `${formatNumber(usageRemaining)} remaining`,
                    icon: BarChart3,
                  },
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
              ) : null}

              <div className="ds-chart-card">
                <div className="ds-chart-header">
                  <Activity className="h-4 w-4 text-[var(--accent-strong)]" />
                  <h2 className="ds-chart-title">Last 7 Days Activity</h2>
                </div>
                <ActivityChart data={chartData} />
              </div>
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
            <div className="ds-section-wrap">
              <div className="ds-page-header-simple">
                <h1 className="ds-page-title">Craft Console</h1>
                <p className="ds-page-subtitle">Configure your widget appearance, security, and get the install script.</p>
              </div>
              <div className="ds-two-col">
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

                <div className="space-y-5">
                  {/* Preview */}
                  <div className="section-surface p-6">
                    <div className="mb-5">
                      <h2 className="mb-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">Live preview</h2>
                    </div>
                    <div
                      className="relative overflow-hidden rounded-[28px] border border-white/10 p-5 shadow-[var(--shadow-card)]"
                      style={{ background: `radial-gradient(circle at top, ${widgetConfig.primaryColor}22, transparent 40%), ${widgetConfig.backgroundColor}` }}
                    >
                      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/8 to-transparent" />
                      <div className="relative space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: widgetConfig.primaryColor, color: widgetConfig.textColor }}>
                              {widgetConfig.logoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={widgetConfig.logoUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
                              ) : (
                                <Bot className="h-5 w-5" />
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-semibold" style={{ color: widgetConfig.textColor }}>{widgetConfig.botName}</div>
                              <div className="text-xs text-white/50">Live support assistant</div>
                            </div>
                          </div>
                          <div className="dashboard-chip">Preview</div>
                        </div>
                        <div className="space-y-3">
                          <div className="max-w-[86%] rounded-[24px] px-4 py-3" style={{ background: 'rgba(255,255,255,0.08)', color: widgetConfig.textColor, fontSize: widgetConfig.fontSize, borderRadius: widgetConfig.borderRadius }}>
                            {widgetConfig.welcomeMessage}
                          </div>
                          <div className="ml-auto max-w-[72%] rounded-[24px] px-4 py-3" style={{ background: widgetConfig.primaryColor, color: widgetConfig.textColor, fontSize: widgetConfig.fontSize, borderRadius: widgetConfig.borderRadius }}>
                            Can you help me with pricing?
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Widget key & embed */}
                  <div className="section-surface p-6">
                    <div className="mb-5">
                      <h2 className="mb-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">Install</h2>
                    </div>
                    <div className="space-y-3">
                      <div className="section-surface flex items-center justify-between p-4">
                        <span className="text-sm text-[var(--text-2)]">Widget key</span>
                        <span className="font-mono text-xs text-[var(--text-1)]">{widget?.widgetKey || '—'}</span>
                      </div>
                    </div>

                    {embedCode ? (
                      <div className="mt-4">
                        <pre className="dashboard-code-block mb-3">{embedCode}</pre>
                        <div className="flex gap-2">
                          <Button variant="outline" className="flex-1" onClick={async () => { await navigator.clipboard.writeText(embedCode); toast.success('Copied'); }}>
                            <Copy className="h-4 w-4" />
                            Copy script
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 dashboard-empty">Save widget to generate the embed script.</div>
                    )}

                    {widget?.widgetKey ? (
                      <div className="mt-4 border-t border-white/8 pt-4">
                        <Button variant="ghost" className="w-full text-[var(--text-3)]" onClick={handleRegenerateKey} disabled={isRegeneratingKey}>
                          <Key className="h-4 w-4" />
                          {isRegeneratingKey ? 'Regenerating...' : 'Regenerate widget key'}
                        </Button>
                        <p className="mt-2 text-center text-xs text-[var(--text-3)]">Old embed scripts will break until updated</p>
                      </div>
                    ) : null}
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
                  <div className="mb-4 flex items-center gap-3">
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
                      <option value="closed">Closed</option>
                    </select>
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

                  {leads.length === 0 ? (
                    <div className="dashboard-empty">Leads captured from the widget will appear here.</div>
                  ) : (
                    <div className="space-y-3">
                      {leads.map((lead) => (
                        <div key={lead.id} className="section-surface p-5">
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
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
                        <button type="button" className="ds-upgrade-cta-sm" onClick={() => setActiveSection('plan')}>Upgrade</button>
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
                  <button type="button" className="ds-upgrade-cta" onClick={() => setActiveSection('plan')}>View Plans</button>
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
                  <button type="button" className="ds-upgrade-cta" onClick={() => setActiveSection('plan')}>View Plans</button>
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
                        <button type="button" className="ds-upgrade-cta-sm" onClick={() => setActiveSection('plan')}>Upgrade</button>
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
                  <button type="button" className="ds-upgrade-cta" onClick={() => setActiveSection('plan')}>View Plans</button>
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
                              void apiClient.put(`/dashboard/leads/${activeCrmLead.id}/pipeline`, { pipelineStage: e.target.value }).catch(() => {});
                            }}
                          >
                            {['new','contacted','qualified','proposal','won','lost'].map((s) => (
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
                              void apiClient.put(`/dashboard/leads/${activeCrmLead.id}/pipeline`, { crmNotes: activeCrmLead.crmNotes }).catch(() => {});
                              setLeads((prev) => prev.map((l) => l.id === activeCrmLead.id ? activeCrmLead : l));
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="ds-kanban">
                    {['new','contacted','qualified','proposal','won','lost'].map((stage) => {
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
                  <button type="button" className="ds-upgrade-cta" onClick={() => setActiveSection('plan')}>View Plans</button>
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
                              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSendReply(); }}}
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
                  <button type="button" className="ds-upgrade-cta" onClick={() => setActiveSection('plan')}>View Plans</button>
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
