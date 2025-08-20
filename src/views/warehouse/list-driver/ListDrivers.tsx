import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    Typography, Menu, MenuItem, IconButton, ListItemIcon, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    CircularProgress, Paper, ToggleButtonGroup, ToggleButton as MuiToggleButton,
    TableSortLabel, Chip,
} from '@mui/material';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import { styled } from '@mui/material/styles';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import { IconDots, IconEdit, IconTrash, IconSearch, IconPlus } from '@tabler/icons-react';
import axios from 'axios';
import server from '../../../assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { RadioGroup, FormControlLabel, Radio } from '@mui/material';
import DeleteDriver from "./DeleteDriver";
import CarDetailsModal from "./CarDetailsModal";

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

interface internal {
    id: number;
    name: string;
    family: string;
    birthdate: string;
    fatherName: string;
    identityNo: string;
    internal: string;
    recordStatus: number;
    createAt: string;
    status: string;
}

type SortableDriverKeys = keyof Pick<internal, 'name' | 'family' | 'identityNo' | 'createAt' | 'recordStatus'>;

const descendingComparator = <T, Key extends keyof T>(a: T, b: T, orderBy: Key): number => {
    const valA = a[orderBy];
    const valB = b[orderBy];
    if (valB === undefined || valB === null) { return (valA === undefined || valA === null) ? 0 : -1; }
    if (valA === undefined || valA === null) { return 1; }
    if (typeof valB === 'string' && typeof valA === 'string') { return valB.localeCompare(valA); }
    if (typeof valB === 'number' && typeof valA === 'number') { return valB - valA; }
    if (String(valB) < String(valA)) { return -1; }
    if (String(valB) > String(valA)) { return 1; }
    return 0;
};

const getComparator = (order: 'asc' | 'desc', orderBy: SortableDriverKeys): (a: internal, b: internal) => number => {
    return order === 'desc' ? (a, b) => descendingComparator(a, b, orderBy) : (a, b) => -descendingComparator(a, b, orderBy);
};

const stableSort = <T,>(array: T[], comparator: (a: T, b: T) => number) => {
    const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
    stabilizedThis.sort((a, b) => {
        const order = comparator(a[0], b[0]);
        if (order !== 0) return order;
        return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
};

const StyledToggleButton = styled(MuiToggleButton)(({ theme, value, selected }) => ({
    '&.Mui-selected': {
        color: 'white',
        ...(value === 'all' && selected && { backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } }),
        ...(value === 'active' && selected && { backgroundColor: theme.palette.success.main, '&:hover': { backgroundColor: theme.palette.success.dark } }),
        ...(value === 'inactive' && selected && { backgroundColor: theme.palette.error.main, '&:hover': { backgroundColor: theme.palette.error.dark } }),
    },
    '&:not(.Mui-selected)': {
        color: theme.palette.text.primary,
        borderColor: theme.palette.divider,
        '&:hover': { backgroundColor: theme.palette.action.hover },
    },
}));

const ListDrivers = () => {
    const navigate = useNavigate();

    // Form States
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [birthdate, setBirthDate] = useState<Date | null>(new Date());
    const [fatherName, setFatherName] = useState('');
    const [identityNo, setNationalCode] = useState('');
    const [internal, setDriverType] = useState<string>('1');
    const [editingId, setEditingId] = useState<number | null>(null);

    // Validation States
    const [firstNameError, setFirstNameError] = useState(false);
    const [lastNameError, setLastNameError] = useState(false);
    const [birthDateError, setBirthDateError] = useState(false);
    const [fatherNameError, setFatherNameError] = useState(false);
    const [nationalCodeError, setNationalCodeError] = useState(false);

    // Data and UI States
    const [driversList, setDriversList] = useState<internal[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [loadingButton, setLoadingButton] = useState(false);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    // Table States
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [orderBy, setOrderBy] = useState<SortableDriverKeys>('createAt');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<internal | null>(null);

    // Dialog/Modal States
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [driverToDelete, setDriverToDelete] = useState<internal | null>(null);
    const { isTooltipGloballyEnabled } = useTooltip();
    const firstNameInputRef = useRef<HTMLInputElement>(null);

    const [openCarDetailsModal, setOpenCarDetailsModal] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState<internal | null>(null);

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
        return () => { clearTimeout(timer); };
    }, [alertMessage]);

    const fetchDrivers = useCallback(async () => {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); setLoadingData(false); return; }
        debugger
        try {
            const response = await axios.get(server.baseurl + server.warehouse + "get-drivers", {
                headers: { "Authorization": `Bearer ${authToken}` }
            });
            debugger
            if (response.data.httpStatusCode === 200) {
                const allDrivers = response.data.data as internal[];
                const driversWithStatus = allDrivers.map((item) => ({
                    ...item,
                    status: item.recordStatus === 0 ? 'Aktif' : 'Pasif',
                    internal: item.internal ? '1' : '0'
                }));
                setDriversList(driversWithStatus);
            } else {
                showAlert(response.data.message || 'Sürücüler yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert('Sürücüler yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchDrivers();
    }, [fetchDrivers]);

    const resetFormAndState = () => {
        setFirstName('');
        setLastName('');
        setBirthDate(new Date());
        setFatherName('');
        setNationalCode('');
        setDriverType('1');
        setEditingId(null);
        setFirstNameError(false);
        setLastNameError(false);
        setBirthDateError(false);
        setFatherNameError(false);
        setNationalCodeError(false);
    };

    const validateForm = (): boolean => {
        let isValid = true;
        if (!firstName.trim()) { setFirstNameError(true); isValid = false; } else { setFirstNameError(false); }
        if (!lastName.trim()) { setLastNameError(true); isValid = false; } else { setLastNameError(false); }
        if (!birthdate) { setBirthDateError(true); isValid = false; } else { setBirthDateError(false); }
        if (!fatherName.trim()) { setFatherNameError(true); isValid = false; } else { setFatherNameError(false); }
        if (!identityNo.trim()) { setNationalCodeError(true); isValid = false; } else { setNationalCodeError(false); }

        if (!isValid) { showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning'); }
        return isValid;
    };


    const insertDriver = async () => {
        if (!validateForm()) return;
        setLoadingButton(true);

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            return;
        }
        debugger
        const payload = {
            name: firstName,
            family: lastName,
            birthdate: birthdate ? birthdate.toISOString() : null,
            fatherName,
            identityNo,
            internal: internal == "0" ? false : true
        };
        try {
            const response = await axios.post(
                server.baseurl + server.warehouse + "create-driver",
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
                showAlert(`Sürücü başarıyla eklendi'}!`, 'success');
                resetFormAndState();
                fetchDrivers();
            } else {
                showAlert(response.data.message || 'İşlem sırasında bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            }
            showAlert(e.response?.data?.message || 'İşlem sırasında bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };
    const editDriver = async () => {
        if (!validateForm()) return;
        setLoadingButton(true);

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            return;
        }
        const payload = {
            id: Number(editingId),
            name: firstName,
            family: lastName,
            birthdate: birthdate ? birthdate.toISOString() : null,
            fatherName,
            identityNo,
            internal: internal == "0" ? false : true
        };
        debugger
        try {
            const response = await axios.put(
                server.baseurl + server.warehouse + "update-driver",
                payload,
                {
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            if (response.data.httpStatusCode === 200) {
                showAlert('Direk başarıyla güncellendi!', 'success');
                resetFormAndState();
                fetchDrivers();
            } else {
                showAlert(response.data.message || 'İşlem sırasında bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            }
            showAlert(e.response?.data?.message || 'İşlem sırasında bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally {
            setLoadingButton(false);
        }
    }

    const handleCancelEdit = () => {
        resetFormAndState();
        clearAlert();
    };

    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: internal) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowForMenu(row);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };

    const handleEditClick = () => {
        if (selectedRowForMenu) {
            setFirstName(selectedRowForMenu.name);
            setLastName(selectedRowForMenu.family);
            setBirthDate(selectedRowForMenu.birthdate ? new Date(selectedRowForMenu.birthdate) : null);
            setFatherName(selectedRowForMenu.fatherName);
            setNationalCode(selectedRowForMenu.identityNo);
            setDriverType(selectedRowForMenu.internal);
            setEditingId(selectedRowForMenu.id);
            setTimeout(() => {
                firstNameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstNameInputRef.current?.focus();
            }, 100);
        }
        handleCloseMenu();
    };

    // تابع اصلاح‌شده برای باز کردن مودال حذف
    const handleClickOpenDeleteModal = () => {
        if (selectedRowForMenu) {
            setDriverToDelete(selectedRowForMenu);
            setOpenDeleteModal(true);
        }
        handleCloseMenu();
    };

    // تابع اصلاح‌شده برای مدیریت بسته شدن مودال حذف
    const handleCloseDeleteModal = () => {
        setOpenDeleteModal(false);
        setDriverToDelete(null);
        fetchDrivers();
    };

    const handleClickOpenCarDetailsModal = (driver: internal) => {
        debugger
        setSelectedDriver(driver);
        setOpenCarDetailsModal(true);
    };

    const sendStatusUpdate = async (id: number, statusValue: number) => {
        clearAlert();
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Lütfen giriş yapın.', 'warning'); navigate("/"); return; }
        try {
            const response = await axios.put(
                server.baseurl + server.warehouse + "update-driver",
                { id: Number(id), recordStatus: statusValue },
                { headers: { "Authorization": `Bearer ${authToken}`, 'Content-Type': 'application/json' } }
            );
            if (response.data.httpStatusCode === 200) {
                const statusText = statusValue === 0 ? 'Aktif' : 'Pasif';
                showAlert(`Sürücü başarıyla ${statusText} olarak ayarlandı!`, 'success');
                fetchDrivers();
            } else {
                showAlert(response.data.message || 'Durum güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            }
            showAlert(e.response?.data?.message || 'Durum güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally {
            handleCloseMenu();
        }
    };
    const handleSetActive = () => { if (selectedRowForMenu) sendStatusUpdate(selectedRowForMenu.id, 0); };
    const handleSetInactive = () => { if (selectedRowForMenu) sendStatusUpdate(selectedRowForMenu.id, 1); };

    const handleChangePage = (_event: unknown, newPage: number) => { setPage(newPage); };
    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };
    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
        setPage(0);
    };
    const handleStatusFilterChange = (_event: React.MouseEvent<HTMLElement>, newFilter: 'all' | 'active' | 'inactive' | null) => {
        if (newFilter !== null) {
            setStatusFilter(newFilter);
            setPage(0);
        }
    };
    const handleRequestSort = (property: SortableDriverKeys) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
        setPage(0);
    };

    const filteredDrivers = useMemo(() => {
        return driversList.filter(d => {
            const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.family.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active' && d.recordStatus === 0) ||
                (statusFilter === 'inactive' && d.recordStatus === 1);
            return matchesSearch && matchesStatus;
        });
    }, [driversList, searchTerm, statusFilter]);

    const sortedAndFilteredDrivers = useMemo(() => {
        return stableSort(filteredDrivers, getComparator(order, orderBy));
    }, [filteredDrivers, order, orderBy]);

    const paginatedDrivers = sortedAndFilteredDrivers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
        <>
            <div style={{ borderBottom: "1px solid", margin: "10px 0 30px 0", padding: "10px 15px 30px 15px" }}>
                <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h5" mb={2}>{editingId ? 'Sürücüyü Düzenle' : 'Yeni Sürücü Kaydı'}</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                            <CustomFormLabel htmlFor="driver-firstName" required>İsim</CustomFormLabel>
                            <CustomTextField
                                id="driver-firstName"
                                fullWidth
                                value={firstName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setFirstName(e.target.value); if (firstNameError) setFirstNameError(false); }}
                                inputRef={firstNameInputRef}
                                error={firstNameError}
                                helperText={firstNameError ? "İsim alanı boş bırakılamaz!" : ""}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <CustomFormLabel htmlFor="driver-lastName" required>Soyadı</CustomFormLabel>
                            <CustomTextField
                                id="driver-lastName"
                                fullWidth
                                value={lastName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setLastName(e.target.value); if (lastNameError) setLastNameError(false); }}
                                error={lastNameError}
                                helperText={lastNameError ? "Soyadı alanı boş bırakılamaz!" : ""}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <CustomFormLabel htmlFor="start-date" required>
                                Doğum Tarihi
                            </CustomFormLabel>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <DatePicker
                                    label=""
                                    value={birthdate}
                                    onChange={(newValue) => {
                                        setBirthDate(newValue);
                                        if (birthDateError && newValue) setBirthDateError(false);
                                    }}
                                    inputFormat="dd/MM/yyyy"
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            fullWidth
                                            error={birthDateError}
                                            helperText={birthDateError ? "Başlangıç tarihi boş olamaz!" : ""}
                                        />
                                    )}
                                />
                            </LocalizationProvider>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <CustomFormLabel htmlFor="driver-fatherName" required>Baba Adı</CustomFormLabel>
                            <CustomTextField
                                id="driver-fatherName"
                                fullWidth
                                value={fatherName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setFatherName(e.target.value); if (fatherNameError) setFatherNameError(false); }}
                                error={fatherNameError}
                                helperText={fatherNameError ? "Baba adı alanı boş bırakılamaz!" : ""}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <CustomFormLabel htmlFor="driver-identityNo" required>TC</CustomFormLabel>
                            <CustomTextField
                                id="driver-identityNo"
                                fullWidth
                                value={identityNo}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setNationalCode(e.target.value); if (nationalCodeError) setNationalCodeError(false); }}
                                error={nationalCodeError}
                                helperText={nationalCodeError ? "TC boş bırakılamaz!" : ""}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <CustomFormLabel required>Setaş Sürücüsü mü?  </CustomFormLabel>
                            <RadioGroup
                                row
                                value={internal}
                                onChange={(e) => setDriverType(e.target.value)}
                            >
                                <FormControlLabel value="1" control={<Radio />} label="Evet" />
                                <FormControlLabel value="0" control={<Radio />} label="Hayır" />
                            </RadioGroup>
                        </Grid>
                        <Grid item xs={12}>
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                {editingId !== null ? (
                                    <>
                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Seçili sürücüyü güncelleyin" : ""}>
                                            <Button variant="contained" color="info" onClick={editDriver} disabled={loadingButton}>
                                                {loadingButton ? <><CircularProgress size={20} /><Box component="span" ml={1}>Bekleniyor...</Box></> : 'Düzenle'}
                                            </Button>
                                        </CustomTooltip>
                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Güncellemeyi iptal et" : ""}>
                                            <Button variant="outlined" color="secondary" onClick={handleCancelEdit}>İptal Et</Button>
                                        </CustomTooltip>
                                    </>
                                ) : (
                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni bir sürücü ekle" : ""}>
                                        <Button variant="contained" color="success" onClick={insertDriver} disabled={loadingButton}>
                                            {loadingButton ? <><CircularProgress size={20} /><Box component="span" ml={1}>Bekleniyor...</Box></> : 'Yeni Sürücü Ekle'}
                                        </Button>
                                    </CustomTooltip>
                                )}
                            </Stack>
                        </Grid>
                    </Grid>
                    {alertMessage && (
                        <Stack sx={{ width: '100%', mt: 2 }} spacing={2}>
                            <Alert severity={alertSeverity}>{alertMessage}</Alert>
                        </Stack>
                    )}
                </Paper>
            </div>

            <BlankCard>
                <Box sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={8}>
                            <TextField
                                label="Sürücü Ara"
                                variant="outlined"
                                fullWidth
                                value={searchTerm}
                                onChange={handleSearchChange}
                                InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <ToggleButtonGroup
                                value={statusFilter}
                                exclusive
                                onChange={handleStatusFilterChange}
                                aria-label="Status filter"
                                fullWidth
                            >
                                <StyledToggleButton value="all" aria-label="Tüm Sürücüler">Tümü</StyledToggleButton>
                                <StyledToggleButton value="active" aria-label="Aktif Sürücüler">Aktif</StyledToggleButton>
                                <StyledToggleButton value="inactive" aria-label="Pasif Sürücüler">Pasif</StyledToggleButton>
                            </ToggleButtonGroup>
                        </Grid>
                    </Grid>
                </Box>
                {loadingData ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                        <CircularProgress />
                        <Typography variant="h6" sx={{ ml: 2 }}>Sürücüler yükleniyor...</Typography>
                    </Box>
                ) : (
                    <TableContainer>
                        <Table aria-label="Sürücü tablosu">
                            <TableHead style={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>
                                    <TableCell>
                                        <TableSortLabel active={orderBy === 'name'} direction={orderBy === 'name' ? order : 'asc'} onClick={() => handleRequestSort('name')} style={{ color: "#171c23" }}><Typography variant="h6">Adı</Typography></TableSortLabel>
                                    </TableCell>
                                    <TableCell>
                                        <TableSortLabel active={orderBy === 'family'} direction={orderBy === 'family' ? order : 'asc'} onClick={() => handleRequestSort('family')} style={{ color: "#171c23" }}><Typography variant="h6">Soyadı</Typography></TableSortLabel>
                                    </TableCell>
                                    <TableCell><Typography variant="h6">Doğum Tarihi</Typography></TableCell>
                                    <TableCell><Typography variant="h6">Baba Adı</Typography></TableCell>
                                    <TableCell>
                                        <TableSortLabel active={orderBy === 'identityNo'} direction={orderBy === 'identityNo' ? order : 'asc'} onClick={() => handleRequestSort('identityNo')} style={{ color: "#171c23" }}><Typography variant="h6">Ulusal Kimlik Numarası</Typography></TableSortLabel>
                                    </TableCell>
                                    <TableCell><Typography variant="h6">Sürücü Tipi</Typography></TableCell>
                                    {/* <TableCell>
                                        <TableSortLabel active={orderBy === 'createAt'} direction={orderBy === 'createAt' ? order : 'asc'} onClick={() => handleRequestSort('createAt')} style={{ color: "#171c23" }}><Typography variant="h6">Oluşturulma Tarihi</Typography></TableSortLabel>
                                    </TableCell> */}
                                    <TableCell>
                                        <TableSortLabel active={orderBy === 'recordStatus'} direction={orderBy === 'recordStatus' ? order : 'asc'} onClick={() => handleRequestSort('recordStatus')} style={{ color: "#171c23" }}><Typography variant="h6">Durum</Typography></TableSortLabel>
                                    </TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedDrivers.length > 0 ? (
                                    paginatedDrivers.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell><Typography variant="h6">{row.name}</Typography></TableCell>
                                            <TableCell><Typography variant="h6">{row.family}</Typography></TableCell>
                                            <TableCell><Typography variant="h6">{formatDateDisplay(row.birthdate)}</Typography></TableCell>
                                            <TableCell><Typography variant="h6">{row.fatherName}</Typography></TableCell>
                                            <TableCell><Typography variant="h6">{row.identityNo}</Typography></TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={row.internal === '1' ? 'Şirket İçi' : 'Şirket Dışı'}
                                                    color={row.internal === '1' ? 'primary' : 'secondary'}
                                                />
                                            </TableCell>
                                            {/* <TableCell><Typography variant="h6">{formatDateDisplay(row.createAt)}</Typography></TableCell> */}
                                            <TableCell>
                                                <Chip
                                                    label={row.status}
                                                    sx={{ backgroundColor: row.recordStatus === 0 ? 'success.light' : 'error.light', color: row.recordStatus === 0 ? 'success.main' : 'error.main' }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Daha fazla seçenek" : ""}>
                                                    <IconButton id={`basic-button-${row.id}`} aria-controls={Boolean(anchorEl) ? 'basic-menu' : undefined} aria-haspopup="true" aria-expanded={Boolean(anchorEl) ? 'true' : undefined} onClick={(event) => handleClickMenu(event, row)}>
                                                        <IconDots width={18} />
                                                    </IconButton>
                                                </CustomTooltip>
                                                <Menu
                                                    id="basic-menu"
                                                    anchorEl={anchorEl}
                                                    open={Boolean(anchorEl)}
                                                    onClose={handleCloseMenu}
                                                    MenuListProps={{ 'aria-labelledby': `basic-button-${selectedRowForMenu?.id}` }}
                                                >
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Sürücü için araç detaylarını kaydet" : ""}>
                                                        <MenuItem onClick={() => {
                                                            handleClickOpenCarDetailsModal(selectedRowForMenu!);
                                                            handleCloseMenu();
                                                        }}>
                                                            <ListItemIcon><IconPlus width={18} /></ListItemIcon>Ayrıntıları Kaydet
                                                        </MenuItem>
                                                    </CustomTooltip>
                                                    {selectedRowForMenu?.recordStatus === 0 ? (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu sürücüyü pasif yap" : ""}>
                                                            <MenuItem onClick={handleSetInactive}><ListItemIcon><DoNotDisturbOnRoundedIcon width={18} /></ListItemIcon>Pasif Yap</MenuItem>
                                                        </CustomTooltip>
                                                    ) : (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu sürücüyü aktif yap" : ""}>
                                                            <MenuItem onClick={handleSetActive}><ListItemIcon><DoneRoundedIcon width={18} /></ListItemIcon>Aktif Yap</MenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu sürücüyü düzenle" : ""}>
                                                        <MenuItem onClick={handleEditClick}><ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenle</MenuItem>
                                                    </CustomTooltip>
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu sürücüyü sil" : ""}>
                                                        <MenuItem onClick={handleClickOpenDeleteModal}><ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek</MenuItem>
                                                    </CustomTooltip>
                                                </Menu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">Hiç sürücü bulunamadı.</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={filteredDrivers.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Satır başına düşen:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
                />
            </BlankCard>
            {driverToDelete && (
                <DeleteDriver
                    openModal={openDeleteModal}
                    driverIdToDelete={Number(driverToDelete.id)}
                    driverNameToDelete={`${driverToDelete.name} ${driverToDelete.family}`}
                    onClose={handleCloseDeleteModal}
                    onDeleteSuccess={fetchDrivers} // از fetchDrivers به جای یک تابع جداگانه استفاده کنید
                    showAlert={showAlert}
                />
            )}

            <CarDetailsModal
                open={openCarDetailsModal}
                onClose={() => setOpenCarDetailsModal(false)}
                driverId={selectedDriver?.id || null}
                driverName={selectedDriver?.name ? `${selectedDriver.name} ${selectedDriver.family}` : ''}
            />
        </>
    );
};

export default ListDrivers;