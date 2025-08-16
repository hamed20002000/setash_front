// src/views/works/WorkDetails.tsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    useParams,
    //  useSearchParams,
    useNavigate
} from 'react-router-dom';
import {
    Typography, Box, Stack, Grid, Button, Alert, CircularProgress, TextField,
    Autocomplete,
    RadioGroup,
    FormControlLabel,
    Radio,
    FormControl,
    FormLabel, Paper,
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
    Chip,
    IconButton
} from '@mui/material';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import BlankCard from '../../../components/shared/BlankCard';
import axios from 'axios';
import server from '../../../assets/address.json';
import RegisterUnregisteredItemModal, { RegisterItemInitialData } from '../../../views/tender/RegisterUnregisteredItemModal';
import { ApiItemType } from '../../tender/TenderDetails';
import WorkItemInputForm, { AvailableItemOption } from './WorkItemInputForm';
import WorkDetailsTable from './WorkDetailsTable';
import { IconDownload, IconUpload, IconPlus, IconChevronUp, IconChevronDown, IconArrowRight } from '@tabler/icons-react';
import * as XLSX from 'xlsx';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

// --- New Interfaces based on API response ---
interface ApiNetworkItem {
    id: string;
    value: string;
    item: {
        id: string;
        name: string;
    };
}

interface ApiChannelRow {
    id: string;
    productStatus: number;
    label: string;
    productType: {
        id: string;
        name: string;
    };
    channelRowItems: ApiNetworkItem[];
    parent: {
        id: string;
    } | null;
}

interface ApiNetworkTrAdi {
    id: string;
    title: string;
    channelRows: ApiChannelRow[];
}

interface ApiNetworkResponse {
    id: string;
    networkTrAdis: ApiNetworkTrAdi[];
}

// --- Your existing interfaces (with minor updates if needed) ---
export interface WorkItemDetail {
    id: string;
    tempId: string;
    name: string;
    value: string;
}

export interface WorkDetailSubEntry {
    id: string;
    trAdiParentId: string;
    dn: string;
    yeni: string;
    dmm: string;
    mevcut: string;
    itemDetails: WorkItemDetail[];
    isToplamRow?: boolean;
}

export interface WorkDetailRow {
    id: string;
    trAdi: string;
    subEntries: WorkDetailSubEntry[];
}

interface ProductTypesTypeFromAPI {
    id: number;
    name: string;
    createAt: string;
    recordStatus?: number;
    status?: string;
}

const WorkDetails = () => {
    const navigate = useNavigate();
    const { networkId } = useParams();
    const { isTooltipGloballyEnabled } = useTooltip();
    const [trAdi, setTrAdi] = useState<string>('');
    const [selectedProduct, setSelectedProduct] = useState<AvailableItemOption | null>(null);
    const [yeniValue, setYeniValue] = useState<string>('');
    const [dmmValue, setDmmValue] = useState<string>('');
    const [mevcutValue, setMevcutValue] = useState<string>('');
    const [selectedRadioOption, setSelectedRadioOption] = useState<'yeni' | 'dmm' | 'mevcut'>('yeni');
    const [trAdiRegistered, setTrAdiRegistered] = useState<boolean>(false);
    const [selectedProductError, setSelectedProductError] = useState<boolean>(false);
    const [selectedProductHelperText, setSelectedProductHelperText] = useState<string>('');
    const [yeniError, setYeniError] = useState<boolean>(false);
    const [yeniHelperText, setYeniHelperText] = useState<string>('');
    const [dmmError, setDmmError] = useState<boolean>(false);
    const [dmmHelperText, setDmmHelperText] = useState<string>('');
    const [mevcutError, setMevcutError] = useState<boolean>(false);
    const [mevcutHelperText, setMevcutHelperText] = useState<string>('');
    const [itemsToRegister, setItemsToRegister] = useState<WorkItemDetail[]>([]);
    const [registeredWorkEntries, setRegisteredWorkEntries] = useState<WorkDetailRow[]>([]);
    const [allProductTypesFromAPI, setAllProductTypesFromAPI] = useState<AvailableItemOption[]>([]);
    const [itemsListForWorkItemForm, setItemsListForWorkItemForm] = useState<AvailableItemOption[]>([]);
    const [loadingProductTypes, setLoadingProductTypes] = useState<boolean>(true);
    const [loadingItemsForWorkItemForm, setLoadingItemsForWorkItemForm] = useState<boolean>(true);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
    const [loadingRegisterButton, setLoadingRegisterButton] = useState<boolean>(false);
    const [editingItemTempId, setEditingItemTempId] = useState<string | null>(null);
    const [excelTemplateBuffer, setExcelTemplateBuffer] = useState<ArrayBuffer | null>(null);
    const [loadingExcelTemplate, setLoadingExcelTemplate] = useState<boolean>(false);
    const hasInitialAPIDataLoaded = useRef(false);
    const hasExcelTemplateLoaded = useRef(false);
    const [openNewDirectModal, setOpenNewDirectModal] = useState<boolean>(false);
    const [newDirectName, setNewDirectName] = useState<string>('');
    const [newDirectNameError, setNewDirectNameError] = useState<boolean>(false);
    const [newDirectNameHelperText, setNewDirectNameHelperText] = useState<string>('');
    const [loadingNewDirectButton, setLoadingNewDirectButton] = useState<boolean>(false);
    const [editingSubEntry, setEditingSubEntry] = useState<WorkDetailSubEntry | null>(null);
    const [isEditingSubEntry, setIsEditingSubEntry] = useState<boolean>(false);
    const [loadingFileUpload, setLoadingFileUpload] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [unregisteredProductTypes, setUnregisteredProductTypes] = useState<string[]>([]);
    const [unregisteredItems, setUnregisteredItems] = useState<string[]>([]);
    const [openNewItemModal, setOpenNewItemModal] = useState<boolean>(false);
    const [initialItemModalData, setInitialItemModalData] = useState<RegisterItemInitialData | null>(null);
    const [isUnregisteredProductTypesExpanded, setIsUnregisteredProductTypesExpanded] = useState<boolean>(false);
    const [isUnregisteredItemsExpanded, setIsUnregisteredItemsExpanded] = useState<boolean>(false);
    const productAutocompleteTextFieldRef = useRef<HTMLInputElement>(null);
    const [loadingData, setLoadingData] = useState<boolean>(true); // ✅ اضافه شده


    const filteredItemsForWorkItemForm = useMemo(() => {
        // ایجاد یک Set از IDهای آیتم‌هایی که در حال حاضر برای این sub-entry ثبت شده‌اند.
        const registeredItemIds = new Set(itemsToRegister.map(item => item.id));

        // فیلتر کردن لیست اصلی آیتم‌ها
        return itemsListForWorkItemForm.filter(item => {
            // اگر آیتم فعلی در لیست ثبت شده‌ها نیست، آن را برگردان
            // یا اگر در حال ویرایش هستیم و این آیتم، آیتم در حال ویرایش نیست.
            const isRegistered = registeredItemIds.has(item.id);
            const isEditingThisItem = editingItemTempId && itemsToRegister.find(i => i.tempId === editingItemTempId)?.id === item.id;

            return !isRegistered || isEditingThisItem;
        });
    }, [itemsListForWorkItemForm, itemsToRegister, editingItemTempId]);


    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
    }, []);

    const clearAlert = useCallback(() => setAlertMessage(null), []);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (alertMessage) {
            timer = setTimeout(() => {
                clearAlert();
            }, 5000);
        }
        return () => {
            clearTimeout(timer);
        };
    }, [alertMessage, clearAlert]);

    const resetMainFormFields = useCallback(() => {
        setSelectedProduct(null);
        setYeniValue('');
        setDmmValue('');
        setMevcutValue('');
        setSelectedRadioOption('yeni');
        setSelectedProductError(false);
        setSelectedProductHelperText('');
        setYeniError(false);
        setYeniHelperText('');
        setDmmError(false);
        setDmmHelperText('');
        setMevcutError(false);
        setMevcutHelperText('');
        setItemsToRegister([]);
        setEditingSubEntry(null);
        setIsEditingSubEntry(false);
    }, []);

    const getListProductTypes = useCallback(() => {
        setLoadingProductTypes(true);
        const authToken = localStorage.getItem('authToken');

        if (!authToken) {
            console.warn("Auth token bulunamadı, giriş sayfasına yönlendiriliyor.");
            navigate("/");
            showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            setLoadingProductTypes(false);
            return;
        }
        axios.request({
            baseURL: server.baseurl + server.initialoperations + "get-product-types",
            method: "get",
            headers: {
                "Accept": "application/json",
                "Authorization": `Bearer ${authToken}`
            }
        }).then((result) => {
            if (result.data.httpStatusCode === 200) {
                const formattedData: AvailableItemOption[] = result.data.data
                    .filter((item: ProductTypesTypeFromAPI) => item.recordStatus === 0)
                    .map((item: ProductTypesTypeFromAPI) => ({
                        id: String(item.id),
                        name: item.name,
                    }));
                setAllProductTypesFromAPI(formattedData);
            } else {
                showAlert(result.data.message || 'Ürün türleri listesi alınamadı.', 'error');
            }
        }).catch((e) => {
            if (axios.isAxiosError(e) && e.response?.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                showAlert(e.response?.data?.message || 'Ürün türleri listesi alınırken bir hata oluştu, lütfen tekrar deneyin.', 'error');
            }
        }).finally(() => {
            setLoadingProductTypes(false);
        });
    }, [navigate, showAlert]);

    const getListItem = useCallback(async () => {
        setLoadingItemsForWorkItemForm(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            setLoadingItemsForWorkItemForm(false);
            return;
        }
        debugger
        try {
            const response = await axios.get(server.baseurl + server.baseinfo + "get-item", {
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${authToken}`
                }
            });
            if (response.data && response.data.success) {
                const processedData: AvailableItemOption[] = response.data.data
                    .filter((item: any) => item.recordStatus === 0)
                    .map((item: any) => ({
                        id: String(item.id),
                        name: item.name,
                        unit: item.unit.title,
                    }));
                setItemsListForWorkItemForm(processedData);
            } else {
                showAlert('Ürünler yüklenmedi.', 'error');
            }
        } catch (e: any) {
            if (axios.isAxiosError(e) && e.response?.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                showAlert('Ürünler sunucudan alınamadı', 'error');
            }
        } finally {
            setLoadingItemsForWorkItemForm(false);
        }
    }, [navigate, showAlert]);

    // ✅ تابع جدید برای واکشی داده‌های اولیه از API
    const getInitialData = useCallback(async () => {
        if (!networkId) {
            showAlert('Network ID bulunamadı. Lütfen URL\'yi kontrol edin.', 'error');
            return;
        }
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            setLoadingData(false);
            return;
        }
        try {
            const response = await axios.get<{ data: ApiNetworkResponse; httpStatusCode: number; message: string }>(
                `${server.baseurl}${server.initialoperations}get-network-by-work-id/${networkId}`,
                {
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${authToken}`
                    }
                }
            );
            if (response.data.httpStatusCode === 200) {
                const apiData = response.data.data;
                const convertedData: WorkDetailRow[] = [];
                apiData.networkTrAdis.forEach(trAdiItem => {
                    const subEntries: WorkDetailSubEntry[] = [];
                    trAdiItem.channelRows.forEach(channelRow => {
                        // Check if a parent with a different ID already exists in the subEntries
                        const isExistingParent = subEntries.some(sub => sub.id === channelRow.id);
                        if (isExistingParent) {
                            return; // Skip if this is a duplicate entry (e.g., child of a previously processed row)
                        }

                        // Determine quantity fields based on productStatus
                        let yeni = '';
                        let dmm = '';
                        let mevcut = '';
                        if (channelRow.productStatus === 0) {
                            yeni = channelRow.label;
                        } else if (channelRow.productStatus === 1) {
                            dmm = channelRow.label;
                        } else if (channelRow.productStatus === 2) {
                            mevcut = channelRow.label;
                        }

                        // Map channelRowItems to WorkItemDetail
                        const workItemDetails: WorkItemDetail[] = channelRow.channelRowItems.map(item => ({
                            id: item.item.id, // Using item ID as unique ID
                            tempId: `temp-${item.id}-${Date.now()}-${Math.random()}`,
                            name: item.item.name,
                            value: item.value,
                        }));

                        subEntries.push({
                            id: channelRow.id,
                            trAdiParentId: trAdiItem.id,
                            dn: channelRow.productType.name,
                            yeni: yeni,
                            dmm: dmm,
                            mevcut: mevcut,
                            itemDetails: workItemDetails
                        });
                    });

                    const newRow: WorkDetailRow = {
                        id: trAdiItem.id,
                        trAdi: trAdiItem.title,
                        subEntries: subEntries
                    };
                    convertedData.push(newRow);
                });

                // Update the state
                const updatedDataWithTotals = updateToplamRow(convertedData);
                setRegisteredWorkEntries(updatedDataWithTotals);
                showAlert('Veriler başarıyla yüklendi!', 'success');
            } else {
                showAlert(response.data.message || 'İş detayları alınırken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (axios.isAxiosError(e) && e.response?.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                showAlert(e.response?.data?.message || 'İş detayları sunucudan alınırken bir hata oluştu, lütfen tekrar deneyin.', 'error');
            }
        } finally {
            setLoadingData(false);
        }
    }, [networkId, navigate, showAlert]);

    useEffect(() => {
        if (!hasInitialAPIDataLoaded.current) {
            getListProductTypes();
            getListItem();
            getInitialData();
            hasInitialAPIDataLoaded.current = true;
        }
    }, [getListProductTypes, getListItem, getInitialData]);

    useEffect(() => {
        if (!hasExcelTemplateLoaded.current) {
            setLoadingExcelTemplate(true);
            fetch('/ŞEBEKE-KANAL-TR.xlsx')
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.arrayBuffer();
                })
                .then(buffer => {
                    setExcelTemplateBuffer(buffer);
                    setLoadingExcelTemplate(false);
                    hasExcelTemplateLoaded.current = true;
                })
                .catch(error => {
                    console.log("Excel şablonu yüklenirken hata oluştu:", error);
                    showAlert('Excel şablonu yüklenirken hata oluştu.', 'error');
                    setLoadingExcelTemplate(false);
                });
        }
    }, [showAlert]);

    const handleAddItemToRegister = useCallback((item: WorkItemDetail) => {
        if (editingItemTempId) {
            setItemsToRegister(prevItems =>
                prevItems.map(i => (i.tempId === editingItemTempId ? item : i))
            );
            setEditingItemTempId(null);
        } else {
            setItemsToRegister(prevItems => [...prevItems, { ...item, tempId: String(Date.now()) }]);
        }
        clearAlert();
    }, [editingItemTempId, clearAlert]);

    const handleRemoveItemToRegister = useCallback((tempIdToRemove: string) => {
        setItemsToRegister(prevItems => prevItems.filter(item => item.tempId !== tempIdToRemove));
        clearAlert();
        if (editingItemTempId === tempIdToRemove) {
            setEditingItemTempId(null);
        }
    }, [editingItemTempId, clearAlert]);

    const handleEditItemToRegister = useCallback((tempIdToEdit: string | null) => {
        setEditingItemTempId(tempIdToEdit);
        clearAlert();
    }, [clearAlert]);

    const handleStartNewTrAdiEntry = useCallback(() => {
        setTrAdi('');
        setTrAdiRegistered(false);
        resetMainFormFields();
        setItemsToRegister([]);
        showAlert('Yeni TR ADI ve alt öğeleri girebilirsiniz.', 'info');
    }, [showAlert, resetMainFormFields]);

    const updateToplamRow = useCallback((currentEntries: WorkDetailRow[]): WorkDetailRow[] => {
        return currentEntries.map(trAdiRow => {
            const actualSubEntries = trAdiRow.subEntries.filter(sub => !sub.isToplamRow);
            let totalYeni = 0;
            let totalDmm = 0;
            let totalMevcut = 0;
            actualSubEntries.forEach(sub => {
                totalYeni += parseFloat(sub.yeni || '0');
                totalDmm += parseFloat(sub.dmm || '0');
                totalMevcut += parseFloat(sub.mevcut || '0');
            });
            const itemTotals: { [itemName: string]: number } = {};
            actualSubEntries.forEach(sub => {
                sub.itemDetails.forEach(item => {
                    itemTotals[item.name] = (itemTotals[item.name] || 0) + parseFloat(item.value || '0');
                });
            });
            const totalItemDetails: WorkItemDetail[] = Object.keys(itemTotals).map(name => ({
                id: `total-item-${name}`,
                tempId: `total-item-temp-${name}-${Date.now()}`,
                name: name,
                value: itemTotals[name].toString(),
            }));

            const totalSubEntry: WorkDetailSubEntry = {
                id: `${trAdiRow.id}-sub-TOTAL`,
                trAdiParentId: trAdiRow.id,
                dn: 'TOPLAM',
                yeni: totalYeni.toString(),
                dmm: totalDmm.toString(),
                mevcut: totalMevcut.toString(),
                itemDetails: totalItemDetails,
                isToplamRow: true,
            };

            return { ...trAdiRow, subEntries: [...actualSubEntries, totalSubEntry] };
        });
    }, []);

    const handleRegisterNewEntry = async () => {
        clearAlert();
        let hasError = false;
        if (!trAdiRegistered && !trAdi.trim()) {
            showAlert('TR ADI alanı boş bırakılamaz!', 'warning');
            hasError = true;
        } else if (trAdiRegistered && !trAdi.trim()) {
            showAlert('TR ADI daha önce kaydedildi, boş bırakılamaz!', 'warning');
            hasError = true;
        }
        if (!selectedProduct) {
            setSelectedProductError(true);
            setSelectedProductHelperText('D.N alanı boş bırakılamaz!');
            showAlert('D.N alanı boş bırakılamaz!', 'warning');
            hasError = true;
        } else {
            setSelectedProductError(false);
            setSelectedProductHelperText('');
        }
        let selectedValue: string = '';
        if (selectedRadioOption === 'yeni') {
            selectedValue = yeniValue;
            if (!yeniValue.trim()) {
                setYeniError(true);
                setYeniHelperText('YENİ miktarı boş bırakılamaz!');
                showAlert('YENİ miktarı boş bırakılamaz!', 'warning');
                hasError = true;
            } else {
                setYeniError(false);
                setYeniHelperText('');
            }
        } else if (selectedRadioOption === 'dmm') {
            selectedValue = dmmValue;
            if (!dmmValue.trim()) {
                setDmmError(true);
                setDmmHelperText('DMM miktarı boş bırakılamaz!');
                showAlert('DMM miktarı boş bırakılamaz!', 'warning');
                hasError = true;
            } else {
                setDmmError(false);
                setDmmHelperText('');
            }
        } else if (selectedRadioOption === 'mevcut') {
            selectedValue = mevcutValue;
            if (!mevcutValue.trim()) {
                setMevcutError(true);
                setMevcutHelperText('MEVCUT miktarı boş bırakılamaz!');
                showAlert('MEVCUT miktarı boş bırakılamaz!', 'warning');
                hasError = true;
            } else {
                setMevcutError(false);
                setMevcutHelperText('');
            }
        }
        if (itemsToRegister.length === 0) {
            showAlert('Lütfen en az bir öğe ve miktar ekleyin!', 'warning');
            hasError = true;
        }
        if (hasError) {
            return;
        }
        const currentTrAdiRow = registeredWorkEntries.find(row => row.trAdi === trAdi);
        if (currentTrAdiRow && selectedProduct) {
            const isDnAlreadyRegistered = currentTrAdiRow.subEntries.some(
                subEntry => subEntry.dn === selectedProduct.name && !subEntry.isToplamRow
            );
            if (isDnAlreadyRegistered) {
                showAlert(`'${selectedProduct.name}' için zaten bir D.N girişi mevcut. Lütfen mevcut girişi düzenleyin veya başka bir D.N seçin.`, 'warning');
                return;
            }
        }
        setLoadingRegisterButton(true);
        const dnValueForDisplay = selectedProduct ? selectedProduct.name : 'Bilinmeyen';
        const newSubEntry: WorkDetailSubEntry = {
            id: String(Date.now()),
            trAdiParentId: '',
            dn: dnValueForDisplay,
            yeni: selectedRadioOption === 'yeni' ? selectedValue : '',
            dmm: selectedRadioOption === 'dmm' ? selectedValue : '',
            mevcut: selectedRadioOption === 'mevcut' ? selectedValue : '',
            itemDetails: [...itemsToRegister],
            isToplamRow: false,
        };

        if (!trAdiRegistered) {
            const newTrAdiRowId = `tradi-${Date.now()}`;
            const newTrAdiRow: WorkDetailRow = {
                id: newTrAdiRowId,
                trAdi: trAdi,
                subEntries: [{ ...newSubEntry, trAdiParentId: newTrAdiRowId }]
            };
            setRegisteredWorkEntries(prev => updateToplamRow([...prev, newTrAdiRow]));
            setTrAdiRegistered(true);
        } else {
            setRegisteredWorkEntries(prevEntries => {
                const updatedEntries = prevEntries.map(row => {
                    if (row.trAdi === trAdi) {
                        const existingSubEntriesWithoutToplam = row.subEntries.filter(sub => !sub.isToplamRow);
                        return { ...row, subEntries: [...existingSubEntriesWithoutToplam, { ...newSubEntry, trAdiParentId: row.id }] };
                    }
                    return row;
                });
                return updateToplamRow(updatedEntries);
            });
        }
        showAlert('Yeni giriş başarıyla tabloya eklendi!', 'success');
        resetMainFormFields();
        setLoadingRegisterButton(false);
    };

    const handleDownloadExcelTemplate = useCallback(() => {
        if (!excelTemplateBuffer) {
            showAlert('Excel şablonu henüz yüklenmedi veya yüklenemedi.', 'warning');
            return;
        }
        const fileName = `ŞEBEKE-KANAL-TR.xlsx`;
        const blob = new Blob([excelTemplateBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showAlert(`${fileName} başarıyla indirildi!`, 'success');
    }, [excelTemplateBuffer, showAlert]);
    const getCellValueIntelligently = (worksheet: any, rowIdx: number, colIdx: number): string => {
        const cellAddress = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
        const cell = worksheet[cellAddress];
        if (cell && typeof cell.v === 'number') {
            return String(cell.v);
        }
        if (cell && cell.v !== undefined && cell.v !== null) {
            return String(cell.v).trim();
        }
        if (worksheet['!merges']) {
            for (const merge of worksheet['!merges']) {
                if (rowIdx >= merge.s.r && rowIdx <= merge.e.r && colIdx >= merge.s.c && colIdx <= merge.e.c) {
                    const mergedTopLeftCellAddress = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
                    const mergedTopLeftCell = worksheet[mergedTopLeftCellAddress];
                    if (mergedTopLeftCell && mergedTopLeftCell.v !== undefined && mergedTopLeftCell.v !== null) {
                        return String(mergedTopLeftCell.v).trim();
                    }
                }
            }
        }
        return '';
    };


    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            showAlert('Lütfen bir Excel dosyası seçin.', 'warning');
            return;
        }
        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv'
        ];
        if (!allowedTypes.includes(file.type)) {
            showAlert('Sadece Excel dosyaları (.xlsx, .xls, .csv) kabul edilir.', 'error');
            return;
        }
        setLoadingFileUpload(true);
        showAlert('Excel dosyası işleniyor...', 'info');
        setUnregisteredProductTypes([]);
        setUnregisteredItems([]);
        const newUnregisteredProductTypes = new Set<string>();
        const newUnregisteredItems = new Set<string>();
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
            if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
                showAlert('Excel dosyası geçersiz veya içinde hiçbir sayfa bulunamadı.', 'error');
                setLoadingFileUpload(false);
                return;
            }
            const sheetName = workbook.SheetNames[0]!;
            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet) {
                showAlert('Belirtilen sayfaya sahip çalışma sayfası bulunamadı.', 'error');
                setLoadingFileUpload(false);
                return;
            }
            if (!worksheet['!ref']) {
                showAlert('Excel dosyası formatı geçersiz: Sayfa aralığı bilgisi bulunamadı.', 'error');
                setLoadingFileUpload(false);
                return;
            }
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            if (range.e.r < 3 || range.e.c < 6) {
                showAlert('Excel dosyası boş veya formatı geçersiz (minimum 4 R satır و 7 C ستون (A-G) انتظار می‌رود).', 'error');
                setLoadingFileUpload(false);
                return;
            }
            // const getCellValueIntelligently = (rowIdx: number, colIdx: number): string => {
            //     const cellAddress = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
            //     const cell = worksheet[cellAddress];
            //     if (cell && typeof cell.v === 'number') {
            //         return String(cell.v);
            //     }
            //     if (cell && cell.v !== undefined && cell.v !== null) {
            //         return String(cell.v).trim();
            //     }
            //     if (worksheet['!merges']) {
            //         for (const merge of worksheet['!merges']) {
            //             if (rowIdx >= merge.s.r && rowIdx <= merge.e.r &&
            //                 colIdx >= merge.s.c && colIdx <= merge.e.c) {
            //                 const mergedTopLeftCellAddress = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
            //                 const mergedTopLeftCell = worksheet[mergedTopLeftCellAddress];
            //                 if (mergedTopLeftCell && mergedTopLeftCell.v !== undefined && mergedTopLeftCell.v !== null) {
            //                     return String(mergedTopLeftCell.v).trim();
            //                 }
            //             }
            //         }
            //     }
            //     return '';
            // };



            const itemDefinitions: { name: string; nameColIdx: number; valueColIdx: number }[] = [];
            let lastHeaderName = '';
            let lastHeaderStartCol = -1;
            for (let C = 5; C <= range.e.c; C++) {
                const currentHeaderCellContent = getCellValueIntelligently(worksheet, 2, C);
                if (currentHeaderCellContent !== '') {
                    if (lastHeaderName !== '' && lastHeaderStartCol !== -1) {
                        const valueColForPreviousItem = lastHeaderStartCol;
                        if (valueColForPreviousItem <= range.e.c) {
                            itemDefinitions.push({
                                name: lastHeaderName,
                                nameColIdx: lastHeaderStartCol,
                                valueColIdx: valueColForPreviousItem
                            });
                        } else { }
                    }
                    lastHeaderName = currentHeaderCellContent;
                    lastHeaderStartCol = C;
                } else {
                    if (lastHeaderName === '' && lastHeaderStartCol === -1) {
                        let allRemainingEmpty = true;
                        for (let nextC = C + 1; nextC <= range.e.c; nextC++) {
                            if (getCellValueIntelligently(worksheet, 2, nextC) !== '') {
                                allRemainingEmpty = false;
                                break;
                            }
                        }
                        if (allRemainingEmpty) {
                            break;
                        }
                    }
                }
            }
            if (lastHeaderName !== '' && lastHeaderStartCol !== -1) {
                const valueColForLastItem = lastHeaderStartCol;
                if (valueColForLastItem <= range.e.c) {
                    itemDefinitions.push({
                        name: lastHeaderName,
                        nameColIdx: lastHeaderStartCol,
                        valueColIdx: valueColForLastItem
                    });
                } else { }
            }
            const newRegisteredWorkEntries: WorkDetailRow[] = [];
            let currentTrAdiRow: WorkDetailRow | null = null;
            let currentSubEntryIdCounter = 1;
            const tempTrAdiSubEntries: { [trAdiId: string]: WorkDetailSubEntry[] } = {};
            const existingProductTypeNames = new Set(allProductTypesFromAPI.map(pt => pt.name.toLowerCase()));
            const existingItemNames = new Set(itemsListForWorkItemForm.map(item => item.name.toLowerCase()));
            for (let R = 3; R <= range.e.r; R++) {
                const trAdiFromExcel = getCellValueIntelligently(worksheet, R, 0);
                let dnFromExcel = getCellValueIntelligently(worksheet, R, 1);
                const yeniFromExcel = getCellValueIntelligently(worksheet, R, 2);
                const dmmFromExcel = getCellValueIntelligently(worksheet, R, 3);
                const mevcutFromExcel = getCellValueIntelligently(worksheet, R, 4);
                if (trAdiFromExcel !== '') {
                    if (trAdiFromExcel.toUpperCase() === 'TOPLAM') {
                        continue;
                    } else {
                        const existingRow = newRegisteredWorkEntries.find(row => row.trAdi === trAdiFromExcel);
                        if (existingRow) {
                            currentTrAdiRow = existingRow;
                        } else {
                            currentTrAdiRow = {
                                id: `tradi-${Date.now()}-${newRegisteredWorkEntries.length + 1}-${Math.random().toString(36).substring(7)}`,
                                trAdi: trAdiFromExcel,
                                subEntries: []
                            };
                            newRegisteredWorkEntries.push(currentTrAdiRow);
                            tempTrAdiSubEntries[currentTrAdiRow.id] = [];
                        }
                    }
                }
                if (!currentTrAdiRow) {
                    showAlert('Excel dosyasının formatı geçersiz: İlk veri satırında TR ADI bulunamadı.', 'error');
                    setLoadingFileUpload(false);
                    return;
                }
                const hasSubEntryData = (
                    dnFromExcel !== '' ||
                    yeniFromExcel !== '' ||
                    dmmFromExcel !== '' ||
                    mevcutFromExcel !== '' ||
                    itemDefinitions.some(itemDef => getCellValueIntelligently(worksheet, R, itemDef.valueColIdx) !== '')
                );
                if (hasSubEntryData) {
                    const newItemDetails: WorkItemDetail[] = [];
                    itemDefinitions.forEach(itemDef => {
                        const itemValue = getCellValueIntelligently(worksheet, R, itemDef.valueColIdx);
                        if (itemValue !== '' && itemDef.name !== '') {
                            newItemDetails.push({
                                id: `item-${Date.now()}-${newItemDetails.length}-${Math.random().toString(36).substring(7)}`,
                                tempId: String(Date.now() + newItemDetails.length + Math.random()),
                                name: itemDef.name,
                                value: itemValue
                            });
                            if (!existingItemNames.has(itemDef.name.toLowerCase())) {
                                newUnregisteredItems.add(itemDef.name);
                            }
                        }
                    });
                    if (dnFromExcel !== '' && dnFromExcel.toUpperCase() !== 'TOPLAM' && !existingProductTypeNames.has(dnFromExcel.toLowerCase())) {
                        newUnregisteredProductTypes.add(dnFromExcel);
                    }
                    const newSubEntry: WorkDetailSubEntry = {
                        id: `${currentTrAdiRow.id}-sub-${currentSubEntryIdCounter++}`,
                        trAdiParentId: currentTrAdiRow.id,
                        dn: dnFromExcel,
                        yeni: yeniFromExcel,
                        dmm: dmmFromExcel,
                        mevcut: mevcutFromExcel,
                        itemDetails: newItemDetails,
                        isToplamRow: false,
                    };
                    tempTrAdiSubEntries[currentTrAdiRow.id].push(newSubEntry);
                }
            }
            newRegisteredWorkEntries.forEach(trAdiRow => {
                const subEntriesForThisTrAdi = tempTrAdiSubEntries[trAdiRow.id];
                let totalYeni = 0;
                let totalDmm = 0;
                let totalMevcut = 0;
                subEntriesForThisTrAdi.forEach(sub => {
                    totalYeni += parseFloat(sub.yeni || '0');
                    totalDmm += parseFloat(sub.dmm || '0');
                    totalMevcut += parseFloat(sub.mevcut || '0');
                });
                const itemTotals: { [itemName: string]: number } = {};
                subEntriesForThisTrAdi.forEach(sub => {
                    sub.itemDetails.forEach(item => {
                        itemTotals[item.name] = (itemTotals[item.name] || 0) + parseFloat(item.value || '0');
                    });
                });
                const totalItemDetails: WorkItemDetail[] = Object.keys(itemTotals).map(name => ({
                    id: `total-item-${trAdiRow.id}-${name}`,
                    tempId: `total-item-temp-${trAdiRow.id}-${name}-${Date.now()}`,
                    name: name,
                    value: itemTotals[name].toString(),
                }));
                const totalSubEntry: WorkDetailSubEntry = {
                    id: `${trAdiRow.id}-sub-TOTAL`,
                    trAdiParentId: trAdiRow.id,
                    dn: 'TOPLAM',
                    yeni: totalYeni.toString(),
                    dmm: totalDmm.toString(),
                    mevcut: totalMevcut.toString(),
                    itemDetails: totalItemDetails,
                    isToplamRow: true,
                };
                trAdiRow.subEntries = [...subEntriesForThisTrAdi, totalSubEntry];
            });
            setRegisteredWorkEntries(newRegisteredWorkEntries);
            showAlert('Excel dosyası başarıyla yüklendi ve tablo güncellendi!', 'success');
            setUnregisteredProductTypes(Array.from(newUnregisteredProductTypes));
            setUnregisteredItems(Array.from(newUnregisteredItems));
            if (newRegisteredWorkEntries.length > 0) {
                setTrAdi(newRegisteredWorkEntries[newRegisteredWorkEntries.length - 1]?.trAdi || '');
                setTrAdiRegistered(true);
            } else {
                setTrAdi('');
                setTrAdiRegistered(false);
            }
            resetMainFormFields();
            setItemsToRegister([]);

        } catch (error: any) {
            console.log("Excel işleme hatası:", error);
            showAlert('Excel dosyası işlenirken bir hata oluştu. Lütfen dosyanın formatını kontrol edin veya', 'error');
            setUnregisteredProductTypes([]);
            setUnregisteredItems([]);
        } finally {
            setLoadingFileUpload(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleOpenNewItemModal = useCallback((itemName: string) => {
        setInitialItemModalData({ description: itemName });
        setOpenNewItemModal(true);
    }, []);

    const handleCloseNewItemModal = useCallback(() => {
        setOpenNewItemModal(false);
        setInitialItemModalData(null);
    }, []);

    const handleRegisterItemSuccess = useCallback((registeredItem: ApiItemType) => {
        showAlert(`'${registeredItem.name}' adlı yeni ürün başarıyla eklendi!`, 'success');
        setUnregisteredItems(prev => prev.filter(name => name.toLowerCase() !== registeredItem.name.toLowerCase()));
        getListItem();
        handleCloseNewItemModal();
    }, [showAlert, getListItem, handleCloseNewItemModal]);

    const itemToEditInForm = editingItemTempId
        ? itemsToRegister.find(item => item.tempId === editingItemTempId) || null
        : null;

    const handleOpenNewDirectModal = () => {
        setNewDirectName('');
        setNewDirectNameError(false);
        setNewDirectNameHelperText('');
        setOpenNewDirectModal(true);
    };

    const handleOpenNewDirectModalFromUnregistered = useCallback((dnName: string) => {
        setNewDirectName(dnName);
        setNewDirectNameError(false);
        setNewDirectNameHelperText('');
        setOpenNewDirectModal(true);
    }, []);

    const handleCloseNewDirectModal = useCallback(() => {
        setOpenNewDirectModal(false);
        setNewDirectName('');
        setNewDirectNameError(false);
        setNewDirectNameHelperText('');
        setLoadingNewDirectButton(false);
    }, []);

    const handleSaveNewDirect = async () => {
        if (!newDirectName.trim()) {
            setNewDirectNameError(true);
            setNewDirectNameHelperText('Direk adı boş olamaz!');
            showAlert('Direk adı boş olamaz!', 'warning');
            return;
        }
        setNewDirectNameError(false);
        setNewDirectNameHelperText('');
        setLoadingNewDirectButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            setLoadingNewDirectButton(false);
            return;
        }
        try {
            const response = await axios.post(
                server.baseurl + server.initialoperations + "create-product-type",
                { name: newDirectName },
                {
                    headers: {
                        "Accept": "application/json",
                        'Content-Type': 'application/json',
                        "Authorization": `Bearer ${authToken}`
                    }
                }
            );
            if (response.data.httpStatusCode === 201) {
                showAlert('Yeni Direk başarıyla eklendi!', 'success');
                setUnregisteredProductTypes(prev => prev.filter(name => name.toLowerCase() !== newDirectName.toLowerCase()));
                handleCloseNewDirectModal();
                getListProductTypes();
            } else {
                showAlert(response.data.message || 'Yeni Direk eklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (axios.isAxiosError(e) && e.response?.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                showAlert(e.response?.data?.message || 'Direk eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
            }
        } finally {
            setLoadingNewDirectButton(false);
        }
    };

    const handleEditTrAdiFromTable = useCallback((trAdiId: string, newTrAdiName: string) => {
        setRegisteredWorkEntries(prevEntries =>
            prevEntries.map(row =>
                row.id === trAdiId ? { ...row, trAdi: newTrAdiName } : row
            )
        );
        showAlert(`'${newTrAdiName}' adlı TR ADI başarıyla güncellendi!`, 'success');
    }, [showAlert]);

    const handleDeleteTrAdiFromTable = useCallback((trAdiId: string) => {
        setRegisteredWorkEntries(prevEntries => {
            const updatedEntries = prevEntries.filter(row => row.id !== trAdiId);
            if (prevEntries.some(row => row.id === trAdiId && row.trAdi === trAdi)) {
                setTrAdi('');
                setTrAdiRegistered(false);
                resetMainFormFields();
            }
            return updatedEntries;
        });
        showAlert('TR ADI ve tüm alt öğeleri başarıyla silindi!', 'success');
    }, [showAlert, trAdi, resetMainFormFields]);

    const handleLoadSubEntryForEdit = useCallback((subEntry: WorkDetailSubEntry) => {
        const parentTrAdi = registeredWorkEntries.find(row => row.id === subEntry.trAdiParentId)?.trAdi;
        if (parentTrAdi) {
            setTrAdi(parentTrAdi);
            setTrAdiRegistered(true);
        } else {
            setTrAdi('');
            setTrAdiRegistered(false);
        }
        const product = allProductTypesFromAPI.find(p => p.name === subEntry.dn);
        setSelectedProduct(product || null);
        setYeniValue(subEntry.yeni);
        setDmmValue(subEntry.dmm);
        setMevcutValue(subEntry.mevcut);
        if (subEntry.yeni) {
            setSelectedRadioOption('yeni');
        } else if (subEntry.dmm) {
            setSelectedRadioOption('dmm');
        } else if (subEntry.mevcut) {
            setSelectedRadioOption('mevcut');
        } else {
            setSelectedRadioOption('yeni');
        }
        setItemsToRegister([...subEntry.itemDetails]);
        setEditingSubEntry(subEntry);
        setIsEditingSubEntry(true);
        showAlert('Alt öğe formu düzenleme için yüklendi.', 'info');
    }, [showAlert, registeredWorkEntries, allProductTypesFromAPI]);


    const handleUpdateSubEntry = useCallback(() => {
        if (!editingSubEntry) {
            showAlert('Düzenlenecek alt öğe bulunamadı.', 'error');
            return;
        }
        clearAlert();
        let hasError = false;
        if (!selectedProduct) {
            setSelectedProductError(true);
            setSelectedProductHelperText('D.N alanı boş bırakılamaz!');
            showAlert('D.N alanı boş bırakılamaz!', 'warning');
            hasError = true;
        } else {
            setSelectedProductError(false);
            setSelectedProductHelperText('');
        }
        let selectedValue: string = '';
        if (selectedRadioOption === 'yeni') {
            selectedValue = yeniValue;
            if (!yeniValue.trim()) {
                setYeniError(true);
                setYeniHelperText('YENİ miktarı boş bırakılamaz!');
                showAlert('YENİ miktarı boş bırakılamaz!', 'warning');
                hasError = true;
            } else {
                setYeniError(false);
                setYeniHelperText('');
            }
        } else if (selectedRadioOption === 'dmm') {
            selectedValue = dmmValue;
            if (!dmmValue.trim()) {
                setDmmError(true);
                setDmmHelperText('DMM miktarı boş bırakılamaz!');
                showAlert('DMM miktarı boş bırakılamaz!', 'warning');
                hasError = true;
            } else {
                setDmmError(false);
                setDmmHelperText('');
            }
        } else if (selectedRadioOption === 'mevcut') {
            selectedValue = mevcutValue;
            if (!mevcutValue.trim()) {
                setMevcutError(true);
                setMevcutHelperText('MEVCUT miktarı boş bırakılamaz!');
                showAlert('MEVCUT miktarı boş bırakılamaz!', 'warning');
                hasError = true;
            } else {
                setMevcutError(false);
                setMevcutHelperText('');
            }
        }
        if (itemsToRegister.length === 0) {
            showAlert('Lütfen en az bir öğه و مقدار ekleyin!', 'warning');
            hasError = true;
        }
        if (hasError) {
            return;
        }
        setLoadingRegisterButton(true);

        // ✅ NEW: We will create the updated sub-entry from the current state values
        const updatedSubEntry: WorkDetailSubEntry = {
            ...editingSubEntry!, // Use editingSubEntry as the base
            dn: selectedProduct ? selectedProduct.name : '',
            yeni: selectedRadioOption === 'yeni' ? selectedValue : '',
            dmm: selectedRadioOption === 'dmm' ? selectedValue : '',
            mevcut: selectedRadioOption === 'mevcut' ? selectedValue : '',
            itemDetails: itemsToRegister, // Use the latest items from state
        };

        setRegisteredWorkEntries(prevEntries => {
            const updatedEntries = prevEntries.map(row => {
                if (row.id === updatedSubEntry.trAdiParentId) {
                    // Find the index of the sub-entry to update
                    const subEntryIndex = row.subEntries.findIndex(sub => sub.id === updatedSubEntry.id);

                    // If it's a valid index and not the total row
                    if (subEntryIndex !== -1 && !row.subEntries[subEntryIndex]?.isToplamRow) {
                        const newSubEntries = [...row.subEntries];
                        newSubEntries[subEntryIndex] = updatedSubEntry;
                        return { ...row, subEntries: newSubEntries };
                    }
                }
                return row;
            });
            return updateToplamRow(updatedEntries);
        });

        showAlert('Alt öğe başarıyla güncellendi!', 'success');
        resetMainFormFields();
        setLoadingRegisterButton(false);

    }, [
        editingSubEntry,
        selectedProduct,
        selectedRadioOption,
        yeniValue,
        dmmValue,
        mevcutValue,
        itemsToRegister,
        showAlert,
        resetMainFormFields,
        clearAlert,
        updateToplamRow
    ]);
    const handleDeleteSubEntryFromTable = useCallback((trAdiParentId: string, subEntryId: string) => {
        setRegisteredWorkEntries(prevEntries => {
            let updatedEntries = prevEntries.map(row => {
                if (row.id === trAdiParentId) {
                    const newSubEntries = row.subEntries.filter(sub => sub.id !== subEntryId && !sub.isToplamRow);
                    if (newSubEntries.length === 0) {
                        return null;
                    }
                    return { ...row, subEntries: newSubEntries };
                }
                return row;
            }).filter(Boolean) as WorkDetailRow[];
            updatedEntries = updateToplamRow(updatedEntries);
            if (editingSubEntry && editingSubEntry.id === subEntryId) {
                resetMainFormFields();
                setTrAdi('');
                setTrAdiRegistered(false);
            } else if (updatedEntries.length === 0) {
                setTrAdi('');
                setTrAdiRegistered(false);
                resetMainFormFields();
            }
            return updatedEntries;
        });
        showAlert('Alt öğe başarıyla silindi!', 'success');
    }, [showAlert, editingSubEntry, resetMainFormFields, trAdi, updateToplamRow]);

    const handleTrAdiEditedInTable = useCallback((trAdiId: string, trAdiName: string) => {
        const currentTrAdiRow = registeredWorkEntries.find(row => row.id === trAdiId);
        if (currentTrAdiRow) {
            setTrAdi(trAdiName);
            setTrAdiRegistered(true);
        }
    }, [setTrAdi, setTrAdiRegistered, registeredWorkEntries]);

    const filteredProductTypes = useMemo(() => {
        const registeredDnNames = new Set<string>();
        const currentTrAdiRow = registeredWorkEntries.find(row => row.trAdi === trAdi);
        if (currentTrAdiRow) {
            currentTrAdiRow.subEntries.forEach(sub => {
                if (isEditingSubEntry && editingSubEntry?.id === sub.id) {
                } else {
                    registeredDnNames.add(sub.dn);
                }
            });
        }
        return allProductTypesFromAPI.filter(productType => {
            const isRegistered = registeredDnNames.has(productType.name);
            return !isRegistered;
        });
    }, [allProductTypesFromAPI, registeredWorkEntries, isEditingSubEntry, editingSubEntry, trAdi]);


    const transformToApiFormat = useCallback(() => {
        const idToUse = networkId;
        if (!idToUse) {
            showAlert('Work/Network ID bulunamadı. Lütfen URL\'yi kontrol edin.', 'error');
            return null;
        }
        const apiPayload: {
            id: number;
            networkTrAdis: {
                title: string;
                channelRows: {
                    productStatus: number;
                    title: string;
                    label: string;
                    productTypeId: number;
                    channelRowItems: {
                        value: number;
                        itemId: number;
                    }[];
                    childChannelRows?: {
                        productStatus: number;
                        title: string;
                        label: string;
                        productTypeId: number;
                        channelRowItems: {
                            value: number;
                            itemId: number;
                        }[];
                        childChannelRows: []
                    }[];
                }[];
            }[];
        } = {
            id: parseInt(idToUse, 10),
            networkTrAdis: []
        };

        registeredWorkEntries.forEach(trAdiRow => {
            const actualSubEntries = trAdiRow.subEntries.filter(sub => !sub.isToplamRow);
            if (actualSubEntries.length === 0) {
                return;
            }
            const networkTrAdiEntry: typeof apiPayload.networkTrAdis[0] = {
                title: trAdiRow.trAdi,
                channelRows: []
            };
            const firstSubEntry = actualSubEntries[0];
            let mainProductStatus: number;
            let mainLabel: string;
            if (firstSubEntry.yeni) {
                mainProductStatus = 0;
                mainLabel = firstSubEntry.yeni;
            } else if (firstSubEntry.dmm) {
                mainProductStatus = 1;
                mainLabel = firstSubEntry.dmm;
            } else if (firstSubEntry.mevcut) {
                mainProductStatus = 2;
                mainLabel = firstSubEntry.mevcut;
            } else {
                mainProductStatus = 0;
                mainLabel = '';
            }
            const mainProductType = allProductTypesFromAPI.find(p => p.name === firstSubEntry.dn);
            const mainProductTypeId = mainProductType ? parseInt(mainProductType.id, 10) : 0;
            const mainChannelRow: typeof networkTrAdiEntry.channelRows[0] = {
                productStatus: mainProductStatus,
                title: "",
                label: mainLabel,
                productTypeId: mainProductTypeId,
                channelRowItems: firstSubEntry.itemDetails.map(item => ({
                    value: parseFloat(item.value),
                    itemId: parseInt(item.id, 10)
                })),
                childChannelRows: []
            };
            networkTrAdiEntry.channelRows.push(mainChannelRow);
            for (let i = 1; i < actualSubEntries.length; i++) {
                const childSubEntry = actualSubEntries[i];
                let childProductStatus: number;
                let childLabel: string;
                if (childSubEntry.yeni) {
                    childProductStatus = 0;
                    childLabel = childSubEntry.yeni;
                } else if (childSubEntry.dmm) {
                    childProductStatus = 1;
                    childLabel = childSubEntry.dmm;
                } else if (childSubEntry.mevcut) {
                    childProductStatus = 2;
                    childLabel = childSubEntry.mevcut;
                } else {
                    childProductStatus = 0;
                    childLabel = '';
                }
                const childProductType = allProductTypesFromAPI.find(p => p.name === childSubEntry.dn);
                const childProductTypeId = childProductType ? parseInt(childProductType.id, 10) : 0;
                const childChannelRow: NonNullable<typeof mainChannelRow.childChannelRows>[0] = {
                    productStatus: childProductStatus,
                    title: "",
                    label: childLabel,
                    productTypeId: childProductTypeId,
                    channelRowItems: childSubEntry.itemDetails.map(item => ({
                        value: parseFloat(item.value),
                        itemId: parseInt(item.id, 10)
                    })),
                    childChannelRows: []
                };
                mainChannelRow.childChannelRows!.push(childChannelRow);
            }

            apiPayload.networkTrAdis.push(networkTrAdiEntry);
        });
        return apiPayload;
    }, [networkId, registeredWorkEntries, allProductTypesFromAPI, showAlert]);

    const handleSendAllRegisteredData = async () => {
        debugger
        clearAlert();
        if (registeredWorkEntries.length === 0) {
            showAlert('Sunucuya gönderilecek kayıtlı iş detayı bulunmamaktadır.', 'warning');
            return;
        }
        const payload = transformToApiFormat();
        if (!payload) {
            return;
        }
        setLoadingRegisterButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            setLoadingRegisterButton(false);
            return;
        }
        try {
            const response = await axios.put(
                server.baseurl + server.initialoperations + "update-network",
                payload,
                {
                    headers: {
                        "Accept": "application/json",
                        'Content-Type': 'application/json',
                        "Authorization": `Bearer ${authToken}`
                    }
                }
            );

            if (response.data.httpStatusCode === 200) {
                showAlert('Tüm kayıtlar başarıyla sunucuya gönderildi ve güncellendi!', 'success');
            } else {
                showAlert(response.data.message || 'Kayıtlar sunucuya gönderilirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (axios.isAxiosError(e) && e.response?.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                showAlert(e.response?.data?.message || 'Kayıtlar sunucuya gönderilirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
            }
        } finally {
            setLoadingRegisterButton(false);
        }
    };

    const handleExportExcel = useCallback(async () => {
        if (!excelTemplateBuffer) {
            showAlert('Excel şablonu henüz yüklenmedi veya yüklenemedi. Dışa aktarma yapılamaz.', 'warning');
            return;
        }
        if (registeredWorkEntries.length === 0) {
            showAlert('Dışa aktarılacak kayıtlı iş detayı bulunmamaktadır.', 'warning');
            return;
        }
        showAlert('Excel dışa aktarılıyor...', 'info');
        try {
            const workbook = XLSX.read(excelTemplateBuffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0]!;
            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet) {
                showAlert('Excel şablonunda beklenen sayfa bulunamadı.', 'error');
                return;
            }
            const range = XLSX.utils.decode_range(worksheet['!ref'] || "A1:Z1");
            const itemDefinitions: { name: string; nameColIdx: number; valueColIdx: number }[] = [];
            let lastHeaderName = '';
            let lastHeaderStartCol = -1;
            for (let C = 5; C <= range.e.c; C++) {
                const cellAddress = XLSX.utils.encode_cell({ r: 2, c: C });
                const cell = worksheet[cellAddress];
                const currentHeaderCellContent = cell && cell.v !== undefined ? String(cell.v).trim() : '';
                if (currentHeaderCellContent !== '') {
                    if (lastHeaderName !== '' && lastHeaderStartCol !== -1) {
                        const valueColForPreviousItem = lastHeaderStartCol;
                        if (valueColForPreviousItem <= range.e.c) {
                            itemDefinitions.push({
                                name: lastHeaderName,
                                nameColIdx: lastHeaderStartCol,
                                valueColIdx: valueColForPreviousItem
                            });
                        } else { }
                    }
                    lastHeaderName = currentHeaderCellContent;
                    lastHeaderStartCol = C;
                } else {
                    if (lastHeaderName === '' && lastHeaderStartCol === -1) {
                        let allRemainingEmpty = true;
                        for (let nextC = C + 1; nextC <= range.e.c; nextC++) {
                            if (getCellValueIntelligently(worksheet, 2, nextC) !== '') {
                                allRemainingEmpty = false;
                                break;
                            }
                        }
                        if (allRemainingEmpty) {
                            break;
                        }
                    }
                }
            }
            if (lastHeaderName !== '' && lastHeaderStartCol !== -1) {
                const valueColForLastItem = lastHeaderStartCol;
                if (valueColForLastItem <= range.e.c) {
                    itemDefinitions.push({
                        name: lastHeaderName,
                        nameColIdx: lastHeaderStartCol,
                        valueColIdx: valueColForLastItem
                    });
                } else { }
            }
            const rowsToWrite: any[][] = [];
            let currentRowForMergeCalc = 3;
            registeredWorkEntries.forEach((trAdiRow) => {
                let isFirstSubEntryForTrAdi = true;
                trAdiRow.subEntries.forEach((subEntry) => {
                    const row: any[] = new Array(range.e.c + 1).fill('');
                    if (isFirstSubEntryForTrAdi) {
                        row[0] = trAdiRow.trAdi;
                        isFirstSubEntryForTrAdi = false;
                    } else {
                        row[0] = '';
                    }
                    row[1] = subEntry.dn;
                    if (subEntry.yeni) {
                        row[2] = subEntry.yeni;
                    } else if (subEntry.dmm) {
                        row[3] = subEntry.dmm;
                    } else if (subEntry.mevcut) {
                        row[4] = subEntry.mevcut;
                    }
                    subEntry.itemDetails.forEach(item => {
                        const itemDef = itemDefinitions.find(def => def.name === item.name);
                        if (itemDef) {
                            row[itemDef.valueColIdx] = item.value;
                        } else {
                        }
                    });
                    rowsToWrite.push(row);
                });
            });
            for (let R = 3; R <= range.e.r; R++) {
                for (let C = 0; C <= range.e.c; C++) {
                    const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                    delete worksheet[cellAddress];
                }
            }
            worksheet['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 2 + rowsToWrite.length, c: range.e.c } });
            XLSX.utils.sheet_add_aoa(worksheet, rowsToWrite, { origin: 3 });
            if (!worksheet['!merges']) {
                worksheet['!merges'] = [];
            }
            worksheet['!merges'] = worksheet['!merges'].filter(merge => !(merge.s.c === 0 && merge.e.c === 0 && merge.s.r >= 3));

            // let currentRowForMergeCalc = 3;

            registeredWorkEntries.forEach((trAdiRow) => {
                if (trAdiRow.subEntries.length > 0) {
                    if (trAdiRow.subEntries.length > 1) {
                        const mergeRange = {
                            s: { r: currentRowForMergeCalc, c: 0 },
                            e: { r: currentRowForMergeCalc + trAdiRow.subEntries.length - 1, c: 0 }
                        };
                        worksheet['!merges']!.push(mergeRange);
                    }
                    currentRowForMergeCalc += trAdiRow.subEntries.length;
                }
            });
            const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const fileName = `Exported_WorkDetails_${new Date().toISOString().slice(0, 10)}.xlsx`;
            const blob = new Blob([wbout], { type: 'application/octet-stream' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            showAlert('Excel başarıyla dışa aktarıldı!', 'success');

        } catch (error: any) {
            console.log("Excel dışa aktarılırken hata:", error);
            showAlert('Excel dışa aktarılırken bir hata oluştu. Lütfen konsolu kontrol edin.', 'error');
        }
    }, [excelTemplateBuffer, registeredWorkEntries, showAlert]);

    // ✅ اضافه شده: نمایش بارگذاری اولیه داده‌ها
    if (loadingData || loadingProductTypes || loadingItemsForWorkItemForm || loadingExcelTemplate || loadingFileUpload) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
                <CircularProgress />
                <Typography variant="h6" ml={2}>Veriler yükleniyor...</Typography>
            </Box>
        );
    }

    return (
        <>
            <div style={{
                borderBottom: "1px solid",
                margin: "10px 0 30px 0",
                padding: "10px 15px 30px 15px"
            }}>
                <Paper elevation={3} sx={{ p: 3, mb: 1 }}>
                    <Grid container spacing={1}>
                        <Grid item xs={12}>
                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                justifyContent="space-between"
                                alignItems={{ xs: 'stretch', sm: 'center' }}
                            >
                                <Typography variant="h4" gutterBottom>
                                    İş Detayları:
                                </Typography>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={() => fileInputRef.current?.click()}
                                        startIcon={<IconUpload />}
                                        disabled={loadingFileUpload || loadingExcelTemplate || loadingProductTypes || loadingItemsForWorkItemForm}
                                    >
                                        Excel İçe Aktar
                                        <input
                                            type="file"
                                            accept=".xlsx, .xls, .csv"
                                            onChange={handleFileUpload}
                                            ref={fileInputRef}
                                            style={{ display: 'none' }}
                                        />
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        color="secondary"
                                        onClick={handleDownloadExcelTemplate}
                                        startIcon={<IconDownload />}
                                        disabled={loadingExcelTemplate || loadingFileUpload}
                                    >
                                        Şablonu İndir
                                    </Button>
                                    <Button
                                        variant="contained"
                                        color="info"
                                        onClick={handleExportExcel}
                                        startIcon={<IconUpload style={{ transform: 'rotate(180deg)' }} />}
                                        disabled={registeredWorkEntries.length === 0 || loadingExcelTemplate}
                                    >
                                        Excel Dışa Aktar
                                    </Button>
                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Geri dön" : ""}>
                                        <Button variant="outlined" color="error" onClick={() => navigate(-1)}
                                            endIcon={<IconArrowRight size={20} />}>
                                            Geri Dön
                                        </Button>
                                    </CustomTooltip>
                                </Stack>
                                {/* <CustomFormLabel>Yeni Öğeleri Kaydet</CustomFormLabel> */}
                            </Stack>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <CustomFormLabel htmlFor="tr-adi" required>TR ADI</CustomFormLabel>
                            <TextField
                                id="tr-adi"
                                placeholder="TR ADI"
                                fullWidth
                                value={trAdi}
                                onChange={(e) => setTrAdi(e.target.value)}
                                variant="outlined"
                                size="small"
                                disabled={trAdiRegistered && !isEditingSubEntry}
                            />
                            {trAdiRegistered && !isEditingSubEntry && (
                                <Button
                                    variant="outlined"
                                    color="secondary"
                                    onClick={handleStartNewTrAdiEntry}
                                    sx={{ mt: 1, width: '100%' }}
                                >
                                    Yeni TR ADI Oluştur
                                </Button>
                            )}
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%', mb: 0.5 }}>
                                <CustomFormLabel htmlFor="product-type-autocomplete" sx={{ mb: 0, flexShrink: 0 }} required>D.N</CustomFormLabel>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={handleOpenNewDirectModal}
                                    sx={{ minWidth: 'auto', p: 0.8, ml: 'auto' }}
                                >
                                    <CustomTooltip title="Yeni Direk Kaydet">
                                        <IconPlus size={20} />
                                    </CustomTooltip>
                                </Button>
                            </Stack>
                            <Autocomplete
                                id="product-type-autocomplete"
                                options={filteredProductTypes}
                                getOptionLabel={(option) => option.name}
                                isOptionEqualToValue={(option, value) => option.id === value.id}
                                value={selectedProduct}
                                onChange={(_event, newValue) => {
                                    setSelectedProduct(newValue);
                                    if (selectedProductError && newValue) {
                                        setSelectedProductError(false);
                                        setSelectedProductHelperText('');
                                    }
                                }}
                                onOpen={() => {
                                    if (productAutocompleteTextFieldRef.current) {
                                        productAutocompleteTextFieldRef.current.focus();
                                    }
                                }}
                                onClose={() => { }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="D.N Seçin"
                                        variant="outlined"
                                        size="small"
                                        error={selectedProductError}
                                        helperText={selectedProductHelperText}
                                        inputRef={productAutocompleteTextFieldRef}
                                        InputProps={{
                                            ...params.InputProps,
                                            endAdornment: (
                                                <>
                                                    {loadingProductTypes ? <CircularProgress color="inherit" size={20} /> : null}
                                                    {params.InputProps.endAdornment}
                                                </>
                                            ),
                                        }}
                                        onClick={(e) => { e.stopPropagation(); }}
                                        onKeyDown={(e) => { e.stopPropagation(); }}
                                    />
                                )}
                                loading={loadingProductTypes}
                                disabled={loadingProductTypes}
                                noOptionsText="Hiç öğe bulunamadı."
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl component="fieldset" error={yeniError || dmmError || mevcutError} fullWidth>
                                <FormLabel component="legend">Miktar Tipi</FormLabel>
                                <RadioGroup
                                    row={false}
                                    name="quantity-type"
                                    value={selectedRadioOption}
                                    onChange={(e) => {
                                        setSelectedRadioOption(e.target.value as 'yeni' | 'dmm' | 'mevcut');
                                        setYeniError(false); setYeniHelperText('');
                                        setDmmError(false); setDmmHelperText('');
                                        setMevcutError(false); setMevcutHelperText('');
                                        setYeniValue('');
                                        setDmmValue('');
                                        setMevcutValue('');
                                    }}
                                    sx={{
                                        flexDirection: { xs: 'column', sm: 'row' },
                                        flexWrap: 'wrap',
                                        '& .MuiFormControlLabel-root': {
                                            marginBottom: { xs: 1, sm: 0 },
                                            marginRight: { xs: 0, sm: 1 },
                                            width: { xs: '100%', sm: 'auto' },
                                        },
                                        '& .MuiTextField-root': {
                                            width: { xs: '100%', sm: '100px' },
                                            marginBottom: { xs: 1, sm: 0 },
                                            marginRight: { xs: 0, sm: 2 },
                                        },
                                    }}
                                >
                                    <FormControlLabel
                                        value="yeni"
                                        control={<Radio size="small" />}
                                        label="YENİ"
                                    />
                                    <TextField
                                        id="yeni-input"
                                        placeholder="Miktar"
                                        size="small"
                                        value={yeniValue}
                                        onChange={(e) => setYeniValue(e.target.value)}
                                        disabled={selectedRadioOption !== 'yeni'}
                                        error={selectedRadioOption === 'yeni' && yeniError}
                                        helperText={selectedRadioOption === 'yeni' && yeniHelperText}
                                    />

                                    <FormControlLabel
                                        value="dmm"
                                        control={<Radio size="small" />}
                                        label="DMM"
                                    />
                                    <TextField
                                        id="dmm-input"
                                        placeholder="Miktar"
                                        size="small"
                                        value={dmmValue}
                                        onChange={(e) => setDmmValue(e.target.value)}
                                        disabled={selectedRadioOption !== 'dmm'}
                                        error={selectedRadioOption === 'dmm' && dmmError}
                                        helperText={selectedRadioOption === 'dmm' && dmmHelperText}
                                    />

                                    <FormControlLabel
                                        value="mevcut"
                                        control={<Radio size="small" />}
                                        label="MEVCUT"
                                    />
                                    <TextField
                                        id="mevcut-input"
                                        placeholder="Miktar"
                                        size="small"
                                        value={mevcutValue}
                                        onChange={(e) => setMevcutValue(e.target.value)}
                                        disabled={selectedRadioOption !== 'mevcut'}
                                        error={selectedRadioOption === 'mevcut' && mevcutError}
                                        helperText={selectedRadioOption === 'mevcut' && mevcutHelperText}
                                    />
                                </RadioGroup>
                                {(yeniError || dmmError || mevcutError) && (
                                    <Typography color="error" variant="caption" sx={{ ml: 1.5, mt: 0.5 }}>
                                        Lütfen seçilen miktar alanını doldurun!
                                    </Typography>
                                )}
                            </FormControl>
                        </Grid>

                        <Grid item xs={12}>
                            <WorkItemInputForm
                                availableItems={filteredItemsForWorkItemForm}
                                // availableItems={itemsListForWorkItemForm}
                                onAddItem={handleAddItemToRegister}
                                itemsToRegister={itemsToRegister}
                                onRemoveItem={handleRemoveItemToRegister}
                                onEditItem={handleEditItemToRegister}
                                itemToEdit={itemToEditInForm}
                                loadingAvailableItems={loadingItemsForWorkItemForm}
                            />
                        </Grid>

                        {(unregisteredProductTypes.length > 0 || unregisteredItems.length > 0) && (
                            <Grid item xs={12}>
                                <Typography variant="h6" color="error" mt={3} mb={1}>
                                    Aşağıdaki öğeler sistemde bulunamadı. Lütfen kaydedin:
                                </Typography>
                                {unregisteredProductTypes.length > 0 && (
                                    <Box sx={{ mb: 2, border: '1px dashed red', p: 1, borderRadius: '4px' }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                            <Typography variant="subtitle1" component="div">
                                                Kaydedilmemiş D.N türleri ({unregisteredProductTypes.length} adet):
                                            </Typography>
                                            {unregisteredProductTypes.length > 5 && (
                                                <IconButton onClick={() => setIsUnregisteredProductTypesExpanded(prev => !prev)} size="small">
                                                    {isUnregisteredProductTypesExpanded ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
                                                </IconButton>
                                            )}
                                        </Stack>
                                        <Stack direction="row" spacing={1} flexWrap="wrap"
                                            sx={{
                                                maxHeight: isUnregisteredProductTypesExpanded ? 'none' : '60px',
                                                overflow: 'hidden',
                                                transition: 'max-height 0.3s ease-in-out',
                                                pb: 1
                                            }}
                                        >
                                            {unregisteredProductTypes.map((dnName, index) => (
                                                <Chip
                                                    key={`unreg-dn-${index}`}
                                                    label={
                                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                            {dnName}
                                                            <IconButton
                                                                size="small"
                                                                sx={{ ml: 0.5 }}
                                                                onClick={() => handleOpenNewDirectModalFromUnregistered(dnName)}
                                                            >
                                                                <IconPlus size={16} />
                                                            </IconButton>
                                                        </Box>
                                                    }
                                                    variant="outlined"
                                                    color="error"
                                                    sx={{
                                                        borderColor: 'red',
                                                        borderWidth: 1.5,
                                                        borderStyle: 'dashed',
                                                        '.MuiChip-label': { pr: 0 }
                                                    }}
                                                />
                                            ))}
                                        </Stack>
                                    </Box>
                                )}

                                {unregisteredItems.length > 0 && (
                                    <Box sx={{ border: '1px dashed red', p: 1, borderRadius: '4px' }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                            <Typography variant="subtitle1" component="div">
                                                Kaydedilmemiş Öğe türleri ({unregisteredItems.length} adet):
                                            </Typography>
                                            {unregisteredItems.length > 5 && (
                                                <IconButton onClick={() => setIsUnregisteredItemsExpanded(prev => !prev)} size="small">
                                                    {isUnregisteredItemsExpanded ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
                                                </IconButton>
                                            )}
                                        </Stack>
                                        <Stack direction="row" spacing={1} flexWrap="wrap"
                                            sx={{
                                                maxHeight: isUnregisteredItemsExpanded ? 'none' : '60px',
                                                overflow: 'hidden',
                                                transition: 'max-height 0.3s ease-in-out',
                                                pb: 1
                                            }}
                                        >
                                            {unregisteredItems.map((itemName, index) => (
                                                <Chip
                                                    key={`unreg-item-${index}`}
                                                    label={
                                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                            {itemName}
                                                            <IconButton
                                                                size="small"
                                                                sx={{ ml: 0.5 }}
                                                                onClick={() => handleOpenNewItemModal(itemName)}
                                                            >
                                                                <IconPlus size={16} />
                                                            </IconButton>
                                                        </Box>
                                                    }
                                                    variant="outlined"
                                                    color="error"
                                                    sx={{
                                                        borderColor: 'red',
                                                        borderWidth: 1.5,
                                                        borderStyle: 'dashed',
                                                        '.MuiChip-label': { pr: 0 }
                                                    }}
                                                />
                                            ))}
                                        </Stack>
                                    </Box>
                                )}
                            </Grid>
                        )}
                        <Grid item xs={12}>
                            <Stack direction="row" spacing={1} justifyContent="flex-end" mt={2}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={isEditingSubEntry ? handleUpdateSubEntry : handleRegisterNewEntry}
                                    disabled={loadingRegisterButton || itemsToRegister.length === 0}
                                >
                                    {loadingRegisterButton ? (
                                        <>
                                            <CircularProgress size={20} sx={{ mr: 1 }} /> Kaydediliyor...
                                        </>
                                    ) : isEditingSubEntry ? 'Güncelle' : 'Yeni Kayıt Yap'}
                                </Button>
                                {isEditingSubEntry && (
                                    <Button
                                        variant="outlined"
                                        color="secondary"
                                        onClick={resetMainFormFields}
                                        disabled={loadingRegisterButton}
                                    >
                                        İptal
                                    </Button>
                                )}
                                {registeredWorkEntries.length > 0 && (
                                    <Button
                                        variant="contained"
                                        color="success"
                                        onClick={handleSendAllRegisteredData}
                                        disabled={loadingRegisterButton}
                                    >
                                        Tüm Kayıtları Gönder
                                    </Button>
                                )}
                            </Stack>
                        </Grid>
                    </Grid>
                </Paper>
                {alertMessage && (
                    <Stack sx={{ width: '100%', mt: 2 }} spacing={2}>
                        <Alert severity={alertSeverity} onClose={clearAlert}>
                            {alertMessage}
                        </Alert>
                    </Stack>
                )}
            </div>
            <BlankCard>
                <Box sx={{ p: 2 }}>
                    <Typography variant="h5" mb={2}>Kayıtlı İş Detayları Tablosu</Typography>
                    <WorkDetailsTable
                        registeredWorkEntries={registeredWorkEntries}
                        onEditTrAdi={handleEditTrAdiFromTable}
                        onDeleteTrAdi={handleDeleteTrAdiFromTable}
                        onDeleteSubEntry={handleDeleteSubEntryFromTable}
                        onTrAdiEditedInTable={handleTrAdiEditedInTable}
                        onLoadSubEntryForEdit={handleLoadSubEntryForEdit}
                    />
                </Box>
            </BlankCard>
            <Dialog
                open={openNewDirectModal}
                onClose={handleCloseNewDirectModal}
                aria-labelledby="new-direct-modal-title"
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle id="new-direct-modal-title">Yeni Direk Kaydet</DialogTitle>
                <DialogContent dividers>
                    <DialogContentText component="div">
                        <CustomFormLabel htmlFor="new-direct-name" required>Direk Adı</CustomFormLabel>
                        <TextField
                            id="new-direct-name"
                            fullWidth
                            variant="outlined"
                            size="small"
                            placeholder="Direk Adı Girin"
                            value={newDirectName}
                            onChange={(e) => {
                                setNewDirectName(e.target.value);
                                if (newDirectNameError && e.target.value.trim()) {
                                    setNewDirectNameError(false);
                                    setNewDirectNameHelperText('');
                                }
                            }}
                            error={newDirectNameError}
                            helperText={newDirectNameHelperText}
                        />
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseNewDirectModal} disabled={loadingNewDirectButton}>İptal</Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSaveNewDirect}
                        disabled={loadingNewDirectButton}
                    >
                        {loadingNewDirectButton ? (
                            <>
                                <CircularProgress size={20} sx={{ mr: 1 }} /> Kaydediliyor...
                            </>
                        ) : 'Kaydet'}
                    </Button>
                </DialogActions>
            </Dialog>
            <RegisterUnregisteredItemModal
                open={openNewItemModal}
                onClose={handleCloseNewItemModal}
                onRegisterSuccess={handleRegisterItemSuccess}
                initialData={initialItemModalData}
                showAlert={showAlert}
            />
        </>
    );
};

export default WorkDetails;