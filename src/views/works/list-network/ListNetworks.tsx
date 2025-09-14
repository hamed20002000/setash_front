// src/views/networks/ListNetwork.tsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    Typography, Chip, Box, Stack, Grid, Button, Alert,
    TablePagination, TextField, InputAdornment, CircularProgress,
    ToggleButtonGroup, ToggleButton as MuiToggleButton,
    Menu, MenuItem, IconButton, ListItemIcon,
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
    FormControl, Select,
} from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import { IconSearch, IconDots, IconEdit, IconTrash, IconPlus, IconArrowRight, IconFileDownload, IconX } from '@tabler/icons-react';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import axios from 'axios';
import server from '../../../assets/address.json';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import DeleteNetwork from './DeleteNetwork';

import { tr } from 'date-fns/locale';
import { format } from 'date-fns';

import { useAuth } from 'src/context/AuthContext';
import { SelectChangeEvent } from '@mui/material/Select';


import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Logo from 'src/assets/images/logos/logo.png';
import BlankCard from 'src/components/shared/BlankCard';

const formatDateDisplay = (dateString: string | null): string => {
    if (!dateString) return "N/A";
    try {
        const date = new Date(dateString);
        return format(date, 'dd MMMM yyyy', { locale: tr });
    } catch (e) {
        console.log("Tarih biçimlendirilirken hata oluştu:", e);
        return "Geçersiz Tarih";
    }
};


const blinkAnimation = keyframes`
    0% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
    50% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(103, 58, 183, 0.7); }
    100% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
`;
const BlinkingButton = styled(Button)<{ isBlinking: boolean }>(({ isBlinking }) => ({
    animation: isBlinking ? `${blinkAnimation} 1.5s infinite` : 'none',
    transition: 'transform 0.3s ease-in-out',
}));

interface NetworkType {
    id: string;
    title: string;
    description: string;
    createAt: string;
    status: string;
    recordStatus?: number;
    work?: {
        id: number;
        title: string;
    };
}

interface WorkType {
    id: number;
    title: string;
}

interface ApiResponse<T> {
    data: T;
    httpStatusCode: number;
    message: string;
}

const StyledToggleButton = styled(MuiToggleButton)(({ theme, value, selected }) => ({
    '&.Mui-selected': {
        color: 'white',
        ...(value === 'all' && selected && {
            backgroundColor: theme.palette.primary.main,
            '&:hover': { backgroundColor: theme.palette.primary.dark },
        }),
        ...(value === 'active' && selected && {
            backgroundColor: theme.palette.success.main,
            '&:hover': { backgroundColor: theme.palette.success.dark },
        }),
        ...(value === 'inactive' && selected && {
            backgroundColor: theme.palette.error.main,
            '&:hover': { backgroundColor: theme.palette.error.dark },
        }),
    },
    '&:not(.Mui-selected)': {
        color: theme.palette.text.primary,
        borderColor: theme.palette.divider,
        '&:hover': { backgroundColor: theme.palette.action.hover },
    },
}));

const ListNetwork = () => {
    const { workId } = useParams<{ workId: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const tenderId = searchParams.get('tenderId');
    const [newNetworkData, setNewNetworkData] = useState({
        title: '',
        description: '',
        workId: workId ? parseInt(workId) : 0,
    });

    // 👇 State های جدید برای مدیریت حالت دوم
    const [selectedWorkIdForForm, setSelectedWorkIdForForm] = useState<number | null>(null);
    const [works, setWorks] = useState<WorkType[]>([]);
    const [allNetworks, setAllNetworks] = useState<NetworkType[]>([]);

    // 👇 State های فیلتر
    const [filterWorkId, setFilterWorkId] = useState<number | null>(null);

    const [workTitleForDisplay, setWorkTitleForDisplay] = useState('');
    const [tenderTitleForDisplay, setTenderTitleForDisplay] = useState('');

    // 👇 این State برای نمایش در جدول استفاده می‌شود
    const [networks, setNetworks] = useState<NetworkType[]>([]);

    const [loadingData, setLoadingData] = useState(true);
    const [loadingButton, setLoadingButton] = useState(false);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const { isTooltipGloballyEnabled } = useTooltip();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<NetworkType | null>(null);
    const openMenu = Boolean(anchorEl);
    const [editingId, setEditingId] = useState<string | null>(null);
    // const [originalTitle, setOriginalTitle] = useState<string>('');
    const [titleError, setTitleError] = useState<boolean>(false);
    const [descriptionError, setDescriptionError] = useState<boolean>(false);
    const [formErrors, setFormErrors] = useState<string | null>(null);
    const networkTitleInputRef = useRef<HTMLInputElement>(null);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [networkIdToDelete, setNetworkIdToDelete] = useState<string | null>(null);
    const [networkTitleToDelete, setNetworkTitleToDelete] = useState<string>('');
    const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
    const [fullDescriptionContent, setFullDescriptionContent] = useState<string>('');


    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isBlinking, setIsBlinking] = useState(true);


    const { allowedOperations } = useAuth();
    const hasCreatePermission = useMemo(() => {
        return allowedOperations.some(op => op.systemOperationName === 'Eklemek');
    }, [allowedOperations]);

    const hasEditPermission = useMemo(() => {
        return allowedOperations.some(op => op.systemOperationName === 'Düzenlemek');
    }, [allowedOperations]);

    const hasDeletePermission = useMemo(() => {
        return allowedOperations.some(op => op.systemOperationName === 'Silmek');
    }, [allowedOperations]);


    const hasDownloadPermission = useMemo(() => {
        return allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak');
    }, [allowedOperations]);

    // 👇 از useEffect برای اعمال فیلتر استفاده کنید
    useEffect(() => {
        let filtered = allNetworks;

        // فیلتر بر اساس Work ID (در حالت دوم)
        if (filterWorkId) {
            filtered = filtered.filter(network => network.work && network.work.id === filterWorkId);
        }

        // فیلتر بر اساس جستجو و وضعیت
        filtered = filtered.filter(network => {
            const matchesSearch = network.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (network.work && network.work.title && network.work.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (network.description && network.description.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active' && network.recordStatus === 0) ||
                (statusFilter === 'inactive' && network.recordStatus === 1);

            return matchesSearch && matchesStatus;
        });

        setNetworks(filtered);
    }, [allNetworks, filterWorkId, searchTerm, statusFilter]);

    useEffect(() => {
        if (workId) {
            const parsedWorkId = parseInt(workId);
            setSelectedWorkIdForForm(parsedWorkId);
            fetchWorkDetails(parsedWorkId);
            fetchNetworksByWorkId(parsedWorkId);
        } else {
            fetchAllNetworksAndWorks();
        }
        if (tenderId) {
            fetchTenderDetails(parseInt(tenderId));
        }
    }, [workId, tenderId]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsBlinking(false);
        }, 5000);
        return () => {
            clearTimeout(timer);
        };
    }, []);

    const showAlert = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
        setTimeout(() => {
            setAlertMessage(null);
        }, 5000);
    };

    const fetchWorkDetails = async (id: number) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            navigate("/");
            return;
        }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + `get-work-by-id/${id}`, {
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${authToken}`
                }
            });
            if (response.data.httpStatusCode === 200) {
                setWorkTitleForDisplay(response.data.data.title);
            } else {
                showAlert(response.data.message || 'Work detayları alınırken hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Work detayları yüklenirken bir hata oluştu.', 'error');
        }
    };

    const fetchAllNetworksAndWorks = async () => {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            setLoadingData(false);
            return;
        }
        try {
            const [networksResponse, worksResponse] = await Promise.all([
                axios.get<ApiResponse<NetworkType[]>>(server.baseurl + server.initialoperations + `get-networks`, {
                    headers: { "Authorization": `Bearer ${authToken}` }
                }),
                axios.get<ApiResponse<WorkType[]>>(server.baseurl + server.initialoperations + `get-works`, {
                    headers: { "Authorization": `Bearer ${authToken}` }
                })
            ]);

            if (networksResponse.data.httpStatusCode === 200 && worksResponse.data.httpStatusCode === 200) {
                const allNetworksData = networksResponse.data.data;
                const worksData = worksResponse.data.data;

                const formattedNetworks = allNetworksData.map((item: any) => ({
                    id: item.id,
                    title: item.title,
                    description: item.description,
                    createAt: item.createAt,
                    // تعیین مقدار status بر اساس recordStatus
                    status: item.recordStatus === 0 ? 'Aktif' : item.recordStatus === 1 ? 'Pasif' : 'Silindi',
                    recordStatus: item.recordStatus,
                    work: item.work
                }));

                setAllNetworks(formattedNetworks);
                setNetworks(formattedNetworks); // نمایش همه شبکه‌ها در ابتدا
                setWorks(worksData);

            } else {
                showAlert('Veri yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Veri yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    };

    const fetchTenderDetails = async (id: number) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            navigate("/");
            return;
        }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + `get-tender-by-id/${id}`, {
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${authToken}`
                }
            });
            if (response.data.httpStatusCode === 200) {
                setTenderTitleForDisplay(response.data.data.title);
            } else {
                showAlert(response.data.message || 'İhale detayları alınırken hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'İhale detayları yüklenirken bir hata oluştu.', 'error');
        }
    };

    const fetchNetworksByWorkId = async (id: number) => {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            navigate("/");
            setLoadingData(false);
            return;
        }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + `get-networks`, {
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${authToken}`
                }
            });
            if (response.data.httpStatusCode === 200) {
                const rawData = response.data.data;
                const filteredData = rawData.filter((item: any) => item.work && parseInt(item.work.id) === id);
                const formattedData: NetworkType[] = filteredData.map((item: any) => ({
                    id: item.id,
                    title: item.title,
                    description: item.description,
                    createAt: item.createAt,
                    status: item.recordStatus === 0 ? 'Aktif' : item.recordStatus === 1 ? 'Pasif' : 'Silindi',
                    recordStatus: item.recordStatus,
                    work: item.work
                }));
                setNetworks(formattedData);
            } else {
                showAlert(response.data.message || 'Şebeke listesi alınırken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                showAlert(e.response?.data?.message || 'Şebeke listesi yüklenirken bir hata oluştu.', 'error');
            }
        } finally {
            setLoadingData(false);
        }
    };

    const handleNetworkNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewNetworkData(prev => ({
            ...prev,
            title: e.target.value
        }));
        if (titleError && e.target.value.trim()) {
            setTitleError(false);
            setFormErrors(null);
        }
    };

    const handleDescriptionChange = (value: string) => {
        setNewNetworkData(prev => ({
            ...prev,
            description: value
        }));
        if (descriptionError && value.trim() && value !== '<p><br></p>') {
            setDescriptionError(false);
            setFormErrors(null);
        }
    };

    const validateForm = (): boolean => {
        let isValid = true;
        setFormErrors(null);
        if (!newNetworkData.title.trim()) {
            setTitleError(true);
            setFormErrors("Şebeke adı boş olamaz!");
            isValid = false;
        } else {
            setTitleError(false);
        }

        if (!workId && selectedWorkIdForForm === null) {
            setFormErrors("Lütfen bir iş seçin!");
            isValid = false;
        }

        if (!isValid) {
            showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning');
        }
        return isValid;
    };

    const resetFormAndState = () => {
        setNewNetworkData({
            title: '',
            description: '',
            workId: workId ? parseInt(workId) : (selectedWorkIdForForm ? selectedWorkIdForForm : 0),
        });
        setSelectedWorkIdForForm(null);
        setEditingId(null);
        // setOriginalTitle('');
        setTitleError(false);
        setDescriptionError(false);
        setFormErrors(null);
        setIsFormVisible(false);
    };

    const insertNetwork = async () => {
        if (!validateForm() || (workId === undefined && selectedWorkIdForForm === null)) {
            return;
        }
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            navigate("/");
            setLoadingButton(false);
            return;
        }
        try {
            const payload = {
                title: newNetworkData.title,
                description: newNetworkData.description,
                workId: workId ? Number(workId) : Number(selectedWorkIdForForm),
            };
            const response = await axios.post(
                server.baseurl + server.initialoperations + "create-network",
                payload,
                {
                    headers: {
                        "Accept": "application/json",
                        'Content-Type': 'application/json',
                        "Authorization": `Bearer ${authToken}`
                    }
                }
            );

            if (response.data.httpStatusCode === 201) {
                showAlert('Yeni Şebeke başarıyla eklendi!', 'success');
                resetFormAndState();
                if (workId) {
                    fetchNetworksByWorkId(parseInt(workId));
                } else {
                    fetchAllNetworksAndWorks();
                }
            } else {
                showAlert(response.data.message || 'Yeni Şebeke eklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                showAlert(e.response?.data?.message || 'Şebeke eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
            }
        } finally {
            setLoadingButton(false);
        }
    };

    const editNetwork = async () => {
        if (editingId === null) return;
        if (!validateForm() || (workId === undefined && selectedWorkIdForForm === null)) {
            return;
        }
        // if (newNetworkData.title === originalTitle) {
        //     showAlert('Şebeke bilgilerinde herhangi bir değişiklik yapmadınız.', 'info');
        //     resetFormAndState();
        //     return;
        // }
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            navigate("/");
            setLoadingButton(false);
            return;
        } debugger
        try {
            const payload = {
                id: Number(editingId),
                title: newNetworkData.title,
                description: newNetworkData.description,
                workId: workId ? Number(workId) : Number(selectedWorkIdForForm),
            };
            const response = await axios.put(
                server.baseurl + server.initialoperations + "update-network",
                payload,
                {
                    headers: {
                        "Accept": "application/json",
                        'Content-Type': 'application/json',
                        "Authorization": `Bearer ${authToken}`
                    }
                }
            );
            if (response.data.httpStatusCode === 200) {
                showAlert('Şebeke başarıyla güncellendi!', 'success');
                resetFormAndState();
                if (workId) {
                    fetchNetworksByWorkId(parseInt(workId));
                } else {
                    fetchAllNetworksAndWorks();
                }
            } else {
                showAlert(response.data.message || 'Şebeke güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            }
            else if (e.response?.status === 500) {
                showAlert('Bu Şebeke düzenlenemez, çünkü kullanılmıştır.', 'error');
            } else {
                showAlert(e.response?.data?.message || 'Şebeke güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
            }
        } finally {
            setLoadingButton(false);
        }
    };

    // 👇 تابع جدید برای مدیریت فیلتر با ComboBox (بدون تأثیر بر State فرم ثبت)
    const handleWorkFilterChange = (event: SelectChangeEvent<number>) => {
        const newWorkId = event.target.value as number;
        setFilterWorkId(newWorkId || null);
        setPage(0); // بازنشانی صفحه‌بندی
    };

    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: NetworkType) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowForMenu(row);
    };
    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };

    const sendRecordStatusUpdate = async (id: string, statusValue: number) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            navigate("/");
            return;
        }
        try {
            const response = await axios.put(
                server.baseurl + server.initialoperations + "update-network",
                { id: Number(id), recordStatus: statusValue },
                {
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            if (response.data.httpStatusCode === 200) {
                const statusText = statusValue === 0 ? 'Aktif' : statusValue === 1 ? 'Pasif' : 'Silindi';
                showAlert(`Şebeke başarıyla ${statusText} olarak ayarlandı!`, 'success');
                if (workId) {
                    fetchNetworksByWorkId(parseInt(workId));
                } else {
                    fetchAllNetworksAndWorks();
                }
            } else {
                showAlert(response.data.message || 'Durum güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                showAlert(e.response?.data?.message || 'Durum güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
            }
        } finally {
            handleCloseMenu();
        }
    };

    const handleSetActive = () => {
        if (selectedRowForMenu) {
            sendRecordStatusUpdate(selectedRowForMenu.id, 0);
        }
    };
    const handleSetInactive = () => {
        if (selectedRowForMenu) {
            sendRecordStatusUpdate(selectedRowForMenu.id, 1);
        }
    };
    const handleEditClick = () => {
        if (selectedRowForMenu) {
            // 👇 این خط را اضافه کنید
            setSelectedWorkIdForForm(selectedRowForMenu.work?.id || null);

            setNewNetworkData({
                title: selectedRowForMenu.title,
                description: selectedRowForMenu.description,
                // از selectedRowForMenu.work?.id استفاده کنید
                workId: selectedRowForMenu.work?.id || 0,
            });
            setEditingId(selectedRowForMenu.id);
            // setOriginalTitle(selectedRowForMenu.title);
            setTitleError(false);
            setDescriptionError(false);
            setFormErrors(null);
            setIsFormVisible(true);
            handleCloseMenu();
            setTimeout(() => {
                networkTitleInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                networkTitleInputRef.current?.focus();
            }, 100);
        }
    };
    const handleClickOpenDeleteModal = () => {
        if (selectedRowForMenu) {
            setNetworkIdToDelete(selectedRowForMenu.id);
            setNetworkTitleToDelete(selectedRowForMenu.title);
            setOpenDeleteModal(true);
        }
        handleCloseMenu();
    };
    const handleClickCloseDeleteModal = () => {
        setOpenDeleteModal(false);
        setNetworkIdToDelete(null);
        setNetworkTitleToDelete('');
        if (workId) {
            fetchNetworksByWorkId(parseInt(workId));
        } else {
            fetchAllNetworksAndWorks();
        }
    };
    const handleViewNetworkDetails = (networkId: string) => {
        navigate(`/network/${networkId}/details`);
    };
    const handleOpenDescriptionModal = (descriptionContent: string) => {
        setFullDescriptionContent(descriptionContent);
        setOpenDescriptionModal(true);
    };
    const handleCloseDescriptionModal = () => {
        setOpenDescriptionModal(false);
        setFullDescriptionContent('');
    };
    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
        setPage(0);
    };
    const handleChangePage = (
        event: unknown,
        newPage: number) => {
        setPage(newPage);
        console.log(event);
    };
    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };
    const handleStatusFilterChange = (
        event: React.MouseEvent<HTMLElement>,
        newFilter: 'all' | 'active' | 'inactive' | null,
    ) => {
        console.log(event);
        if (newFilter !== null) {
            setStatusFilter(newFilter);
            setPage(0);
        }
    };
    const handleDefineTransmission = () => {
        if (selectedRowForMenu) {
            const networkId = selectedRowForMenu.id;
            const currentWorkId = workId || selectedRowForMenu.work?.id;
            const currentTenderId = tenderId || '';
            if (currentWorkId) {
                navigate(`/transmission/list-transmission/${networkId}?workId=${currentWorkId}&tenderId=${currentTenderId}`);
            } else {
                showAlert('Bu şebeke için tanımlı bir iş bulunamadı.', 'warning');
            }
        }
        handleCloseMenu();
    };
    const stripHtmlTags = (html: string): string => {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    };
    const handleDownloadNetworksPDF = () => {
        if (!filteredNetworks || filteredNetworks.length === 0) {
            showAlert('PDF oluşturulacak şebeke bulunamadı.', 'warning');
            return;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // 💡 فونت را اضافه کنید
        doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.setFont('NotoSans');

        const header = () => {
            doc.addImage(Logo, 'PNG', 10, 10, 40, 25);
            doc.setFontSize(18);
            doc.text('Şebekeler Raporu', pageWidth - 15, 30, { align: 'right' });
            doc.setFontSize(12);
            doc.text(`Tarih: ${formatDateDisplay(new Date().toISOString())}`, pageWidth - 15, 40, { align: 'right' });
            if (workId) {
                doc.text(`İş: ${workTitleForDisplay}`, pageWidth - 15, 47, { align: 'right' });
            }
        };

        const footer = () => {
            doc.setFontSize(10);
            doc.setTextColor(0);
            doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
            doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
            const docAny = doc as any;
            const pageCount = docAny.internal.getNumberOfPages();
            doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
        };

        // آماده کردن داده‌ها برای جدول PDF
        const head = ['Şebeke Adı', 'Açıklama', 'Kayıt Tarihi', 'Durum'];
        const rows = filteredNetworks.map(network => [
            network.title,
            stripHtmlTags(network.description),
            formatDateDisplay(network.createAt),
            network.status
        ]);

        // اگر workId در URL نبود، ستون "Bağlı İş" را به PDF اضافه کنید
        if (workId === undefined) {
            head.splice(1, 0, 'Bağlı İş'); // اضافه کردن ستون "Bağlı İş" در جایگاه مناسب
            rows.forEach((row, index) => {
                const workTitle = filteredNetworks[index].work?.title || 'Bilinmiyor';
                row.splice(1, 0, workTitle);
            });
        }

        try {
            autoTable(doc, {
                startY: 50,
                head: [head],
                body: rows,
                theme: 'grid',
                styles: {
                    font: 'NotoSans',
                    fontStyle: 'normal',
                    fontSize: 8,
                    cellPadding: 2,
                    overflow: 'linebreak'
                },
                headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
                didDrawPage: () => {
                    header();
                    footer();
                },
                showHead: 'everyPage',
                margin: { top: 50, bottom: 20 }
            });

            doc.save('Şebekeler_Raporu.pdf');
            showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (error: any) {
            console.error('PDF oluşturulurken hata:', error);
            showAlert('PDF oluşturulurken bir hata oluştu: ' + error.message, 'error');
        }
    };

    const filteredNetworks = networks.filter(network => {
        const matchesSearch = network.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (network.work && network.work.title && network.work.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (network.description && network.description.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'active' && network.recordStatus === 0) ||
            (statusFilter === 'inactive' && network.recordStatus === 1);

        // این قسمت با State های جدید ترکیب می شود
        const matchesWorkFilter = filterWorkId === null || (network.work && network.work.id === filterWorkId);

        return matchesSearch && matchesStatus && matchesWorkFilter;
    });

    const paginatedNetworks = filteredNetworks.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    if (loadingData) {
        return (
            <Stack sx={{ width: '100%', height: '300px', justifyContent: 'center', alignItems: 'center' }}>
                <CircularProgress />
                <Typography variant="h6" color="textSecondary" sx={{ mt: 2 }}>Şebeke yükleniyor...</Typography>
            </Stack>
        );
    }
    return (
        <div>
            {workId && (
                <Box display="flex" justifyContent="space-between" alignItems="center" mt={2} mb={2}>

                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        {tenderId && (
                            <Chip
                                label={`İhale: ${tenderTitleForDisplay}`}
                                color="primary"
                                variant="filled"
                                size="small"
                            />
                        )}
                        {workTitleForDisplay && (
                            <Chip
                                label={`içindeki İş: ${workTitleForDisplay}`}
                                color="success"
                                variant="filled"
                                size="small"
                            />
                        )}
                    </Stack>

                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        alignItems="stretch"
                        flexGrow={1}
                        justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                    >
                        {!isFormVisible && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Şebeke Belgesi kaydetmek için tıklayınız" : ""}>
                                <BlinkingButton
                                    variant="contained"
                                    color="primary"
                                    onClick={() => setIsFormVisible(true)}
                                    fullWidth={false}
                                    isBlinking={isBlinking}
                                >
                                    Yeni Şebeke Kaydet
                                </BlinkingButton>
                            </CustomTooltip>
                        )}
                        {isFormVisible && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
                                <Button
                                    variant="contained"
                                    color="error"
                                    onClick={resetFormAndState}
                                    // disabled={loadingButton}
                                    fullWidth={false}
                                    startIcon={<IconX size={20} />}
                                >
                                    Gizle
                                </Button>
                            </CustomTooltip>
                        )}
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Geri dön" : ""}>
                            <Button variant="outlined" color="error" onClick={() => navigate(-1)}
                                endIcon={<IconArrowRight size={20} />}>
                                Geri Dön
                            </Button>
                        </CustomTooltip>

                    </Stack>
                </Box>
            )}

            {!workId && (
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} mb={4} mt={2}>
                    <Typography variant="h5" mb={2}>{editingId ? 'Şebeke Düzenle' : 'Şebeke Kaydı'}</Typography>
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        alignItems="stretch"
                        flexGrow={1}
                        justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                    >
                        {!isFormVisible && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Şebeke Belgesi kaydetmek için tıklayınız" : ""}>
                                <BlinkingButton
                                    variant="contained"
                                    color="primary"
                                    onClick={() => setIsFormVisible(true)}
                                    fullWidth={false}
                                    isBlinking={isBlinking}
                                >
                                    Yeni Şebeke Kaydet
                                </BlinkingButton>
                            </CustomTooltip>
                        )}
                        {isFormVisible && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
                                <Button
                                    variant="contained"
                                    color="error"
                                    onClick={resetFormAndState}
                                    // disabled={loadingButton}
                                    fullWidth={false}
                                    startIcon={<IconX size={20} />}
                                >
                                    Gizle
                                </Button>
                            </CustomTooltip>
                        )}

                    </Stack>
                </Stack>
            )}

            {workId && (
                <Typography variant="h5" mb={2}>{editingId ? 'Şebeke Düzenle' : 'Şebeke Kaydı'}</Typography>
            )}
            {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
                <Box component="div" sx={{
                    p: 2, border: "1px solid", borderColor: "divider",
                    borderRadius: "8px", mb: 2
                }}>
                    <form>
                        <Grid container spacing={2}>
                            {workId === undefined && (
                                <Grid item xs={12} sm={6}>
                                    <CustomFormLabel htmlFor="work-select" required>İş Seçin:</CustomFormLabel>
                                    <FormControl fullWidth size="small">
                                        <Select
                                            id="work-select"
                                            value={selectedWorkIdForForm || ''}
                                            onChange={(e) => setSelectedWorkIdForForm(e.target.value as number)} // 👈 استفاده از تابع جدید
                                            displayEmpty
                                        >
                                            {works.map((work) => (
                                                <MenuItem key={work.id} value={work.id}>
                                                    {work.title}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            )}

                            <Grid item xs={12} sm={workId === undefined ? 6 : 12}>
                                <CustomFormLabel htmlFor="network-name" required>Şebeke Adı:</CustomFormLabel>
                                <CustomTextField
                                    id="network-name"
                                    name="title"
                                    placeholder="Şebeke Adı"
                                    fullWidth
                                    value={newNetworkData.title}
                                    onChange={handleNetworkNameChange}
                                    required
                                    size="small"
                                    sx={{ mb: 1 }}
                                    inputRef={networkTitleInputRef}
                                    error={titleError}
                                    helperText={titleError ? "Şebeke adı boş olamaz!" : ""}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <CustomFormLabel htmlFor="network-description">Açıklama:</CustomFormLabel>
                                <ReactQuill
                                    theme="snow"
                                    value={newNetworkData.description}
                                    onChange={handleDescriptionChange}
                                    style={{
                                        height: '150px',
                                        marginBottom: '20px',
                                        border: descriptionError ? '1px solid red' : undefined
                                    }}
                                />
                                {descriptionError && (
                                    <Typography color="error" variant="caption" sx={{ mt: -2, display: 'block' }}>
                                        Açıklama boş olamaz!
                                    </Typography>
                                )}
                            </Grid>
                            <Grid item xs={12} sx={{ mt: { xs: 5, sm: 2 } }}>
                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                    <input type="hidden" name="workId" value={newNetworkData.workId} />
                                    {editingId ? (
                                        <>
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Şebeke güncelle" : ""}>
                                                <Button
                                                    variant="contained"
                                                    color="info"
                                                    onClick={editNetwork}
                                                    disabled={loadingButton}
                                                >
                                                    {loadingButton ? <CircularProgress size={24} color="inherit" /> : 'Şebeke Güncelle'}
                                                </Button>
                                            </CustomTooltip>
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Düzenlemeyi iptal et ve yeni kayıt moduna dön" : ""}>
                                                <Button
                                                    variant="outlined"
                                                    color="secondary"
                                                    onClick={resetFormAndState}
                                                    disabled={loadingButton}
                                                    sx={{ ml: 2 }}
                                                >
                                                    İptal Et
                                                </Button>
                                            </CustomTooltip>
                                        </>
                                    ) : (

                                        <>
                                            {hasCreatePermission && (
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Şebeke kaydet" : ""}>
                                                    <Button
                                                        variant="contained"
                                                        color="primary"
                                                        onClick={insertNetwork}
                                                        disabled={loadingButton || (workId === undefined && selectedWorkIdForForm === null)} // 👈 استفاده از State جدید
                                                    >
                                                        {loadingButton ? <CircularProgress size={24} color="inherit" /> : 'Şebeke Ekle'}
                                                    </Button>
                                                </CustomTooltip>

                                            )}
                                        </>
                                    )}
                                </Stack>
                            </Grid>
                        </Grid>
                    </form>
                    {alertMessage && (
                        <Stack sx={{ width: '100%', mt: 2 }} spacing={2}>
                            <Alert severity={alertSeverity}>{alertMessage}</Alert>
                        </Stack>
                    )}
                    {formErrors && (
                        <Stack sx={{ width: '100%', mt: 2 }} spacing={2}>
                            <Alert severity="error">{formErrors}</Alert>
                        </Stack>
                    )}
                </Box>
            )}

            <BlankCard>

                <Grid item xs={12} mt={2} mr={2}>
                    <Stack direction="row" spacing={2} justifyContent="flex-end">
                        {hasDownloadPermission && (
                            <Grid item xs={12} md={3} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleDownloadNetworksPDF}
                                    fullWidth
                                    startIcon={<IconFileDownload size={20} />}
                                >
                                    Tümünü İndir (PDF)
                                </Button>
                            </Grid>
                        )}

                    </Stack>
                </Grid>
                <Box sx={{ p: 2 }}>
                    <CustomFormLabel htmlFor="work-filter">İş Filtrele:</CustomFormLabel>
                    <Grid container spacing={2} alignItems="center" mb={2}>
                        {workId === undefined && (
                            <Grid item xs={12} md={3}>
                                <FormControl fullWidth size="small">
                                    <Select
                                        id="work-filter"
                                        value={filterWorkId || ''} // 👈 استفاده از State جدید فیلتر
                                        onChange={handleWorkFilterChange} // 👈 استفاده از تابع جدید
                                        displayEmpty
                                    >
                                        <MenuItem value="">
                                            Tümü
                                        </MenuItem>
                                        {works.map((work) => (
                                            <MenuItem key={work.id} value={work.id}>
                                                {work.title}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        )}
                        <Grid item xs={12} md={workId === undefined ? 6 : 12}>
                            <TextField
                                label="Şebeke Ara"
                                variant="outlined"
                                fullWidth
                                value={searchTerm}
                                onChange={handleSearchChange}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <IconSearch size={20} />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={workId === undefined ? 3 : 12}>
                            <ToggleButtonGroup
                                value={statusFilter}
                                exclusive
                                onChange={handleStatusFilterChange}
                                aria-label="Durum filtresi"
                                fullWidth
                            >
                                <StyledToggleButton value="all" aria-label="Tüm Şebeke">
                                    Tümü
                                </StyledToggleButton>
                                <StyledToggleButton value="active" aria-label="Aktif Şebeke">
                                    Aktif
                                </StyledToggleButton>
                                <StyledToggleButton value="inactive" aria-label="Pasif Şebeke">
                                    Pasif
                                </StyledToggleButton>
                            </ToggleButtonGroup>
                        </Grid>
                    </Grid>

                    <TableContainer>
                        <Table aria-label="Şebeke tablosu">
                            <TableHead style={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>
                                    <TableCell><Typography variant="h6">Şebeke Adı</Typography></TableCell>
                                    {workId === undefined && (
                                        <TableCell><Typography variant="h6">Bağlı İş</Typography></TableCell>
                                    )}
                                    <TableCell><Typography variant="h6">Açıklama</Typography></TableCell>
                                    <TableCell><Typography variant="h6">Kayıt Tarihi</Typography></TableCell>
                                    <TableCell><Typography variant="h6">Durum</Typography></TableCell>
                                    <TableCell><Typography variant="h6">Detaylar</Typography></TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedNetworks.length > 0 ? (
                                    paginatedNetworks.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell><Typography variant="h6">{row.title}</Typography></TableCell>
                                            {workId === undefined && (
                                                <TableCell><Typography variant="h6">{row.work?.title}</Typography></TableCell>
                                            )}
                                            <TableCell sx={{ maxWidth: 200, verticalAlign: 'top' }}>
                                                <Box sx={{
                                                    maxHeight: '5em',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 3,
                                                    WebkitBoxOrient: 'vertical',
                                                }}>
                                                    <div dangerouslySetInnerHTML={{ __html: row.description }} />
                                                </Box>
                                                {row.description && row.description.length > 50 && (
                                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm açıklamayı gör" : ""}>
                                                        <Button variant="text" size="small" onClick={() => {
                                                            handleOpenDescriptionModal(row.description)
                                                        }}>
                                                            Devamını Oku
                                                        </Button>
                                                    </CustomTooltip>
                                                )}
                                            </TableCell>
                                            <TableCell><Typography variant="h6">{formatDateDisplay(row.createAt)}</Typography></TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={row.status}
                                                    sx={{
                                                        backgroundColor:
                                                            row.recordStatus === 2
                                                                ? (theme) => theme.palette.warning.light
                                                                : row.recordStatus === 1
                                                                    ? (theme) => theme.palette.error.light
                                                                    : (theme) => theme.palette.success.light,
                                                        color:
                                                            row.recordStatus === 2
                                                                ? (theme) => theme.palette.warning.main
                                                                : row.recordStatus === 1
                                                                    ? (theme) => theme.palette.error.main
                                                                    : (theme) => theme.palette.success.main,
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Şebeke detaylarını görüntüle" : ""}>
                                                    <Button
                                                        variant="outlined"
                                                        size="small"
                                                        onClick={() => handleViewNetworkDetails(row.id)}
                                                        startIcon={<IconSearch size={18} />}
                                                    >
                                                        Detayları Görüntüle
                                                    </Button>
                                                </CustomTooltip>
                                            </TableCell>
                                            <TableCell>
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Daha fazla seçenek" : ""}>
                                                    <IconButton
                                                        id={`basic-button-${row.id}`}
                                                        aria-controls={openMenu ? 'basic-menu' : undefined}
                                                        aria-haspopup="true"
                                                        aria-expanded={openMenu ? 'true' : undefined}
                                                        onClick={(event) => handleClickMenu(event, row)}
                                                    >
                                                        <IconDots width={18} />
                                                    </IconButton>
                                                </CustomTooltip>
                                                <Menu
                                                    id="basic-menu"
                                                    anchorEl={anchorEl}
                                                    open={openMenu}
                                                    onClose={handleCloseMenu}
                                                    MenuListProps={{
                                                        'aria-labelledby': `basic-button-${selectedRowForMenu?.id}`,
                                                    }}
                                                >
                                                    {hasEditPermission && selectedRowForMenu?.recordStatus === 0 ? (
                                                        <>
                                                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu ağ için İletken İcmali" : ""}>
                                                                <MenuItem onClick={handleDefineTransmission}>
                                                                    <ListItemIcon>
                                                                        <IconPlus width={18} />
                                                                    </ListItemIcon>
                                                                    İletken İcmali
                                                                </MenuItem>
                                                            </CustomTooltip>

                                                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Şebeke pasif yap" : ""}>
                                                                <MenuItem onClick={handleSetInactive}>
                                                                    <ListItemIcon>
                                                                        <DoNotDisturbOnRoundedIcon width={18} />
                                                                    </ListItemIcon>
                                                                    Pasif Yap
                                                                </MenuItem>
                                                            </CustomTooltip>
                                                        </>
                                                    ) : (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Şebeke aktif yap" : ""}>
                                                            <MenuItem onClick={handleSetActive}>
                                                                <ListItemIcon>
                                                                    <DoneRoundedIcon width={18} />
                                                                </ListItemIcon>
                                                                Aktif Yap
                                                            </MenuItem>
                                                        </CustomTooltip>
                                                    )}

                                                    {hasEditPermission && (

                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Şebeke düzenle" : ""}>
                                                            <MenuItem onClick={handleEditClick}>
                                                                <ListItemIcon>
                                                                    <IconEdit width={18} />
                                                                </ListItemIcon>
                                                                Düzenlemek
                                                            </MenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasDeletePermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Şebeke sil" : ""}>
                                                            <MenuItem onClick={handleClickOpenDeleteModal}>
                                                                <ListItemIcon>
                                                                    <IconTrash width={18} />
                                                                </ListItemIcon>
                                                                Silmek
                                                            </MenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                </Menu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={workId === undefined ? 7 : 6} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">
                                                Bu iş için hiç Şebeke bulunamadı.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25]}
                        component="div"
                        count={filteredNetworks.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        labelRowsPerPage="Sayfa başına satır sayısı:"
                        labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
                    />
                </Box>
            </BlankCard>
            <DeleteNetwork
                openModal={openDeleteModal}
                onClose={handleClickCloseDeleteModal}
                networkIdToDelete={networkIdToDelete}
                networkTitleToDelete={networkTitleToDelete}
                showAlert={showAlert}
                onDeleteSuccess={() => {
                    if (workId) {
                        fetchNetworksByWorkId(parseInt(workId));
                    } else {
                        fetchAllNetworksAndWorks();
                    }
                }}
            />
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
        </div>
    );
};

export default ListNetwork;