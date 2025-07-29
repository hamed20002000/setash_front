// src/views/works/WorkDetails.tsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
    Typography, Box, Stack, Grid, Button, Alert, CircularProgress, TextField,
    Autocomplete,
    RadioGroup,
    FormControlLabel,
    Radio,
    FormControl,
    FormLabel,
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import CustomFormLabel from '../../components/forms/theme-elements/CustomFormLabel';
import BlankCard from '../../components/shared/BlankCard';
import axios from 'axios';
import server from '../../assets/address.json';

import WorkItemInputForm, { AvailableItemOption } from './WorkItemInputForm';
import WorkDetailsTable from './WorkDetailsTable';

import { IconDownload, IconUpload, IconPlus } from '@tabler/icons-react'; // IconPlus is correctly imported now
import * as XLSX from 'xlsx';
import { CustomTooltip } from 'src/context/TooltipContext';

// =======================================================================
// INTERFACES
// =======================================================================
export interface WorkItemDetail {
    id: string;
    tempId: string;
    name: string;
    value: string;
}

interface WorkDetailSubEntry {
    id: string;
    trAdiParentId: string;
    dn: string;
    yeni: string;
    dmm: string;
    mevcut: string;
    itemDetails: WorkItemDetail[];
}

interface WorkDetailRow {
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

// =======================================================================
// REACT COMPONENT STARTS HERE
// =======================================================================
const WorkDetails = () => {
    const navigate = useNavigate();
    const { workId } = useParams();
    const [searchParams] = useSearchParams();
    const tenderId = searchParams.get('tenderId');

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

    const [productTypesList, setProductTypesList] = useState<AvailableItemOption[]>([]);
    const [itemsListForWorkItemForm, setItemsListForWorkItemForm] = useState<AvailableItemOption[]>([]);

    const [loadingProductTypes, setLoadingProductTypes] = useState<boolean>(true);
    const [loadingItemsForWorkItemForm, setLoadingItemsForWorkItemForm] = useState<boolean>(true);

    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
    const [loadingRegisterButton, setLoadingRegisterButton] = useState<boolean>(false);
    const [editingItemTempId, setEditingItemTempId] = useState<string | null>(null);

    const [excelTemplateBuffer, setExcelTemplateBuffer] = useState<ArrayBuffer | null>(null);
    const [loadingExcelTemplate, setLoadingExcelTemplate] = useState<boolean>(true);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loadingFileUpload, setLoadingFileUpload] = useState<boolean>(false);

    const hasInitialAPIDataLoaded = useRef(false);
    const hasExcelTemplateLoaded = useRef(false);

    // 🟢 NEW States for "Register New Direct" modal
    const [openNewDirectModal, setOpenNewDirectModal] = useState<boolean>(false);
    const [newDirectName, setNewDirectName] = useState<string>(''); // For the new product type name
    const [newDirectNameError, setNewDirectNameError] = useState<boolean>(false);
    const [newDirectNameHelperText, setNewDirectNameHelperText] = useState<string>('');
    const [loadingNewDirectButton, setLoadingNewDirectButton] = useState<boolean>(false); // For the new product type save button


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


    const resetMainFormFields = () => {
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
    };

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
                setProductTypesList(formattedData);
            } else {
                showAlert(result.data.message || 'Ürün türleri listesi alınamadı.', 'error');
            }
        }).catch((e) => {
            if (axios.isAxiosError(e) && e.response?.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                console.error("Ürün türleri listesi alınırken hata:", e);
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
            console.warn("Kimlik doğrulama belirteci bulunamadı, oturum açma sayfasına yönlendiriliyor.");
            navigate("/");
            showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            setLoadingItemsForWorkItemForm(false);
            return;
        }
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
                    }));
                setItemsListForWorkItemForm(processedData);
            } else {
                console.error("Failed to fetch items:", response.data.message);
                showAlert('Ürünler yüklenmedi.', 'error');
            }
        } catch (e: any) {
            if (axios.isAxiosError(e) && e.response?.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                console.error("Error fetching items:", e);
                showAlert('Ürünler sunucudan alınamadı', 'error');
            }
        } finally {
            setLoadingItemsForWorkItemForm(false);
        }
    }, [navigate, showAlert]);

    useEffect(() => {
        if (!hasInitialAPIDataLoaded.current) {
            getListProductTypes();
            getListItem();
            hasInitialAPIDataLoaded.current = true;
        }
    }, [getListProductTypes, getListItem]);

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
                    console.error("Excel şablonu yüklenirken hata oluştu:", error);
                    showAlert('Excel şablonu yüklenirken hata oluştu.', 'error');
                    setLoadingExcelTemplate(false);
                });
        }
    }, [showAlert]);


    const getInitialData = useCallback(() => {
    }, []);

    useEffect(() => {
        getInitialData();
    }, [workId, tenderId, getInitialData]);


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
        };

        if (!trAdiRegistered) {
            const newTrAdiRowId = `tradi-${Date.now()}`;
            const newTrAdiRow: WorkDetailRow = {
                id: newTrAdiRowId,
                trAdi: trAdi,
                subEntries: [{ ...newSubEntry, trAdiParentId: newTrAdiRowId }]
            };
            setRegisteredWorkEntries(prev => [...prev, newTrAdiRow]);
            setTrAdiRegistered(true);
        } else {
            setRegisteredWorkEntries(prevEntries =>
                prevEntries.map(row => {
                    if (row.trAdi === trAdi) {
                        return { ...row, subEntries: [...row.subEntries, { ...newSubEntry, trAdiParentId: row.id }] };
                    }
                    return row;
                })
            );
        }

        showAlert('Yeni giriş başarıyla tabloya eklendi!', 'success');
        setItemsToRegister([]);
        setSelectedProduct(null);
        setYeniValue('');
        setDmmValue('');
        setMevcutValue('');
        setSelectedRadioOption('yeni');

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

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            showAlert('Lütfen bir Excel dosyası seçin.', 'warning');
            return;
        }

        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel', // .xls
            'text/csv'
        ];
        if (!allowedTypes.includes(file.type)) {
            showAlert('Sadece Excel dosyaları (.xlsx, .xls, .csv) kabul edilir.', 'error');
            return;
        }

        setLoadingFileUpload(true);
        showAlert('Excel dosyası işleniyor...', 'info');

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

            if (range.e.r < 3 || range.e.c < 4) {
                showAlert('Excel dosyası boş veya formatı geçersiz (minimum 5 ana sütun ve en az 4 satır veri bekleniyor).', 'error');
                setLoadingFileUpload(false);
                return;
            }

            const getCleanCellValue = (rowIdx: number, colIdx: number): string => {
                const cellAddress = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
                const cell = worksheet[cellAddress];
                return cell && cell.v !== undefined && cell.v !== null ? String(cell.v).trim() : '';
            };

            const itemDefinitions: { name: string; nameColIdx: number; valueColIdx: number }[] = [];

            for (let C = 5; C <= range.e.c; C++) {
                const headerNameCandidate = getCleanCellValue(2, C);

                if (headerNameCandidate !== '') {
                    const valueColIdx = C + 1;

                    if (valueColIdx <= range.e.c) {
                        itemDefinitions.push({
                            name: headerNameCandidate,
                            nameColIdx: C,
                            valueColIdx: valueColIdx
                        });
                        C++;
                    } else {
                        console.warn(
                            `Excel'de "${headerNameCandidate}" öğesi için beklenen değer sütunu (${XLSX.utils.encode_col(valueColIdx)}) ` +
                            `bulunamadı (kullanılan alanın dışında). Bu öğe başlığı ve ilgili veriler atlanacaktır.`
                        );
                        showAlert(
                            `Excel'de "${headerNameCandidate}" öğesi için değer sütunu bulunamadı. Bu öğe başlığı atlandı.`,
                            'warning'
                        );
                    }
                }
            }

            let currentTrAdiRow: WorkDetailRow | null = null;
            let currentSubEntryIdCounter = 1;
            const newRegisteredWorkEntries: WorkDetailRow[] = [...registeredWorkEntries];

            for (let R = 3; R <= range.e.r; R++) {
                const trAdiFromExcel = getCleanCellValue(R, 0);
                const dnFromExcel = getCleanCellValue(R, 1);
                const yeniFromExcel = getCleanCellValue(R, 2);
                const dmmFromExcel = getCleanCellValue(R, 3);
                const mevcutFromExcel = getCleanCellValue(R, 4);

                if (trAdiFromExcel !== '') {
                    currentTrAdiRow = {
                        id: `tradi-${Date.now()}-${newRegisteredWorkEntries.length}`,
                        trAdi: trAdiFromExcel,
                        subEntries: []
                    };
                    newRegisteredWorkEntries.push(currentTrAdiRow);
                }

                if (!currentTrAdiRow) {
                    showAlert('Excel dosyasının formatı geçersiz: İlk satırlarda TR ADI bulunamadı.', 'error');
                    setLoadingFileUpload(false);
                    return;
                }

                const hasSubEntryData = (
                    dnFromExcel !== '' ||
                    yeniFromExcel !== '' ||
                    dmmFromExcel !== '' ||
                    mevcutFromExcel !== '' ||
                    itemDefinitions.some(itemDef => getCleanCellValue(R, itemDef.nameColIdx) !== '' || getCleanCellValue(R, itemDef.valueColIdx) !== '')
                );

                if (hasSubEntryData) {
                    const newItemDetails: WorkItemDetail[] = [];
                    itemDefinitions.forEach(itemDef => {
                        const itemName = getCleanCellValue(R, itemDef.nameColIdx);
                        const itemValue = getCleanCellValue(R, itemDef.valueColIdx);

                        if (itemValue !== '') {
                            newItemDetails.push({
                                id: `item-${Date.now()}-${newItemDetails.length}`,
                                tempId: String(Date.now() + newItemDetails.length),
                                name: itemName !== '' ? itemName : itemDef.name,
                                value: itemValue
                            });
                        }
                    });

                    const newSubEntry: WorkDetailSubEntry = {
                        id: `${currentTrAdiRow.id}-sub-${currentSubEntryIdCounter++}`,
                        trAdiParentId: currentTrAdiRow.id,
                        dn: dnFromExcel,
                        yeni: yeniFromExcel,
                        dmm: dmmFromExcel,
                        mevcut: mevcutFromExcel,
                        itemDetails: newItemDetails,
                    };
                    currentTrAdiRow.subEntries.push(newSubEntry);
                }
            }

            setRegisteredWorkEntries(newRegisteredWorkEntries);
            showAlert('Excel dosyası başarıyla yüklendi ve tablo güncellendi!', 'success');
            setTrAdiRegistered(true);
            if (newRegisteredWorkEntries.length > 0) {
                setTrAdi(newRegisteredWorkEntries[newRegisteredWorkEntries.length - 1]?.trAdi || '');
            } else {
                setTrAdi('');
            }
            resetMainFormFields();
            setItemsToRegister([]);

        } catch (error: any) {
            console.error("Excel işleme hatası:", error);
            showAlert('Excel dosyası işlenirken bir hata oluştu. Lütfen dosyanın formatını kontrol edin.', 'error');
        } finally {
            setLoadingFileUpload(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const itemToEditInForm = editingItemTempId
        ? itemsToRegister.find(item => item.tempId === editingItemTempId) || null
        : null;

    // 🟢 Handlers for the new "Register New Direct" modal
    const handleOpenNewDirectModal = () => {
        setNewDirectName(''); // Clear previous input when opening
        setNewDirectNameError(false);
        setNewDirectNameHelperText('');
        setOpenNewDirectModal(true);
    };

    const handleCloseNewDirectModal = () => {
        setOpenNewDirectModal(false);
        setNewDirectName(''); // Clear input on close
        setNewDirectNameError(false);
        setNewDirectNameHelperText('');
        setLoadingNewDirectButton(false); // Reset loading state
    };

    // 🟢 NEW: Function to insert a new product type (Direk)
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
            console.warn("No auth token found, redirecting to login.");
            navigate("/");
            showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            setLoadingNewDirectButton(false);
            return;
        }

        try {
            const response = await axios.post(
                server.baseurl + server.initialoperations + "create-product-type",
                { name: newDirectName }, // Use the newDirectName state
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
                handleCloseNewDirectModal(); // Close the modal
                getListProductTypes(); // Refresh the Autocomplete list
            } else {
                showAlert(response.data.message || 'Yeni Direk eklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (axios.isAxiosError(e) && e.response?.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                console.error("Error inserting ProductTypes:", e);
                showAlert(e.response?.data?.message || 'Direk eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
            }
        } finally {
            setLoadingNewDirectButton(false);
        }
    };


    if (loadingProductTypes || loadingItemsForWorkItemForm || loadingExcelTemplate || loadingFileUpload) {
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
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }} // 🟢 Responsive direction
                            justifyContent="space-between"
                            alignItems={{ xs: 'stretch', sm: 'center' }} // 🟢 Responsive alignment
                            spacing={1} // 🟢 Spacing between items
                            sx={{ mb: 2 }}
                        >
                            <Typography variant="h4" gutterBottom>
                                İş Detayları:
                            </Typography>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}> {/* 🟢 Responsive direction for buttons */}
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
                            </Stack>
                        </Stack>
                        <CustomFormLabel>Yeni Öğeleri Kaydet</CustomFormLabel>
                    </Grid>

                    {/* TR ADI ve Yeni TR ADI Oluştur butonu */}
                    <Grid item xs={12} sm={6}>
                        <CustomFormLabel htmlFor="tr-adi">TR ADI</CustomFormLabel>
                        <TextField
                            id="tr-adi"
                            placeholder="TR ADI"
                            fullWidth
                            value={trAdi}
                            onChange={(e) => setTrAdi(e.target.value)}
                            variant="outlined"
                            size="small"
                            disabled={trAdiRegistered}
                        />
                        {trAdiRegistered && (
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
                    {/* D.N için Autocomplete bileşeni */}
                    <Grid item xs={12} sm={6}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%', mb: 0.5 }}> {/* 🟢 Added width: '100%' and mb for spacing from Autocomplete */}
                            <CustomFormLabel htmlFor="product-type-autocomplete" sx={{ mb: 0, flexShrink: 0 }}>D.N</CustomFormLabel> {/* 🟢 flexShrink to prevent label from shrinking */}
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={handleOpenNewDirectModal}
                                sx={{ minWidth: 'auto', p: 0.8, ml: 'auto' }} // Pushed to right
                            >
                                <CustomTooltip title="Yeni Direk Kaydet">
                                    <IconPlus size={20} />
                                </CustomTooltip>
                            </Button>
                        </Stack>
                        <Autocomplete
                            id="product-type-autocomplete"
                            options={productTypesList}
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
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="D.N Seçin"
                                    variant="outlined"
                                    size="small"
                                    error={selectedProductError}
                                    helperText={selectedProductHelperText}
                                    InputProps={{
                                        ...params.InputProps,
                                        endAdornment: (
                                            <>
                                                {loadingProductTypes ? <CircularProgress color="inherit" size={20} /> : null}
                                                {params.InputProps.endAdornment}
                                            </>
                                        ),
                                    }}
                                />
                            )}
                            loading={loadingProductTypes}
                            disabled={loadingProductTypes}
                            noOptionsText="Hiç öğe bulunamadı."
                        />
                    </Grid>

                    {/* Radyo butonları ve ilişkili TextField'lar */}
                    <Grid item xs={12}>
                        <FormControl component="fieldset" error={yeniError || dmmError || mevcutError} fullWidth>
                            <FormLabel component="legend">Miktar Tipi</FormLabel>
                            {/* 🔴 تغییر اصلی در اینجا اعمال می‌شود: `row` را بر اساس اندازه صفحه تنظیم می‌کنیم */}
                            <RadioGroup
                                row={false} // 🔴 در حالت پیش‌فرض (xs) زیر هم قرار می‌گیرند (column)
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
                                // 🔴 از sx برای ریسپانسیو کردن جهت استفاده می‌کنیم
                                sx={{
                                    flexDirection: { xs: 'column', sm: 'row' }, // در سایز کوچک (xs) ستونی، در سایز sm به بالا ردیفی
                                    flexWrap: 'wrap', // اجازه می‌دهیم که اگر جا نبود، به خط بعدی برود
                                    // 🔴 اضافه کردن فاصله بین آیتم‌ها در حالت ستونی
                                    '& .MuiFormControlLabel-root': {
                                        marginBottom: { xs: 1, sm: 0 }, // در xs فاصله پایین، در sm صفر
                                        marginRight: { xs: 0, sm: 1 }, // در xs صفر، در sm فاصله راست
                                        width: { xs: '100%', sm: 'auto' }, // در xs عرض کامل، در sm اتوماتیک
                                    },
                                    // 🔴 تنظیمات برای TextField ها داخل RadioGroup
                                    '& .MuiTextField-root': {
                                        width: { xs: '100%', sm: '100px' }, // در xs عرض کامل، در sm عرض ثابت
                                        marginBottom: { xs: 1, sm: 0 }, // در xs فاصله پایین، در sm صفر
                                        marginRight: { xs: 0, sm: 2 }, // در xs صفر، در sm فاصله راست
                                    },
                                }}
                            >
                                <FormControlLabel
                                    value="yeni"
                                    control={<Radio size="small" />}
                                    label="YENİ"
                                // sx={{ mr: { xs: 0, sm: 1 } }} // ✅ این خطوط را از اینجا حذف می‌کنیم چون در sx مربوط به RadioGroup تنظیم شدند
                                />
                                <TextField
                                    id="yeni-input"
                                    placeholder="Miktar"
                                    size="small"
                                    // sx={{ width: { xs: '90px', sm: '100px' }, mr: { xs: 1, sm: 2 } }} // ✅ این خطوط را از اینجا حذف می‌کنیم چون در sx مربوط به RadioGroup تنظیم شدند
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
                                // sx={{ mr: { xs: 0, sm: 1 } }} // ✅ این خطوط را از اینجا حذف می‌کنیم چون در sx مربوط به RadioGroup تنظیم شدند
                                />
                                <TextField
                                    id="dmm-input"
                                    placeholder="Miktar"
                                    size="small"
                                    // sx={{ width: { xs: '90px', sm: '100px' }, mr: { xs: 1, sm: 2 } }} // ✅ این خطوط را از اینجا حذف می‌کنیم چون در sx مربوط به RadioGroup تنظیم شدند
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
                                // sx={{ mr: { xs: 0, sm: 1 } }} // ✅ این خطوط را از اینجا حذف می‌کنیم چون در sx مربوط به RadioGroup تنظیم شدند
                                />
                                <TextField
                                    id="mevcut-input"
                                    placeholder="Miktar"
                                    size="small"
                                    // sx={{ width: { xs: '90px', sm: '100px' } }} // ✅ این خطوط را از اینجا حذف می‌کنیم چون در sx مربوط به RadioGroup تنظیم شدند
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
                            availableItems={itemsListForWorkItemForm}
                            onAddItem={handleAddItemToRegister}
                            itemsToRegister={itemsToRegister}
                            onRemoveItem={handleRemoveItemToRegister}
                            onEditItem={handleEditItemToRegister}
                            itemToEdit={itemToEditInForm}
                            loadingAvailableItems={loadingItemsForWorkItemForm}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <Stack direction="row" spacing={1} justifyContent="flex-end" mt={2}>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleRegisterNewEntry}
                                disabled={loadingRegisterButton || itemsToRegister.length === 0}
                            >
                                {loadingRegisterButton ? (
                                    <>
                                        <CircularProgress size={20} sx={{ mr: 1 }} /> Kaydediliyor...
                                    </>
                                ) : 'Yeni Kayıt Yap'}
                            </Button>
                            {registeredWorkEntries.length > 0 && (
                                <Button
                                    variant="contained"
                                    color="success"
                                    onClick={() => showAlert('Tüm kayıtlı öğeler sunucuya gönderiliyor...', 'info')}
                                >
                                    Tüm Kayıtları Gönder
                                </Button>
                            )}
                        </Stack>
                    </Grid>
                </Grid>

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
                    <WorkDetailsTable registeredWorkEntries={registeredWorkEntries} />
                </Box>
            </BlankCard>

            {/* 🟢 NEW Modal for "Register New Direct" */}
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
                        <CustomFormLabel htmlFor="new-direct-name">Direk Adı</CustomFormLabel>
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
                        onClick={handleSaveNewDirect} // 🟢 Call the new save function
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
        </>
    );
};

export default WorkDetails;