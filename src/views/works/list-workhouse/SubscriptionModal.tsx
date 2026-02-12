import React, { useEffect, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid,
    FormGroup, FormControlLabel, Checkbox, FormHelperText, Typography, TextField
} from '@mui/material';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';

interface Subscription {
    title: string;
    no: string;
    owner: string;
}

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
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

    const [fieldErrors, setFieldErrors] = useState<{ [key: string]: { owner?: boolean, no?: boolean } }>({});


    useEffect(() => {
        if (open) {
            setSubscriptions(initialSubscriptions || []);
            setFieldErrors({});
        }
    }, [open, initialSubscriptions]);

    const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const title = event.target.name;
        const isChecked = event.target.checked;

        if (isChecked) {
            setSubscriptions(prev => [...prev, { title, no: '', owner: '' }]);

            setFieldErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[title];
                return newErrors;
            });
        } else {
            setSubscriptions(prev => prev.filter(sub => sub.title !== title));

            setFieldErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[title];
                return newErrors;
            });
        }
    };
    const handleInputChange = (title: string, field: 'no' | 'owner', value: string) => {
        setSubscriptions(prev =>
            prev.map(sub =>
                sub.title === title ? { ...sub, [field]: value } : sub
            )
        );
        setFieldErrors(prev => ({ ...prev, [title]: { ...prev[title], [field]: false } }));
    };

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

    const isChecked = (type: string) => {
        return subscriptions.some(sub => sub.title === type);
    };

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
                                const checkedStatus = isChecked(type);
                                const subData = getSubscription(type);

                                return (
                                    <Grid container alignItems="center" spacing={2} key={type} sx={{ mb: 2 }}>
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

                                        <Grid item xs={12} sm={4.5}>
                                            <TextField
                                                fullWidth
                                                label="Abone Sahibi"
                                                placeholder="Adı Soyadı"
                                                size="small"
                                                disabled={!checkedStatus}
                                                value={subData?.owner || ''}
                                                onChange={(e) => handleInputChange(type, 'owner', e.target.value)}
                                                error={fieldErrors[type]?.owner}
                                                helperText={fieldErrors[type]?.owner ? 'Bu alan boş bırakılamaz.' : ''}
                                            />
                                        </Grid>

                                        <Grid item xs={12} sm={4.5}>
                                            <TextField
                                                fullWidth
                                                label="Abone Numarası"
                                                placeholder="Abone Numarası"
                                                size="small"
                                                disabled={!checkedStatus}
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