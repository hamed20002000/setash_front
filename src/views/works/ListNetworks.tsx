// src/views/networks/ListNetwork.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    Typography, Chip, Box, Stack, Grid, Button, Alert,
    TablePagination, TextField, InputAdornment, CircularProgress,
    ToggleButtonGroup, ToggleButton as MuiToggleButton,
    Menu, MenuItem, IconButton, ListItemIcon
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { format } from 'date-fns';

import CustomFormLabel from '../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../components/forms/theme-elements/CustomTextField';
import { IconSearch, IconDots, IconEdit, IconTrash } from '@tabler/icons-react';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';


import axios from 'axios';
import server from '../../assets/address.json';

import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// Tooltip'i içe aktarın
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

// ✅ DeleteNetwork modalını import edin (ListUnit'teki DeleteUnit gibi)
import DeleteNetwork from './DeleteNetwork'; // Lütfen bu yolu kendi projenize göre ayarlayın


// Interface'ler
interface NetworkType {
    id: string; // ID'nin string olduğunu varsayıyoruz
    name: string; // Şebekeler adı
    description: string; // Şebekeler açıklaması
    createAt: string;
    status: string;
    recordStatus?: number; // 0: Aktif, 1: Pasif, 2: Silindi
}

// Durum filtresi için stilize edilmiş ToggleButton
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

    // Şebekeler kaydı formu için state
    const [newNetworkData, setNewNetworkData] = useState({
        title: '', // Şebekeler adı
        description: '', // Şebekeler açıklaması (ReactQuill ile yönetiliyor)
        workId: workId ? parseInt(workId) : 0,
    });

    // UI'da Work ve Tender adını göstermek için state'ler (salt okunur)
    const [workTitleForDisplay, setWorkTitleForDisplay] = useState('');
    const [tenderTitleForDisplay, setTenderTitleForDisplay] = useState('');

    // Mevcut Şebekelerın listesi için state
    const [networks, setNetworks] = useState<NetworkType[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [loadingButton, setLoadingButton] = useState(false);

    // Uyarı mesajları için state
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    // Sayfalama ve Arama
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

    // Tooltip global durumu
    const { isTooltipGloballyEnabled } = useTooltip();

    // Menu states for operations
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<NetworkType | null>(null);
    const openMenu = Boolean(anchorEl);

    // ✅ Düzenleme modu için state'ler (ListUnit.tsx'deki gibi)
    const [editingId, setEditingId] = useState<string | null>(null);
    const [originalTitle, setOriginalTitle] = useState<string>('');
    // const [originalDescription, setOriginalDescription] = useState<string>('');

    // ✅ Input validation error states (ListUnit.tsx'deki gibi)
    const [titleError, setTitleError] = useState<boolean>(false);
    const [descriptionError, setDescriptionError] = useState<boolean>(false);
    const [formErrors, setFormErrors] = useState<string | null>(null);

    // Şebekeler başlığı TextField'ına odaklanmak için ref
    const networkTitleInputRef = useRef<HTMLInputElement>(null);

    // ✅ Delete Modal states (ListUnit.tsx'deki gibi)
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [networkIdToDelete, setNetworkIdToDelete] = useState<string | null>(null);
    const [networkTitleToDelete, setNetworkTitleToDelete] = useState<string>('');


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
        // Alert'i otomatik kapatma süresi (5 saniye)
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
            console.error("Work detayları getirilirken hata oluştu:", e);
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
            console.error("İhale detayları getirilirken hata oluştu:", e);
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
                showAlert(response.data.message || 'Şebekeler listesi alınırken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                console.error("Şebekeler listesi getirilirken hata oluştu:", e);
                showAlert(e.response?.data?.message || 'Şebekeler listesi yüklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
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
        // ✅ Hata durumunu temizle
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
        // ✅ Hata durumunu temizle
        if (descriptionError && value.trim() && value !== '<p><br></p>') { // HTML içeriği boş mu kontrolü
            setDescriptionError(false);
            setFormErrors(null);
        }
    };

    // ✅ Form validasyon işlevi
    const validateForm = (): boolean => {
        let isValid = true;
        setFormErrors(null); // Önceki genel hataları temizle

        if (!newNetworkData.title.trim()) {
            setTitleError(true);
            setFormErrors("Şebekeler adı boş olamaz!");
            isValid = false;
        } else {
            setTitleError(false);
        }

        // ReactQuill için içerik kontrolü
        if (!newNetworkData.description.trim() || newNetworkData.description === '<p><br></p>') {
            setDescriptionError(true);
            setFormErrors(prev => (prev ? prev + "\n" : "") + "Açıklama boş olamaz!"); // Hataları birleştir
            isValid = false;
        } else {
            setDescriptionError(false);
        }

        if (!isValid) {
            showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning');
        }
        return isValid;
    };

    // ✅ Formu ve düzenleme state'lerini sıfırlama işlevi
    const resetFormAndState = () => {
        setNewNetworkData({
            title: '',
            description: '',
            workId: workId ? parseInt(workId) : 0,
        });
        setEditingId(null);
        setOriginalTitle('');
        // setOriginalDescription('');
        setTitleError(false);
        setDescriptionError(false);
        setFormErrors(null);
    };

    // ✅ Yeni Şebekeler Ekleme İşlevi (ListUnit.tsx'deki insertUnit gibi)
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
                // tenderId artık payload'a dahil edilmiyor
            };
            console.log("Yeni Şebekeler için Payload:", payload);

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
                showAlert('Yeni Şebekeler başarıyla eklendi!', 'success');
                resetFormAndState();
                fetchNetworksByWorkId();
            } else {
                showAlert(response.data.message || 'Yeni Şebekeler eklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                console.error("Yeni Şebekeler oluşturulurken hata:", e);
                showAlert(e.response?.data?.message || 'Şebekeler eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
            }
        } finally {
            setLoadingButton(false);
        }
    };

    // ✅ Şebekeler Güncelleme İşlevi (ListUnit.tsx'deki editUnit gibi)
    const editNetwork = async () => {
        if (editingId === null) return; // Düzenleme modunda değilsek çık

        if (!validateForm()) { // Formu doğrula
            return;
        }

        // Eğer hiçbir değişiklik yapılmamışsa
        if (newNetworkData.title === originalTitle) {
            showAlert('Şebekeler bilgilerinde herhangi bir değişiklik yapmadınız.', 'info');
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
        debugger

        try {
            const payload = {
                id: Number(editingId), // Düzenlenen ağın ID'si
                title: newNetworkData.title,
                description: newNetworkData.description,
                // workId burada da gönderilebilir eğer API bekliyorsa, aksi halde gereksizdir
                workId: newNetworkData.workId,
            };
            console.log("Şebekeler güncelleniyor, Payload:", payload);

            const response = await axios.put(
                server.baseurl + server.initialoperations + "update-network", // Güncelleme API endpointi
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
                showAlert('Şebekeler başarıyla güncellendi!', 'success');
                resetFormAndState();
                fetchNetworksByWorkId(); // Şebekeler listesini yenile
            } else {
                showAlert(response.data.message || 'Şebekeler güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                console.error("Şebekeler güncellenirken hata:", e);
                showAlert(e.response?.data?.message || 'Şebekeler güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
            }
        } finally {
            setLoadingButton(false);
        }
    };


    // --- Menu operation handlers ---
    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: NetworkType) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowForMenu(row);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };

    // Durum güncelleme işlevi
    const sendRecordStatusUpdate = async (id: string, statusValue: number) => {
        const authToken = localStorage.getItem('authToken');

        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            navigate("/");
            return;
        }
        debugger
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
                showAlert(`Şebekeler başarıyla ${statusText} olarak ayarlandı!`, 'success');
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
                console.error("Durum güncellenirken hata oluştu:", e);
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

    // ✅ handleEditClick işlevi: Seçili ağın bilgilerini forma doldurur
    const handleEditClick = () => {
        if (selectedRowForMenu) {
            setNewNetworkData({
                title: selectedRowForMenu.name,
                description: selectedRowForMenu.description,
                workId: workId ? parseInt(workId) : 0,
            });
            setEditingId(selectedRowForMenu.id);
            setOriginalTitle(selectedRowForMenu.name);
            // setOriginalDescription(selectedRowForMenu.description);

            // Hata state'lerini temizle
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

    // ✅ Delete Modal'ı açma işlevi (ListUnit'teki handleClickOpenDeleteModal gibi)
    const handleClickOpenDeleteModal = () => {
        if (selectedRowForMenu) {
            setNetworkIdToDelete(selectedRowForMenu.id);
            setNetworkTitleToDelete(selectedRowForMenu.name); // Modalda göstermek için başlığı ayarla
            setOpenDeleteModal(true);
        }
        handleCloseMenu();
    };

    // ✅ Delete Modal'ı kapatma işlevi (ListUnit'teki handleClickCloseDeleteModal gibi)
    const handleClickCloseDeleteModal = () => {
        setOpenDeleteModal(false);
        setNetworkIdToDelete(null);
        setNetworkTitleToDelete('');
        fetchNetworksByWorkId(); // Silme sonrası listeyi yenile
    };

    const handleViewNetworkDetails = (networkId: string) => {
        navigate(`/network/${networkId}/details`);
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
                <Typography variant="h6" color="textSecondary" sx={{ mt: 2 }}>Şebekeler yükleniyor...</Typography>
            </Stack>
        );
    }

    return (
        <div>
            {/* Başlık ve Geri Dön butonu */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h4" gutterBottom>
                    İhale: <span style={{ color: '#007bff' }}>{tenderTitleForDisplay}</span> içindeki İş: <span style={{ color: '#28a745' }}>{workTitleForDisplay}</span>
                </Typography>
                {/* <CustomTooltip title={isTooltipGloballyEnabled ? "Work listesine geri dön" : ""}>
                    <Button onClick={() => navigate(-1)} variant="outlined">
                        Work Listesine Geri Dön
                    </Button>
                </CustomTooltip> */}
            </Box>


            <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider", mb: 2, mt: 2 }}>
                <Typography variant="h5" mb={2}>{editingId ? 'Şebekelerı Düzenle' : 'Yeni Şebekeler Kaydı'}</Typography> {/* Başlığı dinamik hale getirdik */}
                <form> {/* Formun onSubmit'i artık doğrudan insertNetwork veya editNetwork'ü çağırmıyor */}
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <CustomFormLabel htmlFor="network-name">Şebekeler Adı:</CustomFormLabel>
                            <CustomTextField
                                id="network-name"
                                name="title"
                                placeholder="Şebekeler Adı"
                                fullWidth
                                value={newNetworkData.title}
                                onChange={handleNetworkNameChange}
                                required
                                size="small"
                                sx={{ mb: 1 }}
                                inputRef={networkTitleInputRef}
                                error={titleError}
                                helperText={titleError ? "Şebekeler adı boş olamaz!" : ""}
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
                        <Grid item xs={12} sx={{ mt: 2 }}>
                            <input type="hidden" name="workId" value={newNetworkData.workId} />
                            {editingId ? ( // Düzenleme modundaysa Güncelle düğmesi
                                <CustomTooltip title={isTooltipGloballyEnabled ? "Şebekeleri güncelle" : ""}>
                                    <Button
                                        variant="contained"
                                        color="info" // Düzenleme için farklı renk
                                        onClick={editNetwork} // editNetwork'ü çağır
                                        disabled={loadingButton}
                                    >
                                        {loadingButton ? <CircularProgress size={24} color="inherit" /> : 'Şebekeleri Güncelle'}
                                    </Button>
                                </CustomTooltip>
                            ) : ( // Yeni kayıt modundaysa Ekle düğmesi
                                <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Şebekeleri kaydet" : ""}>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={insertNetwork} // insertNetwork'ü çağır
                                        disabled={loadingButton}
                                    >
                                        {loadingButton ? <CircularProgress size={24} color="inherit" /> : 'Şebekeler Ekle'}
                                    </Button>
                                </CustomTooltip>
                            )}
                            {editingId && ( // Düzenleme modundaysa İptal düğmesi
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
                            )}
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
                <Typography variant="h5" mb={2}>Mevcut Şebekeler</Typography>
                <Grid container spacing={2} alignItems="center" mb={2}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            label="Şebekeler Ara"
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
                            <StyledToggleButton value="all" aria-label="Tüm Şebekeler">
                                Tümü
                            </StyledToggleButton>
                            <StyledToggleButton value="active" aria-label="Aktif Şebekeler">
                                Aktif
                            </StyledToggleButton>
                            <StyledToggleButton value="inactive" aria-label="Pasif Şebekeler">
                                Pasif
                            </StyledToggleButton>
                        </ToggleButtonGroup>
                    </Grid>
                </Grid>

                <TableContainer>
                    <Table aria-label="Şebekeler tablosu">
                        <TableHead style={{ background: "#f1f1f1" }}>
                            <TableRow>
                                <TableCell><Typography variant="h6">Şebekeler Adı</Typography></TableCell>
                                <TableCell><Typography variant="h6">Açıklama</Typography></TableCell>
                                <TableCell><Typography variant="h6">Kayıt Tarihi</Typography></TableCell>
                                <TableCell><Typography variant="h6">Durum</Typography></TableCell>
                                <TableCell><Typography variant="h6">Detaylar</Typography></TableCell>
                                <TableCell></TableCell> {/* Menü işlem başlığı */}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedNetworks.length > 0 ? (
                                paginatedNetworks.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell><Typography variant="h6">{row.name}</Typography></TableCell>
                                        <TableCell><Typography variant="h6" dangerouslySetInnerHTML={{ __html: row.description }}></Typography></TableCell>
                                        <TableCell><Typography variant="h6">{format(new Date(row.createAt), 'yyyy/MM/dd')}</Typography></TableCell>
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
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Şebekeler detaylarını görüntüle" : ""}>
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
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Şebekeleri pasif yap" : ""}>
                                                        <MenuItem onClick={handleSetInactive}>
                                                            <ListItemIcon>
                                                                <DoNotDisturbOnRoundedIcon width={18} />
                                                            </ListItemIcon>
                                                            Pasif Yap
                                                        </MenuItem>
                                                    </CustomTooltip>
                                                ) : (
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Şebekeleri aktif yap" : ""}>
                                                        <MenuItem onClick={handleSetActive}>
                                                            <ListItemIcon>
                                                                <DoneRoundedIcon width={18} />
                                                            </ListItemIcon>
                                                            Aktif Yap
                                                        </MenuItem>
                                                    </CustomTooltip>
                                                )}

                                                <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Şebekeleri düzenle" : ""}>
                                                    <MenuItem onClick={handleEditClick}>
                                                        <ListItemIcon>
                                                            <IconEdit width={18} />
                                                        </ListItemIcon>
                                                        Düzenlemek
                                                    </MenuItem>
                                                </CustomTooltip>
                                                <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Şebekeleri sil" : ""}>
                                                    <MenuItem onClick={handleClickOpenDeleteModal}> {/* Modalı aç */}
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
                                            Bu iş için hiç Şebekeler bulunamadı.
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

            {/* ✅ DeleteNetwork modalı burada render ediliyor (ListUnit'teki DeleteUnit gibi) */}
            <DeleteNetwork
                openModal={openDeleteModal}
                onClose={handleClickCloseDeleteModal}
                networkIdToDelete={networkIdToDelete}
                networkTitleToDelete={networkTitleToDelete} // Modala başlık da gönderiliyor
                showAlert={showAlert} // showAlert fonksiyonu modala gönderiliyor
                onDeleteSuccess={() => fetchNetworksByWorkId()} // Silme sonrası listeyi yenileme işlevi
            />
        </div>
    );
};

export default ListNetwork;