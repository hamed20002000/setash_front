import React, { useEffect, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, CircularProgress, Box, TableContainer,
    Table, TableHead, TableRow, TableCell, TableBody, Paper, Stack
} from '@mui/material';
import axios from 'axios';
import server from 'src/assets/address.json';
import { useNavigate } from 'react-router-dom';
import { IconFileText, IconFileSpreadsheet } from '@tabler/icons-react';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

// Import PDF and Excel libraries
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Logo from 'src/assets/images/logos/logo.png';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

// Type Definitions
interface ItemBalanceType {
    itemId: string;
    code: string | null;
    name: string;
    balance: string;
}

interface ApiResponse<T> {
    success: boolean;
    httpStatusCode: number;
    message: string;
    data: T;
}

// Utility functions for PDF and Excel (can be moved to a separate file)
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

const addPdfHeader = (doc: jsPDF, title: string) => {

    const docAny = doc as any;
    docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
    docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
    doc.setFont('NotoSans');
    const pageWidth = doc.internal.pageSize.getWidth();
    const logoWidth = 35; // کمی کوچک‌تر برای ظرافت بیشتر
    const logoHeight = 18;
    const margin = 15;
    const logoX = pageWidth - logoWidth - margin; // لوگو سمت راست

    try {
        doc.addImage(Logo, 'PNG', logoX, 10, logoWidth, logoHeight);
    } catch (e) {
        console.error("Logo yüklenemedi", e);
    }

    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(14);
    doc.text(title, pageWidth / 2, 25, { align: 'center' }); // عنوان وسط

    doc.setFontSize(10);
    doc.setFont('NotoSans', 'bold');
    doc.text(`Rapor Tarihi:`, 15, 35);
    doc.setFont('NotoSans', 'normal');
    doc.text(`${formatDateDisplay(new Date().toISOString())}`, 40, 35);

    // اضافه کردن خط جداکننده خاکستری طبق استاندارد جدید
    // doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(15, 40, pageWidth - 15, 40);
};

const addPdfFooter = (doc: jsPDF) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFontSize(8);
    doc.setFont('NotoSans', 'normal');
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


const addExcelHeader = (worksheet: Excel.Worksheet, title: string, columnsLength: number) => {
    worksheet.views = [{ rightToLeft: false }];
    const titleRow = worksheet.addRow([title]);
    titleRow.font = { name: 'NotoSans', size: 14, bold: true };
    worksheet.mergeCells(titleRow.number, 1, titleRow.number, columnsLength);
    titleRow.getCell(1).alignment = { horizontal: 'center' };
    const dateRow = worksheet.addRow([`Rapor Tarihi: ${formatDateDisplay(new Date().toISOString())}`]);
    dateRow.font = { name: 'NotoSans', size: 10, bold: false };
    dateRow.getCell(1).alignment = { horizontal: 'left' };
    worksheet.mergeCells(dateRow.number, 1, dateRow.number, columnsLength);
    worksheet.addRow([]);
};

const addExcelCompanyInfo = (worksheet: Excel.Worksheet, startRow: number, columnsLength: number) => {
    const companyInfo = [
        'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
        'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
        'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr',
    ];
    let rowNum = startRow;
    companyInfo.forEach(line => {
        const row = worksheet.getRow(rowNum);
        row.getCell(1).value = line;
        row.getCell(1).alignment = { horizontal: 'center', readingOrder: 'ltr' };
        row.getCell(1).font = { name: 'NotoSans', size: 8, bold: false };
        worksheet.mergeCells(`A${rowNum}:${String.fromCharCode(65 + columnsLength - 1)}${rowNum}`);
        rowNum++;
    });
};

// Main Component
interface ViewStoreBalanceModalProps {
    open: boolean;
    onClose: () => void;
    storeId: number | null;
    storeName: string | null;
}

const ViewStoreBalanceModal: React.FC<ViewStoreBalanceModalProps> = ({ open, onClose, storeId, storeName }) => {
    const [itemsBalance, setItemsBalance] = useState<ItemBalanceType[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const { isTooltipGloballyEnabled } = useTooltip();

    useEffect(() => {
        if (open && storeId !== null) {
            fetchStoreItemsBalance();
        }
    }, [open, storeId]);

    const fetchStoreItemsBalance = async () => {
        setLoading(true);
        setError(null);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            return;
        }

        try {
            const response = await axios.get<ApiResponse<ItemBalanceType[]>>(
                `${server.baseurl}${server.warehouse}get-store-all-items-balance/${storeId}`,
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );

            if (response.data.httpStatusCode === 200) {
                setItemsBalance(response.data.data);
            } else {
                setError(response.data.message || 'Mevcut veriler yüklenirken bir hata oluştu.');
            }
        } catch (e: any) {
            setError(e.response?.data?.message || 'Sunucu ile iletişim kurarken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPDFClick = () => {

        if (itemsBalance.length === 0 || !storeName) {
            // می‌توانید یک پیام هشدار به کاربر نمایش دهید
            return;
        }

        const doc = new jsPDF();
        const docAny = doc as any;

        // تنظیم فونت
        docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.setFont('NotoSans');

        const title = `${storeName} Envanter Raporu`;
        const columns = ["Malzeme Adı", "Mevcut Miktar"];
        const rows = itemsBalance.map(item => [item.name, Number(item.balance).toFixed(2)]);


        const totalBalance = itemsBalance.reduce((sum, item) => sum + Number(item.balance), 0);
        const totalRows = [['Toplam Mevcut', totalBalance.toFixed(2)]];

        const addPageHeader = (title: string, data: any) => {
            // اگر صفحه اول بود، عنوان اصلی و اطلاعات انبار را نمایش می‌دهد
            if (data.pageNumber === 1) {
                addPdfHeader(doc, title);
                doc.setFontSize(12);
                doc.text(`Depo Adı: ${storeName}`, 15, 45);
            } else {
                // در صفحات بعدی فقط عنوان اصلی را نمایش می‌دهد
                addPdfHeader(doc, title);
            }
        };

        autoTable(docAny, {
            startY: 55, // شروع جدول از پایین هدر
            head: [columns],
            body: rows,
            theme: 'grid',
            styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
            headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0], font: 'NotoSans' },
            didDrawPage: (data: any) => {
                addPageHeader(title, data);
                addPdfFooter(doc);
            },
            margin: { top: 50, bottom: 20 }
        });

        const finalY = (docAny.lastAutoTable?.finalY || 55) + 10;
        autoTable(docAny, {
            startY: finalY,
            head: [['', '']],
            body: totalRows,
            theme: 'plain',
            styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 12, cellPadding: 2, overflow: 'linebreak' },
            didDrawPage: () => {
                addPdfFooter(doc);
            }
        });

        doc.save(`${storeName}_envanter.pdf`);
    };

    const handleDownloadExcelClick = async () => {
        if (itemsBalance.length === 0 || !storeName) {
            // می‌توانید یک پیام هشدار به کاربر نمایش دهید
            return;
        }

        const workbook = new Excel.Workbook();
        // نام ورک‌شیت را تمیز می‌کند تا کاراکترهای غیرمجاز حذف شوند
        const safeSheetName = `${storeName} Envanter`.replace(/[\\/*?[\]:]/g, '_');
        const worksheet = workbook.addWorksheet(safeSheetName);

        const columns = ["Malzeme Adı", "Mevcut Miktar"];
        addExcelHeader(worksheet, `${storeName} Envanter Raporu`, columns.length);

        // افزودن اطلاعات انبار
        worksheet.addRow(['Depo Adı:', storeName]).font = { bold: true };
        worksheet.addRow([]); // یک ردیف خالی برای فاصله

        const headerRow = worksheet.addRow(columns);
        headerRow.font = { name: 'NotoSans', bold: true };
        headerRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        });

        itemsBalance.forEach(item => {
            worksheet.addRow([item.name, Number(item.balance).toFixed(2)]);
        });

        worksheet.addRow([]); // یک ردیف خالی برای فاصله
        const totalBalance = itemsBalance.reduce((sum, item) => sum + Number(item.balance), 0);
        const totalRow = worksheet.addRow(['Toplam Mevcut', totalBalance.toFixed(2)]);
        totalRow.font = { bold: true };
        totalRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        });

        worksheet.eachRow({ includeEmpty: false }, (row) => {
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const column = worksheet.getColumn(colNumber);
                if (column) {
                    if (column.width === undefined) {
                        column.width = 10;
                    }

                    const columnLength = cell.value ? cell.value.toString().length : 10;
                    if (columnLength > column.width) {
                        column.width = columnLength + 2;
                    }
                }
            });
        });
        const lastRowNumber = worksheet.lastRow ? worksheet.lastRow.number : 0;
        addExcelCompanyInfo(worksheet, lastRowNumber + 2, columns.length);

        workbook.xlsx.writeBuffer().then(buffer => {
            saveAs(new Blob([buffer]), `${safeSheetName}.xlsx`);
        });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">
                        {storeName} Envanteri
                    </Typography>
                    <Stack direction="row" spacing={1}>
                        <CustomTooltip title={isTooltipGloballyEnabled ? "PDF olarak indir" : ""}>
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<IconFileText />}
                                onClick={handleDownloadPDFClick}
                                disabled={loading || itemsBalance.length === 0}
                            >
                                PDF
                            </Button>
                        </CustomTooltip>
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Excel olarak indir" : ""}>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<IconFileSpreadsheet />}
                                onClick={handleDownloadExcelClick}
                                disabled={loading || itemsBalance.length === 0}
                            >
                                Excel
                            </Button>
                        </CustomTooltip>
                    </Stack>
                </Box>
            </DialogTitle>
            <DialogContent dividers>
                {loading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                        <CircularProgress />
                        <Typography variant="h6" sx={{ ml: 2 }}>Envanter yükleniyor...</Typography>
                    </Box>
                ) : error ? (
                    <Typography color="error" sx={{ textAlign: 'center' }}>{error}</Typography>
                ) : itemsBalance.length > 0 ? (
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell><Typography variant="h6">Malzeme Adı</Typography></TableCell>
                                    <TableCell><Typography variant="h6">Mevcut Miktar</Typography></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {itemsBalance.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{item.name}</TableCell>
                                        <TableCell>{Number(item.balance).toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Typography sx={{ textAlign: 'center' }}>Bu depo için envanter bulunamadı.</Typography>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="primary">Kapat</Button>
            </DialogActions>
        </Dialog>
    );
};

export default ViewStoreBalanceModal;