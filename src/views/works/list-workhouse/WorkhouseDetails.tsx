

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Typography, Box, Stack, Grid, Button, Alert, TextField,
    CircularProgress, Paper, Chip, IconButton,
    TableContainer, Table, TableHead, TableRow, TableBody, Menu, ListItemIcon,
    TablePagination,
    TableCell as MuiTableCell,
    MenuItem as MuiMenuItem,
    Dialog,
    DialogTitle,
    DialogActions,
    DialogContent,
} from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import BoltIcon from '@mui/icons-material/Bolt';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import {
    IconPlus, IconTrash, IconEdit,
    IconArrowRight, IconDots,
    IconLink,
    IconDownload,
    IconX
} from '@tabler/icons-react';
import axios from 'axios';
import server from '../../../assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import DeleteWorkhouseDetail from './DeleteWorkhouseDetail';
import SubscriptionModal from './SubscriptionModal';

import { tr } from 'date-fns/locale';
import { format } from 'date-fns';


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



const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans',
    fontSize: '0.8rem',
    [theme.breakpoints.up('md')]: {
        fontSize: '1rem',
    },
}));
const blinkAnimation = keyframes`
    0% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
    50% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(103, 58, 183, 0.7); }
    100% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
`;
const BlinkingButton = styled(Button)<{ isBlinking: boolean }>(({ isBlinking }) => ({
    animation: isBlinking ? `${blinkAnimation} 1.5s infinite` : 'none',
    transition: 'transform 0.3s ease-in-out',
}));

const cleanAndFormatPrice = (priceInput: string | number | null | undefined): string => {
    if (priceInput === null || priceInput === undefined) {
        return '₺0.00';
    }
    const cleanedString = String(priceInput).replace(/[$,]/g, '');
    const numericValue = parseFloat(cleanedString);
    if (isNaN(numericValue)) {
        return '₺0.00';
    }
    const formattedPrice = numericValue.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    return formattedPrice.replace('$', '₺');
};


interface WorkhouseType {
    id: number;
    name: string;
    code: string;
    address: string;
    recordStatus: number;
    createAt: string;
    region: {
        id: number;
        name: string;
        depth: number;
        createAt: string;
        recordStatus: number;
    };
    work: {
        id: number;
        title: string;
        startDate: string;
        endDate: string;
        createAt: string;
        recordStatus: number;
    } | null;
}

interface SubscriptionItem {
    no: string;
    owner: string;
    title: string;
}

interface WorkhouseSubmittedDetail {
    id: string;
    owner: string;
    rentStartDate: string;
    rentEndDate: string;
    price: string;
    subscription: SubscriptionItem[];
    description: string;
    attachments: { fileUrl: string; }[];
    createAt: string;
}

interface Attachment {
    fileUrl: string;
}
// ==============================================================================
// Main Component: WorkhouseDetails
// ==============================================================================
const WorkhouseDetails = () => {
    const { workhouseId } = useParams<{ workhouseId: string }>();
    const navigate = useNavigate();
    const { isTooltipGloballyEnabled } = useTooltip();

    const [owner, setOwner] = useState<string>('');
    const [price, setPrice] = useState<number | ''>('');
    const [description, setDescription] = useState<string>('');
    const [attachments, setAttachments] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [rentStartDate, setRentStartDate] = useState<Date | null>(new Date());
    const [rentEndDate, setRentEndDate] = useState<Date | null>(new Date());
    const [startDateError, setStartDateError] = useState(false);
    const [endDateError, setEndDateError] = useState(false);
    const [formErrors, setFormErrors] = useState<string | null>(null);

    const [openSubscriptionModal, setOpenSubscriptionModal] = useState(false);
    const [workhouseDetail, setWorkhouseDetail] = useState<WorkhouseType | null>(null);
    const [submittedDetailsList, setSubmittedDetailsList] = useState<any[]>([]);

    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [loadingData, setLoadingData] = useState<boolean>(true);

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<any | null>(null);
    const openMenu = Boolean(anchorEl);

    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<any | null>(null);

    const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
    const [fullDescription, setFullDescription] = useState('');

    const [openAttachmentsModal, setOpenAttachmentsModal] = useState(false);
    const [currentAttachments, setCurrentAttachments] = useState<any[]>([]);

    const [ownerError, setOwnerError] = useState(false);
    const [priceError, setPriceError] = useState(false);

    const [filesToUpload, setFilesToUpload] = useState<File[]>([]);

    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isBlinking, setIsBlinking] = useState(true);

    const [isEditing, setIsEditing] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<any | null>(null);

    const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);

    // State های جدید برای صفحه بندی
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    const handleOpenDescriptionModal = (description: string) => {
        setFullDescription(description);
        setOpenDescriptionModal(true);
    };

    const handleCloseDescriptionModal = () => {
        setOpenDescriptionModal(false);
        setFullDescription('');
    };
    const handleOpenAttachmentsModal = (attachments: any[]) => {
        setCurrentAttachments(attachments);
        setOpenAttachmentsModal(true);
    };

    const handleCloseAttachmentsModal = () => {
        setOpenAttachmentsModal(false);
        setCurrentAttachments([]);
    };
    const fetchWorkhouseInfo = useCallback(async () => {
        if (!workhouseId) return;
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            return;
        }
        try {
            const response = await axios.get(
                server.baseurl + server.initialoperations + `get-workhouse-by-id/${workhouseId}`,
                {
                    headers: { "Authorization": `Bearer ${authToken}` }
                }
            );
            if (response.data.httpStatusCode === 200 && response.data.data) {
                setWorkhouseDetail(response.data.data);
            } else {
                showAlert('Genel şantiye bilgileri alınamadı.', 'error');
            }
        } catch (e: any) {
            showAlert('Genel şantiye bilgileri yüklenirken bir hata oluştu.', 'error');
        }
    }, [workhouseId, navigate]);

    const fetchWorkhouseDetails = useCallback(async () => {
        if (!workhouseId) return;
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            setLoadingData(false);
            return;
        }
        try {
            const response = await axios.get(
                server.baseurl + server.initialoperations + `get-workhouse-details-by-workhouse-id/${workhouseId}`,
                {
                    headers: { "Authorization": `Bearer ${authToken}` }
                }
            );
            if (response.data.httpStatusCode === 200 && response.data.data) {
                const detailsList = response.data.data;
                setSubmittedDetailsList(detailsList);
                showAlert('Şantiye detayları başarıyla yüklendi.', 'success');
            } else {
                showAlert(response.data.message || 'Şantiye detayları alınamadı.', 'error');
            }
        } catch (e: any) {
            showAlert('Şantiye detayları yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [workhouseId, navigate]);

    useEffect(() => {
        if (workhouseId) {
            fetchWorkhouseInfo();
            fetchWorkhouseDetails();
        }
    }, [workhouseId, fetchWorkhouseInfo, fetchWorkhouseDetails]);

    const showAlert = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
    };

    const clearAlert = () => {
        setAlertMessage(null);
    };
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (alertMessage) {
            timer = setTimeout(() => {
                clearAlert();
            }, 5000);
        }
        return () => {
            clearTimeout(timer);
        };
    }, [alertMessage]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsBlinking(false);
        }, 5000);
        return () => {
            clearTimeout(timer);
        };
    }, []);

    const validateForm = (): boolean => {
        let isValid = true;
        setStartDateError(false);
        setEndDateError(false);
        setOwnerError(false);
        setPriceError(false);
        setFormErrors(null);

        if (!owner.trim()) {
            setOwnerError(true);
            setFormErrors("Lütfen tüm zorunlu alanları doldurun.");
            isValid = false;
        }
        if (price === '' || isNaN(Number(price))) {
            setPriceError(true);
            setFormErrors("Lütfen tüm zorunlu alanları doldurun.");
            isValid = false;
        }
        if (rentStartDate && rentEndDate && rentEndDate < rentStartDate) {
            setEndDateError(true);
            setFormErrors("Bitiş tarihi başlangıç tarihinden önce olamaz!");
            isValid = false;
        }
        return isValid;
    };
    const resetForm = () => {
        setOwner('');
        setPrice('');
        setDescription('');
        setRentStartDate(new Date());
        setRentEndDate(new Date());
        setAttachments([]);
        setFilesToUpload([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

        setStartDateError(false);
        setEndDateError(false);
        setFormErrors(null);


        setIsFormVisible(false);
        setSubscriptions([]);
    };
    const createWorkhouseDetail = async () => {
        if (!validateForm() || !workhouseId) return;

        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error');
            setLoadingButton(false);
            return;
        }
        try {
            let attachmentsPayload = [];
            if (filesToUpload.length > 0) {
                const formData = new FormData();
                filesToUpload.forEach(file => formData.append('files', file));
                const uploadResponse = await axios.post(
                    server.baseurl + server.baseinfo + "upload-files",
                    formData,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                            'Authorization': `Bearer ${authToken}`
                        }
                    }
                );
                if (uploadResponse.data.httpStatusCode === 201) {
                    const fileUrls = uploadResponse.data.data.files;
                    attachmentsPayload = fileUrls.map((url: string) => ({ fileUrl: url }));
                } else {
                    showAlert('Dosyalar yüklenirken bir hata oluştu.', 'error');
                    setLoadingButton(false);
                    return;
                }
            }

            const payload = {
                workhouseId: Number(workhouseId),
                owner,
                rentStartDate: rentStartDate ? rentStartDate.toISOString() : null,
                rentEndDate: rentEndDate ? rentEndDate.toISOString() : null,
                price: Number(price),
                subscriptions: subscriptions,
                description,
                attachments: attachmentsPayload,
            };

            const response = await axios.post(server.baseurl + server.initialoperations + "create-workhouse-detail", payload, {
                headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" }
            });

            if (response.data.httpStatusCode === 201) {
                showAlert('Şantiye detayı başarıyla oluşturuldu!', 'success');
                resetForm();
                fetchWorkhouseDetails();
            } else {
                showAlert(response.data.message || 'Şantiye detayı oluşturulurken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            console.error("API Call Error:", e);
            showAlert(e.response?.data?.message || 'Bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };
    const handleCancelEdit = () => {
        setIsEditing(false);
        setItemToEdit(null);
        resetForm();
    };
    const handleUpdateDetails = async () => {
        if (!validateForm() || !itemToEdit || !itemToEdit.id) {
            return;
        }

        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error');
            setLoadingButton(false);
            return;
        }

        try {
            let newAttachmentsPayload = [];
            if (filesToUpload.length > 0) {
                const formData = new FormData();
                filesToUpload.forEach(file => formData.append('files', file));

                const uploadResponse = await axios.post(
                    server.baseurl + server.baseinfo + "upload-files",
                    formData,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                            'Authorization': `Bearer ${authToken}`
                        }
                    }
                );

                if (uploadResponse.data.httpStatusCode === 201) {
                    const newFileUrls = uploadResponse.data.data.files;
                    newAttachmentsPayload = newFileUrls.map((url: string) => ({ fileUrl: url }));
                } else {
                    showAlert('Dosyalar yüklenirken bir hata oluştu.', 'error');
                    setLoadingButton(false);
                    return;
                }
            }

            const keptExistingAttachments = itemToEdit.attachments
                .filter((att: Attachment) => attachments.includes(att.fileUrl.split('/').pop() || ''))
                .map((att: Attachment) => ({ fileUrl: att.fileUrl }));

            const finalAttachments = [...keptExistingAttachments, ...newAttachmentsPayload];

            const payload = {
                id: Number(itemToEdit.id),
                workhouseId: Number(workhouseId),
                owner,
                rentStartDate: rentStartDate ? rentStartDate.toISOString() : null,
                rentEndDate: rentEndDate ? rentEndDate.toISOString() : null,
                price: Number(price),
                subscriptions: subscriptions,
                description,
                attachments: finalAttachments,
            };

            const response = await axios.put(server.baseurl + server.initialoperations + "update-workhouseDetail", payload, {
                headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" }
            });

            if (response.data.httpStatusCode === 200) {
                showAlert('Şantiye detayı başarıyla güncellendi!', 'success');
                setIsEditing(false);
                setItemToEdit(null);
                resetForm();
                fetchWorkhouseDetails();
            } else {
                showAlert(response.data.message || 'Şantiye detayı güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {
                showAlert(e.response?.data?.message || 'Şantiye detayı güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');

            }
        } finally {
            setLoadingButton(false);
        }
    };

    const handleSaveSubscription = (newSubscriptions: SubscriptionItem[]) => {
        setSubscriptions(newSubscriptions);
        setOpenSubscriptionModal(false);
        showAlert('Abonelik bilgileri başarıyla güncellendi.', 'success');
    };

    const handleCancelSubscription = () => {
        setOpenSubscriptionModal(false);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            setFilesToUpload(prev => [...prev, ...Array.from(files)]);
            const fileNames = Array.from(files).map(file => file.name);
            setAttachments(prev => [...prev, ...fileNames]);
        }
    };

    const handleRemoveAttachment = (fileToRemove: string) => {
        setAttachments(prev => prev.filter(file => file !== fileToRemove));
    };

    const renderSubscriptionChips = (subscriptionsArray: SubscriptionItem[]) => {
        return subscriptionsArray.map((sub, index) => (
            <Chip
                key={`sub-${index}`}
                label={`${sub.title}: ${sub.no} (${sub.owner})`}
                size="small"
                color="primary"
                sx={{ mr: 1, mb: 1 }}
            />
        ));
    };


    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: any) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowForMenu(row);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };

    const handleClickOpenDeleteModal = (row: any) => {
        setItemToDelete(row);
        setOpenDeleteModal(true);
        handleCloseMenu();
    };

    const handleDeleteConfirm = () => {
        if (itemToDelete) {
            setSubmittedDetailsList(prev => prev.filter(item => item.id !== itemToDelete.id));
            showAlert('Giriş başarıyla tablodan silindi.', 'success');
            setOpenDeleteModal(false);
            setItemToEdit(null);
        }
    };

    const handleEditClick = (row: WorkhouseSubmittedDetail) => {
        setIsEditing(true);
        setItemToEdit(row);
        setOwner(row.owner);
        setDescription(row.description);
        setRentStartDate(row.rentStartDate ? new Date(row.rentStartDate) : null);
        setRentEndDate(row.rentEndDate ? new Date(row.rentEndDate) : null);

        if (row.price) {
            const cleanPrice = String(row.price).replace(/[$,]/g, '');
            setPrice(Number(cleanPrice));
        } else {
            setPrice('');
        }
        setSubscriptions(row.subscription || []);

        if (row.attachments && row.attachments.length > 0) {
            const fileNames = row.attachments.map(att => att.fileUrl.split('/').pop() || '');
            setAttachments(fileNames);
        } else {
            setAttachments([]);
        }

        setIsFormVisible(true);
        handleCloseMenu();
    };


    const handleDownloadClick = (fileUrl: string) => {
        if (!fileUrl) {
            showAlert('Dosya adresi geçersiz.', 'error');
            return;
        }
        const url = `${server.urldpwonload}${fileUrl}`;
        window.open(url, '_blank');
        showAlert(`"${fileUrl.split('/').pop()}" dosyası indiriliyor.`, 'info');
    };

    // توابع مدیریت صفحه بندی جدید
    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };
    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // برش لیست داده ها بر اساس صفحه بندی
    const paginatedDetailsList = useMemo(() => {
        return submittedDetailsList.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }, [submittedDetailsList, page, rowsPerPage]);


    if (loadingData) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
                <CircularProgress />
                <Typography variant="h6" ml={2}>Şantiye detayları yükleniyor...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3, position: 'relative' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip label={`İsim: ${workhouseDetail?.name}`} color="primary" variant="filled" size="small" />
                    <Chip label={`Kod: ${workhouseDetail?.code}`} color="success" variant="filled" size="small" />
                </Stack>
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    alignItems="stretch"
                    flexGrow={1}
                    justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                >
                    {!isFormVisible && (
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Şantiye detayları Belgesi kaydetmek için tıklayınız" : ""}>
                            <BlinkingButton
                                variant="contained"
                                color="primary"
                                onClick={() => setIsFormVisible(true)}
                                isBlinking={isBlinking}
                                fullWidth={false}
                            >
                                Yeni Şantiye detayları Kaydet
                            </BlinkingButton>
                        </CustomTooltip>
                    )}
                    {isFormVisible && (
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
                            <Button
                                variant="contained"
                                color="error"
                                onClick={resetForm}
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
            </Stack>

            {((isFormVisible) || (isEditing)) && (
                <>
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" mb={2}>Genel Bilgiler</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={3}>
                                <CustomFormLabel htmlFor="workhouse-owner" required>
                                    Sahibi
                                </CustomFormLabel>
                                <CustomTextField
                                    id="workhouse-owner"
                                    placeholder="Sahip Adı"
                                    size="small"
                                    sx={{ width: '100%' }}
                                    value={owner}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOwner(e.target.value)}
                                    error={ownerError}
                                    helperText={ownerError ? "Bu alan zorunludur." : ""}
                                />
                            </Grid>
                            <Grid item xs={12} sm={3}>
                                <CustomFormLabel htmlFor="workhouse-price" required>
                                    Kirası
                                </CustomFormLabel>
                                <CustomTextField
                                    id="workhouse-price"
                                    placeholder="Kirası"
                                    size="small"
                                    sx={{ width: '100%' }}
                                    type="number"
                                    value={price}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrice(Number(e.target.value))}
                                    error={priceError}
                                    InputProps={{ inputProps: { min: 0 } }}
                                    helperText={priceError ? "Bu alan zorunludur." : ""}
                                />
                            </Grid>

                            <Grid item xs={12} sm={3}>
                                <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                    <CustomFormLabel htmlFor="start-date" required>
                                        Kira Başlangıç Tarihi
                                    </CustomFormLabel>
                                    <DatePicker
                                        label=""
                                        value={rentStartDate}
                                        onChange={(newValue) => {
                                            setRentStartDate(newValue);
                                            if (startDateError && newValue) setStartDateError(false);
                                            if (rentEndDate && newValue && newValue > rentEndDate) {
                                                setEndDateError(true);
                                                setFormErrors("Bitiş tarihi başlangıç tarihinden önce olamaz!");
                                            } else {
                                                setEndDateError(false);
                                                setFormErrors(null);
                                            }
                                        }}
                                        inputFormat="dd/MM/yyyy"
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                size="small"
                                                sx={{ width: '100%' }}
                                                error={startDateError}
                                                helperText={startDateError ? "Başlangıç tarihi boş olamaz!" : formErrors || ""}
                                            />
                                        )}
                                    />
                                </LocalizationProvider>
                            </Grid>

                            <Grid item xs={12} sm={3}>
                                <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                    <CustomFormLabel htmlFor="end-date" required>
                                        Kira Bitiş Tarihi
                                    </CustomFormLabel>
                                    <DatePicker
                                        label=""
                                        value={rentEndDate}
                                        onChange={(newValue) => {
                                            setRentEndDate(newValue);
                                            if (endDateError && newValue) setEndDateError(false);
                                            if (rentStartDate && newValue && newValue < rentStartDate) {
                                                setEndDateError(true);
                                                setFormErrors("Bitiş tarihi başlangıç tarihinden önce olamaz!");
                                            } else {
                                                setEndDateError(false);
                                                setFormErrors(null);
                                            }
                                        }}
                                        inputFormat="dd/MM/yyyy"
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                size="small"
                                                sx={{ width: '100%' }}
                                                error={endDateError}
                                                helperText={endDateError ? formErrors || "Bitiş tarihi boş olamaz!" : ""}
                                            />
                                        )}
                                    />
                                </LocalizationProvider>
                            </Grid>

                            <Grid item xs={12} sm={12}>
                                <CustomFormLabel htmlFor="workhouse-description">Açıklama</CustomFormLabel>
                                <CustomTextField
                                    id="workhouse-description"
                                    placeholder="Açıklama"
                                    multiline
                                    rows={4}
                                    fullWidth
                                    value={description}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
                                />
                            </Grid>
                        </Grid>
                    </Paper>

                    <Paper elevation={3} sx={{ p: 3, mt: 3, mb: 3 }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                            <Typography variant="h6">Abonelik Bilgileri</Typography>
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Abonelik bilgilerini düzenleyin" : ""}>
                                <Button size="small" onClick={() => setOpenSubscriptionModal(true)} startIcon={<IconPlus />} variant="outlined">
                                    Abonelik Ekle
                                </Button>
                            </CustomTooltip>
                        </Stack>
                        <Stack direction="row" spacing={1} flexWrap="wrap" mt={2}>
                            {subscriptions.length > 0 ? (
                                renderSubscriptionChips(subscriptions)
                            ) : (
                                <Typography variant="body2" color="textSecondary">Henüz abonelik bilgisi yok.</Typography>
                            )}
                        </Stack>
                    </Paper>

                    <Paper elevation={3} sx={{ p: 3, mt: 3, mb: 3 }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                            <CustomFormLabel htmlFor="workhouse-attachments">Ekler</CustomFormLabel>
                            <Button size="small" onClick={() => fileInputRef.current?.click()} startIcon={<IconPlus />} variant="outlined">
                                Dosya Ekle
                            </Button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                                multiple
                                accept=".pdf, .xls, .xlsx"
                            />
                        </Stack>
                        <Box sx={{ border: '1px solid #ccc', borderRadius: '4px', p: 1, minHeight: 50, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {attachments.length > 0 ? (
                                attachments.map((file, index) => (
                                    <Chip
                                        key={index}
                                        label={file}
                                        onDelete={() => handleRemoveAttachment(file)}
                                        sx={{ mr: 1, mb: 1 }}
                                    />
                                ))
                            ) : (
                                <Typography variant="body2" color="textSecondary" sx={{ m: 'auto' }}>
                                    Henüz eklenmiş dosya yok.
                                </Typography>
                            )}
                        </Box>
                    </Paper>

                    <Grid container spacing={2} mb={2}>
                        <Grid item xs={12}>
                            <Stack direction="row" spacing={1} justifyContent="flex-end" mt={2}>
                                {isEditing ? (
                                    <>
                                        <Button variant="contained" color="primary" onClick={handleUpdateDetails} disabled={loadingButton || startDateError || endDateError}>
                                            {loadingButton ? 'Bekleniyor...' : 'Güncellemeyi Kaydet'}
                                        </Button>
                                        <Button variant="outlined" color="secondary" onClick={handleCancelEdit}>
                                            İptal Et
                                        </Button>
                                    </>
                                ) : (
                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Şantiye detaylarını güncelleyin" : ""}>
                                        <Button variant="contained" color="info" onClick={createWorkhouseDetail} disabled={loadingButton || startDateError || endDateError}>
                                            {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...</> : 'Detayları Güncelle'}
                                        </Button>
                                    </CustomTooltip>
                                )}
                            </Stack>
                        </Grid>
                    </Grid>

                </>

            )}
            {alertMessage && (
                <Stack sx={{ width: '100%', mt: 2 }} spacing={2}>
                    <Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert>
                </Stack>
            )}
            <TableContainer>
                {loadingData ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                        <CircularProgress />
                        <Typography variant="h6" sx={{ ml: 2 }}>Veriler yükleniyor...</Typography>
                    </Box>
                ) : (
                    <Table aria-label="Kira tablosu">
                        <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                            <TableRow>
                                <StyledTableCell sx={{ color: "#171c23" }}>
                                    <Typography variant="h6">Sahibi</Typography>
                                </StyledTableCell>
                                <StyledTableCell sx={{ color: "#171c23" }}>
                                    <Typography variant="h6">Kirası</Typography>
                                </StyledTableCell>
                                <StyledTableCell sx={{ color: "#171c23" }}>
                                    <Typography variant="h6">Açıklama</Typography>
                                </StyledTableCell>
                                <StyledTableCell sx={{ color: "#171c23" }}>
                                    <Typography variant="h6">Kira Başlangıç</Typography>
                                </StyledTableCell>
                                <StyledTableCell sx={{ color: "#171c23" }}>
                                    <Typography variant="h6">Kira Bitiş</Typography>
                                </StyledTableCell>
                                <StyledTableCell sx={{ color: "#171c23" }}>
                                    <Typography variant="h6">Abonelik</Typography>
                                </StyledTableCell>
                                <StyledTableCell sx={{ color: "#171c23" }}>
                                    <Typography variant="h6">Ekler</Typography>
                                </StyledTableCell>
                                <StyledTableCell></StyledTableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedDetailsList.length > 0 ? (
                                paginatedDetailsList.map((entry, index) => (
                                    <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <StyledTableCell>
                                            <Typography variant="body1">{entry.owner}</Typography>
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <Typography variant="body1">
                                                {cleanAndFormatPrice(entry.price)}
                                            </Typography>
                                        </StyledTableCell>
                                        <StyledTableCell sx={{ maxWidth: 200, verticalAlign: 'top' }}>
                                            <Box sx={{
                                                maxHeight: '5em',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 3,
                                                WebkitBoxOrient: 'vertical',
                                            }}>
                                                <Typography variant="body1">{entry.description}</Typography>
                                            </Box>
                                            {entry.description && entry.description.length > 50 && (
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm açıklamayı gör" : ""}>
                                                    <Button
                                                        variant="text"
                                                        size="small"
                                                        sx={{ fontSize: "10px", padding: "2px 5px" }}
                                                        onClick={() => handleOpenDescriptionModal(entry.description)}
                                                    >
                                                        Devamını Oku
                                                    </Button>
                                                </CustomTooltip>
                                            )}
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <Typography variant="body1">{formatDateDisplay(entry.rentStartDate)}</Typography>
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <Typography variant="body1">{formatDateDisplay(entry.rentEndDate)}</Typography>
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                                                {entry.subscription?.length > 0 ? (
                                                    entry.subscription.map((sub: SubscriptionItem, subIndex: number) => (
                                                        <Chip key={subIndex} label={`${sub.title}: ${sub.no} (${sub.owner})`} size="small" color="primary" sx={{ mr: 1, mb: 1 }} />
                                                    ))
                                                ) : (
                                                    <Typography variant="body2" color="textSecondary">-</Typography>
                                                )}
                                            </Box>
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            {entry.attachments && entry.attachments.length > 0 ? (
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Ekleri görüntüle" : ""}>
                                                    <IconButton onClick={() => handleOpenAttachmentsModal(entry.attachments)}>
                                                        <IconLink size={18} />
                                                    </IconButton>
                                                </CustomTooltip>
                                            ) : (
                                                <Typography variant="body2" color="textSecondary">-</Typography>
                                            )}
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Daha fazla seçenek" : ""}>
                                                <IconButton
                                                    id={`basic-button-${entry.id}`}
                                                    aria-controls={openMenu ? 'basic-menu' : undefined}
                                                    aria-haspopup="true"
                                                    aria-expanded={openMenu ? 'true' : undefined}
                                                    onClick={(event) => handleClickMenu(event, entry)}
                                                >
                                                    <IconDots width={18} />
                                                </IconButton>
                                            </CustomTooltip>
                                            <Menu
                                                id="basic-menu"
                                                anchorEl={anchorEl}
                                                open={openMenu && selectedRowForMenu?.id === entry.id}
                                                onClose={handleCloseMenu}
                                                MenuListProps={{ 'aria-labelledby': `basic-button-${selectedRowForMenu?.id}` }}
                                            >
                                                <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu kaydı düzenle" : ""}>
                                                    <MuiMenuItem onClick={() => handleEditClick(selectedRowForMenu)}>
                                                        <ListItemIcon><IconEdit width={18} /></ListItemIcon>
                                                        Düzenle
                                                    </MuiMenuItem>
                                                </CustomTooltip>
                                                <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu kaydı sil" : ""}>
                                                    <MuiMenuItem onClick={() => handleClickOpenDeleteModal(selectedRowForMenu)}>
                                                        <ListItemIcon><IconTrash width={18} /></ListItemIcon>
                                                        Silmek
                                                    </MuiMenuItem>
                                                </CustomTooltip>
                                            </Menu>
                                        </StyledTableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <StyledTableCell colSpan={8} align="center">
                                        <Typography variant="subtitle1" color="textSecondary">
                                            Henüz kayıtlı bir giriş bulunamadı.
                                        </Typography>
                                    </StyledTableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </TableContainer>

            {/* کامپوننت TablePagination */}
            <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={submittedDetailsList.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Satır başına düşen:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
            />
            {/* بقیه کامپوننت ها و مودال ها دست نخورده باقی می مانند */}
            <Dialog open={openDescriptionModal} onClose={handleCloseDescriptionModal} maxWidth="sm" fullWidth>
                <DialogTitle>Açıklamanın Tamamı</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body1">{fullDescription}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDescriptionModal} color="primary">Kapat</Button>
                </DialogActions>
            </Dialog>
            <Dialog open={openAttachmentsModal} onClose={handleCloseAttachmentsModal} maxWidth="sm" fullWidth>
                <DialogTitle>Ekler</DialogTitle>
                <DialogContent dividers>
                    {currentAttachments.map((attachment, index) => (
                        <Button key={index} fullWidth variant="outlined" onClick={() => handleDownloadClick(attachment.fileUrl)}
                            sx={{ mt: 1 }} startIcon={<IconDownload />}>
                            {attachment.fileUrl.split('/').pop()}
                        </Button>
                    ))}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseAttachmentsModal} color="primary">Kapat</Button>
                </DialogActions>
            </Dialog>
            <SubscriptionModal
                open={openSubscriptionModal}
                onClose={handleCancelSubscription}
                onSave={handleSaveSubscription}
                initialSubscriptions={subscriptions}
            />
            <DeleteWorkhouseDetail
                openModal={openDeleteModal}
                itemToDelete={itemToDelete}
                onClose={() => setOpenDeleteModal(false)}
                onDeleteSuccess={handleDeleteConfirm}
                showAlert={showAlert}
            />
        </Box>
    );
};

export default WorkhouseDetails;