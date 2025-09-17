// src/components/apps/projects/DeleteProject.tsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import {
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
} from '@mui/material';
import axios from 'axios';
import BoltIcon from '@mui/icons-material/Bolt';
import server from '../../../assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

type Props = {
    openModal: boolean;
    projectIdToDelete: number | null;
    projectTitleToDelete: string; // برای نمایش نام پروژه در مودال
    onClose: () => void;
    onDeleteSuccess: () => void;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteProject = ({ openModal, projectIdToDelete, projectTitleToDelete, onClose, onDeleteSuccess, showAlert }: Props) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(false);
    const { isTooltipGloballyEnabled } = useTooltip();

    const handleDeleteProject = async () => {
        if (projectIdToDelete === null) {
            showAlert('Silinecek proje seçilmedi.', 'warning');
            onClose();
            return;
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            console.warn("No auth token found, redirecting to login.");
            navigate("/");
            return;
        }

        setLoading(true);
        try {
            const response = await axios.delete(
                server.baseurl + server.initialoperations + `delete-project/${projectIdToDelete}`,
                {
                    headers: {
                        "Accept": "text/plain",
                        "Authorization": `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.httpStatusCode === 200) {
                showAlert('Proje başarıyla silindi!', 'success');
                onDeleteSuccess();
                onClose();
            } else {
                showAlert(response.data.message || 'Proje silinirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            const errorMessage = e.response?.data?.message || 'Proje silinirken bir hata oluştu, lütfen tekrar deneyin.';
            showAlert(errorMessage, 'error');
            onClose();
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={openModal}
            onClose={onClose}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description">
            <DialogTitle id="alert-dialog-title">
                {"Bu projeyi silmek istediğinizden emin misiniz?"}
            </DialogTitle>
            <DialogContent>
                <DialogContentText id="alert-dialog-description">
                    Eğer silerseniz, geri almanın bir yolu yoktur.
                    "{projectTitleToDelete}" projesini silmek istediğinizden eminseniz,
                    <span style={{ fontSize: "18px", fontWeight: "bold", color: "#FA896B", margin: "0 5px" }}>Silmek</span> düğmesine tıklayın.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <CustomTooltip title={isTooltipGloballyEnabled ? "İşlemi iptal et" : ""}>
                    <Button onClick={onClose} disabled={loading}>İptal et</Button>
                </CustomTooltip>
                <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen projeyi sil" : ""}>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={handleDeleteProject}
                        autoFocus
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Beklemek....
                            </>
                        ) : (
                            'Silmek'
                        )}
                    </Button>
                </CustomTooltip>
            </DialogActions>
        </Dialog>
    );
};

export default DeleteProject;