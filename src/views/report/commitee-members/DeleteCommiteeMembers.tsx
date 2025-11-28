import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import {
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    CircularProgress // اضافه کردن برای نمایش بارگذاری
} from '@mui/material';
import axios from 'axios';
import server from '../../../assets/address.json'; // فرض بر وجود آدرس سرور

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

type Props = {
    openModal: boolean;
    // تغییر نام props: positionIdToDelete به memberIdToDelete
    memberIdToDelete: number | null;
    onClose: () => void;
    onDeleteSuccess: () => void;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteCommiteeMembers = ({ openModal, memberIdToDelete, onClose, onDeleteSuccess, showAlert }: Props) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(false);
    const { isTooltipGloballyEnabled } = useTooltip();


    // **********************************
    // ** منطق حذف عضو کمیته (Commitee Member) **
    // **********************************
    const handleDeleteCommiteeMember = async () => { // <--- تغییر نام تابع
        if (memberIdToDelete === null) {
            showAlert('Silinecek Komite Üyesi seçilmedi.', 'warning'); // <--- تغییر متن
            onClose();
            return;
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            navigate("/");
            return;
        }

        setLoading(true);
        try {
            const response = await axios.delete(
                // API جدید برای حذف عضو کمیته
                `${server.baseurl}${server.report}delete-commitee-member/${memberIdToDelete}`, // <--- تغییر API
                {
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                    }
                }
            );

            if (response.data.httpStatusCode === 200) {
                showAlert('Komite Üyesi başarıyla silindi!', 'success'); // <--- تغییر متن موفقیت
                onDeleteSuccess();
                onClose();
            } else {
                showAlert(response.data.message || 'Komite Üyesi silinirken bir hata oluştu.', 'error'); // <--- تغییر متن خطا
                onClose();
            }
        } catch (e: any) {
            console.error("Error deleting commitee member:", e);

            if (e.response && e.response.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez.', 'error'); // <--- حفظ متن 500
                onClose();
            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {
                const errorMessage = e.response?.data?.message || 'Komite Üyesi silinirken beklenmeyen bir hata oluştu, lütfen tekrar deneyin.';
                showAlert(errorMessage, 'error');
                onClose();
            }
        } finally {
            setLoading(false);
        }
    };


    return (
        <>
            <Dialog
                open={openModal}
                onClose={onClose}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description">
                <DialogTitle id="alert-dialog-title">
                    {/* تغییر متن عنوان */}
                    {"Bu Komite Üyesini silmek istediğinizden emin misiniz?"}
                </DialogTitle>
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
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen Üyeyi sil" : ""}>
                        <Button
                            color="error"
                            variant="contained"
                            onClick={handleDeleteCommiteeMember} // <--- فراخوانی تابع جدید
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

export default DeleteCommiteeMembers;