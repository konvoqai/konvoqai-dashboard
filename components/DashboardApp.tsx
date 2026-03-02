'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api/axios-instance';
import { useLogout, useUser } from '@/lib/auth/auth-hooks';
import {
  Activity,
  Bot,
  ChevronRight,
  ClipboardList,
  Code2,
  Copy,
  History,
  Link2,
  LogOut,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionKey = 'overview' | 'sources' | 'widget' | 'embed' | 'chat' | 'feedback';

const sections: { key: SectionKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'overview', label: 'Overview', icon: Activity },
  { key: 'sources', label: 'Sources', icon: Link2 },
  { key: 'widget', label: 'Widget', icon: Bot },
  { key: 'embed', label: 'Embed', icon: Code2 },
  { key: 'chat', label: 'Chat History', icon: History },
  { key: 'feedback', label: 'Feedback', icon: ClipboardList },
];

const defaultWidgetConfig = {
  primaryColor: '#fc0e3f',
  backgroundColor: '#120b14',
  textColor: '#ffffff',
  botName: 'Konvoq AI',
  welcomeMessage: 'Welcome to your live widget preview.',
  logoUrl: '',
  position: 'bottom-right',
  borderRadius: 24,
  fontSize: 14,
};

const widgetPreviewURL = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'}/widget/preview`;

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface UsageEnvelope {
  user?: {
    fullName?: string | null;
    email?: string;
    plan_type?: 'free' | 'basic' | 'enterprise';
  };
  usage?: {
    conversationsUsed?: number;
    conversationsLimit?: number | null;
    conversationsRemaining?: number | null;
  };
  stats?: {
    scrapedPages?: number;
    documents?: number;
  };
}

interface OverviewPayload {
  analytics?: Record<string, number>;
  usage?: Record<string, number | null | string>;
  stats?: Record<string, number>;
  widgetAnalytics?: Array<Record<string, unknown>>;
}

interface SourceItem {
  id: string;
  url: string;
  scrapedPages?: number;
  createdAt: string;
}

interface DocumentItem {
  id: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
}

interface ChatSessionItem {
  id: string;
  messageCount?: number;
  lastMessageAt?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant' | string;
  content: string;
  createdAt?: string;
}

interface ChatDetail {
  id: string;
  messages: ChatMessage[];
}

interface FeedbackItem {
  id: string;
  type?: string;
  title?: string | null;
  message: string;
  pagePath?: string | null;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';
}

function getInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  );
}

function fmtBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

function getErrorMessage(error: unknown, fallback: string) {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

// ─── Animation variants ───────────────────────────────────────────────────────

const pageAnim = {
  enter: { opacity: 0, x: 14 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -8 },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.065, delayChildren: 0.04 } },
};

const slideUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.26, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.28 } },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardApp() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const { logout } = useLogout();

  const [activeSection, setActiveSection] = useState<SectionKey>('overview');
  const [usageEnvelope, setUsageEnvelope] = useState<UsageEnvelope>({});
  const [isBusy, setIsBusy] = useState(false);

  const [overview, setOverview] = useState<OverviewPayload | null>(null);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [sourcesStats, setSourcesStats] = useState<Record<string, number> | null>(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  const [widgetConfig, setWidgetConfig] = useState(defaultWidgetConfig);
  const [widgetName, setWidgetName] = useState('My Chat Widget');
  const [iframeReady, setIframeReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const [embedPayload, setEmbedPayload] = useState<{ script?: string; installSteps?: string[] } | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSessionItem[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatDetail | null>(null);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);

  const profileName = user?.fullName || usageEnvelope.user?.fullName || user?.email || 'User';
  const planType = user?.plan_type || usageEnvelope.user?.plan_type || 'free';

  const conversationsRemaining = usageEnvelope.usage?.conversationsRemaining;
  const conversationsUsed = usageEnvelope.usage?.conversationsUsed ?? 0;
  const conversationsLimit = usageEnvelope.usage?.conversationsLimit ?? null;
  const conversationProgress = useMemo(() => {
    if (!conversationsLimit || conversationsLimit <= 0) return 0;
    return Math.min(100, Math.round((conversationsUsed / conversationsLimit) * 100));
  }, [conversationsUsed, conversationsLimit]);

  const postWidgetConfig = useCallback(
    (config = widgetConfig) => {
      const target = iframeRef.current?.contentWindow;
      if (!target) return;
      const previewOrigin = new URL(widgetPreviewURL).origin;
      target.postMessage({ type: 'konvoq:widget-config', config }, previewOrigin);
    },
    [widgetConfig],
  );

  const refreshUsage = useCallback(async () => {
    const response = await apiClient.get('/dashboard/usage');
    setUsageEnvelope(response.data || {});
  }, []);

  const loadOverview = useCallback(async () => {
    const response = await apiClient.get('/dashboard/overview');
    setOverview(response.data || null);
  }, []);

  const loadSources = useCallback(async () => {
    const [sourcesRes, docsRes] = await Promise.all([
      apiClient.get('/dashboard/sources'),
      apiClient.get('/dashboard/documents'),
    ]);
    setSources(sourcesRes.data?.sources || []);
    setSourcesStats(sourcesRes.data?.stats || {});
    setDocuments(docsRes.data?.documents || []);
  }, []);

  const loadWidget = useCallback(async () => {
    const response = await apiClient.get('/dashboard/widget');
    const data = response.data?.widget;
    if (!data) return;
    setWidgetName(data.name || 'My Chat Widget');
    setWidgetConfig((prev) => ({ ...prev, ...(data.settings || {}) }));
  }, []);

  const loadEmbed = useCallback(async () => {
    const response = await apiClient.get('/dashboard/embed');
    setEmbedPayload(response.data || {});
  }, []);

  const loadChatSessions = useCallback(async () => {
    const response = await apiClient.get('/dashboard/chat-sessions');
    setChatSessions(response.data?.sessions || []);
  }, []);

  const loadFeedback = useCallback(async () => {
    const response = await apiClient.get('/dashboard/feedback');
    setFeedback(response.data?.feedback || []);
  }, []);

  const loadSection = useCallback(
    async (section: SectionKey) => {
      setIsBusy(true);
      try {
        if (section === 'overview') await loadOverview();
        if (section === 'sources') await loadSources();
        if (section === 'widget') await loadWidget();
        if (section === 'embed') await loadEmbed();
        if (section === 'chat') await loadChatSessions();
        if (section === 'feedback') await loadFeedback();
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, 'Failed to load section data'));
      } finally {
        setIsBusy(false);
      }
    },
    [loadOverview, loadSources, loadWidget, loadEmbed, loadChatSessions, loadFeedback],
  );

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    const bootstrap = async () => {
      const statusRes = await apiClient.get('/onboarding/status');
      if (statusRes.data?.shouldOnboard) {
        router.replace('/dashboard/setup');
        return;
      }
      await refreshUsage();
    };
    bootstrap().catch(() => undefined);
  }, [isLoading, user, router, refreshUsage]);

  useEffect(() => {
    if (!user) return;
    loadSection(activeSection).catch(() => undefined);
  }, [activeSection, user, loadSection]);

  useEffect(() => {
    if (!iframeReady) return;
    postWidgetConfig(widgetConfig);
  }, [widgetConfig, iframeReady, postWidgetConfig]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Logout failed'));
    }
  };

  const handleAddSource = async (e: FormEvent) => {
    e.preventDefault();
    if (!sourceUrl.trim()) {
      toast.error('Enter a valid URL');
      return;
    }
    try {
      await apiClient.post('/dashboard/sources', { url: sourceUrl.trim() });
      setSourceUrl('');
      toast.success('Scraping started');
      await Promise.all([loadSources(), refreshUsage()]);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to add source'));
    }
  };

  const handleDeleteSource = async (url: string) => {
    try {
      await apiClient.delete('/dashboard/sources', { params: { url } });
      toast.success('Source removed');
      await Promise.all([loadSources(), refreshUsage()]);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to delete source'));
    }
  };

  const handleUploadDocument = async (e: FormEvent) => {
    e.preventDefault();
    if (!documentFile) {
      toast.error('Select a document first');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('document', documentFile);
      await apiClient.post('/dashboard/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDocumentFile(null);
      toast.success('Document uploaded');
      await Promise.all([loadSources(), refreshUsage()]);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to upload document'));
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      await apiClient.delete(`/dashboard/documents/${id}`);
      toast.success('Document deleted');
      await Promise.all([loadSources(), refreshUsage()]);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to delete document'));
    }
  };

  const handleSaveWidget = async () => {
    try {
      await apiClient.put('/dashboard/widget', { name: widgetName, settings: widgetConfig });
      toast.success('Widget config saved');
      await Promise.all([loadWidget(), refreshUsage()]);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to save widget'));
    }
  };

  const handleLoadChat = async (id: string) => {
    try {
      const response = await apiClient.get(`/dashboard/chat-sessions/${id}`);
      setSelectedChat(response.data?.session || null);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to load conversation'));
    }
  };

  const copyEmbedCode = async () => {
    if (!embedPayload?.script) return;
    await navigator.clipboard.writeText(embedPayload.script);
    toast.success('Copied to clipboard');
  };

  // ─── Loading state ─────────────────────────────────────────────────────────

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-[#fc0e3f]" />
            <span className="text-sm font-bold tracking-tight text-slate-800">Konvoq</span>
            <span className="text-sm font-light text-slate-400">AI</span>
          </div>
          <div className="relative h-0.5 w-20 overflow-hidden rounded-full bg-slate-200">
            <motion.div
              className="absolute h-full rounded-full bg-[#fc0e3f]/70"
              style={{ width: '45%' }}
              animate={{ left: ['-45%', '100%'] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </div>
      </div>
    );
  }

  // ─── Layout ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside className="flex w-[240px] shrink-0 flex-col border-r border-slate-100 bg-white">

        {/* Brand */}
        <div className="flex h-14 shrink-0 items-center border-b border-slate-100 px-5">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-[#fc0e3f]" />
            <span className="text-sm font-bold tracking-tight">Konvoq</span>
            <span className="text-sm font-light text-slate-400">AI</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {sections.map((entry) => {
            const Icon = entry.icon;
            const active = activeSection === entry.key;
            return (
              <button
                key={entry.key}
                type="button"
                onClick={() => setActiveSection(entry.key)}
                className={`relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-all duration-150 ${
                  active
                    ? 'bg-slate-50 font-medium text-slate-900'
                    : 'text-slate-500 hover:bg-slate-50/70 hover:text-slate-700'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pip"
                    className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-[#fc0e3f]"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  className={`h-[15px] w-[15px] shrink-0 transition-colors ${
                    active ? 'text-slate-700' : 'text-slate-400'
                  }`}
                />
                {entry.label}
              </button>
            );
          })}
        </nav>

        {/* Usage quota */}
        <div className="mx-3 mb-3 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
          <div className="flex items-baseline justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Usage</p>
            {conversationsLimit ? (
              <p className="text-xs font-semibold text-slate-600">{conversationsRemaining ?? 0} left</p>
            ) : (
              <p className="text-xs font-semibold text-emerald-600">Unlimited</p>
            )}
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-200">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: conversationsLimit ? '#fc0e3f' : '#10b981' }}
              initial={{ width: 0 }}
              animate={{ width: conversationsLimit ? `${conversationProgress}%` : '100%' }}
              transition={{ duration: 0.9, ease: 'easeOut', delay: 0.3 }}
            />
          </div>
          {conversationsLimit && (
            <p className="mt-1.5 text-[10px] text-slate-400">
              {conversationsUsed} of {conversationsLimit} used
            </p>
          )}
        </div>

        {/* User */}
        <div className="border-t border-slate-100 px-3 pb-4 pt-3">
          <div className="group flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-slate-50">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900">
              <span className="text-[11px] font-bold text-white">{getInitials(profileName)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-slate-700">{profileName}</p>
              <p className="text-[10px] capitalize text-slate-400">{planType} plan</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              className="opacity-0 transition-opacity group-hover:opacity-100"
            >
              <LogOut className="h-3.5 w-3.5 text-slate-400 transition-colors hover:text-slate-700" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────────── */}
      <div className="relative flex-1 overflow-y-auto">

        {/* Top loading bar */}
        <AnimatePresence>
          {isBusy && (
            <motion.div
              key="busy-bar"
              className="fixed inset-x-0 top-0 z-50 h-[2px] overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="h-full rounded-full bg-[#fc0e3f]/60"
                initial={{ width: '0%' }}
                animate={{ width: '82%' }}
                transition={{ duration: 1.8, ease: 'easeInOut' }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mx-auto max-w-[900px] px-8 py-8">

          {/* ── Header ───────────────────────────────────────────────────────── */}
          <header className="mb-9">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              {sections.find((s) => s.key === activeSection)?.label}
            </p>
            <h1 className="text-[22px] font-bold tracking-tight text-slate-900">
              {activeSection === 'overview'
                ? `${getGreeting()}, ${profileName.split(/\s+/)[0]}.`
                : sections.find((s) => s.key === activeSection)?.label}
            </h1>
          </header>

          {/* ── Section panels ─────────────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              variants={pageAnim}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            >

              {/* ── Overview ─────────────────────────────────────────────── */}
              {activeSection === 'overview' && (
                <motion.div
                  className="grid grid-cols-4 gap-4"
                  variants={stagger}
                  initial="hidden"
                  animate="show"
                >
                  <motion.div
                    variants={scaleIn}
                    className="col-span-2 rounded-2xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-sm"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                      Conversations
                    </p>
                    <p className="mt-3 text-5xl font-black tabular-nums tracking-tight text-slate-900">
                      {overview?.analytics?.chatSessions ?? 0}
                    </p>
                    <p className="mt-1.5 text-xs text-slate-400">total sessions</p>
                  </motion.div>

                  <motion.div
                    variants={scaleIn}
                    className="rounded-2xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-sm"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                      Messages
                    </p>
                    <p className="mt-3 text-4xl font-black tabular-nums tracking-tight text-slate-900">
                      {overview?.analytics?.widgetMessages ?? 0}
                    </p>
                    <p className="mt-1.5 text-xs text-slate-400">via widget</p>
                  </motion.div>

                  <motion.div
                    variants={scaleIn}
                    className="rounded-2xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-sm"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                      Ratings
                    </p>
                    <p className="mt-3 text-4xl font-black tabular-nums tracking-tight text-slate-900">
                      {overview?.analytics?.totalRatings ?? 0}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <p className="text-xs text-slate-400">from users</p>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* ── Sources ──────────────────────────────────────────────── */}
              {activeSection === 'sources' && (
                <div className="space-y-5">

                  {/* Stats inline */}
                  {sourcesStats && (
                    <div className="flex items-center gap-6 pb-1">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                          Pages scraped
                        </p>
                        <p className="text-xl font-bold tabular-nums text-slate-900">
                          {sourcesStats.scrapedPages ?? 0}
                        </p>
                      </div>
                      <div className="h-8 w-px bg-slate-200" />
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                          Documents
                        </p>
                        <p className="text-xl font-bold tabular-nums text-slate-900">
                          {sourcesStats.documents ?? 0}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Add URL */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <h3 className="text-sm font-semibold text-slate-900">Add a website</h3>
                    <p className="mt-0.5 text-xs text-slate-400">
                      We&apos;ll crawl the URL and use it to train your bot automatically.
                    </p>
                    <form onSubmit={handleAddSource} className="mt-4 flex gap-2">
                      <Input
                        placeholder="https://your-website.com"
                        value={sourceUrl}
                        onChange={(e) => setSourceUrl(e.target.value)}
                        className="flex-1"
                      />
                      <Button type="submit">Scrape</Button>
                    </form>
                  </div>

                  {/* URL list */}
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="flex items-center border-b border-slate-100 px-6 py-4">
                      <h3 className="text-sm font-semibold text-slate-900">Scraped URLs</h3>
                      {sources.length > 0 && (
                        <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500">
                          {sources.length}
                        </span>
                      )}
                    </div>
                    {sources.length === 0 ? (
                      <p className="px-6 py-10 text-sm text-slate-400">
                        No URLs yet — add one above and we&apos;ll get to work.
                      </p>
                    ) : (
                      <motion.ul
                        variants={stagger}
                        initial="hidden"
                        animate="show"
                        className="divide-y divide-slate-100"
                      >
                        {sources.map((item) => (
                          <motion.li
                            key={item.id}
                            variants={slideUp}
                            className="flex items-center gap-3 px-6 py-3.5"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-800">{item.url}</p>
                              <p className="mt-0.5 text-[11px] text-slate-400">
                                {item.scrapedPages ?? 1} page{(item.scrapedPages ?? 1) !== 1 ? 's' : ''} ·{' '}
                                {relativeTime(item.createdAt)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteSource(item.url)}
                              className="shrink-0 rounded-md p-1.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
                              title="Remove source"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </motion.li>
                        ))}
                      </motion.ul>
                    )}
                  </div>

                  {/* Documents */}
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-100 px-6 py-4">
                      <div className="flex items-center">
                        <h3 className="text-sm font-semibold text-slate-900">Documents</h3>
                        {documents.length > 0 && (
                          <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500">
                            {documents.length}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Upload .txt or .csv files to add more training data.
                      </p>
                    </div>
                    <div className="border-b border-slate-100 px-6 py-4">
                      <form onSubmit={handleUploadDocument} className="flex gap-2">
                        <Input
                          type="file"
                          accept=".txt,.csv,text/plain,text/csv"
                          onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                          className="flex-1"
                        />
                        <Button type="submit">Upload</Button>
                      </form>
                    </div>
                    {documents.length === 0 ? (
                      <p className="px-6 py-8 text-sm text-slate-400">No documents yet.</p>
                    ) : (
                      <motion.ul
                        variants={stagger}
                        initial="hidden"
                        animate="show"
                        className="divide-y divide-slate-100"
                      >
                        {documents.map((item) => (
                          <motion.li
                            key={item.id}
                            variants={slideUp}
                            className="flex items-center gap-3 px-6 py-3.5"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-800">{item.fileName}</p>
                              <p className="mt-0.5 text-[11px] text-slate-400">
                                {fmtBytes(item.fileSize)} · {relativeTime(item.createdAt)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteDocument(item.id)}
                              className="shrink-0 rounded-md p-1.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
                              title="Delete document"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </motion.li>
                        ))}
                      </motion.ul>
                    )}
                  </div>
                </div>
              )}

              {/* ── Widget ───────────────────────────────────────────────── */}
              {activeSection === 'widget' && (
                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <h3 className="text-sm font-semibold text-slate-900">Customize</h3>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Changes sync to your live widget in real time.
                    </p>
                    <div className="mt-5 space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-600">Widget name</Label>
                        <Input value={widgetName} onChange={(e) => setWidgetName(e.target.value)} />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {(
                          [
                            { label: 'Primary color', key: 'primaryColor' as const },
                            { label: 'Background', key: 'backgroundColor' as const },
                          ] as const
                        ).map(({ label, key }) => (
                          <div key={key} className="space-y-1.5">
                            <Label className="text-xs font-medium text-slate-600">{label}</Label>
                            <div className="flex items-center gap-2 rounded-md border border-input bg-transparent px-2.5 py-1.5">
                              <input
                                type="color"
                                value={widgetConfig[key]}
                                onChange={(e) =>
                                  setWidgetConfig((p) => ({ ...p, [key]: e.target.value }))
                                }
                                className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
                              />
                              <span className="font-mono text-xs text-slate-600">{widgetConfig[key]}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-600">Text color</Label>
                        <div className="flex items-center gap-2 rounded-md border border-input bg-transparent px-2.5 py-1.5">
                          <input
                            type="color"
                            value={widgetConfig.textColor}
                            onChange={(e) =>
                              setWidgetConfig((p) => ({ ...p, textColor: e.target.value }))
                            }
                            className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
                          />
                          <span className="font-mono text-xs text-slate-600">{widgetConfig.textColor}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-600">Bot name</Label>
                        <Input
                          value={widgetConfig.botName}
                          onChange={(e) => setWidgetConfig((p) => ({ ...p, botName: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-600">Welcome message</Label>
                        <Input
                          value={widgetConfig.welcomeMessage}
                          onChange={(e) =>
                            setWidgetConfig((p) => ({ ...p, welcomeMessage: e.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-600">
                          Logo URL{' '}
                          <span className="font-normal text-slate-400">(optional)</span>
                        </Label>
                        <Input
                          value={widgetConfig.logoUrl}
                          onChange={(e) => setWidgetConfig((p) => ({ ...p, logoUrl: e.target.value }))}
                          placeholder="https://…"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-slate-600">Position</Label>
                          <select
                            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                            value={widgetConfig.position}
                            onChange={(e) =>
                              setWidgetConfig((p) => ({ ...p, position: e.target.value }))
                            }
                          >
                            <option value="bottom-right">Bottom right</option>
                            <option value="bottom-left">Bottom left</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-slate-600">Corner radius</Label>
                          <Input
                            type="number"
                            min={0}
                            max={40}
                            value={widgetConfig.borderRadius}
                            onChange={(e) =>
                              setWidgetConfig((p) => ({
                                ...p,
                                borderRadius: Number(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-600">Font size (px)</Label>
                        <Input
                          type="number"
                          min={10}
                          max={22}
                          value={widgetConfig.fontSize}
                          onChange={(e) =>
                            setWidgetConfig((p) => ({
                              ...p,
                              fontSize: Number(e.target.value) || 14,
                            }))
                          }
                        />
                      </div>

                      <Button onClick={handleSaveWidget} className="w-full">
                        Save changes
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <h3 className="text-sm font-semibold text-slate-900">Live preview</h3>
                    <p className="mt-0.5 text-xs text-slate-400">Rendered from your backend bundle.</p>
                    <div className="mt-4">
                      <iframe
                        ref={iframeRef}
                        src={widgetPreviewURL}
                        className="h-[540px] w-full rounded-xl border border-slate-100 bg-white"
                        onLoad={() => {
                          setIframeReady(true);
                          postWidgetConfig(widgetConfig);
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Embed ────────────────────────────────────────────────── */}
              {activeSection === 'embed' && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <h3 className="text-sm font-semibold text-slate-900">Install snippet</h3>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Paste this before the closing{' '}
                      <code className="rounded bg-slate-100 px-1 text-[11px]">&lt;/body&gt;</code> tag.
                    </p>
                    <div className="relative mt-4">
                      <pre className="overflow-x-auto rounded-xl bg-slate-950 px-5 py-5 font-mono text-[12px] leading-relaxed text-slate-300">
                        {embedPayload?.script ||
                          '/* Save your widget settings first to generate the embed code. */'}
                      </pre>
                      {embedPayload?.script && (
                        <button
                          type="button"
                          onClick={copyEmbedCode}
                          className="absolute right-3 top-3 flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 transition-colors hover:bg-white/20"
                        >
                          <Copy className="h-3 w-3" />
                          Copy
                        </button>
                      )}
                    </div>
                  </div>

                  {embedPayload?.installSteps?.length ? (
                    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5">
                      <h3 className="mb-3 text-sm font-semibold text-slate-900">Installation steps</h3>
                      <ol className="space-y-2.5">
                        {embedPayload.installSteps.map((step, i) => (
                          <li key={step} className="flex items-start gap-3 text-sm text-slate-600">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                              {i + 1}
                            </span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                </div>
              )}

              {/* ── Chat History ─────────────────────────────────────────── */}
              {activeSection === 'chat' && (
                <div className="grid gap-4 lg:grid-cols-3">

                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white lg:col-span-1">
                    <div className="flex items-center border-b border-slate-100 px-5 py-4">
                      <h3 className="text-sm font-semibold text-slate-900">Sessions</h3>
                      {chatSessions.length > 0 && (
                        <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500">
                          {chatSessions.length}
                        </span>
                      )}
                    </div>
                    {chatSessions.length === 0 ? (
                      <p className="px-5 py-10 text-sm text-slate-400">
                        Once your widget is live, conversations will appear here.
                      </p>
                    ) : (
                      <motion.ul
                        variants={stagger}
                        initial="hidden"
                        animate="show"
                        className="divide-y divide-slate-100"
                      >
                        {chatSessions.map((session, idx) => (
                          <motion.li key={session.id} variants={slideUp}>
                            <button
                              type="button"
                              className={`flex w-full items-center gap-2 px-5 py-3.5 text-left transition-colors hover:bg-slate-50 ${
                                selectedChat?.id === session.id ? 'bg-slate-50' : ''
                              }`}
                              onClick={() => handleLoadChat(session.id)}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-slate-800">Chat #{idx + 1}</p>
                                <p className="mt-0.5 text-[11px] text-slate-400">
                                  {session.messageCount ?? 0} messages ·{' '}
                                  {session.lastMessageAt
                                    ? relativeTime(session.lastMessageAt)
                                    : 'no messages'}
                                </p>
                              </div>
                              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                            </button>
                          </motion.li>
                        ))}
                      </motion.ul>
                    )}
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white lg:col-span-2">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                      <h3 className="text-sm font-semibold text-slate-900">
                        {selectedChat
                          ? `Chat #${chatSessions.findIndex((s) => s.id === selectedChat.id) + 1}`
                          : 'Transcript'}
                      </h3>
                      {selectedChat && (
                        <button
                          type="button"
                          onClick={() => setSelectedChat(null)}
                          className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="px-5 py-4">
                      {!selectedChat ? (
                        <p className="text-sm text-slate-400">Select a session to read the transcript.</p>
                      ) : (
                        <motion.div
                          variants={stagger}
                          initial="hidden"
                          animate="show"
                          className="space-y-3"
                        >
                          {selectedChat.messages.map((message: ChatMessage, idx: number) => (
                            <motion.div
                              key={`${message.createdAt}-${idx}`}
                              variants={slideUp}
                              className={`rounded-xl px-4 py-3 text-sm ${
                                message.role === 'user'
                                  ? 'ml-8 bg-slate-100 text-slate-800'
                                  : 'mr-8 bg-slate-900 text-slate-100'
                              }`}
                            >
                              <p
                                className={`mb-1.5 text-[10px] font-semibold uppercase tracking-widest ${
                                  message.role === 'user' ? 'text-slate-500' : 'text-slate-500'
                                }`}
                              >
                                {message.role}
                              </p>
                              <p className="leading-relaxed">{message.content}</p>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Feedback ─────────────────────────────────────────────── */}
              {activeSection === 'feedback' && (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="flex items-center border-b border-slate-100 px-6 py-4">
                    <h3 className="text-sm font-semibold text-slate-900">User feedback</h3>
                    {feedback.length > 0 && (
                      <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500">
                        {feedback.length}
                      </span>
                    )}
                  </div>
                  {feedback.length === 0 ? (
                    <p className="px-6 py-10 text-sm text-slate-400">
                      No feedback yet — ratings from your widget users will show up here.
                    </p>
                  ) : (
                    <motion.ul
                      variants={stagger}
                      initial="hidden"
                      animate="show"
                      className="divide-y divide-slate-100"
                    >
                      {feedback.map((item) => (
                        <motion.li key={item.id} variants={slideUp} className="px-6 py-4">
                          <div className="flex items-start gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                {item.type && (
                                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                    {item.type}
                                  </span>
                                )}
                                {item.title && (
                                  <p className="text-sm font-medium text-slate-800">{item.title}</p>
                                )}
                              </div>
                              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                                {item.message}
                              </p>
                              <p className="mt-2 text-[11px] text-slate-400">
                                {item.pagePath || 'Unknown page'} · {relativeTime(item.createdAt)}
                              </p>
                            </div>
                          </div>
                        </motion.li>
                      ))}
                    </motion.ul>
                  )}
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
