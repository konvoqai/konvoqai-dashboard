'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api/axios-instance';
import { useLogout, useUser } from '@/lib/auth/auth-hooks';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

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

  const postWidgetConfig = useCallback((config = widgetConfig) => {
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    target.postMessage({ type: 'konvoq:widget-config', config }, '*');
  }, [widgetConfig]);

  const updateWidgetConfig = (
    updater: (prev: typeof defaultWidgetConfig) => typeof defaultWidgetConfig
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const scrapedPagesUsed = stats?.scrapedPages ?? 0;
  const docsUsed = stats?.documents ?? 0;
  const canProceedStep1 = scrapedPagesUsed > 0 || sources.length > 0;

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-slate-100 p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">First Login Setup</h1>
            <p className="text-slate-600">Complete all 3 steps to launch your widget.</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {[1, 2, 3].map((item) => (
            <button
              key={item}
              type="button"
              className={`rounded-full px-4 py-2 text-sm font-medium ${step === item ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'
                }`}
              onClick={() => void goToStep(item as 1 | 2 | 3)}
            >
              Step {item}
            </button>
          ))}
        </div>

        {step === 1 && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>URL Scraping (Required)</CardTitle>
                <CardDescription>
                  Used {scrapedPagesUsed}/{planLimits.scrapedPages} pages.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleAddUrl} className="space-y-2">
                  <Label>Website URL</Label>
                  <Input
                    type="url"
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                  <Button type="submit" disabled={isSaving} className="w-full">
                    {isSaving ? 'Starting...' : 'Start Scraping'}
                  </Button>
                </form>
                {jobId && (
                  <div className="rounded-md border border-slate-200 p-3 text-sm">
                    <p className="mb-1 capitalize">Status: {jobStatus}</p>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full bg-sky-500 transition-all" style={{ width: `${jobProgress}%` }} />
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  {sources.map((source) => (
                    <div key={source.id} className="rounded-md border border-slate-200 p-2 text-sm">
                      {source.url}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Document Upload (Optional)</CardTitle>
                <CardDescription>
                  Used {docsUsed}/{planLimits.documents} documents.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleUploadDocument} className="space-y-2">
                  <Label>Upload TXT/CSV</Label>
                  <Input
                    type="file"
                    accept=".txt,.csv,text/plain,text/csv"
                    onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                  />
                  <Button type="submit" disabled={isUploading} className="w-full">
                    {isUploading ? 'Uploading...' : 'Upload Document'}
                  </Button>
                </form>
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="rounded-md border border-slate-200 p-2 text-sm">
                      {doc.fileName}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Widget Customization</CardTitle>
                <CardDescription>Live changes via iframe + postMessage.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Widget Name</Label>
                  <Input
                    value={widgetName}
                    onChange={(e) => {
                      setWidgetSaved(false);
                      setWidgetName(e.target.value);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <Input
                    type="color"
                    value={widgetConfig.primaryColor}
                    onChange={(e) => updateWidgetConfig((p) => ({ ...p, primaryColor: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Background Color</Label>
                  <Input
                    type="color"
                    value={widgetConfig.backgroundColor}
                    onChange={(e) => updateWidgetConfig((p) => ({ ...p, backgroundColor: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Text Color</Label>
                  <Input
                    type="color"
                    value={widgetConfig.textColor}
                    onChange={(e) => updateWidgetConfig((p) => ({ ...p, textColor: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bot Name</Label>
                  <Input
                    value={widgetConfig.botName}
                    onChange={(e) => updateWidgetConfig((p) => ({ ...p, botName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Welcome Message</Label>
                  <Input
                    value={widgetConfig.welcomeMessage}
                    onChange={(e) => updateWidgetConfig((p) => ({ ...p, welcomeMessage: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Logo URL</Label>
                  <Input
                    value={widgetConfig.logoUrl}
                    onChange={(e) => updateWidgetConfig((p) => ({ ...p, logoUrl: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Position</Label>
                    <select
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                      value={widgetConfig.position}
                      onChange={(e) => updateWidgetConfig((p) => ({ ...p, position: e.target.value }))}
                    >
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Border Radius</Label>
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
                  <Label>Font Size</Label>
                  <Input
                    type="number"
                    value={widgetConfig.fontSize}
                    onChange={(e) =>
                      updateWidgetConfig((p) => ({ ...p, fontSize: Number(e.target.value) || 14 }))
                    }
                  />
                </div>
                <Button onClick={handleSaveWidget} className="w-full" disabled={isSavingWidget}>
                  {isSavingWidget ? 'Saving...' : 'Save Widget Config'}
                </Button>
                {widgetSaved ? (
                  <p className="text-sm font-medium text-emerald-600">✓ Widget configuration saved</p>
                ) : (
                  <p className="text-sm text-slate-500">Save required before moving to Step 3.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
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

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Embed Code</CardTitle>
              <CardDescription>Copy and paste this on your website.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
                {embedCode || 'Save widget customization to generate embed code.'}
              </pre>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (!embedCode) return;
                    await navigator.clipboard.writeText(embedCode);
                    toast.success('Embed code copied');
                  }}
                >
                  Copy
                </Button>
                <Button onClick={handleDone}>Done</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between">
          <Button variant="outline" disabled={step === 1} onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))}>
            Back
          </Button>
          {step < 3 ? (
            <Button
              title={step === 2 && !widgetSaved ? 'Save your widget configuration to continue' : undefined}
              disabled={(step === 1 && !canProceedStep1) || (step === 2 && !widgetSaved)}
              onClick={() => void goToStep((step + 1) as 1 | 2 | 3)}
            >
              Next
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
