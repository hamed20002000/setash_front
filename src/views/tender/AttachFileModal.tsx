import React, { useState, useCallback, useRef } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, Box, List, ListItem, ListItemText,
    IconButton, CircularProgress
} from '@mui/material';
import { IconFileUpload, IconTrash } from '@tabler/icons-react';
import axios from 'axios';
// import server from 'src/assets/address.json'; 

interface AttachFileModalProps {
    open: boolean;
    onClose: () => void;
    tenderId: number | null;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
}

interface SelectedFile {
    file: File;
    id: string; // Unique ID for React key prop and deletion
}

const AttachFileModal: React.FC<AttachFileModalProps> = ({ open, onClose, tenderId, showAlert }) => {
    const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
    const [uploading, setUploading] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            const newValidFiles: SelectedFile[] = [];
            const invalidFiles: string[] = [];

            Array.from(files).forEach(file => {
                // Only allow Excel and PDF files
                if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || // .xlsx
                    file.type === 'application/vnd.ms-excel' || // .xls
                    file.type === 'application/pdf') {
                    // Check for duplicates by file name (simple check)
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
            // Clear the file input value so same file can be selected again
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
            formData.append('files', sFile.file); // 'files' is the key for multiple files, API should expect an array of files
        });
        formData.append('tenderId', String(tenderId)); // Assuming API expects tenderId as a string

        // ✅ Test API Endpoint (placeholder)
        // Replace this with your actual API endpoint for attaching files
        // Example: `${server.baseurl}${server.yourApiPrefix}upload-tender-attachments`
        const testApiEndpoint = 'https://jsonplaceholder.typicode.com/posts'; // Placeholder for testing

        const authToken = localStorage.getItem('authToken');

        try {
            const response = await axios.post(testApiEndpoint, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': authToken ? `Bearer ${authToken}` : ''
                },
                // You can add onUploadProgress here if needed
            });

            if (response.status === 200 || response.status === 201) {
                showAlert('Dosyalar başarıyla yüklendi!', 'success');
                onClose(); // Close modal on success
            } else {
                showAlert(`Dosyalar yüklenirken bir hata oluştu: ${response.statusText || 'Bilinmeyen Hata'}`, 'error');
            }
        } catch (error: any) {
            console.error("File upload error:", error);
            showAlert(`Dosyalar yüklenirken bir hata oluştu: ${error.response?.data?.message || error.message || 'Sunucuya ulaşılamıyor.'}`, 'error');
        } finally {
            setUploading(false);
            setSelectedFiles([]); // Clear selected files after attempt
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }, [selectedFiles, tenderId, showAlert, onClose]);

    const handleCloseModal = useCallback(() => {
        setSelectedFiles([]); // Clear files on modal close
        setUploading(false); // Reset upload state
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
                    multiple // Allow multiple file selection
                    accept=".xlsx, .xls, .pdf" // Restrict file types
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