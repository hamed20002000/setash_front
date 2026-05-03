

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, Table, TableHead, TableBody, TableRow, TableCell, CircularProgress, Box, Stack, Grid, IconButton, Menu, MenuItem, Typography, TableSortLabel, TablePagination, TableContainer, Paper, TextField, ListItemIcon, Alert } from '@mui/material';

import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { tr } from 'date-fns/locale';
import axios from 'axios';
import { IconDots, IconEdit, IconTrash, IconX } from '@tabler/icons-react';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';

import { format, isSameDay } from "date-fns";
import server from '../../../assets/address.json';
import DeleteCourseDateTimes from './DeleteCourseDateTimes';
import { useNavigate } from 'react-router';

interface CourseDateTime {
    id: number;
    startDateTime: string;
    endDateTime: string;
    courseId: number;
    createAt?: string;
}
type SortableKeys = 'startDateTime' | 'endDateTime' | 'createAt';

const formatDateDisplayWithTime = (dateString: string | null): string => {
    if (!dateString) return "-";
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "Geçersiz Tarih";
        return format(date, 'dd MMMM yyyy HH:mm', { locale: tr });
    } catch (e) { return "Geçersiz Tarih"; }
};


const descendingComparator = <T, Key extends keyof T>(a: T, b: T, orderBy: Key): number => {
    const valA = a[orderBy];
    const valB = b[orderBy];
    if (valB === undefined || valB === null) return (valA === undefined || valA === null) ? 0 : -1;
    if (valA === undefined || valA === null) return 1;
    if (typeof valB === 'string' && typeof valA === 'string') return valB.localeCompare(valA);
    if (typeof valB === 'number' && typeof valA === 'number') return valB - valA;
    if (String(valB) < String(valA)) return -1;
    if (String(valB) > String(valA)) return 1;
    return 0;
};
const getComparator = (order: 'asc' | 'desc', orderBy: SortableKeys) => {
    return order === 'desc'
        ? (a: any, b: any) => descendingComparator(a, b, orderBy as any)
        : (a: any, b: any) => -descendingComparator(a, b, orderBy as any);
};
const stableSort = <T,>(array: T[], comparator: (a: T, b: T) => number) => {
    const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
    stabilizedThis.sort((a, b) => {
        const order = comparator(a[0], b[0]);
        if (order !== 0) return order; return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
};


type ListCourseDateTimesProps = {
    open: boolean;
    courseId: number | null;
    courseTitle: string;
    onClose: () => void;
    showAlert: (m: string, s: 'success' | 'error' | 'warning' | 'info') => void;
    courseStart: string | null;
    courseEnd: string | null;
};

const ListCourseDateTimes: React.FC<ListCourseDateTimesProps> = ({ open, courseId, courseTitle, onClose, showAlert, courseStart, courseEnd }) => {


    const navigate = useNavigate();
    const [dateTimes, setDateTimes] = useState<CourseDateTime[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingButton, setLoadingButton] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const [startDateTime, setStartDateTime] = useState<Date | null>(null);
    const [endDateTime, setEndDateTime] = useState<Date | null>(null);
    const [startDateTimeError, setStartDateTimeError] = useState(false);
    const [endDateTimeError, setEndDateTimeError] = useState(false);

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [orderBy, setOrderBy] = useState<SortableKeys>('startDateTime');
    const [order, setOrder] = useState<'asc' | 'desc'>('asc');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<CourseDateTime | null>(null);

    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    const authToken = localStorage.getItem('authToken');

    const courseMinDate = useMemo(() => courseStart ? new Date(courseStart) : undefined, [courseStart]);
    const courseMaxDate = useMemo(() => courseEnd ? new Date(courseEnd) : undefined, [courseEnd]);



    const fetchDateTimes = useCallback(async () => {
        if (courseId === null || !open || !authToken) {
            setDateTimes([]);
            return;
        }

        setLoading(true);
        try {
            const url = `${server.baseurl}${server.education}get-course-datetimes-by-course-id/${courseId}`;
            const res = await axios.get(url, { headers: { Authorization: `Bearer ${authToken}` } });

            if (res.data.httpStatusCode === 200 && Array.isArray(res.data.data)) {
                const mappedData = res.data.data.map((r: any) => ({ ...r, id: Number(r.id), courseId: Number(r.courseId) }));
                setDateTimes(mappedData);
            } else {
                showAlert(res.data.message || 'Tarihler yüklenemedi.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally {
            setLoading(false);
        }
    }, [courseId, open, showAlert, authToken]);

    useEffect(() => {
        if (open) {
            fetchDateTimes();
            resetForm();
        }
    }, [open, fetchDateTimes]);

    const internalShowAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
    }, []);
    const clearAlert = () => setAlertMessage(null);
    useEffect(() => {
        let timer: number;
        if (alertMessage) timer = setTimeout(() => clearAlert(), 5000);
        return () => { if (timer) clearTimeout(timer); };
    }, [alertMessage]);

    const validateForm = (): boolean => {
        let ok = true;
        setStartDateTimeError(false);
        setEndDateTimeError(false);

        if (!startDateTime) { setStartDateTimeError(true); ok = false; }
        if (!endDateTime) { setEndDateTimeError(true); ok = false; }

        if (!startDateTime || !endDateTime) {
            if (!ok) internalShowAlert('Lütfen tüm zorunlu alanları doldurun.', 'warning');
            return ok;
        }

        if (!isSameDay(startDateTime, endDateTime)) {
            setStartDateTimeError(true); setEndDateTimeError(true);
            internalShowAlert('Başlangıç ve bitiş tarihi aynı gün olmalıdır.', 'error');
            ok = false;
        }

        if (startDateTime.getTime() >= endDateTime.getTime()) {
            setEndDateTimeError(true);
            internalShowAlert('Bitiş saati, başlangıç saatinden sonra olmalıdır.', 'error');
            ok = false;
        }

        if (courseMinDate && startDateTime < courseMinDate) {
            setStartDateTimeError(true);
            internalShowAlert('Başlangıç tarihi, kursun genel başlangıç tarihinden önce olamaz.', 'error');
            ok = false;
        }
        if (courseMaxDate && endDateTime > courseMaxDate) {
            setEndDateTimeError(true);
            internalShowAlert('Bitiş tarihi, kursun genel bitiş tarihinden sonra olamaz.', 'error');
            ok = false;
        }

        if (!ok) {
        }
        return ok;
    };

    const resetForm = useCallback(() => {
        setEditingId(null);
        setStartDateTime(null);
        setEndDateTime(null);
        setStartDateTimeError(false);
        setEndDateTimeError(false);
    }, []);

    const handleSubmit = async () => {
        if (!validateForm() || !courseId || !authToken) return;

        setLoadingButton(true);
        const isEditing = editingId !== null;

        const payload = {
            id: isEditing ? editingId : undefined,
            startDateTime: startDateTime?.toISOString(),
            endDateTime: endDateTime?.toISOString(),
            courseId: Number(courseId),
        };

        const url = isEditing
            ? `${server.baseurl}${server.education}update-course-datetime`
            : `${server.baseurl}${server.education}create-course-datetime`;
        const method = isEditing ? 'put' : 'post';

        const finalDataToSend = payload

        try {
            const res = await axios.request({ method, url, data: finalDataToSend, headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' } });

            if (res.data.httpStatusCode === 200 || res.data.httpStatusCode === 201) {
                showAlert(`Kurs tarihi başarıyla ${isEditing ? 'güncellendi' : 'eklendi'}.`, 'success');
                resetForm();
                fetchDateTimes();
            } else {
                showAlert(res.data.message || 'İşlem sırasında bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };

    const handleEditClick = (row: CourseDateTime) => {
        setEditingId(row.id);
        setStartDateTime(row.startDateTime ? new Date(row.startDateTime) : null);
        setEndDateTime(row.endDateTime ? new Date(row.endDateTime) : null);
        handleCloseMenu();
    };

    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: CourseDateTime) => { setAnchorEl(event.currentTarget); setSelectedRowForMenu(row); };
    const handleCloseMenu = () => { setAnchorEl(null); setSelectedRowForMenu(null); };
    const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
    const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };
    const handleRequestSort = useCallback((property: SortableKeys) => {
        const isAsc = orderBy === property && order === 'asc'; setOrder(isAsc ? 'desc' : 'asc'); setOrderBy(property); setPage(0);
    }, [order, orderBy]);

    const handleClickOpenDeleteModal = () => {
        if (!selectedRowForMenu) return;
        setDeleteId(selectedRowForMenu.id);
        setOpenDeleteModal(true);
        handleCloseMenu();
    };
    const handleCloseDeleteModal = (success: boolean) => {
        setOpenDeleteModal(false);
        setDeleteId(null);
        if (success) {
            fetchDateTimes();
            resetForm();
        }
    };

    const sortedDateTimes = useMemo(() => stableSort(dateTimes, getComparator(order, orderBy)), [dateTimes, order, orderBy]);
    const paginatedRows = useMemo(() => sortedDateTimes.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [sortedDateTimes, page, rowsPerPage]);



    return (
        <Dialog open={open} onClose={loadingButton ? undefined : onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Kurs Tarihleri Yönetimi: {courseTitle}</Typography>
                <IconButton onClick={onClose} disabled={loadingButton}><IconX /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
                {alertMessage && (
                    <Stack sx={{ width: '100%', mb: 2 }} spacing={2}><Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert></Stack>
                )}
                <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
                    <Typography variant="subtitle1" mb={2}>{editingId ? 'Tarih Düzenle' : 'Yeni Tarih Ekle'}</Typography>

                    <Alert severity="info" sx={{ mb: 2 }} >
                        Kursun genel tarih aralığı: {formatDateDisplayWithTime(courseStart) || ''} - {formatDateDisplayWithTime(courseEnd) || ''}
                    </Alert>

                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <CustomFormLabel required>Başlangıç Tarihi/Saati</CustomFormLabel>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <DateTimePicker
                                    label="Başlangıç"
                                    value={startDateTime}
                                    onChange={(v) => { setStartDateTime(v); setStartDateTimeError(false); }}
                                    inputFormat="dd/MM/yyyy HH:mm"
                                    minDate={courseMinDate}
                                    maxDate={courseMaxDate}
                                    renderInput={(params) => <TextField {...params} size="small" fullWidth error={startDateTimeError} helperText={startDateTimeError ? 'Zorunlu alan / Geçersiz saat.' : params.helperText} />}
                                />
                            </LocalizationProvider>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <CustomFormLabel required>Bitiş Tarihi/Saati</CustomFormLabel>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <DateTimePicker
                                    label="Bitiş"
                                    value={endDateTime}
                                    minDate={startDateTime || courseMinDate}
                                    maxDate={courseMaxDate}
                                    onChange={(v) => { setEndDateTime(v); setEndDateTimeError(false); }}
                                    inputFormat="dd/MM/yyyy HH:mm"
                                    renderInput={(params) => <TextField {...params} size="small" fullWidth error={endDateTimeError} helperText={endDateTimeError ? 'Zorunlu alan / Başlangıçtan sonra olmalı.' : params.helperText} />}
                                />
                            </LocalizationProvider>
                        </Grid>
                        <Grid item xs={12}>
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Button variant="contained" color={editingId ? "info" : "success"} onClick={handleSubmit} disabled={loadingButton || !courseId} size="small">
                                    {loadingButton ? <><CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Bekleniyor...</> : editingId ? 'Düzenle' : 'Tarih Ekle'}
                                </Button>
                                {editingId && <Button variant="outlined" color="secondary" onClick={resetForm} size="small">İptal Et</Button>}
                            </Stack>
                        </Grid>
                    </Grid>
                </Paper>

                <TableContainer component={Paper} elevation={1}>
                    {loading ? (
                        <Box display="flex" justifyContent="center" alignItems="center" height="150px"><CircularProgress /></Box>
                    ) : (
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ background: "#f5f5f5" }}>
                                    <TableCell><TableSortLabel active={orderBy === 'startDateTime'} direction={orderBy === 'startDateTime' ? order : 'asc'} onClick={() => handleRequestSort('startDateTime')}>Başlangıç (Tarih ve Saat)</TableSortLabel></TableCell>
                                    <TableCell><TableSortLabel active={orderBy === 'endDateTime'} direction={orderBy === 'endDateTime' ? order : 'asc'} onClick={() => handleRequestSort('endDateTime')}>Bitiş (Tarih ve Saat)</TableSortLabel></TableCell>
                                    <TableCell align="right"></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedRows.length > 0 ? (
                                    paginatedRows.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell>{formatDateDisplayWithTime(row.startDateTime)}</TableCell>
                                            <TableCell>{formatDateDisplayWithTime(row.endDateTime)}</TableCell>
                                            <TableCell align="right">
                                                <IconButton onClick={(e) => handleClickMenu(e, row)} size="small"><IconDots width={18} /></IconButton>
                                                <Menu anchorEl={anchorEl} open={Boolean(anchorEl) && selectedRowForMenu?.id === row.id} onClose={handleCloseMenu}>
                                                    <MenuItem onClick={() => handleEditClick(selectedRowForMenu!)}><ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenle</MenuItem>
                                                    <MenuItem onClick={handleClickOpenDeleteModal}><ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek</MenuItem>
                                                </Menu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={3} align="center"><Typography variant="subtitle2" color="textSecondary">Henüz tarih kaydı bulunmamaktadır.</Typography></TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </TableContainer>
                <TablePagination rowsPerPageOptions={[5, 10]} component="div" count={dateTimes.length} rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage} labelRowsPerPage="Satır başına düşen:" />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="secondary" disabled={loadingButton}>Kapat</Button>
            </DialogActions>

            <DeleteCourseDateTimes
                openModal={openDeleteModal}
                onClose={handleCloseDeleteModal}
                idToDelete={deleteId}
                nameToDelete={`(${deleteId})`}
                onDeleteSuccess={() => handleCloseDeleteModal(true)}
                showAlert={showAlert}
            />
        </Dialog>
    );
};

export default ListCourseDateTimes;