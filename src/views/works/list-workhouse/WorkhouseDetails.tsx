import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Typography, Box, Stack, Grid, Button, Alert, TextField,
    CircularProgress, Paper, Chip, IconButton,
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody, MenuItem, Menu, ListItemIcon,
    Dialog,
    DialogTitle,
    DialogActions,
    DialogContent,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import BoltIcon from '@mui/icons-material/Bolt';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import {
    IconPlus, IconTrash, IconEdit,
    IconArrowRight, IconDots,
    IconLink,
    IconDownload
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


// --- Interfaces for API responses and internal use ---
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

// INTERFACE اصلاح‌شده
interface SubscriptionItem {
    no: string;
    owner: string;
    title: string;
}

// INTERFACE اصلاح‌شده
interface WorkhouseSubmittedDetail {
    id: string;
    owner: string; // این فیلد در API ممکن است وجود داشته باشد اما در فرم جدید استفاده نمی‌شود
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
    const theme = useTheme();
    const { isTooltipGloballyEnabled } = useTooltip();

    const [owner, setOwner] = useState<string>(''); // این فیلد برای فرم اصلی هنوز لازم است
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


    const [isEditing, setIsEditing] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<any | null>(null);

    // STATE اصلاح‌شده
    const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);


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

        // STATE اصلاح‌شده
        setSubscriptions([]);
    };
    const createWorkhouseDetail = async () => {
        debugger
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

            // PAYLOAD اصلاح‌شده
            const payload = {
                workhouseId: Number(workhouseId),
                owner,
                rentStartDate: rentStartDate ? rentStartDate.toISOString() : null,
                rentEndDate: rentEndDate ? rentEndDate.toISOString() : null,
                price: Number(price),
                subscriptions: subscriptions, // آرایه subscriptions مستقیماً ارسال می‌شود
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

            // PAYLOAD اصلاح‌شده
            const payload = {
                id: Number(itemToEdit.id),
                workhouseId: Number(workhouseId),
                owner,
                rentStartDate: rentStartDate ? rentStartDate.toISOString() : null,
                rentEndDate: rentEndDate ? rentEndDate.toISOString() : null,
                price: Number(price),
                subscriptions: subscriptions, // آرایه subscriptions مستقیماً ارسال می‌شود
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
            showAlert(e.response?.data?.message || 'Şantiye detayı güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };

    // تابع مدیریت ذخیره داده از مودال اشتراک
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

    // تابع نمایش چیپ‌های اشتراک اصلاح‌شده
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

    // تابع ویرایش اصلاح‌شده
    const handleEditClick = (row: WorkhouseSubmittedDetail) => {
        setIsEditing(true);
        setItemToEdit(row);
        // پر کردن فیلدهای فرم اصلی
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

        // پر کردن آرایه subscriptions برای مودال
        setSubscriptions(row.subscription || []);

        // پر کردن آرایه attachments
        if (row.attachments && row.attachments.length > 0) {
            const fileNames = row.attachments.map(att => att.fileUrl.split('/').pop() || '');
            setAttachments(fileNames);
        } else {
            setAttachments([]);
        }

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
                <CustomTooltip title={isTooltipGloballyEnabled ? "Geri dön" : ""}>
                    <Button variant="outlined" color="error" onClick={() => navigate(-1)}
                        endIcon={<IconArrowRight size={20} />}>
                        Geri Dön
                    </Button>
                </CustomTooltip>
            </Stack>

            {/* General Info and Details */}
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

            {/* Subscription Info and Details */}
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

            {/* Attachments */}
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

            {alertMessage && (
                <Stack sx={{ width: '100%', mt: 2 }} spacing={2}>
                    <Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert>
                </Stack>
            )}

            <BlankCard>
                <TableContainer component={Box} sx={{ mt: 2 }}>
                    <Table>
                        <TableHead style={{ background: theme.palette.grey[200] }}>
                            <TableRow>
                                <TableCell><Typography variant="h6">Sahibi</Typography></TableCell>
                                <TableCell><Typography variant="h6">Kirası</Typography></TableCell>
                                <TableCell><Typography variant="h6">Açıklama</Typography></TableCell>
                                <TableCell><Typography variant="h6">Kira Başlangıç</Typography></TableCell>
                                <TableCell><Typography variant="h6">Kira Bitiş</Typography></TableCell>
                                <TableCell><Typography variant="h6">Abonelik</Typography></TableCell>
                                <TableCell><Typography variant="h6">Ekler</Typography></TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {submittedDetailsList.length > 0 ? (
                                submittedDetailsList.map((entry, index) => (
                                    <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell><Typography variant="h6">{entry.owner}</Typography></TableCell>
                                        <TableCell>
                                            <Typography variant="h6">
                                                {cleanAndFormatPrice(entry.price)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="h6" sx={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {entry.description}
                                            </Typography>
                                            {entry.description.length > 20 && (
                                                <Button variant="text" size="small" onClick={() => {
                                                    handleOpenDescriptionModal(entry.description)
                                                }}>
                                                    Devamını Oku
                                                </Button>
                                            )}
                                        </TableCell>
                                        <TableCell><Typography variant="h6">{formatDateDisplay(entry.rentStartDate)}</Typography></TableCell>
                                        <TableCell><Typography variant="h6">{formatDateDisplay(entry.rentEndDate)}</Typography></TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                                                {/* نمایش اشتراک‌ها اصلاح شد */}
                                                {entry.subscription?.map((sub: SubscriptionItem, subIndex: number) => (
                                                    <Chip key={subIndex} label={`${sub.title}: ${sub.no} (${sub.owner})`} size="small" color="primary" sx={{ mr: 1, mb: 1 }} />
                                                )) || <Typography variant="body2" color="textSecondary">-</Typography>}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            {entry.attachments && entry.attachments.length > 0 ? (
                                                <IconButton onClick={() => handleOpenAttachmentsModal(entry.attachments)}>
                                                    <IconLink size={18} />
                                                </IconButton>
                                            ) : (
                                                <Typography variant="body2" color="textSecondary">-</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Daha fazla seçenek" : ""}>
                                                <IconButton id={`basic-button-${entry.id}`} aria-controls={openMenu ? 'basic-menu' : undefined} aria-haspopup="true" aria-expanded={openMenu ? 'true' : undefined} onClick={(event) => handleClickMenu(event, entry)}>
                                                    <IconDots width={18} />
                                                </IconButton>
                                            </CustomTooltip>
                                            <Menu
                                                id="basic-menu"
                                                anchorEl={anchorEl}
                                                open={openMenu}
                                                onClose={handleCloseMenu}
                                                MenuListProps={{ 'aria-labelledby': `basic-button-${selectedRowForMenu?.id}` }}
                                            >
                                                <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu kaydı düzenle" : ""}>
                                                    <MenuItem onClick={() => handleEditClick(selectedRowForMenu)}>
                                                        <ListItemIcon><IconEdit width={18} /></ListItemIcon>
                                                        Düzenle
                                                    </MenuItem>
                                                </CustomTooltip>
                                                <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu kaydı sil" : ""}>
                                                    <MenuItem onClick={() => handleClickOpenDeleteModal(selectedRowForMenu)}>
                                                        <ListItemIcon><IconTrash width={18} /></ListItemIcon>
                                                        Silmek
                                                    </MenuItem>
                                                </CustomTooltip>
                                            </Menu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8} align="center">
                                        <Typography variant="subtitle1" color="textSecondary">
                                            Henüz kayıtlı bir giriş bulunamadı.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </BlankCard>
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
                initialSubscriptions={subscriptions} // پراپ اصلاح‌شده
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