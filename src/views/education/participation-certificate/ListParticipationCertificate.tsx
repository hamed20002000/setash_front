import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import server from '../../../assets/address.json';
import { IconAward, IconFileCertificate, IconCertificate, IconClockHour3, IconSearch } from '@tabler/icons-react';

// MUI bileşenlerini ekliyoruz (Projenizde zaten kurulu olmalıdır)
import { Autocomplete, TextField, CircularProgress, Box, Button, Stack, Typography } from '@mui/material';

import { tr } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// فرض می‌کنیم NotoSansRegular و Logo در دسترس هستند
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Logo from 'src/assets/images/logos/logo.png';
import { format } from 'date-fns';

interface PersonnelLite { id: number; name: string; family: string; identityNumber: string; hasISG: boolean; }
interface Course { courseId: string; courseTitle: string; totalHours: string; }
const showAlert = (message: string, type: 'success' | 'error' | 'warning') => console.log(`Uyarı (${type}): ${message}`);
const navigate = (path: string) => console.log(`Yönlendiriliyor: ${path}`);
const formatHours = (hours: string): string => {
    try {
        const num = parseFloat(hours);
        return `${num.toFixed(1)} Saat`;
    } catch {
        return hours;
    }
};



const formatDateDisplay = (dateString: string | null): string => {
    if (!dateString) return "-";
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "Geçersiz Tarih";
        return format(date, 'dd MMMM yyyy', { locale: tr });
    } catch (e) { return "Geçersiz Tarih"; }
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


const ListParticipationCertificate: React.FC = () => {
    const [personnels, setPersonnels] = useState<PersonnelLite[]>([]);
    const [selectedPersonnelId, setSelectedPersonnelId] = useState<number | null>(null);
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isPersonnelLoading, setIsPersonnelLoading] = useState<boolean>(false);

    // ... (fetchPersonnels, fetchCourses, useEffect, handlePrint kodları burada kalır)

    // Seçilen personelin tam adını bulma
    const selectedPersonnel = personnels.find(p => p.id === selectedPersonnelId);
    const selectedPersonnelFullName = selectedPersonnel ? `${selectedPersonnel.name} ${selectedPersonnel.family}` : 'Personel Seçiniz';

    const fetchPersonnels = useCallback(async () => {
        debugger
        setIsPersonnelLoading(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate('/'); return; }
        try {
            const res = await axios.get(`${server.baseurl}${server.hr}get-all-personnels`,
                { headers: { Authorization: `Bearer ${authToken}` } });
            if (res.data.httpStatusCode === 200) {
                const data = res.data.data as any[];
                const filteredAndMapped = data
                    .filter(p => (!p.workEndDate || p.workEndDate === null))
                    .map(p => ({
                        id: Number(p.id),
                        name: p.name,
                        family: p.family,
                        identityNumber: p.identityNumber,
                        hasISG: p.hasISG
                    })) as PersonnelLite[];
                setPersonnels(filteredAndMapped);
            } else { showAlert(res.data.message || 'Personel listesi alınamadı.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            } else {
                showAlert(e.response?.data?.message || 'Personel listesi alınırken bir hata oluştu.', 'error');
            }
        } finally {
            setIsPersonnelLoading(false);
        }
    }, [navigate]);

    const fetchCourses = useCallback(async (personnelId: number) => {
        setIsLoading(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate('/'); return; }
        try {
            const res = await axios.get(
                `${server.baseurl}${server.hr}get-personnel-course-by-id/${personnelId}`,
                { headers: { Authorization: `Bearer ${authToken}` } }
            );

            if (res.data.httpStatusCode === 200) {
                setCourses(res.data.data as Course[]);
                if (res.data.data.length === 0) {
                    showAlert('Seçilen personel kayıtlı bir kursa katılmamıştır.', 'warning');
                }
            } else {
                showAlert(res.data.message || 'Kurs listesi alınamadı.', 'error');
                setCourses([]);
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Kurs listesi alınırken bir hata oluştu.', 'error');
            setCourses([]);
        } finally {
            setIsLoading(false);
        }
    }, [navigate]);

    useEffect(() => { fetchPersonnels(); }, [fetchPersonnels]);

    // Handler جدید برای Autocomplete
    const handlePersonnelChange = (newValue: PersonnelLite | null) => {
        const personnelId = newValue ? newValue.id : null;
        setSelectedPersonnelId(personnelId);
        setCourses([]);

        if (personnelId) {
            fetchCourses(personnelId);
        }
    };


    // const createParticipationCertificatePdf = (
    //     personnel: PersonnelLite,
    //     course: Course,
    //     showAlert: (m: string, s: 'success' | 'error' | 'warning') => void
    // ) => {
    //     // 1. Dökümanı Hazırla
    //     const doc = new jsPDF();
    //     const pageWidth = doc.internal.pageSize.getWidth();
    //     let finalY = 50;

    //     // 2. Başlık
    //     const title = "KATILIM SERTİFİKASI (BAŞARI BELGESİ)";
    //     doc.setFont('NotoSans', 'normal');

    //     const boldText11 = `${course.courseTitle}`;
    //     addPdfHeader(doc, title); // فقط عنوان اصلی را پاس دهید

    //     // نمایش زیرنویس سفارشی شده با bold
    //     const sideMargin = 10;
    //     const subtitleY = 55;
    //     const textPrefix = "Kurs Adı: ";
    //     const docAny = doc as any; // برای دسترسی به متد addFont/setFont

    //     // تنظیم فونت برای بخش اول
    //     doc.setFontSize(10);
    //     doc.setFont('NotoSans', 'normal');
    //     doc.text(textPrefix, doc.internal.pageSize.getWidth() / 2 - 5, subtitleY, { align: "right" });
    //     let cursorX1 = doc.internal.pageSize.getWidth() / 2 - 20 + doc.getStringUnitWidth(textPrefix) * doc.getFontSize() / doc.internal.scaleFactor + 1;

    //     let cursorX = sideMargin;
    //     // تنظیم فونت برای بخش بُلد
    //     doc.setFont('NotoSans', 'bold');
    //     doc.text(boldText11, cursorX1, subtitleY, { align: "left" });

    //     // بازگشت به فونت عادی برای بقیه سند
    //     doc.setFont('NotoSans', 'normal');
    //     doc.setFontSize(14);
    //     doc.setFont('NotoSans', 'normal');
    //     doc.setTextColor(0, 0, 0);
    //     doc.text(`Sayın ${personnel.name} ${personnel.family},`, sideMargin, finalY);
    //     finalY += 15; // فاصله بیشتر از عنوان

    //     // شروع متن اصلی گواهی
    //     doc.setFontSize(11);
    //     let lineY = finalY;
    //     const space = 2; // فاصله بین کلمات/بخش‌ها

    //     // --- خط اول ---
    //     const text1 = `T.C. Kimlik Numaralı`;
    //     doc.text(text1, cursorX, lineY);
    //     cursorX += doc.getStringUnitWidth(text1) * doc.getFontSize() / doc.internal.scaleFactor + space;

    //     // بُلد: Kimlik Numarası
    //     const boldText1 = `(${personnel.identityNumber})`;
    //     doc.setFont('NotoSans', 'bold');
    //     doc.text(boldText1, cursorX, lineY);
    //     cursorX += doc.getStringUnitWidth(boldText1) * doc.getFontSize() / doc.internal.scaleFactor + space;

    //     // عادی: personelimiz, Şirketimiz bünyesinde düzenlenen
    //     doc.setFont('NotoSans', 'normal');
    //     const text2 = `personelimiz, Şirketimiz bünyesinde düzenlenen`;
    //     doc.text(text2, cursorX, lineY);
    //     cursorX += doc.getStringUnitWidth(text2) * doc.getFontSize() / doc.internal.scaleFactor + space;


    //     lineY += 10;
    //     cursorX = sideMargin;

    //     // بُلد: Course Title
    //     const boldText2 = `${course.courseTitle}`;

    //     doc.setFont('NotoSans', 'bold');
    //     doc.text(boldText2, cursorX, lineY);
    //     cursorX += doc.getStringUnitWidth(boldText2) * doc.getFontSize() / doc.internal.scaleFactor + space;

    //     // عادی: adlı eğitime başarıyla katılım sağlamış ve toplam
    //     doc.setFont('NotoSans', 'normal');
    //     const text3 = `adlı eğitime başarıyla katılım sağlamış ve toplam`;
    //     doc.text(text3, cursorX, lineY);
    //     cursorX += doc.getStringUnitWidth(text3) * doc.getFontSize() / doc.internal.scaleFactor + space;


    //     lineY += 10;
    //     cursorX = sideMargin;

    //     // بُلد: Total Hours
    //     const boldText3 = `${formatHours(course.totalHours)}`;
    //     doc.setFont('NotoSans', 'bold');
    //     doc.text(boldText3, cursorX, lineY);
    //     cursorX += doc.getStringUnitWidth(boldText3) * doc.getFontSize() / doc.internal.scaleFactor + space;

    //     doc.setFont('NotoSans', 'normal');
    //     const text4 = `süre ile eğitim almıştır.`;
    //     doc.text(text4, cursorX, lineY);
    //     cursorX += doc.getStringUnitWidth(text4) * doc.getFontSize() / doc.internal.scaleFactor + space;


    //     lineY += 10;
    //     cursorX = sideMargin;

    //     doc.setFont('NotoSans', 'normal');
    //     const text6 = `Gerekli yeterlilikleri yerine getirdiği için bu belgeyi almaya hak kazanmıştır.`;
    //     doc.text(text6, cursorX, lineY);
    //     cursorX += doc.getStringUnitWidth(text6) * doc.getFontSize() / doc.internal.scaleFactor + space;


    //     // --- خط چهارم ---
    //     lineY += 10;
    //     cursorX = sideMargin;

    //     // عادی: Bu belge, personelin kariyer gelişimine katkıda bulunmak amacıyla düzenlenmiştir.
    //     doc.setFont('NotoSans', 'normal');
    //     const text5 = `Bu belge, personelin kariyer gelişimine katkıda bulunmak amacıyla düzenlenmiştir.`;
    //     doc.text(text5, cursorX, lineY);


    //     finalY = lineY + 20; // به‌روزرسانی مکان نهایی برای شروع جدول

    //     // const splitText = doc.splitTextToSize(certificateText, pageWidth - 2);

    //     // doc.text(splitText, sideMargin, finalY + 5);
    //     // finalY += splitText.length * 3 + 30;

    //     // 4. Detay Tablosu
    //     doc.setFontSize(14);
    //     doc.text("Detay Bilgileri", sideMargin, finalY);
    //     finalY += 10;

    //     const detailBody = [
    //         ["Personel Adı Soyadı", `${personnel.name} ${personnel.family}`],
    //         ["Kimlik Numarası", personnel.identityNumber || 'Belirtilmemiş'],
    //         ["Kurs Adı", course.courseTitle],
    //         ["Eğitim Süresi", formatHours(course.totalHours)],
    //         ["Sertifika Tarihi", new Date().toLocaleDateString('tr-TR')],
    //     ];

    //     autoTable(docAny, {
    //         startY: finalY,
    //         head: [["Alan", "Değer"]],
    //         body: detailBody,
    //         theme: "grid",
    //         styles: { font: "NotoSans", fontStyle: "normal", fontSize: 10, cellPadding: 5, overflow: 'linebreak' },
    //         headStyles: { fillColor: [200, 220, 250], textColor: [0, 0, 0] },
    //         columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 'auto' } }, // Genişlik ayarı
    //         margin: { left: sideMargin, right: sideMargin },
    //     });
    //     finalY = (docAny.lastAutoTable.finalY || finalY) + 25;

    //     // 5. İmza Alanları (Mühür ve Yetkili Onayı)
    //     doc.setFontSize(10);

    //     // Sol İmza
    //     doc.text("Eğitmen / İSG Yetkilisi", sideMargin, finalY);
    //     doc.line(sideMargin, finalY + 10, sideMargin + 60, finalY + 10);

    //     // Sağ İmza
    //     doc.text("Kurum Yetkilisi / Genel Müdür", pageWidth - sideMargin - 70, finalY);
    //     doc.line(pageWidth - sideMargin - 70, finalY + 10, pageWidth - sideMargin, finalY + 10);

    //     // 6. Footer'ı tüm sayfalara ekle
    //     const pageCount = docAny.internal.getNumberOfPages();
    //     for (let i = 1; i <= pageCount; i++) {
    //         doc.setPage(i);
    //         addPdfFooter(doc); // Footer'ı her sayfaya ekler
    //     }

    //     // 7. Kaydetme
    //     const fileName = `Sertifika_${personnel.name}_${course.courseId}_${new Date().getFullYear()}.pdf`;
    //     doc.save(fileName);
    //     showAlert('Sertifika başarıyla oluşturuldu ve indiriliyor.', 'success');
    // };


    const createParticipationCertificatePdf = (
        personnel: PersonnelLite,
        course: Course,
        showAlert: (m: string, s: 'success' | 'error' | 'warning') => void
    ) => {
        // 1. آماده‌سازی سند
        const doc = new jsPDF();
        const docAny = doc as any;
        const pageWidth = doc.internal.pageSize.getWidth();
        const sideMargin = 20; // حاشیه استاندارد برای خوانایی بهتر
        const maxWidth = pageWidth - (sideMargin * 2);
        let finalY = 55;

        // بارگذاری فونت (مطمئن شوید NotoSans-Regular شامل کاراکترهای ترکی هست)
        docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.setFont('NotoSans');

        // 2. هدر
        const title = "KATILIM SERTİFİKASI (BAŞARI BELGESİ)";
        addPdfHeader(doc, title);

        // 3. متن خوش‌آمدگویی
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text(`Sayın ${personnel.name} ${personnel.family},`, sideMargin, finalY);
        finalY += 15;

        // 4. متن اصلی با قابلیت Justify
        // نکته: برای اینکه کاراکترهای ترکی به‌هم نریزند، متن به صورت یکپارچه ارسال می‌شود
        doc.setFontSize(11);
        doc.setFont('NotoSans', 'normal');

        const certificateText = `T.C. Kimlik Numaralı (${personnel.identityNumber}) personelimiz, Şirketimiz bünyesinde düzenlenen "${course.courseTitle}" adlı eğitime başarıyla katılım sağlamış ve toplam ${formatHours(course.totalHours)} süre ile eğitim almıştır. Gerekli yeterlilikleri yerine getirdiği için bu belgeyi almaya hak kazanmıştır. Bu belge, personelin kariyer gelişimine katkıda bulunmak amacıyla düzenlenmiştir.`;

        // چاپ متن به صورت Justify
        // پارامترهای maxWidth و align باعث تراز شدن خودکار می‌شوند
        doc.text(certificateText, sideMargin, finalY, {
            align: 'justify',
            maxWidth: maxWidth,
            lineHeightFactor: 1.6
        });

        // محاسبه خودکار ارتفاع متن برای قرارگیری جدول در جای درست
        const textLines = doc.splitTextToSize(certificateText, maxWidth);
        const textHeight = (textLines.length * doc.getLineHeight() / doc.internal.scaleFactor);
        finalY += textHeight + 20;

        // 5. جدول جزئیات (Detay Tablosu)
        doc.setFontSize(13);
        doc.setFont('NotoSans', 'bold');
        doc.text("Detay Bilgileri", sideMargin, finalY);
        finalY += 7;

        const detailBody = [
            ["Personel Adı Soyadı", `${personnel.name} ${personnel.family}`],
            ["Kimlik Numarası", personnel.identityNumber || 'Belirtilmemiş'],
            ["Kurs Adı", course.courseTitle],
            ["Eğitim Süresi", formatHours(course.totalHours)],
            ["Sertifika Tarihi", format(new Date(), 'dd MMMM yyyy', { locale: tr })],
        ];

        autoTable(docAny, {
            startY: finalY,
            head: [["Alan", "Değer"]],
            body: detailBody,
            theme: "grid",
            styles: {
                font: "NotoSans",
                fontStyle: "normal",
                fontSize: 10,
                cellPadding: 4,
                halign: 'left' // در جدول معمولاً چپ‌چین برای ترکی بهتر است
            },
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'normal' },
            columnStyles: { 0: { cellWidth: 50, fillColor: [250, 250, 250] } },
            margin: { left: sideMargin, right: sideMargin },
        });

        finalY = (docAny.lastAutoTable.finalY || finalY) + 30;

        // 6. بخش امضا
        doc.setFontSize(10);
        doc.setFont('NotoSans', 'normal');

        // امضا چپ
        doc.text("Eğitmen / İSG Yetkilisi", sideMargin, finalY);
        doc.line(sideMargin, finalY + 2, sideMargin + 50, finalY + 2);

        // امضا راست
        doc.text("Kurum Yetkilisi / Genel Müdür", pageWidth - sideMargin, finalY, { align: 'right' });
        doc.line(pageWidth - sideMargin - 50, finalY + 2, pageWidth - sideMargin, finalY + 2);

        // 7. افزودن فوتر به تمامی صفحات
        const totalPages = docAny.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            addPdfFooter(doc);
        }

        // 8. ذخیره‌سازی
        const fileName = `Sertifika_${personnel.name}_${personnel.family}.pdf`;
        doc.save(fileName);
        showAlert('Sertifika başarıyla oluşturuldu.', 'success');
    };

    const handlePrint = (courseId: string, _courseTitle: string) => {
        const currentPersonnel = personnels.find(p => p.id === selectedPersonnelId);
        const currentCourse = courses.find(c => c.courseId === courseId);
        if (!currentPersonnel) {
            showAlert("Lütfen önce bir personel seçin.", "warning");
            return;
        }
        if (!currentCourse) {
            showAlert("Kurs bilgileri bulunamadı.", "warning");
            return;
        }

        // 4. PDF Oluşturma Fonksiyonunu Çağır
        createParticipationCertificatePdf(currentPersonnel, currentCourse, showAlert);
    };


    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>

            <Typography variant="h5">
                <IconAward size={30} style={{ marginLeft: '10px', color: '#007BFF' }} />
                Katılım Sertifikası Yönetimi
            </Typography>
            {/* بخش انتخاب پرسنل (Autocomplete) */}
            <Box sx={{ marginBottom: '30px', marginTop: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Personel Seçiniz:
                </label>
                <Autocomplete
                    options={personnels}
                    getOptionLabel={(p) => `${p.name} ${p.family} (${p.identityNumber})`}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    onChange={(_, newValue) => handlePersonnelChange(newValue)}
                    value={personnels.find(p => p.id === selectedPersonnelId) || null}
                    loading={isPersonnelLoading}
                    noOptionsText={isPersonnelLoading ? 'Yükleniyor...' : 'Kayıt bulunamadı'}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            fullWidth
                            size="small"
                            placeholder="Ad, Soyad veya TC ile arama yapın"
                            InputProps={{
                                ...params.InputProps,
                                startAdornment: (
                                    <Stack direction="row" alignItems="center" sx={{ mr: 1 }}>
                                        <IconSearch size={20} color="#666" />
                                    </Stack>
                                ),
                                endAdornment: (
                                    <React.Fragment>
                                        {isPersonnelLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                        {params.InputProps.endAdornment}
                                    </React.Fragment>
                                ),
                            }}
                        />
                    )}
                />
            </Box>

            {/* بخش نمایش دوره‌ها */}
            {selectedPersonnelId !== null && (
                <div style={{ marginTop: '30px' }}>
                    <h2 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
                        {selectedPersonnelFullName} Kurs Kayıtları:
                    </h2>

                    {isLoading && (
                        <div style={{ textAlign: 'center', padding: '50px' }}>
                            <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CircularProgress size={20} style={{ marginRight: '8px' }} />
                                Kurs bilgileri yükleniyor...
                            </p>
                        </div>
                    )}

                    {!isLoading && courses.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '50px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                            <p style={{ color: '#888' }}>
                                Seçilen personel için tamamlanmış kurs kaydı bulunamadı.
                            </p>
                        </div>
                    )}

                    {/* Kurs Kartları (Card View) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                        {!isLoading && courses.map((course) => (
                            <div
                                key={course.courseId}
                                style={{
                                    border: '1px solid #ddd',
                                    borderRadius: '8px',
                                    padding: '20px',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                                    transition: 'transform 0.2s',
                                    backgroundColor: 'white',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                {/* Kurs Bilgileri */}
                                <div style={{ marginBottom: '15px' }}>
                                    <h3 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', color: '#0056b3' }}>
                                        <IconCertificate size={22}
                                            style={{ marginLeft: '8px', marginRight: '8px', color: '#0787ffff' }} />
                                        {course.courseTitle}
                                    </h3>
                                    <p style={{ margin: '0', color: '#555', display: 'flex', alignItems: 'center' }}>
                                        <IconClockHour3 size={18} style={{ marginLeft: '8px', marginRight: '8px', color: '#ff0707ff' }} />
                                        Eğitim Süresi: {formatHours(course.totalHours)}
                                    </p>
                                </div>

                                {/* Sertifika Yazdırma Düğmesi */}
                                <Button
                                    variant="contained"
                                    color="success"
                                    onClick={() => handlePrint(course.courseId, course.courseTitle)}
                                    startIcon={<IconFileCertificate size={20} />}
                                    fullWidth
                                    sx={{ mt: 2 }}
                                >
                                    Sertifikayı Yazdır
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ListParticipationCertificate;