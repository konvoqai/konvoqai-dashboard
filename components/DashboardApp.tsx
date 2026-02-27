'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Activity,
  Bot,
  ClipboardList,
  Code2,
  History,
  Link2,
  LogOut,
  MessageSquare,
  PanelLeft,
  Star,
  UserCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLogout, useUser } from '@/lib/auth/auth-hooks';
import { apiClient } from '@/lib/api/axios-instance';

type SectionKey = 'overview' | 'sources' | 'widget' | 'embed' | 'chat' | 'feedback';

const sections: { key: SectionKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'overview', label: 'Overview', icon: Activity },
  { key: 'sources', label: 'Scraping & Docs', icon: Link2 },
  { key: 'widget', label: 'Widget', icon: Bot },
  { key: 'embed', label: 'Embed Code', icon: Code2 },
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
const widgetPreviewURL = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3008'}/widget/preview`;

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

function getErrorMessage(error: unknown, fallback: string) {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

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

  const postWidgetConfig = useCallback((config = widgetConfig) => {
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    target.postMessage({ type: 'konvoq:widget-config', config }, '*');
  }, [widgetConfig]);

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

  const loadSection = useCallback(async (section: SectionKey) => {
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
  }, [loadOverview, loadSources, loadWidget, loadEmbed, loadChatSessions, loadFeedback]);

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
      await apiClient.put('/dashboard/widget', {
        name: widgetName,
        settings: widgetConfig,
      });
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
    toast.success('Embed code copied');
  };

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="w-72 border-r border-slate-200 bg-white/80 backdrop-blur">
          <div className="flex h-full flex-col p-5">
            <div className="mb-6 flex items-center gap-2 text-lg font-semibold">
              <PanelLeft className="h-5 w-5 text-sky-600" />
              Konvoq Dashboard
            </div>

            <nav className="space-y-1">
              {sections.map((entry) => {
                const Icon = entry.icon;
                const active = activeSection === entry.key;
                return (
                  <button
                    key={entry.key}
                    type="button"
                    onClick={() => setActiveSection(entry.key)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                      active
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {entry.label}
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium text-slate-500">Conversations Remaining</p>
              <p className="mt-1 text-xl font-semibold">
                {conversationsLimit ? `${conversationsRemaining ?? 0}/${conversationsLimit}` : 'Unlimited'}
              </p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-sky-500 transition-all"
                  style={{ width: `${conversationProgress}%` }}
                />
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 p-6 md:p-8">
          <header className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-sm text-slate-600">
                Plan: <span className="font-semibold capitalize">{planType}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase text-slate-600">
                {planType}
              </div>
              <div className="relative">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <UserCircle2 className="h-5 w-5 text-slate-600" />
                    <span className="text-sm font-medium">{profileName}</span>
                  </summary>
                  <div className="absolute right-0 z-10 mt-2 w-44 rounded-md border border-slate-200 bg-white p-2 shadow">
                    <button
                      type="button"
                      className="w-full rounded px-2 py-1 text-left text-sm hover:bg-slate-100"
                    >
                      Profile
                    </button>
                    <button
                      type="button"
                      className="w-full rounded px-2 py-1 text-left text-sm hover:bg-slate-100"
                    >
                      Billing
                    </button>
                    <button
                      type="button"
                      className="w-full rounded px-2 py-1 text-left text-sm hover:bg-slate-100"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </div>
                </details>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </header>

          {isBusy && (
            <div className="mb-4 text-sm text-slate-500">Loading section data...</div>
          )}

          {activeSection === 'overview' && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Total Conversations</CardTitle>
                </CardHeader>
                <CardContent className="text-3xl font-bold">
                  {overview?.analytics?.chatSessions ?? 0}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Widget Messages</CardTitle>
                </CardHeader>
                <CardContent className="text-3xl font-bold">
                  {overview?.analytics?.widgetMessages ?? 0}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Feedback Score</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-2 text-3xl font-bold">
                  <Star className="h-6 w-6 text-amber-500" />
                  {overview?.analytics?.totalRatings ?? 0}
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === 'sources' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>URL Scraping</CardTitle>
                  <CardDescription>
                    Used {sourcesStats?.scrapedPages ?? 0} pages and {sourcesStats?.documents ?? 0} documents.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddSource} className="flex gap-2">
                    <Input
                      placeholder="https://example.com"
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                    />
                    <Button type="submit">Add URL</Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Scraped URLs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {sources.length === 0 && <p className="text-sm text-slate-500">No sources yet.</p>}
                  {sources.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-md border border-slate-200 p-3"
                    >
                      <div>
                        <p className="font-medium">{item.url}</p>
                        <p className="text-xs text-slate-500">
                          Pages: {item.scrapedPages ?? 1} · {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <Button variant="outline" onClick={() => handleDeleteSource(item.url)}>
                        Delete
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Documents</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleUploadDocument} className="flex gap-2">
                    <Input
                      type="file"
                      accept=".txt,.csv,text/plain,text/csv"
                      onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                    />
                    <Button type="submit">Upload</Button>
                  </form>
                  {documents.length === 0 && <p className="text-sm text-slate-500">No documents yet.</p>}
                  {documents.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-md border border-slate-200 p-3"
                    >
                      <div>
                        <p className="font-medium">{item.fileName}</p>
                        <p className="text-xs text-slate-500">
                          {item.fileSize} bytes · {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <Button variant="outline" onClick={() => handleDeleteDocument(item.id)}>
                        Delete
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === 'widget' && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Widget Customization</CardTitle>
                  <CardDescription>One shared widget source rendered via iframe + postMessage.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label>Widget Name</Label>
                    <Input value={widgetName} onChange={(e) => setWidgetName(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Primary Color</Label>
                      <Input
                        type="color"
                        value={widgetConfig.primaryColor}
                        onChange={(e) => setWidgetConfig((p) => ({ ...p, primaryColor: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Background Color</Label>
                      <Input
                        type="color"
                        value={widgetConfig.backgroundColor}
                        onChange={(e) => setWidgetConfig((p) => ({ ...p, backgroundColor: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Text Color</Label>
                    <Input
                      type="color"
                      value={widgetConfig.textColor}
                      onChange={(e) => setWidgetConfig((p) => ({ ...p, textColor: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bot Name</Label>
                    <Input
                      value={widgetConfig.botName}
                      onChange={(e) => setWidgetConfig((p) => ({ ...p, botName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Welcome Message</Label>
                    <Input
                      value={widgetConfig.welcomeMessage}
                      onChange={(e) => setWidgetConfig((p) => ({ ...p, welcomeMessage: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Logo URL</Label>
                    <Input
                      value={widgetConfig.logoUrl}
                      onChange={(e) => setWidgetConfig((p) => ({ ...p, logoUrl: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Position</Label>
                      <select
                        className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                        value={widgetConfig.position}
                        onChange={(e) => setWidgetConfig((p) => ({ ...p, position: e.target.value }))}
                      >
                        <option value="bottom-right">Bottom Right</option>
                        <option value="bottom-left">Bottom Left</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Border Radius (px)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={40}
                        value={widgetConfig.borderRadius}
                        onChange={(e) =>
                          setWidgetConfig((p) => ({ ...p, borderRadius: Number(e.target.value) || 0 }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Font Size (px)</Label>
                    <Input
                      type="number"
                      min={10}
                      max={22}
                      value={widgetConfig.fontSize}
                      onChange={(e) =>
                        setWidgetConfig((p) => ({ ...p, fontSize: Number(e.target.value) || 14 }))
                      }
                    />
                  </div>
                  <Button onClick={handleSaveWidget} className="w-full">
                    Save Widget Config
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Live Preview</CardTitle>
                  <CardDescription>Widget rendered from backend public bundle.</CardDescription>
                </CardHeader>
                <CardContent>
                <iframe
                  ref={iframeRef}
                  src={widgetPreviewURL}
                  className="h-[540px] w-full rounded-lg border border-slate-200 bg-white"
                    onLoad={() => {
                      setIframeReady(true);
                      postWidgetConfig(widgetConfig);
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === 'embed' && (
            <Card>
              <CardHeader>
                <CardTitle>Embed Code</CardTitle>
                <CardDescription>Install this snippet on your website.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
                  {embedPayload?.script || 'Save widget settings first to generate embed code.'}
                </pre>
                <Button onClick={copyEmbedCode} disabled={!embedPayload?.script}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Copy Code
                </Button>
                {embedPayload?.installSteps?.length ? (
                  <div className="space-y-1 text-sm text-slate-600">
                    {embedPayload.installSteps.map((step) => (
                      <p key={step}>• {step}</p>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          {activeSection === 'chat' && (
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Conversations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {chatSessions.length === 0 && <p className="text-sm text-slate-500">No conversations yet.</p>}
                  {chatSessions.map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      className="w-full rounded-md border border-slate-200 p-3 text-left hover:bg-slate-50"
                      onClick={() => handleLoadChat(session.id)}
                    >
                      <p className="font-medium">{session.id}</p>
                      <p className="text-xs text-slate-500">
                        {session.messageCount ?? 0} messages ·{' '}
                        {session.lastMessageAt ? new Date(session.lastMessageAt).toLocaleString() : 'n/a'}
                      </p>
                    </button>
                  ))}
                </CardContent>
              </Card>
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Conversation Detail</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!selectedChat && <p className="text-sm text-slate-500">Select a conversation to read messages.</p>}
                  {selectedChat?.messages?.map((message: ChatMessage, idx: number) => (
                    <div
                      key={`${message.createdAt}-${idx}`}
                      className={`rounded-md p-3 text-sm ${
                        message.role === 'user' ? 'bg-slate-100' : 'bg-sky-50'
                      }`}
                    >
                      <p className="mb-1 text-xs uppercase text-slate-500">{message.role}</p>
                      <p>{message.content}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === 'feedback' && (
            <Card>
              <CardHeader>
                <CardTitle>Feedback</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {feedback.length === 0 && <p className="text-sm text-slate-500">No feedback received yet.</p>}
                {feedback.map((item) => (
                  <div key={item.id} className="rounded-md border border-slate-200 p-3">
                    <p className="text-xs uppercase text-slate-500">{item.type || 'feedback'}</p>
                    {item.title ? <p className="font-medium">{item.title}</p> : null}
                    <p className="text-sm">{item.message}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.pagePath || 'Unknown page'} · {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
