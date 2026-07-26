import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import {
  fixedAssetsApi,
  assetCategoriesApi,
  suppliersApi,
  bankAccountsApi,
  accountsApi,
  departmentsApi,
  AssetCategory,
} from "@/lib/api";
import { Supplier } from "@/services/supplierService";
import { Layout } from "../../layout/Layout";
import {
  ArrowLeft,
  Save,
  Loader2,
  Package,
  Calculator,
  Building2,
  Banknote,
  Clock,
  Hash,
  MapPin,
  Building,
  Shield,
  X,
  BadgeCheck,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { formatCurrency as sharedFormatCurrency } from '@/lib/currencyUtils';
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/app/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Label } from "@/app/components/ui/label";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const resolveChartAccountCode = (
  preferred: string | null | undefined,
  accounts: any[],
  filter: (acc: any) => boolean,
  fallback: string,
) => {
  if (preferred && accounts.some((acc) => acc.code === preferred)) {
    return preferred;
  }
  return accounts.find(filter)?.code || fallback;
};

const normalizeDepreciationMethod = (method?: string | null) =>
  method === "none" || !method ? "straight_line" : method;

const isNonDepreciableCategory = (category: AssetCategory & { isDepreciable?: boolean; defaultDepreciationMethod?: string }) =>
  category.isDepreciable === false || category.defaultDepreciationMethod === "none";

export default function AssetCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [chartAccounts, setChartAccounts] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [showJournalEntry, setShowJournalEntry] = useState(false);
  const [journalEntry, setJournalEntry] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    categoryId: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    inServiceDate: "",
    purchaseCost: 0,
    salvageValue: 0,
    usefulLifeMonths: 60,
    depreciationMethod: "straight_line",
    decliningRate: 20,
    depreciationFrequency: "monthly",
    // Defaults aligned with the Chart of Accounts (1700-series PP&E, 1810-series accum dep)
    assetAccountCode: "1700",
    accumDepreciationAccountCode: "1810",
    depreciationExpenseAccountCode: "5800",
    supplierId: "",
    // Payment source
    bankAccountId: "",
    paymentAccountCode: "2000",
    // Acquisition method
    acquisitionMethod: "purchase",
    donationFairValue: 0,
    // New fields
    referenceNo: "",
    serialNumber: "",
    location: "",
    departmentId: "",
    warrantyStartDate: "",
    warrantyEndDate: "",
    insuredValue: 0,
    status: "in_transit",
  });

  const fetchBankAccounts = useCallback(async () => {
    try {
      const response: any = await bankAccountsApi.getAll({ isActive: true });
      if (response.success) {
        setBankAccounts(response.data || []);
      }
    } catch (error) {
      console.error("[AssetCreatePage] Failed to fetch bank accounts:", error);
    }
  }, []);

  const fetchChartAccounts = useCallback(async () => {
    try {
      const response: any = await accountsApi.getAll();
      if (response.success) {
        setChartAccounts(response.data || []);
      }
    } catch (error) {
      console.error("[AssetCreatePage] Failed to fetch chart accounts:", error);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const response: any = await departmentsApi.getAll();
      if (response.success) {
        setDepartments(response.data || []);
      }
    } catch (error) {
      console.error("[AssetCreatePage] Failed to fetch departments:", error);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response: any = await assetCategoriesApi.getAll();
      const categoryData = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.data?.data)
          ? response.data.data
          : Array.isArray(response?.data?.categories)
            ? response.data.categories
            : [];
      if (response?.success && Array.isArray(categoryData)) {
        setCategories(
          categoryData
            .filter((c: any) => (c._id || c.id) && c.isDeleted !== true)
            .map((c: any) => ({ ...c, _id: String(c._id || c.id) })),
        );
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error("[AssetCreatePage] Failed to fetch asset categories:", error);
      setCategories([]);
    }
  }, []);

  const fetchSuppliers = useCallback(async () => {
    try {
      const response: any = await suppliersApi.getAll({ isActive: true });
      if (response.success) {
        setSuppliers(response.data || []);
      }
    } catch (error) {
      console.error("[AssetCreatePage] Failed to fetch suppliers:", error);
    }
  }, []);

  const fetchAsset = useCallback(async (assetId: string) => {
    setInitialLoading(true);
    try {
      const response: any = await fixedAssetsApi.getById(assetId);
      if (response.success && response.data) {
        const asset: any = response.data;
        setFormData({
          name: asset.name || "",
          description: asset.description || "",
          categoryId: String(asset.categoryId?._id || asset.categoryId || ""),
          purchaseDate: asset.purchaseDate
            ? new Date(asset.purchaseDate).toISOString().split("T")[0]
            : "",
          inServiceDate: asset.inServiceDate
            ? new Date(asset.inServiceDate).toISOString().split("T")[0]
            : "",
          acquisitionMethod: asset.acquisitionMethod || "purchase",
          depreciationFrequency: asset.depreciationFrequency || "monthly",
          purchaseCost: getNumericValue(asset.purchaseCost),
          salvageValue: getNumericValue(asset.salvageValue),
          usefulLifeMonths: asset.usefulLifeMonths || 60,
          depreciationMethod: asset.depreciationMethod || "straight_line",
          decliningRate: asset.decliningRate || 20,
          assetAccountCode: asset.assetAccountCode || "1700",
          accumDepreciationAccountCode:
            asset.accumDepreciationAccountCode || "1810",
          depreciationExpenseAccountCode:
            asset.depreciationExpenseAccountCode || "5800",
          supplierId: asset.supplierId?._id || asset.supplierId || "",
          bankAccountId: "",
          paymentAccountCode: "2000",
          donationFairValue: getNumericValue(asset.donationFairValue),
          // New fields
          referenceNo: asset.referenceNo || "",
          serialNumber: asset.serialNumber || "",
          location: asset.location || "",
          departmentId: asset.departmentId?._id || asset.departmentId || "",
          warrantyStartDate: asset.warrantyStartDate
            ? new Date(asset.warrantyStartDate).toISOString().split("T")[0]
            : "",
          warrantyEndDate: asset.warrantyEndDate
            ? new Date(asset.warrantyEndDate).toISOString().split("T")[0]
            : "",
          insuredValue: getNumericValue(asset.insuredValue),
          status: asset.status || "active",
        });
      }
    } catch (error) {
      console.error("[AssetCreatePage] Failed to fetch asset:", error);
      toast.error(t("assets.errors.fetchFailed"));
      navigate("/assets");
    } finally {
      setInitialLoading(false);
    }
  }, [navigate, t]);

  // Fetch reference data once on mount
  useEffect(() => {
    fetchCategories();
    fetchSuppliers();
    fetchBankAccounts();
    fetchChartAccounts();
    fetchDepartments();
  }, []);

  // Fetch asset when editing
  useEffect(() => {
    if (isEdit && id) {
      fetchAsset(id);
    }
  }, [id, isEdit]);

  // Auto-select first category only once when creating (optional default)
  useEffect(() => {
    if (!isEdit && categories.length > 0 && chartAccounts.length > 0) {
      setFormData((prev: any) => {
        if (prev.categoryId && prev.categoryId !== "") return prev;
        const defaultCat =
          categories.find((c) => c.name?.toLowerCase().includes("computer")) ||
          categories[0];
        const nonDepreciable = isNonDepreciableCategory(defaultCat as AssetCategory);
        return {
          ...prev,
          categoryId: String(defaultCat._id),
          usefulLifeMonths: nonDepreciable
            ? 0
            : (defaultCat.defaultUsefulLifeMonths ?? prev.usefulLifeMonths ?? 60),
          depreciationMethod: normalizeDepreciationMethod(defaultCat.defaultDepreciationMethod),
          assetAccountCode: resolveChartAccountCode(
            defaultCat.defaultAssetAccountCode,
            chartAccounts,
            (acc) => acc.type === "asset" && acc.code?.startsWith("17"),
            "1700",
          ),
          accumDepreciationAccountCode: nonDepreciable
            ? "none"
            : resolveChartAccountCode(
                defaultCat.defaultAccumDepreciationAccountCode,
                chartAccounts,
                (acc) =>
                  acc.type === "asset" &&
                  (acc.code?.startsWith("18") ||
                    acc.name?.toLowerCase().includes("accumulated depreciation")),
                "1810",
              ),
          depreciationExpenseAccountCode: nonDepreciable
            ? "none"
            : resolveChartAccountCode(
                defaultCat.defaultDepreciationExpenseAccountCode,
                chartAccounts,
                (acc) => acc.type === "expense" && acc.code?.startsWith("58"),
                "5800",
              ),
        };
      });
    }
  }, [categories, chartAccounts, isEdit]);

  const handleCategoryChange = useCallback(
    (categoryId: string) => {
      if (!categoryId) {
        setFormData((prev) => ({ ...prev, categoryId: "" }));
        return;
      }

      const category = categories.find((c) => String(c._id) === String(categoryId));
      if (!category) {
        setFormData((prev) => ({ ...prev, categoryId: String(categoryId) }));
        return;
      }

      const nonDepreciable = isNonDepreciableCategory(category as AssetCategory);
      setFormData((prev) => ({
        ...prev,
        categoryId: String(categoryId),
        usefulLifeMonths: nonDepreciable
          ? 0
          : (category.defaultUsefulLifeMonths ?? prev.usefulLifeMonths),
        depreciationMethod: normalizeDepreciationMethod(category.defaultDepreciationMethod),
        decliningRate:
          category.defaultDepreciationMethod === "declining_balance"
            ? Number((category as any).defaultDecliningRate ?? prev.decliningRate ?? 20)
            : prev.decliningRate,
        assetAccountCode: resolveChartAccountCode(
          category.defaultAssetAccountCode,
          chartAccounts,
          (acc) => acc.type === "asset" && acc.code?.startsWith("17"),
          prev.assetAccountCode || "1700",
        ),
        accumDepreciationAccountCode: nonDepreciable
          ? "none"
          : resolveChartAccountCode(
              category.defaultAccumDepreciationAccountCode,
              chartAccounts,
              (acc) =>
                acc.type === "asset" &&
                (acc.code?.startsWith("18") ||
                  acc.name?.toLowerCase().includes("accumulated depreciation")),
              prev.accumDepreciationAccountCode || "1810",
            ),
        depreciationExpenseAccountCode: nonDepreciable
          ? "none"
          : resolveChartAccountCode(
              category.defaultDepreciationExpenseAccountCode,
              chartAccounts,
              (acc) => acc.type === "expense" && acc.code?.startsWith("58"),
              prev.depreciationExpenseAccountCode || "5800",
            ),
      }));
    },
    [categories, chartAccounts],
  );

  const calculateDepreciation = () => {
    const depreciableAmount = formData.purchaseCost - formData.salvageValue;
    if (formData.usefulLifeMonths <= 0) return 0;
    if (formData.depreciationMethod === "straight_line") {
      return depreciableAmount / formData.usefulLifeMonths;
    }
    const rate = formData.decliningRate / 100;
    return (formData.purchaseCost * rate) / 12;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data: any = {
        name: formData.name,
        description: formData.description,
        categoryId: formData.categoryId || undefined,
        purchaseDate: formData.purchaseDate,
        inServiceDate: formData.inServiceDate || undefined,
        purchaseCost: formData.purchaseCost,
        salvageValue: formData.salvageValue,
        usefulLifeMonths: formData.usefulLifeMonths,
        depreciationMethod: formData.depreciationMethod as
          | "straight_line"
          | "declining_balance",
        decliningRate:
          formData.depreciationMethod === "declining_balance"
            ? formData.decliningRate
            : undefined,
        depreciationFrequency: formData.depreciationFrequency,
        assetAccountCode: formData.assetAccountCode,
        accumDepreciationAccountCode:
          formData.accumDepreciationAccountCode === "none"
            ? undefined
            : formData.accumDepreciationAccountCode,
        depreciationExpenseAccountCode:
          formData.depreciationExpenseAccountCode === "none"
            ? undefined
            : formData.depreciationExpenseAccountCode,
        supplierId: formData.supplierId || undefined,
        // Payment source
        bankAccountId: formData.bankAccountId || undefined,
        paymentAccountCode: formData.bankAccountId
          ? undefined
          : formData.paymentAccountCode || "2000",
        // Acquisition method
        acquisitionMethod: formData.acquisitionMethod,
        donationFairValue: formData.acquisitionMethod === "donation"
          ? formData.donationFairValue || formData.purchaseCost
          : undefined,
        // New fields
        serialNumber: formData.serialNumber || undefined,
        location: formData.location || undefined,
        departmentId: formData.departmentId || undefined,
        warrantyStartDate: formData.warrantyStartDate || undefined,
        warrantyEndDate: formData.warrantyEndDate || undefined,
        insuredValue: formData.insuredValue || undefined,
        status: formData.status,
      };

      let response;
      if (isEdit && id) {
        response = await fixedAssetsApi.update(id, data);
      } else {
        response = await fixedAssetsApi.create(data);
      }

      if (response.success) {
        toast.success(
          isEdit ? t("assets.success.update") : t("assets.success.create"),
        );

        // Show journal entry if created new
        if (!isEdit && (response as any).journalEntry) {
          setJournalEntry((response as any).journalEntry);
          setShowJournalEntry(true);
        } else {
          navigate("/assets");
        }
      } else {
        toast.error((response as any).error || t("assets.errors.saveFailed"));
      }
    } catch (error: any) {
      console.error("[AssetCreatePage] Save error:", error);
      toast.error(error.response?.data?.error || t("assets.errors.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to convert MongoDB Decimal values to JavaScript numbers
  const getNumericValue = (value: any): number => {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    }
    if (typeof value === 'object') {
      // Handle MongoDB Decimal128 objects with $numberDecimal
      if (value.$numberDecimal !== undefined) {
        const num = parseFloat(value.$numberDecimal);
        return isNaN(num) ? 0 : num;
      }
      // Handle objects with toString method
      if (value.toString && typeof value.toString === 'function') {
        const str = value.toString();
        if (str === '[object Object]') return 0;
        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
      }
    }
    return 0;
  };

  const formatCurrency = (amount: any) => {
    const num = getNumericValue(amount);
    return sharedFormatCurrency(num, 'RWF');
  };

  if (initialLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const monthlyDepreciation = calculateDepreciation();
  const annualDepreciation = monthlyDepreciation * 12;
  const depreciableAmount = formData.purchaseCost - formData.salvageValue;

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1400px] 2xl:max-w-[2200px] space-y-6">
          {/* ── Hero Header ── */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="grid gap-5 p-5 xl:grid-cols-[1fr_auto] xl:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={() => navigate("/assets")} className="h-9 w-9 dark:text-slate-300 dark:hover:bg-slate-800">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                      {isEdit ? t("assets.editTitle") : t("assets.createTitle")}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {isEdit ? t("assets.editDescription") : t("assets.createDescription")}
                    </p>
                  </div>
                </div>
                {isEdit && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="h-6 border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-400">
                      <BadgeCheck className="h-3.5 w-3.5 mr-1" />
                      Editing Asset
                    </Badge>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate("/assets")} className="h-9 gap-2 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                  <X className="h-4 w-4" />
                  {t("common.cancel")}
                </Button>
                <Button size="sm" onClick={handleSubmit} disabled={submitting} className="h-9 gap-2 bg-indigo-600 hover:bg-indigo-700">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Save className="h-4 w-4" />
                  {t("common.save")}
                </Button>
              </div>
            </div>
          </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Info */}
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 dark:text-white">
                    <Package className="h-5 w-5" />
                    {t("assets.sections.basicInfo")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Reference Number - Only shown when editing */}
                  {isEdit && formData.referenceNo && (
                    <div className="space-y-2">
                      <Label htmlFor="referenceNo" className="dark:text-slate-200">
                        <Hash className="h-4 w-4 inline mr-1" />
                        {t("assets.fields.referenceNo")}
                      </Label>
                      <Input
                        id="referenceNo"
                        value={formData.referenceNo}
                        disabled
                        className="bg-muted dark:bg-slate-700"
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="dark:text-slate-200">{t("assets.fields.name")} *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        required
                        placeholder={t("assets.placeholders.name")}
                        className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category" className="dark:text-slate-200">
                        {t("assets.fields.assetCategory", "Asset Category")}
                      </Label>
                      <Select
                        value={formData.categoryId || "none"}
                        onValueChange={(value) =>
                          handleCategoryChange(value === "none" ? "" : value)
                        }
                      >
                        <SelectTrigger
                          id="category"
                          className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                        >
                          <SelectValue placeholder={t("assets.placeholders.category", "Select asset category")} />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                          <SelectItem value="none">{t("common.none", "None")}</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={String(cat._id)} value={String(cat._id)}>
                              {cat.name || "Unnamed category"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {categories.length === 0 && (
                        <p className="text-sm text-red-600 mt-1">
                          {t(
                            "assets.noAssetCategories",
                            "No asset categories available. Restart the backend or contact an administrator.",
                          )}
                        </p>
                      )}
                      {formData.categoryId && categories.length > 0 && !categories.find(c => String(c._id) === String(formData.categoryId)) && (
                        <p className="text-sm text-yellow-500 mt-1">Selected category ID not found in loaded categories (id: {String(formData.categoryId)}).</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="dark:text-slate-200">
                      {t("assets.fields.description")}
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder={t("assets.placeholders.description")}
                      rows={3}
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="serialNumber" className="dark:text-slate-200">
                        <Hash className="h-4 w-4 inline mr-1" />
                        {t("assets.fields.serialNumber")}
                      </Label>
                      <Input
                        id="serialNumber"
                        value={formData.serialNumber}
                        onChange={(e) =>
                          setFormData({ ...formData, serialNumber: e.target.value })
                        }
                        placeholder={t("assets.placeholders.serialNumber")}
                        className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location" className="dark:text-slate-200">
                        <MapPin className="h-4 w-4 inline mr-1" />
                        {t("assets.fields.location")}
                      </Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) =>
                          setFormData({ ...formData, location: e.target.value })
                        }
                        placeholder={t("assets.placeholders.location")}
                        className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="departmentId" className="dark:text-slate-200">
                        <Building className="h-4 w-4 inline mr-1" />
                        {t("assets.fields.department")}
                      </Label>
                      <Select
                        value={formData.departmentId || "none"}
                        onValueChange={(v) =>
                          setFormData({ ...formData, departmentId: v === "none" ? "" : v })
                        }
                      >
                        <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                          <SelectValue
                            placeholder={t("assets.placeholders.department")}
                          />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800">
                          <SelectItem value="none">{t("common.none")}</SelectItem>
                          {departments.map((dept: any) => (
                            <SelectItem key={dept._id} value={dept._id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status" className="dark:text-slate-200">
                        Status
                      </Label>
                      <Select
                        value={formData.status}
                        onValueChange={(v) =>
                          setFormData({ ...formData, status: v })
                        }
                      >
                        <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800">
                          <SelectItem value="in_transit">In Transit (Not yet in service)</SelectItem>
                          <SelectItem value="in_service">In Service (Active)</SelectItem>
                          <SelectItem value="under_maintenance">Under Maintenance</SelectItem>
                          <SelectItem value="idle">Idle</SelectItem>
                          <SelectItem value="fully_depreciated">Fully Depreciated</SelectItem>
                          <SelectItem value="disposed">Disposed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplier" className="dark:text-slate-200">
                      {t("assets.fields.supplier")}
                    </Label>
                    <Select
                      value={formData.supplierId}
                      onValueChange={(v) =>
                        setFormData({ ...formData, supplierId: v })
                      }
                    >
                      <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                        <SelectValue
                          placeholder={t("assets.placeholders.supplier")}
                        />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800">
                        {suppliers
                          .filter((s: any) => s._id)
                          .map((sup: any) => (
                            <SelectItem key={sup._id} value={sup._id}>
                              {sup.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Purchase Details */}
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 dark:text-white">
                    <Banknote className="h-5 w-5" />
                    {t("assets.sections.purchaseDetails")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="purchaseDate" className="dark:text-slate-200">
                        {t("assets.fields.purchaseDate")} *
                      </Label>
                      <Input
                        id="purchaseDate"
                        type="date"
                        value={formData.purchaseDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            purchaseDate: e.target.value,
                          })
                        }
                        required
                        className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inServiceDate" className="dark:text-slate-200">
                        In-Service Date
                        <span className="text-xs text-muted-foreground ml-1">(When depreciation starts)</span>
                      </Label>
                      <Input
                        id="inServiceDate"
                        type="date"
                        value={formData.inServiceDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            inServiceDate: e.target.value,
                          })
                        }
                        className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                      />
                      <p className="text-xs text-muted-foreground">
                        Leave blank to use purchase date. Depreciation starts from this date.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="purchaseCost" className="dark:text-slate-200">
                        {t("assets.fields.purchaseCost")} *
                      </Label>
                      <Input
                        id="purchaseCost"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.purchaseCost}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            purchaseCost: parseFloat(e.target.value) || 0,
                          })
                        }
                        required
                        className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="salvageValue" className="dark:text-slate-200">
                        {t("assets.fields.salvageValue")}
                      </Label>
                      <Input
                        id="salvageValue"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.salvageValue}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            salvageValue: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="dark:text-slate-200">{t("assets.fields.depreciableAmount")}</Label>
                      <div className="p-2 bg-muted rounded-md dark:bg-slate-700">
                        <span className="text-lg font-semibold dark:text-white">
                          {formatCurrency(depreciableAmount)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acquisitionMethod" className="dark:text-slate-200">
                        Acquisition Method
                      </Label>
                      <Select
                        value={formData.acquisitionMethod}
                        onValueChange={(v) =>
                          setFormData({ ...formData, acquisitionMethod: v })
                        }
                      >
                        <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800">
                          <SelectItem value="purchase">Purchase (Buy)</SelectItem>
                          <SelectItem value="construction">Construction (Built)</SelectItem>
                          <SelectItem value="donation">Donation (Received)</SelectItem>
                          <SelectItem value="exchange">Exchange (Trade-in)</SelectItem>
                          <SelectItem value="transfer">Transfer (Internal)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {formData.acquisitionMethod === "donation" && (
                      <div className="space-y-2">
                        <Label htmlFor="donationFairValue" className="dark:text-slate-200">
                          Donation Fair Value
                        </Label>
                        <Input
                          id="donationFairValue"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.donationFairValue}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              donationFairValue: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Warranty & Insurance */}
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 dark:text-white">
                    <Shield className="h-5 w-5" />
                    {t("assets.sections.warrantyInsurance")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="warrantyStartDate" className="dark:text-slate-200">
                        {t("assets.fields.warrantyStartDate")}
                      </Label>
                      <Input
                        id="warrantyStartDate"
                        type="date"
                        value={formData.warrantyStartDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            warrantyStartDate: e.target.value,
                          })
                        }
                        className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="warrantyEndDate" className="dark:text-slate-200">
                        {t("assets.fields.warrantyEndDate")}
                      </Label>
                      <Input
                        id="warrantyEndDate"
                        type="date"
                        value={formData.warrantyEndDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            warrantyEndDate: e.target.value,
                          })
                        }
                        className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="insuredValue" className="dark:text-slate-200">
                      {t("assets.fields.insuredValue")}
                    </Label>
                    <Input
                      id="insuredValue"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.insuredValue}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          insuredValue: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                    {formData.insuredValue > 0 && (
                      <p className="text-sm text-muted-foreground dark:text-slate-400">
                        {formatCurrency(formData.insuredValue)}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Depreciation Settings */}
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 dark:text-white">
                    <Calculator className="h-5 w-5" />
                    {t("assets.sections.depreciation")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="usefulLifeMonths" className="dark:text-slate-200">
                        {t("assets.fields.usefulLifeMonths")} *
                      </Label>
                      <Input
                        id="usefulLifeMonths"
                        type="number"
                        min="1"
                        value={formData.usefulLifeMonths}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            usefulLifeMonths: parseInt(e.target.value) || 60,
                          })
                        }
                        required
                        className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="depreciationMethod" className="dark:text-slate-200">
                        {t("assets.fields.depreciationMethod")} *
                      </Label>
                      <Select
                        value={formData.depreciationMethod}
                        onValueChange={(v) =>
                          setFormData({ ...formData, depreciationMethod: v })
                        }
                      >
                        <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800">
                          <SelectItem value="straight_line">Straight Line (RWA: Buildings)</SelectItem>
                          <SelectItem value="declining_balance">Declining Balance (RWA: Plant, Vehicles)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="depreciationFrequency" className="dark:text-slate-200">
                        Depreciation Frequency
                      </Label>
                      <Select
                        value={formData.depreciationFrequency}
                        onValueChange={(v) =>
                          setFormData({ ...formData, depreciationFrequency: v })
                        }
                      >
                        <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800">
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="semi_annually">Semi-Annually</SelectItem>
                          <SelectItem value="annually">Annually</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {formData.depreciationMethod === "declining_balance" && (
                      <div className="space-y-2">
                        <Label htmlFor="decliningRate" className="dark:text-slate-200">
                          {t("assets.fields.decliningRate")} (%)
                        </Label>
                        <Input
                          id="decliningRate"
                          type="number"
                          min="1"
                          max="100"
                          value={formData.decliningRate}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              decliningRate: parseInt(e.target.value) || 20,
                            })
                          }
                          className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Account Codes */}
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 dark:text-white">
                    <Building2 className="h-5 w-5" />
                    {t("assets.sections.accounts")}
                  </CardTitle>
                  <CardDescription className="dark:text-slate-400">
                    {t("assets.sections.accountsDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="assetAccountCode" className="dark:text-slate-200">
                        {t("assets.fields.assetAccount")}
                      </Label>
                      <Select
                        value={formData.assetAccountCode}
                        onValueChange={(v) =>
                          setFormData({ ...formData, assetAccountCode: v })
                        }
                      >
                        <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                          <SelectValue placeholder="Select asset account" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800">
                          {chartAccounts
                            .filter((acc: any) => acc.type === "asset" && acc.code?.startsWith("17"))
                            .map((acc: any) => (
                              <SelectItem key={acc.code} value={acc.code}>
                                {acc.code} - {acc.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accumDepreciationAccountCode" className="dark:text-slate-200">
                        {t("assets.fields.accumDepreciationAccount")}
                      </Label>
                      <Select
                        value={formData.accumDepreciationAccountCode || "none"}
                        onValueChange={(v) =>
                          setFormData({
                            ...formData,
                            accumDepreciationAccountCode: v === "none" ? "none" : v,
                          })
                        }
                      >
                        <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                          <SelectValue placeholder="Select accumulated depreciation account" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800">
                          <SelectItem value="none">{t("common.none", "None")}</SelectItem>
                          {chartAccounts
                            .filter((acc: any) => acc.type === "asset" && (acc.code?.startsWith("18") || acc.name?.toLowerCase().includes("accumulated depreciation")))
                            .map((acc: any) => (
                              <SelectItem key={acc.code} value={acc.code}>
                                {acc.code} - {acc.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="depreciationExpenseAccountCode" className="dark:text-slate-200">
                        {t("assets.fields.depreciationExpenseAccount")}
                      </Label>
                      <Select
                        value={formData.depreciationExpenseAccountCode || "none"}
                        onValueChange={(v) =>
                          setFormData({
                            ...formData,
                            depreciationExpenseAccountCode: v === "none" ? "none" : v,
                          })
                        }
                      >
                        <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                          <SelectValue placeholder="Select depreciation expense account" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800">
                          <SelectItem value="none">{t("common.none", "None")}</SelectItem>
                          {chartAccounts
                            .filter((acc: any) => acc.type === "expense" && (acc.code?.startsWith("5") || acc.code?.startsWith("6") || acc.name?.toLowerCase().includes("depreciation")))
                            .map((acc: any) => (
                              <SelectItem key={acc.code} value={acc.code}>
                                {acc.code} - {acc.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Source */}
              {!isEdit && (
                <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 dark:text-white">
                      <Banknote className="h-5 w-5" />
                      Payment Source
                    </CardTitle>
                    <CardDescription className="dark:text-slate-400">
                      How was this asset paid for? Leave blank to record as a
                      credit purchase (Accounts Payable — 2000).
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="bankAccountId" className="dark:text-slate-200">
                        Pay from Bank Account (optional)
                      </Label>
                      <Select
                        value={formData.bankAccountId}
                        onValueChange={(v) =>
                          setFormData({
                            ...formData,
                            bankAccountId: v === "none" ? "" : v,
                            paymentAccountCode: v && v !== "none" ? "" : "2000",
                          })
                        }
                      >
                        <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                          <SelectValue placeholder="Credit purchase — AP (2000)" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800">
                          <SelectItem value="none">
                            Credit purchase — Accounts Payable (2000)
                          </SelectItem>
                          {bankAccounts.map((acc: any) => (
                            <SelectItem key={acc._id} value={acc._id}>
                              {acc.name}
                              {acc.cachedBalance !== undefined
                                ? ` — Balance: ${acc.cachedBalance?.toLocaleString()}`
                                : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formData.bankAccountId ? (
                        <p className="text-xs text-muted-foreground dark:text-slate-400">
                          Journal: DR Asset Account / CR Bank Account
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground dark:text-slate-400">
                          Journal: DR Asset Account / CR Accounts Payable (2000)
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar - Summary */}
            <div className="space-y-6">
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader>
                  <CardTitle className="dark:text-white">{t("assets.sections.summary")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("assets.fields.purchaseCost")}</p>
                      <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{formatCurrency(formData.purchaseCost)}</p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
                      <Wallet className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("assets.fields.salvageValue")}</p>
                      <p className="mt-1 text-xl font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(formData.salvageValue)}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("assets.fields.depreciableAmount")}</p>
                    <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(depreciableAmount)}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Clock className="h-4 w-4" />
                    <span>{formData.usefulLifeMonths} months ({Math.floor(formData.usefulLifeMonths / 12)} years)</span>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("assets.fields.monthlyDepreciation")}</p>
                    <p className="mt-1 text-2xl font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(monthlyDepreciation)}</p>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("assets.fields.annualDepreciation")}</p>
                      <p className="mt-1 text-xl font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(annualDepreciation)}</p>
                    </div>
                    <div className="rounded-lg bg-red-50 p-2 text-red-700 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60">
                      <TrendingDown className="h-4 w-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>

        {/* Journal Entry Dialog */}
        {showJournalEntry && journalEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <Card className="w-full max-w-xl max-h-[80vh] overflow-y-auto border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-950">
              <CardHeader className="gap-1">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
                    <BadgeCheck className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-lg dark:text-white">{t("assets.journalEntry.title")}</CardTitle>
                </div>
                <CardDescription className="dark:text-slate-400">{t("assets.journalEntry.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{t("assets.journalEntry.posted")}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t("assets.journalEntry.entryNumber")}: {journalEntry.entryNumber}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm dark:text-slate-200">{t("assets.journalEntry.lines")}</Label>
                  <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-900/60">
                        <tr>
                          <th className="p-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{t("assets.journalEntry.account")}</th>
                          <th className="p-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{t("assets.journalEntry.debit")}</th>
                          <th className="p-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{t("assets.journalEntry.credit")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-slate-800">
                        {journalEntry.lines?.map((line: any, idx: number) => (
                          <tr key={idx}>
                            <td className="p-2 text-sm text-slate-700 dark:text-slate-300">{line.accountName}</td>
                            <td className="p-2 text-right text-sm text-slate-700 dark:text-slate-300">{line.debit > 0 ? formatCurrency(line.debit) : "-"}</td>
                            <td className="p-2 text-right text-sm text-slate-700 dark:text-slate-300">{line.credit > 0 ? formatCurrency(line.credit) : "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => { setShowJournalEntry(false); navigate("/assets"); }} className="bg-indigo-600 hover:bg-indigo-700">
                    {t("common.done")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      </div>
    </Layout>
  );
}
