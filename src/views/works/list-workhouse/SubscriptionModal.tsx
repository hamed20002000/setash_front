import React, { useEffect, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid,
    FormGroup, FormControlLabel, Checkbox, FormHelperText, Typography, TextField
} from '@mui/material';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';

// رابط (Interface) اصلاح‌شده
interface Subscription {
    title: string;
    no: string;
    owner: string;
}

// رابط (Interface) اصلاح‌شده برای پراپ‌ها
interface SubscriptionModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (subscriptions: Subscription[]) => void;
    initialSubscriptions: Subscription[];
}

const subscriptionTypes = ['Su', 'Doğalgaz', 'Elektrik', 'İnternet'];

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
    open, onClose, onSave, initialSubscriptions
}) => {
    // وضعیت اصلی برای نگهداری تمام اشتراک‌ها
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

    // وضعیت برای مدیریت خطاهای اعتبارسنجی
    const [fieldErrors, setFieldErrors] = useState<{ [key: string]: { owner?: boolean, no?: boolean } }>({});


    // از initialSubscriptions برای پر کردن اولیه فرم استفاده می‌کنیم
    useEffect(() => {
        if (open) {
            setSubscriptions(initialSubscriptions || []);
            setFieldErrors({});
        }
    }, [open, initialSubscriptions]);

    // تابع برای مدیریت تغییرات چک‌باکس‌ها
    const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const title = event.target.name;
        const isChecked = event.target.checked;

        if (isChecked) {
            // اگر تیک خورد، یک شیء جدید به آرایه اضافه کن
            setSubscriptions(prev => [...prev, { title, no: '', owner: '' }]);

            // خطاهای مربوط به این نوع اشتراک را پاک کن
            // با استفاده از یک کپی از شیء قبلی و حذف کلید مورد نظر
            setFieldErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[title];
                return newErrors;
            });
        } else {
            // اگر تیک برداشته شد، آن شیء را از آرایه حذف کن
            setSubscriptions(prev => prev.filter(sub => sub.title !== title));

            // خطاهای مربوط به این نوع اشتراک را پاک کن
            // با استفاده از یک کپی از شیء قبلی و حذف کلید مورد نظر
            setFieldErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[title];
                return newErrors;
            });
        }
    };
    // تابع برای مدیریت تغییرات فیلدهای owner و no
    const handleInputChange = (title: string, field: 'no' | 'owner', value: string) => {
        setSubscriptions(prev =>
            prev.map(sub =>
                sub.title === title ? { ...sub, [field]: value } : sub
            )
        );
        // اگر فیلد تغییر کرد، خطای آن را پاک کن
        setFieldErrors(prev => ({ ...prev, [title]: { ...prev[title], [field]: false } }));
    };

    // تابع اعتبارسنجی
    const validateForm = () => {
        let isValid = true;
        const newErrors: { [key: string]: { owner?: boolean, no?: boolean } } = {};

        subscriptions.forEach(sub => {
            const subscriptionErrors: { owner?: boolean, no?: boolean } = {};
            if (!sub.owner.trim()) {
                subscriptionErrors.owner = true;
                isValid = false;
            }
            if (!sub.no.trim()) {
                subscriptionErrors.no = true;
                isValid = false;
            }
            if (Object.keys(subscriptionErrors).length > 0) {
                newErrors[sub.title] = subscriptionErrors;
            }
        });

        // اگر هیچ اشتراکی انتخاب نشده باشد
        if (subscriptions.length === 0) {
            newErrors['global'] = { no: true };
            isValid = false;
        }

        setFieldErrors(newErrors);
        return isValid;
    };

    const handleSave = () => {
        if (validateForm()) {
            onSave(subscriptions);
        }
    };

    // تابع کمکی برای بررسی اینکه آیا یک اشتراک انتخاب شده است
    const isChecked = (type: string) => {
        return subscriptions.some(sub => sub.title === type);
    };

    // تابع کمکی برای یافتن شیء اشتراک مربوط به یک نوع خاص
    const getSubscription = (type: string) => {
        return subscriptions.find(sub => sub.title === type);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Abonelik Bilgilerini Düzenle</DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <CustomFormLabel required>Abone Türleri</CustomFormLabel>
                        {subscriptions.length === 0 && fieldErrors['global'] && (
                            <FormHelperText error={true}>
                                Lütfen en az bir abone türü seçin.
                            </FormHelperText>
                        )}
                        <FormGroup>
                            {subscriptionTypes.map((type) => {
                                // بررسی وضعیت چک‌باکس
                                const checkedStatus = isChecked(type);
                                // دریافت شیء مربوطه برای پر کردن فیلدها
                                const subData = getSubscription(type);

                                return (
                                    <Grid container alignItems="center" spacing={2} key={type} sx={{ mb: 2 }}>
                                        {/* ستون اول: چک‌باکس */}
                                        <Grid item xs={12} sm={3}>
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={checkedStatus}
                                                        onChange={handleCheckboxChange}
                                                        name={type}
                                                    />
                                                }
                                                label={<Typography>{type}</Typography>}
                                            />
                                        </Grid>

                                        {/* ستون دوم: فیلد صاحب اشتراک */}
                                        <Grid item xs={12} sm={4.5}>
                                            <TextField
                                                fullWidth
                                                label="Abone Sahibi"
                                                placeholder="Adı Soyadı"
                                                size="small"
                                                disabled={!checkedStatus} // غیرفعال شدن بر اساس وضعیت چک‌باکس
                                                value={subData?.owner || ''}
                                                onChange={(e) => handleInputChange(type, 'owner', e.target.value)}
                                                error={fieldErrors[type]?.owner}
                                                helperText={fieldErrors[type]?.owner ? 'Bu alan boş bırakılamaz.' : ''}
                                            />
                                        </Grid>

                                        {/* ستون سوم: فیلد شماره اشتراک */}
                                        <Grid item xs={12} sm={4.5}>
                                            <TextField
                                                fullWidth
                                                label="Abone Numarası"
                                                placeholder="Abone Numarası"
                                                size="small"
                                                disabled={!checkedStatus} // غیرفعال شدن بر اساس وضعیت چک‌باکس
                                                value={subData?.no || ''}
                                                onChange={(e) => handleInputChange(type, 'no', e.target.value)}
                                                error={fieldErrors[type]?.no}
                                                helperText={fieldErrors[type]?.no ? 'Bu alan boş bırakılamaz.' : ''}
                                            />
                                        </Grid>
                                    </Grid>
                                );
                            })}
                        </FormGroup>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="secondary">İptal</Button>
                <Button onClick={handleSave} color="primary" variant="contained">Kaydet</Button>
            </DialogActions>
        </Dialog>
    );
};

export default SubscriptionModal;