// src/views/Warehouse/ListStoreReceiptInvoice.tsx
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
    Radio,
    RadioGroup,
    FormControlLabel,
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
    DialogContentText,
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
    IconList,
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

    // ✅ افزوده برای فیلتر و مودال
    status?: number;
    isEnd?: boolean | null;
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
    description: string,
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
interface InactiveInvoiceRow {
    receiptId: string;
    receiptCode: string;
    docDate: string;
    invoiceHeaderId?: string;
    invoiceNo?: string;
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

    const [generalDescription, setGeneralDescription] = useState('');
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

    // isEnd dialogs
    const [openIsEndModal, setOpenIsEndModal] = useState(false);
    const [justInsertedInvoice, setJustInsertedInvoice] = useState<{ id: string; invoiceNo: string } | null>(null);

    // inactive invoices modal (by store receipts)
    const [openInactiveModal, setOpenInactiveModal] = useState(false);
    const [inactiveInvoices, setInactiveInvoices] = useState<InactiveInvoiceRow[]>([]);

    // 🔹 مودال جدید «Listeyi Göster» برای فاکتورهای کمبو
    const [openInvoiceListModal, setOpenInvoiceListModal] = useState(false);


    const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
    const [fullDescriptionContent, setFullDescriptionContent] = useState<string>('');

    // Alerts
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<"success" | "error" | "warning" | "info">("info");
    const showAlert = useCallback((msg: string, sev: "success" | "error" | "warning" | "info") => {
        setAlertMessage(msg); setAlertSeverity(sev);
        setTimeout(() => setAlertMessage(null), 5000);
    }, []);

    // ---------- API helpers ----------
    const updateInvoiceIsEnd = async (invoiceHeaderId: string | number, isEnd: boolean) => {
        if (!authToken) { navigate("/"); return; }
        try {
            const url = server.baseurl + server.initialoperations + "update-invoice-is-end";
            const payload = { id: Number(invoiceHeaderId), isEnd };
            const resp = await axios.put(url, payload, { headers: { Authorization: `Bearer ${authToken}` } });
            if (resp.data?.httpStatusCode === 200) {
                showAlert(isEnd ? "Fatura sonlandırıldı." : "Fatura tekrar açıldı.", "success");
                // تازه‌سازی کمبو
                if (selectedWorkhouse?.id) await fetchInvoicesByWorkhouseId(String(selectedWorkhouse.id));
            } else {
                showAlert(resp.data?.message || "Fatura durumu güncellenemedi.", "error");
            }
        } catch {
            showAlert("Fatura durumu güncellenirken bir hata oluştu.", "error");
        }
    };

    // ---------- API ----------
    const fetchWorkhouses = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        const role = localStorage.getItem('activeUserRoleName') || '';
        if (!authToken) {
            navigate("/");
            return;
        }
        let requestParams = {};
        if (role.toLowerCase() !== 'admin') {
            requestParams = { rolename: role };
        }
        try {
            const res = await axios.get(
                server.baseurl + server.initialoperations + "get-workhouse",
                {
                    headers: { "Authorization": `Bearer ${authToken}` },
                    params: requestParams
                }
            );
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
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
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
            } catch (e: any) {
                if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
                else if (e.response?.status === 401) {
                    localStorage.removeItem('authToken');
                    showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
                }
                else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
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
                        .map((h: any) => ({
                            id: String(h.id),
                            invoiceNo: String(h.invoiceNo),
                            docDate: String(h.docDate),
                            recordStatus: Number(h.recordStatus),
                            status: typeof h.status === "number" ? Number(h.status) : undefined,
                            isEnd: typeof h.isEnd === "boolean" ? h.isEnd : (h.isEnd == null ? null : Boolean(h.isEnd)),
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
            } catch (e: any) {
                if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
                else if (e.response?.status === 401) {
                    localStorage.removeItem('authToken');
                    showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
                }
                else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
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
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally { setLoadingData(false); }
    }, [authToken, navigate, showAlert]);

    // ---------- Derived ----------
    const filteredInvoicesForCombo = useMemo(() => {
        const raw = invoicesList || [];
        const statusFiltered = raw.filter(inv => (typeof inv.status === "number" ? inv.status === 1 : inv.recordStatus === 0));
        const openOnly = statusFiltered.filter(inv => inv.isEnd !== true);
        return openOnly;
    }, [invoicesList]);

    useEffect(() => { fetchReceipts(); fetchWorkhouses(); }, [fetchReceipts, fetchWorkhouses]);

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

    // inactive invoices (from receipts with isEnd=true) by selected store
    useEffect(() => {
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
        setGeneralDescription('');
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

    // ---------- Edit (حفظ شده) ----------
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingCode, setEditingCode] = useState<string | null>(null);

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

    const pickLatestReceiptForStore = (receipts: StoreReceiptType[], storeId: string): StoreReceiptType | null => {
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

    const handleEditClick = async () => {
        if (!selectedRowForMenu) return;
        handleCloseMenu();
        setLoadingData(true);
        try {
            const r = selectedRowForMenu;
            const whId = r.store?.workhouse?.id;
            if (!whId) { showAlert("Bu fiş için Workhouse bulunamadı.", "error"); setLoadingData(false); return; }
            const wh = workhousesList.find((w) => String(w.id) === String(whId)) || null;
            setSelectedWorkhouse(wh || null);
            await fetchStoresByWorkhouseId(String(whId));
            const invs = await fetchInvoicesByWorkhouseId(String(whId));
            const storeFromRow = r.store ? (storesList.find((s) => s.id === r.store.id) || r.store) : null;
            setSelectedStore(storeFromRow);
            const invoiceHeaderId = r.storeReceiptDetails?.[0]?.invoiceDetail?.invoiceHeader?.id;
            const foundInv = invoiceHeaderId ? invs.find((i) => i.id === String(invoiceHeaderId)) || null : null;
            setSelectedInvoice(foundInv);
            setEditingId(r.id);
            setEditingCode(r.code);
            setDocDate(new Date(r.docDate));

            setGeneralDescription(r.description || '');
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

    // ---------- CRUD ----------
    const insertReceipt = async () => {
        if (!isFormValid) {
            showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning');
            return;
        }
        setLoadingButton(true);
        if (!authToken) { navigate("/"); return; }

        const storeIdForPick = String(routeStoreId || selectedStore?.id || "");

        try {
            const payload = {
                docDate: docDate?.toISOString(),
                description: generalDescription,
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

                // آخرین رسید همان Store را پیدا کن
                const freshReceipts = await fetchReceiptsRaw();
                const latest = pickLatestReceiptForStore(freshReceipts, storeIdForPick);

                // پس از ثبت، سؤال کن آیا فاکتور کمبو را Sonlandır کنیم؟
                if (latest && selectedInvoice) {
                    setJustInsertedInvoice({ id: selectedInvoice.id, invoiceNo: selectedInvoice.invoiceNo });
                    setOpenIsEndModal(true);
                }

                setReceiptsList(freshReceipts);
                resetForm();
            } else {
                showAlert(res.data?.message || 'Fiş eklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };

    const editReceipt = async () => {
        if (!editingId || !isFormValid) { showAlert("Lütfen tüm zorunlu alanları doldurun و hataları düzeltin.", "warning"); return; }
        setLoadingButton(true);
        if (!authToken) { navigate("/"); return; }
        try {
            const payload = {
                id: Number(editingId),
                code: editingCode,
                docDate: docDate?.toISOString(),
                description: generalDescription,
                storeId: Number(routeStoreId || selectedStore?.id),
                receiptDetails: receiptDetails.map((d) => ({
                    itemId: d.itemId,
                    quantity: Number(d.quantity),
                    description: d.description,
                    invoiceDetailId: d.invoiceDetailId,
                })),
            };
            const res = await axios.put(
                server.baseurl + server.warehouse + "update-store-receipt-by-invoice",
                payload,
                { headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" } }
            );
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
            doc.text(`Genel Açıklama: ${receipt.description || '-'}`, 15, yPos); yPos += 21

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

            ws.addRow(['Genel Açıklama', r.description || '-']);
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


    const handleOpenDescriptionModal = (descriptionContent: string) => {
        setFullDescriptionContent(descriptionContent);
        setOpenDescriptionModal(true);
    };

    const handleCloseDescriptionModal = () => {
        setOpenDescriptionModal(false);
        setFullDescriptionContent('');
    };


    // ---------- Render ----------
    return (
        <Box sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Typography variant="h5">Doğrudan Teslimat (Fatura Kaynaklı)</Typography>
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
                        <Grid item xs={12} sm={4}>
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
                                renderInput={(p) => <TextField {...p} fullWidth size="small" placeholder="Şantiye Seçin" />}
                                disabled={!!editingId}
                            />
                        </Grid>

                        {/* Store */}
                        {!routeStoreId && (
                            <Grid item xs={12} sm={4}>
                                <CustomFormLabel required>Şantiye Depo</CustomFormLabel>
                                <Autocomplete
                                    options={storesList}
                                    getOptionLabel={(o) => o.name}
                                    value={selectedStore}
                                    onChange={(_e, v) => {
                                        setSelectedStore(v);
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
                        <Grid item xs={12} sm={routeStoreId ? 4 : 4}>
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



                        <Grid item xs={12}>
                            <CustomFormLabel htmlFor="invoice-general-description">Açıklama</CustomFormLabel>
                            <TextField
                                id="invoice-general-description"
                                label="Şantiye Fişleri  için genel açıklama giriniz"
                                type="text"
                                fullWidth
                                multiline
                                rows={3}
                                variant="outlined"
                                value={generalDescription} // ⬅️ استفاده از نام جدید
                                onChange={(e) => setGeneralDescription(e.target.value)} // ⬅️ استفاده از نام جدید
                            />
                        </Grid>

                        {/* Invoice (by workhouse) */}
                        <Grid item xs={12}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                                <CustomFormLabel required>Fatura Belgesi*</CustomFormLabel>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<IconList size={18} />}
                                    onClick={() => setOpenInvoiceListModal(true)}
                                    disabled={!selectedWorkhouse}
                                >
                                    Listeyi Göster
                                </Button>
                            </Box>
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
                                        <Chip key={i} label={`${d?.item?.name || "Undefined"} (${d.quantity})`} color="error" onDelete={() => {
                                            const restore = removedReceiptDetails[i];
                                            if (restore) {
                                                setReceiptDetails((p) => [...p, restore]);
                                                setRemovedReceiptDetails((p) => p.filter((_, idx) => idx !== i));
                                            }
                                        }} deleteIcon={<IconReload size={18} />} />
                                    ))}
                                </Stack>
                            </Box>
                        )}

                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6">Fiş Detayları</Typography>

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
                                                <IconButton color="error" onClick={() => {
                                                    setRemovedReceiptDetails((p) => [...p, detail]);
                                                    setReceiptDetails((p) => p.filter((_, i) => i !== idx));
                                                }}><IconTrash /></IconButton>
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
                                        onChange={(v) => setEndDate(v)}
                                        renderInput={(p) => (<TextField {...p} size="small" fullWidth />)}
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
                                    <StyledTableCell><Typography variant="h6">Açıklama</Typography></StyledTableCell>
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
                                                <StyledTableCell sx={{ maxWidth: 150 }}>
                                                    <Typography variant="body2" noWrap title={row.description || ''}>
                                                        {row.description || '-'}
                                                    </Typography>
                                                    {row.description != null && row.description.length > 50 && (
                                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm açıklamayı gör" : ""}>
                                                            <Button variant="text" style={{ fontSize: "10px", padding: "2px 5px" }} onClick={() => {
                                                                handleOpenDescriptionModal(row.description);
                                                            }}>
                                                                Devamını Oku
                                                            </Button>
                                                        </CustomTooltip>
                                                    )}
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

                                                        {hasEditPermission && <MuiMenuItem onClick={handleEditClick}><ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenle</MuiMenuItem>}
                                                        {hasDeletePermission && <MuiMenuItem onClick={handleClickOpenDeleteModal}><ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek</MuiMenuItem>}

                                                        {hasDownloadPermission && (
                                                            <MuiMenuItem onClick={() => { setSelectedReceiptForDownload(row); setOpenRowDownloadModal(true); handleCloseMenu(); }}>
                                                                <ListItemIcon><IconFileDownload width={18} /></ListItemIcon> Bu satırı indir
                                                            </MuiMenuItem>
                                                        )}
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

            {/* ✅ بعد از ثبت: آیا فاکتور کمبو Sonlandır شود؟ */}
            <Dialog open={openIsEndModal} onClose={() => setOpenIsEndModal(false)}>
                <DialogTitle>Fatura Durumu Onayı</DialogTitle>
                <DialogContent>
                    <Typography>
                        Bu fişi kaydettiniz. Seçilen <b>Fatura</b> için <b>Sonlandır</b> işlemi uygulansın mı؟
                    </Typography>
                    <Typography sx={{ mt: 1 }}>
                        Fatura: <b>{justInsertedInvoice?.invoiceNo || "—"}</b>
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        (Sonlandırma sonrası bu fatura için yeni fiş oluşturulamaz.)
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setOpenIsEndModal(false); setJustInsertedInvoice(null); }} color="error">Hayır</Button>
                    <Button
                        onClick={async () => {
                            setOpenIsEndModal(false);
                            if (justInsertedInvoice) await updateInvoiceIsEnd(justInsertedInvoice.id, true);
                            setJustInsertedInvoice(null);
                        }}
                        color="primary" variant="contained" autoFocus
                    >
                        Evet (Sonlandır)
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ✅ مودال «Listeyi Göster» برای کمبوی فاکتور */}
            <Dialog open={openInvoiceListModal} onClose={() => setOpenInvoiceListModal(false)} maxWidth="md" fullWidth>
                <DialogTitle>Fatura Belgesi Listesi</DialogTitle>
                <DialogContent dividers>
                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>
                                    <StyledTableCell><Typography variant="h6">Kod</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Tarih</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Durum</Typography></StyledTableCell>
                                    <StyledTableCell align="center"><Typography variant="h6">Aç/Kapat</Typography></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {invoicesList
                                    .filter(inv => (typeof inv.status === "number" ? inv.status === 1 : inv.recordStatus === 0)) // فقط status=1
                                    .map(row => (
                                        <TableRow key={row.id}>
                                            <StyledTableCell>{row.invoiceNo}</StyledTableCell>
                                            <StyledTableCell>{formatDateDisplay(row.docDate)}</StyledTableCell>
                                            <StyledTableCell>
                                                {row.isEnd
                                                    ? <Chip size="small" label="Sonlandırılmış" color="error" />
                                                    : <Chip size="small" label="Açık" color="success" />}
                                            </StyledTableCell>
                                            <StyledTableCell align="center">
                                                <RadioGroup
                                                    row
                                                    value={row.isEnd ? 'ended' : 'open'}
                                                    onChange={(_, val) => updateInvoiceIsEnd(row.id, val === 'ended')}
                                                >
                                                    <FormControlLabel value="open" control={<Radio />} label="Açık" />
                                                    <FormControlLabel value="ended" control={<Radio />} label="Sonlandırılmış" />
                                                </RadioGroup>
                                            </StyledTableCell>
                                        </TableRow>
                                    ))}
                                {invoicesList.filter(inv => (typeof inv.status === "number" ? inv.status === 1 : inv.recordStatus === 0)).length === 0 && (
                                    <TableRow><StyledTableCell colSpan={4} align="center">Fatura bulunamadı.</StyledTableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenInvoiceListModal(false)}>Kapat</Button>
                </DialogActions>
            </Dialog>

            {/* Inactive invoices (receipt-based) */}
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
                                                    onClick={() => {
                                                        // بازگشایی Receipt (منطق قبلی تو):
                                                        (async () => {
                                                            if (!authToken) { navigate("/"); return; }
                                                            try {
                                                                const payload = { id: Number(inv.receiptId), isEnd: false };
                                                                const res = await axios.put(
                                                                    server.baseurl + server.warehouse + "update-store-receipt-is-end",
                                                                    payload,
                                                                    { headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" } }
                                                                );
                                                                if (res.data?.httpStatusCode === 200) {
                                                                    showAlert(`Fatura ${(inv.invoiceNo || inv.receiptCode)} başarıyla geri alındı.`, 'success');
                                                                    const r = await fetchReceiptsRaw();
                                                                    setReceiptsList(r);
                                                                    if (selectedWorkhouse?.id) await fetchInvoicesByWorkhouseId(String(selectedWorkhouse.id));
                                                                    setOpenInactiveModal(false);
                                                                } else {
                                                                    showAlert(res.data?.message || 'Fatura geri alınırken bir hata oluştu.', 'error');
                                                                }
                                                            } catch (e: any) {
                                                                showAlert(e.response?.data?.message || 'Fatura geri alınırken bir hata oluştu.', 'error');
                                                            }
                                                        })();
                                                    }}
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

            <Dialog
                open={openDescriptionModal}
                onClose={handleCloseDescriptionModal}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Açıklamanın Tamamı</DialogTitle>
                <DialogContent dividers>
                    <DialogContentText>
                        <div dangerouslySetInnerHTML={{ __html: fullDescriptionContent }} />
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDescriptionModal} color="primary">
                        Kapat
                    </Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
};

export default ListStoreReceiptInvoice;
