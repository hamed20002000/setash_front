// src/views/hr/Leaves/ListLeaves.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    Typography, Chip, Menu, IconButton, ListItemIcon, Box,
    TableCell as MuiTableCell, MenuItem as MuiMenuItem, Stack, Grid, Button,
    Alert, TablePagination, TextField, InputAdornment, TableSortLabel,
    Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
    MenuItem, Select
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

// PDF & Excel
import jsPDF from "jspdf";
// @ts-ignore
import { autoTable } from "jspdf-autotable";
import Excel from "exceljs";
import { saveAs } from "file-saver";
import Logo from "src/assets/images/logos/logo.png";
import { NotoSansRegular } from "src/assets/fonts/NotoSans-Regular";
import { TimesNewRoman } from "src/assets/fonts/Times";
import { ArialFont } from "src/assets/fonts/Arial";

// DateTime pickers
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { Autocomplete } from "@mui/material";

// ------------- Utils -------------
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

// ------------- Styled -------------
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

// ------------- Types -------------
interface PersonnelType {
    id: string | number; name: string;
    family: string; identityNumber: string, insuranceNumber: string, workStartDate: string | null;
}
interface LeaveHistory { id: string | number; description: string | null; status: number; recordStatus: number; createAt: string; }
interface LeaveType {
    id: string | number;
    startDate: string;
    endDate: string;
    type: number;  // اضافه کردن فیلد type
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

// ⬅️ نیاز به تعریف نوع ورودی برای TypeScript
const calculateLeaveDuration = (startDate: string, endDate: string): string => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return "Geçersiz Tarih";
    }

    const diffTime = Math.abs(end.getTime() - start.getTime());

    // اگر تاریخ شروع و پایان یکی باشد (برای مرخصی ساعتی)
    if (start.toDateString() === end.toDateString()) {
        const diffHours = Math.ceil(diffTime / (1000 * 60 * 60)); // تفاوت بر حسب ساعت
        // نمایش بر حسب ساعت یا دقیقه (اگر کمتر از یک ساعت بود)
        if (diffHours < 1) {
            const diffMinutes = Math.ceil(diffTime / (1000 * 60));
            return `${diffMinutes} Dakika`;
        }
        return `${diffHours} Saat`;
    }

    // اگر تاریخ شروع و پایان متفاوت باشد (برای مرخصی روزانه)
    else {
        // محاسبه بر حسب روز (اضافه کردن یک روز کامل برای پوشش مرخصی‌های ۲۴ ساعته)
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        // اگر مرخصی بیش از یک ساعت باشد (حتی اگر اختلاف کمتر از ۲۴ ساعت باشد)، یک روز کامل را لحاظ می‌کنیم.
        if (diffDays <= 0) {
            return "1 Gün"; // حداقل ۱ روز برای تاریخ‌های متفاوت
        }
        return `${diffDays} Gün`;
    }
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
const drawHeader = (doc: jsPDF, title: string) => {
    const pw = doc.internal.pageSize.getWidth();
    doc.setFont("Arial", "normal"); doc.setFontSize(14);
    doc.text(title, pw / 2, 40, { align: "center" });

    doc.setFont("Times", "normal"); doc.setFontSize(10);
    doc.text(`Rapor Tarihi: ${printDateTR()}`, 40, 56, { align: "left" });

    try { doc.addImage(Logo as any, "PNG", pw - 100, 20, 68, 68); } catch { }
};
const drawFooter = (doc: jsPDF) => {
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    doc.setFont("NotoSans", "normal"); doc.setFontSize(8);
    const companyInfo = [
        "SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.",
        "Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11",
        "http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr",
    ];
    let y = ph - 48;
    companyInfo.forEach((line) => { doc.text(line, pw / 2, y, { align: "center" }); y += 12; });
    const anyDoc = doc as any;
    const pageNum = anyDoc.internal.getCurrentPageInfo().pageNumber;
    const pageCount = anyDoc.internal.getNumberOfPages();
    doc.text(`Sayfa ${pageNum} / ${pageCount}`, 40, ph - 16);
    doc.text("İmza", pw - 40, ph - 16, { align: "right" });
    doc.line(pw - 120, ph - 24, pw - 40, ph - 24);
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

    // تنظیم فونت و اندازه
    addFonts(doc);

    // هدر
    generateLeavePDFHeader(doc, row);

    // زیر هدر
    generateLeavePDFSubHeader(doc, row);

    // اطلاعات پرسنل
    generateLeavePDFPersonnelInfo(doc, row);

    // فوتر
    generateLeavePDFFooter(doc, row);

    // ذخیره فایل PDF
    doc.save(`İzin_Belgesi_${row.id}.pdf`);
};

const generateLeavePDFHeader = (doc: jsPDF, row: LeaveType) => {
    const headerHeight = 90;
    const headerWidth = doc.internal.pageSize.width;
    const logoWidth = 80;
    const logoHeight = 50;

    // رسم مستطیل برای هدر
    doc.setDrawColor(0); // رنگ حاشیه
    doc.setLineWidth(0.5);
    doc.rect(0, 0, headerWidth, headerHeight);

    // لوگو در سمت چپ
    try {
        doc.addImage(Logo, "PNG", 20, 15, logoWidth, logoHeight);
    } catch (error) {
        console.error("Logo couldn't be added", error);
    }

    // عنوان در وسط
    const leaveTypeTitle = getLeaveTypeTitle(row.type);
    doc.setFont("Arial", "normal");
    doc.setFontSize(12);
    doc.text(leaveTypeTitle, headerWidth / 2, 40, { align: "center" });

    // مقادیر خالی DOKÜMAN NO و دیگر فیلدها در سمت راست
    doc.setFont("Arial", "normal");
    doc.setFontSize(10);
    doc.text("DOKÜMAN NO:", headerWidth - 150, 20);
    doc.text("YAYIN NO:", headerWidth - 150, 35);
    doc.text("REVİZYON TARİHİ:", headerWidth - 150, 50);
    doc.text("REVİZYON NO:", headerWidth - 150, 65);
    doc.text("SAYFA NO:", headerWidth - 150, 80);

    doc.text(" ", headerWidth - 110, 20); // مقدار خالی برای DOKÜMAN NO
    doc.text(" ", headerWidth - 110, 35); // مقدار خالی برای YAYIN NO
    doc.text(" ", headerWidth - 110, 50); // مقدار خالی برای REVİZYON TARİHİ
    doc.text(" ", headerWidth - 110, 65); // مقدار خالی برای REVİZYON NO
    doc.text("1/1", headerWidth - 80, 80); // مقدار خالی برای SAYFA NO
};

// تابع زیر هدر
const generateLeavePDFSubHeader = (doc: jsPDF, row: LeaveType) => {
    const subHeaderYPosition = 130;

    const leaveTypedesc = getLeaveTypedesc(row.type);


    doc.setFont("Arial", "normal");
    doc.setFontSize(14);
    doc.text(leaveTypedesc.title1, 40, subHeaderYPosition);

    doc.setFont("Arial", "normal");
    doc.setFontSize(12);
    doc.text("İŞ YERİNİN", 40, subHeaderYPosition + 20);

    doc.setFont("Arial", "normal");
    doc.setFontSize(10);
    doc.text("ÜNVANI:", 40, subHeaderYPosition + 40);
    doc.text("SETAŞ SİSTEM BİLİŞİM SAN. TİC. A.Ş.", 320, subHeaderYPosition + 40); // ÜNVANI

    doc.text("ADRESİ:", 40, subHeaderYPosition + 55);
    doc.text("Mansuroğlu Mah. 283/6 Sk. No:2 BAYRAKLI/ İZMİR", 320, subHeaderYPosition + 55); // ADRESİ

    doc.text("İŞYERİ SSK NO:", 40, subHeaderYPosition + 70);
    doc.text(" ", 120, subHeaderYPosition + 70); // İŞYERİ SSK NO
};

// تابع اطلاعات پرسنل
const generateLeavePDFPersonnelInfo = (doc: jsPDF, row: LeaveType) => {
    const personnelInfoYPosition = 230;
    debugger
    doc.setFont("Arial", "normal");
    doc.setFontSize(12);
    doc.text("ÇALIŞAN PERSONELİN", 40, personnelInfoYPosition);

    doc.setFont("Arial", "normal");
    doc.setFontSize(10);

    doc.text("ADI SOYADI:", 40, personnelInfoYPosition + 20);
    doc.text(`${row.personnel.name} ${row.personnel.family}`, 320, personnelInfoYPosition + 20);

    doc.text("T.C. KİMLİK NO:", 40, personnelInfoYPosition + 35);
    doc.text(`${row.personnel.identityNumber}`, 320, personnelInfoYPosition + 35); // خالی برای T.C. KİMLİK NO

    doc.text("SSK SİCİL NO:", 40, personnelInfoYPosition + 50);
    doc.text(`${row.personnel.insuranceNumber}`, 320, personnelInfoYPosition + 50); // خالی برای SSK SİCİL NO

    doc.text("İZNE AYRILMAK İSTENİLEN TARİH:", 40, personnelInfoYPosition + 65);
    doc.text(fmtTR(row.endDate), 320, personnelInfoYPosition + 65); // خالی برای İZNE AYRILMAK İSTENİLEN TARİH

    doc.text("İZİN BİTİŞ TARİHİ:", 40, personnelInfoYPosition + 80);
    doc.text(fmtTR(row.startDate), 320, personnelInfoYPosition + 80); // نمایش تاریخ پایان مرخصی

    doc.text("İŞE BAŞLAMA TARİHİ:", 40, personnelInfoYPosition + 95);
    doc.text(fmtTR(row.personnel.workStartDate), 320, personnelInfoYPosition + 95); // نمایش تاریخ شروع کار

    const duration = calculateLeaveDuration(row.startDate, row.endDate);
    doc.text("İZİN SÜRESİ:", 40, personnelInfoYPosition + 110);
    doc.text(duration, 320, personnelInfoYPosition + 110);

    const leaveTypedesc = getLeaveTypedesc(row.type);

    doc.text(leaveTypedesc.title2, 40, personnelInfoYPosition + 130);
    doc.text("AD-SOYAD / İMZA", 350, personnelInfoYPosition + 180);
};



const generateLeavePDFFooter = (doc: jsPDF, row: LeaveType) => {
    const footerYPosition = 550;  // شروع موقعیت فوتر از پایین


    const leaveTypedesc = getLeaveTypedesc(row.type);
    // بخش اول
    doc.setFont("Arial", "normal");
    doc.setFontSize(10);
    doc.text(leaveTypedesc.title3, 40, footerYPosition);

    // بخش دوم (Onay ve Tarih)
    const approvalDateYPosition = footerYPosition + 20;
    doc.text("Onay", 320, approvalDateYPosition);
    const currentDate = new Date();
    const formattedDate = `${currentDate.getDate() < 10 ? '0' + currentDate.getDate() : currentDate.getDate()}/${(currentDate.getMonth() + 1) < 10 ? '0' + (currentDate.getMonth() + 1) : (currentDate.getMonth() + 1)}/${currentDate.getFullYear()}`;

    doc.text(formattedDate, 320, approvalDateYPosition + 20);

    const leaveTypeTitle = getLeaveTypeTitle(row.type);
    const leavePeriodYPosition = approvalDateYPosition + 70;
    doc.text(`${leaveTypeTitle} Mesai izinimi`, 40, leavePeriodYPosition);

    const leavePeriodYPosition1 = leavePeriodYPosition + 20;
    doc.text(` ${fmtTR(row.startDate)} - ${fmtTR(row.endDate)} tarihleri arasında kullandım.`, 40, leavePeriodYPosition1);

    // بخش چهارم (Adı Soyadı / İmza)
    const signatureYPosition = leavePeriodYPosition1 + 80;
    doc.text("Adı Soyadı", 380, signatureYPosition);  // محل برای نام پرسنل
    doc.text("İmza", 380, signatureYPosition + 20);    // محل برای امضای پرسنل
};

const getLeaveTypeTitle = (leaveType: number) => {
    switch (leaveType) {
        case 0:
            return "ÜCRETLİ FAZLA MESAİ İZİN TALEP DİLEKÇESİ";
        case 1:
            return "YILLIK İZİN TALEP DİLEKÇESİ";
        case 2:
            return "SAATLİK İZİN TALEP DİLEKÇESİ";
        case 3:
            return "ÜCRETSİZ İZİN TALEP DİLEKÇESİ";
        case 4:
            return "MAZERET İZİN TALEP DİLEKÇESİ";
        default:
            return "İZİN TALEP DİLEKÇESİ";
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

    // --- ردیف‌های ۱-۳: لوگو و فیلدهای سند (DOKÜMAN NO) ---
    // شبیه‌سازی لوگو در Excel با فضای خالی بزرگ (A1:D3)
    // ws.mergeCells('A1:D3');
    // ws.getCell('A1').value = '⬅️ LOGO HERE (Please insert image manually) ➡️';
    // ws.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
    // ws.getCell('A1').font = { italic: true, size: 8 };

    // فیلدهای DOKÜMAN NO و... در سمت راست (شبیه به PDF)
    ws.mergeCells('E1:F1'); ws.getCell('E1').value = 'DOKÜMAN NO:';
    ws.mergeCells('G1:H1'); ws.getCell('G1').value = ' ';

    ws.mergeCells('E2:F2'); ws.getCell('E2').value = 'YAYIN NO:';
    ws.mergeCells('G2:H2'); ws.getCell('G2').value = ' ';

    ws.mergeCells('E3:F3'); ws.getCell('E3').value = 'REVİZYON TARİHİ:';
    ws.mergeCells('G3:H3'); ws.getCell('G3').value = ' ';

    // تنظیم استایل برای DOKÜMAN NO
    for (let i = 1; i <= 3; i++) {
        ws.getCell(`E${i}`).style = { font: { bold: true, size: 10, name: 'Arial' }, alignment: { horizontal: 'left' } };
    }

    // --- ردیف‌های ۴-۷: ادامه فیلدهای سند و عنوان اصلی ---
    ws.mergeCells('A4:D4'); ws.getCell('A4').value = leaveTypeTitle; // عنوان اصلی در وسط
    ws.getCell('A4').style = { font: { bold: true, size: 12, name: 'Arial' }, alignment: { vertical: 'middle', horizontal: 'center' } };

    ws.mergeCells('E4:F4'); ws.getCell('E4').value = 'REVİZYON NO:';
    ws.mergeCells('G4:H4'); ws.getCell('G4').value = ' ';
    ws.getCell('E4').style = { font: { bold: true, size: 10, name: 'Arial' }, alignment: { horizontal: 'left' } };

    ws.mergeCells('E5:F5'); ws.getCell('E5').value = 'SAYFA NO:';
    ws.mergeCells('G5:H5'); ws.getCell('G5').value = '1/1'; // شبیه‌سازی "1/1"
    ws.getCell('E5').style = { font: { bold: true, size: 10, name: 'Arial' }, alignment: { horizontal: 'left' } };

    ws.addRow([]); // ردیف ۶ خالی (فاصله)

    // --- بخش ۷: title1 از SubHeader PDF ---
    ws.addRow([leaveTypedesc.title1]);
    ws.mergeCells('A7:H7');
    ws.getCell('A7').style = { font: { bold: true, size: 14, name: 'Arial' }, alignment: { horizontal: 'left' } };

    ws.addRow([]); // ردیف ۸ خالی
};

const generateLeaveExcelSubHeaderAndPersonnelInfo = (ws: ExcelWorksheet, row: LeaveType) => {
    const fullName = `${row.personnel.name} ${row.personnel.family}`;
    const duration = calculateLeaveDuration(row.startDate, row.endDate);
    const leaveTypedesc = getLeaveTypedesc(row.type);

    // --- بخش SubHeader (اطلاعات محل کار) ---
    let nextRow = ws.lastRow ? ws.lastRow.number + 1 : 1;
    ws.addRow(["İŞ YERİNİN"]); ws.mergeCells(`A${nextRow}:H${nextRow}`);
    ws.getCell(`A${nextRow}`).style = { font: { bold: true, size: 12, name: 'Arial' } };

    // اطلاعات کار
    nextRow++; ws.addRow(["ÜNVANI:", "SETAŞ SİSTEM BİLİŞİM SAN. TİC. A.Ş."]);
    ws.mergeCells(`A${nextRow}:C${nextRow}`); ws.mergeCells(`D${nextRow}:H${nextRow}`);

    nextRow++; ws.addRow(["ADRESİ:", "Mansuroğlu Mah. 283/6 Sk. No:2 BAYRAKLI/ İZMİR"]);
    ws.mergeCells(`A${nextRow}:C${nextRow}`); ws.mergeCells(`D${nextRow}:H${nextRow}`);

    nextRow++; ws.addRow(["İŞYERİ SSK NO:", " "]); // مقدار خالی
    ws.mergeCells(`A${nextRow}:C${nextRow}`); ws.mergeCells(`D${nextRow}:H${nextRow}`);
    ws.addRow([]); // فضای خالی

    ws.addRow([]); // فضای خالی
    nextRow = ws.lastRow ? ws.lastRow.number + 1 : nextRow + 1;

    ws.addRow(["ÇALIŞAN PERSONELİN"]); ws.mergeCells(`A${nextRow}:H${nextRow}`);
    ws.getCell(`A${nextRow}`).style = { font: { bold: true, size: 12, name: 'Arial' } };

    // اطلاعات پرسنل
    nextRow++; ws.addRow(["ADI SOYADI:", "", "", fullName]); // ⬅️ اینجا fullName در ستون D قرار می‌گیرد
    ws.mergeCells(`A${nextRow}:C${nextRow}`);
    ws.mergeCells(`D${nextRow}:H${nextRow}`);

    nextRow++; ws.addRow(["T.C. KİMLİK NO:", "", "", row.personnel.identityNumber || ' ']);
    ws.mergeCells(`A${nextRow}:C${nextRow}`);
    ws.mergeCells(`D${nextRow}:H${nextRow}`);

    // SSK SİCİL NO:
    nextRow++; ws.addRow(["SSK SİCİL NO:", "", "", row.personnel.insuranceNumber || ' ']);
    ws.mergeCells(`A${nextRow}:C${nextRow}`);
    ws.mergeCells(`D${nextRow}:H${nextRow}`);

    // İZNE AYRILMAK İSTENİLEN TARİH:
    nextRow++; ws.addRow(["İZNE AYRILMAK İSTENİLEN TARİH:", "", "", fmtTR(row.endDate)]);
    ws.mergeCells(`A${nextRow}:C${nextRow}`);
    ws.mergeCells(`D${nextRow}:H${nextRow}`);

    // İZİN BİTİŞ TARİHİ:
    nextRow++; ws.addRow(["İZİN BİTİŞ TARİHİ:", "", "", fmtTR(row.startDate)]);
    ws.mergeCells(`A${nextRow}:C${nextRow}`);
    ws.mergeCells(`D${nextRow}:H${nextRow}`);

    // İŞE BAŞLAMA TARİHİ:
    nextRow++; ws.addRow(["İŞE BAŞLAMA TARİHİ:", "", "", row.personnel.workStartDate ? fmtTR(row.personnel.workStartDate) : ' ']);
    ws.mergeCells(`A${nextRow}:C${nextRow}`);
    ws.mergeCells(`D${nextRow}:H${nextRow}`);

    // İZİN SÜRESİ:
    nextRow++; ws.addRow(["İZİN SÜRESİ:", "", "", duration]);
    ws.mergeCells(`A${nextRow}:C${nextRow}`);
    ws.mergeCells(`D${nextRow}:H${nextRow}`);

    ws.addRow([]); // فضای خالی

    // توضیحات (title2)
    ws.addRow([]); // فضای خالی
    nextRow = ws.lastRow ? ws.lastRow.number + 1 : nextRow + 1;
    ws.addRow([leaveTypedesc.title2]);
    ws.mergeCells(`A${nextRow}:H${nextRow}`);
    ws.getCell(`A${nextRow}`).style = { font: { size: 10, name: 'Arial' }, alignment: { horizontal: 'left' } };
    ws.addRow([]); // فضای خالی

    ws.addRow([]); // فضای خالی
    nextRow = ws.lastRow ? ws.lastRow.number + 1 : nextRow + 1;
    ws.addRow(["", "", "", "", "", "AD-SOYAD / İMZA"]);
    ws.mergeCells(`F${nextRow}:H${nextRow}`);
};

const generateLeaveExcelFooter = (ws: ExcelWorksheet, row: LeaveType) => {
    const leaveTypedesc = getLeaveTypedesc(row.type);
    const leaveTypeTitle = getLeaveTypeTitle(row.type);
    const currentDate = new Date();
    const formattedDate = `${currentDate.getDate() < 10 ? '0' + currentDate.getDate() : currentDate.getDate()}/${(currentDate.getMonth() + 1) < 10 ? '0' + (currentDate.getMonth() + 1) : (currentDate.getMonth() + 1)}/${currentDate.getFullYear()}`;

    // --- بخش title3 ---
    let nextRow = ws.lastRow ? ws.lastRow.number + 2 : 1;
    ws.addRow([leaveTypedesc.title3]);
    ws.mergeCells(`A${nextRow}:H${nextRow}`);
    ws.getCell(`A${nextRow}`).style = { font: { size: 10, name: 'Arial' } };

    // --- بخش Onay ve Tarih ---
    nextRow += 2;
    ws.addRow(["", "", "", "", "Onay", formattedDate]);
    ws.getCell(`E${nextRow}`).style = { font: { bold: true, size: 10, name: 'Arial' } };

    // --- بخش دوره مرخصی ---
    nextRow += 3;
    ws.addRow([`${leaveTypeTitle} Mesai izinimi`]);
    ws.mergeCells(`A${nextRow}:H${nextRow}`);
    ws.getCell(`A${nextRow}`).style = { font: { size: 10, name: 'Arial' } };

    nextRow += 1;
    ws.addRow([` ${fmtTR(row.startDate)} - ${fmtTR(row.endDate)} tarihleri arasında kullandım.`]);
    ws.mergeCells(`A${nextRow}:H${nextRow}`);
    ws.getCell(`A${nextRow}`).style = { font: { size: 10, name: 'Arial' } };

    // --- بخش امضا ---
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

    // 1. فراخوانی توابع کمکی به ترتیب PDF
    generateLeaveExcelHeaderAndDocInfo(ws, row);
    generateLeaveExcelSubHeaderAndPersonnelInfo(ws, row); // ادغام دو بخش SubHeader و PersonnelInfo
    generateLeaveExcelFooter(ws, row);

    // 2. تنظیمات نهایی ستون‌ها (فقط عرض)
    ws.columns = [
        { width: 20 }, { width: 5 }, { width: 5 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }
    ];

    // 3. ذخیره فایل
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
    const { allowedOperations = [] } = useAuth() as { allowedOperations?: any[] };

    const hasCreatePermission = useMemo(() => allowedOperations.some((op) => op.systemOperationName === "Eklemek"), [allowedOperations]);
    const hasEditPermission = useMemo(() => allowedOperations.some((op) => op.systemOperationName === "Düzenlemek"), [allowedOperations]);
    const hasDeletePermission = useMemo(() => allowedOperations.some((op) => op.systemOperationName === "Silmek"), [allowedOperations]);
    const hasDownloadPermission = useMemo(() => allowedOperations.some((op) => op.systemOperationName === "İndirmek ve Yazdırmak"), [allowedOperations]);

    // data
    const [leaves, setLeaves] = useState<LeaveType[]>([]);
    const [personnels, setPersonnels] = useState<PersonnelType[]>([]);

    // create form
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [personnelId, setPersonnelId] = useState<string>("");

    const [startError, setStartError] = useState<string>("");
    const [endError, setEndError] = useState<string>("");
    const [personnelError, setPersonnelError] = useState<string>("");

    // filters
    const [filterStart, setFilterStart] = useState<Date | null>(null);
    const [filterEnd, setFilterEnd] = useState<Date | null>(null);

    // table UX
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [orderBy, setOrderBy] = useState<keyof LeaveType>("createAt");
    const [order, setOrder] = useState<"asc" | "desc">("desc");
    const [searchTerm, setSearchTerm] = useState("");

    // menus & modals
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRow, setSelectedRow] = useState<LeaveType | null>(null);
    const openMenu = Boolean(anchorEl);

    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [leaveIdToDelete, setLeaveIdToDelete] = useState<string | number | null>(null);
    const [type, setType] = useState<number>(0); // مقدار پیش‌فرض 0 (Fazla Mesai)


    // ----- DOWNLOAD MODAL (یک دکمه برای همه جا) -----
    const [openDownloadModal, setOpenDownloadModal] = useState(false);
    const [downloadScope, setDownloadScope] = useState<"all" | "row">("all");
    const [rowForDownload, setRowForDownload] = useState<LeaveType | null>(null);

    // alerts/loading
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<"success" | "error" | "warning" | "info">("info");
    const [loadingData, setLoadingData] = useState<boolean>(true);
    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isBlinking, setIsBlinking] = useState(true);



    const showAlert = (m: string, s: "success" | "error" | "warning" | "info") => { setAlertMessage(m); setAlertSeverity(s); };
    const clearAlert = () => setAlertMessage(null);
    useEffect(() => { if (!alertMessage) return; const t = setTimeout(clearAlert, 5000); return () => clearTimeout(t); }, [alertMessage]);
    useEffect(() => { const t = setTimeout(() => setIsBlinking(false), 5000); return () => clearTimeout(t); }, []);

    // data fetch
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
            if (e.response?.status === 401) { localStorage.removeItem("authToken"); navigate("/"); return; }
            showAlert("Personel listesi alınırken bir hata oluştu.", "error");
        }
    };
    const getAllLeaves = async () => {
        const authToken = localStorage.getItem("authToken");
        setLoadingData(true);
        if (!authToken) { navigate("/"); setLoadingData(false); return; }
        try {
            const res = await axios.get(server.baseurl + server.hr + "get-all-leaves", {
                headers: { Accept: "application/json", Authorization: `Bearer ${authToken}` },
            });
            if (res.data?.httpStatusCode === 200) setLeaves(res.data.data || []);
            else showAlert(res.data?.message || "İzin listesi alınırken hata oluştu.", "error");
        } catch (e: any) {
            if (e.response?.status === 401) { localStorage.removeItem("authToken"); navigate("/"); return; }
            showAlert("İzin listesi alınırken bir hata oluştu.", "error");
        } finally { setLoadingData(false); }
    };
    useEffect(() => { getAllLeaves(); getAllPersonnels(); }, []);

    // form validate/submit
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
        try {
            const payload = {
                startDate: startDate!.toISOString(),
                endDate: endDate!.toISOString(),
                personnelId: Number(personnelId),
                type: type, // اضافه کردن type به payload
            };
            const res = await axios.post(server.baseurl + server.hr + "create-leave", payload, {
                headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
            });
            if (res.data?.httpStatusCode === 201 || res.data?.success) {
                showAlert("İzin kaydı başarıyla eklendi!", "success");
                setStartDate(null);
                setEndDate(null);
                setPersonnelId("");
                setType(0); // reset type
                setIsFormVisible(false);
                getAllLeaves();
            } else showAlert(res.data?.message || "İzin eklenirken hata oluştu.", "error");
        } catch (e: any) {
            if (e.response?.status === 401) { localStorage.removeItem("authToken"); navigate("/"); return; }
            showAlert(e.response?.data?.message || "İzin eklenirken hata oluştu.", "error");
        } finally { setLoadingButton(false); }
    };


    // table helpers
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

    // row menu
    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: LeaveType) => {
        setAnchorEl(event.currentTarget);
        setSelectedRow(row);
    };
    const handleCloseMenu = () => { setAnchorEl(null); setSelectedRow(null); };

    const updateLeaveStatus = async (id: string | number, status: 0 | 1 | 2) => {
        const authToken = localStorage.getItem("authToken");
        if (!authToken) { navigate("/"); }
        debugger
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
    // تابع به روز شده برای استفاده از generateLeaveExcel
    const handleDownloadChooseExcel = async () => {
        if (downloadScope === "all") {
            await exportExcel(sorted, "Izin_Listesi.xlsx");
        } else if (rowForDownload) {
            // ⬅️ فراخوانی تابع جدید generateLeaveExcel برای دانلود تک ردیفی
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
            {/* Top bar */}
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

            {/* Toolbar */}
            <BlankCard>
                <Box sx={{ p: 2 }}>

                    <Stack direction="row" justifyContent="start" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                        <Typography variant="h5">
                            İzin  Listesi

                        </Typography>
                        {notifIds.length > 0 && (
                            <Stack component="span" direction="row" spacing={1} alignItems="center" sx={{ ml: 1 }}>
                                <Chip
                                    label={`Bildirim filtresi: ${notifIds.length} id`}
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
                                    <DateTimePicker label="Bitiş Tarihi" value={filterEnd} onChange={(v) => setFilterEnd(v)} renderInput={(p) => <TextField {...p} size="small" fullWidth />} />
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

                {/* Table */}
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

            {/* Delete Modal */}
            <DeleteLeaves
                openModal={openDeleteModal}
                onClose={handleCloseDelete}
                leaveIdToDelete={leaveIdToDelete}
                onDeleteSuccess={getAllLeaves}
                showAlert={showAlert}
            />

            {/* Download Modal — یکسان برای "همه" و "ردیف" */}
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
        </>
    );
};

export default ListLeaves;
