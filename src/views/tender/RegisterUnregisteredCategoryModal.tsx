// src/views/tender/RegisterUnregisteredCategoryModal.tsx
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Stack, Grid, CircularProgress,
    FormControl, InputLabel, Select, TextField, InputAdornment,
    MenuItem as MuiMenuItem,
    Typography,
    Checkbox,
    ListItemIcon,
    ListItemText,
    Box,
    IconButton,
    List
} from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { IconSearch, IconChevronRight, IconChevronDown } from '@tabler/icons-react';

import axios from 'axios';
import server from 'src/assets/address.json';
import { ApiCategoryType } from './TenderDetails';
interface CategoryOptionType {
    id: string;
    name: string;
    parentId?: string | null;
    depth?: number;
    categories?: CategoryOptionType[];
}

interface FlatCategoryType {
    id: string;
    name: string;
    parentId: string | null;
    depth: number;
}

interface CategoryNode {
    id: string;
    name: string;
    parentId: string | null;
    depth: number;
    children: CategoryNode[];
}

const flattenCategories = (nestedCategories: CategoryOptionType[]): FlatCategoryType[] => {
    const flatList: FlatCategoryType[] = [];
    const traverse = (categories: CategoryOptionType[]) => {
        categories.forEach((cat: CategoryOptionType) => {
            flatList.push({
                id: cat.id,
                name: cat.name,
                parentId: cat.parentId || null,
                depth: cat.depth !== undefined ? cat.depth : 0,
            });
            if (cat.categories && cat.categories.length > 0) {
                traverse(cat.categories);
            }
        });
    };
    traverse(nestedCategories);
    return flatList;
};

const buildCategoryTreeForSelect = (categories: FlatCategoryType[], searchTerm: string, parentId: string | null = null): CategoryNode[] => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const currentLevelCategories = categories.filter(cat =>
        cat.parentId === parentId
    ).sort((a, b) => a.name.localeCompare(b.name));

    const tree: CategoryNode[] = [];
    for (const cat of currentLevelCategories) {
        const children = buildCategoryTreeForSelect(categories, searchTerm, cat.id);
        const matchesSearch = cat.name.toLowerCase().includes(lowerCaseSearchTerm);
        const childrenMatchSearch = children.length > 0;

        if (searchTerm === '' || matchesSearch || childrenMatchSearch) {
            tree.push({
                ...cat,
                children: children,
            });
        }
    }
    return tree;
};

interface CategoryTreeSelectMenuItemProps {
    node: CategoryNode;
    onToggleSelection: (categoryId: string, isChecked: boolean) => void;
    selectedId: string | null;
    onCloseParentSelect: () => void;
}

const CategoryTreeSelectMenuItem: React.FC<CategoryTreeSelectMenuItemProps> = ({ node, onToggleSelection, selectedId, onCloseParentSelect }) => {
    const [open, setOpen] = useState(false);
    const isChecked = selectedId === node.id;

    const handleCheckboxClick = (event: React.ChangeEvent<HTMLInputElement>) => {
        event.stopPropagation();
        const newCheckedState = event.target.checked;
        onToggleSelection(node.id, newCheckedState);
        if (newCheckedState) {
            onCloseParentSelect();
        }
    };

    const handleToggleCollapse = (e: React.MouseEvent) => {
        e.stopPropagation();
        setOpen(!open);
    };

    const handleMenuItemClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newCheckedState = !isChecked;
        onToggleSelection(node.id, newCheckedState);
        if (newCheckedState) {
            onCloseParentSelect();
        }
    };

    return (
        <>
            <MuiMenuItem
                value={node.id}
                sx={{
                    paddingLeft: `${node.depth * 16}px`,
                    '&.MuiMenuItem-root': {
                        paddingTop: '6px',
                        paddingBottom: '6px',
                        '&.Mui-selected': {
                            backgroundColor: 'transparent !important',
                            color: (theme) => theme.palette.text.primary,
                        },
                        '&:hover': {
                            backgroundColor: (theme) => theme.palette.action.hover,
                        },
                    },
                }}
                onClick={handleMenuItemClick}
            >
                <Stack direction="row" alignItems="center" width="100%">
                    {node.children.length > 0 ? (
                        <IconButton onClick={handleToggleCollapse} size="small" sx={{ mr: 1, p: 0.5 }}>
                            {open ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                        </IconButton>
                    ) : (
                        <Box sx={{ width: 16 + 8 + 4 }} />
                    )}
                    <ListItemIcon sx={{ minWidth: 'auto', mr: 1 }}>
                        <Checkbox
                            edge="start"
                            checked={isChecked}
                            tabIndex={-1}
                            disableRipple
                            onChange={handleCheckboxClick}
                            inputProps={{ 'aria-labelledby': `category-select-item-${node.id}` }}
                        />
                    </ListItemIcon>
                    <ListItemText id={`category-select-item-${node.id}`} primary={node.name} />
                </Stack>
            </MuiMenuItem>
            {open && node.children.length > 0 && (
                <List component="div" disablePadding>
                    {node.children.map((childNode) => (
                        <CategoryTreeSelectMenuItem
                            key={childNode.id}
                            node={childNode}
                            onToggleSelection={onToggleSelection}
                            selectedId={selectedId}
                            onCloseParentSelect={onCloseParentSelect}
                        />
                    ))}
                </List>
            )}
        </>
    );
};

export interface RegisterCategoryInitialData {
    id?: number;
    description?: string;
    eskiPoz?: string;
    categoryPercentage?: number | null;
    isCategory?: boolean;
    originalRowId?: number;
}

interface RegisterUnregisteredCategoryModalProps {
    open: boolean;
    onClose: () => void;
    onRegisterSuccess: (registeredCategory: ApiCategoryType, originalRowId?: number) => void;
    initialData: RegisterCategoryInitialData | null;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
}

const RegisterUnregisteredCategoryModal: React.FC<RegisterUnregisteredCategoryModalProps> = ({
    open, onClose, onRegisterSuccess, initialData, showAlert
}) => {
    const navigate = useNavigate();
    const [name, setName] = useState<string>('');
    const [selectedParentCategoryId, setSelectedParentCategoryId] = useState<string | null>(null);
    const [isParentCategorySelectOpen, setIsParentCategorySelectOpen] = useState(false);
    const [allCategoriesFlat, setAllCategoriesFlat] = useState<FlatCategoryType[]>([]);
    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [loadingCategories, setLoadingCategories] = useState<boolean>(false);
    const [parentCategorySearchTerm, setParentCategorySearchTerm] = useState('');
    const categoryNameInputRef = useRef<HTMLInputElement>(null);
    const [nameError, setNameError] = useState<boolean>(false);
    const [nameHelperText, setNameHelperText] = useState<string>('');
    const [parentCategoryIdError, setParentCategoryIdError] = useState<boolean>(false);
    const [parentCategoryIdHelperText, setParentCategoryIdHelperText] = useState<string>('');
    const parentCategoryTreeForSelect = useMemo(() => {
        return buildCategoryTreeForSelect(allCategoriesFlat, parentCategorySearchTerm, null);
    }, [allCategoriesFlat, parentCategorySearchTerm]);
    useEffect(() => {
        if (open && initialData) {
            setName(initialData.description || '');
        } else if (!open) {
            setName('');
            setSelectedParentCategoryId(null);
            setNameError(false); setNameHelperText('');
            setParentCategoryIdError(false); setParentCategoryIdHelperText('');
            setParentCategorySearchTerm('');
        }
    }, [open, initialData]);

    useEffect(() => {
        if (open) {
            getAllCategories();
        }
    }, [open]);

    const handleToggleParentCategorySelection = useCallback((categoryId: string, isChecked: boolean) => {
        if (isChecked) {
            setSelectedParentCategoryId(categoryId === "" ? null : categoryId);
            setParentCategoryIdError(false);
            setParentCategoryIdHelperText('');
        } else {
            setSelectedParentCategoryId(null);
        }
    }, []);

    const handleCloseParentCategorySelect = () => {
        setIsParentCategorySelectOpen(false);
    };

    const getAllCategories = async () => {
        setLoadingCategories(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            setLoadingCategories(false);
            return;
        }
        try {
            const response = await axios.get(server.baseurl + server.baseinfo + "get-categories", {
                headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` }
            });
            if (response.data && response.data.success) {
                const flattened = flattenCategories(response.data.data as CategoryOptionType[]);
                setAllCategoriesFlat(flattened);
            } else {
                showAlert('Kategoriler yüklenirken hata oluştu: ' + (response.data.message || 'Bilinmeyen hata.'), 'error');
            }
        } catch (e: any) {
            if (axios.isAxiosError(e) && e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                showAlert(e.response?.data?.message || 'Kategoriler sunucudan alınamadı.', 'error');
            }
        } finally {
            setLoadingCategories(false);
        }
    };

    const insertCategory = async () => {
        let hasError = false;
        if (!name.trim()) {
            setNameError(true);
            setNameHelperText('Kategori adı boş bırakılamaz!');
            hasError = true;
        } else {
            setNameError(false);
            setNameHelperText('');
        }
        if (hasError) {
            showAlert('Lütfen tüm zorunlu alanları doğru şekilde doldurun!', 'warning');
            return;
        }
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            setLoadingButton(false);
            return;
        }
        try {
            const response = await axios.post(server.baseurl + server.baseinfo + "create-category",
                {
                    name,
                    parentId: selectedParentCategoryId
                        ? selectedParentCategoryId
                        : null,
                },
                {
                    headers: {
                        "Accept": "application/json",
                        'Content-Type': 'application/json',
                        "Authorization": `Bearer ${authToken}`
                    }
                }
            );

            if (response.data && response.data.success) {
                showAlert('Yeni kategori başarıyla eklendi!', 'success');
                onRegisterSuccess(response.data.data as ApiCategoryType, initialData?.originalRowId);
                onClose();
            } else {
                showAlert(response.data.message || 'Kategori eklenirken bir hata oluştu.', 'error');
            }

        } catch (e: any) {
            if (axios.isAxiosError(e) && e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                showAlert(e.response?.data?.message || 'Kategori eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
            }
        } finally {
            setLoadingButton(false);
        }
    };
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            aria-labelledby="register-unregistered-category-title"
        >
            <DialogTitle id="register-unregistered-category-title">Kaydedilmemiş Kategori Ekle</DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <CustomFormLabel htmlFor="category-name">Kategori Adı</CustomFormLabel>
                        <CustomTextField
                            id="category-name"
                            placeholder="Kategori Adı"
                            fullWidth
                            value={name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                setName(e.target.value);
                                if (nameError && e.target.value.trim()) {
                                    setNameError(false);
                                    setNameHelperText('');
                                }
                            }}
                            inputRef={categoryNameInputRef}
                            error={nameError}
                            helperText={nameHelperText}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <CustomFormLabel htmlFor="select-parent-category">Üst Kategori (İsteğe Bağlı)</CustomFormLabel>
                        <FormControl fullWidth error={parentCategoryIdError}>
                            <InputLabel id="select-parent-category-label">Üst Kategori Seçin</InputLabel>
                            <Select
                                labelId="select-parent-category-label"
                                id="select-parent-category"
                                value={selectedParentCategoryId || ''}
                                open={isParentCategorySelectOpen}
                                onOpen={() => setIsParentCategorySelectOpen(true)}
                                onClose={handleCloseParentCategorySelect}
                                onChange={(event) => {
                                    const newValue = event.target.value as string;
                                    handleToggleParentCategorySelection(newValue, true);
                                }}
                                renderValue={(selected: string) => {
                                    const category = allCategoriesFlat.find(cat => cat.id === selected);
                                    return category ? category.name : '';
                                }}
                                MenuProps={{ sx: { maxHeight: 400 }, onClose: () => { setParentCategorySearchTerm(''); setIsParentCategorySelectOpen(false); }, }}
                            >
                                <TextField
                                    autoFocus
                                    fullWidth
                                    placeholder="Üst Kategori Ara..."
                                    value={parentCategorySearchTerm}
                                    onChange={(e) => setParentCategorySearchTerm(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => e.stopPropagation()}
                                    sx={{ p: 1, pb: 0, '& .MuiInputBase-root': { pr: '8px !important' } }}
                                    InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>), }}
                                />
                                <MuiMenuItem value={""} onClick={() => handleToggleParentCategorySelection("", true)}>
                                    <Checkbox checked={selectedParentCategoryId === null || selectedParentCategoryId === ""} tabIndex={-1} disableRipple />
                                    <ListItemText primary="Üst Kategori Yok (Ana Kategori Yap)" />
                                </MuiMenuItem>
                                {loadingCategories ? (
                                    <MuiMenuItem disabled><CircularProgress size={20} /> Yükleniyor...</MuiMenuItem>
                                ) : parentCategoryTreeForSelect.length > 0 ? (
                                    parentCategoryTreeForSelect.map((node: CategoryNode) => (
                                        <CategoryTreeSelectMenuItem
                                            key={node.id}
                                            node={node}
                                            onToggleSelection={handleToggleParentCategorySelection}
                                            selectedId={selectedParentCategoryId}
                                            onCloseParentSelect={handleCloseParentCategorySelect}
                                        />
                                    ))
                                ) : (
                                    <MuiMenuItem disabled>Hiç üst kategori bulunamadı.</MuiMenuItem>
                                )}
                            </Select>
                            {parentCategoryIdHelperText && <Typography color="error" variant="caption" sx={{ ml: 1.5, mt: 0.5 }}>{parentCategoryIdHelperText}</Typography>}
                        </FormControl>
                    </Grid>
                    {initialData?.eskiPoz && (
                        <Grid item xs={12}>
                            <CustomFormLabel>İlgili Eski Poz No</CustomFormLabel>
                            <Typography variant="body1">{initialData.eskiPoz}</Typography>
                        </Grid>
                    )}
                    {initialData?.categoryPercentage !== null && initialData?.categoryPercentage !== undefined && (
                        <Grid item xs={12}>
                            <CustomFormLabel>Önceden Tanımlanmış Kategori Yüzdesi</CustomFormLabel>
                            <Typography variant="body1">{initialData.categoryPercentage}%</Typography>
                        </Grid>
                    )}
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="secondary" variant="outlined">İptal Et</Button>
                <Button onClick={insertCategory} color="success" variant="contained" disabled={loadingButton}>
                    {loadingButton ? <>
                        <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Beklemek....
                    </> : 'Kaydet'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default RegisterUnregisteredCategoryModal;