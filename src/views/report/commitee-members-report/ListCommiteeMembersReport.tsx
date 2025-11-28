import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Grid, Card, CardContent, Typography, Stack, Button, CircularProgress,
    Alert, TableContainer, Table, TableHead, TableRow, TableBody, TableCell,
    TablePagination, TextField, InputAdornment, IconButton, MenuItem,
    Dialog, DialogTitle, DialogContent, DialogActions, FormControl, Select,
    InputLabel, Chip, Checkbox, FormControlLabel,
} from '@mui/material';
import {
    IconFileReport, IconUsers, IconCheck, IconTrash, IconEdit,
    IconSearch, IconPlus, IconUserPlus, IconBinaryTree,
} from '@tabler/icons-react';

import axios from 'axios';
import server from '../../../assets/address.json';
import { useAuth } from 'src/context/AuthContext';
import { CustomTooltip, useTooltip } from 'src/context/TooltipContext';
import DeleteCommiteeMembersReport from './DeleteCommiteeMembersReport';

type ReportPhase = 'latest' | 'confirmation' | 'member_link' | 'member_answer';

interface CommiteMemberAnswer {
    id: string;
    answer: string; // "1" veya "0"
    createAt: string;
    recordStatus: number;
}

interface CommiteeMemberDetail {
    id: string;
    name: string;
    family: string;
    position: number;
}

interface CommiteeMemberLinkDisplay {
    id: string; // ConfirmationReportCommiteMember ID
    memberFullName: string;
    answer: string | null; // "1", "0" veya null
}

interface CommiteeMemberType {
    id: number;
    name: string;
    family: string;
    position: number;
}

interface LatestProjectReport {
    year: number;
    city: string;
    town: string | null;
    region: string;
    tesisType: number;
    trAdi: string | null;
    projectCount: number;
    Gecici_tutanak_teslim_alma_durumu?: boolean;
    Kesin_tutanak_teslim_alma_durumu?: boolean;
}

interface ConfirmationReport {
    id: string; // ID تأییدیه
    year: number;
    city: string;
    town: string | null;
    region: string;
    tesisType: number;
    trAdi: string | null;
    projectCount: number;
    Gecici_tutanak_teslim_alma_durumu: boolean;
    Kesin_tutanak_teslim_alma_durumu: boolean;
    createAt: string;
    recordStatus: number;
    confirmationReportCommiteMembers?: ConfirmationReportCommiteMember[];
}

interface ConfirmationReportCommiteMember {
    id: string; // ConfirmationReportCommiteMember ID (Faz 3 ID)
    createAt: string;
    recordStatus: number;
    confirmationProjectReport?: ConfirmationReport;
    commiteMember?: CommiteeMemberDetail;
    confirmationReportCommiteMemberAnswers?: CommiteMemberAnswer[];
}

const ProjectStatus = {
    Text: (status: number | undefined) => {
        switch (status) {
            case 0: return 'Tesis 0'; case 1: return 'Tesis 1'; case 2: return 'Tesis 2'; default: return 'Bilinmiyor';
        }
    },
    getDeliveryStatus: (isGecici: boolean | undefined, isKesin: boolean | undefined) => {
        if (isKesin) return { label: 'Kesin Teslim Edildi', color: 'success' };
        if (isGecici) return { label: 'Geçici Teslim Edildi', color: 'warning' };
        return { label: 'Teslim Edilmedi', color: 'error' };
    },
    getAnswerStatus: (answer: string | null | undefined) => {
        if (answer === "1") return { label: 'Evet', color: 'success' };
        if (answer === "0") return { label: 'Hayır', color: 'error' };
        return { label: 'Cevaplanmadı', color: 'warning' };
    }
};

// ----------------------------------------------------
// --- 2. Ana Bileşen ---
// ----------------------------------------------------

const ListCommiteeMembersReport = () => {
    const navigate = useNavigate();
    const { allowedOperations } = useAuth();
    const { isTooltipGloballyEnabled } = useTooltip();

    // --- State'ler ---
    const [loading, setLoading] = useState(false);

    // States اصلی برای نمایش داده ها
    const [latestReports, setLatestReports] = useState<LatestProjectReport[]>([]); // Faz 1
    const [confirmationReports, setConfirmationReports] = useState<ConfirmationReport[]>([]); // Faz 2 (جدول و Dropdown)
    const [memberLinks, setMemberLinks] = useState<ConfirmationReportCommiteMember[]>([]); // Faz 3
    const [memberAnswers, setMemberAnswers] = useState<CommiteMemberAnswer[]>([]); // Faz 4

    // فیلتر و Pagination
    const [filteredLatestReports, setFilteredLatestReports] = useState<LatestProjectReport[]>([]);
    const [filteredConfirmationReports, setFilteredConfirmationReports] = useState<ConfirmationReport[]>([]);

    const [selectedPhase, setSelectedPhase] = useState<ReportPhase>('latest');
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');

    // States برای عملیات حذف
    const [reportIdToDelete, setReportIdToDelete] = useState<string | null>(null);
    const [phaseToDelete, setPhaseToDelete] = useState<ReportPhase | null>(null);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);

    // States برای Faz 1/2 Modal (ثبت/ویرایش گزارش تأییدیه)
    const [openModalPhase1, setOpenModalPhase1] = useState(false);
    const [editingReportPhase1, setEditingReportPhase1] = useState<ConfirmationReport | null>(null);

    // States برای Faz 2/3/4 Modal (مدیریت اعضا و پاسخ‌ها)
    const [openModalPhase2, setOpenModalPhase2] = useState(false);
    const [selectedProjectPhase2, setSelectedProjectPhase2] = useState<ConfirmationReport | null>(null);
    const [allCommiteeMembers, setAllCommiteeMembers] = useState<CommiteeMemberType[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState<number | ''>('');
    const [membersListForProject, setMembersListForProject] = useState<CommiteeMemberLinkDisplay[]>([]);

    // States برای Dropdown های فاز 3 و 4 در بالای جدول
    const [selectedConfirmationReportId, setSelectedConfirmationReportId] = useState<string | ''>('');
    const [selectedMemberLinkId, setSelectedMemberLinkId] = useState<string | ''>('');

    // --- Yardımcı Fonksiyonlar ---

    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
        setTimeout(() => setAlertMessage(null), 7000);
    }, []);

    const handleApiError = useCallback((e: any) => {
        if (e.response?.status === 401) {
            localStorage.removeItem('authToken');
            showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
            navigate('/');
        } else if (e.response?.status === 500) {
            showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');
        }
        else {
            showAlert(e.response?.data?.message || 'Bir hata oluştu, lütfen tekrar deneyin.', 'error');
        }
    }, [navigate, showAlert]);

    const hasPermission = useCallback((operationName: string) => {
        return allowedOperations.some(op => op.systemOperationName === operationName);
    }, [allowedOperations]);

    // --- Veri Çekme (Core Fetcher) ---

    // 💡 تابع جدید: بارگذاری اختصاصی داده‌های فاز 2 (Confirmation Reports)
    const fetchConfirmationReports = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate('/'); return; }

        try {
            const endpoint = server.report + "get-all-confirmation-project-reports";
            const response = await axios.get(server.baseurl + endpoint, {
                headers: { "Authorization": `Bearer ${authToken}` }
            });

            if (response.data.httpStatusCode === 200) {
                const data = response.data.data.map((item: any) => ({
                    ...item,
                    id: String(item.id || ''),
                    projectCount: Number(item.projectCount),
                    confirmationReportCommiteMembers: item.confirmationReportCommiteMembers || []
                })) as ConfirmationReport[];
                setConfirmationReports(data);
            } else {
                showAlert(response.data.message || 'Onay Raporları yüklenirken bir hata oluştu.', 'error');
                setConfirmationReports([]);
            }
        } catch (e) {
            handleApiError(e);
            setConfirmationReports([]);
        }
    }, [navigate, showAlert, handleApiError]);


    // این تابع فقط داده‌های مورد نیاز برای جدول فاز فعال را می‌کشد (Faz 1, Faz 3, Faz 4)
    const fetchReports = useCallback(async () => {
        setLoading(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate('/'); setLoading(false); return; }

        let endpoint = "";
        let targetSetter: Function = setLatestReports;
        let neededId = null;

        if (selectedPhase === 'latest') {
            endpoint = server.report + "get-latest-project-reports";
            targetSetter = setLatestReports;
        }
        else if (selectedPhase === 'confirmation') {
            // فاز 2 اکنون با fetchConfirmationReports بارگذاری می‌شود، این بلوک باید خالی باشد 
            // تا از تداخل جلوگیری شود یا به عنوان یک fallback استفاده شود.
            await fetchConfirmationReports();
            setLoading(false);
            return;
        }
        else if (selectedPhase === 'member_link') {
            neededId = selectedConfirmationReportId;
            if (!neededId) { setMemberLinks([]); setLoading(false); return; }
            endpoint = server.report + `get-confirmation-report-commite-member/${neededId}`;
            targetSetter = setMemberLinks;
        }
        else if (selectedPhase === 'member_answer') {
            neededId = selectedMemberLinkId;
            if (!neededId) { setMemberAnswers([]); setLoading(false); return; }
            endpoint = server.report + `get-confirmation_report-commite-member-answer-dto-by-member-id/${neededId}`;
            targetSetter = setMemberAnswers;
        }
        else {
            setLoading(false); return;
        }

        try {
            const response = await axios.get(server.baseurl + endpoint, {
                headers: { "Authorization": `Bearer ${authToken}` }
            });

            if (response.data.httpStatusCode === 200) {
                let data = response.data.data;

                // تبدیل نوع داده برای فاز 1
                if (selectedPhase === 'latest') {
                    data = response.data.data.map((item: any) => ({
                        ...item,
                        projectCount: Number(item.projectCount),
                    }));
                }

                targetSetter(data);
            } else {
                showAlert(response.data.message || 'Raporlar yüklenirken bir hata oluştu.', 'error');
                targetSetter([]);
            }
        } catch (e) {
            handleApiError(e);
            targetSetter([]);
        } finally {
            setLoading(false);
        }
    }, [navigate, showAlert, handleApiError, selectedPhase, selectedConfirmationReportId, selectedMemberLinkId, fetchConfirmationReports]);

    const fetchCommiteeMembers = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) return;

        try {
            const response = await axios.get(server.baseurl + server.report + "get-all-commitee-members", {
                headers: { "Authorization": `Bearer ${authToken}` }
            });

            if (response.data.httpStatusCode === 200) {
                const activeMembers = response.data.data
                    .filter((m: any) => m.recordStatus === 0)
                    .map((m: any) => ({
                        id: Number(m.id),
                        name: m.name,
                        family: m.family,
                        position: m.position
                    })) as CommiteeMemberType[];
                setAllCommiteeMembers(activeMembers);
            }
        } catch (e) {
            console.error("Komite üyeleri çekilirken hata oluştu:", e);
        }
    }, []);


    // --- Etkیل و منطق بارگذاری داده‌ها (تفکیک شده) ---
    // این useEffect مسئول کنترل تغییر فاز و فراخوانی API است.
    useEffect(() => {
        setPage(0); // هنگام تغییر فاز، صفحه را ریست کن
        fetchCommiteeMembers(); // اعضا همیشه برای Modal نیاز هستند.

        // فاز 1: گزارش‌های خام (Latest)
        if (selectedPhase === 'latest') {
            setConfirmationReports([]); // حذف ریست فاز 2/3/4
            setMemberLinks([]);
            setMemberAnswers([]);
            fetchReports();
        }

        // فاز 2: گزارش‌های تأییدیه (Confirmation)
        else if (selectedPhase === 'confirmation') {
            setLatestReports([]); // حذف ریست فاز 1
            setMemberLinks([]);
            setMemberAnswers([]);
            fetchConfirmationReports(); // فراخوانی تابع جدید
        }

        // فاز 3 و 4: نیاز به داده‌های فاز 2 (برای Dropdown اول) و داده‌های فاز فعال (برای جدول)
        else if (selectedPhase === 'member_link' || selectedPhase === 'member_answer') {
            setLatestReports([]);
            setMemberAnswers([]); // برای فاز 3 ریست می‌شود

            // 💡 این خط حیاتی است: تضمین می‌کند که Dropdown اول (Faz 2) پر باشد
            fetchConfirmationReports();

            if (selectedPhase === 'member_link' && selectedConfirmationReportId) {
                fetchReports(); // بارگذاری داده‌های فاز 3 برای جدول
            }

            if (selectedPhase === 'member_answer' && selectedConfirmationReportId && selectedMemberLinkId) {
                fetchReports(); // بارگذاری داده‌های فاز 4 برای جدول
            }

            if (selectedPhase === 'member_link' && !selectedConfirmationReportId) {
                setMemberLinks([]);
            }
            if (selectedPhase === 'member_answer' && !selectedMemberLinkId) {
                setMemberAnswers([]);
            }
        }

        // پاکسازی انتخاب‌های Dropdown هنگام خروج از فازهای 3 و 4
        if (selectedPhase === 'latest' || selectedPhase === 'confirmation') {
            setSelectedConfirmationReportId('');
            setSelectedMemberLinkId('');
        }

    }, [
        fetchReports,
        fetchCommiteeMembers,
        fetchConfirmationReports, // 💡 اضافه شدن برای وابستگی
        selectedPhase,
        selectedConfirmationReportId,
        selectedMemberLinkId
    ]);


    // **FIX** : منطق پر کردن Dropdown فاز 3 هنگام انتخاب فاز 2 در فاز 4
    // این useEffect تضمین می‌کند که Dropdown فاز 3 (memberLinks) با انتخاب Dropdown فاز 2 پر شود.
    useEffect(() => {
        // این منطق هم برای فاز 3 و هم برای فاز 4 که نیاز به Dropdown دوم دارد، کار می‌کند
        if (selectedPhase === 'member_answer' || selectedPhase === 'member_link') {

            // 1. پیدا کردن گزارش تأییدیه انتخاب شده از لیست کامل
            const selectedReport = confirmationReports.find(r => r.id === selectedConfirmationReportId);

            if (selectedReport) {
                // 2. استخراج لینک‌های اعضا (Faz 3 Data) و تنظیم State برای پر شدن Dropdown
                const members = selectedReport.confirmationReportCommiteMembers || [];
                setMemberLinks(members as ConfirmationReportCommiteMember[]);
            } else {
                // اگر چیزی انتخاب نشده یا داده‌ای برای گزارش انتخاب شده وجود ندارد
                setMemberLinks([]);
                setSelectedMemberLinkId('');
            }
        }

    }, [selectedPhase, selectedConfirmationReportId, confirmationReports]); // این منطق به درستی به confirmationReports وابسته است


    // --- منطق فیلتر و Pagination (با رفع باگ رفرش بی‌پایان) ---
    const handleSearch = useCallback((reports: LatestProjectReport[] | ConfirmationReport[]) => {
        const term = searchTerm.toLowerCase();
        return reports.filter(report =>
            report.city.toLowerCase().includes(term) ||
            report.region.toLowerCase().includes(term) ||
            (report.trAdi && report.trAdi.toLowerCase().includes(term))
        );
    }, [searchTerm]);

    useEffect(() => {
        if (selectedPhase === 'latest') {
            setFilteredLatestReports(handleSearch(latestReports) as LatestProjectReport[]);
            setPage(0);
        } else if (selectedPhase === 'confirmation') {
            setFilteredConfirmationReports(handleSearch(confirmationReports) as ConfirmationReport[]);
            setPage(0);
        } else {
            setFilteredLatestReports([]);
            setFilteredConfirmationReports([]);
        }
    }, [latestReports, confirmationReports, searchTerm, handleSearch, selectedPhase]);

    const displayReports = useMemo(() => {
        const dataToPaginate = selectedPhase === 'latest' ? filteredLatestReports : filteredConfirmationReports;
        const start = page * rowsPerPage;
        const end = start + rowsPerPage;
        return dataToPaginate.slice(start, end);
    }, [filteredLatestReports, filteredConfirmationReports, page, rowsPerPage, selectedPhase]);

    // --- Faz 1/2 CRUD ---

    const handleSavePhase1 = async (data: any, isEdit: boolean) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate('/'); return; }

        setLoading(true);
        try {
            const endpoint = isEdit ? "update-confirmation-project-report" : "create-confirmation-project-report";
            const method = isEdit ? axios.put : axios.post;

            const payload: any = {
                year: Number(data.year) || new Date().getFullYear(),
                city: data.city || '',
                town: data.town || null,
                region: data.region || '',
                tesisType: Number(data.tesisType) || 0,
                trAdi: data.trAdi || null,
                projectCount: Number(data.projectCount) || 1,
                Gecici_tutanak_teslim_alma_durumu: data.Gecici_tutanak_teslim_alma_durumu || false,
                Kesin_tutanak_teslim_alma_durumu: data.Kesin_tutanak_teslim_alma_durumu || false
            };

            if (isEdit) {
                payload.id = data.id;
            }

            const response = await method(server.baseurl + server.report + endpoint, payload, {
                headers: { "Authorization": `Bearer ${authToken}` }
            });

            if (response.data.httpStatusCode === (isEdit ? 200 : 201)) {
                showAlert(`Rapor başarıyla ${isEdit ? 'güncellendi' : 'onay raporuna dönüştürüldü'}.`, 'success');
                setOpenModalPhase1(false);
                setEditingReportPhase1(null);
                setSelectedPhase('confirmation');
                fetchReports();
            } else {
                showAlert(response.data.message || 'İşlem sırasında bir hata oluştu.', 'error');
            }
        } catch (e) {
            handleApiError(e);
        } finally {
            setLoading(false);
        }
    };

    const handleEditPhase1 = (report: ConfirmationReport) => {
        setEditingReportPhase1(report);
        setOpenModalPhase1(true);
    };

    const handleDeletePhase1 = (reportId: string) => {
        setReportIdToDelete(reportId);
        setPhaseToDelete('confirmation');
        setOpenDeleteModal(true);
    };


    // --- Faz 2 CRUD (Komite Üyesi Ekleme/Yönetimi) ---

    const handleAssignMemberClick = (report: ConfirmationReport) => {
        if (!report.id) {
            showAlert('Bu rapor henüz bir onay raporu olarak kaydedilmemiş.', 'warning');
            return;
        }

        setSelectedProjectPhase2(report);

        const currentMembers: CommiteeMemberLinkDisplay[] = (report.confirmationReportCommiteMembers || []).map(link => {
            const memberIdToFind = link.commiteMember?.id;

            const memberDetail = memberIdToFind
                ? allCommiteeMembers.find(m => String(m.id) === String(memberIdToFind))
                : null;

            const answer = link.confirmationReportCommiteMemberAnswers?.[0]?.answer || null;

            return {
                id: link.id!,
                memberFullName: memberDetail ? `${memberDetail.name} ${memberDetail.family}` : `Üye Bilgisi Eksik (ID: ${link.commiteMember?.id})`,
                answer: answer
            } as CommiteeMemberLinkDisplay;
        });

        setMembersListForProject(currentMembers);
        setOpenModalPhase2(true);
    };

    const handleSavePhase2 = async () => {
        if (!selectedProjectPhase2 || !selectedProjectPhase2.id || !selectedMemberId) {
            showAlert('Lütfen Proje ve Komite Üyesi seçin.', 'warning');
            return;
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate('/'); return; }

        setLoading(true);
        try {
            const payload = {
                commiteMembersId: Number(selectedMemberId),
                confirmationProjectReportId: selectedProjectPhase2.id,
            };

            const response = await axios.post(server.baseurl + server.report + "create-confirmation-report-commite-member", payload, {
                headers: { "Authorization": `Bearer ${authToken}` }
            });

            if (response.data.httpStatusCode === 201) {
                showAlert('Komite Üyesi projeye başarıyla atandı.', 'success');
                setSelectedMemberId('');
                fetchConfirmationReports(); // به‌روزرسانی داده‌های فاز 2 (برای Modal)
                setOpenModalPhase2(false);
                setSelectedProjectPhase2(null);
            } else {
                showAlert(response.data.message || 'Üye atanırken bir hata oluştu.', 'error');
            }
        } catch (e) {
            handleApiError(e);
        } finally {
            setLoading(false);
        }
    };

    // --- Faz 3 & 4 Mantığı ---

    const handleDeleteMemberLink = (memberLinkId: string) => {
        setReportIdToDelete(memberLinkId);
        setPhaseToDelete('member_link');
        setOpenDeleteModal(true);
    }

    const handleSavePhase3 = async (ConfirmationReportCommiteMemberId: string, answer: 0 | 1) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate('/'); return; }

        setLoading(true);
        try {
            const payload = {
                answer: String(answer),
                ConfirmationReportCommiteMemberId: ConfirmationReportCommiteMemberId,
            };

            const response = await axios.post(server.baseurl + server.report + "create-confirmation-report-commite-member-answer", payload, {
                headers: { "Authorization": `Bearer ${authToken}` }
            });

            if (response.data.httpStatusCode === 201) {
                showAlert('Cevap başarıyla kaydedildi.', 'success');

                // به‌روزرسانی داده‌های فاز 3 برای نمایش پاسخ جدید
                if (selectedPhase === 'member_link') {
                    fetchReports();
                }
                // اگر در Modal هستیم، فقط داده‌های فاز 2 را رفرش کن (تا Modal به‌روز شود)
                if (selectedProjectPhase2) {
                    fetchConfirmationReports();
                    // برای به‌روزرسانی Modal، نیاز به بستن و باز کردن مجدد Modal نیست، اما باید داده‌ها را به‌روز کنید.
                    // اینجا نیاز به پیاده‌سازی منطق به‌روزرسانی لیست اعضا در Modal داریم.
                    // فعلاً فرض می‌کنیم که کاربر Modal را می‌بندد و دوباره باز می‌کند.
                }

            } else {
                showAlert(response.data.message || 'Cevap kaydedilirken bir hata oluştu.', 'error');
            }
        } catch (e) {
            handleApiError(e);
        } finally {
            setLoading(false);
        }
    };

    // --- JSX RENDER: Tablo İçری و سرتیتر ---

    const renderTableHead = () => {
        let columns: string[] = [];
        if (selectedPhase === 'latest' || selectedPhase === 'confirmation') {
            columns = ['Yıl', 'Bölge', 'Tesis Tipi', 'Proje Sayısı', 'Teslim Durumu', 'Üye Ataması', 'İşlemler'];
        } else if (selectedPhase === 'member_link') {
            columns = ['Üye Adı Soyadı', 'Pozisyon', 'Atama Tarihi', 'Cevap Durumu', 'İşlem'];
        } else if (selectedPhase === 'member_answer') {
            columns = ['Cevap ID', 'Cevap (1/0)', 'Tarih', 'İşlem'];
        }

        return (
            <TableHead>
                <TableRow sx={{ background: "#f5f5f5" }}>
                    {columns.map(col => <TableCell key={col}>{col}</TableCell>)}
                </TableRow>
            </TableHead>
        );
    }

    const renderTableContent = () => {
        if (loading) {
            return <TableRow><TableCell colSpan={7} align="center"><CircularProgress size={20} /> Yükleniyor...</TableCell></TableRow>
        }

        let dataToRender: any[] = [];
        let colSpan = 7;

        if (selectedPhase === 'latest') {
            dataToRender = displayReports as LatestProjectReport[];
            colSpan = 7;
        } else if (selectedPhase === 'confirmation') {
            dataToRender = displayReports as ConfirmationReport[];
            colSpan = 7;
        } else if (selectedPhase === 'member_link') {
            if (!selectedConfirmationReportId) {
                return <TableRow><TableCell colSpan={5} align="center">Lütfen yukarıdan bir Onay Raporu seçin.</TableCell></TableRow>
            }
            dataToRender = memberLinks;
            colSpan = 5;
        } else if (selectedPhase === 'member_answer') {
            if (!selectedMemberLinkId) {
                return <TableRow><TableCell colSpan={5} align="center">Lütfen yukarıdan bir Üye Bağlantısı seçin.</TableCell></TableRow>
            }
            dataToRender = memberAnswers;
            colSpan = 5;
        }

        if (dataToRender.length === 0) {
            return <TableRow><TableCell colSpan={colSpan} align="center">Veri bulunamadı.</TableCell></TableRow>
        }

        // --- Faz 1 Rendering (Latest) ---
        if (selectedPhase === 'latest') {
            return dataToRender.map((row: LatestProjectReport) => (
                <TableRow key={`${row.trAdi}-${row.city}-${row.year}`}>
                    <TableCell>{row.year}</TableCell>
                    <TableCell>{`${row.city} / ${row.region}`}</TableCell>
                    <TableCell>{ProjectStatus.Text(row.tesisType)}</TableCell>
                    <TableCell>{String(row.projectCount)}</TableCell>

                    <TableCell>
                        <Chip label="Ham Veri" color='info' size="small" />
                    </TableCell>
                    <TableCell>
                        <Chip label="Atama Gerekmez" color='default' size="small" />
                    </TableCell>

                    <TableCell>

                    </TableCell>
                </TableRow>
            ));
        }
        // --- Faz 2 Rendering (Confirmation) ---
        else if (selectedPhase === 'confirmation') {
            return dataToRender.map((row: ConfirmationReport) => (
                <TableRow key={String(row.id)}>
                    <TableCell>{row.year}</TableCell>
                    <TableCell>{`${row.city} / ${row.region}`}</TableCell>
                    <TableCell>{ProjectStatus.Text(row.tesisType)}</TableCell>
                    <TableCell>{String(row.projectCount)}</TableCell>

                    <TableCell>
                        <Chip
                            label={ProjectStatus.getDeliveryStatus(row.Gecici_tutanak_teslim_alma_durumu, row.Kesin_tutanak_teslim_alma_durumu).label}
                            color={ProjectStatus.getDeliveryStatus(row.Gecici_tutanak_teslim_alma_durumu, row.Kesin_tutanak_teslim_alma_durumu).color as any}
                            size="small"
                        />
                    </TableCell>
                    <TableCell>
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Komite üyelerini ata veya cevaplarını gör" : ""}>
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={() => handleAssignMemberClick(row)}
                                startIcon={<IconUsers size={18} />}
                            >
                                Üyeler ({row.confirmationReportCommiteMembers?.length || 0})
                            </Button>
                        </CustomTooltip>
                    </TableCell>

                    <TableCell>
                        <Stack direction="row" spacing={1}>
                            {hasPermission('Düzenlemek') && (
                                <CustomTooltip title={isTooltipGloballyEnabled ? "Rapor bilgilerini düzenle" : ""}>
                                    <IconButton onClick={() => handleEditPhase1(row)}>
                                        <IconEdit size={18} />
                                    </IconButton>
                                </CustomTooltip>
                            )}
                            {hasPermission('Silmek') && (
                                <CustomTooltip title={isTooltipGloballyEnabled ? "Raporu sil" : ""}>
                                    <IconButton onClick={() => handleDeletePhase1(row.id!)} color="error">
                                        <IconTrash size={18} />
                                    </IconButton>
                                </CustomTooltip>
                            )}
                        </Stack>
                    </TableCell>
                </TableRow>
            ));
        }
        // --- Faz 3 Rendering (Member Links) ---
        else if (selectedPhase === 'member_link') {
            return dataToRender.map((row: ConfirmationReportCommiteMember) => (
                <TableRow key={row.id}>
                    <TableCell>{row.commiteMember?.name} {row.commiteMember?.family}</TableCell>
                    <TableCell>{ProjectStatus.Text(row.commiteMember?.position)}</TableCell>
                    <TableCell>{new Date(row.createAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                        <Chip
                            label={ProjectStatus.getAnswerStatus(row.confirmationReportCommiteMemberAnswers?.[0]?.answer).label}
                            color={ProjectStatus.getAnswerStatus(row.confirmationReportCommiteMemberAnswers?.[0]?.answer).color as any}
                            size="small"
                        />
                    </TableCell>
                    <TableCell>
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Üye atamasını kaldır" : ""}>
                            <IconButton color="error" size="small" onClick={() => handleDeleteMemberLink(row.id!)}>
                                <IconTrash size={18} />
                            </IconButton>
                        </CustomTooltip>
                    </TableCell>
                </TableRow>
            ));
        }
        // --- Faz 4 Rendering (Member Answers) ---
        else if (selectedPhase === 'member_answer') {
            return dataToRender.map((row: CommiteMemberAnswer) => (
                <TableRow key={row.id}>
                    <TableCell>{row.id}</TableCell>
                    <TableCell>
                        <Chip
                            label={ProjectStatus.getAnswerStatus(row.answer).label}
                            color={ProjectStatus.getAnswerStatus(row.answer).color as any}
                            size="small"
                        />
                    </TableCell>
                    <TableCell>{new Date(row.createAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Cevabı Sil" : ""}>
                            <IconButton color="error" size="small" onClick={() => { setReportIdToDelete(row.id); setPhaseToDelete('member_answer'); setOpenDeleteModal(true); }}>
                                <IconTrash size={18} />
                            </IconButton>
                        </CustomTooltip>
                    </TableCell>
                </TableRow>
            ));
        }
        return null;
    }

    const cardData = useMemo(() => {
        const confirmationCount = confirmationReports.length;
        const linkedMembersCount = confirmationReports.reduce((sum, report) => sum + (report.confirmationReportCommiteMembers?.length || 0), 0);

        return [
            {
                title: 'Proje Listesi (Faz 1)',
                count: latestReports.length,
                icon: <IconFileReport size={25} color="#1e88e5" />,
                phase: 'latest' as ReportPhase,
                description: 'API’den gelen ilk rapor verileri.'
            },
            {
                title: 'Onay Raporları (Faz 2)',
                count: confirmationCount,
                icon: <IconUsers size={25} color="#fb8c00" />,
                phase: 'confirmation' as ReportPhase,
                description: 'Üye atanması gereken onay projeleri.'
            },
            {
                title: 'Üye Atamaları (Faz 3)',
                count: linkedMembersCount,
                icon: <IconBinaryTree size={25} color="#00bcd4" />,
                phase: 'member_link' as ReportPhase,
                description: 'Tüm onay projelerindeki atanmış üye bağlantıları.'
            },
            {
                title: 'Üye Cevapları (Faz 4)',
                count: memberAnswers.length,
                icon: <IconCheck size={25} color="#43a047" />,
                phase: 'member_answer' as ReportPhase,
                description: 'Seçili bağlantı için kayıtlı cevapların toplamı.'
            },
        ];
    }, [latestReports, confirmationReports, memberAnswers]);

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom mb={2}>Proje Raporu Kontrol Paneli</Typography>
            {alertMessage && (
                <Alert
                    severity={alertSeverity}
                    onClose={() => setAlertMessage(null)}
                    sx={{ mb: 3 }}
                >
                    {alertMessage}
                </Alert>
            )}

            {/* --- Card Data (Faz Seçimi) --- */}
            <Grid container spacing={3} mb={4}>
                {cardData.map((card) => (
                    <Grid item xs={12} sm={6} md={3} key={card.phase}>
                        <Card
                            onClick={() => setSelectedPhase(card.phase)}
                            sx={{
                                cursor: 'pointer',
                                border: card.phase === selectedPhase ? '2px solid #1e88e5' : '1px solid #ccc',
                                transition: '0.3s',
                                '&:hover': { boxShadow: 3 },
                                backgroundColor: card.phase === selectedPhase ? '#e3f2fd' : 'white',
                            }}
                        >
                            <CardContent>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Box>
                                        <Typography variant="h5">{card.title}</Typography>
                                        <Typography variant="h3" color="primary">{card.count}</Typography>
                                    </Box>
                                    {card.icon}
                                </Stack>
                                <Typography variant="caption" color="textSecondary" mt={1}>{card.description}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <hr />

            {/* --- Aksiyon Butonları، Arama ve Dropdownlar (Faz 3 & 4 için) --- */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} flexWrap="wrap">

                        {/* Arama */}
                        <TextField
                            label="Arama (Şehir/Bölge/TR Adı)"
                            variant="outlined"
                            size="small"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><IconSearch size={20} /></InputAdornment>,
                            }}
                            sx={{ flexGrow: 1, minWidth: '200px' }}
                            disabled={selectedPhase !== 'latest' && selectedPhase !== 'confirmation'}
                        />

                        {/* Dropdown فاز 2/3: انتخاب گزارش تأییدیه (فقط در فاز 3 و 4) */}
                        {(selectedPhase === 'member_link' || selectedPhase === 'member_answer') && (
                            <FormControl size="small" sx={{ minWidth: 250 }}>
                                <InputLabel>Faz 2 Projesi Seç (Üye Ataması Olanlar)</InputLabel>
                                <Select
                                    value={selectedConfirmationReportId}
                                    label="Faz 2 Projesi Seç (Üye Ataması Olanlar)"
                                    onChange={(e) => {
                                        setSelectedConfirmationReportId(e.target.value as string);
                                        setSelectedMemberLinkId(''); // ریست کردن Dropdown دوم
                                    }}
                                >
                                    <MenuItem value={''}>--- Proje Seçin ---</MenuItem>
                                    {confirmationReports.filter(r => r.confirmationReportCommiteMembers?.length).map(report => (
                                        report.id && <MenuItem key={report.id} value={report.id}>
                                            {report.city} / {report.region} ({report.year})
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}

                        {/* Dropdown فاز 3/4: انتخاب لینک عضو (فقط در فاز 4) */}
                        {selectedPhase === 'member_answer' && (
                            <FormControl size="small" sx={{ minWidth: 250 }}>
                                <InputLabel>Faz 3 Üye Bağlantısı Seç</InputLabel>
                                <Select
                                    value={selectedMemberLinkId}
                                    label="Faz 3 Üye Bağlantısı Seç"
                                    onChange={(e) => setSelectedMemberLinkId(e.target.value as string)}
                                    // Dropdown فاز 3 فقط زمانی فعال است که فاز 2 انتخاب شده باشد
                                    disabled={!selectedConfirmationReportId}
                                >
                                    <MenuItem value={''}>--- Bağlantı Seçin ---</MenuItem>
                                    {memberLinks.map(link => ( // 💡 memberLinks اکنون از useEffect دوم پر شده است
                                        link.id && <MenuItem key={link.id} value={link.id}>
                                            {
                                                confirmationReports.find(r => r.id === selectedConfirmationReportId)
                                                    ?.confirmationReportCommiteMembers
                                                    ?.find(m => m.id === link.id)?.commiteMember
                                                    ? `${link.commiteMember?.name} ${link.commiteMember?.family}`
                                                    : 'Üye Bilgisi Eksik'
                                            }
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}


                        {/* دکمه "Yeni Onay Raporu Ekle" (فقط در فاز 2) */}
                        {selectedPhase === 'confirmation' && hasPermission('Eklemek') && (
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<IconPlus size={20} />}
                                onClick={() => {
                                    setEditingReportPhase1(null);
                                    setOpenModalPhase1(true);
                                }}
                                disabled={loading}
                            >
                                Yeni Onay Raporu Ekle
                            </Button>
                        )}
                    </Stack>
                </CardContent>
            </Card>

            <hr />

            {/* --- Rapor Tablosu --- */}
            <Card>
                <Box sx={{ p: 2 }}>
                    <Typography variant="h6" mb={2}>
                        {cardData.find(c => c.phase === selectedPhase)?.title || 'Rapor Listesi'}
                    </Typography>
                    <TableContainer>
                        <Table>
                            {renderTableHead()}
                            <TableBody>
                                {renderTableContent()}
                            </TableBody>
                        </Table>

                        {/* Pagination فقط برای فاز 1 و 2 فعال است */}
                        {(selectedPhase === 'latest' || selectedPhase === 'confirmation') && (
                            <TablePagination
                                rowsPerPageOptions={[5, 10, 25]}
                                component="div"
                                count={selectedPhase === 'latest' ? filteredLatestReports.length : filteredConfirmationReports.length}
                                rowsPerPage={rowsPerPage}
                                page={page}
                                onPageChange={(_e, newPage) => setPage(newPage)}
                                onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                                labelRowsPerPage="Sayfa başına satır:"
                            />
                        )}
                    </TableContainer>
                </Box>
            </Card>

            {/* --- Modallar --- */}

            {/* Faz 1/2 Modal: Onay Raporu Kaydet/Düzenle */}
            <Dialog open={openModalPhase1} onClose={() => { setOpenModalPhase1(false); setEditingReportPhase1(null) }} fullWidth maxWidth="sm">
                <DialogTitle>{editingReportPhase1 ? 'Onay Raporu Düzenle' : 'Yeni Onay Raporu Kaydı'}</DialogTitle>
                <DialogContent>
                    <ReportFormPhase1
                        initialData={editingReportPhase1 || {} as ConfirmationReport}
                        onSave={handleSavePhase1}
                        onCancel={() => { setOpenModalPhase1(false); setEditingReportPhase1(null); }}
                        isLoading={loading}
                    />
                </DialogContent>
            </Dialog>

            {/* Faz 2/3/4 Modal: Komite Üyesi Yönetimi ve Cevapları */}
            <Dialog open={openModalPhase2} onClose={() => { setOpenModalPhase2(false); setSelectedProjectPhase2(null); setMembersListForProject([]) }} fullWidth maxWidth="md">
                <DialogTitle>
                    {selectedProjectPhase2?.city} - {selectedProjectPhase2?.region} Projesi Üye Yönetimi (Faz 3 & 4)
                </DialogTitle>
                <DialogContent dividers>
                    <Stack direction="column" spacing={3}>

                        {/* Faz 3: Komite Üyesi Ekle (انتصاب عضو) */}
                        <Box sx={{ border: '1px solid #eee', p: 2 }}>
                            <Typography variant="h6" mb={2}><IconUserPlus size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Yeni Komite Üyesi Ata (Faz 3 Giriş)</Typography>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <FormControl fullWidth size="small">
                                    <InputLabel>Komite Üyesi Seç</InputLabel>
                                    <Select
                                        value={selectedMemberId}
                                        label="Komite Üyesi Seç"
                                        onChange={(e) => setSelectedMemberId(Number(e.target.value))}
                                    >
                                        <MenuItem value={''}>Üye Seçin</MenuItem>
                                        {allCommiteeMembers.map((member) => (
                                            <MenuItem key={member.id} value={member.id}>
                                                {member.name} {member.family} ({ProjectStatus.Text(member.position)})
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <Button onClick={handleSavePhase2} color="primary" variant="contained" disabled={!selectedMemberId || loading}>
                                    {loading ? <CircularProgress size={20} /> : 'Ata'}
                                </Button>
                            </Stack>
                        </Box>

                        {/* Faz 3/4: Atanan Üyeler و Cevapları (نمایش لینک‌ها و امکان ثبت پاسخ) */}
                        <Box sx={{ border: '1px solid #eee', p: 2 }}>
                            <Typography variant="h6" mb={2}><IconBinaryTree size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Atanan Üyeler ve Cevapları (Faz 3 Listesi & Faz 4 Cevaplama)</Typography>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ background: "#f5f5f5" }}>
                                            <TableCell>Üye Adı Soyadı</TableCell>
                                            <TableCell>Cevap Durumu</TableCell>
                                            <TableCell>Cevap/İşlem</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {membersListForProject.length === 0 ? (
                                            <TableRow><TableCell colSpan={3}>Bu rapora atanmış üye bulunmamaktadır.</TableCell></TableRow>
                                        ) : (
                                            membersListForProject.map(memberLink => (
                                                <TableRow key={memberLink.id}>
                                                    <TableCell>{memberLink.memberFullName}</TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={ProjectStatus.getAnswerStatus(memberLink.answer).label}
                                                            color={ProjectStatus.getAnswerStatus(memberLink.answer).color as any}
                                                            size="small"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Stack direction="row" spacing={1}>
                                                            {/* ثبت پاسخ (Faz 4) */}
                                                            <Button
                                                                variant="contained"
                                                                color="success"
                                                                size="small"
                                                                onClick={() => handleSavePhase3(memberLink.id, 1)}
                                                                disabled={memberLink.answer === "1" || loading}
                                                            >
                                                                Evet (1)
                                                            </Button>
                                                            <Button
                                                                variant="contained"
                                                                color="error"
                                                                size="small"
                                                                onClick={() => handleSavePhase3(memberLink.id, 0)}
                                                                disabled={memberLink.answer === "0" || loading}
                                                            >
                                                                Hayır (0)
                                                            </Button>
                                                            {/* حذف لینک (Faz 3 Delete) */}
                                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Üye atamasını kaldır" : ""}>
                                                                <IconButton color="error" size="small" onClick={() => handleDeleteMemberLink(memberLink.id)}>
                                                                    <IconTrash size={16} />
                                                                </IconButton>
                                                            </CustomTooltip>

                                                        </Stack>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setOpenModalPhase2(false); setSelectedProjectPhase2(null); setMembersListForProject([]) }} color="secondary">Kapat</Button>
                </DialogActions>
            </Dialog>

            {/* Silme Modalı (برای Faz 2, Faz 3, Faz 4 Delete) */}
            <DeleteCommiteeMembersReport
                openModal={openDeleteModal}
                onClose={() => setOpenDeleteModal(false)}
                reportIdToDelete={reportIdToDelete}
                phase={phaseToDelete as any}
                onDeleteSuccess={fetchReports}
                showAlert={showAlert}
            />

        </Box>
    );
};

export default ListCommiteeMembersReport;


// ----------------------------------------------------
// --- 3. Yardımcı Bileşen: Faz 1 Formu (MOCK UP) ---
// ----------------------------------------------------

interface ReportFormPhase1Props {
    initialData: Partial<ConfirmationReport>;
    onSave: (data: any, isEdit: boolean) => void;
    onCancel: () => void;
    isLoading: boolean;
}

const ReportFormPhase1: React.FC<ReportFormPhase1Props> = ({ initialData, onSave, onCancel, isLoading }) => {
    const [year, setYear] = useState(initialData?.year || new Date().getFullYear());
    const [city, setCity] = useState(initialData?.city || '');
    const [region, setRegion] = useState(initialData?.region || '');
    const [town, setTown] = useState(initialData?.town || '');
    const [trAdi, setTrAdi] = useState(initialData?.trAdi || '');
    const [projectCount, setProjectCount] = useState(initialData?.projectCount || 1);
    const [isGecici, setIsGecici] = useState(initialData?.Gecici_tutanak_teslim_alma_durumu || false);
    const [isKesin, setIsKesin] = useState(initialData?.Kesin_tutanak_teslim_alma_durumu || false);

    const handleSubmit = () => {
        if (!city || !region || !year) {
            alert('Lütfen zorunlu alanları (Şehir, Bölge, Yıl) doldurun.');
            return;
        }

        const dataToSend = {
            id: initialData.id,
            year: Number(year),
            city: city,
            town: town,
            region: region,
            tesisType: initialData?.tesisType || 0,
            trAdi: trAdi,
            projectCount: Number(projectCount),
            Gecici_tutanak_teslim_alma_durumu: isGecici,
            Kesin_tutanak_teslim_alma_durumu: isKesin,
        };

        onSave(dataToSend, !!initialData.id);
    };

    return (
        <Stack spacing={2} mt={1}>
            <Grid container spacing={2}>
                <Grid item xs={6}>
                    <TextField label="Yıl" fullWidth size="small" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} required />
                </Grid>
                <Grid item xs={6}>
                    <TextField label="Proje Sayısı" fullWidth size="small" type="number" value={projectCount} onChange={(e) => setProjectCount(Number(e.target.value))} />
                </Grid>
                <Grid item xs={6}>
                    <TextField label="Şehir (Gerekli)" fullWidth size="small" value={city} onChange={(e) => setCity(e.target.value)} required />
                </Grid>
                <Grid item xs={6}>
                    <TextField label="Bölge (Gerekli)" fullWidth size="small" value={region} onChange={(e) => setRegion(e.target.value)} required />
                </Grid>
                <Grid item xs={6}>
                    <TextField label="İlçe (Town)" fullWidth size="small" value={town} onChange={(e) => setTown(e.target.value)} />
                </Grid>
                <Grid item xs={6}>
                    <TextField label="TR Adı" fullWidth size="small" value={trAdi} onChange={(e) => setTrAdi(e.target.value)} />
                </Grid>
                <Grid item xs={6}>
                    <FormControlLabel control={<Checkbox checked={isGecici} onChange={(e) => setIsGecici(e.target.checked)} color="primary" />} label="Geçici Tutanak Teslim Alındı" />
                </Grid>
                <Grid item xs={6}>
                    <FormControlLabel control={<Checkbox checked={isKesin} onChange={(e) => setIsKesin(e.target.checked)} color="primary" />} label="Kesin Tutanak Teslim Alındı" />
                </Grid>
            </Grid>

            <Stack direction="row" spacing={2} justifyContent="flex-end" pt={2}>
                <Button onClick={onCancel} color="secondary" disabled={isLoading}>İptal</Button>
                <Button onClick={handleSubmit} variant="contained" color="primary" disabled={isLoading}>
                    {isLoading ? <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> : (initialData.id ? 'Güncelle' : 'Kaydet')}
                </Button>
            </Stack>
        </Stack>
    );
};