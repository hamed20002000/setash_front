import React, { useState } from 'react';
import { IconButton, Menu, MenuItem as MuiMenuItem, ListItemIcon } from '@mui/material';
import { IconDots, IconEdit, IconTrash, IconFileDownload } from '@tabler/icons-react';
import { CustomTooltip, useTooltip } from 'src/context/TooltipContext';
import { MaterialRequestType, WorkhouseRentRequest } from './RequestTabs';

interface ActionMenuProps {
    row: MaterialRequestType | WorkhouseRentRequest;
    type: 'material' | 'rental';
    permissions: {
        hasEdit: boolean;
        hasDelete: boolean;
        hasDownload: boolean;
    };
    handlers: {
        onEdit: (row: any) => void;
        onDelete: (row: any) => void;
        onDownload: (row: any) => void;
    };
}

const ActionMenu: React.FC<ActionMenuProps> = ({ row, permissions, handlers }) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const openMenu = Boolean(anchorEl);
    const { isTooltipGloballyEnabled } = useTooltip();

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const isDisabled = row.status !== 0;

    return (
        <>
            <IconButton onClick={handleClick}>
                <IconDots width={18} />
            </IconButton>
            <Menu anchorEl={anchorEl} open={openMenu} onClose={handleClose}>
                {permissions.hasEdit && (
                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu kaydı düzenle" : ""}>
                        <MuiMenuItem onClick={() => { handleClose(); handlers.onEdit(row); }} disabled={isDisabled}>
                            <ListItemIcon><IconEdit width={18} /></ListItemIcon> Düzenle
                        </MuiMenuItem>
                    </CustomTooltip>
                )}
                {permissions.hasDelete && (
                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu kaydı sil" : ""}>
                        <MuiMenuItem onClick={() => { handleClose(); handlers.onDelete(row); }} disabled={isDisabled}>
                            <ListItemIcon><IconTrash width={18} /></ListItemIcon> Silmek
                        </MuiMenuItem>
                    </CustomTooltip>
                )}
                {permissions.hasDownload && (
                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Raporu İndir" : ""}>
                        <MuiMenuItem onClick={() => { handleClose(); handlers.onDownload(row); }}>
                            <ListItemIcon><IconFileDownload width={18} /></ListItemIcon> Bu satırı indir
                        </MuiMenuItem>
                    </CustomTooltip>
                )}
            </Menu>
        </>
    );
};

export default ActionMenu;