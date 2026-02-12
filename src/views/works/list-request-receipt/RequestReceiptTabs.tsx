import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Typography, Box, Stack, Alert, Tab,
    TableCell as MuiTableCell, Dialog, DialogTitle, DialogActions, DialogContent,
    Button, Divider, DialogContentText, Chip, Paper,
} from '@mui/material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { styled } from '@mui/material/styles';
import {
    IconInbox,
} from '@tabler/icons-react';
import axios from 'axios';
import server from 'src/assets/address.json';
import { useAuth } from "src/context/AuthContext";

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ArialFont } from 'src/assets/fonts/Arial';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import Logo from 'src/assets/images/logos/logo.png';

import MaterialReceiptList from "./MaterialReceiptList";
import RentalReceiptList from "./RentalReceiptList";

interface User { username: string; }
export interface Workhouse { id: string; name: string; code: string; }
export interface RequestStatusHistory { status: 0 | 1 | 2; statusDescription: string; createAt: string; user: User; }
export interface Attachment { fileUrl: string; }

export interface MaterialRequestType {
    id: number | string; subject: string; description: string; status: 0 | 1 | 2;
    statusDescription: string | null; createAt: string; attachments: Attachment[];
    user?: User; requestStatusHistories?: RequestStatusHistory[];
}

export interface WorkhouseRentRequest {
    id: number | string; title: string; description: string; status: 0 | 1 | 2;
    statusdescription: string | null; createAt: string; attachments: Attachment[];
    workhouse: { id: string, name: string, code: string };

    workhouseName?: string; rentStartDate: string; rentEndDate: string; company: string; price: string; driverInfo: string;
    user?: User;
    requestStatusHistories?: RequestStatusHistory[];
}

export interface RentalRequestType {
    id: number | string; title: string; description: string; status: 0 | 1 | 2;
    statusDescription: string | null; createAt: string; attachments: Attachment[];
    user: User; requestStatusHistories: RequestStatusHistory[];
    workhouseName: string; rentStartDate: string; company: string;
}

export type CommonRequestType = MaterialRequestType | WorkhouseRentRequest;

export const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans', fontSize: '0.8rem',
    [theme.breakpoints.up('md')]: { fontSize: '1rem', },
}));

export const statusToLabel = (s: number) => {
    switch (s) { case 0: return "Beklemede"; case 1: return "Onaylandı"; case 2: return "Reddedildi"; default: return "-"; }
};
export const statusToColor = (s: number): 'warning' | 'success' | 'error' | 'primary' => {
    switch (s) { case 0: return "warning"; case 1: return "success"; case 2: return "error"; default: return "primary"; }
};
export const formatDateDisplay = (dateString: string | null): string => {
    if (!dateString) return "-";
    try { const date = new Date(dateString); return format(date, 'dd MMMM yyyy', { locale: tr }); } catch (e) { return "Geçersiz Tarih"; }
};
export const stripHtml = (htmlString: string): string => {
    if (!htmlString) return '';
    if (typeof window === 'undefined') return htmlString;
    const doc = new DOMParser().parseFromString(htmlString, 'text/html');
    return doc.body.textContent || "";
};

const cleanPrice = (priceString: string | null | undefined): string => {
    if (!priceString) return '-';
    const numericPart = String(priceString).replace(/[^0-9.]/g, '');
    return numericPart + ' TL';
};

const addPdfHeader = (doc: jsPDF, title: string) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const logoWidth = 35;
    const logoHeight = 18;
    const margin = 15;
    const logoX = pageWidth - logoWidth - margin;

    try {
        doc.addImage(Logo, 'PNG', logoX, 10, logoWidth, logoHeight);
    } catch (e) {
        console.error("Logo yüklenemedi", e);
    }

    // @ts-ignore
    doc.setFont('Arial', 'normal'); doc.setFontSize(14);
    doc.text(title, pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(10);
    // @ts-ignore
    doc.setFont('Arial', 'normal'); doc.text(`Tarih Raporu:`, 15, 35);
    // @ts-ignore
    doc.setFont('Arial', 'normal'); doc.text(`${formatDateDisplay(new Date().toISOString())}`, 45, 35);


    doc.setLineWidth(0.5);
    doc.line(15, 40, pageWidth - 15, 40);
};


const addPdfFooter = (doc: jsPDF) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFontSize(8);
    doc.setFont('Arial', 'normal');
    doc.setTextColor(100);

    const companyInfo = [
        'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
        'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR | Tel: +90 (232) 347 74 74',
        'http://www.setasbilisim.com.tr | e-mail:setas@setasbilisim.com.tr'
    ];

    let footerY = pageHeight - 20;
    companyInfo.forEach(line => {
        doc.text(line, pageWidth / 2, footerY, { align: 'center' });
        footerY += 4;
    });

    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.text('İmza', pageWidth - 20, pageHeight - 12, { align: 'right' });
    doc.line(pageWidth - 60, pageHeight - 10, pageWidth - 10, pageHeight - 10);

    const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
    const pageCount = (doc as any).internal.getNumberOfPages();
    doc.text(`Sayfa ${pageNumber} / ${pageCount}`, 15, pageHeight - 10);
};


export const exportRequestPdf = (requestData: CommonRequestType, title: string) => {
    const doc = new jsPDF();
    // @ts-ignore
    doc.addFileToVFS('Arial.ttf', ArialFont); doc.addFont('Arial.ttf', 'Arial', 'normal'); doc.setFont('Arial');

    const isMaterial = (requestData as MaterialRequestType).subject !== undefined;
    const isRental = !isMaterial;
    const rentalData = requestData as WorkhouseRentRequest;

    const tableData = [
        ['Başlık', isMaterial ? (requestData as MaterialRequestType).subject : rentalData.title],
        ['Talep Eden', requestData.user?.username || '-'],
        ['Durum', statusToLabel(requestData.status)],
        ['Tarih', new Date(requestData.createAt).toLocaleDateString('tr-TR')],
        ['Açıklama', stripHtml(requestData.description) || '-'],

        ...(isRental ? [
            ['Şantiye', rentalData.workhouseName || rentalData.workhouse?.name || '-'],
            ['Başlangıç Tarihi', formatDateDisplay(rentalData.rentStartDate)],
            ['Bitiş Tarihi', formatDateDisplay(rentalData.rentEndDate)],
            ['Fiyat', cleanPrice(rentalData.price)],
            ['Şirket', rentalData.company || '-'],
            ['Şoför Bilgisi', rentalData.driverInfo || '-'],
        ] : []),
    ];

    autoTable(doc, {
        startY: 55, head: [['Özellik', 'Değer']], body: tableData, theme: 'grid',
        // @ts-ignore
        styles: { font: 'Arial', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
        didDrawPage: (_data: any) => {
            addPdfHeader(doc, title); addPdfFooter(doc);
            // @ts-ignore
            doc.setFont('Arial', 'normal');
        },
        margin: { top: 40, bottom: 45 },
    });
    doc.save(`${title.replace(/ /g, '_')}_Raporu_${requestData.id}.pdf`);
};

export const exportRequestExcel = async (requestData: CommonRequestType, title: string) => {
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet(title);
    worksheet.views = [{ rightToLeft: false }];

    worksheet.addRow(['SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.']).font = { bold: true, size: 12 };
    worksheet.addRow(['Rapor Başlığı:', title]).font = { bold: true };
    worksheet.addRow(['Rapor Tarihi:', new Date().toLocaleDateString('tr-TR')]);
    worksheet.addRow([]); worksheet.addRow([]);

    worksheet.columns = [{ header: 'Özellik', key: 'key', width: 25 }, { header: 'Değer', key: 'value', width: 60 }];
    const isMaterial = (requestData as MaterialRequestType).subject !== undefined;

    worksheet.addRow({ key: 'Başlık', value: isMaterial ? (requestData as MaterialRequestType).subject : (requestData as WorkhouseRentRequest).title });
    worksheet.addRow({ key: 'Talep Eden', value: requestData.user?.username || '-' });
    worksheet.addRow({ key: 'Durum', value: statusToLabel(requestData.status) });
    worksheet.addRow({ key: 'Tarih', value: new Date(requestData.createAt).toLocaleDateString('tr-TR') });
    worksheet.addRow({ key: 'Açıklama', value: stripHtml(requestData.description) || '-' });

    if (!isMaterial) {
        const rentalData = requestData as WorkhouseRentRequest;
        const cleanedPriceValue = rentalData.price ? String(rentalData.price).replace(/[^0-9.]/g, '') : '';
        worksheet.addRow({ key: 'Şantiye', value: rentalData.workhouseName || rentalData.workhouse?.name || '-' });
        worksheet.addRow({ key: 'Başlangıç', value: formatDateDisplay(rentalData.rentStartDate) });
        worksheet.addRow({ key: 'Bitiş', value: formatDateDisplay(rentalData.rentEndDate) });
        worksheet.addRow({ key: 'Fiyat', value: cleanedPriceValue + ' TL' });
        worksheet.addRow({ key: 'Şirket', value: rentalData.company || '-' });
        worksheet.addRow({ key: 'Şoför Bilgisi', value: rentalData.driverInfo || '-' });
    }

    worksheet.addRow([]);
    worksheet.addRow(['Ekler']).font = { bold: true, size: 12 };
    // @ts-ignore
    if (requestData.attachments && requestData.attachments.length > 0) {
        worksheet.addRow(['Dosya Adı', 'URL']).font = { bold: true };
        requestData.attachments.forEach(att => { worksheet.addRow([att.fileUrl.split('/').pop() || '-', att.fileUrl]); });
    } else {
        worksheet.addRow(['Piyes bulunamadı']);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${title.replace(/ /g, '_')}_Raporu_${requestData.id}.xlsx`);
};
const RequestReceiptTabs: React.FC = () => {
    const navigate = useNavigate();
    const [currentTab, setCurrentTab] = useState('material');
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
    const [loadingData, setLoadingData] = useState<boolean>(true);

    const [materialRequests, setMaterialRequests] = useState<MaterialRequestType[]>([]);
    const [rentalRequests, setRentalRequests] = useState<WorkhouseRentRequest[]>([]);

    const [workhouses, setWorkhouses] = useState<Workhouse[]>([]);
    const [selectedRentalWorkhouseId, setSelectedRentalWorkhouseId] = useState<string | number>('');

    const [openHistoryModal, setOpenHistoryModal] = useState(false);
    const [historyData, setHistoryData] = useState<RequestStatusHistory[]>([]);
    const [openAttachmentsModal, setOpenAttachmentsModal] = useState(false);
    const [currentAttachments, setCurrentAttachments] = useState<Attachment[]>([]);
    const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
    const [fullDescriptionContent, setFullDescriptionContent] = useState<string>('');


    const { allowedOperations } = useAuth();
    const hasStatusUpdatePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Düzenlemek'), [allowedOperations]);
    const hasDownloadPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [allowedOperations]);

    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message); setAlertSeverity(severity);
    }, []);
    const clearAlert = () => setAlertMessage(null);

    const handleOpenHistoryModal = useCallback((history: RequestStatusHistory[]) => {
        setHistoryData(history);
        setOpenHistoryModal(true);
    }, []);
    const handleOpenAttachmentsModal = useCallback((attachments: Attachment[]) => {
        setCurrentAttachments(attachments);
        setOpenAttachmentsModal(true);
    }, []);
    const handleOpenDescriptionModal = useCallback((description: string) => {
        setFullDescriptionContent(description);
        setOpenDescriptionModal(true);
    }, []);
    const handleDownloadClick = (fileUrl: string) => {
        if (!fileUrl) { showAlert('Dosya adresi geçersiz.', 'error'); return; }
        const url = `${server.urldpwonload}${fileUrl}`;
        window.open(url, '_blank');
        showAlert(`"${fileUrl.split('/').pop()}" dosyası indiriliyor.`, 'info');
    };

    const fetchMaterialRequests = useCallback(async () => {
        if (currentTab !== 'material') return;
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); setLoadingData(false); return; }
        try {
            const response = await axios.get(server.baseurl + server.hr + "get-all-requests", { headers: { "Authorization": `Bearer ${authToken}` } });
            if (response.data.httpStatusCode === 200 && response.data.data) {
                setMaterialRequests(response.data.data);
            } else { setMaterialRequests([]); showAlert(response.data.message || 'Malzeme talepleri alınamadı.', 'error'); }
        } catch (e: any) { showAlert('Malzeme talepleri yüklenirken bir hata oluştu.', 'error'); } finally { setLoadingData(false); }
    }, [navigate, showAlert, currentTab]);

    const fetchWorkhouses = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        const role = localStorage.getItem('activeUserRoleName') || '';
        if (!authToken) {
            navigate("/");
            return;
        }
        let requestParams = {};
        if (role.toLowerCase() !== 'admin') {
            requestParams = { rolename: role };
        }
        try {
            const response = await axios.get(
                server.baseurl + server.initialoperations + "get-workhouse",
                {
                    headers: { "Authorization": `Bearer ${authToken}` },
                    params: requestParams
                }
            );
            if (response.data.httpStatusCode === 200 && response.data.data) {
                setWorkhouses(response.data.data.map((w: any) => ({ id: w.id, name: w.name, code: w.code })));
            }
        } catch (e) { }
    }, []);

    const fetchRentalRequests = useCallback(async (workhouseId: string | number) => {
        if (!workhouseId) { setRentalRequests([]); setLoadingData(false); return; }

        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        const role = localStorage.getItem('activeUserRoleName') || '';
        if (!authToken) {
            navigate("/");
            return;
        }
        let requestParams = {};
        if (role.toLowerCase() !== 'admin') {
            requestParams = { rolename: role };
        }

        try {
            const url = `${server.baseurl}${server.initialoperations}get-workhouse-rent-by-workhouse-id/${workhouseId}`;
            const response = await axios.get(url,
                {
                    headers: { "Authorization": `Bearer ${authToken}` },
                    params: requestParams
                });

            if (response.data.httpStatusCode === 200 && response.data.data) {
                const mappedData: WorkhouseRentRequest[] = response.data.data.map((r: any) => ({
                    ...r,
                    workhouseName: r.workhouse?.name || '-',
                    workhouse: r.workhouse,
                }));
                setRentalRequests(mappedData);
            } else { setRentalRequests([]); showAlert(response.data.message || 'Kiralama talepleri alınamadı.', 'error'); }
        } catch (e: any) { setRentalRequests([]); showAlert('Kiralama talepleri yüklenirken bir hata oluştu.', 'error'); } finally { setLoadingData(false); }
    }, [showAlert]);

    useEffect(() => {
        if (currentTab === 'material') {
            fetchMaterialRequests();
            setSelectedRentalWorkhouseId('');
        } else if (currentTab === 'rental') {
            fetchWorkhouses();
            if (selectedRentalWorkhouseId) {
                fetchRentalRequests(selectedRentalWorkhouseId);
            } else {
                setLoadingData(false);
            }
        }
    }, [currentTab, fetchMaterialRequests, fetchRentalRequests, fetchWorkhouses, selectedRentalWorkhouseId]);


    const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
        setCurrentTab(newValue);
        clearAlert();
    };


    const decodeLatin1ToUtf8 = (encodedString: string): string => {
        try {
            const bytes = new Uint8Array(encodedString.length);
            for (let i = 0; i < encodedString.length; i++) {
                bytes[i] = encodedString.charCodeAt(i);
            }
            const decoder = new TextDecoder('utf-8');
            return decoder.decode(bytes);

        } catch (e) {
            console.error("Decoding error:", e);
            return encodedString;
        }
    };


    return (
        <Box sx={{ p: 3, position: 'relative' }}>
            <TabContext value={currentTab}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap">
                    <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center' }}><IconInbox style={{ marginRight: 8 }} /> Talep Onay Yönetimi</Typography>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: { xs: 2, sm: 0 } }}>
                        <TabList onChange={handleTabChange} aria-label="Talep Türü Filtresi">
                            <Tab label="Malzeme Talepleri" value="material" />
                            <Tab label="Kiralama Talepleri" value="rental" />
                        </TabList>
                    </Box>
                </Stack>

                {alertMessage && (
                    <Stack sx={{ width: '100%', mt: 2, mb: 2 }} spacing={2}>
                        <Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert>
                    </Stack>
                )}

                <TabPanel value="material" sx={{ p: 0 }}>
                    <MaterialReceiptList
                        requestsList={materialRequests} loadingData={loadingData && currentTab === 'material'}
                        fetchRequests={fetchMaterialRequests} showAlert={showAlert}
                        hasStatusUpdatePermission={hasStatusUpdatePermission} hasDownloadPermission={hasDownloadPermission}
                        handleOpenHistoryModal={handleOpenHistoryModal}
                        handleOpenAttachmentsModal={handleOpenAttachmentsModal}
                        handleOpenDescriptionModal={handleOpenDescriptionModal}
                    />
                </TabPanel>

                <TabPanel value="rental" sx={{ p: 0 }}>
                    <RentalReceiptList
                        requestsList={rentalRequests}
                        loadingData={loadingData && currentTab === 'rental' && !!selectedRentalWorkhouseId}
                        fetchRequests={fetchRentalRequests} showAlert={showAlert}
                        hasStatusUpdatePermission={hasStatusUpdatePermission} hasDownloadPermission={hasDownloadPermission}
                        workhouses={workhouses}
                        selectedWorkhouseId={selectedRentalWorkhouseId}
                        setSelectedWorkhouseId={setSelectedRentalWorkhouseId}
                        handleOpenHistoryModal={handleOpenHistoryModal}
                        handleOpenAttachmentsModal={handleOpenAttachmentsModal}
                    />
                </TabPanel>
            </TabContext>
            <Dialog open={openHistoryModal} onClose={() => setOpenHistoryModal(false)} maxWidth="md" fullWidth>
                <DialogTitle>Talep Durum Geçmişi</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2}>
                        {historyData.length > 0 ? (
                            historyData.map((h, index) => (
                                <Paper key={index} elevation={1} sx={{ p: 2, borderLeft: `5px solid ${statusToColor(h.status)}` }}>
                                    <Box display="flex" justifyContent="space-between">
                                        <Chip label={statusToLabel(h.status)} color={statusToColor(h.status)} size="small" />
                                        <Typography variant="caption" color="textSecondary">{new Date(h.createAt).toLocaleString('tr-TR')}</Typography>
                                    </Box>
                                    <Divider sx={{ my: 1 }} />
                                    <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>Açıklama: {h.statusDescription || '—'}</Typography>
                                    <Typography variant="body2">İşlem Yapan: {h.user?.username || '-'}</Typography>
                                </Paper>
                            ))
                        ) : (<Typography>Henüz durum geçmişi yok.</Typography>)}
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenHistoryModal(false)}>Kapat</Button></DialogActions>
            </Dialog>

            <Dialog open={openDescriptionModal} onClose={() => setOpenDescriptionModal(false)} maxWidth="md" fullWidth>
                <DialogTitle>Açıklamanın Tamamı</DialogTitle>
                <DialogContent dividers>
                    <DialogContentText><div dangerouslySetInnerHTML={{ __html: fullDescriptionContent || '' }} /></DialogContentText>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenDescriptionModal(false)} color="primary">Kapat</Button></DialogActions>
            </Dialog>

            <Dialog open={openAttachmentsModal} onClose={() => setOpenAttachmentsModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Ekler</DialogTitle>
                <DialogContent dividers>


                    {currentAttachments.map((attachment, index) => {
                        const rawFileName = attachment.fileUrl.split('/').pop() || `Dosya ${index + 1}`;
                        let finalFileName = rawFileName;
                        try {
                            finalFileName = decodeURIComponent(finalFileName);
                        } catch (e) {
                        }
                        finalFileName = decodeLatin1ToUtf8(finalFileName);
                        finalFileName = finalFileName.replace(/%20/g, ' ');
                        return (
                            <Button
                                key={index}
                                fullWidth
                                variant="outlined"
                                onClick={() => handleDownloadClick(attachment.fileUrl)}
                                sx={{ mt: 1 }}
                            >
                                {finalFileName || `Dosya ${index + 1}`}
                            </Button>
                        );
                    })}
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenAttachmentsModal(false)} color="primary">Kapat</Button></DialogActions>
            </Dialog>
        </Box>
    );
};

export default RequestReceiptTabs;