import React, { useState, useCallback } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, CircularProgress, Chip, Stack, Alert
} from '@mui/material';
import axios from 'axios';
import server from 'src/assets/address.json'; // فرض بر این است که فایل address.json در دسترس است

import { MapNode, SelectOption } from './types';

// props های مورد نیاز برای این کامپوننت
interface RegisterNewNodesModalProps {
    open: boolean;
    onClose: () => void;
    nodesToRegister: MapNode[];
    onRegisterSuccess: (registeredNodes: MapNode[]) => void;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
    // برای به‌روز کردن لیست اصلی پس از ثبت
    getListProductTypes: () => void;
}

const RegisterNewNodesModal: React.FC<RegisterNewNodesModalProps> = ({
    open,
    onClose,
    nodesToRegister,
    onRegisterSuccess,
    showAlert,
    getListProductTypes
}) => {
    const [loading, setLoading] = useState(false);
    const [localAlertMessage, setLocalAlertMessage] = useState<string | null>(null);
    const [localAlertSeverity, setLocalAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    const handleRegister = useCallback(async () => {
        setLoading(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Oturumunuzun süresi doldu.', 'error');
            setLoading(false);
            onClose();
            return;
        }

        const registeredNodes: MapNode[] = [];
        let hasError = false;

        for (const node of nodesToRegister) {
            try {
                // API çağrısı için payload
                const payload = { name: node.name };

                const response = await axios.post<{ data: SelectOption; httpStatusCode: number; message: string }>(
                    server.baseurl + server.initialoperations + "create-product-type",
                    payload,
                    { headers: { "Authorization": `Bearer ${authToken}` } }
                );

                if (response.data.httpStatusCode === 201) {
                    // Kayıt başarılıysa, yeni ID ile düğümü listeye ekle
                    registeredNodes.push({ ...node, id: response.data.data.id });
                } else {
                    // Hata durumunda, hata mesajını göster
                    setLocalAlertMessage(`'${node.name}' adlı direk kaydedilirken bir hata oluştu: ${response.data.message}`);
                    setLocalAlertSeverity('error');
                    hasError = true;
                }
            } catch (e: any) {
                // Axios hatası durumunda, hata mesajını göster
                setLocalAlertMessage(`'${node.name}' adlı direk kaydedilirken bir hata oluştu: ${e.response?.data?.message}`);
                setLocalAlertSeverity('error');
                hasError = true;
            }
        }

        setLoading(false);

        if (!hasError) {
            // Eğer hiç hata oluşmadıysa, ebeveyn bileşeni bilgilendir
            onRegisterSuccess(registeredNodes);
            onClose(); // Modalı kapat
            // Ana listedeki seçenekleri yenilemek için bu fonksiyonu çağırıyoruz
            getListProductTypes();
            showAlert('Tüm yeni direkler başarıyla kaydedildi!', 'success');
        } else {
            // Hata oluştuysa modalı açık tut ve tekrar denemesini iste
        }
    }, [nodesToRegister, showAlert, onClose, onRegisterSuccess, getListProductTypes]);


    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Yeni Direkleri Kaydet</DialogTitle>
            <DialogContent dividers>
                {localAlertMessage && (
                    <Alert severity={localAlertSeverity} onClose={() => setLocalAlertMessage(null)}>
                        {localAlertMessage}
                    </Alert>
                )}
                <Typography>
                    Aşağıdaki direkler sisteme toplu olarak kaydedilecektir. Lütfen onaylayın:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" mt={2}>
                    {nodesToRegister.map((node, index) => (
                        <Chip key={index} label={node.name} color="warning" variant="outlined" />
                    ))}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading} color="error">
                    İptal Et
                </Button>
                <Button
                    onClick={handleRegister}
                    disabled={loading}
                    variant="contained"
                    color="primary"
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : undefined}
                >
                    {loading ? 'Kaydediliyor...' : 'Tümünü Kaydet'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default RegisterNewNodesModal;