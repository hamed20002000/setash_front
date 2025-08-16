import React, { useEffect, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid,
    RadioGroup, FormControlLabel, Radio, FormHelperText,
} from '@mui/material';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';

// تعریف interface جدید با سه فیلد مورد نظر
interface SubscriptionFields {
    owner: string; // نام
    subscriptionNumber: string; // شماره اشتراک
    subscriptionType: string; // نوع اشتراک
}

interface SubscriptionModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (fields: SubscriptionFields) => void;
    initialFields: SubscriptionFields;
}

const subscriptionTypes = ['Su', 'Doğalgaz', 'Elektrik', 'İnternet'];

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
    open, onClose, onSave, initialFields
}) => {
    // تعریف state جدید با سه فیلد
    const [fields, setFields] = useState<SubscriptionFields>({
        owner: '',
        subscriptionNumber: '',
        subscriptionType: '',
    });

    // تعریف state خطاها با سه فیلد
    const [fieldErrors, setFieldErrors] = useState({
        owner: false,
        subscriptionNumber: false,
        subscriptionType: false,
    });

    useEffect(() => {
        if (open) {
            setFields(initialFields);
        }
    }, [open, initialFields]);

    const handleTextChange = (key: keyof SubscriptionFields, value: string) => {
        setFields(prev => ({
            ...prev,
            [key]: value
        }));
        setFieldErrors(prev => ({
            ...prev,
            [key]: false
        }));
    };

    const handleRadioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFields(prev => ({
            ...prev,
            subscriptionType: event.target.value,
        }));
        setFieldErrors(prev => ({
            ...prev,
            subscriptionType: false,
        }));
    };

    const validateForm = () => {
        let isValid = true;
        const newErrors = { ...fieldErrors };

        if (!fields.owner.trim()) {
            newErrors.owner = true;
            isValid = false;
        } else {
            newErrors.owner = false;
        }

        if (!fields.subscriptionNumber.trim()) {
            newErrors.subscriptionNumber = true;
            isValid = false;
        } else {
            newErrors.subscriptionNumber = false;
        }

        if (!fields.subscriptionType.trim()) {
            newErrors.subscriptionType = true;
            isValid = false;
        } else {
            newErrors.subscriptionType = false;
        }

        setFieldErrors(newErrors);
        return isValid;
    };

    const handleSave = () => {
        if (validateForm()) {
            onSave(fields);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Abonelik Bilgilerini Düzenle</DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <CustomFormLabel htmlFor="subscription-owner" required>Abone Sahibi</CustomFormLabel>
                        <CustomTextField
                            id="subscription-owner"
                            placeholder="Adı Soyadı"
                            fullWidth
                            value={fields.owner}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTextChange('owner', e.target.value)}
                            error={fieldErrors.owner}
                            helperText={fieldErrors.owner ? 'Bu alan boş bırakılamaz.' : ''}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <CustomFormLabel htmlFor="subscription-number" required>Abone Numarası</CustomFormLabel>
                        <CustomTextField
                            id="subscription-number"
                            placeholder="Numara"
                            fullWidth
                            value={fields.subscriptionNumber}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTextChange('subscriptionNumber', e.target.value)}
                            error={fieldErrors.subscriptionNumber}
                            helperText={fieldErrors.subscriptionNumber ? 'Bu alan boş bırakılamaz.' : ''}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <CustomFormLabel required>Abone Türü</CustomFormLabel>
                        <RadioGroup
                            row
                            value={fields.subscriptionType}
                            onChange={handleRadioChange}
                        >
                            {subscriptionTypes.map((type) => (
                                <FormControlLabel
                                    key={type}
                                    value={type}
                                    control={<Radio />}
                                    label={type}
                                />
                            ))}
                        </RadioGroup>
                        {fieldErrors.subscriptionType && (
                            <FormHelperText error={true}>Bu alan boş bırakılamaz.</FormHelperText>
                        )}
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