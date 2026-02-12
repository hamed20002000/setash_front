import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    Typography, Box, Stack, Grid, Button, Paper, Chip,
    Autocomplete, TextField, CircularProgress
} from '@mui/material';
import { IconX, IconUpload, IconDeviceFloppy } from '@tabler/icons-react';
import axios from 'axios';
import server from 'src/assets/address.json';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { MaterialRequestType } from './RequestTabs';

interface Attachment { fileUrl: string; }

export interface WorkRef { id: number; }
export interface WorkhouseType {
    id: number;
    name: string;
    code?: string;
    recordStatus: number;
    work?: WorkRef;
    status?: 'Aktif' | 'Pasif';
}

interface MaterialRequestFormProps {
    isEditing: boolean;
    itemToEdit: MaterialRequestType | null;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
    onSuccess: () => void;
    onCancel: () => void;
}


const MaterialRequestForm: React.FC<MaterialRequestFormProps> = ({
    isEditing,
    itemToEdit,
    showAlert,
    onSuccess,
    onCancel
}) => {
    const navigate = useNavigate();

    const [materialSubject, setMaterialSubject] = useState('');
    const [materialDescription, setMaterialDescription] = useState('');
    const [loadingButton, setLoadingButton] = useState<boolean>(false);

    const [workhousesList, setWorkhousesList] = useState<WorkhouseType[]>([]);
    const [selectedWorkhouseId, setSelectedWorkhouseId] = useState<number | null>(null);
    const [loadingWorkhouses, setLoadingWorkhouses] = useState(false);

    const [materialSubjectError, setMaterialSubjectError] = useState(false);
    const [workhouseError, setWorkhouseError] = useState(false);

    const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
    const [attachmentsInEdit, setAttachmentsInEdit] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);


    const fetchWorkhouses = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        const role = localStorage.getItem('activeUserRoleName') || '';
        if (!authToken) { navigate("/"); return; }

        setLoadingWorkhouses(true);
        let requestParams = role.toLowerCase() !== 'admin' ? { rolename: role } : {};

        try {
            const response = await axios.get(
                server.baseurl + server.initialoperations + "get-workhouse",
                {
                    headers: { "Authorization": `Bearer ${authToken}` },
                    params: requestParams
                }
            );
            if (response.data?.httpStatusCode === 200) {
                const normalized: WorkhouseType[] = (response.data.data as any[]).map(i => ({
                    id: Number(i.id),
                    name: String(i.name ?? ''),
                    code: i.code ?? undefined,
                    recordStatus: Number(i.recordStatus ?? 1),
                    status: Number(i.recordStatus) === 0 ? 'Aktif' : 'Pasif',
                }));
                setWorkhousesList(normalized.filter(w => w.recordStatus === 0));
            } else {
                showAlert(response.data?.message || 'Şantiyeler yüklenirken یک خطا رخ داد.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
            }
            showAlert('Şantiyeler yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingWorkhouses(false);
        }
    }, [navigate, showAlert]);

    const resetForm = useCallback(() => {
        setMaterialSubject('');
        setMaterialDescription('');
        setSelectedWorkhouseId(null);
        setFilesToUpload([]);
        setAttachmentsInEdit([]);
        setMaterialSubjectError(false);
        setWorkhouseError(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, []);

    useEffect(() => {
        fetchWorkhouses();
    }, [fetchWorkhouses]);

    useEffect(() => {
        if (isEditing && itemToEdit) {
            setMaterialSubject(itemToEdit.subject || '');
            setMaterialDescription(itemToEdit.description || '');
            setSelectedWorkhouseId((itemToEdit as any).workhouse?.id ? Number((itemToEdit as any).workhouse.id) : null);

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
        let isValid = true;
        setMaterialSubjectError(false);
        setWorkhouseError(false);

        if (!selectedWorkhouseId) {
            setWorkhouseError(true);
            isValid = false;
        }
        if (!materialSubject.trim()) {
            setMaterialSubjectError(true);
            isValid = false;
        }

        if (!isValid) showAlert("Lütfen zorunlu alanları (Şantiye و Konu) doldurun.", "warning");
        return isValid;
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
            }
            return null;
        } catch (e: any) {
            showAlert('Dosya yükleme hatası.', 'error');
            return null;
        }
    };

    const handleCreate = async () => {
        if (!validateForm()) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) return;

        const attachmentsPayload = await uploadFiles(authToken);
        if (attachmentsPayload === null) { setLoadingButton(false); return; }

        try {
            const payload = {
                subject: materialSubject,
                description: materialDescription,
                workhouseId: selectedWorkhouseId,
                attachments: attachmentsPayload
            };
            const response = await axios.post(
                server.baseurl + server.hr + "create-Request",
                payload,
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );
            if (response.data.httpStatusCode === 201) {
                showAlert('Talep başarıyla oluşturuldu!', 'success');
                resetForm();
                onSuccess();
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Hata oluştu.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };

    const handleUpdate = async () => {
        if (!validateForm() || !itemToEdit?.id) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) return;

        const newAttachmentsPayload = await uploadFiles(authToken);
        if (newAttachmentsPayload === null) { setLoadingButton(false); return; }

        try {
            const keptExisting = (itemToEdit.attachments || [])
                .filter(att => attachmentsInEdit.includes(att.fileUrl.split('/').pop() || ''))
                .map(att => ({ fileUrl: att.fileUrl }));

            const finalAttachments = [...keptExisting, ...newAttachmentsPayload];

            const payload = {
                id: Number(itemToEdit.id),
                subject: materialSubject,
                description: materialDescription,
                workhouseId: selectedWorkhouseId,
                attachments: finalAttachments,
            };

            const response = await axios.put(
                server.baseurl + server.hr + "update-request",
                payload,
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );
            if (response.data.httpStatusCode === 200) {
                showAlert('Talep güncellendi!', 'success');
                resetForm();
                onSuccess();
            }
        } catch (e: any) {
            showAlert('Güncelleme hatası.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            const newFiles = Array.from(files);
            setFilesToUpload(prev => [...prev, ...newFiles]);
            setAttachmentsInEdit(prev => [...prev, ...newFiles.map(f => f.name)]);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemoveAttachment = (fileName: string) => {
        setAttachmentsInEdit(prev => prev.filter(f => f !== fileName));
        setFilesToUpload(prev => prev.filter(f => f.name !== fileName));
    };


    return (
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" mb={3} fontWeight="bold" color="primary">
                {isEditing ? `Talebi Düzenle (ID: ${itemToEdit?.id})` : 'Yeni Malzeme Talebi'}
            </Typography>

            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <CustomFormLabel required>Şantiye</CustomFormLabel>
                    <Autocomplete
                        options={workhousesList}
                        getOptionLabel={(o) => o.name}
                        value={workhousesList.find(w => w.id === selectedWorkhouseId) || null}
                        onChange={(_, v) => setSelectedWorkhouseId(v ? v.id : null)}
                        loading={loadingWorkhouses}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                size="small"
                                placeholder="Şantiye seçiniz"
                                error={workhouseError}
                                helperText={workhouseError ? "Şantiye seçimi zorunludur." : ""}
                                InputProps={{
                                    ...params.InputProps,
                                    endAdornment: (
                                        <>
                                            {loadingWorkhouses ? <CircularProgress color="inherit" size={20} /> : null}
                                            {params.InputProps.endAdornment}
                                        </>
                                    ),
                                }}
                            />
                        )}
                    />
                </Grid>

                <Grid item xs={12} md={6}>
                    <CustomFormLabel required>Konu / Başlık</CustomFormLabel>
                    <CustomTextField
                        placeholder="Talep Başlığı"
                        size="small"
                        fullWidth
                        value={materialSubject}
                        onChange={(e: any) => setMaterialSubject(e.target.value)}
                        error={materialSubjectError}
                        helperText={materialSubjectError ? "Konu alanı zorunludur." : ""}
                    />
                </Grid>

                <Grid item xs={12}>
                    <CustomFormLabel>Açıklama</CustomFormLabel>
                    <CustomTextField
                        placeholder="Talep detaylarını buraya yazınız..."
                        multiline
                        rows={4}
                        fullWidth
                        value={materialDescription}
                        onChange={(e: any) => setMaterialDescription(e.target.value)}
                    />
                </Grid>
            </Grid>

            <Paper variant="outlined" sx={{ p: 2, mt: 3, bgcolor: '#f9f9f9' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                    <Typography variant="subtitle1" fontWeight="600">Ekli Dosyalar</Typography>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<IconUpload size={18} />}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        Dosya Seç
                    </Button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                        multiple
                        accept="image/*, .pdf, .xls, .xlsx"
                    />
                </Stack>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, minHeight: '40px' }}>
                    {attachmentsInEdit.length > 0 ? (
                        attachmentsInEdit.map((name, i) => (
                            <Chip
                                key={i}
                                label={name}
                                onDelete={() => handleRemoveAttachment(name)}
                                color="primary"
                                variant="outlined"
                            />
                        ))
                    ) : (
                        <Typography variant="body2" color="textSecondary">Henüz dosya eklenmedi.</Typography>
                    )}
                </Box>
            </Paper>

            <Stack direction="row" spacing={2} justifyContent="flex-end" mt={4}>
                <Button variant="outlined" color="error" onClick={onCancel} startIcon={<IconX size={20} />}>
                    İptal
                </Button>
                <Button
                    variant="contained"
                    color={isEditing ? "primary" : "success"}
                    onClick={isEditing ? handleUpdate : handleCreate}
                    disabled={loadingButton}
                    startIcon={loadingButton ? <CircularProgress size={20} /> : <IconDeviceFloppy size={20} />}
                >
                    {loadingButton ? 'İşleniyor...' : (isEditing ? 'Güncelle' : 'Kaydet')}
                </Button>
            </Stack>
        </Paper>
    );
};

export default MaterialRequestForm;