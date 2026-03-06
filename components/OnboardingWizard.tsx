'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api/axios-instance';
import { useLogout, useUser } from '@/lib/auth/auth-hooks';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Circle,
  Code2,
  Copy,
  FileText,
  Globe,
  Loader2,
  LogOut,
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

const widgetPreviewURL = '/widget-preview';

interface SourceItem {
  id: string;
  url: string;
}

interface ScrapeJob {
  status: string;
  progress: number;
}

interface AutoBrand {
  primaryColor?: string | null;
  botName?: string | null;
  welcomeMessage?: string | null;
}

interface PlatformItem {
  name: string;
  color: string;
  logo: string;
  abbr: string;
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
  },
  {
    id: 2,
    title: 'Style your widget',
    description: 'Tune the widget so it matches your product before you launch it live.',
  },
  {
    id: 3,
    title: 'Launch and install',
    description: 'Copy the install snippet and finish onboarding for your workspace.',
  },
];

const platformList: PlatformItem[] = [
  { name: 'HTML', color: '#e34c26', logo: 'https://cdn.simpleicons.org/html5/e34c26', abbr: 'HT' },
  { name: 'WordPress', color: '#21759b', logo: 'https://cdn.simpleicons.org/wordpress/21759b', abbr: 'WP' },
  { name: 'Shopify', color: '#96bf48', logo: 'https://cdn.simpleicons.org/shopify/96bf48', abbr: 'SH' },
  { name: 'Webflow', color: '#4353ff', logo: 'https://cdn.simpleicons.org/webflow/4353ff', abbr: 'WF' },
  { name: 'Squarespace', color: '#b6b6b6', logo: 'https://cdn.simpleicons.org/squarespace/b6b6b6', abbr: 'SQ' },
  { name: 'Wix', color: '#faad21', logo: 'https://cdn.simpleicons.org/wix/faad21', abbr: 'WX' },
  { name: 'Next.js', color: '#dcdcdc', logo: 'https://cdn.simpleicons.org/nextdotjs/dcdcdc', abbr: 'NX' },
  { name: 'React', color: '#61dafb', logo: 'https://cdn.simpleicons.org/react/61dafb', abbr: 'RE' },
  { name: 'Framer', color: '#0099ff', logo: 'https://cdn.simpleicons.org/framer/0099ff', abbr: 'FR' },
  { name: 'GoDaddy', color: '#1bdbdb', logo: 'https://cdn.simpleicons.org/godaddy/1bdbdb', abbr: 'GD' },
  { name: 'Ghost', color: '#9badb7', logo: 'https://cdn.simpleicons.org/ghost/9badb7', abbr: 'GH' },
  { name: 'WooCommerce', color: '#9b59b6', logo: 'https://cdn.simpleicons.org/woocommerce/9b59b6', abbr: 'WC' },
  { name: 'Google Sites', color: '#4285f4', logo: 'https://www.google.com/s2/favicons?domain=sites.google.com&sz=64', abbr: 'GS' },
  { name: 'Weebly', color: '#f36c20', logo: 'https://www.google.com/s2/favicons?domain=weebly.com&sz=64', abbr: 'WB' },
  { name: 'Blogger', color: '#f57d00', logo: 'https://cdn.simpleicons.org/blogger/f57d00', abbr: 'BL' },
  { name: 'Tumblr', color: '#35a0dc', logo: 'https://cdn.simpleicons.org/tumblr/35a0dc', abbr: 'TB' },
];

// ── Color swatch input ────────────────────────────────────────────────────
function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="ob-color-field">
      <span className="ob-color-label">{label}</span>
      <div className="ob-color-swatch">
        <span className="ob-color-dot" style={{ background: value }} />
        <span className="ob-color-hex">{value.toUpperCase()}</span>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
        />
      </div>
    </div>
  );
}

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
  const [autoBrand, setAutoBrand] = useState<AutoBrand | null>(null);
  const [activePlatform, setActivePlatform] = useState<PlatformItem | null>(null);
  const [logoFallback, setLogoFallback] = useState<Record<string, boolean>>({});
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const autoAppliedRef = useRef(false);

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

    const [sourcesRes, widgetRes, embedRes] = await Promise.all([
      apiClient.get('/dashboard/sources'),
      apiClient.get('/dashboard/widget'),
      apiClient.get('/dashboard/embed').catch(() => ({ data: {} })),
    ]);

    setSources(sourcesRes.data?.sources || []);
    setStats(sourcesRes.data?.stats || {});
    setPlanLimits(sourcesRes.data?.planLimits || { scrapedPages: 30, documents: 5 });
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

  // Auth + initial load
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

  // Scrape job polling
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

  // Send widget config to iframe when ready or config changes
  useEffect(() => {
    if (!iframeReady) return;
    postWidgetConfig(widgetConfig);
  }, [widgetConfig, iframeReady, postWidgetConfig]);

  // Reset iframe state when leaving step 2
  useEffect(() => {
    if (step !== 2) setIframeReady(false);
  }, [step]);

  // Auto-brand extraction: fires once when entering step 2 (only if widget not yet saved)
  useEffect(() => {
    if (step !== 2) return;
    if (autoAppliedRef.current) return;
    if (widgetSaved) {
      autoAppliedRef.current = true;
      return;
    }
    const sourceUrl = sources[0]?.url;
    if (!sourceUrl) return;

    void apiClient
      .get<{ success: boolean; brand: AutoBrand | null }>(
        `/dashboard/brand-extract?url=${encodeURIComponent(sourceUrl)}`,
      )
      .then((res) => {
        const brand = res.data?.brand;
        if (!brand) return;
        setAutoBrand(brand);
        setWidgetConfig((p) => ({
          ...p,
          ...(brand.primaryColor ? { primaryColor: brand.primaryColor! } : {}),
          ...(brand.botName ? { botName: brand.botName! } : {}),
          ...(brand.welcomeMessage ? { welcomeMessage: brand.welcomeMessage! } : {}),
        }));
      })
      .catch(() => { })
      .finally(() => {
        autoAppliedRef.current = true;
      });
  }, [step, sources, widgetSaved]);

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

  const handleResetToAuto = () => {
    if (!autoBrand) return;
    setWidgetSaved(false);
    setWidgetConfig((p) => ({
      ...p,
      ...(autoBrand.primaryColor ? { primaryColor: autoBrand.primaryColor! } : {}),
      ...(autoBrand.botName ? { botName: autoBrand.botName! } : {}),
      ...(autoBrand.welcomeMessage ? { welcomeMessage: autoBrand.welcomeMessage! } : {}),
    }));
  };

  const handleResetToDefaults = () => {
    setWidgetSaved(false);
    setWidgetConfig(defaultWidgetConfig);
    setWidgetName('My Chat Widget');
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
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-(--accent-strong) border-t-transparent" />
          <span className="text-sm text-(--text-2)">Preparing your workspace</span>
        </div>
      </div>
    );
  }

  const scrapedPagesUsed = stats?.scrapedPages ?? 0;
  const docsUsed = stats?.documents ?? 0;
  const canProceedStep1 = scrapedPagesUsed > 0 || sources.length > 0;
  const currentStep = steps[step - 1];
  const normalizedJobStatus = (jobStatus || 'idle').toLowerCase();
  const isFailedState = normalizedJobStatus === 'failed';
  const isScrapingState = ['queued', 'scraping'].includes(normalizedJobStatus);
  const isIndexingState = ['formatting', 'indexing'].includes(normalizedJobStatus);
  const hasActiveJob = !!jobId && !['done', 'failed', 'idle'].includes(normalizedJobStatus);
  const hasPipelineData = canProceedStep1;
  const pipelineStage: 'idle' | 'scraping' | 'indexing' | 'done' | 'failed' = isFailedState
    ? 'failed'
    : isScrapingState
      ? 'scraping'
      : isIndexingState
        ? 'indexing'
        : normalizedJobStatus === 'done' || (hasPipelineData && !hasActiveJob)
          ? 'done'
          : 'idle';
  const pipelineProgress = pipelineStage === 'done' ? 100 : Math.max(0, Math.min(jobProgress || 0, 100));
  const stageLabel: Record<typeof pipelineStage, string> = {
    idle: 'Waiting for training source',
    scraping: 'Collecting and scraping pages',
    indexing: 'Formatting and indexing content',
    done: 'Training pipeline completed',
    failed: 'Pipeline encountered an issue',
  };
  const shortStepTitle: Record<1 | 2 | 3, string> = { 1: 'Train', 2: 'Style', 3: 'Launch' };
  const installTips: Record<string, string[]> = {
    HTML: [
      'Open your main HTML file (for example index.html).',
      'Paste the script right before the closing body tag.',
      'Save and deploy your site, then refresh to verify widget load.',
    ],
    WordPress: [
      'Go to Appearance > Theme File Editor or a header/footer script plugin.',
      'Paste the script inside footer.php before the closing body tag.',
      'Save changes and clear cache plugin/CDN cache.',
    ],
    Shopify: [
      'Open Online Store > Themes > Edit code.',
      'In layout/theme.liquid, paste script before the closing body tag.',
      'Save, publish, and test on storefront pages.',
    ],
    Webflow: [
      'Open Project Settings > Custom Code.',
      'Paste script in Footer Code section and save.',
      'Publish site and verify widget is visible.',
    ],
    Squarespace: [
      'Open Settings > Advanced > Code Injection.',
      'Paste script in Footer section.',
      'Save and test widget on published pages.',
    ],
    Wix: [
      'Open Settings > Custom Code in your Wix dashboard.',
      'Add script to Body - end for all pages.',
      'Publish and verify widget renders.',
    ],
    'Next.js': [
      'Open your shared layout file (app/layout.tsx or pages/_app.tsx).',
      'Add script using next/script with strategy afterInteractive.',
      'Deploy and confirm widget appears in production pages.',
    ],
    React: [
      'Add script injection in App root using useEffect.',
      'Append script tag once and clean up on unmount if needed.',
      'Build and deploy, then validate widget render.',
    ],
    Framer: [
      'Open Site Settings > Custom Code.',
      'Paste script in End of body section.',
      'Publish and confirm widget in live site.',
    ],
    GoDaddy: [
      'Open Website Builder > Settings > Site-wide code.',
      'Paste script before closing body tag.',
      'Republish site and verify widget.',
    ],
    Ghost: [
      'Go to Settings > Code Injection.',
      'Paste script in Site Footer.',
      'Save and check published pages.',
    ],
    WooCommerce: [
      'Open WordPress admin > Appearance > Theme File Editor.',
      'Add script in footer.php before closing body tag.',
      'Save and clear cache plugins.',
    ],
    'Google Sites': [
      'Open your Google Site and go to Insert > Embed.',
      'Paste the script URL/snippet using embed options.',
      'Publish the site and verify widget behavior.',
    ],
    Weebly: [
      'Open Theme > Edit HTML/CSS in Weebly.',
      'Paste script before closing body tag in master template.',
      'Publish and test on live pages.',
    ],
    Blogger: [
      'Go to Theme > Edit HTML.',
      'Paste script before closing body tag.',
      'Save theme and validate widget on blog pages.',
    ],
    Tumblr: [
      'Open Edit Theme > Edit HTML.',
      'Paste script before closing body tag.',
      'Save and check your blog frontend.',
    ],
  };
  const platformInstructions =
    (activePlatform && installTips[activePlatform.name]) || [
      'Open your website template or global layout file.',
      'Paste the script before the closing body tag.',
      'Publish changes and verify widget appears.',
    ];
  const checklistItems = [
    {
      id: 'crawl',
      label: 'Crawling website pages',
      description: 'Collecting source pages and extracting content.',
      state:
        pipelineStage === 'failed' && !hasPipelineData
          ? 'failed'
          : pipelineStage === 'scraping'
            ? 'active'
            : ['indexing', 'done'].includes(pipelineStage)
              ? 'done'
              : 'pending',
    },
    {
      id: 'process',
      label: 'Processing your data',
      description: 'Formatting content for retrieval and QA.',
      state:
        pipelineStage === 'failed' && hasPipelineData
          ? 'failed'
          : pipelineStage === 'indexing'
            ? 'active'
            : pipelineStage === 'done'
              ? 'done'
              : 'pending',
    },
    {
      id: 'generate',
      label: 'Generating FAQ / launch context',
      description: 'Finalizing readiness for widget answers.',
      state: pipelineStage === 'done' ? 'done' : 'pending',
    },
  ] as const;

  return (
    <div className="onboarding-setup-shell">
      <div className="onboarding-setup-frame section-frame">
        {/* ── Slim topbar: brand | steps | actions ── */}
        <header className="onboarding-setup-topbar">
          <div className="onboarding-setup-brand">Konvoq</div>

          <div className="onboarding-setup-progress" role="tablist" aria-label="Onboarding steps">
            {steps.map((item, index) => {
              const stepId = item.id as 1 | 2 | 3;
              const isActive = step === stepId;
              const isDone =
                step > stepId || (stepId === 1 && canProceedStep1 && step > 1) || (stepId === 2 && widgetSaved && step === 3);
              // determine connecting line state
              const prevIsDone =
                index === 0
                  ? false
                  : step > index || (index === 1 && canProceedStep1 && step > 1) || (index === 2 && widgetSaved && step === 3);
              const lineClass = index < steps.length - 1
                ? isActive || isDone ? 'line-active' : prevIsDone ? 'line-done' : ''
                : '';
              return (
                <div key={item.id} className={`onboarding-setup-progress-wrap ${lineClass}`}>
                  <button
                    type="button"
                    onClick={() => void goToStep(stepId)}
                    className={`onboarding-setup-progress-step ${isActive ? 'is-active' : ''} ${isDone ? 'is-done' : ''}`}
                  >
                    <span className="onboarding-setup-progress-index">
                      {isDone ? <Check className="h-2.5 w-2.5" /> : item.id}
                    </span>
                    <span>{shortStepTitle[stepId]}</span>
                  </button>
                  {index < steps.length - 1 ? <span className="onboarding-setup-progress-line" aria-hidden /> : null}
                </div>
              );
            })}
          </div>

          <div className="onboarding-setup-topbar-actions">
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </header>

        {/* ── Main 2-pane grid ── */}
        <main className="onboarding-setup-main">

          {/* ── LEFT: Controls ── */}
          <section className="onboarding-setup-left section-surface">
            <div className="onboarding-setup-left-header">
              <h2>{currentStep.title}</h2>
              <p>{currentStep.description}</p>
            </div>

            <div className={`onboarding-setup-left-body ${step === 3 ? 'is-launch-step' : ''}`}>

              {/* Step 1 — redesigned */}
              {step === 1 ? (
                <div className="ob-train-step">

                  {/* ── URL source section ── */}
                  <div className="ob-train-section">
                    <div className="ob-train-section-label">
                      <span className="ob-train-step-badge">1</span>
                      <span>Enter your website URL</span>
                    </div>

                    <form onSubmit={handleAddUrl} className="ob-train-url-form">
                      <div className="ob-train-url-input-wrap">
                        <Globe className="ob-train-url-icon h-4 w-4" />
                        <Input
                          id="source-url"
                          type="url"
                          placeholder="https://yourwebsite.com"
                          value={hasPipelineData || hasActiveJob ? (sources[0]?.url || url) : url}
                          onChange={(e) => setUrl(e.target.value)}
                          disabled={hasPipelineData || hasActiveJob}
                          readOnly={hasPipelineData || hasActiveJob}
                          className="ob-train-url-input"
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={isSaving || hasPipelineData || hasActiveJob}
                        className="ob-train-primary-btn w-full"
                      >
                        {isSaving ? (
                          <><Loader2 className="h-4 w-4 animate-spin" />Starting scrape...</>
                        ) : hasPipelineData ? (
                          <><Check className="h-4 w-4" />Website added</>
                        ) : (
                          <><Sparkles className="h-4 w-4" />Start training</>
                        )}
                      </Button>
                    </form>

                    {/* Status pill — only when not idle */}
                    {normalizedJobStatus !== 'idle' && (
                      <div className={`ob-train-status-pill ob-train-status-${normalizedJobStatus}`}>
                        {(isScrapingState || isIndexingState) ? (
                          <span className="ob-train-status-dot" />
                        ) : pipelineStage === 'done' ? (
                          <Check className="h-3 w-3" />
                        ) : isFailedState ? (
                          <AlertTriangle className="h-3 w-3" />
                        ) : null}
                        <span className="capitalize">{jobStatus}</span>
                        {pipelineProgress > 0 && pipelineStage !== 'done' && (
                          <span className="ob-train-status-pct">{pipelineProgress}%</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ── Divider ── */}
                  <div className="ob-train-or-divider"><span>or upload a document</span></div>

                  {/* ── Doc upload section ── */}
                  <div className="ob-train-section">
                    <div className="ob-train-section-label">
                      <span className="ob-train-step-badge ob-train-step-badge--2">2</span>
                      <span>Upload a document</span>
                      <span className="ob-train-doc-count">{docsUsed}/{planLimits.documents} docs used</span>
                    </div>

                    <form onSubmit={handleUploadDocument}>
                      <label htmlFor="doc-upload" className={`ob-train-dropzone${documentFile ? ' ob-train-dropzone--selected' : ''}`}>
                        <FileText className="ob-train-dropzone-icon h-6 w-6" />
                        <div className="ob-train-dropzone-text">
                          <span>{documentFile ? documentFile.name : 'Drop .txt or .csv here'}</span>
                          <span>{documentFile ? `${(documentFile.size / 1024).toFixed(1)} KB · ready to upload` : 'or click to browse'}</span>
                        </div>
                        {documentFile && <Check className="ob-train-dropzone-check h-4 w-4" />}
                        <input
                          id="doc-upload"
                          type="file"
                          accept=".txt,.csv,text/plain,text/csv"
                          onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                          className="sr-only"
                        />
                      </label>

                      <Button
                        type="submit"
                        variant="outline"
                        disabled={isUploading || !documentFile}
                        className="ob-train-upload-btn w-full mt-3"
                      >
                        {isUploading ? (
                          <><Loader2 className="h-4 w-4 animate-spin" />Uploading...</>
                        ) : (
                          <><Upload className="h-4 w-4" />Upload document</>
                        )}
                      </Button>
                    </form>
                  </div>

                  {/* ── Meta chips ── */}
                  {(scrapedPagesUsed > 0 || sources.length > 0) && (
                    <div className="ob-train-meta">
                      <div className="ob-train-meta-chip">
                        <Check className="h-3 w-3" />
                        <span>{scrapedPagesUsed}/{planLimits.scrapedPages} pages indexed</span>
                      </div>
                      <div className="ob-train-meta-chip">
                        <Circle className="h-3 w-3" />
                        <span>{sources.length} source{sources.length === 1 ? '' : 's'}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Step 2 */}
              {step === 2 ? (
                <div className="ob-style-form">


                  {/* Brand group */}
                  <div className="ob-style-group">
                    <span className="ob-style-group-label">Widget Branding</span>
                    <div className="ob-style-grid-2">
                      <div className="ob-field-stack">
                        <Label className="text-xs text-(--text-3)">Widget name</Label>
                        <Input
                          value={widgetName}
                          onChange={(e) => { setWidgetSaved(false); setWidgetName(e.target.value); }}
                          placeholder="My Chat Widget"
                        />
                      </div>
                      <div className="ob-field-stack">
                        <Label className="text-xs text-(--text-3)">Bot name</Label>
                        <Input
                          value={widgetConfig.botName}
                          onChange={(e) => updateWidgetConfig((p) => ({ ...p, botName: e.target.value }))}
                          placeholder="Konvoq AI"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Colors group */}
                  <div className="ob-style-group">
                    <span className="ob-style-group-label">Colors</span>
                    <div className="ob-color-row">
                      <ColorField
                        label="Primary"
                        value={widgetConfig.primaryColor}
                        onChange={(v) => updateWidgetConfig((p) => ({ ...p, primaryColor: v }))}
                      />
                      <ColorField
                        label="Background"
                        value={widgetConfig.backgroundColor}
                        onChange={(v) => updateWidgetConfig((p) => ({ ...p, backgroundColor: v }))}
                      />
                      <ColorField
                        label="Text"
                        value={widgetConfig.textColor}
                        onChange={(v) => updateWidgetConfig((p) => ({ ...p, textColor: v }))}
                      />
                    </div>
                  </div>

                  {/* Content group */}
                  <div className="ob-style-group">
                    <span className="ob-style-group-label">Content</span>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-(--text-3)">Welcome message</Label>
                      <Input
                        value={widgetConfig.welcomeMessage}
                        onChange={(e) => updateWidgetConfig((p) => ({ ...p, welcomeMessage: e.target.value }))}
                        placeholder="Hi! How can I help?"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="ob-style-actions">
                    <Button onClick={handleSaveWidget} disabled={isSavingWidget}>
                      {isSavingWidget ? 'Saving...' : 'Save settings'}
                    </Button>
                    {autoBrand ? (
                      <Button variant="outline" onClick={handleResetToAuto} title="Restore auto-detected brand">
                        <Sparkles className="h-3.5 w-3.5" />
                        Auto
                      </Button>
                    ) : null}
                    <Button variant="ghost" onClick={handleResetToDefaults} title="Reset to default settings">
                      Defaults
                    </Button>
                  </div>
                </div>
              ) : null}

              {/* Step 3 */}
              {step === 3 ? (
                <div className="ob-embed-step">
                  {/* Code block */}
                  <div className="ob-embed-code-wrap">
                    <div className="ob-embed-code-header">
                      <div className="ob-embed-code-label">
                        <Code2 className="h-3.5 w-3.5" />
                        <span>Your embed snippet</span>
                      </div>
                      <button
                        className="ob-embed-copy-btn"
                        onClick={async () => {
                          if (!embedCode) return;
                          await navigator.clipboard.writeText(embedCode);
                          toast.success('Copied to clipboard!');
                        }}
                        disabled={!embedCode}
                      >
                        <Copy className="h-3 w-3" />
                        Copy code
                      </button>
                    </div>
                    <pre className="ob-embed-code-pre">
                      <code>{embedCode || '<script src="…"></script>'}</code>
                    </pre>
                  </div>

                  {/* Install instructions */}
                  <div className="ob-embed-instructions">
                    {[
                      { n: '1', title: 'Paste the snippet', detail: 'Add it before the closing </body> tag on every page you want the widget' },
                      { n: '2', title: 'Widget goes live instantly', detail: 'No build step, no bundler, no restart — it just works' },
                      { n: '3', title: 'Customize anytime', detail: 'Edit colors, name, and messages from your dashboard at any time' },
                    ].map((item) => (
                      <div key={item.n} className="ob-embed-instruction-row">
                        <span className="ob-embed-instruction-num">{item.n}</span>
                        <div className="ob-embed-instruction-content">
                          <span className="ob-embed-instruction-title">{item.title}</span>
                          <span className="ob-embed-instruction-detail">{item.detail}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Ready status chips */}
                  <div className="ob-embed-ready-row">
                    {['Source connected', 'Widget saved', 'Code ready'].map((label) => (
                      <div key={label} className="ob-embed-ready-chip">
                        <Check className="h-3 w-3" />
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <footer className="onboarding-setup-footer">
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
              ) : (
                <Button onClick={handleDone}>
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </footer>
          </section>

          {/* ── RIGHT: Live preview (step 2) | Platforms (step 3) | Pipeline (step 1) ── */}
          {step === 2 ? (
            <aside className="onboarding-setup-right onboarding-setup-right--preview section-surface">
              <div className="ob-preview-head">
                <span>Live preview</span>
                <div className="ob-preview-url-bar">yoursite.com</div>
                <span className="ob-preview-hint">Live</span>
              </div>
              <div className="ob-preview-frame">
                <iframe
                  ref={iframeRef}
                  src={widgetPreviewURL}
                  title="Widget preview"
                  onLoad={() => {
                    setIframeReady(true);
                    postWidgetConfig(widgetConfig);
                  }}
                />
              </div>
            </aside>
          ) : step === 3 ? (
            <aside className="onboarding-setup-right ob-platforms-aside section-surface">
              <div className="ob-platforms-head">
                <h3>Install on any platform</h3>
                <p>Works with any website - click a platform for guided setup.</p>
              </div>
              <div className="ob-platforms-grid">
                {platformList.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    className="ob-platform-tile"
                    onClick={() => setActivePlatform(p)}
                    title={`Open ${p.name} instructions`}
                  >
                    <span className="ob-platform-icon-badge" style={{ background: `${p.color}1e`, borderColor: `${p.color}50` }}>
                      {logoFallback[p.name] ? (
                        <span className="ob-platform-icon-fallback">{p.abbr}</span>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.logo}
                          alt={`${p.name} logo`}
                          className="ob-platform-icon-img"
                          onError={() => setLogoFallback((prev) => ({ ...prev, [p.name]: true }))}
                        />
                      )}
                    </span>
                    <span className="ob-platform-name">{p.name}</span>
                  </button>
                ))}
              </div>
              <p className="ob-platforms-hint">No plugin or API key needed - one script tag, instant results.</p>
            </aside>
          ) : (
            <aside className={`onboarding-setup-right ob-kgraph ob-stage-${pipelineStage} ${pipelineStage === 'failed' ? 'is-failed' : ''}`}>

              {/* Decorative bg */}
              <div className="ob-kgraph-bg" aria-hidden>
                <div className="ob-kgraph-orb" />
                <div className="ob-kgraph-grid" />
              </div>

              {/* Header */}
              <div className="ob-kgraph-header">
                <div className="ob-kgraph-header-row">
                  <span className="ob-kgraph-eyebrow">Knowledge Pipeline</span>
                  <span className={`ob-kgraph-live-dot ob-kgraph-live--${pipelineStage}`} />
                </div>
                <p className="ob-kgraph-subtitle">{stageLabel[pipelineStage]}</p>
              </div>

              {/* ── Centered card pipeline ── */}
              <div className="ob-pipe-flow">
                {([
                  { key: 'detect',  title: 'Website detected',   desc: 'Source URL validated',            done: pipelineStage !== 'idle',                               active: false },
                  { key: 'crawl',   title: 'Pages discovered',   desc: 'Crawling all linked pages',        done: ['indexing','done'].includes(pipelineStage),            active: isScrapingState },
                  { key: 'process', title: 'Content processed',  desc: 'Formatting for AI retrieval',      done: pipelineStage === 'done',                               active: isIndexingState },
                  { key: 'ready',   title: 'Knowledge ready',    desc: 'Widget can now answer questions',  done: pipelineStage === 'done',                               active: false },
                ] as const).map((node, idx, arr) => {
                  const state: 'done' | 'active' | 'failed' | 'pending' =
                    isFailedState && !node.done ? 'failed'
                    : node.done ? 'done'
                    : node.active ? 'active'
                    : 'pending';
                  const isLast = idx === arr.length - 1;
                  const connectorLit = state === 'done' || state === 'active';
                  return (
                    <div key={node.key} className="ob-pipe-node-wrap">
                      {/* Card */}
                      <div className={`ob-pipe-card ob-pipe-card--${state}`}>
                        {/* Left: status icon */}
                        <div className={`ob-pipe-icon ob-pipe-icon--${state}`}>
                          {state === 'done'    && <Check className="h-3.5 w-3.5" />}
                          {state === 'active'  && <span className="ob-pipe-spinner" />}
                          {state === 'failed'  && <AlertTriangle className="h-3 w-3" />}
                          {state === 'pending' && <span className="ob-pipe-pending-ring" />}
                        </div>
                        {/* Center: text */}
                        <div className="ob-pipe-card-body">
                          <span className={`ob-pipe-card-title ob-pipe-title--${state}`}>{node.title}</span>
                          <span className="ob-pipe-card-desc">{node.desc}</span>
                        </div>
                        {/* Right: status chip */}
                        <span className={`ob-pipe-chip ob-pipe-chip--${state}`}>
                          {state === 'done'    ? '✓' :
                           state === 'active'  ? (pipelineProgress > 0 ? `${pipelineProgress}%` : '…') :
                           state === 'failed'  ? '!' :
                           '–'}
                        </span>
                      </div>

                      {/* Connector to next card */}
                      {!isLast && (
                        <div className={`ob-pipe-connector ob-pipe-connector--${connectorLit ? 'lit' : 'dim'}`}>
                          <span className={`ob-pipe-conn-dot ob-pipe-conn-dot--top ob-pipe-conn-dot--${state}`} />
                          <div className="ob-pipe-conn-line">
                            {state === 'active' && <span className="ob-pipe-conn-packet" />}
                            {state === 'done'   && <span className="ob-pipe-conn-packet ob-pipe-conn-packet--done" />}
                          </div>
                          <span className={`ob-pipe-conn-dot ob-pipe-conn-dot--bottom ob-pipe-conn-dot--${state}`} />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Final state banner */}
                {pipelineStage === 'done' && (
                  <div className="ob-pipe-complete">
                    <Check className="h-3.5 w-3.5" />
                    <span>Pipeline completed</span>
                  </div>
                )}
                {pipelineStage === 'idle' && !hasPipelineData && (
                  <p className="ob-pipe-idle-hint">Add a website URL to begin training</p>
                )}
                {isFailedState && (
                  <div className="ob-pipe-failed-banner">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Training failed — add another URL to retry</span>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              <div className="ob-kgraph-progress-wrap">
                <div className="ob-kgraph-progress-track">
                  <div className="ob-kgraph-progress-fill" style={{ width: `${pipelineProgress}%` }}>
                    {(isScrapingState || isIndexingState) && <span className="ob-kgraph-shimmer" />}
                  </div>
                </div>
                <div className="ob-kgraph-progress-row">
                  <span className="ob-kgraph-pct">{pipelineProgress}% complete</span>
                  {pipelineStage === 'done' && (
                    <span className="ob-kgraph-done-badge"><Check className="h-3 w-3" />Ready</span>
                  )}
                  {pipelineStage === 'idle' && !hasPipelineData && (
                    <span className="ob-kgraph-waiting">Awaiting URL</span>
                  )}
                  {isFailedState && <span className="ob-kgraph-failed-badge">Retry needed</span>}
                </div>
              </div>
            </aside>
          )}
        </main>

        {activePlatform ? (
          <div
            className="ob-install-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-label={`${activePlatform.name} installation guide`}
            onClick={() => setActivePlatform(null)}
          >
            <div className="ob-install-modal" onClick={(e) => e.stopPropagation()}>
              <div className="ob-install-modal-head">
                <div className="ob-install-modal-title">
                  {logoFallback[activePlatform.name] ? (
                    <span className="ob-install-modal-logo-fallback">{activePlatform.abbr}</span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activePlatform.logo}
                      alt={`${activePlatform.name} logo`}
                      className="ob-install-modal-logo"
                      onError={() => setLogoFallback((prev) => ({ ...prev, [activePlatform.name]: true }))}
                    />
                  )}
                  <div>
                    <h4>{activePlatform.name} installation guide</h4>
                    <p>Follow these steps to install your widget.</p>
                  </div>
                </div>
                <button type="button" className="ob-install-close" onClick={() => setActivePlatform(null)}>
                  Close
                </button>
              </div>

              <div className="ob-install-script-block">
                <span>Embed script</span>
                <pre>
                  <code>{embedCode || '<script src="..."></script>'}</code>
                </pre>
              </div>

              <div className="ob-install-steps">
                {(platformInstructions.length ? platformInstructions : ['Paste the script before closing body tag and publish your site.']).map((item, idx) => (
                  <div key={`${activePlatform.name}-${idx}`} className="ob-install-step-row">
                    <span>{idx + 1}</span>
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

