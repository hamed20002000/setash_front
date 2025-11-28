import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import {
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    CircularProgress
} from '@mui/material';
import axios from 'axios';
import server from '../../../assets/address.json';

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

// تعریف مراحل گزارش برای انتخاب API صحیح
type ReportPhase = 'confirmation' | 'members_link' | 'member_answer';

type Props = {
    openModal: boolean;
    // تغییر نوع به string | null برای سازگاری با IDهای API
    reportIdToDelete: string | null;
    phase: ReportPhase;
    onClose: () => void;
    onDeleteSuccess: () => void;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteCommiteeMembersReport = ({ openModal, reportIdToDelete, phase, onClose, onDeleteSuccess, showAlert }: Props) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(false);
    const { isTooltipGloballyEnabled } = useTooltip();


    // **********************************
    // ** منطق اصلی حذف گزارش بر اساس مرحله (Phase) **
    // **********************************
    const handleDeleteReportItem = async () => {
        if (reportIdToDelete === null) {
            showAlert('Silinecek öğe seçilmedi.', 'warning');
            onClose();
            return;
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            navigate("/");
            return;
        }

        // تعیین API بر اساس مرحله (Phase)
        let endpoint: string;
        let successMessage: string;
        let deleteId: number = Number(reportIdToDelete);

        switch (phase) {
            case 'confirmation':
                // مرحله ۱: حذف گزارش تأییدیه پروژه
                endpoint = `${server.initialoperations}delete-confirmation-project-report`;
                successMessage = 'Onay Proje Raporu başarıyla silindi!';
                break;
            case 'members_link':
                // مرحله ۲: حذف عضو کمیته از گزارش (حذف لینک)
                endpoint = `${server.report}delete-confirmation-report-commite-member`;
                successMessage = 'Komite Üyesi ataması başarıyla kaldırıldı!';
                break;
            case 'member_answer':
                // مرحله ۳: حذف پاسخ عضو کمیته
                endpoint = `${server.report}delete-confirmation-report-commite-member-answer`;
                successMessage = 'Üye cevabı başarıyla silindi!';
                break;
            default:
                showAlert('Geçersiz silme aşaması belirtildi.', 'error');
                onClose();
                return;
        }

        setLoading(true);
        try {
            // توجه: برای delete در Axios با Body (PayLoad) باید از متد DELETE و آبجکت data استفاده شود.
            const response = await axios.delete(
                `${server.baseurl}${endpoint}`,
                {
                    data: { id: deleteId }, // ارسال ID در بدنه درخواست (برای APIهای PUT/DELETE با Payload)
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.httpStatusCode === 200) {
                showAlert(successMessage, 'success');
                onDeleteSuccess();
                onClose();
            } else {
                showAlert(response.data.message || 'Silme işlemi sırasında bir hata oluştu.', 'error');
                onClose();
            }
        } catch (e: any) {
            console.error(`Error deleting item in phase ${phase}:`, e);

            if (e.response && e.response.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez.', 'error');
                onClose();
            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {
                const errorMessage = e.response?.data?.message || 'Beklenmeyen bir hata oluştu, lütfen tekrar deneyin.';
                showAlert(errorMessage, 'error');
                onClose();
            }
        } finally {
            setLoading(false);
        }
    };

    const displayPhase = phase ? phase.toUpperCase() : 'BİLİNMİYOR';
    return (
        <>
            <Dialog
                open={openModal}
                onClose={onClose}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description">
                <DialogTitle id="alert-dialog-title">
                    {`Bu kaydı (${displayPhase}) silmek istediğinizden emin misiniz?`} </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        Eğer silerseniz, geri almanın bir yolu yoktur.
                        Kaydı silmek istediğinizden eminseniz,
                        <span style={{ fontSize: "18px", fontWeight: "bold", color: "#FA896B", margin: "0 5px" }}>Silmek</span> düğmesine tıklayın.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Silme işlemini iptal et" : ""}>
                        <Button onClick={onClose} disabled={loading}>İptal et</Button>
                    </CustomTooltip>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen öğeyi sil" : ""}>
                        <Button
                            color="error"
                            variant="contained"
                            onClick={handleDeleteReportItem}
                            autoFocus
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Beklemek....
                                </>
                            ) : (
                                'Silmek'
                            )}
                        </Button>
                    </CustomTooltip>
                </DialogActions>
            </Dialog>
        </>
    );
}

export default DeleteCommiteeMembersReport;