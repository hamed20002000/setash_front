// src/views/tender/RegisterUnregisteredItemModal.tsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
    List,
    IconButton
} from '@mui/material';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import BoltIcon from '@mui/icons-material/Bolt';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { IconSearch, IconChevronRight, IconChevronDown } from '@tabler/icons-react';
import { ApiItemType } from './TenderDetails';
import axios from 'axios';
import server from 'src/assets/address.json';

interface UnitOptionType {
    id: string;
    title: string;
}
interface CategoryOptionType {
    id: string;
    name: string;
    parentId?: string | null;
    depth: number;
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
        categories.forEach(cat => {
            flatList.push({
                id: cat.id,
                name: cat.name,
                parentId: cat.parentId || null,
                depth: cat.depth,
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

export interface RegisterItemInitialData {
    id?: number;
    description?: string;
    olcuBrimi?: string;
    eskiPoz?: string;
    tedasNo?: number;
    anaNo?: number;
    altNo?: number;
    aciklama?: string;
    malzeme?: number;
    malzemeYuklenici?: number;
    montaj?: number;
    demontaj?: number;
    demontajMontaj?: number;
    isCategory?: boolean;
    originalRowId?: number;
}
interface RegisterUnregisteredItemModalProps {
    open: boolean;
    onClose: () => void;
    onRegisterSuccess: (registeredItem: ApiItemType, originalRowId?: number) => void;
    initialData: RegisterItemInitialData | null;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
}

const RegisterUnregisteredItemModal: React.FC<RegisterUnregisteredItemModalProps> = ({
    open, onClose, onRegisterSuccess, initialData, showAlert
}) => {
    const navigate = useNavigate();
    const [name, setName] = useState<string>('');
    const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [isCategorySelectOpen, setIsCategorySelectOpen] = useState(false);
    const [abbreviation, setAbbreviation] = useState<string>('');
    const [weight, setWeight] = useState<number | ''>('');
    const [description, setDescription] = useState<string>('');
    const [unitOptions, setUnitOptions] = useState<UnitOptionType[]>([]);
    const [allCategoriesFlat, setAllCategoriesFlat] = useState<FlatCategoryType[]>([]);
    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [loadingUnits, setLoadingUnits] = useState<boolean>(false);
    const [loadingCategories, setLoadingCategories] = useState<boolean>(false);
    const [unitSearchTerm, setUnitSearchTerm] = useState('');
    const [categorySearchTerm, setCategorySearchTerm] = useState('');
    const itemNameInputRef = React.useRef<HTMLInputElement>(null);
    const [nameError, setNameError] = useState<boolean>(false);
    const [nameHelperText, setNameHelperText] = useState<string>('');
    const [unitIdError, setUnitIdError] = useState<boolean>(false);
    const [unitIdHelperText, setUnitIdHelperText] = useState<string>('');
    const [categoryIdError, setCategoryIdError] = useState<boolean>(false);
    const [categoryIdHelperText, setCategoryIdHelperText] = useState<string>('');
    const [abbreviationError, setAbbreviationError] = useState<boolean>(false);
    const [abbreviationHelperText, setAbbreviationHelperText] = useState<string>('');
    const [weightError, setWeightError] = useState<boolean>(false);
    const [weightHelperText, setWeightHelperText] = useState<string>('');
    const [descriptionError, setDescriptionError] = useState<boolean>(false);
    const [descriptionHelperText, setDescriptionHelperText] = useState<string>('');
    const categoryTreeForSelect = useMemo(() => {
        return buildCategoryTreeForSelect(allCategoriesFlat, categorySearchTerm, null);
    }, [allCategoriesFlat, categorySearchTerm]);
    useEffect(() => {
        if (open && initialData) {
            setName(initialData.description || '');
            setDescription(initialData.aciklama || '');
        } else if (!open) {
            setName('');
            setSelectedUnitId(null);
            setSelectedCategoryId(null);
            setAbbreviation('');
            setDescription('');
            setNameError(false); setNameHelperText('');
            setUnitIdError(false); setUnitIdHelperText('');
            setCategoryIdError(false); setCategoryIdHelperText('');
            setAbbreviationError(false); setAbbreviationHelperText('');
            setWeightError(false); setWeightHelperText('');
            setDescriptionError(false); setDescriptionHelperText('');
        }
    }, [open, initialData]);

    useEffect(() => {
        if (open) {
            getUnitOptions();
            getAllCategories();
        }
    }, [open]);

    const handleToggleCategorySelection = useCallback((categoryId: string, isChecked: boolean) => {
        if (isChecked) {
            setSelectedCategoryId(categoryId);
            setCategoryIdError(false);
            setCategoryIdHelperText('');
        } else {
            setSelectedCategoryId(null);
        }
    }, []);

    const handleCloseCategorySelect = () => {
        setIsCategorySelectOpen(false);
    };

    const getUnitOptions = async () => {
        setLoadingUnits(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            setLoadingUnits(false);
            return;
        }
        try {
            const response = await axios.get(server.baseurl + server.baseinfo + "get-item-units", {
                headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` }
            });
            if (response.data && response.data.success) {
                setUnitOptions(response.data.data.map((unit: any) => ({ id: unit.id, title: unit.title })));
            } else {
                showAlert('Ölçüler yüklenirken hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                showAlert('Ölçüler sunucudan alınamadı.', 'error');
            }
        } finally {
            setLoadingUnits(false);
        }
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
                const flattened = flattenCategories(response.data.data);
                setAllCategoriesFlat(flattened);
            } else {
                showAlert('Kategoriler yüklenirken hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                showAlert('Kategoriler sunucudan alınamadı.', 'error');
            }
        } finally {
            setLoadingCategories(false);
        }
    };

    const insertItem = async () => {
        let hasError = false;
        if (!name.trim()) {
            setNameError(true);
            setNameHelperText('Ürün adı boş bırakılamaz!');
            hasError = true;
        } else {
            setNameError(false);
            setNameHelperText('');
        }
        if (selectedUnitId === null) {
            setUnitIdError(true);
            setUnitIdHelperText('Ölçü seçilmelidir!');
            hasError = true;
        } else {
            setUnitIdError(false);
            setUnitIdHelperText('');
        }
        if (selectedCategoryId === null) {
            setCategoryIdError(true);
            setCategoryIdHelperText('Kategori seçilmelidir!');
            hasError = true;
        } else {
            setCategoryIdError(false);
            setCategoryIdHelperText('');
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
            const response = await axios.post(server.baseurl + server.baseinfo + "create-item",
                {
                    name,
                    description,
                    abbreviation,
                    categoryId: Number(selectedCategoryId),
                    itemUnitId: Number(selectedUnitId),
                    weight: weight === '' ? null : weight,
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
                showAlert('Yeni ürün başarıyla eklendi!', 'success');
                onRegisterSuccess(response.data.data as ApiItemType, initialData?.originalRowId);
                onClose();
            } else {
                showAlert(response.data.message || 'Ürün eklenirken bir hata oluştu.', 'error');
            }

        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                showAlert(e.response?.data?.message || 'Ürün eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
            }
        } finally {
            setLoadingButton(false);
        }
    };
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            aria-labelledby="register-unregistered-item-title"
        >
            <DialogTitle id="register-unregistered-item-title">Kaydedilmemiş Ürün Ekle</DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <CustomFormLabel htmlFor="item-name" required>Ürün Adı</CustomFormLabel>
                        <CustomTextField
                            id="item-name"
                            placeholder="Ürün Adı"
                            fullWidth
                            value={name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                setName(e.target.value);
                                if (nameError && e.target.value.trim()) {
                                    setNameError(false);
                                    setNameHelperText('');
                                }
                            }}
                            inputRef={itemNameInputRef}
                            error={nameError}
                            helperText={nameHelperText}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <CustomFormLabel htmlFor="select-unit" required>Ölçü</CustomFormLabel>
                        <FormControl fullWidth error={unitIdError}>
                            <InputLabel id="select-unit-label">Ölçü Seçin</InputLabel>
                            <Select
                                labelId="select-unit-label"
                                id="select-unit"
                                value={selectedUnitId || ''}
                                label="Ölçü Seçin"
                                onChange={(e) => {
                                    setSelectedUnitId(e.target.value as string);
                                    if (unitIdError) {
                                        setUnitIdError(false);
                                        setUnitIdHelperText('');
                                    }
                                }}
                                MenuProps={{ sx: { maxHeight: 300 } }}
                                onClose={() => setUnitSearchTerm('')}
                            >
                                <TextField
                                    autoFocus
                                    fullWidth
                                    placeholder="Ölçü Ara..."
                                    value={unitSearchTerm}
                                    onChange={(e) => setUnitSearchTerm(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => e.stopPropagation()}
                                    sx={{ p: 1, pb: 0, '& .MuiInputBase-root': { pr: '8px !important' } }}
                                    InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>), }}
                                />
                                {loadingUnits ? (
                                    <MuiMenuItem disabled><CircularProgress size={20} /> Yükleniyor...</MuiMenuItem>
                                ) : unitOptions.length > 0 ? (
                                    unitOptions.filter(unit => unit.title.toLowerCase().includes(unitSearchTerm.toLowerCase())).map((unit) => (
                                        <MuiMenuItem key={unit.id} value={unit.id}>{unit.title}</MuiMenuItem>
                                    ))
                                ) : (
                                    <MuiMenuItem disabled>Hiç birim bulunamadı.</MuiMenuItem>
                                )}
                            </Select>
                            {unitIdHelperText && <Typography color="error" variant="caption" sx={{ ml: 1.5, mt: 0.5 }}>{unitIdHelperText}</Typography>}
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <CustomFormLabel htmlFor="select-category" required>Kategori</CustomFormLabel>
                        <FormControl fullWidth error={categoryIdError}>
                            <InputLabel id="select-category-label">Kategori Seçin</InputLabel>
                            <Select
                                labelId="select-category-label"
                                id="select-category"
                                value={selectedCategoryId || ''}
                                open={isCategorySelectOpen}
                                onOpen={() => setIsCategorySelectOpen(true)}
                                onClose={handleCloseCategorySelect}
                                onChange={(event) => {
                                    const newValue = event.target.value as string;
                                    handleToggleCategorySelection(newValue, true);
                                }}
                                renderValue={(selected: any) => {
                                    const category = allCategoriesFlat.find(cat => cat.id === selected);
                                    return category ? category.name : '';
                                }}
                                MenuProps={{ sx: { maxHeight: 400 }, onClose: () => { setCategorySearchTerm(''); setIsCategorySelectOpen(false); }, }}
                            >
                                <TextField
                                    autoFocus
                                    fullWidth
                                    placeholder="Kategori Ara..."
                                    value={categorySearchTerm}
                                    onChange={(e) => setCategorySearchTerm(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => e.stopPropagation()}
                                    sx={{ p: 1, pb: 0, '& .MuiInputBase-root': { pr: '8px !important' } }}
                                    InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>), }}
                                />
                                {loadingCategories ? (
                                    <MuiMenuItem disabled><CircularProgress size={20} /> Yükleniyor...</MuiMenuItem>
                                ) : categoryTreeForSelect.length > 0 ? (
                                    categoryTreeForSelect.map((node) => (
                                        <CategoryTreeSelectMenuItem
                                            key={node.id}
                                            node={node}
                                            onToggleSelection={handleToggleCategorySelection}
                                            selectedId={selectedCategoryId}
                                            onCloseParentSelect={handleCloseCategorySelect}
                                        />
                                    ))
                                ) : (
                                    <MuiMenuItem disabled>Hiç kategori bulunamadı.</MuiMenuItem>
                                )}
                            </Select>
                            {categoryIdHelperText && <Typography color="error" variant="caption" sx={{ ml: 1.5, mt: 0.5 }}>{categoryIdHelperText}</Typography>}
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <CustomFormLabel htmlFor="abbreviation">Kısaltma (4 Karakter)</CustomFormLabel>
                        <CustomTextField
                            id="abbreviation"
                            placeholder="Kısaltma"
                            fullWidth
                            value={abbreviation}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                setAbbreviation(e.target.value.substring(0, 4));
                                if (abbreviationError && e.target.value.trim() && e.target.value.length === 4) {
                                    setAbbreviationError(false);
                                    setAbbreviationHelperText('');
                                }
                            }}
                            inputProps={{ maxLength: 4 }}
                            error={abbreviationError}
                            helperText={abbreviationHelperText}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <CustomFormLabel htmlFor="weight">Ürün Birim Ağırlığı</CustomFormLabel>
                        <CustomTextField
                            id="weight"
                            placeholder="Ağırlık"
                            fullWidth
                            type="number"
                            value={weight}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const value = e.target.value;
                                if (value === '' || !isNaN(Number(value))) {
                                    setWeight(value === '' ? '' : Number(value));
                                }
                                if (weightError && value.trim()) {
                                    setWeightError(false);
                                    setWeightHelperText('');
                                }
                            }}
                            inputProps={{ min: 0, step: "0.01" }}
                            error={weightError}
                            helperText={weightHelperText}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <CustomFormLabel htmlFor="description">Açıklama</CustomFormLabel>
                        <ReactQuill
                            theme="snow"
                            value={description}
                            onChange={(value) => {
                                setDescription(value);
                                if (descriptionError && value.trim() && value !== '<p><br></p>') {
                                    setDescriptionError(false);
                                    setDescriptionHelperText('');
                                }
                            }}
                            placeholder="Ürün açıklamasını girin..."
                            modules={{
                                toolbar: [
                                    [{ 'header': [1, 2, false] }],
                                    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                    ['link', 'image'],
                                    ['clean']
                                ],
                            }}
                            formats={[
                                'header', 'bold', 'italic', 'underline', 'strike', 'blockquote',
                                'list', 'bullet', 'link', 'image'
                            ]}
                            style={{ height: '150px', marginBottom: '40px', border: descriptionError ? '1px solid red' : undefined }}
                        />
                        {descriptionError && <Typography color="error" variant="caption" sx={{ ml: 1.5, mt: 0.5 }}>{descriptionHelperText}</Typography>}
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="secondary" variant="outlined">İptal Et</Button>
                <Button onClick={insertItem} color="success" variant="contained" disabled={loadingButton}>
                    {loadingButton ? <>
                        <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Beklemek....
                    </> : 'Kaydet'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default RegisterUnregisteredItemModal;