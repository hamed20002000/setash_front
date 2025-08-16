import React, { useState } from 'react';
import { Box, Typography, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { IconPencil, IconFileSpreadsheet, IconExchange } from '@tabler/icons-react';
import ManualEntryForm from './ManualEntryForm';
import ExcelImportComponent from './ExcelImportComponent';
import CompareComponent from './CompareComponent';

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
        <Box sx={{ p: 3, maxWidth: 1200, margin: 'auto' }}>
            <Typography variant="h4" gutterBottom>
                Satın Alma Siparişi Yönetimi
            </Typography>

            <ToggleButtonGroup
                value={method}
                exclusive
                onChange={handleMethodChange}
                aria-label="data entry method"
                sx={{ mb: 4 }}
            >
                <ToggleButton value="manual">
                    <IconPencil style={{ marginRight: 8 }} /> Manuel Giriş
                </ToggleButton>
                <ToggleButton value="excel">
                    <IconFileSpreadsheet style={{ marginRight: 8 }} /> Excel İçe Aktar
                </ToggleButton>
                <ToggleButton value="compare">
                    <IconExchange style={{ marginRight: 8 }} /> Depo/İhale Karşılaştırması
                </ToggleButton>
            </ToggleButtonGroup>

            {renderContent()}

        </Box>
    );
};

export default ListOrders;