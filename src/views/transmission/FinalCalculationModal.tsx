import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, Box, TextField, Stack, Alert, CircularProgress,
    Paper, TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    IconButton
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    // IconDeviceFloppy,
    IconCalculator, IconPlus, IconMinus, IconTrash
} from '@tabler/icons-react';
import axios from 'axios';
import server from 'src/assets/address.json';
import { useNavigate } from 'react-router-dom';

interface AddedItem {
    id: string;
    name: string;
    quantity: number;
    miktarTipi: 'Yeni YG' | 'Yeni AG' | 'DMM YG' | 'DMM AG';
    weight?: number | null;
    unit?: {
        id: string;
        title: string;
        recordStatus: number;
        createAt: string;
    };
}

// interface ItemInput {
//     id: string;
//     miktarTipi: 'Yeni YG' | 'Yeni AG' | 'DMM YG' | 'DMM AG';
//     percentage: string;
// }

interface FinalCalculationModalProps {
    open: boolean;
    onClose: () => void;
    aggregatedItems: Map<string, Map<string, AddedItem>>;
    transmissionSummary: any[];
    networkId?: string;
    onDataUpdated: () => void;
}

interface TransmissionSummaryPayload {
    itemId: number;
    weight: number;
    length: number;
    productStatus: number;
    dMMPercent: number;
    totalWeight: number;
}

const FinalCalculationModal: React.FC<FinalCalculationModalProps> = ({ open, onClose, aggregatedItems, transmissionSummary, networkId, onDataUpdated }) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const [percentage, setPercentage] = useState<number>(15);
    const [finalResults, setFinalResults] = useState<Map<string, number>>(new Map());
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState<{ message: string; severity: 'success' | 'error' | 'warning' | 'info' } | null>(null);

    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlert({ message, severity });
        setTimeout(() => setAlert(null), 5000);
    }, []);

    useEffect(() => {
        if (open) {
            setFinalResults(new Map());
        }
    }, [open]);


    const calculateLiveResult = useCallback((itemId: string, miktarTipi: 'Yeni YG' | 'Yeni AG' | 'DMM YG' | 'DMM AG') => {
        const item = aggregatedItems.get(itemId)?.get(miktarTipi);

        const totalQuantity = parseFloat(String(item?.quantity) || '0');
        const itemWeight = parseFloat(String(item?.weight) || '0');

        if (isNaN(totalQuantity) || isNaN(itemWeight)) {
            return 0;
        }

        let result = 0;
        if (miktarTipi.startsWith('DMM')) {
            result = itemWeight * totalQuantity * (percentage / 100);
        } else {
            result = itemWeight * totalQuantity;
        }

        return result;
    }, [aggregatedItems, percentage]);

    const buildPayload = useCallback((): TransmissionSummaryPayload[] => {
        const payload: TransmissionSummaryPayload[] = [];

        aggregatedItems.forEach(itemMap => {
            itemMap.forEach(item => {
                const calculatedWeight = calculateLiveResult(item.id, item.miktarTipi);

                let productStatus = 0;
                if (item.miktarTipi === 'Yeni AG') productStatus = 1;
                if (item.miktarTipi === 'DMM YG') productStatus = 2;
                if (item.miktarTipi === 'DMM AG') productStatus = 3;

                const itemWeightToSend = (item.weight === null || item.weight === undefined) ? 0 : parseFloat(String(item.weight));


                payload.push({
                    itemId: parseInt(item.id, 10),
                    weight: itemWeightToSend,
                    length: parseFloat(String(item.quantity)),
                    productStatus: productStatus,
                    dMMPercent: item.miktarTipi.startsWith('DMM') ? percentage : 0,
                    totalWeight: calculatedWeight,
                });
            });
        });
        return payload;
    }, [aggregatedItems, calculateLiveResult, percentage]);


    const handleCalculateAndSave = useCallback(async () => {
        setLoading(true);
        const payload = buildPayload();

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
            navigate("/");
            setLoading(false);
            return;
        }
        debugger

        try {
            if (transmissionSummary.length === 0) {
                await axios.post(
                    `${server.baseurl}${server.initialoperations}create-transmissionSummary`,
                    { networkId: Number(networkId), transmissionSummaries: payload },
                    { headers: { Authorization: `Bearer ${authToken}` } }
                );
                showAlert('Hesaplamalar başarıyla kaydedildi!', 'success');
            } else {
                await axios.put(
                    `${server.baseurl}${server.initialoperations}update-transmissionSummary`,
                    { networkId: Number(networkId), transmissionSummaries: payload },
                    { headers: { Authorization: `Bearer ${authToken}` } }
                );
                showAlert('Hesaplamalar başarıyla güncellendi!', 'success');
            }
            onDataUpdated();
            onClose();
        } catch (e: any) {
            console.error("Error saving calculations:", e);
            showAlert(e.response?.data?.message || 'Kayıt işlemi sırasında bir hata oluştu.', 'error');
        } finally {
            setLoading(false);
        }
    }, [buildPayload, transmissionSummary.length, networkId, showAlert, navigate, onDataUpdated, onClose]);

    const handleDeleteAll = useCallback(async () => {
        setLoading(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
            navigate("/");
            setLoading(false);
            return;
        }

        try {
            await axios.delete(
                `${server.baseurl}${server.initialoperations}delete-transmissionSummary/${Number(networkId)}`,
                { headers: { Authorization: `Bearer ${authToken}` } }
            );
            showAlert('Tüm kayıtlar başarıyla silindi!', 'success');
            onDataUpdated();
            onClose();
        } catch (e: any) {
            console.error("Error deleting summaries:", e);
            showAlert(e.response?.data?.message || 'Kayıtlar silinirken bir hata oluştu.', 'error');
        } finally {
            setLoading(false);
        }
    }, [networkId, showAlert, navigate, onClose, onDataUpdated]);

    const combinedItems = useMemo(() => {
        const allItems: AddedItem[] = [];
        aggregatedItems.forEach(itemMap => {
            itemMap.forEach(item => {
                allItems.push(item);
            });
        });
        return allItems;
    }, [aggregatedItems]);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <span>Toplam İletim Analizi</span>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="body1">DMM Yüzdesi:</Typography>
                        <IconButton onClick={() => setPercentage(p => Math.max(0, p - 1))} size="small">
                            <IconMinus />
                        </IconButton>
                        <TextField
                            type="number"
                            value={percentage}
                            onChange={(e) => setPercentage(parseFloat(e.target.value) || 0)}
                            inputProps={{ min: 0, max: 100, style: { textAlign: 'center' } }}
                            sx={{ width: '100px' }}
                            size="small"
                            variant="outlined"
                        />
                        <IconButton onClick={() => setPercentage(p => Math.min(100, p + 1))} size="small">
                            <IconPlus />
                        </IconButton>
                    </Stack>
                </Stack>
            </DialogTitle>
            <DialogContent dividers>
                {alert && (
                    <Box mb={2}>
                        <Alert severity={alert.severity} onClose={() => setAlert(null)}>{alert.message}</Alert>
                    </Box>
                )}
                <TableContainer component={Paper} elevation={0}>
                    <Table>
                        <TableHead style={{ background: theme.palette.grey[200] }}>
                            <TableRow>
                                <TableCell><Typography variant="h6">Ürün</Typography></TableCell>
                                <TableCell><Typography variant="h6">Türü</Typography></TableCell>
                                <TableCell><Typography variant="h6">Toplam Miktar</Typography></TableCell>
                                <TableCell><Typography variant="h6">Ağırlık</Typography></TableCell>
                                <TableCell><Typography variant="h6">Yüzde (%)</Typography></TableCell>
                                <TableCell><Typography variant="h6">Sonuç</Typography></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {combinedItems.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center">
                                        <Typography color="textSecondary" py={3}>
                                            Hesaplama için öğe bulunamadı.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                combinedItems.map((item) => {
                                    const isDMM = item.miktarTipi.startsWith('DMM');
                                    const currentResult = calculateLiveResult(item.id, item.miktarTipi);

                                    return (
                                        <TableRow key={`${item.id}-${item.miktarTipi}`} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            <TableCell>{item.name}</TableCell>
                                            <TableCell>{item.miktarTipi}</TableCell>
                                            <TableCell>{item.quantity.toFixed(2)}</TableCell>
                                            <TableCell>
                                                <Box sx={{ width: 100 }}>
                                                    <Typography variant="body1">
                                                        {/* ✅ اگر item.weight مقدار نداشت، "-" نمایش داده شود */}
                                                        {item.weight !== null && item.weight !== undefined
                                                            ? parseFloat(String(item.weight)).toFixed(2)
                                                            : '-'}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                {isDMM ? (
                                                    <Typography variant="body1">{percentage.toFixed(2)} %</Typography>
                                                ) : (
                                                    <Typography variant="body2" color="textSecondary">-</Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="h6" color="primary">
                                                    {finalResults.get(`${item.id}-${item.miktarTipi}`)?.toFixed(2) || currentResult.toFixed(2)} {item.unit?.title || 'kg'}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )
                                }))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </DialogContent>
            <DialogActions>
                {transmissionSummary.length > 0 && (
                    <Button onClick={handleDeleteAll} color="error" variant="outlined" disabled={loading} startIcon={<IconTrash />}>
                        Tümünü Sil
                    </Button>
                )}
                <Button onClick={onClose} color="primary" variant="outlined">Kapat</Button>
                <Button onClick={handleCalculateAndSave} color="success" variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <IconCalculator />}>
                    {transmissionSummary.length > 0 ? 'Güncelle' : 'Hesapla'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default FinalCalculationModal;