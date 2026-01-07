import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    Typography, Box,
    TableCell as MuiTableCell,
    Stack, Alert, CircularProgress, Button,
    Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions,
    FormControlLabel, Checkbox, TextField, Select, MenuItem, FormControl, InputLabel, Grid,
    IconButton, RadioGroup, Radio, Menu, MenuItem as MuiMenuItem, ListItemIcon
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
    IconDots, IconCheck, IconEdit, IconUsers, IconTrash,
    IconPlus, IconSearch, IconFileText, IconFileDownload, IconUser
} from '@tabler/icons-react';
import axios from 'axios';
import server from '../../../assets/address.json';
import BlankCard from '../../../components/shared/BlankCard';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';

import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Logo from 'src/assets/images/logos/logo.png';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import { tr } from "date-fns/locale";


// --- Enums and Utility Types ---
export enum CommiteMemberPosition { Baskan = 0, Uye = 1 }
const getCommiteMemberPositionText = (position: number): string => {
    switch (position) { case CommiteMemberPosition.Baskan: return 'Başkan'; case CommiteMemberPosition.Uye: return 'Üye'; default: return 'Bilinmiyor'; }
};

export enum CommiteAnswer { ONAYLANAN_KABUL_TUTANAKLARI = 0, KABUL_YAPILMAYANLAR = 1, GDZ_DE_BEKLEYENLER = 2, ISLETMEDE_IMZADA_BEKLEYENLER = 3, IMZADA = 4, IMZALANDI = 5 }
const getCommiteAnswerText = (answer: number): string => {
    switch (answer) { case 0: return 'Onaylanan Kabul Tutanakları'; case 1: return 'Kabul Yapılmayanlar'; case 2: return 'GDZ\'de Bekleyenler'; case 3: return 'İşletmede  İmzada Bekleyenler'; case 4: return 'İmzada'; case 5: return 'İmzalandı'; default: return 'Bilinmiyor'; }
};
const CommiteAnswerOptions = Object.keys(CommiteAnswer).filter(key => !isNaN(Number(key))).map(key => ({ id: Number(key), title: getCommiteAnswerText(Number(key)) }));

export interface ProjectReportType { year: number; city: string; town: string | null; region: string | null; tesistype: number; tradi: string | null; projectcount: string; }
export interface ConfirmationReportType {
    id: string; year: number;
    city: string; town: string | null; region: string | null; tesisType: number; trAdi: string | null;
    projectCount: number; Gecici_tutanak_teslim_alma_durumu: boolean;
    Kesin_tutanak_teslim_alma_durumu: boolean;
    confirmationReportCommiteMembers?: ConfirmationCommiteeMemberType[];
    imzalandiCount: number;
}
export interface CommiteeMemberDropdownType { id: string; name: string; family: string; position: number; title: string; }
export interface ConfirmationCommiteeMemberType {
    id: string;
    commiteMember: CommiteeMemberDropdownType;
    createAt: string;
    answer?: number | null;
    memberStatus?: boolean; // false: Gecici, true: Kesin
}

export interface MemberAnswerDTO {
    id: string; answer: string; createAt: string;
    confirmationReportCommiteMember: { id: string; createAt: string; recordStatus: number; };
    commiteMemberName: string;
    confirmationReportCommiteMemberId: string;
}

// --- NEW INTERFACE FOR FULL ANSWER LIST ---
export interface FullAnswerDTO {
    id: string;
    answer: number;
    createAt: string;
    recordStatus: number;
    confirmationReportCommiteMember: {
        id: string;
        createAt: string;
        recordStatus: number;
        memberStatus: boolean;
        commiteMember: {
            id: string;
            name: string;
            family: string;
            position: number;
            createAt: string;
            recordStatus: number;
        };
    };
}

interface MemberNameMap {
    [memberId: string]: { name: string, family: string, position: number };
}

export interface DisplayReportType extends ProjectReportType {
    isConfirmed: boolean; confirmationId: string | null;
    Gecici_tutanak_durumu: boolean; Kesin_tutanak_durumu: boolean;
    memberCount: number;
    imzalandiCount: number;
}

// const TesisTypeMap: { [key: number]: string } = { 0: 'Merkez', 1: 'Ana', 2: 'Şube', 3: 'Tasarım', };
const TesisTypeMap: { [key: number]: string } = { 0: 'AG', 1: 'OG', 2: 'TesisKet' };
const getTesisTypeText = (type: number): string => { return TesisTypeMap[type] || 'Bilinmiyor'; };

const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans', fontSize: '0.8rem', [theme.breakpoints.up('md')]: { fontSize: '1rem', },
    whiteSpace: 'nowrap',
}));

// --- MODAL TYPE DEFINITIONS ---
interface ModalFormValues { year: number; city: string; town: string | null; region: string | null; tesisType: number; tradi: string | null; projectCount: number; geciciDurum: boolean; kesinDurum: boolean; }
interface ConfirmationModalProps {
    open: boolean; onClose: () => void; report: DisplayReportType | null;
    onConfirm: (report: DisplayReportType, newValues: ModalFormValues) => Promise<void>; loading: boolean;
}
interface CommiteeMembersModalProps { open: boolean; onClose: () => void; confirmationId: string | null; refreshData: () => Promise<void>; showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void; }
interface MemberAnswerModalProps { open: boolean; onClose: () => void; confirmationId: string | null; refreshData: () => Promise<void>; showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void; }

interface DetailViewModalProps {
    open: boolean;
    onClose: () => void;
    report: DisplayReportType | null;
    onExportExcel: (report: DisplayReportType) => Promise<void>;
    onExportPdf: (report: DisplayReportType) => Promise<void>;
    handleOpenMembersModal: (confirmationId: string) => void;
    handleOpenAnswerModal: (confirmationId: string) => void;
    handleOpenModal: (report: DisplayReportType) => void;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
}

// --- NEW MODAL COMPONENT: AnswersListModal ---
interface AnswersListModalProps {
    open: boolean;
    onClose: () => void;
    reportId: string | null;
}

const AnswersListModal: React.FC<AnswersListModalProps> = ({ open, onClose, reportId }) => {
    const [answers, setAnswers] = useState<FullAnswerDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const authToken = localStorage.getItem('authToken');

    useEffect(() => {
        const fetchAnswers = async () => {
            if (!reportId || !open || !authToken) return;
            setLoading(true);
            try {
                const result = await axios.get(
                    server.baseurl + server.report + `get-confirmation-report-commite-member-answer-by-report-id/${reportId}`,
                    { headers: { "Authorization": `Bearer ${authToken}` } }
                );
                if (result.data.httpStatusCode === 200 && result.data.data) {
                    setAnswers(result.data.data);
                } else {
                    setAnswers([]);
                }
            } catch (error) {
                console.error("Error fetching answer list:", error);
                setAnswers([]);
            } finally {
                setLoading(false);
            }
        };
        fetchAnswers();
    }, [reportId, open, authToken]);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Komite Üyesi Cevap Listesi</DialogTitle>
            <DialogContent dividers>
                {loading ? (
                    <Box display="flex" justifyContent="center" p={3}><CircularProgress /></Box>
                ) : (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                    <MuiTableCell>Üye Adı Soyadı</MuiTableCell>
                                    <MuiTableCell>Pozisyon</MuiTableCell>
                                    <MuiTableCell>Tutanak Tipi</MuiTableCell>
                                    <MuiTableCell>Cevap</MuiTableCell>
                                    <MuiTableCell>Tarih</MuiTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {answers.length === 0 ? (
                                    <TableRow><MuiTableCell colSpan={5} align="center">Henüz cevap kaydı bulunmamaktadır.</MuiTableCell></TableRow>
                                ) : (
                                    answers.map((item) => (
                                        <TableRow key={item.id}>
                                            <MuiTableCell>{item.confirmationReportCommiteMember.commiteMember.name} {item.confirmationReportCommiteMember.commiteMember.family}</MuiTableCell>
                                            <MuiTableCell>{getCommiteMemberPositionText(item.confirmationReportCommiteMember.commiteMember.position)}</MuiTableCell>
                                            <MuiTableCell>
                                                <Box component="span" sx={{ color: item.confirmationReportCommiteMember.memberStatus ? 'success.main' : 'warning.main', fontWeight: 'bold' }}>
                                                    {item.confirmationReportCommiteMember.memberStatus ? 'Kesin' : 'Geçici'}
                                                </Box>
                                            </MuiTableCell>
                                            <MuiTableCell>{getCommiteAnswerText(item.answer)}</MuiTableCell>
                                            <MuiTableCell>{new Date(item.createAt).toLocaleDateString('tr-TR')}</MuiTableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </DialogContent>
            <DialogActions><Button onClick={onClose} color="primary">Kapat</Button></DialogActions>
        </Dialog>
    );
};

// --- Other Modal Components ---

interface DownloadRowModalProps {
    open: boolean;
    onClose: () => void;
    report: DisplayReportType | null;
    onExportExcel: (report: DisplayReportType) => Promise<void>;
    onExportPdf: (report: DisplayReportType) => Promise<void>;
    loading: boolean;
}

const DownloadRowModal: React.FC<DownloadRowModalProps> = ({
    open, onClose, report, onExportExcel, onExportPdf, loading
}) => {
    if (!report) return null;
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogContent dividers>
                <Typography variant="body1" mb={2}>Seçilen onaylanmış proje raporunun detaylarını hangi formatta indirmek istediğinizi seçin.</Typography>
                <Stack direction="column" spacing={2}>
                    <Button variant="contained" color="primary" fullWidth startIcon={<IconFileDownload />} onClick={() => onExportExcel(report)} disabled={loading}>
                        {loading ? <CircularProgress size={20} color="inherit" /> : 'Excel Olarak İndir'}
                    </Button>
                    <Button variant="contained" color="success" fullWidth startIcon={<IconFileDownload />} onClick={() => onExportPdf(report)} disabled={loading}>
                        {loading ? <CircularProgress size={20} color="inherit" /> : 'PDF Olarak İndir'}
                    </Button>
                </Stack>
            </DialogContent>
            <DialogActions><Button onClick={onClose} color="secondary" disabled={loading}>Kapat</Button></DialogActions>
        </Dialog>
    );
};

export interface MemberDisplayData { member: ConfirmationCommiteeMemberType; latestAnswer: MemberAnswerDTO | null; }

const DetailViewModal: React.FC<DetailViewModalProps> = ({
    open, onClose, report, onExportExcel, onExportPdf, showAlert
}) => {
    const [loading, setLoading] = useState(true);
    const [fullMemberDetails, setFullMemberDetails] = useState<MemberDisplayData[]>([]);
    const authToken = localStorage.getItem('authToken');

    const fetchFullDetails = useCallback(async (confirmationId: string) => {
        if (!authToken || !confirmationId) { return; }
        setLoading(true);
        try {
            const membersResult = await axios.get(
                server.baseurl + server.report + `get-confirmation-report-commite-member/${confirmationId}`,
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );
            const members: ConfirmationCommiteeMemberType[] = membersResult.data.data || [];
            const detailPromises = members.map(async (member) => {
                let latestAnswer: MemberAnswerDTO | null = null;
                if (member.id) {
                    const answersResult = await axios.get(
                        server.baseurl + server.report + `get-confirmation_report-commite-member-answer-dto-by-member-id/${member.id}`,
                        { headers: { "Authorization": `Bearer ${authToken}` } }
                    );
                    const answers: MemberAnswerDTO[] = answersResult.data.data || [];
                    latestAnswer = answers.length > 0 ? answers[0] : null;
                }
                return { member, latestAnswer };
            });
            const resolvedDetails = await Promise.all(detailPromises);
            setFullMemberDetails(resolvedDetails);
        } catch (e) {
            console.error("Detaylı veri yükleme hatası:", e);
            showAlert('Detaylı komite verileri yüklenirken hata oluştu.', 'error');
            setFullMemberDetails([]);
        } finally { setLoading(false); }
    }, [authToken, showAlert]);

    useEffect(() => {
        if (open && report?.confirmationId) { fetchFullDetails(report.confirmationId); } else if (!open) { setFullMemberDetails([]); }
    }, [open, report?.confirmationId, fetchFullDetails]);

    if (!report) return null;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Proje Detayları: {report.city} - {report.year}</DialogTitle>
            <DialogContent dividers>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /><Typography sx={{ ml: 2 }}>Detaylar yükleniyor...</Typography></Box>
                ) : (
                    <Grid container spacing={4}>
                        <Grid item xs={12} md={6}>
                            <Typography variant="h6" mb={2} color="primary">🔍 Temel Bilgiler</Typography>
                            <Stack spacing={1}>
                                <CustomTextField label="Yıl" size="small" fullWidth value={report.year} disabled />
                                <CustomTextField label="Şehir" size="small" fullWidth value={report.city} disabled />
                                <CustomTextField label="İlçe" size="small" fullWidth value={report.town || '-'} disabled />
                                <CustomTextField label="Bölge" size="small" fullWidth value={report.region || '-'} disabled />
                                <CustomTextField label="Tesis Tipi" size="small" fullWidth value={getTesisTypeText(report.tesistype)} disabled />
                                <CustomTextField label="Proje Sayısı" size="small" fullWidth value={report.projectcount} disabled />
                            </Stack>
                            <Box mt={3}>
                                <Typography variant="h6" mb={1} color="info">Tutanak Durumu</Typography>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Alert severity={report.Gecici_tutanak_durumu ? "success" : "warning"} icon={false} sx={{ py: 0, px: 1 }}>Geçici:  {report.Gecici_tutanak_durumu ? 'Alındı' : 'Bekleniyor'} </Alert>
                                    <Alert severity={report.Kesin_tutanak_durumu ? "success" : "warning"} icon={false} sx={{ py: 0, px: 1 }}>Kesin:  {report.Kesin_tutanak_durumu ? 'Alındı' : 'Bekleniyor'} </Alert>
                                </Stack>
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Typography variant="h6" mb={2} color="secondary">🧑‍💻 Komite Üyeleri ve Cevaplar</Typography>
                            {fullMemberDetails.length === 0 ? (
                                <Alert severity="warning">Bu rapor için kayıtlı komite üyesi bulunamadı.</Alert>
                            ) : (
                                <Stack spacing={1}>
                                    {fullMemberDetails.map((item, _index) => (
                                        <Box key={item.member.id} p={1.5} sx={{ border: '1px solid #eee', borderRadius: 1, backgroundColor: item.member.memberStatus ? '#e6f7ff' : '#fff7e6' }}>
                                            <Typography variant="subtitle1" fontWeight="bold">{item.member.commiteMember.name} {item.member.commiteMember.family}</Typography>
                                            <Typography variant="body2" color="textSecondary">
                                                Pozisyon: {getCommiteMemberPositionText(item.member.commiteMember.position)} |
                                                Tutanak Tipi: <Box component="span" fontWeight="bold" color={item.member.memberStatus ? 'success.main' : 'warning.main'}>{item.member.memberStatus ? 'Kesin' : 'Geçici'}</Box>
                                            </Typography>
                                            <Typography variant="body2" mt={0.5}>
                                                Cevap Durumu:  {item.latestAnswer ? getCommiteAnswerText(Number(item.latestAnswer.answer)) : 'Cevaplanmadı'}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Stack>
                            )}
                        </Grid>
                        <Grid item xs={12} mt={2}>
                            <Typography variant="h6" mb={1} color="secondary">📥 Raporu İndir</Typography>
                            <Stack direction="row" spacing={2}>
                                <Button variant="contained" color="success" startIcon={<IconFileDownload />} onClick={() => onExportPdf(report)} disabled={loading} fullWidth>PDF Olarak İndir</Button>
                                <Button variant="contained" color="primary" startIcon={<IconFileDownload />} onClick={() => onExportExcel(report)} disabled={loading} fullWidth>Excel Olarak İndir</Button>
                            </Stack>
                        </Grid>
                    </Grid>
                )}
            </DialogContent>
            <DialogActions><Button onClick={onClose} color="secondary">Kapat</Button></DialogActions>
        </Dialog>
    );
};

const getPositionText = (position: CommiteMemberPosition | number | string): string => {
    const posId = Number(position);
    switch (posId) { case CommiteMemberPosition.Baskan: return 'Başkan'; case CommiteMemberPosition.Uye: return 'Üye'; default: return 'Bilinmiyor'; }
};

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ open, onClose, report, onConfirm, loading }) => {
    const [formValues, setFormValues] = useState<ModalFormValues>({
        year: 0, city: '', town: '', region: '', tesisType: 0, tradi: '', projectCount: 0, geciciDurum: false, kesinDurum: false,
    });
    useEffect(() => {
        if (report) {
            setFormValues({
                year: report.year, city: report.city, town: report.town || '', region: report.region || '',
                tesisType: report.tesistype, tradi: report.tradi || '', projectCount: Number(report.projectcount),
                geciciDurum: report.Gecici_tutanak_durumu, kesinDurum: report.Kesin_tutanak_durumu,
            });
        }
    }, [report]);

    const isEditingTutanak = report?.isConfirmed ?? false;
    const isGeciciLocked = formValues.geciciDurum;
    const isKesinLocked = formValues.kesinDurum;
    const handleChange = (name: keyof ModalFormValues, value: any) => { setFormValues(prev => ({ ...prev, [name]: value })); };
    const handleAction = () => { if (report) { onConfirm(report, formValues); } };

    if (!report) return null;
    const title = isEditingTutanak ? 'Proje Durumunu Güncelle' : 'Proje Raporu Onayı (İlk Kayıt)';

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>{title}</DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={4}>
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" mb={2} gutterBottom color="primary">🔍 Proje Temel Bilgileri</Typography>
                        <Stack spacing={1}>
                            <CustomTextField label="Yıl" size="small" fullWidth value={formValues.year} disabled />
                            <CustomTextField label="Şehir" size="small" fullWidth value={formValues.city} disabled />
                            <CustomTextField label="İlçe" size="small" fullWidth value={formValues.town} disabled />
                            <CustomTextField label="Bölge" size="small" fullWidth value={formValues.region} disabled />
                            <CustomTextField label="Tesis Tipi" size="small" fullWidth value={getTesisTypeText(formValues.tesisType)} disabled />
                            <CustomTextField label="Proje Sayısı" size="small" fullWidth value={formValues.projectCount} disabled />
                        </Stack>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" gutterBottom color={isEditingTutanak ? "info" : "success"}>
                            {isEditingTutanak ? '⚙️ Tutanak Durumu Güncelle' : '✅ İlk Onay Kaydı'}
                        </Typography>
                        {!isEditingTutanak && (<Alert severity="info" sx={{ mb: 2 }}>Bu işlem raporu komite onay sürecine dahil eder.</Alert>)}
                        {isEditingTutanak && (
                            <Stack spacing={2} mt={2}>
                                <Tooltip title={isGeciciLocked ? "Durum kaydedilmiştir, değiştirilemez." : "Geçici Tutanak Teslim Alındı olarak işaretle."}>
                                    <span>
                                        <FormControlLabel control={<Checkbox checked={formValues.geciciDurum} onChange={(e) => handleChange('geciciDurum', e.target.checked)} color="warning" disabled={isGeciciLocked || loading} />}
                                            label={<Typography fontWeight="bold" color={isGeciciLocked ? "textSecondary" : "textPrimary"}>Geçici Tutanak Teslim Alma Durumu {isGeciciLocked && "(Kilitli)"}</Typography>} />
                                    </span>
                                </Tooltip>
                                <Tooltip title={isKesinLocked ? "Durum kaydedilmiştir, değiştirilemez." : "Kesin Tutanak Teslim Alındı olarak işaretle."}>
                                    <span>
                                        <FormControlLabel control={<Checkbox checked={formValues.kesinDurum} onChange={(e) => handleChange('kesinDurum', e.target.checked)} color="success" disabled={isKesinLocked || loading} />}
                                            label={<Typography fontWeight="bold" color={isKesinLocked ? "textSecondary" : "textPrimary"}>Kesin Tutanak Teslim Alma Durumu {isKesinLocked && "(Kilitli)"}</Typography>} />
                                    </span>
                                </Tooltip>
                            </Stack>
                        )}
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="secondary" disabled={loading}>İptal Et</Button>
                <Button onClick={handleAction} color={isEditingTutanak ? 'info' : 'success'} variant="contained" disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : (isEditingTutanak ? <IconEdit size={20} /> : <IconCheck size={20} />)}>
                    {loading ? 'Bekleniyor...' : (isEditingTutanak ? 'Tutanakları Güncelle' : 'Onayla ve Başlat')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const CommiteeMembersModal: React.FC<CommiteeMembersModalProps> = ({
    open, onClose, confirmationId, refreshData, showAlert
}) => {
    const [allMembersDropdown, setAllMembersDropdown] = useState<CommiteeMemberDropdownType[]>([]);
    const [registeredMembers, setRegisteredMembers] = useState<ConfirmationCommiteeMemberType[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState<string>('');
    const [memberStatus, setMemberStatus] = useState<boolean>(false);
    const [loadingDropdown, setLoadingDropdown] = useState(true);
    const [loadingRegistration, setLoadingRegistration] = useState(false);
    const [loadingList, setLoadingList] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const authToken = localStorage.getItem('authToken');

    const availableMembers = useMemo(() => {
        const registeredIdsInCurrentStatus = new Set(
            registeredMembers.filter(reg => reg.memberStatus === memberStatus).map(reg => reg.commiteMember.id)
        );
        return allMembersDropdown.filter(member => !registeredIdsInCurrentStatus.has(member.id))
            .filter(member => member.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [allMembersDropdown, registeredMembers, searchTerm, memberStatus]);

    const fetchCommiteeMembersForDropdown = useCallback(async () => {
        if (!authToken) return;
        setLoadingDropdown(true);
        try {
            const result = await axios.get(server.baseurl + server.report + "get-all-commitee-members", { headers: { "Authorization": `Bearer ${authToken}` } });
            if (result.data.httpStatusCode === 200 && result.data.data) {
                const formattedMembers: CommiteeMemberDropdownType[] = result.data.data.map((item: any) => ({
                    id: String(item.id), name: item.name, family: item.family, position: item.position,
                    title: `${item.name} ${item.family} (${getCommiteMemberPositionText(item.position)})`
                }));
                setAllMembersDropdown(formattedMembers);
            }
        } catch (e) { console.error("Error fetching commitee members dropdown:", e); } finally { setLoadingDropdown(false); }
    }, [authToken]);

    const fetchRegisteredMembers = useCallback(async () => {
        if (!authToken || !confirmationId) return;
        setLoadingList(true);
        try {
            const result = await axios.get(server.baseurl + server.report + `get-confirmation-report-commite-member/${confirmationId}`, { headers: { "Authorization": `Bearer ${authToken}` } });
            if (result.data.httpStatusCode === 200 && result.data.data) {
                const registered: ConfirmationCommiteeMemberType[] = result.data.data.map((item: any) => ({
                    ...item, commiteMember: { ...item.commiteMember, id: String(item.commiteMember.id) }, memberStatus: item.memberStatus
                }));
                setRegisteredMembers(registered);
            } else { setRegisteredMembers([]); }
        } catch (e) { console.error("Error fetching registered members:", e); } finally { setLoadingList(false); }
    }, [authToken, confirmationId]);

    const handleRegisterMember = async () => {
        if (!authToken || !confirmationId || !selectedMemberId) { showAlert("Lütfen bir komite üyesi seçin.", 'warning'); return; }
        setLoadingRegistration(true);
        try {
            const payload = { commiteMembersId: Number(selectedMemberId), confirmationProjectReportId: Number(confirmationId), memberStatus: memberStatus };
            await axios.post(server.baseurl + server.report + "create-confirmation-report-commite-member", payload, { headers: { "Authorization": `Bearer ${authToken}` } });
            showAlert("Komite üyesi başarıyla eklendi.", 'success');
            setSelectedMemberId(''); setSearchTerm(''); setMemberStatus(false);
            await fetchRegisteredMembers(); await refreshData();
        } catch (e: any) { showAlert(e.response?.data?.message || 'Üye kaydı sırasında bir hata oluştu.', 'error'); } finally { setLoadingRegistration(false); }
    };

    const handleDeleteMember = async (memberRegistrationId: string) => {
        if (!authToken) return;
        setDeletingId(memberRegistrationId);
        try {
            await axios.delete(server.baseurl + server.report + "delete-confirmation-report-commite-member", { data: { id: Number(memberRegistrationId) }, headers: { "Authorization": `Bearer ${authToken}` } });
            showAlert("Komite üyesi başarıyla silindi.", 'success');
            await fetchRegisteredMembers(); await refreshData();
        } catch (e: any) { showAlert(e.response?.data?.message || 'Üye silinirken bir hata oluştu.', 'error'); } finally { setDeletingId(null); }
    };

    const handleStatusChange = (status: boolean) => { setMemberStatus(status); setSelectedMemberId(''); setSearchTerm(''); }

    useEffect(() => {
        if (open && confirmationId) { fetchCommiteeMembersForDropdown(); fetchRegisteredMembers(); setMemberStatus(false); }
    }, [open, confirmationId, fetchCommiteeMembersForDropdown, fetchRegisteredMembers]);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Komite Üyeleri Yönetimi (Rapor ID: {confirmationId})</DialogTitle>
            <DialogContent dividers>
                <FormControl component="fieldset" margin="normal" sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>Komite Üyeliği Tipi:</Typography>
                    <RadioGroup row value={memberStatus ? 'kesin' : 'gecici'} onChange={(e) => handleStatusChange(e.target.value === 'kesin')}>
                        <FormControlLabel value="gecici" control={<Radio />} label="Geçici Tutanak Komitesi" />
                        <FormControlLabel value="kesin" control={<Radio />} label="Kesin Tutanak Komitesi" />
                    </RadioGroup>
                </FormControl>
                <Stack direction="row" spacing={2} mb={3} alignItems="flex-end">
                    <FormControl fullWidth size="small">
                        <InputLabel id="commiteMember-label">Komite Üyesi Seçin</InputLabel>
                        <Select labelId="commiteMember-label" label="Komite Üyesi Seçin" value={selectedMemberId} onChange={(e) => setSelectedMemberId(e.target.value as string)} disabled={loadingDropdown || loadingRegistration} MenuProps={{ style: { maxHeight: 300 } }}>
                            <MenuItem disabled value="">
                                <TextField fullWidth size="small" placeholder="Üye adı veya pozisyonu ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} InputProps={{ startAdornment: <IconSearch size={18} style={{ marginRight: 8 }} /> }} />
                            </MenuItem>
                            {loadingDropdown ? (<MenuItem disabled>Yükleniyor...</MenuItem>) : availableMembers.length === 0 && searchTerm === '' ? (<MenuItem disabled>Tüm üyeler eklenmiş.</MenuItem>) : availableMembers.length === 0 && searchTerm !== '' ? (<MenuItem disabled>Arama sonucu bulunamadı.</MenuItem>) : (availableMembers.map(member => (<MenuItem key={member.id} value={member.id}>{member.title}</MenuItem>)))}
                        </Select>
                    </FormControl>
                    <Button variant="contained" color="primary" onClick={handleRegisterMember} disabled={!selectedMemberId || loadingRegistration || loadingDropdown} startIcon={loadingRegistration ? <CircularProgress size={20} color="inherit" /> : <IconPlus size={20} />} sx={{ minWidth: 120 }}>Ekle</Button>
                </Stack>
                <Typography variant="subtitle1" mt={4} mb={2}>Kayıtlı Üyeler:</Typography>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow style={{ background: "#e0e0e0" }}><MuiTableCell>Üye Adı Soyadı</MuiTableCell><MuiTableCell>Pozisyon</MuiTableCell><MuiTableCell>Tutanak Tipi</MuiTableCell><MuiTableCell align="right">İşlemler</MuiTableCell></TableRow>
                        </TableHead>
                        <TableBody>
                            {loadingList ? (<TableRow><MuiTableCell colSpan={4} align="center"><CircularProgress size={20} /></MuiTableCell></TableRow>) : registeredMembers.length === 0 ? (<TableRow><MuiTableCell colSpan={4} align="center">Henüz üye eklenmedi.</MuiTableCell></TableRow>) : (registeredMembers.map((reg) => (
                                <TableRow key={reg.id}>
                                    <MuiTableCell>{reg.commiteMember.name} {reg.commiteMember.family}</MuiTableCell>
                                    <MuiTableCell>{getCommiteMemberPositionText(reg.commiteMember.position)}</MuiTableCell>
                                    <MuiTableCell><Typography variant="body2" color={reg.memberStatus ? 'success.main' : 'warning.main'} fontWeight="bold">{reg.memberStatus ? 'Kesin' : 'Geçici'}</Typography></MuiTableCell>
                                    <MuiTableCell align="right">
                                        <Tooltip title="Üyeyi sil"><IconButton size="small" color="error" onClick={() => handleDeleteMember(reg.id)} disabled={deletingId === reg.id}>{deletingId === reg.id ? <CircularProgress size={16} color="inherit" /> : <IconTrash size={16} />}</IconButton></Tooltip>
                                    </MuiTableCell>
                                </TableRow>
                            )))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </DialogContent>
            <DialogActions><Button onClick={onClose} color="primary" variant="contained">Kapat</Button></DialogActions>
        </Dialog>
    );
};

const MemberAnswerModal: React.FC<MemberAnswerModalProps> = ({
    open, onClose, confirmationId, refreshData, showAlert
}) => {
    const [membersList, setMembersList] = useState<ConfirmationCommiteeMemberType[]>([]);
    const [memberAnswers, setMemberAnswers] = useState<MemberAnswerDTO[]>([]);
    const [selectedAnswer, setSelectedAnswer] = useState<number | ''>('');
    const [selectedMemberReportId, setSelectedMemberReportId] = useState<string>('');
    const [loadingList, setLoadingList] = useState(true);
    const [loadingAnswers, setLoadingAnswers] = useState(false);
    const [loadingSubmission, setLoadingSubmission] = useState(false);
    const [memberSearchTerm, setMemberSearchTerm] = useState('');
    const [deletingAnswerId, setDeletingAnswerId] = useState<string | null>(null);
    const [answeredMemberIds, setAnsweredMemberIds] = useState<string[]>([]);
    const authToken = localStorage.getItem('authToken');

    const filteredMembersList = useMemo(() => {
        if (!memberSearchTerm) return membersList;
        return membersList.filter(member => member.commiteMember.name.toLowerCase().includes(memberSearchTerm.toLowerCase()) || member.commiteMember.family.toLowerCase().includes(memberSearchTerm.toLowerCase()));
    }, [membersList, memberSearchTerm]);

    const hasAnswered = useMemo(() => { return memberAnswers.length > 0; }, [memberAnswers]);
    const selectedMemberTutanakType = useMemo(() => {
        const member = membersList.find(m => m.id === selectedMemberReportId);
        if (member?.memberStatus === true) return 'Kesin';
        if (member?.memberStatus === false) return 'Geçici';
        return 'Belirtilmemiş';
    }, [membersList, selectedMemberReportId]);

    const fetchRegisteredMembers = useCallback(async () => {
        if (!authToken || !confirmationId) return;
        setLoadingList(true);
        try {
            const result = await axios.get(server.baseurl + server.report + `get-confirmation-report-commite-member/${confirmationId}`, { headers: { "Authorization": `Bearer ${authToken}` } });
            if (result.data.httpStatusCode === 200 && result.data.data) {
                const members = result.data.data.map((item: any) => ({
                    ...item, commiteMember: { ...item.commiteMember, id: String(item.commiteMember.id) }, memberStatus: item.memberStatus
                })) as ConfirmationCommiteeMemberType[];
                setMembersList(members);
            } else { setMembersList([]); }
        } catch (e) { console.error("Error fetching registered members for answer:", e); } finally { setLoadingList(false); }
    }, [authToken, confirmationId]);

    const fetchAllAnswersForReport = useCallback(async () => {
        if (!authToken || !confirmationId) return;
        try {
            const result = await axios.get(server.baseurl + server.report + `get-confirmation-report-commite-member-answer-by-report-id/${confirmationId}`, { headers: { "Authorization": `Bearer ${authToken}` } });
            if (result.data.httpStatusCode === 200 && result.data.data) {
                const answers: FullAnswerDTO[] = result.data.data;
                const answeredIds = answers.map(a => String(a.confirmationReportCommiteMember.id));
                setAnsweredMemberIds(answeredIds);
            } else { setAnsweredMemberIds([]); }
        } catch (e) { console.error("Error fetching existing answers:", e); }
    }, [authToken, confirmationId]);

    const fetchAnswersByMemberId = useCallback(async (memberReportId: string) => {
        if (!authToken || !memberReportId) { setMemberAnswers([]); return; }
        setLoadingAnswers(true);
        try {
            const result = await axios.get(server.baseurl + server.report + `get-confirmation_report-commite-member-answer-dto-by-member-id/${memberReportId}`, { headers: { "Authorization": `Bearer ${authToken}` } });
            if (result.data.httpStatusCode === 200 && result.data.data) {
                const answers: any[] = result.data.data;
                const combinedAnswers: MemberAnswerDTO[] = answers.map(answer => {
                    const memberRecord = membersList.find(m => m.id === memberReportId);
                    const memberName = memberRecord ? `${memberRecord.commiteMember.name} ${memberRecord.commiteMember.family}` : `Üye ID: ${memberReportId} (Bilinmiyor)`;
                    return { id: String(answer.id), answer: String(answer.answer), createAt: answer.createAt, confirmationReportCommiteMemberId: memberReportId, commiteMemberName: memberName, } as MemberAnswerDTO;
                });
                setMemberAnswers(combinedAnswers);
            } else { setMemberAnswers([]); }
        } catch (e) { console.error("Error fetching answers by member ID:", e); setMemberAnswers([]); } finally { setLoadingAnswers(false); }
    }, [authToken, membersList]);

    const handleAnswerSubmission = async () => {
        if (!authToken || selectedAnswer === '' || !selectedMemberReportId) { showAlert("Lütfen hem üye hem de cevabı seçin.", 'warning'); return; }
        if (hasAnswered) { showAlert("Bu üye zaten cevap kaydetmiştir.", 'warning'); return; }
        setLoadingSubmission(true);
        try {
            const payload = { answer: Number(selectedAnswer), ConfirmationReportCommiteMemberId: Number(selectedMemberReportId) };
            await axios.post(server.baseurl + server.report + "create-confirmation-report-commite-member-answer", payload, { headers: { "Authorization": `Bearer ${authToken}` } });
            showAlert("Cevap başarıyla kaydedildi.", 'success');
            setSelectedAnswer('');
            await fetchAnswersByMemberId(selectedMemberReportId);
            await fetchAllAnswersForReport(); // Update the list of who answered
            await refreshData();
        } catch (e: any) { showAlert(e.response?.data?.message || 'Cevap kaydı sırasında bir hata oluştu.', 'error'); } finally { setLoadingSubmission(false); }
    };

    const handleDeleteAnswer = async (answerId: string) => {
        if (!authToken) return;
        setDeletingAnswerId(answerId);
        try {
            await axios.delete(server.baseurl + server.report + "delete-confirmation-report-commite-member-answer", { data: { id: Number(answerId) }, headers: { "Authorization": `Bearer ${authToken}` } });
            showAlert("Cevap başarıyla silindi.", 'success');
            await fetchAnswersByMemberId(selectedMemberReportId);
            await fetchAllAnswersForReport();
            await refreshData();
        } catch (e: any) { showAlert(e.response?.data?.message || 'Cevap silinirken bir hata oluştu.', 'error'); } finally { setDeletingAnswerId(null); }
    };

    useEffect(() => {
        if (open && confirmationId) {
            fetchRegisteredMembers();
            fetchAllAnswersForReport();
            setMemberSearchTerm(''); setSelectedMemberReportId(''); setSelectedAnswer(''); setMemberAnswers([]); setLoadingAnswers(false);
        }
    }, [open, confirmationId, fetchRegisteredMembers, fetchAllAnswersForReport]);

    useEffect(() => {
        if (selectedMemberReportId && open) { fetchAnswersByMemberId(selectedMemberReportId); } else if (open && !selectedMemberReportId) { setMemberAnswers([]); }
    }, [selectedMemberReportId, open, fetchAnswersByMemberId]);

    const handleMemberSelectChange = (value: string) => { setSelectedMemberReportId(value); setSelectedAnswer(''); };
    const isTableLoading = loadingList || loadingAnswers;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Komite Üyesi Cevabı Kaydı</DialogTitle>
            <DialogContent dividers>
                <Typography variant="h6" mb={2}>Yeni Cevap Ekle</Typography>
                {selectedMemberReportId && (<Box mb={2}><Typography variant="subtitle1" fontWeight="bold" color={selectedMemberTutanakType === 'Kesin' ? 'success.main' : 'warning.main'}>{selectedMemberTutanakType} Tutanak Komitesine Cevap Veriliyor</Typography></Box>)}
                <Stack spacing={3} mt={2}>
                    <FormControl fullWidth size="small" disabled={loadingList || loadingSubmission}>
                        <InputLabel id="member-report-id-label">Komite Üyesi Rapor Kaydı</InputLabel>
                        <Select labelId="member-report-id-label" label="Komite Üyesi Rapor Kaydı" value={selectedMemberReportId} onChange={(e) => handleMemberSelectChange(e.target.value as string)} MenuProps={{ style: { maxHeight: 300 } }}>
                            <MenuItem disabled value=""><TextField fullWidth size="small" placeholder="Üye adı veya pozisyonu ara..." value={memberSearchTerm} onChange={(e) => setMemberSearchTerm(e.target.value)} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} InputProps={{ startAdornment: <IconSearch size={18} style={{ marginRight: 8 }} /> }} /></MenuItem>
                            {loadingList && membersList.length === 0 ? (<MenuItem disabled>Yükleniyor...</MenuItem>) : filteredMembersList.length === 0 ? (<MenuItem disabled>Kayıt bulunamadı.</MenuItem>) : (filteredMembersList.map(member => {
                                const isAnswered = answeredMemberIds.includes(String(member.id));
                                return (
                                    <MenuItem key={member.id} value={member.id}>
                                        <Stack direction="row" alignItems="center" width="100%" justifyContent="space-between">
                                            <Box>{member.commiteMember.name} {member.commiteMember.family} ({getCommiteMemberPositionText(member.commiteMember.position)})
                                                <Box component="span" sx={{ ml: 1, color: member.memberStatus ? 'success.main' : 'warning.main', fontWeight: 'bold', fontSize: '0.75rem' }}>[{member.memberStatus ? 'Kesin' : 'Geçici'}]</Box>
                                            </Box>
                                            {isAnswered ? (<Box sx={{ display: 'flex', alignItems: 'center', color: 'success.main', ml: 1 }}><IconCheck size={16} /><Typography variant="caption" sx={{ ml: 0.5, fontWeight: 'bold' }}>Cevapladı</Typography></Box>) : (<Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>- Bekliyor</Typography>)}
                                        </Stack>
                                    </MenuItem>
                                )
                            }))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth size="small" disabled={loadingSubmission || !selectedMemberReportId || hasAnswered}>
                        <InputLabel id="answer-label">Cevap Durumu</InputLabel>
                        <Select labelId="answer-label" label="Cevap Durumu" value={selectedAnswer} onChange={(e) => setSelectedAnswer(Number(e.target.value))} disabled={hasAnswered || !selectedMemberReportId}>
                            {CommiteAnswerOptions.map(option => (<MenuItem key={option.id} value={option.id}>{option.title}</MenuItem>))}
                        </Select>
                    </FormControl>
                </Stack>
                <DialogActions sx={{ p: 0, pt: 2, justifyContent: 'flex-end' }}>
                    <Tooltip title={hasAnswered ? "Bu üye zaten cevap kaydetmiştir." : "Cevabı kaydet"}><span><Button onClick={handleAnswerSubmission} color="success" variant="contained" disabled={loadingSubmission || selectedAnswer === '' || selectedMemberReportId === '' || hasAnswered} startIcon={loadingSubmission ? <CircularProgress size={20} color="inherit" /> : <IconCheck size={20} />}>Kaydet</Button></span></Tooltip>
                </DialogActions>
                <Typography variant="h6" mt={4} mb={2}>{selectedMemberReportId ? `Kayıtlı Cevaplar (${memberAnswers.length})` : "Lütfen üye seçimi yapın."}</Typography>
                <TableContainer>
                    <Table size="small">
                        <TableHead><TableRow style={{ background: "#e0e0e0" }}><MuiTableCell>Üye</MuiTableCell><MuiTableCell>Cevap Durumu</MuiTableCell><MuiTableCell align="right">İşlemler</MuiTableCell></TableRow></TableHead>
                        <TableBody>
                            {isTableLoading ? (<TableRow><MuiTableCell colSpan={3} align="center"><CircularProgress size={20} /></MuiTableCell></TableRow>) : memberAnswers.length === 0 ? (<TableRow><MuiTableCell colSpan={3} align="center">Hiç cevap bulunamadı.</MuiTableCell></TableRow>) : (memberAnswers.map((answer) => (
                                <TableRow key={answer.id}>
                                    <MuiTableCell>{answer.commiteMemberName}</MuiTableCell>
                                    <MuiTableCell>{getCommiteAnswerText(Number(answer.answer))}</MuiTableCell>
                                    <MuiTableCell align="right">
                                        <Tooltip title="Cevabı sil"><IconButton size="small" color="error" onClick={() => handleDeleteAnswer(answer.id)} disabled={deletingAnswerId === answer.id}>{deletingAnswerId === answer.id ? <CircularProgress size={16} color="inherit" /> : <IconTrash size={16} />}</IconButton></Tooltip>
                                    </MuiTableCell>
                                </TableRow>
                            )))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </DialogContent>
            <DialogActions><Button onClick={onClose} color="primary" variant="contained">Kapat</Button></DialogActions>
        </Dialog>
    );
};

// const addPdfHeader = (doc: jsPDF, title: string, subtitle?: string) => {
//     const pageWidth = doc.internal.pageSize.getWidth();
//     const docAny = doc as any;
//     try { docAny.addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular); docAny.addFont("NotoSans-Regular.ttf", "NotoSans", "normal"); doc.setFont("NotoSans"); } catch (e) { }
//     docAny.addImage(Logo, "PNG", pageWidth - 50, 15, 40, 25);
//     doc.setFontSize(18); doc.text(title, pageWidth / 2, 15, { align: "center" });
//     doc.setFontSize(10); doc.text(`Rapor Tarihi:`, 15, 30); doc.text(`${new Date().toLocaleDateString('tr-TR')}`, 80, 30);
//     if (subtitle) doc.text(subtitle, pageWidth / 2, 55, { align: "center" });
// };

// const addPdfFooter = (doc: jsPDF) => {
//     const pageWidth = doc.internal.pageSize.getWidth();
//     const pageHeight = doc.internal.pageSize.getHeight();
//     doc.setFontSize(8);
//     const companyInfo = ['SETAŞ SİSTEM BİLİŞİم İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.', 'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11', 'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr'];
//     let footerY = pageHeight - 50;
//     companyInfo.forEach((line) => { doc.text(line, pageWidth / 2, footerY, { align: "center" }); footerY += 10; });
//     doc.setFontSize(10); doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
//     doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
//     const docAny = doc as any;
//     const pageCount = docAny.internal.getNumberOfPages();
//     doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
// };



const formatDateDisplay = (dateString: string | null): string => {
    if (!dateString) return "-";
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "Geçersiz Tarih";
        return format(date, 'dd MMMM yyyy', { locale: tr });
    } catch (e) { return "Geçersiz Tarih"; }
};



const addPdfHeader = (doc: jsPDF, title: string, subtitle?: string) => {

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
    if (subtitle) doc.text(subtitle, pageWidth / 2, 55, { align: "center" });
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



const ListCommiteeMembersReport = () => {
    const navigate = useNavigate();
    const [reportData, setReportData] = useState<DisplayReportType[]>([]);
    const [confirmationData, setConfirmationData] = useState<ConfirmationReportType[]>([]);
    const [loadingData, setLoadingData] = useState<boolean>(true);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    const [openConfirmationModal, setOpenConfirmationModal] = useState(false);
    const [selectedReportToConfirm, setSelectedReportToConfirm] = useState<DisplayReportType | null>(null);
    const [confirmationLoading, setConfirmationLoading] = useState<boolean>(false);

    const [openMembersModal, setOpenMembersModal] = useState(false);
    const [selectedConfirmationId, setSelectedConfirmationId] = useState<string | null>(null);

    const [openAnswerModal, setOpenAnswerModal] = useState(false);
    const [selectedAnswerConfirmationId, setSelectedAnswerConfirmationId] = useState<string | null>(null);

    const [openDownloadModal, setOpenDownloadModal] = useState(false);
    const [downloadLoading, setDownloadLoading] = useState(false);
    const [selectedReportToDownload, setSelectedReportToDownload] = useState<DisplayReportType | null>(null);
    const [openSingleDownloadModal, setOpenSingleDownloadModal] = useState(false);

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<DisplayReportType | null>(null);
    const [openDetailViewModal, setOpenDetailViewModal] = useState(false);

    // --- New States for Answer List Modal ---
    const [openAnswersListModal, setOpenAnswersListModal] = useState(false);
    const [selectedReportIdForAnswers, setSelectedReportIdForAnswers] = useState<string | null>(null);

    const openMenu = Boolean(anchorEl);

    // --- Answer List Handlers ---
    const handleOpenAnswersListModal = (confirmationId: string) => { setSelectedReportIdForAnswers(confirmationId); setOpenAnswersListModal(true); };
    const handleCloseAnswersListModal = () => { setOpenAnswersListModal(false); setSelectedReportIdForAnswers(null); };

    const handleOpenSingleDownloadModal = (report: DisplayReportType) => { if (!report.isConfirmed || !report.confirmationId) { showAlert('Bu rapor henüz onaylanmadı.', 'warning'); return; } setSelectedReportToDownload(report); setOpenSingleDownloadModal(true); };
    const handleCloseSingleDownloadModal = () => { setOpenSingleDownloadModal(false); setSelectedReportToDownload(null); };

    const handleOpenDetailViewModal = () => { setOpenDetailViewModal(true); };
    const handleCloseDetailViewModal = () => { setOpenDetailViewModal(false); setSelectedReportToDownload(null); };
    const handleViewDetailsFromMenu = () => { if (selectedRowForMenu) { handleCloseMenu(); setSelectedReportToDownload(selectedRowForMenu); handleOpenDetailViewModal(); } };

    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => { setAlertMessage(message); setAlertSeverity(severity); }, []);
    const clearAlert = () => { setAlertMessage(null); };
    const handleApiError = useCallback((e: any) => { if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/"); } else { console.error("API Error:", e); showAlert(e.response?.data?.message || 'Bir hata oluştu.', 'error'); } }, [navigate, showAlert]);
    const formatDateDisplay = (dateString: string | null): string => { if (!dateString || dateString === 'null') return "N/A"; try { const date = new Date(dateString); return date.toLocaleDateString('tr-TR'); } catch (e) { return "Geçersiz Tarih"; } };
    const isFlexibleMatch = (value1: string | number | null | undefined, value2: string | number | null | undefined): boolean => { const normalize = (val: any) => { if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) { return null; } if (typeof val === 'string' && !isNaN(Number(val))) { return Number(val); } return val; }; const n1 = normalize(value1); const n2 = normalize(value2); return n1 === n2; };

    const fetchConfirmationData = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) return;
        try { const result = await axios.get(server.baseurl + server.report + "get-all-confirmation-project-reports", { headers: { "Authorization": `Bearer ${authToken}` } }); if (result.data.httpStatusCode === 200 && result.data.data) { setConfirmationData(result.data.data as ConfirmationReportType[]); } else { setConfirmationData([]); } } catch (e: any) { console.error("Error fetching confirmation data:", e); }
    }, []);

    const fetchLatestProjectReports = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        setLoadingData(true);
        if (!authToken) { navigate("/"); setLoadingData(false); return; }
        try {
            const result = await axios.get(server.baseurl + server.report + "get-latest-project-reports", { headers: { "Authorization": `Bearer ${authToken}` } });
            if (result.data.httpStatusCode === 200 && result.data.data) {
                const mainReports = result.data.data as ProjectReportType[];
                const combinedData: DisplayReportType[] = mainReports.map((report) => {
                    const existingConfirmation = confirmationData.find(conf => conf.year === report.year && conf.city === report.city && conf.tesisType === report.tesistype && isFlexibleMatch(conf.year, report.year) && isFlexibleMatch(conf.city, report.city) && isFlexibleMatch(conf.tesisType, report.tesistype) && isFlexibleMatch(conf.projectCount, report.projectcount) && isFlexibleMatch(conf.town, report.town) && isFlexibleMatch(conf.region, report.region) && isFlexibleMatch(conf.trAdi, report.tradi));
                    const confirmationId = existingConfirmation ? existingConfirmation.id : null;
                    let memberCount = 0;
                    let imzalandiCount = 0;
                    if (existingConfirmation) {
                        const members = existingConfirmation.confirmationReportCommiteMembers || [];
                        memberCount = members.length;
                        imzalandiCount = existingConfirmation.imzalandiCount || 0;
                    }
                    return { ...report, isConfirmed: !!existingConfirmation, confirmationId: confirmationId, Gecici_tutanak_durumu: existingConfirmation ? existingConfirmation.Gecici_tutanak_teslim_alma_durumu : false, Kesin_tutanak_durumu: existingConfirmation ? existingConfirmation.Kesin_tutanak_teslim_alma_durumu : false, memberCount: memberCount, imzalandiCount: imzalandiCount, };
                });
                setReportData(combinedData); showAlert('Rapor verileri başarıyla yüklendi.', 'success');
            } else { setReportData([]); showAlert(result.data.message || 'Rapor verileri alınırken bir hata oluştu.', 'error'); }
        } catch (e: any) { handleApiError(e); } finally { setLoadingData(false); }
    }, [confirmationData, navigate, showAlert, handleApiError]);

    const handleUpdateTutanakStatus = async (oldReport: DisplayReportType, newValues: ModalFormValues) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken || !oldReport.confirmationId) { showAlert('Oturum süreniz doldu veya rapor kimliği eksik.', 'error'); return; }
        const hasChanged = newValues.geciciDurum !== oldReport.Gecici_tutanak_durumu || newValues.kesinDurum !== oldReport.Kesin_tutanak_durumu;
        if (!hasChanged) { showAlert('Herhangi bir tutanak durumu değişikliği yapılmadı.', 'warning'); handleCloseModal(); return; }
        setConfirmationLoading(true);
        const getEmptyIfNull = (value: string | number | null | undefined) => { if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) { return ""; } return value; };
        try {
            const payload = { id: Number(oldReport.confirmationId), year: oldReport.year, city: oldReport.city, town: getEmptyIfNull(oldReport.town), region: getEmptyIfNull(oldReport.region), tesisType: oldReport.tesistype, trAdi: getEmptyIfNull(oldReport.tradi), projectCount: Number(oldReport.projectcount), Gecici_tutanak_teslim_alma_durumu: newValues.geciciDurum, Kesin_tutanak_teslim_alma_durumu: newValues.kesinDurum, };
            const response = await axios.put(server.baseurl + server.report + "update-confirmation-project-report", payload, { headers: { "Authorization": `Bearer ${authToken}` } });
            if (response.data.httpStatusCode === 200 && response.data.success) { showAlert('Tutanak durumları başarıyla güncellendi!', 'success'); } else { showAlert(response.data.message || 'Tutanak durumları güncellenirken bir hata oluştu.', 'error'); }
            handleCloseModal(); await fetchConfirmationData(); await fetchLatestProjectReports();
        } catch (e: any) { handleApiError(e); } finally { setConfirmationLoading(false); }
    };

    const handleConfirmReport = async (oldReport: DisplayReportType) => {
        const authToken = localStorage.getItem('authToken');
        setConfirmationLoading(true);
        const getEmptyIfNull = (value: string | number | null | undefined) => { if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) { return ""; } return value; };
        try {
            const payload = { year: oldReport.year, city: oldReport.city, town: getEmptyIfNull(oldReport.town), region: getEmptyIfNull(oldReport.region), tesisType: oldReport.tesistype, trAdi: getEmptyIfNull(oldReport.tradi), projectCount: Number(oldReport.projectcount), Gecici_tutanak_teslim_alma_durumu: false, Kesin_tutanak_teslim_alma_durumu: false, };
            await axios.post(server.baseurl + server.report + "create-confirmation-project-report", payload, { headers: { "Authorization": `Bearer ${authToken}` } });
            showAlert(`Proje raporu başarıyla onaylandı!`, 'success');
            await fetchConfirmationData(); await fetchLatestProjectReports();
        } catch (e: any) { handleApiError(e); } finally { setConfirmationLoading(false); }
    };

    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: DisplayReportType) => { setAnchorEl(event.currentTarget); setSelectedRowForMenu(row); };
    const handleCloseMenu = () => { setAnchorEl(null); setSelectedRowForMenu(null); };
    const handleEditTutanakFromMenu = () => { if (selectedRowForMenu) { handleCloseMenu(); handleOpenModal(selectedRowForMenu); } };
    const handleDownloadFromMenu = () => { if (selectedRowForMenu) { handleCloseMenu(); handleOpenSingleDownloadModal(selectedRowForMenu); } };
    const handleOpenModal = (report: DisplayReportType) => { setSelectedReportToConfirm(report); setOpenConfirmationModal(true); };
    const handleCloseModal = () => { setOpenConfirmationModal(false); setSelectedReportToConfirm(null); setConfirmationLoading(false); };
    const handleOpenMembersModal = (confirmationId: string) => { setSelectedConfirmationId(confirmationId); setOpenMembersModal(true); };
    const handleCloseMembersModal = () => { setOpenMembersModal(false); setSelectedConfirmationId(null); fetchLatestProjectReports(); };
    const handleOpenAnswerModal = (confirmationId: string) => { setSelectedAnswerConfirmationId(confirmationId); setOpenAnswerModal(true); };
    const handleCloseAnswerModal = () => { setOpenAnswerModal(false); setSelectedAnswerConfirmationId(null); fetchLatestProjectReports(); };

    useEffect(() => { fetchConfirmationData(); }, [fetchConfirmationData]);
    useEffect(() => { fetchLatestProjectReports(); }, [fetchLatestProjectReports]);
    useEffect(() => { let timer: NodeJS.Timeout; if (alertMessage) { timer = setTimeout(() => { clearAlert(); }, 5000); } return () => { clearTimeout(timer); }; }, [alertMessage]);

    const handleExportExcelDynamic = async (reportType: 'all' | 'confirmed') => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Lütfen giriş yapın.', 'warning'); return; }
        setOpenDownloadModal(false); setDownloadLoading(true); showAlert('Excel dosyası oluşturuluyor, lütfen bekleyin...', 'info');
        try {
            let confirmationReports: any[] = []; let mainReportsData: any[] = []; const memberNameMap: MemberNameMap = {};
            const confirmedResult = await axios.get(server.baseurl + server.report + "get-all-confirmation-project-reports", { headers: { "Authorization": `Bearer ${authToken}` } }); confirmationReports = confirmedResult.data.data || [];
            const membersResult = await axios.get(server.baseurl + server.report + "get-all-commitee-members", { headers: { "Authorization": `Bearer ${authToken}` } }); (membersResult.data.data || []).forEach((m: any) => { memberNameMap[String(m.id)] = { name: m.name, family: m.family, position: m.position }; });
            if (reportType === 'all') { const mainReportsResult = await axios.get(server.baseurl + server.report + "get-latest-project-reports", { headers: { "Authorization": `Bearer ${authToken}` } }); mainReportsData = mainReportsResult.data.data || []; }
            let finalData: any[] = [];
            if (reportType === 'confirmed') {
                finalData = confirmationReports.map(report => ({ ...report, isConfirmed: true, confirmationDetails: report }));
            } else {
                finalData = mainReportsData.map((mainReport: any) => {
                    const confirmationMatch = confirmationReports.find((confReport: any) => isFlexibleMatch(confReport.year, mainReport.year) && isFlexibleMatch(confReport.city, mainReport.city) && isFlexibleMatch(confReport.town, mainReport.town) && isFlexibleMatch(confReport.region, mainReport.region) && isFlexibleMatch(confReport.tesisType, mainReport.tesistype) && isFlexibleMatch(confReport.trAdi, mainReport.tradi) && isFlexibleMatch(confReport.projectCount, mainReport.projectcount));
                    return { ...mainReport, isConfirmed: !!confirmationMatch, confirmationDetails: confirmationMatch || null };
                });
            }
            if (!finalData || finalData.length === 0) { showAlert('Dışa aktarılacak veri bulunamadı.', 'warning'); setDownloadLoading(false); return; }
            let maxGeciciMemberCount = 0; let maxKesinMemberCount = 0;
            finalData.forEach((report) => { const details = report.confirmationDetails; if (details && details.confirmationReportCommiteMembers) { const members: any[] = details.confirmationReportCommiteMembers; const geciciMembers = members.filter((m: any) => m.memberStatus === false); const kesinMembers = members.filter((m: any) => m.memberStatus === true); if (geciciMembers.length > maxGeciciMemberCount) maxGeciciMemberCount = geciciMembers.length; if (kesinMembers.length > maxKesinMemberCount) maxKesinMemberCount = kesinMembers.length; } });

            const getMemberAndAnswerDetails = async (memberRegistrationRecord: any) => {
                let memberName = `ID: ${memberRegistrationRecord.id} (Bilinmiyor)`; let answerText = 'Cevaplanmadı'; let commiteMemberId: string | undefined;
                try { const memberDetailResult = await axios.get(server.baseurl + server.report + `get-confirmation-report-commite-member-by-id/${memberRegistrationRecord.id}`, { headers: { "Authorization": `Bearer ${authToken}` } }); commiteMemberId = memberDetailResult.data.data?.commiteMember?.id; } catch (error) { }
                if (commiteMemberId) { const memberDetails = memberNameMap[String(commiteMemberId)]; if (memberDetails) { memberName = `${memberDetails.name} ${memberDetails.family} (${getPositionText(memberDetails.position)})`; } }
                const latestAnswer = memberRegistrationRecord.confirmationReportCommiteMemberAnswers?.[0]; if (latestAnswer) { answerText = getCommiteAnswerText(Number(latestAnswer.answer)); }
                return { memberName, answerText };
            };

            const workbook = new Excel.Workbook(); const sheetName = reportType === 'confirmed' ? 'Onaylanan Raporlar' : 'Tüm Proje Raporları'; const worksheet = workbook.addWorksheet(sheetName, { views: [{ rightToLeft: false }] });
            const thinBorder = { style: 'thin', color: { argb: 'FFD3D3D3' } }; const border = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder }; const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; const headerFont = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } }; const font = { name: 'Calibri', size: 11, bold: false, color: { argb: 'FF000000' } }; const centerAlignment = { vertical: 'middle', horizontal: 'center', wrapText: true }; const leftAlignment = { vertical: 'middle', horizontal: 'left', wrapText: true }; const fullHeaderStyle = { border: border, alignment: centerAlignment, font: headerFont, fill: headerFill } as Partial<Excel.Style>; const bodyStyle = { border: border, alignment: leftAlignment, font: font } as Partial<Excel.Style>;
            let tableHeaders = ['Yıl', 'Şehir', 'İlçe', 'Bölge', 'Tesis Türü', 'Tradi', 'Proje Sayısı', 'Geçici Tutanak Teslim Durumu'];
            for (let i = 1; i <= maxGeciciMemberCount; i++) { tableHeaders.push(`Geçici Üye ${i}`); } for (let i = 1; i <= maxGeciciMemberCount; i++) { tableHeaders.push(`Geçici Cevap ${i}`); } tableHeaders.push('Kesin Tutanak Teslim Durumu'); for (let i = 1; i <= maxKesinMemberCount; i++) { tableHeaders.push(`Kesin Üye ${i}`); } for (let i = 1; i <= maxKesinMemberCount; i++) { tableHeaders.push(`Kesin Cevap ${i}`); }
            const titleText = reportType === 'confirmed' ? 'Onaylanan Proje Raporları Detaylı Rapor' : 'Tüm Proje Raporları Özet Rapor'; const titleRow = worksheet.addRow([titleText]); if (titleRow) { titleRow.font = { name: 'Times New Roman', size: 12, bold: true }; titleRow.getCell(1).alignment = { horizontal: 'center' }; worksheet.mergeCells(`A${titleRow.number}:${String.fromCharCode(65 + tableHeaders.length - 1)}${titleRow.number}`); } worksheet.addRow([`Tarih: ${formatDateDisplay(new Date().toISOString())}`]); worksheet.addRow([]);
            const headerRow = worksheet.addRow(tableHeaders); headerRow.eachCell(cell => { cell.style = fullHeaderStyle; });

            const rowPromises = finalData.map(async (report) => {
                const confirmedDetails = report.confirmationDetails; const isConfirmed = !!confirmedDetails;
                let rowData: (string | number | null)[] = [report.year, report.city, report.town || '-', report.region || '-', getTesisTypeText(report.tesistype || report.tesistype), report.trAdi || report.tradi || '-', report.projectCount || report.projectcount,];
                const allMembers: any[] = confirmedDetails?.confirmationReportCommiteMembers || []; const geciciMembers = allMembers.filter((m: any) => m.memberStatus === false); const kesinMembers = allMembers.filter((m: any) => m.memberStatus === true);
                const geciciDurum = isConfirmed && confirmedDetails.Gecici_tutanak_teslim_alma_durumu ? 'Arşivde' : ''; rowData.push(geciciDurum);
                const geciciDetails = await Promise.all(geciciMembers.map(getMemberAndAnswerDetails)); const geciciMemberNames = geciciDetails.map(d => d.memberName); const geciciAnswers = geciciDetails.map(d => d.answerText);
                rowData.push(...geciciMemberNames); for (let i = 0; i < maxGeciciMemberCount - geciciMemberNames.length; i++) { rowData.push(''); } rowData.push(...geciciAnswers); for (let i = 0; i < maxGeciciMemberCount - geciciAnswers.length; i++) { rowData.push(''); }
                const kesinDurum = isConfirmed && confirmedDetails.Kesin_tutanak_teslim_alma_durumu ? 'Arşivde' : ''; rowData.push(kesinDurum);
                const kesinDetails = await Promise.all(kesinMembers.map(getMemberAndAnswerDetails)); const kesinMemberNames = kesinDetails.map(d => d.memberName); const kesinAnswers = kesinDetails.map(d => d.answerText);
                rowData.push(...kesinMemberNames); for (let i = 0; i < maxKesinMemberCount - kesinMemberNames.length; i++) { rowData.push(''); } rowData.push(...kesinAnswers); for (let i = 0; i < maxKesinMemberCount - kesinAnswers.length; i++) { rowData.push(''); }
                return rowData;
            });
            const allRowData = await Promise.all(rowPromises); allRowData.forEach((rowData) => { const row = worksheet.addRow(rowData); row.eachCell(cell => { cell.style = bodyStyle; }); });
            worksheet.columns.forEach((column) => { let maxLength = 0; if (column.eachCell) { column.eachCell({ includeEmpty: true }, (cell) => { const columnLength = cell.value ? String(cell.value).length : 10; if (columnLength > maxLength) { maxLength = columnLength; } }); } column.width = Math.min(Math.max(maxLength + 2, 12), 50); });
            const buffer = await workbook.xlsx.writeBuffer(); const fileName = `${sheetName.replace(/\s/g, '_')}_${format(new Date(), 'yyyyMMdd')}.xlsx`; saveAs(new Blob([buffer]), fileName); showAlert('Excel başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (e: any) { handleApiError(e); } finally { setDownloadLoading(false); }
    };

    const handleExportPdfDetailConsolidated = async () => {
        const authToken = localStorage.getItem('authToken'); if (!authToken) { showAlert('Lütfen giriş yapın.', 'warning'); return; } setOpenDownloadModal(false); setDownloadLoading(true); showAlert('PDF raporu oluşturuluyor, lütfen bekleyin (Bu işlem uzun sürebilir)...', 'info');
        try {
            let confirmationReports: any[] = []; let mainReportsData: any[] = []; const memberNameMap: MemberNameMap = {};
            const confirmedResult = await axios.get(server.baseurl + server.report + "get-all-confirmation-project-reports", { headers: { "Authorization": `Bearer ${authToken}` } }); confirmationReports = confirmedResult.data.data || [];
            const membersResult = await axios.get(server.baseurl + server.report + "get-all-commitee-members", { headers: { "Authorization": `Bearer ${authToken}` } }); (membersResult.data.data || []).forEach((m: any) => { memberNameMap[String(m.id)] = { name: m.name, family: m.family, position: m.position }; });
            const mainReportsResult = await axios.get(server.baseurl + server.report + "get-latest-project-reports", { headers: { "Authorization": `Bearer ${authToken}` } }); mainReportsData = mainReportsResult.data.data || [];
            let finalData: any[] = mainReportsData.map((mainReport: any) => {
                const confirmationMatch = confirmationReports.find((confReport: any) => isFlexibleMatch(confReport.year, mainReport.year) && isFlexibleMatch(confReport.city, mainReport.city) && isFlexibleMatch(confReport.town, mainReport.town) && isFlexibleMatch(confReport.region, mainReport.region) && isFlexibleMatch(confReport.tesisType, mainReport.tesistype) && isFlexibleMatch(confReport.trAdi, mainReport.tradi) && isFlexibleMatch(confReport.projectCount, mainReport.projectcount));
                return { ...mainReport, isConfirmed: !!confirmationMatch, confirmationDetails: confirmationMatch || null };
            });
            finalData = finalData.filter(report => report.isConfirmed);
            if (!finalData || finalData.length === 0) { showAlert('PDF oluşturulacak onaylanmış veri bulunamadı.', 'warning'); setDownloadLoading(false); return; }
            let maxGeciciMemberCount = 0; let maxKesinMemberCount = 0;
            finalData.forEach((report) => { const details = report.confirmationDetails; if (details && details.confirmationReportCommiteMembers) { const members: any[] = details.confirmationReportCommiteMembers; const geciciMembers = members.filter((m: any) => m.memberStatus === false); const kesinMembers = members.filter((m: any) => m.memberStatus === true); if (geciciMembers.length > maxGeciciMemberCount) maxGeciciMemberCount = geciciMembers.length; if (kesinMembers.length > maxKesinMemberCount) maxKesinMemberCount = kesinMembers.length; } });
            const getMemberAndAnswerDetails = async (memberRegistrationRecord: any) => {
                let memberName = `ID: ${memberRegistrationRecord.id} (Bilinmiyor)`; let answerText = 'Cevaplanmadı'; let commiteMemberId: string | undefined;
                try { const memberDetailResult = await axios.get(server.baseurl + server.report + `get-confirmation-report-commite-member-by-id/${memberRegistrationRecord.id}`, { headers: { "Authorization": `Bearer ${authToken}` } }); commiteMemberId = memberDetailResult.data.data?.commiteMember?.id; } catch (error) { }
                if (commiteMemberId) { const memberDetails = memberNameMap[String(commiteMemberId)]; if (memberDetails) { memberName = `${memberDetails.name} ${memberDetails.family} (${getPositionText(memberDetails.position)})`; } }
                const latestAnswer = memberRegistrationRecord.confirmationReportCommiteMemberAnswers?.[0]; if (latestAnswer) { answerText = getCommiteAnswerText(Number(latestAnswer.answer)); }
                return { memberName, answerText };
            };
            const doc = new jsPDF('landscape', 'pt', 'a4'); (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular); (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal"); doc.setFont("NotoSans", "normal");
            let tableHeaders = ['Yıl', 'Şehir', 'İlçe', 'Bölge', 'Tesis Türü', 'Tradi', 'Proje Sayısı',]; tableHeaders.push('Geçici Tutanak Teslim Durumu'); for (let i = 1; i <= maxGeciciMemberCount; i++) { tableHeaders.push(`Geçici Üye ${i}`); } for (let i = 1; i <= maxGeciciMemberCount; i++) { tableHeaders.push(`Geçici Cevap ${i}`); } tableHeaders.push('Kesin Tutanak Teslim Durumu'); for (let i = 1; i <= maxKesinMemberCount; i++) { tableHeaders.push(`Kesin Üye ${i}`); } for (let i = 1; i <= maxKesinMemberCount; i++) { tableHeaders.push(`Kesin Cevap ${i}`); }
            const rowPromises = finalData.map(async (report) => {
                const confirmedDetails = report.confirmationDetails; const isConfirmed = !!confirmedDetails;
                let rowData: (string | number | null)[] = [report.year, report.city, report.town || '-', report.region || '-', getTesisTypeText(report.tesistype || report.tesistype), report.trAdi || report.tradi || '-', report.projectCount || report.projectcount,];
                const allMembers: any[] = confirmedDetails?.confirmationReportCommiteMembers || []; const geciciMembers = allMembers.filter((m: any) => m.memberStatus === false); const kesinMembers = allMembers.filter((m: any) => m.memberStatus === true);
                const geciciDetails = await Promise.all(geciciMembers.map(getMemberAndAnswerDetails)); const geciciMemberNames = geciciDetails.map(d => d.memberName); const geciciAnswers = geciciDetails.map(d => d.answerText);
                const geciciDurum = isConfirmed && confirmedDetails.Gecici_tutanak_teslim_alma_durumu ? 'Arşivde' : ''; rowData.push(geciciDurum); rowData.push(...geciciMemberNames); for (let i = 0; i < maxGeciciMemberCount - geciciMemberNames.length; i++) { rowData.push(''); } rowData.push(...geciciAnswers); for (let i = 0; i < maxGeciciMemberCount - geciciAnswers.length; i++) { rowData.push(''); }
                const kesinDurum = isConfirmed && confirmedDetails.Kesin_tutanak_teslim_alma_durumu ? 'Arşivde' : ''; rowData.push(kesinDurum);
                const kesinDetails = await Promise.all(kesinMembers.map(getMemberAndAnswerDetails)); const kesinMemberNames = kesinDetails.map(d => d.memberName); const kesinAnswers = kesinDetails.map(d => d.answerText);
                rowData.push(...kesinMemberNames); for (let i = 0; i < maxKesinMemberCount - kesinMemberNames.length; i++) { rowData.push(''); } rowData.push(...kesinAnswers); for (let i = 0; i < maxKesinMemberCount - kesinAnswers.length; i++) { rowData.push(''); }
                return rowData;
            });
            const allRowData = await Promise.all(rowPromises);
            const topMargin = 70; const sideMargin = 20; const bottomMargin = 50;
            autoTable(doc, { startY: topMargin, head: [tableHeaders], body: allRowData, theme: 'grid', styles: { font: 'NotoSans', fontStyle: "normal", fontSize: 6, cellPadding: 3, overflow: 'linebreak' }, headStyles: { fillColor: [149, 147, 125], textColor: [0, 0, 0] }, margin: { top: topMargin, bottom: bottomMargin, left: sideMargin, right: sideMargin }, didDrawPage: (_data: any) => { addPdfHeader(doc, "Onaylanan Proje Raporları Özet Rapor"); addPdfFooter(doc); }, showHead: 'everyPage', });
            doc.save(`Onaylanan_Raporlar_Ozet_${format(new Date(), 'yyyyMMdd')}.pdf`); showAlert('PDF raporu başarıyla oluşturuldu و indiriliyor.', 'success');
        } catch (e: any) { handleApiError(e); } finally { setDownloadLoading(false); }
    };

    const handleExportPdfTable = async () => {
        const authToken = localStorage.getItem('authToken'); if (!authToken) { showAlert('Lütfen giriş yapın.', 'warning'); return; } setOpenDownloadModal(false); setDownloadLoading(true); showAlert('PDF raporu oluşturuluyor, lütfen bekleyin (Bu işlem uzun sürebilir)...', 'info');
        try {
            let confirmationReports: any[] = []; let mainReportsData: any[] = []; const memberNameMap: MemberNameMap = {};
            const doc = new jsPDF('landscape', 'pt', 'a4'); (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular); (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal"); doc.setFont("NotoSans", "normal");
            const confirmedResult = await axios.get(server.baseurl + server.report + "get-all-confirmation-project-reports", { headers: { "Authorization": `Bearer ${authToken}` } }); confirmationReports = confirmedResult.data.data || [];
            const membersResult = await axios.get(server.baseurl + server.report + "get-all-commitee-members", { headers: { "Authorization": `Bearer ${authToken}` } }); (membersResult.data.data || []).forEach((m: any) => { memberNameMap[String(m.id)] = { name: m.name, family: m.family, position: m.position }; });
            const mainReportsResult = await axios.get(server.baseurl + server.report + "get-latest-project-reports", { headers: { "Authorization": `Bearer ${authToken}` } }); mainReportsData = mainReportsResult.data.data || [];
            let finalData: any[] = mainReportsData.map((mainReport: any) => {
                const confirmationMatch = confirmationReports.find((confReport: any) => isFlexibleMatch(confReport.year, mainReport.year) && isFlexibleMatch(confReport.city, mainReport.city) && isFlexibleMatch(confReport.town, mainReport.town) && isFlexibleMatch(confReport.region, mainReport.region) && isFlexibleMatch(confReport.tesisType, mainReport.tesistype) && isFlexibleMatch(confReport.trAdi, mainReport.tradi) && isFlexibleMatch(confReport.projectCount, mainReport.projectcount));
                return { ...mainReport, isConfirmed: !!confirmationMatch, confirmationDetails: confirmationMatch || null };
            });
            if (!finalData || finalData.length === 0) { showAlert('PDF oluşturulacak veri bulunamadı.', 'warning'); setDownloadLoading(false); return; }
            let maxGeciciMemberCount = 0; let maxKesinMemberCount = 0;
            finalData.forEach((report) => { const details = report.confirmationDetails; if (details && details.confirmationReportCommiteMembers) { const members: any[] = details.confirmationReportCommiteMembers; const geciciMembers = members.filter((m: any) => m.memberStatus === false); const kesinMembers = members.filter((m: any) => m.memberStatus === true); if (geciciMembers.length > maxGeciciMemberCount) maxGeciciMemberCount = geciciMembers.length; if (kesinMembers.length > maxKesinMemberCount) maxKesinMemberCount = kesinMembers.length; } });
            const getMemberAndAnswerDetails = async (memberRegistrationRecord: any) => {
                let memberName = `ID: ${memberRegistrationRecord.id} (Bilinmiyor)`; let answerText = 'Cevaplanmadı'; let commiteMemberId: string | undefined;
                try { const memberDetailResult = await axios.get(server.baseurl + server.report + `get-confirmation-report-commite-member-by-id/${memberRegistrationRecord.id}`, { headers: { "Authorization": `Bearer ${authToken}` } }); commiteMemberId = memberDetailResult.data.data?.commiteMember?.id; } catch (error) { }
                if (commiteMemberId) { const memberDetails = memberNameMap[String(commiteMemberId)]; if (memberDetails) { memberName = `${memberDetails.name} ${memberDetails.family} (${getPositionText(memberDetails.position)})`; } }
                const latestAnswer = memberRegistrationRecord.confirmationReportCommiteMemberAnswers?.[0]; if (latestAnswer) { answerText = getCommiteAnswerText(Number(latestAnswer.answer)); }
                return { memberName, answerText };
            };
            let tableHeaders = ['Yıl', 'Şehir', 'İlçe', 'Bölge', 'Tesis Türü', 'Tradi', 'Proje Sayısı',]; tableHeaders.push('Geçici Tutanak Teslim Durumu'); for (let i = 1; i <= maxGeciciMemberCount; i++) { tableHeaders.push(`Geçici Üye ${i}`); } for (let i = 1; i <= maxGeciciMemberCount; i++) { tableHeaders.push(`Geçici Cevap ${i}`); } tableHeaders.push('Kesin Tutanak Teslim Durumu'); for (let i = 1; i <= maxKesinMemberCount; i++) { tableHeaders.push(`Kesin Üye ${i}`); } for (let i = 1; i <= maxKesinMemberCount; i++) { tableHeaders.push(`Kesin Cevap ${i}`); }
            const rowPromises = finalData.map(async (report) => {
                const confirmedDetails = report.confirmationDetails; const isConfirmed = !!confirmedDetails;
                let rowData: (string | number | null)[] = [report.year, report.city, report.town || '-', report.region || '-', getTesisTypeText(report.tesistype || report.tesistype), report.trAdi || report.tradi || '-', report.projectCount || report.projectcount,];
                const allMembers: any[] = confirmedDetails?.confirmationReportCommiteMembers || []; const geciciMembers = allMembers.filter((m: any) => m.memberStatus === false); const kesinMembers = allMembers.filter((m: any) => m.memberStatus === true);
                const geciciDetails = await Promise.all(geciciMembers.map(getMemberAndAnswerDetails)); const geciciMemberNames = geciciDetails.map(d => d.memberName); const geciciAnswers = geciciDetails.map(d => d.answerText);
                const geciciDurum = isConfirmed && confirmedDetails.Gecici_tutanak_teslim_alma_durumu ? 'Arşivde' : ''; rowData.push(geciciDurum); rowData.push(...geciciMemberNames); for (let i = 0; i < maxGeciciMemberCount - geciciMemberNames.length; i++) { rowData.push(''); } rowData.push(...geciciAnswers); for (let i = 0; i < maxGeciciMemberCount - geciciAnswers.length; i++) { rowData.push(''); }
                const kesinDurum = isConfirmed && confirmedDetails.Kesin_tutanak_teslim_alma_durumu ? 'Arşivde' : ''; rowData.push(kesinDurum);
                const kesinDetails = await Promise.all(kesinMembers.map(getMemberAndAnswerDetails)); const kesinMemberNames = kesinDetails.map(d => d.memberName); const kesinAnswers = kesinDetails.map(d => d.answerText);
                rowData.push(...kesinMemberNames); for (let i = 0; i < maxKesinMemberCount - kesinMemberNames.length; i++) { rowData.push(''); } rowData.push(...kesinAnswers); for (let i = 0; i < maxKesinMemberCount - kesinAnswers.length; i++) { rowData.push(''); }
                return rowData;
            });
            const allRowData = await Promise.all(rowPromises);
            const topMargin = 70; const sideMargin = 20; const bottomMargin = 50;
            autoTable(doc, { startY: topMargin, head: [tableHeaders], body: allRowData, theme: 'grid', styles: { font: 'NotoSans', fontStyle: "normal", fontSize: 6, cellPadding: 3, overflow: 'linebreak' }, headStyles: { fillColor: [149, 147, 125], textColor: [0, 0, 0] }, margin: { top: topMargin, bottom: bottomMargin, left: sideMargin, right: sideMargin }, didDrawPage: (_data: any) => { addPdfHeader(doc, "Tüm Proje Raporları Özet Rapor"); addPdfFooter(doc); }, showHead: 'everyPage', });
            doc.save(`Tüm_Proje_Raporları_Ozet_${format(new Date(), 'yyyyMMdd')}.pdf`); showAlert('PDF raporu başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (e: any) { handleApiError(e); } finally { setDownloadLoading(false); }
    };

    const handleExportExcelSingle = async (report: DisplayReportType) => {
        const authToken = localStorage.getItem('authToken'); if (!authToken || !report.confirmationId) { showAlert('Rapor kimliği eksik.', 'warning'); return; } handleCloseSingleDownloadModal(); setDownloadLoading(true); showAlert('Excel dosyası oluşturuluyor, lütfen bekleyin...', 'info');
        try {
            let memberDetailsResult = await axios.get(server.baseurl + server.report + `get-confirmation-report-commite-member/${report.confirmationId}`, { headers: { "Authorization": `Bearer ${authToken}` } }); const registeredMembers = memberDetailsResult.data.data || []; const reportTitle = `${report.year} / ${report.city} / ${getTesisTypeText(report.tesistype)}`;
            const membersResult = await axios.get(server.baseurl + server.report + "get-all-commitee-members", { headers: { "Authorization": `Bearer ${authToken}` } }); const memberNameMap: MemberNameMap = {}; (membersResult.data.data || []).forEach((m: any) => { memberNameMap[String(m.id)] = { name: m.name, family: m.family, position: m.position }; });
            const confirmedDetails = confirmationData.find(conf => conf.id === report.confirmationId) || null; if (!confirmedDetails) { showAlert('Onaylanmış rapor detayı bulunamadı.', 'error'); setDownloadLoading(false); return; } confirmedDetails.confirmationReportCommiteMembers = registeredMembers; const finalData = [{ ...report, isConfirmed: true, confirmationDetails: confirmedDetails }];
            const allMembers: any[] = confirmedDetails.confirmationReportCommiteMembers || []; const maxGeciciMemberCount = allMembers.filter((m: any) => m.memberStatus === false).length; const maxKesinMemberCount = allMembers.filter((m: any) => m.memberStatus === true).length;
            const getMemberAndAnswerDetails = async (memberRegistrationRecord: any) => {
                let memberName = `ID: ${memberRegistrationRecord.id} (Bilinmiyor)`; let answerText = 'Cevaplanmadı'; let commiteMemberId: string | undefined;
                try { const memberDetailResult = await axios.get(server.baseurl + server.report + `get-confirmation-report-commite-member-by-id/${memberRegistrationRecord.id}`, { headers: { "Authorization": `Bearer ${authToken}` } }); commiteMemberId = memberDetailResult.data.data?.commiteMember?.id; } catch (error) { }
                if (commiteMemberId) { const memberDetails = memberNameMap[String(commiteMemberId)]; if (memberDetails) { memberName = `${memberDetails.name} ${memberDetails.family} (${getPositionText(memberDetails.position)})`; } }
                const latestAnswer = memberRegistrationRecord.confirmationReportCommiteMemberAnswers?.[0]; if (latestAnswer) { answerText = getCommiteAnswerText(Number(latestAnswer.answer)); }
                return { memberName, answerText };
            };
            const workbook = new Excel.Workbook(); const sheetName = 'Tekil Proje Raporu Detay'; const worksheet = workbook.addWorksheet(sheetName, { views: [{ rightToLeft: false }] });
            const thinBorder = { style: 'thin', color: { argb: 'FFD3D3D3' } }; const border = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder }; const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; const headerFont = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } }; const font = { name: 'Calibri', size: 11, bold: false, color: { argb: 'FF000000' } }; const centerAlignment = { vertical: 'middle', horizontal: 'center', wrapText: true }; const leftAlignment = { vertical: 'middle', horizontal: 'left', wrapText: true }; const fullHeaderStyle = { border: border, alignment: centerAlignment, font: headerFont, fill: headerFill } as Partial<Excel.Style>; const bodyStyle = { border: border, alignment: leftAlignment, font: font } as Partial<Excel.Style>;
            let tableHeaders = ['Yıl', 'Şehir', 'İlçe', 'Bölge', 'Tesis Türü', 'Tradi', 'Proje Sayısı', 'Geçici Tutanak Teslim Durumu']; for (let i = 1; i <= maxGeciciMemberCount; i++) { tableHeaders.push(`Geçici Üye ${i}`); } for (let i = 1; i <= maxGeciciMemberCount; i++) { tableHeaders.push(`Geçici Cevap ${i}`); } tableHeaders.push('Kesin Tutanak Teslim Durumu'); for (let i = 1; i <= maxKesinMemberCount; i++) { tableHeaders.push(`Kesin Üye ${i}`); } for (let i = 1; i <= maxKesinMemberCount; i++) { tableHeaders.push(`Kesin Cevap ${i}`); }
            const titleText = `${reportTitle} Detaylı Rapor`; const titleRow = worksheet.addRow([titleText]); if (titleRow) { titleRow.font = { name: 'Times New Roman', size: 12, bold: true }; titleRow.getCell(1).alignment = { horizontal: 'center' }; worksheet.mergeCells(`A${titleRow.number}:${String.fromCharCode(65 + tableHeaders.length - 1)}${titleRow.number}`); } worksheet.addRow([`Tarih: ${formatDateDisplay(new Date().toISOString())}`]); worksheet.addRow([]);
            const headerRow = worksheet.addRow(tableHeaders); headerRow.eachCell(cell => { cell.style = fullHeaderStyle; });
            const singleReport = finalData[0]; let rowData: (string | number | null)[] = [singleReport.year, singleReport.city, singleReport.town || '-', singleReport.region || '-', getTesisTypeText(singleReport.tesistype), singleReport.tradi || '-', singleReport.projectcount,];
            const allMembersData: any[] = singleReport.confirmationDetails?.confirmationReportCommiteMembers || []; const geciciMembers = allMembersData.filter((m: any) => m.memberStatus === false); const kesinMembers = allMembersData.filter((m: any) => m.memberStatus === true);
            const geciciDurum = confirmedDetails.Gecici_tutanak_teslim_alma_durumu ? 'Arşivde' : ''; rowData.push(geciciDurum);
            const geciciDetails = await Promise.all(geciciMembers.map(getMemberAndAnswerDetails)); const geciciMemberNames = geciciDetails.map(d => d.memberName); const geciciAnswers = geciciDetails.map(d => d.answerText);
            rowData.push(...geciciMemberNames); for (let i = 0; i < maxGeciciMemberCount - geciciMemberNames.length; i++) { rowData.push(''); } rowData.push(...geciciAnswers); for (let i = 0; i < maxGeciciMemberCount - geciciAnswers.length; i++) { rowData.push(''); }
            const kesinDurum = confirmedDetails.Kesin_tutanak_teslim_alma_durumu ? 'Arşivde' : ''; rowData.push(kesinDurum);
            const kesinDetailsPromises = kesinMembers.map(getMemberAndAnswerDetails); const kesinDetails = await Promise.all(kesinDetailsPromises); const kesinMemberNames = kesinDetails.map(d => d.memberName); const kesinAnswers = kesinDetails.map(d => d.answerText);
            rowData.push(...kesinMemberNames); for (let i = 0; i < maxKesinMemberCount - kesinMemberNames.length; i++) { rowData.push(''); } rowData.push(...kesinAnswers); for (let i = 0; i < maxKesinMemberCount - kesinAnswers.length; i++) { rowData.push(''); }
            const row = worksheet.addRow(rowData); row.eachCell(cell => { cell.style = bodyStyle; });
            worksheet.columns.forEach((column) => { let maxLength = 0; if (column.eachCell) { column.eachCell({ includeEmpty: true }, (cell) => { const columnLength = cell.value ? String(cell.value).length : 10; if (columnLength > maxLength) { maxLength = columnLength; } }); } column.width = Math.min(Math.max(maxLength + 2, 12), 50); });
            const buffer = await workbook.xlsx.writeBuffer(); const fileName = `${sheetName.replace(/\s/g, '_')}_${report.city}_${report.year}_${format(new Date(), 'yyyyMMdd')}.xlsx`; saveAs(new Blob([buffer]), fileName); showAlert('Excel başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (e: any) { handleApiError(e); } finally { setDownloadLoading(false); }
    };

    const handleExportPdfSingle = async (report: DisplayReportType) => {
        const authToken = localStorage.getItem('authToken'); if (!authToken || !report.confirmationId) { showAlert('Rapor kimliği eksik.', 'warning'); return; } handleCloseSingleDownloadModal(); setDownloadLoading(true); showAlert('PDF raporu oluşturuluyor, lütfen bekleyin...', 'info');
        try {
            const doc = new jsPDF('landscape', 'pt', 'a4'); (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular); (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal"); doc.setFont("NotoSans", "normal");
            let memberDetailsResult = await axios.get(server.baseurl + server.report + `get-confirmation-report-commite-member/${report.confirmationId}`, { headers: { "Authorization": `Bearer ${authToken}` } }); const registeredMembers = memberDetailsResult.data.data || [];
            const membersResult = await axios.get(server.baseurl + server.report + "get-all-commitee-members", { headers: { "Authorization": `Bearer ${authToken}` } }); const memberNameMap: MemberNameMap = {}; (membersResult.data.data || []).forEach((m: any) => { memberNameMap[String(m.id)] = { name: m.name, family: m.family, position: m.position }; });
            const confirmedDetails = confirmationData.find(conf => conf.id === report.confirmationId) || null; if (!confirmedDetails) { showAlert('Onaylanmış rapor detayı bulunamadı.', 'error'); setDownloadLoading(false); return; }
            const allMembers: any[] = registeredMembers; const maxGeciciMemberCount = allMembers.filter((m: any) => m.memberStatus === false).length; const maxKesinMemberCount = allMembers.filter((m: any) => m.memberStatus === true).length;
            const getMemberAndAnswerDetails = async (memberRegistrationRecord: any) => {
                let memberName = `ID: ${memberRegistrationRecord.id} (Bilinmiyor)`; let answerText = 'Cevaplanmadı'; let commiteMemberId: string | undefined;
                try { const memberDetailResult = await axios.get(server.baseurl + server.report + `get-confirmation-report-commite-member-by-id/${memberRegistrationRecord.id}`, { headers: { "Authorization": `Bearer ${authToken}` } }); commiteMemberId = memberDetailResult.data.data?.commiteMember?.id; } catch (error) { }
                if (commiteMemberId) { const memberDetails = memberNameMap[String(commiteMemberId)]; if (memberDetails) { memberName = `${memberDetails.name} ${memberDetails.family} (${getPositionText(memberDetails.position)})`; } }
                const latestAnswer = memberRegistrationRecord.confirmationReportCommiteMemberAnswers?.[0]; if (latestAnswer) { answerText = getCommiteAnswerText(Number(latestAnswer.answer)); }
                return { memberName, answerText };
            };
            const geciciMembers = allMembers.filter((m: any) => m.memberStatus === false); const kesinMembers = allMembers.filter((m: any) => m.memberStatus === true);
            let rowData: (string | number | null)[] = [report.year, report.city, report.town || '-', report.region || '-', getTesisTypeText(report.tesistype), report.tradi || '-', report.projectcount,];
            const geciciDetailsPromises = geciciMembers.map(getMemberAndAnswerDetails); const geciciDetails = await Promise.all(geciciDetailsPromises); const geciciMemberNames = geciciDetails.map(d => d.memberName); const geciciAnswers = geciciDetails.map(d => d.answerText);
            const geciciDurum = confirmedDetails.Gecici_tutanak_teslim_alma_durumu ? 'Arşivde' : ''; rowData.push(geciciDurum); rowData.push(...geciciMemberNames); for (let i = 0; i < maxGeciciMemberCount - geciciMemberNames.length; i++) { rowData.push(''); } rowData.push(...geciciAnswers); for (let i = 0; i < maxGeciciMemberCount - geciciAnswers.length; i++) { rowData.push(''); }
            const kesinDurum = confirmedDetails.Kesin_tutanak_teslim_alma_durumu ? 'Arşivde' : ''; rowData.push(kesinDurum);
            const kesinDetailsPromises = kesinMembers.map(getMemberAndAnswerDetails); const kesinDetails = await Promise.all(kesinDetailsPromises); const kesinMemberNames = kesinDetails.map(d => d.memberName); const kesinAnswers = kesinDetails.map(d => d.answerText);
            rowData.push(...kesinMemberNames); for (let i = 0; i < maxKesinMemberCount - kesinMemberNames.length; i++) { rowData.push(''); } rowData.push(...kesinAnswers); for (let i = 0; i < maxKesinMemberCount - kesinAnswers.length; i++) { rowData.push(''); }
            let tableHeaders = ['Yıl', 'Şehir', 'İlçe', 'Bölge', 'Tesis Türü', 'Tradi', 'Proje Sayısı',]; tableHeaders.push('Geçici Tutanak Teslim Durumu'); for (let i = 1; i <= maxGeciciMemberCount; i++) { tableHeaders.push(`Geçici Üye ${i}`); } for (let i = 1; i <= maxGeciciMemberCount; i++) { tableHeaders.push(`Geçici Cevap ${i}`); } tableHeaders.push('Kesin Tutanak Teslim Durumu'); for (let i = 1; i <= maxKesinMemberCount; i++) { tableHeaders.push(`Kesin Üye ${i}`); } for (let i = 1; i <= maxKesinMemberCount; i++) { tableHeaders.push(`Kesin Cevap ${i}`); }
            const topMargin = 70; const sideMargin = 20; const bottomMargin = 50;
            autoTable(doc, { startY: topMargin, head: [tableHeaders], body: [rowData], theme: 'grid', styles: { font: 'NotoSans', fontStyle: "normal", fontSize: 6, cellPadding: 3, overflow: 'linebreak' }, headStyles: { fillColor: [149, 147, 125], textColor: [0, 0, 0] }, margin: { top: topMargin, bottom: bottomMargin, left: sideMargin, right: sideMargin }, didDrawPage: (_data: any) => { addPdfHeader(doc, `${report.city} / ${report.year} Projesi Detay Raporu`); addPdfFooter(doc); }, showHead: 'everyPage', });
            doc.save(`Rapor_${report.city}_${report.year}_${format(new Date(), 'yyyyMMdd')}.pdf`); showAlert('PDF raporu başarıyla oluşturuldu و indiriliyor.', 'success');
        } catch (e: any) { handleApiError(e); } finally { setDownloadLoading(false); }
    };

    const headers = [
        { label: 'Yıl', key: 'year' },
        { label: 'Şehir', key: 'city' },
        { label: 'İlçe', key: 'town' },
        { label: 'Bölge', key: 'region' },
        { label: 'Tesis', key: 'tesistype' },
        { label: 'TrAdi', key: 'tradi' },
        { label: 'Proje', key: 'projectcount' },
        // 👇 اینجا width اضافه شد
        { label: 'Komite Üyeleri', key: 'memberCount' },
        { label: 'Üye Cevabı', key: 'memberAnswer' },
        { label: '', key: 'actions' },
    ];
    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
                <Typography variant="h4">Proje Raporları Özeti</Typography>
                <Button variant="contained" color="primary" onClick={() => setOpenDownloadModal(true)} startIcon={<IconFileDownload />}>Rapor İndir</Button>
            </Stack>
            {alertMessage && (<Stack sx={{ width: '100%', mb: 3 }} spacing={2}><Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert></Stack>)}
            <BlankCard>
                <TableContainer sx={{ overflowX: 'auto' }}>
                    <Table aria-label="project report table">
                        <TableHead style={{ background: "rgb(149 147 125 / 65%)" }}>
                            <TableRow>
                                {headers.map((header) => (
                                    <StyledTableCell
                                        key={header.key}
                                    >
                                        <Typography variant="h6" fontWeight="bold">{header.label}</Typography>
                                    </StyledTableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loadingData ? (
                                <TableRow><StyledTableCell colSpan={headers.length} align="center"><CircularProgress sx={{ mb: 2 }} /><Typography variant="subtitle1" color="textSecondary">Rapor verileri yükleniyor...</Typography></StyledTableCell></TableRow>
                            ) : reportData.length > 0 ? (
                                reportData.map((row, index) => {
                                    const isRowLoading = selectedReportToConfirm && selectedReportToConfirm.year === row.year && selectedReportToConfirm.city === row.city && confirmationLoading;
                                    return (
                                        <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            <StyledTableCell><Typography variant="body1">{row.year}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{row.city}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{row.town || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{row.region || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1" fontWeight="bold">{getTesisTypeText(row.tesistype)}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{row.tradi || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1" color="primary" fontWeight="bold">{row.projectcount}</Typography></StyledTableCell>
                                            <StyledTableCell>
                                                {row.isConfirmed && row.confirmationId ? (<Button variant="outlined" color="primary" size="small" onClick={() => handleOpenMembersModal(row.confirmationId!)} startIcon={<IconUsers size={20} />}>{row.memberCount}</Button>) : <Button variant="outlined" disabled size="small">0 </Button>}
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    {row.isConfirmed && row.confirmationId && row.memberCount > 0 ? (
                                                        <Button variant="contained" color={row.imzalandiCount === row.memberCount ? "success" : "secondary"} size="small" onClick={() => handleOpenAnswerModal(row.confirmationId!)} startIcon={<IconFileText size={18} />} sx={{ minWidth: 'auto', px: 2 }}>
                                                            {row.imzalandiCount}/{row.memberCount}
                                                        </Button>
                                                    ) : (<Button variant="contained" disabled size="small">Cevap Ver</Button>)}
                                                    {row.isConfirmed && row.confirmationId && (
                                                        <Tooltip title="Cevap Verenleri Gör">
                                                            <IconButton size="small" color="info" onClick={() => handleOpenAnswersListModal(row.confirmationId!)} sx={{ border: '1px solid', borderColor: 'info.main' }}><IconUser size={18} /></IconButton>
                                                        </Tooltip>
                                                    )}
                                                </Stack>
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                {row.isConfirmed ? (
                                                    <Box>
                                                        <Tooltip title="Daha fazla seçenek"><IconButton id={`basic-button-${row.confirmationId}`} aria-controls={openMenu ? 'basic-menu' : undefined} aria-haspopup="true" aria-expanded={openMenu && selectedRowForMenu?.confirmationId === row.confirmationId ? 'true' : undefined} onClick={(event) => handleClickMenu(event, row)} color="info" size="small" disabled={isRowLoading || downloadLoading}>{isRowLoading ? <CircularProgress size={20} color="inherit" /> : <IconDots width={20} />}</IconButton></Tooltip>
                                                        <Menu id="basic-menu" anchorEl={anchorEl} open={openMenu && selectedRowForMenu?.confirmationId === row.confirmationId} onClose={handleCloseMenu} MenuListProps={{ 'aria-labelledby': `basic-button-${row.confirmationId}`, }}>
                                                            <MuiMenuItem onClick={handleEditTutanakFromMenu}><ListItemIcon><IconEdit width={18} /></ListItemIcon>Tutanak Durumunu Düzenle</MuiMenuItem>
                                                            <MuiMenuItem onClick={handleDownloadFromMenu}><ListItemIcon><IconFileDownload width={18} /></ListItemIcon>Raporu İndir (Excel/PDF)</MuiMenuItem>
                                                            <MuiMenuItem onClick={handleViewDetailsFromMenu}><ListItemIcon><IconFileText width={18} /></ListItemIcon>Detayları Görüntüle</MuiMenuItem>
                                                        </Menu>
                                                    </Box>
                                                ) : (<Tooltip title="Raporu Onayla"><Button variant="contained" color="success" size="small" onClick={() => handleConfirmReport(row)} disabled={isRowLoading || false}><IconCheck size={20} /></Button></Tooltip>)}
                                            </StyledTableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (<TableRow><StyledTableCell colSpan={headers.length} align="center"><Typography variant="subtitle1" color="textSecondary">Hiç rapor verisi bulunamadı.</Typography></StyledTableCell></TableRow>)}
                        </TableBody>
                    </Table>
                </TableContainer>
            </BlankCard>

            <ConfirmationModal open={openConfirmationModal} onClose={handleCloseModal} report={selectedReportToConfirm} onConfirm={handleUpdateTutanakStatus} loading={confirmationLoading} />
            <CommiteeMembersModal open={openMembersModal} onClose={handleCloseMembersModal} confirmationId={selectedConfirmationId} refreshData={fetchLatestProjectReports} showAlert={showAlert} />
            <MemberAnswerModal open={openAnswerModal} onClose={handleCloseAnswerModal} confirmationId={selectedAnswerConfirmationId} refreshData={fetchLatestProjectReports} showAlert={showAlert} />
            <AnswersListModal open={openAnswersListModal} onClose={handleCloseAnswersListModal} reportId={selectedReportIdForAnswers} />
            <DownloadRowModal open={openSingleDownloadModal} onClose={handleCloseSingleDownloadModal} report={selectedReportToDownload} onExportExcel={handleExportExcelSingle} onExportPdf={handleExportPdfSingle} loading={downloadLoading} />
            <DetailViewModal open={openDetailViewModal} onClose={handleCloseDetailViewModal} report={selectedReportToDownload} onExportExcel={handleExportExcelSingle} onExportPdf={handleExportPdfSingle} handleOpenMembersModal={handleOpenMembersModal} handleOpenAnswerModal={handleOpenAnswerModal} handleOpenModal={handleOpenModal} showAlert={showAlert} />

            <Dialog open={openDownloadModal} onClose={() => setOpenDownloadModal(false)} fullWidth maxWidth="xs">
                <DialogTitle>Hangi Excel Raporu İndirilsin?</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2}>
                        <Button variant="contained" color="success" startIcon={<IconFileDownload />} onClick={handleExportPdfDetailConsolidated} disabled={downloadLoading}>Onaylanan Raporlar (PDF Detaylı)</Button>
                        <Button variant="contained" color="info" startIcon={<IconFileDownload />} onClick={handleExportPdfTable} disabled={downloadLoading}>Tüm Proje Raporları (PDF Özet)</Button>
                        <Button variant="contained" color="primary" startIcon={<IconFileDownload />} onClick={() => handleExportExcelDynamic('confirmed')} disabled={downloadLoading}>Onaylanan Raporlar (Excel Detaylı)</Button>
                        <Button variant="contained" color="primary" startIcon={<IconFileDownload />} onClick={() => handleExportExcelDynamic('all')} disabled={downloadLoading}>Tüm Proje Raporları (Excel Özet)</Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenDownloadModal(false)} color="secondary" disabled={downloadLoading}>İptal</Button></DialogActions>
            </Dialog>
        </Box>
    );
};

export default ListCommiteeMembersReport;