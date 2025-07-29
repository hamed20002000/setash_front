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

// ✅ تغییر: اینترفیس‌ها را export کنید تا WorkDetailsTable بتواند آنها را ایمپورت کند
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
}

export interface WorkDetailRow {
    id: string;
    trAdi: string;
    subEntries: WorkDetailSubEntry[];
}


// ✅ WorkItemInputForm, WorkDetailsTable را ایمپورت کنید
import WorkItemInputForm, { AvailableItemOption } from './WorkItemInputForm';
import WorkDetailsTable from './WorkDetailsTable';

import { IconDownload, IconUpload, IconPlus } from '@tabler/icons-react';
import * as XLSX from 'xlsx';
import { CustomTooltip } from 'src/context/TooltipContext';

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

    // ✅ NEW States for editing sub-entries
    const [editingSubEntry, setEditingSubEntry] = useState<WorkDetailSubEntry | null>(null);
    const [isEditingSubEntry, setIsEditingSubEntry] = useState<boolean>(false);


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


    const resetMainFormFields = useCallback(() => { // ✅ Add useCallback
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
        setItemsToRegister([]); // ✅ Reset items to register when resetting form
        setEditingSubEntry(null); // ✅ Reset editing state
        setIsEditingSubEntry(false); // ✅ Reset editing state
    }, []); // ✅ Empty dependency array as this function doesn't depend on other state


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
        // Burada eğer workId یا tenderId از URL موجود باشد،
        // می‌توانید اطلاعات ثبت شده کار را از API واکشی کنید
        // و setRegisteredWorkEntries را با آنها پر کنید.
        // در حال حاضر این تابع خالی است.
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
            id: String(Date.now()), // Unique ID for sub-entry
            trAdiParentId: '', // Will be set below
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
                    if (row.trAdi === trAdi) { // Match by trAdi name if trAdiRegistered is true
                        return { ...row, subEntries: [...row.subEntries, { ...newSubEntry, trAdiParentId: row.id }] };
                    }
                    return row;
                })
            );
        }

        showAlert('Yeni giriş başarıyla tabloya eklendi!', 'success');
        resetMainFormFields(); // ✅ ریست کردن تمام فیلدها و حالت ویرایش
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
            // از یک کپی برای جلوگیری از تغییر مستقیم حالت استفاده کنید
            const newRegisteredWorkEntries: WorkDetailRow[] = [...registeredWorkEntries];


            for (let R = 3; R <= range.e.r; R++) {
                const trAdiFromExcel = getCleanCellValue(R, 0);
                const dnFromExcel = getCleanCellValue(R, 1);
                const yeniFromExcel = getCleanCellValue(R, 2);
                const dmmFromExcel = getCleanCellValue(R, 3);
                const mevcutFromExcel = getCleanCellValue(R, 4);

                if (trAdiFromExcel !== '') {
                    // Try to find an existing row with the same TR ADI to append to
                    currentTrAdiRow = newRegisteredWorkEntries.find(row => row.trAdi === trAdiFromExcel) || null;

                    if (!currentTrAdiRow) {
                        currentTrAdiRow = {
                            id: `tradi-${Date.now()}-${newRegisteredWorkEntries.length}`,
                            trAdi: trAdiFromExcel,
                            subEntries: []
                        };
                        newRegisteredWorkEntries.push(currentTrAdiRow);
                    }
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
                                tempId: String(Date.now() + newItemDetails.length + Math.random()), // Make tempId more unique
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
            // Check if any new entries were added to set trAdiRegistered
            if (newRegisteredWorkEntries.length > 0) {
                setTrAdi(newRegisteredWorkEntries[newRegisteredWorkEntries.length - 1]?.trAdi || '');
                setTrAdiRegistered(true); // Assuming we are now working with a registered TR ADI
            } else {
                setTrAdi('');
                setTrAdiRegistered(false);
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


    // ✅ NEW: Function to edit TR ADI from the table
    const handleEditTrAdiFromTable = useCallback((trAdiId: string, newTrAdiName: string) => {
        setRegisteredWorkEntries(prevEntries =>
            prevEntries.map(row =>
                row.id === trAdiId ? { ...row, trAdi: newTrAdiName } : row
            )
        );
        showAlert(`'${newTrAdiName}' adlı TR ADI başarıyla güncellendi!`, 'success');
    }, [showAlert]);

    // ✅ NEW: Function to delete TR ADI from the table
    const handleDeleteTrAdiFromTable = useCallback((trAdiId: string) => {
        setRegisteredWorkEntries(prevEntries => {
            const updatedEntries = prevEntries.filter(row => row.id !== trAdiId);
            // اگر TR ADI فعلی که در حال کار با آن بودیم حذف شد، فرم را ریست کن
            if (prevEntries.some(row => row.id === trAdiId && row.trAdi === trAdi)) {
                setTrAdi('');
                setTrAdiRegistered(false);
                resetMainFormFields();
            }
            return updatedEntries;
        });
        showAlert('TR ADI ve tüm alt öğeleri başarıyla silindi!', 'success');
    }, [showAlert, trAdi, resetMainFormFields]);


    // ✅ NEW: Function to load sub-entry data into the form for editing
    const handleLoadSubEntryForEdit = useCallback((subEntry: WorkDetailSubEntry) => {
        // Find the parent TR ADI and set it
        const parentTrAdi = registeredWorkEntries.find(row => row.id === subEntry.trAdiParentId)?.trAdi;
        if (parentTrAdi) {
            setTrAdi(parentTrAdi);
            setTrAdiRegistered(true); // We are now working with a registered TR ADI
        } else {
            setTrAdi('');
            setTrAdiRegistered(false);
        }

        // Set D.N
        // We need to find the actual AvailableItemOption object from productTypesList
        const product = productTypesList.find(p => p.name === subEntry.dn);
        setSelectedProduct(product || null);


        // Set YENI, DMM, MEVCUT values and corresponding radio option
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
            setSelectedRadioOption('yeni'); // Default if none are set
        }

        // Load item details for WorkItemInputForm
        setItemsToRegister([...subEntry.itemDetails]);
        setEditingSubEntry(subEntry); // Store the sub-entry being edited
        setIsEditingSubEntry(true); // Activate edit mode
        showAlert('Alt öğe formu düzenleme için yüklendi.', 'info');
    }, [showAlert, registeredWorkEntries, productTypesList]);


    // ✅ NEW: Function to update an existing sub-entry after editing in the form
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
            showAlert('Lütfen en az bir öğe ve miktar ekleyin!', 'warning');
            hasError = true;
        }

        if (hasError) {
            return;
        }

        setLoadingRegisterButton(true);

        const updatedSubEntry: WorkDetailSubEntry = {
            ...editingSubEntry,
            dn: selectedProduct ? selectedProduct.name : '',
            yeni: selectedRadioOption === 'yeni' ? selectedValue : '',
            dmm: selectedRadioOption === 'dmm' ? selectedValue : '',
            mevcut: selectedRadioOption === 'mevcut' ? selectedValue : '',
            itemDetails: [...itemsToRegister],
        };

        setRegisteredWorkEntries(prevEntries =>
            prevEntries.map(row => {
                if (row.id === updatedSubEntry.trAdiParentId) {
                    return {
                        ...row,
                        subEntries: row.subEntries.map(sub =>
                            sub.id === updatedSubEntry.id ? updatedSubEntry : sub
                        )
                    };
                }
                return row;
            })
        );
        showAlert('Alt öğe başarıyla güncellendi!', 'success');
        resetMainFormFields();
        setLoadingRegisterButton(false);
    }, [editingSubEntry, selectedProduct, selectedRadioOption, yeniValue, dmmValue, mevcutValue, itemsToRegister, showAlert, resetMainFormFields, clearAlert]);


    // ✅ NEW: Function to delete a sub-entry from the table
    const handleDeleteSubEntryFromTable = useCallback((trAdiParentId: string, subEntryId: string) => {
        setRegisteredWorkEntries(prevEntries => {
            const updatedEntries = prevEntries.map(row => {
                if (row.id === trAdiParentId) {
                    const newSubEntries = row.subEntries.filter(sub => sub.id !== subEntryId);
                    // If no sub-entries remain for this TR ADI, remove the TR ADI row
                    if (newSubEntries.length === 0) {
                        return null; // Marker for removal
                    }
                    return { ...row, subEntries: newSubEntries };
                }
                return row;
            }).filter(Boolean) as WorkDetailRow[]; // Filter out null rows

            // If the deleted sub-entry was the one being edited, reset the form
            if (editingSubEntry && editingSubEntry.id === subEntryId) {
                resetMainFormFields();
                setTrAdi(''); // Also reset trAdi if the parent row might be gone
                setTrAdiRegistered(false);
            } else if (updatedEntries.length === 0) { // If all entries are deleted
                setTrAdi('');
                setTrAdiRegistered(false);
                resetMainFormFields();
            }

            return updatedEntries;
        });
        showAlert('Alt öğe başarıyla silindi!', 'success');
    }, [showAlert, editingSubEntry, resetMainFormFields, trAdi]);


    // ✅ NEW: Function called from WorkDetailsTable to synchronize TR ADI field in parent form
    // This is useful if TR ADI is edited directly in the table.
    const handleTrAdiEditedInTable = useCallback((trAdiId: string, trAdiName: string) => {
        // Only update if the currently displayed trAdi in the form matches the edited one
        // or if no trAdi is currently displayed (meaning a new entry would be created)
        const currentTrAdiRow = registeredWorkEntries.find(row => row.id === trAdiId);
        if (currentTrAdiRow) {
            setTrAdi(trAdiName);
            setTrAdiRegistered(true); // It's now a registered TR ADI
        }
    }, [setTrAdi, setTrAdiRegistered, registeredWorkEntries]);


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
                            direction={{ xs: 'column', sm: 'row' }}
                            justifyContent="space-between"
                            alignItems={{ xs: 'stretch', sm: 'center' }}
                            spacing={1}
                            sx={{ mb: 2 }}
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
                            disabled={trAdiRegistered && !isEditingSubEntry} // ✅ TR ADI وقتی در حال ویرایش یک SubEntry هستیم هم باید غیرفعال بماند
                        />
                        {trAdiRegistered && !isEditingSubEntry && ( // ✅ وقتی در حال ویرایش SubEntry هستیم، این دکمه نمایش داده نشود
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
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%', mb: 0.5 }}>
                            <CustomFormLabel htmlFor="product-type-autocomplete" sx={{ mb: 0, flexShrink: 0 }}>D.N</CustomFormLabel>
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
                                onClick={isEditingSubEntry ? handleUpdateSubEntry : handleRegisterNewEntry} // ✅ اینجا
                                disabled={loadingRegisterButton || itemsToRegister.length === 0}
                            >
                                {loadingRegisterButton ? (
                                    <>
                                        <CircularProgress size={20} sx={{ mr: 1 }} /> Kaydediliyor...
                                    </>
                                ) : isEditingSubEntry ? 'Güncelle' : 'Yeni Kayıt Yap'} {/* ✅ اینجا */}
                            </Button>
                            {isEditingSubEntry && ( // ✅ دکمه لغو در حالت ویرایش زیرمجموعه
                                <Button
                                    variant="outlined"
                                    color="secondary"
                                    onClick={resetMainFormFields}
                                    disabled={loadingRegisterButton}
                                >
                                    İptal
                                </Button>
                            )}
                            {registeredWorkEntries.length > 0 && ( // نمایش "Tüm Kayıtları Gönder" فقط زمانی که ورودی ثبت شده باشد
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
                    <WorkDetailsTable
                        registeredWorkEntries={registeredWorkEntries}
                        onEditTrAdi={handleEditTrAdiFromTable}
                        onDeleteTrAdi={handleDeleteTrAdiFromTable}
                        // onEditSubEntry={() => { }}
                        onDeleteSubEntry={handleDeleteSubEntryFromTable}
                        onTrAdiEditedInTable={handleTrAdiEditedInTable} // ✅ ارسال تابع جدید
                        onLoadSubEntryForEdit={handleLoadSubEntryForEdit} // ✅ ارسال تابع جدید
                    />
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
        </>
    );
};

export default WorkDetails;