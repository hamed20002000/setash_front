// src/views/tender/DefineWorkModal.tsx
import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Stack,
    Alert,
    CircularProgress,
    Typography
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import axios from "axios";
import server from "../../assets/address.json";
import { useNavigate } from "react-router-dom";
import { format } from 'date-fns';

interface DefineWorkModalProps {
    open: boolean;
    onClose: () => void;
    tenderId: number | null;
    showAlert: (
        message: string,
        severity: "success" | "error" | "warning" | "info"
    ) => void;
    // ✅ تغییر در اینجا: onWorkDefinedSuccess باید workId و tenderId را بپذیرد.
    // این تابع مسئول ناوبری به صفحه بعدی خواهد بود.
    onWorkDefinedSuccess: (workId: number, tenderId: number) => void;
}

const DefineWorkModal: React.FC<DefineWorkModalProps> = ({
    open,
    onClose,
    tenderId,
    showAlert,
    // onWorkDefinedSuccess,
}) => {
    const navigate = useNavigate();
    const [title, setTitle] = useState<string>("");
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [titleError, setTitleError] = useState<boolean>(false);
    const [startDateError, setStartDateError] = useState<boolean>(false);
    const [endDateError, setEndDateError] = useState<boolean>(false);
    const [formError, setFormError] = useState<string | null>(null);

    // Yeni state'ler (New States)
    const [openConfirmationModal, setOpenConfirmationModal] = useState<boolean>(false);
    const [newlyCreatedWorkId, setNewlyCreatedWorkId] = useState<number | null>(null);

    useEffect(() => {
        if (open) {
            setTitle("");
            setStartDate(new Date());
            setEndDate(new Date());
            setTitleError(false);
            setStartDateError(false);
            setEndDateError(false);
            setFormError(null);
            setOpenConfirmationModal(false); // Modalı açtığımızda konfirmasyon modalını kapat
            setNewlyCreatedWorkId(null); // Yeni iş ID'sini sıfırla
        }
    }, [open]);

    const handleSaveWork = async () => {
        let hasError = false;
        if (!title.trim()) {
            setTitleError(true);
            hasError = true;
        } else {
            setTitleError(false);
        }

        if (!startDate) {
            setStartDateError(true);
            hasError = true;
        } else {
            setStartDateError(false);
        }

        if (!endDate) {
            setEndDateError(true);
            hasError = true;
        } else {
            setEndDateError(false);
        }

        if (startDate && endDate && startDate > endDate) {
            setEndDateError(true);
            setFormError("Bitiş tarihi başlangıç tarihinden önce olamaz.");
            hasError = true;
        } else {
            if (!endDateError) setFormError(null);
        }

        if (hasError) {
            showAlert("Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.", "warning");
            return;
        }

        setLoading(true);
        setFormError(null);
        const authToken = localStorage.getItem("authToken");

        if (!authToken) {
            console.warn(
                "Kimlik doğrulama belirteci bulunamadı, giriş sayfasına yönlendiriliyor."
            );
            navigate("/");
            setLoading(false);
            showAlert(
                "Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.",
                "error"
            );
            return;
        }

        const payload = {
            title: title,
            startDate: startDate ? format(startDate, 'yyyy-MM-dd') : null,
            endDate: endDate ? format(endDate, 'yyyy-MM-dd') : null,
            tenderId: Number(tenderId),
        };

        try {
            const response = await axios.post(
                server.baseurl + server.initialoperations + "create-work",
                payload,
                {
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${authToken}`,
                    },
                }
            );

            if (response.data.httpStatusCode === 201) {
                showAlert("İş başarıyla tanımlandı!", "success");
                setNewlyCreatedWorkId(response.data.data.id); // Yeni iş ID'sini kaydet
                setOpenConfirmationModal(true); // Konfirmasyon modalını aç
            } else {
                setFormError(response.data.message || "İş tanımlanırken bir hata oluştu.");
                showAlert(
                    response.data.message || "İş tanımlanırken bir hata oluştu.",
                    "error"
                );
            }
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem("authToken");
                navigate("/");
                showAlert(
                    "Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.",
                    "error"
                );
            } else {
                setFormError(
                    e.response?.data?.message ||
                    "İş tanımlanırken bir hata oluştu, lütfen tekrar deneyin."
                );
                showAlert(
                    e.response?.data?.message ||
                    "İş tanımlanırken bir hata oluştu, lütfen tekrar deneyin.",
                    "error"
                );
            }
        } finally {
            setLoading(false);
        }
    };

    // Konfirmasyon modalı için handler'lar
    const handleConfirmYes = () => {
        if (newlyCreatedWorkId && tenderId) {
            // ✅ حالا به جای رفتن به WorkDetails، به صفحه NetworkList می‌رویم
            // onWorkDefinedSuccess(newlyCreatedWorkId, tenderId); // این خط قبلا ناوبری را انجام می‌داد
            // اکنون مستقیماً با navigate هدایت می‌کنیم
            navigate(`/work/${newlyCreatedWorkId}/networks?tenderId=${tenderId}`);
        }
        setOpenConfirmationModal(false);
        onClose(); // Ana DefineWorkModal'ı kapat
    };

    const handleConfirmNo = () => {
        setOpenConfirmationModal(false);
        onClose(); // Ana DefineWorkModal'ı kapat
    };


    return (
        <>
            <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
                <DialogTitle>Yeni İş Tanımla (İhale ID: {tenderId})</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        <TextField
                            label="İş Başlığı"
                            fullWidth
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value);
                                if (titleError && e.target.value.trim()) {
                                    setTitleError(false);
                                }
                            }}
                            error={titleError}
                            helperText={titleError ? "İş başlığı boş bırakılamaz" : ""}
                        />
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <DatePicker
                                label="Başlangıç Tarihi"
                                value={startDate}
                                onChange={(newValue) => {
                                    setStartDate(newValue);
                                    if (startDateError && newValue) {
                                        setStartDateError(false);
                                    }
                                    if (endDate && newValue && newValue > endDate) {
                                        setEndDateError(true);
                                        setFormError("Bitiş tarihi başlangıç tarihinden önce olamaz.");
                                    } else {
                                        setEndDateError(false);
                                        setFormError(null);
                                    }
                                }}
                                // @ts-ignore: inputFormat için geçici çözüm
                                inputFormat="yyyy/MM/dd"
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        fullWidth
                                        error={startDateError}
                                        helperText={startDateError ? "Başlangıç tarihi boş bırakılamaz" : ""}
                                    />
                                )}
                            />
                            <DatePicker
                                label="Bitiş Tarihi"
                                value={endDate}
                                onChange={(newValue) => {
                                    setEndDate(newValue);
                                    if (endDateError && newValue) {
                                        setEndDateError(false);
                                    }
                                    if (startDate && newValue && newValue < startDate) {
                                        setEndDateError(true);
                                        setFormError("Bitiş tarihi başlangıç tarihinden önce olamaz.");
                                    } else {
                                        setEndDateError(false);
                                        setFormError(null);
                                    }
                                }}
                                // @ts-ignore: inputFormat için geçici çözüm
                                inputFormat="yyyy/MM/dd"
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        fullWidth
                                        error={endDateError}
                                        helperText={
                                            endDateError
                                                ? formError || "Bitiş tarihi boş bırakılamaz"
                                                : ""
                                        }
                                    />
                                )}
                            />
                        </LocalizationProvider>
                        {formError && (
                            <Alert severity="error" sx={{ mt: 2 }}>
                                {formError}
                            </Alert>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} color="secondary" disabled={loading}>
                        İptal
                    </Button>
                    <Button
                        onClick={handleSaveWork}
                        color="success"
                        variant="contained"
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} /> : "Kaydet"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Yeni Konfirmasyon Modalı (New Confirmation Modal) */}
            <Dialog
                open={openConfirmationModal}
                onClose={() => setOpenConfirmationModal(false)} // Dışarı tıklamayla kapanmasını önle
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>İş Kaydedildi</DialogTitle>
                <DialogContent>
                    <Typography>
                        İş başarıyla kaydedildi. Şimdi ağ detaylarını tanımlamak ister misiniz?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleConfirmNo} color="secondary">
                        Hayır
                    </Button>
                    <Button onClick={handleConfirmYes} color="primary" variant="contained">
                        Evet
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default DefineWorkModal;