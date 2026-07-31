import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle, FileText } from 'lucide-react';
import { API_BASE_URL } from '@/lib/apiBase';

// Simple public page for clients to accept/reject with reason via signed token
export default function ClientQuotationPublicPage() {
  const { token, action } = useParams<{ token: string; action: string }>();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const apiBase = API_BASE_URL;

  const normalizedAction = action === 'accept' ? 'accept' : action === 'reject' ? 'reject' : 'accept';

  const handleSubmit = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      const endpoint = `${apiBase}/quotations/public/${token}/${normalizedAction}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name || undefined, email: email || undefined, comment: comment || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        toast.error(data?.message || 'Failed to submit response');
      } else {
        toast.success(`Quotation ${normalizedAction}ed successfully`);
        setSubmitted(true);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Card className="border-slate-200 shadow-sm dark:border-slate-800">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60">
              {normalizedAction === 'accept' ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                {normalizedAction === 'accept' ? 'Accept Quotation' : 'Reject Quotation'}
              </CardTitle>
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Public response via secure link</div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>Quotation response</span>
                <Badge variant="outline" className="ml-auto capitalize dark:border-slate-700 dark:text-slate-300">
                  {normalizedAction}
                </Badge>
              </div>
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Your decision will be recorded with the provided details.
              </div>
            </div>

            <div className="grid gap-3">
              <label className="text-sm text-slate-700 dark:text-slate-200">
                Name (optional)
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="mt-1" />
              </label>
              <label className="text-sm text-slate-700 dark:text-slate-200">
                Email (optional)
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="mt-1" />
              </label>
              <label className="text-sm text-slate-700 dark:text-slate-200">
                Comment / reason
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a note (reason for acceptance or rejection)" className="mt-1" />
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate('/')}>Back to home</Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || submitted}
                className={normalizedAction === 'accept' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : normalizedAction === 'accept' ? <CheckCircle className="mr-2 h-4 w-4" /> : <XCircle className="mr-2 h-4 w-4" />}<span>{submitted ? 'Submitted' : normalizedAction === 'accept' ? 'Accept' : 'Reject'}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
