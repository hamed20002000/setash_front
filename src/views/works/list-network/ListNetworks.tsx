// src/views/networks/ListNetwork.tsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    Typography, Chip, Box, Stack, Grid, Button, Alert,
    TablePagination, TextField, InputAdornment, CircularProgress,
    ToggleButtonGroup, ToggleButton as MuiToggleButton,
    Menu, MenuItem, IconButton, ListItemIcon,
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import { IconSearch, IconDots, IconEdit, IconTrash, IconPlus, IconArrowRight } from '@tabler/icons-react';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import axios from 'axios';
import server from '../../../assets/address.json';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import DeleteNetwork from './DeleteNetwork';

import { tr } from 'date-fns/locale';
import { format } from 'date-fns';


const formatDateDisplay = (dateString: string | null): string => {
    if (!dateString) return "N/A";
    try {
        const date = new Date(dateString);
        return format(date, 'dd MMMM yyyy', { locale: tr });
    } catch (e) {
        console.log("Tarih biçimlendirilirken hata oluştu:", e);
        return "Geçersiz Tarih";
    }
};

interface NetworkType {
    id: string;
    name: string;
    description: string;
    createAt: string;
    status: string;
    recordStatus?: number;
}

const StyledToggleButton = styled(MuiToggleButton)(({ theme, value, selected }) => ({
    '&.Mui-selected': {
        color: 'white',
        ...(value === 'all' && selected && {
            backgroundColor: theme.palette.primary.main,
            '&:hover': { backgroundColor: theme.palette.primary.dark },
        }),
        ...(value === 'active' && selected && {
            backgroundColor: theme.palette.success.main,
            '&:hover': { backgroundColor: theme.palette.success.dark },
        }),
        ...(value === 'inactive' && selected && {
            backgroundColor: theme.palette.error.main,
            '&:hover': { backgroundColor: theme.palette.error.dark },
        }),
    },
    '&:not(.Mui-selected)': {
        color: theme.palette.text.primary,
        borderColor: theme.palette.divider,
        '&:hover': { backgroundColor: theme.palette.action.hover },
    },
}));

const ListNetwork = () => {
    const { workId } = useParams<{ workId: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const tenderId = searchParams.get('tenderId');
    const [newNetworkData, setNewNetworkData] = useState({
        title: '',
        description: '',
        workId: workId ? parseInt(workId) : 0,
    });
    const [workTitleForDisplay, setWorkTitleForDisplay] = useState('');
    const [tenderTitleForDisplay, setTenderTitleForDisplay] = useState('');
    const [networks, setNetworks] = useState<NetworkType[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [loadingButton, setLoadingButton] = useState(false);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const { isTooltipGloballyEnabled } = useTooltip();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<NetworkType | null>(null);
    const openMenu = Boolean(anchorEl);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [originalTitle, setOriginalTitle] = useState<string>('');
    const [titleError, setTitleError] = useState<boolean>(false);
    const [descriptionError, setDescriptionError] = useState<boolean>(false);
    const [formErrors, setFormErrors] = useState<string | null>(null);
    const networkTitleInputRef = useRef<HTMLInputElement>(null);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [networkIdToDelete, setNetworkIdToDelete] = useState<string | null>(null);
    const [networkTitleToDelete, setNetworkTitleToDelete] = useState<string>('');
    const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
    const [fullDescriptionContent, setFullDescriptionContent] = useState<string>('');


    useEffect(() => {
        if (workId) {
            fetchWorkDetails(parseInt(workId));
            fetchNetworksByWorkId();
        }
        if (tenderId) {
            fetchTenderDetails(parseInt(tenderId));
        }
    }, [workId, tenderId]);

    const showAlert = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
        setTimeout(() => {
            setAlertMessage(null);
        }, 5000);
    };

    const fetchWorkDetails = async (id: number) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            navigate("/");
            return;
        }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + `get-work-by-id/${id}`, {
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${authToken}`
                }
            });
            if (response.data.httpStatusCode === 200) {
                setWorkTitleForDisplay(response.data.data.title);
            } else {
                showAlert(response.data.message || 'Work detayları alınırken hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Work detayları yüklenirken bir hata oluştu.', 'error');
        }
    };

    const fetchTenderDetails = async (id: number) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            navigate("/");
            return;
        }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + `get-tender-by-id/${id}`, {
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${authToken}`
                }
            });
            if (response.data.httpStatusCode === 200) {
                setTenderTitleForDisplay(response.data.data.title);
            } else {
                showAlert(response.data.message || 'İhale detayları alınırken hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'İhale detayları yüklenirken bir hata oluştu.', 'error');
        }
    };
    const fetchNetworksByWorkId = async () => {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            navigate("/");
            setLoadingData(false);
            return;
        }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + `get-networks`, {
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${authToken}`
                }
            });
            if (response.data.httpStatusCode === 200) {
                const rawData = response.data.data;
                const filteredData = rawData.filter((item: any) => item.work && parseInt(item.work.id) === parseInt(workId!));
                const formattedData: NetworkType[] = filteredData.map((item: any) => ({
                    id: item.id,
                    name: item.title,
                    description: item.description,
                    createAt: item.createAt,
                    status: item.recordStatus === 0 ? 'Aktif' : item.recordStatus === 1 ? 'Pasif' : 'Silindi',
                    recordStatus: item.recordStatus,
                }));
                setNetworks(formattedData);
            } else {
                showAlert(response.data.message || 'Şebeke listesi alınırken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                showAlert(e.response?.data?.message || 'Şebeke listesi yüklenirken bir hata oluştu.', 'error');
            }
        } finally {
            setLoadingData(false);
        }
    };
    const handleNetworkNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewNetworkData(prev => ({
            ...prev,
            title: e.target.value
        }));
        if (titleError && e.target.value.trim()) {
            setTitleError(false);
            setFormErrors(null);
        }
    };

    const handleDescriptionChange = (value: string) => {
        setNewNetworkData(prev => ({
            ...prev,
            description: value
        }));
        if (descriptionError && value.trim() && value !== '<p><br></p>') {
            setDescriptionError(false);
            setFormErrors(null);
        }
    };

    const validateForm = (): boolean => {
        let isValid = true;
        setFormErrors(null);
        if (!newNetworkData.title.trim()) {
            setTitleError(true);
            setFormErrors("Şebeke adı boş olamaz!");
            isValid = false;
        } else {
            setTitleError(false);
        }

        if (!isValid) {
            showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning');
        }
        return isValid;
    };
    const resetFormAndState = () => {
        setNewNetworkData({
            title: '',
            description: '',
            workId: workId ? parseInt(workId) : 0,
        });
        setEditingId(null);
        setOriginalTitle('');
        setTitleError(false);
        setDescriptionError(false);
        setFormErrors(null);
    };
    const insertNetwork = async () => {
        if (!validateForm()) {
            return;
        }
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            navigate("/");
            setLoadingButton(false);
            return;
        }
        try {
            const payload = {
                title: newNetworkData.title,
                description: newNetworkData.description,
                workId: newNetworkData.workId,
            };
            const response = await axios.post(
                server.baseurl + server.initialoperations + "create-network",
                payload,
                {
                    headers: {
                        "Accept": "application/json",
                        'Content-Type': 'application/json',
                        "Authorization": `Bearer ${authToken}`
                    }
                }
            );

            if (response.data.httpStatusCode === 201) {
                showAlert('Yeni Şebeke başarıyla eklendi!', 'success');
                resetFormAndState();
                fetchNetworksByWorkId();
            } else {
                showAlert(response.data.message || 'Yeni Şebeke eklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                showAlert(e.response?.data?.message || 'Şebeke eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
            }
        } finally {
            setLoadingButton(false);
        }
    };
    const editNetwork = async () => {
        if (editingId === null) return;

        if (!validateForm()) {
            return;
        }
        if (newNetworkData.title === originalTitle) {
            showAlert('Şebeke bilgilerinde herhangi bir değişiklik yapmadınız.', 'info');
            resetFormAndState();
            return;
        }
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            navigate("/");
            setLoadingButton(false);
            return;
        }
        try {
            const payload = {
                id: Number(editingId),
                title: newNetworkData.title,
                description: newNetworkData.description,
            };
            const response = await axios.put(
                server.baseurl + server.initialoperations + "update-network",
                payload,
                {
                    headers: {
                        "Accept": "application/json",
                        'Content-Type': 'application/json',
                        "Authorization": `Bearer ${authToken}`
                    }
                }
            );
            if (response.data.httpStatusCode === 200) {
                showAlert('Şebeke başarıyla güncellendi!', 'success');
                resetFormAndState();
                fetchNetworksByWorkId();
            } else {
                showAlert(response.data.message || 'Şebeke güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                showAlert(e.response?.data?.message || 'Şebeke güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
            }
        } finally {
            setLoadingButton(false);
        }
    };
    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: NetworkType) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowForMenu(row);
    };
    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };
    const sendRecordStatusUpdate = async (id: string, statusValue: number) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            navigate("/");
            return;
        }
        try {
            const response = await axios.put(
                server.baseurl + server.initialoperations + "update-network",
                { id: Number(id), recordStatus: statusValue },
                {
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            if (response.data.httpStatusCode === 200) {
                const statusText = statusValue === 0 ? 'Aktif' : statusValue === 1 ? 'Pasif' : 'Silindi';
                showAlert(`Şebeke başarıyla ${statusText} olarak ayarlandı!`, 'success');
                fetchNetworksByWorkId();
            } else {
                showAlert(response.data.message || 'Durum güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                showAlert(e.response?.data?.message || 'Durum güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
            }
        } finally {
            handleCloseMenu();
        }
    };
    const handleSetActive = () => {
        if (selectedRowForMenu) {
            sendRecordStatusUpdate(selectedRowForMenu.id, 0);
        }
    };
    const handleSetInactive = () => {
        if (selectedRowForMenu) {
            sendRecordStatusUpdate(selectedRowForMenu.id, 1);
        }
    };
    const handleEditClick = () => {
        if (selectedRowForMenu) {
            setNewNetworkData({
                title: selectedRowForMenu.name,
                description: selectedRowForMenu.description,
                workId: workId ? parseInt(workId) : 0,
            });
            setEditingId(selectedRowForMenu.id);
            setOriginalTitle(selectedRowForMenu.name);
            setTitleError(false);
            setDescriptionError(false);
            setFormErrors(null);
            handleCloseMenu();
            setTimeout(() => {
                networkTitleInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                networkTitleInputRef.current?.focus();
            }, 100);
        }
    };
    const handleClickOpenDeleteModal = () => {
        if (selectedRowForMenu) {
            setNetworkIdToDelete(selectedRowForMenu.id);
            setNetworkTitleToDelete(selectedRowForMenu.name);
            setOpenDeleteModal(true);
        }
        handleCloseMenu();
    };
    const handleClickCloseDeleteModal = () => {
        setOpenDeleteModal(false);
        setNetworkIdToDelete(null);
        setNetworkTitleToDelete('');
        fetchNetworksByWorkId();
    };
    const handleViewNetworkDetails = (networkId: string) => {
        navigate(`/network/${networkId}/details`);
    };
    const handleOpenDescriptionModal = (descriptionContent: string) => {
        setFullDescriptionContent(descriptionContent);
        setOpenDescriptionModal(true);
    };
    const handleCloseDescriptionModal = () => {
        setOpenDescriptionModal(false);
        setFullDescriptionContent('');
    };
    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
        setPage(0);
    };
    const handleChangePage = (
        event: unknown,
        newPage: number) => {
        setPage(newPage);
        console.log(event);
    };
    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };
    const handleStatusFilterChange = (
        event: React.MouseEvent<HTMLElement>,
        newFilter: 'all' | 'active' | 'inactive' | null,
    ) => {
        console.log(event);
        if (newFilter !== null) {
            setStatusFilter(newFilter);
            setPage(0);
        }
    };
    const handleDefineTransmission = () => {
        if (selectedRowForMenu) {
            const networkId = selectedRowForMenu.id;
            // workId و tenderId را از stateهای موجود در ListNetwork دریافت می‌کنیم
            const currentWorkId = workId || ''; // اطمینان از وجود workId
            const currentTenderId = tenderId || ''; // اطمینان از وجود tenderId

            // ✅ ساخت URL با networkId در path و workId, tenderId به عنوان query parameters
            navigate(`/transmission/list-transmission/${networkId}?workId=${currentWorkId}&tenderId=${currentTenderId}`);
        }
        handleCloseMenu(); // منو را ببندید
    };

    const filteredNetworks = networks.filter(network => {
        const matchesSearch = network.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            network.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'active' && network.recordStatus === 0) ||
            (statusFilter === 'inactive' && network.recordStatus === 1);

        return matchesSearch && matchesStatus;
    });
    const paginatedNetworks = filteredNetworks.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    if (loadingData) {
        return (
            <Stack sx={{ width: '100%', height: '300px', justifyContent: 'center', alignItems: 'center' }}>
                <CircularProgress />
                <Typography variant="h6" color="textSecondary" sx={{ mt: 2 }}>Şebeke yükleniyor...</Typography>
            </Stack>
        );
    }
    return (
        <div>
            <Box display="flex" justifyContent="space-between" alignItems="center" mt={2} mb={2}>

                <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip
                        label={`İhale: ${tenderTitleForDisplay}`}
                        color="primary"
                        variant="filled"
                        size="small"
                    />
                    <Chip
                        label={`içindeki İş: ${workTitleForDisplay}`}
                        color="success"
                        variant="filled"
                        size="small"
                    />
                </Stack>

                <CustomTooltip title={isTooltipGloballyEnabled ? "Geri dön" : ""}>
                    <Button variant="outlined" color="error" onClick={() => navigate(-1)}
                        endIcon={<IconArrowRight size={20} />}>
                        Geri Dön
                    </Button>
                </CustomTooltip>
            </Box>
            <Box component="div" sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: "8px", mb: 2 }}>
                {/* <Typography variant="h5" mb={2}>{editingId ? 'Şebeke Düzenle' : 'Yeni Şebeke Kaydı'}</Typography> */}
                <form>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <CustomFormLabel htmlFor="network-name" required>Şebeke Adı:</CustomFormLabel>
                            <CustomTextField
                                id="network-name"
                                name="title"
                                placeholder="Şebeke Adı"
                                fullWidth
                                value={newNetworkData.title}
                                onChange={handleNetworkNameChange}
                                required
                                size="small"
                                sx={{ mb: 1 }}
                                inputRef={networkTitleInputRef}
                                error={titleError}
                                helperText={titleError ? "Şebeke adı boş olamaz!" : ""}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <CustomFormLabel htmlFor="network-description">Açıklama:</CustomFormLabel>
                            <ReactQuill
                                theme="snow"
                                value={newNetworkData.description}
                                onChange={handleDescriptionChange}
                                style={{
                                    height: '150px',
                                    marginBottom: '20px',
                                    border: descriptionError ? '1px solid red' : undefined
                                }}
                            />
                            {descriptionError && (
                                <Typography color="error" variant="caption" sx={{ mt: -2, display: 'block' }}>
                                    Açıklama boş olamaz!
                                </Typography>
                            )}
                        </Grid>
                        <Grid item xs={12} sx={{ mt: { xs: 5, sm: 2 } }}>
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <input type="hidden" name="workId" value={newNetworkData.workId} />
                                {editingId ? (
                                    <>
                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Şebeke güncelle" : ""}>
                                            <Button
                                                variant="contained"
                                                color="info"
                                                onClick={editNetwork}
                                                disabled={loadingButton}
                                            >
                                                {loadingButton ? <CircularProgress size={24} color="inherit" /> : 'Şebeke Güncelle'}
                                            </Button>
                                        </CustomTooltip>
                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Düzenlemeyi iptal et ve yeni kayıt moduna dön" : ""}>
                                            <Button
                                                variant="outlined"
                                                color="secondary"
                                                onClick={resetFormAndState}
                                                disabled={loadingButton}
                                                sx={{ ml: 2 }}
                                            >
                                                İptal Et
                                            </Button>
                                        </CustomTooltip>
                                    </>
                                ) : (
                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Şebeke kaydet" : ""}>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            onClick={insertNetwork}
                                            disabled={loadingButton}
                                        >
                                            {loadingButton ? <CircularProgress size={24} color="inherit" /> : 'Şebeke Ekle'}
                                        </Button>
                                    </CustomTooltip>
                                )}
                            </Stack>
                        </Grid>
                    </Grid>
                </form>
                {alertMessage && (
                    <Stack sx={{ width: '100%', mt: 2 }} spacing={2}>
                        <Alert severity={alertSeverity}>{alertMessage}</Alert>
                    </Stack>
                )}
                {formErrors && (
                    <Stack sx={{ width: '100%', mt: 2 }} spacing={2}>
                        <Alert severity="error">{formErrors}</Alert>
                    </Stack>
                )}
            </Box>
            <Box sx={{ p: 2, mt: 4 }}>
                <Typography variant="h5" mb={2}>Mevcut Şebeke</Typography>
                <Grid container spacing={2} alignItems="center" mb={2}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            label="Şebeke Ara"
                            variant="outlined"
                            fullWidth
                            value={searchTerm}
                            onChange={handleSearchChange}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <IconSearch size={20} />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <ToggleButtonGroup
                            value={statusFilter}
                            exclusive
                            onChange={handleStatusFilterChange}
                            aria-label="Durum filtresi"
                            fullWidth
                        >
                            <StyledToggleButton value="all" aria-label="Tüm Şebeke">
                                Tümü
                            </StyledToggleButton>
                            <StyledToggleButton value="active" aria-label="Aktif Şebeke">
                                Aktif
                            </StyledToggleButton>
                            <StyledToggleButton value="inactive" aria-label="Pasif Şebeke">
                                Pasif
                            </StyledToggleButton>
                        </ToggleButtonGroup>
                    </Grid>
                </Grid>

                <TableContainer>
                    <Table aria-label="Şebeke tablosu">
                        <TableHead style={{ background: "rgb(149 147 125 / 65%)" }}>
                            <TableRow>
                                <TableCell><Typography variant="h6">Şebeke Adı</Typography></TableCell>
                                <TableCell><Typography variant="h6">Açıklama</Typography></TableCell>
                                <TableCell><Typography variant="h6">Kayıt Tarihi</Typography></TableCell>
                                <TableCell><Typography variant="h6">Durum</Typography></TableCell>
                                <TableCell><Typography variant="h6">Detaylar</Typography></TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedNetworks.length > 0 ? (
                                paginatedNetworks.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell><Typography variant="h6">{row.name}</Typography></TableCell>
                                        <TableCell sx={{ maxWidth: 200, verticalAlign: 'top' }}>
                                            <Box sx={{
                                                maxHeight: '5em',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 3,
                                                WebkitBoxOrient: 'vertical',
                                            }}>
                                                <div dangerouslySetInnerHTML={{ __html: row.description }} />
                                            </Box>
                                            {row.description && row.description.length > 50 && (
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm açıklamayı gör" : ""}>



                                                    <Button variant="text" size="small" onClick={() => {
                                                        handleOpenDescriptionModal(row.description)
                                                    }}>
                                                        Devamını Oku
                                                    </Button>
                                                </CustomTooltip>
                                            )}
                                        </TableCell>
                                        <TableCell><Typography variant="h6">{formatDateDisplay(row.createAt)}</Typography></TableCell>
                                        <TableCell>
                                            <Chip
                                                label={row.status}
                                                sx={{
                                                    backgroundColor:
                                                        row.recordStatus === 2
                                                            ? (theme) => theme.palette.warning.light
                                                            : row.recordStatus === 1
                                                                ? (theme) => theme.palette.error.light
                                                                : (theme) => theme.palette.success.light,
                                                    color:
                                                        row.recordStatus === 2
                                                            ? (theme) => theme.palette.warning.main
                                                            : row.recordStatus === 1
                                                                ? (theme) => theme.palette.error.main
                                                                : (theme) => theme.palette.success.main,
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Şebeke detaylarını görüntüle" : ""}>
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    onClick={() => handleViewNetworkDetails(row.id)}
                                                    startIcon={<IconSearch size={18} />}
                                                >
                                                    Detayları Görüntüle
                                                </Button>
                                            </CustomTooltip>
                                        </TableCell>
                                        <TableCell>
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Daha fazla seçenek" : ""}>
                                                <IconButton
                                                    id={`basic-button-${row.id}`}
                                                    aria-controls={openMenu ? 'basic-menu' : undefined}
                                                    aria-haspopup="true"
                                                    aria-expanded={openMenu ? 'true' : undefined}
                                                    onClick={(event) => handleClickMenu(event, row)}
                                                >
                                                    <IconDots width={18} />
                                                </IconButton>
                                            </CustomTooltip>
                                            <Menu
                                                id="basic-menu"
                                                anchorEl={anchorEl}
                                                open={openMenu}
                                                onClose={handleCloseMenu}
                                                MenuListProps={{
                                                    'aria-labelledby': `basic-button-${selectedRowForMenu?.id}`,
                                                }}
                                            >
                                                {selectedRowForMenu?.recordStatus === 0 ? (
                                                    <>
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu ağ için İletken İcmali" : ""}>
                                                            <MenuItem onClick={handleDefineTransmission}>
                                                                <ListItemIcon>
                                                                    <IconPlus width={18} />
                                                                </ListItemIcon>
                                                                İletken İcmali
                                                            </MenuItem>
                                                        </CustomTooltip>

                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Şebeke pasif yap" : ""}>
                                                            <MenuItem onClick={handleSetInactive}>
                                                                <ListItemIcon>
                                                                    <DoNotDisturbOnRoundedIcon width={18} />
                                                                </ListItemIcon>
                                                                Pasif Yap
                                                            </MenuItem>
                                                        </CustomTooltip>
                                                    </>
                                                ) : (
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Şebeke aktif yap" : ""}>
                                                        <MenuItem onClick={handleSetActive}>
                                                            <ListItemIcon>
                                                                <DoneRoundedIcon width={18} />
                                                            </ListItemIcon>
                                                            Aktif Yap
                                                        </MenuItem>
                                                    </CustomTooltip>
                                                )}

                                                <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Şebeke düzenle" : ""}>
                                                    <MenuItem onClick={handleEditClick}>
                                                        <ListItemIcon>
                                                            <IconEdit width={18} />
                                                        </ListItemIcon>
                                                        Düzenlemek
                                                    </MenuItem>
                                                </CustomTooltip>
                                                <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Şebeke sil" : ""}>
                                                    <MenuItem onClick={handleClickOpenDeleteModal}>
                                                        <ListItemIcon>
                                                            <IconTrash width={18} />
                                                        </ListItemIcon>
                                                        Silmek
                                                    </MenuItem>
                                                </CustomTooltip>
                                            </Menu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} align="center">
                                        <Typography variant="subtitle1" color="textSecondary">
                                            Bu iş için hiç Şebeke bulunamadı.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={filteredNetworks.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Sayfa başına satır sayısı:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
                />
            </Box>
            <DeleteNetwork
                openModal={openDeleteModal}
                onClose={handleClickCloseDeleteModal}
                networkIdToDelete={networkIdToDelete}
                networkTitleToDelete={networkTitleToDelete}
                showAlert={showAlert}
                onDeleteSuccess={() => fetchNetworksByWorkId()}
            />
            <Dialog
                open={openDescriptionModal}
                onClose={handleCloseDescriptionModal}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Açıklamanın Tamamı</DialogTitle>
                <DialogContent dividers>
                    <DialogContentText>
                        <div dangerouslySetInnerHTML={{ __html: fullDescriptionContent }} />
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDescriptionModal} color="primary">
                        Kapat
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default ListNetwork;