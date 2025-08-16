// src/views/tender/DownloadAttachmentsModal.tsx

import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    List, ListItem, ListItemText, IconButton, Stack, Typography
} from '@mui/material';
import { IconDownload, IconX } from '@tabler/icons-react';
import server from 'src/assets/address.json';

interface Attachment {
    fileUrl: string;
}

interface DownloadAttachmentsModalProps {
    open: boolean;
    onClose: () => void;
    attachments: Attachment[] | null;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
}

const DownloadAttachmentsModal: React.FC<DownloadAttachmentsModalProps> = ({
    open,
    onClose,
    attachments,
    showAlert,
}) => {
    const handleDownloadClick = (fileUrl: string) => {
        if (!fileUrl) {
            showAlert('Dosya adresi geçersiz.', 'error');
            return;
        }
        const url = `${server.urldpwonload}${fileUrl}`;
        window.open(url, '_blank');
        showAlert(`"${fileUrl.split('/').pop()}" dosyası indiriliyor.`, 'info');
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="h6">Ek Dosyaları İndir</Typography>
                    <IconButton onClick={onClose}>
                        <IconX />
                    </IconButton>
                </Stack>
            </DialogTitle>
            <DialogContent dividers>
                <List dense>
                    {attachments && attachments.length > 0 ? (
                        attachments.map((file, index) => (
                            <ListItem
                                key={index}
                                secondaryAction={
                                    <IconButton edge="end" aria-label="download" onClick={() => handleDownloadClick(file.fileUrl)}>
                                        <IconDownload />
                                    </IconButton>
                                }
                            >
                                <ListItemText primary={file.fileUrl.split('/').pop()} />
                            </ListItem>
                        ))
                    ) : (
                        <Typography variant="body1" color="textSecondary">
                            Bu ihale için ek dosya bulunamadı.
                        </Typography>
                    )}
                </List>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Kapat</Button>
            </DialogActions>
        </Dialog>
    );
};

export default DownloadAttachmentsModal;