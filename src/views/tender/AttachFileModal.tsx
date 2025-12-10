import React, { useState, useCallback, useRef } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, Box, List, ListItem, ListItemText,
    IconButton, CircularProgress
} from '@mui/material';
import { IconFileUpload, IconTrash } from '@tabler/icons-react';
import axios from 'axios';
import server from 'src/assets/address.json';

interface AttachFileModalProps {
    open: boolean;
    onClose: () => void;
    tenderId: number | null;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
    onUploadSuccess: () => void;
}
interface SelectedFile {
    file: File;
    id: string;
}
const AttachFileModal: React.FC<AttachFileModalProps> = ({ open, onClose, tenderId, showAlert, onUploadSuccess }) => {
    const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
    const [uploading, setUploading] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            const newValidFiles: SelectedFile[] = [];
            const invalidFiles: string[] = [];

            Array.from(files).forEach(file => {
                if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                    file.type === 'application/vnd.ms-excel' ||
                    file.type === 'application/pdf') {
                    if (!selectedFiles.some(sf => sf.file.name === file.name)) {
                        newValidFiles.push({ file, id: `${file.name}-${Date.now()}` });
                    } else {
                        showAlert(`"${file.name}" dosyası zaten listede mevcut.`, 'info');
                    }
                } else {
                    invalidFiles.push(file.name);
                }
            });
            if (invalidFiles.length > 0) {
                showAlert(`Sadece Excel (.xlsx, .xls) ve PDF (.pdf) dosyaları kabul edilir. Geçersiz dosyalar: ${invalidFiles.join(', ')}`, 'warning');
            }
            setSelectedFiles(prev => [...prev, ...newValidFiles]);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }, [selectedFiles, showAlert]);

    const handleRemoveFile = useCallback((fileId: string) => {
        setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
    }, []);

    const handleUploadFiles = useCallback(async () => {
        if (selectedFiles.length === 0) {
            showAlert('Lütfen yüklenecek dosya seçin.', 'warning');
            return;
        }
        if (tenderId === null) {
            showAlert('İhale ID bulunamadı. Lütfen sayfayı yenileyin.', 'error');
            return;
        }

        setUploading(true);
        showAlert('Dosyalar yükleniyor...', 'info');
        const formData = new FormData();
        selectedFiles.forEach(sFile => {
            formData.append('files', sFile.file);
        });

        const authToken = localStorage.getItem('authToken');
        const uploadApiEndpoint = server.baseurl + server.baseinfo + "upload-files";

        try {
            // Step 1: Upload files to the server
            const uploadResponse = await axios.post(uploadApiEndpoint, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': authToken ? `Bearer ${authToken}` : ''
                },
            });

            if (uploadResponse.data.httpStatusCode === 201) {
                const fileUrls = uploadResponse.data.data.files;
                debugger
                // Step 2: Prepare payload for the second API call
                const updatePayload = {
                    id: Number(tenderId),
                    attachments: fileUrls.map((url: string) => ({ fileUrl: url }))
                };

                // Step 3: Send file URLs to the second API to update the database
                const updateTenderApiEndpoint = server.baseurl + server.initialoperations + "update-tender-header";
                const updateResponse = await axios.put(updateTenderApiEndpoint, updatePayload, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': authToken ? `Bearer ${authToken}` : ''
                    }
                });

                if (updateResponse.data.httpStatusCode === 200) {
                    showAlert('Dosyalar başarıyla yüklendi ve kaydedildi!', 'success');
                    onClose();
                    onUploadSuccess();
                } else {
                    showAlert(`Dosyalar kaydedilirken bir hata oluştu: ${updateResponse.data.message || updateResponse.statusText}`, 'error');
                }

            } else {
                showAlert(`Dosyalar yüklenirken bir hata oluştu: ${uploadResponse.data.message || uploadResponse.statusText}`, 'error');
            }
        } catch (error: any) {
            console.error("File upload process error:", error);
            showAlert(`Dosyalar yüklenirken bir hata oluştu: ${error.response?.data?.message || error.message || 'Sunucuya ulaşılamıyor.'}`, 'error');
        } finally {
            setUploading(false);
            setSelectedFiles([]);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }, [selectedFiles, tenderId, showAlert, onClose, onUploadSuccess]);

    const handleCloseModal = useCallback(() => {
        setSelectedFiles([]);
        setUploading(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        onClose();
    }, [onClose]);

    return (
        <Dialog open={open} onClose={handleCloseModal} maxWidth="sm" fullWidth>
            <DialogTitle>Dosya Ekle</DialogTitle>
            <DialogContent dividers>
                <Typography variant="body2" color="textSecondary" mb={2}>
                    Lütfen Excel (.xlsx, .xls) veya PDF (.pdf) formatında dosyalar seçin. Birden fazla dosya seçebilirsiniz.
                </Typography>
                <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept=".xlsx, .xls, .pdf"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />
                <Button
                    variant="outlined"
                    startIcon={<IconFileUpload />}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    fullWidth
                >
                    Dosya Seç
                </Button>
                {selectedFiles.length > 0 && (
                    <Box sx={{ mt: 2, border: '1px dashed #ccc', borderRadius: '4px', p: 1, maxHeight: 200, overflowY: 'auto' }}>
                        <Typography variant="subtitle2" mb={1}>Seçilen Dosyalar:</Typography>
                        <List dense>
                            {selectedFiles.map(sFile => (
                                <ListItem
                                    key={sFile.id}
                                    secondaryAction={
                                        <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveFile(sFile.id)} disabled={uploading}>
                                            <IconTrash size={18} />
                                        </IconButton>
                                    }
                                >
                                    <ListItemText primary={sFile.file.name} secondary={`${(sFile.file.size / 1024).toFixed(2)} KB`} />
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCloseModal} disabled={uploading}>İptal</Button>
                <Button
                    onClick={handleUploadFiles}
                    variant="contained"
                    color="primary"
                    disabled={selectedFiles.length === 0 || uploading}
                >
                    {uploading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : <IconFileUpload size={20} style={{ marginRight: 8 }} />}
                    Yükle
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AttachFileModal;