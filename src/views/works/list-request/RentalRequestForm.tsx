import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Typography, Box, Stack, Grid, Button, Paper, Chip, TextField, InputAdornment, Autocomplete,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { tr } from 'date-fns/locale';
import { IconPlus } from '@tabler/icons-react';
import axios from 'axios';
import server from 'src/assets/address.json';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { WorkhouseRentRequest, Workhouse } from './RequestTabs'; // ⬅️ Import از والد

// ==============================================================================
// 1. INTERFACES
// ==============================================================================
interface Attachment { fileUrl: string; }

interface RentalRequestFormProps {
    isEditing: boolean;
    itemToEdit: WorkhouseRentRequest | null;
    workhouses: Workhouse[];
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
    onSuccess: () => void;
    onCancel: () => void;
}

const formatPriceToString = (price: number | string): string | null => {
    const cleanedPrice = String(price).replace(/[^0-9.]/g, '');
    const numericPrice = parseFloat(cleanedPrice);

    if (isNaN(numericPrice) || numericPrice <= 0) {
        return null;
    }

    return numericPrice.toFixed(2);
};

const RentalRequestForm: React.FC<RentalRequestFormProps> = ({ isEditing, itemToEdit, workhouses, showAlert, onSuccess, onCancel }) => {
    const [rentalTitle, setRentalTitle] = useState('');
    const [rentalDescription, setRentalDescription] = useState('');
    const [driverInfo, setDriverInfo] = useState('');
    const [price, setPrice] = useState<number | string>('');
    const [company, setCompany] = useState('');
    const [rentStartDate, setRentStartDate] = useState<Date | null>(null);
    const [rentEndDate, setRentEndDate] = useState<Date | null>(null);
    const [rentStartDateError, setRentStartDateError] = useState(false);
    const [rentEndDateError, setRentEndDateError] = useState(false);
    const [selectedWorkhouseId, setSelectedWorkhouseId] = useState<number | string>('');
    const [loadingButton, setLoadingButton] = useState<boolean>(false);

    const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
    const [attachmentsInEdit, setAttachmentsInEdit] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetForm = useCallback(() => {
        setRentalTitle(''); setRentalDescription(''); setDriverInfo(''); setPrice(''); setCompany('');
        setRentStartDate(null); setRentEndDate(null); setRentStartDateError(false); setRentEndDateError(false);
        setSelectedWorkhouseId(''); setFilesToUpload([]); setAttachmentsInEdit([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, []);

    useEffect(() => {
        if (isEditing && itemToEdit) {
            setRentalTitle(itemToEdit.title);
            setRentalDescription(itemToEdit.description);
            setDriverInfo(itemToEdit.driverInfo);
            const numericPrice = itemToEdit.price ? String(itemToEdit.price).replace(/[^0-9.]/g, '') : '';
            setPrice(numericPrice);
            setCompany(itemToEdit.company);
            setRentStartDate(itemToEdit.rentStartDate ? new Date(itemToEdit.rentStartDate) : null);
            setRentEndDate(itemToEdit.rentEndDate ? new Date(itemToEdit.rentEndDate) : null);
            setSelectedWorkhouseId(itemToEdit.workhouse.id);

            if (itemToEdit.attachments && itemToEdit.attachments.length > 0) {
                const fileNames = itemToEdit.attachments.map(att => att.fileUrl.split('/').pop() || '');
                setAttachmentsInEdit(fileNames);
            } else {
                setAttachmentsInEdit([]);
            }
        } else {
            resetForm();
        }
    }, [isEditing, itemToEdit, resetForm]);

    const validateForm = (): boolean => {
        if (!rentalTitle.trim() || !selectedWorkhouseId || !rentStartDate || !rentEndDate || !price) {
            if (!rentStartDate) setRentStartDateError(true);
            if (!rentEndDate) setRentEndDateError(true);
            showAlert("Lütfen gerekli (Konu, İşyeri, Başlangıç/Bitiş Tarihi) alanları doldurun.", "warning");
            return false;
        }
        if (rentStartDate! > rentEndDate!) {
            showAlert("Başlangıç tarihi bitiş tarihinden sonra olamaz.", "warning");
            return false;
        }
        return true;
    };

    const uploadFiles = async (authToken: string): Promise<Attachment[] | null> => {
        if (filesToUpload.length === 0) return [];
        const formData = new FormData();
        filesToUpload.forEach(file => formData.append('files', file));
        try {
            const uploadResponse = await axios.post(
                server.baseurl + server.baseinfo + "upload-files", formData,
                { headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${authToken}` } }
            );
            if (uploadResponse.data.httpStatusCode === 201) {
                const fileUrls = uploadResponse.data.data.files;
                return fileUrls.map((url: string) => ({ fileUrl: url }));
            } else {
                showAlert('Dosyalar yüklenirken bir hata oluştu.', 'error'); return null;
            }
        } catch (e) { showAlert('Dosya yükleme API hatası.', 'error'); return null; }
    };

    const handleCreate = async () => {
        if (!validateForm()) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error'); setLoadingButton(false); return; }

        const attachmentsPayload = await uploadFiles(authToken);
        if (attachmentsPayload === null) { setLoadingButton(false); return; }

        const formattedPrice = formatPriceToString(price);

        try {
            const payload = {
                title: rentalTitle, description: rentalDescription, driverInfo: driverInfo,
                price: formattedPrice,
                company: company, rentStartDate: rentStartDate,
                rentEndDate: rentEndDate, workhouseId: Number(selectedWorkhouseId),
                attachments: attachmentsPayload,
            };
            const response = await axios.post(
                server.baseurl + server.initialoperations + "create-workhouse-rent", payload,
                { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } }
            );
            if (response.data.httpStatusCode === 201) {
                showAlert('Kiralama talebi başarıyla oluşturuldu!', 'success'); resetForm(); onSuccess();
            } else {
                showAlert(response.data.message || 'Kiralama talebi oluşturulurken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally { setLoadingButton(false); }
    };

    const handleUpdate = async () => {
        if (!validateForm() || !itemToEdit || !itemToEdit.id) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error'); setLoadingButton(false); return; }

        const newAttachmentsPayload = await uploadFiles(authToken);
        if (newAttachmentsPayload === null) { setLoadingButton(false); return; }

        const formattedPrice = formatPriceToString(price);


        try {
            const keptExistingAttachments = itemToEdit.attachments
                .filter(att => attachmentsInEdit.includes(att.fileUrl.split('/').pop() || ''))
                .map(att => ({ fileUrl: att.fileUrl }));
            const finalAttachments = [...keptExistingAttachments, ...newAttachmentsPayload];

            const payload = {
                id: Number(itemToEdit.id), title: rentalTitle, description: rentalDescription, driverInfo: driverInfo,
                price: formattedPrice,
                company: company, rentStartDate: rentStartDate,
                rentEndDate: rentEndDate, workhouseId: Number(selectedWorkhouseId), attachments: finalAttachments,
            };

            const response = await axios.put(
                server.baseurl + server.initialoperations + "update-workhouseRent", payload,
                { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } }
            );
            if (response.data.httpStatusCode === 200) {
                showAlert('Kiralama talebi başarıyla güncellendi!', 'success'); resetForm(); onSuccess();
            } else {
                showAlert(response.data.message || 'Kiralama talebi güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally { setLoadingButton(false); }
    };

    // Attachment Handlers
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            setFilesToUpload(prev => [...prev, ...Array.from(files)]);
            const fileNames = Array.from(files).map(file => file.name);
            setAttachmentsInEdit(prev => [...prev, ...fileNames]);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    const handleRemoveAttachmentInEdit = (fileNameToRemove: string) => {
        setAttachmentsInEdit(prev => prev.filter(file => file !== fileNameToRemove));
        setFilesToUpload(prev => prev.filter(file => file.name !== fileNameToRemove));
    };

    return (
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" mb={2}>{isEditing ? `Kiralama Talebini Düzenle (ID: ${itemToEdit?.id})` : 'Yeni Kiralama Talep Oluştur'}</Typography>

            <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                    <CustomFormLabel htmlFor="rental-title" required>Konu / Başlık</CustomFormLabel>
                    <CustomTextField id="rental-title" size="small" fullWidth value={rentalTitle}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRentalTitle(e.target.value)}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <CustomFormLabel htmlFor="rental-workhouse" required>Şantiye</CustomFormLabel>
                    <Autocomplete
                        id="rental-workhouse" options={workhouses} size="small"
                        getOptionLabel={(option) => option.name ? `${option.name} (Kod:${option.code})` : ''}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        value={workhouses.find(w => w.id === selectedWorkhouseId) || null}
                        onChange={(_event, newValue) => { setSelectedWorkhouseId(newValue ? newValue.id : ''); }}
                        renderInput={(params) => (<TextField {...params} label="Şantiye Seçiniz" variant="outlined" size="small" />)}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                        <CustomFormLabel htmlFor="rent-start-date" required>Kira Başlangıç Tarihi</CustomFormLabel>
                        <DatePicker
                            label="Kira Başlangıç Tarihi" value={rentStartDate}
                            onChange={(newValue) => { setRentStartDate(newValue); if (rentStartDateError && newValue) setRentStartDateError(false); }}
                            maxDate={rentEndDate || undefined} inputFormat="dd/MM/yyyy"
                            renderInput={(params) => (
                                <TextField
                                    {...params} size="small" fullWidth
                                    error={rentStartDateError} helperText={rentStartDateError ? "Başlangıç tarihi zorunludur!" : ""}
                                />
                            )}
                        />
                    </LocalizationProvider>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                        <CustomFormLabel htmlFor="rent-end-date" required>Kira Bitiş Tarihi</CustomFormLabel>
                        <DatePicker
                            label="Kira Bitiş Tarihi" value={rentEndDate}
                            onChange={(newValue) => { setRentEndDate(newValue); if (rentEndDateError && newValue) setRentEndDateError(false); }}
                            minDate={rentStartDate || undefined} inputFormat="dd/MM/yyyy"
                            renderInput={(params) => (
                                <TextField
                                    {...params} size="small" fullWidth
                                    error={rentEndDateError} helperText={rentEndDateError ? "Bitiş tarihi zorunludur!" : ""}
                                />
                            )}
                        />
                    </LocalizationProvider>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <CustomFormLabel htmlFor="rental-company">Kiralandığı Şirket</CustomFormLabel>
                    <CustomTextField id="rental-company" size="small" fullWidth value={company}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCompany(e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <CustomFormLabel htmlFor="rental-driver-info">Şoför Bilgisi</CustomFormLabel>
                    <CustomTextField id="rental-driver-info" size="small" fullWidth value={driverInfo}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDriverInfo(e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <CustomFormLabel htmlFor="rental-price" required>Fiyat</CustomFormLabel>
                    <CustomTextField
                        id="rental-price" type="number" size="small" fullWidth value={price}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrice(e.target.value)}
                        InputProps={{ startAdornment: (<InputAdornment position="start">TL</InputAdornment>) }}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <CustomFormLabel htmlFor="rental-description">Açıklama</CustomFormLabel>
                    <CustomTextField
                        id="rental-description" placeholder="Talep Detayları" multiline rows={2} fullWidth
                        value={rentalDescription}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRentalDescription(e.target.value)}
                    />
                </Grid>
            </Grid>

            <Paper elevation={1} sx={{ p: 2, mt: 3 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                    <CustomFormLabel htmlFor="request-attachments">Ekler (Resim,PDF, Excel)</CustomFormLabel>
                    <Button size="small" onClick={() => fileInputRef.current?.click()} startIcon={<IconPlus />} variant="outlined">
                        Dosya Ekle
                    </Button>
                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} multiple accept="image/*, .pdf, .xls, .xlsx" />
                </Stack>
                <Box sx={{ border: '1px solid #ccc', borderRadius: '4px', p: 1, minHeight: 50, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {attachmentsInEdit.length > 0 ? (
                        attachmentsInEdit.map((fileName, index) => (
                            <Chip key={index} label={fileName} onDelete={() => handleRemoveAttachmentInEdit(fileName)} sx={{ mr: 1, mb: 1 }} />
                        ))
                    ) : (
                        <Typography variant="body2" color="textSecondary" sx={{ m: 'auto' }}>
                            Henüz eklenmiş dosya yok.
                        </Typography>
                    )}
                </Box>
            </Paper>

            <Stack direction="row" spacing={1} justifyContent="flex-end" mt={3}>
                {isEditing ? (
                    <>
                        <Button variant="contained" color="primary" onClick={handleUpdate} disabled={loadingButton}>
                            {loadingButton ? 'Bekleniyor...' : 'Güncellemeyi Kaydet'}
                        </Button>
                        <Button variant="outlined" color="secondary" onClick={onCancel}>İptal Et</Button>
                    </>
                ) : (
                    <Button variant="contained" color="info" onClick={handleCreate} disabled={loadingButton}>
                        {loadingButton ? 'Bekleniyor...' : 'Talep Oluştur'}
                    </Button>
                )}
            </Stack>
        </Paper>
    );
};

export default RentalRequestForm;