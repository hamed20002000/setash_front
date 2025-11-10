import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Typography, Box, Stack, Grid, Button, Paper, Chip,
} from '@mui/material';
import { IconPlus } from '@tabler/icons-react';
import axios from 'axios';
import server from 'src/assets/address.json';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { MaterialRequestType } from './RequestTabs'; // ⬅️ Import از والد

// ==============================================================================
// 1. INTERFACES
// ==============================================================================
interface Attachment { fileUrl: string; }

interface MaterialRequestFormProps {
    isEditing: boolean;
    itemToEdit: MaterialRequestType | null;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
    onSuccess: () => void;
    onCancel: () => void;
}

// ==============================================================================
// 2. COMPONENT
// ==============================================================================

const MaterialRequestForm: React.FC<MaterialRequestFormProps> = ({ isEditing, itemToEdit, showAlert, onSuccess, onCancel }) => {
    // ⬅️ استیت‌های فرم که قبلاً در RequestTabs بودند، اکنون اینجا هستند
    const [materialSubject, setMaterialSubject] = useState('');
    const [materialDescription, setMaterialDescription] = useState('');
    const [materialSubjectError, setMaterialSubjectError] = useState(false);
    const [loadingButton, setLoadingButton] = useState<boolean>(false);

    // Attachment States
    const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
    const [attachmentsInEdit, setAttachmentsInEdit] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ⬅️ تابع Reset فرم
    const resetForm = useCallback(() => {
        setMaterialSubject('');
        setMaterialDescription('');
        setFilesToUpload([]);
        setAttachmentsInEdit([]);
        setMaterialSubjectError(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, []);

    // ⬅️ Effect برای پر کردن فرم در حالت ویرایش
    useEffect(() => {
        if (isEditing && itemToEdit) {
            setMaterialSubject(itemToEdit.subject || '');
            setMaterialDescription(itemToEdit.description || '');
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

    // ==============================================================================
    // 3. CRUD LOGIC (Encapsulated)
    // ==============================================================================

    const validateForm = (): boolean => {
        setMaterialSubjectError(false);
        if (!materialSubject.trim()) {
            setMaterialSubjectError(true);
            showAlert("Lütfen Konu/Başlık alanını doldurun.", "warning");
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
                server.baseurl + server.baseinfo + "upload-files",
                formData,
                { headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${authToken}` } }
            );
            if (uploadResponse.data.httpStatusCode === 201) {
                const fileUrls = uploadResponse.data.data.files;
                return fileUrls.map((url: string) => ({ fileUrl: url }));
            } else {
                showAlert('Dosyalar yüklenirken bir hata oluştu.', 'error');
                return null;
            }
        } catch (e: any) {
            showAlert('Dosya yükleme API hatası.', 'error');
            return null;
        }
    };

    const handleCreate = async () => {
        if (!validateForm()) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error'); setLoadingButton(false); return; }

        const attachmentsPayload = await uploadFiles(authToken);
        if (attachmentsPayload === null) { setLoadingButton(false); return; }

        try {
            const payload = { subject: materialSubject, description: materialDescription, attachments: attachmentsPayload };
            const response = await axios.post(
                server.baseurl + server.hr + "create-Request",
                payload,
                { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } }
            );
            if (response.data.httpStatusCode === 201) {
                showAlert('Talep başarıyla oluşturuldu!', 'success');
                resetForm();
                onSuccess();
            } else {
                showAlert(response.data.message || 'Talep oluşturulurken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };

    const handleUpdate = async () => {
        if (!validateForm() || !itemToEdit || !itemToEdit.id) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error'); setLoadingButton(false); return; }

        const newAttachmentsPayload = await uploadFiles(authToken);
        if (newAttachmentsPayload === null) { setLoadingButton(false); return; }

        try {
            const keptExistingAttachments = itemToEdit.attachments
                .filter(att => attachmentsInEdit.includes(att.fileUrl.split('/').pop() || ''))
                .map(att => ({ fileUrl: att.fileUrl }));
            const finalAttachments = [...keptExistingAttachments, ...newAttachmentsPayload];

            const payload = {
                id: Number(itemToEdit.id), subject: materialSubject, description: materialDescription, attachments: finalAttachments,
            };

            const response = await axios.put(
                server.baseurl + server.hr + "update-request",
                payload,
                { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } }
            );
            if (response.data.httpStatusCode === 200) {
                showAlert('Talep başarıyla güncellendi!', 'success');
                resetForm();
                onSuccess();
            } else {
                showAlert(response.data.message || 'Talep güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };

    // Attachment Handlers
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            setFilesToUpload(prev => [...prev, ...Array.from(files)]);
            const fileNames = Array.from(files).map(file => file.name);
            setAttachmentsInEdit(prev => [...prev, ...fileNames]);
            if (fileInputRef.current) fileInputRef.current.value = ''; // Clear input for next selection
        }
    };
    const handleRemoveAttachmentInEdit = (fileNameToRemove: string) => {
        setAttachmentsInEdit(prev => prev.filter(file => file !== fileNameToRemove));
        setFilesToUpload(prev => prev.filter(file => file.name !== fileNameToRemove));
    };

    return (
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" mb={2}>{isEditing ? `Malzeme Talebini Düzenle (ID: ${itemToEdit?.id})` : 'Yeni Malzeme Talep Oluştur'}</Typography>

            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <CustomFormLabel htmlFor="material-subject" required>Konu / Başlık</CustomFormLabel>
                    <CustomTextField
                        id="material-subject" placeholder="Talep Başlığı" size="small" fullWidth
                        value={materialSubject}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaterialSubject(e.target.value)}
                        error={materialSubjectError}
                        helperText={materialSubjectError ? "Konu alanı zorunludur." : ""}
                    />
                </Grid>
                <Grid item xs={12}>
                    <CustomFormLabel htmlFor="material-description">Açıklama</CustomFormLabel>
                    <CustomTextField
                        id="material-description" placeholder="Talep Detayları" multiline rows={4} fullWidth
                        value={materialDescription}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaterialDescription(e.target.value)}
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

export default MaterialRequestForm;