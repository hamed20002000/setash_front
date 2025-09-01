// src/views/warehouses/ViewWarehouseBalanceModal.tsx
import React, { useEffect, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, CircularProgress, Box, TableContainer,
    Table, TableHead, TableRow, TableCell, TableBody, Paper
} from '@mui/material';
import axios from 'axios';
import server from 'src/assets/address.json';

import { useNavigate } from 'react-router-dom';
// import { formatDateDisplay } from './ListWarehouses';
import { IconFileDownload } from '@tabler/icons-react';

interface ViewWarehouseBalanceModalProps {
    open: boolean;
    onClose: () => void;
    warehouseId: number | null;
    warehouseName: string;
    onDownloadPDF: (warehouseId: number, warehouseName: string, data: any[]) => void;

}

interface ItemBalanceType {
    itemId: string;
    code: string | null;
    name: string;
    balance: string;
}

interface ApiResponse<T> {
    success: boolean;
    httpStatusCode: number;
    message: string;
    data: T;
}

const ViewWarehouseBalanceModal: React.FC<ViewWarehouseBalanceModalProps> = ({
    open, onClose, warehouseId, warehouseName, onDownloadPDF }) => {
    const [itemsBalance, setItemsBalance] = useState<ItemBalanceType[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (open && warehouseId !== null) {
            fetchWarehouseItemsBalance();
        }
    }, [open, warehouseId]);

    const fetchWarehouseItemsBalance = async () => {

        setLoading(true);
        setError(null);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            return;
        }

        try {
            const response = await axios.get<ApiResponse<ItemBalanceType[]>>(
                `${server.baseurl}${server.warehouse}get-warehouse-all-items-balance/${warehouseId}`,
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );

            if (response.data.httpStatusCode === 200) {
                setItemsBalance(response.data.data);
            } else {
                setError(response.data.message || 'Mevcut veriler yüklenirken bir hata oluştu.');
            }
        } catch (e: any) {
            setError(e.response?.data?.message || 'Sunucu ile iletişim kurarken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };
    const handleDownloadClick = () => {
        if (warehouseId && itemsBalance.length > 0) {
            onDownloadPDF(warehouseId, warehouseName, itemsBalance);
        }
    };
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>  <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">
                    {warehouseName} Envanteri
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<IconFileDownload />}
                    onClick={handleDownloadClick}
                    disabled={loading || itemsBalance.length === 0}
                >
                    PDF Olarak İndir
                </Button>
            </Box></DialogTitle>
            <DialogContent dividers>
                {loading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                        <CircularProgress />
                        <Typography variant="h6" sx={{ ml: 2 }}>Envanter yükleniyor...</Typography>
                    </Box>
                ) : error ? (
                    <Typography color="error" sx={{ textAlign: 'center' }}>{error}</Typography>
                ) : itemsBalance.length > 0 ? (
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell><Typography variant="h6">Malzeme Adı</Typography></TableCell>
                                    <TableCell><Typography variant="h6">Mevcut Miktar</Typography></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {itemsBalance.map((item, _index) => (
                                    <TableRow key={item.itemId}>
                                        <TableCell>{item.name}</TableCell>
                                        <TableCell>{Number(item.balance).toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Typography sx={{ textAlign: 'center' }}>Bu depo için envanter bulunamadı.</Typography>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="primary">Kapat</Button>
            </DialogActions>
        </Dialog>
    );
};

export default ViewWarehouseBalanceModal;