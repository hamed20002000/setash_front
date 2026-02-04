// src/components/apps/projects/ProjectFirmManagement.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from "react-router-dom";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    CircularProgress, IconButton, Stack, Box, Typography, Paper, Grid, Chip, Menu, MenuItem, ListItemIcon, Alert
} from '@mui/material';
import { IconEdit, IconTrash, IconDots } from '@tabler/icons-react';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import axios from 'axios';
import server from '../../../assets/address.json';
import DeleteFirm from './DeleteFirm';

interface FirmType {
    id: number;
    title: string;
    abbreviation: string;
    createAt: string;
    recordStatus: number;
}

interface ProjectFirmManagementProps {
    open: boolean;
    onClose: () => void;
    onFirmChange: () => void;
}

const ProjectFirmManagement: React.FC<ProjectFirmManagementProps> = ({ open, onClose, onFirmChange }) => {
    const navigate = useNavigate();
    const [firms, setFirms] = useState<FirmType[]>([]);
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [abbreviation, setAbbreviation] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);

    // States for local alert
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    // Menu States
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedFirmForMenu, setSelectedFirmForMenu] = useState<FirmType | null>(null);
    const openMenu = Boolean(anchorEl);

    // Delete Modal States
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [firmIdToDelete, setFirmIdToDelete] = useState<number | null>(null);
    const [firmTitleToDelete, setFirmTitleToDelete] = useState<string>('');

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

    const fetchFirms = useCallback(async () => {
        setLoading(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) return;
        try {
            const response = await axios.get(server.baseurl + server.warehouse + "get-project-firm", {
                headers: { "Authorization": `Bearer ${authToken}` }
            });
            if (response.data.httpStatusCode === 200) {
                setFirms(response.data.data);
            } else {
                showAlert(response.data.message || 'Firmalar yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Firmalar yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (open) {
            fetchFirms();
        }
    }, [open, fetchFirms]);

    const resetForm = () => {
        setTitle('');
        setAbbreviation('');
        setEditingId(null);
    };

    const handleSave = async () => {
        if (!title.trim() || !abbreviation.trim()) {
            showAlert('Lütfen tüm zorunlu alanları doldurun.', 'warning');
            return;
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const payload = { title, abbreviation };
            const apiEndpoint = "create-project-firm";

            const response = await axios.post(server.baseurl + server.warehouse + apiEndpoint, payload, {
                headers: { "Authorization": `Bearer ${authToken}` }
            });

            if (response.data.httpStatusCode === 201) {
                showAlert('Firma başarıyla eklendi!', 'success');
                resetForm();
                fetchFirms();
                onFirmChange();
            } else {
                showAlert(response.data.message || 'İşlem sırasında bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'İşlem sırasında bir hata oluştu.', 'error');
        }
    };

    const handleUpdate = async () => {
        if (!title.trim() || !abbreviation.trim() || editingId === null) {
            showAlert('Lütfen tüm zorunlu alanları doldurun.', 'warning');
            return;
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const payload = { id: Number(editingId), title, abbreviation };
            const apiEndpoint = "update-project-firm";

            const response = await axios.put(server.baseurl + server.warehouse + apiEndpoint, payload, {
                headers: { "Authorization": `Bearer ${authToken}` }
            });

            if (response.data.httpStatusCode === 200) {
                showAlert('Firma başarıyla güncellendi!', 'success');
                resetForm();
                fetchFirms();
                onFirmChange();
            } else {

                showAlert(response.data.message || 'İşlem sırasında bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {
                showAlert(e.response?.data?.message || 'İşlem sırasında bir hata oluştu.', 'error');

            }
        }
    };

    const handleStatusChange = async (firmId: number, status: number) => {

        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }

        try {
            const response = await axios.put(
                server.baseurl + server.warehouse + "update-project-firm",
                { id: Number(firmId), recordStatus: status },
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );
            if (response.data.httpStatusCode === 200) {
                showAlert('Firma durumu başarıyla güncellendi!', 'success');
                fetchFirms();
                onFirmChange();
            } else {
                showAlert(response.data.message || 'Durum güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Durum güncellenirken bir hata oluştu.', 'error');
        } finally {
            handleCloseMenu();
        }
    };

    const handleEditClick = (firm: FirmType) => {
        setTitle(firm.title);
        setAbbreviation(firm.abbreviation);
        setEditingId(firm.id);
        handleCloseMenu();
    };

    const handleDeleteClick = (firm: FirmType) => {
        setFirmIdToDelete(firm.id);
        setFirmTitleToDelete(firm.title);
        setOpenDeleteModal(true);
        handleCloseMenu();
    };

    const handleCloseDeleteModal = () => {
        setOpenDeleteModal(false);
        setFirmIdToDelete(null);
        setFirmTitleToDelete('');
    };

    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, firm: FirmType) => {
        setAnchorEl(event.currentTarget);
        setSelectedFirmForMenu(firm);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedFirmForMenu(null);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Firma Yönetimi</DialogTitle>
            <DialogContent dividers>
                {alertMessage && (
                    <Box mb={2}>
                        <Alert severity={alertSeverity} onClose={clearAlert}>
                            {alertMessage}
                        </Alert>
                    </Box>
                )}
                <Box mb={3}>
                    <Typography variant="h6" mb={2}>{editingId ? 'Firma Düzenle' : 'Yeni Firma Ekle'}</Typography>
                    <Grid container spacing={2} alignItems="flex-end">
                        <Grid item xs={12} sm={5}>
                            <TextField label="Firma Adı" fullWidth value={title} onChange={(e) => setTitle(e.target.value)} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField label="Kısaltma" fullWidth value={abbreviation} onChange={(e) => setAbbreviation(e.target.value)} />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                {editingId ? (
                                    <Button onClick={handleUpdate} variant="contained" color="success">Güncelle</Button>
                                ) : (
                                    <Button onClick={handleSave} variant="contained" color="primary">Kaydet</Button>
                                )}
                                {editingId && <Button onClick={resetForm} variant="outlined" color="secondary">İptal</Button>}
                            </Stack>
                        </Grid>
                    </Grid>
                </Box>
                <Typography variant="h6">Mevcut Firmalar</Typography>
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Adı</TableCell>
                                <TableCell>Kısaltma</TableCell>
                                <TableCell>Durum</TableCell>
                                <TableCell>İşlemler</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={4} align="center"><CircularProgress /></TableCell></TableRow>
                            ) : (
                                firms.map((firm) => (
                                    <TableRow key={firm.id}>
                                        <TableCell>{firm.title}</TableCell>
                                        <TableCell>{firm.abbreviation}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={firm.recordStatus === 0 ? 'Aktif' : 'Pasif'}
                                                color={firm.recordStatus === 0 ? 'success' : 'error'}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <IconButton onClick={(event) => handleClickMenu(event, firm)}><IconDots width={18} /></IconButton>
                                            <Menu anchorEl={anchorEl} open={openMenu && selectedFirmForMenu?.id === firm.id} onClose={handleCloseMenu}>
                                                <MenuItem onClick={() => handleEditClick(firm)}>
                                                    <ListItemIcon><IconEdit width={18} /></ListItemIcon> Düzenle
                                                </MenuItem>
                                                <MenuItem onClick={() => handleDeleteClick(firm)}>
                                                    <ListItemIcon><IconTrash width={18} /></ListItemIcon> Sil
                                                </MenuItem>
                                                {firm.recordStatus === 0 ? (
                                                    <MenuItem onClick={() => handleStatusChange(firm.id, 1)}>
                                                        <ListItemIcon><DoNotDisturbOnRoundedIcon width={18} /></ListItemIcon> Pasif Yap
                                                    </MenuItem>
                                                ) : (
                                                    <MenuItem onClick={() => handleStatusChange(firm.id, 0)}>
                                                        <ListItemIcon><DoneRoundedIcon width={18} /></ListItemIcon> Aktif Yap
                                                    </MenuItem>
                                                )}
                                            </Menu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="primary">Kapat</Button>
            </DialogActions>

            <DeleteFirm
                openModal={openDeleteModal}
                onClose={handleCloseDeleteModal}
                firmIdToDelete={firmIdToDelete}
                firmTitleToDelete={firmTitleToDelete}
                onDeleteSuccess={() => {
                    fetchFirms();
                    onFirmChange();
                    handleCloseDeleteModal();
                }}
                showAlert={showAlert} // This prop is still needed for the DeleteFirm component
            />
        </Dialog>
    );
};

export default ProjectFirmManagement;