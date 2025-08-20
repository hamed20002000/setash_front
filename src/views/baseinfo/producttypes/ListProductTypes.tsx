// ListProductTypes.tsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    Typography, Chip, Menu, MenuItem, IconButton, ListItemIcon, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    ToggleButtonGroup, ToggleButton as MuiToggleButton,
    TableSortLabel, Radio, RadioGroup, FormControlLabel, CircularProgress
} from '@mui/material';
import { styled } from '@mui/material/styles';
import BoltIcon from '@mui/icons-material/Bolt';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import { IconDots, IconEdit, IconTrash, IconSearch } from '@tabler/icons-react';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import DeleteProductTypes from './DeleteProductType';
import axios from 'axios';
import server from '../../../assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

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

interface ProductTypesType {
    id: number;
    name: string;
    createAt: string;
    recordStatus?: number;
    status: string;
    type: number; // New field for type
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

const MOCK_UNITS: ProductTypesType[] = [];
const descendingComparator = <T, Key extends keyof T>(
    a: T,
    b: T,
    orderBy: Key,
): number => {
    const valA = a[orderBy];
    const valB = b[orderBy];
    if (valB === undefined || valB === null) {
        return valA === undefined || valA === null ? 0 : -1;
    }
    if (valA === undefined || valA === null) {
        return 1;
    }
    if (typeof valB === 'string' && typeof valA === 'string') {
        return valB.localeCompare(valA);
    }
    if (typeof valB === 'number' && typeof valA === 'number') {
        return valB - valA;
    }
    if (String(valB) < String(valA)) {
        return -1;
    }
    if (String(valB) > String(valA)) {
        return 1;
    }
    return 0;
};
const getComparator = <Key extends keyof ProductTypesType>(
    order: 'asc' | 'desc',
    orderBy: Key,
): (a: ProductTypesType, b: ProductTypesType) => number => {
    return order === 'desc'
        ? (a, b) => descendingComparator(a, b, orderBy)
        : (a, b) => -descendingComparator(a, b, orderBy);
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
const ListProductTypes = () => {
    const navigate = useNavigate();
    const [name, setName] = useState<string>('');
    const [productType, setProductType] = useState<number>(0); // New state for type: 0 (Trafo) or 1 (Direk)
    const [ProductTypesList, setProductTypesList] = useState<ProductTypesType[]>(MOCK_UNITS);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [originalName, setOriginalName] = useState<string>('');
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<ProductTypesType | null>(null);
    const openMenu = Boolean(anchorEl);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [ProductTypesIdToDelete, setProductTypesIdToDelete] = useState<number | null>(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [loadingData, setLoadingData] = useState<boolean>(true);
    const { isTooltipGloballyEnabled } = useTooltip();
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [orderBy, setOrderBy] = useState<keyof ProductTypesType>('createAt');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const ProductTypesNameInputRef = useRef<HTMLInputElement>(null);
    const [nameError, setNameError] = useState<boolean>(false);
    const [nameHelperText, setNameHelperText] = useState<string>('');
    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: ProductTypesType) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowForMenu(row);
    };
    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };
    const handleClickOpenDeleteModal = () => {
        if (selectedRowForMenu) {
            setProductTypesIdToDelete(selectedRowForMenu.id);
            setOpenDeleteModal(true);
        }
        handleCloseMenu();
    };
    const handleClickCloseDeleteModal = () => {
        setOpenDeleteModal(false);
        setProductTypesIdToDelete(null);
        getListProductTypes();
    };
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

    const handleEditClick = () => {
        if (selectedRowForMenu) {
            setName(selectedRowForMenu.name);
            setOriginalName(selectedRowForMenu.name);
            setEditingId(selectedRowForMenu.id);
            setProductType(selectedRowForMenu.type); // Set the type
            setNameError(false);
            setNameHelperText('');
            setTimeout(() => {
                ProductTypesNameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                ProductTypesNameInputRef.current?.focus();
            }, 100);
        }
        handleCloseMenu();
        clearAlert();
    };
    const handleCancelEdit = () => {
        resetFormAndState();
        clearAlert();
        setNameError(false);
        setNameHelperText('');
    };
    const insertProductTypes = async () => {
        if (!name.trim()) {
            setNameError(true);
            setNameHelperText('İsim boş olamaz!');
            showAlert('İsim boş olamaz!', 'warning');
            return;
        }
        const isNameDuplicate = ProductTypesList.some(
            (type) => type.name.trim().toLowerCase() === name.trim().toLowerCase() && type.type === productType
        );

        if (isNameDuplicate) {
            setNameError(true);
            setNameHelperText('Bu isimde bir tür zaten var. Lütfen farklı bir ad girin.');
            showAlert('Bu isimde bir tür zaten var. Lütfen farklı bir ad girin.', 'warning');
            return;
        }
        setNameError(false);
        setNameHelperText('');
        clearAlert();
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            return;
        }
        setLoadingButton(true);
        try {
            const response = await axios.post(
                server.baseurl + server.initialoperations + "create-product-type",
                { name: name, type: productType },
                {
                    headers: {
                        "Accept": "application/json",
                        'Content-Type': 'application/json',
                        "Authorization": `Bearer ${authToken}`
                    }
                }
            );
            if (response.data.httpStatusCode === 201) {
                showAlert('Yeni Direk başarıyla eklendi!', 'success');
                resetFormAndState();
                getListProductTypes();
            } else {
                showAlert(response.data.message || 'Yeni Direk eklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            }
            showAlert(e.response?.data?.message || 'Direk eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };
    const editProductTypes = async () => {
        if (editingId === null) return;
        if (!name.trim()) {
            setNameError(true);
            setNameHelperText('İsim boş olamaz!');
            showAlert('İsim boş olamaz!', 'warning');
            return;
        }
        const isNameDuplicate = ProductTypesList.some(
            (type) => type.name.trim().toLowerCase() === name.trim().toLowerCase() && type.id !== editingId && type.type === productType
        );

        if (isNameDuplicate) {
            setNameError(true);
            setNameHelperText('Bu isimde bir tür zaten var. Lütfen farklı bir ad girin.');
            showAlert('Bu isimde bir tür zaten var. Lütfen farklı bir ad girin.', 'warning');
            return;
        }
        setNameError(false);
        setNameHelperText('');
        clearAlert();
        const currentProductType = ProductTypesList.find(pt => pt.id === editingId)?.type;
        if (name === originalName && productType === currentProductType) {
            showAlert('İsim ve tipte herhangi bir değişiklik yapmadınız.', 'info');
            resetFormAndState();
            return;
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            navigate("/");
            return;
        }
        setLoadingButton(true);
        try {
            const response = await axios.put(
                server.baseurl + server.initialoperations + "update-product-type",
                { id: Number(editingId), name: name, type: productType },
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
                setProductTypesList(prevList =>
                    prevList.map(op => (op.id === editingId ? { ...op, name: name, type: productType } : op))
                );
                resetFormAndState();
                getListProductTypes();
            } else {
                showAlert(response.data.message || 'Direk güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            }
            showAlert(e.response?.data?.message || 'Direk güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally {
            setLoadingButton(false);
        }
    }

    const sendStatusUpdate = async (id: number, statusValue: number) => {
        clearAlert();
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            navigate("/");
            return;
        }
        try {
            const response = await axios.put(
                server.baseurl + server.initialoperations + "update-product-type",
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
                const statusText = statusValue === 0 ? 'Aktif' : 'Pasif';
                showAlert(`Direk başarıyla ${statusText} olarak ayarlandı!`, 'success');
                getListProductTypes();
                resetFormAndState();
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
    const handleSetActive = () => {
        if (selectedRowForMenu) {
            sendStatusUpdate(selectedRowForMenu.id, 0);
        }
    };
    const handleSetInactive = () => {
        if (selectedRowForMenu) {
            sendStatusUpdate(selectedRowForMenu.id, 1);
        }
    };
    const resetFormAndState = () => {
        setName('');
        setEditingId(null);
        setOriginalName('');
        setProductType(0); // Resetting the type to default
        setNameError(false);
        setNameHelperText('');
    };

    function getListProductTypes() {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            setLoadingData(false);
            return;
        }
        axios.request({
            baseURL: server.baseurl + server.initialoperations + "get-product-types",
            method: "get",
            headers: {
                "Accept": "application/json",
                "Authorization": `Bearer ${authToken}`
            }
        }).then((result) => {
            if (result.data.httpStatusCode === 200) {
                const formattedData = result.data.data.map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    recordStatus: item.recordStatus,
                    createAt: item.createAt,
                    type: item.type, // Get the type from API
                    status: item.recordStatus === 0 ? 'Aktif' : item.recordStatus === 1 ? 'Pasif' : 'Silindi',
                }));
                setProductTypesList(formattedData as ProductTypesType[]);
                setLoadingData(false);
            } else {
                showAlert(result.data.message || 'Ürün türleri listesi alınamadı.', 'error');
                setLoadingData(false);
            }
        }).catch((e) => {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                showAlert('Ürün türleri listesi alınırken bir hata oluştu.', 'error');
            }
            setLoadingData(false);
        });
    }
    useEffect(() => {
        getListProductTypes();
    }, []);

    const handleStatusFilterChange = (
        event: React.MouseEvent<HTMLElement>,
        newFilter: 'all' | 'active' | 'inactive' | null,
    ) => {
        if (newFilter !== null) {
            console.log(event)
            setStatusFilter(newFilter);
            setPage(0);
        }
    };

    const handleChangePage = (
        event: unknown,
        newPage: number) => {
        console.log(event)
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
        setPage(0);
    };

    const handleRequestSort = (property: keyof ProductTypesType) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
        setPage(0);
    };

    const filteredProductTypes = ProductTypesList.filter(ProductTypes => {
        const matchesSearch = ProductTypes.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'active' && ProductTypes.recordStatus === 0) ||
            (statusFilter === 'inactive' && ProductTypes.recordStatus === 1);
        return matchesSearch && matchesStatus;
    });
    const sortedAndFilteredProductTypes = stableSort(filteredProductTypes, getComparator(order, orderBy));
    const paginatedProductTypes = sortedAndFilteredProductTypes.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
        <>
            <div style={{
                borderBottom: "1px solid",
                margin: "10px 0 30px 0",
                padding: "10px 15px 30px 15px"
            }}>
                <Grid container spacing={1}>
                    <Grid item xs={12} sm={1} display="flex" alignItems="center">
                        <CustomFormLabel htmlFor="ProductTypes-name" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }} required>
                            İsim
                        </CustomFormLabel>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <CustomTextField
                            id="ProductTypes-name"
                            placeholder="Ad"
                            fullWidth
                            value={name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                setName(e.target.value);
                                if (nameError && e.target.value.trim()) {
                                    setNameError(false);
                                    setNameHelperText('');
                                }
                            }}
                            inputRef={ProductTypesNameInputRef}
                            error={nameError}
                            helperText={nameHelperText}
                        />
                    </Grid>
                    <Grid item xs={12} sm={4} display="flex" alignItems="center" justifyContent="center">
                        <CustomFormLabel htmlFor="product-type-radio-group" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }} required>
                            Tür
                        </CustomFormLabel>
                        <RadioGroup
                            aria-labelledby="product-type-radio-group"
                            name="product-type-group"
                            value={String(productType)}
                            onChange={(e) => setProductType(parseInt(e.target.value))}
                            row
                        >
                            <FormControlLabel value="0" control={<Radio />} label="Trafo" />
                            <FormControlLabel value="1" control={<Radio />} label="Direk" />
                        </RadioGroup>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                            {editingId !== null ? (
                                <>
                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Seçili Direki güncelleyin" : ""}>
                                        <Button
                                            variant="contained"
                                            color="info"
                                            onClick={editProductTypes}
                                            disabled={loadingButton}
                                        >
                                            {loadingButton ? <>
                                                <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...
                                            </> : 'Düzenle'}
                                        </Button>
                                    </CustomTooltip>
                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Güncellemeyi iptal et ve yeni Direk moduna dön" : ""}>
                                        <Button variant="outlined" color="secondary" onClick={handleCancelEdit}>
                                            İptal Et
                                        </Button>
                                    </CustomTooltip>
                                </>
                            ) : (
                                <>
                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni bir Direk ekle" : ""}>
                                        <Button
                                            variant="contained"
                                            color="success"
                                            onClick={insertProductTypes}
                                            disabled={loadingButton}
                                        >
                                            {loadingButton ? <>
                                                <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...
                                            </> : 'Yeni Direk Ekle'}
                                        </Button>
                                    </CustomTooltip>
                                </>
                            )}
                        </Stack>
                    </Grid>
                </Grid>
                {alertMessage && (
                    <Stack sx={{ width: '100%', mt: 2 }} spacing={2}>
                        <Alert severity={alertSeverity} onClose={clearAlert}>
                            {alertMessage}
                        </Alert>
                    </Stack>
                )}
            </div>
            <BlankCard>
                <Box sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={8}>
                            <TextField
                                label="Direk Ara"
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
                        <Grid item xs={12} sm={6} md={4}>
                            <ToggleButtonGroup
                                value={statusFilter}
                                exclusive
                                onChange={handleStatusFilterChange}
                                aria-label="Status filter"
                                fullWidth
                            >
                                <StyledToggleButton
                                    value="all"
                                    aria-label="all ProductTypes"
                                >
                                    Tümü
                                </StyledToggleButton>
                                <StyledToggleButton
                                    value="active"
                                    aria-label="active ProductTypes"
                                >
                                    Aktif
                                </StyledToggleButton>
                                <StyledToggleButton
                                    value="inactive"
                                    aria-label="inactive ProductTypes"
                                >
                                    Pasif
                                </StyledToggleButton>
                            </ToggleButtonGroup>
                        </Grid>
                    </Grid>
                </Box>
                {loadingData ? (
                    <Stack sx={{ width: '100%', height: '300px', justifyContent: 'center', alignItems: 'center' }}>
                        <CircularProgress />
                        <Typography variant="h6" color="textSecondary" sx={{ mt: 2 }}>Yükleniyor...</Typography>
                    </Stack>
                ) : (
                    <TableContainer>
                        <Table aria-label="ProductTypes table">
                            <TableHead style={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>
                                    <TableCell>
                                        <TableSortLabel
                                            active={orderBy === 'name'}
                                            direction={orderBy === 'name' ? order : 'asc'}
                                            onClick={() => handleRequestSort('name')}
                                            style={{ color: "#171c23" }}
                                        >
                                            <Typography variant="h6">İsim</Typography>
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell>
                                        <TableSortLabel
                                            active={orderBy === 'type'}
                                            direction={orderBy === 'type' ? order : 'asc'}
                                            onClick={() => handleRequestSort('type')}
                                            style={{ color: "#171c23" }}
                                        >
                                            <Typography variant="h6">Tür</Typography>
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell>
                                        <TableSortLabel
                                            active={orderBy === 'createAt'}
                                            direction={orderBy === 'createAt' ? order : 'asc'}
                                            onClick={() => handleRequestSort('createAt')}
                                            style={{ color: "#171c23" }}
                                        >
                                            <Typography variant="h6">Oluşturulma Tarihi</Typography>
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell>
                                        <TableSortLabel
                                            active={orderBy === 'status'}
                                            direction={orderBy === 'status' ? order : 'asc'}
                                            onClick={() => handleRequestSort('status')}
                                            style={{ color: "#171c23" }}
                                        >
                                            <Typography variant="h6">Durum</Typography>
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedProductTypes.length > 0 ? (
                                    paginatedProductTypes.map((row) => (
                                        <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            <TableCell>
                                                <Stack direction="row" alignItems="center" spacing={2}>
                                                    <Box>
                                                        <Typography variant="h6">{row.name}</Typography>
                                                    </Box>
                                                </Stack>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="h6">
                                                    {row.type === 0 ? 'Trafo' : 'Direk'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Stack direction="row" alignItems="center" spacing={2}>
                                                    <Box>
                                                        <Typography variant="h6">{formatDateDisplay(row.createAt)}</Typography>
                                                    </Box>
                                                </Stack>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={row.status}
                                                    sx={{
                                                        backgroundColor:
                                                            row.recordStatus === 2
                                                                ? (theme) => theme.palette.primary.light
                                                                : row.recordStatus === 1
                                                                    ? (theme) => theme.palette.error.light
                                                                    : (theme) => theme.palette.success.light,
                                                        color:
                                                            row.recordStatus === 2
                                                                ? (theme) => theme.palette.primary.main
                                                                : row.recordStatus === 1
                                                                    ? (theme) => theme.palette.error.main
                                                                    : (theme) => theme.palette.success.main,
                                                    }}
                                                />
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
                                                        <CustomTooltip placement="left"
                                                            title={isTooltipGloballyEnabled ? "Bu Direki pasif yap" : ""}>
                                                            <MenuItem onClick={handleSetInactive}>
                                                                <ListItemIcon>
                                                                    <DoNotDisturbOnRoundedIcon width={18} />
                                                                </ListItemIcon>
                                                                Pasif Yap
                                                            </MenuItem>
                                                        </CustomTooltip>
                                                    ) : (
                                                        <CustomTooltip placement="left"
                                                            title={isTooltipGloballyEnabled ? "Bu Direki aktif yap" : ""}>
                                                            <MenuItem onClick={handleSetActive}>
                                                                <ListItemIcon>
                                                                    <DoneRoundedIcon width={18} />
                                                                </ListItemIcon>
                                                                Aktif Yap
                                                            </MenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    <CustomTooltip placement="left"
                                                        title={isTooltipGloballyEnabled ? "Bu Direki düzenle" : ""}>
                                                        <MenuItem onClick={handleEditClick}>
                                                            <ListItemIcon>
                                                                <IconEdit width={18} />
                                                            </ListItemIcon>
                                                            Düzenle
                                                        </MenuItem>
                                                    </CustomTooltip>
                                                    <CustomTooltip placement="left"
                                                        title={isTooltipGloballyEnabled ? "Bu Direki sil" : ""}>
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
                                        <TableCell colSpan={5} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">
                                                Hiç Direk bulunamadı.
                                            </Typography>
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
                    count={sortedAndFilteredProductTypes.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Sayfa başına satır sayısı:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
                />
            </BlankCard>

            <DeleteProductTypes
                openModal={openDeleteModal}
                onClose={handleClickCloseDeleteModal}
                ProductTypesIdToDelete={ProductTypesIdToDelete}
                onDeleteSuccess={getListProductTypes}
                showAlert={showAlert}
            />
        </>
    );
};

export default ListProductTypes;