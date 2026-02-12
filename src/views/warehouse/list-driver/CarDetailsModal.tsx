import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Stack, Grid, CircularProgress, Typography, Box,

    TableCell as MuiTableCell,
    MenuItem as MuiMenuItem,
    Paper, TableContainer, Table, TableHead, TableRow, TableBody, Chip,
    IconButton, Menu, ListItemIcon, Alert,
    styled
} from '@mui/material';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { IconDots, IconEdit, IconTrash } from '@tabler/icons-react';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import axios from 'axios';
import server from 'src/assets/address.json';
import DeleteVehicle from './DeleteVehicle';
import { useNavigate } from 'react-router';


const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans',
    fontSize: '0.8rem',
    [theme.breakpoints.up('md')]: {
        fontSize: '1rem',
    },
}));

interface CarDetailsModalProps {
    open: boolean;
    onClose: () => void;
    driverId: number | null;
    driverName: string;
}

interface VehicleData {
    id: number;
    name: string;
    model: number;
    plaque: string;
    recordStatus: number;
}

const CarDetailsModal: React.FC<CarDetailsModalProps> = ({
    open,
    onClose,
    driverId,
    driverName,
}) => {
    const navigate = useNavigate();
    const [carName, setCarName] = useState('');
    const [carModel, setCarModel] = useState('');
    const [carPlate, setCarPlate] = useState('');
    const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null);

    const [carNameError, setCarNameError] = useState(false);
    const [carModelError, setCarModelError] = useState(false);
    const [carPlateError, setCarPlateError] = useState(false);

    const [vehiclesList, setVehiclesList] = useState<VehicleData[]>([]);
    const [loadingData, setLoadingData] = useState(false);
    const [loadingButton, setLoadingButton] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<VehicleData | null>(null);

    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [vehicleToDelete, setVehicleToDelete] = useState<VehicleData | null>(null);

    const [hasFetched, setHasFetched] = useState(false);

    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
        setTimeout(() => {
            setAlertMessage(null);
        }, 5000);
    }, []);

    const fetchVehicles = useCallback(async () => {
        if (!driverId) return;

        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
            setLoadingData(false);
            return;
        }
        try {
            const response = await axios.get(
                `${server.baseurl}${server.warehouse}get-driver-vehicle-by-driver-id/${Number(driverId)}`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });

            if (response.data.httpStatusCode === 200 && Array.isArray(response.data.data)) {
                const formattedData = response.data.data.map((item: any) => ({
                    ...item,
                    model: String(item.model),
                    id: Number(item.id)
                }));
                setVehiclesList(formattedData);
            } else {
                setVehiclesList([]);
            }
        } catch (e: any) {
            console.error("Failed to fetch vehicles:", e);
            setVehiclesList([]);
            showAlert('Araç bilgileri yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [driverId, showAlert]);

    useEffect(() => {
        if (open && !hasFetched) {
            fetchVehicles();
            setHasFetched(true);
        } else if (!open) {
            setHasFetched(false);
            setVehiclesList([]);
        }
    }, [open, hasFetched, fetchVehicles]);

    const resetForm = () => {
        setCarName('');
        setCarModel('');
        setCarPlate('');
        setEditingVehicleId(null);
        setIsEditing(false);
        setCarNameError(false);
        setCarModelError(false);
        setCarPlateError(false);
    };

    const validateForm = (): boolean => {
        let isValid = true;
        setCarNameError(!carName.trim());
        setCarModelError(!carModel.trim());
        setCarPlateError(!carPlate.trim());

        if (!carName.trim() || !carModel.trim() || !carPlate.trim()) {
            showAlert('Lütfen tüm zorunlu alanları doldurun!', 'warning');
            isValid = false;
        }
        return isValid;
    };

    const insertVehicle = async () => {
        if (!validateForm() || !driverId) return;

        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
            setLoadingButton(false);
            return;
        }

        const payload = {
            driverId: Number(driverId),
            name: carName,
            model: Number(carModel),
            plaque: carPlate,
        };

        try {
            const response = await axios.post(
                `${server.baseurl}${server.warehouse}create-driver-vehicle`,
                payload, { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}`, } }
            );

            if (response.data.httpStatusCode === 201) {
                showAlert('Araç başarıyla kaydedildi.', 'success');
                resetForm();
                fetchVehicles();
            } else {
                showAlert(response.data.message || 'Araç kaydedilirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };

    const updateVehicle = async () => {
        if (!validateForm() || !editingVehicleId) return;

        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
            setLoadingButton(false);
            return;
        }

        const payload = {
            id: Number(editingVehicleId),
            driverId: Number(driverId),
            name: carName,
            model: Number(carModel),
            plaque: carPlate,
        };

        try {
            const response = await axios.put(
                `${server.baseurl}${server.warehouse}update-driver-vehicle`,
                payload, { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}`, } }
            );

            if (response.data.httpStatusCode === 200) {
                showAlert('Araç başarıyla güncellendi.', 'success');
                resetForm();
                fetchVehicles();
            } else {
                showAlert(response.data.message || 'Araç güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {

                showAlert(e.response?.data?.message || 'Bir hata oluştu, lütfen tekrar deneyin.', 'error');
            }
        } finally {
            setLoadingButton(false);
        }
    };

    const handleEditClick = (vehicle: VehicleData) => {
        setCarName(vehicle.name);
        setCarModel(String(vehicle.model));
        setCarPlate(vehicle.plaque);
        setEditingVehicleId(vehicle.id);
        setIsEditing(true);
        handleCloseMenu();
    };

    const handleDeleteClick = (vehicle: VehicleData) => {
        setVehicleToDelete(vehicle);
        setOpenDeleteModal(true);
        handleCloseMenu();
    };

    const handleCloseDeleteModal = (success: boolean) => {
        setOpenDeleteModal(false);
        setVehicleToDelete(null);
        if (success) {
            fetchVehicles();
        }
    };

    const handleUpdateStatus = async (vehicleId: number, status: number) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
            return;
        }

        try {
            const response = await axios.put(
                `${server.baseurl}${server.warehouse}update-driver-vehicle`,
                {
                    id: Number(vehicleId), recordStatus: status,
                    driverId: Number(driverId)
                },
                { headers: { Authorization: `Bearer ${authToken}` } }
            );
            if (response.data.httpStatusCode === 200) {
                showAlert(`Araç durumu başarıyla güncellendi.`, 'success');
                fetchVehicles();
            } else {
                showAlert(`Araç durumu güncellenirken bir hata oluştu.`, 'error');
            }
        } catch (e) {
            showAlert('Bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally {
            handleCloseMenu();
        }
    };

    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: VehicleData) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowForMenu(row);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            aria-labelledby="car-details-modal-title"
        >
            <DialogTitle id="car-details-modal-title">
                Sürücü: {driverName} için Araç Yönetimi
            </DialogTitle>
            <DialogContent dividers>
                {alertMessage && (
                    <Stack sx={{ width: '100%', mb: 2 }} spacing={2}>
                        <Alert severity={alertSeverity} onClose={() => setAlertMessage(null)}>{alertMessage}</Alert>
                    </Stack>
                )}
                <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" mb={2}>
                        {isEditing ? 'Araç Detaylarını Düzenle' : 'Yeni Araç Kaydı'}
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                            <CustomFormLabel htmlFor="car-name" required>Araç Adı</CustomFormLabel>
                            <CustomTextField
                                id="car-name"
                                placeholder="Örn: Ford Transit"
                                fullWidth
                                value={carName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    setCarName(e.target.value);
                                    setCarNameError(false);
                                }}
                                error={carNameError}
                                helperText={carNameError ? "Araç adı boş bırakılamaz." : ""}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <CustomFormLabel htmlFor="car-model" required>Araç Modeli</CustomFormLabel>
                            <CustomTextField
                                id="car-model"
                                placeholder="Örn: 2023"
                                fullWidth
                                value={carModel}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    setCarModel(e.target.value);
                                    setCarModelError(false);
                                }}
                                error={carModelError}
                                helperText={carModelError ? "Araç modeli boş bırakılamaz." : ""}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <CustomFormLabel htmlFor="car-plate" required>Araç Plakası</CustomFormLabel>
                            <CustomTextField
                                id="car-plate"
                                placeholder="Örn: 34 ABC 123"
                                fullWidth
                                value={carPlate}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    setCarPlate(e.target.value);
                                    setCarPlateError(false);
                                }}
                                error={carPlateError}
                                helperText={carPlateError ? "Araç plakası boş bırakılamaz." : ""}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                {isEditing ? (
                                    <>
                                        <Button variant="contained" color="info" onClick={updateVehicle} disabled={loadingButton}>
                                            {loadingButton ? <CircularProgress size={20} /> : 'Düzenle'}
                                        </Button>
                                        <Button variant="outlined" color="secondary" onClick={resetForm} disabled={loadingButton}>
                                            İptal Et
                                        </Button>
                                    </>
                                ) : (
                                    <Button variant="contained" color="success" onClick={insertVehicle} disabled={loadingButton}>
                                        {loadingButton ? <CircularProgress size={20} /> : 'Kaydet'}
                                    </Button>
                                )}
                            </Stack>
                        </Grid>
                    </Grid>
                </Paper>

                <Typography variant="h6" mt={4} mb={2}>
                    Sürücünün Araç Listesi
                </Typography>

                {loadingData ? (
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                        <CircularProgress />
                        <Typography variant="h6" sx={{ ml: 2 }}>Araçlar yükleniyor...</Typography>
                    </Box>
                ) : (
                    <TableContainer component={Paper}>
                        <Table aria-label="driver vehicles table">
                            <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>
                                    <StyledTableCell><Typography variant="h6">Araç Adı</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Model</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Plaka</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Durum</Typography></StyledTableCell>
                                    <StyledTableCell></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {vehiclesList.length > 0 ? (
                                    vehiclesList.map((row) => (
                                        <TableRow key={row.id}>
                                            <StyledTableCell><Typography variant="body1">{row.name}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{row.model}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{row.plaque}</Typography></StyledTableCell>
                                            <StyledTableCell>
                                                <Chip
                                                    label={row.recordStatus === 0 ? 'Aktif' : 'Pasif'}
                                                    sx={{
                                                        backgroundColor: row.recordStatus === 0 ? 'success.light' : 'error.light',
                                                        color: row.recordStatus === 0 ? 'success.main' : 'error.main'
                                                    }}
                                                />
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <IconButton onClick={(event) => handleClickMenu(event, row)}>
                                                    <IconDots width={18} />
                                                </IconButton>
                                                <Menu
                                                    anchorEl={anchorEl}
                                                    open={Boolean(anchorEl) && selectedRowForMenu?.id === row.id}
                                                    onClose={handleCloseMenu}
                                                    MenuListProps={{ 'aria-labelledby': `menu-button-${row.id}` }}
                                                >
                                                    <MuiMenuItem onClick={() => handleEditClick(row)}>
                                                        <ListItemIcon><IconEdit width={18} /></ListItemIcon> Düzenle
                                                    </MuiMenuItem>
                                                    <MuiMenuItem onClick={() => handleDeleteClick(row)}>
                                                        <ListItemIcon><IconTrash width={18} /></ListItemIcon> Silmek
                                                    </MuiMenuItem>
                                                    {row.recordStatus === 0 ? (
                                                        <MuiMenuItem onClick={() => handleUpdateStatus(row.id, 1)}>
                                                            <ListItemIcon><DoNotDisturbOnRoundedIcon width={18} /></ListItemIcon> Pasif Yap
                                                        </MuiMenuItem>
                                                    ) : (
                                                        <MuiMenuItem onClick={() => handleUpdateStatus(row.id, 0)}>
                                                            <ListItemIcon><DoneRoundedIcon width={18} /></ListItemIcon> Aktif Yap
                                                        </MuiMenuItem>
                                                    )}
                                                </Menu>
                                            </StyledTableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <StyledTableCell colSpan={5} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">
                                                Bu sürücüye ait araç bulunamadı.
                                            </Typography>
                                        </StyledTableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="secondary" variant="outlined">
                    Kapat
                </Button>
            </DialogActions>

            {vehicleToDelete && (
                <DeleteVehicle
                    openModal={openDeleteModal}
                    vehicleIdToDelete={vehicleToDelete.id}
                    vehicleNameToDelete={vehicleToDelete.name}
                    onClose={handleCloseDeleteModal}
                    showAlert={showAlert}
                />
            )}
        </Dialog>
    );
};

export default CarDetailsModal;