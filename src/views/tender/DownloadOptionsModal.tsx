import React from 'react';
import {
    Modal, Box, Typography, Button, Stack
} from '@mui/material';
import { IconFileSpreadsheet, IconFileText } from '@tabler/icons-react';
import { CustomTooltip } from 'src/context/TooltipContext';

const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: 4,
    borderRadius: '8px'
};

interface DownloadOptionsModalProps {
    open: boolean;
    onClose: () => void;
    onDownloadExcel: () => void;
    onDownloadPdf: () => void;
    isTooltipGloballyEnabled: boolean;
}

const DownloadOptionsModal: React.FC<DownloadOptionsModalProps> = ({ open, onClose, onDownloadExcel, onDownloadPdf, isTooltipGloballyEnabled }) => {
    return (
        <Modal
            open={open}
            onClose={onClose}
            aria-labelledby="download-options-title"
        >
            <Box sx={style}>
                <Typography id="download-options-title" variant="h6" component="h2" mb={2}>
                    Lütfen indirmek istediğiniz dosyayı seçin
                </Typography>
                <Stack spacing={2}>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Excel dosyasını indirin" : ""}>
                        <Button
                            variant="contained"
                            color="success"
                            fullWidth
                            startIcon={<IconFileSpreadsheet />}
                            onClick={onDownloadExcel}
                        >
                            Excel Dosyasını İndir
                        </Button>
                    </CustomTooltip>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "PDF dosyasını indirin" : ""}>
                        <Button
                            variant="contained"
                            color="primary"
                            fullWidth
                            startIcon={<IconFileText />}
                            onClick={onDownloadPdf}
                        >
                            PDF Dosyasını İndir
                        </Button>
                    </CustomTooltip>
                </Stack>
            </Box>
        </Modal>
    );
};

export default DownloadOptionsModal;