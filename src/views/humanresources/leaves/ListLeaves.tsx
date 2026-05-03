// src/views/hr/Leaves/ListLeaves.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    Typography, Chip, Menu, IconButton, ListItemIcon, Box,
    TableCell as MuiTableCell, MenuItem as MuiMenuItem, Stack, Grid, Button,
    Alert, TablePagination, TextField, InputAdornment, TableSortLabel,
    Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
    MenuItem, Select,
    Divider
} from "@mui/material";
import { styled, keyframes } from "@mui/material/styles";

import BlankCard from "src/components/shared/BlankCard";
import CustomFormLabel from "src/components/forms/theme-elements/CustomFormLabel";
import { useTooltip, CustomTooltip } from "src/context/TooltipContext";
import { useAuth } from "src/context/AuthContext";

import { IconDots, IconTrash, IconSearch, IconFileDownload, IconX, IconRefresh } from "@tabler/icons-react";
import DoneRoundedIcon from "@mui/icons-material/DoneRounded";
import DoNotDisturbOnRoundedIcon from "@mui/icons-material/DoNotDisturbOnRounded";
import axios from "axios";
import server from "src/assets/address.json";
import DeleteLeaves from "./DeleteLeaves";
import jsPDF from "jspdf";
import { autoTable } from "jspdf-autotable";
import Excel from "exceljs";
import { saveAs } from "file-saver";
import Logo from "src/assets/images/logos/logo.png";
import { NotoSansRegular } from "src/assets/fonts/NotoSans-Regular";
import { TimesNewRoman } from "src/assets/fonts/Times";
import { ArialFont } from "src/assets/fonts/Arial";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { Autocomplete } from "@mui/material";
import { differenceInMinutes, differenceInDays, format } from 'date-fns';


import { tr } from 'date-fns/locale';

const fmtTR = (iso?: string | null) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "-";
    const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const statusToLabel = (s: number | undefined) =>
    s === 0 ? "İncelemede" : s === 1 ? "Onaylandı" : s === 2 ? "Reddedildi" : "-";
const statusToColor = (s: number | undefined) =>
    s === 0
        ? (theme: any) => ({ bg: theme.palette.warning.light, fg: theme.palette.warning.main })
        : s === 1
            ? (theme: any) => ({ bg: theme.palette.success.light, fg: theme.palette.success.main })
            : (theme: any) => ({ bg: theme.palette.error.light, fg: theme.palette.error.main });

const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: "NotoSans",
    fontSize: "0.8rem",
    [theme.breakpoints.up("md")]: { fontSize: "1rem" },
}));
const blinkAnimation = keyframes`
  0% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
  50% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(103, 58, 183, 0.7); }
  100% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
`;
const BlinkingButton = styled(Button, {
    shouldForwardProp: (prop) => prop !== "isBlinking",
})<{ isBlinking: boolean }>(({ isBlinking }) => ({
    animation: isBlinking ? `${blinkAnimation} 1.5s infinite` : "none",
    transition: "transform 0.3s ease-in-out",
}));

interface PersonnelType {
    id: string | number; name: string;
    family: string; identityNumber: string, insuranceNumber: string, workStartDate: string | null;
}
interface LeaveHistory { id: string | number; description: string | null; status: number; recordStatus: number; createAt: string; }
interface LeaveType {
    id: string | number;
    startDate: string;
    endDate: string;
    type: number;
    status: number;
    recordStatus: number;
    createAt: string;
    leaveHistories: LeaveHistory[];
    personnel: PersonnelType;
}
interface LeaveDescription {
    title1: string;
    title2: string;
    title3: string;
}
const descendingComparator = <T, K extends keyof T>(a: T, b: T, orderBy: K): number => {
    const valA = a[orderBy] as any;
    const valB = b[orderBy] as any;
    if (["createAt", "startDate", "endDate"].includes(orderBy as string)) {
        const dA = valA ? new Date(valA).getTime() : 0;
        const dB = valB ? new Date(valB).getTime() : 0;
        return dB - dA;
    }
    if (valB == null) return valA == null ? 0 : -1;
    if (valA == null) return 1;
    if (typeof valB === "string" && typeof valA === "string") return valB.localeCompare(valA);
    if (typeof valB === "number" && typeof valA === "number") return valB - valA;
    if (String(valB) < String(valA)) return -1;
    if (String(valB) > String(valA)) return 1;
    return 0;
};
const getComparator =
    <K extends keyof LeaveType>(order: "asc" | "desc", orderBy: K) =>
        (a: LeaveType, b: LeaveType) =>
            order === "desc" ? descendingComparator(a, b, orderBy) : -descendingComparator(a, b, orderBy);
const stableSort = <T,>(array: T[], comparator: (a: T, b: T) => number) => {
    const stabilized = array.map((el, index) => [el, index] as [T, number]);
    stabilized.sort((a, b) => {
        const order = comparator(a[0], b[0]);
        return order !== 0 ? order : a[1] - b[1];
    });
    return stabilized.map((el) => el[0]);
};

const calculateLeaveDuration = (startDate: string, endDate: string): string => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end.getTime() < start.getTime()) {
        return "Geçersiz Tarih";
    }

    if (start.toDateString() !== end.toDateString()) {
        const diffDays = differenceInDays(end, start) + 1;

        if (diffDays <= 1) {
        } else {
            return `${diffDays} Gün`;
        }
    }
    const totalMinutes = differenceInMinutes(end, start);

    if (totalMinutes === 0) return "0 Dakika";

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0 && minutes > 0) {
        return `${hours} Saat ${minutes} Dakika`;
    }
    if (hours > 0) {
        return `${hours} Saat`;
    }
    return `${minutes} Dakika`;

};

const leaveTypes = [
    { label: "Ücretli Fazla Mesai", value: 0 },
    { label: "Ücretli Yıllık İzin", value: 1 },
    { label: "Saatlik İzin", value: 2 },
    { label: "Ücretsiz İzin", value: 3 },
    { label: "Mazeret İzin", value: 4 },
];

const addFonts = (doc: jsPDF) => {
    (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
    (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
    (doc as any).addFileToVFS("Times-New-Roman.ttf", TimesNewRoman);
    (doc as any).addFont("Times-New-Roman.ttf", "Times", "normal");
    (doc as any).addFileToVFS("Arial.ttf", ArialFont);
    (doc as any).addFont("Arial.ttf", "Arial", "normal");
};
const printDateTR = () => {
    const d = new Date();
    const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
    const monthsTR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    return `${pad(d.getDate())} ${monthsTR[d.getMonth()]} ${d.getFullYear()}`;
};
export const formatDateDisplay = (dateString: string | null): string => {
    if (!dateString) return "N/A";
    try {
        const date = new Date(dateString);
        return format(date, 'dd MMMM yyyy', { locale: tr });
    } catch (e) {
        console.log("Tarih biçimlendirilirken hata oluştu:", e);
        return "Geçersiz Tarih";
    }
};
const drawHeader = (doc: jsPDF, title: string) => {

    const docAny = doc as any;
    docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
    docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
    doc.setFont('NotoSans');
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

    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(14);
    doc.text(title, pageWidth / 2, 25, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('NotoSans', 'bold');
    doc.text(`Rapor Tarihi:`, 15, 35);
    doc.setFont('NotoSans', 'normal');
    doc.text(`${formatDateDisplay(new Date().toISOString())}`, 80, 35);

    doc.setLineWidth(0.5);
    doc.line(15, 40, pageWidth - 15, 40);
};

const drawFooter = (doc: jsPDF) => {
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

    let footerY = pageHeight - 40;
    companyInfo.forEach(line => {
        doc.text(line, pageWidth / 2, footerY, { align: 'center' });
        footerY += 12;
    });

    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.text('İmza', pageWidth - 20, pageHeight - 12, { align: 'right' });
    doc.line(pageWidth - 60, pageHeight - 10, pageWidth - 10, pageHeight - 10);

    const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
    const pageCount = (doc as any).internal.getNumberOfPages();
    doc.text(`Sayfa ${pageNumber} / ${pageCount}`, 15, pageHeight - 10);
};


const buildRowsForExport = (rows: LeaveType[]) =>
    rows.map((lv) => [
        `${lv.personnel?.name ?? ""} ${lv.personnel?.family ?? ""}`.trim() || "-",
        fmtTR(lv.startDate),
        fmtTR(lv.endDate),
        statusToLabel(lv.status),

        leaveTypes.find((type) => type.value === lv.type)?.label || "-",
    ]);

const exportPDF = (rows: LeaveType[], filename: string) => {
    const doc = new jsPDF("p", "pt", "a4");
    addFonts(doc);
    autoTable(doc, {
        startY: 92,
        head: [["Personel", "Başlangıç", "Bitiş", "Durum", "Tür"]],
        body: buildRowsForExport(rows),
        theme: "grid",
        styles: { font: "Arial", fontStyle: "normal", fontSize: 10, cellPadding: 6, overflow: "linebreak" },
        headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0], font: "Arial", fontSize: 11 },
        columnStyles: { 0: { cellWidth: 150 }, 1: { cellWidth: 110 }, 2: { cellWidth: 110 }, 3: { cellWidth: 90 }, 4: { cellWidth: 90 } },
        margin: { top: 80, bottom: 70, left: 32, right: 32 },
        didDrawPage: () => { drawHeader(doc, "İzin Listesi"); drawFooter(doc); },
        showHead: "everyPage",
    });
    doc.save(filename);
};

const exportExcel = async (rows: LeaveType[], filename: string) => {
    const wb = new Excel.Workbook();
    const ws = wb.addWorksheet("Izin Listesi", { views: [{ state: "frozen", ySplit: 1 }] });

    ws.mergeCells("A1:D1");
    const c1 = ws.getCell("A1"); c1.value = "İzin Listesi";
    c1.font = { name: "Arial", size: 14, bold: true }; c1.alignment = { horizontal: "center" };

    ws.mergeCells("A2:D2");
    const c2 = ws.getCell("A2"); c2.value = `Rapor Tarihi: ${printDateTR()}`;
    c2.font = { name: "Times New Roman", size: 10 }; c2.alignment = { horizontal: "left" };
    ws.addRow([]);

    const hdr = ws.addRow(["Personel", "Başlangıç", "Bitiş", "Durum", "Tür"]);
    hdr.font = { bold: true };
    hdr.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };
        cell.alignment = { horizontal: "center" };
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" }, bottom: { style: "thin" } };
    });

    buildRowsForExport(rows).forEach((r) => {
        const row = ws.addRow(r);
        row.eachCell((cell) => (cell.border = { top: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" }, bottom: { style: "thin" } }));
    });

    ws.columns = [{ width: 40 }, { width: 20 }, { width: 20 }, { width: 16 }];

    ws.addRow([]);
    const ft = ws.addRow(["Şirket Bilgisi"]); ft.font = { bold: true }; ws.mergeCells(`A${ft.number}:D${ft.number}`);
    [
        "SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.",
        "Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11",
        "http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr",
    ].forEach((line) => {
        const r = ws.addRow([line]);
        ws.mergeCells(`A${r.number}:D${r.number}`);
        r.getCell(1).alignment = { horizontal: "center", wrapText: true };
    });

    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf]), filename);
};

const generateLeavePDF = (row: LeaveType) => {
    const doc = new jsPDF("p", "pt", "a4");

    addFonts(doc);
    generateLeavePDFHeader(doc, row);
    generateLeavePDFSubHeader(doc, row);
    generateLeavePDFPersonnelInfo(doc, row);
    generateLeavePDFFooter(doc, row);
    doc.save(`İzin_Belgesi_${row.id}.pdf`);
};

const generateLeavePDFHeader = (doc: jsPDF, row: LeaveType) => {
    const headerHeight = 90;
    const headerWidth = doc.internal.pageSize.width;
    const logoWidth = 80;
    const logoHeight = 50;

    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(0, 0, headerWidth, headerHeight);
    try {
        doc.addImage(Logo, "PNG", 20, 15, logoWidth, logoHeight);
    } catch (error) {
        console.error("Logo couldn't be added", error);
    }
    const leaveTypeTitle = getLeaveTypeTitle(row.type);
    doc.setFont("Arial", "normal");
    doc.setFontSize(12);
    doc.text(leaveTypeTitle, headerWidth / 2, 40, { align: "center" });
    doc.setFont("Arial", "normal");
    doc.setFontSize(10);
    doc.text("DOKÜMAN NO:", headerWidth - 150, 20);
    doc.text("YAYIN NO:", headerWidth - 150, 35);
    doc.text("REVİZYON TARİHİ:", headerWidth - 150, 50);
    doc.text("REVİZYON NO:", headerWidth - 150, 65);
    doc.text("SAYFA NO:", headerWidth - 150, 80);

    doc.text(" ", headerWidth - 110, 20);
    doc.text(" ", headerWidth - 110, 35);
    doc.text(" ", headerWidth - 110, 50);
    doc.text(" ", headerWidth - 110, 65);
    doc.text("1/1", headerWidth - 80, 80);
};

const generateLeavePDFSubHeader = (doc: jsPDF, row: LeaveType) => {
    const subHeaderYPosition = 130;
    const leaveTypedesc = getLeaveTypedesc(row.type);
    doc.setFont("Arial", "normal");
    doc.setFontSize(15);
    doc.text(leaveTypedesc.title1, 40, subHeaderYPosition);

    doc.setFont("Arial", "normal");
    doc.setFontSize(12);
    doc.text("İŞ YERİNİN", 40, subHeaderYPosition + 20);

    doc.setFont("Arial", "normal");
    doc.setFontSize(8);
    doc.text("ÜNVANI:", 40, subHeaderYPosition + 40);
    doc.text("SETAŞ SİSTEM BİLİŞİM SAN. TİC. A.Ş.", 320, subHeaderYPosition + 40);

    doc.text("ADRESİ:", 40, subHeaderYPosition + 55);
    doc.text("Mansuroğlu Mah. 283/6 Sk. No:2 BAYRAKLI/ İZMİR", 320, subHeaderYPosition + 55);

    doc.text("İŞYERİ SSK NO:", 40, subHeaderYPosition + 70);
    doc.text(" ", 120, subHeaderYPosition + 70);
};
const generateLeavePDFPersonnelInfo = (doc: jsPDF, row: LeaveType) => {
    const personnelInfoYPosition = 230;
    doc.setFont("Arial", "normal");
    doc.setFontSize(12);
    doc.text("ÇALIŞAN PERSONELİN", 40, personnelInfoYPosition);

    doc.setFont("Arial", "normal");
    doc.setFontSize(8);

    doc.text("ADI SOYADI:", 40, personnelInfoYPosition + 20);
    doc.text(`${row.personnel.name} ${row.personnel.family}`, 320, personnelInfoYPosition + 20);

    doc.text("T.C. KİMLİK NO:", 40, personnelInfoYPosition + 35);
    doc.text(`${row.personnel.identityNumber}`, 320, personnelInfoYPosition + 35);
    doc.text("SSK SİCİL NO:", 40, personnelInfoYPosition + 50);
    doc.text(`${row.personnel.insuranceNumber}`, 320, personnelInfoYPosition + 50);

    doc.text("İZNE AYRILMAK İSTENİLEN TARİH:", 40, personnelInfoYPosition + 65);
    doc.text(fmtTR(row.startDate), 320, personnelInfoYPosition + 65);

    doc.text("İZİN BİTİŞ TARİHİ:", 40, personnelInfoYPosition + 80);
    doc.text(fmtTR(row.endDate), 320, personnelInfoYPosition + 80);

    doc.text("İŞE BAŞLAMA TARİHİ:", 40, personnelInfoYPosition + 95);
    doc.text(fmtTR(row.personnel.workStartDate), 320, personnelInfoYPosition + 95);

    const duration = calculateLeaveDuration(row.startDate, row.endDate);
    doc.text("İZİN SÜRESİ:", 40, personnelInfoYPosition + 110);
    doc.text(duration, 320, personnelInfoYPosition + 110);

    const leaveTypedesc = getLeaveTypedesc(row.type);

    doc.text(leaveTypedesc.title2, 40, personnelInfoYPosition + 130);
    doc.text("AD-SOYAD / İMZA", 350, personnelInfoYPosition + 180);
};



const generateLeavePDFFooter = (doc: jsPDF, row: LeaveType) => {
    const footerYPosition = 550;
    const leaveTypedesc = getLeaveTypedesc(row.type);
    doc.setFont("Arial", "normal");
    doc.setFontSize(10);
    doc.text(leaveTypedesc.title3, 40, footerYPosition);

    const approvalDateYPosition = footerYPosition + 20;
    doc.text("AD-SOYAD / İMZA", 380, approvalDateYPosition + 20);
    doc.text("Onay", 300, approvalDateYPosition + 70);
    const currentDate = new Date();
    const formattedDate = `${currentDate.getDate() < 10 ? '0' + currentDate.getDate() : currentDate.getDate()}/${(currentDate.getMonth() + 1) < 10 ? '0' + (currentDate.getMonth() + 1) : (currentDate.getMonth() + 1)}/${currentDate.getFullYear()}`;

    doc.text(formattedDate, 300, approvalDateYPosition + 90);

    const leaveTypeTitle = getLeaveTypeTitle(row.type);
    const leavePeriodYPosition = approvalDateYPosition + 120;
    doc.text(`${leaveTypeTitle} Mesai izinimi ${fmtTR(row.startDate)} - ${fmtTR(row.endDate)}  kullandım.`, 40, leavePeriodYPosition);

    const leavePeriodYPosition1 = leavePeriodYPosition + 20;

    const signatureYPosition = leavePeriodYPosition1 + 90;
    doc.text("Adı Soyadı", 380, signatureYPosition);
    doc.text("İmza", 380, signatureYPosition + 20);
};

const getLeaveTypeTitle = (leaveType: number) => {
    switch (leaveType) {
        case 0:
            return "ÜCRETLİ FAZLA MESAİ İZİN  ";
        case 1:
            return "YILLIK İZİN  ";
        case 2:
            return "SAATLİK İZİN  ";
        case 3:
            return "ÜCRETSİZ İZİN  ";
        case 4:
            return "MAZERET İZİN  ";
        default:
            return "İZİN  ";
    }
};
const getLeaveTypedesc = (leaveType: number): LeaveDescription => {
    switch (leaveType) {
        case 0:

            return {
                title1: 'ÜCRETLİ FAZLA MESAİ İZİN TALEP DİLEKÇESİ',
                title2: 'Yukarıda belirtilen tarihler arasında ücretli fazla mesai izini kullanmak istiyorum. Gereğini bilgilerinize sunarım.',
                title3: 'Belirtilen tarihler arasında ücretli fazla mesai izin kullanmanız uygundur.'

            }
        case 1:

            return {
                title1: 'ÜCRETLİ YILLIK İZİN TALEP DİLEKÇESİ',
                title2: 'Yukarıda belirtilen tarihler arasında ücretli yıllık izin kullanmak istiyorum. Gereğini bilgilerinize sunarım.',
                title3: 'Belirtilen tarihler arasında ücretli yıllık izin kullanmanız uygundur.'

            }
        case 2:

            return {
                title1: 'SAATLİK İZİN TALEP DİLEKÇESİ',
                title2: 'Yukarıda belirtilen saatler arasında izin kullanmak istiyorum.Gereğini bilgilerinize sunarım.',
                title3: 'Belirtilen tarihde saatlik izin kullanmanız uygundur.		'

            }
        case 3:

            return {
                title1: 'ÜCRETSİZ İZİN TALEP DİLEKÇESİ',
                title2: 'Yukarıda belirtilen tarihler arasında ücretsiz izne ayrılmak istiyorum. Gereğini bilgilerinize sunarım.',
                title3: 'Belirtilen tarihler arasında ücretsiz izne ayrılmanız uygundur.'

            }
        case 4:

            return {
                title1: 'MAZERET İZİNİ  TALEP DİLEKÇESİ',
                title2: 'Yukarıda belirtilen tarihler arasında evleneceğimden dolayı mazeret izinine ayrılmak istiyorum.Gereğini bilgilerinize sunarım.',
                title3: 'Belirtilen tarihler arasında mazeret izine ayrılmanız uygundur.'

            }
        default:
            return {
                title1: "İZİN TALEP DİLEKÇESİ",
                title2: "Açıklama mevcut değil.",
                title3: "Onay durumu bilinmiyor."
            };
    }
};



type ExcelWorksheet = Excel.Worksheet;

const generateLeaveExcelHeaderAndDocInfo = (ws: ExcelWorksheet, row: LeaveType) => {
    const leaveTypeTitle = getLeaveTypeTitle(row.type);
    const leaveTypedesc = getLeaveTypedesc(row.type);

    ws.mergeCells('E1:F1'); ws.getCell('E1').value = 'DOKÜMAN NO:';
    ws.mergeCells('G1:H1'); ws.getCell('G1').value = ' ';

    ws.mergeCells('E2:F2'); ws.getCell('E2').value = 'YAYIN NO:';
    ws.mergeCells('G2:H2'); ws.getCell('G2').value = ' ';

    ws.mergeCells('E3:F3'); ws.getCell('E3').value = 'REVİZYON TARİHİ:';
    ws.mergeCells('G3:H3'); ws.getCell('G3').value = ' ';

    for (let i = 1; i <= 3; i++) {
        ws.getCell(`E${i}`).style = { font: { bold: true, size: 10, name: 'Arial' }, alignment: { horizontal: 'left' } };
    }

    ws.mergeCells('A4:D4'); ws.getCell('A4').value = leaveTypeTitle;
    ws.getCell('A4').style = { font: { bold: true, size: 12, name: 'Arial' }, alignment: { vertical: 'middle', horizontal: 'center' } };

    ws.mergeCells('E4:F4'); ws.getCell('E4').value = 'REVİZYON NO:';
    ws.mergeCells('G4:H4'); ws.getCell('G4').value = ' ';
    ws.getCell('E4').style = { font: { bold: true, size: 10, name: 'Arial' }, alignment: { horizontal: 'left' } };

    ws.mergeCells('E5:F5'); ws.getCell('E5').value = 'SAYFA NO:';
    ws.mergeCells('G5:H5'); ws.getCell('G5').value = '1/1';
    ws.getCell('E5').style = { font: { bold: true, size: 10, name: 'Arial' }, alignment: { horizontal: 'left' } };

    ws.addRow([]);
    ws.addRow([leaveTypedesc.title1]);
    ws.mergeCells('A7:H7');
    ws.getCell('A7').style = { font: { bold: true, size: 14, name: 'Arial' }, alignment: { horizontal: 'left' } };

    ws.addRow([]);
};

const generateLeaveExcelSubHeaderAndPersonnelInfo = (ws: ExcelWorksheet, row: LeaveType) => {
    const fullName = `${row.personnel.name} ${row.personnel.family}`;
    const duration = calculateLeaveDuration(row.startDate, row.endDate);
    const leaveTypedesc = getLeaveTypedesc(row.type);

    let nextRow = ws.lastRow ? ws.lastRow.number + 1 : 1;
    ws.addRow(["İŞ YERİNİN"]); ws.mergeCells(`A${nextRow}:H${nextRow}`);
    ws.getCell(`A${nextRow}`).style = { font: { bold: true, size: 12, name: 'Arial' } };

    nextRow++; ws.addRow(["ÜNVANI:", "SETAŞ SİSTEM BİLİŞİM SAN. TİC. A.Ş."]);
    ws.mergeCells(`A${nextRow}:C${nextRow}`); ws.mergeCells(`D${nextRow}:H${nextRow}`);

    nextRow++; ws.addRow(["ADRESİ:", "Mansuroğlu Mah. 283/6 Sk. No:2 BAYRAKLI/ İZMİR"]);
    ws.mergeCells(`A${nextRow}:C${nextRow}`); ws.mergeCells(`D${nextRow}:H${nextRow}`);

    nextRow++; ws.addRow(["İŞYERİ SSK NO:", " "]);
    ws.mergeCells(`A${nextRow}:C${nextRow}`); ws.mergeCells(`D${nextRow}:H${nextRow}`);
    ws.addRow([]);

    ws.addRow([]);
    nextRow = ws.lastRow ? ws.lastRow.number + 1 : nextRow + 1;

    ws.addRow(["ÇALIŞAN PERSONELİN"]); ws.mergeCells(`A${nextRow}:H${nextRow}`);
    ws.getCell(`A${nextRow}`).style = { font: { bold: true, size: 12, name: 'Arial' } };

    nextRow++; ws.addRow(["ADI SOYADI:", "", "", fullName]);
    ws.mergeCells(`A${nextRow}:C${nextRow}`);
    ws.mergeCells(`D${nextRow}:H${nextRow}`);

    nextRow++; ws.addRow(["T.C. KİMLİK NO:", "", "", row.personnel.identityNumber || ' ']);
    ws.mergeCells(`A${nextRow}:C${nextRow}`);
    ws.mergeCells(`D${nextRow}:H${nextRow}`);

    nextRow++; ws.addRow(["SSK SİCİL NO:", "", "", row.personnel.insuranceNumber || ' ']);
    ws.mergeCells(`A${nextRow}:C${nextRow}`);
    ws.mergeCells(`D${nextRow}:H${nextRow}`);

    nextRow++; ws.addRow(["İZNE AYRILMAK İSTENİLEN TARİH:", "", "", fmtTR(row.startDate)]);
    ws.mergeCells(`A${nextRow}:C${nextRow}`);
    ws.mergeCells(`D${nextRow}:H${nextRow}`);

    nextRow++; ws.addRow(["İZİN BİTİŞ TARİHİ:", "", "", fmtTR(row.endDate)]);
    ws.mergeCells(`A${nextRow}:C${nextRow}`);
    ws.mergeCells(`D${nextRow}:H${nextRow}`);

    nextRow++; ws.addRow(["İŞE BAŞLAMA TARİHİ:", "", "", row.personnel.workStartDate ? fmtTR(row.personnel.workStartDate) : ' ']);
    ws.mergeCells(`A${nextRow}:C${nextRow}`);
    ws.mergeCells(`D${nextRow}:H${nextRow}`);

    nextRow++; ws.addRow(["İZİN SÜRESİ:", "", "", duration]);
    ws.mergeCells(`A${nextRow}:C${nextRow}`);
    ws.mergeCells(`D${nextRow}:H${nextRow}`);

    ws.addRow([]);
    ws.addRow([]);
    nextRow = ws.lastRow ? ws.lastRow.number + 1 : nextRow + 1;
    ws.addRow([leaveTypedesc.title2]);
    ws.mergeCells(`A${nextRow}:H${nextRow}`);
    ws.getCell(`A${nextRow}`).style = { font: { size: 10, name: 'Arial' }, alignment: { horizontal: 'left' } };
    ws.addRow([]);

    ws.addRow([]);
    nextRow = ws.lastRow ? ws.lastRow.number + 1 : nextRow + 1;
    ws.addRow(["", "", "", "", "", "AD-SOYAD / İMZA"]);
    ws.mergeCells(`F${nextRow}:H${nextRow}`);
};

const generateLeaveExcelFooter = (ws: ExcelWorksheet, row: LeaveType) => {
    const leaveTypedesc = getLeaveTypedesc(row.type);
    const leaveTypeTitle = getLeaveTypeTitle(row.type);
    const currentDate = new Date();
    const formattedDate = `${currentDate.getDate() < 10 ? '0' + currentDate.getDate() : currentDate.getDate()}/${(currentDate.getMonth() + 1) < 10 ? '0' + (currentDate.getMonth() + 1) : (currentDate.getMonth() + 1)}/${currentDate.getFullYear()}`;

    let nextRow = ws.lastRow ? ws.lastRow.number + 2 : 1;
    ws.addRow([leaveTypedesc.title3]);
    ws.mergeCells(`A${nextRow}:H${nextRow}`);
    ws.getCell(`A${nextRow}`).style = { font: { size: 10, name: 'Arial' } };


    ws.addRow([]);
    nextRow = ws.lastRow ? ws.lastRow.number + 1 : nextRow;
    ws.addRow(["", "", "", "", "", "AD-SOYAD / İMZA"]);
    ws.mergeCells(`F${nextRow}:H${nextRow}`);

    nextRow += 1;
    ws.addRow(["", "", "", "", "Onay", formattedDate]);
    ws.getCell(`E${nextRow}`).style = { font: { bold: true, size: 10, name: 'Arial' } };

    nextRow += 3;
    ws.addRow([`${leaveTypeTitle} Mesai izinimi`]);
    ws.mergeCells(`A${nextRow}:H${nextRow}`);
    ws.getCell(`A${nextRow}`).style = { font: { size: 10, name: 'Arial' } };

    nextRow += 1;
    ws.addRow([` ${fmtTR(row.startDate)} - ${fmtTR(row.endDate)} tarihleri arasında kullandım.`]);
    ws.mergeCells(`A${nextRow}:H${nextRow}`);
    ws.getCell(`A${nextRow}`).style = { font: { size: 10, name: 'Arial' } };

    nextRow += 3;
    ws.addRow(["", "", "", "", "", "Adı Soyadı"]);
    ws.getCell(`F${nextRow}`).style = { font: { bold: true, size: 10, name: 'Arial' } };

    nextRow += 1;
    ws.addRow(["", "", "", "", "", "İmza"]);
    ws.getCell(`F${nextRow}`).style = { font: { bold: true, size: 10, name: 'Arial' } };
};

const generateLeaveExcel = async (row: LeaveType) => {
    const wb = new Excel.Workbook();
    const ws = wb.addWorksheet("Izin Belgesi", { views: [{ rightToLeft: false }] });

    generateLeaveExcelHeaderAndDocInfo(ws, row);
    generateLeaveExcelSubHeaderAndPersonnelInfo(ws, row);
    generateLeaveExcelFooter(ws, row);

    ws.columns = [
        { width: 20 }, { width: 5 }, { width: 5 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }
    ];
    const filename = `İzin_Belgesi_${row.id}.xlsx`;
    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf]), filename);
};

const ListLeaves: React.FC = () => {
    const navigate = useNavigate();

    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const idsFromState =
        ((location.state as { notifIds?: string[] } | undefined)?.notifIds) ?? [];
    const idsFromSingleParam = (searchParams.get('ids') ?? '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    const idsFromRepeatedParams = searchParams.getAll('ids').filter(Boolean);
    const notifIds: number[] = (idsFromState.length ? idsFromState :
        (idsFromSingleParam.length ? idsFromSingleParam : idsFromRepeatedParams))
        .map(id => Number(id))
        .filter(id => Number.isFinite(id));
    const hasIdsFilter = notifIds.length > 0;
    const idsSet = new Set<number>(notifIds);


    const { isTooltipGloballyEnabled } = useTooltip();
    const { menuItems, allowedOperations } = useAuth();

    const findMenuByHref = (items: any[], path: string): any => {
        for (const item of items) {
            if (item.href === path) return item;

            if (item.children && item.children.length > 0) {
                const found = findMenuByHref(item.children, path);
                if (found) return found;
            }
        }
        return null;
    };

    const currentMenu = useMemo(() => {

        return findMenuByHref(menuItems, location.pathname);
    }, [menuItems, location.pathname]);

    const currentMenuOpIds = useMemo(() => {
        if (!currentMenu || !currentMenu.menuOperations) return [];

        return currentMenu.menuOperations.map((op: any) => {
            return String(op.id);
        });
    }, [currentMenu]);

     const hasPermission = (opName: string) => {   
    return allowedOperations.some((op: any) =>
      op.systemOperationName === opName
    //  &&
    //   currentMenuOpIds.includes(String(op.menuOperationId))
    );
  };

    const hasCreatePermission = useMemo(() => hasPermission("Eklemek"), [allowedOperations, currentMenuOpIds]);
    const hasEditPermission = useMemo(() => hasPermission("Düzenlemek"), [allowedOperations, currentMenuOpIds]);
    const hasDeletePermission = useMemo(() => hasPermission("Silmek"), [allowedOperations, currentMenuOpIds]);
    const hasDownloadPermission = useMemo(() => hasPermission("İndirmek ve Yazdırmak"), [allowedOperations, currentMenuOpIds]);



    const [leaves, setLeaves] = useState<LeaveType[]>([]);
    const [personnels, setPersonnels] = useState<PersonnelType[]>([]);

    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [personnelId, setPersonnelId] = useState<string>("");

    const [startError, setStartError] = useState<string>("");
    const [endError, setEndError] = useState<string>("");
    const [personnelError, setPersonnelError] = useState<string>("");

    const [filterStart, setFilterStart] = useState<Date | null>(null);
    const [filterEnd, setFilterEnd] = useState<Date | null>(null);

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [orderBy, setOrderBy] = useState<keyof LeaveType>("createAt");
    const [order, setOrder] = useState<"asc" | "desc">("desc");
    const [searchTerm, setSearchTerm] = useState("");

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRow, setSelectedRow] = useState<LeaveType | null>(null);
    const openMenu = Boolean(anchorEl);

    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [leaveIdToDelete, setLeaveIdToDelete] = useState<string | number | null>(null);
    const [type, setType] = useState<number>(0);


    const [openDownloadModal, setOpenDownloadModal] = useState(false);
    const [downloadScope, setDownloadScope] = useState<"all" | "row">("all");
    const [rowForDownload, setRowForDownload] = useState<LeaveType | null>(null);

    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<"success" | "error" | "warning" | "info">("info");
    const [loadingData, setLoadingData] = useState<boolean>(true);
    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isBlinking, setIsBlinking] = useState(true);


    const [openDetailsModal, setOpenDetailsModal] = useState(false);
    const [selectedLeaveDetails, setSelectedLeaveDetails] = useState<LeaveType | null>(null);
    const [annualLeaveData, setAnnualLeaveData] = useState<any>(null);
    const [loadingAnnualLeave, setLoadingAnnualLeave] = useState(false);



    const showAlert = (m: string, s: "success" | "error" | "warning" | "info") => { setAlertMessage(m); setAlertSeverity(s); };
    const clearAlert = () => setAlertMessage(null);
    useEffect(() => { if (!alertMessage) return; const t = setTimeout(clearAlert, 5000); return () => clearTimeout(t); }, [alertMessage]);
    useEffect(() => { const t = setTimeout(() => setIsBlinking(false), 5000); return () => clearTimeout(t); }, []);

    const getAllPersonnels = async () => {
        const authToken = localStorage.getItem("authToken");
        if (!authToken) { navigate("/"); return; }
        try {
            const res = await axios.get(server.baseurl + server.hr + "get-all-personnels", {
                headers: { Accept: "application/json", Authorization: `Bearer ${authToken}` },
            });
            if (res.data?.httpStatusCode === 200) setPersonnels(res.data.data || []);
            else showAlert(res.data?.message || "Personel listesi alınırken hata oluştu.", "error");
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        }
    };

    const getAllLeaves = React.useCallback(async () => {
        const authToken = localStorage.getItem("authToken");
        setLoadingData(true);
        if (!authToken) { navigate("/"); setLoadingData(false); return; }
        try {
            const res = await axios.get(server.baseurl + server.hr + "get-all-leaves", {
                headers: { Accept: "application/json", Authorization: `Bearer ${authToken}` },
            });
            if (res.data?.httpStatusCode === 200) {
                const newLeaves = res.data.data || [];
                setLeaves(newLeaves);
                return newLeaves;
            } else {
                showAlert(res.data?.message || "İzin listesi alınırken hata oluştu.", "error");
                return null;
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally { setLoadingData(false); }
    }, [navigate, showAlert]);

    useEffect(() => { getAllLeaves(); getAllPersonnels(); }, []);

    const validateForm = () => {
        let ok = true;
        setStartError(""); setEndError(""); setPersonnelError("");
        if (!startDate) { setStartError("Başlangıç tarihi zorunludur."); ok = false; }
        if (!endDate) { setEndError("Bitiş tarihi zorunludur."); ok = false; }
        if (startDate && endDate && endDate.getTime() < startDate.getTime()) { setEndError("Bitiş tarihi, başlangıç tarihinden küçük olamaz."); ok = false; }
        if (!personnelId) { setPersonnelError("Personel seçimi zorunludur."); ok = false; }
        return ok;
    };

    const insertLeave = async () => {
        if (!validateForm()) return;
        const authToken = localStorage.getItem("authToken");
        if (!authToken) { navigate("/"); return; }
        setLoadingButton(true);

        const tempPersonnelId = Number(personnelId);
        const tempStartDate = startDate!.toISOString();
        const tempEndDate = endDate!.toISOString();
        const tempType = type;

        try {
            const payload = {
                startDate: tempStartDate,
                endDate: tempEndDate,
                personnelId: tempPersonnelId,
                type: tempType,
            };
            const res = await axios.post(server.baseurl + server.hr + "create-leave", payload, {
                headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
            });

            if (res.data?.httpStatusCode === 201 || res.data?.success) {
                showAlert("İzin kaydı başarıyla eklendi! İndirme formu açılıyor...", "success");

                const updatedLeaves = await getAllLeaves();

                if (updatedLeaves) {
                    const newLeave = updatedLeaves.find((l: LeaveType) =>
                        Number(l.personnel.id) === tempPersonnelId &&
                        l.startDate === tempStartDate &&
                        l.endDate === tempEndDate &&
                        l.type === tempType
                    );

                    if (newLeave) {
                        setDownloadScope("row");
                        setRowForDownload(newLeave);
                        setOpenDownloadModal(true);
                    } else {
                        showAlert("Yeni kayıt bulunamadı. Lütfen listeden manuel olarak indirin.", "warning");
                    }
                } else {
                    showAlert("Liste güncellenemedi, lütfen yeniden deneyin.", "error");
                }

                setStartDate(null);
                setEndDate(null);
                setPersonnelId("");
                setType(0);
                setIsFormVisible(false);

            } else {
                showAlert(res.data?.message || "İzin eklenirken hata oluştu.", "error");
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally { setLoadingButton(false); }
    };

    const handleViewDetails = async (leave: LeaveType) => {
        setSelectedLeaveDetails(leave);
        setOpenDetailsModal(true);
        setLoadingAnnualLeave(true);
        setAnnualLeaveData(null);

        const authToken = localStorage.getItem("authToken");
        try {
            const response = await axios.get(
                `${server.baseurl}${server.hr}get-remaining-leave-by-personnelId/${leave.personnel.id}`,
                { headers: { Authorization: `Bearer ${authToken}` } }
            );

            if (response.data.success) {
                setAnnualLeaveData(response.data.data);
            }
        } catch (e) {
            console.error("Error fetching leave summary", e);
        } finally {
            setLoadingAnnualLeave(false);
        }
    };


    const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
    const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => { setSearchTerm(e.target.value); setPage(0); };
    const handleRequestSort = (property: keyof LeaveType) => {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc"); setOrderBy(property); setPage(0);
    };
    const clearDateFilters = () => { setFilterStart(null); setFilterEnd(null); };

    const filtered = leaves.filter((l) => {
        const fullName = `${l.personnel?.name ?? ""} ${l.personnel?.family ?? ""}`.trim().toLowerCase();
        const matchName = fullName.includes(searchTerm.toLowerCase());
        const s = new Date(l.startDate).getTime(); const e = new Date(l.endDate).getTime();
        const afterStart = !filterStart || e >= filterStart.getTime();
        const beforeEnd = !filterEnd || s <= filterEnd.getTime();

        const matchesNotifIds = !hasIdsFilter || idsSet.has(Number(l.id));


        return matchName && afterStart && beforeEnd && matchesNotifIds;
    });
    const sorted = stableSort(filtered, getComparator(order, orderBy));
    const paginated = sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: LeaveType) => {
        setAnchorEl(event.currentTarget);
        setSelectedRow(row);
    };
    const handleCloseMenu = () => { setAnchorEl(null); setSelectedRow(null); };

    const updateLeaveStatus = async (id: string | number, status: 0 | 1 | 2) => {
        const authToken = localStorage.getItem("authToken");
        if (!authToken) { navigate("/"); }

        try {
            const res = await axios.put(server.baseurl + server.hr + "update-leave-status",
                { id: Number(id), status }, {
                headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
            });
            if (res.data?.httpStatusCode === 200) { showAlert("Durum başarıyla güncellendi!", "success"); getAllLeaves(); }
            else showAlert(res.data?.message || "Durum güncellenirken hata oluştu.", "error");
        } catch (e: any) {
            if (e.response?.status === 401) { localStorage.removeItem("authToken"); navigate("/"); return; }
            showAlert(e.response?.data?.message || "Durum güncellenirken hata oluştu.", "error");
        } finally { handleCloseMenu(); }
    };

    const handleOpenDelete = () => { if (selectedRow) { setLeaveIdToDelete(selectedRow.id); setOpenDeleteModal(true); } handleCloseMenu(); };
    const handleCloseDelete = () => { setOpenDeleteModal(false); setLeaveIdToDelete(null); getAllLeaves(); };

    const openDownloadChooserForAll = () => {
        if (!sorted.length) { showAlert("İndirilecek veri bulunamadı.", "warning"); return; }
        setDownloadScope("all");
        setRowForDownload(null);
        setOpenDownloadModal(true);
    };
    const openDownloadChooserForRow = () => {
        if (!selectedRow) return;
        setDownloadScope("row");
        setRowForDownload(selectedRow);
        setOpenDownloadModal(true);
        handleCloseMenu();
    };

    const handleDownloadChoosePDF = () => {
        if (downloadScope === "all") {
            exportPDF(sorted, "Izin_Listesi.pdf");
        } else if (rowForDownload) {
            generateLeavePDF(rowForDownload);
        }
        setOpenDownloadModal(false);
    };
    const handleDownloadChooseExcel = async () => {
        if (downloadScope === "all") {
            await exportExcel(sorted, "Izin_Listesi.xlsx");
        } else if (rowForDownload) {
            await generateLeaveExcel(rowForDownload);
        }
        setOpenDownloadModal(false);
    };
    const clearNotifFilter = () => {
        const next = new URLSearchParams(searchParams);
        next.delete('ids');
        setSearchParams(next, { replace: true });

        navigate(location.pathname, {
            replace: true,
            state: { ...(location.state as any), notifIds: [] },
        });

        setPage(0);
    };
    return (
        <>
            <div style={{ borderBottom: "1px solid", margin: "10px 0 30px 0", padding: "10px 15px 30px 15px" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2} mb={3} flexWrap="wrap" gap={2}>
                    <Typography variant="h5" mb={2}>Yeni İzin Kaydı</Typography>

                    <Stack direction="row" spacing={1} alignItems="center">

                        {hasCreatePermission && (
                            <>
                                {!isFormVisible ? (
                                    <BlinkingButton variant="contained" color="secondary" onClick={() => setIsFormVisible(true)} isBlinking={isBlinking}>
                                        Yeni İzin Kaydet
                                    </BlinkingButton>
                                ) : (
                                    <Button variant="contained" color="error" onClick={() => setIsFormVisible(false)} startIcon={<IconX size={20} />}>
                                        Gizle
                                    </Button>
                                )}
                            </>
                        )}
                    </Stack>
                </Stack>

                {isFormVisible && hasCreatePermission && (
                    <Grid container spacing={1}>
                        <Grid item xs={12} md={3}>
                            <CustomFormLabel required>Personel</CustomFormLabel>
                            <Autocomplete
                                options={personnels.map((p) => ({ id: String(p.id), label: `${p.name ?? ""} ${p.family ?? ""}`.trim() || String(p.id) }))}
                                value={
                                    personnelId
                                        ? personnels.map((p) => ({ id: String(p.id), label: `${p.name ?? ""} ${p.family ?? ""}`.trim() || String(p.id) }))
                                            .find((x) => x.id === personnelId) || null
                                        : null
                                }
                                onChange={(_, v) => setPersonnelId(v?.id || "")}
                                isOptionEqualToValue={(a, b) => a.id === b.id}
                                renderInput={(params) => (
                                    <TextField {...params} size="small" placeholder="Personel ara ve seç" error={!!personnelError} helperText={personnelError} />
                                )}
                            />
                        </Grid>

                        <Grid item xs={12} md={3}>
                            <CustomFormLabel required>Başlangıç Tarihi</CustomFormLabel>
                            <LocalizationProvider dateAdapter={AdapterDateFns}>
                                <DateTimePicker
                                    label="Başlangıç Tarihi"
                                    value={startDate}
                                    onChange={(v) => setStartDate(v)}
                                    renderInput={(params) => <TextField {...params} size="small" fullWidth error={!!startError} helperText={startError} />}
                                />
                            </LocalizationProvider>
                        </Grid>

                        <Grid item xs={12} md={3}>
                            <CustomFormLabel required>Bitiş Tarihi</CustomFormLabel>
                            <LocalizationProvider dateAdapter={AdapterDateFns}>
                                <DateTimePicker
                                    label="Bitiş Tarihi"
                                    value={endDate}
                                    minDate={startDate || undefined}
                                    onChange={(v) => setEndDate(v)}
                                    renderInput={(params) => <TextField {...params} size="small" fullWidth error={!!endError} helperText={endError} />}
                                />
                            </LocalizationProvider>
                        </Grid>

                        <Grid item xs={12} md={3}>

                            <CustomFormLabel required>İzin Türü</CustomFormLabel>
                            <Select
                                label="İzin Türü"
                                value={type}
                                fullWidth
                                size="small"
                                onChange={(e) => setType(Number(e.target.value))}

                            >
                                {leaveTypes.map((leaveType) => (
                                    <MenuItem key={leaveType.value} value={leaveType.value}>
                                        {leaveType.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </Grid>


                        <Grid item xs={12} display="flex" justifyContent="flex-end" gap={1} mt={3}>
                            <Button variant="contained" color="success" onClick={insertLeave} disabled={loadingButton}>
                                {loadingButton ? "Bekleyin..." : "Yeni İzin Ekle"}
                            </Button>
                        </Grid>
                    </Grid>
                )}

                {alertMessage && (
                    <Stack sx={{ width: "100%", mt: 2 }} spacing={2}>
                        <Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert>
                    </Stack>
                )}
            </div>

            <BlankCard>
                <Box sx={{ p: 2 }}>

                    <Stack direction="row" justifyContent="start" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                        <Typography variant="h5">
                            İzin  Listesi

                        </Typography>
                        {notifIds.length > 0 && (
                            <Stack component="span" direction="row" spacing={1} alignItems="center" sx={{ ml: 1 }}>
                                <Chip
                                    label={`Bildirim filtresi: ${notifIds.length}`}
                                    color="error"
                                    size="small"
                                />
                                <IconButton
                                    aria-label="Bildirim filtresini temizle"
                                    size="small"
                                    onClick={clearNotifFilter}
                                    sx={{ p: 0.5 }}
                                    title="Filtreyi temizle"
                                >
                                    <IconRefresh size={18} />
                                </IconButton>
                            </Stack>
                        )}

                    </Stack>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={3}>
                            <TextField
                                label="Personel Ara"
                                variant="outlined"
                                fullWidth
                                value={searchTerm}
                                onChange={handleSearchChange}
                                InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <LocalizationProvider dateAdapter={AdapterDateFns}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <DateTimePicker label="Başlangıç Tarihi" value={filterStart} onChange={(v) => setFilterStart(v)} renderInput={(p) => <TextField {...p} size="small" fullWidth />} />
                                    <DateTimePicker label="Bitiş Tarihi" value={filterEnd}
                                        minDate={filterEnd || undefined} onChange={(v) => setFilterEnd(v)} renderInput={(p) => <TextField {...p} size="small" fullWidth />} />
                                    <IconButton onClick={clearDateFilters} aria-label="clear date filters"><IconX size={20} /></IconButton>
                                </Stack>
                            </LocalizationProvider>
                        </Grid>

                        <Grid item xs={12} sm={3}>
                            {hasDownloadPermission && (
                                <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm verileri farklı formatlarda indir" : ""}>
                                    <Button variant="contained" color="primary" onClick={openDownloadChooserForAll} startIcon={<IconFileDownload />}>
                                        Tümünü İndir
                                    </Button>
                                </CustomTooltip>
                            )}
                        </Grid>
                    </Grid>
                </Box>

                <TableContainer>
                    <Table aria-label="leaves table">
                        <TableHead style={{ background: "rgb(149 147 125 / 65%)" }}>
                            <TableRow>
                                <StyledTableCell>
                                    <TableSortLabel active={orderBy === "personnel"} direction={orderBy === "personnel" ? order : "asc"} onClick={() => handleRequestSort("personnel")} style={{ color: "#171c23" }}>
                                        <Typography variant="h6">Personel</Typography>
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell>
                                    <TableSortLabel active={orderBy === "startDate"} direction={orderBy === "startDate" ? order : "asc"} onClick={() => handleRequestSort("startDate")} style={{ color: "#171c23" }}>
                                        <Typography variant="h6">Başlangıç</Typography>
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell>
                                    <TableSortLabel active={orderBy === "endDate"} direction={orderBy === "endDate" ? order : "asc"} onClick={() => handleRequestSort("endDate")} style={{ color: "#171c23" }}>
                                        <Typography variant="h6">Bitiş</Typography>
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell>
                                    <TableSortLabel active={orderBy === "type"} direction={orderBy === "type" ? order : "asc"} onClick={() => handleRequestSort("type")} style={{ color: "#171c23" }}>
                                        <Typography variant="h6">Tür</Typography>
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell><Typography variant="h6">Detay</Typography></StyledTableCell>
                                <StyledTableCell>
                                    <TableSortLabel active={orderBy === "status"} direction={orderBy === "status" ? order : "asc"} onClick={() => handleRequestSort("status")} style={{ color: "#171c23" }}>
                                        <Typography variant="h6">Durum</Typography>
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell />
                            </TableRow>
                        </TableHead>


                        <TableBody>
                            {loadingData ? (
                                <TableRow>
                                    <StyledTableCell colSpan={5} align="center">
                                        <CircularProgress />
                                        <Typography variant="subtitle1" color="textSecondary">İzinler yükleniyor...</Typography>
                                    </StyledTableCell>
                                </TableRow>
                            ) : paginated.length > 0 ? (
                                paginated.map((row) => {
                                    const name = `${row.personnel?.name ?? ""} ${row.personnel?.family ?? ""}`.trim() || "-";
                                    const colors = statusToColor(row.status);
                                    return (
                                        <TableRow key={row.id} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                                            <StyledTableCell><Typography variant="body1">{name}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{fmtTR(row.startDate)}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{fmtTR(row.endDate)}</Typography></StyledTableCell>
                                            <StyledTableCell>
                                                <Typography variant="body1">
                                                    {leaveTypes.find((type) => type.value === row.type)?.label || "-"}
                                                </Typography>
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    onClick={() => handleViewDetails(row)}
                                                    startIcon={<IconSearch size={16} />}
                                                >
                                                    Detay
                                                </Button>
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <Chip label={statusToLabel(row.status)} sx={(theme) => ({ backgroundColor: colors(theme).bg, color: colors(theme).fg })} />
                                            </StyledTableCell>

                                            <StyledTableCell>
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Daha fazla seçenek" : ""}>
                                                    <IconButton id={`row-menu-${row.id}`} aria-controls={openMenu ? "row-menu" : undefined} aria-haspopup="true" aria-expanded={openMenu ? "true" : undefined} onClick={(e) => handleClickMenu(e as any, row)}>
                                                        <IconDots width={18} />
                                                    </IconButton>
                                                </CustomTooltip>
                                                <Menu id="row-menu" anchorEl={anchorEl} open={openMenu} onClose={handleCloseMenu} MenuListProps={{ "aria-labelledby": `row-menu-${selectedRow?.id}` }}>


                                                    {hasEditPermission && selectedRow?.status === 0 && (
                                                        <>
                                                            <MuiMenuItem onClick={() => updateLeaveStatus(selectedRow.id, 1)}>
                                                                <ListItemIcon><DoneRoundedIcon width={18} /></ListItemIcon> Onayla
                                                            </MuiMenuItem>
                                                            <MuiMenuItem onClick={() => updateLeaveStatus(selectedRow.id, 2)}>
                                                                <ListItemIcon><DoNotDisturbOnRoundedIcon width={18} /></ListItemIcon> Reddet
                                                            </MuiMenuItem>
                                                        </>
                                                    )}
                                                    {hasEditPermission && selectedRow?.status === 1 && (
                                                        <MuiMenuItem onClick={() => updateLeaveStatus(selectedRow.id, 2)}>
                                                            <ListItemIcon><DoNotDisturbOnRoundedIcon width={18} /></ListItemIcon> Reddet
                                                        </MuiMenuItem>
                                                    )}
                                                    {hasEditPermission && selectedRow?.status === 2 && (
                                                        <MuiMenuItem onClick={() => updateLeaveStatus(selectedRow.id, 1)}>
                                                            <ListItemIcon><DoneRoundedIcon width={18} /></ListItemIcon> Onayla
                                                        </MuiMenuItem>
                                                    )}


                                                    {hasDeletePermission && (
                                                        <MuiMenuItem onClick={handleOpenDelete}>
                                                            <ListItemIcon><IconTrash width={18} /></ListItemIcon> Silmek
                                                        </MuiMenuItem>
                                                    )}
                                                    {hasDownloadPermission && (
                                                        <MuiMenuItem onClick={openDownloadChooserForRow}>
                                                            <ListItemIcon><IconFileDownload width={18} /></ListItemIcon>
                                                            İzin belgesini indir
                                                        </MuiMenuItem>
                                                    )}
                                                </Menu>
                                            </StyledTableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <StyledTableCell colSpan={5} align="center">
                                        <Typography variant="subtitle1" color="textSecondary">Hiç İzin bulunamadı.</Typography>
                                    </StyledTableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={sorted.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Satır başına düşen:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
                />
            </BlankCard>

            <DeleteLeaves
                openModal={openDeleteModal}
                onClose={handleCloseDelete}
                leaveIdToDelete={leaveIdToDelete}
                onDeleteSuccess={getAllLeaves}
                showAlert={showAlert}
            />

            <Dialog open={openDownloadModal} onClose={() => setOpenDownloadModal(false)}>
                <DialogTitle>Dosya Formatını Seçin</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2}>
                        <Button variant="contained" color="primary" startIcon={<IconFileDownload />} onClick={handleDownloadChoosePDF}>
                            PDF Olarak İndir
                        </Button>
                        <Button variant="contained" color="success" startIcon={<IconFileDownload />} onClick={handleDownloadChooseExcel}>
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDownloadModal(false)} color="secondary">İptal</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openDetailsModal} onClose={() => setOpenDetailsModal(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ backgroundColor: 'primary.main', color: 'white' }}>
                    İzin ve Personel Detayları
                </DialogTitle>
                <DialogContent dividers>
                    {selectedLeaveDetails && (
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <Typography variant="h6" gutterBottom color="primary">Personel Bilgileri</Typography>
                                <Stack spacing={1}>
                                    <Typography><b>Ad Soyad:</b> {selectedLeaveDetails.personnel.name} {selectedLeaveDetails.personnel.family}</Typography>
                                    <Typography><b>T.C. Kimlik:</b> {selectedLeaveDetails.personnel.identityNumber}</Typography>
                                    <Typography><b>Sigorta No:</b> {selectedLeaveDetails.personnel.insuranceNumber || '-'}</Typography>
                                    <Typography><b>İşe Başlama:</b> {fmtTR(selectedLeaveDetails.personnel.workStartDate)}</Typography>
                                </Stack>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <Typography variant="h6" gutterBottom color="primary">İzin Detayı</Typography>
                                <Stack spacing={1}>
                                    <Typography><b>Tür:</b> {leaveTypes.find(t => t.value === selectedLeaveDetails.type)?.label}</Typography>
                                    <Typography><b>Başlangıç:</b> {fmtTR(selectedLeaveDetails.startDate)}</Typography>
                                    <Typography><b>Bitiş:</b> {fmtTR(selectedLeaveDetails.endDate)}</Typography>
                                    <Typography><b>Süre:</b> {calculateLeaveDuration(selectedLeaveDetails.startDate, selectedLeaveDetails.endDate)}</Typography>
                                    <Typography><b>Durum:</b> {statusToLabel(selectedLeaveDetails.status)}</Typography>
                                </Stack>
                            </Grid>

                            <Grid item xs={12}>
                                <Divider sx={{ my: 2 }} />
                                <Typography variant="h6" gutterBottom color="secondary">Genel İzin Özeti</Typography>
                                {loadingAnnualLeave ? (
                                    <CircularProgress size={24} />
                                ) : annualLeaveData ? (
                                    <Grid container spacing={2}>
                                        <Grid item xs={6} sm={3}>
                                            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, textAlign: 'center' }}>
                                                <Typography variant="caption">Resmi Hak</Typography>
                                                <Typography variant="h6">{annualLeaveData.official} Gün</Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={6} sm={3}>
                                            <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1, textAlign: 'center' }}>
                                                <Typography variant="caption">Kalan İzin</Typography>
                                                <Typography variant="h6">{annualLeaveData.remaining} Gün</Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1, textAlign: 'center' }}>
                                                <Typography variant="caption">Çalışma Süresi</Typography>
                                                <Typography variant="body1" fontWeight="bold">
                                                    {annualLeaveData.personnelWorkYearsAndMonths
                                                        ? `${annualLeaveData.personnelWorkYearsAndMonths.years} Yıl, ${annualLeaveData.personnelWorkYearsAndMonths.months} Ay, ${annualLeaveData.personnelWorkYearsAndMonths.days} Gün`
                                                        : `${annualLeaveData.yearOfWork} Yıl`}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                ) : <Typography color="error">Özet bilgiler alınamadı.</Typography>}
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<IconFileDownload />}
                        onClick={() => selectedLeaveDetails && generateLeavePDF(selectedLeaveDetails)}
                    >
                        PDF İndir
                    </Button>
                    <Button onClick={() => setOpenDetailsModal(false)} variant="outlined">Kapat</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ListLeaves;
