// ListRequestReceipt.tsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Typography, Box, Stack, Button, Alert,
    CircularProgress, Paper, Chip, IconButton,
    TableContainer, Table, TableHead, TableRow, TableBody, Menu, ListItemIcon,
    TablePagination,
    TableCell as MuiTableCell,
    MenuItem as MuiMenuItem,
    Dialog,
    DialogTitle,
    DialogActions,
    DialogContent,
    TextField,
    Divider,
    DialogContentText,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import {
    IconInbox, // آیکون برای Gelen Talepler
    IconChecks, // برای تایید (Onayla)
    IconX, // برای رد (Reddet)
    IconInfoCircle, // برای نمایش تاریخچه (History)
    IconDots,
    IconLink,
    IconDownload,
} from '@tabler/icons-react';
import axios from 'axios';
import server from 'src/assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import { useAuth } from "src/context/AuthContext";

// ==============================================================================
// 1. UPDATED TYPES (مدل‌های داده به‌روز شده)
// ==============================================================================

interface User {
    username: string;
    // ... سایر فیلدهای کاربر
}

interface RequestStatusHistory {
    status: 0 | 1 | 2;
    statusDescription: string;
    createAt: string;
    user: User; // کاربری که وضعیت را تغییر داده
}

interface Attachment {
    fileUrl: string;
}

interface RequestType {
    id: number | string;
    subject: string;
    description: string;
    status: 0 | 1 | 2; // 0: Beklemede, 1: Onaylandı, 2: Reddedildi
    statusDescription: string | null;
    createAt: string;
    attachments: Attachment[];
    user: User; // کاربر درخواست‌دهنده
    requestStatusHistories: RequestStatusHistory[];
}

// ==============================================================================
// 2. STYLED COMPONENTS & UTILS (کامپوننت‌های استایل‌دهی شده و توابع کمکی)
// ==============================================================================

const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans',
    fontSize: '0.8rem',
    [theme.breakpoints.up('md')]: {
        fontSize: '1rem',
    },
}));

const statusToLabel = (s: number) => {
    switch (s) {
        case 0: return "Beklemede";
        case 1: return "Onaylandı";
        case 2: return "Reddedildi";
        default: return "-";
    }
};

const statusToColor = (s: number): 'warning' | 'success' | 'error' | 'primary' => {
    switch (s) {
        case 0: return "warning";
        case 1: return "success";
        case 2: return "error";
        default: return "primary";
    }
};

const ListRequestReceipt: React.FC = () => {
    const navigate = useNavigate();
    const { isTooltipGloballyEnabled } = useTooltip();

    // States
    const [requestsList, setRequestsList] = useState<RequestType[]>([]);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
    const [loadingData, setLoadingData] = useState<boolean>(true);
    const [loadingButton, setLoadingButton] = useState<boolean>(false);

    // Table States
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<RequestType | null>(null);
    const openMenu = Boolean(anchorEl);

    // Modals for Status Update
    const [openStatusModal, setOpenStatusModal] = useState(false);
    const [newStatus, setNewStatus] = useState<1 | 2 | null>(null); // 1: Tایید, 2: رد
    const [statusDescription, setStatusDescription] = useState<string>('');

    // Modals for Details/History
    const [openHistoryModal, setOpenHistoryModal] = useState(false);
    const [historyData, setHistoryData] = useState<RequestStatusHistory[]>([]);

    // Modals for Attachments/Description (از کامپوننت قبلی)
    const [openAttachmentsModal, setOpenAttachmentsModal] = useState(false);
    const [currentAttachments, setCurrentAttachments] = useState<Attachment[]>([]);
    const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
    const [fullDescriptionContent, setFullDescriptionContent] = useState<string>('');

    const { allowedOperations } = useAuth();
    // در این کامپوننت، ما به مجوز ویرایش نیاز داریم تا بتوانیم وضعیت را تغییر دهیم.
    const hasStatusUpdatePermission = useMemo(() => {
        return allowedOperations.some(op => op.systemOperationName === 'Düzenlemek');
    }, [allowedOperations]);

    // Utils & UX
    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
    }, []);

    const clearAlert = () => setAlertMessage(null);
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (alertMessage) timer = setTimeout(() => clearAlert(), 5000);
        return () => { if (timer) clearTimeout(timer); };
    }, [alertMessage]);


    // ==============================================================================
    // 3. DATA FETCHING (فراخوانی API)
    // ==============================================================================

    const fetchRequests = useCallback(async () => {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); setLoadingData(false); return; }

        try {
            const response = await axios.get(
                server.baseurl + server.hr + "get-all-requests",
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );
            if (response.data.httpStatusCode === 200 && response.data.data) {
                // فقط درخواست‌هایی که نیاز به پردازش دارند را نمایش می‌دهیم
                setRequestsList(response.data.data);
            } else {
                showAlert(response.data.message || 'Talepler alınamadı.', 'error');
            }
        } catch (e: any) {
            showAlert('Talepler yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate, showAlert]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);


    const handleOpenStatusModal = (status: 1 | 2) => {
        setNewStatus(status);
        setStatusDescription('');
        setOpenStatusModal(true);
        handleCloseMenu();
    };

    const handleCloseStatusModal = () => {
        setOpenStatusModal(false);
        setNewStatus(null);
        setStatusDescription('');
    };

    // ⬅️ API CALL: update-request-status
    const submitStatusUpdate = async () => {
        debugger
        if (!selectedRowForMenu || newStatus === null) return;

        // اگر رد شد و توضیحات ضروری است، اینجا اعتبار سنجی کنید
        if (newStatus === 2 && !statusDescription.trim()) {
            showAlert("Reddetme işlemi için açıklama girmelisiniz.", "warning");
            return;
        }

        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Kimlik doğrulama hatası.', 'error'); setLoadingButton(false); return; }

        try {
            const payload = {
                id: Number(selectedRowForMenu.id),
                status: newStatus,
                statusDescription: statusDescription.trim() || null,
            };

            const response = await axios.put(
                server.baseurl + server.hr + "update-request-status", // ⬅️ API تغییر وضعیت
                payload,
                { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } }
            );

            if (response.data.httpStatusCode === 200) {
                showAlert(`Talep başarıyla ${newStatus === 1 ? 'Onaylandı' : 'Reddedildi'}!`, 'success');
                handleCloseStatusModal();
                resetSelectedRow();
                fetchRequests();
            } else {
                showAlert(response.data.message || 'Durum güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };

    // ==============================================================================
    // 5. HISTORY/DETAILS LOGIC (منطق نمایش تاریخچه و پیوست)
    // ==============================================================================

    const handleOpenHistoryModal = (row: RequestType) => {
        setHistoryData(row.requestStatusHistories || []);
        setOpenHistoryModal(true);
    };

    const handleCloseHistoryModal = () => {
        setOpenHistoryModal(false);
        setHistoryData([]);
    };

    const handleOpenAttachmentsModal = (attachments: Attachment[]) => {
        setCurrentAttachments(attachments);
        setOpenAttachmentsModal(true);
    };

    const handleCloseAttachmentsModal = () => {
        setOpenAttachmentsModal(false);
        setCurrentAttachments([]);
    };

    const handleDownloadClick = (fileUrl: string) => {
        if (!fileUrl) {
            showAlert('Dosya adresi geçersiz.', 'error');
            return;
        }
        const url = `${server.urldpwonload}${fileUrl}`;
        window.open(url, '_blank');
        showAlert(`"${fileUrl.split('/').pop()}" dosyası indiriliyor.`, 'info');
    };

    const handleOpenDescriptionModal = (descriptionContent: string) => {
        setFullDescriptionContent(descriptionContent);
        setOpenDescriptionModal(true);
    };

    const handleCloseDescriptionModal = () => {
        setOpenDescriptionModal(false);
        setFullDescriptionContent('');
    };

    // Table Logic
    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: RequestType) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowForMenu(row);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        // setSelectedRowForMenu(null);
    };
    const resetSelectedRow = () => {
        setSelectedRowForMenu(null);
    };

    const handleChangePage = (_event: unknown, newPage: number) => setPage(newPage);
    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const paginatedRequestsList = useMemo(() => {
        return requestsList.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }, [requestsList, page, rowsPerPage]);


    return (
        <Box sx={{ p: 3, position: 'relative' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconInbox style={{ marginRight: 8 }} /> Gelen Talep Onayları
                </Typography>
            </Stack>

            {alertMessage && (
                <Stack sx={{ width: '100%', mt: 2, mb: 2 }} spacing={2}>
                    <Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert>
                </Stack>
            )}

            {/* Table Section */}
            <TableContainer component={Paper} sx={{ mt: 3 }}>
                {loadingData ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                        <CircularProgress />
                        <Typography variant="h6" sx={{ ml: 2 }}>Talepler yükleniyor...</Typography>
                    </Box>
                ) : (
                    <Table aria-label="Gelen talepler tablosu">
                        <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                            <TableRow>
                                <StyledTableCell sx={{ color: "#171c23" }}><Typography variant="h6">Başlık</Typography></StyledTableCell>
                                <StyledTableCell sx={{ color: "#171c23" }}><Typography variant="h6">Açıklama</Typography></StyledTableCell>
                                <StyledTableCell sx={{ color: "#171c23" }}><Typography variant="h6">Talep Eden</Typography></StyledTableCell>
                                <StyledTableCell sx={{ color: "#171c23" }}><Typography variant="h6">Durum</Typography></StyledTableCell>
                                <StyledTableCell sx={{ color: "#171c23" }}><Typography variant="h6">Ekler</Typography></StyledTableCell>
                                <StyledTableCell></StyledTableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedRequestsList.length > 0 ? (
                                paginatedRequestsList.map((row) => (
                                    <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <StyledTableCell><Typography variant="body1">{row.subject}</Typography></StyledTableCell>
                                        <StyledTableCell sx={{ maxWidth: 200, verticalAlign: 'top' }}>
                                            <Typography variant="body2" noWrap title={row.description || ''}>{row.description || '-'}</Typography>
                                            {row.description.length > 50 && (
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm açıklamayı gör" : ""}>
                                                    <Button variant="text" style={{ fontSize: "10px", padding: "2px 5px" }} onClick={() => handleOpenDescriptionModal(row.description)}>
                                                        Devamını Oku
                                                    </Button>
                                                </CustomTooltip>
                                            )}
                                        </StyledTableCell>
                                        <StyledTableCell><Typography variant="body1">{row.user?.username || 'Bilinmiyor'}</Typography></StyledTableCell>

                                        {/* Status Cell with History Icon */}
                                        <StyledTableCell>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <Chip label={statusToLabel(row.status)} color={statusToColor(row.status)} size="small" />
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Durum Geçmişini Gör" : ""}>
                                                    <IconButton size="small" onClick={() => handleOpenHistoryModal(row)} disabled={row.requestStatusHistories.length === 0}>
                                                        <IconInfoCircle size={18} />
                                                    </IconButton>
                                                </CustomTooltip>
                                            </Stack>
                                        </StyledTableCell>

                                        {/* Attachments Cell */}
                                        <StyledTableCell>
                                            {row.attachments && row.attachments.length > 0 ? (
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Ekleri görüntüle ve indir" : ""}>
                                                    <IconButton onClick={() => handleOpenAttachmentsModal(row.attachments)}>
                                                        <IconLink size={18} /> ({row.attachments.length})
                                                    </IconButton>
                                                </CustomTooltip>
                                            ) : (
                                                <Typography variant="body2" color="textSecondary">-</Typography>
                                            )}
                                        </StyledTableCell>

                                        {/* Actions Cell (Menu) */}
                                        <StyledTableCell>
                                            <IconButton onClick={(event) => handleClickMenu(event, row)}>
                                                <IconDots width={18} />
                                            </IconButton>
                                            <Menu anchorEl={anchorEl} open={openMenu && selectedRowForMenu?.id === row.id} onClose={handleCloseMenu}>

                                                {/* Onayla / Reddet Actions */}
                                                {hasStatusUpdatePermission && (row.status === 0 || row.status === 2) && (
                                                    <MuiMenuItem onClick={() => handleOpenStatusModal(1)}>
                                                        <ListItemIcon><IconChecks width={18} /></ListItemIcon> Onayla (Teyit Et)
                                                    </MuiMenuItem>
                                                )}
                                                {hasStatusUpdatePermission && (row.status === 0 || row.status === 1) && (
                                                    <MuiMenuItem onClick={() => handleOpenStatusModal(2)}>
                                                        <ListItemIcon><IconX width={18} /></ListItemIcon> Reddet (İptal Et)
                                                    </MuiMenuItem>
                                                )}

                                                {/* Detay/Açıklama/Ekler (اختیاری اگرچه در مودال‌های زیر هستند) */}

                                            </Menu>
                                        </StyledTableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <StyledTableCell colSpan={6} align="center">
                                        <Typography variant="subtitle1" color="textSecondary">Onay bekleyen talep bulunamadı.</Typography>
                                    </StyledTableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </TableContainer>

            <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={requestsList.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Satır başına düşen:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
            />
            <Dialog open={openStatusModal} onClose={handleCloseStatusModal} maxWidth="sm" fullWidth>
                <DialogTitle>{newStatus === 1 ? 'Talebi Onayla' : 'Talebi Reddet'}</DialogTitle>
                <DialogContent dividers>
                    <CustomFormLabel required={newStatus === 2}>Açıklama</CustomFormLabel>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        value={statusDescription}
                        onChange={(e) => setStatusDescription(e.target.value)}
                        placeholder={newStatus === 1 ? 'Onayınızla ilgili kısa bir not girin (isteğe bağlı)' : 'Reddetme nedenini açıklayın (zorunlu)'}
                        error={newStatus === 2 && !statusDescription.trim()}
                        helperText={newStatus === 2 && !statusDescription.trim() ? "Reddetme nedeni zorunludur." : ""}
                    />
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                        İşlemi onayladığınızda, talep durumu buna göre güncellenecektir.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseStatusModal} color="secondary" disabled={loadingButton}>İptal</Button>
                    <Button
                        onClick={submitStatusUpdate}
                        color={newStatus === 1 ? 'success' : 'error'}
                        variant="contained"
                        disabled={loadingButton || (newStatus === 2 && !statusDescription.trim())}
                    >
                        {loadingButton ? <CircularProgress size={24} /> : (newStatus === 1 ? 'Onayla' : 'Reddet')}
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog open={openHistoryModal} onClose={handleCloseHistoryModal} maxWidth="md" fullWidth>
                <DialogTitle>Talep Durum Geçmişi</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2}>
                        {historyData.length > 0 ? (
                            historyData.map((h, index) => (
                                <Paper key={index} elevation={1} sx={{ p: 2, borderLeft: `5px solid ${statusToColor(h.status)}` }}>
                                    <Box display="flex" justifyContent="space-between">
                                        <Chip label={statusToLabel(h.status)} color={statusToColor(h.status)} size="small" />
                                        <Typography variant="caption" color="textSecondary">
                                            {new Date(h.createAt).toLocaleString('tr-TR')}
                                        </Typography>
                                    </Box>
                                    <Divider sx={{ my: 1 }} />
                                    <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                                        Açıklama: {h.statusDescription || '—'}
                                    </Typography>
                                    <Typography variant="body2">
                                        İşlem Yapan: {h.user?.username || 'Bilinmiyor'}
                                    </Typography>
                                </Paper>
                            ))
                        ) : (
                            <Typography>Henüz durum geçmişi yok.</Typography>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseHistoryModal}>Kapat</Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={openDescriptionModal}
                onClose={handleCloseDescriptionModal}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Açıklamanın Tamamı</DialogTitle>
                <DialogContent dividers>
                    <DialogContentText>
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{fullDescriptionContent}</Typography>
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDescriptionModal} color="primary">Kapat</Button>
                </DialogActions>
            </Dialog>

            {/* Attachments Download Modal */}
            <Dialog open={openAttachmentsModal} onClose={handleCloseAttachmentsModal} maxWidth="sm" fullWidth>
                <DialogTitle>Ekler</DialogTitle>
                <DialogContent dividers>
                    {currentAttachments.map((attachment, index) => (
                        <Button
                            key={index}
                            fullWidth
                            variant="outlined"
                            onClick={() => handleDownloadClick(attachment.fileUrl)}
                            sx={{ mt: 1 }}
                            startIcon={<IconDownload />}
                        >
                            {attachment.fileUrl.split('/').pop()}
                        </Button>
                    ))}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseAttachmentsModal} color="primary">Kapat</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ListRequestReceipt;