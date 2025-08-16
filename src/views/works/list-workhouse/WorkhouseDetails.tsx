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

interface SubscriptionFields {
    owner: string;
    subscriptionNumber: string;
    subscriptionType: string;
}
interface WorkhouseDetailType extends WorkhouseType {
    owner: string;
    rentStartDate: string;
    rentEndDate: string;
    price: number;
    subscription: SubscriptionFields;
    description: string;
    attachments: string[];
}

interface SubscriptionItem {
    no: string;
    owner: string;
    title: string;
}


interface Attachment {
    fileUrl: string;
}
interface WorkhouseSubmittedDetail {
    id: string;
    owner: string;
    rentStartDate: string;
    rentEndDate: string;
    price: string;
    subscription: SubscriptionItem[];
    description: string;
    attachments: Attachment[];
    createAt: string;
}
// ==============================================================================
// Main Component: WorkhouseDetails
// ==============================================================================
const WorkhouseDetails = () => {
    const { workhouseId } = useParams<{ workhouseId: string }>();
    const navigate = useNavigate();
    const theme = useTheme();
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
    const [workhouseDetail, setWorkhouseDetail] = useState<WorkhouseDetailType | null>(null);
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

    const [subscriptionFields, setSubscriptionFields] = useState<SubscriptionFields>({
        owner: '',
        subscriptionNumber: '',
        subscriptionType: '',
    });

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
            // تغییر URL برای دریافت لیست جزئیات
            const response = await axios.get(
                server.baseurl + server.initialoperations + `get-workhouse-details-by-workhouse-id/${workhouseId}`,
                {
                    headers: { "Authorization": `Bearer ${authToken}` }
                }
            );
            if (response.data.httpStatusCode === 200 && response.data.data) {
                // دریافت لیست جزئیات از پاسخ API
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
            fetchWorkhouseInfo(); // دریافت اطلاعات اصلی کارگاه
            fetchWorkhouseDetails(); // دریافت لیست جزئیات برای جدول
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

        // Validate Owner
        if (!owner.trim()) {
            setOwnerError(true);
            setFormErrors("Lütfen tüm zorunlu alanları doldurun.");
            isValid = false;
        }

        // Validate Price
        if (price === '' || isNaN(Number(price))) {
            setPriceError(true);
            setFormErrors("Lütfen tüm zorunlu alanları doldurun.");
            isValid = false;
        }

        // Validate Rent Dates (existing logic)
        if (rentStartDate && rentEndDate && rentEndDate < rentStartDate) {
            setEndDateError(true);
            setFormErrors("Bitiş tarihi başlangıç tarihinden önce olamaz!");
            isValid = false;
        }

        return isValid;
    };
    const resetForm = () => {
        // ریست کردن فیلدهای اصلی
        setOwner('');
        setPrice('');
        setDescription('');
        setRentStartDate(new Date());
        setRentEndDate(new Date());
        setAttachments([]); // پاک کردن نام فایل‌ها
        setFilesToUpload([]); // پاک کردن آبجکت‌های فایل
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // پاک کردن فایل از input
        }

        // ریست کردن stateهای مربوط به خطاها
        setStartDateError(false);
        setEndDateError(false);
        setFormErrors(null);

        // ریست کردن فیلدهای اشتراک
        setSubscriptionFields({
            owner: '',
            subscriptionNumber: '',
            subscriptionType: '',
        });
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

            // Step 1: Upload attachments if any
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
                debugger
                if (uploadResponse.data.httpStatusCode === 201) {
                    const fileUrls = uploadResponse.data.data.files;
                    attachmentsPayload = fileUrls.map((url: string) => ({ fileUrl: url }));
                } else {
                    showAlert('Dosyalar yüklenirken bir hata oluştu.', 'error');
                    setLoadingButton(false);
                    return; // در صورت خطا، از ادامه فرآیند جلوگیری می‌کند
                }
            }

            // Step 2: Prepare the final payload
            const subscriptionPayload = [{
                no: subscriptionFields.subscriptionNumber,
                owner: subscriptionFields.owner,
                title: subscriptionFields.subscriptionType
            }];

            debugger
            const payload = {
                workhouseId: Number(workhouseId), // Assuming workhouseId is the ID of the parent workhouse
                owner,
                rentStartDate: rentStartDate ? rentStartDate.toISOString() : null,
                rentEndDate: rentEndDate ? rentEndDate.toISOString() : null,
                price: Number(price),
                subscriptions: subscriptionPayload,
                description,
                attachments: attachmentsPayload,
            };

            // Step 3: Send the final payload to the creation API
            const response = await axios.post(server.baseurl + server.initialoperations + "create-workhouse-detail", payload, {
                headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" }
            });

            if (response.data.httpStatusCode === 201) {
                showAlert('Şantiye detayı başarıyla oluşturuldu!', 'success');
                // Here you can reset the form or update the list
                // For example:
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
        setIsEditing(false); // غیرفعال کردن حالت ویرایش
        setItemToEdit(null); // پاک کردن آیتم انتخاب شده
        resetForm(); // خالی کردن تمام فیلدهای فرم
    };
    const handleUpdateDetails = async () => {
        if (!validateForm() || !itemToEdit || !itemToEdit.id) return;

        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error');
            setLoadingButton(false);
            return;
        }
        debugger
        try {
            // آماده‌سازی payload برای به‌روزرسانی
            const subscriptionPayload = [
                {
                    no: subscriptionFields.subscriptionNumber,
                    owner: subscriptionFields.owner,
                    title: subscriptionFields.subscriptionType
                }
            ];

            const payload = {
                id: Number(itemToEdit.id),
                workhouseId: Number(workhouseId),
                owner,
                rentStartDate: rentStartDate ? rentStartDate.toISOString() : null,
                rentEndDate: rentEndDate ? rentEndDate.toISOString() : null,
                price: Number(price),
                subscriptions: subscriptionPayload,
                description,
                // پیوست‌ها باید از استیت attachments که حالا آدرس فایل‌ها را نگه می‌دارد، ارسال شوند
                attachments: attachments.map(url => ({ fileUrl: url }))
            };

            // ارسال درخواست PUT
            const response = await axios.put(server.baseurl + server.initialoperations + "update-workhouse-detail", payload, {
                headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" }
            });

            if (response.data.httpStatusCode === 200) {
                showAlert('Şantiye detayı başarıyla güncellendi!', 'success');
                setIsEditing(false); // غیرفعال کردن حالت ویرایش
                setItemToEdit(null);
                resetForm();
                fetchWorkhouseDetails(); // به‌روزرسانی لیست جدول
            } else {
                showAlert(response.data.message || 'Şantiye detayı güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Şantiye detayı güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };

    const handleSaveSubscription = (newFields: SubscriptionFields) => {
        setSubscriptionFields(newFields);
        setOpenSubscriptionModal(false);
        showAlert('Abonelik bilgileri başarıyla güncellendi.', 'success');
    };

    const handleCancelSubscription = () => {
        setOpenSubscriptionModal(false);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            // ابتدا فایل‌های جدید را به استیت filesToUpload اضافه می‌کنیم
            setFilesToUpload(prev => [...prev, ...Array.from(files)]);

            // سپس فقط نام فایل‌ها را برای نمایش در رابط کاربری در attachments قرار می‌دهیم
            const fileNames = Array.from(files).map(file => file.name);
            setAttachments(prev => [...prev, ...fileNames]);
        }
    };

    const handleRemoveAttachment = (fileToRemove: string) => {
        setAttachments(prev => prev.filter(file => file !== fileToRemove));
    };

    const renderSubscriptionChips = (subscriptionObject: SubscriptionFields) => {
        const chips = [];

        if (subscriptionObject.owner) {
            chips.push(
                <Chip
                    key="owner"
                    label={`Abone Sahibi: ${subscriptionObject.owner}`}
                    size="small"
                    color="primary"
                    sx={{ mr: 1, mb: 1 }}
                />
            );
        }
        if (subscriptionObject.subscriptionNumber) {
            chips.push(
                <Chip
                    key="subscriptionNumber"
                    label={`Abone Numarası: ${subscriptionObject.subscriptionNumber}`}
                    size="small"
                    color="primary"
                    sx={{ mr: 1, mb: 1 }}
                />
            );
        }
        if (subscriptionObject.subscriptionType) {
            chips.push(
                <Chip
                    key="subscriptionType"
                    label={`Abone Türü: ${subscriptionObject.subscriptionType}`}
                    size="small"
                    color="primary"
                    sx={{ mr: 1, mb: 1 }}
                />
            );
        }
        return chips;
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
            setItemToDelete(null);
        }
    };

    const handleEditClick = (row: WorkhouseSubmittedDetail) => {
        setIsEditing(true);
        setItemToEdit(row);

        setOwner(row.owner);
        setDescription(row.description);
        setRentStartDate(row.rentStartDate ? new Date(row.rentStartDate) : null);
        setRentEndDate(row.rentEndDate ? new Date(row.rentEndDate) : null);

        // --- اصلاح بخش قیمت ---
        if (row.price) {
            // حذف نمادهای ارز و ویرگول
            const cleanPrice = row.price.replace(/[$,]/g, '');
            // تبدیل به عدد و پر کردن فیلد
            setPrice(Number(cleanPrice));
        } else {
            setPrice('');
        }
        // ----------------------

        // پر کردن فیلدهای subscription
        if (row.subscription && row.subscription.length > 0) {
            setSubscriptionFields({
                owner: row.subscription[0].owner,
                subscriptionNumber: row.subscription[0].no,
                subscriptionType: row.subscription[0].title,
            });
        } else {
            // اگر اطلاعات اشتراک نبود، فیلدها را خالی کنید
            setSubscriptionFields({ owner: '', subscriptionNumber: '', subscriptionType: '' });
        }

        // پر کردن فیلدهای attachments
        setAttachments(row.attachments ? row.attachments.map(att => att.fileUrl) : []);

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
                    <Grid item xs={12} sm={6}>
                        <CustomFormLabel htmlFor="workhouse-owner" required>
                            Sahibi
                        </CustomFormLabel>
                        <CustomTextField
                            id="workhouse-owner"
                            placeholder="Sahip Adı"
                            fullWidth
                            value={owner}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOwner(e.target.value)}
                            error={ownerError}
                            helperText={ownerError ? "Bu alan zorunludur." : ""}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <CustomFormLabel htmlFor="workhouse-price" required>
                            Fiyat
                        </CustomFormLabel>
                        <CustomTextField
                            id="workhouse-price"
                            placeholder="Fiyat"
                            fullWidth
                            type="number"
                            value={price}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrice(Number(e.target.value))}
                            error={priceError}
                            helperText={priceError ? "Bu alan zorunludur." : ""}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                            <CustomFormLabel htmlFor="start-date" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }} required>
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
                                        fullWidth
                                        error={startDateError}
                                        helperText={startDateError ? "Başlangıç tarihi boş olamaz!" : formErrors || ""}
                                    />
                                )}
                            />
                        </LocalizationProvider>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                            <CustomFormLabel htmlFor="end-date" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }} required>
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
                                        fullWidth
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
                        <Button size="small" onClick={() => setOpenSubscriptionModal(true)} startIcon={<IconEdit />} variant="outlined">
                            Düzenle
                        </Button>
                    </CustomTooltip>
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap" mt={2}>
                    {subscriptionFields.owner || subscriptionFields.subscriptionNumber || subscriptionFields.subscriptionType ? (
                        renderSubscriptionChips(subscriptionFields)
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
                                <TableCell><Typography variant="h6">Fiyat</Typography></TableCell>
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
                                        <TableCell><Typography variant="h6">{entry.price}</Typography></TableCell>
                                        <TableCell>
                                            <Typography variant="h6" sx={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {entry.description}
                                            </Typography>
                                            {entry.description.length > 20 && (
                                                <Button size="small" onClick={() => handleOpenDescriptionModal(entry.description)}>
                                                    Tamamı
                                                </Button>
                                            )}
                                        </TableCell>
                                        <TableCell><Typography variant="h6">{formatDateDisplay(entry.rentStartDate)}</Typography></TableCell>
                                        <TableCell><Typography variant="h6">{formatDateDisplay(entry.rentEndDate)}</Typography></TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                                                {entry.subscription?.map((sub: SubscriptionItem, subIndex: number) => (
                                                    <Chip key={subIndex} label={`${sub.owner}: ${sub.title} - ${sub.no}`} size="small" color="primary" sx={{ mr: 1, mb: 1 }} />
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
                initialFields={subscriptionFields}
            />
            <DeleteWorkhouseDetail
                openModal={openDeleteModal} // نام پراپ به openModal تغییر یافت
                itemToDelete={itemToDelete} // پراپ itemToDelete
                onClose={() => setOpenDeleteModal(false)}
                onDeleteSuccess={handleDeleteConfirm} // نام پراپ به onDeleteSuccess تغییر یافت
                showAlert={showAlert} // اضافه کردن پراپ showAlert
            />
        </Box>
    );
};

export default WorkhouseDetails;