// TenderDetails.tsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useState, useRef, useCallback, useMemo, ChangeEvent } from 'react';
import { useParams, 
  // useNavigate
 } from 'react-router-dom';
import {
  Box, Typography, Grid, Button, Alert, Stack, 
  // CircularProgress,
  Paper, TextField, InputAdornment, FormControl,  Select, MenuItem as MuiMenuItem,
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, SelectChangeEvent
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

import BoltIcon from '@mui/icons-material/Bolt';
// Icons
import {
  IconUpload,IconPlus, IconSearch,
  IconEdit, IconTrash, 
} from '@tabler/icons-react';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';

import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import BlankCard from 'src/components/shared/BlankCard';
import "./style.css"
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

// For Excel parsing
import * as XLSX from 'xlsx';

// --- Data Interfaces ---
interface TenderDetailRow {
  id: number;
  siraNo: number; // Sıra No (شماره ردیف)
  grupKodu: string; // GRUP KODU - جدید
  olcuBrimi: string; // ÖLÇÜ BİRİMİ (واحد اندازه‌گیری) - حالا رشته است
  malzemeGDZ: number; // MALZEME (GDZ) - Input
  malzemeYuklenici: number; // MALZEME (پیمانکار) - Input
  montaj: number; // MONTAJ (نصب) - محاسبه‌شده: malzemeGDZ + malzemeYuklenici
  demontaj: number; // DEMONTAJ (برچیدن) - Input
  demontajdanMontaj: number; // DEMONTAJDAN MONTAJ (برچیدن تا نصب) - Input

  birimFiyatMalzeme?: number; // Birim Fiyat (Malzeme)
  birimFiyatMontaj?: number; // Birim Fiyat (Montaj)
  birimFiyatDemontaj?: number; // Birim Fiyat (Demontaj)
  birimFiyatDemontajMontaj?: number; // Birim Fiyat (Demontajdan Montaj)

  toplamMalzeme?: number; // Toplam (Malzeme) - Calculated: malzemeYuklenici * birimFiyatMalzeme
  toplamMontaj?: number; // Toplam (Montaj) - Calculated: montaj * birimFiyatMontaj
  toplamDemontaj?: number; // Toplam (Demontaj) - Calculated: demontaj * birimFiyatDemontaj
  toplamDemontajdanMontaj?: number; // Toplam (Demontajdan Montaj) - Calculated: demontajdanMontaj * birimFiyatDemontajMontaj
}

// گزینه‌های واحد اندازه‌گیری
// const MOCK_UNIT_OPTIONS = [
//   { id: 1, name: 'Adet' }, { id: 2, name: 'Metre' }, { id: 3, name: 'Kilogram' }, { id: 4, name: 'Litre' },
//   { id: 5, name: 'Kutu' }, { id: 6, name: 'Paket' },
// ];

// گزینه‌های GRUP KODU
const MOCK_GRUP_KODU_OPTIONS = [
  { id: 'GK001', name: 'Grup Kodu 001' },
  { id: 'GK002', name: 'Grup Kodu 002' },
  { id: 'GK003', name: 'Grup Kodu 003' },
  { id: 'GK004', name: 'Grup Kodu 004' },
  { id: 'GK005', name: 'Grup Kodu 005' },
  { id: 'GK006', name: 'Grup Kodu 006' },
];

// نرخ‌های فرضی "Birim Fiyat" برای هر واحد
const MOCK_BIRIM_FIYAT_OPTIONS = [
  { unit: 'Adet', malzeme: 10, montaj: 5, demontaj: 3, demontajdanMontaj: 8 },
  { unit: 'Metre', malzeme: 15, montaj: 7, demontaj: 4, demontajdanMontaj: 10 },
  { unit: 'Kilogram', malzeme: 20, montaj: 8, demontaj: 5, demontajdanMontaj: 12 },
  { unit: 'Litre', malzeme: 8, montaj: 4, demontaj: 2, demontajdanMontaj: 6 },
  { unit: 'Kutu', malzeme: 12, montaj: 6, demontaj: 3, demontajdanMontaj: 9 },
  { unit: 'Paket', malzeme: 11, montaj: 5.5, demontaj: 2.5, demontajdanMontaj: 8.5 },
];


const TenderDetails = () => {
  const { tenderId } = useParams<{ tenderId: string }>();
  // const navigate = useNavigate();
  const { isTooltipGloballyEnabled } = useTooltip();
  const theme = useTheme();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tenderTitle, setTenderTitle] = useState<string>('Müzayede Yükleniyor...');
  const [gridData, setGridData] = useState<TenderDetailRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  // State for the new record entry row (which will be sticky at the top)
  const [newRecordRow, setNewRecordRow] = useState<Omit<TenderDetailRow, 'id' | 'montaj' | 'toplamMalzeme' | 'toplamMontaj' | 'toplamDemontaj' | 'toplamDemontajdanMontaj' | 'birimFiyatMalzeme' | 'birimFiyatMontaj' | 'birimFiyatDemontaj' | 'birimFiyatDemontajMontaj'>>({
    siraNo: 0,
    grupKodu: '',
    olcuBrimi: '',
    malzemeGDZ: 0,
    malzemeYuklenici: 0,
    demontaj: 0,
    demontajdanMontaj: 0,
  });

  

  const [birimFiyatMalzemeNew, setBirimFiyatMalzemeNew] = useState<number>(0);
  const [birimFiyatMontajNew, setBirimFiyatMontajNew] = useState<number>(0);
  const [birimFiyatDemontajNew, setBirimFiyatDemontajNew] = useState<number>(0);
  const [birimFiyatDemontajMontajNew, setBirimFiyatDemontajMontajNew] = useState<number>(0);

  // State for the row being edited in the main table
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editingRowData, setEditingRowData] = useState<TenderDetailRow | null>(null);


  // State for GRUP KODU search (for the new record row)
  const [grupKoduSearchTerm, setGrupKoduSearchTerm] = useState('');

  const showAlert = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setAlertMessage(message);
    setAlertSeverity(severity);
    setTimeout(() => clearAlert(), 5000);
  };
  const clearAlert = () => setAlertMessage(null);

  useEffect(() => {
    if (tenderId) {
      setLoading(true);
      setTimeout(() => {
        setTenderTitle(`Müzayede: #${tenderId} - Örnek Başlık`);
        setLoading(false);
      }, 1000);
    }
  }, [tenderId]);

  // Update Birim Fiyat for new record row based on Olcu Birimi
  useEffect(() => {
    const selectedUnitRates = MOCK_BIRIM_FIYAT_OPTIONS.find(f => f.unit === newRecordRow.olcuBrimi);
    if (selectedUnitRates) {
      setBirimFiyatMalzemeNew(selectedUnitRates.malzeme);
      setBirimFiyatMontajNew(selectedUnitRates.montaj);
      setBirimFiyatDemontajNew(selectedUnitRates.demontaj);
      setBirimFiyatDemontajMontajNew(selectedUnitRates.demontajdanMontaj);
    } else {
      setBirimFiyatMalzemeNew(0);
      setBirimFiyatMontajNew(0);
      setBirimFiyatDemontajNew(0);
      setBirimFiyatDemontajMontajNew(0);
    }
  }, [newRecordRow.olcuBrimi]);


  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLoading(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        // const json = XLSX.utils.sheet_to_to_json(worksheet);
        const json = XLSX.utils.sheet_to_json(worksheet);

        const processedData: TenderDetailRow[] = json.map((row: any, index: number) => {
          const unitName = row['ÖLÇÜ BİRİMİ'] || '';
          const birimFiyatRow = MOCK_BIRIM_FIYAT_OPTIONS.find(f => f.unit === unitName);

          const gdz = Number(row['MALZEME (GDZ)']) || 0;
          const yuklenici = Number(row['MALZEME (Yüklenici)']) || 0;
          const demontaj = Number(row['DEMONTAJ']) || 0;
          const demontajdanMontaj = Number(row['DEMONTAJDAN MONTAJ']) || 0;

          const montaj = gdz + yuklenici;

          return {
            id: gridData.length + index + 1,
            siraNo: Number(row['Sıra No']) || (gridData.length + index + 1),
            grupKodu: row['GRUP KODU'] || '',
            olcuBrimi: unitName,
            malzemeGDZ: gdz,
            malzemeYuklenici: yuklenici,
            demontaj: demontaj,
            demontajdanMontaj: demontajdanMontaj,

            montaj: montaj,

            birimFiyatMalzeme: birimFiyatRow?.malzeme || 0,
            birimFiyatMontaj: birimFiyatRow?.montaj || 0,
            birimFiyatDemontaj: birimFiyatRow?.demontaj || 0,
            birimFiyatDemontajMontaj: birimFiyatRow?.demontajdanMontaj || 0,

            toplamMalzeme: yuklenici * (birimFiyatRow?.malzeme || 0),
            toplamMontaj: montaj * (birimFiyatRow?.montaj || 0),
            toplamDemontaj: demontaj * (birimFiyatRow?.demontaj || 0),
            toplamDemontajdanMontaj: demontajdanMontaj * (birimFiyatRow?.demontajdanMontaj || 0),
          };
        });
        setGridData(prev => [...prev, ...processedData]);
        showAlert('Excel dosyası başarıyla yüklendi ve işlendi!', 'success');
        setLoading(false);
      };
      reader.readAsArrayBuffer(file);
      event.target.value = '';
    }
  };

 const handleNewRecordInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
   const { name, value } = e.target;

    setNewRecordRow(prev => {
      const updatedPrev = {
        ...prev,
        [name]: (name === 'siraNo' || name === 'malzemeGDZ' || name === 'malzemeYuklenici' || name === 'demontaj' || name === 'demontajdanMontaj')
          ? Number(value) : value
      };

      // Update Birim Fiyat states if olcuBrimi changes
      if (name === 'olcuBrimi') {
        const selectedUnitRates = MOCK_BIRIM_FIYAT_OPTIONS.find(f => f.unit === value);
        setBirimFiyatMalzemeNew(selectedUnitRates?.malzeme || 0);
        setBirimFiyatMontajNew(selectedUnitRates?.montaj || 0);
        setBirimFiyatDemontajNew(selectedUnitRates?.demontaj || 0);
        setBirimFiyatDemontajMontajNew(selectedUnitRates?.demontajdanMontaj || 0);
      }

      return updatedPrev;
    });
  };

  // useEffect to recalculate the 'toplam' values for the new record row
  // whenever any of the contributing values (quantities or unit prices) change
  useEffect(() => {
    // Only proceed if newRecordRow is initialized
    if (newRecordRow) {
      // Create a temporary object to hold the latest values for calculation
      // const tempNewRecordRow = {
      //   ...newRecordRow,
      //   malzemeGDZ: newRecordRow.malzemeGDZ,
      //   malzemeYuklenici: newRecordRow.malzemeYuklenici,
      //   demontaj: newRecordRow.demontaj,
      //   demontajdanMontaj: newRecordRow.demontajdanMontaj,
      // };

      // Find the unit prices based on the selected `olcuBrimi` or use the manually entered ones
      // const selectedUnitRates = MOCK_BIRIM_FIYAT_OPTIONS.find(f => f.unit === tempNewRecordRow.olcuBrimi);

      // Recalculate montaj
      // const calculatedMontaj = tempNewRecordRow.malzemeGDZ + tempNewRecordRow.malzemeYuklenici;

      // Recalculate 'toplam' fields using the current state of quantities and unit prices
      // Ensure to use the current state of birimFiyatNew values for calculation
      // const calculatedToplamMalzeme = (tempNewRecordRow.malzemeYuklenici || 0) * (birimFiyatMalzemeNew || 0);
      // const calculatedToplamMontaj = (calculatedMontaj || 0) * (birimFiyatMontajNew || 0);
      // const calculatedToplamDemontaj = (tempNewRecordRow.demontaj || 0) * (birimFiyatDemontajNew || 0);
      // const calculatedToplamDemontajdanMontaj = (tempNewRecordRow.demontajdanMontaj || 0) * (birimFiyatDemontajMontajNew || 0);

      // We don't directly update newRecordRow here, as that would cause an infinite loop.
      // The calculations are performed to drive the display in the table cell directly.
      // The actual `newRecordRow` state update happens in `handleNewRecordInputChange`
      // and only covers the base input values, not the calculated totals or unit prices.
    }
  }, [newRecordRow.malzemeGDZ, newRecordRow.malzemeYuklenici, newRecordRow.demontaj, newRecordRow.demontajdanMontaj, newRecordRow.olcuBrimi, birimFiyatMalzemeNew, birimFiyatMontajNew, birimFiyatDemontajNew, birimFiyatDemontajMontajNew]);


  const handleAddRecord = () => {
    if (!newRecordRow.olcuBrimi || newRecordRow.siraNo === 0 || !newRecordRow.grupKodu) {
      showAlert('Sıra No, Grup Kodu ve Ölçü Birimi boş olamaz!', 'warning');
      return;
    }

    const newId = gridData.length > 0 ? Math.max(...gridData.map(row => row.id)) + 1 : 1;

    // const birimFiyatRow = MOCK_BIRIM_FIYAT_OPTIONS.find(f => f.unit === newRecordRow.olcuBrimi);

    const newRow: TenderDetailRow = {
      id: newId,
      ...newRecordRow,
      montaj: newRecordRow.malzemeGDZ + newRecordRow.malzemeYuklenici,

      // Use the 'New' birim fiyat states for the new record
      birimFiyatMalzeme: birimFiyatMalzemeNew,
      birimFiyatMontaj: birimFiyatMontajNew,
      birimFiyatDemontaj: birimFiyatDemontajNew,
      birimFiyatDemontajMontaj: birimFiyatDemontajMontajNew,

      toplamMalzeme: newRecordRow.malzemeYuklenici * birimFiyatMalzemeNew,
      toplamMontaj: (newRecordRow.malzemeGDZ + newRecordRow.malzemeYuklenici) * birimFiyatMontajNew,
      toplamDemontaj: newRecordRow.demontaj * birimFiyatDemontajNew,
      toplamDemontajdanMontaj: newRecordRow.demontajdanMontaj * birimFiyatDemontajMontajNew,
    };

    setGridData(prev => [...prev, newRow]);
    showAlert('Yeni kayıt başarıyla eklendi!', 'success');
    // Reset the new record row form
    setNewRecordRow({
      siraNo: gridData.length + 1, // Suggest next sequential number
      grupKodu: '',
      olcuBrimi: '',
      malzemeGDZ: 0,
      malzemeYuklenici: 0,
      demontaj: 0,
      demontajdanMontaj: 0,
    });
    setBirimFiyatMalzemeNew(0);
    setBirimFiyatMontajNew(0);
    setBirimFiyatDemontajNew(0);
    setBirimFiyatDemontajMontajNew(0);
    setGrupKoduSearchTerm('');
  };

  const handleEditGridRow = (rowId: number) => {
    const rowToEdit = gridData.find(row => row.id === rowId);
    if (rowToEdit) {
      setEditingRowId(rowId);
      // Ensure birimFiyat values are numbers, default to 0 if undefined
      setEditingRowData({
        ...rowToEdit,
        birimFiyatMalzeme: rowToEdit.birimFiyatMalzeme || 0,
        birimFiyatMontaj: rowToEdit.birimFiyatMontaj || 0,
        birimFiyatDemontaj: rowToEdit.birimFiyatDemontaj || 0,
        birimFiyatDemontajMontaj: rowToEdit.birimFiyatDemontajMontaj || 0,
      });
    }
  };

  // const handleEditRowInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  //   const { name, value } = e.target;
  //   setEditingRowData(prev => {
  //     if (!prev) return null;

  //     const updatedData = { ...prev };
  //     // Convert value to number if it's a numeric field
  //     updatedData[name as keyof TenderDetailRow] = (
  //       name === 'siraNo' ||
  //       name === 'malzemeGDZ' ||
  //       name === 'malzemeYuklenici' ||
  //       name === 'demontaj' ||
  //       name === 'demontajdanMontaj' ||
  //       name.startsWith('birimFiyat')
  //     ) ? Number(value) : value;


  //     // Recalculate montaj if malzemeGDZ or malzemeYuklenici changes
  //     if (name === 'malzemeGDZ' || name === 'malzemeYuklenici') {
  //       updatedData.montaj = (updatedData.malzemeGDZ || 0) + (updatedData.malzemeYuklenici || 0);
  //     }

  //     // Recalculate birimFiyat based on olcuBrimi if it changes
  //     if (name === 'olcuBrimi') {
  //       const selectedUnitRates = MOCK_BIRIM_FIYAT_OPTIONS.find(f => f.unit === (value as string));
  //       updatedData.birimFiyatMalzeme = selectedUnitRates?.malzeme || 0;
  //       updatedData.birimFiyatMontaj = selectedUnitRates?.montaj || 0;
  //       updatedData.birimFiyatDemontaj = selectedUnitRates?.demontaj || 0;
  //       updatedData.birimFiyatDemontajMontaj = selectedUnitRates?.demontajdanMontaj || 0;
  //     }
      
  //     // Recalculate all 'toplam' fields
  //     updatedData.toplamMalzeme = (updatedData.malzemeYuklenici || 0) * (updatedData.birimFiyatMalzeme || 0);
  //     updatedData.toplamMontaj = (updatedData.montaj || 0) * (updatedData.birimFiyatMontaj || 0);
  //     updatedData.toplamDemontaj = (updatedData.demontaj || 0) * (updatedData.birimFiyatDemontaj || 0);
  //     updatedData.toplamDemontajdanMontaj = (updatedData.demontajdanMontaj || 0) * (updatedData.birimFiyatDemontajMontaj || 0);

  //     return updatedData;
  //   });
  // };
  const handleEditRowInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
  const { name, value } = e.target; // name: string, value: string

  setEditingRowData(prev => {
    if (!prev) return null;

    const updatedData: TenderDetailRow = { ...prev }; // نوع را مشخص کنید

    // تعیین اینکه آیا فیلد فعلی باید به عدد تبدیل شود یا نه
    const isNumericField = (fieldName: string) => {
      const numericFieldsList = ['siraNo', 'malzemeGDZ', 'malzemeYuklenici', 'demontaj', 'demontajdanMontaj'];
      return numericFieldsList.includes(fieldName) || fieldName.startsWith('birimFiyat');
    };

    if (isNumericField(name)) {
      // اگر فیلد عددی است، آن را به Number تبدیل کن
      (updatedData as any)[name] = Number(value); // استفاده از as any موقتی، توضیح پایین
    } else {
      // در غیر این صورت (فیلد متنی)، مقدار رشته‌ای را اختصاص بده
      (updatedData as any)[name] = value; // استفاده از as any موقتی
    }

    // --- منطق Recalculate (بدون تغییر) ---
    // Recalculate montaj if malzemeGDZ or malzemeYuklenici changes
    if (name === 'malzemeGDZ' || name === 'malzemeYuklenici') {
      updatedData.montaj = (updatedData.malzemeGDZ || 0) + (updatedData.malzemeYuklenici || 0);
    }

    // Recalculate birimFiyat based on olcuBrimi if it changes
    // توجه: olcuBrimi باید یک string باشد و value هم string است.
    if (name === 'olcuBrimi') {
      const selectedUnitRates = MOCK_BIRIM_FIYAT_OPTIONS.find(f => f.unit === (value as string));
      updatedData.birimFiyatMalzeme = selectedUnitRates?.malzeme || 0;
      updatedData.birimFiyatMontaj = selectedUnitRates?.montaj || 0;
      updatedData.birimFiyatDemontaj = selectedUnitRates?.demontaj || 0;
      updatedData.birimFiyatDemontajMontaj = selectedUnitRates?.demontajdanMontaj || 0;
    }
    
    // Recalculate all 'toplam' fields
    updatedData.toplamMalzeme = (updatedData.malzemeYuklenici || 0) * (updatedData.birimFiyatMalzeme || 0);
    updatedData.toplamMontaj = (updatedData.montaj || 0) * (updatedData.birimFiyatMontaj || 0);
    updatedData.toplamDemontaj = (updatedData.demontaj || 0) * (updatedData.birimFiyatDemontaj || 0);
    updatedData.toplamDemontajdanMontaj = (updatedData.demontajdanMontaj || 0) * (updatedData.birimFiyatDemontajMontaj || 0);

    return updatedData;
  });
};

  const handleUpdateGridRow = () => {
    if (!editingRowId || !editingRowData) return;

    if (!editingRowData.olcuBrimi || editingRowData.siraNo === 0 || !editingRowData.grupKodu) {
      showAlert('Sıra No, Grup Kodu ve Ölçü Birimi boş olamaz!', 'warning');
      return;
    }

    setGridData(prev => prev.map(row =>
      row.id === editingRowId
        ? editingRowData
        : row
    ));
    setEditingRowId(null);
    setEditingRowData(null);
    showAlert('Giriş başarıyla güncellendi!', 'success');
  };

  const handleDeleteGridRow = (rowId: number) => {
    setGridData(prev => prev.filter(row => row.id !== rowId));
    showAlert('Giriş başarıyla silindi!', 'success');
    if (editingRowId === rowId) {
      setEditingRowId(null);
      setEditingRowData(null);
    }
  };

  const handleCancelEditGridRow = () => {
    setEditingRowId(null);
    setEditingRowData(null);
    showAlert('İşlem iptal edildi.', 'info');
  };

  const handleGrupKoduSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setGrupKoduSearchTerm(event.target.value);
  };

  const filteredGrupKoduOptions = MOCK_GRUP_KODU_OPTIONS.filter(grup =>
    grup.name.toLowerCase().includes(grupKoduSearchTerm.toLowerCase())
  );

  // --- محاسبه جمع کل ستون های GDZ 2024 YILI TUTARI ---
  const totalGdz2024MalzemeTutari = useMemo(() => {
    return gridData.reduce((sum, row) => sum + (row.toplamMalzeme || 0), 0);
  }, [gridData]);

  const totalGdz2024MontajTutari = useMemo(() => {
    return gridData.reduce((sum, row) => sum + (row.toplamMontaj || 0), 0);
  }, [gridData]);

  const totalGdz2024DemontajTutari = useMemo(() => {
    return gridData.reduce((sum, row) => sum + (row.toplamDemontaj || 0), 0);
  }, [gridData]);

  const totalGdz2024DemontajdanMontajTutari = useMemo(() => {
    return gridData.reduce((sum, row) => sum + (row.toplamDemontajdanMontaj || 0), 0);
  }, [gridData]);

  // --- سایر محاسبات Toplam (اختیاری) ---
  // const totalMalzemeGDZ = useMemo(() => gridData.reduce((sum, row) => sum + row.malzemeGDZ, 0), [gridData]);
  // const totalMalzemeYuklenici = useMemo(() => gridData.reduce((sum, row) => sum + row.malzemeYuklenici, 0), [gridData]);
  // const totalMontaj = useMemo(() => gridData.reduce((sum, row) => sum + row.montaj, 0), [gridData]);
  // const totalDemontaj = useMemo(() => gridData.reduce((sum, row) => sum + row.demontaj, 0), [gridData]);
  // const totalDemontajdanMontaj = useMemo(() => gridData.reduce((sum, row) => sum + row.demontajdanMontaj, 0), [gridData]);


  return (
    <Box sx={{ p: 3 }} >
      <Typography variant="h4" gutterBottom>
        {tenderTitle}
      </Typography>
      <Typography variant="h6" color="textSecondary" gutterBottom>
        Müzayede Detayları
      </Typography>

      {alertMessage && (
        <Stack sx={{ width: '100%', mb: 2 }} spacing={2}>
          <Alert severity={alertSeverity} onClose={clearAlert}>
            {alertMessage}
          </Alert>
        </Stack>
      )}

      {/* Only "Dosya Yükle" functionality */}
      <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Dosya Yükle</Typography>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
        <CustomTooltip title={isTooltipGloballyEnabled ? "Excel dosyasını (.xlsx veya .xls) yükle" : ""}>
          <Button
            variant="contained"
            component="label"
            onClick={() => fileInputRef.current?.click()}
            startIcon={<IconUpload />}
            sx={{ mt: 2, mb: 1 }}
          >
            Dosya Seç
          </Button>
        </CustomTooltip>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          Lütfen Excel dosyanızı (.xlsx veya .xls) buraya yükleyin.
        </Typography>
        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" mt={2}>
            <BoltIcon color="inherit" sx={{ mr: 1,fontSize:20 }} />
            <Typography>Yükleniyor...</Typography>
          </Box>
        )}
      </Paper>

      {/* --- Data Grid --- */}
      <BlankCard>
        <Box sx={{ overflowX: 'auto', width: '100%' }}>
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader aria-label="tender details table" sx={{ minWidth: 2000 }}>
              <TableHead>
                <TableRow>
                  {/* Fixed Columns Header */}
                  <TableCell sx={{ position: 'sticky', left: 0, zIndex: 4, backgroundColor: theme.palette.background.paper, minWidth: 80, borderRight: '1px solid ' + theme.palette.divider }}>
                    <Typography variant="subtitle2" fontWeight="600">Sıra No</Typography>
                  </TableCell>
                  <TableCell sx={{ position: 'sticky', left: 80, zIndex: 4, backgroundColor: theme.palette.background.paper, minWidth: 180, borderRight: '1px solid ' + theme.palette.divider }}>
                    <Typography variant="subtitle2" fontWeight="600">GRUP KODU</Typography>
                  </TableCell>
                  <TableCell sx={{ position: 'sticky', left: 260, zIndex: 4, backgroundColor: theme.palette.background.paper, minWidth: 70, borderRight: '1px solid ' + theme.palette.divider }}>
                    <Typography variant="subtitle2" fontWeight="600">ÖLÇÜ</Typography>
                  </TableCell>
                  {/* ÖNGÖRÜLEN SÖZLEŞME MİKTARI - CHANGED colSpan to 5 */}
                  <TableCell colSpan={5} align="center" sx={{ borderBottom: 'none' }}>
                    <Typography variant="subtitle2" fontWeight="600">ÖNGÖRÜLEN SÖZLEŞME MİKTARI</Typography>
                  </TableCell>
                  <TableCell colSpan={4} align="center" sx={{ borderBottom: 'none' }}>
                    <Typography variant="subtitle2" fontWeight="600">GDZ 2024 YILI BİRİM FİYATLARI</Typography>
                  </TableCell>
                  <TableCell colSpan={4} align="center" sx={{ borderBottom: 'none' }}>
                    <Typography variant="subtitle2" fontWeight="600">GDZ 2024 YILI TUTARI</Typography>
                  </TableCell>
                  <TableCell rowSpan={2} sx={{ minWidth: 120, zIndex: 4, backgroundColor: theme.palette.background.paper }}>
                    <Typography variant="subtitle2" fontWeight="600"></Typography>
                  </TableCell>
                </TableRow>
                <TableRow>
                  {/* Fixed Columns Spacer Rows for sub-headers */}
                  <TableCell sx={{ position: 'sticky', left: 0, zIndex: 4, backgroundColor: theme.palette.background.paper, borderTop: '1px solid ' + theme.palette.divider, borderBottom: '1px solid ' + theme.palette.divider, borderRight: '1px solid ' + theme.palette.divider }}></TableCell>
                  <TableCell sx={{ position: 'sticky', left: 80, zIndex: 4, backgroundColor: theme.palette.background.paper, borderTop: '1px solid ' + theme.palette.divider, borderBottom: '1px solid ' + theme.palette.divider, borderRight: '1px solid ' + theme.palette.divider }}></TableCell>
                  <TableCell sx={{ position: 'sticky', left: 260, zIndex: 4, backgroundColor: theme.palette.background.paper, borderTop: '1px solid ' + theme.palette.divider, borderBottom: '1px solid ' + theme.palette.divider, borderRight: '1px solid ' + theme.palette.divider }}></TableCell>
                  {/* ÖNGÖRÜLEN SÖZLEŞME MİKTARI - Sub-headers */}
                  <TableCell align="center">GDZ</TableCell>
                  <TableCell align="center">Yüklenici</TableCell>
                  <TableCell align="center">Montaj</TableCell>
                  <TableCell align="center">Demontaj</TableCell> {/* Added Demontaj */}
                  <TableCell align="center">Demontajdan Montaj</TableCell> {/* Added Demontajdan Montaj */}
                  {/* GDZ 2024 YILI BİRİM FİYATLARI - Sub-headers */}
                  <TableCell align="center">Malzeme</TableCell>
                  <TableCell align="center">Montaj</TableCell>
                  <TableCell align="center">Demontaj</TableCell>
                  <TableCell align="center">Demontajdan Montaj</TableCell>
                  {/* GDZ 2024 YILI TUTARI - Sub-headers */}
                  <TableCell align="center">Malzeme</TableCell>
                  <TableCell align="center">Montaj</TableCell>
                  <TableCell align="center">Demontaj</TableCell>
                  <TableCell align="center">Demontajdan Montaj</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Sticky Row for New Record Entry */}
                <TableRow sx={{ position: 'sticky', top: 96, zIndex: 3, backgroundColor: theme.palette.background.paper, boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12)' }}>
                  <TableCell sx={{ position: 'sticky', left: 0, zIndex: 3, backgroundColor: theme.palette.background.paper, borderRight: '1px solid ' + theme.palette.divider }}>
                    <CustomTextField
                      id="new-siraNo"
                      name="siraNo"
                      type="number"
                      size="small"
                      value={newRecordRow.siraNo}
                      onChange={handleNewRecordInputChange}
                      sx={{ width: 60 }}
                    />
                  </TableCell>
                  <TableCell sx={{ position: 'sticky', left: 80, zIndex: 3, backgroundColor: theme.palette.background.paper, borderRight: '1px solid ' + theme.palette.divider }}>
                    <FormControl fullWidth size="small">
                      <Select
                        id="new-grupKodu"
                        name="grupKodu"
                        value={newRecordRow.grupKodu || ''}
                        onChange={handleNewRecordInputChange}
                        displayEmpty
                         renderValue={(selected) => selected ? selected : "Grup Kodu Seçiniz"}
                        inputProps={{ 'aria-label': 'Select Grup Kodu' }}
                        MenuProps={{
                          sx: { maxHeight: 300 },
                          disableRestoreFocus: true,
                          onClose: () => setGrupKoduSearchTerm(''),
                        }}
                      >
                        <TextField
                          autoFocus
                          fullWidth
                          placeholder="Grup Kodu Ara..."
                          value={grupKoduSearchTerm}
                          onChange={handleGrupKoduSearchChange}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                          size="small"
                          sx={{ p: 1, pb: 0, '& .MuiInputBase-root': { pr: '8px !important' } }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <IconSearch size={20} />
                              </InputAdornment>
                            ),
                          }}
                        />
                        {filteredGrupKoduOptions.length > 0 ? (
                          filteredGrupKoduOptions.map(option => (
                            <MuiMenuItem key={option.id} value={option.id}>
                              {option.name}
                            </MuiMenuItem>
                          ))
                        ) : (
                          <MuiMenuItem disabled>Hiç grup kodu bulunamadı.</MuiMenuItem>
                        )}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell sx={{ position: 'sticky', left: 260, zIndex: 3, backgroundColor: theme.palette.background.paper, borderRight: '1px solid ' + theme.palette.divider }}>
                    <CustomTextField
                      id="new-olcuBrimi"
                      name="olcuBrimi"
                      size="small"
                      sx={{ width: 60 }} // Adjusted width for new record input
                      value={newRecordRow.olcuBrimi}
                      onChange={handleNewRecordInputChange}
                    />
                  </TableCell>
                  <TableCell>
                    <CustomTextField
                      id="new-malzemeGDZ"
                      name="malzemeGDZ"
                      type="number"
                      size="small"
                      value={newRecordRow.malzemeGDZ}
                      onChange={handleNewRecordInputChange}
                      sx={{ width: 70 }}
                    />
                  </TableCell>
                  <TableCell>
                    <CustomTextField
                      id="new-malzemeYuklenici"
                      name="malzemeYuklenici"
                      type="number"
                      size="small"
                      value={newRecordRow.malzemeYuklenici}
                      onChange={handleNewRecordInputChange}
                      sx={{ width: 70 }}
                    />
                  </TableCell>
                  <TableCell>
                    <CustomTextField
                      id="new-montaj"
                      name="montaj"
                      type="number"
                      size="small"
                      value={newRecordRow.malzemeGDZ + newRecordRow.malzemeYuklenici}
                      disabled
                      sx={{ width: 70 }}
                    />
                  </TableCell>
                  <TableCell> {/* New Demontaj Input for new record row */}
                    <CustomTextField
                      id="new-demontaj"
                      name="demontaj"
                      type="number"
                      size="small"
                      value={newRecordRow.demontaj}
                      onChange={handleNewRecordInputChange}
                      sx={{ width: 70 }}
                    />
                  </TableCell>
                  <TableCell> {/* New Demontajdan Montaj Input for new record row */}
                    <CustomTextField
                      id="new-demontajdanMontaj"
                      name="demontajdanMontaj"
                      type="number"
                      size="small"
                      value={newRecordRow.demontajdanMontaj}
                      onChange={handleNewRecordInputChange}
                      sx={{ width: 70 }}
                    />
                  </TableCell>
                  <TableCell>
                    <CustomTextField
                      id="new-birimFiyatMalzeme"
                      name="birimFiyatMalzeme"
                      type="number"
                      size="small"
                      value={birimFiyatMalzemeNew}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBirimFiyatMalzemeNew(Number(e.target.value))}
                      sx={{ width: 70 }}
                    />
                  </TableCell>
                  <TableCell>
                    <CustomTextField
                      id="new-birimFiyatMontaj"
                      name="birimFiyatMontaj"
                      type="number"
                      size="small"
                      value={birimFiyatMontajNew}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBirimFiyatMontajNew(Number(e.target.value))}
                      sx={{ width: 70 }}
                    />
                  </TableCell>
                  <TableCell>
                    <CustomTextField
                      id="new-birimFiyatDemontaj"
                      name="birimFiyatDemontaj"
                      type="number"
                      size="small"
                      value={birimFiyatDemontajNew}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBirimFiyatDemontajNew(Number(e.target.value))}
                      sx={{ width: 70 }}
                    />
                  </TableCell>
                  <TableCell>
                    <CustomTextField
                      id="new-birimFiyatDemontajMontaj"
                      name="birimFiyatDemontajMontaj"
                      type="number"
                      size="small"
                      value={birimFiyatDemontajMontajNew}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBirimFiyatDemontajMontajNew(Number(e.target.value))}
                      sx={{ width: 70 }}
                    />
                  </TableCell>
                  <TableCell>
                    {((newRecordRow.malzemeYuklenici || 0) * (birimFiyatMalzemeNew || 0)).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {((newRecordRow.malzemeGDZ + newRecordRow.malzemeYuklenici || 0) * (birimFiyatMontajNew || 0)).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {((newRecordRow.demontaj || 0) * (birimFiyatDemontajNew || 0)).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {((newRecordRow.demontajdanMontaj || 0) * (birimFiyatDemontajMontajNew || 0)).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni giriş ekle" : ""}>
                        <IconButton size="small" color="success" onClick={handleAddRecord}>
                          <IconPlus size={20} />
                        </IconButton>
                      </CustomTooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
                {/* End of Sticky Row for New Record Entry */}

                {gridData.length > 0 ? (
                  gridData.map((row) => (
                    <TableRow key={row.id}>
                      {/* Fixed Columns in Body */}
                      <TableCell sx={{ position: 'sticky', left: 0,zIndex:2,
                         backgroundColor: theme.palette.background.paper, borderRight: '1px solid ' + theme.palette.divider }}>
                        {editingRowId === row.id ? (
                          <CustomTextField
                            type="number"
                            size="small"
                            value={editingRowData?.siraNo}
                            name="siraNo"
                            onChange={handleEditRowInputChange}
                            sx={{ width: 60 }}
                          />
                        ) : (
                          row.siraNo
                        )}
                      </TableCell>
                      <TableCell sx={{ position: 'sticky', left: 80,zIndex:2,
                         backgroundColor: theme.palette.background.paper, borderRight: '1px solid ' + theme.palette.divider }}>
                        {editingRowId === row.id ? (
                          <FormControl fullWidth size="small">
                            <Select
                              // value={editingRowData?.grupKodu}
                              value={editingRowData?.grupKodu || ''}
                              name="grupKodu"
                              onChange={handleEditRowInputChange}
                              displayEmpty
                              MenuProps={{
                                sx: { maxHeight: 300 },
                                disableRestoreFocus: true,
                                onClose: () => setGrupKoduSearchTerm(''),
                              }}
                            >
                              <TextField
                                autoFocus
                                fullWidth
                                placeholder="Grup Kodu Ara..."
                                value={grupKoduSearchTerm}
                                onChange={handleGrupKoduSearchChange}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                                size="small"
                                sx={{ p: 1, pb: 0, '& .MuiInputBase-root': { pr: '8px !important' } }}
                                InputProps={{
                                  startAdornment: (
                                    <InputAdornment position="start">
                                      <IconSearch size={20} />
                                    </InputAdornment>
                                  ),
                                }}
                              />
                              {filteredGrupKoduOptions.length > 0 ? (
                                filteredGrupKoduOptions.map(option => (
                                  <MuiMenuItem key={option.id} value={option.id}>
                                    {option.name}
                                  </MuiMenuItem>
                                ))
                              ) : (
                                <MuiMenuItem disabled>Hiç grup kodu bulunamadı.</MuiMenuItem>
                              )}
                            </Select>
                          </FormControl>
                        ) : (
                          row.grupKodu
                        )}
                      </TableCell>
                      <TableCell sx={{ position: 'sticky', left: 260,zIndex:2,
                         backgroundColor: theme.palette.background.paper, borderRight: '1px solid ' + theme.palette.divider }}>
                        {editingRowId === row.id ? (
                          <CustomTextField
                            size="small"
                            sx={{ width: 60 }} // Adjusted width for editing input
                            value={editingRowData?.olcuBrimi}
                            name="olcuBrimi"
                            onChange={handleEditRowInputChange}
                          />
                        ) : (
                          row.olcuBrimi
                        )}
                      </TableCell>
                      {/* ÖNGÖRÜLEN SÖZLEŞME MİKTARI - Data Cells */}
                      <TableCell>
                        {editingRowId === row.id ? (
                          <CustomTextField
                            type="number"
                            size="small"
                            value={editingRowData?.malzemeGDZ}
                            name="malzemeGDZ"
                            onChange={handleEditRowInputChange}
                            sx={{ width: 70 }}
                          />
                        ) : (
                          row.malzemeGDZ
                        )}
                      </TableCell>
                      <TableCell>
                        {editingRowId === row.id ? (
                          <CustomTextField
                            type="number"
                            size="small"
                            value={editingRowData?.malzemeYuklenici}
                            name="malzemeYuklenici"
                            onChange={handleEditRowInputChange}
                            sx={{ width: 70 }}
                          />
                        ) : (
                          row.malzemeYuklenici
                        )}
                      </TableCell>
                      <TableCell>
                        {editingRowId === row.id ? (
                          <CustomTextField
                            type="number"
                            size="small"
                            value={editingRowData?.montaj}
                            name="montaj"
                            disabled
                            sx={{ width: 70 }}
                          />
                        ) : (
                          row.montaj
                        )}
                      </TableCell>
                      <TableCell> {/* Demontaj Data Cell */}
                        {editingRowId === row.id ? (
                          <CustomTextField
                            type="number"
                            size="small"
                            value={editingRowData?.demontaj}
                            name="demontaj"
                            onChange={handleEditRowInputChange}
                            sx={{ width: 70 }}
                          />
                        ) : (
                          row.demontaj
                        )}
                      </TableCell>
                      <TableCell> {/* Demontajdan Montaj Data Cell */}
                        {editingRowId === row.id ? (
                          <CustomTextField
                            type="number"
                            size="small"
                            value={editingRowData?.demontajdanMontaj}
                            name="demontajdanMontaj"
                            onChange={handleEditRowInputChange}
                            sx={{ width: 70 }}
                          />
                        ) : (
                          row.demontajdanMontaj
                        )}
                      </TableCell>
                      {/* GDZ 2024 YILI BİRİM FİYATLARI - Data Cells */}
                      <TableCell>
                        {editingRowId === row.id ? (
                          <CustomTextField
                            type="number"
                            size="small"
                            value={editingRowData?.birimFiyatMalzeme}
                            name="birimFiyatMalzeme"
                            onChange={handleEditRowInputChange}
                            sx={{ width: 70 }}
                          />
                        ) : (
                          row.birimFiyatMalzeme
                        )}
                      </TableCell>
                      <TableCell>
                        {editingRowId === row.id ? (
                          <CustomTextField
                            type="number"
                            size="small"
                            value={editingRowData?.birimFiyatMontaj}
                            name="birimFiyatMontaj"
                            onChange={handleEditRowInputChange}
                            sx={{ width: 70 }}
                          />
                        ) : (
                          row.birimFiyatMontaj
                        )}
                      </TableCell>
                      <TableCell>
                        {editingRowId === row.id ? (
                          <CustomTextField
                            type="number"
                            size="small"
                            value={editingRowData?.birimFiyatDemontaj}
                            name="birimFiyatDemontaj"
                            onChange={handleEditRowInputChange}
                            sx={{ width: 70 }}
                          />
                        ) : (
                          row.birimFiyatDemontaj
                        )}
                      </TableCell>
                      <TableCell>
                        {editingRowId === row.id ? (
                          <CustomTextField
                            type="number"
                            size="small"
                            value={editingRowData?.birimFiyatDemontajMontaj}
                            name="birimFiyatDemontajMontaj"
                            onChange={handleEditRowInputChange}
                            sx={{ width: 70 }}
                          />
                        ) : (
                          row.birimFiyatDemontajMontaj
                        )}
                      </TableCell>
                      {/* GDZ 2024 YILI TUTARI - Data Cells */}
                      <TableCell>{row.toplamMalzeme?.toFixed(2)}</TableCell>
                      <TableCell>{row.toplamMontaj?.toFixed(2)}</TableCell>
                      <TableCell>{row.toplamDemontaj?.toFixed(2)}</TableCell>
                      <TableCell>{row.toplamDemontajdanMontaj?.toFixed(2)}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          {editingRowId === row.id ? (
                            <>
                              <CustomTooltip title={isTooltipGloballyEnabled ? "Girişi güncelle" : ""}>
                                <IconButton size="small" color="primary" onClick={handleUpdateGridRow}>
                                  <DoneRoundedIcon sx={{ fontSize: 20 }} />
                                </IconButton>
                              </CustomTooltip>
                              <CustomTooltip title={isTooltipGloballyEnabled ? "Düzenlemeyi iptal et" : ""}>
                                <IconButton size="small" color="secondary" onClick={handleCancelEditGridRow}>
                                  <DoNotDisturbOnRoundedIcon sx={{ fontSize: 20 }} />
                                </IconButton>
                              </CustomTooltip>
                            </>
                          ) : (
                            <>
                              <CustomTooltip title={isTooltipGloballyEnabled ? "Satırı düzenle" : ""}>
                                <IconButton size="small" onClick={() => handleEditGridRow(row.id)}>
                                  <IconEdit size={18} />
                                </IconButton>
                              </CustomTooltip>
                              <CustomTooltip title={isTooltipGloballyEnabled ? "Satırı sil" : ""}>
                                <IconButton size="small" onClick={() => handleDeleteGridRow(row.id)}>
                                  <IconTrash size={18} />
                                </IconButton>
                              </CustomTooltip>
                            </>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={17} align="center"> {/* Adjusted colSpan for the total number of columns */}
                      <Typography variant="subtitle1" color="textSecondary">
                        Henüz detay girişi yapılmadı.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </BlankCard>
      <Paper elevation={3} sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" gutterBottom>GDZ 2024 YILI TUTARI Toplamları</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle1" fontWeight="600">Malzeme Toplamı:</Typography>
            <Typography variant="h5" color="primary">
              {totalGdz2024MalzemeTutari.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle1" fontWeight="600">Montaj Toplamı:</Typography>
            <Typography variant="h5" color="primary">
              {totalGdz2024MontajTutari.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle1" fontWeight="600">Demontaj Toplamı:</Typography>
            <Typography variant="h5" color="primary">
              {totalGdz2024DemontajTutari.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle1" fontWeight="600">Demontajdan Montaj Toplamı:</Typography>
            <Typography variant="h5" color="primary">
              {totalGdz2024DemontajdanMontajTutari.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default TenderDetails;