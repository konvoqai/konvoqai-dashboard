'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api/axios-instance';
import { useLogout, useUser } from '@/lib/auth/auth-hooks';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  LayoutGrid,
  Link2,
  LogOut,
  Palette,
  Sparkles,
  Upload,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

const defaultWidgetConfig = {
  primaryColor: '#5b8cff',
  backgroundColor: '#0f1013',
  textColor: '#ffffff',
  botName: 'Konvoq AI',
  welcomeMessage: 'Welcome to your live widget preview.',
  logoUrl: '',
  position: 'bottom-right',
  borderRadius: 24,
  fontSize: 14,
};

const widgetPreviewURL = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'}/widget/preview`;

interface SourceItem {
  id: string;
  url: string;
}

interface DocumentItem {
  id: string;
  fileName: string;
}

interface ScrapeJob {
  status: string;
  progress: number;
}

function getErrorMessage(error: unknown, fallback: string) {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

const steps = [
  {
    id: 1,
    title: 'Train your knowledge',
    description: 'Add website pages and docs so Konvoq has grounded answers from the start.',
    icon: Link2,
  },
  {
    id: 2,
    title: 'Style your widget',
    description: 'Tune the widget so it matches your product before you launch it live.',
    icon: Palette,
  },
  {
    id: 3,
    title: 'Launch and install',
    description: 'Copy the install snippet and finish onboarding for your workspace.',
    icon: LayoutGrid,
  },
];

export function OnboardingWizard() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const { logout } = useLogout();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [url, setUrl] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [planLimits, setPlanLimits] = useState<{ scrapedPages: number; documents: number }>({
    scrapedPages: 30,
    documents: 5,
  });
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>('idle');
  const [jobProgress, setJobProgress] = useState<number>(0);
  const [widgetName, setWidgetName] = useState('My Chat Widget');
  const [widgetConfig, setWidgetConfig] = useState(defaultWidgetConfig);
  const [widgetSaved, setWidgetSaved] = useState(false);
  const [isSavingWidget, setIsSavingWidget] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const [embedCode, setEmbedCode] = useState('');
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const postWidgetConfig = useCallback(
    (config = widgetConfig) => {
      const target = iframeRef.current?.contentWindow;
      if (!target) return;
      target.postMessage({ type: 'konvoq:widget-config', config }, '*');
    },
    [widgetConfig],
  );

  const updateWidgetConfig = (
    updater: (prev: typeof defaultWidgetConfig) => typeof defaultWidgetConfig,
  ) => {
    setWidgetSaved(false);
    setWidgetConfig(updater);
  };

  const loadOnboardingState = useCallback(async () => {
    const statusRes = await apiClient.get('/onboarding/status');
    if (!statusRes.data?.shouldOnboard) {
      router.replace('/dashboard');
      return;
    }

    const [sourcesRes, docsRes, widgetRes, embedRes] = await Promise.all([
      apiClient.get('/dashboard/sources'),
      apiClient.get('/dashboard/documents'),
      apiClient.get('/dashboard/widget'),
      apiClient.get('/dashboard/embed').catch(() => ({ data: {} })),
    ]);

    setSources(sourcesRes.data?.sources || []);
    setStats(sourcesRes.data?.stats || {});
    setPlanLimits(sourcesRes.data?.planLimits || { scrapedPages: 30, documents: 5 });
    setDocuments(docsRes.data?.documents || []);

    const widget = widgetRes.data?.widget;
    if (widget) {
      setWidgetName(widget.name || 'My Chat Widget');
      setWidgetConfig((prev) => ({ ...prev, ...(widget.settings || {}) }));
      const hasConfig = !!widget.settings && Object.keys(widget.settings).length > 0;
      setWidgetSaved(hasConfig);
    }

    if (embedRes.data?.script) {
      setEmbedCode(embedRes.data.script);
    }
  }, [router]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }

    loadOnboardingState()
      .catch((error: unknown) => {
        toast.error(getErrorMessage(error, 'Failed onboarding setup'));
        router.replace('/dashboard');
      })
      .finally(() => setCheckingStatus(false));
  }, [isLoading, user, router, loadOnboardingState]);

  useEffect(() => {
    if (!jobId) return;
    if (jobStatus === 'done' || jobStatus === 'failed') return;

    const timer = setInterval(async () => {
      try {
        const res = await apiClient.get(`/onboarding/scrape-status/${jobId}`);
        const job = res.data?.job as ScrapeJob | undefined;
        if (!job) return;
        setJobStatus(job.status);
        setJobProgress(job.progress ?? 0);
        if (job.status === 'done') {
          await loadOnboardingState();
        }
      } catch {
        setJobStatus('failed');
      }
    }, 1500);

    return () => clearInterval(timer);
  }, [jobId, jobStatus, loadOnboardingState]);

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

  const handleAddUrl = async (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error('Enter a URL first');
      return;
    }
    setIsSaving(true);
    try {
      const res = await apiClient.post('/dashboard/sources', { url: url.trim() });
      setJobId(res.data?.jobId || null);
      setJobStatus(res.data?.status || 'queued');
      setJobProgress(res.data?.progress || 0);
      setUrl('');
      toast.success('Scraping started');
      await loadOnboardingState();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to add URL'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadDocument = async (e: FormEvent) => {
    e.preventDefault();
    if (!documentFile) {
      toast.error('Select a document first');
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('document', documentFile);
      await apiClient.post('/dashboard/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDocumentFile(null);
      toast.success('Document uploaded');
      await loadOnboardingState();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Document upload failed'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveWidget = async () => {
    setIsSavingWidget(true);
    try {
      await apiClient.put('/dashboard/widget', { name: widgetName, settings: widgetConfig });
      const embedRes = await apiClient.get('/dashboard/embed');
      setEmbedCode(embedRes.data?.script || '');
      toast.success('Widget saved');
      setWidgetSaved(true);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to save widget config'));
    } finally {
      setIsSavingWidget(false);
    }
  };

  const goToStep = async (target: 1 | 2 | 3) => {
    const hasScrapedSource = (stats?.scrapedPages ?? 0) > 0 || sources.length > 0;
    if (target > 1 && !hasScrapedSource) {
      toast.error('Add at least one URL in Step 1 to continue');
      return;
    }
    if (target === 3) {
      if (!widgetSaved) {
        toast.error('Save your widget configuration to continue');
        return;
      }
      try {
        const embedRes = await apiClient.get('/dashboard/embed');
        setEmbedCode(embedRes.data?.script || '');
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, 'Complete widget setup before Step 3'));
        return;
      }
    }
    setStep(target);
  };

  const handleDone = async () => {
    try {
      await apiClient.post('/onboarding/complete');
      toast.success('Onboarding complete');
      router.replace('/dashboard');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to finish onboarding'));
    }
  };

  if (isLoading || checkingStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="section-surface flex items-center gap-3 px-5 py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent-strong)] border-t-transparent" />
          <span className="text-sm text-[var(--text-2)]">Preparing your workspace</span>
        </div>
      </div>
    );
  }

  const scrapedPagesUsed = stats?.scrapedPages ?? 0;
  const docsUsed = stats?.documents ?? 0;
  const canProceedStep1 = scrapedPagesUsed > 0 || sources.length > 0;
  const stepReady = [
    true,
    canProceedStep1,
    widgetSaved,
  ];

  return (
    <div className="dashboard-shell min-h-screen">
      <div className="section-frame overflow-hidden px-6 py-6 sm:px-8 sm:py-8">
        <div className="relative z-10 space-y-8">
          <div className="dashboard-page-header">
            <div className="space-y-4">
              <div className="dashboard-kicker">
                <Sparkles className="h-3.5 w-3.5 text-[var(--accent-strong)]" />
                3-step setup
              </div>
              <div>
                <h1 className="dashboard-panel-title">Set up your Konvoq workspace.</h1>
                <p className="dashboard-panel-copy max-w-2xl">
                  Move from training to widget styling to launch in one guided flow that matches the rest of the product.
                </p>
              </div>
            </div>

            <div className="dashboard-meta-row">
              <div className="dashboard-chip">
                <span className="h-2 w-2 rounded-full bg-[var(--accent-raw)]" />
                {scrapedPagesUsed}/{planLimits.scrapedPages} pages
              </div>
              <div className="dashboard-chip">
                <Upload className="h-3.5 w-3.5" />
                {docsUsed}/{planLimits.documents} docs
              </div>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>

          <div className="dashboard-grid-three">
            {steps.map((item, index) => {
              const active = step === item.id;
              const complete = step > item.id || (item.id === 2 && widgetSaved) || (item.id === 1 && canProceedStep1 && step > 1);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void goToStep(item.id as 1 | 2 | 3)}
                  className="section-surface text-left"
                  style={{
                    padding: 18,
                    opacity: active || stepReady[index] || item.id < step ? 1 : 0.75,
                    background: active
                      ? 'linear-gradient(160deg, color-mix(in srgb, var(--accent-muted) 82%, var(--surface-2) 18%) 0%, color-mix(in srgb, var(--surface) 92%, transparent) 100%)'
                      : undefined,
                  }}
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[color:var(--surface)]">
                      {complete ? (
                        <Check className="h-4 w-4 text-[var(--accent-strong)]" />
                      ) : (
                        <item.icon className="h-4 w-4 text-[var(--text-2)]" />
                      )}
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-3)]">
                      Step {item.id}
                    </span>
                  </div>
                  <div className="mb-2 text-lg font-bold tracking-[-0.03em] text-[var(--text-1)]">
                    {item.title}
                  </div>
                  <p className="m-0 text-sm leading-6 text-[var(--text-2)]">{item.description}</p>
                </button>
              );
            })}
          </div>

          {step === 1 ? (
            <div className="dashboard-grid-two">
              <div className="section-surface p-6">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="mb-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">
                      Add your website
                    </h2>
                    <p className="m-0 text-sm leading-6 text-[var(--text-2)]">
                      Start with at least one public URL so Konvoq can crawl your pages and build grounded answers.
                    </p>
                  </div>
                  <div className="dashboard-chip">{scrapedPagesUsed}/{planLimits.scrapedPages} pages used</div>
                </div>

                <form onSubmit={handleAddUrl} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="source-url" className="text-sm font-semibold text-[var(--text-2)]">
                      Website URL
                    </Label>
                    <Input
                      id="source-url"
                      type="url"
                      placeholder="https://example.com"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                    />
                  </div>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? 'Starting scrape...' : 'Start scraping'}
                  </Button>
                </form>

                {jobId ? (
                  <div className="mt-5 section-surface p-4">
                    <div className="mb-3 flex items-center justify-between gap-4 text-sm">
                      <span className="capitalize text-[var(--text-2)]">Status: {jobStatus}</span>
                      <span className="text-[var(--text-3)]">{jobProgress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/6">
                      <div
                        className="h-full rounded-full bg-[var(--grad-btn)] transition-all"
                        style={{ width: `${jobProgress}%` }}
                      />
                    </div>
                  </div>
                ) : null}

                <div className="mt-6 space-y-3">
                  {sources.length === 0 ? (
                    <div className="dashboard-empty">
                      Add your first website source to unlock the rest of onboarding.
                    </div>
                  ) : (
                    sources.map((source) => (
                      <div key={source.id} className="section-surface p-4 text-sm text-[var(--text-1)]">
                        {source.url}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="section-surface p-6">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="mb-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">
                      Upload supporting docs
                    </h2>
                    <p className="m-0 text-sm leading-6 text-[var(--text-2)]">
                      Add TXT or CSV files to give the assistant more internal product context.
                    </p>
                  </div>
                  <div className="dashboard-chip">{docsUsed}/{planLimits.documents} docs used</div>
                </div>

                <form onSubmit={handleUploadDocument} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="doc-upload" className="text-sm font-semibold text-[var(--text-2)]">
                      Upload TXT or CSV
                    </Label>
                    <Input
                      id="doc-upload"
                      type="file"
                      accept=".txt,.csv,text/plain,text/csv"
                      onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  <Button type="submit" variant="outline" disabled={isUploading}>
                    {isUploading ? 'Uploading...' : 'Upload document'}
                  </Button>
                </form>

                <div className="mt-6 space-y-3">
                  {documents.length === 0 ? (
                    <div className="dashboard-empty">
                      Optional, but useful for product notes, internal FAQs, or structured content exports.
                    </div>
                  ) : (
                    documents.map((doc) => (
                      <div key={doc.id} className="section-surface p-4 text-sm text-[var(--text-1)]">
                        {doc.fileName}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="dashboard-grid-two">
              <div className="section-surface p-6">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="mb-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">
                      Style your widget
                    </h2>
                    <p className="m-0 text-sm leading-6 text-[var(--text-2)]">
                      Match your product with cleaner colors, copy, and layout before launch.
                    </p>
                  </div>
                  <div className="dashboard-chip">
                    {widgetSaved ? 'Saved' : 'Unsaved'}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[var(--text-2)]">Widget name</Label>
                    <Input
                      value={widgetName}
                      onChange={(e) => {
                        setWidgetSaved(false);
                        setWidgetName(e.target.value);
                      }}
                    />
                  </div>

                  <div className="dashboard-grid-two">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-[var(--text-2)]">Primary color</Label>
                      <Input
                        type="color"
                        value={widgetConfig.primaryColor}
                        onChange={(e) => updateWidgetConfig((p) => ({ ...p, primaryColor: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-[var(--text-2)]">Background color</Label>
                      <Input
                        type="color"
                        value={widgetConfig.backgroundColor}
                        onChange={(e) => updateWidgetConfig((p) => ({ ...p, backgroundColor: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[var(--text-2)]">Text color</Label>
                    <Input
                      type="color"
                      value={widgetConfig.textColor}
                      onChange={(e) => updateWidgetConfig((p) => ({ ...p, textColor: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[var(--text-2)]">Bot name</Label>
                    <Input
                      value={widgetConfig.botName}
                      onChange={(e) => updateWidgetConfig((p) => ({ ...p, botName: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[var(--text-2)]">Welcome message</Label>
                    <Input
                      value={widgetConfig.welcomeMessage}
                      onChange={(e) => updateWidgetConfig((p) => ({ ...p, welcomeMessage: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[var(--text-2)]">Logo URL</Label>
                    <Input
                      value={widgetConfig.logoUrl}
                      onChange={(e) => updateWidgetConfig((p) => ({ ...p, logoUrl: e.target.value }))}
                      placeholder="https://cdn.example.com/logo.png"
                    />
                  </div>

                  <div className="dashboard-grid-two">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-[var(--text-2)]">Position</Label>
                      <select
                        className="h-11 w-full rounded-xl border border-white/10 bg-[color:var(--surface)] px-3.5 text-sm text-[var(--text-1)] shadow-[var(--shadow-card)] outline-none"
                        value={widgetConfig.position}
                        onChange={(e) => updateWidgetConfig((p) => ({ ...p, position: e.target.value }))}
                      >
                        <option value="bottom-right">Bottom right</option>
                        <option value="bottom-left">Bottom left</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-[var(--text-2)]">Border radius</Label>
                      <Input
                        type="number"
                        value={widgetConfig.borderRadius}
                        onChange={(e) =>
                          updateWidgetConfig((p) => ({ ...p, borderRadius: Number(e.target.value) || 24 }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[var(--text-2)]">Font size</Label>
                    <Input
                      type="number"
                      value={widgetConfig.fontSize}
                      onChange={(e) =>
                        updateWidgetConfig((p) => ({ ...p, fontSize: Number(e.target.value) || 14 }))
                      }
                    />
                  </div>

                  <Button onClick={handleSaveWidget} className="w-full" disabled={isSavingWidget}>
                    {isSavingWidget ? 'Saving widget...' : 'Save widget settings'}
                  </Button>
                </div>
              </div>

              <div className="section-surface p-6">
                <div className="mb-6">
                  <h2 className="mb-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">
                    Live preview
                  </h2>
                  <p className="m-0 text-sm leading-6 text-[var(--text-2)]">
                    Preview the widget using the same backend renderer your production snippet uses.
                  </p>
                </div>
                <iframe
                  ref={iframeRef}
                  src={widgetPreviewURL}
                  className="h-[540px] w-full rounded-[24px] border border-white/8 bg-white"
                  onLoad={() => {
                    setIframeReady(true);
                    postWidgetConfig(widgetConfig);
                  }}
                />
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="dashboard-grid-two">
              <div className="section-surface p-6">
                <div className="mb-6">
                  <h2 className="mb-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">
                    Install snippet
                  </h2>
                  <p className="m-0 text-sm leading-6 text-[var(--text-2)]">
                    Paste this before the closing body tag on your website to launch the widget.
                  </p>
                </div>

                <pre className="dashboard-code-block">
                  {embedCode || 'Save your widget settings to generate the embed code.'}
                </pre>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!embedCode) return;
                      await navigator.clipboard.writeText(embedCode);
                      toast.success('Embed code copied');
                    }}
                  >
                    Copy embed code
                  </Button>
                  <a
                    href="/dashboard"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[color:var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--text-1)] no-underline shadow-[var(--shadow-card)]"
                  >
                    Open dashboard
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>

              <div className="section-surface p-6">
                <div className="mb-6">
                  <h2 className="mb-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-1)]">
                    Final launch checklist
                  </h2>
                  <p className="m-0 text-sm leading-6 text-[var(--text-2)]">
                    Finish these checks, then complete onboarding and start managing the product from the dashboard.
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    'At least one website source is connected',
                    'Widget settings are saved',
                    'Embed code is ready to install',
                  ].map((item) => (
                    <div key={item} className="section-surface flex items-center gap-3 p-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-muted)] text-[var(--accent-strong)]">
                        <Check className="h-4 w-4" />
                      </div>
                      <span className="text-sm text-[var(--text-1)]">{item}</span>
                    </div>
                  ))}
                </div>

                <Button className="mt-6 w-full" onClick={handleDone}>
                  Complete onboarding
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Button
              variant="ghost"
              disabled={step === 1}
              onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            {step < 3 ? (
              <Button
                title={step === 2 && !widgetSaved ? 'Save your widget configuration to continue' : undefined}
                disabled={(step === 1 && !canProceedStep1) || (step === 2 && !widgetSaved)}
                onClick={() => void goToStep((step + 1) as 1 | 2 | 3)}
              >
                Next step
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
