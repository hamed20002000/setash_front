import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Typography, Box, Stack, Grid, Button, Alert,
    CircularProgress, Paper, Chip, IconButton,
    TableContainer, Table, TableHead, TableRow, TableBody, Menu, ListItemIcon,
    TablePagination,
    TableCell as MuiTableCell,
    MenuItem as MuiMenuItem,
    Dialog,
    DialogTitle,
    DialogActions,
    DialogContent,
    DialogContentText
} from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import {
    IconFileText, // ⬅️ آیکون پیشنهادی برای "Talepler"
    IconPlus, IconTrash, IconEdit,
    IconDots, IconDownload,
    IconLink, IconX
} from '@tabler/icons-react';
import axios from 'axios';
import server from 'src/assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import DeleteRequest from './DeleteRequest'; // ⬅️ کامپوننت حذف جدید
import { useAuth } from "src/context/AuthContext";

interface Attachment {
    fileUrl: string;
}

interface RequestType {
    id: number | string;
    subject: string;
    description: string;
    status: 0 | 1 | 2; // 0: Beklemede, 1: Onaylandı, 2: Reddedildi
    createAt: string;
    attachments: Attachment[];
}

// ==============================================================================
// 2. STYLED COMPONENTS & UTILS
// ==============================================================================

const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans',
    fontSize: '0.8rem',
    [theme.breakpoints.up('md')]: {
        fontSize: '1rem',
    },
}));

const blinkAnimation = keyframes`
    0% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
    50% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(103, 58, 183, 0.7); }
    100% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
`;
const BlinkingButton = styled(Button)<{ isBlinking: boolean }>(({ isBlinking }) => ({
    animation: isBlinking ? `${blinkAnimation} 1.5s infinite` : 'none',
    transition: 'transform 0.3s ease-in-out',
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
const ListRequests: React.FC = () => {
    const navigate = useNavigate();
    const { isTooltipGloballyEnabled } = useTooltip();

    // States
    const [requestsList, setRequestsList] = useState<RequestType[]>([]);
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
    const [currentAttachments, setCurrentAttachments] = useState<Attachment[]>([]);
    const [attachmentsInEdit, setAttachmentsInEdit] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [loadingData, setLoadingData] = useState<boolean>(true);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isBlinking, setIsBlinking] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<RequestType | null>(null);
    const [subjectError, setSubjectError] = useState(false);


    // Table States
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<RequestType | null>(null);
    const openMenu = Boolean(anchorEl);


    const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
    const [fullDescriptionContent, setFullDescriptionContent] = useState<string>('');

    // Modals
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [openAttachmentsModal, setOpenAttachmentsModal] = useState(false);

    const { allowedOperations } = useAuth();
    const hasCreatePermission = useMemo(() => {
        return allowedOperations.some(op => op.systemOperationName === 'Eklemek');
    }, [allowedOperations]);
    const hasEditPermission = useMemo(() => {
        return allowedOperations.some(op => op.systemOperationName === 'Düzenlemek');
    }, [allowedOperations]);
    const hasDeletePermission = useMemo(() => {
        return allowedOperations.some(op => op.systemOperationName === 'Silmek');
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

    useEffect(() => {
        const timer = setTimeout(() => setIsBlinking(false), 5000);
        return () => clearTimeout(timer);
    }, []);


    // ==============================================================================
    // 4. DATA FETCHING
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


    // ==============================================================================
    // 5. CRUD LOGIC
    // ==============================================================================

    const validateForm = (): boolean => {
        setSubjectError(false);
        if (!subject.trim()) {
            setSubjectError(true);
            showAlert("Lütfen Konu/Başlık alanını doldurun.", "warning");
            return false;
        }
        return true;
    };

    const resetForm = () => {
        setSubject('');
        setDescription('');
        setFilesToUpload([]);
        setAttachmentsInEdit([]);
        setIsEditing(false);
        setItemToEdit(null);
        setSubjectError(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ⬅️ CREATE LOGIC (شامل آپلود فایل)
    const createRequest = async () => {
        if (!validateForm()) return;

        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error'); setLoadingButton(false); return; }

        try {
            let attachmentsPayload: Attachment[] = [];
            if (filesToUpload.length > 0) {
                const formData = new FormData();
                filesToUpload.forEach(file => formData.append('files', file));

                const uploadResponse = await axios.post(
                    server.baseurl + server.baseinfo + "upload-files",
                    formData,
                    { headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${authToken}` } }
                );

                if (uploadResponse.data.httpStatusCode === 201) {
                    const fileUrls = uploadResponse.data.data.files;
                    attachmentsPayload = fileUrls.map((url: string) => ({ fileUrl: url }));
                } else {
                    showAlert('Dosyalar yüklenirken bir hata oluştu.', 'error');
                    setLoadingButton(false);
                    return;
                }
            }

            const payload = {
                subject: subject,
                description: description,
                attachments: attachmentsPayload,
            };

            const response = await axios.post(
                server.baseurl + server.hr + "create-Request", // ⬅️ API ثبت
                payload,
                { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } }
            );

            if (response.data.httpStatusCode === 201) {
                showAlert('Talep başarıyla oluşturuldu!', 'success');
                resetForm();
                setIsFormVisible(false);
                fetchRequests();
            } else {
                showAlert(response.data.message || 'Talep oluşturulurken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };

    // ⬅️ UPDATE LOGIC (شامل حفظ پیوست‌های قدیمی)
    const updateRequest = async () => {
        if (!validateForm() || !itemToEdit || !itemToEdit.id) return;

        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error'); setLoadingButton(false); return; }

        try {
            let newAttachmentsPayload: Attachment[] = [];

            // 1. آپلود فایل‌های جدید
            if (filesToUpload.length > 0) {
                // ... (منطق آپلود فایل دقیقاً مانند createRequest) ...
                const formData = new FormData();
                filesToUpload.forEach(file => formData.append('files', file));
                const uploadResponse = await axios.post(
                    server.baseurl + server.baseinfo + "upload-files",
                    formData,
                    { headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${authToken}` } }
                );
                if (uploadResponse.data.httpStatusCode === 201) {
                    const newFileUrls = uploadResponse.data.data.files;
                    newAttachmentsPayload = newFileUrls.map((url: string) => ({ fileUrl: url }));
                } else {
                    showAlert('Yeni dosyalar yüklenirken bir hata oluştu.', 'error');
                    setLoadingButton(false);
                    return;
                }
            }

            // 2. حفظ پیوست‌های قبلی که حذف نشده‌اند
            const keptExistingAttachments = itemToEdit.attachments
                .filter(att => attachmentsInEdit.includes(att.fileUrl.split('/').pop() || ''))
                .map(att => ({ fileUrl: att.fileUrl }));

            const finalAttachments = [...keptExistingAttachments, ...newAttachmentsPayload];

            const payload = {
                id: Number(itemToEdit.id),
                subject,
                description,
                attachments: finalAttachments,
            };

            const response = await axios.put(
                server.baseurl + server.hr + "update-request", // ⬅️ API آپدیت
                payload,
                { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } }
            );

            if (response.data.httpStatusCode === 200) {
                showAlert('Talep başarıyla güncellendi!', 'success');
                resetForm();
                setIsFormVisible(false);
                fetchRequests();
            } else {
                showAlert(response.data.message || 'Talep güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };

    const handleEditClick = (row: RequestType) => {
        resetForm();
        setIsEditing(true);
        setItemToEdit(row);
        setSubject(row.subject);
        setDescription(row.description);

        // تنظیم فایل‌های موجود برای نگهداری
        if (row.attachments && row.attachments.length > 0) {
            const fileNames = row.attachments.map(att => att.fileUrl.split('/').pop() || '');
            setAttachmentsInEdit(fileNames);
        } else {
            setAttachmentsInEdit([]);
        }

        setIsFormVisible(true);
        handleCloseMenu();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            setFilesToUpload(prev => [...prev, ...Array.from(files)]);
            const fileNames = Array.from(files).map(file => file.name);

            // نمایش فایل‌های جدید در لیست پیوست‌های در حال ویرایش
            setAttachmentsInEdit(prev => [...prev, ...fileNames]);
        }
    };

    // حذف یک فایل از لیست فایل‌های موجود (هنگام ویرایش)
    const handleRemoveAttachmentInEdit = (fileNameToRemove: string) => {
        // حذف از لیست نام‌های فایل‌های موجود
        setAttachmentsInEdit(prev => prev.filter(file => file !== fileNameToRemove));

        // اگر این فایل تازه انتخاب شده بود، از لیست آپلود هم حذف شود
        setFilesToUpload(prev => prev.filter(file => file.name !== fileNameToRemove));
    };

    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: RequestType) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowForMenu(row);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };

    const handleClickOpenDeleteModal = (row: RequestType) => {
        setSelectedRowForMenu(row);
        setOpenDeleteModal(true);
        handleCloseMenu();
    };

    const handleOpenAttachmentsModal = (attachments: Attachment[]) => {
        setCurrentAttachments(attachments);
        setOpenAttachmentsModal(true);
    };

    const handleCloseAttachmentsModal = () => {
        setOpenAttachmentsModal(false);
        setCurrentAttachments([]);
    };

    // ⬅️ تابع دانلود فایل پیوست شده (درخواستی شما)
    const handleDownloadClick = (fileUrl: string) => {
        if (!fileUrl) {
            showAlert('Dosya adresi geçersiz.', 'error');
            return;
        }
        // فرض می‌کنیم server.urldpwonload آدرس پایه برای دانلود است
        const url = `${server.urldpwonload}${fileUrl}`;
        window.open(url, '_blank');
        showAlert(`"${fileUrl.split('/').pop()}" dosyası indiriliyor.`, 'info');
    };

    // Table Pagination Handlers
    const handleChangePage = (_event: unknown, newPage: number) => setPage(newPage);
    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const paginatedRequestsList = useMemo(() => {
        return requestsList.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }, [requestsList, page, rowsPerPage]);


    const handleOpenDescriptionModal = (descriptionContent: string) => {
        setFullDescriptionContent(descriptionContent);
        setOpenDescriptionModal(true);
    };

    const handleCloseDescriptionModal = () => {
        setOpenDescriptionModal(false);
        setFullDescriptionContent('');
    };


    return (
        <Box sx={{ p: 3, position: 'relative' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconFileText style={{ marginRight: 8 }} /> Talepler Listesi
                </Typography>
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    alignItems="stretch"
                    justifyContent="flex-end"
                >
                    {!isFormVisible && (
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Talep kaydetmek için tıklayınız" : ""}>
                            <BlinkingButton
                                variant="contained"
                                color="primary"
                                onClick={() => { setIsFormVisible(true); resetForm(); }}
                                isBlinking={isBlinking}
                                fullWidth={false}
                            >
                                Yeni Talep Kaydet
                            </BlinkingButton>
                        </CustomTooltip>
                    )}
                    {isFormVisible && (
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
                            <Button
                                variant="contained"
                                color="error"
                                onClick={() => { setIsFormVisible(false); resetForm(); }}
                                fullWidth={false}
                                startIcon={<IconX size={20} />}
                            >
                                Gizle
                            </Button>
                        </CustomTooltip>
                    )}
                </Stack>
            </Stack>

            {/* Form Bölümü */}
            {((isFormVisible && hasCreatePermission) || (isEditing && hasEditPermission)) && (
                <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" mb={2}>{isEditing ? 'Talebi Düzenle' : 'Yeni Talep Oluştur'}</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={12}>
                            <CustomFormLabel htmlFor="request-subject" required>Konu / Başlık</CustomFormLabel>
                            <CustomTextField
                                id="request-subject"
                                placeholder="Talep Başlığı"
                                size="small"
                                fullWidth
                                value={subject}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)}
                                error={subjectError}
                                helperText={subjectError ? "Konu alanı zorunludur." : ""}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <CustomFormLabel htmlFor="request-description">Açıklama</CustomFormLabel>
                            <CustomTextField
                                id="request-description"
                                placeholder="Talep Detayları"
                                multiline
                                rows={4}
                                fullWidth
                                value={description}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
                            />
                        </Grid>
                    </Grid>

                    {/* Attachments Section */}
                    <Paper elevation={1} sx={{ p: 2, mt: 3 }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                            <CustomFormLabel htmlFor="request-attachments">Ekler (PDF, Excel)</CustomFormLabel>
                            <Button size="small" onClick={() => fileInputRef.current?.click()} startIcon={<IconPlus />} variant="outlined">
                                Dosya Ekle
                            </Button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                                multiple
                                accept=".pdf, .xls, .xlsx"
                            />
                        </Stack>
                        <Box sx={{ border: '1px solid #ccc', borderRadius: '4px', p: 1, minHeight: 50, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {attachmentsInEdit.length > 0 ? (
                                attachmentsInEdit.map((fileName, index) => (
                                    <Chip
                                        key={index}
                                        label={fileName}
                                        onDelete={() => handleRemoveAttachmentInEdit(fileName)}
                                        sx={{ mr: 1, mb: 1 }}
                                    />
                                ))
                            ) : (
                                <Typography variant="body2" color="textSecondary" sx={{ m: 'auto' }}>
                                    Henüz eklenmiş dosya yok.
                                </Typography>
                            )}
                        </Box>
                    </Paper>

                    {/* Form Actions */}
                    <Stack direction="row" spacing={1} justifyContent="flex-end" mt={3}>
                        {isEditing ? (
                            <>
                                <Button variant="contained" color="primary" onClick={updateRequest} disabled={loadingButton}>
                                    {loadingButton ? 'Bekleniyor...' : 'Güncellemeyi Kaydet'}
                                </Button>
                                <Button variant="outlined" color="secondary" onClick={() => { setIsFormVisible(false); resetForm(); }}>
                                    İptal Et
                                </Button>
                            </>
                        ) : (
                            <Button variant="contained" color="info" onClick={createRequest} disabled={loadingButton}>
                                {loadingButton ? 'Bekleniyor...' : 'Talep Oluştur'}
                            </Button>
                        )}
                    </Stack>
                </Paper>
            )}

            {alertMessage && (
                <Stack sx={{ width: '100%', mt: 2 }} spacing={2}>
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
                    <Table aria-label="Talepler tablosu">
                        <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                            <TableRow>
                                <StyledTableCell sx={{ color: "#171c23" }}><Typography variant="h6">Başlık</Typography></StyledTableCell>
                                <StyledTableCell sx={{ color: "#171c23" }}><Typography variant="h6">Açıklama</Typography></StyledTableCell>
                                <StyledTableCell sx={{ color: "#171c23" }}><Typography variant="h6">Durum</Typography></StyledTableCell>
                                <StyledTableCell sx={{ color: "#171c23" }}><Typography variant="h6">Tarih</Typography></StyledTableCell>
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
                                                    <Button variant="text" style={{ fontSize: "10px", padding: "2px 5px" }} onClick={() => {
                                                        handleOpenDescriptionModal(row.description);
                                                    }}>
                                                        Devamını Oku
                                                    </Button>
                                                </CustomTooltip>
                                            )}
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <Chip label={statusToLabel(row.status)} color={statusToColor(row.status)} size="small" />
                                        </StyledTableCell>
                                        <StyledTableCell><Typography variant="body1">{new Date(row.createAt).toLocaleDateString('tr-TR')}</Typography></StyledTableCell>
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
                                        <StyledTableCell>
                                            <IconButton onClick={(event) => handleClickMenu(event, row)}>
                                                <IconDots width={18} />
                                            </IconButton>
                                            <Menu anchorEl={anchorEl} open={openMenu && selectedRowForMenu?.id === row.id} onClose={handleCloseMenu}>
                                                {hasEditPermission && (
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu kaydı düzenle" : ""}>
                                                        <MuiMenuItem onClick={() => handleEditClick(row)} disabled={row.status !== 0}>
                                                            <ListItemIcon><IconEdit width={18} /></ListItemIcon> Düzenle
                                                        </MuiMenuItem>
                                                    </CustomTooltip>

                                                )}
                                                {hasDeletePermission && (
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu kaydı sil" : ""}>
                                                        <MuiMenuItem onClick={() => handleClickOpenDeleteModal(row)}>
                                                            <ListItemIcon><IconTrash width={18} /></ListItemIcon> Silmek
                                                        </MuiMenuItem>
                                                    </CustomTooltip>

                                                )}
                                            </Menu>
                                        </StyledTableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <StyledTableCell colSpan={6} align="center">
                                        <Typography variant="subtitle1" color="textSecondary">Henüz kayıtlı bir talep bulunamadı.</Typography>
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

            {/* Delete Modal (Gereksizse kaldırılabilir) */}
            <DeleteRequest
                openModal={openDeleteModal}
                itemToDelete={selectedRowForMenu}
                onClose={() => setOpenDeleteModal(false)}
                onDeleteSuccess={fetchRequests}
                showAlert={showAlert}
            />
        </Box>
    );
};

export default ListRequests;