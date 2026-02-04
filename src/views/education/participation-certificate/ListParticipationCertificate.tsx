import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import server from '../../../assets/address.json';
import { IconAward, IconFileCertificate, IconCertificate, IconClockHour3, IconSearch } from '@tabler/icons-react';

import { Autocomplete, TextField, CircularProgress, Box, Button, Stack, Typography } from '@mui/material';

import { tr } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Logo from 'src/assets/images/logos/logo.png';
import { format } from 'date-fns';

interface PersonnelLite { id: number; name: string; family: string; identityNumber: string; hasISG: boolean; }
interface Course { courseId: string; courseTitle: string; totalHours: string; courseHours: string; }
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
    doc.text(`${formatDateDisplay(new Date().toISOString())}`, 40, 35);

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

    const selectedPersonnel = personnels.find(p => p.id === selectedPersonnelId);
    const selectedPersonnelFullName = selectedPersonnel ? `${selectedPersonnel.name} ${selectedPersonnel.family}` : 'Personel Seçiniz';

    const fetchPersonnels = useCallback(async () => {

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

    const handlePersonnelChange = (newValue: PersonnelLite | null) => {
        const personnelId = newValue ? newValue.id : null;
        setSelectedPersonnelId(personnelId);
        setCourses([]);

        if (personnelId) {
            fetchCourses(personnelId);
        }
    };
    const createParticipationCertificatePdf = (
        personnel: PersonnelLite,
        course: Course,
        showAlert: (m: string, s: 'success' | 'error' | 'warning') => void
    ) => {
        const doc = new jsPDF();
        const docAny = doc as any;
        const pageWidth = doc.internal.pageSize.getWidth();
        const sideMargin = 20;
        const maxWidth = pageWidth - (sideMargin * 2);
        let finalY = 55;

        docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.setFont('NotoSans');

        const title = "KATILIM SERTİFİKASI (BAŞARI BELGESİ)";
        addPdfHeader(doc, title);

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text(`Sayın ${personnel.name} ${personnel.family},`, sideMargin, finalY);
        finalY += 15;

        doc.setFontSize(11);
        doc.setFont('NotoSans', 'normal');

        const certificateText = `T.C. Kimlik Numaralı (${personnel.identityNumber}) personelimiz, Şirketimiz bünyesinde düzenlenen "${course.courseTitle}" adlı eğitime başarıyla katılım sağlamış ve toplam ${formatHours(course.courseHours)} süre ile eğitim almıştır. Gerekli yeterlilikleri yerine getirdiği için bu belgeyi almaya hak kazanmıştır. Bu belge, personelin kariyer gelişimine katkıda bulunmak amacıyla düzenlenmiştir.`;

        doc.text(certificateText, sideMargin, finalY, {
            align: 'justify',
            maxWidth: maxWidth,
            lineHeightFactor: 1.6
        });

        const textLines = doc.splitTextToSize(certificateText, maxWidth);
        const textHeight = (textLines.length * doc.getLineHeight() / doc.internal.scaleFactor);
        finalY += textHeight + 20;

        doc.setFontSize(13);
        doc.setFont('NotoSans', 'bold');
        doc.text("Detay Bilgileri", sideMargin, finalY);
        finalY += 7;

        const detailBody = [
            ["Personel Adı Soyadı", `${personnel.name} ${personnel.family}`],
            ["Kimlik Numarası", personnel.identityNumber || 'Belirtilmemiş'],
            ["Kurs Adı", course.courseTitle],
            ["Eğitim Süresi", formatHours(course.courseHours)],
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
                halign: 'left'
            },
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'normal' },
            columnStyles: { 0: { cellWidth: 50, fillColor: [250, 250, 250] } },
            margin: { left: sideMargin, right: sideMargin },
        });

        finalY = (docAny.lastAutoTable.finalY || finalY) + 30;

        doc.setFontSize(10);
        doc.setFont('NotoSans', 'normal');

        doc.text("Eğitmen / İSG Yetkilisi", sideMargin, finalY);
        doc.line(sideMargin, finalY + 2, sideMargin + 50, finalY + 2);

        doc.text("Kurum Yetkilisi / Genel Müdür", pageWidth - sideMargin, finalY, { align: 'right' });
        doc.line(pageWidth - sideMargin - 50, finalY + 2, pageWidth - sideMargin, finalY + 2);

        const totalPages = docAny.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            addPdfFooter(doc);
        }

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

        createParticipationCertificatePdf(currentPersonnel, currentCourse, showAlert);
    };


    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>

            <Typography variant="h5">
                <IconAward size={30} style={{ marginLeft: '10px', color: '#007BFF' }} />
                Katılım Sertifikası Yönetimi
            </Typography>
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
                                <div style={{ marginBottom: '15px' }}>
                                    <h3 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', color: '#0056b3' }}>
                                        <IconCertificate size={22} style={{ marginLeft: '8px', marginRight: '8px', color: '#0787ffff' }} />
                                        {course.courseTitle}
                                    </h3>
                                    <Stack spacing={1}>
                                        <p style={{ margin: '0', color: '#555', display: 'flex', alignItems: 'center' }}>
                                            <IconClockHour3 size={18} style={{ marginLeft: '8px', marginRight: '8px', color: '#ff0707ff' }} />
                                            Katılım Süresi: {formatHours(course.totalHours)}
                                        </p>
                                        <p style={{ margin: '0', color: '#666', display: 'flex', alignItems: 'center', fontSize: '0.9rem' }}>
                                            <IconClockHour3 size={18} style={{ marginLeft: '8px', marginRight: '8px', color: '#757575' }} />
                                            Toplam Kurs Süresi: {formatHours(course.courseHours)}
                                        </p>
                                    </Stack>
                                </div>

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