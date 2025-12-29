// MaterialReceiptList.tsx

import React, { useState, useMemo } from "react";
import {
    Typography, Box, Stack, Button, CircularProgress, Paper, Chip, IconButton,
    TableContainer, Table, TableHead, TableRow, TableBody, Menu, ListItemIcon,
    TablePagination, MenuItem as MuiMenuItem, Dialog, DialogTitle, DialogActions,
    DialogContent, TextField,
    Divider,
} from '@mui/material';
import { IconChecks, IconX, IconInfoCircle, IconDots, IconLink, IconFileDownload } from '@tabler/icons-react';
import axios from 'axios';
import server from 'src/assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';

// ⬅️ Import توابع و واسط‌ها از فایل والد
import {
    MaterialRequestType, RequestStatusHistory, Attachment, CommonRequestType,
    StyledTableCell, statusToLabel, statusToColor, exportRequestPdf, exportRequestExcel,
} from './RequestReceiptTabs';
import { useNavigate } from "react-router";


// ==============================================================================
// 1. INTERFACES & PROPS
// ==============================================================================
interface MaterialReceiptListProps {
    requestsList: MaterialRequestType[];
    loadingData: boolean;
    fetchRequests: () => void;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
    hasStatusUpdatePermission: boolean;
    hasDownloadPermission: boolean;
    // ⬅️ Handlers از والد (برای Modalهای مشترک)
    handleOpenHistoryModal: (history: RequestStatusHistory[]) => void;
    handleOpenAttachmentsModal: (attachments: Attachment[]) => void;
    handleOpenDescriptionModal: (description: string) => void;
}

// ==============================================================================
// 2. MAIN COMPONENT
// ==============================================================================

const MaterialReceiptList: React.FC<MaterialReceiptListProps> = (props) => {

    const navigate = useNavigate();
    const { requestsList, loadingData, fetchRequests, showAlert, hasStatusUpdatePermission, hasDownloadPermission } = props;
    const { isTooltipGloballyEnabled } = useTooltip();

    // --- Table States (محلی) ---
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<CommonRequestType | null>(null);
    const openMenu = Boolean(anchorEl);

    // --- Status Update States (محلی) ---
    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [openStatusModal, setOpenStatusModal] = useState(false);
    const [newStatus, setNewStatus] = useState<1 | 2 | null>(null);
    const [statusDescription, setStatusDescription] = useState<string>('');

    // --- Download Modal State (محلی) ---
    const [openDownloadSingleModal, setOpenDownloadSingleModal] = useState(false);

    const [openDetailsModal, setOpenDetailsModal] = useState(false);
    const [viewingRow, setViewingRow] = useState<MaterialRequestType | null>(null);

    const handleOpenDetails = (row: MaterialRequestType) => {
        setViewingRow(row);
        setOpenDetailsModal(true);
    };

    // --- Handlers ---
    const handleCloseMenu = () => { setAnchorEl(null); };
    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: MaterialRequestType) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowForMenu(row);
    };

    const handleOpenStatusModal = (status: 1 | 2, row: MaterialRequestType) => {
        setSelectedRowForMenu(row);
        setNewStatus(status);
        setStatusDescription('');
        setOpenStatusModal(true);
        handleCloseMenu();
    };

    const handleCloseStatusModal = () => {
        setOpenStatusModal(false);
        setNewStatus(null);
        setStatusDescription('');
        setSelectedRowForMenu(null);
    };

    // --- API Call: Update Status ---
    const submitStatusUpdate = async () => {
        if (!selectedRowForMenu || newStatus === null) return;
        if (newStatus === 2 && !statusDescription.trim()) { showAlert("Reddetme nedeni zorunludur.", "warning"); return; }

        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Kimlik doğrulama hatası.', 'error'); setLoadingButton(false); return; }

        try {
            const payload = {
                id: Number(selectedRowForMenu.id), status: newStatus, statusDescription: statusDescription.trim() || null,
            };

            const response = await axios.put(server.baseurl + server.hr + "update-request-status", payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } });

            if (response.data.httpStatusCode === 200) {
                showAlert(`Malzeme talebi başarıyla ${newStatus === 1 ? 'Onaylandı' : 'Reddedildi'}!`, 'success');
                handleCloseStatusModal();
                fetchRequests();
            } else { showAlert(response.data.message || 'Durum güncellenirken bir hata oluştu.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        }
        finally { setLoadingButton(false); }
    };

    const handleChangePage = (_event: unknown, newPage: number) => setPage(newPage);
    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10)); setPage(0);
    };

    const paginatedRequestsList = useMemo(() => {
        return requestsList.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }, [requestsList, page, rowsPerPage]);


    // ==============================================================================
    // 3. RENDER
    // ==============================================================================
    return (
        <Box>
            <TableContainer component={Paper} sx={{ mt: 3 }}>
                {loadingData ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="200px"><CircularProgress /><Typography variant="h6" sx={{ ml: 2 }}>Malzeme Talepleri yükleniyor...</Typography></Box>
                ) : (
                    <Table aria-label="Malzeme Talep Listesi">
                        <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                            <TableRow>
                                <StyledTableCell sx={{ color: "#171c23" }}><Typography variant="h6">Başlık</Typography></StyledTableCell>
                                <StyledTableCell sx={{ color: "#171c23" }}><Typography variant="h6">Açıklama</Typography></StyledTableCell>
                                <StyledTableCell sx={{ color: "#171c23" }}><Typography variant="h6">Talep Eden</Typography></StyledTableCell>
                                <StyledTableCell sx={{ color: "#171c23" }}><Typography variant="h6">Durum</Typography></StyledTableCell>
                                <StyledTableCell sx={{ color: "#171c23" }}><Typography variant="h6">Ekler</Typography></StyledTableCell>
                                <StyledTableCell sx={{ color: "#171c23" }}><Typography variant="h6">Detay</Typography></StyledTableCell> {/* ⬅️ اضافه شد */}
                                <StyledTableCell></StyledTableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedRequestsList.length > 0 ? (
                                paginatedRequestsList.map((row) => (
                                    <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <StyledTableCell><Typography variant="body1">{row.subject}</Typography></StyledTableCell>

                                        <StyledTableCell sx={{ maxWidth: 150 }}>
                                            {row.description && row.description.trim().length > 0 ? (
                                                // حالت اول: اگر توضیحات وجود داشت (خالی نبود)
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm açıklamayı gör" : ""}>
                                                    <Button

                                                        variant="outlined"
                                                        style={{ fontSize: "10px", padding: "2px 5px" }}
                                                        onClick={() => props.handleOpenDescriptionModal(row.description)}
                                                    >
                                                        Açıklamayı Oku
                                                    </Button>
                                                </CustomTooltip>
                                            ) : (
                                                // حالت دوم: اگر توضیحات نال یا خالی بود
                                                <Typography variant="body2" align="center">
                                                    -
                                                </Typography>
                                            )}
                                        </StyledTableCell>
                                        <StyledTableCell><Typography variant="body1">{row.user?.username || 'Bilinmiyor'}</Typography></StyledTableCell>
                                        <StyledTableCell>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <Chip label={statusToLabel(row.status)} color={statusToColor(row.status)} size="small" />
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Durum Geçmişini Gör" : ""}>
                                                    <IconButton size="small" onClick={() => props.handleOpenHistoryModal(row.requestStatusHistories || [])}>
                                                        <IconInfoCircle size={18} />
                                                    </IconButton>
                                                </CustomTooltip>
                                            </Stack>
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            {row.attachments && row.attachments.length > 0 ? (
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Ekleri görüntüle ve indir" : ""}>
                                                    <IconButton onClick={() => props.handleOpenAttachmentsModal(row.attachments)}><IconLink size={18} /><Chip label={row.attachments.length} color="primary"></Chip></IconButton>
                                                </CustomTooltip>
                                            ) : (<Typography variant="body2" color="textSecondary">-</Typography>)}
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <Button
                                                variant="contained"
                                                size="small"
                                                color="info"
                                                onClick={() => handleOpenDetails(row)}
                                                startIcon={<IconInfoCircle size={16} />}
                                                sx={{ fontSize: '10px' }}
                                            >
                                                Detay
                                            </Button>
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <IconButton onClick={(event) => handleClickMenu(event, row)}><IconDots width={18} /></IconButton>
                                            <Menu anchorEl={anchorEl} open={openMenu && selectedRowForMenu?.id === row.id} onClose={handleCloseMenu}>
                                                {hasStatusUpdatePermission && (row.status === 0 || row.status === 2) && (
                                                    <MuiMenuItem onClick={() => handleOpenStatusModal(1, row)}><ListItemIcon><IconChecks width={18} /></ListItemIcon> Onayla</MuiMenuItem>
                                                )}
                                                {hasStatusUpdatePermission && (row.status === 0 || row.status === 1) && (
                                                    <MuiMenuItem onClick={() => handleOpenStatusModal(2, row)}><ListItemIcon><IconX width={18} /></ListItemIcon> Reddet</MuiMenuItem>
                                                )}
                                                {hasDownloadPermission && (
                                                    <MuiMenuItem onClick={() => { setSelectedRowForMenu(row); setOpenDownloadSingleModal(true); handleCloseMenu(); }}><ListItemIcon><IconFileDownload width={18} /></ListItemIcon> Bu satırı indir</MuiMenuItem>
                                                )}
                                            </Menu>
                                        </StyledTableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><StyledTableCell colSpan={6} align="center"><Typography variant="subtitle1" color="textSecondary">Göstermek için talep bulunamadı.</Typography></StyledTableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </TableContainer>

            <TablePagination rowsPerPageOptions={[5, 10, 25]} component="div"
                count={requestsList.length} rowsPerPage={rowsPerPage} page={page}
                onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Satır başına düşen:" labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
            />

            {/* --- Status Update Modal (محلی) --- */}
            <Dialog open={openStatusModal} onClose={handleCloseStatusModal} maxWidth="sm" fullWidth>
                <DialogTitle>{newStatus === 1 ? 'Talebi Onayla' : 'Talebi Reddet'}</DialogTitle>
                <DialogContent dividers>
                    <CustomFormLabel required={newStatus === 2}>Açıklama</CustomFormLabel>
                    <TextField fullWidth multiline rows={3} value={statusDescription} onChange={(e) => setStatusDescription(e.target.value)}
                        placeholder={newStatus === 1 ? 'Onayınızla ilgili kısa bir not girin (isteğe bağlı)' : 'Reddetme nedenini açıklayın (zorunlu)'}
                        error={newStatus === 2 && !statusDescription.trim()}
                        helperText={newStatus === 2 && !statusDescription.trim() ? "Reddetme nedeni zorunludur." : ""}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseStatusModal} color="secondary" disabled={loadingButton}>İptal</Button>
                    <Button onClick={submitStatusUpdate} color={newStatus === 1 ? 'success' : 'error'} variant="contained"
                        disabled={loadingButton || (newStatus === 2 && !statusDescription.trim())}
                    >
                        {loadingButton ? <CircularProgress size={24} color={newStatus === 1 ? 'success' : 'error'} /> : (newStatus === 1 ? 'Onayla' : 'Reddet')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* --- Download Modal (محلی) --- */}
            <Dialog open={openDownloadSingleModal} onClose={() => setOpenDownloadSingleModal(false)} maxWidth="xs">
                <DialogTitle>Talep Raporunu İndir</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 1 }}>
                        <Button variant="contained" color="primary" onClick={() => { if (selectedRowForMenu) { exportRequestPdf(selectedRowForMenu, 'Malzeme Talep Detay Raporu'); } setOpenDownloadSingleModal(false); }} startIcon={<IconFileDownload />}>PDF Olarak İndir</Button>
                        <Button variant="contained" color="success" onClick={() => { if (selectedRowForMenu) { exportRequestExcel(selectedRowForMenu, 'Malzeme Talep Detayları'); } setOpenDownloadSingleModal(false); }} startIcon={<IconFileDownload />}>Excel Olarak İndir</Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenDownloadSingleModal(false)} color="secondary">Kapat</Button></DialogActions>
            </Dialog>


            {/* --- Material Details Modal --- */}
            <Dialog open={openDetailsModal} onClose={() => setOpenDetailsModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ bgcolor: 'info.main', color: 'white' }}>
                    Malzeme Talep Detayları
                </DialogTitle>
                <DialogContent dividers>
                    {viewingRow && (
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <Box display="flex" justifyContent="space-between">
                                <Typography fontWeight="bold">Başlık:</Typography>
                                <Typography>{viewingRow.subject}</Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between">
                                <Typography fontWeight="bold">Talep Eden:</Typography>
                                <Typography>{viewingRow.user?.username || '-'}</Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between">
                                <Typography fontWeight="bold">Tarih:</Typography>
                                <Typography>{new Date(viewingRow.createAt).toLocaleDateString('tr-TR')}</Typography>
                            </Box>

                            <Divider />

                            <Typography fontWeight="bold">Açıklama:</Typography>
                            <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f9f9f9', minHeight: '100px' }}>
                                {/* استفاده از dangerouslySetInnerHTML در صورتی که متن حاوی تگ‌های HTML است */}
                                <div dangerouslySetInnerHTML={{ __html: viewingRow.description || 'Açıklama belirtilmemiş.' }} />
                            </Paper>

                            <Divider sx={{ my: 1 }} />

                            {/* دکمه‌های دانلود مستقیم داخل مودال */}
                            <Stack direction="row" spacing={2} justifyContent="center" sx={{ pt: 1 }}>
                                <Button
                                    variant="outlined"
                                    color="primary"
                                    startIcon={<IconFileDownload />}
                                    onClick={() => exportRequestPdf(viewingRow, 'Malzeme Talep Raporu')}
                                >
                                    PDF İndir
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="success"
                                    startIcon={<IconFileDownload />}
                                    onClick={() => exportRequestExcel(viewingRow, 'Malzeme Talep Detayları')}
                                >
                                    Excel İndir
                                </Button>
                            </Stack>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDetailsModal(false)} variant="contained" color="inherit">Kapat</Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
};

export default MaterialReceiptList;