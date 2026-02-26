'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api/axios-instance';
import { useLogout, useUser } from '@/lib/auth/auth-hooks';

interface OnboardingStatusResponse {
  success: boolean;
  shouldOnboard: boolean;
}

interface StartScrapeResponse {
  success: boolean;
  jobId?: string;
  status?: string;
  progress?: number;
  message?: string;
}

interface ScrapeStatusResponse {
  success: boolean;
  job?: {
    id: string;
    status: 'queued' | 'scraping' | 'indexing' | 'done' | 'failed';
    progress: number;
    message?: string | null;
    error?: string | null;
  };
}

const SCRAPE_JOB_STORAGE_KEY = 'onboarding_scrape_job_id';

export default function FirstLoginSetupPage() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const { logout } = useLogout();

  const [checkingStatus, setCheckingStatus] = useState(true);
  const [url, setURL] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [isSavingURL, setIsSavingURL] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [scrapeJobId, setScrapeJobId] = useState<string | null>(null);
  const [scrapeStatus, setScrapeStatus] = useState<'idle' | 'queued' | 'scraping' | 'indexing' | 'done' | 'failed'>('idle');
  const [scrapeProgress, setScrapeProgress] = useState(0);
  const [scrapeMessage, setScrapeMessage] = useState<string>('');
  const [scrapeError, setScrapeError] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    const checkStatus = async () => {
      if (isLoading) {
        return;
      }
      if (!user) {
        router.replace('/login');
        return;
      }

      try {
        const response = await apiClient.get<OnboardingStatusResponse>('/onboarding/status');
        if (!response.data?.shouldOnboard) {
          router.replace('/dashboard');
          return;
        }
      } catch (error) {
        console.error('Failed onboarding status check:', error);
        router.replace('/dashboard');
        return;
      }

      if (isMounted) {
        setCheckingStatus(false);
      }
    };

    checkStatus();

    return () => {
      isMounted = false;
    };
  }, [isLoading, user, router]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (scrapeJobId) {
      window.sessionStorage.setItem(SCRAPE_JOB_STORAGE_KEY, scrapeJobId);
      return;
    }
    const storedJobId = window.sessionStorage.getItem(SCRAPE_JOB_STORAGE_KEY);
    if (storedJobId) {
      setScrapeJobId(storedJobId);
      setScrapeStatus('queued');
      setScrapeMessage('Resuming scrape progress...');
    }
  }, [scrapeJobId]);

  useEffect(() => {
    if (!scrapeJobId) {
      return;
    }
    if (scrapeStatus === 'done' || scrapeStatus === 'failed') {
      return;
    }

    let stopped = false;
    const poll = async () => {
      try {
        const response = await apiClient.get<ScrapeStatusResponse>(`/onboarding/scrape-status/${scrapeJobId}`);
        const job = response.data?.job;
        if (!job || stopped) {
          return;
        }
        setScrapeStatus(job.status);
        setScrapeProgress(job.progress ?? 0);
        setScrapeMessage(job.message || '');
        setScrapeError(job.error || '');

        if (job.status === 'done') {
          toast.success('Scraping completed');
          if (typeof window !== 'undefined') {
            window.sessionStorage.removeItem(SCRAPE_JOB_STORAGE_KEY);
          }
        } else if (job.status === 'failed') {
          toast.error(job.error || 'Scraping failed');
          if (typeof window !== 'undefined') {
            window.sessionStorage.removeItem(SCRAPE_JOB_STORAGE_KEY);
          }
        }
      } catch (error: any) {
        if (!stopped) {
          setScrapeStatus('failed');
          setScrapeError(error?.response?.data?.message || 'Failed to fetch scraping status');
        }
      }
    };

    poll();
    const timer = setInterval(poll, 1500);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [scrapeJobId, scrapeStatus]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleSaveURL = async (e: FormEvent) => {
    e.preventDefault();
    const value = url.trim();
    if (!value) {
      toast.error('Please enter a URL');
      return;
    }

    try {
      new URL(value);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    setIsSavingURL(true);
    setScrapeError('');
    try {
      const response = await apiClient.post<StartScrapeResponse>('/onboarding/url', { url: value });
      const jobId = response.data?.jobId;
      if (!jobId) {
        throw new Error('missing scrape job id');
      }
      setScrapeJobId(jobId);
      setScrapeStatus((response.data?.status as 'queued' | 'scraping' | 'indexing' | 'done' | 'failed') || 'queued');
      setScrapeProgress(response.data?.progress ?? 0);
      setScrapeMessage(response.data?.message || 'Scraping started');
      toast.success('Scraping started');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save URL');
    } finally {
      setIsSavingURL(false);
    }
  };

  const handleUploadDocument = async (e: FormEvent) => {
    e.preventDefault();
    if (!documentFile) {
      toast.error('Please choose a document');
      return;
    }

    const formData = new FormData();
    formData.append('document', documentFile);

    setIsUploadingDoc(true);
    try {
      await apiClient.post('/onboarding/document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success('Document uploaded');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to upload document');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  if (isLoading || checkingStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Preparing setup...</p>
        </div>
      </div>
    );
  }

  const scrapeCompleted = scrapeStatus === 'done';
  const scrapeInProgress = ['queued', 'scraping', 'indexing'].includes(scrapeStatus);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">First-Time Setup</h1>
            <p className="text-muted-foreground">Add a website URL or upload a document to get started.</p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            Logout
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add Website URL</CardTitle>
            <CardDescription>We will scrape this URL and prepare your knowledge base.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveURL} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="source-url">Website URL</Label>
                <Input
                  id="source-url"
                  type="url"
                  placeholder="https://yourwebsite.com"
                  value={url}
                  onChange={(e) => setURL(e.target.value)}
                  disabled={scrapeInProgress}
                  required
                />
              </div>
              <Button type="submit" disabled={isSavingURL || scrapeInProgress} className="w-full">
                {isSavingURL ? 'Starting Scrape...' : 'Start Scraping'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {scrapeJobId && (
          <Card>
            <CardHeader>
              <CardTitle>Scraping Progress</CardTitle>
              <CardDescription>
                {scrapeInProgress
                  ? 'Please wait while we scrape and index your website.'
                  : scrapeCompleted
                  ? 'Scraping done. You can upload documents and then click Next.'
                  : 'Scraping failed. Please try again with a valid URL.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize">{scrapeStatus}</span>
                  <span>{scrapeProgress}%</span>
                </div>
                <div className="h-3 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      scrapeStatus === 'failed' ? 'bg-red-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${scrapeProgress}%` }}
                  />
                </div>
              </div>
              {scrapeMessage && <p className="text-sm text-muted-foreground">{scrapeMessage}</p>}
              {scrapeError && <p className="text-sm text-destructive">{scrapeError}</p>}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Or Upload Document</CardTitle>
            <CardDescription>
              {scrapeCompleted
                ? 'Upload a TXT or CSV document to add extra context.'
                : 'Upload will be enabled after scraping is complete.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUploadDocument} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="document-file">Document</Label>
                <Input
                  id="document-file"
                  type="file"
                  accept=".txt,.csv,text/plain,text/csv"
                  onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                  disabled={!scrapeCompleted}
                  required
                />
              </div>
              <Button type="submit" disabled={isUploadingDoc || !scrapeCompleted} className="w-full">
                {isUploadingDoc ? 'Uploading...' : 'Upload Document'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Button
          type="button"
          className="w-full"
          disabled={!scrapeCompleted}
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.sessionStorage.removeItem(SCRAPE_JOB_STORAGE_KEY);
            }
            router.replace('/dashboard');
          }}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
