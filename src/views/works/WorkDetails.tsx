// src/views/works/WorkDetails.tsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
    Typography, Box, Stack, Grid, Button, Alert, CircularProgress, TextField,
    //  MenuItem as MuiMenuItem,
    Autocomplete,
    RadioGroup,
    FormControlLabel,
    Radio,
    FormControl,
    FormLabel
} from '@mui/material';
import CustomFormLabel from '../../components/forms/theme-elements/CustomFormLabel';
import BlankCard from '../../components/shared/BlankCard';
import axios from 'axios';
import server from '../../assets/address.json'; // مسیر فایل server شما

import WorkItemInputForm, { AvailableItemOption } from './WorkItemInputForm';
import WorkDetailsTable from './WorkDetailsTable';

import { IconDownload, IconUpload } from '@tabler/icons-react'; // ✅ IconUpload را اضافه کنید
import * as XLSX from 'xlsx';

// =======================================================================
// INTERFACES (تغییری ندارند مگر اینکه ساختار API تغییر کند)
// =======================================================================
export interface WorkItemDetail { // Exported so WorkDetailsTable can import
    id: string; // Ana öğe ID'si (from API, so string)
    tempId: string; // UI'da geçici yönetim için geçici ID
    name: string; // Öğe adı
    value: string; // Kullanıcı tarafından girilen miktar
}

interface WorkDetailSubEntry {
    id: string; // Unique ID for each sub-row
    trAdiParentId: string; // Parent TR ADI's ID
    dn: string;
    yeni: string;
    dmm: string;
    mevcut: string;
    itemDetails: WorkItemDetail[]; // Specific item details for this sub-entry
}

interface WorkDetailRow {
    id: string; // Unique ID for each TR ADI entry
    trAdi: string;
    subEntries: WorkDetailSubEntry[]; // Sub-entries belonging to this TR ADI
}

interface ProductTypesTypeFromAPI {
    id: number;
    name: string;
    createAt: string;
    recordStatus?: number;
    status?: string;
}

interface ItemTypeFromAPI {
    id: number;
    name: string;
}

// =======================================================================
// UTILITY FUNCTIONS (parseAndCleanFloat/Int are kept for Excel parsing)
// =======================================================================
// Your parseAndCleanFloat, parseAndCleanInt and other utility functions here
// For example:
// const parseAndCleanFloat = (value: string | number | null | undefined): number => {
//     if (value === null || value === undefined) return 0;
//     if (typeof value === 'number') return value;
//     let cleanedValue = String(value).replace(/\$/g, '').replace(/,/g, '.');
//     const parts = cleanedValue.split('.');
//     if (parts.length > 2) {
//         cleanedValue = parts[0] + '.' + parts.slice(1).join('');
//     }
//     cleanedValue = cleanedValue.replace(/[^0-9.]/g, '');
//     const parsed = parseFloat(cleanedValue);
//     return isNaN(parsed) ? 0 : parsed;
// };

// const parseAndCleanInt = (value: string | number | null | undefined): number => {
//     if (value === null || value === undefined) return 0;
//     if (typeof value === 'number') return value;
//     const cleanedValue = String(value).replace(/\$/g, '').replace(/,/g, '').replace(/[^0-9]/g, '');
//     const parsed = parseInt(cleanedValue, 10);
//     return isNaN(parsed) ? 0 : parsed;
// };

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
    // const [loadingInitialData, setLoadingInitialData] = useState<boolean>(false);
    const [loadingRegisterButton, setLoadingRegisterButton] = useState<boolean>(false);
    const [editingItemTempId, setEditingItemTempId] = useState<string | null>(null);

    const [excelTemplateBuffer, setExcelTemplateBuffer] = useState<ArrayBuffer | null>(null);
    const [loadingExcelTemplate, setLoadingExcelTemplate] = useState<boolean>(true);

    // ✅ Ref برای input type="file"
    const fileInputRef = useRef<HTMLInputElement>(null);
    // ✅ State برای لودینگ آپلود فایل
    const [loadingFileUpload, setLoadingFileUpload] = useState<boolean>(false);

    const hasInitialAPIDataLoaded = useRef(false);
    const hasExcelTemplateLoaded = useRef(false);


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
                const formattedData: AvailableItemOption[] = result.data.data.map((item: ProductTypesTypeFromAPI) => ({
                    id: String(item.id),
                    name: item.name,
                }));
                setProductTypesList(formattedData);
            } else {
                showAlert(result.data.message || 'Ürün türleri listesi alınamadı.', 'error');
            }
        }).catch((e) => {
            if (e.response && e.response.status === 401) {
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
                const processedData: AvailableItemOption[] = response.data.data.map((item: ItemTypeFromAPI) => ({
                    id: String(item.id),
                    name: item.name,
                }));
                setItemsListForWorkItemForm(processedData);
            } else {
                console.error("Failed to fetch items:", response.data.message);
                showAlert('Ürünler yüklenmedi.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
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


    // ✅ useEffect اصلی برای بارگذاری داده‌های API (فقط یک بار)
    useEffect(() => {
        if (!hasInitialAPIDataLoaded.current) {
            getListProductTypes();
            getListItem();
            hasInitialAPIDataLoaded.current = true;
        }
    }, [getListProductTypes, getListItem]);


    // ✅ useEffect برای بارگذاری فایل شابلون Excel (فقط یک بار)
    useEffect(() => {
        if (!hasExcelTemplateLoaded.current) {
            setLoadingExcelTemplate(true);
            // ✅ نام فایل شابلون را با دقت تایپ کنید و از public folder مطمئن شوید
            fetch('/ŞEBEKE-KANAL-TR.xlsx') // ✅ نام فایل و پسوند صحیح
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
                    // hasExcelTemplateLoaded.current = false; // اگر خطا بود، اجازه دهید دوباره امتحان کند (بسته به منطق شما)
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
    }, [showAlert, resetMainFormFields]); // resetMainFormFields نیز به وابستگی‌ها اضافه شد


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

        // ✅ CORRECTION START
        let selectedValue: string = ''; // Initialize it, or if you prefer, only declare here and assign later.
        // The warning is about it being unread after declaration.

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
        // If you intend to use selectedValue for validation, you could add a generic check here:
        // if (!selectedValue.trim() && selectedRadioOption !== 'none' /* assuming 'none' is an option where value isn't needed */) {
        //    showAlert('Seçilen miktar alanı boş bırakılamaz!', 'warning');
        //    hasError = true;
        // }
        // ✅ CORRECTION END

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
            // ✅ Use selectedValue here instead of conditional checks on individual values
            yeni: selectedRadioOption === 'yeni' ? selectedValue : '', // Use selectedValue here
            dmm: selectedRadioOption === 'dmm' ? selectedValue : '',    // Use selectedValue here
            mevcut: selectedRadioOption === 'mevcut' ? selectedValue : '', // Use selectedValue here
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

    // ✅ تابع برای دانلود شابلون Excel (قبلا تعریف شده بود، نیازی به تغییر نیست)
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


    // ✅ تابع جدید برای آپلود و پردازش فایل Excel
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

            // ✅ START OF REVISIONS FOR UNDEFINED ERROR
            // 1. Check if workbook exists and has at least one sheet
            if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
                showAlert('Excel dosyası geçersiz veya içinde hiçbir sayfa bulunamadı.', 'error');
                setLoadingFileUpload(false);
                return;
            }

            // Get the first sheet name. The '!' asserts it won't be undefined.
            // This is safe because we just checked workbook.SheetNames.length > 0
            const sheetName = workbook.SheetNames[0]!;
            const worksheet = workbook.Sheets[sheetName];

            // 2. Check if the worksheet itself exists
            if (!worksheet) {
                showAlert('Belirtilen sayfaya sahip çalışma sayfası bulunamadı.', 'error'); // More specific message
                setLoadingFileUpload(false);
                return;
            }

            // 3. Validate '!ref' property and the minimum dimensions
            //    Moved here to be after 'worksheet' is confirmed to exist.
            if (!worksheet['!ref']) {
                showAlert('Excel dosyası formatı geçersiz: Sayfa aralığı bilgisi bulunamadı.', 'error');
                setLoadingFileUpload(false);
                return;
            }

            const range = XLSX.utils.decode_range(worksheet['!ref']);

            // Corrected range check:
            // range.e.r is 0-indexed, so 2 means 3rd row (index 0, 1, 2)
            // range.e.c is 0-indexed, so 4 means 5th column (index 0, 1, 2, 3, 4)
            // Your requirement: minimum 5 main columns (A-E) and 3 header rows.
            // The first data row starts at R=3, so range.e.r should be at least 3 for data to exist.
            // For headers, you read from R=2. So minimum usable sheet should have R=2 and C=4 for main headers.
            // If data rows are expected, then range.e.r must be at least 3.
            if (range.e.r < 3 || range.e.c < 4) { // Assumes headers are in row 2 (index 1) and data starts from row 3 (index 2)
                showAlert('Excel dosyası boş veya formatı geçersiz (minimum 5 ana sütun ve en az 4 satır veri bekleniyor).', 'error');
                setLoadingFileUpload(false);
                return;
            }
            // ✅ END OF REVISIONS

            const getCleanCellValue = (rowIdx: number, colIdx: number): string => {
                const cellAddress = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
                const cell = worksheet[cellAddress];
                return cell && cell.v !== undefined && cell.v !== null ? String(cell.v).trim() : '';
            };

            const itemDefinitions: { name: string; nameColIdx: number; valueColIdx: number }[] = [];

            // Loop through columns starting from F (index 5)
            // C will increment by 1 in the loop. If an item name + value pair is found, C will be incremented again (C++).
            for (let C = 5; C <= range.e.c; C++) {
                const headerNameCandidate = getCleanCellValue(2, C); // Read header from Row 3 (index 2), current Column C

                if (headerNameCandidate !== '') { // If this column has a non-empty header, it's an item name candidate
                    const valueColIdx = C + 1; // The next column is expected to be its value column

                    if (valueColIdx <= range.e.c) {
                        // ✅ Case 1: Item name header found AND its value column exists within the sheet's used range
                        itemDefinitions.push({
                            name: headerNameCandidate,
                            nameColIdx: C,
                            valueColIdx: valueColIdx
                        });
                        C++; // Increment C again to skip the value column, and prepare for the *next* item name column
                    } else {
                        // ✅ Case 2: Item name header found BUT its value column is beyond the sheet's used range.
                        console.warn(
                            `Excel'de "${headerNameCandidate}" öğesi için beklenen değer sütunu (${XLSX.utils.encode_col(valueColIdx)}) ` +
                            `bulunamadı (kullanılan alanın dışında). Bu öğe başlığı ve ilgili veriler atlanacaktır.`
                        );
                        showAlert(
                            `Excel'de "${headerNameCandidate}" öğesi için değer sütunu bulunamadı. Bu öğe başlığı atlandı.`,
                            'warning'
                        );
                        // Do NOT increment C again here, as we didn't consume the value column.
                        // The outer loop's C++ will take care of moving to the next column.
                    }
                }
                // If headerNameCandidate is empty (like G3, I3, etc. in your screenshot),
                // we simply continue the loop. This means this column is not an item name header,
                // and it's implicitly considered a value column for the *previous* item.
                // The outer loop's C++ will advance to the next column.
            }

            let currentTrAdiRow: WorkDetailRow | null = null;
            let currentSubEntryIdCounter = 1;
            const newRegisteredWorkEntries: WorkDetailRow[] = [...registeredWorkEntries];

            // Start reading data from Row 4 (index 3)
            for (let R = 3; R <= range.e.r; R++) {
                const trAdiFromExcel = getCleanCellValue(R, 0); // Column A
                const dnFromExcel = getCleanCellValue(R, 1);     // Column B
                const yeniFromExcel = getCleanCellValue(R, 2);   // Column C
                const dmmFromExcel = getCleanCellValue(R, 3);    // Column D
                const mevcutFromExcel = getCleanCellValue(R, 4); // Column E

                if (trAdiFromExcel !== '') {
                    currentTrAdiRow = {
                        id: `tradi-${Date.now()}-${newRegisteredWorkEntries.length}`,
                        trAdi: trAdiFromExcel,
                        subEntries: []
                    };
                    newRegisteredWorkEntries.push(currentTrAdiRow);
                }

                // This check ensures that if the first TR ADI is missing, it will catch it early.
                // If trAdiFromExcel is empty for a row, but currentTrAdiRow is null, it means
                // we haven't encountered a TR ADI yet, which is an invalid state based on your logic.
                if (!currentTrAdiRow) {
                    showAlert('Excel dosyasının formatı geçersiz: İlk satırlarda TR ADI bulunamadı.', 'error');
                    setLoadingFileUpload(false);
                    return;
                }

                // Check if this row contains any data for a sub-entry (D.N, YENİ, DMM, MEVCUT, or any item)
                const hasSubEntryData = (
                    dnFromExcel !== '' ||
                    yeniFromExcel !== '' ||
                    dmmFromExcel !== '' ||
                    mevcutFromExcel !== '' ||
                    itemDefinitions.some(itemDef => getCleanCellValue(R, itemDef.nameColIdx) !== '' || getCleanCellValue(R, itemDef.valueColIdx) !== '')
                );

                if (hasSubEntryData) {
                    const newItemDetails: WorkItemDetail[] = [];
                    // Process item details using itemDefinitions
                    itemDefinitions.forEach(itemDef => {
                        // For data rows, the itemName is read directly from the data cell (not the header name).
                        const itemName = getCleanCellValue(R, itemDef.nameColIdx);
                        const itemValue = getCleanCellValue(R, itemDef.valueColIdx);

                        // Only add if the value is not empty (e.g., '0' is valid, '' is not)
                        if (itemValue !== '') {
                            newItemDetails.push({
                                id: `item-${Date.now()}-${newItemDetails.length}`,
                                tempId: String(Date.now() + newItemDetails.length),
                                name: itemName !== '' ? itemName : itemDef.name, // Use actual cell value if present, else header name
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

    if (
        // loadingInitialData || 
        loadingProductTypes || loadingItemsForWorkItemForm || loadingExcelTemplate || loadingFileUpload) { // ✅ اضافه شدن loadingFileUpload
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
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                            <Typography variant="h4" gutterBottom>
                                İş Detayları:
                            </Typography>
                            <Stack direction="row" spacing={1}> {/* Stack برای دکمه‌های Import و Download */}
                                {/* ✅ دکمه آپلود فایل Excel */}
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
                                {/* دکمه دانلود شابلون Excel */}
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
                    <Grid item xs={12} sm={6} md={6}>
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
                    <Grid item xs={12} sm={6} md={6}>
                        <CustomFormLabel htmlFor="product-type-autocomplete">D.N</CustomFormLabel>
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
                                row
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
                            >
                                <FormControlLabel
                                    value="yeni"
                                    control={<Radio size="small" />}
                                    label="YENİ"
                                    sx={{ mr: 1 }}
                                />
                                <TextField
                                    id="yeni-input"
                                    placeholder="Miktar"
                                    size="small"
                                    sx={{ width: 100, mr: 2 }}
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
                                    sx={{ mr: 1 }}
                                />
                                <TextField
                                    id="dmm-input"
                                    placeholder="Miktar"
                                    size="small"
                                    sx={{ width: 100, mr: 2 }}
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
                                    sx={{ mr: 1 }}
                                />
                                <TextField
                                    id="mevcut-input"
                                    placeholder="Miktar"
                                    size="small"
                                    sx={{ width: 100 }}
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
        </>
    );
};

export default WorkDetails;