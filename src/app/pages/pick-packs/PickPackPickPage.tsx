import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { pickPackApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  ArrowLeft,
  CheckCircle,
  Loader2,
  AlertCircle,
  Scan,
  Minus,
  Plus,
  Box,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Skeleton } from '@/app/components/ui/skeleton';
import { toast } from 'sonner';

// Helper to convert MongoDB Decimal128 to number
const toNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && '$numberDecimal' in value) {
    return parseFloat(value.$numberDecimal);
  }
  if (typeof value === 'string') return parseFloat(value) || 0;
  return 0;
};

interface PickPackLine {
  _id: string;
  product: {
    _id: string;
    name: string;
    sku: string;
  };
  description: string;
  qtyToPick: number;
  qtyPicked: number;
  location?: string;
  status: string;
}

interface PickPack {
  _id: string;
  referenceNo: string;
  salesOrder: {
    referenceNo: string;
    client: {
      name: string;
    };
  };
  warehouse: {
    name: string;
  };
  status: string;
  lines: PickPackLine[];
}

export default function PickPackPickPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pickPack, setPickPack] = useState<PickPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickingLines, setPickingLines] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPickPack();
  }, [id]);

  const fetchPickPack = async () => {
    try {
      setLoading(true);
      const response = await pickPackApi.getById(id!);
      if (response.success) {
        const data = response.data as PickPack;
        setPickPack(data);
        // Initialize picking quantities with current picked values
        const initialPicking: Record<string, number> = {};
        data.lines.forEach(line => {
          initialPicking[line._id] = toNumber(line.qtyPicked);
        });
        setPickingLines(initialPicking);
      }
    } catch (error) {
      console.error('Error fetching pick pack:', error);
      toast.error('Failed to load pick pack task');
    } finally {
      setLoading(false);
    }
  };

  const handleQtyChange = (lineId: string, delta: number) => {
    const line = pickPack?.lines.find(l => l._id === lineId);
    if (!line) return;

    const currentQty = pickingLines[lineId] || 0;
    const maxQty = toNumber(line.qtyToPick);
    const newQty = Math.max(0, Math.min(maxQty, currentQty + delta));

    setPickingLines(prev => ({ ...prev, [lineId]: newQty }));
  };

  const handleSetQty = (lineId: string, value: number) => {
    const line = pickPack?.lines.find(l => l._id === lineId);
    if (!line) return;

    const maxQty = toNumber(line.qtyToPick);
    const newQty = Math.max(0, Math.min(maxQty, value));

    setPickingLines(prev => ({ ...prev, [lineId]: newQty }));
  };

  const handleCompletePicking = async () => {
    try {
      setSubmitting(true);

      const incomplete = pickPack!.lines.filter((line) => {
        const qty = pickingLines[line._id] || 0;
        return qty < toNumber(line.qtyToPick);
      });
      if (incomplete.length > 0) {
        toast.error('Pick all quantities before completing');
        return;
      }

      // Persist each line's picked qty through the authenticated API client
      for (const line of pickPack!.lines) {
        const qtyToRecord = pickingLines[line._id] || 0;
        const currentPicked = toNumber(line.qtyPicked);

        if (qtyToRecord > currentPicked) {
          const pickRes = await pickPackApi.pickItems(id!, {
            lineId: line._id,
            qtyPicked: qtyToRecord,
            notes: '',
          });
          if (!pickRes.success) {
            throw new Error(pickRes.message || 'Failed to record picked items');
          }
        }
      }

      await pickPackApi.completePicking(id!);

      toast.success('Picking completed successfully');
      navigate(`/pick-packs/${id}`);
    } catch (error: any) {
      console.error('Error completing picking:', error);
      toast.error(error.message || 'Failed to complete picking');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1200px] 2xl:max-w-[2200px] space-y-6">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/70">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="mt-2 h-4 w-64" />
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="border-slate-200 dark:border-slate-800 dark:bg-slate-950">
                    <CardContent className="space-y-3 p-4">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-8 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div>
                <Card className="border-slate-200 dark:border-slate-800 dark:bg-slate-950">
                  <CardHeader className="space-y-1 pb-2">
                    <Skeleton className="h-5 w-32" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!pickPack) {
    return (
      <Layout>
        <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1200px] 2xl:max-w-[2200px]">
            <div className="flex flex-col items-center justify-center py-20">
              <div className="rounded-full bg-red-50 p-5 dark:bg-red-950/30">
                <AlertCircle className="h-10 w-10 text-red-500 dark:text-red-400" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
                Pick Pack Not Found
              </h2>
              <Button
                onClick={() => navigate('/pick-packs')}
                className="mt-5 gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Pick Packs
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const allPicked = pickPack.lines.every(line => {
    const picked = pickingLines[line._id] || 0;
    return picked >= toNumber(line.qtyToPick);
  });

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1200px] 2xl:max-w-[2200px] space-y-6">
          {/* Hero Header */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="p-5">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/pick-packs/${id}`)}
                  className="h-9 gap-1 dark:border-slate-700 dark:text-slate-200"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
                <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60">
                  <Box className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                    Pick Items
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {pickPack.referenceNo} - {pickPack.salesOrder?.client?.name}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Picking List */}
            <div className="lg:col-span-2 space-y-4">
              {pickPack.lines.map((line) => {
                const qtyToPick = toNumber(line.qtyToPick);
                const pickedQty = pickingLines[line._id] || 0;
                const isComplete = pickedQty >= qtyToPick;
                const progress = qtyToPick > 0 ? (pickedQty / qtyToPick) * 100 : 0;

                return (
                  <Card
                    key={line._id}
                    className={`border-slate-200 bg-white shadow-sm transition-all dark:border-slate-800 dark:bg-slate-950 ${
                      isComplete ? 'border-emerald-400 ring-1 ring-emerald-100 dark:border-emerald-700 dark:ring-emerald-900/30' : ''
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-slate-900 dark:text-white">{line.description}</h3>
                            {isComplete && (
                              <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Picked
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{line.product?.sku}</p>
                          {line.location && (
                            <p className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400">
                              <Scan className="h-3 w-3" />
                              Location: {line.location}
                            </p>
                          )}
                          <div className="mt-2 w-full max-w-[200px]">
                            <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                              <div
                                className="h-1.5 rounded-full bg-amber-500 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-xs text-slate-500 dark:text-slate-400">To Pick: {qtyToPick}</div>
                            <div className="text-lg font-bold text-slate-900 dark:text-white">
                              {pickedQty} <span className="text-sm font-normal text-slate-500">/ {qtyToPick}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQtyChange(line._id, -1)}
                              disabled={pickedQty <= 0 || submitting}
                              className="h-9 w-9 p-0 dark:border-slate-700"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Input
                              type="number"
                              min="0"
                              max={qtyToPick}
                              value={pickedQty}
                              onChange={(e) => handleSetQty(line._id, parseInt(e.target.value) || 0)}
                              className="h-9 w-16 bg-white text-center dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                              disabled={submitting}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQtyChange(line._id, 1)}
                              disabled={pickedQty >= qtyToPick || submitting}
                              className="h-9 w-9 p-0 dark:border-slate-700"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="space-y-1 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-amber-50 p-1.5 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                      Picking Summary
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Total Items</span>
                    <span className="font-medium text-slate-900 dark:text-white">{pickPack.lines.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Picked</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      {pickPack.lines.filter(l => (pickingLines[l._id] || 0) >= toNumber(l.qtyToPick)).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Remaining</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {pickPack.lines.filter(l => (pickingLines[l._id] || 0) < toNumber(l.qtyToPick)).length}
                    </span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-2 rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${pickPack.lines.length > 0 ? (pickPack.lines.filter(l => (pickingLines[l._id] || 0) >= toNumber(l.qtyToPick)).length / pickPack.lines.length) * 100 : 0}%` }}
                    />
                  </div>

                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleCompletePicking}
                    disabled={submitting || !allPicked}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Complete Picking
                      </>
                    )}
                  </Button>

                  {!allPicked && (
                    <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                      Pick all items before completing
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
