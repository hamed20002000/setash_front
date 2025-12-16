import React, { useState } from 'react';
import { Box, Typography, ToggleButton, ToggleButtonGroup, Stack } from '@mui/material';
import { IconPencil, IconFileSpreadsheet, IconExchange } from '@tabler/icons-react';
import ManualEntryForm from './ManualEntryForm';
import ExcelImportComponent from './ExcelImportComponent';
import CompareComponent from './CompareComponent';

import "./style.css"

const ListOrders = () => {
    const [method, setMethod] = useState('manual');

    const handleMethodChange = (_event: React.MouseEvent<HTMLElement>, newMethod: string | null) => {
        if (newMethod !== null) {
            setMethod(newMethod);
        }
    };

    const renderContent = () => {
        switch (method) {
            case 'manual':
                return <ManualEntryForm />;
            case 'excel':
                return <ExcelImportComponent />;
            case 'compare':
                return <CompareComponent />;
            default:
                return null;
        }
    };

    return (
        <Box sx={{ p: 3, }}>
            <Typography variant="h4" gutterBottom>
                Satın Alma Sipariş Yönetimi
            </Typography>

            <ToggleButtonGroup
                value={method}
                exclusive
                onChange={handleMethodChange}
                aria-label="data entry method"
                sx={{ mb: 4 }}
            >
                <ToggleButton value="manual">
                    <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" spacing={1}>
                        <IconPencil />
                        <Typography>Manuel Giriş</Typography>
                    </Stack>
                </ToggleButton>
                <ToggleButton value="excel">
                    <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" spacing={1}>
                        <IconFileSpreadsheet />
                        <Typography>Excel İçe Aktar</Typography>
                    </Stack>
                </ToggleButton>
                <ToggleButton value="compare">
                    <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" spacing={1}>
                        <IconExchange />
                        <Typography>Depo/İhale Karşılaştırması</Typography>
                    </Stack>
                </ToggleButton>
            </ToggleButtonGroup>

            {renderContent()}

        </Box>
    );
};

export default ListOrders;