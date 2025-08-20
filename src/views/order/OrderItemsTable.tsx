import React, { useState, useRef } from 'react'; // ✅ useRef را ایمپورت کنید
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton,
    TextField, Button, Box, Typography, Chip, Autocomplete, Dialog, DialogTitle, DialogContent, DialogActions,
    InputAdornment
} from '@mui/material';
import { IconTrash, IconPlus, IconEdit, IconCheck, IconSearch } from '@tabler/icons-react';

const stripHtml = (htmlString: string): string => {
    const doc = new DOMParser().parseFromString(htmlString, 'text/html');
    return doc.body.textContent || "";
};

interface UnitType {
    id: string;
    title: string;
    recordStatus: number;
    createAt: string;
}

interface ItemType {
    id: string;
    name: string;
    description: string;
    abbreviation: string;
    recordStatus: number;
    weight: number | null;
    createAt: string;
    unit: UnitType;
    status: string;
}

interface OrderItem {
    id: number;
    item: string;
    quantity: number;
    description: string;
    isEditing: boolean;
    unit?: UnitType;
    isRegistered?: boolean;
    price?: number;
}

interface OrderItemsTableProps {
    items: OrderItem[];
    itemsList: ItemType[];
    availableItemsList: ItemType[];
    onItemChange: (id: number, field: string, value: any) => void;
    onAddItem: () => void;
    onRemoveItem: (id: number) => void;
    onToggleEdit: (id: number) => void;
    onOpenRegisterModal: (item: { name: string; unit: string; id: number; }) => void;
}

const OrderItemsTable: React.FC<OrderItemsTableProps> = ({
    items,
    itemsList,
    availableItemsList,
    onItemChange,
    onAddItem,
    onRemoveItem,
    onToggleEdit,
    onOpenRegisterModal
}) => {
    const [openModal, setOpenModal] = useState(false);
    const [modalContent, setModalContent] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // ✅ ایجاد رفرنس‌ها برای فیلدها
    const quantityRef = useRef<HTMLInputElement>(null);
    const priceRef = useRef<HTMLInputElement>(null);

    // ✅ تابع handleFocus
    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
        event.target.select();
    };

    const handleOpenModal = (content: string) => {
        setModalContent(stripHtml(content));
        setOpenModal(true);
    };

    const handleCloseModal = () => {
        setOpenModal(false);
        setModalContent('');
    };



    const newRowItems = items.filter(item => item.isEditing);
    const unregisteredItems = items.filter(item => !item.isRegistered && !item.isEditing);
    const registeredItems = items.filter(item => item.isRegistered && !item.isEditing);
    const filteredRegisteredItems = registeredItems.filter(item =>
        itemsList.find(i => i.id === item.item)?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Paper elevation={3} sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TextField
                        size="small"
                        placeholder="Ürün Ara..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>),
                        }}
                    />
                </Box>
                <Box sx={{ mt: { xs: 2, sm: 0 } }}>
                    <Button
                        variant="outlined"
                        startIcon={<IconPlus />}
                        onClick={onAddItem}
                    >
                        Yeni Ürün Ekle
                    </Button>
                </Box>
            </Box>

            <TableContainer sx={{ maxHeight: 600, overflowY: 'auto', overflowX: 'auto' }}>
                <Table stickyHeader sx={{ tableLayout: 'fixed' }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ width: 170, minWidth: 170 }}>Ürün</TableCell>
                            <TableCell sx={{ width: 100, minWidth: 100 }}>Miktar</TableCell>
                            <TableCell sx={{ width: 150, minWidth: 150 }}>Açıklama</TableCell>
                            <TableCell sx={{ width: 100, minWidth: 100 }}>Fiyat</TableCell>
                            <TableCell sx={{ width: 100, minWidth: 100 }} align="right"></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {newRowItems.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Autocomplete<ItemType>
                                            id={`item-autocomplete-${item.id}`}
                                            options={availableItemsList}
                                            getOptionLabel={(option) => option.name}
                                            value={itemsList.find(i => i.id === item.item) || null}
                                            onChange={(_event, newValue) => {
                                                onItemChange(item.id, 'item', newValue ? newValue.id : '');
                                            }}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label="Ürün"
                                                    variant="outlined"
                                                    size="small"
                                                />
                                            )}
                                            sx={{ flexGrow: 1, minWidth: 150 }}
                                        />
                                        {item.unit && item.unit.title && (
                                            <Chip label={item.unit.title} color="secondary" variant="outlined" />
                                        )}
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        size="small"
                                        value={item.quantity}
                                        onChange={(e) => onItemChange(item.id, 'quantity', Number(e.target.value))}
                                        onFocus={handleFocus} // ✅ رویداد onFocus اضافه شده است
                                        inputRef={quantityRef}
                                        InputProps={{ inputProps: { min: 0 } }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        multiline
                                        rows={2}
                                        value={item.description}
                                        onChange={(e) => onItemChange(item.id, 'description', e.target.value)}
                                        onFocus={handleFocus} // ✅ رویداد onFocus اضافه شده است
                                    />
                                </TableCell>
                                <TableCell>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        size="small"
                                        value={item.price || ''}
                                        onChange={(e) => onItemChange(item.id, 'price', Number(e.target.value))}
                                        onFocus={handleFocus} // ✅ رویداد onFocus اضافه شده است
                                        inputRef={priceRef} // ✅ رفرنس به input اضافه شده است
                                    />
                                </TableCell>
                                <TableCell align="right">
                                    <IconButton
                                        color="success"
                                        onClick={() => onToggleEdit(item.id)}
                                        disabled={!item.item || !item.quantity}
                                    >
                                        <IconCheck size={20} />
                                    </IconButton>
                                    {/* <IconButton
                                        color="error"
                                        onClick={() => onRemoveItem(item.id)}
                                    >
                                        <IconX size={20} />
                                    </IconButton> */}
                                </TableCell>
                            </TableRow>
                        ))}
                        {unregisteredItems.map((item) => {
                            const cleanedDescription = stripHtml(item.description || '');
                            const isDescriptionLong = cleanedDescription.length > 50;
                            const displayedDescription = isDescriptionLong ? cleanedDescription.substring(0, 50) + '...' : cleanedDescription;
                            return (
                                <TableRow key={item.id} sx={{ border: '2px solid red' }}>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Typography sx={{ flexGrow: 1 }}>{item.item}</Typography>
                                            {item.unit && item.unit.title && (
                                                <Chip label={item.unit.title} color="secondary" variant="outlined" />
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Typography>{Number(item.quantity || 0).toFixed(2)}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography>{displayedDescription}</Typography>
                                            {isDescriptionLong && (
                                                <IconButton size="small" onClick={() => handleOpenModal(item.description || '')}>...</IconButton>
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Typography>{Number(item.price || 0).toFixed(2)}</Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton color="success" onClick={() => onOpenRegisterModal({ name: item.item, unit: item.unit?.title || '', id: item.id })}>
                                            <IconPlus size={20} />
                                        </IconButton>
                                        <IconButton color="error" onClick={() => onRemoveItem(item.id)}>
                                            <IconTrash size={20} />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {filteredRegisteredItems.map((item) => {
                            const cleanedDescription = stripHtml(item.description || '');
                            const isDescriptionLong = cleanedDescription.length > 50;
                            const displayedDescription = isDescriptionLong ? cleanedDescription.substring(0, 50) + '...' : cleanedDescription;
                            return (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Typography sx={{ flexGrow: 1 }}>{itemsList.find(i => i.id === item.item)?.name}</Typography>
                                            {item.unit && item.unit.title && (
                                                <Chip label={item.unit.title} color="secondary" variant="outlined" />
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Typography>{Number(item.quantity || 0).toFixed(2)}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography>{displayedDescription}</Typography>
                                            {isDescriptionLong && (
                                                <IconButton size="small" onClick={() => handleOpenModal(item.description || '')}>...</IconButton>
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Typography>{Number(item.price || 0).toFixed(2)}</Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton color="primary" onClick={() => onToggleEdit(item.id)}><IconEdit size={20} /></IconButton>
                                        <IconButton color="error" onClick={() => onRemoveItem(item.id)}><IconTrash size={20} /></IconButton>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {filteredRegisteredItems.length === 0 && newRowItems.length === 0 && unregisteredItems.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
                                    <Typography variant="subtitle1" color="textSecondary">
                                        Hiç kayıtlı ürün bulunamadı.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={openModal} onClose={handleCloseModal} maxWidth="sm" fullWidth>
                <DialogTitle>Açıklama</DialogTitle>
                <DialogContent dividers>
                    <Typography>{modalContent}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseModal}>Kapat</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default OrderItemsTable;