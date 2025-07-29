// ListProductTypes.tsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useState, useRef } from "react"; // Added useRef here
import { useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    Typography, Chip, Menu, MenuItem, IconButton, ListItemIcon, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    ToggleButtonGroup, ToggleButton as MuiToggleButton, // Renamed ToggleButton to MuiToggleButton
    TableSortLabel,
} from '@mui/material';
import { styled } from '@mui/material/styles'; // Import styled

import BoltIcon from '@mui/icons-material/Bolt';
import BlankCard from '../../components/shared/BlankCard';
import CustomFormLabel from '../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../components/forms/theme-elements/CustomTextField';
import { IconDots, IconEdit, IconTrash, IconSearch }
    from '@tabler/icons-react';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import DeleteProductTypes from './DeleteProductType';
import axios from 'axios';
import server from '../../assets/address.json';

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

interface ProductTypesType {
    id: number;
    name: string;
    createAt: string;
    recordStatus?: number; // 0 = Aktif, 1 = Pasif, 2 = Silindi
    status: string; // وضعیت متنی
}

// وضعیت فیلتر برای ToggleButtonGroup
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

// Helper functions for sorting - placed outside the component for reusability
const descendingComparator = <T, Key extends keyof T>(
    a: T,
    b: T,
    orderBy: Key,
): number => {
    const valA = a[orderBy];
    const valB = b[orderBy];

    // Handle undefined/null values by pushing them to the end (or beginning) of the sort order
    if (valB === undefined || valB === null) {
        return valA === undefined || valA === null ? 0 : -1;
    }
    if (valA === undefined || valA === null) {
        return 1;
    }

    // Specific handling for string and number types
    if (typeof valB === 'string' && typeof valA === 'string') {
        return valB.localeCompare(valA);
    }
    if (typeof valB === 'number' && typeof valA === 'number') {
        return valB - valA;
    }
    // Fallback to string comparison for other types or mixed types
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

    const { isTooltipGloballyEnabled } = useTooltip();

    // وضعیت فیلتر: all, active, inactive
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

    // State برای مرتب‌سازی
    const [orderBy, setOrderBy] = useState<keyof ProductTypesType>('createAt'); // ستون مرتب‌سازی پیش‌فرض
    const [order, setOrder] = useState<'asc' | 'desc'>('desc'); // جهت مرتب‌سازی پیش‌فرض

    // Ref برای فیلد ورودی نام ProductTypes
    const ProductTypesNameInputRef = useRef<HTMLInputElement>(null);

    // New states for input validation error
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

    // useEffect for auto-closing Alert
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (alertMessage) {
            timer = setTimeout(() => {
                clearAlert();
            }, 5000); // 5000 milliseconds = 5 seconds
        }
        return () => {
            clearTimeout(timer); // Clear the timer if the component unmounts or alertMessage changes
        };
    }, [alertMessage]);

    const handleEditClick = () => {
        if (selectedRowForMenu) {
            setName(selectedRowForMenu.name);
            setOriginalName(selectedRowForMenu.name);
            setEditingId(selectedRowForMenu.id);

            // Clear input validation errors when editing
            setNameError(false);
            setNameHelperText('');

            // Scroll to the ProductTypes name input and focus
            setTimeout(() => {
                ProductTypesNameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                ProductTypesNameInputRef.current?.focus();
            }, 100); // Small delay to ensure DOM update
        }
        handleCloseMenu();
        clearAlert();
    };

    const handleCancelEdit = () => {
        resetFormAndState();
        clearAlert();
        // Clear input validation errors
        setNameError(false);
        setNameHelperText('');
    };

    const insertProductTypes = async () => {
        if (!name.trim()) {
            setNameError(true); // Set error state to true
            setNameHelperText('İsim boş olamaz!'); // Set helper text
            showAlert('İsim boş olamaz!', 'warning');
            return;
        }
        setNameError(false); // Clear error if valid
        setNameHelperText(''); // Clear helper text if valid

        clearAlert();
        const authToken = localStorage.getItem('authToken');

        if (!authToken) {
            console.warn("No auth token found, redirecting to login.");
            navigate("/");
            return;
        }

        setLoadingButton(true);
        try {
            const response = await axios.post(
                server.baseurl + server.initialoperations + "create-product-type",
                { name: name },
                {
                    headers: {
                        "Accept": "application/json",
                        'Content-Type': 'application/json',
                        "Authorization": `Bearer ${authToken}`
                    }
                }
            );
            if (response.data.httpStatusCode === 201) {
                showAlert('Yeni Ölçü başarıyla eklendi!', 'success');
                resetFormAndState();
                getListProductTypes();
            } else {
                showAlert(response.data.message || 'Yeni Ölçü eklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            }
            console.error("Error inserting ProductTypes:", e);
            showAlert(e.response?.data?.message || 'Ölçü eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };


    const editProductTypes = async () => {
        if (editingId === null) return;
        if (!name.trim()) {
            setNameError(true); // Set error state to true
            setNameHelperText('İsim boş olamaz!'); // Set helper text
            showAlert('İsim boş olamaz!', 'warning');
            return;
        }
        setNameError(false); // Clear error if valid
        setNameHelperText(''); // Clear helper text if valid

        clearAlert();

        if (name === originalName) {
            showAlert('İsimde herhangi bir değişiklik yapmadınız.', 'info');
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
                { id: Number(editingId), name: name },
                {
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            if (response.data.httpStatusCode === 200) {
                showAlert('Ölçü başarıyla güncellendi!', 'success');
                setProductTypesList(prevList =>
                    prevList.map(op => (op.id === editingId ? { ...op, name: name } : op))
                );
                resetFormAndState();
                getListProductTypes();
            } else {
                showAlert(response.data.message || 'Ölçü güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            }
            console.error("Error updating ProductTypes:", e);
            showAlert(e.response?.data?.message || 'Ölçü güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
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
                showAlert(`Ölçü başarıyla ${statusText} olarak ayarlandı!`, 'success');
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
            console.error("Error updating status:", e);
            showAlert(e.response?.data?.message || 'Durum güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally {
            handleCloseMenu();
        }
    };
    const handleSetActive = () => {
        if (selectedRowForMenu) {
            sendStatusUpdate(selectedRowForMenu.id, 0); // 0 for Aktif
        }
    };

    const handleSetInactive = () => {
        if (selectedRowForMenu) {
            sendStatusUpdate(selectedRowForMenu.id, 1); // 1 for Pasif
        }
    };

    const resetFormAndState = () => {
        setName('');
        setEditingId(null);
        setOriginalName('');
        // Clear input validation errors
        setNameError(false);
        setNameHelperText('');
    };

    // already defined, moved to top for clarity
    const formatDate = (dateString: string): string => {
        try {
            const date = new Date(dateString);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (e) {
            console.error("Error formatting date:", e);
            return "Geçersiz Tarih";
        }
    };


    function getListProductTypes() {
        const authToken = localStorage.getItem('authToken');

        if (!authToken) {
            console.warn("No auth token found, redirecting to login.");
            navigate("/");
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
                    name: item.name, // Assuming 'name' from API corresponds to 'name' in ProductTypesType
                    recordStatus: item.recordStatus,
                    createAt: item.createAt,
                    status: item.recordStatus === 0 ? 'Aktif' : item.recordStatus === 1 ? 'Pasif' : 'Silindi',
                }));
                setProductTypesList(formattedData as ProductTypesType[]);
            } else {
                showAlert(result.data.message || 'لیست انواع محصول دریافت نشد.', 'error');
            }
        }).catch((e) => {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('جلسه شما منقضی شده یا مجاز نیستید. لطفا دوباره وارد شوید.', 'error');
            } else {
                console.error("Error fetching ProductTypes list:", e);
                showAlert('خطا در دریافت لیست انواع محصول، لطفا دوباره تلاش کنید.', 'error');
            }
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
            setPage(0); // مهم: با تغییر فیلتر، صفحه را به 0 بازنشانی کنید
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

    // Handler for changing sort order
    const handleRequestSort = (property: keyof ProductTypesType) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
        setPage(0); // Reset to first page when sort changes
    };

    const filteredProductTypes = ProductTypesList.filter(ProductTypes => {
        const matchesSearch = ProductTypes.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'active' && ProductTypes.recordStatus === 0) ||
            (statusFilter === 'inactive' && ProductTypes.recordStatus === 1);
        return matchesSearch && matchesStatus;
    });

    // Apply sorting to filtered data
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
                        <CustomFormLabel htmlFor="ProductTypes-name" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }}>
                            İsim
                        </CustomFormLabel>
                    </Grid>
                    <Grid item xs={12} sm={7}>
                        <CustomTextField
                            id="ProductTypes-name"
                            placeholder="Ölçü Adı"
                            fullWidth
                            value={name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                setName(e.target.value);
                                if (nameError && e.target.value.trim()) { // If there was a previous error and user starts typing
                                    setNameError(false); // Clear the error
                                    setNameHelperText(''); // Clear the helper text
                                }
                            }}
                            inputRef={ProductTypesNameInputRef}
                            error={nameError}
                            helperText={nameHelperText}
                        />
                    </Grid>
                    <Grid item xs={12} sm={1}></Grid>
                    <Grid item xs={12} sm={3}>
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                            {editingId !== null ? (
                                <>
                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Seçili Ölçüi güncelleyin" : ""}>
                                        <Button
                                            variant="contained"
                                            color="info"
                                            onClick={editProductTypes}
                                            disabled={loadingButton}
                                        >
                                            {loadingButton ? <>
                                                <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Beklemek....
                                            </> : 'Düzenlemek'}
                                        </Button>
                                    </CustomTooltip>
                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Güncellemeyi iptal et ve yeni Ölçü moduna dön" : ""}>
                                        <Button variant="outlined" color="secondary" onClick={handleCancelEdit}>
                                            İptal Et
                                        </Button>
                                    </CustomTooltip>
                                </>
                            ) : (
                                <>
                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni bir Ölçü ekle" : ""}>
                                        <Button
                                            variant="contained"
                                            color="success"
                                            onClick={insertProductTypes}
                                            disabled={loadingButton}
                                        >
                                            {loadingButton ? <>
                                                <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Beklemek....
                                            </> : 'Yeni Ölçü Ekle'}
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
                                label="Ölçü Ara"
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
                                <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm Ölçüleri göster" : ""}>
                                    <StyledToggleButton // استفاده از StyledToggleButton
                                        value="all"
                                        aria-label="all ProductTypes"
                                    >
                                        Tümü
                                    </StyledToggleButton>
                                </CustomTooltip>
                                <CustomTooltip title={isTooltipGloballyEnabled ? "Sadece aktif Ölçüleri göster" : ""}>
                                    <StyledToggleButton // استفاده از StyledToggleButton
                                        value="active"
                                        aria-label="active ProductTypes"
                                    >
                                        Aktif
                                    </StyledToggleButton>
                                </CustomTooltip>
                                <CustomTooltip title={isTooltipGloballyEnabled ? "Sadece pasif Ölçüleri göster" : ""}>
                                    <StyledToggleButton // استفاده از StyledToggleButton
                                        value="inactive"
                                        aria-label="inactive ProductTypes"
                                    >
                                        Pasif
                                    </StyledToggleButton>
                                </CustomTooltip>
                            </ToggleButtonGroup>
                        </Grid>
                    </Grid>
                </Box>
                <TableContainer>
                    <Table aria-label="ProductTypes table">
                        <TableHead style={{ background: "#f1f1f1" }}>
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
                                            <Stack direction="row" alignItems="center" spacing={2}>
                                                <Box>
                                                    <Typography variant="h6">{formatDate(row.createAt)}</Typography>
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
                                                        title={isTooltipGloballyEnabled ? "Bu Ölçüi pasif yap" : ""}>
                                                        <MenuItem onClick={handleSetInactive}>
                                                            <ListItemIcon>
                                                                <DoNotDisturbOnRoundedIcon width={18} />
                                                            </ListItemIcon>
                                                            Pasif Yap
                                                        </MenuItem>
                                                    </CustomTooltip>
                                                ) : (
                                                    <CustomTooltip placement="left"
                                                        title={isTooltipGloballyEnabled ? "Bu Ölçüi aktif yap" : ""}>
                                                        <MenuItem onClick={handleSetActive}>
                                                            <ListItemIcon>
                                                                <DoneRoundedIcon width={18} />
                                                            </ListItemIcon>
                                                            Aktif Yap
                                                        </MenuItem>
                                                    </CustomTooltip>
                                                )}
                                                <CustomTooltip placement="left"
                                                    title={isTooltipGloballyEnabled ? "Bu Ölçüi düzenle" : ""}>
                                                    <MenuItem onClick={handleEditClick}>
                                                        <ListItemIcon>
                                                            <IconEdit width={18} />
                                                        </ListItemIcon>
                                                        Düzenlemek
                                                    </MenuItem>
                                                </CustomTooltip>
                                                <CustomTooltip placement="left"
                                                    title={isTooltipGloballyEnabled ? "Bu Ölçüi sil" : ""}>
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
                                    <TableCell colSpan={4} align="center">
                                        <Typography variant="subtitle1" color="textSecondary">
                                            Hiç Ölçü bulunamadı.
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
                    count={sortedAndFilteredProductTypes.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Satır başına düşen:"
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