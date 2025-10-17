import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    InputAdornment,
    ListItemIcon,
    Menu,
    MenuItem as MuiMenuItem,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell as MuiTableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    ToggleButton as MuiToggleButton,
    ToggleButtonGroup,
    Typography,
} from "@mui/material";
import { keyframes, styled } from "@mui/material/styles";
import {
    IconArrowRight,
    IconDots,
    IconEdit,
    IconEye,
    IconFileDownload,
    IconFileSpreadsheet,
    IconFileText,
    IconReload,
    IconSearch,
    IconTrash,
    IconX,
} from "@tabler/icons-react";
import BoltIcon from "@mui/icons-material/Bolt";
import BlankCard from "src/components/shared/BlankCard";
import CustomFormLabel from "src/components/forms/theme-elements/CustomFormLabel";
import CustomTextField from "src/components/forms/theme-elements/CustomTextField";
import { useTooltip, CustomTooltip } from "src/context/TooltipContext";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { tr } from "date-fns/locale";
import { format } from "date-fns";
import axios from "axios";
import server from "src/assets/address.json";
import { useAuth } from "src/context/AuthContext";
import DeleteStoreReceiptInvoice from "./DeleteStoreReceiptInvoice";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { NotoSansRegular } from "src/assets/fonts/NotoSans-Regular";
import Logo from "src/assets/images/logos/logo.png";
import Excel from "exceljs";
import { saveAs } from "file-saver";

// ---------- Styled ----------
const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: "NotoSans",
    fontSize: "0.8rem",
    [theme.breakpoints.up("md")]: { fontSize: "1rem" },
}));

const StyledToggleButton = styled(MuiToggleButton)(({ theme, value, selected }) => ({
    "&.Mui-selected": {
        color: "white",
        ...(value === "all" &&
            selected && { backgroundColor: theme.palette.primary.main, "&:hover": { backgroundColor: theme.palette.primary.dark } }),
        ...(value === "active" &&
            selected && { backgroundColor: theme.palette.success.main, "&:hover": { backgroundColor: theme.palette.success.dark } }),
        ...(value === "inactive" &&
            selected && { backgroundColor: theme.palette.error.main, "&:hover": { backgroundColor: theme.palette.error.dark } }),
    },
    "&:not(.Mui-selected)": {
        color: theme.palette.text.primary,
        borderColor: theme.palette.divider,
        "&:hover": { backgroundColor: theme.palette.action.hover },
    },
}));

const blinkAnimation = keyframes`
  0% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
  50% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(103, 58, 183, 0.7); }
  100% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
`;
const BlinkingButton = styled(Button)<{ isBlinking: boolean }>(({ isBlinking }) => ({
    animation: isBlinking ? `${blinkAnimation} 1.5s infinite` : "none",
    transition: "transform 0.3s ease-in-out",
}));

// ---------- Types ----------
interface RegionType { id: string; name: string; depth: number; recordStatus: number; }
interface WorkhouseType {
    id: number;
    name: string;
    code: string;
    address: string;
    createAt: string;
    recordStatus: number;
    region: RegionType | null;
    work: { id: string; title: string } | null;
    status: "Aktif" | "Pasif";
}
interface StoreType {
    id: string;
    name: string;
    code: string;
    address?: string;
    createAt?: string;
    recordStatus: number;
    workhouse?: { id: string; name: string; code: string; recordStatus: number };
}
interface UnitType { id: string; title: string }
interface ItemType { id: string; name: string; abbreviation?: string; unit?: UnitType }
interface InvoiceHeaderType {
    id: string;
    invoiceNo: string;
    docDate: string;
}
interface InvoiceDetailFromList {
    id: string;
    quantity: string;
    description: string | null;
    item: ItemType;
}
interface InvoiceFromWorkhouse {
    id: string;                // header id
    invoiceNo: string;
    docDate: string;
    recordStatus: number;
    invoiceDetails: InvoiceDetailFromList[];
}
interface InvoiceDetailOnReceipt {
    id: string;
    quantity: string;
    description: string;
    invoiceHeader: InvoiceHeaderType;
}
interface ReceiptDetailType {
    id: string;
    quantity: string;
    description: string;
    item: ItemType;
    invoiceDetail: InvoiceDetailOnReceipt | null;
}
interface StoreReceiptType {
    id: string;
    code: string;
    docDate: string;
    createAt: string;
    recordStatus: number;
    isEnd: boolean | null;
    storeReceiptDetails: ReceiptDetailType[];
    store: StoreType;
}
interface FormReceiptDetail {
    itemId: number | null;
    quantity: number | string;
    description: string;
    invoiceDetailId: number | null;
    item?: ItemType;
}
// بالای فایل، کنار بقیه‌ی اینترفیس‌ها
interface InactiveInvoiceRow {
    receiptId: string;         // id خودِ رسید
    receiptCode: string;       // code رسید
    docDate: string;           // تاریخ رسید
    invoiceHeaderId?: string;  // id هدر فاکتور (برای نمایش/نیازهای بعدی)
    invoiceNo?: string;        // شماره فاکتور
}


// ---------- Utils ----------
const formatDateDisplay = (iso: string | null) => {
    if (!iso) return "N/A";
    try { return format(new Date(iso), "dd MMMM yyyy", { locale: tr }); } catch { return "Geçersiz Tarih"; }
};

// ---------- PDF/Excel helpers ----------
const addPdfHeader = (doc: jsPDF, title: string, subtitle?: string) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const docAny = doc as any;
    docAny.addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
    docAny.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
    doc.setFont("NotoSans");
    docAny.addImage(Logo, "PNG", pageWidth - 50, 30, 40, 25);
    doc.setFontSize(14);
    doc.text(title, pageWidth / 2, 35, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Rapor Tarihi:`, 15, 45);
    doc.text(`${formatDateDisplay(new Date().toISOString())}`, 45, 45);
    if (subtitle) doc.text(subtitle, pageWidth - 15, 45, { align: "right" });
};
const addPdfFooter = (doc: jsPDF) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setFont("NotoSans", "normal");
    const companyInfo = [
        "SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.",
        "Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11",
        "http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr",
    ];
    let footerY = pageHeight - 30;
    companyInfo.forEach((line) => { doc.text(line, pageWidth / 2, footerY, { align: "center" }); footerY += 4; });
    doc.setFontSize(10);
    doc.text("İmza", pageWidth - 15, pageHeight - 10, { align: "right" });
    doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
    const docAny = doc as any;
    const pageCount = docAny.internal.getNumberOfPages();
    doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
};

// ---------- Component ----------
const ListStoreReceiptInvoice: React.FC = () => {
    const navigate = useNavigate();
    const { storeId: routeStoreId } = useParams<{ storeId: string }>();
    const authToken = localStorage.getItem("authToken");

    // UI/Perms
    const { isTooltipGloballyEnabled } = useTooltip();
    const { allowedOperations } = useAuth();
    const hasCreatePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === "Eklemek"), [allowedOperations]);
    const hasEditPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === "Düzenlemek"), [allowedOperations]);
    const hasDeletePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === "Silmek"), [allowedOperations]);
    const hasDownloadPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === "İndirmek ve Yazdırmak"), [allowedOperations]);

    // Lists / data
    const [workhousesList, setWorkhousesList] = useState<WorkhouseType[]>([]);
    const [storesList, setStoresList] = useState<StoreType[]>([]);
    const [invoicesList, setInvoicesList] = useState<InvoiceFromWorkhouse[]>([]);
    const [receiptsList, setReceiptsList] = useState<StoreReceiptType[]>([]);
    const [displayedReceipts, setDisplayedReceipts] = useState<StoreReceiptType[]>([]);

    // Selections
    const [selectedWorkhouse, setSelectedWorkhouse] = useState<WorkhouseType | null>(null);
    const [selectedStore, setSelectedStore] = useState<StoreType | null>(null);
    const [selectedInvoice, setSelectedInvoice] = useState<InvoiceFromWorkhouse | null>(null);

    // Form/detail
    const [docDate, setDocDate] = useState<Date | null>(new Date());
    const [receiptDetails, setReceiptDetails] = useState<FormReceiptDetail[]>([]);
    const [removedReceiptDetails, setRemovedReceiptDetails] = useState<FormReceiptDetail[]>([]);

    // Table/UI
    const [loadingData, setLoadingData] = useState(true);
    const [loadingButton, setLoadingButton] = useState(false);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isBlinking, setIsBlinking] = useState(true);
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [isFilterActive, setIsFilterActive] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    // Menu & dialogs
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<StoreReceiptType | null>(null);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [receiptIdToDelete, setReceiptIdToDelete] = useState<string | null>(null);
    const [receiptCodeToDelete, setReceiptCodeToDelete] = useState<string>("");

    const [openDetailsModal, setOpenDetailsModal] = useState(false);
    const [detailsToShow, setDetailsToShow] = useState<ReceiptDetailType[]>([]);

    const [openDownloadAllModal, setOpenDownloadAllModal] = useState(false);
    const [openDownloadFilteredModal, setOpenDownloadFilteredModal] = useState(false);
    const [openRowDownloadModal, setOpenRowDownloadModal] = useState(false);
    const [selectedReceiptForDownload, setSelectedReceiptForDownload] = useState<StoreReceiptType | null>(null);

    // isEnd modal
    const [openIsEndModal, setOpenIsEndModal] = useState(false);
    const [justInsertedReceipt, setJustInsertedReceipt] = useState<{ id: string; invoiceNo: string; invoiceHeaderId: string } | null>(null);

    // editing
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingCode, setEditingCode] = useState<string | null>(null);


    // داخل کامپوننت:
    const [openInactiveModal, setOpenInactiveModal] = useState(false);
    const [inactiveInvoices, setInactiveInvoices] = useState<InactiveInvoiceRow[]>([]);

    // Alerts
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<"success" | "error" | "warning" | "info">("info");
    const showAlert = useCallback((msg: string, sev: "success" | "error" | "warning" | "info") => {
        setAlertMessage(msg); setAlertSeverity(sev);
        setTimeout(() => setAlertMessage(null), 5000);
    }, []);

    // ---------- API ----------
    const fetchWorkhouses = useCallback(async () => {
        setLoadingData(true);
        const token = localStorage.getItem("authToken");
        if (!token) { navigate("/"); setLoadingData(false); return; }
        try {
            const res = await axios.get(server.baseurl + server.initialoperations + "get-workhouse", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.data?.httpStatusCode === 200 && Array.isArray(res.data.data)) {
                const all: WorkhouseType[] = res.data.data.map((w: any) => ({
                    id: Number(w.id),
                    name: w.name,
                    code: w.code,
                    address: w.address,
                    createAt: w.createAt,
                    recordStatus: w.recordStatus,
                    region: w.region ?? null,
                    work: w.work ?? null,
                    status: "Aktif",
                }));
                setWorkhousesList(all.filter((w) => w.recordStatus === 0));
            } else {
                showAlert(res.data?.message || "Kargahlar yüklenirken bir hata oluştu.", "error");
                setWorkhousesList([]);
            }
        } catch (_e) {
            showAlert("Kargahlar yüklenirken bir hata oluştu.", "error");
            setWorkhousesList([]);
        } finally { setLoadingData(false); }
    }, [navigate, showAlert]);

    const fetchStoresByWorkhouseId = useCallback(
        async (workhouseId: string) => {
            if (!authToken) { navigate("/"); return []; }
            try {
                const response = await axios.get(
                    server.baseurl + server.initialoperations + `get-stores-by-workhouse-id/${Number(workhouseId)}`,
                    { headers: { Authorization: `Bearer ${authToken}` } }
                );
                if (response.data.httpStatusCode === 200) {
                    const activeStores = (response.data.data as StoreType[]).filter((s) => s.recordStatus === 0);
                    setStoresList(activeStores);
                    return activeStores;
                } else {
                    showAlert(response.data.message || "Şantiyeler yüklenirken bir hata oluştu.", "error");
                    setStoresList([]);
                    return [];
                }
            } catch (e) {
                showAlert("Şantiyeler yüklenirken bir hata oluştu.", "error");
                setStoresList([]);
                return [];
            }
        },
        [authToken, navigate, showAlert]
    );

    const fetchInvoicesByWorkhouseId = useCallback(
        async (workhouseId: string) => {
            if (!authToken) { navigate("/"); return []; }
            try {
                const res = await axios.get(
                    server.baseurl + server.initialoperations + `get-invoices-by-workhouse-id/${workhouseId}`,
                    { headers: { Authorization: `Bearer ${authToken}` } }
                );
                if (res.data?.httpStatusCode === 200 && Array.isArray(res.data.data)) {
                    const list: InvoiceFromWorkhouse[] = res.data.data
                        .filter((h: any) => h.recordStatus === 0)
                        .map((h: any) => ({
                            id: String(h.id),
                            invoiceNo: String(h.invoiceNo),
                            docDate: String(h.docDate),
                            recordStatus: Number(h.recordStatus),
                            invoiceDetails: (h.invoiceDetails || []).map((d: any) => ({
                                id: String(d.id),
                                quantity: String(d.quantity),
                                description: d.description || null,
                                item: d.item,
                            })),
                        }));
                    setInvoicesList(list);
                    return list;
                } else {
                    showAlert(res.data?.message || "Fatura belgeleri yüklenirken bir hata oluştu.", "error");
                    setInvoicesList([]);
                    return [];
                }
            } catch (_e) {
                showAlert("Fatura belgeleri yüklenirken bir hata oluştu.", "error");
                setInvoicesList([]);
                return [];
            }
        },
        [authToken, navigate, showAlert]
    );

    const fetchReceipts = useCallback(async () => {
        setLoadingData(true);
        if (!authToken) { navigate("/"); return; }
        try {
            const res = await axios.get(server.baseurl + server.warehouse + "get-store-receipts-by-invoice", {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            if (res.data?.httpStatusCode === 200 && Array.isArray(res.data.data)) {
                setReceiptsList(res.data.data);
            } else {
                showAlert(res.data?.message || "Fişler yüklenirken bir hata oluştu.", "error");
            }
        } catch (_e) {
            showAlert("Fişler yüklenirken bir hata oluştu.", "error");
        } finally { setLoadingData(false); }
    }, [authToken, navigate, showAlert]);

    // ---------- Derived sets ----------
    // مجموعه‌ی فاکتورهایی که قبلاً برای همین Store خاتمه (isEnd=true) خورده‌اند => از کمبو حذف شوند
    const endedInvoiceHeaderIdsForSelectedStore = useMemo(() => {
        if (!selectedStore) return new Set<string>();
        const set = new Set<string>();
        (receiptsList || [])
            .filter(r => r.isEnd === true && r.store?.id === selectedStore.id)
            .forEach(r => {
                (r.storeReceiptDetails || []).forEach(d => {
                    const invId = d?.invoiceDetail?.invoiceHeader?.id;
                    if (invId) set.add(String(invId));
                });
            });
        return set;
    }, [receiptsList, selectedStore]);

    const filteredInvoicesForCombo = useMemo(() => {
        if (!invoicesList) return [];
        if (!selectedStore) return invoicesList; // تا زمان انتخاب Store، فیلتر نکن
        return invoicesList.filter(inv => !endedInvoiceHeaderIdsForSelectedStore.has(inv.id));
    }, [invoicesList, endedInvoiceHeaderIdsForSelectedStore, selectedStore]);

    // ---------- Effects ----------
    useEffect(() => { fetchReceipts(); fetchWorkhouses(); }, [fetchReceipts, fetchWorkhouses]);

    // اگر از routeStoreId وارد شدیم، هنگام ویرایش/لیست، امکان انتخاب workhouse را هم با دریافت از receipt فراهم می‌کنیم
    useEffect(() => {
        if (!routeStoreId) return;
        // nothing else here; هنگام کلیک روی ویرایش، از خود ردیف، workhouse را ست می‌کنیم
    }, [routeStoreId]);

    useEffect(() => {
        const hasSearch = searchTerm.trim() !== "";
        const hasStatus = statusFilter !== "all";
        const hasDate = startDate !== null || endDate !== null;
        setIsFilterActive(hasSearch || hasStatus || hasDate);

        const filtered = (receiptsList || []).filter((r) => {
            const matchesSearch =
                r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (r.store?.name && r.store.name.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "active" && r.recordStatus === 0) ||
                (statusFilter === "inactive" && r.recordStatus === 1);
            const d = new Date(r.docDate);
            const matchesDate =
                (!startDate || d >= new Date(new Date(startDate).setHours(0, 0, 0, 0))) &&
                (!endDate || d <= new Date(new Date(endDate).setHours(23, 59, 59, 999)));
            return matchesSearch && matchesStatus && matchesDate;
        });
        setDisplayedReceipts(filtered);
        setPage(0);
    }, [receiptsList, searchTerm, statusFilter, startDate, endDate]);

    useEffect(() => {
        const t = setTimeout(() => setIsBlinking(false), 4000);
        return () => clearTimeout(t);
    }, []);

    // وقتی receiptsList یا انتخاب فروشگاه/روت تغییر کرد، لیست خاتمه‌یافته‌ها را بساز
    useEffect(() => {
        // فقط رسیدهای همین Store (routeStoreId یا selectedStore) که isEnd === true
        const storeId = String(routeStoreId || selectedStore?.id || "");
        if (!storeId) { setInactiveInvoices([]); return; }

        const rows: InactiveInvoiceRow[] =
            (receiptsList || [])
                .filter(r => r.store?.id === storeId && r.isEnd === true)
                .map(r => {
                    const invHeader = r.storeReceiptDetails?.[0]?.invoiceDetail?.invoiceHeader;
                    return {
                        receiptId: String(r.id),
                        receiptCode: String(r.code || "-"),
                        docDate: String(r.docDate),
                        invoiceHeaderId: invHeader?.id,
                        invoiceNo: invHeader?.invoiceNo
                    };
                });

        setInactiveInvoices(rows);
    }, [receiptsList, routeStoreId, selectedStore]);


    const isFormValid = useMemo(() => {
        const detailsOk =
            receiptDetails.length > 0 &&
            receiptDetails.every((d) => !!d.itemId && Number(d.quantity) > 0 && !!d.invoiceDetailId);
        return !!docDate && !!selectedWorkhouse && !!selectedStore && !!selectedInvoice && detailsOk;
    }, [docDate, selectedWorkhouse, selectedStore, selectedInvoice, receiptDetails]);

    // ---------- Handlers ----------
    const resetForm = () => {
        setDocDate(new Date());
        setSelectedWorkhouse(null);
        setSelectedStore(null);
        setSelectedInvoice(null);
        setStoresList([]);
        setInvoicesList([]);
        setReceiptDetails([]);
        setRemovedReceiptDetails([]);
        setEditingId(null);
        setEditingCode(null);
        setIsFormVisible(false);
    };


    const handleRemoveReceiptDetail = (index: number) => {
        setReceiptDetails((prev) => {
            const item = prev[index];
            if (item && selectedInvoice) {
                const itemFromInv = selectedInvoice.invoiceDetails.find((d) => Number(d.id) === Number(item.invoiceDetailId))?.item;
                setRemovedReceiptDetails((p) => [...p, { ...item, item: itemFromInv }]);
            }
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleRestoreLastRemoved = (idx: number) => {
        const restore = removedReceiptDetails[idx];
        if (restore) {
            setReceiptDetails((p) => [...p, restore]);
            setRemovedReceiptDetails((p) => p.filter((_, i) => i !== idx));
        }
    };

    const handleReceiptDetailChange = useCallback(
        (index: number, field: keyof FormReceiptDetail, value: any) => {
            setReceiptDetails((prev) => {
                const list = [...prev];
                const cur = { ...list[index] };
                if (field === "quantity") {
                    const num = Number(value);
                    const invDetail = selectedInvoice?.invoiceDetails.find((d) => Number(d.id) === Number(cur.invoiceDetailId));
                    const max = invDetail ? Number(invDetail.quantity) : Infinity;
                    if (num < 0) { showAlert("Miktar negatif olamaz!", "warning"); cur.quantity = 0; }
                    else if (num > max) { showAlert(`Girdiğiniz miktar Fatura miktarından fazla! Maksimum: ${max}`, "warning"); cur.quantity = max; }
                    else cur.quantity = value;
                } else (cur as any)[field] = value;
                list[index] = cur;
                return list;
            });
        },
        [selectedInvoice, showAlert]
    );

    const handleCloseMenu = () => { setAnchorEl(null); setSelectedRowForMenu(null); };

    const handleEditClick = async () => {
        if (!selectedRowForMenu) return;
        handleCloseMenu();
        setLoadingData(true);
        try {
            const r = selectedRowForMenu;

            // 1) Workhouse را از ردیف پیدا کن
            const whId = r.store?.workhouse?.id;
            if (!whId) { showAlert("Bu fiş için Workhouse bulunamadı.", "error"); setLoadingData(false); return; }

            // 2) ست‌کردن Workhouse و گرفتن stores + invoices
            const wh = workhousesList.find((w) => String(w.id) === String(whId)) || null;
            setSelectedWorkhouse(wh || null);
            await fetchStoresByWorkhouseId(String(whId));
            const invs = await fetchInvoicesByWorkhouseId(String(whId));

            // 3) Store انتخابی
            const storeFromRow = r.store ? (storesList.find((s) => s.id === r.store.id) || r.store) : null;
            setSelectedStore(storeFromRow);

            // 4) Invoice انتخابی از جزئیات رسید
            const invoiceHeaderId = r.storeReceiptDetails?.[0]?.invoiceDetail?.invoiceHeader?.id;
            const foundInv = invoiceHeaderId ? invs.find((i) => i.id === String(invoiceHeaderId)) || null : null;
            setSelectedInvoice(foundInv);

            // 5) تاریخ/کد/جزئیات
            setEditingId(r.id);
            setEditingCode(r.code);
            setDocDate(new Date(r.docDate));

            const details: FormReceiptDetail[] = (r.storeReceiptDetails || []).map((d) => ({
                itemId: Number(d.item?.id),
                quantity: Number(d.quantity),
                description: d.description || "",
                invoiceDetailId: d.invoiceDetail ? Number(d.invoiceDetail.id) : null,
                item: d.item,
            }));
            setReceiptDetails(details);
            setRemovedReceiptDetails([]);
            setIsFormVisible(true);
        } catch (e: any) {
            showAlert(e.response?.data?.message || "Veri yüklenirken bir hata oluştu.", "error");
        } finally {
            setLoadingData(false);
        }
    };

    const handleClickOpenDeleteModal = () => {
        if (selectedRowForMenu) {
            setReceiptIdToDelete(selectedRowForMenu.id);
            setReceiptCodeToDelete(selectedRowForMenu.code);
            setOpenDeleteModal(true);
        }
        handleCloseMenu();
    };
    const handleCloseDeleteModal = () => {
        setOpenDeleteModal(false);
        setReceiptIdToDelete(null);
        setReceiptCodeToDelete("");
        fetchReceipts();
    };

    const handleClearDateFilters = () => { setStartDate(null); setEndDate(null); };

    // تازه‌گیری مستقیم بدون تکیه به state
    const fetchReceiptsRaw = async (): Promise<StoreReceiptType[]> => {
        if (!authToken) { navigate("/"); return []; }
        try {
            const res = await axios.get(
                server.baseurl + server.warehouse + "get-store-receipts-by-invoice",
                { headers: { Authorization: `Bearer ${authToken}` } }
            );
            return (res.data?.httpStatusCode === 200 && Array.isArray(res.data.data)) ? res.data.data : [];
        } catch {
            return [];
        }
    };

    // از بین رسیدهای یک Store، جدیدترین را انتخاب می‌کند
    const pickLatestReceiptForStore = (
        receipts: StoreReceiptType[],
        storeId: string
    ): StoreReceiptType | null => {
        const filtered = receipts.filter(r => r.store?.id === storeId);
        if (filtered.length === 0) return null;
        const safe = (s?: string) => (s ? new Date(s).getTime() : 0);
        filtered.sort((a, b) => {
            const ca = safe(a.createAt), cb = safe(b.createAt);
            if (cb !== ca) return cb - ca;
            const da = safe(a.docDate), db = safe(b.docDate);
            if (db !== da) return db - da;
            return String(b.code || "").localeCompare(String(a.code || ""));
        });
        return filtered[0];
    };



    // ---------- CRUD ----------
    const insertReceipt = async () => {
        if (!isFormValid) {
            showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning');
            return;
        }
        setLoadingButton(true);
        if (!authToken) { navigate("/"); return; }

        // قبل از ریست، Store/Invoice انتخاب‌شده را نگه دار
        const storeIdForPick = String(routeStoreId || selectedStore?.id || "");

        try {
            const payload = {
                docDate: docDate?.toISOString(),
                storeId: Number(routeStoreId || selectedStore?.id),
                receiptDetails: receiptDetails.map(d => ({
                    itemId: d.itemId,
                    quantity: Number(d.quantity),
                    description: d.description,
                    invoiceDetailId: d.invoiceDetailId,
                })),
            };

            const res = await axios.post(
                server.baseurl + server.warehouse + "create-store-receipt-by-invoice",
                payload,
                { headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" } }
            );

            if (res.data?.httpStatusCode === 201) {
                showAlert('Yeni fiş başarıyla eklendi!', 'success');

                // ✨ کلید حل مشکل: یک GET تازه بزن
                const freshReceipts = await fetchReceiptsRaw();

                // آخرین رسید همین Store را پیدا کن
                const latest = pickLatestReceiptForStore(freshReceipts, storeIdForPick);

                if (latest && latest.isEnd !== true) {
                    const invHeader = latest.storeReceiptDetails?.[0]?.invoiceDetail?.invoiceHeader;
                    if (invHeader) {
                        // نمایش شماره فاکتور و Header ID در مودال
                        setJustInsertedReceipt({
                            id: latest.id,
                            invoiceNo: invHeader.invoiceNo,
                            invoiceHeaderId: invHeader.id,
                        });
                        setOpenIsEndModal(true);
                    }
                }

                // برای جدول اصلی هم state را تازه کن
                setReceiptsList(freshReceipts);

                // فرم را در انتها ریست کن
                resetForm();
            } else {
                showAlert(res.data?.message || 'Fiş eklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Fiş eklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };


    const editReceipt = async () => {
        if (!editingId || !isFormValid) { showAlert("Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.", "warning"); return; }
        setLoadingButton(true);
        if (!authToken) { navigate("/"); return; }
        try {
            const payload = {
                id: Number(editingId),
                code: editingCode,
                docDate: docDate?.toISOString(),
                storeId: Number(routeStoreId || selectedStore?.id),
                receiptDetails: receiptDetails.map((d) => ({
                    itemId: d.itemId,
                    quantity: Number(d.quantity),
                    description: d.description,
                    invoiceDetailId: d.invoiceDetailId,
                })),
            };
            const res = await axios.put(server.baseurl + server.warehouse + "update-store-receipt-by-invoice", payload, {
                headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
            });
            if (res.data?.httpStatusCode === 200) {
                showAlert("Fiş başarıyla güncellendi!", "success");
                resetForm();
                fetchReceipts();
            } else {
                showAlert(res.data?.message || "Fiş güncellenirken bir hata oluştu.", "error");
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert("Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.", "error");
            else if (e.response?.status === 401) { localStorage.removeItem("authToken"); showAlert("Oturum süreniz doldu, lütfen tekrar giriş yapın.", "error"); navigate("/"); }
            else showAlert(e.response?.data?.message || "Fiş güncellenirken bir hata oluştu.", "error");
        } finally { setLoadingButton(false); }
    };

    // isEnd confirm
    const handleFinalizeIsEnd = async (confirm: boolean) => {
        setOpenIsEndModal(false);
        if (!confirm || !justInsertedReceipt) { setJustInsertedReceipt(null); return; }
        if (!authToken) { navigate("/"); return; }
        try {
            const payload = { id: Number(justInsertedReceipt.id), isEnd: true };
            const res = await axios.put(
                server.baseurl + server.warehouse + "update-store-receipt-is-end",
                payload,
                { headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" } }
            );
            if (res.data?.httpStatusCode === 200) {
                showAlert(`Fatura ${justInsertedReceipt.invoiceNo} sonlandırıldı.`, 'success');
                setJustInsertedReceipt(null);

                // تازه‌گیری رسیدها
                const fresh = await fetchReceiptsRaw();
                setReceiptsList(fresh);

                // تازه‌گیری فاکتورهای کمبو (تا آیتم خاتمه‌یافته حذف شود)
                if (selectedWorkhouse) {
                    await fetchInvoicesByWorkhouseId(String(selectedWorkhouse.id));
                }
            } else {
                showAlert(res.data?.message || 'Fatura sonlandırılırken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Fatura sonlandırılırken bir hata oluştu.', 'error');
        }
    };

    const handleReactivateInvoice = async (row: InactiveInvoiceRow) => {
        if (!authToken) { navigate("/"); return; }
        try {
            const payload = { id: Number(row.receiptId), isEnd: false };
            const res = await axios.put(
                server.baseurl + server.warehouse + "update-store-receipt-is-end",
                payload,
                { headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" } }
            );
            if (res.data?.httpStatusCode === 200) {
                showAlert(`Fatura ${(row.invoiceNo || row.receiptCode)} başarıyla geri alındı.`, 'success');

                // رفرش لیست رسیدها
                const fresh = await (async () => {
                    try {
                        const r = await axios.get(
                            server.baseurl + server.warehouse + "get-store-receipts-by-invoice",
                            { headers: { Authorization: `Bearer ${authToken}` } }
                        );
                        return (r.data?.httpStatusCode === 200 && Array.isArray(r.data.data)) ? r.data.data : [];
                    } catch { return []; }
                })();
                setReceiptsList(fresh);

                // اگر ورک‌هاوس انتخاب شده داری، کمبوی فاکتورها را هم تازه کن تا این مورد از لیست حذف شود
                if ((selectedWorkhouse as any)?.id) {
                    await fetchInvoicesByWorkhouseId(String((selectedWorkhouse as any).id));
                }

                setOpenInactiveModal(false);
            } else {
                showAlert(res.data?.message || 'Fatura geri alınırken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Fatura geri alınırken bir hata oluştu.', 'error');
        }
    };


    // ---------- Export ----------
    const exportReceiptsToPdf = (data: StoreReceiptType[], title: string, subtitle?: string) => {
        if (!data || data.length === 0) { showAlert("PDF oluşturulacak fiş bulunamadı.", "warning"); return; }
        showAlert("PDF oluşturuluyor...", "info");
        const doc = new jsPDF();
        const docAny = doc as any;
        let yPos = 60;
        docAny.addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
        docAny.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
        doc.setFont("NotoSans");
        data.forEach((receipt, index) => {
            if (index > 0) { doc.addPage(); yPos = 60; }
            addPdfHeader(doc, title, subtitle);
            const totalQuantity = (receipt.storeReceiptDetails || []).reduce((s, d) => s + Number(d.quantity), 0);
            doc.setFontSize(12);
            doc.text(`Fiş Kodu: ${receipt.code}`, 15, yPos); yPos += 7;
            doc.text(`Belge Tarihi: ${formatDateDisplay(receipt.docDate)}`, 15, yPos); yPos += 9;
            doc.text(`Şantiye: ${receipt.store?.name || "-"}`, 15, yPos); yPos += 15;

            const rows = (receipt.storeReceiptDetails || []).map((d) => [
                d.item?.name || "-",
                Number(d.quantity).toLocaleString(),
                d.item?.unit?.title || "-",
                d.description || "-",
            ]);
            autoTable(doc, {
                startY: yPos,
                head: [["Malzeme", "Miktar", "Birim", "Açıklama"]],
                body: rows,
                theme: "grid",
                styles: { font: "NotoSans", fontStyle: "normal", fontSize: 10, cellPadding: 2, overflow: "linebreak" },
                headStyles: { font: "NotoSans", fillColor: [242, 242, 242], textColor: [0, 0, 0] },
                foot: [["", "Toplam Miktar:", totalQuantity.toLocaleString(), ""]],
                footStyles: { font: "NotoSans", fillColor: [230, 230, 230], textColor: [0, 0, 0], halign: "right", cellPadding: 2 },
                columnStyles: { 0: { halign: "left" }, 1: { halign: "center" }, 2: { halign: "center" }, 3: { halign: "left" } },
                didDrawPage: () => addPdfFooter(doc),
            });
            yPos = (docAny.lastAutoTable.finalY || yPos) + 10;
        });
        doc.save(`${title.replace(/ /g, "_")}.pdf`);
        showAlert("PDF başarıyla oluşturuldu.", "success");
    };

    const exportReceiptsToExcel = (data: StoreReceiptType[], title: string) => {
        if (!data || data.length === 0) { showAlert("Excel oluşturulacak fiş bulunamadı.", "warning"); return; }
        showAlert("Excel oluşturuluyor...", "info");
        const wb = new Excel.Workbook();
        data.forEach((r) => {
            const ws = wb.addWorksheet(`Fiş_${r.code}`.replace(/[\\/*?:[\]]/g, "_"));
            const cols = ["Malzeme", "Miktar", "Birim", "Açıklama"];
            // header
            ws.views = [{ rightToLeft: false }];
            const t = ws.addRow([title]); t.font = { name: "NotoSans", size: 14, bold: true }; ws.mergeCells(t.number, 1, t.number, cols.length); t.getCell(1).alignment = { horizontal: "center" };
            const d = ws.addRow([`Rapor Tarihi: ${formatDateDisplay(new Date().toISOString())}`]); d.font = { name: "NotoSans", size: 10 };
            ws.mergeCells(d.number, 1, d.number, cols.length); ws.addRow([]);

            const totalQty = (r.storeReceiptDetails || []).reduce((s, x) => s + Number(x.quantity), 0);
            const invNo = r.storeReceiptDetails?.[0]?.invoiceDetail?.invoiceHeader?.invoiceNo || "-";

            ws.addRow(["Fiş Kodu:", r.code]);
            ws.addRow(["Şantiye:", r.store?.name || "-"]);
            ws.addRow(["Belge Tarihi:", formatDateDisplay(r.docDate)]);
            ws.addRow(["Fatura No:", invNo]);
            ws.addRow(["Durum:", r.recordStatus === 0 ? "Aktif" : "Pasif"]);
            ws.addRow([]);

            const h = ws.addRow(cols);
            h.font = { name: "NotoSans", bold: true };
            h.eachCell((cell) => (cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E1F2" } }));

            (r.storeReceiptDetails || []).forEach((x) => {
                ws.addRow([x.item?.name || "-", x.quantity, x.item?.unit?.title || "-", x.description || "-"]);
            });

            ws.addRow([]);
            const ft = ws.addRow(["", "Toplam Miktar:", totalQty.toLocaleString(), ""]);
            ft.getCell(2).font = { name: "NotoSans", bold: true };
            ft.getCell(3).font = { name: "NotoSans", bold: true };
        });

        wb.xlsx.writeBuffer().then((buffer) => {
            saveAs(new Blob([buffer]), `${title.replace(/ /g, "_")}.xlsx`);
            showAlert("Excel başarıyla oluşturuldu.", "success");
        });
    };

    const paginatedReceipts = useMemo(
        () => displayedReceipts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
        [displayedReceipts, page, rowsPerPage]
    );

    const handleDownload = (format: "pdf" | "excel", isFiltered: boolean) => {
        const data = isFiltered ? displayedReceipts : receiptsList;
        const title = isFiltered ? "Filtrelenmiş Fişler Raporu" : "Tüm Fişler Raporu";
        const subtitle = isFiltered
            ? `Tarih Aralığı: ${formatDateDisplay(startDate ? startDate.toISOString() : null)} - ${formatDateDisplay(
                endDate ? endDate.toISOString() : null
            )}`
            : undefined;
        if (format === "pdf") exportReceiptsToPdf(data, title, subtitle);
        else exportReceiptsToExcel(data, title);
    };

    const handleDownloadSingleReceipt = (format: "pdf" | "excel") => {
        if (!selectedReceiptForDownload) return;
        const title = `Fiş Detayları: ${selectedReceiptForDownload.code}`;
        if (format === "pdf") exportReceiptsToPdf([selectedReceiptForDownload], title);
        else exportReceiptsToExcel([selectedReceiptForDownload], title);
        setOpenRowDownloadModal(false);
    };

    // ---------- Render ----------
    return (
        <Box sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Typography variant="h5">Şantiye Fişleri (Fatura Kaynaklı)</Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="stretch" flexGrow={1} justifyContent={{ xs: "flex-start", sm: "flex-end" }}>
                    {!isFormVisible && hasCreatePermission && (
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Fatura Kaynaklı Fiş belgesi kaydetmek için tıklayınız" : ""}>
                            <BlinkingButton variant="contained" color="primary" onClick={() => setIsFormVisible(true)} isBlinking={isBlinking}>
                                Yeni Fiş Kaydet
                            </BlinkingButton>
                        </CustomTooltip>
                    )}
                    {isFormVisible && (
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
                            <Button variant="contained" color="error" onClick={resetForm} startIcon={<IconX size={20} />}>
                                Gizle
                            </Button>
                        </CustomTooltip>
                    )}
                    {routeStoreId && (
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Geri dön" : ""}>
                            <Button variant="outlined" color="error" onClick={() => navigate(-1)} endIcon={<IconArrowRight size={20} />}>
                                Geri Dön
                            </Button>
                        </CustomTooltip>
                    )}
                </Stack>
            </Stack>

            {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
                <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h5" mb={2}>{editingId ? `Fiş Düzenle (${editingCode})` : "Yeni Fiş Oluştur"}</Typography>
                    <Grid container spacing={2}>
                        {/* Workhouse */}
                        <Grid item xs={12} sm={3}>
                            <CustomFormLabel required>Şantiye</CustomFormLabel>
                            <Autocomplete
                                options={workhousesList}
                                getOptionLabel={(o) => `${o.name}`}
                                value={selectedWorkhouse}
                                onChange={async (_e, v) => {
                                    setSelectedWorkhouse(v);
                                    setSelectedStore(null);
                                    setSelectedInvoice(null);
                                    setStoresList([]);
                                    setInvoicesList([]);
                                    setReceiptDetails([]);
                                    if (v) {
                                        await fetchStoresByWorkhouseId(String(v.id));
                                        await fetchInvoicesByWorkhouseId(String(v.id));
                                    }
                                }}
                                isOptionEqualToValue={(a, b) => a?.id === b?.id}
                                renderInput={(p) => <TextField {...p} fullWidth size="small" placeholder="Workhouse Seçin" />}
                                disabled={!!editingId}
                            />
                        </Grid>

                        {/* Store */}
                        {!routeStoreId && (
                            <Grid item xs={12} sm={3}>
                                <CustomFormLabel required>Şantiye Depo</CustomFormLabel>
                                <Autocomplete
                                    options={storesList}
                                    getOptionLabel={(o) => o.name}
                                    value={selectedStore}
                                    onChange={(_e, v) => {
                                        setSelectedStore(v);
                                        // انتخاب Store فقط روی فیلتر فاکتورهای خاتمه‌یافته تاثیر دارد
                                        setSelectedInvoice(null);
                                        setReceiptDetails([]);
                                    }}
                                    isOptionEqualToValue={(a, b) => a?.id === b?.id}
                                    renderInput={(p) => <TextField {...p} fullWidth size="small" placeholder="Şantiye Seçin" />}
                                    disabled={!selectedWorkhouse || !!editingId}
                                />
                            </Grid>
                        )}

                        {/* Doc date */}
                        <Grid item xs={12} sm={routeStoreId ? 4 : 3}>
                            <CustomFormLabel required>Belge Tarihi</CustomFormLabel>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <DatePicker
                                    label=""
                                    inputFormat="dd/MM/yyyy"
                                    value={docDate}
                                    onChange={(v) => setDocDate(v)}
                                    renderInput={(p) => <TextField {...p} fullWidth size="small" />}
                                />
                            </LocalizationProvider>
                        </Grid>

                        {/* Invoice (by workhouse) */}
                        <Grid item xs={12} sm={routeStoreId ? 5 : 3}>
                            <CustomFormLabel required>Fatura Belgesi</CustomFormLabel>
                            <Autocomplete
                                options={filteredInvoicesForCombo}
                                getOptionLabel={(o) => `${o.invoiceNo} — ${formatDateDisplay(o.docDate)}`}
                                value={selectedInvoice}
                                onChange={(_e, v) => {
                                    setSelectedInvoice(v);
                                    setReceiptDetails([]);
                                    setRemovedReceiptDetails([]);
                                    if (v?.invoiceDetails) {
                                        const details: FormReceiptDetail[] = v.invoiceDetails.map((d) => ({
                                            itemId: Number(d.item.id),
                                            quantity: Number(d.quantity),
                                            description: d.description || "",
                                            invoiceDetailId: Number(d.id),
                                            item: d.item,
                                        }));
                                        setReceiptDetails(details);
                                    }
                                }}
                                isOptionEqualToValue={(a, b) => a?.id === b?.id}
                                renderInput={(p) => <TextField {...p} fullWidth size="small" placeholder="Fatura Belgesi Seçin" />}
                                disabled={!selectedWorkhouse || (!!routeStoreId && !selectedStore) || !!editingId}
                            />
                        </Grid>
                    </Grid>

                    {/* Details */}
                    <Box mt={4}>
                        {removedReceiptDetails.length > 0 && (
                            <Box sx={{ border: "1px dashed", borderColor: "error.main", p: 2, mb: 2, mt: 2, borderRadius: 1, backgroundColor: "rgba(255,0,0,0.05)" }}>
                                <Typography variant="subtitle1" color="error" mb={1}>Silinen Ürünler</Typography>
                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                    {removedReceiptDetails.map((d, i) => (
                                        <Chip key={i} label={`${d?.item?.name || "Undefined"} (${d.quantity})`} color="error" onDelete={() => handleRestoreLastRemoved(i)} deleteIcon={<IconReload size={18} />} />
                                    ))}
                                </Stack>
                            </Box>
                        )}

                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6">Fiş Detayları</Typography>
                            <Stack direction="row" spacing={1}>
                                {/* دکمه نمایش فاکتورهای خاتمه‌یافته */}
                                <CustomTooltip title={isTooltipGloballyEnabled ? "Sonlandırılmış (Fişi kesilmiş) faturaları göster" : ""}>
                                    <span>
                                        <Button
                                            variant="outlined"
                                            color="secondary"
                                            onClick={() => setOpenInactiveModal(true)}
                                            disabled={inactiveInvoices.length === 0}
                                            startIcon={<IconEye />}
                                        >
                                            Sonlandırılmış Faturalar ({inactiveInvoices.length})
                                        </Button>
                                    </span>
                                </CustomTooltip>

                            </Stack>
                        </Stack>


                        <Grid container spacing={2}>
                            {receiptDetails.map((detail, idx) => {
                                const rel = selectedInvoice?.invoiceDetails.find((d) => Number(d.id) === Number(detail.invoiceDetailId));
                                const maxQ = rel ? Number(rel.quantity) : 0;
                                const balance = rel ? `(Fatura Miktar: ${maxQ})` : "";
                                return (
                                    <Grid item xs={12} key={idx}>
                                        <Grid container spacing={1.5} alignItems="center">
                                            <Grid item xs={12} md={4}>
                                                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
                                                    <Typography variant="body1" sx={{ fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {rel?.item?.name || "—"}
                                                    </Typography>
                                                    {rel?.item?.unit?.title && <Chip label={rel.item.unit.title} color="secondary" variant="outlined" size="small" />}
                                                </Stack>
                                            </Grid>
                                            <Grid item xs={6} md={3}>
                                                <CustomTextField
                                                    type="number"
                                                    placeholder="Miktar"
                                                    value={detail.quantity}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleReceiptDetailChange(idx, "quantity", e.target.value)}
                                                    fullWidth size="small"
                                                    InputProps={{ endAdornment: <InputAdornment position="end" sx={{ display: { xs: "none", sm: "flex" } }}>{balance}</InputAdornment> }}
                                                />
                                            </Grid>
                                            <Grid item xs={5} md={4}>
                                                <CustomTextField
                                                    placeholder="Açıklama"
                                                    value={detail.description}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleReceiptDetailChange(idx, "description", e.target.value)}
                                                    fullWidth size="small"
                                                />
                                            </Grid>
                                            <Grid item xs={1} md={1} sx={{ display: "flex", justifyContent: "flex-end" }}>
                                                <IconButton color="error" onClick={() => handleRemoveReceiptDetail(idx)}><IconTrash /></IconButton>
                                            </Grid>
                                        </Grid>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    </Box>

                    <Stack direction="row" spacing={1} justifyContent="flex-end" mt={3}>
                        {editingId ? (
                            <>
                                <Button variant="contained" color="info" onClick={editReceipt} disabled={loadingButton}>
                                    {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...</> : "Düzenle"}
                                </Button>
                                <Button variant="outlined" color="secondary" onClick={resetForm} disabled={loadingButton}>İptal Et</Button>
                            </>
                        ) : (
                            hasCreatePermission && (
                                <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm alanları doldurarak fişi kaydedin." : ""}>
                                    <span>
                                        <BlinkingButton
                                            variant="contained"
                                            color="success"
                                            onClick={insertReceipt}
                                            disabled={!isFormValid || loadingButton}
                                            isBlinking={isFormValid && !loadingButton}
                                        >
                                            {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...</> : "Yeni Fiş Ekle"}
                                        </BlinkingButton>
                                    </span>
                                </CustomTooltip>
                            )
                        )}
                    </Stack>
                </Paper>
            )}

            {alertMessage && (
                <Stack sx={{ width: "100%", mb: 3 }} spacing={2}>
                    <Alert severity={alertSeverity} onClose={() => setAlertMessage(null)}>{alertMessage}</Alert>
                </Stack>
            )}

            {/* Filters + table */}
            <BlankCard>
                <Grid item xs={12} mt={2} mr={2}>
                    <Stack direction="row" spacing={2} justifyContent="flex-end" mb={2} mr={2}>
                        {isFilterActive && hasDownloadPermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Uygulanan filtrelerle Fişler indirin" : ""}>
                                <BlinkingButton
                                    variant="contained" color="secondary"
                                    onClick={() => setOpenDownloadFilteredModal(true)}
                                    startIcon={<IconFileDownload />} isBlinking={true}
                                    disabled={loadingData || displayedReceipts.length === 0}
                                >
                                    Filtrelenmişi İndir
                                </BlinkingButton>
                            </CustomTooltip>
                        )}
                        {hasDownloadPermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm Şantiye Fişleri indirin" : ""}>
                                <Button
                                    variant="contained" color="primary"
                                    onClick={() => setOpenDownloadAllModal(true)}
                                    startIcon={<IconFileDownload />}
                                    disabled={loadingData || receiptsList.length === 0}
                                >
                                    Tümünü İndir
                                </Button>
                            </CustomTooltip>
                        )}
                    </Stack>
                </Grid>

                <Box sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                label="Fiş Ara" variant="outlined" fullWidth
                                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={6}>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <DatePicker
                                        label="Başlangıç Tarihi" value={startDate} inputFormat="dd/MM/yyyy"
                                        onChange={(v) => setStartDate(v)} renderInput={(p) => (<TextField {...p} size="small" fullWidth />)}
                                    />
                                    <DatePicker
                                        label="Bitiş Tarihi" value={endDate} inputFormat="dd/MM/yyyy"
                                        onChange={(v) => setEndDate(v)} renderInput={(p) => (<TextField {...p} size="small" fullWidth />)}
                                    />
                                    <IconButton onClick={handleClearDateFilters} aria-label="clear date filters"><IconX size={20} /></IconButton>
                                </Stack>
                            </LocalizationProvider>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <ToggleButtonGroup value={statusFilter} exclusive onChange={(_, v) => v && setStatusFilter(v)} fullWidth>
                                <StyledToggleButton value="all">Tümü</StyledToggleButton>
                                <StyledToggleButton value="active">Aktif</StyledToggleButton>
                                <StyledToggleButton value="inactive">Pasif</StyledToggleButton>
                            </ToggleButtonGroup>
                        </Grid>
                    </Grid>
                </Box>

                {loadingData ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                        <CircularProgress />
                        <Typography variant="h6" sx={{ ml: 2 }}>Fişler yükleniyor...</Typography>
                    </Box>
                ) : (
                    <TableContainer component={Paper}>
                        <Table aria-label="receipt table">
                            <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>
                                    <StyledTableCell><Typography variant="h6">Fiş Kodu</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Şantiye Adı</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Belge Tarihi</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Toplam Miktar</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Durum</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Detaylar</Typography></StyledTableCell>
                                    <StyledTableCell></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {displayedReceipts.length > 0 ? (
                                    paginatedReceipts.map((row) => {
                                        const totalQty = (row.storeReceiptDetails || []).reduce((s, d) => s + Number(d.quantity), 0);
                                        return (
                                            <TableRow key={row.id}>
                                                <StyledTableCell><Typography variant="body1">{row.code || "-"}</Typography></StyledTableCell>
                                                <StyledTableCell><Typography variant="body1">{row.store?.name || "-"}</Typography></StyledTableCell>
                                                <StyledTableCell><Typography variant="body1">{formatDateDisplay(row.docDate)}</Typography></StyledTableCell>
                                                <StyledTableCell><Typography variant="body1" fontWeight="bold">{totalQty.toLocaleString()}</Typography></StyledTableCell>
                                                <StyledTableCell>
                                                    <Chip label={row.recordStatus === 0 ? "Aktif" : "Pasif"} color={row.recordStatus === 0 ? "success" : "error"} />
                                                </StyledTableCell>
                                                <StyledTableCell>
                                                    <Button variant="outlined" startIcon={<IconEye />} onClick={() => { setDetailsToShow(row.storeReceiptDetails || []); setOpenDetailsModal(true); }}>
                                                        Görünüm
                                                    </Button>
                                                </StyledTableCell>
                                                <StyledTableCell>
                                                    <IconButton onClick={(e) => { setSelectedRowForMenu(row); setAnchorEl(e.currentTarget); }}>
                                                        <IconDots width={18} />
                                                    </IconButton>
                                                    <Menu anchorEl={anchorEl} open={Boolean(anchorEl) && selectedRowForMenu?.id === row.id} onClose={handleCloseMenu}>
                                                        {hasDownloadPermission && (
                                                            <MuiMenuItem onClick={() => { setSelectedReceiptForDownload(row); setOpenRowDownloadModal(true); handleCloseMenu(); }}>
                                                                <ListItemIcon><IconFileDownload width={18} /></ListItemIcon> Bu satırı indir
                                                            </MuiMenuItem>
                                                        )}
                                                        {hasEditPermission && <MuiMenuItem onClick={handleEditClick}><ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenle</MuiMenuItem>}
                                                        {hasDeletePermission && <MuiMenuItem onClick={handleClickOpenDeleteModal}><ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek</MuiMenuItem>}
                                                    </Menu>
                                                </StyledTableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <StyledTableCell colSpan={7} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">Hiç fiş bulunamadı.</Typography>
                                        </StyledTableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}

                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={displayedReceipts.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                    labelRowsPerPage="Satır başına:"
                />
            </BlankCard>

            {/* Details modal */}
            <Dialog open={openDetailsModal} onClose={() => setOpenDetailsModal(false)} maxWidth="md" fullWidth>
                <DialogTitle>Fiş Detayları</DialogTitle>
                <DialogContent>
                    {detailsToShow.length > 0 ? (
                        <TableContainer component={Paper}>
                            <Table aria-label="Ürün detayları tablosu">
                                <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                    <TableRow>
                                        <StyledTableCell><Typography variant="h6">Malzeme</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Miktar</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Birim</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Açıklama</Typography></StyledTableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    <>
                                        {detailsToShow.map((d, i) => (
                                            <TableRow key={d.id || i}>
                                                <StyledTableCell>{d.item?.name || "-"}</StyledTableCell>
                                                <StyledTableCell>{d.quantity || "-"}</StyledTableCell>
                                                <StyledTableCell>{d.item?.unit?.title || "-"}</StyledTableCell>
                                                <StyledTableCell>{d.description || "-"}</StyledTableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow sx={{ backgroundColor: "rgb(240, 240, 240)" }}>
                                            <StyledTableCell sx={{ fontWeight: "bold" }}>Toplam Miktar:</StyledTableCell>
                                            <StyledTableCell sx={{ fontWeight: "bold" }}>
                                                {detailsToShow.reduce((s, d) => s + Number(d.quantity), 0)}
                                            </StyledTableCell>
                                            <StyledTableCell></StyledTableCell>
                                            <StyledTableCell></StyledTableCell>
                                        </TableRow>
                                    </>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Typography variant="body1" sx={{ p: 2, textAlign: "center" }}>Bu fiş için detay bulunamadı.</Typography>
                    )}
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenDetailsModal(false)} color="secondary">Kapat</Button></DialogActions>
            </Dialog>

            {/* Delete */}
            <DeleteStoreReceiptInvoice
                openModal={openDeleteModal}
                onClose={handleCloseDeleteModal}
                receiptIdToDelete={receiptIdToDelete}
                receiptCodeToDelete={receiptCodeToDelete}
                onDeleteSuccess={() => fetchReceipts()}
                showAlert={showAlert}
            />

            {/* Download modals */}
            <Dialog open={openDownloadAllModal} onClose={() => setOpenDownloadAllModal(false)} maxWidth="xs">
                <DialogTitle>Tüm Fişleri İndir</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" startIcon={<IconFileText />} onClick={() => { handleDownload("pdf", false); setOpenDownloadAllModal(false); }}>PDF Olarak İndir</Button>
                        <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={() => { handleDownload("excel", false); setOpenDownloadAllModal(false); }}>Excel Olarak İndir</Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenDownloadAllModal(false)} color="secondary">Kapat</Button></DialogActions>
            </Dialog>

            <Dialog open={openDownloadFilteredModal} onClose={() => setOpenDownloadFilteredModal(false)} maxWidth="xs">
                <DialogTitle>Filtrelenmiş Fişleri İndir</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" startIcon={<IconFileText />} onClick={() => { handleDownload("pdf", true); setOpenDownloadFilteredModal(false); }}>PDF Olarak İndir</Button>
                        <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={() => { handleDownload("excel", true); setOpenDownloadFilteredModal(false); }}>Excel Olarak İndir</Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenDownloadFilteredModal(false)} color="secondary">Kapat</Button></DialogActions>
            </Dialog>

            <Dialog open={openRowDownloadModal} onClose={() => setOpenRowDownloadModal(false)} maxWidth="xs">
                <DialogTitle>Dosya Formatını Seçin</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" startIcon={<IconFileText />} onClick={() => handleDownloadSingleReceipt("pdf")}>PDF Olarak İndir</Button>
                        <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={() => handleDownloadSingleReceipt("excel")}>Excel Olarak İndir</Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenRowDownloadModal(false)} color="secondary">Kapat</Button></DialogActions>
            </Dialog>

            {/* isEnd confirm after insert */}
            <Dialog open={openIsEndModal} onClose={() => setOpenIsEndModal(false)}>
                <DialogTitle>Fatura Durumu Onayı</DialogTitle>
                <DialogContent>
                    <Typography>
                        Bu fişi kaydettikten sonra, seçilen <b>Fatura</b> için Fişi Sonlandırmak ister misiniz؟
                    </Typography>
                    <Typography sx={{ mt: 1 }}>
                        Fatura: <b>{justInsertedReceipt?.invoiceNo || "—"}</b> — Header ID: <b>{justInsertedReceipt?.invoiceHeaderId || "—"}</b>
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        (Sonlandırma sonrası bu fatura için yeni fiş oluşturulamaz.)
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => handleFinalizeIsEnd(false)} color="error">Hayır (Sadece Kaydet)</Button>
                    <Button onClick={() => handleFinalizeIsEnd(true)} color="primary" variant="contained" autoFocus>Evet (Kaydet ve Sonlandır)</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openInactiveModal} onClose={() => setOpenInactiveModal(false)} maxWidth="md" fullWidth>
                <DialogTitle>Sonlandırılmış Faturalar</DialogTitle>
                <DialogContent dividers>
                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>
                                    <StyledTableCell><Typography variant="h6">Fiş Kodu</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Fatura No</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Tarih</Typography></StyledTableCell>
                                    <StyledTableCell align="right"><Typography variant="h6">İşlem</Typography></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {inactiveInvoices.length > 0 ? inactiveInvoices.map((inv) => (
                                    <TableRow key={inv.receiptId}>
                                        <StyledTableCell>{inv.receiptCode}</StyledTableCell>
                                        <StyledTableCell>{inv.invoiceNo || '—'}</StyledTableCell>
                                        <StyledTableCell>{formatDateDisplay(inv.docDate)}</StyledTableCell>
                                        <StyledTableCell align="right">
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Faturayı aktif listeye geri alın (isEnd=false)" : ""}>
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    color="warning"
                                                    onClick={() => handleReactivateInvoice(inv)}
                                                >
                                                    Geri Al
                                                </Button>
                                            </CustomTooltip>
                                        </StyledTableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <StyledTableCell colSpan={4} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">Sonlandırılmış fatura bulunamadı.</Typography>
                                        </StyledTableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenInactiveModal(false)}>Kapat</Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
};

export default ListStoreReceiptInvoice;
